// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Dotyková podpora + mobilní ovládání               ║
// ╚══════════════════════════════════════════════════════════════╝

import { MOBILE_BREAKPOINT, LONG_PRESS_MS, CROSSHAIR_OFFSET_Y, ZOOM_MIN, ZOOM_MAX, VIBRATE_LONG_PRESS, TOUCH_MOVE_THRESHOLD, PAN_ACTIVATE_THRESHOLD } from './constants.js';
import { drawCanvas, screenToWorld, snapPt, autoCenterView, applyAngleSnap, safeVibrate } from './canvas.js';
import { state, undo, redo, showToast, toDisplayCoords, resetDrawingState, displayX, xPrefix, fmtStatusCoords } from './state.js';
import { renderAll } from './render.js';
import { moveObject, addObject } from './objects.js';
import { handleCanvasClick } from './events.js';
import { setTool, resetHint, updateSnapPtsBtn } from './ui.js';
import { toolLabel } from './utils.js';
import { showNumericalInputDialog, showMobileEditDialog } from './dialogs.js';
import { bridge } from './bridge.js';

// ── Mobile: detekce ──
/** @returns {boolean} */
export const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;

// ── Mobile: Toolbar toggle ──
const mobileToolbarToggle = document.getElementById("mobileToolbarToggle");
const topbar = document.getElementById("topbar");
mobileToolbarToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  topbar.classList.toggle("mobile-open");
  document.body.classList.toggle("toolbar-open", topbar.classList.contains("mobile-open"));
  sidebar.classList.remove("mobile-open");
  sidebarOverlay.classList.remove("active");
});
topbar.addEventListener("click", (e) => {
  if (isMobile() && e.target.closest(".tool-btn")) {
    setTimeout(() => {
      topbar.classList.remove("mobile-open");
      document.body.classList.remove("toolbar-open");
    }, 150);
  }
});

// ── Mobile: Toolbar close button ──
document.getElementById("mobileToolbarClose").addEventListener("click", (e) => {
  e.stopPropagation();
  topbar.classList.remove("mobile-open");
  document.body.classList.remove("toolbar-open");
});

// ── Mobile: Sidebar toggle ──
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const mobileSidebarToggle = document.getElementById("mobileSidebarToggle");
mobileSidebarToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  sidebar.classList.toggle("mobile-open");
  sidebarOverlay.classList.toggle(
    "active",
    sidebar.classList.contains("mobile-open"),
  );
  topbar.classList.remove("mobile-open");
  document.body.classList.remove("toolbar-open");
});
sidebarOverlay.addEventListener("click", () => {
  sidebar.classList.remove("mobile-open");
  sidebarOverlay.classList.remove("active");
});

// ── Sidebar close button ──
document.getElementById("sidebarCloseBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  sidebar.classList.remove("mobile-open");
  sidebarOverlay.classList.remove("active");
});

// ── Klik na canvas zavře otevřené panely ──
drawCanvas.addEventListener("pointerdown", () => {
  if (!isMobile()) return;
  if (sidebar.classList.contains("mobile-open")) {
    sidebar.classList.remove("mobile-open");
    sidebarOverlay.classList.remove("active");
  }
  if (topbar.classList.contains("mobile-open")) {
    topbar.classList.remove("mobile-open");
    document.body.classList.remove("toolbar-open");
  }
});

// ── Mobile: coord bar ──
const mobileCoordBar = document.getElementById("mobileCoordBar");

// Tap na coord bar (info pouze)
mobileCoordBar.addEventListener("click", (e) => {
  e.stopPropagation();
});

/**
 * Aktualizuje mobilní stavový řádek se souřadnicemi.
 * @param {number} wx
 * @param {number} wy
 * @param {string} [extra]
 */
export function updateMobileCoords(wx, wy, extra) {
  extra = extra || "";
  const coords = fmtStatusCoords(wx, wy, extra);
  // Desktop coord display – jen souřadnice
  document.getElementById("coordDisplay").textContent = coords;
  // Mobile coord bar – nástroj + mód + souřadnice + zoom
  if (isMobile()) {
    const zoomPct = (state.zoom * 100).toFixed(0);
    const machine = state.machineType === 'karusel' ? 'KAR' : 'SOU';
    const cMode = state.coordMode === 'inc' ? 'INC' : 'ABS';
    const xMode = state.xDisplayMode === 'diameter' ? '⌀' : 'R';
    mobileCoordBar.textContent = `${machine} ${cMode} ${xMode}  |  ${coords}  |  ${zoomPct}%`;
  } else {
    mobileCoordBar.textContent = coords;
  }
}

// ── Mobile: Numerický vstup tlačítko ──
document
  .getElementById("mobileNumInput")
  .addEventListener("click", (e) => {
    e.stopPropagation();
    topbar.classList.remove("mobile-open");
    document.body.classList.remove("toolbar-open");
    sidebar.classList.remove("mobile-open");
    sidebarOverlay.classList.remove("active");
    showNumericalInputDialog();
  });

// ── Mobile: Měření tlačítko ──
const mobileMeasureBtn = document.getElementById("mobileMeasure");
mobileMeasureBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  topbar.classList.remove("mobile-open");
  document.body.classList.remove("toolbar-open");
  sidebar.classList.remove("mobile-open");
  sidebarOverlay.classList.remove("active");
  const newTool = state.tool === "measure" ? "select" : "measure";
  setTool(newTool);
  mobileMeasureBtn.classList.toggle("active", newTool === "measure");
});

// ── Mobile: Snap toggle tlačítko ──
const mobileSnapBtn = document.getElementById("mobileSnap");
function updateMobileSnapBtn() {
  mobileSnapBtn.classList.toggle("snap-active", state.snapToPoints);
}
updateMobileSnapBtn();
mobileSnapBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  state.snapToPoints = !state.snapToPoints;
  updateMobileSnapBtn();
  updateSnapPtsBtn();
  renderAll();
  showToast(state.snapToPoints ? "Přichycení: ON" : "Přichycení: OFF");
});

// ── Mobile: Auto-center tlačítko ──
document.getElementById("mobileAutoCenter").addEventListener("click", (e) => {
  e.stopPropagation();
  autoCenterView();
});

// ── Sidebar: Edit tlačítko ──
document.getElementById("sidebarEditBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  topbar.classList.remove("mobile-open");
  document.body.classList.remove("toolbar-open");
  sidebar.classList.remove("mobile-open");
  sidebarOverlay.classList.remove("active");
  showMobileEditDialog();
});

// ── Mobile: Cancel tlačítko ──
const mobileCancelBtn = document.getElementById("mobileCancel");
mobileCancelBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (state.dragging) {
    const obj = state.objects[state.dragObjIdx];
    if (obj && state.dragObjSnapshot) {
      Object.assign(obj, JSON.parse(state.dragObjSnapshot));
    }
    state.dragging = false;
    state.dragObjIdx = null;
  }
  resetDrawingState();
  // Odstranit dočasný měřicí bod
  const mTempIdx = state.objects.findIndex(o => o.isMeasureTemp);
  if (mTempIdx !== -1) state.objects.splice(mTempIdx, 1);
  hidePrecisionCrosshair();
  updateMobileCancelBtn();
  renderAll();
  resetHint();
  showToast("Zrušeno");
});

// Zobrazit/skrýt Cancel tlačítko podle stavu kreslení
/** Aktualizuje viditelnost mobilního Cancel tlačítka. */
export function updateMobileCancelBtn() {
  if (!isMobile()) return;
  const show = state.drawing || state.dragging;
  mobileCancelBtn.style.display = show ? "flex" : "none";
}

// ── Polyline: Dokončit / Uzavřít tlačítka ──
const polylineConfirmBtn = document.getElementById("polylineConfirm");
const polylineCloseBtn = document.getElementById("polylineClose");

/** Aktualizuje viditelnost tlačítek Dokončit/Uzavřít konturu. */
export function updatePolylineButtons() {
  const show = state.drawing && state.tool === 'polyline' && state.tempPoints.length >= 2;
  polylineConfirmBtn.style.display = show ? "flex" : "none";
  polylineCloseBtn.style.display = show ? "flex" : "none";
}

polylineConfirmBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!state.drawing || state.tool !== 'polyline' || state.tempPoints.length < 2) return;
  const bulges = state._polylineBulges || [];
  while (bulges.length < state.tempPoints.length - 1) bulges.push(0);
  addObject({
    type: 'polyline',
    vertices: state.tempPoints.slice(),
    bulges: bulges.slice(0, state.tempPoints.length - 1),
    closed: false,
    name: `Kontura ${state.nextId}`,
  });
  state.drawing = false;
  state.tempPoints = [];
  state._polylineBulges = [];
  resetHint();
  updatePolylineButtons();
  showToast('Kontura dokončena');
  renderAll();
});

polylineCloseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!state.drawing || state.tool !== 'polyline' || state.tempPoints.length < 2) return;
  const bulges = state._polylineBulges || [];
  while (bulges.length < state.tempPoints.length) bulges.push(0);
  addObject({
    type: 'polyline',
    vertices: state.tempPoints.slice(),
    bulges: bulges.slice(0, state.tempPoints.length),
    closed: true,
    name: `Kontura ${state.nextId}`,
  });
  state.drawing = false;
  state.tempPoints = [];
  state._polylineBulges = [];
  resetHint();
  updatePolylineButtons();
  showToast('Kontura uzavřena');
  renderAll();
});

// ── Mobile: Undo tlačítko ──
document.getElementById("mobileUndo").addEventListener("click", (e) => {
  e.stopPropagation();
  undo();
  updateMobileRedoBtn();
});

// ── Mobile: Redo tlačítko ──
const mobileRedoBtn = document.getElementById("mobileRedo");
if (mobileRedoBtn) {
  mobileRedoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    redo();
    updateMobileRedoBtn();
  });
}

/** Zobrazí/skryje mobileRedo tlačítko podle stavu redoStack. */
export function updateMobileRedoBtn() {
  if (!isMobile() || !mobileRedoBtn) return;
  mobileRedoBtn.style.display = state.redoStack.length > 0 ? 'flex' : 'none';
}
bridge.updateMobileRedoBtn = updateMobileRedoBtn;

// ── Touch state ──
let touchState = {
// ── Touch state ──
  lastTap: 0,
  touches: [],
  pinchStartDist: 0,
  pinchStartZoom: 1,
  pinchMidX: 0,
  pinchMidY: 0,
  panActive: false,
  wasMultiTouch: false,
  panStartX: 0,
  panStartY: 0,
  panStartPX: 0,
  panStartPY: 0,
  // Single-finger pan
  singleTouchStartX: 0,
  singleTouchStartY: 0,
  singleTouchStartPanX: 0,
  singleTouchStartPanY: 0,
  singlePanning: false,
  touchMoved: false,
  touchStartTime: 0,
  // Precision crosshair
  longPressTimer: null,
  precisionMode: false,
};

function getTouchPos(touch) {
  const rect = drawCanvas.getBoundingClientRect();
  return {
    sx: touch.clientX - rect.left,
    sy: touch.clientY - rect.top,
  };
}

// Detekce, zda je jednoprstý posun povolený (ne při kreslení/přetahování)
function canSingleFingerPan() {
  return !state.drawing && !state.dragging;
}

// ── Precision crosshair helpers ──
const precisionEl = document.getElementById("precisionCrosshair");
const precisionLabel = precisionEl.querySelector(".ch-label");

function showPrecisionCrosshair(touch) {
  const rect = drawCanvas.getBoundingClientRect();
  const chSx = touch.clientX - rect.left;
  const chSy = touch.clientY - rect.top + CROSSHAIR_OFFSET_Y;

  let [wx, wy] = screenToWorld(chSx, chSy);
  if (state.snapToPoints) [wx, wy] = snapPt(wx, wy);
  if (state.angleSnap && state.drawing && state.tempPoints.length > 0
      && ['line', 'constr', 'polyline', 'measure', 'dimension'].includes(state.tool)
      && state.mouse.snapType !== 'point') {
    [wx, wy] = applyAngleSnap(wx, wy, state.tempPoints[state.tempPoints.length - 1]);
  }
  state.mouse.x = wx;
  state.mouse.y = wy;
  state.mouse.sx = chSx;
  state.mouse.sy = chSy;

  precisionEl.style.left = touch.clientX + "px";
  precisionEl.style.top = touch.clientY + CROSSHAIR_OFFSET_Y + "px";
  const dp = toDisplayCoords(wx, wy);
  const pf = state.coordMode === 'inc' ? 'Δ' : '';
  precisionLabel.textContent = `${pf}X${dp.x.toFixed(3)} ${pf}Z${dp.y.toFixed(3)}`;
  precisionEl.style.display = "block";
  updateMobileCoords(wx, wy);
  renderAll();
}

function updatePrecisionCrosshair(touch) {
  const rect = drawCanvas.getBoundingClientRect();
  const chSx = touch.clientX - rect.left;
  const chSy = touch.clientY - rect.top + CROSSHAIR_OFFSET_Y;

  let [wx, wy] = screenToWorld(chSx, chSy);
  if (state.snapToPoints) [wx, wy] = snapPt(wx, wy);
  if (state.angleSnap && state.drawing && state.tempPoints.length > 0
      && ['line', 'constr', 'polyline', 'measure', 'dimension'].includes(state.tool)
      && state.mouse.snapType !== 'point') {
    [wx, wy] = applyAngleSnap(wx, wy, state.tempPoints[state.tempPoints.length - 1]);
  }
  state.mouse.x = wx;
  state.mouse.y = wy;
  state.mouse.sx = chSx;
  state.mouse.sy = chSy;

  precisionEl.style.left = touch.clientX + "px";
  precisionEl.style.top = touch.clientY + CROSSHAIR_OFFSET_Y + "px";
  const dp2 = toDisplayCoords(wx, wy);
  const pf2 = state.coordMode === 'inc' ? 'Δ' : '';
  precisionLabel.textContent = `${pf2}X${dp2.x.toFixed(3)} ${pf2}Z${dp2.y.toFixed(3)}`;

  let extra = "";
  if (state.drawing && state.tempPoints.length > 0) {
    const ref = state.tempPoints[state.tempPoints.length - 1];
    const ddx = wx - ref.x,
      ddy = wy - ref.y;
    const dist = Math.hypot(ddx, ddy);
    const ang = (Math.atan2(ddy, ddx) * 180) / Math.PI;
    extra = `  d=${dist.toFixed(1)} ∠=${ang.toFixed(1)}°`;
  }
  updateMobileCoords(wx, wy, extra);

  // Přetahování objektu v precision mode
  if (state.dragging && state.dragObjIdx !== null && state.objects[state.dragObjIdx]) {
    const obj = state.objects[state.dragObjIdx];
    const dx = wx - state.dragStartWorld.x;
    const dy = wy - state.dragStartWorld.y;
    if (state.dragObjSnapshot) {
      const snapShot = JSON.parse(state.dragObjSnapshot);
      Object.assign(obj, snapShot);
    }
    moveObject(obj, dx, dy);
  }

  renderAll();
}

function hidePrecisionCrosshair() {
  precisionEl.style.display = "none";
  touchState.precisionMode = false;
  if (touchState.longPressTimer) {
    clearTimeout(touchState.longPressTimer);
    touchState.longPressTimer = null;
  }
}

// ── Touch start ──
drawCanvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const touches = e.touches;

    if (touches.length === 2) {
      // Pinch zoom / dvouprstý posun
      touchState.wasMultiTouch = true;
      touchState.singlePanning = false;
      hidePrecisionCrosshair();
      const t1 = getTouchPos(touches[0]);
      const t2 = getTouchPos(touches[1]);
      touchState.pinchStartDist = Math.hypot(
        t1.sx - t2.sx,
        t1.sy - t2.sy,
      );
      touchState.pinchStartZoom = state.zoom;
      touchState.pinchMidX = (t1.sx + t2.sx) / 2;
      touchState.pinchMidY = (t1.sy + t2.sy) / 2;
      touchState.panStartX =
        (touches[0].clientX + touches[1].clientX) / 2;
      touchState.panStartY =
        (touches[0].clientY + touches[1].clientY) / 2;
      touchState.panStartPX = state.panX;
      touchState.panStartPY = state.panY;
      touchState.panActive = true;
      return;
    }

    if (touches.length === 1) {
      const tp = getTouchPos(touches[0]);
      state.mouse.sx = tp.sx;
      state.mouse.sy = tp.sy;
      let [wx, wy] = screenToWorld(tp.sx, tp.sy);
      if (state.snapToPoints)
        [wx, wy] = snapPt(wx, wy);
      state.mouse.x = wx;
      state.mouse.y = wy;
      updateMobileCoords(wx, wy);

      // Zapamatovat start pro detekci tah vs. tap
      touchState.singleTouchStartX = touches[0].clientX;
      touchState.singleTouchStartY = touches[0].clientY;
      touchState.singleTouchStartPanX = state.panX;
      touchState.singleTouchStartPanY = state.panY;
      touchState.singlePanning = false;
      touchState.touchMoved = false;
      touchState.touchStartTime = Date.now();

      // Long-press timer pro precision crosshair
      if (touchState.longPressTimer) clearTimeout(touchState.longPressTimer);
      // Uložit touch coords – reference na Touch objekt může být invalidní po eventu
      const savedClientX = touches[0].clientX;
      const savedClientY = touches[0].clientY;
      touchState.longPressTimer = setTimeout(() => {
        if (
          !touchState.touchMoved &&
          !touchState.singlePanning &&
          !touchState.wasMultiTouch
        ) {
          touchState.precisionMode = true;
          try { safeVibrate(VIBRATE_LONG_PRESS); } catch (_) {}
          showPrecisionCrosshair({ clientX: savedClientX, clientY: savedClientY });
        }
      }, LONG_PRESS_MS);

      renderAll();
    }
  },
  { passive: false },
);

// ── Touch move ──
drawCanvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    const touches = e.touches;

    if (touches.length === 2 && touchState.panActive) {
      // Pinch zoom
      const t1 = getTouchPos(touches[0]);
      const t2 = getTouchPos(touches[1]);
      const dist = Math.hypot(t1.sx - t2.sx, t1.sy - t2.sy);
      const factor = dist / touchState.pinchStartDist;
      const newZoom = Math.max(
        ZOOM_MIN,
        Math.min(ZOOM_MAX, touchState.pinchStartZoom * factor),
      );

      // Zoom kolem středu pinche
      const midSX = touchState.pinchMidX;
      const midSY = touchState.pinchMidY;
      state.zoom = newZoom;
      state.panX =
        midSX -
        (midSX - touchState.panStartPX) *
          (newZoom / touchState.pinchStartZoom);
      state.panY =
        midSY -
        (midSY - touchState.panStartPY) *
          (newZoom / touchState.pinchStartZoom);

      // Dvouprstý posun
      const curMidX = (touches[0].clientX + touches[1].clientX) / 2;
      const curMidY = (touches[0].clientY + touches[1].clientY) / 2;
      state.panX += curMidX - touchState.panStartX;
      state.panY += curMidY - touchState.panStartY;
      touchState.panStartX = curMidX;
      touchState.panStartY = curMidY;

      document.getElementById("statusZoom").textContent =
        `Zoom: ${(state.zoom * 100).toFixed(0)}%`;
      renderAll();
      return;
    }

    if (touches.length === 1) {
      const tp = getTouchPos(touches[0]);
      const moveDistPx = Math.hypot(
        touches[0].clientX - touchState.singleTouchStartX,
        touches[0].clientY - touchState.singleTouchStartY,
      );

      // Cancel long-press timer if moved before activation
      if (
        !touchState.precisionMode &&
        touchState.longPressTimer &&
        moveDistPx > TOUCH_MOVE_THRESHOLD
      ) {
        clearTimeout(touchState.longPressTimer);
        touchState.longPressTimer = null;
      }

      // Precision crosshair mode – finger moves the offset crosshair
      if (touchState.precisionMode) {
        touchState.touchMoved = true;
        updatePrecisionCrosshair(touches[0]);
        return;
      }

      // Pokud můžeme panovat jedním prstem a pohyb překročí práh
      if (
        canSingleFingerPan() &&
        (touchState.singlePanning || moveDistPx > PAN_ACTIVATE_THRESHOLD)
      ) {
        touchState.singlePanning = true;
        touchState.touchMoved = true;
        state.panX =
          touchState.singleTouchStartPanX +
          (touches[0].clientX - touchState.singleTouchStartX);
        state.panY =
          touchState.singleTouchStartPanY +
          (touches[0].clientY - touchState.singleTouchStartY);
        renderAll();

        // Aktualizovat souřadnice pod prstem
        let [wx, wy] = screenToWorld(tp.sx, tp.sy);
        updateMobileCoords(wx, wy);
        return;
      }

      // Při kreslení/draggingu: aktualizovat pozici myši
      state.mouse.sx = tp.sx;
      state.mouse.sy = tp.sy;
      let [wx, wy] = screenToWorld(tp.sx, tp.sy);
      if (state.snapToPoints)
        [wx, wy] = snapPt(wx, wy);
      state.mouse.x = wx;
      state.mouse.y = wy;

      if (moveDistPx > TOUCH_MOVE_THRESHOLD) touchState.touchMoved = true;

      let extra = "";
      if (state.drawing && state.tempPoints.length > 0) {
        const ref = state.tempPoints[state.tempPoints.length - 1];
        const ddx = wx - ref.x,
          ddy = wy - ref.y;
        const dist = Math.hypot(ddx, ddy);
        const ang = (Math.atan2(ddy, ddx) * 180) / Math.PI;
        extra = `  d=${dist.toFixed(1)} ∠${ang.toFixed(1)}°`;
      }
      updateMobileCoords(wx, wy, extra);

      // Přetahování objektu
      if (state.dragging && state.dragObjIdx !== null && state.objects[state.dragObjIdx]) {
        const obj = state.objects[state.dragObjIdx];
        const dx = wx - state.dragStartWorld.x;
        const dy = wy - state.dragStartWorld.y;
        if (state.dragObjSnapshot) {
          const snapShot = JSON.parse(state.dragObjSnapshot);
          Object.assign(obj, snapShot);
        }
        moveObject(obj, dx, dy);
      }

      renderAll();
    }
  },
  { passive: false },
);

// ── Touch end ──
drawCanvas.addEventListener(
  "touchend",
  (e) => {
    e.preventDefault();

    // Clear long-press timer
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
      touchState.longPressTimer = null;
    }

    // Po pinch zoomu (2→1 prst nebo 2→0): neskákat, resetovat stav
    if (touchState.wasMultiTouch) {
      if (e.touches.length === 1) {
        // Zbyl jeden prst – přenastavit referenci aby nedošlo ke skoku
        touchState.singleTouchStartX = e.touches[0].clientX;
        touchState.singleTouchStartY = e.touches[0].clientY;
        touchState.singleTouchStartPanX = state.panX;
        touchState.singleTouchStartPanY = state.panY;
        touchState.singlePanning = false;
        touchState.touchMoved = true; // zabránit kliknutí
        touchState.panActive = false;
        return;
      }
      if (e.touches.length === 0) {
        touchState.panActive = false;
        touchState.wasMultiTouch = false;
        touchState.singlePanning = false;
        touchState.touchMoved = false;
        hidePrecisionCrosshair();
        return;
      }
    }

    if (e.touches.length === 0 && touchState.panActive) {
      touchState.panActive = false;
      hidePrecisionCrosshair();
      return;
    }

    // Precision crosshair – register click at crosshair position
    if (touchState.precisionMode && e.changedTouches.length === 1) {
      const wx = state.mouse.x;
      const wy = state.mouse.y;
      hidePrecisionCrosshair();
      handleCanvasClick(wx, wy);
      updateMobileCoords(wx, wy);
      touchState.touchMoved = false;
      touchState.singlePanning = false;
      if (e.touches.length === 0) touchState.wasMultiTouch = false;
      return;
    }

    // Pokud jsme panovali jedním prstem, nedělat klik
    if (touchState.singlePanning) {
      touchState.singlePanning = false;
      if (e.touches.length === 0) {
        touchState.wasMultiTouch = false;
      }
      return;
    }

    // Jednoprstový tap = klik (jen pokud nebylo panning dvěma prsty a nepohybovali jsme se)
    if (
      e.changedTouches.length === 1 &&
      !touchState.panActive &&
      !touchState.wasMultiTouch &&
      !touchState.touchMoved
    ) {
      const tp = getTouchPos(e.changedTouches[0]);
      state.mouse.sx = tp.sx;
      state.mouse.sy = tp.sy;
      let [wx, wy] = screenToWorld(tp.sx, tp.sy);
      if (state.snapToPoints)
        [wx, wy] = snapPt(wx, wy);
      state.mouse.x = wx;
      state.mouse.y = wy;

      // Simulovat mousedown logiku
      handleCanvasClick(wx, wy);
      updateMobileCoords(wx, wy);
    }

    if (e.touches.length < 2) {
      touchState.panActive = false;
    }
    if (e.touches.length === 0) {
      touchState.wasMultiTouch = false;
      touchState.singlePanning = false;
      touchState.touchMoved = false;
    }
  },
  { passive: false },
);

// Prevent default touch on body to avoid scroll/zoom
document.body.addEventListener(
  "touchmove",
  (e) => {
    if (e.target.closest("#canvasWrap")) {
      e.preventDefault();
    }
  },
  { passive: false },
);

// ── Bridge registrace pro cyklické závislosti ──
bridge.updateMobileCancelBtn = updateMobileCancelBtn;
bridge.updateMobileCoords = updateMobileCoords;
bridge.updatePolylineButtons = updatePolylineButtons;
