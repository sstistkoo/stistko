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
  tool: "select",
  snapToPoints: true,
  snapToGrid: false,
  angleSnap: false,
  angleSnapStep: 15,
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
  // Vrstvy
  layers: [
    { id: 0, name: 'Kontura', color: '#89b4fa', visible: true, locked: false },
    { id: 1, name: 'Konstrukce', color: '#6c7086', visible: true, locked: false },
    { id: 2, name: 'Kóty', color: '#a6e3a1', visible: true, locked: false },
  ],
  activeLayer: 0,
  nextLayerId: 3,
};

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
  if (state.undoStack.length === 0) return;
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
