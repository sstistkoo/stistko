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

// Scrapuje jobs.cz
// Obecný scraper pro portály Alma Career (jobs.cz, prace.cz) - stejná HTML struktura
async function scrapeAlmaCareer(baseUrl, searchUrl, sourceLabel, idPrefix) {
  console.log(`Scrapuji ${sourceLabel}:`, searchUrl);
  const res = await fetch(searchUrl, { headers: BROWSER_HEADERS, timeout: 15000 });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const jobs = [];

  $("article.SearchResultCard").each((i, el) => {
    const $el = $(el);
    const jobadId = $el.attr("data-jobad-id");
    const titleEl = $el.find("a.SearchResultCard__titleLink");
    const title = titleEl.text().trim();
    const href = titleEl.attr("href");
    if (!title || !href) return;

    const company = $el.find("li.SearchResultCard__footerItem span[translate='no']").first().text().trim() || "viz nabídka";
    const loc = $el.find("li[data-test='serp-locality']").text().trim() || "";
    const salaryRaw = $el.find("div.SearchResultCard__body span").filter((i, el) => $(el).text().includes("Kč")).first().text().trim();
    const salary = parseSalary(salaryRaw.replace(/\u200d/g, "").replace(/\u2060/g, ""));

    const jobUrl = href.startsWith("http") ? href : baseUrl + href;

    jobs.push({
      id: `${idPrefix}-${jobadId || i}`,
      title,
      company,
      location: loc,
      salary,
      url: jobUrl.split("?")[0],
      type: "Hlavní pracovní poměr",
      source: sourceLabel,
      description: "",
    });
  });

  return jobs;
}

async function scrapeJobsCz(keywords, city, radius) {
  const params = new URLSearchParams();
  params.append("q[0]", keywords);
  // Jobs.cz: hledáme s locality parametry pro konkrétní město + radius
  if (city) {
    params.append("locality[name]", city);
    if (radius > 0) params.append("locality[radius]", radius);
  }
  const kraj = cityToKraj(city);
  const regionPath = kraj ? `${kraj}/` : '';
  return scrapeAlmaCareer(
    "https://www.jobs.cz",
    `https://www.jobs.cz/prace/${regionPath}?${params}`,
    "Jobs.cz",
    "jobscz"
  );
}

async function scrapePraceCz(keywords, city, radius) {
  const params = new URLSearchParams({ q: keywords });
  // Prace.cz: přidáme locality parametry pro konkrétní město + radius
  if (city) {
    params.append("locality[name]", city);
    if (radius > 0) params.append("locality[radius]", radius);
  }
  const kraj = cityToKraj(city);
  const regionPath = kraj ? `${kraj}/` : '';
  const url = `https://www.prace.cz/nabidky/${regionPath}?${params}`;
  console.log("Scrapuji prace.cz:", url);

  const res = await fetch(url, { headers: BROWSER_HEADERS, timeout: 15000 });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const jobs = [];

  // prace.cz - kontejner je <li class="search-result__advert">
  $("li.search-result__advert").each((i, el) => {
    const $el = $(el);

    const titleEl = $el.find("h3 a[data-jd]").first();
    const title = titleEl.find("strong").text().trim() || titleEl.text().trim();
    const href = titleEl.attr("href");
    const jobId = titleEl.attr("data-jd") || `pc-${i}`;
    if (!title || !href) return;

    const location = $el.find("div.search-result__advert__box__item--location strong").first().text().trim() || "";
    const company = $el.find("div.search-result__advert__box__item--company").first().text().replace("•", "").trim() || "viz nabídka";
    const salaryRaw = $el.find("div.search-result__advert__box__item").filter((i, el) => $(el).text().includes("Kč")).first().text().trim();
    const salary = parseSalary(salaryRaw);

    jobs.push({
      id: `pracecz-${jobId}`,
      title,
      company,
      location,
      salary,
      url: href.split("?")[0],
      type: "Hlavní pracovní poměr",
      source: "Prace.cz",
      description: "",
    });
  });

  return jobs;
}

// Mapování město → kraj slug pro Jobs.cz a Prace.cz URL
const CITY_TO_KRAJ = {
  // Moravskoslezský kraj
  'ostrava':'moravskoslezsky-kraj', 'opava':'moravskoslezsky-kraj',
  'havířov':'moravskoslezsky-kraj', 'havirov':'moravskoslezsky-kraj',
  'karviná':'moravskoslezsky-kraj', 'karvina':'moravskoslezsky-kraj',
  'frýdek-místek':'moravskoslezsky-kraj', 'frydek-mistek':'moravskoslezsky-kraj',
  'kopřivnice':'moravskoslezsky-kraj', 'koprivnice':'moravskoslezsky-kraj',
  'nový jičín':'moravskoslezsky-kraj', 'novy jicin':'moravskoslezsky-kraj',
  'třinec':'moravskoslezsky-kraj', 'trinec':'moravskoslezsky-kraj',
  // Jihomoravský kraj
  'brno':'jihomoravsky-kraj', 'znojmo':'jihomoravsky-kraj',
  'hodonín':'jihomoravsky-kraj', 'hodonin':'jihomoravsky-kraj',
  'břeclav':'jihomoravsky-kraj', 'breclav':'jihomoravsky-kraj',
  'vyškov':'jihomoravsky-kraj', 'vyskov':'jihomoravsky-kraj',
  // Praha
  'praha':'hlavni-mesto-praha', 'prague':'hlavni-mesto-praha',
  // Středočeský
  'kladno':'stredocesky-kraj', 'příbram':'stredocesky-kraj', 'pribram':'stredocesky-kraj',
  'mladá boleslav':'stredocesky-kraj', 'mlada boleslav':'stredocesky-kraj',
  'kolín':'stredocesky-kraj', 'kolin':'stredocesky-kraj',
  // Plzeňský
  'plzeň':'plzensky-kraj', 'plzen':'plzensky-kraj',
  // Jihočeský
  'české budějovice':'jihocesky-kraj', 'ceske budejovice':'jihocesky-kraj',
  // Olomoucký
  'olomouc':'olomoucky-kraj', 'prostějov':'olomoucky-kraj', 'prostejov':'olomoucky-kraj',
  'přerov':'olomoucky-kraj', 'prerov':'olomoucky-kraj', 'šumperk':'olomoucky-kraj', 'sumperk':'olomoucky-kraj',
  // Zlínský
  'zlín':'zlinsky-kraj', 'zlin':'zlinsky-kraj', 'vsetín':'zlinsky-kraj', 'vsetin':'zlinsky-kraj',
  'uherské hradiště':'zlinsky-kraj', 'uherske hradiste':'zlinsky-kraj',
  // Vysočina
  'jihlava':'kraj-vysocina', 'třebíč':'kraj-vysocina', 'trebic':'kraj-vysocina',
  // Pardubický
  'pardubice':'pardubicky-kraj', 'chrudim':'pardubicky-kraj',
  // Královéhradecký
  'hradec králové':'kralovehradecky-kraj', 'hradec kralove':'kralovehradecky-kraj',
  'náchod':'kralovehradecky-kraj', 'nachod':'kralovehradecky-kraj',
  // Liberecký
  'liberec':'liberecky-kraj',
  // Ústecký
  'ústí nad labem':'ustecky-kraj', 'usti nad labem':'ustecky-kraj',
  'chomutov':'ustecky-kraj', 'most':'ustecky-kraj', 'teplice':'ustecky-kraj',
  // Karlovarský
  'karlovy vary':'karlovarsky-kraj',
};

function cityToKraj(city) {
  if (!city) return null;
  return CITY_TO_KRAJ[city.toLowerCase().trim()] || null;
}

// Převede název města na URL slug pro profesia.cz (bez diakritiky, malá písmena)
function toCzechSlug(text) {
  const map = { 'á':'a','č':'c','ď':'d','é':'e','ě':'e','í':'i','ň':'n','ó':'o','ř':'r','š':'s','ť':'t','ú':'u','ů':'u','ý':'y','ž':'z' };
  return (text || 'ostrava').toLowerCase()
    .replace(/[áčďéěíňóřšťúůýž]/g, c => map[c] || c)
    .replace(/\s+/g, '-');
}

// Scrapuje profesia.cz - hledání CNC práce v dané lokalitě
async function scrapeProfesia(keywords, city, radius) {
  // Profesia.cz: hledáme přímo podle města (např. /prace/ostrava/)
  // místo celého kraje, aby výsledky odpovídaly hledané lokalitě
  const citySlug = city ? toCzechSlug(city) : null;
  const segments = citySlug ? `${citySlug}/` : '';
  const params = new URLSearchParams({
    search_anywhere: keywords,
    count_days: "90",
  });
  const url = `https://www.profesia.cz/prace/${segments}?${params}`;
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
    const location = $el.find("span.job-location").first().text().trim() || city;

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

// ======================================================
// Indeed.cz scraper (cz.indeed.com)
// Pozn.: Indeed má anti-bot ochranu, scraping nemusí vždy fungovat
// ======================================================
async function scrapeIndeed(keywords, city, radius) {
  const params = new URLSearchParams({
    q: keywords,
    l: city,
  });
  if (radius > 0) params.append('radius', radius);
  const url = `https://cz.indeed.com/jobs?${params}`;
  console.log("Scrapuji Indeed.cz:", url);

  const res = await fetch(url, { headers: BROWSER_HEADERS, timeout: 15000 });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const jobs = [];

  $("div.job_seen_beacon").each((i, el) => {
    const $el = $(el);
    const titleEl = $el.find("h2 a").first();
    const title = titleEl.find("span").last().text().trim() || titleEl.text().trim();
    const href = titleEl.attr("href");
    if (!title || !href) return;

    const jk = titleEl.attr("data-jk") || $el.closest("[data-jk]").attr("data-jk") || `${i}`;
    const company = $el.find('[data-testid="company-name"]').text().trim()
      || $el.find(".companyName").text().trim()
      || "viz nabídka";
    const location = $el.find('[data-testid="text-location"]').text().trim()
      || $el.find(".companyLocation").text().trim()
      || city;
    const salaryRaw = $el.find('[class*="salary"]').first().text().trim()
      || $el.find(".metadata .attribute_snippet").text().trim();
    const salary = parseSalary(salaryRaw);

    const jobUrl = href.startsWith("http") ? href : "https://cz.indeed.com" + href;

    jobs.push({
      id: `indeed-${jk}`,
      title,
      company,
      location,
      salary,
      url: jobUrl.split("?")[0],
      type: "Hlavní pracovní poměr",
      source: "Indeed.cz",
      description: "",
    });
  });

  return jobs;
}

// ======================================================
// Jooble.cz scraper (cz.jooble.org)
// Pozn.: Jooble má anti-bot ochranu, scraping nemusí vždy fungovat
// ======================================================
async function scrapeJooble(keywords, city, radius) {
  const params = new URLSearchParams({
    ukw: keywords,
    loc: city,
  });
  const url = `https://cz.jooble.org/SearchResult?${params}`;
  console.log("Scrapuji Jooble.cz:", url);

  const res = await fetch(url, { headers: BROWSER_HEADERS, timeout: 15000 });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const jobs = [];

  // Jooble používá různé struktury – zkusíme běžné selektory
  $("article, div[data-test*='serp'], div[class*='_item']").each((i, el) => {
    const $el = $(el);
    const titleEl = $el.find('a[href*="/desc/"], a[href*="/jdp/"], h2 a, h3 a').first();
    const title = titleEl.text().trim();
    const href = titleEl.attr("href");
    if (!title || !href || title.length < 5) return;

    const company = $el.find('[class*="company"], [data-test*="company"]').first().text().trim() || "viz nabídka";
    const location = $el.find('[class*="location"], [data-test*="location"]').first().text().trim() || city;
    const salaryRaw = $el.find('[class*="salary"]').first().text().trim();
    const salary = parseSalary(salaryRaw);

    const jobUrl = href.startsWith("http") ? href : "https://cz.jooble.org" + href;

    jobs.push({
      id: `jooble-${i}-${Date.now()}`,
      title,
      company,
      location,
      salary,
      url: jobUrl.split("?")[0],
      type: "Hlavní pracovní poměr",
      source: "Jooble.cz",
      description: "",
    });
  });

  return jobs;
}

// ======================================================
// Inwork.cz scraper
// ======================================================
async function scrapeInwork(keywords, city, radius) {
  // Inwork.cz: slug města v URL nefunguje jako filtr – vrací celostatatní výsledky
  // Používáme region slug (kraj), který omezí výsledky alespoň na správný kraj
  const kraj = city ? cityToKraj(city) : null;
  let url;
  if (kraj) {
    url = `https://www.inwork.cz/prace/${kraj}/?keyword=${encodeURIComponent(keywords)}`;
  } else {
    // Fallback: zkusit city slug
    const citySlug = city ? toCzechSlug(city) : null;
    url = citySlug
      ? `https://www.inwork.cz/prace/${citySlug}/?keyword=${encodeURIComponent(keywords)}`
      : `https://www.inwork.cz/prace/?keyword=${encodeURIComponent(keywords)}`;
  }
  console.log("Scrapuji Inwork.cz:", url);

  const res = await fetch(url, { headers: BROWSER_HEADERS, timeout: 15000 });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const jobs = [];

  // Inwork.cz: každá nabídka je <a> s href obsahujícím /{id}-{slug}
  $("a[href*='/prace/']").each((i, el) => {
    const $el = $(el);
    const href = $el.attr("href") || "";
    // Jen odkazy na konkrétní nabídky (s numerickým ID)
    if (!href.match(/\/\d{5,}-/)) return;

    const title = $el.find("h2.item__title").text().trim();
    if (!title || title.length < 5) return;

    const location = $el.find("span.item__place").text().trim() || city;
    const company = $el.find(".col-md-4").text().replace("Ověřeno", "").trim() || "viz nabídka";
    const desc = $el.find("p.item__description").text().trim();

    // Zkusíme vytáhnout plat z titulku nebo popisu
    const salaryMatch = (title + " " + desc).match(/(\d[\d\s.,]*)\s*Kč/);
    const salary = salaryMatch ? parseSalary(salaryMatch[0]) : null;

    const idMatch = href.match(/\/(\d{5,})-/);
    const jobId = idMatch ? idMatch[1] : `iw-${i}`;

    const jobUrl = href.startsWith("http") ? href : "https://www.inwork.cz" + href;

    jobs.push({
      id: `inwork-${jobId}`,
      title,
      company,
      location,
      salary,
      url: jobUrl.split("?")[0],
      type: "Hlavní pracovní poměr",
      source: "Inwork.cz",
      description: desc.substring(0, 150),
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

  // Parametry z frontendu
  const city = (req.query.city || 'Ostrava').trim();
  const radius = parseInt(req.query.radius) || 0;
  console.log(`\nHledám: city="${city}", radius=${radius > 0 ? radius + ' km' : 'celá ČR'}`);

  // --- Profesia.cz ---
  const profesiaKeywords = [
    "CNC soustružník",
    "CNC frézař",
    "CNC obráběč",
    "soustružník",
    "CNC operátor",
  ];

  for (const kw of profesiaKeywords) {
    try {
      const found = await scrapeProfesia(kw, city, radius);
      jobs.push(...found);
      console.log(` Profesia (${kw}): ${found.length} nabídek`);
    } catch (err) {
      console.error(` Profesia chyba: ${err.message}`);
      errors.push({ source: "Profesia.cz", error: err.message });
    }
  }

  // --- Jobs.cz ---
  const jobsCzKeywords = [
    "CNC soustružník",
    "CNC frézař",
    "CNC obráběč",
  ];

  for (const kw of jobsCzKeywords) {
    try {
      const found = await scrapeJobsCz(kw, city, radius);
      jobs.push(...found);
      console.log(` Jobs.cz (${kw}): ${found.length} nabídek`);
    } catch (err) {
      console.error(` Jobs.cz chyba: ${err.message}`);
      errors.push({ source: "Jobs.cz", error: err.message });
    }
  }

  // --- Prace.cz ---
  const praceCzKeywords = [
    "CNC soustružník",
    "CNC frézař",
    "CNC obráběč",
  ];

  for (const kw of praceCzKeywords) {
    try {
      const found = await scrapePraceCz(kw, city, radius);
      jobs.push(...found);
      console.log(` Prace.cz (${kw}): ${found.length} nabídek`);
    } catch (err) {
      console.error(` Prace.cz chyba: ${err.message}`);
      errors.push({ source: "Prace.cz", error: err.message });
    }
  }

  // --- Indeed.cz ---
  const indeedKeywords = [
    "CNC soustružník",
    "CNC frézař",
    "CNC obráběč",
  ];

  for (const kw of indeedKeywords) {
    try {
      const found = await scrapeIndeed(kw, city, radius);
      jobs.push(...found);
      console.log(` Indeed.cz (${kw}): ${found.length} nabídek`);
    } catch (err) {
      console.error(` Indeed.cz chyba: ${err.message}`);
      errors.push({ source: "Indeed.cz", error: err.message });
    }
  }

  // --- Jooble.cz ---
  const joobleKeywords = [
    "CNC soustružník",
    "CNC frézař",
    "CNC obráběč",
  ];

  for (const kw of joobleKeywords) {
    try {
      const found = await scrapeJooble(kw, city, radius);
      jobs.push(...found);
      console.log(` Jooble.cz (${kw}): ${found.length} nabídek`);
    } catch (err) {
      console.error(` Jooble.cz chyba: ${err.message}`);
      errors.push({ source: "Jooble.cz", error: err.message });
    }
  }

  // --- Inwork.cz ---
  const inworkKeywords = [
    "CNC soustružník",
    "CNC frézař",
    "CNC obráběč",
  ];

  for (const kw of inworkKeywords) {
    try {
      const found = await scrapeInwork(kw, city, radius);
      jobs.push(...found);
      console.log(` Inwork.cz (${kw}): ${found.length} nabídek`);
    } catch (err) {
      console.error(` Inwork.cz chyba: ${err.message}`);
      errors.push({ source: "Inwork.cz", error: err.message });
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

  // Post-filtr: odstranit nabídky z jasně vzdálených lokalit (známé město v jiném kraji)
  const targetKraj = cityToKraj(city);
  const locationFiltered = targetKraj
    ? unique.filter(j => {
        const loc = j.location.toLowerCase();
        // Bez lokality nebo neznámá → ponechat
        if (!loc || loc === 'viz nabídka' || loc === 'celá čr' || loc.includes('remote') || loc.includes('z domu')) return true;
        // Obsahuje cílové město → ponechat
        if (loc.includes(city.toLowerCase())) return true;
        // Zkontroluj zda lokace odpovídá městu ZNÁMÉMU jako jiný kraj
        for (const [knownCity, knownKraj] of Object.entries(CITY_TO_KRAJ)) {
          if (loc.includes(knownCity) && knownKraj !== targetKraj) {
            console.log(`  Mimo region: [${j.source}] "${j.title}" (${j.location})`);
            return false;
          }
        }
        // Neznámé město → ponechat (pravděpodobně je v okolí)
        return true;
      })
    : unique;

  // Filtruj pouze nabídky s CNC / strojírenskou tématikou
  const INCLUDE_KW = [
    "cnc", "soustru", "karusel", "frézař", "frézk", "frezar",
    "obráb", "obrab", "soustruh", "hrotov", "kovoobráb", "seřizova",
    "číslicov", "vrtačk", "nc program", "nc oper",
    // rozšířené strojírenské klíčové slovy
    "strojník", "strojní", "brusič", "brus", "zámečník", "svářeč", "svarec",
    "lisov", "obsluha lis", "obsluha stroj", "operátor výroby", "operátor stroj",
    "technolog obráb", "technolog výrob", "strojírensk", "programátor cnc",
    "kovoobrábění", "nástrojář", "nastrojar",
  ];
  const EXCLUDE_KW = ["obchodník", "obchodní zástupce", "vodič", "řidič", "barman",
    "barmanka", "účetní", "personalista", "developer", "devops", "marketing",
    "prodejce", "medicinsk", "cnc laser", "call cent", "zákaznick",
    "lektor", "učitel", "pokojsk", "kurýr", "strážn",
  ];
  const relevant = locationFiltered.filter(j => {
    const text = (j.title + " " + j.description).toLowerCase();
    const hasInclude = INCLUDE_KW.some(kw => text.includes(kw));
    const hasExclude = EXCLUDE_KW.some(kw => text.includes(kw));
    return hasInclude && !hasExclude;
  });

  // Diagnostika: kolik nabídek z cílového města bylo odfiltrováno
  const cityLowerDiag = city.toLowerCase();
  const cityJobsAll = locationFiltered.filter(j => j.location.toLowerCase().includes(cityLowerDiag));
  const cityJobsKept = relevant.filter(j => j.location.toLowerCase().includes(cityLowerDiag));
  const cityJobsLost = cityJobsAll.filter(j => !relevant.includes(j));
  console.log(`Lokalita "${city}": ${cityJobsAll.length} celkem, ${cityJobsKept.length} prošlo CNC filtrem, ${cityJobsLost.length} odfiltrováno`);
  if (cityJobsLost.length > 0) {
    cityJobsLost.forEach(j => console.log(`  ODFILTROVÁNO: [${j.source}] "${j.title}" (${j.location})`));
  }

  const finalJobs = relevant.length > 0 ? relevant : locationFiltered;

  // Seřadíme výsledky: nabídky přímo z hledaného města budou nahoře
  const cityLower = city.toLowerCase();
  finalJobs.sort((a, b) => {
    const aLocal = a.location.toLowerCase();
    const bLocal = b.location.toLowerCase();
    const aMatch = aLocal.includes(cityLower) ? 0 : 1;
    const bMatch = bLocal.includes(cityLower) ? 0 : 1;
    return aMatch - bMatch;
  });

  console.log(`Celkem: ${unique.length} unikátních, z toho ${relevant.length} relevantních CNC nabídek (${city}, radius=${radius}km, zdroje: Profesia.cz + Jobs.cz + Prace.cz + Indeed.cz + Jooble.cz + Inwork.cz)`);

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
