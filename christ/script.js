function toggle(id) {
  const el = document.getElementById('body-' + id);
  const header = document.querySelector(`button[onclick="toggle('${id}')"]`);
  if (!el || !header) return;
  const isOpen = el.classList.contains('open');
  el.classList.toggle('open');
  header.classList.toggle('open');
  header.setAttribute('aria-expanded', !isOpen);
}

function toggleGroup(name) {
  const group = document.getElementById('group-' + name);
  if (group) group.classList.toggle('open');
}

function toggleMainSection(name) {
  const section = document.querySelector('.' + name);
  if (section) section.classList.toggle('collapsed');
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(closeSidebar, 300);
  }
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const menuBtn = document.querySelector('.menu-toggle');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('active');
  if (menuBtn) menuBtn.classList.toggle('active');
}

function closeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const menuBtn = document.querySelector('.menu-toggle');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
  if (menuBtn) menuBtn.classList.remove('active');
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  try {
    localStorage.setItem('cayce-theme', newTheme);
  } catch(e) {}
  updateThemeUI();
}

function updateThemeUI() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const icons = document.querySelectorAll('.theme-icon');
  const labels = document.querySelectorAll('.theme-label');
  icons.forEach(icon => icon.textContent = isDark ? '☀️' : '🌙');
  labels.forEach(label => label.textContent = isDark ? 'Světlý mód' : 'Tmavý mód');
}

(function initTheme() {
  try {
    const saved = localStorage.getItem('cayce-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch(e) {}
  updateThemeUI();
})();

window.addEventListener('scroll', function() {
  const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = (winScroll / height) * 100;
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) progressBar.style.width = scrolled + '%';
  
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    if (scrolled > 10) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }
});

document.getElementById('back-to-top')?.addEventListener('click', function() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelectorAll('.sidebar-group-header').forEach(header => {
  header.addEventListener('click', function() {
    const group = this.parentElement;
    group.classList.toggle('open');
  });
});

document.querySelectorAll('.section-label').forEach(label => {
  label.addEventListener('click', function() {
    const section = this.parentElement;
    section.classList.toggle('collapsed');
  });
});

document.querySelectorAll('.chakra-row').forEach(row => {
  row.addEventListener('click', function() {
    const detail = document.getElementById('planet-detail');
    if (detail) detail.style.display = 'block';
  });
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeSidebar();
});

document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', function() {
    const body = this.nextElementSibling;
    this.classList.toggle('open');
    body.classList.toggle('open');
  });
});