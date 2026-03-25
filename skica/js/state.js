// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Stav aplikace, Toast, Undo/Redo                   ║
// ╚══════════════════════════════════════════════════════════════╝

import { bridge } from './bridge.js';

// ── Hook pro rozšíření pushUndo (autosave) ──
let _pushUndoHook = null;
export function setPushUndoHook(fn) { _pushUndoHook = fn; }

// ── Toast notifikace ──
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
export const state = {
  objects: [],
  selected: null,
  tool: "select",
  snapToPoints: true,
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
};

// ── Undo / Redo ──
export function pushUndo() {
  state.undoStack.push(JSON.stringify(state.objects));
  if (state.undoStack.length > state.maxUndo) state.undoStack.shift();
  state.redoStack = [];
  updateUndoButtons();
  if (_pushUndoHook) _pushUndoHook();
}

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
export function toDisplayCoords(wx, wy) {
  if (state.coordMode === 'inc') {
    return { x: wx - state.incReference.x, y: wy - state.incReference.y };
  }
  return { x: wx, y: wy };
}

export function fromIncToAbs(dx, dy) {
  return { x: state.incReference.x + dx, y: state.incReference.y + dy };
}
