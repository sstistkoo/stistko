function toggle(id) {
  const body = document.getElementById('body-' + id);
  if (!body) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open');
  
  const header = body.previousElementSibling;
  if (header && header.classList.contains('accordion-header')) {
    header.classList.toggle('open');
    header.setAttribute('aria-expanded', !isOpen);
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

function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  
  target.classList.add('open');
  const hdr = target.previousElementSibling;
  if (hdr && hdr.classList.contains('accordion-header')) {
    hdr.classList.add('open');
    hdr.setAttribute('aria-expanded', 'true');
  }

  document.querySelectorAll('.sidebar-group').forEach(g => g.classList.remove('open'));

  target.querySelectorAll('.accordion-body').forEach(body => {
    if (!body.classList.contains('open')) {
      body.classList.add('open');
      const h = body.previousElementSibling;
      if (h && h.classList.contains('accordion-header')) {
        h.classList.add('open');
        h.setAttribute('aria-expanded', 'true');
      }
    }
  });

  const links = document.querySelectorAll('.sidebar-group-content a');
  links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));

  setTimeout(() => {
    const rect = target.getBoundingClientRect();
    const absoluteTop = window.scrollY + rect.top - 80;
    window.scrollTo({ top: Math.max(0, absoluteTop), behavior: 'smooth' });
    closeSidebar();
  }, 150);
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const menuToggle = document.querySelector('.menu-toggle');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('active');
  if (menuToggle) menuToggle.classList.toggle('active');
  document.body.classList.toggle('sidebar-open');
}

function closeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const menuToggle = document.querySelector('.menu-toggle');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
  if (menuToggle) menuToggle.classList.remove('active');
  document.body.classList.remove('sidebar-open');
}

function openAccordion(id) {
  const body = document.getElementById('body-' + id);
  if (!body) return;
  const header = body.previousElementSibling;
  if (!header || !header.classList.contains('accordion-header')) return;
  header.classList.add('open');
  body.classList.add('open');
  setTimeout(() => header.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  try {
    localStorage.setItem('cayce-theme', isDark ? 'light' : 'dark');
  } catch (e) {}
  updateThemeButton(!isDark);
}

function closePlanet() {
  const detail = document.getElementById('planet-detail');
  if (detail) detail.style.display = 'none';
  document.querySelectorAll('.plan-btn').forEach(b => b.classList.remove('plan-btn--active'));
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
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
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

document.querySelectorAll('.sidebar-group-header').forEach(header => {
  header.addEventListener('click', function() {
    const group = this.parentElement;
    if (group) group.classList.toggle('open');
  });
});

document.querySelectorAll('.section-label').forEach(label => {
  label.addEventListener('click', function() {
    const section = this.parentElement;
    if (section) section.classList.toggle('collapsed');
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
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('accordion-header')) {
    e.preventDefault();
    e.target.click();
  }
});



(function initSectionHighlight() {
  const links = document.querySelectorAll('.sidebar-group-content a');
  if (!links.length) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        links.forEach(a => {
          const isMatch = a.getAttribute('href') === '#' + id;
          a.classList.toggle('active', isMatch);
          if (isMatch) {
            const group = a.closest('.sidebar-group');
            if (group && !group.classList.contains('open')) {
              group.classList.add('open');
              saveMenuState();
            }
          }
        });
      }
    });
  }, { threshold: 0.3 });
  
  document.querySelectorAll('[id]').forEach(section => observer.observe(section));
})();