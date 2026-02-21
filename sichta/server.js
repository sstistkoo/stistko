const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.static("."));

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "cs-CZ,cs;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
};

// Scrapuje profesia.cz - hledání CNC práce v Moravskoslezském kraji
async function scrapeProfesia(keywords, region) {
  const params = new URLSearchParams({
    search_anywhere: keywords,
    count_days: "90",
  });
  const url = `https://www.profesia.cz/prace/${region}/?${params}`;
  console.log("Scrapuji:", url);

  const res = await fetch(url, { headers: BROWSER_HEADERS, timeout: 15000 });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const jobs = [];

  // Profesia.cz - každá nabídka je <li class="list-row">
  $("li.list-row").each((i, el) => {
    const $el = $(el);

    // Titulek je v <span class="title"> uvnitř <h2><a ...>
    const titleEl = $el.find("h2 a").first();
    const title = titleEl.find("span.title").text().trim() || titleEl.text().trim();
    const href = titleEl.attr("href");
    if (!title || !href || href.includes("/redirect/")) return;

    // ID nabídky z atributu id="offer12345"
    const rawId = titleEl.attr("id") || "";
    const offerId = rawId.replace("offer", "") || `${i}-${Date.now()}`;

    const company = $el.find("span.employer").first().text().trim() || "viz nabídka";
    const location = $el.find("span.job-location").first().text().trim() || region;

    // Plat se na listingu obvykle nezobrazuje - zkusíme stejně
    const salaryRaw = $el.find('[class*="salary"], [class*="amount"]').first().text().trim();
    const salary = parseSalary(salaryRaw);

    const jobUrl = href.startsWith("http") ? href : "https://www.profesia.cz" + href;

    jobs.push({
      id: `profesia-${offerId}`,
      title,
      company,
      location,
      salary,
      url: jobUrl,
      type: "Hlavní pracovní poměr",
      source: "Profesia.cz",
      description: "",
    });
  });

  return jobs;
}

function parseSalary(text) {
  if (!text) return null;
  const clean = text.replace(/\s/g, "").replace(",", ".");
  const match = clean.match(/(\d{4,6})/);
  if (match) {
    const n = parseInt(match[1]);
    if (n > 5000 && n < 200000) return n;
  }
  return null;
}

// API endpoint
app.get("/api/jobs", async (req, res) => {
  const errors = [];
  let jobs = [];

  // Hledáme jednoduché dotazy - profesia.cz filtrace na keyword je schopnější než složené fráze
  const searches = [
    { keywords: "CNC soustružník", region: "moravskoslezsky-kraj" },
    { keywords: "CNC frézař", region: "moravskoslezsky-kraj" },
    { keywords: "CNC obráběč", region: "moravskoslezsky-kraj" },
  ];

  for (const search of searches) {
    try {
      const found = await scrapeProfesia(search.keywords, search.region);
      jobs.push(...found);
      console.log(` Profesia (${search.keywords}): ${found.length} nabídek`);
    } catch (err) {
      console.error(` Chyba: ${err.message}`);
      errors.push({ source: "Profesia.cz", error: err.message });
    }
  }

  // Deduplicate podle základní URL (bez search_id query parametru)
  const seen = new Set();
  const unique = jobs.filter(j => {
    const baseUrl = j.url.split("?")[0];
    if (seen.has(baseUrl)) return false;
    seen.add(baseUrl);
    j.url = baseUrl; // uložíme čistou URL
    return true;
  });

  // Filtruj pouze nabídky s CNC / strojírenskou tématikou
  const INCLUDE_KW = [
    "cnc", "soustru", "karusel", "frézař", "frézk",
    "obráb", "obrab", "soustruh", "hrotov", "kovoobráb", "seřizova",
    "číslicov", "vrtačk", "nc program", "výrob",
  ];
  const EXCLUDE_KW = ["obchodník", "obchodní zástupce", "vodič", "řidič", "barman", "barmanka", "účetní", "personalista", "developer", "devops", "marketing", "prodejce", "medicinsk"];
  const relevant = unique.filter(j => {
    const text = j.title.toLowerCase();
    const hasInclude = INCLUDE_KW.some(kw => text.includes(kw));
    const hasExclude = EXCLUDE_KW.some(kw => text.includes(kw));
    return hasInclude && !hasExclude;
  });
  const finalJobs = relevant.length > 0 ? relevant : unique;

  console.log(`Celkem: ${unique.length} unikátních, z toho ${relevant.length} relevantních CNC nabídek`);

  res.json({
    jobs: finalJobs,
    count: finalJobs.length,
    errors,
    fetchedAt: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Zastaví předchozí server a spustí nový
app.listen(PORT, () => {
  console.log(`\n Server běží na http://localhost:${PORT}`);
  console.log(` Otevři: http://localhost:${PORT}/pracovni.html`);
  console.log(` API:    http://localhost:${PORT}/api/jobs\n`);
});
