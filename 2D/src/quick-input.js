/**
 * QUICK-INPUT.JS - 📱 Kompaktní klávesnice pro AI panel (ES6 hybridní)
 * Zjednodušená klávesnice pro rychlé zadávání příkazů do AI
 * @module quick-input
 */

// ===== ES6 EXPORT PLACEHOLDER =====
// export const QUICK_INPUT = {}; // Bude aktivováno po plné migraci

// ===== QUICK INPUT MODAL =====

/**
 * Otevře Quick Input modal (klávesnici pro AI)
 */
window.openQuickInput = function () {
  const modal = document.getElementById("quickInputModal");
  if (modal) {
    modal.classList.remove('d-none');
    modal.style.display = "flex";
  }
};

/**
 * Zavře Quick Input modal
 */
window.closeQuickInput = function () {
  const modal = document.getElementById("quickInputModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.add('d-none');
  }
};

/**
 * Potvrdí zadaný text z Quick Input a pošle do AI
 */
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

/**
 * Vymaže obsah Quick Input
 */
window.clearQuickInput = function () {
  const display = document.getElementById("quickInputDisplay");
  if (display) {
    display.value = "";
  }
};

// ===== TOKEN MANIPULATION =====

/**
 * Vloží token do Quick Input display
 * @param {string} token - Token k vložení (např. "X", "Z", "7")
 */
window.insertToken = function (token) {
  const display = document.getElementById("quickInputDisplay");
  if (display) {
    display.value += token;
    display.scrollTop = display.scrollHeight;
  }
};

/**
 * Smaže poslední znak z Quick Input
 */
window.backspaceToken = function () {
  const display = document.getElementById("quickInputDisplay");
  if (display && display.value) {
    display.value = display.value.slice(0, -1);
  }
};

// ===== QUICK INPUT HELP =====

/**
 * Zobrazí nápovědu pro Quick Input
 * Sdílí controllerHelpModal s Controller modulem
 */
window.showQuickInputHelp = function () {
  const modal = document.getElementById("controllerHelpModal");
  if (modal) {
    modal.classList.remove('d-none');
    modal.style.display = "flex";
  }
};

/**
 * Zavře nápovědu Quick Input
 */
window.closeQuickInputHelp = function () {
  const modal = document.getElementById("controllerHelpModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.add('d-none');
  }
};

// ===== DIRECTION MODAL (pro Quick Input) =====

/**
 * Zobrazí modal pro výběr směru (šipky)
 */
window.showDirectionModal = function () {
  const modal = document.getElementById("directionModal");
  if (modal) {
    modal.style.display = "flex";
  }
};

/**
 * Zavře modal pro výběr směru
 */
window.closeDirectionModal = function () {
  const modal = document.getElementById("directionModal");
  if (modal) {
    modal.style.display = "none";
  }
};

/**
 * Vloží směr do Quick Input jako polární úhel
 * @param {number} angle - Úhel ve stupních (0, 45, 90, 135, 180, 225, 270, 315)
 */
window.insertDirection = function (angle) {
  const display = document.getElementById("quickInputDisplay");
  if (display) {
    display.value += "AP" + angle + " ";
    display.scrollTop = display.scrollHeight;
  }
  window.closeDirectionModal();
};

// ===== LENGTH MODAL (pro Quick Input) =====

/**
 * Otevře modal pro zadání délky
 */
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

/**
 * Zavře modal pro zadání délky
 */
window.closeLengthModal = function () {
  const modal = document.getElementById("lengthModal");
  if (modal) {
    modal.style.display = "none";
  }
};

/**
 * Nastaví typ délky (L nebo RP)
 * @param {string} type - "L" (length) nebo "RP" (polar radius)
 */
window.insertLengthToken = function (type) {
  window.lengthType = type;
};

/**
 * Potvrdí zadanou délku a vloží do Quick Input
 */
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

// ===== MODE MANAGEMENT (G90/G91) =====

/**
 * Přepne režim Quick Input mezi G90 (absolutní) a G91 (přírůstkové)
 */
window.toggleQiMode = function () {
  const btn = document.getElementById("btnQiModeToggle");
  if (!btn) return;

  const currentMode = btn.textContent.trim();
  const newMode = currentMode === "G90" ? "G91" : "G90";

  btn.textContent = newMode;
  btn.classList.remove("g90", "g91");
  btn.classList.add(newMode.toLowerCase());

  // Vizuální feedback
  if (newMode === "G90") {
    btn.style.background = "#3a7bc8";
    btn.style.borderColor = "#5a9be8";
  } else {
    btn.style.background = "#c83a3a";
    btn.style.borderColor = "#e85a5a";
  }
};

/**
 * Nastaví specifický režim pro Quick Input
 * @param {string} mode - "G90" nebo "G91"
 */
window.setQiMode = function (mode) {
  const btn = document.getElementById("btnQiModeToggle");
  if (!btn) return;

  btn.textContent = mode;
  btn.classList.remove("g90", "g91");
  btn.classList.add(mode.toLowerCase());

  if (mode === "G90") {
    btn.style.background = "#3a7bc8";
    btn.style.borderColor = "#5a9be8";
  } else {
    btn.style.background = "#c83a3a";
    btn.style.borderColor = "#e85a5a";
  }
};

console.log("✅ quick-input.js loaded");
