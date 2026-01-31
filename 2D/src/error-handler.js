/**
 * ERROR-HANDLER.JS - Centralizovaná správa chyb
 * Jednotné rozhraní pro error handling napříč aplikací
 * @module error-handler
 */

// ===== ERROR TYPES =====
export const ErrorTypes = {
  API: 'API_ERROR',
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  CANVAS: 'CANVAS_ERROR',
  PARSE: 'PARSE_ERROR',
  USER: 'USER_ERROR'
};

// ===== ERROR STORAGE =====
const errorLog = [];
const MAX_ERRORS = 100;

/**
 * Zaznamená chybu do logu
 * @param {string} type - Typ chyby z ErrorTypes
 * @param {string} message - Zpráva chyby
 * @param {object} context - Dodatečný kontext
 */
export function logError(type, message, context = {}) {
  const error = {
    type,
    message,
    context,
    timestamp: new Date().toISOString(),
    url: window.location?.href
  };

  errorLog.push(error);

  // Udržuj max počet chyb
  if (errorLog.length > MAX_ERRORS) {
    errorLog.shift();
  }

  // Loguj do konzole
  console.error(`[${type}] ${message}`, context);

  return error;
}

/**
 * Zobrazí uživatelsky přívětivou chybu
 * @param {string} message - Zpráva pro uživatele
 * @param {string} type - Typ notifikace (error/warning/info)
 */
export function showUserError(message, type = 'error') {
  // Použij existující notifikační systém pokud existuje
  if (type === 'error' && window.showErrorNotification) {
    window.showErrorNotification(message);
    return;
  }

  if (type === 'success' && window.showSuccessNotification) {
    window.showSuccessNotification(message);
    return;
  }

  // Fallback na alert
  if (type === 'error') {
    alert('❌ ' + message);
  } else if (type === 'warning') {
    alert('⚠️ ' + message);
  } else {
    alert('ℹ️ ' + message);
  }
}

/**
 * Wrapper pro async funkce s error handling
 * @param {Function} fn - Async funkce k vykonání
 * @param {string} errorMessage - Zpráva při chybě
 * @returns {Promise<any>} Výsledek nebo null při chybě
 */
export async function safeAsync(fn, errorMessage = 'Operace selhala') {
  try {
    return await fn();
  } catch (error) {
    logError(ErrorTypes.API, errorMessage, { originalError: error.message });
    showUserError(errorMessage);
    return null;
  }
}

/**
 * Wrapper pro sync funkce s error handling
 * @param {Function} fn - Funkce k vykonání
 * @param {any} defaultValue - Výchozí hodnota při chybě
 * @returns {any} Výsledek nebo defaultValue při chybě
 */
export function safeSync(fn, defaultValue = null) {
  try {
    return fn();
  } catch (error) {
    console.warn('SafeSync caught:', error.message);
    return defaultValue;
  }
}

/**
 * Získá poslední chyby
 * @param {number} count - Počet chyb k vrácení
 * @returns {array} Pole posledních chyb
 */
export function getRecentErrors(count = 10) {
  return errorLog.slice(-count);
}

/**
 * Vyčistí error log
 */
export function clearErrors() {
  errorLog.length = 0;
}

// ===== GLOBAL ERROR HANDLERS =====

// Zachyť neošetřené chyby
window.addEventListener('error', (event) => {
  logError(ErrorTypes.USER, 'Unhandled error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// Zachyť neošetřené promise rejection
window.addEventListener('unhandledrejection', (event) => {
  logError(ErrorTypes.API, 'Unhandled promise rejection', {
    reason: event.reason?.message || String(event.reason)
  });
});

// Export pro window (zpětná kompatibilita)
window.ErrorTypes = ErrorTypes;
window.logError = logError;
window.showUserError = showUserError;
window.safeAsync = safeAsync;
window.safeSync = safeSync;
window.getRecentErrors = getRecentErrors;

console.log("✅ [ERROR-HANDLER] Modul načten");
