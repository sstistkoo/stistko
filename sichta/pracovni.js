const mockJobs = [
  { id: 1, title: 'CNC operátor', company: 'VOKD Ostrava', salary: 38000, location: 'Ostrava', url: 'https://www.prace.cz', type: 'Hlavní pracovní poměr', source: 'Práce.cz' },
  { id: 2, title: 'Soustružník na CNC', company: 'Vítkovice Heavy Machinery', salary: 42000, location: 'Ostrava', url: 'https://www.jobs.cz', type: 'Hlavní pracovní poměr', source: 'Jobs.cz' },
  { id: 3, title: 'Operátor karuselu', company: 'Průmyslová dílna Ostrava', salary: 36500, location: 'Ostrava', url: 'https://www.prace.cz', type: 'Dočasná práce', source: 'Průmyslové.cz' },
  { id: 4, title: 'CNC strojvedoucí', company: 'Třinecké železárny', salary: 45000, location: 'Ostrava', url: 'https://www.jobs.cz', type: 'Hlavní pracovní poměr', source: 'Jobs.cz' },
  { id: 5, title: 'Operátor CNC frézky', company: 'Průmyslové služby s.r.o.', salary: 37500, location: 'Ostrava', url: 'https://www.prace.cz', type: 'Hlavní pracovní poměr', source: 'Práce.cz' }
];

let jobs = [];
let savedJobs = [];

const mapPinSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="icon-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
const dollarSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="icon-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>`;
const trashSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
const externalLinkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

function handleRefresh() {
  const btn = document.getElementById('refreshBtn');
  const icon = document.getElementById('refreshIcon');
  const text = document.getElementById('refreshText');

  btn.disabled = true;
  btn.classList.add('opacity-50');
  icon.classList.add('animate-spin');
  text.textContent = 'Načítám...';

  setTimeout(() => {
    jobs = [...mockJobs];
    renderJobs();

    const now = new Date().toLocaleString('cs-CZ');
    const lastUpdate = document.getElementById('lastUpdate');
    lastUpdate.textContent = 'Poslední aktualizace: ' + now;
    lastUpdate.classList.remove('hidden');

    btn.disabled = false;
    btn.classList.remove('opacity-50');
    icon.classList.remove('animate-spin');
    text.textContent = 'Obnovit nabídky';
  }, 1000);
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
  renderJobs();
  renderSaved();
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
    html += `
      <div class="job-card">
        <div class="job-card-header">
          <div>
            <div class="job-title-row">
              <h3 class="job-title">${job.title}</h3>
              <span class="job-source">${job.source}</span>
            </div>
            <p class="job-company">${job.company}</p>
          </div>
        </div>
        <div class="job-meta">
          <div class="job-meta-item">${mapPinSvg} ${job.location}</div>
          <div class="job-meta-item">${dollarSvg} ${job.salary.toLocaleString('cs-CZ')} Kč</div>
          <span class="job-type">${job.type}</span>
        </div>
        <div class="job-actions">
          <button onclick="toggleSave(${job.id})" class="btn-save ${saved ? 'btn-save-on' : 'btn-save-off'}">
            ${saved ? '★ Uloženo' : '☆ Uložit'}
          </button>
          <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="btn-link">
            ${externalLinkSvg} Přejít
          </a>
        </div>
      </div>`;
  });

  container.innerHTML = html;
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
          <p class="saved-item-sub">${job.company} • ${job.salary.toLocaleString('cs-CZ')} Kč</p>
        </div>
        <button onclick="toggleSave(${job.id})" class="btn-trash">
          ${trashSvg}
        </button>
      </div>`;
  });

  list.innerHTML = html;
}

renderJobs();
