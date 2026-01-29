/**
 * AI.JS - Google Gemini AI integration
 * - Chat interface and prompts
 * - AI memory system
 * - API integration
 * - Usage tracking
 */

// Globální proměnné jsou inicializovány v globals.js

// API Usage Stats
let apiUsageStats = {
  totalCalls: 0,
  totalTokensIn: 0,
  totalTokensOut: 0,
  dailyCalls: 0,
  lastReset: new Date().toISOString(),
};

// Inicializuj API stats na začátku
document.addEventListener("DOMContentLoaded", () => {
  loadApiStats();
  updateApiUsageUI();
});

// Enable dragging of AI panel
// Prevent duplicate event listeners
let aiDraggingEnabled = false;

window.enableAIDragging = function () {
  // Zabránit duplicitním event listenerům
  if (aiDraggingEnabled) return;

  const toolsAi = document.getElementById('toolsAi');
  const panel = document.getElementById('aiPanel');
  const header = document.getElementById('aiHeaderRow');
  if (!panel || !header || !toolsAi) return;

  aiDraggingEnabled = true;

  // Detekce mobilního zařízení
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

  // Na mobilních zařízeních zakázat dragging a nastavit pevnou pozici
  if (isMobile) {
    // Odstranit cursor: move a nastavit pevnou pozici
    header.style.cursor = 'default';
    panel.style.position = 'fixed';
    panel.style.top = '10px';
    panel.style.bottom = '15px';
    panel.style.left = '50%';
    panel.style.transform = 'translateX(-50%)';
    panel.style.right = 'auto';
    panel.style.width = '96%';
    panel.style.maxWidth = '100%';
    panel.style.maxHeight = 'calc(100vh - 25px)';
    panel.style.height = 'auto';
    panel.style.overflowY = 'auto';
    panel.style.webkitOverflowScrolling = 'touch';
    panel.style.zIndex = '3001';

    // Zajistit že overlay má také vysoký z-index
    if (toolsAi) {
      toolsAi.style.zIndex = '3000';
      toolsAi.style.background = 'rgba(0, 0, 0, 0.85)';
    }

    return; // Vypnout dragging na mobilech
  }

  // Restore saved position jen na desktopu
  try {
    const saved = localStorage.getItem('aiPanelPosition');
    if (saved) {
      const pos = JSON.parse(saved);
      if (pos.left) panel.style.left = pos.left;
      if (pos.top) panel.style.top = pos.top;
      panel.style.right = 'auto';
    }
  } catch (e) {}

  let dragging = false;
  let startX = 0, startY = 0, origX = 0, origY = 0;

  const onStart = (clientX, clientY) => {
    const rect = panel.getBoundingClientRect();
    dragging = true;
    startX = clientX;
    startY = clientY;
    origX = rect.left;
    origY = rect.top;
    document.body.style.userSelect = 'none';
  };

  const onMove = (clientX, clientY) => {
    if (!dragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    panel.style.left = (origX + dx) + 'px';
    panel.style.top = (origY + dy) + 'px';
    panel.style.right = 'auto';
  };

  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';
    try {
      localStorage.setItem('aiPanelPosition', JSON.stringify({ left: panel.style.left, top: panel.style.top }));
    } catch (e) {}
  };

  header.addEventListener('mousedown', (e) => { onStart(e.clientX, e.clientY); });
  document.addEventListener('mousemove', (e) => { onMove(e.clientX, e.clientY); });
  document.addEventListener('mouseup', onEnd);

  // Touch support - pouze na desktopu
  header.addEventListener('touchstart', (e) => { const t = e.touches[0]; onStart(t.clientX, t.clientY); }, { passive: true });
  document.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }, { passive: false });
  document.addEventListener('touchend', onEnd);
};

document.addEventListener('DOMContentLoaded', () => {
  try { window.enableAIDragging(); } catch (e) { console.warn('enableAIDragging failed', e); }
});

// Inicializuj request timestamps
window.requestTimestamps = (() => {
  try {
    const stored = localStorage.getItem("ai_request_timestamps");
    if (stored) {
      const timestamps = JSON.parse(stored);
      const now = Date.now();
      return timestamps.filter(ts => now - ts < 60000);
    }
  } catch (e) {}
  return [];
})();

// Ulož timestamps do localStorage
window.saveRequestTimestamps = function() {
  try {
    localStorage.setItem("ai_request_timestamps", JSON.stringify(window.requestTimestamps));
  } catch (e) {
    console.warn("⚠️ Nelze uložit timestamps:", e);
  }
};

// Ulož API stats
function saveApiStats() {
  try {
    localStorage.setItem("api_usage_stats", JSON.stringify(apiUsageStats));
    updateApiUsageUI();
  } catch (e) {
    console.warn("⚠️ Nelze uložit API stats:", e);
  }
}

// Načti API stats
function loadApiStats() {
  const stored = localStorage.getItem("api_usage_stats");
  if (stored) {
    try {
      apiUsageStats = JSON.parse(stored);
      checkAndResetDailyStats();
    } catch (e) {
      console.warn("Could not parse API stats", e);
    }
  }
  scheduleMidnightReset();
}

// Zkontroluj a resetuj denní statistiky
function checkAndResetDailyStats() {
  const lastResetDate = new Date(apiUsageStats.lastReset);
  const today = new Date();

  if (
    lastResetDate.getDate() !== today.getDate() ||
    lastResetDate.getMonth() !== today.getMonth() ||
    lastResetDate.getFullYear() !== today.getFullYear()
  ) {
    console.log("🔄 Nový den - resetuji denní statistiky");
    apiUsageStats.dailyCalls = 0;
    apiUsageStats.lastReset = new Date().toISOString();
    saveApiStats();
  }
}

// Naplánuj reset v 10:00
function scheduleMidnightReset() {
  const now = new Date();
  const resetTime = new Date(now);
  resetTime.setHours(10, 0, 0, 0);

  if (resetTime <= now) {
    resetTime.setDate(resetTime.getDate() + 1);
  }

  const timeUntilReset = resetTime - now;

  setTimeout(() => {
    console.log("🌅 10:00 - resetuji denní limit API");
    apiUsageStats.dailyCalls = 0;
    apiUsageStats.lastReset = new Date().toISOString();
    saveApiStats();
    updateApiUsageUI();
    scheduleMidnightReset();
  }, timeUntilReset);
}

// Ruční reset API stats
window.resetApiStats = function () {
  if (confirm("Opravdu resetovat API statistiky?")) {
    apiUsageStats = {
      totalCalls: 0,
      totalTokensIn: 0,
      totalTokensOut: 0,
      dailyCalls: 0,
      lastReset: new Date().toISOString(),
    };
    saveApiStats();
    alert("✅ API statistiky resetovány");
  }
};

// Aktualizuj UI s API stats
function updateApiUsageUI() {
  const usage = document.getElementById("apiUsageInfo");
  if (!usage) return;

  const apiCallsCount = window.requestTimestamps?.length || 0;
  const API_FREE_LIMIT = window.getCurrentModelLimit?.() || 15;

  // Zjisti aktuálního providera
  const providerSelect = document.getElementById("aiProviderSelect");
  const provider = providerSelect?.value || "gemini";

  let keyName = "Žádný klíč";
  let providerIcon = "🤖";

  if (provider === "groq") {
    keyName = window.getCurrentGroqApiKeyName?.() || "Žádný Groq klíč";
    providerIcon = "⚡";
  } else {
    keyName = window.getCurrentApiKeyName?.() || "Žádný klíč";
    providerIcon = "🤖";
  }

  const percentage = Math.round((apiCallsCount / API_FREE_LIMIT) * 100);
  const color =
    apiCallsCount >= API_FREE_LIMIT
      ? "#ff4444"
      : apiCallsCount > 10
      ? "#ff9900"
      : "#44ff44";

  usage.innerHTML = `
    <div style="font-size: 11px; color: #aaa; text-align: center;">
      🔑 ${providerIcon} ${keyName}<br/>
      📊 API limit: <span style="color: ${color}; font-weight: bold">${apiCallsCount}/${API_FREE_LIMIT}</span> za minutu<br/>
      <div style="margin-top: 4px; font-size: 10px; color: #666;">📈 Dnes: <span style="color: #888">${apiUsageStats.dailyCalls || 0}</span> | Celkem: <span style="color: #888">${apiUsageStats.totalCalls}</span></div><br/>
      <button onclick="window.resetApiStats()" style="font-size: 9px; padding: 2px 6px; margin-top: 2px; background: #333; border: 1px solid #555; color: #aaa; cursor: pointer; border-radius: 3px; width: 100%; margin-right: 0;">🔄 Reset</button>
    </div>
  `;
}

// Zruš aktuální AI request
window.cancelAIRequest = function() {
  window.processingAI = false;

  const promptInput = document.getElementById("aiPrompt");
  const btnCancel = document.getElementById("btnCancel");
  const btnGenerate = document.getElementById("btnGenerate");

  if (promptInput) promptInput.disabled = false;
  if (btnCancel) btnCancel.style.display = "none";
  if (btnGenerate) btnGenerate.style.display = "inline-block";

  const container = document.getElementById("aiChatHistory");
  if (container) {
    const loadingDivs = container.querySelectorAll("div[style*='loading-dots']");
    loadingDivs.forEach(div => div.remove());

    const cancelMsg = document.createElement("div");
    cancelMsg.className = "chat-msg model";
    cancelMsg.style.color = "#ef4444";
    cancelMsg.textContent = "❌ Požadavek zrušen";
    container.appendChild(cancelMsg);
    container.scrollTop = container.scrollHeight;
  }
};
// Mapy limitů pro jednotlivé modely (Requests Per Minute)
window.MODEL_LIMITS = {
  // Gemini models
  "gemini-2.5-flash-lite": { rpm: 15, name: "Gemini 2.5 Flash Lite" },
  "gemini-2.5-flash": { rpm: 10, name: "Gemini 2.5 Flash" },
  "gemini-3-pro-preview": { rpm: 2, name: "Gemini 3 Pro" },
  "gemini-2.0-flash-exp": { rpm: 15, name: "Gemini 2.0 Flash Exp" },

  // Groq models - vyšší limity díky rychlosti
  "openai/gpt-oss-120b": { rpm: 30, name: "GPT OSS 120B" },
  "moonshotai/kimi-k2-instruct-0905": { rpm: 30, name: "Kimi K2" },
  "llama-3.3-70b-versatile": { rpm: 30, name: "Llama 3.3 70B" },
  "qwen/qwen3-32b": { rpm: 30, name: "Qwen 3 32B" },
  "openai/gpt-oss-20b": { rpm: 30, name: "GPT OSS 20B" },
  "llama-3.1-8b-instant": { rpm: 30, name: "Llama 3.1 8B" },
  "meta-llama/llama-4-scout-17b-16e-instruct": { rpm: 30, name: "Llama 4 Scout" },
  "meta-llama/llama-4-maverick-17b-128e-instruct": { rpm: 30, name: "Llama 4 Maverick" }
};

// Groq modely s podporou vision
window.GROQ_VISION_MODELS = [
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "meta-llama/llama-4-scout-17b-16e-instruct"
];

// Aktualizuj modely podle vybraného providera
window.updateModelsForProvider = function() {
  const providerSelect = document.getElementById("aiProviderSelect");
  const modelSelect = document.getElementById("aiModelSelect");

  if (!providerSelect || !modelSelect) return;

  const provider = providerSelect.value;
  modelSelect.innerHTML = ""; // Vyčisti stávající modely

  // Načti enabled modely
  const enabledModels = window.loadEnabledModels ? window.loadEnabledModels() : null;

  if (provider === "gemini") {
    // Gemini modely
    const geminiModels = [
      { value: "gemini-2.5-flash-lite", label: "⚡ Gemini 2.5 Flash-Lite (Vyšší limit)" },
      { value: "gemini-2.5-flash", label: "⚡ Gemini 2.5 Flash (Rychlý)" },
      { value: "gemini-3-pro-preview", label: "🧪 Gemini 3 Pro (Nejchytřejší)" },
      { value: "gemini-2.0-flash-exp", label: "⚡ Gemini 2.0 Flash (Exp)" }
    ];

    let firstEnabled = null;
    geminiModels.forEach(model => {
      // Filtruj pouze enabled modely
      if (!enabledModels || enabledModels.has(model.value)) {
        const option = document.createElement("option");
        option.value = model.value;
        option.textContent = model.label;
        modelSelect.appendChild(option);
        if (!firstEnabled) firstEnabled = option;
      }
    });
    if (firstEnabled) firstEnabled.selected = true;

  } else if (provider === "groq") {
    // Groq modely - organizované do skupin
    const groqModels = [
      { label: "═══ NEJCHYTŘEJŠÍ ═══", disabled: true },
      { value: "openai/gpt-oss-120b", label: "🧠 GPT OSS 120B (~500 tok/s)" },
      { value: "moonshotai/kimi-k2-instruct-0905", label: "🧠 Kimi K2 (256K kontext)" },

      { label: "═══ CHAT ═══", disabled: true },
      { value: "llama-3.3-70b-versatile", label: "💬 Llama 3.3 70B (nejlepší pro chat)" },
      { value: "qwen/qwen3-32b", label: "💻 Qwen 3 32B (silný na kód)" },

      { label: "═══ RYCHLÉ ═══", disabled: true },
      { value: "openai/gpt-oss-20b", label: "⚡ GPT OSS 20B (~1000 tok/s)" },
      { value: "llama-3.1-8b-instant", label: "⚡ Llama 3.1 8B (~560 tok/s)" },
      { value: "meta-llama/llama-4-scout-17b-16e-instruct", label: "⚡ Llama 4 Scout (~750 tok/s)" },

      { label: "═══ VISION / OCR ═══", disabled: true },
      { value: "meta-llama/llama-4-maverick-17b-128e-instruct", label: "👁️ Llama 4 Maverick (Vision)" },
      { value: "meta-llama/llama-4-scout-17b-16e-instruct", label: "👁️ Llama 4 Scout (Vision)" }
    ];

    let firstEnabled = null;
    let currentGroup = null;
    groqModels.forEach((model) => {
      if (model.disabled) {
        currentGroup = model.label; // Pamatuj si název skupiny
      } else {
        // Filtruj pouze enabled modely
        if (!enabledModels || enabledModels.has(model.value)) {
          // Pokud je to první model ve skupině, přidej header
          if (currentGroup) {
            const groupOption = document.createElement("option");
            groupOption.disabled = true;
            groupOption.textContent = currentGroup;
            groupOption.style.fontWeight = "bold";
            groupOption.style.background = "#1a1a1a";
            modelSelect.appendChild(groupOption);
            currentGroup = null; // Reset aby se nepřidal vícekrát
          }

          const option = document.createElement("option");
          option.value = model.value;
          option.textContent = model.label;
          modelSelect.appendChild(option);
          if (!firstEnabled) firstEnabled = option;
        }
      }
    });
    if (firstEnabled) firstEnabled.selected = true;

  } else if (provider === "openrouter") {
    // OpenRouter modely - FREE verze
    const openrouterModels = [
      { value: "google/gemini-2.0-flash-exp:free", label: "⚡ Gemini 2.0 Flash :free" },
      { value: "meta-llama/llama-3.3-70b-instruct:free", label: "🦙 Llama 3.3 70B :free" },
      { value: "mistralai/mistral-small-3.1-24b-instruct:free", label: "🔥 Mistral Small 3.1 :free" },
      { value: "deepseek/deepseek-r1:free", label: "🧠 DeepSeek R1 (reasoning) :free" },
      { value: "google/gemma-3-27b-it:free", label: "⚡ Google Gemma 3 27B :free" }
    ];

    let firstEnabled = null;
    openrouterModels.forEach((model) => {
      // Filtruj pouze enabled modely
      if (!enabledModels || enabledModels.has(model.value)) {
        const option = document.createElement("option");
        option.value = model.value;
        option.textContent = model.label;
        modelSelect.appendChild(option);
        if (!firstEnabled) firstEnabled = option;
      }
    });
    if (firstEnabled) firstEnabled.selected = true;

  } else if (provider === "mistral") {
    // Mistral modely
    const mistralModels = [
      { value: "codestral-latest", label: "💻 Codestral (specializovaný na kód)" },
      { value: "mistral-small-latest", label: "⚡ Mistral Small (rychlý, všestranný)" }
    ];

    let firstEnabled = null;
    mistralModels.forEach((model) => {
      // Filtruj pouze enabled modely
      if (!enabledModels || enabledModels.has(model.value)) {
        const option = document.createElement("option");
        option.value = model.value;
        option.textContent = model.label;
        modelSelect.appendChild(option);
        if (!firstEnabled) firstEnabled = option;
      }
    });
    if (firstEnabled) firstEnabled.selected = true;
  }

  // Aktualizuj upload tlačítko viditelnost podle modelu
  if (window.updateImageUploadVisibility) window.updateImageUploadVisibility();

  // Aktualizuj API usage UI
  if (updateApiUsageUI) updateApiUsageUI();
};

// Zobraz/skryj upload obrázků podle modelu
window.updateImageUploadVisibility = function() {
  const providerSelect = document.getElementById("aiProviderSelect");
  const modelSelect = document.getElementById("aiModelSelect");
  const imageUploadContainer = document.getElementById("imageUploadContainer");

  if (!providerSelect || !modelSelect || !imageUploadContainer) return;

  const provider = providerSelect.value;
  const model = modelSelect.value;

  // Zobraz upload pouze pro Groq Vision modely
  if (provider === "groq" && window.GROQ_VISION_MODELS.includes(model)) {
    imageUploadContainer.style.display = "block";
  } else {
    imageUploadContainer.style.display = "none";
  }
};

window.REQUESTS_WINDOW_MS = 60000; // 1 minuta

// Získej aktuální limit na základě vybraného modelu
window.getCurrentModelLimit = function() {
  const modelSelect = document.getElementById("aiModelSelect");
  const selectedModel = modelSelect?.value;
  if (!selectedModel) return 15; // Fallback pokud není vybraný žádný model
  const limit = window.MODEL_LIMITS[selectedModel];
  return limit ? limit.rpm : 15; // Fallback na 15
};

window.getCurrentModel = function() {
  const modelSelect = document.getElementById("aiModelSelect");
  return modelSelect?.value; // Vrací undefined pokud není vybraný
};

// Přidej request do queue
// ===== JEDNODUCHÉ POSLÁNÍ REQUESTU BEZ QUEUE =====
// Aktualizuj UI s informací o limitech
window.updateQueueDisplay = function() {
  const now = Date.now();
  window.requestTimestamps = window.requestTimestamps.filter(
    ts => now - ts < window.REQUESTS_WINDOW_MS
  );
  window.saveRequestTimestamps(); // Ulož aktualizované timestamps

  const maxRequests = window.getCurrentModelLimit();
  const usedSlots = window.requestTimestamps.length;
  const availableSlots = maxRequests - usedSlots;

  const meterDiv = document.getElementById("aiLimitMeter");
  if (!meterDiv) return;

  // Jen čísla - integrované do stránky
  const text = `${usedSlots}/${maxRequests}`;
  meterDiv.textContent = text;

  // Varuj když se blížíš limitu
  if (availableSlots <= 2) {
    meterDiv.style.color = "#ff9800";
  } else if (usedSlots >= maxRequests) {
    meterDiv.style.color = "#f87171";
  } else {
    meterDiv.style.color = "#888";
  }

  // Zablokuj/Odblokuj tlačítko
  const btnGenerate = document.getElementById("btnGenerate");

  if (btnGenerate) {
    if (availableSlots <= 0) {
      btnGenerate.disabled = true;
      btnGenerate.style.opacity = "0.5";
    } else {
      btnGenerate.disabled = false;
      btnGenerate.style.opacity = "1";
    }
  }
};

// ===== AI SELECT TOGGLE =====
window.toggleAiSelect = function () {
  window.aiSelectMode = !window.aiSelectMode;

  // Aktualizuj všechna select tlačítka (v AI sekci i na canvas)
  const selectBtns = document.querySelectorAll('[id*="Select"]');
  selectBtns.forEach(btn => {
    if (window.aiSelectMode) {
      btn.style.background = "#3a7bc8";
      btn.style.borderColor = "#5b8ef5";
    } else {
      btn.style.background = "#333";
      btn.style.borderColor = "#444";
    }
  });

  if (window.aiSelectMode) {
    if (window.setMode) window.setMode("select");
  } else {
    if (window.clearMode) window.clearMode();
  }
};

// ===== QUICK INPUT (Keyboard) =====
window.openQuickInput = function () {
  const modal = document.getElementById("quickInputModal");
  if (modal) {
    modal.style.display = "flex";
  }
};

window.closeQuickInput = function () {
  const modal = document.getElementById("quickInputModal");
  if (modal) {
    modal.style.display = "none";
  }
};

window.confirmQuickInput = function () {
  const display = document.getElementById("quickInputDisplay");
  const prompt = document.getElementById("aiPrompt");
  if (display && prompt) {
    const text = display.value.trim();
    if (text) {
      prompt.value = text;
      window.closeQuickInput();
      if (window.callGemini) window.callGemini();
    }
  }
};

window.insertToken = function (token) {
  const display = document.getElementById("quickInputDisplay");
  if (display) {
    display.value += token;
    display.scrollTop = display.scrollHeight;
  }
};

window.backspaceToken = function () {
  const display = document.getElementById("quickInputDisplay");
  if (display && display.value) {
    display.value = display.value.slice(0, -1);
  }
};

// ===== QUICK INPUT HELP =====
window.showQuickInputHelp = function () {
  const modal = document.getElementById("quickInputHelpModal");
  if (modal) modal.style.display = "flex";
};

window.closeQuickInputHelp = function () {
  const modal = document.getElementById("quickInputHelpModal");
  if (modal) modal.style.display = "none";
};

// ===== VOICE INPUT =====
window.toggleVoice = function () {
  const btn = document.getElementById("btnVoice");
  if (!btn) return;
  btn.classList.toggle("recording-pulse");
  setTimeout(() => {
    btn.classList.remove("recording-pulse");
  }, 2000);
  alert("🎤 Hlasové zadání: Funkce bude implementována v příští verzi.");
};

// ===== AI PREFERENCES =====
window.openAIPreferences = function () {
  const modal = document.getElementById("aiPreferencesModal");
  if (modal) {
    modal.style.display = "flex";
    window.renderPreferencesList();
  }
};

window.closeAIPreferences = function () {
  const modal = document.getElementById("aiPreferencesModal");
  if (modal) modal.style.display = "none";
};

window.renderPreferencesList = function () {
  const memory = window.loadAIMemory ? window.loadAIMemory() : {};
  const list = document.getElementById("preferencesList");
  if (!list) return;

  const prefs = memory.preferences || {};
  if (Object.keys(prefs).length === 0) {
    list.innerHTML = '<div style="padding: 10px; color: #555; font-style: italic; text-align: center;">Zatím žádné preference</div>';
    return;
  }

  list.innerHTML = Object.entries(prefs)
    .map(([k, v]) => `<div style="padding: 8px; background: #222; border-radius: 4px; margin-bottom: 6px;"><strong>${k}:</strong> ${v}</div>`)
    .join("");
};

window.addAIPreference = function () {
  const keyEl = document.getElementById("newPrefKey");
  const valEl = document.getElementById("newPrefValue");
  if (!keyEl || !valEl) return;

  const key = keyEl.value.trim();
  const val = valEl.value.trim();

  if (!key || !val) {
    alert("Vyplň klíč i hodnotu");
    return;
  }

  const memory = window.loadAIMemory ? window.loadAIMemory() : {};
  if (!memory.preferences) memory.preferences = {};
  memory.preferences[key] = val;

  if (window.saveAIMemory) window.saveAIMemory(memory);

  keyEl.value = "";
  valEl.value = "";
  window.renderPreferencesList();
  alert("✅ Preference přidána!");
};

// ===== AI MEMORY & METRICS =====
window.showAIMemory = function () {
  try {
    const memory = JSON.parse(localStorage.getItem("soustruznik_ai_memory") || "{}");
    const patterns = memory.successfulPatterns || [];

    let msg = "🧠 AI SE NAUČILA:\n\n";
    if (patterns.length > 0) {
      msg += "✅ Úspěšné vzory:\n";
      patterns.slice(-10).forEach((p) => {
        msg += `  • "${p.input}" → ${p.shapeCount} tvarů\n`;
      });
    } else {
      msg += "Zatím se nic nenaučila. Posílej jí příkazy!";
    }
    alert(msg);
  } catch (e) {
    alert("❌ Nelze načíst paměť: " + e.message);
  }
};

window.showAIMetrics = function () {
  try {
    const memory = JSON.parse(localStorage.getItem("soustruznik_ai_memory") || "{}");
    const patterns = memory.successfulPatterns || [];

    let msg = "📊 AI STATISTIKY:\n\n";
    msg += "Úspěšných příkazů: " + patterns.length + "\n";
    msg += "Poslední: " + (patterns.length > 0 ? patterns[patterns.length - 1].input : "žádný");
    alert(msg);
  } catch (e) {
    alert("❌ Chyba: " + e.message);
  }
};

// ===== IMAGE HANDLING =====
window.handleImageSelect = function (input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target.result;
    window.currentImageBase64 = result.split(",")[1];
    window.currentImageMimeType = file.type;

    const previewImg = document.getElementById("aiPreviewImg");
    if (previewImg) previewImg.src = result;

    const preview = document.getElementById("aiImagePreview");
    if (preview) preview.style.display = "block";

    const fileNameEl = document.getElementById("aiFileName");
    if (fileNameEl) fileNameEl.textContent = file.name;
  };

  reader.onerror = () => {
    alert("⚠️ Nepodařilo se přečíst soubor.");
  };

  reader.readAsDataURL(file);
};

window.clearImage = function () {
  window.currentImageBase64 = null;
  window.currentImageMimeType = null;

  const input = document.getElementById("aiImageInput");
  if (input) input.value = "";

  const preview = document.getElementById("aiImagePreview");
  if (preview) preview.style.display = "none";

  const fileNameEl = document.getElementById("aiFileName");
  if (fileNameEl) fileNameEl.textContent = "";
};

window.clearChat = function () {
  const container = document.getElementById("aiChatHistory");
  if (container) {
    const messages = container.querySelectorAll(".chat-msg");
    messages.forEach(msg => msg.remove());
  }
};



// ===== DIRECTION MODAL =====
window.showDirectionModal = function () {
  const modal = document.getElementById("directionModal");
  if (modal) {
    modal.style.display = "flex";
  }
};

window.closeDirectionModal = function () {
  const modal = document.getElementById("directionModal");
  if (modal) {
    modal.style.display = "none";
  }
};

window.insertDirection = function (angle) {
  const display = document.getElementById("quickInputDisplay");
  if (display) {
    display.value += "AP" + angle + " ";
    display.scrollTop = display.scrollHeight;
  }
  window.closeDirectionModal();
};

// ===== LENGTH MODAL =====
window.openLengthModal = function () {
  const modal = document.getElementById("lengthModal");
  const input = document.getElementById("lengthInput");
  if (modal) {
    modal.style.display = "flex";
    if (input) {
      input.value = "";
      setTimeout(() => input.focus(), 100);
    }
  }
};

window.closeLengthModal = function () {
  const modal = document.getElementById("lengthModal");
  if (modal) {
    modal.style.display = "none";
  }
};

window.insertLengthToken = function (type) {
  window.lengthType = type;
};

window.confirmLength = function () {
  const input = document.getElementById("lengthInput");
  const display = document.getElementById("quickInputDisplay");
  if (!input || !display) return;

  const value = input.value.trim();
  if (!value) {
    alert("Zadej prosím délku!");
    return;
  }

  const type = window.lengthType || "L";
  display.value += type + value + " ";
  display.scrollTop = display.scrollHeight;
  window.closeLengthModal();
};

// ===== UNDO/REDO =====
window.aiUndo = function () {
  if (window.undo) window.undo();
};

window.aiRedo = function () {
  if (window.redo) window.redo();
};

window.toggleAiPanel = function (open) {
  const container = document.getElementById("toolsAi");
  if (!container) {
    return;
  }

  // Inicalizuj window.aiPanelOpen pokud neexistuje
  if (window.aiPanelOpen === undefined) {
    window.aiPanelOpen = container.style.display !== "none";
  }

  if (open !== undefined) {
    window.aiPanelOpen = open;
  } else {
    window.aiPanelOpen = !window.aiPanelOpen;
  }

  if (window.aiPanelOpen) {
    container.style.display = "flex";
    container.style.zIndex = "3000";
    // Ensure inner panel visible and draggable
    const panelEl = document.getElementById('aiPanel');
    if (panelEl) {
      panelEl.style.display = 'block';
      panelEl.style.zIndex = '3001';
      panelEl.style.pointerEvents = 'auto';
    }
    try { if (window.enableAIDragging) window.enableAIDragging(); } catch(e){}
    const chatWindow = document.getElementById("chatWindow");
    if (chatWindow) {
      chatWindow.style.display = "block";
    }
    const input = document.getElementById("aiPrompt");
    if (input) {
      setTimeout(() => input.focus(), 100);
    }
    if (!window.aiMemoryLoaded && window.loadAIMemory) {
      window.loadAIMemory();
      window.aiMemoryLoaded = true;
    }
    // Odstranit minimized indikátor
    updateAIButtonIndicator(false);
  } else {
    container.style.display = "none";
    const chatWindow = document.getElementById("chatWindow");
    if (chatWindow) {
      chatWindow.style.display = "none";
    }
    // hide inner panel as well
    const panelEl = document.getElementById('aiPanel');
    if (panelEl) panelEl.style.display = 'none';
  }
};

// ===== MINIMALIZACE A ZAVŘENÍ AI =====
window.aiMinimized = false;

// Aktualizuje indikátor na AI tlačítku
function updateAIButtonIndicator(isMinimized) {
  const btn = document.getElementById('btnCatAi');
  if (!btn) return;

  const existingIndicator = btn.querySelector('.ai-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  if (isMinimized) {
    const indicator = document.createElement('div');
    indicator.className = 'ai-indicator';
    indicator.innerHTML = '<span style="font-size: 8px;">●</span>';
    indicator.style.cssText = 'position: absolute; top: 2px; right: 2px; background: #22c55e; color: white; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; animation: pulse 2s infinite;';
    btn.style.position = 'relative';
    btn.appendChild(indicator);
  }
}

// Minimalizuje AI panel (schová ho, ale AI pokračuje)
window.minimizeAI = function() {
  const container = document.getElementById("toolsAi");
  if (!container) return;

  container.style.display = "none";
  window.aiPanelOpen = false;
  window.aiMinimized = true;

  // Zobrazit indikátor na tlačítku
  updateAIButtonIndicator(true);

  // Deaktivovat tlačítko AI kategorie
  const btnCatAi = document.getElementById('btnCatAi');
  if (btnCatAi) {
    btnCatAi.classList.remove('active');
  }
};

// Zavře AI panel a ukončí probíhající operace
window.closeAI = function() {
  const container = document.getElementById("toolsAi");
  if (!container) return;

  // Poznámka: AbortController pro AI není momentálně implementován
  // Toto pouze ukončí UI - probíhající dotaz může doběhnout
  console.log("🛑 AI panel zavřen uživatelem");

  container.style.display = "none";
  window.aiPanelOpen = false;
  window.aiMinimized = false;

  // Odstranit indikátor
  updateAIButtonIndicator(false);

  // Deaktivovat tlačítko AI kategorie
  const btnCatAi = document.getElementById('btnCatAi');
  if (btnCatAi) {
    btnCatAi.classList.remove('active');
  }

  const chatWindow = document.getElementById("chatWindow");
  if (chatWindow) {
    chatWindow.style.display = "none";
  }

  const panelEl = document.getElementById('aiPanel');
  if (panelEl) panelEl.style.display = 'none';
};

// ===== RETRY WITH BACKOFF (Pro API chyby) =====
window.retryWithBackoff = async function (apiCall, maxRetries = 3) {
  console.log("🔄 [DEBUG] retryWithBackoff START - maxRetries:", maxRetries);
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    console.log(`🔁 [DEBUG] Pokus ${attempt + 1}/${maxRetries}`, new Date().toISOString());
    try {
      const result = await apiCall();
      console.log("✅ [DEBUG] API call ÚSPĚCH!");
      return result;
    } catch (err) {
      const isRateLimit =
        err.message?.includes("429") ||
        err.message?.includes("quota") ||
        err.message?.includes("Quota exceeded") ||
        err.message?.includes("RESOURCE_EXHAUSTED");

      if (isRateLimit && attempt < maxRetries - 1) {
        // Zkus najít přesný čas z Google error message: "Please retry in 53.955s"
        const retryMatch = err.message?.match(/retry in ([\d.]+)s/i);
        let delayMs;

        if (retryMatch) {
          // Google řekl přesně jak dlouho čekat
          delayMs = Math.ceil(parseFloat(retryMatch[1]) * 1000);
          console.log(`⏳ Kvóta vyčerpána, čekám ${Math.ceil(delayMs/1000)}s (dle Google API)...`);
        } else {
          // Exponenciální backoff: 2s, 4s, 8s, 16s
          delayMs = Math.pow(2, attempt + 1) * 1000;
          console.log(`⏳ Kvóta vyčerpána, čekám ${delayMs/1000}s před dalším pokusem...`);
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      // Pokud to není rate limit nebo už jsme vyčerpali pokusy, vyhoď error
      if (attempt === maxRetries - 1 || !isRateLimit) {
        console.error("❌ API Error:", err.message);
        throw err;
      }

      throw err;
    }
  }
};

// ===== JSON PARSING HELPER =====

/**
 * Parsuje AI odpověď (JSON s tvary)
 * Používá se pro Groq i Gemini
 */
window.parseAIReply = function(aiResponseText) {
  try {
    // Aggressive JSON cleaning
    let cleanedJson = aiResponseText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "");

    const firstBrace = cleanedJson.indexOf("{");
    const lastBrace = cleanedJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
    }

    // Fix incomplete JSON
    const openBraces = (cleanedJson.match(/\{/g) || []).length;
    const closeBraces = (cleanedJson.match(/\}/g) || []).length;
    const openBrackets = (cleanedJson.match(/\[/g) || []).length;
    const closeBrackets = (cleanedJson.match(/\]/g) || []).length;

    if (openBrackets > closeBrackets) {
      cleanedJson += "]".repeat(openBrackets - closeBrackets);
    }
    if (openBraces > closeBraces) {
      cleanedJson += "}".repeat(openBraces - closeBraces);
    }

    // Fix missing x2
    cleanedJson = cleanedJson.replace(
      /\{"type":"line","x1":([^,]+),"y1":([^,]+),"y2":([^}]+)\}/g,
      '{"type":"line","x1":$1,"y1":$2,"x2":$1,"y2":$3}'
    );

    // Shorten long numbers
    cleanedJson = cleanedJson.replace(/(\d+\.\d{6})\d{4,}/g, "$1");
    cleanedJson = cleanedJson.replace(/,\s*([}\]])/g, "$1");

    console.log("🔍 [DEBUG] parseAIReply cleanedJson:", cleanedJson.substring(0, 200));
    const result = JSON.parse(cleanedJson);
    console.log("✅ [DEBUG] parseAIReply parsed úspěšně!");

    return result;
  } catch (e) {
    console.error("❌ [DEBUG] parseAIReply failed:", e.message);
    return null;
  }
};

// ===== AI MEMORY: Learn from patterns =====
const AI_MEMORY_KEY = "soustruznik_ai_memory";

window.getAIMemoryContext = function () {
  try {
    const memory = JSON.parse(localStorage.getItem(AI_MEMORY_KEY) || "{}");
    const commands = memory.commands || [];
    const patterns = memory.successfulPatterns || [];

    const context = [];
    if (commands.length > 0) {
      context.push(`📌 Naposledy používané příkazy: ${commands.slice(-3).map(c => c.text).join(", ")}`);
    }
    if (patterns.length > 0) {
      context.push(`✅ Úspěšné vzory: ${patterns.slice(-2).map(p => p.input).join(", ")}`);
    }

    return context.join("\n");
  } catch (e) {
    return "";
  }
};

window.recordAISuccess = function (prompt, shapes) {
  try {
    const memory = JSON.parse(localStorage.getItem(AI_MEMORY_KEY) || "{}");

    if (!memory.successfulPatterns) memory.successfulPatterns = [];
    memory.successfulPatterns.push({
      input: prompt.toLowerCase().substring(0, 50),
      shapeCount: shapes.length,
      timestamp: new Date().toISOString(),
    });

    if (memory.successfulPatterns.length > 50) {
      memory.successfulPatterns = memory.successfulPatterns.slice(-50);
    }

    localStorage.setItem(AI_MEMORY_KEY, JSON.stringify(memory));
  } catch (e) {
  }
};

// ===== MAIN AI CALL =====
window.callGemini = async function () {
  console.log("🔵 [DEBUG] callGemini() SPUŠTĚNO", new Date().toISOString());
  const promptInput = document.getElementById("aiPrompt");
  if (!promptInput) return;

  const prompt = promptInput.value.trim();
  if (!prompt) {
    alert("Zadej prosím příkaz pro AI!");
    return;
  }

  // Zobraz Cancel button
  const btnCancel = document.getElementById("btnCancel");
  const btnGenerate = document.getElementById("btnGenerate");
  if (btnCancel) btnCancel.style.display = "inline-block";
  if (btnGenerate) btnGenerate.style.display = "none";

  if (window.processingAI) {
    console.warn("⚠️ [DEBUG] processingAI = true, ABORT!");
    alert("AI zpracovává předchozí příkaz. Čekej prosím.");
    return;
  }

  console.log("🟢 [DEBUG] Volám callGeminiDirect()...");
  // Pošli přímo na AI
  window.callGeminiDirect();
};

// Volání AI - pošle request přímo na API
window.callGeminiDirect = async function () {
  console.log("🟡 [DEBUG] callGeminiDirect() SPUŠTĚNO", new Date().toISOString());

  // Zjisti providera
  const providerSelect = document.getElementById("aiProviderSelect");
  const provider = providerSelect?.value || "gemini";

  // Podle providera zavolej správnou funkci
  if (provider === "groq") {
    return window.callGroqDirect();
  } else if (provider === "openrouter") {
    return window.callOpenRouterDirect();
  } else if (provider === "mistral") {
    return window.callMistralDirect();
  } else {
    return window.callGeminiDirectOriginal();
  }
};

// Původní Gemini volání
window.callGeminiDirectOriginal = async function () {
  console.log("🟡 [DEBUG] callGeminiDirectOriginal() SPUŠTĚNO", new Date().toISOString());
  const promptInput = document.getElementById("aiPrompt");
  const container = document.getElementById("aiChatHistory");
  if (!promptInput || !container) return;

  const prompt = promptInput.value.trim();
  if (!prompt) return;

  console.log("🔒 [DEBUG] Nastavuji processingAI = true");
  window.processingAI = true;
  promptInput.disabled = true;

  // Zobraz user zprávu hned
  const userMsgDiv = document.createElement("div");
  userMsgDiv.className = "chat-msg user";
  userMsgDiv.style.marginBottom = "10px";
  userMsgDiv.innerHTML = `<strong>Ty:</strong> ${escapeHtml(prompt)}`;
  container.appendChild(userMsgDiv);
  container.scrollTop = container.scrollHeight;

  // Add loading indicator
  const loadingDiv = document.createElement("div");
  loadingDiv.style.cssText = "text-align: center; color: #666; padding: 12px; font-size: 12px;";
  loadingDiv.innerHTML = '<div class="loading-dots"><div></div><div></div><div></div></div> Čekám na odpověď...';
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;

  try {
    const apiKey = window.getCurrentApiKey ? window.getCurrentApiKey() : null;
    if (!apiKey) {
      throw new Error("Nemáte API klíč. Otevřete ⚙️ Nastavení.");
    }

    // Build full system prompt with all critical instructions
    const modeIndicator = window.mode ? `Current mode: ${window.mode}` : "";
    const xMeasureMode = window.xMeasureMode || "radius";

    const learningContext = window.getAIMemoryContext ? window.getAIMemoryContext() : "";

    const modeExplanation =
      xMeasureMode === "diameter"
        ? `X-AXIS MODE: DIAMETER (⌀)
User shows values as diameter from center axis.
Example: User says "X=100" = 50mm from center (radius=50)
You MUST respond with DIAMETER values: "X=100" even though internal radius=50
The application will automatically convert diameter→radius for rendering.`
        : `X-AXIS MODE: RADIUS (R)
User shows values as radius distance from center axis.
Example: User says "X=50" = exactly 50mm from center
You MUST respond with RADIUS values: "X=50"
No conversion needed, use values exactly as specified.`;

    const systemPrompt = `CAD Assistant for CNC Lathe/Mill operations (Czech language).

COORDINATE SYSTEM:
Z-axis (horizontal/→) = JSON 'x' property
X-axis (vertical/↑) = JSON 'y' property
Origin: (0,0) center
Report coords as: "Z=[x] X=[y]"

🔧 CURRENT MODE: ${modeIndicator}
${modeExplanation}

ANGLES (Standard Unit Circle):
0°=RIGHT(+Z), 90°=UP(+X), 180°=LEFT(-Z), 270°=DOWN(-X)

INPUT FORMATS:
1. Natural language: "kružnice Z100 X50 R30"
2. CNC/G-code style: "X80Z56R52" or "X50Z56AP0RP120"

CNC SYNTAX PARSING:
- XvalZval = position (X=diameter/radius depending on mode, Z=length)
- Rval = radius for circle
- APval = angle in polar (0°=right, 90°=up, 180°=left, 270°=down)
- RPval = polar radius/length (distance from start point)

Examples (when in DIAMETER mode):
"X80Z56R52" → Circle at (Z=56,X=80⌀) with radius 52 (diameter=104)
            User sees center at X=80 (which is 80mm from axis, diameter)
"X50Z56AP0RP120" → Line from (Z=56,X=50⌀) at angle 0° length 120mm
                 User sees start X=50 (50mm from axis, diameter)
  → End point: Z=56+120*cos(0°)=176, X=50+120*sin(0°)=50
  → {"type":"line","x1":56,"y1":50,"x2":176,"y2":50}

"X80Z56R52;X50Z56AP0RP120" → Circle + Line:
  - Circle: center (56,80), R=52
  - Line: from (56,50) angle 0° length 120 → to (176,50)

IMPORTANT FOR POLAR LINES:
When user says "úsečka OD STŘEDU kružnice" or "line FROM CENTER of circle":
- Start point (x1,y1) = center of that circle (cx,cy)
- End point: calculate using angle and length FROM that center
- CALCULATION:
  * x2 = x1 + length*cos(angle_degrees * π/180)
  * y2 = y1 + length*sin(angle_degrees * π/180)

- Example 1: Center Z=100,X=100 + line angle 0° length 120mm
  → x2 = 100 + 120*cos(0°) = 100 + 120*1 = 220
  → y2 = 100 + 120*sin(0°) = 100 + 120*0 = 100
  → Line: {"type":"line","x1":100,"y1":100,"x2":220,"y2":100}

- Example 2: Center Z=96,X=78 + line angle 5° length 250mm
  → x2 = 96 + 250*cos(5°) = 96 + 250*0.9962 = 345
  → y2 = 78 + 250*sin(5°) = 78 + 250*0.0872 = 100
  → Line: {"type":"line","x1":96,"y1":78,"x2":345,"y2":100}

⭕ CIRCUMCIRCLE (kružnice procházející 3 body A, B, C):
When user says "kružnici procházející body A B C" or "circle through 3 points":
1. Use the 3 points from context (e.g., points A(x1,y1), B(x2,y2), C(x3,y3))
2. Calculate circumcircle center (cx, cy) and radius r:

CIRCUMCIRCLE FORMULA:
Let: A=(x1,y1), B=(x2,y2), C=(x3,y3)
D = 2*(x1*(y2-y3) + x2*(y3-y1) + x3*(y1-y2))
If D ≈ 0: Points are collinear, cannot draw circle

If D ≠ 0:
ux = ((x1²+y1²)*(y2-y3) + (x2²+y2²)*(y3-y1) + (x3²+y3²)*(y1-y2)) / D
uy = ((x1²+y1²)*(x3-x2) + (x2²+y2²)*(x1-x3) + (x3²+y3²)*(x2-x1)) / D
cx = ux
cy = uy
r = √((x1-cx)² + (y1-cy)²)

Example: Points A(0,0), B(100,0), C(50,86.6)
- D = 2*(0*(0-86.6) + 100*(86.6-0) + 50*(0-0)) = 17320
- ux = ((0)*(0-86.6) + (10000)*(86.6-0) + (9966)*(0-0)) / 17320 = 50
- uy = ((0)*(50-100) + (10000)*(0-50) + (9966)*(100-0)) / 17320 ≈ 57.7
- cx=50, cy=57.7, r=√((0-50)²+(0-57.7)²) ≈ 76.3

3. Return the circle as: {"type":"circle","cx":cx,"cy":cy,"r":r}

🔄 TANGENTIAL FILLET / RADIUS (zaoblení s tangenciálním napojením):
When user says "zaoblení R[value] v bodě Z[z] X[x] směrem [dolů/nahoru/vlevo/vpravo]":

⚠️ CRITICAL: "R" means RADIUS, not diameter! Use value directly as radius.
If user says "R5", return "r":5 (not 2.5, not 10)

🤖 G-CODE SUPPORT (CNC terminology) - MANDATORY PARSING:
User may specify arc direction using G-codes - YOU MUST PARSE THESE!
- **G2** = clockwise arc → set counterclockwise: false
- **G3** = counterclockwise arc → set counterclockwise: true
- **CR[value]** or **R[value]** = corner radius value (CR5 = radius 5)

⚠️ CRITICAL: When you see G2, G3, or CR in the prompt, you MUST create ARC shapes!
DO NOT create points or ignore G-codes!

CNC-style arc syntax (NO CENTER NEEDED - you calculate it):
"G2 Z[end_z] X[end_x] CR[radius]" or "G3 Z[end_z] X[end_x] CR[radius]"
- Start point = last point from previous shape (line endpoint)
- End point = specified Z X coordinates
- Radius = CR value
- YOU MUST calculate the arc center automatically!

REAL EXAMPLE from user prompt:
Input: "čára Z0 X60 do Z40 X60, G2 Z45 X55 CR5, G3 Z50 X50 CR5, čára do Z80 X50"

Expected output (4 shapes):
1. {"type":"line","x1":0,"y1":60,"x2":40,"y2":60}  ← horizontal line
2. {"type":"arc","cx":42.5,"cy":57.5,"r":5,"startAngle":180,"endAngle":225,"counterclockwise":false}  ← G2 clockwise
3. {"type":"arc","cx":47.5,"cy":52.5,"r":5,"startAngle":225,"endAngle":270,"counterclockwise":true}  ← G3 counterclockwise
4. {"type":"line","x1":50,"y1":50,"x2":80,"y2":50}  ← horizontal line

Common patterns YOU MUST RECOGNIZE:
- "G2 CR5" = clockwise arc with radius 5
- "G3 CR5" = counterclockwise arc with radius 5
- "G2 Z[x] X[y] CR[r]" = clockwise arc to endpoint with radius
- "čára do Z[x] X[y]" = line from last point to new point

✨ PREFERRED: Generate ARC (partial circle) for tangential fillet:
{"type":"arc","cx":center_x,"cy":center_y,"r":radius,"startAngle":start_deg,"endAngle":end_deg,"counterclockwise":false}

🎯 TANGENT ANGLE CALCULATION (CRITICAL for proper connection):
- Angles are from ARC CENTER perspective (0°=right, 90°=up, 180°=left, 270°=down)
- For tangent to HORIZONTAL line: arc must touch at 90° (top) or 270° (bottom)
- For tangent to VERTICAL line: arc must touch at 0° (right) or 180° (left)
- counterclockwise: false = G2 (clockwise), true = G3 (counterclockwise)

Example: "zaoblení R5 v bodě Z40 X60 směrem dolů" (horizontal lines above/below):
- Corner point: (40, 60) where top line ends
- Center offset DOWN: cx=40, cy=60-5=55
- Top line is HORIZONTAL → tangent point at TOP of circle → angle=90°
- Bottom line is HORIZONTAL → tangent point at BOTTOM of circle → angle=270°
- Clockwise from top to bottom: counterclockwise=false (G2)
- Return: {"type":"arc","cx":40,"cy":55,"r":5,"startAngle":90,"endAngle":270,"counterclockwise":false}

Example: "zaoblení R3 v bodě Z40 X60 směrem vpravo" (vertical lines):
- Center offset RIGHT: cx=40+3=43, cy=60
- Tangent angles: 90° (top) to 0° (right) or similar
- Return: {"type":"arc","cx":43,"cy":60,"r":3,"startAngle":90,"endAngle":0,"counterclockwise":false}

📦 FALLBACK: If uncertain about angles, use CIRCLE:
{"type":"circle","cx":cx,"cy":cy,"r":radius}
- System will auto-detect tangent lines and render only the arc portion
- Offset center by radius in specified direction (same as above)

⚠️ CRITICAL RULES FOR LINES:
1. ALWAYS calculate BOTH x2 AND y2 using the angle and length
2. DO NOT provide only y2 without x2 - both must be present
3. Use the FULL formulas:
   - x2 = x1 + length*cos(angle_in_radians)
   - y2 = y1 + length*sin(angle_in_radians)
4. Even if you're unsure about x, always provide calculated x2
5. A line with x1==x2 AND y1==y2 is invisible (zero length)!

RESPONSE FORMAT (strict JSON only):
{"response_text":"Brief Czech confirmation <50 chars","shapes":[...]}

SHAPE TYPES:
Line: {"type":"line","x1":z1,"y1":x1,"x2":z2,"y2":x2}
Circle: {"type":"circle","cx":z,"cy":x,"r":radius}
Point: {"type":"point","x":z,"y":x}

${learningContext}`;

    const contextInfo = window.buildDrawingContext ? window.buildDrawingContext() : "Prázdné kreslení";

    const fullPrompt = `${systemPrompt}

Aktuální kreslení:
${contextInfo}

Uživatel: ${prompt}`;

    // Call API with retry
    const startTime = performance.now();
    const selectedModel = window.getCurrentModel();
    if (!selectedModel) {
      throw new Error("Není vybrán žádný model. Vyber model v nastavení AI.");
    }

    console.log("📡 [DEBUG] Spouštím retryWithBackoff() pro model:", selectedModel);
    const response = await window.retryWithBackoff(async () => {
      console.log("🌐 [DEBUG] fetch() VOLÁ API...", new Date().toISOString());
      const resp = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + selectedModel + ":generateContent?key=" + apiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4096,
            },
          }),
        }
      );
      if (!resp.ok) {
        const error = await resp.json().catch(() => ({}));
        throw new Error(error.error?.message || `HTTP ${resp.status}`);
      }
      return await resp.json();
    }, 1);

    const apiTime = performance.now() - startTime;

    if (container.contains(loadingDiv)) container.removeChild(loadingDiv);

    // Parse response
    console.log("📦 [DEBUG] Parsování AI odpovědi...");
    let aiResponseText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!aiResponseText) {
      console.error("❌ [DEBUG] AI nevrátila text!");
      throw new Error("AI nevrátila text");
    }

    // Ulož pro debugging - přístupné v konzoli jako window.lastRawAI
    window.lastRawAI = aiResponseText;
    console.log("📄 [DEBUG] AI raw response (CELÁ):");
    console.log(aiResponseText);
    console.log("📏 [DEBUG] Délka odpovědi:", aiResponseText.length, "znaků");

    // Determine AI type (cnc / chat)
    const aiType = document.getElementById('aiTypeSelect')?.value || 'cnc';

    // If Chat mode, treat AI response as plain text (no JSON parsing expected)
    if (aiType === 'chat') {
      const replyTextChat = aiResponseText;
      // Ulož pro debugging
      window.lastRawAI = aiResponseText;

      // Append AI chat message to container
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-msg model';
      msgDiv.style.marginBottom = '10px';
      msgDiv.innerHTML = `<strong>AI:</strong> ${escapeHtml(replyTextChat)}`;
      container.appendChild(msgDiv);
      container.scrollTop = container.scrollHeight;

      // Restore UI state
      window.processingAI = false;
      promptInput.disabled = false;
      const btnCancel = document.getElementById('btnCancel');
      const btnGenerate = document.getElementById('btnGenerate');
      if (btnCancel) btnCancel.style.display = 'none';
      if (btnGenerate) btnGenerate.style.display = 'inline-block';

      // Update usage UI
      apiUsageStats.totalCalls = (apiUsageStats.totalCalls || 0) + 1;
      apiUsageStats.dailyCalls = (apiUsageStats.dailyCalls || 0) + 1;
      saveApiStats();

      return;
    }

    // Aggressive JSON cleaning
    let cleanedJson = aiResponseText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "");

    const firstBrace = cleanedJson.indexOf("{");
    const lastBrace = cleanedJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
    }

    // Fix incomplete JSON
    const openBraces = (cleanedJson.match(/\{/g) || []).length;
    const closeBraces = (cleanedJson.match(/\}/g) || []).length;
    const openBrackets = (cleanedJson.match(/\[/g) || []).length;
    const closeBrackets = (cleanedJson.match(/\]/g) || []).length;

    if (openBrackets > closeBrackets) {
      cleanedJson += "]".repeat(openBrackets - closeBrackets);
    }
    if (openBraces > closeBraces) {
      cleanedJson += "}".repeat(openBraces - closeBraces);
    }

    // Fix missing x2
    cleanedJson = cleanedJson.replace(
      /\{"type":"line","x1":([^,]+),"y1":([^,]+),"y2":([^}]+)\}/g,
      '{"type":"line","x1":$1,"y1":$2,"x2":$1,"y2":$3}'
    );

    // Shorten long numbers
    cleanedJson = cleanedJson.replace(/(\d+\.\d{6})\d{4,}/g, "$1");
    cleanedJson = cleanedJson.replace(/,\s*([}\]])/g, "$1");

    let result;
    let retryIncomplete = 0;
    while (true) {
      try {
        console.log("🔍 [DEBUG] JSON.parse() cleanedJson:", cleanedJson.substring(0, 200));
        result = JSON.parse(cleanedJson);
        console.log("✅ [DEBUG] JSON parsed úspěšně!");
        break;
      } catch (e) {
        if (retryIncomplete < 2) {
          retryIncomplete++;
          console.warn(`⚠️ [DEBUG] JSON parse error (retry #${retryIncomplete}):`, e.message);
          await new Promise(res => setTimeout(res, 1000));
          // Znovu zavolej API (použij stejný prompt)
          const retryResponse = await window.retryWithBackoff(async () => {
            console.log("🌐 [DEBUG] fetch() RETRY kvůli JSON parse error...", new Date().toISOString());
            return await fetch(
              "https://generativelanguage.googleapis.com/v1beta/models/" + selectedModel + ":generateContent?key=" + apiKey,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: fullPrompt }] }],
                  generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096,
                  },
                }),
              }
            );
          }, 1);
          const retryJson = await retryResponse.json();
          aiResponseText = retryJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
          window.lastRawAI = aiResponseText;
          cleanedJson = aiResponseText
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "");
          continue;
        } else {
          console.error("❌ [DEBUG] JSON parse failed:", e.message);
          throw new Error("Nevalidní JSON odpověď");
        }
      }
    }

    const replyText = result.response_text || "Hotovo.";
    const newShapes = result.shapes || [];

    console.log("💾 [DEBUG] Ukládám do window.lastAIResponse, shapes count:", newShapes.length);
    // Ulož AI odpověď pro případný report
    if (window.lastAIResponse === undefined) {
      window.lastAIResponse = {};
    }
    window.lastAIResponse = {
      rawResponse: aiResponseText,
      cleanedJson: cleanedJson,
      parsedResult: result,
      replyText: replyText,
      shapes: newShapes,
      timestamp: new Date().toISOString()
    };

    // Add shapes to canvas
    if (Array.isArray(newShapes) && newShapes.length > 0) {
      const xMeasureMode = window.xMeasureMode || "radius";

      newShapes.forEach((s) => {
        try {
          if (
            s.type === "line" &&
            typeof s.x1 === "number" &&
            typeof s.y1 === "number" &&
            typeof s.x2 === "number" &&
            typeof s.y2 === "number"
          ) {
            window.shapes.push({
              type: "line",
              x1: s.x1,
              y1: s.y1,
              x2: s.x2,
              y2: s.y2,
            });
          } else if (
            s.type === "circle" &&
            typeof s.cx === "number" &&
            typeof s.cy === "number" &&
            typeof s.r === "number" &&
            s.r > 0
          ) {
            // ⚠️ AI vrací radius hodnoty přímo, NEkonvertuj diameter mode!
            // Když AI řekne "r":5, znamená to radius 5, ne průměr
            window.shapes.push({
              type: "circle",
              cx: s.cx,
              cy: s.cy,
              r: s.r, // Použij přímo hodnotu od AI bez konverze
            });
          } else if (
            s.type === "arc" &&
            typeof s.cx === "number" &&
            typeof s.cy === "number" &&
            typeof s.r === "number" &&
            s.r > 0 &&
            typeof s.startAngle === "number" &&
            typeof s.endAngle === "number"
          ) {
            // Přidej ARC (oblouk) pro tangenciální zaoblení
            window.shapes.push({
              type: "arc",
              cx: s.cx,
              cy: s.cy,
              r: s.r,
              startAngle: s.startAngle,
              endAngle: s.endAngle,
              counterclockwise: s.counterclockwise !== undefined ? s.counterclockwise : false,
            });
          } else if (
            s.type === "point" &&
            typeof s.x === "number" &&
            typeof s.y === "number"
          ) {
            window.points.push({ x: s.x, y: s.y });
          }
        } catch (e) {
        }
      });

      if (window.updateSnapPoints) window.updateSnapPoints();

      // Try to draw and catch any rendering errors
      try {
        if (window.draw) window.draw();
      } catch (drawError) {
        console.error("❌ Chyba při vykreslování:", drawError);
        // Add drawing error to validation errors
        if (testIndex !== undefined) {
          validationErrors.push(`CHYBA PŘI VYKRESLOVÁNÍ: ${drawError.message}`);
          hasErrors = true;
        }
      }

      // Learn from success
      window.recordAISuccess(prompt, newShapes);
    }

    // Add to chat
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-msg model";
    if (newShapes.length > 0) {
      msgDiv.innerHTML = `<span class="shape-tag">✏️ +${newShapes.length} tvarů</span><br>${escapeHtml(replyText)}`;
    } else {
      msgDiv.innerHTML = escapeHtml(replyText);
    }
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    promptInput.value = "";
    window.clearImage?.();

    // Aktualizuj API usage stats
    apiUsageStats.totalCalls = (apiUsageStats.totalCalls || 0) + 1;
    apiUsageStats.dailyCalls = (apiUsageStats.dailyCalls || 0) + 1;
    saveApiStats();
    updateApiUsageUI();

  } catch (err) {

    if (container.contains(loadingDiv)) container.removeChild(loadingDiv);

    const errorDiv = document.createElement("div");
    errorDiv.className = "chat-msg model";
    errorDiv.style.color = "#ff6b6b";
    errorDiv.style.whiteSpace = "pre-wrap";

    let errorMsg = "❌ " + (err.message || "Neznámá chyba");

    // Lepší zpráva pro quota exceeded
    if (err.message.includes("quota") || err.message.includes("Quota exceeded")) {
      errorMsg = "⏳ KVÓTA PŘEKROČENA\n\n💡 Aplikace již automaticky čekala a zkusila znovu.\n\nMožnosti:\n• Čekej 1-2 minuty a zkus znovu\n• Přidej svůj vlastní API klíč (⚙️ Nastavení)\n• Jdi na: https://console.cloud.google.com\n\nGemini 2.5 Flash Lite má 15 RPM limit na bezplatném plánu.";
    } else if (err.message.includes("API klíč")) {
      errorMsg += "\n\n💡 Otevři ⚙️ Nastavení a vlož API klíč.";
    }

    errorDiv.textContent = errorMsg;
    container.appendChild(errorDiv);
    container.scrollTop = container.scrollHeight;
  } finally {
    window.processingAI = false;
    promptInput.disabled = false;

    // Skryj Cancel button, zobraz Generate button
    const btnCancel = document.getElementById("btnCancel");
    const btnGenerate = document.getElementById("btnGenerate");
    if (btnCancel) btnCancel.style.display = "none";
    if (btnGenerate) btnGenerate.style.display = "inline-block";
  }
};

// ===== GROQ API CALL =====
window.callGroqDirect = async function () {
  console.log("⚡ [DEBUG] callGroqDirect() SPUŠTĚNO", new Date().toISOString());
  const promptInput = document.getElementById("aiPrompt");
  const container = document.getElementById("aiChatHistory");
  if (!promptInput || !container) return;

  const prompt = promptInput.value.trim();
  if (!prompt) return;

  console.log("🔒 [DEBUG] Nastavuji processingAI = true");
  window.processingAI = true;
  promptInput.disabled = true;

  // Zobraz user zprávu hned
  const userMsgDiv = document.createElement("div");
  userMsgDiv.className = "chat-msg user";
  userMsgDiv.style.marginBottom = "10px";
  userMsgDiv.innerHTML = `<strong>Ty:</strong> ${escapeHtml(prompt)}`;
  container.appendChild(userMsgDiv);
  container.scrollTop = container.scrollHeight;

  // Add loading indicator
  const loadingDiv = document.createElement("div");
  loadingDiv.style.cssText = "text-align: center; color: #666; padding: 12px; font-size: 12px;";
  loadingDiv.innerHTML = '<div class="loading-dots"><div></div><div></div><div></div></div> Čekám na Groq...';
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;

  try {
    const apiKey = window.getCurrentGroqApiKey ? window.getCurrentGroqApiKey() : null;
    if (!apiKey) {
      throw new Error("Nemáte Groq API klíč. Otevřete ⚙️ Nastavení → Groq.");
    }

    // Build system prompt (stejný jako pro Gemini)
    const modeIndicator = window.mode ? `Current mode: ${window.mode}` : "";
    const xMeasureMode = window.xMeasureMode || "radius";
    const learningContext = window.getAIMemoryContext ? window.getAIMemoryContext() : "";

    const modeExplanation =
      xMeasureMode === "diameter"
        ? `X-AXIS MODE: DIAMETER (⌀)
User shows values as diameter from center axis.
Example: User says "X=100" = 50mm from center (radius=50)
You MUST respond with DIAMETER values: "X=100" even though internal radius=50
The application will automatically convert diameter→radius for rendering.`
        : `X-AXIS MODE: RADIUS (R)
User shows values as radius distance from center axis.
Example: User says "X=50" = exactly 50mm from center
You MUST respond with RADIUS values: "X=50"
No conversion needed, use values exactly as specified.`;

    const systemPrompt = `CAD Assistant for CNC Lathe/Mill operations (Czech language).

COORDINATE SYSTEM:
Z-axis (horizontal/→) = JSON 'x' property
X-axis (vertical/↑) = JSON 'y' property
Origin: (0,0) center
Report coords as: "Z=[x] X=[y]"

🔧 CURRENT MODE: ${modeIndicator}
${modeExplanation}

RESPONSE FORMAT (strict JSON only):
{"response_text":"Brief Czech confirmation <50 chars","shapes":[...]}

SHAPE TYPES:
Line: {"type":"line","x1":z1,"y1":x1,"x2":z2,"y2":x2}
Circle: {"type":"circle","cx":z,"cy":x,"r":radius}
Point: {"type":"point","x":z,"y":x}

${learningContext}`;

    const contextInfo = window.buildDrawingContext ? window.buildDrawingContext() : "Prázdné kreslení";

    const fullPrompt = `${systemPrompt}

Aktuální kreslení:
${contextInfo}

Uživatel: ${prompt}`;

    // Determine AI type (cnc / chat)
    const aiType = document.getElementById('aiTypeSelect')?.value || 'cnc';

    // Get selected model
    const modelSelect = document.getElementById("aiModelSelect");
    const selectedModel = modelSelect?.value;
    if (!selectedModel) {
      throw new Error("Není vybrán žádný model. Vyber model v nastavení.");
    }

    // Prepare messages
    let messages = [];

    // Check if model supports vision and we have an image
    const isVisionModel = window.GROQ_VISION_MODELS && window.GROQ_VISION_MODELS.includes(selectedModel);
    const hasImage = window.currentImageBase64 && window.currentImageMimeType;

    if (isVisionModel && hasImage) {
      // Vision model with image
      messages.push({
        role: "user",
        content: [
          { type: "text", text: fullPrompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${window.currentImageMimeType};base64,${window.currentImageBase64}`
            }
          }
        ]
      });
    } else {
      // Text-only
      messages.push({
        role: "user",
        content: fullPrompt
      });
    }

    // Call Groq API
    const startTime = performance.now();
    console.log("🌐 [DEBUG] Groq API fetch()...", new Date().toISOString());

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const apiTime = performance.now() - startTime;

    if (container.contains(loadingDiv)) container.removeChild(loadingDiv);

    // Parse response
    console.log("📦 [DEBUG] Parsování Groq odpovědi...");
    let aiResponseText = data.choices?.[0]?.message?.content || "";

    // Pro reasoning modely (GPT OSS) může být odpověď v "reasoning" poli
    if (!aiResponseText && data.choices?.[0]?.message?.reasoning) {
      aiResponseText = data.choices?.[0]?.message?.reasoning;
      console.log("💭 [DEBUG] Reasoning model - extrahován reasoning:", aiResponseText.substring(0, 100));
    }

    if (!aiResponseText) {
      console.error("❌ [DEBUG] Groq nevrátila text!");
      console.error("Raw data:", data);
      throw new Error("Groq nevrátila text");
    }

    // Ulož pro debugging
    window.lastRawAI = aiResponseText;
    console.log("📄 [DEBUG] Groq raw response (CELÁ):");
    console.log(aiResponseText);
    console.log("📏 [DEBUG] Délka odpovědi:", aiResponseText.length, "znaků");

    // If Chat mode, treat response as plain text
    if (aiType === 'chat') {
      const replyTextChat = aiResponseText;

      // Append AI chat message
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-msg model';
      msgDiv.style.marginBottom = '10px';
      msgDiv.innerHTML = `<strong>Groq:</strong> ${escapeHtml(replyTextChat)}`;
      container.appendChild(msgDiv);
      container.scrollTop = container.scrollHeight;

      // Restore UI state
      window.processingAI = false;
      promptInput.disabled = false;
      const btnCancel = document.getElementById('btnCancel');
      const btnGenerate = document.getElementById('btnGenerate');
      if (btnCancel) btnCancel.style.display = 'none';
      if (btnGenerate) btnGenerate.style.display = 'inline-block';

      // Update usage UI
      if (updateApiUsageUI) updateApiUsageUI();

      return;
    }

    // CNC/2D mode - parse JSON
    let aiReply = window.parseAIReply(aiResponseText);
    if (!aiReply) {
      throw new Error("AI nevrátila JSON. Raw: " + aiResponseText.substring(0, 200));
    }

    const replyText = aiReply.response_text || "OK";
    const newShapes = aiReply.shapes || [];

    console.log("✅ [DEBUG] Úspěšně naparsováno:", newShapes.length, "tvarů");
    console.log("💬 [DEBUG] AI reply text:", replyText);

    // Add shapes to canvas
    if (newShapes.length > 0 && window.shapes) {
      newShapes.forEach(shape => window.shapes.push(shape));
      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.draw) window.draw();
      if (window.recordAISuccess) window.recordAISuccess(prompt, newShapes);
    }

    // Add to chat
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-msg model";
    if (newShapes.length > 0) {
      msgDiv.innerHTML = `<span class="shape-tag">⚡ +${newShapes.length} tvarů (Groq)</span><br>${escapeHtml(replyText)}`;
    } else {
      msgDiv.innerHTML = `<strong>Groq:</strong> ${escapeHtml(replyText)}`;
    }
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    promptInput.value = "";
    if (window.clearImage) window.clearImage();

    // Aktualizuj API usage stats
    apiUsageStats.totalCalls = (apiUsageStats.totalCalls || 0) + 1;
    apiUsageStats.dailyCalls = (apiUsageStats.dailyCalls || 0) + 1;
    saveApiStats();
    updateApiUsageUI();

  } catch (err) {
    if (container.contains(loadingDiv)) container.removeChild(loadingDiv);

    const errorDiv = document.createElement("div");
    errorDiv.className = "chat-msg model";
    errorDiv.style.color = "#ff6b6b";
    errorDiv.style.whiteSpace = "pre-wrap";

    let errorMsg = "❌ Groq chyba: " + (err.message || "Neznámá chyba");

    if (err.message.includes("API klíč") || err.message.includes("Unauthorized")) {
      errorMsg += "\n\n💡 Otevři ⚙️ Nastavení → Groq a vlož API klíč.";
    }

    errorDiv.textContent = errorMsg;
    container.appendChild(errorDiv);
    container.scrollTop = container.scrollHeight;
  } finally {
    window.processingAI = false;
    promptInput.disabled = false;

    // Skryj Cancel button, zobraz Generate button
    const btnCancel = document.getElementById("btnCancel");
    const btnGenerate = document.getElementById("btnGenerate");
    if (btnCancel) btnCancel.style.display = "none";
    if (btnGenerate) btnGenerate.style.display = "inline-block";
  }
};

// ===== OPENROUTER API CALL =====
window.callOpenRouterDirect = async function () {
  console.log("🌐 [DEBUG] callOpenRouterDirect() SPUŠTĚNO", new Date().toISOString());
  const promptInput = document.getElementById("aiPrompt");
  const container = document.getElementById("aiChatHistory");
  if (!promptInput || !container) return;

  const prompt = promptInput.value.trim();
  if (!prompt) return;

  console.log("🔒 [DEBUG] Nastavuji processingAI = true");
  window.processingAI = true;
  promptInput.disabled = true;

  // Zobraz user zprávu hned
  const userMsgDiv = document.createElement("div");
  userMsgDiv.className = "chat-msg user";
  userMsgDiv.style.marginBottom = "10px";
  userMsgDiv.innerHTML = `<strong>Ty:</strong> ${escapeHtml(prompt)}`;
  container.appendChild(userMsgDiv);
  container.scrollTop = container.scrollHeight;

  // Add loading indicator
  const loadingDiv = document.createElement("div");
  loadingDiv.style.cssText = "text-align: center; color: #666; padding: 12px; font-size: 12px;";
  loadingDiv.innerHTML = '<div class="loading-dots"><div></div><div></div><div></div></div> Čekám na odpověď...';
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;

  try {
    const apiKey = window.getCurrentOpenRouterApiKey ? window.getCurrentOpenRouterApiKey() : null;
    if (!apiKey) {
      throw new Error("Žádný OpenRouter API klíč. Otevři ⚙️ Nastavení → OpenRouter a vlož API klíč.");
    }

    // Determine AI type (2d / cnc / chat)
    const aiType = document.getElementById('aiTypeSelect')?.value || '2d';

    // Prepare system prompt based on type
    let systemPrompt = "";
    if (aiType === 'cnc') {
      systemPrompt = window.getCNCSystemPrompt ? window.getCNCSystemPrompt() : "";
    } else if (aiType === '2d') {
      systemPrompt = window.get2DSystemPrompt ? window.get2DSystemPrompt() : "";
    }

    const contextInfo = window.buildDrawingContext ? window.buildDrawingContext() : "Prázdné kreslení";

    const fullPrompt = `${systemPrompt}

Aktuální kreslení:
${contextInfo}

Uživatel: ${prompt}`;

    // Get selected model
    const modelSelect = document.getElementById("aiModelSelect");
    const selectedModel = modelSelect?.value || "google/gemini-2.0-flash-exp:free";

    // Prepare messages
    const messages = [
      {
        role: "user",
        content: fullPrompt
      }
    ];

    // Call OpenRouter API
    const startTime = performance.now();
    console.log("🌐 [DEBUG] OpenRouter API fetch()...", new Date().toISOString());

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const apiTime = performance.now() - startTime;

    if (container.contains(loadingDiv)) container.removeChild(loadingDiv);

    // Parse response
    console.log("📦 [DEBUG] Parsování OpenRouter odpovědi...");
    let aiResponseText = data.choices?.[0]?.message?.content || "";
    if (!aiResponseText) {
      console.error("❌ [DEBUG] OpenRouter nevrátila text!");
      throw new Error("OpenRouter nevrátila text");
    }

    // Ulož pro debugging
    window.lastRawAI = aiResponseText;
    console.log("📄 [DEBUG] OpenRouter raw response (CELÁ):");
    console.log(aiResponseText);
    console.log("📏 [DEBUG] Délka odpovědi:", aiResponseText.length, "znaků");

    // If Chat mode, treat response as plain text
    if (aiType === 'chat') {
      const replyTextChat = aiResponseText;

      // Append AI chat message
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-msg model';
      msgDiv.style.marginBottom = '10px';
      msgDiv.innerHTML = `<strong>OpenRouter:</strong> ${escapeHtml(replyTextChat)}`;
      container.appendChild(msgDiv);
      container.scrollTop = container.scrollHeight;

      // Restore UI state
      window.processingAI = false;
      promptInput.disabled = false;
      const btnCancel = document.getElementById('btnCancel');
      const btnGenerate = document.getElementById('btnGenerate');
      if (btnCancel) btnCancel.style.display = 'none';
      if (btnGenerate) btnGenerate.style.display = 'inline-block';

      // Update usage UI
      if (updateApiUsageUI) updateApiUsageUI();

      return;
    }

    // CNC/2D mode - parse JSON
    let aiReply = window.parseAIReply(aiResponseText);
    if (!aiReply) {
      throw new Error("AI nevrátila JSON. Raw: " + aiResponseText.substring(0, 200));
    }

    const replyText = aiReply.response_text || "OK";
    const newShapes = aiReply.shapes || [];

    console.log("✅ [DEBUG] Úspěšně naparsováno:", newShapes.length, "tvarů");
    console.log("💬 [DEBUG] AI reply text:", replyText);

    // Add shapes to canvas
    if (newShapes.length > 0 && window.shapes) {
      newShapes.forEach(shape => window.shapes.push(shape));
      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.draw) window.draw();
      if (window.recordAISuccess) window.recordAISuccess(prompt, newShapes);
    }

    // Add to chat
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-msg model";
    if (newShapes.length > 0) {
      msgDiv.innerHTML = `<span class="shape-tag">🌐 +${newShapes.length} tvarů (OpenRouter)</span><br>${escapeHtml(replyText)}`;
    } else {
      msgDiv.innerHTML = `<strong>OpenRouter:</strong> ${escapeHtml(replyText)}`;
    }
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    promptInput.value = "";

    // Aktualizuj API usage stats
    apiUsageStats.totalCalls = (apiUsageStats.totalCalls || 0) + 1;
    apiUsageStats.dailyCalls = (apiUsageStats.dailyCalls || 0) + 1;
    saveApiStats();
    updateApiUsageUI();

  } catch (err) {
    if (container.contains(loadingDiv)) container.removeChild(loadingDiv);

    const errorDiv = document.createElement("div");
    errorDiv.className = "chat-msg model";
    errorDiv.style.color = "#ff6b6b";
    errorDiv.style.whiteSpace = "pre-wrap";

    let errorMsg = "❌ OpenRouter chyba: " + (err.message || "Neznámá chyba");

    if (err.message.includes("API klíč") || err.message.includes("Unauthorized")) {
      errorMsg += "\n\n💡 Otevři ⚙️ Nastavení → OpenRouter a vlož API klíč.";
    }

    errorDiv.textContent = errorMsg;
    container.appendChild(errorDiv);
    container.scrollTop = container.scrollHeight;
  } finally {
    window.processingAI = false;
    promptInput.disabled = false;

    // Skryj Cancel button, zobraz Generate button
    const btnCancel = document.getElementById("btnCancel");
    const btnGenerate = document.getElementById("btnGenerate");
    if (btnCancel) btnCancel.style.display = "none";
    if (btnGenerate) btnGenerate.style.display = "inline-block";
  }
};

// ===== MISTRAL API CALL =====
window.callMistralDirect = async function () {
  console.log("🔥 [DEBUG] callMistralDirect() SPUŠTĚNO", new Date().toISOString());
  const promptInput = document.getElementById("aiPrompt");
  const container = document.getElementById("aiChatHistory");
  if (!promptInput || !container) return;

  const prompt = promptInput.value.trim();
  if (!prompt) return;

  console.log("🔒 [DEBUG] Nastavuji processingAI = true");
  window.processingAI = true;
  promptInput.disabled = true;

  // Zobraz user zprávu hned
  const userMsgDiv = document.createElement("div");
  userMsgDiv.className = "chat-msg user";
  userMsgDiv.style.marginBottom = "10px";
  userMsgDiv.innerHTML = `<strong>Ty:</strong> ${escapeHtml(prompt)}`;
  container.appendChild(userMsgDiv);
  container.scrollTop = container.scrollHeight;

  // Add loading indicator
  const loadingDiv = document.createElement("div");
  loadingDiv.style.cssText = "text-align: center; color: #666; padding: 12px; font-size: 12px;";
  loadingDiv.innerHTML = '<div class="loading-dots"><div></div><div></div><div></div></div> Čekám na odpověď...';
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;

  try {
    const apiKey = window.getCurrentMistralApiKey ? window.getCurrentMistralApiKey() : null;
    if (!apiKey) {
      throw new Error("Žádný Mistral API klíč. Otevři ⚙️ Nastavení → Mistral a vlož API klíč.");
    }

    // Determine AI type (2d / cnc / chat)
    const aiType = document.getElementById('aiTypeSelect')?.value || '2d';

    // Prepare system prompt based on type
    let systemPrompt = "";
    if (aiType === 'cnc') {
      systemPrompt = window.getCNCSystemPrompt ? window.getCNCSystemPrompt() : "";
    } else if (aiType === '2d') {
      systemPrompt = window.get2DSystemPrompt ? window.get2DSystemPrompt() : "";
    }

    const contextInfo = window.buildDrawingContext ? window.buildDrawingContext() : "Prázdné kreslení";

    const fullPrompt = `${systemPrompt}

Aktuální kreslení:
${contextInfo}

Uživatel: ${prompt}`;

    // Get selected model
    const modelSelect = document.getElementById("aiModelSelect");
    const selectedModel = modelSelect?.value || "codestral-latest";

    // Prepare messages
    const messages = [
      {
        role: "user",
        content: fullPrompt
      }
    ];

    // Call Mistral API
    const startTime = performance.now();
    console.log("🌐 [DEBUG] Mistral API fetch()...", new Date().toISOString());

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const apiTime = performance.now() - startTime;

    if (container.contains(loadingDiv)) container.removeChild(loadingDiv);

    // Parse response
    console.log("📦 [DEBUG] Parsování Mistral odpovědi...");
    let aiResponseText = data.choices?.[0]?.message?.content || "";
    if (!aiResponseText) {
      console.error("❌ [DEBUG] Mistral nevrátila text!");
      throw new Error("Mistral nevrátila text");
    }

    // Ulož pro debugging
    window.lastRawAI = aiResponseText;
    console.log("📄 [DEBUG] Mistral raw response (CELÁ):");
    console.log(aiResponseText);
    console.log("📏 [DEBUG] Délka odpovědi:", aiResponseText.length, "znaků");

    // If Chat mode, treat response as plain text
    if (aiType === 'chat') {
      const replyTextChat = aiResponseText;

      // Append AI chat message
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-msg model';
      msgDiv.style.marginBottom = '10px';
      msgDiv.innerHTML = `<strong>Mistral:</strong> ${escapeHtml(replyTextChat)}`;
      container.appendChild(msgDiv);
      container.scrollTop = container.scrollHeight;

      // Restore UI state
      window.processingAI = false;
      promptInput.disabled = false;
      const btnCancel = document.getElementById('btnCancel');
      const btnGenerate = document.getElementById('btnGenerate');
      if (btnCancel) btnCancel.style.display = 'none';
      if (btnGenerate) btnGenerate.style.display = 'inline-block';

      // Update usage UI
      if (updateApiUsageUI) updateApiUsageUI();

      return;
    }

    // CNC/2D mode - parse JSON
    let aiReply = window.parseAIReply(aiResponseText);
    if (!aiReply) {
      throw new Error("AI nevrátila JSON. Raw: " + aiResponseText.substring(0, 200));
    }

    const replyText = aiReply.response_text || "OK";
    const newShapes = aiReply.shapes || [];

    console.log("✅ [DEBUG] Úspěšně naparsováno:", newShapes.length, "tvarů");
    console.log("💬 [DEBUG] AI reply text:", replyText);

    // Add shapes to canvas
    if (newShapes.length > 0 && window.shapes) {
      newShapes.forEach(shape => window.shapes.push(shape));
      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.draw) window.draw();
      if (window.recordAISuccess) window.recordAISuccess(prompt, newShapes);
    }

    // Add to chat
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-msg model";
    if (newShapes.length > 0) {
      msgDiv.innerHTML = `<span class="shape-tag">🔥 +${newShapes.length} tvarů (Mistral)</span><br>${escapeHtml(replyText)}`;
    } else {
      msgDiv.innerHTML = `<strong>Mistral:</strong> ${escapeHtml(replyText)}`;
    }
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    promptInput.value = "";

    // Aktualizuj API usage stats
    apiUsageStats.totalCalls = (apiUsageStats.totalCalls || 0) + 1;
    apiUsageStats.dailyCalls = (apiUsageStats.dailyCalls || 0) + 1;
    saveApiStats();
    updateApiUsageUI();

  } catch (err) {
    if (container.contains(loadingDiv)) container.removeChild(loadingDiv);

    const errorDiv = document.createElement("div");
    errorDiv.className = "chat-msg model";
    errorDiv.style.color = "#ff6b6b";
    errorDiv.style.whiteSpace = "pre-wrap";

    let errorMsg = "❌ Mistral chyba: " + (err.message || "Neznámá chyba");

    if (err.message.includes("API klíč") || err.message.includes("Unauthorized")) {
      errorMsg += "\n\n💡 Otevři ⚙️ Nastavení → Mistral a vlož API klíč.";
    }

    errorDiv.textContent = errorMsg;
    container.appendChild(errorDiv);
    container.scrollTop = container.scrollHeight;
  } finally {
    window.processingAI = false;
    promptInput.disabled = false;

    // Skryj Cancel button, zobraz Generate button
    const btnCancel = document.getElementById("btnCancel");
    const btnGenerate = document.getElementById("btnGenerate");
    if (btnCancel) btnCancel.style.display = "none";
    if (btnGenerate) btnGenerate.style.display = "inline-block";
  }
};

window.buildDrawingContext = function () {
  const shapes = window.shapes || [];
  const points = window.points || [];
  let context = "";

  if (points.length > 0) {
    context += `🔹 BODY (${points.length}):\n`;
    points.forEach((p, i) => {
      context += `  ${i + 1}. [${p.x.toFixed(1)}, ${p.y.toFixed(1)}]\n`;
    });
  }

  if (shapes.length > 0) {
    context += `\n📐 OBJEKTY (${shapes.length}):\n`;
    shapes.forEach((s, i) => {
      if (s.type === "line") {
        const len = Math.sqrt((s.x2 - s.x1) ** 2 + (s.y2 - s.y1) ** 2).toFixed(1);
        context += `  ${i + 1}. Čára: [${s.x1.toFixed(1)},${s.y1.toFixed(1)}] → [${s.x2.toFixed(1)},${s.y2.toFixed(1)}] (délka: ${len})\n`;
      } else if (s.type === "circle") {
        context += `  ${i + 1}. Kružnice: střed [${s.cx.toFixed(1)},${s.cy.toFixed(1)}], r=${s.r.toFixed(1)}\n`;
      } else if (s.type === "arc") {
        context += `  ${i + 1}. Oblouk: [${s.x1.toFixed(1)},${s.y1.toFixed(1)}] → [${s.x2.toFixed(1)},${s.y2.toFixed(1)}], úhel=${(s.angle || 0).toFixed(1)}°\n`;
      }
    });
  }

  if (context === "") {
    context = "Prázdné kreslení - zatím nic";
  }

  return context;
};

window.clearChat = function () {
  const chatWindow = document.getElementById("chatWindow");
  if (chatWindow) {
    chatWindow.innerHTML = "";
  }
  chatHistory = [];
};

window.loadAIMemory = function () {
  const chatWindow = document.getElementById("chatWindow");
  if (!chatWindow) return;

  // Načti historii z localStorage
  try {
    const stored = localStorage.getItem("ai_chat_history");
    if (stored) {
      window.chatHistory = JSON.parse(stored);
      chatWindow.innerHTML = "";

      window.chatHistory.forEach((entry) => {
        const userMsg = document.createElement("div");
        userMsg.className = "message user-message";
        userMsg.innerHTML = `<strong>Ty:</strong> ${escapeHtml(entry.user)}`;
        chatWindow.appendChild(userMsg);

        const aiMsg = document.createElement("div");
        aiMsg.className = "message ai-message";
        aiMsg.innerHTML = `<strong>Gemini:</strong> ${escapeHtml(entry.ai)}`;
        chatWindow.appendChild(aiMsg);
      });

      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  } catch (e) {
  }
};

// Funkce pro uložení chat historie do localStorage
window.saveChatHistory = function () {
  try {
    localStorage.setItem("ai_chat_history", JSON.stringify(window.chatHistory || []));
  } catch (e) {
  }
};

window.showAiStats = function () {
  const modal = document.getElementById("aiStatsModal") || createStatsModal();
  if (modal) {
    modal.style.display = "flex";
    if (window.updateAiStats) window.updateAiStats();
  }
};

function createStatsModal() {
  const modal = document.createElement("div");
  modal.id = "aiStatsModal";
  modal.className = "modal";
  modal.style.display = "none";
  modal.innerHTML = `
    <div class="modal-content">
      <h3>📊 Statistika AI</h3>
      <div id="statsContent" style="margin-top: 15px; font-size: 14px; line-height: 1.8;">
        <p>Inicialisuje se...</p>
      </div>
      <button onclick="document.getElementById('aiStatsModal').style.display='none'" style="margin-top: 15px;">Zavřít</button>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  return modal;
}

window.updateAiStats = function () {
  const statsContent = document.getElementById("statsContent");
  if (!statsContent) return;

  const memory = window.getAIMemoryContext ? window.getAIMemoryContext() : {};
  const commandCount = memory.commands ? memory.commands.length : 0;
  const correctionCount = memory.corrections ? memory.corrections.length : 0;
  const totalInteractions = chatHistory.length;

  const stats = `
    <strong>📝 Interakce:</strong> ${totalInteractions}<br>
    <strong>📌 Příkazů:</strong> ${commandCount}<br>
    <strong>✏️ Oprav:</strong> ${correctionCount}<br>
    <strong>💾 Chyťů:</strong> ${new Date().toLocaleString()}<br>
  `;

  statsContent.innerHTML = stats;
};

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

window.updateSelectionUI = function () {
  const selectedCount = window.selectedItems ? window.selectedItems.length : 0;
  const infoEl = document.getElementById("selectionInfo");

  if (infoEl) {
    if (selectedCount > 0) {
      let infoText = `📌 Vybráno: ${selectedCount} objektů`;

      // Přidej vzdálenost pokud jsou vybrané 2 body
      if (selectedCount === 2) {
        const item1 = window.selectedItems[0];
        const item2 = window.selectedItems[1];

        if (item1.category === "point" && item2.category === "point") {
          const dist = Math.sqrt((item1.x - item2.x) ** 2 + (item1.y - item2.y) ** 2);
          infoText += ` | 📏 Vzdálenost AB: ${dist.toFixed(2)} mm`;
        }
      }

      // Přidej informaci o střídavých typech
      if (selectedCount >= 2) {
        const hasPoints = window.selectedItems.some(i => i.category === "point");
        const hasShapes = window.selectedItems.some(i => i.category === "shape");

        if (hasPoints && hasShapes) {
          infoText += " | ⚙️ (bod+tvar)";
        }
      }

      infoEl.textContent = infoText;
      infoEl.style.display = "block";
    } else {
      infoEl.style.display = "none";
    }
  }
};

// ===== EVENT LISTENERS =====

document.addEventListener("DOMContentLoaded", function () {
  // ✅ Keyboard handler pro aiPrompt nyní spravuje unified keyboard.js
  // Enter v aiPrompt nyní volá window.callGemini přes keyboard.js

  const btnSendAi = document.getElementById("btnSendAi");
  if (btnSendAi) {
    btnSendAi.addEventListener("click", function () {
      if (window.callGemini) window.callGemini();
    });
  }

  const btnClearChat = document.getElementById("btnClearChat");
  if (btnClearChat) {
    btnClearChat.addEventListener("click", function () {
      if (confirm("Smazat chat historii?")) {
        window.clearChat();
      }
    });
  }

  // Event listener removed - using inline onclick="window.showToolCategory('ai')" instead
  // (Was causing double-invocation: onclick + event listener)
});

// ===== HELPER: Build drawing context =====
window.buildDrawingContext = function () {
  const shapes = window.shapes || [];
  const points = window.points || [];
  const selectedItems = window.selectedItems || [];
  let context = "";

  // Zobraz vybrané objekty
  if (selectedItems.length > 0) {
    context += `⭐ VYBRANÉ OBJEKTY (${selectedItems.length}):\n`;
    selectedItems.forEach((item) => {
      if (item.category === "point") {
        context += `  ✓ Bod [${item.x?.toFixed(1) || "?"}, ${item.y?.toFixed(1) || "?"}] (Label: ${item.label || "?"})\n`;
      } else if (item.category === "shape" && item.type) {
        if (item.type === "circle") {
          context += `  ✓ Kružnice: střed [${item.cx?.toFixed(1) || "?"}, ${item.cy?.toFixed(1) || "?"}], r=${item.r?.toFixed(1) || "?"} (Label: ${item.label || "?"})\n`;
        } else if (item.type === "line") {
          context += `  ✓ Čára: [${item.x1?.toFixed(1) || "?"}, ${item.y1?.toFixed(1) || "?"}] → [${item.x2?.toFixed(1) || "?"}, ${item.y2?.toFixed(1) || "?"}] (Label: ${item.label || "?"})\n`;
        } else {
          context += `  ✓ ${item.type}: (Label: ${item.label || "?"})\n`;
        }
      }
    });
    context += "\n";
  }

  if (points.length > 0) {
    context += `🔹 BODY (${points.length}):\n`;
    points.forEach((p, i) => {
      context += `  ${i + 1}. [${p.x.toFixed(1)}, ${p.y.toFixed(1)}]\n`;
    });
  }

  if (shapes.length > 0) {
    context += `\n📐 OBJEKTY (${shapes.length}):\n`;
    shapes.forEach((s, i) => {
      if (s.type === "line") {
        const len = Math.sqrt(((s.x2 || 0) - (s.x1 || 0)) ** 2 + ((s.y2 || 0) - (s.y1 || 0)) ** 2).toFixed(1);
        context += `  ${i + 1}. Čára: [${(s.x1 || 0).toFixed(1)},${(s.y1 || 0).toFixed(1)}] → [${(s.x2 || 0).toFixed(1)},${(s.y2 || 0).toFixed(1)}] (délka: ${len})\n`;
      } else if (s.type === "circle") {
        context += `  ${i + 1}. Kružnice: střed [${(s.cx || 0).toFixed(1)},${(s.cy || 0).toFixed(1)}], r=${(s.r || 0).toFixed(1)}\n`;
      } else if (s.type === "arc") {
        context += `  ${i + 1}. Oblouk: [${(s.x1 || 0).toFixed(1)},${(s.y1 || 0).toFixed(1)}] → [${(s.x2 || 0).toFixed(1)},${(s.y2 || 0).toFixed(1)}], úhel=${((s.angle || 0)).toFixed(1)}°\n`;
      }
    });
  }

  return context || "Prázdné kreslení - zatím nic";
};

// ===== AI TEST SUITE =====
window.AI_TEST_PROMPTS = [
  // ===== KOMPLEXNÍ TEST (VŠE V JEDNOM) =====
  {
    level: "KOMPLEXNÍ",
    name: "🎯 KOMPLETNÍ TEST - Všechny hlavní funkce",
    prompt: "bod Z50 X50, kružnice Z100 X100 R40, X200Z100R30, čára Z50 X50 do Z100 X100, kružnice Z150 X150 R50 pak čára od středu úhel 0° délka 100, čára Z300 X50 do Z400 X150",
    expectedShapes: 7,
    expectedType: ["point", "circle", "circle", "line", "circle", "line", "line"],
    complexity: 10,
    description: "Testuje: bod, kružnice (normální syntax), CNC syntax, jednoduchou čáru, polární čáru z centra kružnice, běžnou čáru"
  },
  // ===== PRAKTICKÉ PŘÍKLADY =====
  {
    level: "PRAKTICKÝ",
    name: "🔧 Hřídel s kuželem (zjednodušená)",
    prompt: "Nakresli hřídel: čára Z0 X0 do Z0 X60, čára Z0 X60 do Z40 X60, čára Z40 X60 do Z40 X50, čára Z40 X50 do Z80 X50, čára Z80 X50 do Z80 X40, čára Z80 X40 do Z120 X20, čára Z120 X20 do Z150 X20, čára Z150 X20 do Z150 X0, čára Z150 X0 do Z0 X0",
    expectedShapes: 9,
    expectedType: "line",
    complexity: 8,
    description: "Realistická hřídel s kuželem: dva průměry (⌀60 a ⌀50) a kužel přechod z ⌀40 na ⌀20"
  },
  {
    level: "PRAKTICKÝ",
    name: "🔧 Test tangenciálního radiusu",
    prompt: "čára Z0 X60 do Z40 X60, G2 Z45 X55 CR5, G3 Z50 X50 CR5, čára do Z80 X50",
    expectedShapes: 4,
    expectedType: ["line", "arc", "arc", "line"],
    complexity: 5,
    description: "Test zaoblení CR5 mezi dvěma čárami s G2/G3 - CNC syntax"
  },
  // ===== KATEGORIZOVANÉ RYCHLÉ TESTY =====
  {
    level: "KATEGORIE",
    name: "📍 Test bodů",
    prompt: "bod Z50 X50, bod Z100 X100, bod Z150 X150",
    expectedShapes: 3,
    expectedType: "point",
    complexity: 2,
    description: "Test vytváření bodů"
  },
  {
    level: "KATEGORIE",
    name: "⭕ Test kružnic",
    prompt: "kružnice Z100 X100 R30, kružnice Z200 X100 R40, X300Z100R50",
    expectedShapes: 3,
    expectedType: "circle",
    complexity: 3,
    description: "Test normální i CNC syntaxe kružnic"
  },
  {
    level: "KATEGORIE",
    name: "📏 Test čar",
    prompt: "čára Z0 X0 do Z100 X100, čára Z100 X100 do Z200 X200, čára Z200 X200 do Z300 X300",
    expectedShapes: 3,
    expectedType: "line",
    complexity: 2,
    description: "Test jednoduchých čar"
  },
  {
    level: "KATEGORIE",
    name: "🎯 Test polárních čar",
    prompt: "kružnice Z100 X100 R50, pak čára od středu úhel 0° délka 100, čára od středu úhel 90° délka 100",
    expectedShapes: 3,
    expectedType: ["circle", "line", "line"],
    complexity: 5,
    description: "Test čar z centra kružnice s úhlem"
  },
  // ===== LEVEL 1: VELMI JEDNODUCHÉ =====
  {
    level: "VELMI JEDNODUCHÉ",
    name: "L1-1: Bod",
    prompt: "bod Z100 X100",
    expectedShapes: 1,
    expectedType: "point",
    complexity: 1
  },
  {
    level: "VELMI JEDNODUCHÉ",
    name: "L1-2: Jednoduchá čára",
    prompt: "čára Z0 X0 do Z100 X100",
    expectedShapes: 1,
    expectedType: "line",
    complexity: 1
  },
  {
    level: "VELMI JEDNODUCHÉ",
    name: "L1-3: Jednoduchá kružnice",
    prompt: "kružnice Z100 X100 R50",
    expectedShapes: 1,
    expectedType: "circle",
    complexity: 1
  },

  // ===== LEVEL 2: JEDNODUCHÉ =====
  {
    level: "JEDNODUCHÉ",
    name: "L2-1: CNC syntax kružnice",
    prompt: "X80Z56R52",
    expectedShapes: 1,
    expectedType: "circle",
    complexity: 2
  },
  {
    level: "JEDNODUCHÉ",
    name: "L2-2: Dvě čáry",
    prompt: "čára Z0 X0 do Z100 X0, čára Z100 X0 do Z100 X100",
    expectedShapes: 2,
    expectedType: "line",
    complexity: 2
  },
  {
    level: "JEDNODUCHÉ",
    name: "L2-3: Dvě kružnice",
    prompt: "kružnice Z100 X100 R30, kružnice Z200 X100 R40",
    expectedShapes: 2,
    expectedType: "circle",
    complexity: 2
  },
  {
    level: "JEDNODUCHÉ",
    name: "L2-4: Mix - čára a kružnice",
    prompt: "čára Z0 X0 do Z100 X100, kružnice Z200 X200 R50",
    expectedShapes: 2,
    expectedType: ["line", "circle"],
    complexity: 2
  },

  // ===== LEVEL 3: STŘEDNÍ =====
  {
    level: "STŘEDNÍ",
    name: "L3-1: Čára z centra kružnice",
    prompt: "kružnice Z100 X100 R50, pak čára od středu úhel 0° délka 100",
    expectedShapes: 2,
    expectedType: ["circle", "line"],
    complexity: 3
  },
  {
    level: "STŘEDNÍ",
    name: "L3-2: CNC - pozice + radius",
    prompt: "X50Z56R52, X100Z56R40",
    expectedShapes: 2,
    expectedType: "circle",
    complexity: 3
  },
  {
    level: "STŘEDNÍ",
    name: "L3-3: Obdélník (4 čáry)",
    prompt: "čára Z0 X0 do Z100 X0, čára Z100 X0 do Z100 X100, čára Z100 X100 do Z0 X100, čára Z0 X100 do Z0 X0",
    expectedShapes: 4,
    expectedType: "line",
    complexity: 3
  },
  {
    level: "STŘEDNÍ",
    name: "L3-4: Tři kružnice různých velikostí",
    prompt: "kružnice Z50 X50 R20, kružnice Z150 X150 R35, kružnice Z250 X100 R45",
    expectedShapes: 3,
    expectedType: "circle",
    complexity: 3
  },

  // ===== LEVEL 4: POKROČILÉ =====
  {
    level: "POKROČILÉ",
    name: "L4-1: Čára se středem - úhel 45°",
    prompt: "kružnice Z100 X100 R60, pak čára od středu úhel 45° délka 120",
    expectedShapes: 2,
    expectedType: ["circle", "line"],
    complexity: 4
  },
  {
    level: "POKROČILÉ",
    name: "L4-2: Více čar v jednom",
    prompt: "čára Z0 X0 do Z50 X50, čára Z50 X50 do Z100 X0, čára Z100 X0 do Z150 X50",
    expectedShapes: 3,
    expectedType: "line",
    complexity: 4
  },
  {
    level: "POKROČILÉ",
    name: "L4-3: Průměr místo poloměru",
    prompt: "kružnice Z100 X100 ⌀100",
    expectedShapes: 1,
    expectedType: "circle",
    complexity: 4
  },
  {
    level: "POKROČILÉ",
    name: "L4-4: Mix - kružnice, čára, body",
    prompt: "bod Z50 X50, kružnice Z100 X100 R40, čára Z150 X150 do Z200 X200",
    expectedShapes: 3,
    expectedType: ["point", "circle", "line"],
    complexity: 4
  },

  // ===== LEVEL 5: VELMI POKROČILÉ =====
  {
    level: "VELMI POKROČILÉ",
    name: "L5-1: Čára od kružnice s úhlem a délkou",
    prompt: "kružnice Z100 X100 R50, pak čára od středu úhel 30° délka 150",
    expectedShapes: 2,
    expectedType: ["circle", "line"],
    complexity: 5
  },
  {
    level: "VELMI POKROČILÉ",
    name: "L5-2: Složitý CNC syntax",
    prompt: "X80Z56R52;X50Z56AP0RP120",
    expectedShapes: 2,
    expectedType: ["circle", "line"],
    complexity: 5
  },
  {
    level: "VELMI POKROČILÉ",
    name: "L5-3: Kreis s čárou z centra - více úhlů",
    prompt: "kružnice Z100 X100 R50, čára od středu 0° 80, čára od středu 90° 80",
    expectedShapes: 3,
    expectedType: ["circle", "line", "line"],
    complexity: 5
  },
  {
    level: "VELMI POKROČILÉ",
    name: "L5-4: Komplexní mix",
    prompt: "bod Z0 X0, čára Z0 X0 do Z100 X100, kružnice Z100 X100 R40, čára od středu 45° 100",
    expectedShapes: 4,
    expectedType: ["point", "line", "circle", "line"],
    complexity: 5
  },

  // ===== LEVEL 6: EXPERT =====
  {
    level: "EXPERT",
    name: "L6-1: Dvě kružnice + čáry mezi nimi",
    prompt: "kružnice Z50 X50 R30, kružnice Z150 X150 R40, čára Z50 X50 do Z150 X150",
    expectedShapes: 3,
    expectedType: ["circle", "circle", "line"],
    complexity: 6
  },
  {
    level: "EXPERT",
    name: "L6-2: Polygon - šestiúhelník",
    prompt: "čára Z100 X0 do Z150 X50, čára Z150 X50 do Z150 X150, čára Z150 X150 do Z100 X200, čára Z100 X200 do Z50 X150, čára Z50 X150 do Z50 X50, čára Z50 X50 do Z100 X0",
    expectedShapes: 6,
    expectedType: "line",
    complexity: 6
  },
  {
    level: "EXPERT",
    name: "L6-3: Tři kružnice v řadě + čáry",
    prompt: "kružnice Z50 X100 R30, kružnice Z150 X100 R35, kružnice Z250 X100 R40, čára Z50 X100 do Z150 X100, čára Z150 X100 do Z250 X100",
    expectedShapes: 5,
    expectedType: ["circle", "circle", "circle", "line", "line"],
    complexity: 6
  },
  {
    level: "EXPERT",
    name: "L6-4: Závitový profil (teoreticky)",
    prompt: "kružnice Z100 X50 R20, kružnice Z150 X50 R20, kružnice Z200 X50 R20, čára Z100 X50 do Z200 X50",
    expectedShapes: 4,
    expectedType: ["circle", "circle", "circle", "line"],
    complexity: 6
  }
];

window.runAITest = async function(testIndex = 0) {
  const container = document.getElementById("aiChatHistory");

  if (testIndex >= window.AI_TEST_PROMPTS.length) {
    // Místo alertu zobraz souhrn v chatu
    if (window.showTestSummary) {
      window.showTestSummary();
    }
    return;
  }

  const test = window.AI_TEST_PROMPTS[testIndex];
  const promptInput = document.getElementById("aiPrompt");

  if (!promptInput || !container) {
    console.error("❌ AI panel nenalezen!");
    return;
  }

  // Zobraz test zprávu
  const testDiv = document.createElement("div");
  testDiv.className = "chat-msg model";
  testDiv.style.color = "#60a5fa";
  testDiv.style.fontWeight = "bold";
  testDiv.textContent = `🧪 TEST ${testIndex + 1}/${window.AI_TEST_PROMPTS.length}: ${test.name}`;
  container.appendChild(testDiv);
  container.scrollTop = container.scrollHeight;

  // Nastav prompt a chvíli čekej
  promptInput.value = test.prompt;
  await new Promise(resolve => setTimeout(resolve, 500));

  // Zapamatuj si počet tvarů před testem
  const shapesBefore = (window.shapes || []).length;
  const pointsBefore = (window.points || []).length;

  // Spusť AI a čekej na dokončení (BEZ timeoutu - počká i na retry)
  const success = window.callGemini ? await window.callGemini().then(() => {
    return true;
  }).catch(err => {
    console.warn("⚠️ AI request failed:", err.message);
    return false;
  }) : true;

  // Zastav processing flag
  window.processingAI = false;

  // Vyčisti loading indikátor (pokud tam ještě je)
  const loadingDivs = container.querySelectorAll('.loading-dots');
  loadingDivs.forEach(div => {
    const parent = div.closest('div[style*="text-align: center"]');
    if (parent && container.contains(parent)) {
      container.removeChild(parent);
    }
  });

  // Ověř výsledky
  const shapesAfter = (window.shapes || []).length;
  const pointsAfter = (window.points || []).length;
  const newShapesCount = (shapesAfter - shapesBefore) + (pointsAfter - pointsBefore);

  let testResult = `\n📊 Výsledek: ${newShapesCount} tvarů`;
  let validationErrors = [];
  let hasErrors = false;

  // Kontrola počtu tvarů
  if (newShapesCount >= test.expectedShapes) {
    testResult += ` ✅`;
  } else {
    testResult += ` ❌ (očekáváno ${test.expectedShapes})`;
    validationErrors.push(`Očekávaný počet: ${test.expectedShapes}, získáno: ${newShapesCount}`);
    hasErrors = true;
  }

  // Detailní validace nově přidaných tvarů
  const newShapes = window.shapes.slice(shapesBefore);
  const newPoints = window.points.slice(pointsBefore);

  // Analyzuj prompt pro identifikaci polárních čar
  const polarLinePattern = /pak\s+čára\s+od\s+středu\s+úhel\s+(\d+)°?\s+délka\s+(\d+)/gi;
  const polarLines = [];
  let match;
  while ((match = polarLinePattern.exec(test.prompt)) !== null) {
    polarLines.push({
      angle: parseInt(match[1]),
      length: parseInt(match[2])
    });
  }

  // Vytáhni všechny poloměry z promptu
  const radiusPattern = /[RrＲｒ]\s*(\d+)/g;
  const expectedRadii = [];
  while ((match = radiusPattern.exec(test.prompt)) !== null) {
    expectedRadii.push(parseInt(match[1]));
  }

  // Najdi poslední kružnici před polární čárou (pro určení středu)
  let lastCircleBeforePolar = null;
  let circleIndex = 0;

  newShapes.forEach((shape, idx) => {
    if (shape.type === "line") {
      // Kontrola čáry - musí mít různé body
      if (shape.x1 === shape.x2 && shape.y1 === shape.y2) {
        validationErrors.push(`Čára ${idx+1}: nulová délka (x1=${shape.x1}, y1=${shape.y1}, x2=${shape.x2}, y2=${shape.y2})`);
        hasErrors = true;
      }
      // Kontrola, že všechny souřadnice jsou čísla
      if (typeof shape.x1 !== 'number' || typeof shape.y1 !== 'number' ||
          typeof shape.x2 !== 'number' || typeof shape.y2 !== 'number') {
        validationErrors.push(`Čára ${idx+1}: chybějící nebo neplatné souřadnice (x1=${shape.x1}, y1=${shape.y1}, x2=${shape.x2}, y2=${shape.y2})`);
        hasErrors = true;
      }

      // Kontrola polárních čar - pouze pokud startují ze středu nějaké kružnice
      if (polarLines.length > 0 && lastCircleBeforePolar) {
        const isPolarLine = Math.abs(shape.x1 - lastCircleBeforePolar.cx) < 1 &&
                           Math.abs(shape.y1 - lastCircleBeforePolar.cy) < 1;

        if (isPolarLine && polarLines.length > 0) {
          const polarInfo = polarLines.shift(); // Vezmi první polární definici
          const angle = polarInfo.angle;
          const length = polarInfo.length;

          // Validuj podle úhlu
          if (angle === 0) {
            if (Math.abs(shape.y2 - shape.y1) > 1) {
              validationErrors.push(`Čára ${idx+1} [POLÁRNÍ 0°]: y2 by mělo být ≈ y1 (y1=${shape.y1.toFixed(1)}, y2=${shape.y2.toFixed(1)})`);
              hasErrors = true;
            }
            const expectedX2 = shape.x1 + length;
            if (Math.abs(shape.x2 - expectedX2) > 2) {
              validationErrors.push(`Čára ${idx+1} [POLÁRNÍ 0°]: při délce ${length} očekávám x2≈${expectedX2.toFixed(1)}, ale je ${shape.x2.toFixed(1)}`);
              hasErrors = true;
            }
          } else if (angle === 90) {
            if (Math.abs(shape.x2 - shape.x1) > 1) {
              validationErrors.push(`Čára ${idx+1} [POLÁRNÍ 90°]: x2 by mělo být ≈ x1 (x1=${shape.x1.toFixed(1)}, x2=${shape.x2.toFixed(1)})`);
              hasErrors = true;
            }
            const expectedY2 = shape.y1 + length;
            if (Math.abs(shape.y2 - expectedY2) > 2) {
              validationErrors.push(`Čára ${idx+1} [POLÁRNÍ 90°]: při délce ${length} očekávám y2≈${expectedY2.toFixed(1)}, ale je ${shape.y2.toFixed(1)}`);
              hasErrors = true;
            }
          } else {
            const angleRad = angle * Math.PI / 180;
            const expectedX2 = shape.x1 + length * Math.cos(angleRad);
            const expectedY2 = shape.y1 + length * Math.sin(angleRad);
            const tolerance = 3;
            if (Math.abs(shape.x2 - expectedX2) > tolerance || Math.abs(shape.y2 - expectedY2) > tolerance) {
              validationErrors.push(`Čára ${idx+1} [POLÁRNÍ ${angle}°]: při délce ${length} očekávám x2≈${expectedX2.toFixed(1)}, y2≈${expectedY2.toFixed(1)}, ale je x2=${shape.x2.toFixed(1)}, y2=${shape.y2.toFixed(1)}`);
              hasErrors = true;
            }
          }
        }
      }
    } else if (shape.type === "circle") {
      lastCircleBeforePolar = shape; // Zapamatuj si poslední kružnici

      // Kontrola kružnice - radius musí být > 0
      if (shape.r <= 0 || typeof shape.r !== 'number') {
        validationErrors.push(`Kružnice ${idx+1}: neplatný poloměr r=${shape.r}`);
        hasErrors = true;
      }
      // Kontrola středu
      if (typeof shape.cx !== 'number' || typeof shape.cy !== 'number') {
        validationErrors.push(`Kružnice ${idx+1}: neplatné souřadnice středu (cx=${shape.cx}, cy=${shape.cy})`);
        hasErrors = true;
      }

      // Validace poloměru - použij odpovídající poloměr z pole
      if (expectedRadii.length > circleIndex) {
        const expectedRadiusFromPrompt = expectedRadii[circleIndex];
        const tolerance = 2;

        // ⚠️ AI vrací radius přímo, bez konverze diameter mode
        // Když test očekává R5, AI vrátí r:5, tak to i validujeme
        const expectedInternalRadius = expectedRadiusFromPrompt;

        if (Math.abs(shape.r - expectedInternalRadius) > tolerance) {
          validationErrors.push(`Kružnice ${idx+1}: očekávaný radius ${expectedInternalRadius.toFixed(1)}, ale je ${shape.r.toFixed(1)}`);
          hasErrors = true;
        }
      }

      circleIndex++;
    } else if (shape.type === "arc") {
      // Validace ARC (oblouku) - podobně jako kružnice, ale s úhly
      if (shape.r <= 0 || typeof shape.r !== 'number') {
        validationErrors.push(`Oblouk ${idx+1}: neplatný poloměr r=${shape.r}`);
        hasErrors = true;
      }
      if (typeof shape.cx !== 'number' || typeof shape.cy !== 'number') {
        validationErrors.push(`Oblouk ${idx+1}: neplatné souřadnice středu (cx=${shape.cx}, cy=${shape.cy})`);
        hasErrors = true;
      }
      if (typeof shape.startAngle !== 'number' || typeof shape.endAngle !== 'number') {
        validationErrors.push(`Oblouk ${idx+1}: chybí úhly (startAngle=${shape.startAngle}, endAngle=${shape.endAngle})`);
        hasErrors = true;
      }

      // ARC počítáme jako kružnici pro validaci počtu
      if (expectedRadii.length > circleIndex) {
        const expectedRadiusFromPrompt = expectedRadii[circleIndex];
        const tolerance = 2;
        const expectedInternalRadius = expectedRadiusFromPrompt;

        if (Math.abs(shape.r - expectedInternalRadius) > tolerance) {
          validationErrors.push(`Oblouk ${idx+1}: očekávaný radius ${expectedInternalRadius.toFixed(1)}, ale je ${shape.r.toFixed(1)}`);
          hasErrors = true;
        }
      }

      circleIndex++; // ARC = kružnice pro počítání
    }
  });

  newPoints.forEach((point, idx) => {
    if (typeof point.x !== 'number' || typeof point.y !== 'number') {
      validationErrors.push(`Bod ${idx+1}: neplatné souřadnice`);
      hasErrors = true;
    }
  });

  // Zobraz výsledek
  const resultDiv = document.createElement("div");
  resultDiv.className = "chat-msg model";
  resultDiv.style.color = !hasErrors ? "#10b981" : "#ef4444";
  resultDiv.style.fontSize = "12px";
  resultDiv.style.whiteSpace = "pre-wrap";

  if (hasErrors && validationErrors.length > 0) {
    testResult += "\n\n⚠️ CHYBY DETEKOVANÉ:\n" + validationErrors.map(e => "  • " + e).join("\n");
  }

  resultDiv.textContent = testResult;
  container.appendChild(resultDiv);
  container.scrollTop = container.scrollHeight;

  // Ulož výsledky testu
  if (!window.aiTestResults) {
    window.aiTestResults = [];
  }

  // Připrav detailní informace o tvarech
  const shapesDetails = newShapes.map((shape, idx) => {
    if (shape.type === "line") {
      return {
        type: "line",
        index: idx + 1,
        data: { x1: shape.x1, y1: shape.y1, x2: shape.x2, y2: shape.y2 },
        length: Math.sqrt(Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2)).toFixed(2)
      };
    } else if (shape.type === "circle") {
      return {
        type: "circle",
        index: idx + 1,
        data: { cx: shape.cx, cy: shape.cy, r: shape.r }
      };
    } else if (shape.type === "arc") {
      return {
        type: "arc",
        index: idx + 1,
        data: {
          cx: shape.cx,
          cy: shape.cy,
          r: shape.r,
          startAngle: shape.startAngle,
          endAngle: shape.endAngle
        }
      };
    }
    return { type: shape.type, index: idx + 1, data: shape };
  });

  const pointsDetails = newPoints.map((point, idx) => ({
    type: "point",
    index: idx + 1,
    data: { x: point.x, y: point.y }
  }));

  window.aiTestResults.push({
    testIndex: testIndex,
    testName: test.name,
    prompt: test.prompt,
    expectedShapes: test.expectedShapes,
    actualShapes: newShapesCount,
    hasErrors: hasErrors,
    errors: validationErrors,
    shapesDetails: shapesDetails,
    pointsDetails: pointsDetails,
    aiResponse: window.lastAIResponse ? {
      replyText: window.lastAIResponse.replyText,
      rawShapes: window.lastAIResponse.shapes
    } : null,
    timestamp: new Date().toISOString()
  });

  // Pokračuj další test pouze pokud je nastavena flag pro batch run
  if (window.aiTestBatchMode) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Pokud je to poslední test, zobraz souhrn
    if (testIndex + 1 >= window.AI_TEST_PROMPTS.length) {
      window.aiTestBatchMode = false;
      window.processingAI = false; // ✅ Zastav processing
      window.showTestSummary();
    } else {
      window.runAITest(testIndex + 1);
    }
  } else {
    // Jednorázový test - ZASTAV processing okamžitě
    window.processingAI = false;

    const summaryDiv = document.createElement("div");
    summaryDiv.className = "chat-msg model";
    summaryDiv.style.color = !hasErrors ? "#10b981" : "#6ab0ff";
    summaryDiv.style.fontSize = "11px";
    summaryDiv.style.background = "#1a1a1a";
    summaryDiv.style.border = "1px solid " + (!hasErrors ? "#10b981" : "#444");
    summaryDiv.style.padding = "10px";
    summaryDiv.style.marginTop = "10px";

    let summary = `✅ Test dokončen!\n`;
    if (!hasErrors) {
      summary += `\n🎉 Všechny kontroly prošly bez chyb!`;
    } else {
      summary += `\n⚠️ Test prošel s ${validationErrors.length} chyb(ou/ami).`;
    }

    summaryDiv.textContent = summary;
    container.appendChild(summaryDiv);
    container.scrollTop = container.scrollHeight;

    // Zobraz tlačítko pro report
    const reportBtn = document.createElement("button");
    reportBtn.textContent = "📋 ZOBRAZIT DETAILNÍ REPORT";
    reportBtn.style.cssText = "width: 100%; padding: 10px; margin-top: 10px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;";
    reportBtn.onclick = () => window.showTestReport();
    container.appendChild(reportBtn);
    container.scrollTop = container.scrollHeight;
  }
};

// Zobrazí detailní report testu s možností kopírování
window.showTestReport = function() {
  if (!window.aiTestResults || window.aiTestResults.length === 0) {
    alert("Žádné výsledky testů k dispozici.");
    return;
  }

  const container = document.getElementById("aiChatHistory");
  if (!container) return;

  const lastResult = window.aiTestResults[window.aiTestResults.length - 1];

  let report = "";
  report += "═══════════════════════════════════════════════════\n";
  report += "         🔬 DETAILNÍ AI TEST REPORT\n";
  report += "═══════════════════════════════════════════════════\n\n";

  report += `📌 TEST: ${lastResult.testName}\n`;
  report += `🕐 Čas: ${new Date(lastResult.timestamp).toLocaleString('cs-CZ')}\n`;
  report += `\n`;

  report += "─────────────────────────────────────────────────────\n";
  report += "📝 VSTUPNÍ PROMPT:\n";
  report += "─────────────────────────────────────────────────────\n";
  report += `"${lastResult.prompt}"\n\n`;

  report += "─────────────────────────────────────────────────────\n";
  report += "🤖 AI ODPOVĚĎ:\n";
  report += "─────────────────────────────────────────────────────\n";

  if (lastResult.aiResponse) {
    report += `Textová odpověď: "${lastResult.aiResponse.replyText}"\n\n`;

    if (lastResult.aiResponse.rawShapes && lastResult.aiResponse.rawShapes.length > 0) {
      report += "🔍 RAW JSON TVARY (co AI vrátila):\n";
      lastResult.aiResponse.rawShapes.forEach((shape, idx) => {
        report += `\n${idx + 1}. ${shape.type.toUpperCase()}:\n`;
        report += `   ${JSON.stringify(shape, null, 2).split('\n').join('\n   ')}\n`;
      });
      report += "\n";
    } else {
      report += "⚠️ AI nevrátila žádné tvary (shapes: [])\n\n";
    }
  } else {
    report += "❌ AI response nebyla zachycena (timeout nebo chyba)\n\n";
  }

  report += "─────────────────────────────────────────────────────\n";
  report += "📊 VÝSLEDEK TESTU:\n";
  report += "─────────────────────────────────────────────────────\n";
  report += `Očekáváno tvarů: ${lastResult.expectedShapes}\n`;
  report += `Získáno tvarů:   ${lastResult.actualShapes}\n`;
  report += `Status:          ${lastResult.hasErrors ? '❌ CHYBY DETEKOVÁNY' : '✅ ÚSPĚCH'}\n\n`;

  if (lastResult.shapesDetails && lastResult.shapesDetails.length > 0) {
    report += "─────────────────────────────────────────────────────\n";
    report += "📐 VYTVOŘENÉ TVARY (detail):\n";
    report += "─────────────────────────────────────────────────────\n";
    lastResult.shapesDetails.forEach(shape => {
      report += `\n${shape.index}. ${shape.type.toUpperCase()}:\n`;
      if (shape.type === "line") {
        report += `   Start: Z=${shape.data.x1}, X=${shape.data.y1}\n`;
        report += `   Konec: Z=${shape.data.x2}, X=${shape.data.y2}\n`;
        report += `   Délka: ${shape.length}\n`;
      } else if (shape.type === "circle") {
        report += `   Střed: Z=${shape.data.cx}, X=${shape.data.cy}\n`;
        report += `   Poloměr: ${shape.data.r}\n`;
      } else if (shape.type === "arc") {
        report += `   Střed: Z=${shape.data.cx}, X=${shape.data.cy}\n`;
        report += `   Poloměr: ${shape.data.r}\n`;
        if (shape.data.startAngle !== undefined && shape.data.endAngle !== undefined) {
          report += `   Úhly: ${shape.data.startAngle}° až ${shape.data.endAngle}°\n`;
        }
      }
    });
    report += "\n";
  }

  if (lastResult.pointsDetails && lastResult.pointsDetails.length > 0) {
    report += "─────────────────────────────────────────────────────\n";
    report += "📍 VYTVOŘENÉ BODY:\n";
    report += "─────────────────────────────────────────────────────\n";
    lastResult.pointsDetails.forEach(point => {
      report += `${point.index}. BOD: Z=${point.data.x}, X=${point.data.y}\n`;
    });
    report += "\n";
  }

  if (lastResult.errors && lastResult.errors.length > 0) {
    report += "─────────────────────────────────────────────────────\n";
    report += "⚠️  DETEKOVANÉ CHYBY:\n";
    report += "─────────────────────────────────────────────────────\n";
    lastResult.errors.forEach((error, idx) => {
      report += `${idx + 1}. ${error}\n`;
    });
    report += "\n";
  }

  report += "═══════════════════════════════════════════════════\n";
  report += "               KONEC REPORTU\n";
  report += "═══════════════════════════════════════════════════\n";

  // Zobraz report v modálním okně
  const reportDiv = document.createElement("div");
  reportDiv.className = "chat-msg model";
  reportDiv.style.cssText = "background: #0a0a0a; border: 2px solid #2563eb; padding: 15px; margin-top: 15px; font-family: 'Courier New', monospace; font-size: 11px; white-space: pre-wrap; max-height: 1000px; overflow-y: auto;";
  reportDiv.textContent = report;

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "📋 ZKOPÍROVAT REPORT";
  copyBtn.style.cssText = "width: 100%; padding: 10px; margin-top: 10px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;";
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(report).then(() => {
      copyBtn.textContent = "✅ ZKOPÍROVÁNO!";
      setTimeout(() => {
        copyBtn.textContent = "📋 ZKOPÍROVAT REPORT";
      }, 2000);
    }).catch(err => {
      alert("Chyba při kopírování: " + err);
    });
  };

  container.appendChild(reportDiv);
  container.appendChild(copyBtn);
  container.scrollTop = container.scrollHeight;
};

window.closeAITestModal = function() {
  const modal = document.getElementById("aiTestModal");
  if (modal) {
    modal.style.display = "none";
  }
};

// Zobraz souhrn testů
window.showTestSummary = function() {
  if (!window.aiTestResults || window.aiTestResults.length === 0) {
    alert("Žádné výsledky testů k dispozici.");
    return;
  }

  const container = document.getElementById("aiChatHistory");
  if (!container) return;

  const total = window.aiTestResults.length;
  const passed = window.aiTestResults.filter(r => !r.hasErrors).length;
  const failed = total - passed;
  const successRate = ((passed / total) * 100).toFixed(1);

  // Souhrn chyb
  const errorsByType = {};
  window.aiTestResults.forEach(result => {
    if (result.hasErrors) {
      result.errors.forEach(error => {
        const errorType = error.split(':')[0].trim();
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      });
    }
  });

  let summaryText = `\n\n📊 SOUHRN TESTŮ\n`;
  summaryText += `${'='.repeat(50)}\n`;
  summaryText += `Celkem testů: ${total}\n`;
  summaryText += `✅ Úspěšné: ${passed} (${successRate}%)\n`;
  summaryText += `❌ Neúspěšné: ${failed} (${(100 - successRate).toFixed(1)}%)\n`;

  if (Object.keys(errorsByType).length > 0) {
    summaryText += `\n🔍 NEJČASTĚJŠÍ CHYBY:\n`;
    Object.entries(errorsByType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        summaryText += `  • ${type}: ${count}x\n`;
      });
  }

  // Seznam neúspěšných testů
  const failedTests = window.aiTestResults.filter(r => r.hasErrors);
  if (failedTests.length > 0) {
    summaryText += `\n❌ NEÚSPĚŠNÉ TESTY:\n`;
    failedTests.forEach(result => {
      summaryText += `  ${result.testIndex + 1}. ${result.testName}\n`;
      summaryText += `     Prompt: "${result.prompt}"\n`;
      result.errors.forEach(err => {
        summaryText += `     - ${err}\n`;
      });
    });
  }

  const summaryDiv = document.createElement("div");
  summaryDiv.className = "chat-msg model";
  summaryDiv.style.color = passed === total ? "#10b981" : "#ef4444";
  summaryDiv.style.fontSize = "12px";
  summaryDiv.style.whiteSpace = "pre-wrap";
  summaryDiv.style.background = "#1a1a1a";
  summaryDiv.style.border = "2px solid " + (passed === total ? "#10b981" : "#ef4444");
  summaryDiv.style.padding = "15px";
  summaryDiv.style.marginTop = "20px";
  summaryDiv.textContent = summaryText;

  container.appendChild(summaryDiv);
  container.scrollTop = container.scrollHeight;

  alert(`✅ Testy dokončeny!\n\nÚspěšnost: ${successRate}%\n(${passed}/${total} testů prošlo)`);
};

// Reset testovacích výsledků
window.resetTestResults = function() {
  window.aiTestResults = [];
  console.log("🔄 Výsledky testů resetovány");
};

// Exportuj výsledky testů do JSON souboru
window.exportTestResults = function() {
  if (!window.aiTestResults || window.aiTestResults.length === 0) {
    alert("Žádné výsledky testů k exportu.");
    return;
  }

  const data = {
    timestamp: new Date().toISOString(),
    totalTests: window.aiTestResults.length,
    passedTests: window.aiTestResults.filter(r => !r.hasErrors).length,
    failedTests: window.aiTestResults.filter(r => r.hasErrors).length,
    results: window.aiTestResults
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-test-results-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert(`✅ Výsledky testů exportovány do ${a.download}`);
};

// Formátuj CNC příkazy přidáním mezer (např. X80Z56R52 → X80 Z56 R52)
window.formatCNCCommand = function(text) {
  if (!text) return text;
  // Přidej mezery před G, X, Z, R, D, L, A, AP, RP, CR atd.
  return text.replace(/([GXZRDALC])/g, ' $1').replace(/^\s+/, '').replace(/\s+/g, ' ');
};

// Validuj CNC příkaz - vrátí chybovou zprávu nebo null pokud je OK
window.validateCNCCommand = function(text) {
  if (!text || text.trim() === '') return 'Prázdný příkaz';

  // Odstraň mezery pro analýzu
  const clean = text.replace(/\s+/g, '').toUpperCase();

  // Kontrola G-kódů
  if (clean.match(/^G[0-3]/)) {
    // G0, G1, G2, G3 - vyžadují parametry
    if (!/[XZ]/.test(clean)) {
      return '❌ Chybí souřadnice: Přidej X nebo Z (např. G0X50Z100)';
    }
  }

  // Kontrola samostatného R (radius) - měl by být součást G-kódu nebo kruh
  if (clean.match(/^R\d/) && !clean.match(/^[GX]/)) {
    return '❌ R (radius) se musí psát s G-kódem (např. G0R50) nebo X/Z souřadnicemi';
  }

  // Kontrola R/CR v kruhu - měly by být s X a Z
  if (clean.match(/R\d/) && !clean.match(/[XZ]/)) {
    return '❌ Radius R se musí kombinovat se souřadnicemi X nebo Z';
  }

  // Kontrola polárních souřadnic
  if (clean.match(/(RP|AP)/) && !clean.match(/[LXZ]/)) {
    return '❌ Polární souřadnice (RP, AP) se musí kombinovat s L (délka) nebo X/Z';
  }

  return null; // Bez chyby
};

// Auto-formatuj a validuj po zmáčknutí ";"
window.handleSemicolonInInput = function(inputElement) {
  if (!inputElement) return;

  const fullText = inputElement.value;
  const parts = fullText.split(';');

  // Zpracuj poslední část (tu, kterou jsme právě zadali)
  const lastPart = parts[parts.length - 2] || ''; // Text před posledním ;

  if (lastPart.trim()) {
    // Validuj poslední příkaz
    const error = window.validateCNCCommand(lastPart);

    if (error) {
      // Zobraz chybu v odpovídajícím error elementu
      let errorElement = null;
      if (inputElement.id === 'quickInputDisplay') {
        errorElement = document.getElementById('quickInputError');
      } else if (inputElement.id === 'aiPrompt') {
        errorElement = document.getElementById('cncInputError');
      }

      if (errorElement) {
        errorElement.textContent = error;
        errorElement.style.display = 'block';
        setTimeout(() => {
          errorElement.style.display = 'none';
        }, 4000);
      } else {
        alert(error);
      }
    }

    // Nahraď poslední část formátovanou verzí
    const formattedPart = window.formatCNCCommand(lastPart);
    const newText = parts.slice(0, -2).join(';') +
                   (parts.slice(0, -2).length > 0 ? '; ' : '') +
                   formattedPart + '; ';

    inputElement.value = newText;
    inputElement.scrollLeft = inputElement.scrollWidth;
  }
};

// Přidej event listener pro oba input fieldy
window.setupCNCInputListeners = function() {
  // Pro quickInputDisplay (AI klávesnice)
  const quickDisplay = document.getElementById('quickInputDisplay');
  if (quickDisplay) {
    quickDisplay.addEventListener('keypress', function(e) {
      if (e.key === ';') {
        e.preventDefault();
        this.value += '; ';
        window.handleSemicolonInInput(this);
      }
    });

    // Alternativně při změně textu
    quickDisplay.addEventListener('input', function() {
      if (this.value.includes(';')) {
        window.handleSemicolonInInput(this);
      }
    });
  }

  // Pro aiPrompt (hlavní input v AI panelu)
  const aiPrompt = document.getElementById('aiPrompt');
  if (aiPrompt) {
    aiPrompt.addEventListener('keypress', function(e) {
      if (e.key === ';') {
        e.preventDefault();
        this.value += '; ';
        window.handleSemicolonInInput(this);
      }
    });
  }
};

// Inicializuj při načtení
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    window.setupCNCInputListeners();
    window.updateQueueDisplay(); // Inicializuj UI queue display

    // Přidej listener na změnu modelu
    const modelSelect = document.getElementById("aiModelSelect");
    if (modelSelect) {
      modelSelect.addEventListener("change", function() {
        // Reset timestamps aby se aplikoval nový limit hned
        window.requestTimestamps = [];
        window.updateQueueDisplay();

        // Zobraz zprávu o změně limitu
        const modelName = window.MODEL_LIMITS[this.value]?.name || "Model";
        const limit = window.MODEL_LIMITS[this.value]?.rpm || 15;
        const container = document.getElementById("aiChatHistory");
        if (container) {
          const infoDiv = document.createElement("div");
          infoDiv.className = "chat-msg model";
          infoDiv.style.color = "#90cdf4";
          infoDiv.textContent = `✅ Vybrán: ${modelName} (${limit} requestů/min)`;
          container.appendChild(infoDiv);
          container.scrollTop = container.scrollHeight;
        }
      });
    }
  }, 500);
});

window.showTestOptions = function(testIndex) {
  const test = window.AI_TEST_PROMPTS[testIndex];
  const modal = document.getElementById("aiTestModal");
  const content = document.getElementById("aiTestContent");

  if (!modal || !content) return;

  content.innerHTML = `
    <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #444">
      <div style="margin-bottom: 12px">
        <h3 style="color: #90cdf4; margin: 0 0 8px 0; font-size: 14px">📋 Test ${testIndex + 1}: ${test.name}</h3>
        <p style="color: #aaa; margin: 0 0 8px 0; font-size: 12px">
          <strong>Úroveň:</strong> ${test.level} |
          <strong>Složitost:</strong> ${test.complexity} |
          <strong>Očekávané tvary:</strong> ${test.expectedShapes}
        </p>
      </div>
      <div style="background: #111; padding: 10px; border-radius: 4px; border: 1px solid #333; font-family: monospace; font-size: 12px; color: #90ee90; word-wrap: break-word; max-height: 100px; overflow-y: auto">
        ${window.formatCNCCommand(test.prompt)}
      </div>
    </div>

    <div style="background: #0a3a2a; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid #22c55e">
      <p style="color: #90cdf4; margin: 0 0 10px 0; font-size: 13px; font-weight: bold">Vyberte co chcete dělat:</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px">
        <button onclick="window.runSelectedTest(${testIndex})" style="padding: 12px; background: #22c55e; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; text-align: center">
          <div style="font-size: 18px; margin-bottom: 4px">🎨</div>
          VYKRESLI NA PLÁTNO
        </button>
        <button onclick="window.showTestResponse(${testIndex})" style="padding: 12px; background: #3a7bc8; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; text-align: center">
          <div style="font-size: 18px; margin-bottom: 4px">📝</div>
          ZOBRAZ ODPOVĚĎ
        </button>
      </div>
    </div>
  `;
};

window.runSelectedTest = function(testIndex) {
  const test = window.AI_TEST_PROMPTS[testIndex];
  const promptInput = document.getElementById("aiPrompt");
  if (promptInput) {
    promptInput.value = test.prompt;
    window.closeAITestModal();
    if (window.callGemini) window.callGemini();
  }
};

// ===== Spustit všechny testy v queue =====
// Spustí komplexní test (první v poli - index 0)
window.runComplexTest = function() {
  const modal = document.getElementById("aiTestModal");
  if (modal) {
    modal.style.display = "none";
  }

  // Reset výsledků před spuštěním
  window.resetTestResults();

  // Nastav batch mode na false - jde o jediný test
  window.aiTestBatchMode = false;

  // Ujisti se, že AI panel je otevřený
  if (window.toggleAiPanel) {
    window.toggleAiPanel(true);
  }

  // Vymaž chat historii
  const chatContainer = document.getElementById("aiChatHistory");
  if (chatContainer) {
    chatContainer.innerHTML = "";
  }

  // Spusť komplexní test (index 0)
  setTimeout(() => {
    if (window.runAITest) {
      window.runAITest(0);
    }
  }, 300);
};

// Spustí jednotlivý test
window.runSingleTest = function(testIndex) {
  const modal = document.getElementById("aiTestModal");
  if (modal) {
    modal.style.display = "none";
  }

  // Reset výsledků před spuštěním
  window.resetTestResults();

  // Nastav batch mode na false - jde o jediný test
  window.aiTestBatchMode = false;

  // Ujisti se, že AI panel je otevřený
  if (window.toggleAiPanel) {
    window.toggleAiPanel(true);
  }

  // Vymaž chat historii
  const chatContainer = document.getElementById("aiChatHistory");
  if (chatContainer) {
    chatContainer.innerHTML = "";
  }

  // Spusť vybraný test
  setTimeout(() => {
    if (window.runAITest) {
      window.runAITest(testIndex);
    }
  }, 300);
};

// Původní funkce pro spuštění všech testů (zachováno pro zpětnou kompatibilitu)
window.runAllTests = function() {
  if (!confirm("⚠️ Spuštění všech testů znamená 20+ API requestů!\n\nDoporučujeme použít 'KOMPLEXNÍ TEST' místo toho (jen 1 request).\n\nOpravdu chcete pokračovat?")) {
    return;
  }

  const modal = document.getElementById("aiTestModal");
  if (modal) {
    modal.style.display = "none";
  }

  // Reset výsledků před spuštěním
  window.resetTestResults();

  // Nastav batch mode na true - spouštíme všechny testy
  window.aiTestBatchMode = true;

  // Ujisti se, že AI panel je otevřený
  if (window.toggleAiPanel) {
    window.toggleAiPanel(true);
  }

  // Vymaž chat historii
  const chatContainer = document.getElementById("aiChatHistory");
  if (chatContainer) {
    chatContainer.innerHTML = "";
  }

  // Spusť všechny testy postupně od indexu 0
  setTimeout(() => {
    if (window.runAITest) {
      window.runAITest(0);
    }
  }, 300);
};

window.showTestResponse = function(testIndex) {
  const test = window.AI_TEST_PROMPTS[testIndex];
  const modal = document.getElementById("aiTestModal");
  const content = document.getElementById("aiTestContent");

  if (!modal || !content) return;

  content.innerHTML = `
    <div style="background: #0a1a3a; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #3a7bc8">
      <h3 style="color: #90cdf4; margin: 0 0 10px 0; font-size: 14px">✨ Spouštím AI...</h3>
      <p style="color: #aaa; font-size: 12px; margin: 0">Test: ${test.name} (${test.level})</p>
    </div>
  `;

  // Spusť AI a pak zobraz výsledek
  const promptInput = document.getElementById("aiPrompt");
  if (promptInput) {
    promptInput.value = test.prompt;

    // Zavolej Gemini a pak zobraz v výsledku
    if (window.callGemini) {
      window.callGemini().then(() => {
        // Chvíli počkej na zpracování
        setTimeout(() => {
          const chatHistory = document.getElementById("aiChatHistory");
          let response = "❌ Odpověď nebyla obdržena";

          if (chatHistory) {
            // Najdi poslední zprávu od AI (chat-msg model)
            const messages = chatHistory.querySelectorAll(".chat-msg.model");
            if (messages.length > 0) {
              const lastMessage = messages[messages.length - 1];
              response = lastMessage.innerText || lastMessage.textContent;
            }
          }

          content.innerHTML = `
            <div style="background: #0a2a1a; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 2px solid #22c55e">
              <h3 style="color: #22c55e; margin: 0 0 10px 0; font-size: 14px">✅ Odpověď z AI:</h3>
              <div style="background: #111; padding: 12px; border-radius: 4px; border: 1px solid #333; font-family: monospace; font-size: 11px; color: #90ee90; word-wrap: break-word; max-height: 300px; overflow-y: auto; white-space: pre-wrap">
                ${response}
              </div>
            </div>

            <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 15px">
              <h3 style="color: #90cdf4; margin: 0 0 10px 0; font-size: 14px">📊 Detaily testu:</h3>
              <div style="font-size: 12px; color: #aaa; line-height: 1.6">
                <div><strong>Prompt:</strong> <code style="color: #90ee90">${window.formatCNCCommand(test.prompt)}</code></div>
                <div style="margin-top: 8px"><strong>Očekávané tvary:</strong> ${test.expectedShapes}</div>
                <div><strong>Typ:</strong> ${Array.isArray(test.expectedType) ? test.expectedType.join(', ') : test.expectedType}</div>
                <div><strong>Složitost:</strong> ${test.complexity}</div>
              </div>
            </div>
          `;
        }, 500);
      }).catch(() => {
        content.innerHTML = `
          <div style="background: #3a1a1a; padding: 15px; border-radius: 8px; border: 2px solid #ff6b6b; color: #ff6b6b">
            ❌ Chyba při volání AI. Zkontroluj API klíč a připojení.
          </div>
        `;
      });
    }
  }
};

window.showAITestPanel = function() {
  const modal = document.getElementById("aiTestModal");
  if (!modal) return;

  // Seskupi testy podle levelu
  const grouped = {};
  window.AI_TEST_PROMPTS.forEach((t, i) => {
    if (!grouped[t.level]) grouped[t.level] = [];
    grouped[t.level].push({ ...t, index: i + 1, actualIndex: i });
  });

  let html = `
    <div style="margin-bottom: 15px; padding: 12px; background: #0a2a1a; border-radius: 6px; border-left: 3px solid #22c55e">
      <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <p style="color: #90cdf4; margin: 0; font-size: 12px">
          Celkem: <strong>${window.AI_TEST_PROMPTS.length}</strong> testů
        </p>
        <div style="display: flex; gap: 8px;">
          <button onclick="window.runComplexTest()" style="
            padding: 8px 16px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border: none;
            border-radius: 6px;
            color: white;
            cursor: pointer;
            font-weight: bold;
            font-size: 12px;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3)
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="Komplexní test všech funkcí v jednom promptu">
            🎯 KOMPLEXNÍ TEST
          </button>
          <button onclick="window.exportTestResults()" style="
            padding: 6px 12px;
            background: #2563eb;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-weight: bold;
            font-size: 11px;
            transition: all 0.2s
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="Exportovat výsledky testů do JSON">
            📊 EXPORT
          </button>
          <button onclick="window.resetTestResults(); alert('✅ Výsledky testů resetovány');" style="
            padding: 6px 12px;
            background: #dc2626;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-weight: bold;
            font-size: 11px;
            transition: all 0.2s
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="Resetovat výsledky testů">
            🔄 RESET
          </button>
        </div>
      </div>
      <p style="color: #888; margin: 0; font-size: 11px">
        🎯 <strong>Komplexní test</strong> = 1 request, testuje všechny hlavní funkce | Nebo klikni na jednotlivé testy níže
      </p>
      <div style="margin-top: 18px; padding: 10px; background: #1a1a1a; border-radius: 6px; border: 1px solid #333;">
        <div style="font-size: 12px; color: #6ab0ff; margin-bottom: 6px;">Vlastní test podle zadání:</div>
        <textarea id="customTestPrompt" rows="2" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 6px; font-size: 13px; resize: vertical; margin-bottom: 6px;"></textarea>
        <button onclick="window.runCustomTest()" style="padding: 7px 16px; background: #8b5cf6; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px;">▶️ Spustit vlastní test</button>
      </div>
    </div>
  `;
// Spuštění vlastního testu podle uživatelského zadání
window.runCustomTest = function() {
  const prompt = document.getElementById("customTestPrompt").value.trim();
  if (!prompt) {
    alert("Zadejte prompt pro vlastní test.");
    return;
  }
  // Vytvoř dočasný test objekt
  const customTest = {
    name: "📝 Vlastní test uživatele",
    prompt: prompt,
    expectedShapes: 0,
    expectedType: [],
    complexity: 1,
    description: "Uživatelský test zadání"
  };
  // Přidej dočasně na konec pole a spusť
  window.AI_TEST_PROMPTS.push(customTest);
  window.runAITest(window.AI_TEST_PROMPTS.length - 1);
  // Po dokončení testu odeber z pole, aby se neukládal do historie
  setTimeout(() => {
    window.AI_TEST_PROMPTS.pop();
  }, 2000);
  // Zavři modal
  document.getElementById("aiTestModal").style.display = "none";
};

  // Zobraz testy seřazené podle levelu
  Object.keys(grouped).forEach(level => {
    html += `<h3 style="color: #6ab0ff; margin: 12px 0 8px 0; font-size: 13px; border-bottom: 1px solid #444; padding-bottom: 6px">━ ${level} ━</h3>`;
    html += `<div style="display: grid; grid-template-columns: 1fr; gap: 6px; margin-bottom: 12px">`;

    grouped[level].forEach(t => {
      html += `
        <button onclick="window.runSingleTest(${t.actualIndex})" style="
          padding: 10px 12px;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 6px;
          color: #e0e0e0;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
          font-size: 12px
        " onmouseover="this.style.borderColor='#6ab0ff'; this.style.background='#222'" onmouseout="this.style.borderColor='#333'; this.style.background='#1a1a1a'" title="Klikni pro spuštění tohoto testu">
          <div style="font-weight: bold; color: #6ab0ff">${t.index}. ${t.name}</div>
          <div style="font-size: 11px; color: #888; margin-top: 4px">
            Prompt: "${window.formatCNCCommand(t.prompt).substring(0, 40)}${window.formatCNCCommand(t.prompt).length > 40 ? '...' : ''}" | Tvary: ${t.expectedShapes}
          </div>
        </button>
      `;
    });

    html += `</div>`;
  });

  document.getElementById("aiTestContent").innerHTML = html;
  modal.style.display = "flex";
};

// ===== TEST ALL AI MODELS =====
window.testAllAIModels = async function() {
  console.log("🧪 Starting AI models test...");

  // Zavři settings modal
  const settingsModal = document.getElementById("settingsModal");
  if (settingsModal) settingsModal.style.display = "none";

  // Otevři results modal
  const resultsModal = document.getElementById("aiTestResultsModal");
  const resultsContent = document.getElementById("aiTestResultsContent");
  if (!resultsModal || !resultsContent) return;

  resultsModal.style.display = "flex";
  resultsContent.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #888;">
      <div class="loading-dots" style="display: inline-block;"><div></div><div></div><div></div></div>
      <div style="margin-top: 20px; font-size: 14px;">Testuji všechny AI modely...</div>
      <div style="margin-top: 10px; font-size: 12px; color: #666;">To může trvat několik minut</div>
    </div>
  `;

  const testPrompt = "Test: odpověz jen číslem 42";
  const results = {
    gemini: [],
    groq: [],
    openrouter: [],
    mistral: []
  };

  // Definice modelů pro testování
  const modelsToTest = {
    gemini: [
      { value: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite" },
      { value: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      { value: "gemini-3-pro-preview", name: "Gemini 3 Pro" },
      { value: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash" }
    ],
    groq: [
      { value: "openai/gpt-oss-120b", name: "GPT OSS 120B" },
      { value: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
      { value: "openai/gpt-oss-20b", name: "GPT OSS 20B" },
      { value: "llama-3.1-8b-instant", name: "Llama 3.1 8B" }
    ],
    openrouter: [
      { value: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash" },
      { value: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B" },
      { value: "mistralai/mistral-small-3.1-24b-instruct:free", name: "Mistral Small" }
    ],
    mistral: [
      { value: "codestral-latest", name: "Codestral" },
      { value: "mistral-small-latest", name: "Mistral Small" }
    ]
  };

  // Test funkce pro jednotlivý model
  async function testModel(provider, modelValue, modelName) {
    const startTime = Date.now();
    try {
      let apiKey;
      let endpoint;
      let requestBody;

      // Získej API klíč podle providera
      if (provider === "gemini") {
        apiKey = window.getCurrentApiKey ? window.getCurrentApiKey() : null;
        if (!apiKey) throw new Error("Chybí API klíč");

        endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelValue}:generateContent?key=${apiKey}`;
        requestBody = {
          contents: [{ parts: [{ text: testPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 50,
          }
        };

        const resp = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });

        if (!resp.ok) {
          const error = await resp.json().catch(() => ({}));
          throw new Error(error.error?.message || `HTTP ${resp.status}`);
        }

        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
        const latency = Date.now() - startTime;
        return { success: true, latency, response: text.substring(0, 50) };

      } else if (provider === "groq") {
        apiKey = window.getCurrentGroqApiKey ? window.getCurrentGroqApiKey() : null;
        if (!apiKey) throw new Error("Chybí API klíč");

        endpoint = "https://api.groq.com/openai/v1/chat/completions";

        // Reasoning modely (GPT OSS) potřebují více tokenů
        const isReasoningModel = modelValue.includes("gpt-oss");

        requestBody = {
          model: modelValue,
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: isReasoningModel ? 200 : 50
        };

      } else if (provider === "openrouter") {
        apiKey = window.getCurrentOpenRouterApiKey ? window.getCurrentOpenRouterApiKey() : null;
        if (!apiKey) throw new Error("Chybí API klíč");

        endpoint = "https://openrouter.ai/api/v1/chat/completions";
        requestBody = {
          model: modelValue,
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 50
        };

      } else if (provider === "mistral") {
        apiKey = window.getCurrentMistralApiKey ? window.getCurrentMistralApiKey() : null;
        if (!apiKey) throw new Error("Chybí API klíč");

        endpoint = "https://api.mistral.ai/v1/chat/completions";
        requestBody = {
          model: modelValue,
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 50
        };
      }

      // Pro non-Gemini providery
      if (provider !== "gemini") {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const latency = Date.now() - startTime;

        // Extrahuj text z odpovědi (supporting reasoning models)
        let text = data.choices?.[0]?.message?.content || "";

        // Pro reasoning modely (GPT OSS, o1-like) může být odpověď v "reasoning" poli
        if (!text && data.choices?.[0]?.message?.reasoning) {
          text = data.choices?.[0]?.message?.reasoning;
          console.log(`💭 Reasoning model ${modelValue} - extrahován reasoning:`, text.substring(0, 100));
        }

        // Fallback
        if (!text) {
          text = data.choices?.[0]?.text || "No response";
        }

        return { success: true, latency, response: text.substring(0, 50) };
      }

    } catch (error) {
      const latency = Date.now() - startTime;

      // Přelož chybové zprávy do češtiny
      let czechError = error.message;

      // 429 - Too Many Requests
      if (czechError.includes("429") || czechError.includes("Too Many Requests") || czechError.includes("rate limit")) {
        czechError = "⏱️ Překročen minutový limit požadavků. Zkus to za chvíli.";
      }
      // Quota exceeded
      else if (czechError.includes("quota") || czechError.includes("Quota exceeded")) {
        czechError = "📊 Překročena kvóta API. Model není dostupný v bezplatné verzi nebo je vyčerpán denní limit.";
      }
      // 401/403 - Auth errors
      else if (czechError.includes("401") || czechError.includes("403") || czechError.includes("Unauthorized") || czechError.includes("Invalid API")) {
        czechError = "🔑 Chybný nebo chybějící API klíč. Zkontroluj nastavení.";
      }
      // 404 - Not found
      else if (czechError.includes("404") || czechError.includes("not found")) {
        czechError = "❓ Model nebyl nalezen. Možná byl odstraněn nebo přejmenován.";
      }
      // 500 - Server error
      else if (czechError.includes("500") || czechError.includes("Internal Server Error")) {
        czechError = "⚠️ Chyba serveru API. Zkus to znovu později.";
      }
      // Timeout
      else if (czechError.includes("timeout") || czechError.includes("timed out")) {
        czechError = "⏰ Časový limit vypršel. Server neodpověděl včas.";
      }
      // Network error
      else if (czechError.includes("network") || czechError.includes("fetch")) {
        czechError = "🌐 Chyba sítě. Zkontroluj připojení k internetu.";
      }

      return { success: false, latency, error: czechError };
    }
  }

  // Testuj všechny providery
  for (const [provider, models] of Object.entries(modelsToTest)) {
    for (const model of models) {
      console.log(`Testing ${provider}/${model.name}...`);
      const result = await testModel(provider, model.value, model.name);
      results[provider].push({
        name: model.name,
        value: model.value,
        ...result
      });

      // Aktualizuj progress
      const totalTests = Object.values(modelsToTest).reduce((sum, m) => sum + m.length, 0);
      const completedTests = Object.values(results).reduce((sum, r) => sum + r.length, 0);
      resultsContent.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #888;">
          <div class="loading-dots" style="display: inline-block;"><div></div><div></div><div></div></div>
          <div style="margin-top: 20px; font-size: 14px;">Testuji všechny AI modely...</div>
          <div style="margin-top: 10px; font-size: 12px; color: #666;">
            Hotovo: ${completedTests} / ${totalTests}
          </div>
        </div>
      `;
    }
  }

  // Vygeneruj výsledky
  displayTestResults(results);
};

function displayTestResults(results) {
  // Ulož výsledky pro možnost kopírování
  window.lastTestResults = results;

  const resultsContent = document.getElementById("aiTestResultsContent");
  if (!resultsContent) return;

  const providerIcons = {
    gemini: "🤖",
    groq: "⚡",
    openrouter: "🌐",
    mistral: "🔥"
  };

  const providerNames = {
    gemini: "Gemini",
    groq: "Groq",
    openrouter: "OpenRouter",
    mistral: "Mistral"
  };

  let html = `
    <div style="margin-bottom: 20px; padding: 15px; background: #1a2332; border: 1px solid #2563eb; border-radius: 8px;">
      <h3 style="color: #60a5fa; font-size: 14px; margin: 0 0 10px 0;">📊 Souhrn</h3>
  `;

  // Spočítej celkové statistiky
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalLatency = 0;
  let testCount = 0;

  Object.values(results).forEach(providerResults => {
    providerResults.forEach(result => {
      if (result.success) {
        totalSuccess++;
        totalLatency += result.latency;
      } else {
        totalFailed++;
      }
      testCount++;
    });
  });

  const avgLatency = totalSuccess > 0 ? Math.round(totalLatency / totalSuccess) : 0;

  html += `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 12px;">
      <div style="text-align: center; padding: 10px; background: #0f1419; border-radius: 6px;">
        <div style="color: #4ade80; font-size: 18px; font-weight: bold;">${totalSuccess}</div>
        <div style="color: #888; font-size: 11px;">✅ Funguje</div>
      </div>
      <div style="text-align: center; padding: 10px; background: #0f1419; border-radius: 6px;">
        <div style="color: #f87171; font-size: 18px; font-weight: bold;">${totalFailed}</div>
        <div style="color: #888; font-size: 11px;">❌ Chyba</div>
      </div>
      <div style="text-align: center; padding: 10px; background: #0f1419; border-radius: 6px;">
        <div style="color: #60a5fa; font-size: 18px; font-weight: bold;">${avgLatency}ms</div>
        <div style="color: #888; font-size: 11px;">⚡ Průměrná odezva</div>
      </div>
    </div>
  </div>
  `;

  // Výsledky pro každý provider
  Object.entries(results).forEach(([provider, providerResults]) => {
    if (providerResults.length === 0) return;

    const successCount = providerResults.filter(r => r.success).length;
    const failedCount = providerResults.filter(r => !r.success).length;

    html += `
      <div style="margin-bottom: 15px; padding: 15px; background: #1a1a1a; border: 1px solid #333; border-radius: 8px;">
        <h3 style="color: #6ab0ff; font-size: 14px; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px;">${providerIcons[provider]}</span>
          ${providerNames[provider]}
          <span style="margin-left: auto; font-size: 12px; color: #888;">
            ✅ ${successCount} / ❌ ${failedCount}
          </span>
        </h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
    `;

    providerResults.forEach(result => {
      const statusColor = result.success ? "#4ade80" : "#f87171";
      const statusIcon = result.success ? "✅" : "❌";
      const statusText = result.success ? "Funguje" : "Chyba";

      html += `
        <div style="
          padding: 10px;
          background: #0f1419;
          border-left: 3px solid ${statusColor};
          border-radius: 4px;
          font-size: 12px;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="color: #e0e0e0; font-weight: bold;">${result.name}</span>
            <span style="color: ${statusColor}; font-size: 11px;">${statusIcon} ${statusText}</span>
          </div>
          <div style="color: #666; font-size: 10px; font-family: monospace; margin-bottom: 4px;">
            ${result.value}
          </div>
      `;

      if (result.success) {
        html += `
          <div style="display: flex; gap: 15px; font-size: 11px; color: #888;">
            <span>⚡ ${result.latency}ms</span>
            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              💬 "${result.response}"
            </span>
          </div>
        `;
      } else {
        html += `
          <div style="color: #f87171; font-size: 11px; margin-top: 4px;">
            ⚠️ ${result.error}
          </div>
        `;
      }

      html += `</div>`;
    });

    html += `
        </div>
      </div>
    `;
  });

  resultsContent.innerHTML = html;
}

window.closeAITestResults = function() {
  const modal = document.getElementById("aiTestResultsModal");
  if (modal) modal.style.display = "none";
};

window.copyAITestReport = function() {
  if (!window.lastTestResults) {
    alert("❌ Nejsou k dispozici žádné výsledky testů.");
    return;
  }

  const results = window.lastTestResults;
  const providerNames = {
    gemini: "Gemini",
    groq: "Groq",
    openrouter: "OpenRouter",
    mistral: "Mistral"
  };

  // Vytvoř textový report
  let report = "═══════════════════════════════════════\n";
  report += "🧪 VÝSLEDKY TESTOVÁNÍ AI MODELŮ\n";
  report += "═══════════════════════════════════════\n\n";

  // Souhrn
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalLatency = 0;
  let testCount = 0;

  Object.values(results).forEach(providerResults => {
    providerResults.forEach(result => {
      if (result.success) {
        totalSuccess++;
        totalLatency += result.latency;
      } else {
        totalFailed++;
      }
      testCount++;
    });
  });

  const avgLatency = totalSuccess > 0 ? Math.round(totalLatency / totalSuccess) : 0;

  report += "📊 SOUHRN:\n";
  report += `  ✅ Funguje: ${totalSuccess}\n`;
  report += `  ❌ Chyby: ${totalFailed}\n`;
  report += `  ⚡ Průměrná odezva: ${avgLatency}ms\n`;
  report += `  📝 Celkem testů: ${testCount}\n\n`;

  // Detaily pro každý provider
  Object.entries(results).forEach(([provider, providerResults]) => {
    if (providerResults.length === 0) return;

    const successCount = providerResults.filter(r => r.success).length;
    const failedCount = providerResults.filter(r => !r.success).length;

    report += "───────────────────────────────────────\n";
    report += `${providerNames[provider].toUpperCase()} (✅ ${successCount} / ❌ ${failedCount})\n`;
    report += "───────────────────────────────────────\n";

    providerResults.forEach(result => {
      const statusIcon = result.success ? "✅" : "❌";
      const statusText = result.success ? "Funguje" : "Chyba";

      report += `\n${statusIcon} ${result.name}\n`;
      report += `   Model: ${result.value}\n`;

      if (result.success) {
        report += `   Odezva: ${result.latency}ms\n`;
        report += `   Odpověď: "${result.response}"\n`;
      } else {
        report += `   ⚠️ Chyba: ${result.error}\n`;
      }
    });

    report += "\n";
  });

  report += "═══════════════════════════════════════\n";
  report += `Datum testu: ${new Date().toLocaleString('cs-CZ')}\n`;
  report += "═══════════════════════════════════════";

  // Zkopíruj do schránky
  navigator.clipboard.writeText(report).then(() => {
    alert("✅ Report zkopírován do schránky!");
  }).catch(err => {
    console.error("❌ Chyba při kopírování:", err);
    // Fallback: zobraz report v alert dialogu
    alert("❌ Automatické kopírování selhalo. Report:\n\n" + report);
  });
};

// ===== HIDE FAILED MODELS =====
window.hideFailedModels = function(shouldHide) {
  if (!window.lastTestResults) {
    alert("❌ Nejsou k dispozici žádné výsledky testů. Spusť nejdřív test modelů.");
    document.getElementById("hideFailedModelsCheckbox").checked = false;
    return;
  }

  const results = window.lastTestResults;
  const modelSelect = document.getElementById("aiModelSelect");
  if (!modelSelect) return;

  // Získej seznam nefunkčních modelů
  const failedModels = new Set();
  Object.values(results).forEach(providerResults => {
    providerResults.forEach(result => {
      if (!result.success) {
        failedModels.add(result.value);
      }
    });
  });

  // Ulož stav do localStorage
  if (shouldHide) {
    localStorage.setItem("hideFailedModels", "true");
    localStorage.setItem("failedModelsList", JSON.stringify([...failedModels]));
  } else {
    localStorage.removeItem("hideFailedModels");
    localStorage.removeItem("failedModelsList");
  }

  // Aplikuj změny na select
  Array.from(modelSelect.options).forEach(option => {
    if (failedModels.has(option.value)) {
      if (shouldHide) {
        option.style.display = "none";
        option.disabled = true;

        // Pokud je vybraný nefunkční model, vyber první funkční
        if (option.selected) {
          const firstWorking = Array.from(modelSelect.options).find(opt => !failedModels.has(opt.value));
          if (firstWorking) {
            firstWorking.selected = true;
          }
        }
      } else {
        option.style.display = "";
        option.disabled = false;
      }
    }
  });

  const count = failedModels.size;
  if (shouldHide && count > 0) {
    alert(`✅ Skryto ${count} nefunkčních modelů.\n\nModely:\n${[...failedModels].join('\n')}`);
  } else if (!shouldHide) {
    alert(`✅ Všechny modely jsou znovu zobrazeny.`);
  }
};

// Při načtení stránky zkontroluj, jestli jsou nějaké modely skryté
document.addEventListener('DOMContentLoaded', () => {
  const shouldHide = localStorage.getItem("hideFailedModels") === "true";
  const failedModelsStr = localStorage.getItem("failedModelsList");

  if (shouldHide && failedModelsStr) {
    try {
      const failedModels = new Set(JSON.parse(failedModelsStr));
      const modelSelect = document.getElementById("aiModelSelect");

      if (modelSelect) {
        Array.from(modelSelect.options).forEach(option => {
          if (failedModels.has(option.value)) {
            option.style.display = "none";
            option.disabled = true;
          }
        });
      }
    } catch (e) {
      console.warn("Nepodařilo se načíst seznam skrytých modelů:", e);
    }
  }
});

// ===== MODEL MANAGER =====
const ALL_MODELS = {
  gemini: [
    { value: "gemini-2.5-flash-lite", name: "⚡ Gemini 2.5 Flash-Lite (Vyšší limit)" },
    { value: "gemini-2.5-flash", name: "⚡ Gemini 2.5 Flash (Rychlý)" },
    { value: "gemini-3-pro-preview", name: "🧪 Gemini 3 Pro (Nejchytřejší)" },
    { value: "gemini-2.0-flash-exp", name: "⚡ Gemini 2.0 Flash (Exp)" }
  ],
  groq: [
    { value: "openai/gpt-oss-120b", name: "🧠 GPT OSS 120B (~500 tok/s)" },
    { value: "llama-3.3-70b-versatile", name: "💬 Llama 3.3 70B (nejlepší pro chat)" },
    { value: "openai/gpt-oss-20b", name: "⚡ GPT OSS 20B (~1000 tok/s)" },
    { value: "llama-3.1-8b-instant", name: "⚡ Llama 3.1 8B (nejrychlejší)" }
  ],
  openrouter: [
    { value: "google/gemini-2.0-flash-exp:free", name: "🤖 Gemini 2.0 Flash :free" },
    { value: "meta-llama/llama-3.3-70b-instruct:free", name: "🦙 Llama 3.3 70B :free" },
    { value: "mistralai/mistral-small-3.1-24b-instruct:free", name: "🔥 Mistral Small :free" }
  ],
  mistral: [
    { value: "codestral-latest", name: "💻 Codestral (kódování)" },
    { value: "mistral-small-latest", name: "⚡ Mistral Small (rychlý)" }
  ]
};

// Load enabled models from localStorage
window.loadEnabledModels = function() {
  try {
    const stored = localStorage.getItem("enabledAIModels");
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (e) {
    console.warn("Nepodařilo se načíst enabled models:", e);
  }
  // Default - všechny modely povolené
  const allModelValues = Object.values(ALL_MODELS).flat().map(m => m.value);
  return new Set(allModelValues);
}

// Save enabled models to localStorage
function saveEnabledModels(enabledSet) {
  try {
    localStorage.setItem("enabledAIModels", JSON.stringify([...enabledSet]));
  } catch (e) {
    console.error("Nepodařilo se uložit enabled models:", e);
  }
}

// Open model manager modal
window.openModelManager = function() {
  const modal = document.getElementById("modelManagerModal");
  const content = document.getElementById("modelManagerContent");
  if (!modal || !content) return;

  const enabledModels = window.loadEnabledModels();

  const providerIcons = {
    gemini: "🤖",
    groq: "⚡",
    openrouter: "🌐",
    mistral: "🔥"
  };

  const providerNames = {
    gemini: "Gemini",
    groq: "Groq",
    openrouter: "OpenRouter",
    mistral: "Mistral"
  };

  let html = "";

  Object.entries(ALL_MODELS).forEach(([provider, models]) => {
    html += `
      <div style="margin-bottom: 15px; padding: 12px; background: #1a1a1a; border: 1px solid #333; border-radius: 8px;">
        <h3 style="color: #6ab0ff; font-size: 14px; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px;">${providerIcons[provider]}</span>
          ${providerNames[provider]}
        </h3>
        <div style="display: flex; flex-direction: column; gap: 6px;">
    `;

    models.forEach(model => {
      const isEnabled = enabledModels.has(model.value);
      html += `
        <label style="
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          background: #0f1419;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
          user-select: none;
        "
        onmouseover="this.style.background='#1a2332'"
        onmouseout="this.style.background='#0f1419'"
        >
          <input
            type="checkbox"
            value="${model.value}"
            ${isEnabled ? 'checked' : ''}
            onchange="window.toggleModel('${model.value}', this.checked)"
            style="width: 18px; height: 18px; accent-color: #2563eb; cursor: pointer;"
          />
          <span style="color: #e0e0e0; font-size: 12px; flex: 1;">${model.name}</span>
          <span style="color: #666; font-size: 10px; font-family: monospace;">${model.value}</span>
        </label>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  content.innerHTML = html;
  modal.style.display = "flex";
};

// Close model manager modal
window.closeModelManager = function() {
  const modal = document.getElementById("modelManagerModal");
  if (modal) modal.style.display = "none";

  // Reload models in select
  updateModelsForProvider();
};

// Toggle single model
window.toggleModel = function(modelValue, enabled) {
  const enabledModels = window.loadEnabledModels();

  if (enabled) {
    enabledModels.add(modelValue);
  } else {
    enabledModels.delete(modelValue);
  }

  saveEnabledModels(enabledModels);
};

// Select/deselect all models
window.selectAllModels = function(selectAll) {
  const content = document.getElementById("modelManagerContent");
  if (!content) return;

  const checkboxes = content.querySelectorAll('input[type="checkbox"]');
  const enabledModels = window.loadEnabledModels();

  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAll;
    if (selectAll) {
      enabledModels.add(checkbox.value);
    } else {
      enabledModels.delete(checkbox.value);
    }
  });

  saveEnabledModels(enabledModels);
};

// Při načtení stránky aplikuj enabled modely
document.addEventListener('DOMContentLoaded', () => {
  // Po malém timeoutu, aby se načetly všechny selecty
  setTimeout(() => {
    if (window.updateModelsForProvider) {
      window.updateModelsForProvider();
    }
  }, 100);
});

// ===== EXPORT =====
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    callGemini,
    toggleAiPanel,
    clearChat,
  };
}

