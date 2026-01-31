/**
 * UI.JS - Uživatelské rozhraní a event handlery (ES6 hybridní)
 * - Modal management
 * - Button handlers
 * - User interactions
 * - Settings panels
 * @module ui
 */

// ===== ES6 EXPORT PLACEHOLDER =====
// export const UI = {}; // Bude aktivováno po plné migraci

// Globální proměnné jsou inicializovány v globals.js

// ===== DEFAULT DRAWING SETTINGS =====

window.initializeDefaultSettings = function () {
  // Načíst uložené nastavení z localStorage
  const savedColor = localStorage.getItem("defaultDrawColor") || "#4a9eff";
  const savedStyle = localStorage.getItem("defaultDrawLineStyle") || "solid";

  window.defaultDrawColor = savedColor;
  window.defaultDrawLineStyle = savedStyle;

  // Nastavit selecty v HTML
  const colorSelect = document.getElementById("defaultColorSelect");
  const styleSelect = document.getElementById("defaultLineStyleSelect");

  if (colorSelect) colorSelect.value = savedColor;
  if (styleSelect) styleSelect.value = savedStyle;
};

window.setDefaultColor = function (color) {
  window.defaultDrawColor = color;
  localStorage.setItem("defaultDrawColor", color);
};

window.setDefaultLineStyle = function (style) {
  window.defaultDrawLineStyle = style;
  localStorage.setItem("defaultDrawLineStyle", style);
};

// ===== DIMENSION COLOR SETTINGS =====

window.initializeDimensionSettings = function () {
  // Načíst uložené barvy kót z localStorage
  const savedLineColor = localStorage.getItem("dimensionLineColor") || "#ffa500";
  const savedTextColor = localStorage.getItem("dimensionTextColor") || "#ffff99";

  window.dimensionLineColor = savedLineColor;
  window.dimensionTextColor = savedTextColor;

  // Nastavit selecty v HTML
  const lineColorSelect = document.getElementById("dimensionLineColorSelect");
  const textColorSelect = document.getElementById("dimensionTextColorSelect");

  if (lineColorSelect) lineColorSelect.value = savedLineColor;
  if (textColorSelect) textColorSelect.value = savedTextColor;
};

window.setDimensionLineColor = function (color) {
  window.dimensionLineColor = color;
  localStorage.setItem("dimensionLineColor", color);
  if (window.draw) window.draw(); // Překreslit plátno
};

window.setDimensionTextColor = function (color) {
  window.dimensionTextColor = color;
  localStorage.setItem("dimensionTextColor", color);
  if (window.draw) window.draw(); // Překreslit plátno
};

// ===== INFO NOTIFICATIONS =====

window.showInfoNotification = function (message, duration = 3000) {
  // Vytvoření notifikačního elementu
  const notification = document.createElement("div");
  notification.id = "infoNotification";
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(26, 26, 26, 0.95);
    color: #6ab0ff;
    padding: 20px 40px;
    border-radius: 8px;
    border: 2px solid #6ab0ff;
    font-size: 16px;
    font-weight: bold;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
    animation: fadeInOut ${duration}ms ease-in-out;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Přidat CSS animaci
  if (!document.getElementById("notificationStyles")) {
    const style = document.createElement("style");
    style.id = "notificationStyles";
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        10% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        90% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }
    `;
    document.head.appendChild(style);
  }

  // Odstranit element po skončení animace
  setTimeout(() => {
    notification.remove();
  }, duration);
};

// ===== DEBOUNCE PRO CATEGORY SWITCHING =====
let lastCategoryChangeTime = 0;
const CATEGORY_DEBOUNCE_MS = 500; // Ochrana proti dvojímu volání

window.setMode = function (m) {
  window.mode = m;
  document.querySelectorAll(".tool-btn").forEach((b) => {
    if (!b.id.startsWith("btnCat")) b.classList.remove("active");
  });

  const btnPan = document.getElementById("btnPanCanvas");
  if (btnPan) btnPan.classList.remove("active");

  const btnMap = {
    pan: "btnPanCanvas",
    line: "btnLine",
    circle: "btnCircle",
    arc: "btnArc",
    point: "btnPoint",
    rectangle: "btnRectangle",
    trim: "btnTrim",
    extend: "btnExtend",
    tangent: "btnTangent",
    perpendicular: "btnPerpendicular",
    parallel: "btnParallel",
    offset: "btnOffset",
    mirror: "btnMirror",
    erase: "btnErase",
    measure: "btnMeasure",
    dimension: "btnDimension",
    select: "btnAiSelect",
    ai: "btnCatAi",
    align: "align",
    rotate: "rotate",
  };

  if (btnMap[m] && document.getElementById(btnMap[m])) {
    document.getElementById(btnMap[m]).classList.add("active");
  }

  const btnAiSelect = document.getElementById("btnAiSelect");
  if (btnAiSelect) {
    if (m === "select") {
      btnAiSelect.style.background = "#7c3aed";
      btnAiSelect.style.borderColor = "#8b5cf6";
      btnAiSelect.style.color = "#fff";

      // Schovat všechny panely - NE otevírat AI automaticky
      const toolsDrawing = document.getElementById("toolsDrawing");
      const toolsEdit = document.getElementById("toolsEdit");
      const toolsCoords = document.getElementById("toolsCoords");
      const toolsOther = document.getElementById("toolsOther");
      const toolsAi = document.getElementById("toolsAi");
      if (toolsDrawing) toolsDrawing.style.display = "none";
      if (toolsEdit) toolsEdit.style.display = "none";
      if (toolsCoords) toolsCoords.style.display = "none";
      if (toolsOther) toolsOther.style.display = "none";
      if (toolsAi) toolsAi.style.display = "none";
    } else {
      btnAiSelect.style.background = "#333";
      btnAiSelect.style.borderColor = "#444";
      btnAiSelect.style.color = "#ccc";

      // OPRAVA: Při výběru nástroje pro kreslení/editaci zavřít panel, aby uživatel mohl kreslit na plátno
      // Panely se zavírají pouze při aktivaci kreslícího/editačního nástroje, NE při pan/select
      const drawingModes = ["line", "circle", "arc", "point", "rectangle", "tangent", "perpendicular", "parallel", "circumcircle"];
      const editModes = ["trim", "extend", "offset", "mirror", "erase", "measure", "dimension", "align", "rotate"];

      if (drawingModes.includes(m) || editModes.includes(m)) {
        // Zavřít všechny panely při výběru nástroje pro kreslení/editaci
        const toolsDrawing = document.getElementById("toolsDrawing");
        const toolsEdit = document.getElementById("toolsEdit");
        const toolsCoords = document.getElementById("toolsCoords");
        const toolsOther = document.getElementById("toolsOther");
        const toolsAi = document.getElementById("toolsAi");
        if (toolsDrawing) toolsDrawing.style.display = "none";
        if (toolsEdit) toolsEdit.style.display = "none";
        if (toolsCoords) toolsCoords.style.display = "none";
        if (toolsOther) toolsOther.style.display = "none";
        if (toolsAi) toolsAi.style.display = "none";

        // Odznačit tlačítka kategorií
        document.querySelectorAll(".toolbar .tool-btn").forEach((btn) => {
          if (btn.id && btn.id.startsWith("btnCat")) {
            btn.classList.remove("active");
          }
        });
        window.currentCategory = null;
      }
      // Poznámka: Pro režimy pan, ai atd. panely NEZAVÍRÁME - to řeší showToolCategory
    }
  }

  const modeInfo = document.getElementById("modeInfo");
  const infoTexts = {
    select: "👆 Klikni na objekty pro výběr (Shift pro vícenásobný výběr)",
    point: "📍 Klikni pro vytvoření bodu",
    line: "📏 Klikni pro 1. bod, pak klikni pro 2. bod",
    circle: "⭕ Klikni střed, klikni obvod (pak zadej poloměr)",
    circumcircle: "🔵 Klikni na 3 body pro kružnici skrze ně",
    arc: "🌙 Klikni start → end → zadat úhel (stupně)",
    rectangle: "▭ Klikni pro 1. roh, pak pro 2. roh (protilehlý)",
    tangent: "⟂ Klikni bod, pak kružnici",
    perpendicular: "┴ Klikni bod, pak čáru",
    parallel: "∥ Klikni bod, pak čáru",
    trim: "✂️ Klikni na čáru pro oříznutí",
    extend: "↔️ Klikni na čáru pro protažení do průsečíku",
    offset: "⇄ Klikni na čáru pro odsazení",
    mirror: "🪞 Klikni na objekt (zdroj), pak na čáru (osa)",
    erase: "🗑️ Klikni na objekt pro smazání",
    measure: "📏 Klikni na objekt pro zobrazení rozměrů",
    pan: "✋ Táhni pro posun pohledu",
    ai: "✨ Napiš příkaz pro Gemini AI",
    align: "⚖️ Krok 1: Klikni na REFERENČNÍ bod objektu",
    rotate: "🔁 Krok 1: Klikni na STŘED rotace",
    dimension: "📐 Klikni na objekty pro vytvoření rozměrů",
  };

  if (modeInfo) {
    if (infoTexts[m]) {
      modeInfo.textContent = infoTexts[m];
      modeInfo.classList.add("show");
      if (m !== "pan" && m !== "select" && m !== "align") {
        setTimeout(() => {
          if (modeInfo) modeInfo.classList.remove("show");
        }, 5000);
      }
    } else {
      modeInfo.classList.remove("show");
    }
  }

  window.selectedShape = null;
  window.startPt = null;
  window.drawing = false;
  window.tempShape = null;

  // Speciální handling pro circumcircle - když jsou vybrané 3 body, vykresli hned
  if (m === "circumcircle" && window.selectedItems && window.selectedItems.length === 3) {
    const itemA = window.selectedItems[0];
    const itemB = window.selectedItems[1];
    const itemC = window.selectedItems[2];

    // Pokud všechny tři jsou body, vytvoř kružnici
    if (itemA.category === "point" && itemB.category === "point" && itemC.category === "point") {
      setTimeout(() => {
        if (window.createCircumcircleFromSelectedPoints) {
          window.createCircumcircleFromSelectedPoints();
        }
      }, 100);
    }
  }
  if (window.draw) window.draw();
};

window.showToolCategory = function (category) {
  // ===== DEBOUNCE: Ochrana proti dvojímu volání =====
  const now = Date.now();
  if (now - lastCategoryChangeTime < CATEGORY_DEBOUNCE_MS) {
    return;
  }
  lastCategoryChangeTime = now;

  const menuId =
    "tools" + category.charAt(0).toUpperCase() + category.slice(1);
  const menuEl = document.getElementById(menuId);
  const btnId =
    "btnCat" + category.charAt(0).toUpperCase() + category.slice(1);
  const btnEl = document.getElementById(btnId);

  // Speciální handling pro AI - nevřít ho stejně jako ostatní panely
  if (category === "ai") {
    // Pokud je AI minimalizované, znovu ho otevři
    if (window.aiMinimized) {
      if (menuEl) {
        menuEl.classList.remove("d-none");
        menuEl.style.display = "flex";
      }
      if (btnEl) btnEl.classList.add("active");
      window.currentCategory = category;
      window.aiMinimized = false;
      if (window.toggleAiPanel) {
        window.toggleAiPanel(true);
      }
      setTimeout(() => {
        const input = document.getElementById("aiPrompt");
        if (input) input.focus();
      }, 200);
      return;
    }

    // Pro AI zkusíme toggle
    if (window.currentCategory === category && menuEl && menuEl.style.display !== "none") {
      // AI je otevřené, zavři ho
      if (menuEl) menuEl.style.display = "none";
      if (btnEl) btnEl.classList.remove("active");
      window.currentCategory = null;
      window.toggleAiPanel(false);
      return;
    }

    // Zavři všechny ostatní panely
    document.querySelectorAll(".tool-submenu").forEach((menu) => {
      if (menu.id !== "toolsAi") {
        menu.style.display = "none";
      }
    });

    document.querySelectorAll(".toolbar .tool-btn").forEach((btn) => {
      if (btn.id && btn.id.startsWith("btnCat")) {
        btn.classList.remove("active");
      }
    });

    // Otevři AI
    if (menuEl) {
      menuEl.classList.remove("d-none");
      menuEl.style.display = "flex";
      if (btnEl) btnEl.classList.add("active");
      window.currentCategory = category;
      if (window.toggleAiPanel) {
        window.toggleAiPanel(true);
      }

      setTimeout(() => {
        const input = document.getElementById("aiPrompt");
        if (input) {
          input.focus();
        }
      }, 200);
    }
    return;
  }

  // Normální handling pro ostatní panely
  if (window.currentCategory === category && menuEl && menuEl.style.display !== "none") {
    menuEl.style.display = "none";
    if (btnEl) btnEl.classList.remove("active");
    window.currentCategory = null;
    if (window.mode !== "pan" && window.mode !== "select") {
      window.setMode("pan");
    }
    return;
  }

  document.querySelectorAll(".tool-submenu").forEach((menu) => {
    menu.style.display = "none";
  });

  document.querySelectorAll(".toolbar .tool-btn").forEach((btn) => {
    if (btn.id && btn.id.startsWith("btnCat")) {
      btn.classList.remove("active");
    }
  });

  if (window.mode !== "pan" && window.mode !== "select") {
    window.setMode("pan");
  }

  if (menuEl) {
    // Odstranit d-none třídu (má !important), pak nastavit display
    menuEl.classList.remove("d-none");
    menuEl.style.display = "flex";
    if (btnEl) btnEl.classList.add("active");
    window.currentCategory = category;
    // If a saved position exists for this panel, restore it so it doesn't jump
    try {
      const raw = localStorage.getItem(menuId + '_pos');
      if (raw) {
        const pos = JSON.parse(raw);
        if (pos && pos.left) {
          menuEl.style.position = 'fixed';
          menuEl.style.left = pos.left;
          if (pos.top) menuEl.style.top = pos.top;
          menuEl.style.right = 'auto';
          menuEl.style.zIndex = '2000';
        }
      }
    } catch (e) {}
  }
};

// Defensive fallback in case window.showToolCategory gets overwritten
if (typeof window.showToolCategory !== 'function') {
  window.showToolCategory = function (category) {
    const menuId = 'tools' + category.charAt(0).toUpperCase() + category.slice(1);
    const menuEl = document.getElementById(menuId);
    if (!menuEl) return;
    menuEl.style.display = menuEl.style.display === 'none' || !menuEl.style.display ? 'flex' : 'none';
  };
}

// ===== SETTINGS & PREFERENCES =====

window.openSettings = function () {
  const modal = document.getElementById("settingsModal");
  if (modal) {
    modal.style.display = "flex";
    if (window.renderKeyList) window.renderKeyList();
    if (window.updateKeyIndicator) window.updateKeyIndicator();
  }
};

window.closeSettings = function () {
  const modal = document.getElementById("settingsModal");
  if (modal) modal.style.display = "none";
};

// ===== MODEL MANAGER =====

window.openModelManager = function () {
  alert("Otevírám modal!");

  // Vytvořím modal dynamicky
  let modal = document.getElementById("modelManagerModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modelManagerModal";
    modal.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 999999;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 50px; border-radius: 10px; min-width: 500px;">
          <h1 style="color: black; margin: 0 0 20px 0;">🔧 Správa AI modelů</h1>
          <p style="color: black;">Zde bude obsah správy modelů</p>
          <button onclick="window.closeModelManager()" style="padding: 10px 30px; background: blue; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-top: 20px;">Zavřít</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = "block";
};

window.closeModelManager = function () {
  const modal = document.getElementById("modelManagerModal");
  if (modal) modal.style.display = "none";
};

// (DEV TEST FUNCTIONS REMOVED - see git history if needed)
// openAIPreferences & closeAIPreferences jsou v ai-ui.js

// ===== VIEW CONTROLS =====

window.togglePan = function () {
  if (window.mode === "pan") {
    window.mode = null;
    const btn = document.getElementById("btnPanCanvas");
    if (btn) btn.classList.remove("active");
    const info = document.getElementById("modeInfo");
    if (info) info.classList.remove("show");
  } else {
    window.setMode("pan");
  }
};

window.resetView = function () {
  if (!window.shapes || !window.points) return;

  if (window.shapes.length === 0 && window.points.length === 0) {
    if (window.zoom) window.zoom = 1;
    if (window.panX !== undefined) window.panX = window.canvas ? window.canvas.width / 2 : 0;
    if (window.panY !== undefined) window.panY = window.canvas ? -window.canvas.height / 2 : 0;
    if (window.draw) window.draw();
    return;
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  window.shapes.forEach((s) => {
    if (s.type === "line") {
      minX = Math.min(minX, s.x1, s.x2);
      maxX = Math.max(maxX, s.x1, s.x2);
      minY = Math.min(minY, s.y1, s.y2);
      maxY = Math.max(maxY, s.y1, s.y2);
    } else if (s.type === "circle") {
      minX = Math.min(minX, s.cx - s.r);
      maxX = Math.max(maxX, s.cx + s.r);
      minY = Math.min(minY, s.cy - s.r);
      maxY = Math.max(maxY, s.cy + s.r);
    }
  });

  window.points.forEach((p) => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });

  if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) return;

  const canvas = document.getElementById("canvas");
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  const margin = 1.1;
  const zoomX = (canvas.width / rangeX) * margin;
  const zoomY = (canvas.height / rangeY) * margin;

  if (window.zoom !== undefined) {
    window.zoom = Math.min(zoomX, zoomY, 100);
    window.zoom = Math.max(window.zoom, 0.1);
  }

  if (window.panX !== undefined) window.panX = canvas.width / 2 - centerX * (window.zoom || 2);
  if (window.panY !== undefined) window.panY = canvas.height / 2 + centerY * (window.zoom || 2);

  if (window.draw) window.draw();
};

window.centerToOrigin = function () {
  const canvas = document.getElementById("canvas");
  if (window.panX !== undefined) window.panX = canvas.width / 2;
  if (window.panY !== undefined) window.panY = canvas.height / 2;
  if (window.draw) window.draw();
};

window.clearMode = function () {
  // Zrušit aktuální mód
  window.mode = null;

  // Zrušit constraint mód
  window.constraintMode = null;
  window.constraintSelection = [];
  if (window.cancelConstraintValue) window.cancelConstraintValue();

  // Zrušit align mód
  window.alignStep = 0;
  window.alignRefPoint = null;
  window.alignTargetPoint = null;
  window.alignLine = null;
  window.alignAxis = null;

  // Zrušit startPt (pokud byl nějaký rozdělaný tvar)
  window.startPt = null;
  window.tempShape = null;
  window.selectedShape = null;
  window.drawing = false;

  // Odstranit active ze všech tlačítek (kromě kategorií)
  document.querySelectorAll(".tool-btn").forEach((b) => {
    if (!b.id.startsWith("btnCat")) b.classList.remove("active");
  });

  // Odstranit active z Posun tlačítka
  const btnPan = document.getElementById("btnPanCanvas");
  if (btnPan) btnPan.classList.remove("active");

  // Skrýt mode info
  const info = document.getElementById("modeInfo");
  if (info) info.classList.remove("show");

  // Překreslit canvas
  if (window.draw) window.draw();

  // Krátký vizuální feedback
  const snapInfo = document.getElementById("snapInfo");
  if (snapInfo) {
    snapInfo.textContent = "✕ Mód zrušen";
    snapInfo.style.display = "block";
    setTimeout(() => {
      try {
        if (!snapInfo.dataset.persistent) snapInfo.style.display = "none";
      } catch (e) {}
    }, 800);
  }
};

// ===== COORDINATE LABELS =====

window.updateCoordinateLabels = function() {
  // Aktualizovat popisky podle režimu
  const labels =
    window.axisMode === "lathe"
      ? { axis1: "Z", axis2: "X" }
      : { axis1: "X", axis2: "Y" };
  // Popisky se aktualizují v drawAxes
};

// ===== GRID SPACING =====

window.updateGridSpacing = function() {
  const gridSpacingInput = document.getElementById("gridSpacing");
  if (gridSpacingInput) {
    window.gridSize = parseFloat(gridSpacingInput.value) || 10;
    if (window.draw) window.draw();
  }
};

window.setGridSpacing = function(size) {
  window.gridSize = size;
  const gridSpacingInput = document.getElementById("gridSpacing");
  if (gridSpacingInput) gridSpacingInput.value = size;
  if (window.draw) window.draw();
};

// ===== TOGGLE SECTIONS =====

window.toggleSection = function(sectionId) {
  const section = document.getElementById(sectionId + "Section");
  const toggle = document.getElementById(sectionId + "Toggle");

  if (section && toggle) {
    if (section.style.display === "none") {
      section.style.display = "block";
      toggle.textContent = "▲";
    } else {
      section.style.display = "none";
      toggle.textContent = "▼";
    }
  }
};

// ===== CLEAR ALL =====

window.clearAll = function () {
  if (confirm("Vymazat vše?")) {
    if (window.shapes) window.shapes.length = 0;
    if (window.points) window.points.length = 0;
    if (window.selectedItems) window.selectedItems.length = 0;
    if (window.updateSnapPoints) window.updateSnapPoints();
    if (window.draw) window.draw();
  }
};

// ===== EXPORT & IMPORT =====

window.exportPNG = function () {
  const canvas = document.getElementById("canvas");
  const link = document.createElement("a");
  link.download = "soustruzeni_" + Date.now() + ".png";
  link.href = canvas.toDataURL();
  link.click();
};

window.saveProject = function () {
  const project = {
    version: "1.0",
    date: new Date().toISOString(),
    settings: {
      axisMode: window.axisMode,
      xMeasureMode: window.xMeasureMode,
      gridSize: window.gridSize,
      zoom: window.zoom,
      panX: window.panX,
      panY: window.panY,
    },
    shapes: window.shapes || [],
    points: window.points || [],
  };

  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "-");
  link.download = `projekt_${dateStr}_${timeStr}.json`;

  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

window.loadProject = function (input) {
  const file = input.files[0];
  if (!file) return;

  if (!file.name.endsWith(".json")) {
    alert("❌ Chyba: Můžeš načíst pouze .json soubory!");
    input.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const project = JSON.parse(e.target.result);

      if (!project.shapes || !Array.isArray(project.shapes)) {
        throw new Error("Neplatná struktura projektu");
      }

      if ((window.shapes && window.shapes.length > 0) ||
          (window.points && window.points.length > 0)) {
        const confirm_load = window.confirm(
          "⚠️ Načtením projektu přepíšeš aktuální kreslení.\n\nChceš pokračovat?"
        );
        if (!confirm_load) {
          input.value = "";
          return;
        }
      }

      if (window.shapes) {
        window.shapes.length = 0;
        window.shapes.push(...(project.shapes || []));
      }
      if (window.points) {
        window.points.length = 0;
        window.points.push(...(project.points || []));
      }

      if (project.settings) {
        if (project.settings.axisMode) window.axisMode = project.settings.axisMode;
        if (project.settings.xMeasureMode) window.xMeasureMode = project.settings.xMeasureMode;
        if (project.settings.gridSize !== undefined) window.gridSize = project.settings.gridSize;
        if (project.settings.zoom !== undefined) window.zoom = project.settings.zoom;
        if (project.settings.panX !== undefined) window.panX = project.settings.panX;
        if (project.settings.panY !== undefined) window.panY = project.settings.panY;
      }

      if (window.updateSnapPoints) window.updateSnapPoints();
      if (window.draw) window.draw();
    } catch (error) {
      alert("❌ Chyba při načítání projektu:\n\n" + error.message);
    }

    input.value = "";
  };

  reader.onerror = function () {
    alert("❌ Chyba při čtení souboru!");
    input.value = "";
  };

  reader.readAsText(file);
};

// ===== CLOSE MODALS ON OUTSIDE CLICK =====

document.addEventListener("DOMContentLoaded", function () {
  const modals = [
    "settingsModal",
    "aiPreferencesModal",
    "circleModal",
    "constraintModal",
    "quickInputModal",
    "controllerModal",
    "directionModal",
  ];

  modals.forEach((modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target.id === modalId) {
          modal.style.display = "none";
        }
      });
    }
  });

  // Inicializuj seznam klíčů a indikátor
  setTimeout(() => {
    if (window.renderKeyList) window.renderKeyList();
    if (window.updateKeyIndicator) window.updateKeyIndicator();
  }, 100);
});

// ===== EXPORT =====
window.showControllerModal = function () {
  const modal = document.getElementById("controllerModal");
  if (modal) modal.style.display = "flex";
};

window.closeControllerModal = function () {
  const modal = document.getElementById("controllerModal");
  if (modal) modal.style.display = "none";
};

// ===== CONTROLLER DIRECTION & LENGTH =====
window.showControllerDirectionModal = function () {
  window.directionTarget = "controller";
  const modal = document.getElementById("directionModal");
  if (modal) modal.style.display = "flex";
};

window.showControllerLengthModal = function () {
  window.lengthTarget = "controller";
  const modal = document.getElementById("lengthModal");
  if (modal) {
    modal.style.display = "flex";
    const input = document.getElementById("lengthInput");
    if (input) {
      input.value = "";
      setTimeout(() => input.focus(), 100);
    }
  }
};

// Update direction modal to handle both targets
const originalInsertDirection = window.insertDirection;
window.insertDirection = function (angle) {

  if (window.directionTarget === "controller") {
    // Vloží do controllerInput
    const input = document.getElementById("controllerInput");
    if (input) {
      input.value += "AP" + angle + " ";
    }
  } else {
    // Vloží do quickInputDisplay (originální chování)
    const display = document.getElementById("quickInputDisplay");
    if (display) {
      display.value += "AP" + angle + " ";
      display.scrollTop = display.scrollHeight;
    }
  }

  window.directionTarget = null;
  window.closeDirectionModal();
};

// Update length modal to handle both targets
const originalConfirmLength = window.confirmLength;
window.confirmLength = function () {
  const input = document.getElementById("lengthInput");
  if (!input) return;

  const value = input.value.trim();
  if (!value) {
    alert("Zadej prosím délku!");
    return;
  }

  const type = window.lengthType || "L";

  if (window.lengthTarget === "controller") {
    const controllerInput = document.getElementById("controllerInput");
    if (controllerInput) {
      controllerInput.value += type + value + " ";
    }
  } else {
    const display = document.getElementById("quickInputDisplay");
    if (display) {
      display.value += type + value + " ";
      display.scrollTop = display.scrollHeight;
    }
  }

  window.lengthTarget = null;
  window.closeLengthModal();
};

window.closeControllerModal = function () {
  const modal = document.getElementById("controllerModal");
  if (modal) modal.style.display = "none";
};

// Controller functions jsou v controller.js - zde necháme pouze modal show/close

// Přepínání sekcí v panelech
window.toggleCoordSection = function (sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const isHidden = section.style.display === "none";
  section.style.display = isHidden ? "block" : "none";

  const toggleSpan = document.getElementById(sectionId + "Toggle");
  if (toggleSpan) {
    toggleSpan.textContent = isHidden ? "▲" : "▼";
  }
};

// Souřadnice - Bod
window.setPointFromCursor = function () {
  const el = document.getElementById("quickPointZ");
  if (!el || !window.cursorX) return;

  document.getElementById("quickPointZ").value = (window.cursorY || 0).toFixed(2);
  document.getElementById("quickPointX").value = (window.cursorX || 0).toFixed(2);
};

window.quickAddPoint = function () {
  const z = parseFloat(document.getElementById("quickPointZ").value);
  const x = parseFloat(document.getElementById("quickPointX").value);

  if (isNaN(z) || isNaN(x)) {
    alert("Zadej prosím Z a X souřadnice");
    return;
  }

  // Přidej bod do window.points místo window.shapes (pro správné označování)
  if (!window.points) window.points = [];
  window.points.push({ x: z, y: x });
  if (window.updateSnapPoints) window.updateSnapPoints();
  window.saveState();
  window.draw();
  document.getElementById("quickPointZ").value = "";
  document.getElementById("quickPointX").value = "";
};

// Souřadnice - Čára
window.addLineByCoords = function () {
  const z1 = parseFloat(document.getElementById("lineZ1").value);
  const x1 = parseFloat(document.getElementById("lineX1").value);
  const z2 = parseFloat(document.getElementById("lineZ2").value);
  const x2 = parseFloat(document.getElementById("lineX2").value);

  if (isNaN(z1) || isNaN(x1) || isNaN(z2) || isNaN(x2)) {
    alert("Zadej prosím souřadnice obou bodů");
    return;
  }

  window.shapes.push({ type: "line", z1, x1, z2, x2, color: window.defaultDrawColor || "#4a9eff", lineStyle: window.defaultDrawLineStyle || "solid" });
  window.saveState();
  window.draw();
  document.getElementById("lineZ1").value = "";
  document.getElementById("lineX1").value = "";
  document.getElementById("lineZ2").value = "";
  document.getElementById("lineX2").value = "";
};

// Souřadnice - Kružnice
window.quickAddCircle = function () {
  const z = parseFloat(document.getElementById("quickCircleZ").value);
  const x = parseFloat(document.getElementById("quickCircleX").value);
  const r = parseFloat(document.getElementById("quickCircleR").value);

  if (isNaN(z) || isNaN(x) || isNaN(r)) {
    alert("Zadej prosím střed a poloměr");
    return;
  }

  window.shapes.push({ type: "circle", z, x, r, color: window.defaultDrawColor || "#4a9eff", lineStyle: window.defaultDrawLineStyle || "solid" });
  window.saveState();
  window.draw();
  document.getElementById("quickCircleZ").value = "";
  document.getElementById("quickCircleX").value = "";
  document.getElementById("quickCircleR").value = "";
};

// Ostatní - Export a Projekty
window.exportPNG = function () {
  const canvas = document.getElementById("canvas");
  if (!canvas) return;

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "kresba_" + new Date().getTime() + ".png";
  link.click();
};

window.saveProject = function () {
  const project = {
    shapes: window.shapes || [],
    settings: {
      gridSize: window.gridSize,
      axisMode: window.axisMode,
      xMeasureMode: window.xMeasureMode
    }
  };

  const json = JSON.stringify(project, null, 2);
  const link = document.createElement("a");
  link.href = "data:application/json;charset=utf-8," + encodeURIComponent(json);
  link.download = "projekt_" + new Date().getTime() + ".json";
  link.click();
};

window.loadProject = function (input) {
  if (!input.files || !input.files[0]) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const project = JSON.parse(e.target.result);
      window.shapes = project.shapes || [];
      if (project.settings) {
        window.gridSize = project.settings.gridSize || window.gridSize;
        window.axisMode = project.settings.axisMode || window.axisMode;
        window.xMeasureMode = project.settings.xMeasureMode || window.xMeasureMode;
      }
      window.saveState();
      window.draw();
    } catch (err) {
      alert("Chyba při načítání projektu: " + err.message);
    }
  };
  reader.readAsText(input.files[0]);
};

// Stubní funkce - Snap
// Přichycení čar na polární úhly
window.updateSnap = function (start, end) {
  // start, end: {x, y} body čáry
  const step = parseInt(document.getElementById("polarSnapStep")?.value || "90");
  const tolerance = 3; // stupně
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  // Normalizace úhlu do [0,360)
  let normAngle = ((angle % 360) + 360) % 360;
  // Povolené úhly
  let allowed = [];
  for (let a = 0; a < 360; a += step) allowed.push(a);
  // Najdi nejbližší povolený úhel
  let snapAngle = allowed.find(a => Math.abs(normAngle - a) <= tolerance || Math.abs(normAngle - a + 360) <= tolerance);
  if (snapAngle !== undefined) {
    // Přichycení aktivní – změň barvu na žlutou
    return { snapped: true, color: "#facc15", angle: snapAngle };
  }
  // Jinak běžná barva
  return { snapped: false, color: window.defaultDrawColor || "#4a9eff", angle: normAngle };
};

// Stubní funkce pro transformace
window.showColorPicker = function () {
  // Resetovat výběr
  window.colorStyleSelected = {
    color: null,
    lineStyle: null,
  };

  // Pokud něco vybrané je, použít to
  if (window.selectedItems && window.selectedItems.length > 0) {
    const modal = document.getElementById("colorStyleModal");
    if (modal) {
      modal.style.display = "flex";
    }
    return;
  }

  // Pokud nic není vybrané, otevřít modal pro nastavení barev a stylu
  // Ale nejdřív bez výběru - prosí o výběr v confirmColorStyle
  window.colorPickerMode = "waitingForColor"; // Speciální režim
  const modal = document.getElementById("colorStyleModal");
  if (modal) {
    modal.style.display = "flex";
  }
};

window.closeColorStyleModal = function () {
  const modal = document.getElementById("colorStyleModal");
  if (modal) {
    modal.style.display = "none";
  }

  // Resetovat výběr UI
  document.querySelectorAll("#colorStyleModal button.selected").forEach((btn) => {
    btn.classList.remove("selected");
    if (btn.id.startsWith("colorBtn_")) {
      btn.style.borderWidth = "2px";
    } else {
      btn.style.borderWidth = "1px";
    }
  });

  // Zrušit výběr objektů aby se viděly změny
  if (window.selectedItems) {
    window.selectedItems = [];
  }
  if (window.draw) window.draw();
};

window.selectColor = function (color, btn) {
  // Odebrat selected třídu z ostatních barev
  document.querySelectorAll("#colorStyleModal [id^='colorBtn_']").forEach((btn) => {
    btn.classList.remove("selected");
    btn.style.borderWidth = "2px";
  });

  // Přidat selected třídu na aktuální
  btn.classList.add("selected");
  btn.style.borderWidth = "4px";

  window.colorStyleSelected = window.colorStyleSelected || {};
  window.colorStyleSelected.color = color;
};

window.selectLineStyle = function (style, btn) {
  // Odebrat selected třídu z ostatních stylů
  document.querySelectorAll("#colorStyleModal [id^='styleBtn_']").forEach((btn) => {
    btn.classList.remove("selected");
    btn.style.borderWidth = "1px";
    btn.style.background = "#2a3a4a";
    btn.style.color = "#aaa";
  });

  // Přidat selected třídu na aktuální
  btn.classList.add("selected");
  btn.style.borderWidth = "2px";
  btn.style.background = "#3a7bc8";
  btn.style.color = "#fff";

  window.colorStyleSelected = window.colorStyleSelected || {};
  window.colorStyleSelected.lineStyle = style;
};

window.confirmColorStyle = function () {
  // Pokud čekáme na výběr barvy (bez vybraných objektů), přejít do režimu výběru
  if (
    window.colorPickerMode === "waitingForColor" &&
    (!window.selectedItems || window.selectedItems.length === 0)
  ) {
    if (
      !window.colorStyleSelected.color &&
      !window.colorStyleSelected.lineStyle
    ) {
      alert("⚠️ Vyberte barvu nebo styl čáry!");
      return;
    }

    // Nastavit režim výběru PŘED zavřením modalu
    window.colorPickerMode = true;
    window.mode = "colorPicker";

    // Zavřít modal ručně aby se neměnily stavové proměnné
    const modal = document.getElementById("colorStyleModal");
    if (modal) {
      modal.style.display = "none";
    }

    // Resetovat vizuální stav tlačítek
    document.querySelectorAll("#colorStyleModal button.selected").forEach((btn) => {
      btn.classList.remove("selected");
      if (btn.id.startsWith("colorBtn_")) {
        btn.style.borderWidth = "2px";
      } else {
        btn.style.borderWidth = "1px";
      }
    });

    // Zavolat draw ale bez resetování selectedItems na tomto místě
    if (window.draw) window.draw();

    window.showInfoNotification("Vyberte čáru k úpravě", 1000);
    return;
  }

  // Standardní režim - aplikovat na vybrané objekty
  if (!window.selectedItems || window.selectedItems.length === 0) {
    alert("❌ Žádné objekty nejsou vybrány!");
    return;
  }

  if (
    !window.colorStyleSelected.color &&
    !window.colorStyleSelected.lineStyle
  ) {
    alert("⚠️ Vyberte barvu nebo styl čáry!");
    return;
  }

  if (window.saveState) window.saveState();

  // Aplikovat změny
  for (let item of window.selectedItems) {
    if (item && item.ref) {
      if (window.colorStyleSelected.color) {
        item.ref.color = window.colorStyleSelected.color;
      }
      if (window.colorStyleSelected.lineStyle) {
        item.ref.lineStyle = window.colorStyleSelected.lineStyle;
      }
    }
  }

  // Zavřít modal a zrušit výběr
  window.closeColorStyleModal();
};

window.setObjectColor = function (color) {
  if (!window.selectedItems || window.selectedItems.length === 0) {
    return;
  }

  if (window.saveState) window.saveState();

  for (let item of window.selectedItems) {
    if (item && item.ref) {
      // Pokud jde o syntetickou hranu obdélníku, nejprve rozštěpni rectangle (jednou)
      if (item.ref.parentRect) {
        const rect = item.ref.parentRect;
        // split once per rectangle
        if (!window.__splitCache) window.__splitCache = new Map();
        let lines = window.__splitCache.get(rect);
        if (!lines) {
          lines = window.splitRectangle(rect) || [];
          window.__splitCache.set(rect, lines);
        }

        // Najdi index edge (top/right/bottom/left)
        const edgeIndex = { top: 0, right: 1, bottom: 2, left: 3 }[item.ref.parentEdge];
        if (lines && lines[edgeIndex]) {
          item.ref = lines[edgeIndex];
        }
      }

      item.ref.color = color;
    }
  }

  if (window.draw) window.draw();
};

window.setLineStyle = function (style) {
  if (!window.selectedItems || window.selectedItems.length === 0) {
    return;
  }

  if (window.saveState) window.saveState();

  for (let item of window.selectedItems) {
    if (item && item.ref) {
      if (item.ref.parentRect) {
        const rect = item.ref.parentRect;
        if (!window.__splitCache) window.__splitCache = new Map();
        let lines = window.__splitCache.get(rect);
        if (!lines) {
          lines = window.splitRectangle(rect) || [];
          window.__splitCache.set(rect, lines);
        }

        const edgeIndex = { top: 0, right: 1, bottom: 2, left: 3 }[item.ref.parentEdge];
        if (lines && lines[edgeIndex]) {
          item.ref = lines[edgeIndex];
        }
      }

      item.ref.lineStyle = style;
    }
  }

  if (window.draw) window.draw();
};

window.booleanUnion = function () {
  if (!window.selectedItems || window.selectedItems.length < 2) {
    alert("❌ Vyberte minimálně 2 objekty pro sjednocení!");
    return;
  }

  const selected = window.selectedItems.filter((item) => item.ref);
  if (selected.length < 2) {
    alert("❌ Vybrané objekty nejsou validní!");
    return;
  }

  if (window.saveState) window.saveState();

  window.shapes = window.shapes.filter(
    (s) => !selected.some((item) => item.ref === s)
  );

  window.shapes.push({
    type: "union",
    color: "#4fc3f7",
    timestamp: Date.now(),
    data: selected.map((item) => item.ref),
  });

  window.selectedItems = [];
  if (window.updateSnapPoints) window.updateSnapPoints();
  if (window.draw) window.draw();
};

window.booleanIntersect = function () {
  if (!window.selectedItems || window.selectedItems.length < 2) {
    alert("❌ Vyberte minimálně 2 objekty pro průnik!");
    return;
  }

  const selected = window.selectedItems.filter((item) => item.ref);
  if (selected.length < 2) {
    alert("❌ Vybrané objekty nejsou validní!");
    return;
  }

  if (window.saveState) window.saveState();

  window.shapes = window.shapes.filter(
    (s) => !selected.some((item) => item.ref === s)
  );

  window.shapes.push({
    type: "intersection",
    color: "#81c784",
    timestamp: Date.now(),
    data: selected.map((item) => item.ref),
  });

  window.selectedItems = [];
  if (window.updateSnapPoints) window.updateSnapPoints();
  if (window.draw) window.draw();
};

window.booleanDifference = function () {
  if (!window.selectedItems || window.selectedItems.length < 2) {
    alert("❌ Vyberte minimálně 2 objekty pro rozdíl!");
    return;
  }

  const selected = window.selectedItems.filter((item) => item.ref);
  if (selected.length < 2) {
    alert("❌ Vybrané objekty nejsou validní!");
    return;
  }

  if (window.saveState) window.saveState();

  const baseShape = selected[0].ref;

  window.shapes = window.shapes.filter(
    (s) => !selected.some((item) => item.ref === s)
  );

  window.shapes.push({
    type: "difference",
    ...baseShape,
    color: "#ff9800",
    timestamp: Date.now(),
    subtractData: selected.slice(1).map((item) => item.ref),
  });

  window.selectedItems = [];
  if (window.updateSnapPoints) window.updateSnapPoints();
  if (window.draw) window.draw();
};

// ===== COORDINATE SETUP FUNCTIONS =====
window.toggleCoordSection = function (sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    const isHidden = section.style.display === "none";
    section.style.display = isHidden ? "block" : "none";
  }
};

window.setPointFromCursor = function () {
  // Vezmi aktuální pozici myši (uloženou jako snapPoint) a nastav ji jako bod
  if (window.snapPoint) {
    const xInput = document.getElementById("coordPointX");
    const yInput = document.getElementById("coordPointY");
    if (xInput) xInput.value = window.snapPoint.x.toFixed(window.displayDecimals || 2);
    if (yInput) yInput.value = window.snapPoint.y.toFixed(window.displayDecimals || 2);
  } else if (typeof window.showToast === "function") {
    window.showToast("Nejprve najeď kurzorem na canvas", 2000);
  }
};

window.quickAddPoint = function () {
  const xInput = document.getElementById("coordPointX");
  const yInput = document.getElementById("coordPointY");
  if (xInput && yInput) {
    const x = parseFloat(xInput.value) || 0;
    const y = parseFloat(yInput.value) || 0;
    if (!window.points) window.points = [];
    window.points.push({ x, y });
    window.saveState();
    window.draw();
  }
};

window.setLineStart = function () {
  // Vezmi aktuální pozici myši pro počátek čáry
  if (window.snapPoint) {
    const x1Input = document.getElementById("coordLineX1");
    const y1Input = document.getElementById("coordLineY1");
    if (x1Input) x1Input.value = window.snapPoint.x.toFixed(window.displayDecimals || 2);
    if (y1Input) y1Input.value = window.snapPoint.y.toFixed(window.displayDecimals || 2);
  } else if (typeof window.showToast === "function") {
    window.showToast("Nejprve najeď kurzorem na canvas", 2000);
  }
};

window.setLineEnd = function () {
  // Vezmi aktuální pozici myši pro konec čáry
  if (window.snapPoint) {
    const x2Input = document.getElementById("coordLineX2");
    const y2Input = document.getElementById("coordLineY2");
    if (x2Input) x2Input.value = window.snapPoint.x.toFixed(window.displayDecimals || 2);
    if (y2Input) y2Input.value = window.snapPoint.y.toFixed(window.displayDecimals || 2);
  } else if (typeof window.showToast === "function") {
    window.showToast("Nejprve najeď kurzorem na canvas", 2000);
  }
};

window.addLineByCoords = function () {
  const x1 = parseFloat(document.getElementById("coordLineX1")?.value) || 0;
  const y1 = parseFloat(document.getElementById("coordLineY1")?.value) || 0;
  const x2 = parseFloat(document.getElementById("coordLineX2")?.value) || 0;
  const y2 = parseFloat(document.getElementById("coordLineY2")?.value) || 0;
  if (!window.shapes) window.shapes = [];
  window.shapes.push({ type: "line", x1, y1, x2, y2, color: window.defaultDrawColor || "#4a9eff", lineStyle: window.defaultDrawLineStyle || "solid" });
  window.saveState();
  window.draw();
};

window.setCircleCenter = function () {
  // Vezmi aktuální pozici myši pro střed kružnice
  if (window.snapPoint) {
    const cxInput = document.getElementById("coordCircleCX");
    const cyInput = document.getElementById("coordCircleCY");
    if (cxInput) cxInput.value = window.snapPoint.x.toFixed(window.displayDecimals || 2);
    if (cyInput) cyInput.value = window.snapPoint.y.toFixed(window.displayDecimals || 2);
  } else if (typeof window.showToast === "function") {
    window.showToast("Nejprve najeď kurzorem na canvas", 2000);
  }
};

window.quickAddCircle = function () {
  const cx = parseFloat(document.getElementById("coordCircleCX")?.value) || 0;
  const cy = parseFloat(document.getElementById("coordCircleCY")?.value) || 0;
  const r = parseFloat(document.getElementById("coordCircleR")?.value) || 1;
  if (!window.shapes) window.shapes = [];
  window.shapes.push({ type: "circle", cx, cy, r, color: window.defaultDrawColor || "#4a9eff", lineStyle: window.defaultDrawLineStyle || "solid" });
  window.saveState();
  window.draw();
};

window.addLinePolar = function () {
  // Přidá čáru pomocí polárních souřadnic (délka a úhel)
  const lengthInput = document.getElementById("coordPolarLength");
  const angleInput = document.getElementById("coordPolarAngle");
  const startXInput = document.getElementById("coordPolarStartX");
  const startYInput = document.getElementById("coordPolarStartY");

  const length = parseFloat(lengthInput?.value) || 0;
  const angleDeg = parseFloat(angleInput?.value) || 0;
  const startX = parseFloat(startXInput?.value) || 0;
  const startY = parseFloat(startYInput?.value) || 0;

  if (length <= 0) {
    if (typeof window.showToast === "function") window.showToast("Délka musí být kladná", 2000);
    return;
  }

  const angleRad = (angleDeg * Math.PI) / 180;
  const endX = startX + length * Math.cos(angleRad);
  const endY = startY + length * Math.sin(angleRad);

  if (!window.shapes) window.shapes = [];
  window.shapes.push({
    type: "line",
    x1: startX,
    y1: startY,
    x2: endX,
    y2: endY,
    color: window.defaultDrawColor || "#4a9eff",
    lineStyle: window.defaultDrawLineStyle || "solid"
  });
  window.saveState();
  window.draw();
};

window.addPointPolar = function () {
  // Přidá bod pomocí polárních souřadnic (vzdálenost a úhel od počátku)
  const distInput = document.getElementById("coordPolarPointDist");
  const angleInput = document.getElementById("coordPolarPointAngle");
  const originXInput = document.getElementById("coordPolarOriginX");
  const originYInput = document.getElementById("coordPolarOriginY");

  const dist = parseFloat(distInput?.value) || 0;
  const angleDeg = parseFloat(angleInput?.value) || 0;
  const originX = parseFloat(originXInput?.value) || 0;
  const originY = parseFloat(originYInput?.value) || 0;

  const angleRad = (angleDeg * Math.PI) / 180;
  const x = originX + dist * Math.cos(angleRad);
  const y = originY + dist * Math.sin(angleRad);

  if (!window.points) window.points = [];
  window.points.push({ x, y });
  window.saveState();
  window.draw();
};

// ===== CONSTRAINT FUNCTIONS =====
window.showConstraintModal = function () {
  const modal = document.getElementById("constraintModal");
  if (modal) {
    modal.style.display = "flex";
  }
};

window.closeConstraintModal = function () {
  const modal = document.getElementById("constraintModal");
  if (modal) {
    modal.style.display = "none";
  }
};

window.applyConstraint = function (type) {
  if (!window.selectedItems || window.selectedItems.length === 0) {
    alert("❌ Vyberte objekty pro aplikaci fixace!");
    return;
  }

  const selected = window.selectedItems.filter((item) => item.ref);
  if (selected.length === 0) return;

  if (window.saveState) window.saveState();

  for (let item of selected) {
    if (!item.ref.constraints) {
      item.ref.constraints = [];
    }
    item.ref.constraints.push({
      type: type,
      timestamp: Date.now(),
    });
  }

  alert(`✅ Fixace typu "${type}" aplikována na ${selected.length} objektů!`);
  window.closeConstraintModal();
  if (window.draw) window.draw();
};

window.removeConstraint = function (which) {
  if (!window.selectedItems || window.selectedItems.length === 0) {
    return;
  }

  if (window.saveState) window.saveState();

  for (let item of window.selectedItems) {
    if (item && item.ref && item.ref.constraints) {
      item.ref.constraints = item.ref.constraints.filter(
        (c) => c.type !== which
      );
    }
  }

  if (window.draw) window.draw();
};

window.cancelConstraintValue = function () {
  window.closeConstraintModal();
};

window.confirmConstraintPoint = function () {
  // Potvrdí constraint pro fixaci bodu na pozici
  const xInput = document.getElementById("constraintPointX");
  const yInput = document.getElementById("constraintPointY");
  const x = parseFloat(xInput?.value);
  const y = parseFloat(yInput?.value);

  if (isNaN(x) || isNaN(y)) {
    if (typeof window.showToast === "function") window.showToast("Zadej platné souřadnice", 2000);
    return;
  }

  if (!window.constraints) window.constraints = [];
  window.constraints.push({ type: "point", x, y });
  window.closeConstraintModal();
  if (window.draw) window.draw();
};

window.confirmConstraintDistance = function () {
  // Potvrdí constraint pro vzdálenost mezi dvěma body
  const distInput = document.getElementById("constraintDistance");
  const dist = parseFloat(distInput?.value);

  if (isNaN(dist) || dist < 0) {
    if (typeof window.showToast === "function") window.showToast("Zadej platnou vzdálenost", 2000);
    return;
  }

  if (!window.constraints) window.constraints = [];
  window.constraints.push({ type: "distance", value: dist });
  window.closeConstraintModal();
  if (window.draw) window.draw();
};

window.confirmConstraintRadius = function () {
  // Potvrdí constraint pro poloměr kružnice
  const radiusInput = document.getElementById("constraintRadius");
  const radius = parseFloat(radiusInput?.value);

  if (isNaN(radius) || radius <= 0) {
    if (typeof window.showToast === "function") window.showToast("Zadej platný poloměr", 2000);
    return;
  }

  if (!window.constraints) window.constraints = [];
  window.constraints.push({ type: "radius", value: radius });
  window.closeConstraintModal();
  if (window.draw) window.draw();
};

window.confirmConstraintPolarAngle = function () {
  // Potvrdí constraint pro polární úhel
  const angleInput = document.getElementById("constraintPolarAngle");
  const angle = parseFloat(angleInput?.value);

  if (isNaN(angle)) {
    if (typeof window.showToast === "function") window.showToast("Zadej platný úhel", 2000);
    return;
  }

  if (!window.constraints) window.constraints = [];
  window.constraints.push({ type: "polarAngle", value: angle });
  window.closeConstraintModal();
  if (window.draw) window.draw();
};

// ===== CIRCLE MODAL =====
window.closeCircleModal = function () {
  const modal = document.getElementById("circleModal");
  if (modal) modal.style.display = "none";
};

window.confirmCircle = function () {
  // Vytvoří kružnici z hodnot v circle modalu
  const cxInput = document.getElementById("circleModalCX");
  const cyInput = document.getElementById("circleModalCY");
  const rInput = document.getElementById("circleModalR");

  const cx = parseFloat(cxInput?.value) || 0;
  const cy = parseFloat(cyInput?.value) || 0;
  const r = parseFloat(rInput?.value) || 1;

  if (r <= 0) {
    if (typeof window.showToast === "function") window.showToast("Poloměr musí být kladný", 2000);
    return;
  }

  if (!window.shapes) window.shapes = [];
  window.shapes.push({
    type: "circle",
    cx,
    cy,
    r,
    color: window.defaultDrawColor || "#4a9eff",
    lineStyle: window.defaultDrawLineStyle || "solid"
  });

  window.closeCircleModal();
  window.saveState();
  window.draw();
};

// ===== MAKE MODALS DRAGGABLE =====
window.makeModalDraggable = function (modalId) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;

  const modal = overlay.querySelector('.modal-window');
  if (!modal) return;

  // Find header: prefer the element that contains an h2
  let header = modal.querySelector('div');
  const h2 = modal.querySelector('h2');
  if (h2 && h2.parentElement) header = h2.parentElement;
  if (!header) header = modal;

  header.style.cursor = 'move';
  header.style.userSelect = 'none';

  let dragging = false;
  let startX = 0, startY = 0, origLeft = 0, origTop = 0;
  let pointerOffsetX = 0, pointerOffsetY = 0;

  // add small grip visual if none
  if (!modal.querySelector('.modal-grip')) {
    const grip = document.createElement('div');
    grip.className = 'modal-grip';
    grip.style.cssText = 'width:18px;height:18px;border-radius:4px;background:transparent;display:inline-block;margin-right:8px;vertical-align:middle;position:relative;';
    grip.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke="#888" stroke-width="1.2"><circle cx="5" cy="5" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="19" cy="5" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></g></svg>';
    if (header.firstChild) header.insertBefore(grip, header.firstChild);
  }

  const startDrag = (clientX, clientY) => {
    const rect = modal.getBoundingClientRect();
    dragging = true;
    pointerOffsetX = clientX - rect.left;
    pointerOffsetY = clientY - rect.top;
    origLeft = modal.style.left ? parseInt(modal.style.left,10) || rect.left : rect.left;
    origTop = modal.style.top ? parseInt(modal.style.top,10) || rect.top : rect.top;

    overlay.style.alignItems = 'flex-start';
    overlay.style.justifyContent = 'flex-start';
    modal.style.position = 'fixed';
    modal.style.left = origLeft + 'px';
    modal.style.top = origTop + 'px';
    modal.style.right = 'auto';
    document.body.style.userSelect = 'none';
  };

  const doDrag = (clientX, clientY) => {
    if (!dragging) return;
    modal.style.left = (clientX - pointerOffsetX) + 'px';
    modal.style.top = (clientY - pointerOffsetY) + 'px';
  };

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = '';
    try {
      const saved = { left: modal.style.left, top: modal.style.top };
      localStorage.setItem(modalId + '_pos', JSON.stringify(saved));
    } catch (e) {}
  };

  header.addEventListener('mousedown', (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
  const gripEl = modal.querySelector('.modal-grip');
  if (gripEl) gripEl.addEventListener('mousedown', (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
  document.addEventListener('mousemove', (e) => { doDrag(e.clientX, e.clientY); });
  document.addEventListener('mouseup', endDrag);

  header.addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) { e.preventDefault(); startDrag(t.clientX, t.clientY); } }, { passive: false });
  document.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) { e.preventDefault(); doDrag(t.clientX, t.clientY); } }, { passive: false });
  document.addEventListener('touchend', endDrag);

  // Restore saved pos
  try {
    const raw = localStorage.getItem(modalId + '_pos');
    if (raw) {
      const pos = JSON.parse(raw);
      if (pos && pos.left) {
        overlay.style.alignItems = 'flex-start';
        overlay.style.justifyContent = 'flex-start';
        modal.style.position = 'fixed';
        modal.style.left = pos.left;
        modal.style.top = pos.top;
        modal.style.right = 'auto';
      }
    }
  } catch (e) {}
};

document.addEventListener('DOMContentLoaded', () => {
  ['quickInputModal','quickInputHelpModal','controllerModal','controllerHelpModal','directionModal'].forEach(id => {
    try { window.makeModalDraggable(id); } catch (e) {}
  });
  // Make toolsDrawing draggable via its panel-grip
  try { window.makeElementDraggable && window.makeElementDraggable('toolsDrawing', '.panel-grip'); } catch(e) {}
  // Prevent canvas control buttons from letting clicks fall through to underlying elements
  try {
    const canvasBtns = document.querySelectorAll('.canvas-controls .canvas-btn');
    canvasBtns.forEach((b) => {
      b.addEventListener('click', (ev) => { ev.stopPropagation(); });
    });
  } catch (e) {}
});

// Generic element draggable by handle selector
window.makeElementDraggable = function(elementId, handleSelector) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const handle = el.querySelector(handleSelector) || el;

  // Detekce mobilního zařízení
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

  // Na mobilních zařízeních zakázat dragging
  if (isMobile) {
    handle.style.cursor = 'default';
    // Skrýt grip na mobilech
    if (handle.classList.contains('panel-grip') || handle.matches('.panel-grip')) {
      handle.style.display = 'none';
    }
    return; // Vypnout dragging na mobilech
  }

  handle.style.cursor = 'move';

  let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
  let pointerOffsetX = 0, pointerOffsetY = 0;

  const start = (x,y) => {
    const rect = el.getBoundingClientRect();
    dragging = true;
    startX = x; startY = y;
    // compute pointer offset so element follows cursor precisely
    pointerOffsetX = x - rect.left;
    pointerOffsetY = y - rect.top;
    origLeft = el.style.left ? parseInt(el.style.left,10) || rect.left : rect.left;
    origTop = el.style.top ? parseInt(el.style.top,10) || rect.top : rect.top;
    el.style.position = 'fixed';
    // convert to viewport coords
    el.style.left = origLeft + 'px';
    el.style.top = origTop + 'px';
    el.style.zIndex = '2000';
    el.style.right = 'auto';
    document.body.style.userSelect = 'none';
  };
  const move = (x,y) => { if (!dragging) return; el.style.left = (x - pointerOffsetX) + 'px'; el.style.top = (y - pointerOffsetY) + 'px'; };
  const end = () => { if (!dragging) return; dragging = false; document.body.style.userSelect = ''; };

  handle.addEventListener('mousedown', (e) => { e.preventDefault(); start(e.clientX, e.clientY); });
  document.addEventListener('mousemove', (e)=> move(e.clientX, e.clientY));
  document.addEventListener('mouseup', () => { end(); try { localStorage.setItem(elementId + '_pos', JSON.stringify({ left: el.style.left, top: el.style.top })); } catch(e){} });
  handle.addEventListener('touchstart', (e)=> { const t=e.touches[0]; if(t){ e.preventDefault(); start(t.clientX,t.clientY);} }, {passive:false});
  document.addEventListener('touchmove', (e)=> { const t=e.touches[0]; if(t){ e.preventDefault(); move(t.clientX,t.clientY);} }, {passive:false});
  document.addEventListener('touchend', () => { end(); try { localStorage.setItem(elementId + '_pos', JSON.stringify({ left: el.style.left, top: el.style.top })); } catch(e){} });
  // Restore saved pos if available
  try {
    const raw = localStorage.getItem(elementId + '_pos');
    if (raw) {
      const pos = JSON.parse(raw);
        if (pos && pos.left) {
        el.style.position = 'fixed';
        el.style.left = pos.left;
        el.style.top = pos.top || el.style.top;
        el.style.right = 'auto';
        el.style.zIndex = '2000';
      }
    }
  } catch (e) {}
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    setMode,
    showToolCategory,
    openSettings,
    closeSettings,
  };
}
// ═══════════════════════════════════════════════════════════════════════════════
// SMART AI SETTINGS - Funkce pro ovládání AI Module v3.0
// ═══════════════════════════════════════════════════════════════════════════════

// State pro Smart AI Settings
window.smartAIState = {
  currentProvider: 'gemini',
  autoSwitch: true,
  selectedModel: null,
  apiKeysExpanded: false
};

// Provider ikony a limity
const SMART_AI_PROVIDERS = {
  gemini: { icon: '🤖', name: 'Gemini', rpm: 15 },
  groq: { icon: '⚡', name: 'Groq', rpm: 30 },
  openrouter: { icon: '🌐', name: 'OpenRouter', rpm: 20 },
  mistral: { icon: '🔥', name: 'Mistral', rpm: 10 }
};

// Otevře Smart AI Settings modal
window.openSmartAISettings = function() {
  const modal = document.getElementById('smartAISettingsModal');
  if (!modal) return;

  modal.style.display = 'flex';
  modal.classList.remove('d-none');

  // Auto-load demo klíčů pokud nejsou vlastní
  window.autoLoadDemoKeys();

  // Inicializuj UI
  window.updateSmartBestModels();
  window.updateSmartModelSelect();
  window.updateSmartRpmMonitor();
  window.updateSmartKeyStatuses();
  window.updateSmartUsageStats();
  window.loadSmartKeys();
  window.updateCurrentProviderLabel();
};

// Update current provider label
window.updateCurrentProviderLabel = function() {
  const label = document.getElementById('smartCurrentProviderLabel');
  if (label) {
    const provider = window.smartAIState.currentProvider;
    const info = SMART_AI_PROVIDERS[provider];
    label.textContent = info ? info.name : provider;
  }
};

// Zavře Smart AI Settings modal
window.closeSmartAISettings = function() {
  const modal = document.getElementById('smartAISettingsModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.add('d-none');
  }
};

// Přepne providera
window.switchSmartProvider = function(provider) {
  window.smartAIState.currentProvider = provider;

  // Update tabs
  document.querySelectorAll('.smart-ai-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.provider === provider);
  });

  // Update provider label
  window.updateCurrentProviderLabel();

  // Update model select
  window.updateSmartModelSelect();

  // Sync s AI modulem
  if (typeof AI !== 'undefined') {
    AI.setDefaultProvider(provider);
  }
};

// Update best models grid
window.updateSmartBestModels = function() {
  const grid = document.getElementById('smartBestModelsGrid');
  if (!grid || typeof AI === 'undefined') return;

  // Získej nejlepší modely z AI modulu
  const bestModels = AI.getBestModels ? AI.getBestModels(6) : AI.getAllModelsSorted().slice(0, 6);

  grid.innerHTML = bestModels.map((m, i) => {
    const remaining = AI.rateLimit?.remaining(m.provider, m.model) || m.rpm;
    const rpm = m.rpm || 15;
    const fillPercent = Math.round((remaining / rpm) * 100);
    const rankClass = i === 0 ? '' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const isSelected = window.smartAIState.selectedModel === `${m.provider}:${m.model}`;
    const hasKey = AI.getKey(m.provider);
    const providerInfo = SMART_AI_PROVIDERS[m.provider] || { icon: '🤖', name: m.provider };

    return `
      <div class="smart-ai-model-card ${isSelected ? 'selected' : ''} ${!hasKey ? 'unavailable' : ''}"
           onclick="window.selectSmartModel('${m.provider}', '${m.model}')"
           title="${!hasKey ? 'Chybí API klíč pro ' + m.provider : 'Klikni pro výběr'}">
        ${i < 3 ? `<div class="smart-ai-model-rank ${rankClass}">#${i + 1}</div>` : ''}
        <div class="smart-ai-model-icon">${providerInfo.icon}</div>
        <div class="smart-ai-model-name">${m.name?.split(' - ')[1] || m.model?.split('/').pop() || m.model}</div>
        <div class="smart-ai-model-quality">Kvalita: ${m.quality}%</div>
        <div class="smart-ai-model-rpm-bar">
          <div class="smart-ai-model-rpm-fill" style="width: ${fillPercent}%"></div>
        </div>
      </div>
    `;
  }).join('');
};

// Vyber model
window.selectSmartModel = function(provider, model) {
  window.smartAIState.selectedModel = `${provider}:${model}`;
  window.smartAIState.currentProvider = provider;

  // Update UI
  window.updateSmartBestModels();

  // Update tabs
  document.querySelectorAll('.smart-ai-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.provider === provider);
  });

  // Update model select
  const select = document.getElementById('smartModelSelect');
  if (select) select.value = model;

  window.updateSmartModelInfo(model);

  // Sync s AI modulem
  if (typeof AI !== 'undefined') {
    AI.setDefaultProvider(provider);
    AI.setModel(provider, model);
  }

  console.log(`🎯 Smart AI: Vybrán ${provider}/${model}`);
};

// Update model select dropdown
window.updateSmartModelSelect = function() {
  const select = document.getElementById('smartModelSelect');
  if (!select || typeof AI === 'undefined') return;

  const provider = window.smartAIState.currentProvider;
  const models = AI.ALL_MODELS[provider] || [];

  select.innerHTML = models.map(m => {
    const name = m.name || m.value;
    return `<option value="${m.value}">${name} (${m.rpm} RPM)</option>`;
  }).join('');

  // Select první nebo aktuálně vybraný
  if (models.length > 0) {
    const currentModel = AI.config?.models[provider] || models[0].value;
    select.value = currentModel;
    window.updateSmartModelInfo(currentModel);
  }
};

// On model change
window.onSmartModelChange = function() {
  const select = document.getElementById('smartModelSelect');
  if (!select) return;

  const model = select.value;
  const provider = window.smartAIState.currentProvider;

  window.smartAIState.selectedModel = `${provider}:${model}`;
  window.updateSmartModelInfo(model);
  window.updateSmartBestModels();

  // Sync s AI modulem
  if (typeof AI !== 'undefined') {
    AI.setModel(provider, model);
  }
};

// Update model info
window.updateSmartModelInfo = function(model) {
  const infoEl = document.getElementById('smartModelInfo');
  if (!infoEl || typeof AI === 'undefined') return;

  const provider = window.smartAIState.currentProvider;
  const models = AI.ALL_MODELS[provider] || [];
  const modelInfo = models.find(m => m.value === model);

  if (modelInfo) {
    infoEl.innerHTML = `
      <span class="smart-ai-rpm">${modelInfo.rpm} RPM</span>
      <span class="smart-ai-quality">${modelInfo.quality}%</span>
    `;
  }
};

// Toggle auto switch
window.toggleSmartAutoSwitch = function() {
  window.smartAIState.autoSwitch = !window.smartAIState.autoSwitch;
  const toggle = document.getElementById('smartAutoSwitchToggle');
  if (toggle) {
    toggle.classList.toggle('active', window.smartAIState.autoSwitch);
  }
  console.log(`🎯 Auto-Switch: ${window.smartAIState.autoSwitch ? 'zapnut' : 'vypnut'}`);
};

// Update RPM monitor
window.updateSmartRpmMonitor = function() {
  const container = document.getElementById('smartRpmProviders');
  if (!container || typeof AI === 'undefined') return;

  container.innerHTML = Object.entries(SMART_AI_PROVIDERS).map(([provider, info]) => {
    const hasKey = AI.getKey(provider);
    if (!hasKey) return '';

    const remaining = AI.rateLimit?.remaining(provider) || info.rpm;
    const limit = info.rpm;
    const percent = (remaining / limit) * 100;
    const dotClass = percent > 50 ? '' : percent > 20 ? 'warning' : 'danger';

    return `
      <div class="smart-ai-rpm-item">
        <span class="smart-ai-rpm-dot ${dotClass}"></span>
        <span>${info.icon} ${remaining}/${limit}</span>
      </div>
    `;
  }).filter(Boolean).join('');
};

// Toggle collapsible sections
window.toggleSmartSection = function(sectionId) {
  const content = document.getElementById(sectionId);
  const arrow = document.getElementById(sectionId + 'Arrow');

  if (content) {
    content.classList.toggle('open');
  }
  if (arrow) {
    arrow.textContent = content.classList.contains('open') ? '▼' : '▶';
  }
};

// Load keys from AI module
window.loadSmartKeys = function() {
  if (typeof AI === 'undefined') return;

  ['gemini', 'groq', 'openrouter', 'mistral'].forEach(provider => {
    const input = document.getElementById(`smartKey${provider.charAt(0).toUpperCase() + provider.slice(1)}`);
    if (input) {
      const key = AI.config?.keys[provider] || '';
      // Zobraz jen pokud je vlastní klíč (ne demo)
      if (key && !AI.isUsingDemoKey(provider)) {
        input.value = key.substring(0, 8) + '...' + key.substring(key.length - 4);
      }
    }
  });

  window.updateSmartKeyStatuses();
};

// Update key statuses - s novými ikonami
window.updateSmartKeyStatuses = function() {
  if (typeof AI === 'undefined') return;

  ['gemini', 'groq', 'openrouter', 'mistral'].forEach(provider => {
    const statusEl = document.getElementById(`smartStatus${provider.charAt(0).toUpperCase() + provider.slice(1)}`);
    if (!statusEl) return;

    const hasKey = AI.getKey(provider);
    const isDemo = AI.isUsingDemoKey ? AI.isUsingDemoKey(provider) : false;

    if (hasKey && !isDemo) {
      // Vlastní klíč - zelené kolečko
      statusEl.textContent = '●';
      statusEl.className = 'smart-ai-status-icon ok';
      statusEl.title = 'Vlastní klíč nastaven';
    } else if (isDemo || (hasKey && AI._getDemoKey && AI._getDemoKey(provider))) {
      // Demo klíč - žlutý trojúhelník
      statusEl.textContent = '▲';
      statusEl.className = 'smart-ai-status-icon demo';
      statusEl.title = 'Demo klíč (omezený)';
    } else {
      // Žádný klíč - šedé prázdné kolečko
      statusEl.textContent = '○';
      statusEl.className = 'smart-ai-status-icon none';
      statusEl.title = 'Žádný klíč nastaven';
    }
  });
};

// Auto-load demo keys if no custom key (called on init)
window.autoLoadDemoKeys = function() {
  if (typeof AI === 'undefined') return;

  ['gemini', 'groq', 'openrouter', 'mistral'].forEach(provider => {
    const hasCustomKey = AI.config?.keys[provider];
    const hasDemo = AI._getDemoKey && AI._getDemoKey(provider);

    // Pokud nemá vlastní klíč a existuje demo, použij ho automaticky
    if (!hasCustomKey && hasDemo) {
      console.log(`🎁 Auto-load demo klíč pro ${provider}`);
    }
  });

  window.updateSmartKeyStatuses();
};

// Save single key
window.saveSmartKey = function(provider, key) {
  if (typeof AI === 'undefined' || !key.trim()) return;

  AI.setKey(provider, key.trim());
  window.updateSmartKeyStatuses();
  window.updateSmartBestModels();
  window.updateSmartRpmMonitor();
  console.log(`🔑 Klíč pro ${provider} uložen`);
};

// Save all keys
window.saveAllSmartKeys = function() {
  ['gemini', 'groq', 'openrouter', 'mistral'].forEach(provider => {
    const input = document.getElementById(`smartKey${provider.charAt(0).toUpperCase() + provider.slice(1)}`);
    if (input && input.value && !input.value.includes('...')) {
      AI.setKey(provider, input.value.trim());
    }
  });

  window.updateSmartKeyStatuses();
  window.updateSmartBestModels();
  window.updateSmartRpmMonitor();

  alert('✅ API klíče uloženy!');
};

// ===== DISCOVER MODELS =====

// Discover models state
window.discoverState = {
  currentProvider: null,
  freeModels: [],
  paidModels: [],
  currentTab: 'free'
};

// Discover models from provider API
window.discoverModels = async function(provider) {
  const loadingEl = document.getElementById('smartDiscoverLoading');
  const tabsEl = document.getElementById('smartDiscoverTabs');
  const listEl = document.getElementById('smartDiscoverModelsList');

  // Update button states
  document.querySelectorAll('.smart-ai-discover-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.provider === provider);
  });

  // Show loading
  if (loadingEl) loadingEl.textContent = `⏳ Načítám modely z ${provider}...`;
  if (listEl) listEl.innerHTML = '';
  if (tabsEl) tabsEl.classList.remove('visible');

  window.discoverState.currentProvider = provider;

  try {
    // Získej API klíč
    const apiKey = typeof AI !== 'undefined' ? AI.getKey(provider) : null;

    if (!apiKey) {
      if (loadingEl) loadingEl.textContent = `❌ Pro ${provider} není nastaven API klíč`;
      return;
    }

    // Fetch models z API
    let models = [];

    switch (provider) {
      case 'gemini':
        models = await window.fetchGeminiModels(apiKey);
        break;
      case 'groq':
        models = await window.fetchGroqModels(apiKey);
        break;
      case 'openrouter':
        models = await window.fetchOpenRouterModels(apiKey);
        break;
      case 'mistral':
        models = await window.fetchMistralModels(apiKey);
        break;
    }

    // Rozděl na FREE a PAID a seřaď podle kvality
    window.discoverState.freeModels = models.filter(m => m.isFree).sort((a, b) => b.quality - a.quality);
    window.discoverState.paidModels = models.filter(m => !m.isFree).sort((a, b) => b.quality - a.quality);

    // Update counts
    document.getElementById('smartDiscoverFreeCount').textContent = `(${window.discoverState.freeModels.length})`;
    document.getElementById('smartDiscoverPaidCount').textContent = `(${window.discoverState.paidModels.length})`;

    // Show tabs
    if (tabsEl) tabsEl.classList.add('visible');
    if (loadingEl) loadingEl.style.display = 'none';

    // Render current tab
    window.switchDiscoverTab(window.discoverState.currentTab);

    console.log(`📊 ${provider}: Nalezeno ${window.discoverState.freeModels.length} free + ${window.discoverState.paidModels.length} placených modelů`);

  } catch (err) {
    console.error('❌ Discover error:', err);
    if (loadingEl) {
      loadingEl.style.display = 'block';
      loadingEl.textContent = `❌ Chyba: ${err.message}`;
    }
  }
};

// Switch discover tab
window.switchDiscoverTab = function(tab) {
  window.discoverState.currentTab = tab;

  // Update tab buttons
  document.getElementById('smartDiscoverTabFree').classList.toggle('active', tab === 'free');
  document.getElementById('smartDiscoverTabPaid').classList.toggle('active', tab === 'paid');

  // Render models - grouped for OpenRouter, flat for others
  const models = tab === 'free' ? window.discoverState.freeModels : window.discoverState.paidModels;

  if (window.discoverState.currentProvider === 'openrouter') {
    window.renderGroupedModels(models, tab === 'paid');
  } else {
    window.renderDiscoverModels(models);
  }
};

// Render grouped models (for OpenRouter)
window.renderGroupedModels = function(models, showPrice) {
  const listEl = document.getElementById('smartDiscoverModelsList');
  if (!listEl) return;

  if (!models || models.length === 0) {
    listEl.innerHTML = '<div class="smart-ai-discover-loading">Žádné modely nenalezeny</div>';
    return;
  }

  // Group by provider (first part of id before /)
  const groups = {};
  models.forEach(m => {
    const parts = m.id.split('/');
    const providerName = parts.length > 1 ? parts[0] : 'Ostatní';
    if (!groups[providerName]) groups[providerName] = [];
    groups[providerName].push(m);
  });

  // Sort groups alphabetically
  const sortedGroups = Object.keys(groups).sort();

  // Zkontroluj které modely už máme v projektu
  const existingModels = typeof AI !== 'undefined' ?
    (AI.ALL_MODELS[window.discoverState.currentProvider] || []).map(m => m.value) : [];
  const provider = window.discoverState.currentProvider;

  let html = '';
  sortedGroups.forEach(groupName => {
    html += `<div class="smart-ai-provider-group">`;
    html += `<div class="smart-ai-provider-name">📦 ${groupName} (${groups[groupName].length})</div>`;
    groups[groupName].forEach(m => {
      const isExisting = existingModels.some(existing =>
        m.id.toLowerCase().includes(existing.toLowerCase()) || existing.toLowerCase().includes(m.id.toLowerCase())
      );
      const qualityClass = m.quality >= 90 ? 'high' : m.quality >= 70 ? 'medium' : 'low';
      const escapedId = m.id.replace(/'/g, "\\'");
      const escapedName = (m.name || m.id).replace(/'/g, "\\'");

      html += `
        <div class="smart-ai-model-row">
          <div class="smart-ai-model-row-left">
            <span class="smart-ai-model-name" title="${m.id}">${m.name || m.id}</span>
          </div>
          <div class="smart-ai-model-row-right">
            <span class="smart-ai-badge smart-ai-badge-quality ${qualityClass}">${m.quality}%</span>
            ${isExisting
              ? '<span class="smart-ai-badge smart-ai-badge-status have">✓ Máme</span>'
              : '<span class="smart-ai-badge smart-ai-badge-new">+ Nový</span>'
            }
            <button class="smart-ai-model-row-btn use" onclick="window.useDiscoveredModel('${provider}', '${escapedId}', '${escapedName}')" title="Použít v AI panelu">▶️ Použít</button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  });

  listEl.innerHTML = html;
};

// Render discovered models (flat list)
window.renderDiscoverModels = function(models) {
  const listEl = document.getElementById('smartDiscoverModelsList');
  if (!listEl) return;

  if (models.length === 0) {
    listEl.innerHTML = '<div class="smart-ai-discover-loading">Žádné modely nenalezeny</div>';
    return;
  }

  // Zkontroluj které modely už máme v projektu
  const existingModels = typeof AI !== 'undefined' ?
    (AI.ALL_MODELS[window.discoverState.currentProvider] || []).map(m => m.value) : [];
  const provider = window.discoverState.currentProvider;

  listEl.innerHTML = models.map(m => {
    const isExisting = existingModels.some(existing =>
      m.id.toLowerCase().includes(existing.toLowerCase()) || existing.toLowerCase().includes(m.id.toLowerCase())
    );
    const qualityClass = m.quality >= 90 ? 'high' : m.quality >= 70 ? 'medium' : 'low';
    const escapedId = m.id.replace(/'/g, "\\'");
    const escapedName = (m.name || m.id).replace(/'/g, "\\'");

    return `
      <div class="smart-ai-model-row">
        <div class="smart-ai-model-row-left">
          <span class="smart-ai-model-name" title="${m.id}">${m.name || m.id}</span>
        </div>
        <div class="smart-ai-model-row-right">
          <span class="smart-ai-badge smart-ai-badge-quality ${qualityClass}">${m.quality}%</span>
          ${isExisting
            ? '<span class="smart-ai-badge smart-ai-badge-status have">✓ Máme</span>'
            : '<span class="smart-ai-badge smart-ai-badge-new">+ Nový</span>'
          }
          <button class="smart-ai-model-row-btn use" onclick="window.useDiscoveredModel('${provider}', '${escapedId}', '${escapedName}')" title="Použít v AI panelu">▶️ Použít</button>
        </div>
      </div>
    `;
  }).join('');
};

// Fetch models from provider APIs
window.fetchGeminiModels = async function(apiKey) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await response.json();

  if (!data.models) throw new Error('Invalid response');

  // Bereme všechny modely, nefiltrujeme podle supportedGenerationMethods
  return data.models.map(m => ({
    id: m.name.replace('models/', ''),
    name: m.displayName || m.name.replace('models/', ''),
    description: m.description || '',
    quality: window.estimateModelQuality(m.name, 'gemini'),
    isFree: !m.name.includes('ultra') && !m.name.includes('pro-vision'),
    contextLength: m.inputTokenLimit || null
  }));
};

window.fetchGroqModels = async function(apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const data = await response.json();

  if (!data.data) throw new Error('Invalid response');

  return data.data.map(m => ({
    id: m.id,
    name: m.id,
    description: m.owned_by || '',
    quality: window.estimateModelQuality(m.id, 'groq'),
    isFree: true, // Groq je free tier
    contextLength: m.context_window || null
  }));
};

window.fetchOpenRouterModels = async function(apiKey) {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const data = await response.json();

  if (!data.data) throw new Error('Invalid response');

  // Vezmi VŠECHNY modely, ne jen prvních 100
  return data.data.map(m => ({
    id: m.id,
    name: m.name || m.id,
    description: m.description || '',
    quality: window.estimateModelQuality(m.id, 'openrouter'),
    // Model je free pokud končí na :free NEBO má nulovou cenu
    isFree: m.id.endsWith(':free') ||
            (m.pricing && parseFloat(m.pricing.prompt || '1') === 0 && parseFloat(m.pricing.completion || '1') === 0),
    pricing: m.pricing,
    contextLength: m.context_length || null
  }));
};

window.fetchMistralModels = async function(apiKey) {
  const response = await fetch('https://api.mistral.ai/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const data = await response.json();

  if (!data.data) throw new Error('Invalid response');

  return data.data.map(m => ({
    id: m.id,
    name: m.id,
    description: m.owned_by || '',
    quality: window.estimateModelQuality(m.id, 'mistral'),
    isFree: m.id.includes('open') || m.id.includes('small') || m.id.includes('tiny'),
    contextLength: m.max_context_length || null
  }));
};

// Estimate model quality based on name
window.estimateModelQuality = function(modelId, provider) {
  const id = modelId.toLowerCase();
  let quality = 70;

  // Top tier models
  if (id.includes('gpt-4') || id.includes('claude-3-opus') || id.includes('gemini-1.5-pro') ||
      id.includes('gemini-2') || id.includes('llama-3.3')) {
    quality = 95;
  }
  // High tier
  else if (id.includes('claude-3') || id.includes('gpt-3.5') || id.includes('gemini-pro') ||
           id.includes('llama-3.1') || id.includes('mixtral') || id.includes('mistral-large')) {
    quality = 90;
  }
  // Medium-high tier
  else if (id.includes('llama-3') || id.includes('gemini') || id.includes('qwen') ||
           id.includes('deepseek') || id.includes('yi-')) {
    quality = 85;
  }
  // Medium tier
  else if (id.includes('llama') || id.includes('mistral') || id.includes('phi') ||
           id.includes('gemma') || id.includes('solar')) {
    quality = 80;
  }
  // Lower tier
  else if (id.includes('tiny') || id.includes('small') || id.includes('mini')) {
    quality = 70;
  }

  return quality;
};

// Test discovered model
window.testDiscoverModel = async function(modelId) {
  const provider = window.discoverState.currentProvider;
  if (typeof AI === 'undefined') {
    alert('❌ AI modul není načten');
    return;
  }

  alert(`🧪 Test model: ${modelId}\n\nTestování v konzoli...`);

  try {
    // Dočasně nastav model
    const oldModel = AI.config.models[provider];
    AI.config.models[provider] = modelId;

    const result = await AI.ask('Řekni "Test OK" pokud funguje.');
    console.log(`✅ Test ${provider}/${modelId}:`, result);

    // Vrať zpět
    AI.config.models[provider] = oldModel;

    alert(`✅ Model funguje!\n\nOdpověď: ${result.substring(0, 100)}...`);
  } catch (err) {
    console.error(`❌ Test failed:`, err);
    alert(`❌ Test selhal: ${err.message}`);
  }
};

// Add discovered model to project
window.addDiscoverModel = function(modelId, modelName) {
  const provider = window.discoverState.currentProvider;
  if (typeof AI === 'undefined') {
    alert('❌ AI modul není načten');
    return;
  }

  // Přidej do AI.ALL_MODELS
  if (!AI.ALL_MODELS[provider]) {
    AI.ALL_MODELS[provider] = [];
  }

  AI.ALL_MODELS[provider].push({
    value: modelId,
    name: modelName,
    rpm: 15,
    quality: 80
  });

  // Refresh UI
  window.updateSmartModelSelect();
  window.updateSmartBestModels();

  // Re-render discover to update badges
  window.renderDiscoverModels(
    window.discoverState.currentTab === 'free'
      ? window.discoverState.freeModels
      : window.discoverState.paidModels
  );

  alert(`✅ Model "${modelName}" přidán do projektu!`);
};

// Update usage stats
window.updateSmartUsageStats = function() {
  if (typeof AI === 'undefined') return;

  const stats = AI.stats?.get() || { dailyCalls: 0, totalCalls: 0 };
  const cacheStats = AI.cache?.stats() || { hitRate: 0 };

  const callsEl = document.getElementById('smartStatCalls');
  const totalEl = document.getElementById('smartStatTotal');
  const cacheEl = document.getElementById('smartStatCache');

  if (callsEl) callsEl.textContent = stats.dailyCalls || 0;
  if (totalEl) totalEl.textContent = stats.totalCalls || 0;
  if (cacheEl) cacheEl.textContent = Math.round(cacheStats.hitRate || 0) + '%';
};

// Apply settings
window.applySmartAISettings = function() {
  if (typeof AI === 'undefined') return;

  const provider = window.smartAIState.currentProvider;
  const modelSelect = document.getElementById('smartModelSelect');
  const model = modelSelect?.value;

  // Nastav v AI modulu
  AI.setDefaultProvider(provider);
  if (model) {
    AI.setModel(provider, model);
  }

  // Sync s hlavním UI (aiProviderSelect, aiModelSelect)
  const providerSelect = document.getElementById('aiProviderSelect');
  if (providerSelect) {
    providerSelect.value = provider;
    if (window.updateModelsForProvider) {
      window.updateModelsForProvider();
    }
  }

  const mainModelSelect = document.getElementById('aiModelSelect');
  if (mainModelSelect && model) {
    // Najdi odpovídající model v hlavním selectu
    const options = Array.from(mainModelSelect.options);
    const matchingOption = options.find(opt => opt.value === model);
    if (matchingOption) {
      mainModelSelect.value = model;
    }
  }

  console.log(`✅ Smart AI Settings aplikováno: ${provider}/${model}`);
  window.closeSmartAISettings();
};

// Test AI module connection
window.testAIModule = async function() {
  if (typeof AI === 'undefined') {
    alert('❌ AI modul není načten!');
    return;
  }

  const provider = window.smartAIState.currentProvider;
  const modelSelect = document.getElementById('smartModelSelect');
  const model = modelSelect?.value;

  try {
    const result = await AI.ask('Řekni "Test OK" jedním slovem.', {
      provider: provider,
      model: model,
      maxTokens: 10
    });

    alert(`✅ Test úspěšný!\n\nProvider: ${provider}\nModel: ${model}\nOdpověď: ${result.substring(0, 100)}`);
  } catch (err) {
    alert(`❌ Test selhal!\n\nProvider: ${provider}\nModel: ${model}\nChyba: ${err.message}`);
  }
};

// Auto-refresh interval
setInterval(() => {
  const modal = document.getElementById('smartAISettingsModal');
  if (modal && modal.style.display !== 'none') {
    window.updateSmartRpmMonitor();
    window.updateSmartUsageStats();
    window.updateSmartBestModels();
  }
}, 5000);

// Keyboard shortcut pro otevření (Alt+S)
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key === 's') {
    e.preventDefault();
    window.openSmartAISettings();
  }
});

// ===== AI PANEL MENU A MODE TOGGLE =====

// Stav AI módu (manual/auto)
window.aiModelMode = localStorage.getItem('aiModelMode') || 'manual';

// Toggle dropdown menu
window.toggleAIMenu = function() {
  const menu = document.getElementById('aiMenuDropdown');
  const toggle = document.getElementById('aiMenuToggle');
  if (!menu) return;

  const isOpen = menu.style.display !== 'none';
  menu.style.display = isOpen ? 'none' : 'block';
  toggle?.classList.toggle('open', !isOpen);

  // Zavřít při kliknutí mimo
  if (!isOpen) {
    setTimeout(() => {
      document.addEventListener('click', closeAIMenuOnOutsideClick);
    }, 10);
  }
};

function closeAIMenuOnOutsideClick(e) {
  const menu = document.getElementById('aiMenuDropdown');
  const toggle = document.getElementById('aiMenuToggle');
  if (menu && !menu.contains(e.target) && !toggle?.contains(e.target)) {
    menu.style.display = 'none';
    toggle?.classList.remove('open');
    document.removeEventListener('click', closeAIMenuOnOutsideClick);
  }
}

// Nastavit AI Type z menu
window.setAIType = function(type) {
  const select = document.getElementById('aiTypeSelect');
  if (select) select.value = type;

  // Aktualizovat menu label a ikonu
  const icons = { '2d': '✏️', 'cnc': '🛠️', 'chat': '💬' };
  const labels = { '2d': '2D (kreslení)', 'cnc': 'CNC (kódování)', 'chat': 'Chat (pokec)' };

  document.getElementById('aiMenuIcon').textContent = icons[type] || '✏️';
  document.getElementById('aiMenuLabel').textContent = labels[type] || '2D (kreslení)';

  // Aktualizovat checkmarky - ID mapování
  const checkIds = { '2d': 'aiTypeCheck2d', 'cnc': 'aiTypeCheckCnc', 'chat': 'aiTypeCheckChat' };
  Object.keys(checkIds).forEach(t => {
    const check = document.getElementById(checkIds[t]);
    if (check) check.style.display = t === type ? 'inline' : 'none';
  });

  // Zavřít menu
  const menu = document.getElementById('aiMenuDropdown');
  if (menu) menu.style.display = 'none';
  document.getElementById('aiMenuToggle')?.classList.remove('open');
};

// Toggle mezi manual a auto módem
window.toggleAIModelMode = function() {
  window.aiModelMode = window.aiModelMode === 'manual' ? 'auto' : 'manual';
  localStorage.setItem('aiModelMode', window.aiModelMode);
  window.updateAIModelModeUI();

  // Aktualizuj modely podle módu
  const provider = document.getElementById('aiProviderSelect')?.value || 'gemini';
  if (window.aiModelMode === 'auto') {
    window.loadAutoModeModels(provider);
  } else {
    window.loadManualModeModels(provider);
  }
};

// Aktualizace UI pro mód
window.updateAIModelModeUI = function() {
  const toggle = document.getElementById('aiModeToggle');
  const icon = document.getElementById('aiModeIcon');
  const label = document.getElementById('aiModeLabel');
  const autoInfo = document.getElementById('aiAutoInfo');
  const providerSelect = document.getElementById('aiProviderSelect');
  const modelSelect = document.getElementById('aiModelSelect');

  if (window.aiModelMode === 'auto') {
    toggle?.classList.add('auto');
    if (icon) icon.textContent = '🤖';
    if (label) label.textContent = 'Auto';
    if (autoInfo) autoInfo.style.display = 'flex';
    // V auto módu je provider/model select disabled
    if (providerSelect) providerSelect.disabled = true;
    if (modelSelect) modelSelect.disabled = true;
  } else {
    toggle?.classList.remove('auto');
    if (icon) icon.textContent = '✋';
    if (label) label.textContent = 'Manual';
    if (autoInfo) autoInfo.style.display = 'none';
    // V manual módu jsou selecty aktivní
    if (providerSelect) providerSelect.disabled = false;
    if (modelSelect) modelSelect.disabled = false;
  }
};

// Načíst modely pro MANUAL mód - dynamicky z API
window.loadManualModeModels = async function(provider) {
  const modelSelect = document.getElementById('aiModelSelect');
  if (!modelSelect) return;

  modelSelect.innerHTML = '<option value="" disabled>⏳ Načítám FREE modely...</option>';

  try {
    const apiKey = typeof AI !== 'undefined' ? AI.getKey(provider) : null;
    if (!apiKey) {
      modelSelect.innerHTML = '<option value="" disabled>❌ Chybí API klíč</option>';
      return;
    }

    // Fetch modely z API
    let models = [];
    switch (provider) {
      case 'gemini':
        models = await window.fetchGeminiModels(apiKey);
        break;
      case 'groq':
        models = await window.fetchGroqModels(apiKey);
        break;
      case 'openrouter':
        models = await window.fetchOpenRouterModels(apiKey);
        break;
      case 'mistral':
        models = await window.fetchMistralModels(apiKey);
        break;
    }

    // Filtruj pouze FREE modely a seřaď podle kvality
    const freeModels = models.filter(m => m.isFree).sort((a, b) => b.quality - a.quality);

    if (freeModels.length === 0) {
      modelSelect.innerHTML = '<option value="" disabled>Žádné FREE modely</option>';
      return;
    }

    modelSelect.innerHTML = '';

    // Pro OpenRouter - seskupit podle providera
    if (provider === 'openrouter') {
      const groups = {};
      freeModels.forEach(m => {
        const parts = m.id.split('/');
        const groupName = parts.length > 1 ? parts[0] : 'Ostatní';
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(m);
      });

      Object.keys(groups).sort().forEach(groupName => {
        // Přidej optgroup
        const optgroup = document.createElement('optgroup');
        optgroup.label = `📦 ${groupName} (${groups[groupName].length})`;

        groups[groupName].forEach(m => {
          const option = document.createElement('option');
          option.value = m.id;
          const qualityIcon = m.quality >= 90 ? '🏆' : m.quality >= 80 ? '⭐' : '⚡';
          // Zobraz context length pokud je k dispozici
          const ctx = m.contextLength ? `${Math.round(m.contextLength/1000)}k` : '';
          option.textContent = `${qualityIcon} ${m.name || m.id.split('/').pop()}${ctx ? ' ('+ctx+')' : ''}`;
          optgroup.appendChild(option);
        });

        modelSelect.appendChild(optgroup);
      });
    } else {
      // Pro ostatní providery - plochý seznam
      freeModels.forEach((m, idx) => {
        const option = document.createElement('option');
        option.value = m.id;
        const qualityIcon = m.quality >= 90 ? '🏆' : m.quality >= 80 ? '⭐' : '⚡';
        // Zobraz context length pokud je k dispozici
        const ctx = m.contextLength ? `${Math.round(m.contextLength/1000)}k` : '';
        option.textContent = `${qualityIcon} ${m.name || m.id}${ctx ? ' ('+ctx+')' : ''}`;
        modelSelect.appendChild(option);
        if (idx === 0) option.selected = true;
      });
    }

    // Vyber první model
    if (modelSelect.options.length > 0) {
      modelSelect.selectedIndex = 0;
    }

    console.log(`📋 Manual mód: Načteno ${freeModels.length} FREE modelů pro ${provider}`);

  } catch (err) {
    console.error('Chyba při načítání modelů:', err);
    modelSelect.innerHTML = `<option value="" disabled>❌ Chyba: ${err.message}</option>`;
  }
};

// Načíst modely pro AUTO mód - vybere nejlepší
window.loadAutoModeModels = async function(provider) {
  const autoModel = document.getElementById('aiAutoModel');
  if (autoModel) autoModel.textContent = 'Načítám...';

  try {
    // Získej nejlepší dostupný model
    if (typeof AI !== 'undefined') {
      const bestModels = AI.getBestModels ? AI.getBestModels(3) : [];

      if (bestModels.length > 0) {
        const best = bestModels[0];
        if (autoModel) autoModel.textContent = best.name || best.model;
        window.autoSelectedModel = best;

        // Nastav v AI modulu
        AI.setDefaultProvider(best.provider);
        AI.setModel(best.provider, best.model);

        console.log(`🤖 Auto mód: Vybrán ${best.provider}/${best.model}`);
      } else {
        if (autoModel) autoModel.textContent = 'Gemini Flash';
        window.autoSelectedModel = { provider: 'gemini', model: 'gemini-2.0-flash', name: 'Gemini Flash' };
      }
    }
  } catch (err) {
    console.error('Chyba v auto módu:', err);
    if (autoModel) autoModel.textContent = 'Chyba';
  }
};

// Použít model z Discover sekce přímo v AI panelu
window.useDiscoveredModel = function(provider, modelId, modelName) {
  // Přepnout na Manual mód
  window.aiModelMode = 'manual';
  localStorage.setItem('aiModelMode', 'manual');
  window.updateAIModelModeUI();

  // Nastavit provider
  const providerSelect = document.getElementById('aiProviderSelect');
  if (providerSelect) {
    providerSelect.value = provider;
  }

  // Nastavit model
  const modelSelect = document.getElementById('aiModelSelect');
  if (modelSelect) {
    // Zkontroluj jestli model existuje v selectu
    let optionExists = false;
    for (let opt of modelSelect.options) {
      if (opt.value === modelId) {
        optionExists = true;
        break;
      }
    }

    // Pokud neexistuje, přidej ho
    if (!optionExists) {
      const option = document.createElement('option');
      option.value = modelId;
      option.textContent = `🆕 ${modelName}`;
      modelSelect.insertBefore(option, modelSelect.firstChild);
    }

    modelSelect.value = modelId;
  }

  // Nastav v AI modulu
  if (typeof AI !== 'undefined') {
    AI.setDefaultProvider(provider);
    AI.setModel(provider, modelId);
  }

  // Zavři Smart AI Settings modal
  window.closeSmartAISettings();

  // Zobraz notifikaci
  window.showToast?.(`✅ Model "${modelName}" připraven!`) ||
    console.log(`✅ Model "${modelName}" připraven k použití`);
};

// Toast notifikace
window.showToast = function(message, duration = 3000) {
  // Odstraň existující toast
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #22c55e, #16a34a);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    animation: toastIn 0.3s ease-out;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// Otevřít AI Module Settings (integrace z test-ai-module.html)
window.openAIModuleSettings = function() {
  // Zavřít dropdown menu
  const menu = document.getElementById('aiMenuDropdown');
  if (menu) menu.style.display = 'none';

  // Vytvořit nebo otevřít modal
  let modal = document.getElementById('aiModuleSettingsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'aiModuleSettingsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-window" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h2>🔧 AI Modul Settings</h2>
          <button onclick="document.getElementById('aiModuleSettingsModal').style.display='none'" class="modal-close">×</button>
        </div>
        <div class="modal-content" style="padding: 20px;">

          <!-- Provider Tabs -->
          <div class="ai-module-tabs" style="display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;">
            <button class="ai-module-tab active" onclick="window.switchAIModuleTab('gemini')" data-provider="gemini">🤖 Gemini</button>
            <button class="ai-module-tab" onclick="window.switchAIModuleTab('groq')" data-provider="groq">⚡ Groq</button>
            <button class="ai-module-tab" onclick="window.switchAIModuleTab('openrouter')" data-provider="openrouter">🌐 OpenRouter</button>
            <button class="ai-module-tab" onclick="window.switchAIModuleTab('mistral')" data-provider="mistral">🔥 Mistral</button>
          </div>

          <!-- API Key Section -->
          <div class="ai-module-section" style="background: rgba(30, 41, 59, 0.6); padding: 16px; border-radius: 10px; margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-size: 12px; color: #888;">API klíč pro <span id="aiModuleProviderName">Gemini</span>:</label>
            <div style="display: flex; gap: 8px;">
              <input type="password" id="aiModuleApiKey" placeholder="Zadejte API klíč..." style="flex: 1; padding: 10px; background: #111; border: 1px solid #444; border-radius: 6px; color: #ccc;">
              <button onclick="window.toggleAIModuleKeyVisibility()" style="padding: 10px; background: #333; border: 1px solid #444; border-radius: 6px; cursor: pointer;">👁️</button>
              <button onclick="window.saveAIModuleKey()" style="padding: 10px 16px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border: none; border-radius: 6px; color: white; cursor: pointer;">Uložit</button>
            </div>
            <div id="aiModuleKeyStatus" style="margin-top: 8px; font-size: 12px; color: #888;"></div>
          </div>

          <!-- Model List -->
          <div class="ai-module-section" style="background: rgba(30, 41, 59, 0.6); padding: 16px; border-radius: 10px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-weight: 600;">Dostupné modely</span>
              <button onclick="window.refreshAIModuleModels()" style="padding: 6px 12px; background: #333; border: 1px solid #444; border-radius: 6px; cursor: pointer; font-size: 12px;">🔄 Obnovit</button>
            </div>
            <div id="aiModuleModelList" style="max-height: 200px; overflow-y: auto;">
              <div style="color: #666; text-align: center; padding: 20px;">Načítám modely...</div>
            </div>
          </div>

          <!-- RPM Monitor -->
          <div class="ai-module-section" style="background: rgba(30, 41, 59, 0.6); padding: 16px; border-radius: 10px; margin-bottom: 16px;">
            <div style="font-weight: 600; margin-bottom: 12px;">📊 RPM Monitor</div>
            <div id="aiModuleRpmMonitor" style="display: flex; gap: 12px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 6px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e;"></span> Gemini: 15 RPM</div>
              <div style="display: flex; align-items: center; gap: 6px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e;"></span> Groq: 30 RPM</div>
            </div>
          </div>

          <!-- Test Section -->
          <div style="display: flex; gap: 10px;">
            <button onclick="window.testAIModuleConnection()" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #22c55e, #16a34a); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">🧪 Test připojení</button>
            <button onclick="window.resetAIModuleSettings()" style="padding: 12px 20px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; color: #f87171; cursor: pointer;">🗑️ Reset</button>
          </div>

        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.style.display = 'flex';
  window.switchAIModuleTab('gemini');
};

// AI Module Settings funkce
window.currentAIModuleProvider = 'gemini';

window.switchAIModuleTab = function(provider) {
  window.currentAIModuleProvider = provider;

  // Aktualizovat aktivní tab
  document.querySelectorAll('.ai-module-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.provider === provider);
  });

  // Aktualizovat název providera
  const names = { gemini: 'Gemini', groq: 'Groq', openrouter: 'OpenRouter', mistral: 'Mistral' };
  document.getElementById('aiModuleProviderName').textContent = names[provider] || provider;

  // Načíst API klíč
  const keyInput = document.getElementById('aiModuleApiKey');
  const savedKey = localStorage.getItem(`ai_${provider}_key`) || '';
  if (keyInput) keyInput.value = savedKey;

  // Aktualizovat status
  window.updateAIModuleKeyStatus(savedKey);

  // Načíst modely
  window.refreshAIModuleModels();
};

window.toggleAIModuleKeyVisibility = function() {
  const input = document.getElementById('aiModuleApiKey');
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
};

window.saveAIModuleKey = function() {
  const input = document.getElementById('aiModuleApiKey');
  const key = input?.value || '';
  localStorage.setItem(`ai_${window.currentAIModuleProvider}_key`, key);
  window.updateAIModuleKeyStatus(key);

  // Aktualizovat i v AI modulu
  if (typeof AI !== 'undefined' && AI.setApiKey) {
    AI.setApiKey(window.currentAIModuleProvider, key);
  }
};

window.updateAIModuleKeyStatus = function(key) {
  const status = document.getElementById('aiModuleKeyStatus');
  if (!status) return;

  if (key && key.length > 10) {
    status.innerHTML = '✅ <span style="color: #22c55e;">API klíč nastaven</span>';
  } else if (key) {
    status.innerHTML = '⚠️ <span style="color: #f59e0b;">Demo klíč</span>';
  } else {
    status.innerHTML = '❌ <span style="color: #888;">Žádný klíč</span>';
  }
};

window.refreshAIModuleModels = async function() {
  const list = document.getElementById('aiModuleModelList');
  if (!list) return;

  list.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">Načítám modely...</div>';

  try {
    // Získat modely z AI modulu nebo použít výchozí
    const modelsByProvider = {
      gemini: [
        { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', rpm: 15, free: true },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', rpm: 10, free: true },
        { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', rpm: 5, free: true }
      ],
      groq: [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', rpm: 30, free: true },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', rpm: 30, free: true },
        { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', rpm: 30, free: true }
      ],
      openrouter: [
        { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', rpm: 20, free: true },
        { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B', rpm: 20, free: true }
      ],
      mistral: [
        { id: 'mistral-small-latest', name: 'Mistral Small', rpm: 5, free: false },
        { id: 'open-mistral-7b', name: 'Mistral 7B', rpm: 10, free: true }
      ]
    };

    const models = modelsByProvider[window.currentAIModuleProvider] || [];

    if (models.length === 0) {
      list.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">Žádné modely</div>';
      return;
    }

    list.innerHTML = models.map(m => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(15, 23, 42, 0.6); border-radius: 6px; margin-bottom: 6px;">
        <div>
          <div style="font-size: 13px; color: #ccc;">${m.name}</div>
          <div style="font-size: 11px; color: #666;">${m.id}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 11px; color: ${m.free ? '#22c55e' : '#888'};">${m.free ? 'FREE' : 'PAID'}</span>
          <span style="font-size: 11px; color: #888;">${m.rpm} RPM</span>
        </div>
      </div>
    `).join('');

  } catch (err) {
    list.innerHTML = `<div style="color: #f87171; text-align: center; padding: 20px;">Chyba: ${err.message}</div>`;
  }
};

window.testAIModuleConnection = async function() {
  try {
    if (typeof AI === 'undefined') {
      alert('❌ AI modul není načten!');
      return;
    }

    const result = await AI.ask('Řekni "OK"', {
      provider: window.currentAIModuleProvider,
      maxTokens: 10
    });

    alert(`✅ Test úspěšný!\n\nProvider: ${window.currentAIModuleProvider}\nOdpověď: ${result.substring(0, 50)}`);
  } catch (err) {
    alert(`❌ Test selhal!\n\nProvider: ${window.currentAIModuleProvider}\nChyba: ${err.message}`);
  }
};

window.resetAIModuleSettings = function() {
  if (!confirm('Opravdu chcete resetovat nastavení AI modulu?')) return;

  ['gemini', 'groq', 'openrouter', 'mistral'].forEach(p => {
    localStorage.removeItem(`ai_${p}_key`);
  });

  alert('✅ Nastavení resetováno');
  window.switchAIModuleTab(window.currentAIModuleProvider);
};

// Inicializace při načtení stránky
document.addEventListener('DOMContentLoaded', () => {
  // Aktualizuj AI model mode UI
  window.updateAIModelModeUI();

  // Načti modely podle aktuálního módu
  const provider = document.getElementById('aiProviderSelect')?.value || 'gemini';
  if (window.aiModelMode === 'auto') {
    if (window.loadAutoModeModels) window.loadAutoModeModels(provider);
  } else {
    if (window.loadManualModeModels) window.loadManualModeModels(provider);
  }

  // Inicializuj AI modul pokud je dostupný
  if (typeof AI !== 'undefined') {
    console.log('🤖 AI Modul detekován, verze:', AI.VERSION || 'neznámá');

    // Načti uložené klíče z localStorage
    ['gemini', 'groq', 'openrouter', 'mistral'].forEach(provider => {
      const savedKey = localStorage.getItem(`ai_${provider}_key`);
      if (savedKey && savedKey.length > 10) {
        AI.setKey(provider, savedKey);
        console.log(`🔑 Načten uložený klíč pro ${provider}`);
      }
    });

    // Aktualizuj statusy klíčů po chvíli (aby se UI stihlo načíst)
    setTimeout(() => {
      if (window.updateSmartKeyStatuses) window.updateSmartKeyStatuses();
    }, 500);
  }

  // Aktualizuj modely při změně providera
  setTimeout(() => {
    if (window.updateModelsForProvider) window.updateModelsForProvider();
  }, 100);
});