/**
 * AI Module - UI funkce
 * Obsahuje funkce pro ovládání UI, modály, drag & drop, atd.
 * @module ai-ui
 */

// ===== ES6 EXPORTS =====
export const AI_UI = {};

// ===== AI PANEL DRAGGING =====
let aiDraggingEnabled = false;

/**
 * Povolí přetahování AI panelu
 */
window.enableAIDragging = function() {
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

    if (toolsAi) {
      toolsAi.style.zIndex = '3000';
      toolsAi.style.background = 'rgba(0, 0, 0, 0.85)';
    }

    return;
  }

  // Restore saved position jen na desktopu
  try {
    const saved = localStorage.getItem('aiPanelPosition');
    if (saved) {
      const pos = JSON.parse(saved);
      if (pos.left) panel.style.left = pos.left;
      if (pos.top) panel.style.top = pos.top;
      panel.style.right = 'auto';
      panel.style.transform = 'none';
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
    panel.style.transform = 'none';
  };

  const onMove = (clientX, clientY) => {
    if (!dragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    panel.style.left = (origX + dx) + 'px';
    panel.style.top = (origY + dy) + 'px';
    panel.style.right = 'auto';
    panel.style.transform = 'none';
  };

  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';
    try {
      localStorage.setItem('aiPanelPosition', JSON.stringify({
        left: panel.style.left,
        top: panel.style.top,
        transform: 'none'
      }));
    } catch (e) {}
  };

  const isInteractive = (el) => {
    const tag = el.tagName.toLowerCase();
    return tag === 'select' || tag === 'button' || tag === 'input' || tag === 'textarea' || tag === 'a' || el.closest('select, button, input, textarea, a');
  };

  header.addEventListener('mousedown', (e) => {
    if (isInteractive(e.target)) return;
    onStart(e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', (e) => { onMove(e.clientX, e.clientY); });
  document.addEventListener('mouseup', onEnd);

  header.addEventListener('touchstart', (e) => {
    if (isInteractive(e.target)) return;
    const t = e.touches[0];
    onStart(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }, { passive: false });
  document.addEventListener('touchend', onEnd);
};

// ===== TOGGLE AI PANEL =====
window.aiPanelOpen = false;
window.aiMinimized = false;
window.aiMemoryLoaded = false;

/**
 * Přepíná zobrazení AI panelu
 * @param {boolean} [open] - Explicitní stav (true/false) nebo toggle
 */
window.toggleAiPanel = function(open) {
  const container = document.getElementById("toolsAi");
  if (!container) return;

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

    const panelEl = document.getElementById('aiPanel');
    if (panelEl) {
      panelEl.style.display = 'block';
      panelEl.style.zIndex = '3001';
      panelEl.style.pointerEvents = 'auto';
    }

    try { if (window.enableAIDragging) window.enableAIDragging(); } catch(e){}

    const chatWindow = document.getElementById("chatWindow");
    if (chatWindow) chatWindow.style.display = "block";

    const input = document.getElementById("aiPrompt");
    if (input) setTimeout(() => input.focus(), 100);

    if (!window.aiMemoryLoaded && window.loadAIMemory) {
      window.loadAIMemory();
      window.aiMemoryLoaded = true;
    }

    window.updateAIButtonIndicator(false);
  } else {
    container.style.display = "none";
    const chatWindow = document.getElementById("chatWindow");
    if (chatWindow) chatWindow.style.display = "none";
    const panelEl = document.getElementById('aiPanel');
    if (panelEl) panelEl.style.display = 'none';
  }
};

// ===== AI BUTTON INDICATOR =====
/**
 * Aktualizuje indikátor na AI tlačítku
 * @param {boolean} isMinimized - Zda je AI minimalizována
 */
window.updateAIButtonIndicator = function(isMinimized) {
  const btn = document.getElementById('btnCatAi');
  if (!btn) return;

  const existingIndicator = btn.querySelector('.ai-indicator');
  if (existingIndicator) existingIndicator.remove();

  if (isMinimized) {
    const indicator = document.createElement('div');
    indicator.className = 'ai-indicator';
    indicator.innerHTML = '<span style="font-size: 8px;">●</span>';
    indicator.style.cssText = 'position: absolute; top: 2px; right: 2px; background: #22c55e; color: white; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; animation: pulse 2s infinite;';
    btn.style.position = 'relative';
    btn.appendChild(indicator);
  }
};

// ===== MINIMIZE / CLOSE AI =====
/**
 * Minimalizuje AI panel (schová ho, ale AI pokračuje)
 */
window.minimizeAI = function() {
  const container = document.getElementById("toolsAi");
  if (!container) return;

  container.style.display = "none";
  window.aiPanelOpen = false;
  window.aiMinimized = true;

  window.updateAIButtonIndicator(true);

  const btnCatAi = document.getElementById('btnCatAi');
  if (btnCatAi) btnCatAi.classList.remove('active');
};

/**
 * Zavře AI panel a ukončí probíhající operace
 */
window.closeAI = function() {
  const container = document.getElementById("toolsAi");
  if (!container) return;

  console.log("🛑 AI panel zavřen uživatelem");

  container.style.display = "none";
  window.aiPanelOpen = false;
  window.aiMinimized = false;

  window.updateAIButtonIndicator(false);

  const btnCatAi = document.getElementById('btnCatAi');
  if (btnCatAi) btnCatAi.classList.remove('active');
};

// ===== CLEAR CHAT MODAL =====
/**
 * Zobrazí modal pro potvrzení vymazání chatu
 */
window.clearAIChat = function() {
  const modal = document.getElementById('clearChatModal');
  if (modal) {
    modal.classList.remove('d-none');
    modal.style.display = 'flex';
  }
};

/**
 * Potvrdí vymazání chatu
 */
window.confirmClearChat = function() {
  const chatHistory = document.getElementById('aiChatHistory');
  if (chatHistory) {
    chatHistory.innerHTML = '';
  }

  const chatWindow = document.getElementById('chatWindow');
  if (chatWindow) {
    chatWindow.innerHTML = '';
  }

  window.chatHistory = [];

  try {
    localStorage.removeItem("ai_chat_history");
  } catch (e) {}

  window.closeClearChatModal();
};

/**
 * Zavře modal pro vymazání chatu
 */
window.closeClearChatModal = function() {
  const modal = document.getElementById('clearChatModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.add('d-none');
  }
};

// ===== QUICK INPUT MODAL =====
/**
 * Otevře Quick Input modal pro klávesnicové ovládání
 */
window.openQuickInput = function() {
  const modal = document.getElementById("quickInputModal");
  if (modal) {
    modal.classList.remove('d-none');
    modal.style.display = "flex";
  }
};

/**
 * Zavře Quick Input modal
 */
window.closeQuickInput = function() {
  const modal = document.getElementById("quickInputModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.add('d-none');
  }
};

/**
 * Potvrdí Quick Input a odešle příkaz
 */
window.confirmQuickInput = function() {
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

/**
 * Vloží token do Quick Input
 * @param {string} token - Token k vložení
 */
window.insertToken = function(token) {
  const display = document.getElementById("quickInputDisplay");
  if (display) {
    display.value += token;
    display.scrollTop = display.scrollHeight;
  }
};

/**
 * Smaže poslední znak v Quick Input
 */
window.backspaceToken = function() {
  const display = document.getElementById("quickInputDisplay");
  if (display && display.value) {
    display.value = display.value.slice(0, -1);
  }
};

// ===== QUICK INPUT HELP =====
/**
 * Zobrazí nápovědu pro Quick Input
 */
window.showQuickInputHelp = function() {
  const modal = document.getElementById("controllerHelpModal");
  if (modal) {
    modal.classList.remove('d-none');
    modal.style.display = "flex";
  }
};

/**
 * Zavře nápovědu pro Quick Input
 */
window.closeQuickInputHelp = function() {
  const modal = document.getElementById("controllerHelpModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.add('d-none');
  }
};

// ===== DIRECTION MODAL =====
/**
 * Zobrazí modal pro výběr směru
 */
window.showDirectionModal = function() {
  const modal = document.getElementById("directionModal");
  if (modal) modal.style.display = "flex";
};

/**
 * Zavře modal pro výběr směru
 */
window.closeDirectionModal = function() {
  const modal = document.getElementById("directionModal");
  if (modal) modal.style.display = "none";
};

/**
 * Vloží směr do Quick Input
 * @param {number} angle - Úhel ve stupních
 */
window.insertDirection = function(angle) {
  const display = document.getElementById("quickInputDisplay");
  if (display) {
    display.value += "AP" + angle + " ";
    display.scrollTop = display.scrollHeight;
  }
  window.closeDirectionModal();
};

// ===== LENGTH MODAL =====
window.lengthType = "L";

/**
 * Otevře modal pro zadání délky
 */
window.openLengthModal = function() {
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

/**
 * Zavře modal pro zadání délky
 */
window.closeLengthModal = function() {
  const modal = document.getElementById("lengthModal");
  if (modal) modal.style.display = "none";
};

/**
 * Nastaví typ délky (L nebo RP)
 * @param {string} type - Typ délky
 */
window.insertLengthToken = function(type) {
  window.lengthType = type;
};

/**
 * Potvrdí zadanou délku
 */
window.confirmLength = function() {
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

// ===== VOICE INPUT =====
/**
 * Přepíná hlasové zadávání
 */
window.toggleVoice = function() {
  const btn = document.getElementById("btnVoice");
  if (!btn) return;
  btn.classList.toggle("recording-pulse");
  setTimeout(() => btn.classList.remove("recording-pulse"), 2000);
  alert("🎤 Hlasové zadání: Funkce bude implementována v příští verzi.");
};

// ===== AI PREFERENCES =====
/**
 * Otevře modal s preferencemi AI
 */
window.openAIPreferences = function() {
  const modal = document.getElementById("aiPreferencesModal");
  if (modal) {
    modal.style.display = "flex";
    window.renderPreferencesList();
  }
};

/**
 * Zavře modal s preferencemi AI
 */
window.closeAIPreferences = function() {
  const modal = document.getElementById("aiPreferencesModal");
  if (modal) modal.style.display = "none";
};

/**
 * Vykreslí seznam preferencí
 */
window.renderPreferencesList = function() {
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

/**
 * Přidá novou preferenci
 */
window.addAIPreference = function() {
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
/**
 * Zobrazí AI paměť
 */
window.showAIMemory = function() {
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

/**
 * Zobrazí AI metriky
 */
window.showAIMetrics = function() {
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

/**
 * Zobrazí statistiky AI
 */
window.showAiStats = function() {
  const modal = document.getElementById("aiStatsModal") || window.createStatsModal();
  if (modal) {
    modal.style.display = "flex";
    if (window.updateAiStats) window.updateAiStats();
  }
};

/**
 * Vytvoří modal pro statistiky
 * @returns {HTMLElement} Modal element
 */
window.createStatsModal = function() {
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
};

/**
 * Aktualizuje statistiky AI
 */
window.updateAiStats = function() {
  const statsContent = document.getElementById("statsContent");
  if (!statsContent) return;

  const memory = window.getAIMemoryContext ? window.getAIMemoryContext() : {};
  const commandCount = memory.commands ? memory.commands.length : 0;
  const correctionCount = memory.corrections ? memory.corrections.length : 0;
  const totalInteractions = window.chatHistory?.length || 0;

  const stats = `
    <strong>📝 Interakce:</strong> ${totalInteractions}<br>
    <strong>📌 Příkazů:</strong> ${commandCount}<br>
    <strong>✏️ Oprav:</strong> ${correctionCount}<br>
    <strong>💾 Aktualizováno:</strong> ${new Date().toLocaleString()}<br>
  `;

  statsContent.innerHTML = stats;
};

// ===== IMAGE HANDLING =====
/**
 * Zpracuje vybraný obrázek
 * @param {HTMLInputElement} input - Input element s obrázkem
 */
window.handleImageSelect = function(input) {
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

/**
 * Vymaže obrázek
 */
window.clearImage = function() {
  window.currentImageBase64 = null;
  window.currentImageMimeType = null;

  const input = document.getElementById("aiImageInput");
  if (input) input.value = "";

  const preview = document.getElementById("aiImagePreview");
  if (preview) preview.style.display = "none";

  const fileNameEl = document.getElementById("aiFileName");
  if (fileNameEl) fileNameEl.textContent = "";
};

// ===== UNDO/REDO =====
/**
 * Undo v AI kontextu
 */
window.aiUndo = function() {
  if (window.undo) window.undo();
};

/**
 * Redo v AI kontextu
 */
window.aiRedo = function() {
  if (window.redo) window.redo();
};

// ===== AI SELECT TOGGLE =====
/**
 * Přepíná režim výběru AI
 */
window.toggleAiSelect = function() {
  window.aiSelectMode = !window.aiSelectMode;

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

// ===== API USAGE UI =====
/**
 * Aktualizuje UI s informacemi o limitech
 */
window.updateQueueDisplay = function() {
  const now = Date.now();
  window.requestTimestamps = (window.requestTimestamps || []).filter(
    ts => now - ts < (window.REQUESTS_WINDOW_MS || 60000)
  );
  if (window.saveRequestTimestamps) window.saveRequestTimestamps();

  const maxRequests = window.getCurrentModelLimit?.() || 15;
  const usedSlots = window.requestTimestamps.length;
  const availableSlots = maxRequests - usedSlots;

  const meterDiv = document.getElementById("aiLimitMeter");
  if (meterDiv) {
    meterDiv.textContent = `${usedSlots}/${maxRequests}`;

    if (availableSlots <= 2) {
      meterDiv.style.color = "#ff9800";
    } else if (usedSlots >= maxRequests) {
      meterDiv.style.color = "#f87171";
    } else {
      meterDiv.style.color = "#888";
    }
  }

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

// ===== CANCEL AI REQUEST =====
/**
 * Zruší aktuální AI request
 */
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

// ===== INICIALIZACE =====
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.enableAIDragging();
  } catch (e) {
    console.warn('enableAIDragging failed', e);
  }
});

console.log("✅ [AI-UI] Modul načten");
