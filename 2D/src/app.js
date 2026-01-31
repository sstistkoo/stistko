/**
 * APP.JS - Hlavní vstupní bod aplikace (ES6)
 * Importuje všechny moduly a inicializuje aplikaci
 *
 * POZNÁMKA: Tento soubor je připraven pro budoucí plnou ES6 migraci.
 * Aktuálně aplikace stále používá window.* pro zpětnou kompatibilitu s HTML onclick.
 *
 * @module app
 */

// ===== BUDOUCÍ ES6 IMPORTY =====
// Tyto importy budou aktivovány po plné migraci:
// import { AI } from './ai/index.js';
// import { Canvas } from './canvas.js';
// import { Drawing } from './drawing.js';
// import { UI } from './ui.js';
// import { Utils } from './utils.js';

// ===== AKTUÁLNÍ STAV =====
// AI moduly jsou nyní ES6 kompatibilní s exporty
// Core moduly (globals, utils, drawing, canvas, ui) stále používají window.*

/**
 * Inicializace aplikace
 * Volána po načtení všech modulů
 */
export function initApp() {
  console.log("🚀 [APP] Inicializace aplikace...");

  // Kontrola dostupnosti klíčových funkcí
  const checks = {
    canvas: typeof window.initCanvas === 'function',
    draw: typeof window.draw === 'function',
    ai: typeof window.callGemini === 'function',
    ui: typeof window.toggleAiPanel === 'function'
  };

  const allOk = Object.values(checks).every(v => v);

  if (allOk) {
    console.log("✅ [APP] Všechny moduly načteny správně");
  } else {
    console.warn("⚠️ [APP] Některé moduly chybí:", checks);
  }

  return checks;
}

/**
 * Export verzí modulů pro debugging
 */
export const VERSION = {
  app: "2.0.0",
  ai: "3.0.0",
  modules: "ES6-hybrid"
};

// Pro globální přístup (debugging)
window.APP_VERSION = VERSION;
window.initApp = initApp;

console.log("✅ [APP] ES6 modul načten - verze", VERSION.app);
