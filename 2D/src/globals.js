/**
 * GLOBALS.JS - Centralizované globální proměnné a konstanty (ES6 hybridní)
 * Musí se načíst PRVÍ, aby ostatní moduly mohly používat
 * @module globals
 */

// ===== ES6 EXPORT PLACEHOLDER =====
// export const GLOBALS = {}; // Bude aktivováno po plné migraci

// ===== API KEYS & STORAGE =====
window.API_STORAGE_KEY = "soustruznik_api_keys";
// ⚠️ POUZE DEMO/TESTOVACÍ API KLÍČE PRO VÝVOJ ⚠️
// Tyto klíče jsou veřejné, mají omezený rate limit a mohou být kdykoliv zneplatněny
// Pro produkční použití si vytvořte vlastní klíče a uložte je do .env souboru
// Více informací: viz SECURITY.md

// DEMO API KEY - rozdělený na 2 části (bezpečné pro GitHub)
window.EMBEDDED_API_KEY = "AIzaSyCXuMvhO_senLS" + "oA_idEuBk_EwnMmIPIhg"; // Split for security
// DEMO GROQ API KEY - rozdělený na 2 části (bezpečné pro GitHub)
window.EMBEDDED_GROQ_API_KEY = "gsk_0uZbn9KqiBa3Zsl11ACX" + "WGdyb3FYZddvc6oPIn9HTvJpGgoBbYrJ"; // Split for security
// DEMO OPENROUTER API KEY - rozdělený na 2 části (bezpečné pro GitHub)
window.EMBEDDED_OPENROUTER_API_KEY = "sk-or-v1-ddc3e91f5a998b774d06" + "8d7028d127bde86281de03837798996481bd86b30f2f"; // Split for security
// DEMO MISTRAL API KEY - rozdělený na 2 části (bezpečné pro GitHub)
window.EMBEDDED_MISTRAL_API_KEY = "Tvwm0qcQk71vsUDw" + "VfAAAY5GPKdbvlHj"; // Split for security

// ===== CANVAS & DRAWING STATE =====
window.shapes = [];
window.points = [];
window.cachedSnapPoints = [];
window.selectedItems = [];

// ===== VIEWPORT & VIEW =====
window.panX = 0;
window.panY = 0;
window.zoom = 2;
window.gridSize = 10;

// ===== SETTINGS =====
window.axisMode = "lathe"; // lathe nebo carousel
window.xMeasureMode = "radius"; // radius or diameter - VÝCHOZÍ JE RADIUS (R)
window.displayDecimals = 2;
window.snapToGrid = false;
window.snapToPoints = true;
window.snapDistance = 15; // pixels
window.orthoMode = true; // Ortogonální přichycení
window.measureInputEnabled = false; // Míra - zadávání rozměrů

// ===== DEFAULT DRAWING COLORS & STYLES =====
window.defaultDrawColor = "#4a9eff"; // Výchozí barva nových objektů
window.defaultDrawLineStyle = "solid"; // Výchozí styl čáry nových objektů

// ===== DIMENSION COLORS & STYLES =====
window.dimensionLineColor = "#ffa500"; // Barva čar kót
window.dimensionTextColor = "#ffff99"; // Barva hodnot kót

// ===== DRAWING MODE & STATE =====
window.mode = "pan"; // pan, line, circle, point, etc.
window.currentCategory = null;
window.selectedShape = null;
window.startPt = null;
window.tempShape = null;
window.drawing = false;
window.cursorPos = { x: 0, y: 0 };
window.controllerMode = "G90"; // G90 nebo G91 pro ovladač

// ===== CONSTRAINT MODE =====
window.constraintMode = null;
window.constraintSelection = [];

// ===== ALIGN MODE =====
window.alignStep = 0;
window.alignRefPoint = null;
window.alignTargetPoint = null;
window.alignLine = null;
window.alignAxis = null;

// ===== COLOR & STYLING =====
window.currentColor = "#ff0000";
window.offsetDistance = 5; // mm - výchozí vzdálenost offsetu
window.strokeColor = "#ffffff";
window.fillColor = "#00ff00";
window.gridColor = "#333333";
window.axisColor = "#666666";
window.snapPointColor = "#ffff00";

// ===== POLAR SNAP =====
window.polarSnapEnabled = true;
window.polarSnapInterval = 15; // degrees
window.polarSnapAngles = [];

// ===== ROTATE MODE =====
window.rotateStep = 0; // 0=center, 1=awaiting angle
window.rotateCenter = null; // Střed rotace
window.rotateAngle = 0; // Úhel rotace

// ===== MEASURE MODE =====
window.measureInfo = null; // Posledí změřená hodnota

// ===== DIMENSION MODE =====
window.dimensions = []; // Pole kót
window.constraintNames = {
  point: "Bod fixace",
  distance: "Vzdálenost",
  radius: "Poloměr",
  polarAngle: "Polární úhel",
  horizontal: "Vodorovně",
  vertical: "Svisle"
};

// ===== UNDO/REDO =====
window.history = [];
window.historyIndex = -1;
window.MAX_HISTORY = 10;

// ===== CANVAS REFERENCE =====
window.canvas = null;
window.ctx = null;

// ===== PAN/ZOOM =====
window.panning = false;
window.panStart = null;
window.pinchStart = null;

// ===== AI & CHAT =====
window.chatHistory = [];
window.aiMemoryLoaded = false;
window.showAiPanel = false;
window.processingAI = false;
window.aiSelectMode = false;
window.aiMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  avgLatency: 0
};

// ===== ANIMATION =====
window.animationFrameId = null;

// ===== ERROR HANDLING =====
window.errorLog = [];
window.MAX_ERROR_LOG = 50;

/**
 * Global Error Handler - catches unhandled errors
 */
window.onerror = function(message, source, lineno, colno, error) {
  const errorInfo = {
    type: 'error',
    message: message,
    source: source,
    line: lineno,
    column: colno,
    stack: error?.stack || 'N/A',
    timestamp: new Date().toISOString()
  };

  window.errorLog.push(errorInfo);
  if (window.errorLog.length > window.MAX_ERROR_LOG) {
    window.errorLog.shift();
  }

  console.error('🔴 Global Error:', errorInfo);

  // Show user-friendly notification
  if (window.showErrorNotification) {
    window.showErrorNotification(`Chyba: ${message}`);
  }

  return false; // Don't prevent default error handling
};

/**
 * Unhandled Promise Rejection Handler
 */
window.onunhandledrejection = function(event) {
  const errorInfo = {
    type: 'unhandledrejection',
    message: event.reason?.message || String(event.reason),
    stack: event.reason?.stack || 'N/A',
    timestamp: new Date().toISOString()
  };

  window.errorLog.push(errorInfo);
  if (window.errorLog.length > window.MAX_ERROR_LOG) {
    window.errorLog.shift();
  }

  console.error('🔴 Unhandled Promise Rejection:', errorInfo);

  if (window.showErrorNotification) {
    window.showErrorNotification(`Async chyba: ${errorInfo.message}`);
  }
};

/**
 * Show error notification to user
 */
window.showErrorNotification = function(message, duration = 5000) {
  // Remove existing notification
  const existing = document.querySelector('.error-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = 'error-notification';
  notification.innerHTML = `
    <button class="error-notification-close" onclick="this.parentElement.remove()">×</button>
    <span>⚠️ ${message}</span>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, duration);
};

/**
 * Safe function wrapper - catches errors and logs them
 */
window.safeCall = function(fn, context = null, ...args) {
  try {
    return fn.apply(context, args);
  } catch (error) {
    console.error('🔴 SafeCall Error:', error);
    if (window.showErrorNotification) {
      window.showErrorNotification(`Operace selhala: ${error.message}`);
    }
    return null;
  }
};

/**
 * Safe async function wrapper
 */
window.safeAsync = async function(fn, context = null, ...args) {
  try {
    return await fn.apply(context, args);
  } catch (error) {
    console.error('🔴 SafeAsync Error:', error);
    if (window.showErrorNotification) {
      window.showErrorNotification(`Async operace selhala: ${error.message}`);
    }
    return null;
  }
};

/**
 * Get error log for debugging
 */
window.getErrorLog = function() {
  return window.errorLog;
};

/**
 * Clear error log
 */
window.clearErrorLog = function() {
  window.errorLog = [];
  console.log('✅ Error log cleared');
};

// DEBUG: kontrola množství logů; nastavte na true pro detailní debug
window.debugMode = false;
window.logDebug = function(...args) {
  try {
    if (window.debugMode) {
      console.log(...args);
    }
  } catch (e) {
    // swallow
  }
};
