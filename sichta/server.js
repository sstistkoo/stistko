const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

// got-scraping je ESM-only, proto dynamický import
let gotScraping;
const gotScrapingReady = import("got-scraping")
  .then(m => { gotScraping = m.gotScraping; })
  .catch(err => { console.error("Nepodařilo se načíst got-scraping:", err.message); });

const app = express();
const PORT = process.env.PORT || 3001;

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
    let salary = parseSalary(salaryRaw.replace(/\u200d/g, "").replace(/\u2060/g, ""));
    // Fallback: zkusit vytáhnout plat z titulku
    if (!salary) salary = extractSalaryFromText(title);

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
  // Prace.cz: nový formát /hledat/ s searchForm parametry
  const praceCzCode = cityToPraceCzCode(city);
  const params = new URLSearchParams();
  params.append('searchForm[profs]', keywords);
  params.append('searchForm[search]', '');
  if (praceCzCode) {
    params.append('searchForm[locality_codes]', `${praceCzCode}=${radius > 0 ? radius : 30}`);
  }
  const url = `https://www.prace.cz/hledat/?${params}`;
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
    let salary = parseSalary(salaryRaw);
    if (!salary) salary = extractSalaryFromText(title);

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

// Kódy měst pro prace.cz (searchForm[locality_codes])
const CITY_TO_PRACECZ_CODE = {
  'ostrava':'M283941', 'opava':'M283797', 'havířov':'M283380', 'havirov':'M283380',
  'karviná':'M283517', 'karvina':'M283517', 'frýdek-místek':'M283304', 'frydek-mistek':'M283304',
  'kopřivnice':'M283614', 'koprivnice':'M283614', 'nový jičín':'M283771', 'novy jicin':'M283771',
  'třinec':'M284050', 'trinec':'M284050',
  'brno':'M282863', 'praha':'M282510', 'prague':'M282510',
  'plzeň':'M283924', 'plzen':'M283924', 'olomouc':'M283789',
  'zlín':'M284161', 'zlin':'M284161', 'liberec':'M283649',
  'pardubice':'M283851', 'hradec králové':'M283412', 'hradec kralove':'M283412',
  'české budějovice':'M283150', 'ceske budejovice':'M283150',
  'ústí nad labem':'M284085', 'usti nad labem':'M284085',
  'karlovy vary':'M283494', 'jihlava':'M283463', 'kladno':'M283550',
};

function cityToPraceCzCode(city) {
  if (!city) return null;
  return CITY_TO_PRACECZ_CODE[city.toLowerCase().trim()] || null;
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
    let salary = parseSalary(salaryRaw);
    // Fallback: zkusit vytáhnout plat z titulku
    if (!salary) salary = extractSalaryFromText(title);

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
    let salary = salaryMatch ? parseSalary(salaryMatch[0]) : null;
    if (!salary) salary = extractSalaryFromText(title + " " + desc);

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

// ======================================================
// Indeed.cz scraper (got-scraping pro bypass Cloudflare)
// ======================================================
async function scrapeIndeed(keywords, city, radius) {
  if (!gotScraping) throw new Error('got-scraping modul není načtený');
  const params = new URLSearchParams({
    q: keywords,
    l: city || '',
    radius: String(radius > 0 ? radius : 25),
  });
  const url = `https://cz.indeed.com/jobs?${params}`;
  console.log("Scrapuji Indeed.cz:", url);

  const { body, statusCode } = await gotScraping({
    url,
    headerGeneratorOptions: {
      browsers: [{ name: "chrome", minVersion: 120 }],
      operatingSystems: ["windows"],
      locales: ["cs-CZ"],
    },
    timeout: { request: 20000 },
  });
  if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);

  const jobs = [];

  // Data jsou v window.mosaic.providerData["mosaic-provider-jobcards"] = {...}
  const marker = 'window.mosaic.providerData["mosaic-provider-jobcards"]=';
  const markerPos = body.indexOf(marker);
  if (markerPos === -1) {
    console.log("  Indeed: mosaic-provider-jobcards nenalezen");
    return jobs;
  }

  // Extrahovat JSON s respektem ke stringům (jednoduché počítání závorek nefunguje kvůli escaped znakům v JSON)
  const jsonStart = body.indexOf('{', markerPos + marker.length);
  let depth = 0, inStr = false, esc = false, jsonEnd = -1;
  for (let i = jsonStart; i < body.length; i++) {
    const c = body[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { jsonEnd = i + 1; break; } }
  }
  if (jsonEnd === -1) {
    console.log("  Indeed: nepodařilo se extrahovat JSON");
    return jobs;
  }

  try {
    const mosaicData = JSON.parse(body.substring(jsonStart, jsonEnd));
    const results = mosaicData?.metaData?.mosaicProviderJobCardsModel?.results || mosaicData?.results || [];
    console.log(`  Indeed: ${results.length} výsledků z mosaic`);

    for (const r of results) {
      const title = r.displayTitle || r.title || '';
      if (!title) continue;

      const company = r.company || 'viz nabídka';
      const location = r.formattedLocation || city || '';
      const jobKey = r.jobkey || r.jk || '';
      const link = r.link ? `https://cz.indeed.com${r.link}` : (jobKey ? `https://cz.indeed.com/viewjob?jk=${jobKey}` : '');
      if (!link) continue; // Přeskočit nabídky bez URL

      // Plat z salarySnippet nebo z titulku/snippet
      let salary = null;
      if (r.salarySnippet && r.salarySnippet.text) {
        salary = parseSalary(r.salarySnippet.text);
      }
      if (!salary) {
        // Zkusit z titulku
        salary = extractSalaryFromText(title);
      }
      if (!salary && r.snippet) {
        // Zkusit z popisu
        salary = extractSalaryFromText(r.snippet.replace(/<[^>]+>/g, ' '));
      }

      // Popis - vyčistit HTML
      const desc = r.snippet ? r.snippet.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200) : '';

      jobs.push({
        id: `indeed-${jobKey || Date.now() + '-' + jobs.length}`,
        title,
        company,
        location,
        salary,
        url: link,
        type: 'Hlavní pracovní poměr',
        source: 'Indeed.cz',
        description: desc,
      });
    }
  } catch (e) {
    console.error("  Indeed: chyba parsování mosaic:", e.message);
  }

  return jobs;
}

// ======================================================
// Jooble.cz scraper (got-scraping pro bypass Cloudflare)
// ======================================================
async function scrapeJooble(keywords, city, radius) {
  if (!gotScraping) throw new Error('got-scraping modul není načtený');
  // Jooble: zkusíme několik přístupů postupně (anti-bot ochrana je agresivní)
  let body = null;
  let statusCode = 0;

  // Přístup 1: SearchResult s got-scraping (rgns formát - funguje v prohlížeči)
  const searchUrl = `https://cz.jooble.org/SearchResult?rgns=${encodeURIComponent(city || '')}&ukw=${encodeURIComponent(keywords)}`;
  try {
    console.log("Scrapuji Jooble.cz:", searchUrl);
    const result = await gotScraping({
      url: searchUrl,
      headerGeneratorOptions: {
        browsers: [{ name: "chrome", minVersion: 120 }],
        operatingSystems: ["windows"],
        locales: ["cs-CZ"],
      },
      timeout: { request: 20000 },
    });
    body = result.body;
    statusCode = result.statusCode;
    if (statusCode === 200) {
      console.log(`  Jooble SearchResult: OK (${body.length} bytes)`);
    } else {
      console.log(`  Jooble SearchResult: HTTP ${statusCode}`);
      body = null;
    }
  } catch (e) {
    console.log(`  Jooble SearchResult selhalo: ${e.message}`);
  }

  // Přístup 2: Slug URL /práce-{keyword}/{city}
  if (!body) {
    const kwSlug = keywords.toLowerCase().replace(/\s+/g, '-');
    const slugUrl = `https://cz.jooble.org/pr%C3%A1ce-${encodeURIComponent(kwSlug)}/${encodeURIComponent(city || '')}`;
    try {
      console.log("  Jooble fallback (slug):", slugUrl);
      const result = await gotScraping({
        url: slugUrl,
        headerGeneratorOptions: {
          browsers: [{ name: "chrome", minVersion: 120 }],
          operatingSystems: ["windows"],
          locales: ["cs-CZ"],
        },
        timeout: { request: 20000 },
      });
      if (result.statusCode === 200) {
        body = result.body;
        statusCode = 200;
        console.log(`  Jooble slug: OK (${body.length} bytes)`);
      } else {
        console.log(`  Jooble slug: HTTP ${result.statusCode}`);
      }
    } catch (e) {
      console.log(`  Jooble slug selhalo: ${e.message}`);
    }
  }

  // Přístup 3: Jooble API (POST)
  if (!body) {
    try {
      console.log("  Jooble fallback (API POST)");
      const apiRes = await fetch("https://cz.jooble.org/api/", {
        method: "POST",
        headers: {
          ...BROWSER_HEADERS,
          "Content-Type": "application/json",
          "Origin": "https://cz.jooble.org",
          "Referer": "https://cz.jooble.org/",
        },
        body: JSON.stringify({
          keywords: keywords,
          location: city || "",
          radius: radius > 0 ? String(radius) : "",
          page: "1",
        }),
        timeout: 20000,
      });
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        const apiJobs = apiData.jobs || [];
        console.log(`  Jooble API: ${apiJobs.length} nabídek`);
        if (apiJobs.length > 0) {
          return apiJobs.map((item, i) => ({
            id: `jooble-${item.id || Date.now() + '-' + i}`,
            title: item.title || '',
            company: item.company || 'viz nabídka',
            location: item.location || city || '',
            salary: parseSalary((item.salary || '').replace(/<[^>]+>/g, '')) || extractSalaryFromText(item.title || ''),
            url: item.link || '',
            type: 'Hlavní pracovní poměr',
            source: 'Jooble.cz',
            description: (item.snippet || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200),
          })).filter(j => j.url && j.title);
        }
      } else {
        console.log(`  Jooble API: HTTP ${apiRes.status}`);
      }
    } catch (e) {
      console.log(`  Jooble API selhalo: ${e.message}`);
    }
  }

  if (!body) throw new Error(`Všechny přístupy k Jooble selhaly`);

  const jobs = [];

  // Data jsou v window.__INITIAL_STATE__ = {...}
  const marker2 = 'window.__INITIAL_STATE__=';
  const marker2alt = 'window.__INITIAL_STATE__ = ';
  let markerPos2 = body.indexOf(marker2);
  let markerLen2 = marker2.length;
  if (markerPos2 === -1) {
    markerPos2 = body.indexOf(marker2alt);
    markerLen2 = marker2alt.length;
  }
  if (markerPos2 === -1) {
    console.log("  Jooble: __INITIAL_STATE__ nenalezena");
    return jobs;
  }

  // String-aware brace matching
  const jsonStart2 = body.indexOf('{', markerPos2 + markerLen2);
  let depth2 = 0, inStr2 = false, esc2 = false, jsonEnd2 = -1;
  for (let i = jsonStart2; i < body.length; i++) {
    const c = body[i];
    if (esc2) { esc2 = false; continue; }
    if (c === '\\') { esc2 = true; continue; }
    if (c === '"') { inStr2 = !inStr2; continue; }
    if (inStr2) continue;
    if (c === '{') depth2++;
    else if (c === '}') { depth2--; if (depth2 === 0) { jsonEnd2 = i + 1; break; } }
  }
  if (jsonEnd2 === -1) {
    console.log("  Jooble: nepodařilo se extrahovat JSON");
    return jobs;
  }

  try {
    const state = JSON.parse(body.substring(jsonStart2, jsonEnd2));
    const serpJobs = state?.serpJobs?.jobs || [];
    // serpJobs je pole stránek, vezmeme první
    const items = serpJobs.length > 0 ? (serpJobs[0].items || []) : [];
    console.log(`  Jooble: ${items.length} položek na stránce`);

    for (const item of items) {
      // Přeskočit reklamy (mají componentName, např. "AFS")
      if (item.componentName) continue;

      const title = item.position || '';
      if (!title) continue;

      const company = (item.company && item.company.name) ? item.company.name : 'viz nabídka';
      const location = (item.location && item.location.name) ? item.location.name : (city || '');
      const jobUrl = item.url || '';
      if (!jobUrl) continue; // Přeskočit nabídky bez URL
      const uid = item.uid || '';

      // Plat: může být string ("41000 Kč") nebo objekt s .text ("27 000 - 40 000 Kč za měsíc")
      let salary = null;
      if (item.salary) {
        if (typeof item.salary === 'string') {
          salary = parseSalary(item.salary);
        } else if (item.salary.text) {
          salary = parseSalary(item.salary.text);
        }
      }
      if (!salary && item.estimatedSalary) {
        salary = parseSalary(String(item.estimatedSalary));
      }
      if (!salary) {
        // Zkusit z titulku
        salary = extractSalaryFromText(title);
      }
      if (!salary && item.content) {
        salary = extractSalaryFromText(item.content.replace(/<[^>]+>/g, ' '));
      }

      // Popis
      const desc = item.content ? item.content.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200) : '';

      jobs.push({
        id: `jooble-${uid || Date.now() + '-' + jobs.length}`,
        title,
        company,
        location,
        salary,
        url: jobUrl,
        type: 'Hlavní pracovní poměr',
        source: 'Jooble.cz',
        description: desc,
      });
    }
  } catch (e) {
    console.error("  Jooble: chyba parsování state:", e.message);
  }

  return jobs;
}

function parseSalary(text) {
  if (!text) return null;
  const clean = text.replace(/\s/g, "").replace(",", ".");

  // Hodinová sazba → přepočet na měsíc (160h)
  const hourlyRange = clean.match(/(\d{2,4})[\s\-–—]*(?:Kč)?[\s\-–—]*(\d{2,4})\s*(?:Kč)?\s*\/?\s*(?:hod|h\b)/i);
  if (hourlyRange) {
    const lo = parseInt(hourlyRange[1]) * 160;
    const hi = parseInt(hourlyRange[2]) * 160;
    if (lo > 5000 && lo < 200000 && hi > 5000 && hi < 200000) {
      return { min: Math.min(lo, hi), max: Math.max(lo, hi), avg: Math.round((lo + hi) / 2) };
    }
  }
  const hourly = clean.match(/(\d{2,4})\s*(?:Kč)?\s*\/?\s*(?:hod|h\b)/i);
  if (hourly) {
    const n = parseInt(hourly[1]) * 160;
    if (n > 5000 && n < 200000) return n;
  }

  // Zkusíme rozsah (např. "30000-45000" nebo "30.000–45.000")
  const rangeMatch = clean.match(/(\d{4,6})[\s\-–—.]*(?:Kč)?[\s\-–—.]*(\d{4,6})/);
  if (rangeMatch) {
    const lo = parseInt(rangeMatch[1]);
    const hi = parseInt(rangeMatch[2]);
    if (lo > 5000 && lo < 200000 && hi > 5000 && hi < 200000) {
      return { min: Math.min(lo, hi), max: Math.max(lo, hi), avg: Math.round((lo + hi) / 2) };
    }
  }
  // Jedna hodnota
  const match = clean.match(/(\d{4,6})/);
  if (match) {
    const n = parseInt(match[1]);
    if (n > 5000 && n < 200000) return n;
  }
  return null;
}

// Vylepšené parsování platu z volného textu (popis, titulek)
function extractSalaryFromText(text) {
  if (!text) return null;
  // Normalizace: non-breaking spaces, tečky jako oddělovače tisíců ("37.000" → "37 000")
  const norm = text.replace(/\u00a0/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/(\d)\.(\d{3})(?!\d)/g, '$1 $2');

  // Hodinová sazba: "300 Kč/h", "250-350 Kč/hod"
  const hourlyRange = norm.match(/(\d{2,4})\s*[-–—]\s*(\d{2,4})\s*Kč\s*\/?\s*(?:hod|h\b)/i);
  if (hourlyRange) {
    const lo = parseInt(hourlyRange[1]) * 160;
    const hi = parseInt(hourlyRange[2]) * 160;
    if (lo >= 15000 && hi <= 200000) return { min: Math.min(lo, hi), max: Math.max(lo, hi), avg: Math.round((lo + hi) / 2) };
  }
  const hourlySingle = norm.match(/(\d{2,4})\s*Kč\s*\/?\s*(?:hod|h\b)/i);
  if (hourlySingle) {
    const n = parseInt(hourlySingle[1]) * 160;
    if (n >= 15000 && n <= 200000) return n;
  }

  // Rozsah s mezerami: "27 000 - 40 000 Kč", "30.000–45.000 Kč"
  const rangeWithSpaces = norm.match(/(\d{2,3})\s?(\d{3})\s*[-–—]+\s*(\d{2,3})\s?(\d{3})\s*(?:Kč|CZK|,-)/i);
  if (rangeWithSpaces) {
    const lo = parseInt(rangeWithSpaces[1] + rangeWithSpaces[2]);
    const hi = parseInt(rangeWithSpaces[3] + rangeWithSpaces[4]);
    if (lo > 5000 && lo < 200000 && hi > 5000 && hi < 200000) {
      return { min: Math.min(lo, hi), max: Math.max(lo, hi), avg: Math.round((lo + hi) / 2) };
    }
  }

  // Rozsah bez mezer: "30000-45000 Kč"
  const rangeNoSpaces = norm.match(/(\d{4,6})\s*[-–—]+\s*(\d{4,6})\s*(?:Kč|CZK|,-)?/i);
  if (rangeNoSpaces) {
    const lo = parseInt(rangeNoSpaces[1]);
    const hi = parseInt(rangeNoSpaces[2]);
    if (lo > 5000 && lo < 200000 && hi > 5000 && hi < 200000) {
      return { min: Math.min(lo, hi), max: Math.max(lo, hi), avg: Math.round((lo + hi) / 2) };
    }
  }

  // Klíčové fráze: "plat od 35 000", "mzda až 50 000", "od 35000 Kč"
  const fromTo = norm.match(/(?:od|from|min|mzda|plat)\s*(\d{2,3})\s?(\d{3})/i);
  if (fromTo) {
    const n = parseInt(fromTo[1] + fromTo[2]);
    if (n > 5000 && n < 200000) return n;
  }

  // Jednoduchá hodnota: "35 000 Kč" nebo "35000 Kč"
  const singleWithSpaces = norm.match(/(\d{2,3})\s(\d{3})\s*(?:Kč|CZK|,-)/i);
  if (singleWithSpaces) {
    const n = parseInt(singleWithSpaces[1] + singleWithSpaces[2]);
    if (n > 5000 && n < 200000) return n;
  }
  const singleNoSpaces = norm.match(/(\d{4,6})\s*(?:Kč|CZK|,-)/i);
  if (singleNoSpaces) {
    const n = parseInt(singleNoSpaces[1]);
    if (n > 5000 && n < 200000) return n;
  }

  return null;
}

// Pomocná: extraktuje porovnatelné číslo z platu (number | {min,max,avg} | null)
function salaryNum(salary) {
  if (!salary) return 0;
  if (typeof salary === 'number') return salary;
  return salary.avg || salary.max || 0;
}

// Pomocná: vrátí MAX platu (pro filtr - ukazuje i nabídky s vyšším rozsahem)
function salaryMax(salary) {
  if (!salary) return 0;
  if (typeof salary === 'number') return salary;
  return salary.max || salary.avg || 0;
}

// ======================================================
// Cache: ukládáme výsledky na 15 minut
// ======================================================
const CACHE_TTL = 15 * 60 * 1000; // 15 minut
const cache = new Map();

function getCacheKey(city, radius) {
  return `${city.toLowerCase().trim()}_${radius}`;
}

// ======================================================
// Pomocná funkce: paralelní scraping jednoho portálu (s retry)
// ======================================================
async function scrapePortal(scraperFn, keywords, city, radius, sourceName) {
  const results = await Promise.allSettled(
    keywords.map(async (kw) => {
      try {
        return await scraperFn(kw, city, radius);
      } catch (firstErr) {
        // Retry jednou po 2s
        console.log(`  ${sourceName} retry (${kw}) po chybě: ${firstErr.message}`);
        await new Promise(r => setTimeout(r, 2000));
        return await scraperFn(kw, city, radius);
      }
    })
  );
  const jobs = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      jobs.push(...r.value);
      console.log(`  ${sourceName} (${keywords[i]}): ${r.value.length} nabídek`);
    } else {
      const msg = r.reason?.message || String(r.reason);
      console.error(`  ${sourceName} chyba (${keywords[i]}): ${msg}`);
      errors.push({ source: sourceName, keyword: keywords[i], error: msg });
    }
  });
  return { jobs, errors };
}

// ======================================================
// CNC relevance filtr
// ======================================================
const INCLUDE_KW = [
  "cnc", "soustru", "karusel", "frézař", "frézk", "frezar",
  "obráb", "obrab", "soustruh", "hrotov", "kovoobráb", "seřizova",
  "číslicov", "vrtačk", "nc program", "nc oper",
  "strojník", "strojní", "brusič", "brus", "zámečník", "svářeč", "svarec",
  "lisov", "obsluha lis", "obsluha stroj", "operátor výroby", "operátor stroj",
  "technolog obráb", "technolog výrob", "strojírensk", "programátor cnc",
  "kovoobrábění", "nástrojář", "nastrojar",
];
const EXCLUDE_KW = [
  "obchodník", "obchodní zástupce", "vodič", "řidič", "barman",
  "barmanka", "účetní", "personalista", "developer", "devops", "marketing",
  "prodejce", "medicinsk", "cnc laser", "call cent", "zákaznick",
  "lektor", "učitel", "pokojsk", "kurýr", "strážn",
];

function isRelevantJob(j, extraKeywords) {
  const text = (j.title + " " + j.description).toLowerCase();
  // Pokud existují uživatelská klíčová slova, stačí shoda s jedním z nich
  const kwMatch = extraKeywords && extraKeywords.length > 0
    ? extraKeywords.some(kw => text.includes(kw.toLowerCase()))
    : false;
  const defaultMatch = INCLUDE_KW.some(kw => text.includes(kw));
  return (kwMatch || defaultMatch) && !EXCLUDE_KW.some(kw => text.includes(kw));
}

// API endpoint
app.get("/api/jobs", async (req, res) => {
  try {
  // Počkej na načtení got-scraping (ESM modul)
  await gotScrapingReady;

  const city = (req.query.city || 'Ostrava').trim();
  const radius = parseInt(req.query.radius) || 0;
  // Klíčová slova od uživatele (čárkou oddělená)
  const rawKeywords = (req.query.keywords || 'CNC, soustružník, frézař, obráběč, CNC operátor').trim();
  const userKeywords = rawKeywords.split(',').map(k => k.trim()).filter(Boolean);
  const startTime = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Hledám: city="${city}", radius=${radius > 0 ? radius + ' km' : 'celá ČR'}, keywords=[${userKeywords.join(', ')}]`);

  // Zkontroluj cache
  const cacheKey = getCacheKey(city, radius) + '_' + userKeywords.sort().join('|').toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    const age = Math.round((Date.now() - cached.timestamp) / 1000);
    console.log(`  Vracím cache (stáří: ${age}s, nabídek: ${cached.data.jobs.length})`);
    return res.json({ ...cached.data, fromCache: true, cacheAge: age });
  }

  // Klíčová slova z nastavení uživatele → dotazy pro portály
  // Každé klíčové slovo jako samostatný dotaz na všech portálech
  const portalKeywords = userKeywords.length > 0 ? userKeywords : ["CNC"];
  // Indeed a Jooble: kombinujeme klíčová slova do jednoho dotazu (agresivní anti-bot)
  const combinedQuery = portalKeywords.join(', ');

  // Paralelní scrapování všech portálů najednou
  console.log("  Spouštím paralelní scrapování (6 portálů)...");
  const [profesiaResult, jobsCzResult, praceCzResult, inworkResult, indeedResult, joobleResult] = await Promise.allSettled([
    scrapePortal(scrapeProfesia, portalKeywords, city, radius, "Profesia.cz"),
    scrapePortal(scrapeJobsCz, portalKeywords, city, radius, "Jobs.cz"),
    scrapePortal(scrapePraceCz, portalKeywords, city, radius, "Prace.cz"),
    scrapePortal(scrapeInwork, portalKeywords, city, radius, "Inwork.cz"),
    scrapePortal(scrapeIndeed, [combinedQuery], city, radius, "Indeed.cz"),
    scrapePortal(scrapeJooble, [combinedQuery], city, radius, "Jooble.cz"),
  ]);

  // Sesbírej výsledky
  let jobs = [];
  const errors = [];
  for (const result of [profesiaResult, jobsCzResult, praceCzResult, inworkResult, indeedResult, joobleResult]) {
    if (result.status === 'fulfilled') {
      jobs.push(...result.value.jobs);
      errors.push(...result.value.errors);
    } else {
      errors.push({ source: 'unknown', error: result.reason?.message || 'Fatal error' });
    }
  }

  // Deduplicate podle normalizované URL (zachovat query parametry pro Indeed apod.)
  const seen = new Set();
  const unique = jobs.filter(j => {
    // Pro Indeed/Jooble nechat celou URL (jk parametr je unikátní identifikátor)
    // Pro ostatní portály odstranit UTM a trackingové parametry
    let dedupeKey;
    try {
      const u = new URL(j.url);
      // Odstranit běžné tracking parametry, ale nechat identifikátory
      ['utm_source','utm_medium','utm_campaign','utm_content','ref','fbclid'].forEach(p => u.searchParams.delete(p));
      dedupeKey = u.toString();
    } catch {
      dedupeKey = j.url;
    }
    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    return true;
  });

  // Post-filtr: odstranit nabídky z jasně vzdálených lokalit
  const targetKraj = cityToKraj(city);
  const locationFiltered = targetKraj
    ? unique.filter(j => {
        const loc = j.location.toLowerCase();
        if (!loc || loc === 'viz nabídka' || loc === 'celá čr' || loc.includes('remote') || loc.includes('z domu')) return true;
        if (loc.includes(city.toLowerCase())) return true;
        for (const [knownCity, knownKraj] of Object.entries(CITY_TO_KRAJ)) {
          if (loc.includes(knownCity) && knownKraj !== targetKraj) return false;
        }
        return true;
      })
    : unique;

  // Relevance filtr (použije uživatelská klíčová slova + výchozí CNC seznam)
  const relevant = locationFiltered.filter(j => isRelevantJob(j, userKeywords));
  const finalJobs = relevant.length > 0 ? relevant : locationFiltered;

  // Seřadíme: město nahoře, pak podle platu sestupně
  const cityLower = city.toLowerCase();
  finalJobs.sort((a, b) => {
    const aLocal = a.location.toLowerCase().includes(cityLower) ? 0 : 1;
    const bLocal = b.location.toLowerCase().includes(cityLower) ? 0 : 1;
    if (aLocal !== bLocal) return aLocal - bLocal;
    // V rámci stejné priority řaď podle platu sestupně
    return salaryNum(b.salary) - salaryNum(a.salary);
  });

  // Statistiky per zdroj
  const sourceStats = {};
  finalJobs.forEach(j => {
    sourceStats[j.source] = (sourceStats[j.source] || 0) + 1;
  });

  // URL pro každý portál s předvyplněnými parametry vyhledávání
  // Každý portál má jiný formát - musíme odpovídat skutečnému vyhledávání
  const citySlug = toCzechSlug(city);
  const kraj = cityToKraj(city);
  const krajPath = kraj ? `${kraj}/` : '';

  // Jobs.cz: každé klíčové slovo jako samostatný q[i] parametr (OR logika)
  const jobsCzParams = new URLSearchParams();
  portalKeywords.forEach((kw, i) => jobsCzParams.append(`q[${i}]`, kw));
  if (city) jobsCzParams.append('locality[name]', city);
  if (radius > 0) jobsCzParams.append('locality[radius]', radius);

  // Prace.cz: nový formát /hledat/ s searchForm parametry
  const praceCzCode = cityToPraceCzCode(city);
  const praceCzProfs = portalKeywords.join(';');

  // Indeed: čárkou oddělená klíčová slova (Indeed chápe čárku jako OR)
  const indeedQuery = portalKeywords.join(', ');

  // Jooble: SearchResult — rgns pro město, ukw mezerami oddělená klíčová slova
  const joobleQuery = portalKeywords.join(' ');

  // Inwork: všechna klíčová slova oddělená mezerou
  const inworkQuery = portalKeywords.join(' ');

  // Profesia: všechna klíčová slova oddělená mezerou (OR hledání)
  const profesiaQuery = portalKeywords.join(' ');

  const sourceUrls = {
    'Profesia.cz': `https://www.profesia.cz/prace/${citySlug}/?search_anywhere=${encodeURIComponent(profesiaQuery)}&count_days=90`,
    'Jobs.cz': `https://www.jobs.cz/prace/${krajPath}?${jobsCzParams}`,
    'Prace.cz': praceCzCode
      ? `https://www.prace.cz/hledat/?searchForm%5Blocality_codes%5D=${praceCzCode}%3D${radius > 0 ? radius : 30}&searchForm%5Bprofs%5D=${encodeURIComponent(praceCzProfs)}&searchForm%5Bsearch%5D=`
      : `https://www.prace.cz/hledat/?searchForm%5Bprofs%5D=${encodeURIComponent(praceCzProfs)}&searchForm%5Bsearch%5D=`,
    'Inwork.cz': kraj ? `https://www.inwork.cz/prace/${kraj}/?keyword=${encodeURIComponent(inworkQuery)}` : `https://www.inwork.cz/prace/?keyword=${encodeURIComponent(inworkQuery)}`,
    'Indeed.cz': `https://cz.indeed.com/jobs?q=${encodeURIComponent(indeedQuery)}&l=${encodeURIComponent(city)}${radius > 0 ? '&radius=' + radius : ''}`,
    'Jooble.cz': `https://cz.jooble.org/SearchResult?rgns=${encodeURIComponent(city)}&ukw=${encodeURIComponent(joobleQuery)}`,
  };

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Hotovo za ${elapsed}s: ${unique.length} unikátních → ${locationFiltered.length} v regionu → ${relevant.length} CNC relevantních`);
  console.log(`  Zdroje:`, sourceStats);

  const responseData = {
    jobs: finalJobs,
    count: finalJobs.length,
    sourceStats,
    sourceUrls,
    errors,
    elapsed: parseFloat(elapsed),
    fetchedAt: new Date().toISOString(),
    fromCache: false,
  };

  // Ulož do cache
  cache.set(cacheKey, { timestamp: Date.now(), data: responseData });

  res.json(responseData);
  } catch (err) {
    console.error('Kritická chyba API:', err);
    res.status(500).json({ error: 'Interní chyba serveru', message: err.message, jobs: [], sourceStats: {}, sourceUrls: {}, errors: [{ source: 'server', error: err.message }] });
  }
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Zastaví předchozí server a spustí nový
app.listen(PORT, () => {
  console.log(`\n Server běží na http://localhost:${PORT}`);
  console.log(` Otevři: http://localhost:${PORT}/pracovni.html`);
  console.log(` API:    http://localhost:${PORT}/api/jobs\n`);
});
