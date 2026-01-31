/**
 * INIT.JS - Inicializace aplikace (ES6 hybridní)
 * - Setup canvas
 * - Load saved data
 * - Initialize UI
 * - Start animation loop
 * - Error boundaries
 * @module init
 */

// ===== ES6 EXPORT PLACEHOLDER =====
// export const INIT = {}; // Bude aktivováno po plné migraci

let animationFrameId = null;

/**
 * Safe initialization wrapper
 */
function safeInit(fn, name) {
  try {
    fn();
  } catch (error) {
    console.error(`🔴 Init Error in ${name}:`, error);
    if (window.showErrorNotification) {
      window.showErrorNotification(`Chyba při inicializaci: ${name}`);
    }
  }
}

function initializeApp() {
  try {
    const canvas = document.getElementById("canvas");
    if (!canvas) {
      console.error("❌ Canvas element not found!");
      return;
    }

    // Prevent pinch-to-zoom on mobile (which would break the UI)
    document.addEventListener('touchmove', function(e) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    // Initialize API Keys safely
    safeInit(() => initializeApiKeys(), 'API Keys');

    // Setup canvas resolution
    safeInit(() => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      // Store canvas reference globally
      window.canvas = canvas;
    }, 'Canvas Setup');

    // Initialize defaults if not already set
    if (window.zoom === undefined) window.zoom = 2;
    if (window.panX === undefined) window.panX = canvas.width / 2;
    if (window.panY === undefined) window.panY = canvas.height / 2;
    if (!window.shapes) window.shapes = [];
    if (!window.points) window.points = [];
    if (!window.selectedItems) window.selectedItems = [];

    // Initialize drawing state
    safeInit(() => {
      if (window.updateSnapPoints) window.updateSnapPoints();
    }, 'Snap Points');

    // Setup canvas event handlers (mousedown, mousemove, etc.)
    safeInit(() => {
      if (window.setupCanvasEvents) window.setupCanvasEvents();
    }, 'Canvas Events');

    // Initialize default drawing settings (barvy a styly)
    safeInit(() => {
      if (window.initializeDefaultSettings) window.initializeDefaultSettings();
    }, 'Drawing Settings');

    // Initialize dimension color settings (barvy kót)
    safeInit(() => {
      if (window.initializeDimensionSettings) window.initializeDimensionSettings();
    }, 'Dimension Settings');

    // Initialize AI provider models
    safeInit(() => {
      if (window.updateModelsForProvider) window.updateModelsForProvider();
    }, 'AI Provider');

    // Setup model select change listener for image upload visibility
    safeInit(() => {
      const modelSelect = document.getElementById("aiModelSelect");
      if (modelSelect && window.updateImageUploadVisibility) {
        modelSelect.addEventListener("change", window.updateImageUploadVisibility);
      }
    }, 'Model Select Listener');

    // Start animation loop
    safeInit(() => startAnimationLoop(), 'Animation Loop');

    // Load saved project if exists
    safeInit(() => loadAutoSave(), 'Auto Save Load');

    // Auto-save every 30 seconds
    setInterval(() => {
      try {
        if (window.saveProject) {
          autoSave();
        }
      } catch (e) {
        console.warn('⚠️ AutoSave failed:', e);
      }
    }, 30000);

    console.log('✅ App initialized successfully');

  } catch (error) {
    console.error('🔴 Critical initialization error:', error);
    if (window.showErrorNotification) {
      window.showErrorNotification('Kritická chyba při spuštění aplikace');
    }
  }
}

/**
 * Initialize all API keys
 */
function initializeApiKeys() {
  // Initialize API Key with demo if needed
  const keys = JSON.parse(localStorage.getItem("soustruznik_api_keys") || "[]");
  if (keys.length === 0 && window.EMBEDDED_API_KEY) {
    keys.push({
      key: window.EMBEDDED_API_KEY,
      name: "Demo Key",
      active: true
    });
    localStorage.setItem("soustruznik_api_keys", JSON.stringify(keys));
  }

  // Initialize Groq API Key with demo if needed
  const groqKeys = JSON.parse(localStorage.getItem("soustruznik_groq_api_keys") || "[]");
  if (groqKeys.length === 0 && window.EMBEDDED_GROQ_API_KEY) {
    groqKeys.push({
      key: window.EMBEDDED_GROQ_API_KEY,
      name: "Demo Groq Key",
      active: true
    });
    localStorage.setItem("soustruznik_groq_api_keys", JSON.stringify(groqKeys));
  }

  // Initialize OpenRouter API Key with demo if needed
  const openrouterKeys = JSON.parse(localStorage.getItem("soustruznik_openrouter_api_keys") || "[]");
  if (openrouterKeys.length === 0 && window.EMBEDDED_OPENROUTER_API_KEY) {
    openrouterKeys.push({
      key: window.EMBEDDED_OPENROUTER_API_KEY,
      name: "Demo OpenRouter Key",
      active: true
    });
    localStorage.setItem("soustruznik_openrouter_api_keys", JSON.stringify(openrouterKeys));
  }

  // Initialize Mistral API Key with demo if needed
  const mistralKeys = JSON.parse(localStorage.getItem("soustruznik_mistral_api_keys") || "[]");
  if (mistralKeys.length === 0 && window.EMBEDDED_MISTRAL_API_KEY) {
    mistralKeys.push({
      key: window.EMBEDDED_MISTRAL_API_KEY,
      name: "Demo Mistral Key",
      active: true
    });
    localStorage.setItem("soustruznik_mistral_api_keys", JSON.stringify(mistralKeys));
  }
}

function startAnimationLoop() {
  function animate() {
    if (window.draw) {
      window.draw();
    }
    animationFrameId = requestAnimationFrame(animate);
  }
  animate();
}

function loadAutoSave() {
  try {
    const saved = localStorage.getItem("autosave_project");
    if (saved) {
      const project = JSON.parse(saved);
      if (project.shapes && project.points) {
        if (window.shapes) {
          window.shapes.length = 0;
          window.shapes.push(...project.shapes);
        }
        if (window.points) {
          window.points.length = 0;
          window.points.push(...project.points);
        }
        if (project.settings) {
          if (project.settings.zoom !== undefined) window.zoom = project.settings.zoom;
          if (project.settings.panX !== undefined) window.panX = project.settings.panX;
          if (project.settings.panY !== undefined) window.panY = project.settings.panY;
        }
        if (window.updateSnapPoints) window.updateSnapPoints();
      }
    }
  } catch (e) {
    console.warn("⚠️ Chyba při načítání autosave:", e);
  }
}

function autoSave() {
  try {
    const project = {
      version: "1.0",
      date: new Date().toISOString(),
      settings: {
        zoom: window.zoom,
        panX: window.panX,
        panY: window.panY,
      },
      shapes: window.shapes || [],
      points: window.points || [],
    };
    localStorage.setItem("autosave_project", JSON.stringify(project));
  } catch (e) {
    // Ignore storage errors (quota exceeded)
  }
}

// ✅ setupKeyboardShortcuts - nyní nahrazena unified keyboard.js modulem
// Všechny keyboard shortcuts jsou teď v keyboard.js

function showHelp() {
  const shortcuts = window.getAllShortcuts ? window.getAllShortcuts() : {};

  let helpText = `
📖 KLÁVESOVÉ ZKRATKY:

🔧 NÁSTROJE (čísla):
1 - Čára | 2 - Kružnice | 3 - Oblouk
4 - Tečna | 5 - Kolmice | 6 - Rovnoběžka
7 - Oříznutí | 8 - Odsazení | 9 - Zrcadlení | 0 - Smazání

⌨️ OVLÁDÁNÍ:
H - Domů (celý výkres)
O - Střed do počátku
Esc - Zrušit akci
Delete - Smazat vybrané
A - Vybrat vše
D - Odebrat výběr

💾 PROJEKTY:
Ctrl+S - Uložit projekt
Ctrl+E - Export PNG
Ctrl+Z - Vrátit
Ctrl+Y - Zopakovat

📝 JINÉ:
Ctrl+N - Nový projekt
Ctrl+/ - Nápověda
`;

  alert(helpText);
}

// Export showHelp to window
window.showHelp = showHelp;

function handleWindowResize() {
  const canvas = document.getElementById("canvas");
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  if (window.draw) window.draw();
}

// Debounced verze resize handleru pro lepší výkon na mobilech
let resizeTimeout = null;
function debouncedResize() {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  resizeTimeout = setTimeout(handleWindowResize, 100);
}

// ===== INITIALIZATION ON PAGE LOAD =====

document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
});

window.addEventListener("resize", debouncedResize);
// Orientační změna na mobilech
window.addEventListener("orientationchange", function() {
  // Mírné zpoždění pro dokončení rotace
  setTimeout(handleWindowResize, 200);
});

// ===== EXPORT =====
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    initializeApp,
  };
}
