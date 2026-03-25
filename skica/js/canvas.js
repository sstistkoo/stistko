// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Canvas setup, souřadnicové transformace, snap      ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, showToast } from './state.js';
import { getObjectSnapPoints, isAngleBetween } from './utils.js';
import { renderAll } from './render.js';

export const wrap = document.getElementById("canvasWrap");
export const drawCanvas = document.getElementById("drawCanvas");
export const ctx = drawCanvas.getContext("2d");

export function resizeCanvases() {
  const w = wrap.clientWidth,
    h = wrap.clientHeight;
  drawCanvas.width = w;
  drawCanvas.height = h;
  if (state.panX === 0 && state.panY === 0) {
    state.panX = w / 2;
    state.panY = h / 2;
  }
  renderAll();
}

window.addEventListener("resize", resizeCanvases);

// ── Souřadnicové transformace ──
export function worldToScreen(wx, wy) {
  return [wx * state.zoom + state.panX, -wy * state.zoom + state.panY];
}

export function screenToWorld(sx, sy) {
  const z = state.zoom || 1;
  return [
    (sx - state.panX) / z,
    -(sy - state.panY) / z,
  ];
}

export function snapPt(wx, wy) {
  let objX = null, objY = null, objD = Infinity;

  // Snap k bodům objektů a průsečíkům – větší poloměr zachycení
  if (state.snapToPoints) {
    const threshold = 20 / state.zoom;
    for (const obj of state.objects) {
      const pts = getObjectSnapPoints(obj);
      for (const p of pts) {
        const d = Math.hypot(p.x - wx, p.y - wy);
        if (d < threshold && d < objD) {
          objD = d;
          objX = p.x;
          objY = p.y;
        }
      }
    }
    // Průsečíky mají bonus – při stejné vzdálenosti vyhrávají
    for (const pt of state.intersections) {
      const d = Math.hypot(pt.x - wx, pt.y - wy);
      if (d < threshold && d <= objD) {
        objD = d;
        objX = pt.x;
        objY = pt.y;
      }
    }
  }

  // Body/průsečíky – snap k bodům objektů
  if (objX !== null) {
    // Vibrace při snapnutí k bodu (jen pokud se snapType změnil)
    if (state.mouse.snapType !== 'point' && navigator.vibrate) {
      try { navigator.vibrate(15); } catch (_) {}
    }
    state.mouse.snapped = true;
    state.mouse.snapType = 'point';
    return [objX, objY];
  }

  state.mouse.snapped = false;
  state.mouse.snapType = '';
  return [wx, wy];
}

// ── Auto-center: vycentrovat pohled na všechny objekty ──
export function autoCenterView() {
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
      case "arc": {
        // Precise arc bounding box based on actual sweep
        const pts = [
          { x: obj.cx + obj.r * Math.cos(obj.startAngle), y: obj.cy + obj.r * Math.sin(obj.startAngle) },
          { x: obj.cx + obj.r * Math.cos(obj.endAngle),   y: obj.cy + obj.r * Math.sin(obj.endAngle) },
        ];
        // Check cardinal angles (0, 90, 180, 270) within sweep
        for (let ca = 0; ca < 4; ca++) {
          const ang = ca * Math.PI / 2;
          if (isAngleBetween(ang, obj.startAngle, obj.endAngle)) {
            pts.push({ x: obj.cx + obj.r * Math.cos(ang), y: obj.cy + obj.r * Math.sin(ang) });
          }
        }
        for (const p of pts) {
          minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        }
        break;
      }
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
