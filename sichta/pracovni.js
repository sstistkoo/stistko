// Automatická detekce: lokálně = localhost:3001, z GitHubu/jiného hostingu = Render backend
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api/jobs'
  : 'https://cnc-job-scraper.onrender.com/api/jobs';  // <-- po nasazení na Render sem dej svou URL

let jobs = [];
let allJobs = []; // všechny načtené nabídky (bez texového filtru)
let savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
let currentSort = 'default'; // default | salary-desc | salary-asc | source
let searchFilter = ''; // aktuální textový filtr
let seenJobIds = new Set(JSON.parse(localStorage.getItem('seenJobIds') || '[]'));

const DEFAULT_SETTINGS = { city: 'Ostrava', radius: 30, minSalary: 35000, keywords: 'CNC, soustružník, frézař, obráběč, CNC operátor' };

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('searchSettings'));
    return saved ? { ...DEFAULT_SETTINGS, ...saved } : { ...DEFAULT_SETTINGS };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function updateSettingsDisplay(s) {
  document.getElementById('displayCity').textContent = s.city || 'Ostrava';
  const radiusEl = document.getElementById('displayRadius');
  radiusEl.textContent = s.radius > 0 ? `(${s.radius} km)` : '(celá ČR)';
  const minSal = s.minSalary > 0 ? s.minSalary.toLocaleString('cs-CZ') + ' Kč' : 'bez filtru';
  document.getElementById('displayMinSalary').textContent = minSal;
  // Zobrazit klíčová slova jako tagy
  const kwContainer = document.getElementById('displayKeywords');
  if (kwContainer) {
    const kws = (s.keywords || '').split(',').map(k => k.trim()).filter(Boolean);
    kwContainer.innerHTML = kws.map(k => `<span class="tag">${esc(k)}</span>`).join('');
  }
}

function initSettings() {
  const s = loadSettings();
  document.getElementById('settingKeywords').value = s.keywords || DEFAULT_SETTINGS.keywords;
  document.getElementById('settingCity').value = s.city;
  document.getElementById('settingRadius').value = s.radius;
  document.getElementById('settingMinSalary').value = s.minSalary;
  updateSettingsDisplay(s);
}

function saveSettings() {
  const s = {
    keywords: document.getElementById('settingKeywords').value.trim() || DEFAULT_SETTINGS.keywords,
    city: document.getElementById('settingCity').value.trim() || 'Ostrava',
    radius: parseInt(document.getElementById('settingRadius').value) || 0,
    minSalary: parseInt(document.getElementById('settingMinSalary').value) || 0,
  };
  localStorage.setItem('searchSettings', JSON.stringify(s));
  updateSettingsDisplay(s);
  document.getElementById('settingsPanel').classList.add('hidden');
  document.getElementById('settingsToggleBtn').classList.remove('btn-settings-toggle--active');
  // Automaticky obnovit nabídky po změně nastavení
  handleRefresh();
}

function toggleSettings() {
  const panel = document.getElementById('settingsPanel');
  const btn = document.getElementById('settingsToggleBtn');
  panel.classList.toggle('hidden');
  btn.classList.toggle('btn-settings-toggle--active');
}

// HTML escape pro ochranu proti XSS (data z portálů mohou obsahovat HTML)
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

const mapPinSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="icon-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
const dollarSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="icon-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>`;
const trashSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
const externalLinkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

async function handleRefresh() {
  const btn = document.getElementById('refreshBtn');
  const icon = document.getElementById('refreshIcon');
  const text = document.getElementById('refreshText');
  const errorEl = document.getElementById('fetchError');
  const progressEl = document.getElementById('progressBar');

  btn.disabled = true;
  btn.style.opacity = '0.5';
  icon.classList.add('animate-spin');
  text.textContent = 'Načítám ze 6 portálů...';
  if (errorEl) errorEl.classList.add('hidden');
  if (progressEl) progressEl.classList.remove('hidden');

  try {
    const s = loadSettings();
    const kw = encodeURIComponent(s.keywords || DEFAULT_SETTINGS.keywords);
    const url = `${API_URL}?city=${encodeURIComponent(s.city)}&radius=${s.radius}&keywords=${kw}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Server vrátil chybu ${res.status}`);
    const data = await res.json();

    const allJobsRaw = data.jobs || [];
    allJobs = s.minSalary > 0
      ? allJobsRaw.filter(j => !j.salary || salaryMax(j.salary) >= s.minSalary)
      : allJobsRaw;
    jobs = [...allJobs];
    searchFilter = '';
    // Resetovat vyhledávací pole
    const searchInput = document.getElementById('jobSearchInput');
    if (searchInput) searchInput.value = '';

    const now = new Date().toLocaleString('cs-CZ');
    const lastUpdate = document.getElementById('lastUpdate');
    const cacheInfo = data.fromCache ? `<span class="cache-badge">⚡ cache (${data.cacheAge}s)</span>` : '';
    const elapsed = data.elapsed ? ` za ${data.elapsed}s` : '';
    lastUpdate.innerHTML = `Poslední aktualizace: ${now}${elapsed} • ${jobs.length} nabídek ${cacheInfo}`;
    lastUpdate.classList.remove('hidden');

    if (data.errors && data.errors.length > 0) {
      console.warn('Chyby při načítání:', data.errors);
      // Zobrazit ve frontendu, které portály selhaly
      if (errorEl) {
        const failedSources = [...new Set(data.errors.map(e => e.source).filter(Boolean))];
        if (failedSources.length > 0 && failedSources.length < 6) {
          errorEl.innerHTML = `⚠️ Nepodařilo se načíst: ${failedSources.join(', ')}`;
          errorEl.classList.remove('hidden');
          errorEl.style.color = '#fbbf24';
          errorEl.style.background = 'rgba(251,191,36,0.1)';
          errorEl.style.borderColor = 'rgba(251,191,36,0.3)';
        }
      }
    }

    // Store sourceStats and sourceUrls for rendering
    window._sourceStats = data.sourceStats || {};
    window._sourceUrls = data.sourceUrls || {};

    // Označit nové nabídky (ty, co jsme ještě neviděli)
    const newIds = [];
    allJobs.forEach(j => {
      j._isNew = !seenJobIds.has(j.id);
      if (j._isNew) newIds.push(j.id);
    });
    // Uložit viděné ID (max 5000 aby localStorage nepřetekl)
    newIds.forEach(id => seenJobIds.add(id));
    const idsArray = [...seenJobIds];
    if (idsArray.length > 5000) idsArray.splice(0, idsArray.length - 5000);
    localStorage.setItem('seenJobIds', JSON.stringify(idsArray));

    renderJobs();
  } catch (err) {
    console.error('Chyba načítání:', err);
    if (errorEl) {
      errorEl.textContent = ' Nelze se připojit k serveru. Spusť server příkazem: npm start';
      errorEl.classList.remove('hidden');
    }
  } finally {
    btn.disabled = false;
    btn.style.opacity = '1';
    icon.classList.remove('animate-spin');
    text.textContent = 'Obnovit nabídky';
    if (progressEl) progressEl.classList.add('hidden');
  }
}

function isSaved(jobId) {
  return savedJobs.some(j => j.id === jobId);
}

function toggleSave(jobId) {
  const job = jobs.find(j => j.id === jobId) || savedJobs.find(j => j.id === jobId);
  if (!job) return;
  if (isSaved(jobId)) {
    savedJobs = savedJobs.filter(j => j.id !== jobId);
  } else {
    savedJobs = [...savedJobs, job];
  }
  localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
  renderJobs();
  renderSaved();
}

function salaryText(salary) {
  if (!salary) return 'Plat neuvedeno';
  if (typeof salary === 'object' && salary.min && salary.max) {
    return salary.min.toLocaleString('cs-CZ') + ' – ' + salary.max.toLocaleString('cs-CZ') + ' Kč';
  }
  const num = typeof salary === 'number' ? salary : (salary.avg || salary.max || 0);
  return num > 0 ? num.toLocaleString('cs-CZ') + ' Kč' : 'Plat neuvedeno';
}

function salaryNum(salary) {
  if (!salary) return 0;
  if (typeof salary === 'number') return salary;
  return salary.avg || salary.max || 0;
}

// Vrátí MAX platu (pro filtr – nabídka s rozsahem 30-45k se zobrazí i při filtru 35k)
function salaryMax(salary) {
  if (!salary) return 0;
  if (typeof salary === 'number') return salary;
  return salary.max || salary.avg || 0;
}

function sortJobs(sortType) {
  currentSort = sortType;
  switch (sortType) {
    case 'salary-desc':
      jobs.sort((a, b) => salaryNum(b.salary) - salaryNum(a.salary));
      break;
    case 'salary-asc':
      jobs.sort((a, b) => salaryNum(a.salary) - salaryNum(b.salary));
      break;
    case 'source':
      jobs.sort((a, b) => a.source.localeCompare(b.source));
      break;
    default: // city-first je výchozí řazení ze serveru
      break;
  }
  renderJobs();
}

function filterJobs(query) {
  searchFilter = query.toLowerCase().trim();
  if (!searchFilter) {
    jobs = [...allJobs];
  } else {
    jobs = allJobs.filter(j => {
      const text = (j.title + ' ' + j.company + ' ' + j.location + ' ' + (j.description || '')).toLowerCase();
      return text.includes(searchFilter);
    });
  }
  // Znovu aplikovat aktuální řazení
  if (currentSort !== 'default') sortJobs(currentSort);
  else renderJobs();
}

function getSourceClass(source) {
  if (source === 'Jobs.cz') return 'jobscz';
  if (source === 'Prace.cz') return 'pracecz';
  if (source === 'Inwork.cz') return 'inwork';
  if (source === 'Indeed.cz') return 'indeed';
  if (source === 'Jooble.cz') return 'jooble';
  return 'profesia';
}

function renderJobs() {
  const container = document.getElementById('jobList');
  if (jobs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" class="icon-lg" style="margin:0 auto;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>Klikni na "Obnovit nabídky"</p>
      </div>`;
    return;
  }

  let html = '';

  // Source stats (klikatelné - otevřou portál s předvyplněným vyhledáváním)
  const stats = window._sourceStats || {};
  const urls = window._sourceUrls || {};
  if (Object.keys(stats).length > 0) {
    html += '<div class="source-stats">';
    for (const [src, cnt] of Object.entries(stats)) {
      const cls = getSourceClass(src);
      const url = urls[src];
      if (url) {
        html += `<a href="${url}" target="_blank" rel="noopener noreferrer" class="source-stat source-stat--${cls}" title="Otevřít ${src}">${src}: ${cnt} &#8599;</a>`;
      } else {
        html += `<span class="source-stat source-stat--${cls}">${src}: ${cnt}</span>`;
      }
    }
    // Přidáme i portály s 0 výsledky (pokud mají URL)
    for (const [src, url] of Object.entries(urls)) {
      if (!stats[src]) {
        const cls = getSourceClass(src);
        html += `<a href="${url}" target="_blank" rel="noopener noreferrer" class="source-stat source-stat--${cls} source-stat--empty" title="Otevřít ${src}">${src}: 0 &#8599;</a>`;
      }
    }
    html += '</div>';
  }

  // Search + Sort bar
  html += `<div class="sort-bar">
    <div class="search-box">
      <svg xmlns="http://www.w3.org/2000/svg" class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" id="jobSearchInput" placeholder="Hledat v nabídkách..." value="${searchFilter}" oninput="filterJobs(this.value)" />
    </div>
    <label>Řadit:</label>
    <select onchange="sortJobs(this.value)">
      <option value="default" ${currentSort==='default'?'selected':''}>Město nahoře</option>
      <option value="salary-desc" ${currentSort==='salary-desc'?'selected':''}>Plat ↓</option>
      <option value="salary-asc" ${currentSort==='salary-asc'?'selected':''}>Plat ↑</option>
      <option value="source" ${currentSort==='source'?'selected':''}>Podle zdroje</option>
    </select>
  </div>`;

  const filterInfo = searchFilter ? ` <span class="filter-count">(filtr: ${allJobs.length} celkem)</span>` : '';
  html += `<h2 class="results-heading">Nalezeno ${jobs.length} nabídek${filterInfo}</h2>`;

  jobs.forEach(job => {
    const saved = isSaved(job.id);
    const descHtml = job.description ? `<p class="job-desc">${esc(job.description)}</p>` : '';
    const srcClass = getSourceClass(job.source);
    const newBadge = job._isNew ? '<span class="badge-new">NOVÉ</span>' : '';
    const safeId = esc(job.id);
    const linkBtn = job.url
      ? `<a href="${esc(job.url)}" target="_blank" rel="noopener noreferrer" class="btn-link">${externalLinkSvg} Přejít na nabídku</a>`
      : '';
    html += `
      <div class="job-card${job._isNew ? ' job-card--new' : ''}">
        <div class="job-card-header">
          <div>
            <div class="job-title-row">
              <h3 class="job-title">${esc(job.title)}</h3>
              ${newBadge}
              <span class="job-source job-source--${srcClass}">${esc(job.source)}</span>
            </div>
            <p class="job-company">${esc(job.company)}</p>
          </div>
        </div>
        ${descHtml}
        <div class="job-meta">
          <div class="job-meta-item">${mapPinSvg} ${esc(job.location)}</div>
          <div class="job-meta-item">${dollarSvg} ${salaryText(job.salary)}</div>
          <span class="job-type">${esc(job.type)}</span>
        </div>
        <div class="job-actions">
          <button onclick="toggleSave('${safeId}')" class="btn-save ${saved ? 'btn-save-on' : 'btn-save-off'}">
            ${saved ? ' Uloženo' : ' Uložit'}
          </button>
          ${linkBtn}
        </div>
      </div>`;
  });

  container.innerHTML = html;
  renderSaved();
}

function renderSaved() {
  const section = document.getElementById('savedSection');
  const list = document.getElementById('savedList');
  const count = document.getElementById('savedCount');

  if (savedJobs.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  count.textContent = savedJobs.length;

  let html = `<div class="saved-actions">
    <button onclick="exportSavedCSV()" class="btn-export" title="Exportovat do CSV">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Export CSV
    </button>
  </div>`;
  savedJobs.forEach(job => {
    const safeId = esc(job.id);
    html += `
      <div class="saved-item">
        <div>
          <p class="saved-item-title">${esc(job.title)}</p>
          <p class="saved-item-sub">${esc(job.company)}  ${salaryText(job.salary)}</p>
        </div>
        <button onclick="toggleSave('${safeId}')" class="btn-trash">
          ${trashSvg}
        </button>
      </div>`;
  });

  list.innerHTML = html;
}

renderJobs();
renderSaved();
initSettings();

function exportSavedCSV() {
  if (savedJobs.length === 0) return;
  const header = 'Pozice;Firma;Lokalita;Plat;Zdroj;URL';
  const csvEnc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
  const csvSalary = (s) => {
    if (!s) return '';
    if (typeof s === 'number') return s;
    if (s.min && s.max) return `${s.min}-${s.max}`;
    return s.avg || s.max || '';
  };
  const rows = savedJobs.map(j =>
    [csvEnc(j.title), csvEnc(j.company), csvEnc(j.location), csvSalary(j.salary), csvEnc(j.source), csvEnc(j.url)].join(';')
  );
  const csv = '\uFEFF' + header + '\n' + rows.join('\n'); // BOM for Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cnc-nabidky-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Auto-load: pokud jsou prázdné výsledky, automaticky načíst po otevření stránky
if (jobs.length === 0) {
  handleRefresh();
}
