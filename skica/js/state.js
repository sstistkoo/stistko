// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Stav aplikace, Toast, Undo/Redo                   ║
// ╚══════════════════════════════════════════════════════════════╝

import { bridge } from './bridge.js';

// ── Hook pro rozšíření pushUndo (autosave) ──
let _pushUndoHook = null;
/** @param {Function} fn */
export function setPushUndoHook(fn) { _pushUndoHook = fn; }

// ── Toast notifikace ──
/**
 * @param {string} msg
 * @param {number} [duration=2000]
 */
export function showToast(msg, duration = 2000) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), duration);
}

// ── Stav aplikace ──
/** @type {import('./types.js').AppState} */
export const state = {
  objects: [],
  selected: null,
  selectedSegment: null,
  tool: "select",
  snapToPoints: true,
  snapToGrid: false,
  angleSnap: false,
  angleSnapStep: 15,
  angleSnapTolerance: 1,
  gridSize: 10,
  zoom: 1,
  panX: 0,
  panY: 0,
  drawing: false,
  tempPoints: [],
  mouse: { x: 0, y: 0, rawX: 0, rawY: 0, sx: 0, sy: 0, snapped: false, snapType: '' },
  intersections: [],
  nextId: 1,
  showDimensions: true,
  // Undo/Redo
  undoStack: [],
  redoStack: [],
  maxUndo: 50,
  // Move
  dragging: false,
  dragObjIdx: null,
  dragStartWorld: null,
  dragObjSnapshot: null,
  // Clipboard
  clipboard: null,
  // Numerical dialog chaining
  numDialogChain: { x: null, y: null },
  // Inkrementální souřadnice
  coordMode: 'abs',
  incReference: { x: 0, y: 0 },
  // Projekt
  projectName: 'Bez názvu',
  // Typ stroje: 'soustruh' = Z vodorovně, X svisle; 'karusel' = X vodorovně, Z svisle
  machineType: 'soustruh',
  // Zobrazení osy X: 'radius' = skutečná hodnota, 'diameter' = ×2 (průměr)
  xDisplayMode: 'radius',
  // Vrstvy
  layers: [
    { id: 0, name: 'Kontura', color: '#89b4fa', visible: true, locked: false },
    { id: 1, name: 'Konstrukce', color: '#6c7086', visible: true, locked: false },
    { id: 2, name: 'Kóty', color: '#a6e3a1', visible: true, locked: false },
  ],
  activeLayer: 0,
  nextLayerId: 3,
};

// ── Reset dočasného drawing stavu ──
/**
 * Vyčistí všechny dočasné vlastnosti používané při kreslení a tool operacích.
 * Volat při Escape, přepnutí nástroje a mobilním Cancel.
 */
export function resetDrawingState() {
  state.drawing = false;
  state.tempPoints = [];
  state._polylineBulges = [];
  state._parallelRefIdx = null;
  state._parallelRefSeg = null;
  state._parallelClickX = undefined;
  state._parallelClickY = undefined;
  state._snapPointState = null;
  state._tangentMode = null;
  state._tangentFirstCircle = null;
  state._tangentFirstLine = null;
  state._selectedConstraint = null;
  state._trimLine = null;
  state._extendLine = null;
  state._filletFirstLine = null;
  // Mirror – cleanup handler + state
  if (state._mirrorCleanup) {
    state._mirrorCleanup();
    state._mirrorCleanup = null;
  }
  state._mirrorObj = null;
  state._mirrorStep = null;
  state._mirrorAxisPoints = null;
}

// ── Undo / Redo ──
/** Uloží aktuální stav objektů na undo stack. */
export function pushUndo() {
  state.undoStack.push(JSON.stringify(state.objects));
  if (state.undoStack.length > state.maxUndo) state.undoStack.shift();
  state.redoStack = [];
  updateUndoButtons();
  if (_pushUndoHook) _pushUndoHook();
}

/** Vrátí poslední změnu (undo). */
export function undo() {
  // Během kreslení kontury: vrátit poslední bod místo globálního undo
  if (state.drawing && state.tool === "polyline") {
    if (state.tempPoints.length > 1) {
      state.tempPoints.pop();
      if (state._polylineBulges && state._polylineBulges.length > 0) {
        state._polylineBulges.pop();
      }
      // Přesunout kurzor na nový poslední bod, aby preview čára nezobrazovala odebraný segment
      const lastPt = state.tempPoints[state.tempPoints.length - 1];
      state.mouse.x = lastPt.x;
      state.mouse.y = lastPt.y;
      showToast(`Poslední bod odebrán (zbývá ${state.tempPoints.length})`);
      if (bridge.renderAll) bridge.renderAll();
      return;
    }
    // Zbyl jen 1 bod – zrušit kreslení
    state.drawing = false;
    state.tempPoints = [];
    state._polylineBulges = [];
    if (bridge.resetHint) bridge.resetHint();
    if (bridge.renderAll) bridge.renderAll();
    return;
  }
  if (state.undoStack.length === 0) return;

  // Krokové undo pro právě vytvořenou konturu:
  // Pokud je poslední objekt polyline s >2 body a v předchozím stavu neexistuje,
  // odeber jen poslední bod místo smazání celé kontury.
  const lastObj = state.objects[state.objects.length - 1];
  if (lastObj && lastObj.type === 'polyline' && lastObj.vertices && lastObj.vertices.length > 2) {
    const undoTopObjs = JSON.parse(state.undoStack[state.undoStack.length - 1]);
    const polyInUndo = undoTopObjs.find(o => o.id === lastObj.id);
    if (!polyInUndo) {
      // Kontura neexistuje v předchozím stavu → byla právě vytvořena
      state.redoStack.push(JSON.stringify(state.objects));
      if (lastObj.closed) {
        // Nejdřív otevřít uzavřenou konturu
        lastObj.closed = false;
        while (lastObj.bulges.length > lastObj.vertices.length - 1) lastObj.bulges.pop();
      } else {
        // Odebrat poslední bod
        lastObj.vertices.pop();
        while (lastObj.bulges.length > lastObj.vertices.length - 1) lastObj.bulges.pop();
      }
      state.selected = null;
      if (bridge.updateObjectList) bridge.updateObjectList();
      if (bridge.updateProperties) bridge.updateProperties();
      if (bridge.calculateAllIntersections) bridge.calculateAllIntersections();
      updateUndoButtons();
      showToast("Zpět (bod kontury)");
      return;
    }
  }

  state.redoStack.push(JSON.stringify(state.objects));
  state.objects = JSON.parse(state.undoStack.pop());
  state.selected = null;
  if (bridge.updateObjectList) bridge.updateObjectList();
  if (bridge.updateProperties) bridge.updateProperties();
  if (bridge.calculateAllIntersections) bridge.calculateAllIntersections();
  updateUndoButtons();
  showToast("Zpět");
}

/** Zopakuje vrácenou změnu (redo). */
export function redo() {
  if (state.redoStack.length === 0) return;
  state.undoStack.push(JSON.stringify(state.objects));
  state.objects = JSON.parse(state.redoStack.pop());
  state.selected = null;
  if (bridge.updateObjectList) bridge.updateObjectList();
  if (bridge.updateProperties) bridge.updateProperties();
  if (bridge.calculateAllIntersections) bridge.calculateAllIntersections();
  updateUndoButtons();
  showToast("Vpřed");
}

/** Aktualizuje stav tlačítek undo/redo v toolbaru. */
export function updateUndoButtons() {
  document.getElementById("btnUndo").disabled =
    state.undoStack.length === 0;
  document.getElementById("btnRedo").disabled =
    state.redoStack.length === 0;
  document
    .getElementById("btnUndo")
    .classList.toggle("disabled", state.undoStack.length === 0);
  document
    .getElementById("btnRedo")
    .classList.toggle("disabled", state.redoStack.length === 0);
  if (bridge.updateMobileRedoBtn) bridge.updateMobileRedoBtn();
}

// ── Inkrementální souřadnice – pomocné funkce ──
/**
 * Převede world souřadnice na zobrazované (abs / inc).
 * @param {number} wx
 * @param {number} wy
 * @returns {{x: number, y: number}}
 */
export function toDisplayCoords(wx, wy) {
  if (state.coordMode === 'inc') {
    return { x: wx - state.incReference.x, y: wy - state.incReference.y };
  }
  return { x: wx, y: wy };
}

/**
 * Převede inkrementální souřadnice na absolutní.
 * @param {number} dx
 * @param {number} dy
 * @returns {{x: number, y: number}}
 */
export function fromIncToAbs(dx, dy) {
  return { x: state.incReference.x + dx, y: state.incReference.y + dy };
}

/**
 * Vrací popisky os podle typu stroje.
 * H = popisek vodorovné osy (wx), V = popisek svislé osy (wy).
 * @returns {[string, string]} [H, V]
 */
export function axisLabels() {
  return state.machineType === 'karusel' ? ['X', 'Z'] : ['Z', 'X'];
}

/**
 * Převede hodnotu osy X pro zobrazení (×2 v režimu průměr).
 * @param {number} val
 * @returns {number}
 */
export function displayX(val) {
  return state.xDisplayMode === 'diameter' ? val * 2 : val;
}

/**
 * Převede vstupní hodnotu osy X z režimu zobrazení na interní (÷2 v režimu průměr).
 * @param {number} val
 * @returns {number}
 */
export function inputX(val) {
  return state.xDisplayMode === 'diameter' ? val / 2 : val;
}

/**
 * Vrací prefix pro osu X ('⌀' v režimu průměr, '' v režimu poloměr).
 * @returns {string}
 */
export function xPrefix() {
  return state.xDisplayMode === 'diameter' ? '⌀' : '';
}
