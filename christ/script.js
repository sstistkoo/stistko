const SIDEBAR_TO_THEME_MAP = {
  uvod: 'sg-uvod',
  genesis: 'sg-genesis',
  zjeveni: 'sg-zjeveni',
  kosmologie: 'sg-kosmologie',
  archiv: 'sg-archiv',
};

const THEME_TO_SIDEBAR_MAP = {
  'sg-uvod': 'group-uvod',
  'sg-genesis': 'group-genesis',
  'sg-zjeveni': 'group-zjeveni',
  'sg-kosmologie': 'group-kosmologie',
  'sg-archiv': 'group-archiv',
};

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

  // Keep sidebar instantly synced when user opens section in main content.
  if (!isOpen) {
    setActiveSidebarLinkById(body.id);
  }
}

function setActiveSidebarLinkById(id) {
  if (!id) return;
  const allLinks = document.querySelectorAll('.sidebar-group-content a');
  allLinks.forEach(a => a.classList.remove('active'));

  const targetLink = document.querySelector(`.sidebar-group-content a[href="#${id}"]`);
  if (!targetLink) return;

  targetLink.classList.add('active');
  const group = targetLink.closest('.sidebar-group');
  if (group) group.classList.add('open');

  // On desktop keep active item visible in long menu.
  if (window.innerWidth > 800) {
    targetLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function toggleGroup(id) {
  const el = document.getElementById('group-' + id);
  if (el) {
    el.classList.toggle('open');
    const themeClass = SIDEBAR_TO_THEME_MAP[id];
    if (themeClass) {
      const isOpen = el.classList.contains('open');
      setThemeCollapsed(themeClass, !isOpen);
    }
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
    btn.querySelector('.theme-label').textContent = isDark ? 'Světlý' : 'Tmavý';
  }
  const mob = document.getElementById('theme-toggle-mobile');
  if (mob) mob.textContent = isDark ? '☀️' : '🌙';
}

function toggleMainSection(sgClass) {
  document.querySelectorAll('.' + sgClass).forEach(sg => {
    sg.classList.toggle('collapsed');
  });
}

function toggleThemeSection(themeClass) {
  const groups = Array.from(document.querySelectorAll('.' + themeClass));
  if (!groups.length) return;
  const shouldCollapse = groups.some(group => !group.classList.contains('collapsed'));
  setThemeCollapsed(themeClass, shouldCollapse);
  saveMenuState();
}

function setThemeCollapsed(themeClass, isCollapsed) {
  const groups = Array.from(document.querySelectorAll('.' + themeClass));
  if (!groups.length) return;
  groups.forEach(group => {
    group.classList.toggle('collapsed', isCollapsed);
  });
  applyThemeSync(themeClass, isCollapsed);
}

function collapseAllThemes() {
  Object.keys(THEME_TO_SIDEBAR_MAP).forEach(themeClass => {
    setThemeCollapsed(themeClass, true);
  });
  saveMenuState();
}

function expandAllThemes() {
  Object.keys(THEME_TO_SIDEBAR_MAP).forEach(themeClass => {
    setThemeCollapsed(themeClass, false);
  });
  saveMenuState();
}

function applyThemeSync(themeClass, isCollapsed) {
  const marker = document.querySelector(`.major-section-marker[data-theme="${themeClass}"]`);
  if (marker) {
    marker.classList.toggle('is-collapsed', isCollapsed);
    marker.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
  }

  const sidebarId = THEME_TO_SIDEBAR_MAP[themeClass];
  if (sidebarId) {
    const sidebarGroup = document.getElementById(sidebarId);
    if (sidebarGroup) {
      // Keep sidebar group visible, only sync collapsed/expanded state.
      sidebarGroup.classList.toggle('open', !isCollapsed);
    }
  }
}

function initThemeSyncState() {
  const themes = ['sg-uvod', 'sg-genesis', 'sg-zjeveni', 'sg-kosmologie', 'sg-archiv'];
  themes.forEach(themeClass => {
    const groups = Array.from(document.querySelectorAll('.' + themeClass));
    if (!groups.length) return;
    const isCollapsed = groups.every(group => group.classList.contains('collapsed'));
    applyThemeSync(themeClass, isCollapsed);
  });
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const menuToggle = document.querySelector('.menu-toggle');
  if (!sidebar || !overlay || !menuToggle) return;

  // Desktop: permanent collapsible sidebar via Cayce tab.
  if (window.innerWidth > 800) {
    const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
    const isOpen = !isCollapsed;
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    const tabBtn = document.querySelector('.sidebar-tab');
    if (tabBtn) tabBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    try {
      localStorage.setItem('cayce-sidebar-collapsed', isCollapsed ? '1' : '0');
    } catch (e) {}
    return;
  }

  // Mobile: slide-in sidebar with overlay/hamburger.
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
  menuToggle.classList.toggle('active');
  menuToggle.setAttribute('aria-expanded', sidebar.classList.contains('open') ? 'true' : 'false');
}

function closeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const menuToggle = document.querySelector('.menu-toggle');
  if (!sidebar || !overlay || !menuToggle) return;
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
  menuToggle.classList.remove('active');
  menuToggle.setAttribute('aria-expanded', 'false');
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

  setActiveSidebarLinkById(id);

  setTimeout(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (window.innerWidth <= 800) closeSidebar();
  }, 200);
}

function syncSidebarWithVisibleContent() {
  const linkMap = new Map();
  const links = Array.from(document.querySelectorAll('.sidebar-group-content a[href^="#"]'));
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.length < 2) return;
    const id = href.slice(1);
    if (!linkMap.has(id)) {
      linkMap.set(id, []);
    }
    linkMap.get(id).push(link);
  });

  const visibleById = new Set();
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.target.id) return;
        if (entry.isIntersecting) {
          visibleById.add(entry.target.id);
        } else {
          visibleById.delete(entry.target.id);
        }
      });

      const allLinks = document.querySelectorAll('.sidebar-group-content a');
      allLinks.forEach(a => a.classList.remove('active'));

      const orderedVisible = Array.from(visibleById);
      if (!orderedVisible.length) return;
      const activeId = orderedVisible[orderedVisible.length - 1];
      const activeLinks = linkMap.get(activeId);
      if (activeLinks && activeLinks.length) {
        activeLinks[0].classList.add('active');
        const group = activeLinks[0].closest('.sidebar-group');
        if (group) group.classList.add('open');
      }
    },
    { root: null, rootMargin: '-20% 0px -60% 0px', threshold: 0.05 }
  );

  linkMap.forEach((_, id) => {
    const target = document.getElementById(id);
    if (target) observer.observe(target);
  });
}

function initChakraNavigation() {
  const chakraRows = document.querySelectorAll('.chakra-row[data-target]');
  chakraRows.forEach(row => {
    row.addEventListener('click', () => {
      const target = row.getAttribute('data-target');
      if (target) {
        scrollToSection(target);
      }
    });
  });

  const chakraNodes = document.querySelectorAll('.chakra-node[data-target]');
  chakraNodes.forEach(node => {
    node.addEventListener('click', () => {
      const target = node.getAttribute('data-target');
      if (target) {
        scrollToSection(target);
      }
    });

    node.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const target = node.getAttribute('data-target');
        if (target) {
          scrollToSection(target);
        }
      }
    });
  });
}

function initComparisonTableNavigation() {
  const rows = document.querySelectorAll('.compare-row[data-target]');
  rows.forEach(row => {
    row.addEventListener('click', () => {
      const target = row.getAttribute('data-target');
      if (target) {
        scrollToSection(target);
      }
    });

    row.setAttribute('tabindex', '0');
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const target = row.getAttribute('data-target');
        if (target) {
          scrollToSection(target);
        }
      }
    });
  });
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
  syncSidebarWithVisibleContent();
  initChakraNavigation();
  initComparisonTableNavigation();
  initThemeSyncState();

  // Desktop sidebar starts collapsed and opens from Cayce tab.
  if (window.innerWidth > 800) {
    try {
      const saved = localStorage.getItem('cayce-sidebar-collapsed');
      if (saved === null || saved === '1') {
        document.body.classList.add('sidebar-collapsed');
      }
    } catch (e) {
      document.body.classList.add('sidebar-collapsed');
    }
    const isOpen = !document.body.classList.contains('sidebar-collapsed');
    const menuToggle = document.querySelector('.menu-toggle');
    const tabBtn = document.querySelector('.sidebar-tab');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (tabBtn) tabBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  try {
    const saved = localStorage.getItem('cayce-theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      updateThemeButton(true);
    }
  } catch (e) {}

  // Keyboard support for clickable theme markers.
  document.querySelectorAll('.major-section-marker[onclick]').forEach(marker => {
    marker.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        marker.click();
      }
    });
  });
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