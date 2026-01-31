/**
 * AI Module - Konfigurace
 * Obsahuje globální konstanty, limity modelů a statistiky API
 * @module ai-config
 */

// ===== ES6 EXPORTS (pro moderní použití) =====
export const AI_CONFIG = {};

// ===== GLOBÁLNÍ PROMĚNNÉ =====
window.chatHistory = window.chatHistory || [];
window.processingAI = false;
window.shapes = window.shapes || [];
window.points = window.points || [];
window.selectedItems = window.selectedItems || [];
window.currentImageBase64 = null;
window.currentImageMimeType = null;

// ===== MODEL LIMITS =====
/**
 * Limity pro jednotlivé AI modely
 * rate: max requestů za minutu
 * daily: max requestů za den (0 = bez limitu)
 * tokens: max tokenů na odpověď
 */
window.MODEL_LIMITS = {
  // Gemini modely
  "gemini-2.5-flash-preview-05-20": { rate: 10, daily: 1500, tokens: 8192 },
  "gemini-2.0-flash": { rate: 10, daily: 1500, tokens: 8192 },
  "gemini-2.0-flash-lite": { rate: 30, daily: 1500, tokens: 8192 },
  "gemini-1.5-flash": { rate: 15, daily: 1500, tokens: 8192 },
  "gemini-1.5-flash-8b": { rate: 15, daily: 1500, tokens: 8192 },
  "gemini-1.5-pro": { rate: 2, daily: 50, tokens: 8192 },

  // Groq modely
  "llama-3.3-70b-versatile": { rate: 30, daily: 0, tokens: 32768 },
  "llama-3.1-70b-versatile": { rate: 30, daily: 0, tokens: 32768 },
  "llama-3.1-8b-instant": { rate: 30, daily: 0, tokens: 8192 },
  "llama3-70b-8192": { rate: 30, daily: 0, tokens: 8192 },
  "llama3-8b-8192": { rate: 30, daily: 0, tokens: 8192 },
  "mixtral-8x7b-32768": { rate: 30, daily: 0, tokens: 32768 },
  "gemma2-9b-it": { rate: 30, daily: 0, tokens: 8192 },
  "llama-3.2-90b-vision-preview": { rate: 15, daily: 0, tokens: 8192 },
  "llama-3.2-11b-vision-preview": { rate: 30, daily: 0, tokens: 8192 },

  // OpenRouter modely
  "google/gemini-2.0-flash-exp:free": { rate: 20, daily: 0, tokens: 8192 },
  "meta-llama/llama-3.3-70b-instruct:free": { rate: 20, daily: 0, tokens: 8192 },

  // Mistral modely
  "codestral-latest": { rate: 30, daily: 0, tokens: 32768 },
  "mistral-large-latest": { rate: 30, daily: 0, tokens: 32768 },
  "mistral-small-latest": { rate: 30, daily: 0, tokens: 32768 },
};

// ===== GROQ VISION MODELY =====
/**
 * Seznam Groq modelů podporujících zpracování obrázků
 */
window.GROQ_VISION_MODELS = [
  "llama-3.2-90b-vision-preview",
  "llama-3.2-11b-vision-preview"
];

// ===== API USAGE STATISTIKY =====
/**
 * Sledování použití API
 */
window.apiUsageStats = {
  totalCalls: 0,
  dailyCalls: 0,
  lastResetDate: null,
  errors: 0,
  avgResponseTime: 0,
  lastCallTimestamp: null
};

/**
 * Uloží API statistiky do localStorage
 */
window.saveApiStats = function() {
  try {
    localStorage.setItem("ai_api_stats", JSON.stringify(window.apiUsageStats));
  } catch (e) {
    console.warn("⚠️ Nelze uložit API statistiky:", e);
  }
};

/**
 * Načte API statistiky z localStorage
 */
window.loadApiStats = function() {
  try {
    const stored = localStorage.getItem("ai_api_stats");
    if (stored) {
      const parsed = JSON.parse(stored);
      window.apiUsageStats = { ...window.apiUsageStats, ...parsed };

      // Reset denního počítadla pokud je nový den
      const today = new Date().toDateString();
      if (window.apiUsageStats.lastResetDate !== today) {
        window.apiUsageStats.dailyCalls = 0;
        window.apiUsageStats.lastResetDate = today;
        window.saveApiStats();
      }
    }
  } catch (e) {
    console.warn("⚠️ Nelze načíst API statistiky:", e);
  }
};

/**
 * Aktualizuje UI se statistikami použití API
 */
window.updateApiUsageUI = function() {
  const statsEl = document.getElementById("apiUsageStats");
  if (statsEl) {
    statsEl.innerHTML = `
      <span title="Celkem volání">📊 ${window.apiUsageStats.totalCalls || 0}</span>
      <span title="Dnes">📅 ${window.apiUsageStats.dailyCalls || 0}</span>
    `;
  }
};

// ===== SMART AI STATE =====
/**
 * Stav pro Smart AI Settings
 */
window.smartAIState = window.smartAIState || {
  autoSwitch: false,
  preferFree: true,
  lastProvider: null,
  lastModel: null
};

// ===== INICIALIZACE =====
// Načti statistiky při startu
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.loadApiStats);
} else {
  window.loadApiStats();
}

console.log("✅ [AI-CONFIG] Modul načten");
