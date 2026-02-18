const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

function fetchPage(pageUrl) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(pageUrl);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
                'Accept-Encoding': 'identity',
            }
        };
        const req = https.request(options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                let redirectUrl = res.headers.location;
                if (redirectUrl.startsWith('/')) redirectUrl = `https://${parsedUrl.hostname}${redirectUrl}`;
                return fetchPage(redirectUrl).then(resolve).catch(reject);
            }
            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

// Kontrola relevance nabídky vůči klíčovým slovům
function isRelevant(title, keywords) {
    const titleLower = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const parts = keywords.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/);
    // Nabídka je relevantní pokud obsahuje alespoň jedno klíčové slovo (delší než 2 znaky)
    const significantWords = parts.filter(w => w.length > 2);
    if (significantWords.length === 0) return true;
    const matchCount = significantWords.filter(w => titleLower.includes(w)).length;
    // Musí odpovídat alespoň 1 slovo ze hledaných
    return matchCount >= 1;
}

async function scrapeJobsCz(keywords, location) {
    const query = encodeURIComponent(keywords);
    const loc = encodeURIComponent(location);
    const pageUrl = `https://www.jobs.cz/prace/${loc.toLowerCase()}/?q=${query}`;
    try {
        const html = await fetchPage(pageUrl);
        const jobs = [];

        // Hledej odkazy na nabídky (/rpd/, /fp/, /pd/) a okolní kontext
        const rpdRegex = /href="(https:\/\/www\.jobs\.cz\/(?:rpd|fp|pd)\/[^"]+)"/gi;
        const titles = [];
        const titleRegex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
        let tMatch;
        while ((tMatch = titleRegex.exec(html)) !== null) {
            titles.push(tMatch[1].replace(/<[^>]*>/g, '').trim());
        }

        // Zkusíme extrahovat firmy - hledej elementy s company
        const companies = [];
        const compRegex = /<span[^>]*(?:class="[^"]*company[^"]*"|data-test[^>]*company)[^>]*>([\s\S]*?)<\/span>/gi;
        let cMatch;
        while ((cMatch = compRegex.exec(html)) !== null) {
            companies.push(cMatch[1].replace(/<[^>]*>/g, '').trim());
        }

        // Lokality
        const locations = [];
        const locRegex = /<span[^>]*(?:class="[^"]*location[^"]*"|data-test[^>]*location)[^>]*>([\s\S]*?)<\/span>/gi;
        let lMatch;
        while ((lMatch = locRegex.exec(html)) !== null) {
            locations.push(lMatch[1].replace(/<[^>]*>/g, '').trim());
        }

        let match, idx = 0;
        while ((match = rpdRegex.exec(html)) !== null && jobs.length < 15) {
            const title = titles[idx] || `Nabídka práce #${idx + 1}`;
            // Filtruj pouze relevantní nabídky
            if (isRelevant(title, keywords)) {
                jobs.push({
                    title: title,
                    company: companies[idx] || 'Neuvedeno',
                    location: locations[idx] || location,
                    url: match[1],
                    portal: 'Jobs.cz',
                    salary: ''
                });
            }
            idx++;
        }
        console.log(`[Jobs.cz] Nalezeno ${jobs.length} relevantních nabídek (celkem ${idx} na stránce)`);
        return jobs;
    } catch (err) {
        console.error(`[Jobs.cz] Chyba: ${err.message}`);
        return [];
    }
}

async function scrapePraceCz(keywords, location) {
    const query = encodeURIComponent(keywords);
    const loc = encodeURIComponent(location);
    const pageUrl = `https://www.prace.cz/nabidky/?q=${query}&l=${loc}`;
    try {
        const html = await fetchPage(pageUrl);
        const jobs = [];
        const linkRegex = /href="((?:https:\/\/www\.prace\.cz)?\/nabidka\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        while ((match = linkRegex.exec(html)) !== null && jobs.length < 15) {
            const title = match[2].replace(/<[^>]*>/g, '').trim();
            const jobUrl = match[1].startsWith('http') ? match[1] : `https://www.prace.cz${match[1]}`;
            if (title && title.length > 3 && isRelevant(title, keywords)) {
                jobs.push({
                    title: title.substring(0, 120),
                    company: 'Neuvedeno',
                    location: location,
                    url: jobUrl,
                    portal: 'Prace.cz',
                    salary: ''
                });
            }
        }
        console.log(`[Prace.cz] Nalezeno ${jobs.length} relevantních nabídek`);
        return jobs;
    } catch (err) {
        console.error(`[Prace.cz] Chyba: ${err.message}`);
        return [];
    }
}

async function scrapeIndeed(keywords, location) {
    const query = encodeURIComponent(keywords);
    const loc = encodeURIComponent(location);
    const pageUrl = `https://cz.indeed.com/jobs?q=${query}&l=${loc}`;
    try {
        const html = await fetchPage(pageUrl);
        const jobs = [];

        // Indeed - zkusíme lépe parsovat karty
        const cardRegex = /<a[^>]*href="(\/(?:rc\/clk|viewjob)\?[^"]+)"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/gi;
        let match;
        while ((match = cardRegex.exec(html)) !== null && jobs.length < 15) {
            const title = match[2].replace(/<[^>]*>/g, '').trim();
            if (title && title.length > 3 && isRelevant(title, keywords)) {
                jobs.push({
                    title: title.substring(0, 120),
                    company: 'Neuvedeno',
                    location: location,
                    url: `https://cz.indeed.com${match[1]}`,
                    portal: 'Indeed',
                    salary: ''
                });
            }
        }

        // Fallback - pokud parsování karet nefungovalo
        if (jobs.length === 0) {
            const vjRegex = /href="(\/(?:rc\/clk|viewjob)\?[^"]+)"/gi;
            while ((match = vjRegex.exec(html)) !== null && jobs.length < 10) {
                jobs.push({
                    title: `${keywords} – nabídka #${jobs.length + 1}`,
                    company: 'Neuvedeno',
                    location: location,
                    url: `https://cz.indeed.com${match[1]}`,
                    portal: 'Indeed',
                    salary: ''
                });
            }
        }

        console.log(`[Indeed] Nalezeno ${jobs.length} nabídek`);
        return jobs;
    } catch (err) {
        console.error(`[Indeed] Chyba: ${err.message}`);
        return [];
    }
}

async function scrapeProfesia(keywords, location) {
    const query = encodeURIComponent(keywords);
    const loc = encodeURIComponent(location);
    const pageUrl = `https://www.profesia.cz/prace/?search_anywhere=${query}&search_place=${loc}`;
    try {
        const html = await fetchPage(pageUrl);
        const jobs = [];
        // Hledej odkazy na nabídky
        const linkRegex = /href="(\/nabidka\/[^"]+)"[^>]*>/gi;
        const titleRegex = /<h2[^>]*class="[^"]*offer-title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
        let match;

        // Fallback: hledej jakékoliv odkazy na /nabidka/
        while ((match = linkRegex.exec(html)) !== null && jobs.length < 15) {
            const jobUrl = `https://www.profesia.cz${match[1]}`;
            // Zkus najít titulek v okolí
            const surrounding = html.substring(Math.max(0, match.index - 500), match.index + 500);
            const titleMatch = surrounding.match(/<(?:h2|h3|a)[^>]*>([\s\S]*?)<\/(?:h2|h3|a)>/i);
            const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';
            if (title && title.length > 3 && isRelevant(title, keywords)) {
                jobs.push({
                    title: title.substring(0, 120),
                    company: 'Neuvedeno',
                    location: location,
                    url: jobUrl,
                    portal: 'Profesia.cz',
                    salary: ''
                });
            }
        }
        console.log(`[Profesia] Nalezeno ${jobs.length} nabídek`);
        return jobs;
    } catch (err) {
        console.error(`[Profesia] Chyba: ${err.message}`);
        return [];
    }
}

async function scrapeKariera(keywords, location) {
    const query = encodeURIComponent(keywords);
    const loc = encodeURIComponent(location);
    const pageUrl = `https://www.kariera.cz/hledani/?q=${query}&l=${loc}`;
    try {
        const html = await fetchPage(pageUrl);
        const jobs = [];
        // Hledej nabídky s odkazy
        const linkRegex = /href="(https?:\/\/www\.kariera\.cz\/nabidka\/[^"]+)"/gi;
        let match;
        while ((match = linkRegex.exec(html)) !== null && jobs.length < 15) {
            const surrounding = html.substring(Math.max(0, match.index - 500), match.index + 500);
            const titleMatch = surrounding.match(/<(?:h2|h3|a)[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/(?:h2|h3|a)>/i);
            const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';
            if (title && title.length > 3 && isRelevant(title, keywords)) {
                jobs.push({
                    title: title.substring(0, 120),
                    company: 'Neuvedeno',
                    location: location,
                    url: match[1],
                    portal: 'Kariera.cz',
                    salary: ''
                });
            }
        }
        console.log(`[Kariera] Nalezeno ${jobs.length} nabídek`);
        return jobs;
    } catch (err) {
        console.error(`[Kariera] Chyba: ${err.message}`);
        return [];
    }
}

async function scrapeDobraPrace(keywords, location) {
    const query = encodeURIComponent(keywords);
    const loc = encodeURIComponent(location);
    const pageUrl = `https://www.dobraprace.cz/nabidky-prace?qs=${query}&ql=${loc}`;
    try {
        const html = await fetchPage(pageUrl);
        const jobs = [];
        const linkRegex = /href="(\/nabidka-prace\/[^"]+)"/gi;
        let match;
        while ((match = linkRegex.exec(html)) !== null && jobs.length < 15) {
            const surrounding = html.substring(Math.max(0, match.index - 500), match.index + 500);
            const titleMatch = surrounding.match(/<(?:h2|h3|a|span)[^>]*>([\s\S]{5,100}?)<\/(?:h2|h3|a|span)>/i);
            const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';
            if (title && title.length > 3 && isRelevant(title, keywords)) {
                jobs.push({
                    title: title.substring(0, 120),
                    company: 'Neuvedeno',
                    location: location,
                    url: `https://www.dobraprace.cz${match[1]}`,
                    portal: 'DobraPrace.cz',
                    salary: ''
                });
            }
        }
        console.log(`[DobraPrace] Nalezeno ${jobs.length} nabídek`);
        return jobs;
    } catch (err) {
        console.error(`[DobraPrace] Chyba: ${err.message}`);
        return [];
    }
}

async function scrapeVolnaMista(keywords, location) {
    const query = encodeURIComponent(keywords);
    const loc = encodeURIComponent(location);
    // Úřad práce - volna-mista.cz
    const pageUrl = `https://www.volnamista.cz/hledani?q=${query}&l=${loc}`;
    try {
        const html = await fetchPage(pageUrl);
        const jobs = [];
        const linkRegex = /href="(\/nabidka\/[^"]+)"/gi;
        let match;
        while ((match = linkRegex.exec(html)) !== null && jobs.length < 15) {
            const surrounding = html.substring(Math.max(0, match.index - 500), match.index + 500);
            const titleMatch = surrounding.match(/<(?:h2|h3|a|span)[^>]*>([\s\S]{5,100}?)<\/(?:h2|h3|a|span)>/i);
            const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';
            if (title && title.length > 3 && isRelevant(title, keywords)) {
                jobs.push({
                    title: title.substring(0, 120),
                    company: 'Neuvedeno',
                    location: location,
                    url: `https://www.volnamista.cz${match[1]}`,
                    portal: 'VolnaMista.cz',
                    salary: ''
                });
            }
        }
        console.log(`[VolnaMista] Nalezeno ${jobs.length} nabídek`);
        return jobs;
    } catch (err) {
        console.error(`[VolnaMista] Chyba: ${err.message}`);
        return [];
    }
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    if (parsedUrl.pathname === '/api/search') {
        const keywords = parsedUrl.query.q || 'cnc obraběč kovu';
        const location = parsedUrl.query.l || 'ostrava';
        console.log(`\n🔍 Hledám: "${keywords}" v "${location}"`);
        try {
            const results = await Promise.allSettled([
                scrapeJobsCz(keywords, location),
                scrapePraceCz(keywords, location),
                scrapeIndeed(keywords, location),
                scrapeProfesia(keywords, location),
                scrapeKariera(keywords, location),
                scrapeDobraPrace(keywords, location),
                scrapeVolnaMista(keywords, location)
            ]);
            let allJobs = [];
            const portalStats = [];
            results.forEach((r, i) => {
                const names = ['Jobs.cz', 'Prace.cz', 'Indeed', 'Profesia.cz', 'Kariera.cz', 'DobraPrace.cz', 'VolnaMista.cz'];
                if (r.status === 'fulfilled') {
                    allJobs = allJobs.concat(r.value);
                    if (r.value.length > 0) portalStats.push(`${names[i]}: ${r.value.length}`);
                }
            });
            console.log(`✅ Celkem nalezeno ${allJobs.length} nabídek ze ${portalStats.length} portálů`);
            if (portalStats.length > 0) console.log(`   📊 ${portalStats.join(', ')}`);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, count: allJobs.length, jobs: allJobs }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') {
        res.writeHead(302, { 'Location': '/prace.html' });
        res.end();
        return;
    }

    // Servíruj statické soubory
    const filePath = path.join(__dirname, parsedUrl.pathname);
    const ext = path.extname(filePath);
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
        res.end(content);
    } catch {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`\n🚀 Server běží na http://localhost:${PORT}`);
    console.log(`📋 Otevři http://localhost:${PORT}/prace.html`);
    console.log(`🔍 API: http://localhost:${PORT}/api/search?q=cnc+obrabec&l=ostrava`);
    console.log(`\nPro ukončení stiskni Ctrl+C\n`);
});
