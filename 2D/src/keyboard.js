/**
 * KEYBOARD.JS - Unified Keyboard Handler (ES6 hybridní)
 * Centralizovaná správa všech keyboard shortcutů
 * Tunable konfigurace pro všechny kombinace
 * @module keyboard
 */

// ===== ES6 EXPORT PLACEHOLDER =====
// export const KEYBOARD = {}; // Bude aktivováno po plné migraci

// ===== KEYBOARD CONFIGURATION (TUNABLE) =====
window.keyboardConfig = {
  // Drawing modes - Quick access (number keys)
  quickModes: {
    "1": "line",
    "2": "circle",
    "3": "arc",
    "4": "tangent",
    "5": "perpendicular",
    "6": "parallel",
    "7": "trim",
    "8": "offset",
    "9": "mirror",
    "0": "erase",
  },

  // Controller shortcuts
  controller: {
    open: { key: "k", ctrl: true, alt: true, meta: true }, // ALT+K or CMD+K
    close: { key: "Escape", ctrl: false },
    confirm: { key: "Enter", ctrl: false },
  },

  // File operations
  file: {
    new: { key: "n", ctrl: true, meta: true },        // Ctrl+N or Cmd+N
    export: { key: "e", ctrl: true, meta: true },     // Ctrl+E or Cmd+E
    save: { key: "s", ctrl: true, meta: true },       // Ctrl+S or Cmd+S
  },

  // View operations
  view: {
    help: { key: "/", ctrl: true, meta: true },       // Ctrl+/ or Cmd+/
    home: { key: "h", ctrl: false },                  // H
    centerOrigin: { key: "o", ctrl: false },          // O
  },

  // Selection
  selection: {
    selectAll: { key: "a", ctrl: false },             // A
    deselect: { key: "d", ctrl: false },              // D
  },

  // Editing
  edit: {
    undo: { key: "z", ctrl: true, meta: true },       // Ctrl+Z or Cmd+Z
    redo: { key: "y", ctrl: true, meta: true },       // Ctrl+Y or Cmd+Y
    redoAlt: { key: "Z", ctrl: false, shift: true },  // Shift+Z
    delete: { key: "Delete", ctrl: false },
    deleteAlt: { key: "Backspace", ctrl: false },
  },

  // AI prompt
  ai: {
    send: { key: "Enter", shift: false },             // Enter (in prompt)
    sendShiftNewline: { shift: true },                // Shift+Enter = newline
  },

  // Toggle modifiers
  modifiers: {
    ortho: { key: "o", shift: true },                 // Shift+O = ortho mode
    snap: { key: "s", shift: true },                  // Shift+S = toggle snap
  },
};

// ===== KEYBOARD STATE =====
window.keyboardState = {
  ctrlPressed: false,
  shiftPressed: false,
  altPressed: false,
  metaPressed: false,
};

// ===== KEYBOARD UTILITIES =====

/**
 * Check if keyboard shortcut matches
 */
window.matchesShortcut = function(event, shortcut) {
  if (!shortcut) return false;

  const keyMatches = event.key === shortcut.key;
  const ctrlMatches = (shortcut.ctrl === undefined || shortcut.ctrl === (event.ctrlKey || event.metaKey));
  const shiftMatches = (shortcut.shift === undefined || shortcut.shift === event.shiftKey);
  const altMatches = (shortcut.alt === undefined || shortcut.alt === event.altKey);
  const metaMatches = (shortcut.meta === undefined || shortcut.meta === event.metaKey);

  return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
};

/**
 * Get shortcut description for UI
 */
window.getShortcutLabel = function(shortcut) {
  if (!shortcut) return "";

  const parts = [];
  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.alt) parts.push("Alt");
  if (shortcut.shift) parts.push("Shift");
  if (shortcut.meta) parts.push("Cmd");

  parts.push(shortcut.key);
  return parts.join("+");
};

// ===== MAIN KEYBOARD HANDLERS =====

/**
 * Master keyboard down handler
 */
window.handleGlobalKeyDown = function(e) {
  const config = window.keyboardConfig;
  const state = window.keyboardState;

  // Update state
  state.ctrlPressed = e.ctrlKey;
  state.shiftPressed = e.shiftKey;
  state.altPressed = e.altKey;
  state.metaPressed = e.metaKey;

  // ===== CONTROLLER (OVLADAČ) =====
  if (window.matchesShortcut(e, config.controller.open)) {
    e.preventDefault();
    if (window.showControllerModal) window.showControllerModal();
    return;
  }

  if (window.matchesShortcut(e, config.controller.close)) {
    const controllerModal = document.getElementById("controllerModal");
    if (controllerModal && controllerModal.style.display === "flex") {
      e.preventDefault();
      if (window.closeControllerModal) window.closeControllerModal();
      return;
    }
  }

  // Controller input handling
  const controllerInput = document.getElementById("controllerInput");
  if (controllerInput && document.activeElement === controllerInput) {
    if (window.matchesShortcut(e, config.controller.confirm)) {
      e.preventDefault();
      if (window.confirmControllerInput) window.confirmControllerInput();
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      if (window.backspaceControllerToken) window.backspaceControllerToken();
      return;
    }
  }

  // ===== AI PROMPT =====
  const aiPrompt = document.getElementById("aiPrompt");
  if (aiPrompt && document.activeElement === aiPrompt) {
    if (window.matchesShortcut(e, config.ai.send)) {
      e.preventDefault();
      if (window.callGemini) window.callGemini();
      return;
    }
    // Shift+Enter = newline (default behavior, don't prevent)
    return;
  }

  // ===== FILE OPERATIONS =====
  if (window.matchesShortcut(e, config.file.new)) {
    e.preventDefault();
    if (confirm("Vytvořit nový projekt? (Aktuální práce bude ztracena)")) {
      if (window.clearAll) window.clearAll();
    }
    return;
  }

  if (window.matchesShortcut(e, config.file.export)) {
    e.preventDefault();
    if (window.exportPNG) window.exportPNG();
    return;
  }

  if (window.matchesShortcut(e, config.file.save)) {
    e.preventDefault();
    if (window.saveProject) window.saveProject();
    return;
  }

  // ===== EDIT OPERATIONS =====
  if (window.matchesShortcut(e, config.edit.undo)) {
    e.preventDefault();
    if (window.undo) window.undo();
    return;
  }

  if (window.matchesShortcut(e, config.edit.redo) || window.matchesShortcut(e, config.edit.redoAlt)) {
    e.preventDefault();
    if (window.redo) window.redo();
    return;
  }

  if (window.matchesShortcut(e, config.edit.delete) || window.matchesShortcut(e, config.edit.deleteAlt)) {
    if (window.selectedItems && window.selectedItems.length > 0) {
      window.selectedItems.forEach((item) => {
        if (window.shapes) {
          const idx = window.shapes.indexOf(item);
          if (idx >= 0) window.shapes.splice(idx, 1);
        }
        if (window.points) {
          const pidx = window.points.indexOf(item);
          if (pidx >= 0) window.points.splice(pidx, 1);
        }
      });
      window.selectedItems.length = 0;
      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.saveState) window.saveState();
      if (window.draw) window.draw();
    }
    return;
  }

  // ===== VIEW OPERATIONS =====
  if (window.matchesShortcut(e, config.view.help)) {
    e.preventDefault();
    if (window.showHelp) window.showHelp();
    return;
  }

  if (window.matchesShortcut(e, config.view.home)) {
    if (window.resetView) window.resetView();
    return;
  }

  if (window.matchesShortcut(e, config.view.centerOrigin)) {
    if (window.centerToOrigin) window.centerToOrigin();
    return;
  }

  // ===== SELECTION =====
  if (window.matchesShortcut(e, config.selection.selectAll)) {
    if (window.selectedItems && window.shapes && window.points) {
      window.selectedItems.length = 0;
      window.selectedItems.push(...window.shapes, ...window.points);
      if (window.updateSelectionUI) window.updateSelectionUI();
    }
    return;
  }

  if (window.matchesShortcut(e, config.selection.deselect)) {
    if (window.selectedItems) {
      window.selectedItems.length = 0;
      if (window.updateSelectionUI) window.updateSelectionUI();
    }
    return;
  }

  // ===== QUICK MODE SWITCH (NUMBER KEYS) =====
  if (config.quickModes[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    const mode = config.quickModes[e.key];
    if (window.setMode) {
      window.setMode(mode);
      return;
    }
  }

  // ===== ESC = Clear mode =====
  if (e.key === "Escape") {
    if (window.clearMode) window.clearMode();
    return;
  }
};

/**
 * Master keyboard up handler
 */
window.handleGlobalKeyUp = function(e) {
  const state = window.keyboardState;

  // Update state
  state.ctrlPressed = e.ctrlKey;
  state.shiftPressed = e.shiftKey;
  state.altPressed = e.altKey;
  state.metaPressed = e.metaKey;
};

// ===== INITIALIZATION =====

/**
 * Setup unified keyboard system
 */
window.setupUnifiedKeyboard = function() {
  document.removeEventListener("keydown", window.handleGlobalKeyDown);
  document.removeEventListener("keyup", window.handleGlobalKeyUp);

  document.addEventListener("keydown", window.handleGlobalKeyDown);
  document.addEventListener("keyup", window.handleGlobalKeyUp);
};

/**
 * Get all shortcuts for help UI
 */
window.getAllShortcuts = function() {
  const config = window.keyboardConfig;
  const shortcuts = [];

  // Flatten the config
  const categories = {
    "Drawing": Object.entries(config.quickModes).map(([key, mode]) => ({
      key: key,
      action: `Mode: ${mode}`
    })),
    "File": [
      { ...config.file.new, action: "New project" },
      { ...config.file.save, action: "Save" },
      { ...config.file.export, action: "Export PNG" }
    ],
    "Edit": [
      { ...config.edit.undo, action: "Undo" },
      { ...config.edit.redo, action: "Redo" },
      { ...config.edit.delete, action: "Delete" }
    ],
    "View": [
      { ...config.view.help, action: "Help" },
      { ...config.view.home, action: "Home view" },
      { ...config.view.centerOrigin, action: "Center to origin" }
    ],
    "Selection": [
      { ...config.selection.selectAll, action: "Select all" },
      { ...config.selection.deselect, action: "Deselect" }
    ]
  };

  return categories;
};

// Auto-init when available
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", window.setupUnifiedKeyboard);
}

// Export for modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = window;
}
