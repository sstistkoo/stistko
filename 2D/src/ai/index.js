/**
 * AI Module - Hlavní vstupní bod (ES6)
 * Re-exportuje všechny AI funkce pro snadný import
 * @module ai
 */

// Import všech AI modulů
import './ai-config.js';
import './ai-utils.js';
import './ai-ui.js';
import './ai-providers.js';
import './ai-core.js';
import './ai-test-suite.js';

// Re-export pro ES6 použití
export const AI = {
  // Config
  MODEL_LIMITS: window.MODEL_LIMITS,
  GROQ_VISION_MODELS: window.GROQ_VISION_MODELS,
  apiUsageStats: window.apiUsageStats,

  // Core functions
  callGemini: () => window.callGemini?.(),
  callGeminiDirect: () => window.callGeminiDirect?.(),
  callGroqDirect: () => window.callGroqDirect?.(),
  callOpenRouterDirect: () => window.callOpenRouterDirect?.(),
  callMistralDirect: () => window.callMistralDirect?.(),

  // Utils
  escapeHtml: (text) => window.escapeHtml?.(text),
  parseAIReply: (text) => window.parseAIReply?.(text),
  buildDrawingContext: () => window.buildDrawingContext?.(),

  // UI
  toggleAiPanel: (open) => window.toggleAiPanel?.(open),
  minimizeAI: () => window.minimizeAI?.(),
  closeAI: () => window.closeAI?.(),
  clearAIChat: () => window.clearAIChat?.(),

  // Test
  runAITest: (idx) => window.runAITest?.(idx),
  runAllTests: () => window.runAllTests?.(),
  showAITestPanel: () => window.showAITestPanel?.()
};

console.log("✅ [AI/INDEX] ES6 modul načten");
