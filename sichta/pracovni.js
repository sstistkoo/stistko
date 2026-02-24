const API_URL = 'http://localhost:3001/api/jobs';

let jobs = [];
let savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');

const DEFAULT_SETTINGS = { city: 'Ostrava', radius: 30, minSalary: 35000 };

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
}

function initSettings() {
  const s = loadSettings();
  document.getElementById('settingCity').value = s.city;
  document.getElementById('settingRadius').value = s.radius;
  document.getElementById('settingMinSalary').value = s.minSalary;
  updateSettingsDisplay(s);
}

function saveSettings() {
  const s = {
    city: document.getElementById('settingCity').value.trim() || 'Ostrava',
    radius: parseInt(document.getElementById('settingRadius').value) || 0,
    minSalary: parseInt(document.getElementById('settingMinSalary').value) || 0,
  };
  localStorage.setItem('searchSettings', JSON.stringify(s));
  updateSettingsDisplay(s);
  document.getElementById('settingsPanel').classList.add('hidden');
  document.getElementById('settingsToggleBtn').classList.remove('btn-settings-toggle--active');
}

function toggleSettings() {
  const panel = document.getElementById('settingsPanel');
  const btn = document.getElementById('settingsToggleBtn');
  panel.classList.toggle('hidden');
  btn.classList.toggle('btn-settings-toggle--active');
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

  btn.disabled = true;
  btn.style.opacity = '0.5';
  icon.classList.add('animate-spin');
  text.textContent = 'Načítám...';
  if (errorEl) errorEl.classList.add('hidden');

  try {
    const s = loadSettings();
    const url = `${API_URL}?city=${encodeURIComponent(s.city)}&radius=${s.radius}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Server vrátil chybu ${res.status}`);
    const data = await res.json();

    const allJobs = data.jobs || [];
    // Filtruj plat na straně klienta (nezobrazovat nabídky s nižším platem, přičemž null = nevíme → necháme)
    jobs = s.minSalary > 0
      ? allJobs.filter(j => !j.salary || j.salary >= s.minSalary)
      : allJobs;

    const now = new Date().toLocaleString('cs-CZ');
    const lastUpdate = document.getElementById('lastUpdate');
    lastUpdate.textContent = `Poslední aktualizace: ${now}  načteno ${jobs.length} nabídek`;
    lastUpdate.classList.remove('hidden');

    if (data.errors && data.errors.length > 0) {
      console.warn('Chyby při načítání:', data.errors);
    }

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
  return salary.toLocaleString('cs-CZ') + ' Kč';
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

  let html = `<h2 class="results-heading">Nalezeno ${jobs.length} nabídek</h2>`;

  jobs.forEach(job => {
    const saved = isSaved(job.id);
    const descHtml = job.description ? `<p class="job-desc">${job.description}</p>` : '';
    html += `
      <div class="job-card">
        <div class="job-card-header">
          <div>
            <div class="job-title-row">
              <h3 class="job-title">${job.title}</h3>
              <span class="job-source job-source--${job.source === 'Jobs.cz' ? 'jobscz' : job.source === 'Prace.cz' ? 'pracecz' : 'profesia'}">${job.source}</span>
            </div>
            <p class="job-company">${job.company}</p>
          </div>
        </div>
        ${descHtml}
        <div class="job-meta">
          <div class="job-meta-item">${mapPinSvg} ${job.location}</div>
          <div class="job-meta-item">${dollarSvg} ${salaryText(job.salary)}</div>
          <span class="job-type">${job.type}</span>
        </div>
        <div class="job-actions">
          <button onclick="toggleSave('${job.id}')" class="btn-save ${saved ? 'btn-save-on' : 'btn-save-off'}">
            ${saved ? ' Uloženo' : ' Uložit'}
          </button>
          <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="btn-link">
            ${externalLinkSvg} Přejít na nabídku
          </a>
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

  let html = '';
  savedJobs.forEach(job => {
    html += `
      <div class="saved-item">
        <div>
          <p class="saved-item-title">${job.title}</p>
          <p class="saved-item-sub">${job.company}  ${salaryText(job.salary)}</p>
        </div>
        <button onclick="toggleSave('${job.id}')" class="btn-trash">
          ${trashSvg}
        </button>
      </div>`;
  });

  list.innerHTML = html;
}

renderJobs();
renderSaved();
initSettings();
