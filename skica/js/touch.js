// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Dotyková podpora + mobilní ovládání               ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Mobile: detekce ──
const isMobile = () => window.innerWidth <= 900;

// ── Mobile: Toolbar toggle ──
const mobileToolbarToggle = document.getElementById("mobileToolbarToggle");
const topbar = document.getElementById("topbar");
mobileToolbarToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  topbar.classList.toggle("mobile-open");
  sidebar.classList.remove("mobile-open");
  sidebarOverlay.classList.remove("active");
});
topbar.addEventListener("click", (e) => {
  if (isMobile() && e.target.closest(".tool-btn")) {
    setTimeout(() => topbar.classList.remove("mobile-open"), 150);
  }
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
});
sidebarOverlay.addEventListener("click", () => {
  sidebar.classList.remove("mobile-open");
  sidebarOverlay.classList.remove("active");
});

// ── Mobile: coord bar ──
const mobileCoordBar = document.getElementById("mobileCoordBar");

function updateMobileCoords(wx, wy, extra) {
  extra = extra || "";
  const text = `X: ${wx.toFixed(3)}   Z: ${wy.toFixed(3)}${extra}`;
  mobileCoordBar.textContent = text;
  document.getElementById("coordDisplay").textContent = text;
}

// ── Mobile: Numerický vstup tlačítko ──
document
  .getElementById("mobileNumInput")
  .addEventListener("click", (e) => {
    e.stopPropagation();
    topbar.classList.remove("mobile-open");
    sidebar.classList.remove("mobile-open");
    sidebarOverlay.classList.remove("active");
    showNumericalInputDialog();
  });

// ── Mobile: Měření tlačítko ──
const mobileMeasureBtn = document.getElementById("mobileMeasure");
mobileMeasureBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  topbar.classList.remove("mobile-open");
  sidebar.classList.remove("mobile-open");
  sidebarOverlay.classList.remove("active");
  const newTool = state.tool === "measure" ? "select" : "measure";
  setTool(newTool);
  mobileMeasureBtn.classList.toggle("active", newTool === "measure");
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
  sidebar.classList.remove("mobile-open");
  sidebarOverlay.classList.remove("active");
  showMobileEditDialog();
});

// ── Touch state ──
const PRECISION_OFFSET_Y = -80; // crosshair 80px above finger

let touchState = {
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
  const chSy = touch.clientY - rect.top + PRECISION_OFFSET_Y;

  let [wx, wy] = screenToWorld(chSx, chSy);
  if (state.snapToGrid || state.snapToPoints) [wx, wy] = snapPt(wx, wy);
  state.mouse.x = wx;
  state.mouse.y = wy;
  state.mouse.sx = chSx;
  state.mouse.sy = chSy;

  precisionEl.style.left = touch.clientX + "px";
  precisionEl.style.top = touch.clientY + PRECISION_OFFSET_Y + "px";
  precisionLabel.textContent = `X${wx.toFixed(3)} Z${wy.toFixed(3)}`;
  precisionEl.style.display = "block";
  updateMobileCoords(wx, wy);
  renderAll();
}

function updatePrecisionCrosshair(touch) {
  const rect = drawCanvas.getBoundingClientRect();
  const chSx = touch.clientX - rect.left;
  const chSy = touch.clientY - rect.top + PRECISION_OFFSET_Y;

  let [wx, wy] = screenToWorld(chSx, chSy);
  if (state.snapToGrid || state.snapToPoints) [wx, wy] = snapPt(wx, wy);
  state.mouse.x = wx;
  state.mouse.y = wy;
  state.mouse.sx = chSx;
  state.mouse.sy = chSy;

  precisionEl.style.left = touch.clientX + "px";
  precisionEl.style.top = touch.clientY + PRECISION_OFFSET_Y + "px";
  precisionLabel.textContent = `X${wx.toFixed(3)} Z${wy.toFixed(3)}`;

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

  // Přetahování objektu v precision mode
  if (state.dragging && state.dragObjIdx !== null) {
    const obj = state.objects[state.dragObjIdx];
    const dx = wx - state.dragStartWorld.x;
    const dy = wy - state.dragStartWorld.y;
    const snapShot = JSON.parse(state.dragObjSnapshot);
    Object.assign(obj, snapShot);
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
      if (state.snapToGrid || state.snapToPoints)
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
          if (navigator.vibrate) navigator.vibrate(30);
          showPrecisionCrosshair({ clientX: savedClientX, clientY: savedClientY });
        }
      }, 400);

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
        0.05,
        Math.min(200, touchState.pinchStartZoom * factor),
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
        moveDistPx > 5
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
        (touchState.singlePanning || moveDistPx > 10)
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
      if (state.snapToGrid || state.snapToPoints)
        [wx, wy] = snapPt(wx, wy);
      state.mouse.x = wx;
      state.mouse.y = wy;

      if (moveDistPx > 5) touchState.touchMoved = true;

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
      if (state.dragging && state.dragObjIdx !== null) {
        const obj = state.objects[state.dragObjIdx];
        const dx = wx - state.dragStartWorld.x;
        const dy = wy - state.dragStartWorld.y;
        const snapShot = JSON.parse(state.dragObjSnapshot);
        Object.assign(obj, snapShot);
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
      if (state.snapToGrid || state.snapToPoints)
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
