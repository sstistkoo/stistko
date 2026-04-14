function toggle(id) {
  const body = document.getElementById('body-' + id);
  if (!body) return;
  const isOpen = body.classList.contains('open');
  if (isOpen) {
    body.classList.remove('open');
  } else {
    body.classList.add('open');
  }
  
  const header = body.previousElementSibling;
  if (header && header.classList.contains('accordion-header')) {
    if (isOpen) {
      header.classList.remove('open');
      header.setAttribute('aria-expanded', 'false');
    } else {
      header.classList.add('open');
      header.setAttribute('aria-expanded', 'true');
    }
  }
}

function toggleGroup(id) {
  const el = document.getElementById('group-' + id);
  if (el) {
    el.classList.toggle('open');
    saveMenuState();
  }
}

function saveMenuState() {
  const openGroups = [];
  document.querySelectorAll('.sidebar-group.open').forEach(g => {
    openGroups.push(g.id.replace('group-', ''));
  });
  try {
    localStorage.setItem('cayce-menu', JSON.stringify(openGroups));
  } catch (e) {}
}

function loadMenuState() {
  try {
    const saved = localStorage.getItem('cayce-menu');
    if (saved) {
      JSON.parse(saved).forEach(id => {
        const el = document.getElementById('group-' + id);
        if (el) el.classList.add('open');
      });
    }
  } catch (e) {}
}

function updateThemeButton(isDark) {
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
    btn.querySelector('.theme-label').textContent = isDark ? 'Světlý mód' : 'Tmavý mód';
  }
  const mob = document.getElementById('theme-toggle-mobile');
  if (mob) mob.textContent = isDark ? '☀️' : '🌙';
}

function toggleMainSection(sgClass) {
  document.querySelectorAll('.' + sgClass).forEach(sg => {
    sg.classList.toggle('collapsed');
  });
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  document.querySelector('.sidebar-overlay').classList.toggle('active');
  document.querySelector('.menu-toggle').classList.toggle('active');
}

function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay').classList.remove('active');
  document.querySelector('.menu-toggle').classList.remove('active');
}

function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;

  target.classList.add('open');
  const hdr = target.previousElementSibling;
  if (hdr && hdr.classList.contains('accordion-header')) {
    hdr.classList.add('open');
    hdr.setAttribute('aria-expanded', 'true');
  }

  const links = document.querySelectorAll('.sidebar-group-content a');
  links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));

  setTimeout(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    closeSidebar();
  }, 200);
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  try {
    localStorage.setItem('cayce-theme', isDark ? 'light' : 'dark');
  } catch (e) {}
  updateThemeButton(!isDark);
}

document.addEventListener('DOMContentLoaded', function() {
  loadMenuState();
  try {
    const saved = localStorage.getItem('cayce-theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      updateThemeButton(true);
    }
  } catch (e) {}
});

(function initTheme() {
  try {
    const saved = localStorage.getItem('cayce-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    }
  } catch(e) {}
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  updateThemeButton(isDark);
})();

window.addEventListener('scroll', function() {
  const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
  
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) progressBar.style.width = scrolled + '%';
  
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    backToTop.classList.toggle('visible', scrolled > 10);
  }
});

const backToTopBtn = document.getElementById('back-to-top');
if (backToTopBtn) {
  backToTopBtn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeSidebar();
});