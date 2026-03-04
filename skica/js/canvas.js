// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Canvas setup, souřadnicové transformace, snap      ║
// ╚══════════════════════════════════════════════════════════════╝

const wrap = document.getElementById("canvasWrap");
const gridCanvas = document.getElementById("gridCanvas");
const drawCanvas = document.getElementById("drawCanvas");
const gridCtx = gridCanvas.getContext("2d");
const ctx = drawCanvas.getContext("2d");

function resizeCanvases() {
  const w = wrap.clientWidth,
    h = wrap.clientHeight;
  [gridCanvas, drawCanvas].forEach((c) => {
    c.width = w;
    c.height = h;
  });
  if (state.panX === 0 && state.panY === 0) {
    state.panX = w / 2;
    state.panY = h / 2;
  }
  renderAll();
}

window.addEventListener("resize", resizeCanvases);

// ── Souřadnicové transformace ──
function worldToScreen(wx, wy) {
  return [wx * state.zoom + state.panX, -wy * state.zoom + state.panY];
}

function screenToWorld(sx, sy) {
  return [
    (sx - state.panX) / state.zoom,
    -(sy - state.panY) / state.zoom,
  ];
}

function snap(val) {
  if (!state.snapToGrid) return val;
  return Math.round(val / state.gridSize) * state.gridSize;
}

function snapPt(wx, wy) {
  // Snap k bodům objektů (koncové body, středy)
  if (state.snapToPoints) {
    const threshold = 8 / state.zoom;
    let bestD = threshold,
      bestX = null,
      bestY = null;
    for (const obj of state.objects) {
      const pts = getObjectSnapPoints(obj);
      for (const p of pts) {
        const d = Math.hypot(p.x - wx, p.y - wy);
        if (d < bestD) {
          bestD = d;
          bestX = p.x;
          bestY = p.y;
        }
      }
    }
    // Snap k průsečíkům
    for (const pt of state.intersections) {
      const d = Math.hypot(pt.x - wx, pt.y - wy);
      if (d < bestD) {
        bestD = d;
        bestX = pt.x;
        bestY = pt.y;
      }
    }
    if (bestX !== null) {
      state.mouse.snapped = true;
      state.mouse.snapType = 'point';
      return [bestX, bestY];
    }
  }
  if (state.snapToGrid) {
    state.mouse.snapped = true;
    state.mouse.snapType = 'grid';
    return [snap(wx), snap(wy)];
  }
  state.mouse.snapped = false;
  state.mouse.snapType = '';
  return [wx, wy];
}
