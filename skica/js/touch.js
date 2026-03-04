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

// ── Touch state ──
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
};

function getTouchPos(touch) {
  const rect = drawCanvas.getBoundingClientRect();
  return {
    sx: touch.clientX - rect.left,
    sy: touch.clientY - rect.top,
  };
}

// ── Touch start ──
drawCanvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const touches = e.touches;

    if (touches.length === 2) {
      touchState.wasMultiTouch = true;
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
      const t1 = getTouchPos(touches[0]);
      const t2 = getTouchPos(touches[1]);
      const dist = Math.hypot(t1.sx - t2.sx, t1.sy - t2.sy);
      const factor = dist / touchState.pinchStartDist;
      const newZoom = Math.max(
        0.05,
        Math.min(200, touchState.pinchStartZoom * factor),
      );

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
      state.mouse.sx = tp.sx;
      state.mouse.sy = tp.sy;
      let [wx, wy] = screenToWorld(tp.sx, tp.sy);
      if (state.snapToGrid || state.snapToPoints)
        [wx, wy] = snapPt(wx, wy);
      state.mouse.x = wx;
      state.mouse.y = wy;

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

    if (e.touches.length === 0 && touchState.panActive) {
      touchState.panActive = false;
      return;
    }

    if (
      e.changedTouches.length === 1 &&
      !touchState.panActive &&
      !touchState.wasMultiTouch
    ) {
      const tp = getTouchPos(e.changedTouches[0]);
      state.mouse.sx = tp.sx;
      state.mouse.sy = tp.sy;
      let [wx, wy] = screenToWorld(tp.sx, tp.sy);
      if (state.snapToGrid || state.snapToPoints)
        [wx, wy] = snapPt(wx, wy);
      state.mouse.x = wx;
      state.mouse.y = wy;

      handleCanvasClick(wx, wy);
      updateMobileCoords(wx, wy);
    }

    if (e.touches.length < 2) {
      touchState.panActive = false;
    }
    if (e.touches.length === 0) {
      touchState.wasMultiTouch = false;
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
