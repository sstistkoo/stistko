// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Stav aplikace, Toast, Undo/Redo                   ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Toast notifikace ──
function showToast(msg, duration = 2000) {
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
const state = {
  objects: [],
  selected: null,
  tool: "select",
  snapToGrid: true,
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
};

// ── Undo / Redo ──
function pushUndo() {
  state.undoStack.push(JSON.stringify(state.objects));
  if (state.undoStack.length > state.maxUndo) state.undoStack.shift();
  state.redoStack = [];
  updateUndoButtons();
}

function undo() {
  if (state.undoStack.length === 0) return;
  state.redoStack.push(JSON.stringify(state.objects));
  state.objects = JSON.parse(state.undoStack.pop());
  state.selected = null;
  updateObjectList();
  updateProperties();
  calculateAllIntersections();
  updateUndoButtons();
  showToast("Zpět");
}

function redo() {
  if (state.redoStack.length === 0) return;
  state.undoStack.push(JSON.stringify(state.objects));
  state.objects = JSON.parse(state.redoStack.pop());
  state.selected = null;
  updateObjectList();
  updateProperties();
  calculateAllIntersections();
  updateUndoButtons();
  showToast("Vpřed");
}

function updateUndoButtons() {
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
