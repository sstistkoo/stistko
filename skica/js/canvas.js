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

// ── Auto-center: vycentrovat pohled na všechny objekty ──
function autoCenterView() {
  if (state.objects.length === 0) {
    // Nic nakresleno – reset na výchozí pozici
    state.zoom = 1;
    state.panX = drawCanvas.width / 2;
    state.panY = drawCanvas.height / 2;
    renderAll();
    showToast("Pohled vycentrován (prázdný)");
    return;
  }

  // Najít bounding box všech objektů
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const obj of state.objects) {
    switch (obj.type) {
      case "point":
        minX = Math.min(minX, obj.x);
        maxX = Math.max(maxX, obj.x);
        minY = Math.min(minY, obj.y);
        maxY = Math.max(maxY, obj.y);
        break;
      case "line":
      case "constr":
      case "rect":
        minX = Math.min(minX, obj.x1, obj.x2);
        maxX = Math.max(maxX, obj.x1, obj.x2);
        minY = Math.min(minY, obj.y1, obj.y2);
        maxY = Math.max(maxY, obj.y1, obj.y2);
        break;
      case "circle":
        minX = Math.min(minX, obj.cx - obj.r);
        maxX = Math.max(maxX, obj.cx + obj.r);
        minY = Math.min(minY, obj.cy - obj.r);
        maxY = Math.max(maxY, obj.cy + obj.r);
        break;
      case "arc":
        minX = Math.min(minX, obj.cx - obj.r);
        maxX = Math.max(maxX, obj.cx + obj.r);
        minY = Math.min(minY, obj.cy - obj.r);
        maxY = Math.max(maxY, obj.cy + obj.r);
        break;
    }
  }

  if (!isFinite(minX)) return;

  const bboxW = maxX - minX || 1;
  const bboxH = maxY - minY || 1;
  const canvasW = drawCanvas.width;
  const canvasH = drawCanvas.height;
  const padding = 0.15; // 15% okraj

  // Zoom aby se vše vešlo
  const zoomX = (canvasW * (1 - 2 * padding)) / bboxW;
  const zoomY = (canvasH * (1 - 2 * padding)) / bboxH;
  state.zoom = Math.min(zoomX, zoomY);

  // Pan aby střed bboxu byl uprostřed canvasu
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  state.panX = canvasW / 2 - centerX * state.zoom;
  state.panY = canvasH / 2 + centerY * state.zoom;

  document.getElementById("statusZoom").textContent =
    `Zoom: ${(state.zoom * 100).toFixed(0)}%`;
  renderAll();
  showToast("Pohled vycentrován");
}
