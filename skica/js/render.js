// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Renderování (mřížka, objekty, kóty, snap)         ║
// ╚══════════════════════════════════════════════════════════════╝

import { drawCanvas, ctx, worldToScreen, screenToWorld } from './canvas.js';
import { state, toDisplayCoords, displayX, xPrefix, fmtCoordLabel } from './state.js';
import { bridge } from './bridge.js';
import { bulgeToArc } from './utils.js';
import { projectPointToLine } from './geometry.js';
import {
  COLORS, GRID_BASE_STEP, GRID_MIN_PX, LINE_WIDTH, LINE_WIDTH_SELECTED,
  CONSTRUCTION_DASH, PREVIEW_DASH, ARROW_LENGTH, ARROW_ANGLE
} from './constants.js';

const DIM_MATCH_TOL = 1e-4;
/** Zjistí, zda kóta (isDimension) vychází z některého vybraného bodu. */
function isDimConnectedToPoints(obj, pts) {
  if (!obj.isDimension || !pts || pts.length === 0) return false;
  const sx1 = obj.dimSrcX1 !== undefined ? obj.dimSrcX1 : obj.x1;
  const sy1 = obj.dimSrcY1 !== undefined ? obj.dimSrcY1 : obj.y1;
  const sx2 = obj.dimSrcX2 !== undefined ? obj.dimSrcX2 : obj.x2;
  const sy2 = obj.dimSrcY2 !== undefined ? obj.dimSrcY2 : obj.y2;
  return pts.some(pt =>
    Math.hypot(sx1 - pt.x, sy1 - pt.y) < DIM_MATCH_TOL
    || Math.hypot(sx2 - pt.x, sy2 - pt.y) < DIM_MATCH_TOL
  );
}

let _renderRAF = null;
// Kolekce umístěných popisků kót pro detekci kolizí
let _dimLabelRects = [];
/** Naplánuje překreslení celého canvasu (requestAnimationFrame). */
export function renderAll() {
  if (_renderRAF) return;
  _renderRAF = requestAnimationFrame(() => {
    _renderRAF = null;
    renderObjects();
    renderAxes();
    renderAngleSnapGuide();
    // Aktualizovat mobilní Cancel tlačítko
    if (bridge.updateMobileCancelBtn) bridge.updateMobileCancelBtn();
    // Aktualizovat tlačítka Dokončit/Uzavřít konturu
    if (bridge.updatePolylineButtons) bridge.updatePolylineButtons();
  });
}

let _renderDebounceTimer = null;
/**
 * Debounced renderAll — pro rychlé UI změny (barva, vlastnosti).
 * Seskupí vícenásobná volání do jednoho renderAll po uplynutí delay.
 */
export function renderAllDebounced(delay = 32) {
  clearTimeout(_renderDebounceTimer);
  _renderDebounceTimer = setTimeout(() => {
    _renderDebounceTimer = null;
    renderAll();
  }, delay);
}

// ── Viewport Culling ──

/** Vrátí AABB objektu ve world souřadnicích, nebo null. */
function getObjectBounds(obj) {
  switch (obj.type) {
    case 'point':
      return { minX: obj.x - 1, minY: obj.y - 1, maxX: obj.x + 1, maxY: obj.y + 1 };
    case 'line':
    case 'constr': {
      let lMinX = Math.min(obj.x1, obj.x2);
      let lMinY = Math.min(obj.y1, obj.y2);
      let lMaxX = Math.max(obj.x1, obj.x2);
      let lMaxY = Math.max(obj.y1, obj.y2);
      // Kóty mají zdrojové body pro odkazové čáry
      if (obj.isDimension && obj.dimSrcX1 !== undefined) {
        lMinX = Math.min(lMinX, obj.dimSrcX1, obj.dimSrcX2);
        lMinY = Math.min(lMinY, obj.dimSrcY1, obj.dimSrcY2);
        lMaxX = Math.max(lMaxX, obj.dimSrcX1, obj.dimSrcX2);
        lMaxY = Math.max(lMaxY, obj.dimSrcY1, obj.dimSrcY2);
      }
      return { minX: lMinX, minY: lMinY, maxX: lMaxX, maxY: lMaxY };
    }
    case 'circle':
      return {
        minX: obj.cx - obj.r, minY: obj.cy - obj.r,
        maxX: obj.cx + obj.r, maxY: obj.cy + obj.r,
      };
    case 'arc':
      return {
        minX: obj.cx - obj.r, minY: obj.cy - obj.r,
        maxX: obj.cx + obj.r, maxY: obj.cy + obj.r,
      };
    case 'rect':
      return {
        minX: Math.min(obj.x1, obj.x2), minY: Math.min(obj.y1, obj.y2),
        maxX: Math.max(obj.x1, obj.x2), maxY: Math.max(obj.y1, obj.y2),
      };
    case 'polyline': {
      if (!obj.vertices || obj.vertices.length === 0) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const v of obj.vertices) {
        if (v.x < minX) minX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.x > maxX) maxX = v.x;
        if (v.y > maxY) maxY = v.y;
      }
      if (obj.bulges) {
        const n = obj.vertices.length;
        const segCount = obj.closed ? n : n - 1;
        for (let i = 0; i < segCount; i++) {
          const b = obj.bulges[i] || 0;
          if (b !== 0) {
            const p1 = obj.vertices[i];
            const p2 = obj.vertices[(i + 1) % n];
            const arc = bulgeToArc(p1, p2, b);
            if (arc) {
              if (arc.cx - arc.r < minX) minX = arc.cx - arc.r;
              if (arc.cy - arc.r < minY) minY = arc.cy - arc.r;
              if (arc.cx + arc.r > maxX) maxX = arc.cx + arc.r;
              if (arc.cy + arc.r > maxY) maxY = arc.cy + arc.r;
            }
          }
        }
      }
      return { minX, minY, maxX, maxY };
    }
    case 'text': {
      // Přibližné bounds textu (šířka závisí na délce textu)
      const approxW = (obj.text || '').length * (obj.fontSize || 14) * 0.6;
      const approxH = (obj.fontSize || 14);
      return {
        minX: obj.x, minY: obj.y - approxH,
        maxX: obj.x + approxW, maxY: obj.y,
      };
    }
    default:
      return null;
  }
}

/** Vrátí viewport bounds ve world souřadnicích s marginem pro hladký pohled. */
function getViewportBounds() {
  const [wx1, wy1] = screenToWorld(0, drawCanvas.height);
  const [wx2, wy2] = screenToWorld(drawCanvas.width, 0);
  const marginX = Math.abs(wx2 - wx1) * 0.05;
  const marginY = Math.abs(wy2 - wy1) * 0.05;
  return {
    minX: Math.min(wx1, wx2) - marginX,
    minY: Math.min(wy1, wy2) - marginY,
    maxX: Math.max(wx1, wx2) + marginX,
    maxY: Math.max(wy1, wy2) + marginY,
  };
}

/** Testuje překrytí dvou AABB. */
function boundsOverlap(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX &&
         a.minY <= b.maxY && a.maxY >= b.minY;
}

// ── Osy ──
function renderAxes() {
  const w = drawCanvas.width,
    h = drawCanvas.height;
  const g = ctx;

  // Adaptive step for axis labels
  const baseStep = GRID_BASE_STEP * state.zoom;
  let drawStep = baseStep,
    drawGridSize = GRID_BASE_STEP;
  while (drawStep < GRID_MIN_PX) {
    drawStep *= 2;
    drawGridSize *= 2;
  }

  // Osy – barvy podle typu stroje
  const isKarusel = state.machineType === 'karusel';
  const hColor = isKarusel ? COLORS.axisV : COLORS.axisH;
  const vColor = isKarusel ? COLORS.axisH : COLORS.axisV;
  const hLabel = isKarusel ? 'X' : 'Z';
  const vLabel = isKarusel ? 'Z' : 'X';

  g.lineWidth = LINE_WIDTH;
  g.strokeStyle = hColor + '55';
  g.beginPath();
  g.moveTo(0, state.panY);
  g.lineTo(w, state.panY);
  g.stroke();
  g.strokeStyle = vColor + '55';
  g.beginPath();
  g.moveTo(state.panX, 0);
  g.lineTo(state.panX, h);
  g.stroke();

  // Popisky os
  const startX = state.panX % drawStep,
    startY = state.panY % drawStep;
  g.font = "13px Consolas";
  g.fillStyle = COLORS.textMuted;
  for (let x = startX; x < w; x += drawStep) {
    const [wx] = screenToWorld(x, 0);
    const label = Math.round(wx / drawGridSize) * drawGridSize;
    if (label === 0) continue;
    const dispLabel = isKarusel ? displayX(label) : label;
    g.fillText(dispLabel.toString(), x + 2, state.panY - 5);
  }
  for (let y = startY; y < h; y += drawStep) {
    const [, wy] = screenToWorld(0, y);
    const label = Math.round(wy / drawGridSize) * drawGridSize;
    if (label === 0) continue;
    const dispLabel = isKarusel ? label : displayX(label);
    g.fillText(dispLabel.toString(), state.panX + 4, y - 3);
  }
  g.fillStyle = COLORS.selected;
  g.font = "14px Consolas";
  g.fillText("0", state.panX + 4, state.panY - 5);

  // Origin marker – terčík na 0,0
  g.strokeStyle = COLORS.selected + '88';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(state.panX, state.panY, 6, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(state.panX - 10, state.panY);
  g.lineTo(state.panX + 10, state.panY);
  g.moveTo(state.panX, state.panY - 10);
  g.lineTo(state.panX, state.panY + 10);
  g.stroke();

  // Popisky os X a Z
  g.font = "bold 14px Consolas";
  g.fillStyle = hColor;
  g.fillText(hLabel, w - 18, state.panY - 8);
  g.fillStyle = vColor;
  g.fillText(vLabel, state.panX + 8, 16);

  // ── Nulový bod – středový kříž v offsetové pozici ──
  if (state.nullPointActive) {
    const [npx, npy] = worldToScreen(state.incReference.x, state.incReference.y);
    const npColor = '#fab387'; // Oranžová – odlišná od hlavního kříže
    const angleRad = (state.nullPointAngle || 0) * Math.PI / 180;
    const hasAngle = state.nullPointAngle !== 0;

    // Čárkované osy přes celý canvas (rotované)
    g.strokeStyle = npColor + '44';
    g.lineWidth = 1;
    g.setLineDash([8, 6]);

    if (!hasAngle) {
      // Bez natočení – vodorovná a svislá čára
      g.beginPath();
      g.moveTo(0, npy);
      g.lineTo(w, npy);
      g.stroke();
      g.beginPath();
      g.moveTo(npx, 0);
      g.lineTo(npx, h);
      g.stroke();
    } else {
      // S natočením – rotované osy
      const maxLen = Math.hypot(w, h);
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      // Osa 1 (vodorovná rotovaná)
      g.beginPath();
      g.moveTo(npx - cosA * maxLen, npy + sinA * maxLen);
      g.lineTo(npx + cosA * maxLen, npy - sinA * maxLen);
      g.stroke();
      // Osa 2 (svislá rotovaná = +90°)
      g.beginPath();
      g.moveTo(npx - sinA * maxLen, npy - cosA * maxLen);
      g.lineTo(npx + sinA * maxLen, npy + cosA * maxLen);
      g.stroke();
    }
    g.setLineDash([]);

    // Terčík na nulový bod
    g.strokeStyle = npColor + 'cc';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(npx, npy, 8, 0, Math.PI * 2);
    g.stroke();

    // Malý kříž (rotovaný)
    g.beginPath();
    if (!hasAngle) {
      g.moveTo(npx - 13, npy);
      g.lineTo(npx + 13, npy);
      g.moveTo(npx, npy - 13);
      g.lineTo(npx, npy + 13);
    } else {
      const c13 = 13 * Math.cos(angleRad);
      const s13 = 13 * Math.sin(angleRad);
      g.moveTo(npx - c13, npy + s13);
      g.lineTo(npx + c13, npy - s13);
      g.moveTo(npx - s13, npy - c13);
      g.lineTo(npx + s13, npy + c13);
    }
    g.stroke();

    // Popisek "0'" + úhel
    g.font = "bold 12px Consolas";
    g.fillStyle = npColor;
    const angleLabel = hasAngle ? `0' ∠${state.nullPointAngle}°` : "0'";
    g.fillText(angleLabel, npx + 10, npy - 10);
  }
}

// ── Vykreslení objektů ──
function renderObjects() {
  const w = drawCanvas.width,
    h = drawCanvas.height;
  ctx.clearRect(0, 0, w, h);
  _dimLabelRects = []; // Reset kolizních obdélníků kót

  // Dynamická velikost písma podle zoomu
  const labelSize = Math.round(Math.min(22, Math.max(14, 10 + state.zoom * 6)));

  // Viewport culling – spočítat viditelnou oblast
  const vp = getViewportBounds();

  state.objects.forEach((obj, idx) => {
    // Skip objects on invisible layers
    const layer = state.layers.find(l => l.id === obj.layer);
    if (layer && !layer.visible) return;

    // Skrýt kótovací objekty podle režimu zobrazení kót
    if (state.showDimensions === 'none' && (obj.isDimension || obj.isCoordLabel)) return;
    if (state.showDimensions === 'intersections' && obj.isDimension) return;

    // Viewport culling – přeskočit objekty mimo viditelnou oblast
    // Konstrukční čáry (nekonečné) se nekullují
    if (obj.type !== 'constr') {
      const bounds = getObjectBounds(obj);
      if (bounds && !boundsOverlap(bounds, vp)) return;
    }

    const isSel = idx === state.selected || state.multiSelected.has(idx);
    // Zvýraznění kót navázaných na vybraný bod/průsečík
    const isConnectedDim = !isSel && obj.isDimension && state.selectedPoint != null
      && isDimConnectedToPoints(obj, state.selectedPoint);
    const isConstr = obj.type === "constr";
    const layerColor = layer ? layer.color : COLORS.primary;
    ctx.strokeStyle = (isSel || isConnectedDim)
      ? COLORS.selected
      : isConstr
        ? COLORS.construction
        : obj.color || layerColor;
    ctx.fillStyle = (isSel || isConnectedDim)
      ? COLORS.selected
      : isConstr
        ? COLORS.construction
        : obj.color || layerColor;
    ctx.lineWidth = (isSel || isConnectedDim) ? LINE_WIDTH_SELECTED : LINE_WIDTH;
    ctx.setLineDash(isConstr || obj.dashed ? CONSTRUCTION_DASH : []);

    switch (obj.type) {
      case "point":
        drawPoint(obj);
        break;
      case "line":
      case "constr":
        drawLine(obj);
        break;
      case "circle":
        drawCircle(obj);
        break;
      case "arc":
        drawArc(obj);
        break;
      case "rect":
        drawRect(obj);
        break;
      case "polyline":
        drawPolyline(obj, isSel, obj.color || layerColor, idx);
        break;
      case "text":
        drawText(obj);
        break;
    }
    ctx.setLineDash([]);

    // Kóty
    if (state.showDimensions !== 'none' && !isConstr) drawDimension(obj);
  });

  // ── Vazební značky (constraints) ──
  drawConstraintMarkers();

  // Průsečíky
  if (state.showDimensions !== 'none') {
    state.intersections.forEach((pt) => {
      const [sx, sy] = worldToScreen(pt.x, pt.y);
      const isSelPt = state.selectedPoint != null
        && state.selectedPoint.some(sp => Math.hypot(pt.x - sp.x, pt.y - sp.y) < DIM_MATCH_TOL);
      const ptColor = isSelPt ? COLORS.selected : COLORS.dimension;
      ctx.fillStyle = ptColor;
      ctx.strokeStyle = ptColor;
      ctx.lineWidth = isSelPt ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
      const intSize = Math.round(Math.min(24, Math.max(11, 8 + state.zoom * 4.5)));
      ctx.font = intSize + 'px Consolas';
      const ptLabel = fmtCoordLabel(pt.x, pt.y);
      const labelW = ctx.measureText(ptLabel).width;
      const resolved = resolveDimLabelPos(sx + 8, sy - 8, labelW, intSize);
      if (resolved.collided) {
        ctx.strokeStyle = ptColor;
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 8, resolved.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = ptColor;
      }
      ctx.fillText(ptLabel, sx + 8, resolved.y);
    });
  }

  // Zakotvené body (červené kolečka)
  if (state.anchors && state.anchors.length > 0) {
    for (const a of state.anchors) {
      const [ax, ay] = worldToScreen(a.x, a.y);
      ctx.strokeStyle = COLORS.delete;  // červená
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ax, ay, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.delete;
      ctx.fill();
    }
  }

  // Dočasné kreslení
  if (state.drawing && state.tempPoints.length > 0) {
    ctx.strokeStyle = COLORS.preview;
    ctx.fillStyle = COLORS.preview;
    ctx.lineWidth = 1;
    ctx.setLineDash(PREVIEW_DASH);
    const tp = state.tempPoints;
    const [mx, my] = [state.mouse.x, state.mouse.y];

    if (
      state.tool === "line" ||
      state.tool === "constr" ||
      state.tool === "measure"
    ) {
      const [sx1, sy1] = worldToScreen(tp[0].x, tp[0].y);
      const [sx2, sy2] = worldToScreen(mx, my);
      // Počáteční bod – zvýrazněný
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.preview;
      ctx.beginPath();
      ctx.arc(sx1, sy1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.preview;
      ctx.lineWidth = 1;
      ctx.setLineDash(PREVIEW_DASH);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
      const d = Math.hypot(mx - tp[0].x, my - tp[0].y);
      const angle =
        (Math.atan2(my - tp[0].y, mx - tp[0].x) * 180) / Math.PI;
      ctx.setLineDash([]);
      ctx.font = `${labelSize}px Consolas`;
      ctx.fillText(
        `${d.toFixed(3)} mm  ${angle.toFixed(1)}°`,
        (sx1 + sx2) / 2 + 8,
        (sy1 + sy2) / 2 - 8,
      );
    }
    if (state.tool === "circle") {
      const [sx, sy] = worldToScreen(tp[0].x, tp[0].y);
      const rw = Math.hypot(mx - tp[0].x, my - tp[0].y);
      const r = rw * state.zoom;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `${labelSize}px Consolas`;
      ctx.fillText(`R ${rw.toFixed(3)}`, sx + r + 6, sy);
    }
    if (state.tool === "rect") {
      const [sx1, sy1] = worldToScreen(tp[0].x, tp[0].y);
      const [sx2, sy2] = worldToScreen(mx, my);
      ctx.beginPath();
      ctx.rect(
        Math.min(sx1, sx2),
        Math.min(sy1, sy2),
        Math.abs(sx2 - sx1),
        Math.abs(sy2 - sy1),
      );
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `${labelSize}px Consolas`;
      ctx.fillText(
        `${Math.abs(mx - tp[0].x).toFixed(1)} × ${Math.abs(my - tp[0].y).toFixed(1)}`,
        Math.max(sx1, sx2) + 6,
        Math.min(sy1, sy2) - 4,
      );
    }
    if (state.tool === "arc" && tp.length >= 2) {
      const cx = tp[0].x,
        cy = tp[0].y;
      const r = Math.hypot(tp[1].x - cx, tp[1].y - cy);
      const [scx, scy] = worldToScreen(cx, cy);
      const rr = r * state.zoom;
      const startAngle = -Math.atan2(tp[1].y - cy, tp[1].x - cx);
      const endAngle = -Math.atan2(my - cy, mx - cx);
      ctx.beginPath();
      ctx.arc(scx, scy, rr, startAngle, endAngle);
      ctx.stroke();
    }
    if (state.tool === "polyline" && tp.length >= 1) {
      // Draw already placed segments
      ctx.strokeStyle = COLORS.preview;
      ctx.lineWidth = LINE_WIDTH;
      ctx.setLineDash(PREVIEW_DASH);
      const tempBulges = state._polylineBulges || [];
      // Zvýrazněný startovací bod kontury
      const [sfx, sfy] = worldToScreen(tp[0].x, tp[0].y);
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.selected;
      ctx.beginPath();
      ctx.arc(sfx, sfy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.setLineDash(PREVIEW_DASH);
      for (let i = 0; i < tp.length - 1; i++) {
        const p1 = tp[i], p2 = tp[i + 1];
        const b = tempBulges[i] || 0;
        const [sx1, sy1] = worldToScreen(p1.x, p1.y);
        const [sx2, sy2] = worldToScreen(p2.x, p2.y);
        if (b === 0) {
          ctx.beginPath();
          ctx.moveTo(sx1, sy1);
          ctx.lineTo(sx2, sy2);
          ctx.stroke();
        } else {
          const arc = bulgeToArc(p1, p2, b);
          if (arc) {
            const [scx, scy] = worldToScreen(arc.cx, arc.cy);
            const sr = arc.r * state.zoom;
            ctx.beginPath();
            ctx.arc(scx, scy, sr, -arc.endAngle, -arc.startAngle, b < 0);
            ctx.stroke();
          }
        }
        // Vertex dots
        ctx.fillStyle = COLORS.preview;
        ctx.beginPath();
        ctx.arc(sx1, sy1, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Last placed vertex
      const lastPt = tp[tp.length - 1];
      const [slx, sly] = worldToScreen(lastPt.x, lastPt.y);
      ctx.fillStyle = COLORS.preview;
      ctx.beginPath();
      ctx.arc(slx, sly, 3, 0, Math.PI * 2);
      ctx.fill();
      // Preview line to cursor
      ctx.setLineDash(PREVIEW_DASH);
      ctx.strokeStyle = COLORS.preview;
      ctx.lineWidth = 1;
      const [smx, smy] = worldToScreen(mx, my);
      ctx.beginPath();
      ctx.moveTo(slx, sly);
      ctx.lineTo(smx, smy);
      ctx.stroke();
      // Koncový bod preview – zvýrazněný
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.preview;
      ctx.beginPath();
      ctx.arc(smx, smy, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Distance info
      const dd = Math.hypot(mx - lastPt.x, my - lastPt.y);
      const ang = (Math.atan2(my - lastPt.y, mx - lastPt.x) * 180) / Math.PI;
      ctx.setLineDash([]);
      ctx.font = `${labelSize}px Consolas`;
      ctx.fillStyle = COLORS.preview;
      ctx.fillText(
        `${dd.toFixed(3)} mm  ${ang.toFixed(1)}°  [${tp.length} bodů]`,
        (slx + smx) / 2 + 8,
        (sly + smy) / 2 - 8,
      );
    }
    if (state.tool === "tangent" && tp.length === 1) {
      // Preview: bod tečny – zobrazit bod
      const [sx1, sy1] = worldToScreen(tp[0].x, tp[0].y);
      ctx.fillStyle = COLORS.snapPoint;
      ctx.beginPath();
      ctx.arc(sx1, sy1, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.setLineDash([]);
      ctx.font = `${labelSize}px Consolas`;
      ctx.fillText("Bod tečny", sx1 + 8, sy1 - 8);
    }
    // Preview: Rovnoběžka
    if (state.tool === "parallel" && state._parallelRefIdx != null) {
      const refSeg = state._parallelRefSeg;
      if (refSeg) {
        const dx = refSeg.seg.x2 - refSeg.seg.x1;
        const dy = refSeg.seg.y2 - refSeg.seg.y1;
        const px1 = mx - dx / 2, py1 = my - dy / 2;
        const px2 = mx + dx / 2, py2 = my + dy / 2;
        const [sx1, sy1] = worldToScreen(px1, py1);
        const [sx2, sy2] = worldToScreen(px2, py2);
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
        // Vzdálenost od referenční úsečky
        const foot = projectPointToLine(mx, my, refSeg.seg.x1, refSeg.seg.y1, refSeg.seg.x2, refSeg.seg.y2);
        const dist = Math.hypot(mx - foot.x, my - foot.y);
        ctx.setLineDash([]);
        ctx.font = `${labelSize}px Consolas`;
        ctx.fillStyle = COLORS.primary;
        ctx.fillText(`∥ d=${dist.toFixed(2)}mm`, (sx1 + sx2) / 2 + 8, (sy1 + sy2) / 2 - 8);
      }
    }
    // Preview: Kóta (2 body)
    if (state.tool === "dimension" && tp.length === 1) {
      const [sx1, sy1] = worldToScreen(tp[0].x, tp[0].y);
      const [sx2, sy2] = worldToScreen(mx, my);
      const d = Math.hypot(mx - tp[0].x, my - tp[0].y);
      ctx.strokeStyle = COLORS.textSecondary;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
      // Šipky
      drawDimArrow(sx1, sy1, sx2, sy2);
      drawDimArrow(sx2, sy2, sx1, sy1);
      ctx.setLineDash([]);
      ctx.font = `${labelSize}px Consolas`;
      ctx.fillStyle = COLORS.textSecondary;
      const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
      const nx = -Math.sin(angle) * 14, ny = Math.cos(angle) * 14;
      ctx.fillText(`${d.toFixed(2)}mm`, (sx1 + sx2) / 2 + nx, (sy1 + sy2) / 2 + ny);
    }
    ctx.setLineDash([]);
  }

  // Indikátor vybraného bodu (snapPoint nástroj)
  if (state._snapPointState) {
    const sp = state._snapPointState;
    const [spx, spy] = worldToScreen(sp.x, sp.y);
      ctx.strokeStyle = COLORS.snapPoint;
      ctx.lineWidth = LINE_WIDTH_SELECTED;
    ctx.beginPath();
    ctx.arc(spx, spy, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(spx, spy, 3, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.snapPoint;
    ctx.fill();
    // Vodící čára ke kurzoru
    const [mx, my] = worldToScreen(state.mouse.x, state.mouse.y);
    ctx.strokeStyle = "rgba(250, 179, 135, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(spx, spy);
    ctx.lineTo(mx, my);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Snap indikátor
  drawSnapIndicator();

  // Indikátor vybraného bodu (pokud není průsečík)
  drawSelectedPointIndicator();

  // Počítadlo vybraných objektů
  drawSelectionCounter();
}

// ── Indikátor vybraného bodu ──
function drawSelectedPointIndicator() {
  if (!state.selectedPoint || state.selectedPoint.length === 0) return;
  for (const sp of state.selectedPoint) {
    // Zkontrolovat, jestli je to průsečík (ten má vlastní label)
    const isIntersection = state.intersections.some(
      pt => Math.hypot(pt.x - sp.x, pt.y - sp.y) < DIM_MATCH_TOL
    );
    if (isIntersection) continue;
    // Vykreslit kroužek + souřadnice
    const [sx, sy] = worldToScreen(sp.x, sp.y);
    ctx.strokeStyle = COLORS.selected;
    ctx.fillStyle = COLORS.selected;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    ctx.fill();
    const intSize = Math.round(Math.min(24, Math.max(11, 8 + state.zoom * 4.5)));
    ctx.font = intSize + 'px Consolas';
    const ptLabel = fmtCoordLabel(sp.x, sp.y);
    ctx.fillText(ptLabel, sx + 10, sy - 10);
  }
}

// ── Počítadlo výběru ──
function drawSelectionCounter() {
  let count = state.multiSelected.size > 0
    ? state.multiSelected.size
    : (state.selected !== null ? 1 : 0);
  const ptCount = state.selectedPoint ? state.selectedPoint.length : 0;
  if (ptCount > 0) count += ptCount;
  if (count <= 0) return;
  const parts = [];
  const objCount = count - ptCount;
  if (objCount > 0) parts.push(`${objCount} obj`);
  if (ptCount > 0) parts.push(`${ptCount} bod${ptCount > 1 ? 'y' : ''}`);
  const label = parts.join(' + ');
  const fontSize = 14;
  ctx.font = `bold ${fontSize}px Consolas`;
  const w = ctx.measureText(label).width + 16;
  const h = fontSize + 12;
  const x = (drawCanvas.width - w) / 2;
  const y = 50;
  ctx.fillStyle = 'rgba(30,30,46,0.85)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.fillStyle = COLORS.selected;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

// ── Snap indikátor u kurzoru ──
function drawSnapIndicator() {
  if (!state.mouse.snapped) return;
  const [sx, sy] = worldToScreen(state.mouse.x, state.mouse.y);
  const snapLabelSize = Math.round(Math.min(22, Math.max(14, 10 + state.zoom * 6)));

  if (state.mouse.snapType === 'point') {
    // Snap k bodu – žlutý čtvereček
    ctx.strokeStyle = COLORS.selected;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(sx - 6, sy - 6, 12, 12);
    ctx.stroke();
    ctx.font = `${Math.max(9, snapLabelSize - 4)}px Consolas`;
    ctx.fillStyle = COLORS.selected;
    ctx.fillText("SNAP", sx + 9, sy - 3);
  } else if (state.mouse.snapType === 'grid') {
    // Snap na mřížku – menší indikátor, jiná barva
    ctx.strokeStyle = COLORS.label;
    ctx.lineWidth = LINE_WIDTH;
    ctx.beginPath();
    ctx.rect(sx - 4, sy - 4, 8, 8);
    ctx.stroke();
    ctx.font = `${Math.max(9, snapLabelSize - 4)}px Consolas`;
    ctx.fillStyle = COLORS.label;
    ctx.fillText("GRID", sx + 7, sy - 3);
  } else if (state.mouse.snapType === 'edge') {
    // Snap k hraně objektu – kolečko + trojúhelník
    ctx.strokeStyle = COLORS.snapEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `${Math.max(9, snapLabelSize - 4)}px Consolas`;
    ctx.fillStyle = COLORS.snapEdge;
    ctx.fillText("EDGE", sx + 9, sy - 3);
  }

  // Vodící čára od raw pozice k snap pozici
  if (state.mouse.rawX !== undefined) {
    const [rawSx, rawSy] = worldToScreen(state.mouse.rawX, state.mouse.rawY);
    const dist = Math.hypot(rawSx - sx, rawSy - sy);
    if (dist > 3) {
      ctx.strokeStyle = "rgba(137, 180, 250, 0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(rawSx, rawSy);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// ── Šipka kóty ──
function drawDimArrow(fromX, fromY, toX, toY) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowLen = ARROW_LENGTH;
  const arrowAngle = ARROW_ANGLE;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(fromX + arrowLen * Math.cos(angle + arrowAngle), fromY + arrowLen * Math.sin(angle + arrowAngle));
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(fromX + arrowLen * Math.cos(angle - arrowAngle), fromY + arrowLen * Math.sin(angle - arrowAngle));
  ctx.stroke();
}

// ── Kolize kótových popisků ──
/**
 * Ověří, zda se obdélník [x,y,w,h] překrývá s dříve umístěnými popisky.
 * Pokud ano, vrátí odsazenou pozici s volným místem.
 * Registruje výsledný obdélník do _dimLabelRects.
 * @returns {{ x: number, y: number, collided: boolean }}
 */
function resolveDimLabelPos(x, y, textW, textH) {
  const pad = 4; // mezera kolem textu
  const rect = { x: x - pad, y: y - textH - pad, w: textW + pad * 2, h: textH + pad * 2 };

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  let collided = false;
  let offsetY = 0;
  const step = textH + pad * 2;
  let maxTries = 8;

  while (maxTries-- > 0) {
    const testRect = { x: rect.x, y: rect.y + offsetY, w: rect.w, h: rect.h };
    let hasCollision = false;
    for (const existing of _dimLabelRects) {
      if (overlaps(testRect, existing)) {
        hasCollision = true;
        collided = true;
        break;
      }
    }
    if (!hasCollision) break;
    // Zkusit posunout nahoru (záporný Y ve screen = nahoru)
    offsetY -= step;
  }

  const finalRect = { x: rect.x, y: rect.y + offsetY, w: rect.w, h: rect.h };
  _dimLabelRects.push(finalRect);
  return { x, y: y + offsetY, collided };
}

// ── Kóty / rozměry ──
function drawDimension(obj) {
  const dimSize = Math.round(Math.min(18, Math.max(12, 8 + state.zoom * 4)));
  ctx.font = `${dimSize}px Consolas`;
  ctx.fillStyle = COLORS.textSecondary;
  const offset = 14;
  switch (obj.type) {
    case "line":
      // Délka úsečky se zobrazuje jen přes explicitní kótu (isDimension)
      break;
    case "circle": {
      const [sx, sy] = worldToScreen(obj.cx, obj.cy);
      const rText = `R${obj.r.toFixed(2)}`;
      const dText = `⌀${(obj.r * 2).toFixed(2)}`;
      const rW = ctx.measureText(rText).width;
      const dW = ctx.measureText(dText).width;
      const r1 = resolveDimLabelPos(sx + 6, sy - 6, rW, dimSize);
      ctx.fillText(rText, sx + 6, r1.y);
      if (r1.collided) { ctx.strokeStyle = COLORS.textSecondary; ctx.lineWidth = 0.5; ctx.setLineDash([2,2]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 6, r1.y); ctx.stroke(); ctx.setLineDash([]); }
      const d1 = resolveDimLabelPos(sx + 6, sy + 14, dW, dimSize);
      ctx.fillText(dText, sx + 6, d1.y);
      break;
    }
    case "arc": {
      const [sx, sy] = worldToScreen(obj.cx, obj.cy);
      const rText = `R${obj.r.toFixed(2)}`;
      const rW = ctx.measureText(rText).width;
      const r1 = resolveDimLabelPos(sx + 6, sy - 6, rW, dimSize);
      ctx.fillText(rText, sx + 6, r1.y);
      if (r1.collided) { ctx.strokeStyle = COLORS.textSecondary; ctx.lineWidth = 0.5; ctx.setLineDash([2,2]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 6, r1.y); ctx.stroke(); ctx.setLineDash([]); }
      break;
    }
    case "rect": {
      const [sx1, sy1] = worldToScreen(obj.x1, obj.y1);
      const [sx2, sy2] = worldToScreen(obj.x2, obj.y2);
      const w = Math.abs(obj.x2 - obj.x1),
        h = Math.abs(obj.y2 - obj.y1);
      ctx.fillText(
        w.toFixed(2),
        (sx1 + sx2) / 2 - 15,
        Math.min(sy1, sy2) - 4,
      );
      ctx.fillText(
        h.toFixed(2),
        Math.max(sx1, sx2) + 4,
        (sy1 + sy2) / 2 + 4,
      );
      break;
    }
    case "polyline": {
      // Total length
      let totalLen = 0;
      const pn = obj.vertices.length;
      const pSegCount = obj.closed ? pn : pn - 1;
      for (let i = 0; i < pSegCount; i++) {
        const pp1 = obj.vertices[i];
        const pp2 = obj.vertices[(i + 1) % pn];
        const pb = obj.bulges[i] || 0;
        if (pb === 0) {
          totalLen += Math.hypot(pp2.x - pp1.x, pp2.y - pp1.y);
        } else {
          const parc = bulgeToArc(pp1, pp2, pb);
          if (parc) {
            const theta = 4 * Math.atan(Math.abs(pb));
            totalLen += parc.r * theta;
          }
        }
      }
      if (pn >= 1) {
        const [psx, psy] = worldToScreen(obj.vertices[0].x, obj.vertices[0].y);
        ctx.fillText(`L${totalLen.toFixed(2)} [${pn}v]`, psx + 8, psy - 8);
      }
      break;
    }
  }
}

// ── Kreslicí primitiva ──
/** @param {import('./types.js').PointObject} obj */
export function drawPoint(obj) {
  const [sx, sy] = worldToScreen(obj.x, obj.y);

  if (obj.isCoordLabel) {
    // Odkazová čára (leader) se souřadnicemi
    const leaderLen = 30;
    const shelfLen = 40;
    const dimSize = Math.round(Math.min(21, Math.max(10, 7 + state.zoom * 4)));
    ctx.font = dimSize + 'px Consolas';
    const labelText = fmtCoordLabel(obj.x, obj.y);
    const labelW = ctx.measureText(labelText).width;
    const baseEx = sx + leaderLen;
    const baseEy = sy - leaderLen;
    // Detekce kolize – posune výš při překryvu
    const resolved = resolveDimLabelPos(baseEx + 2, baseEy - 3, labelW + shelfLen, dimSize);
    const ey = resolved.collided ? resolved.y + 3 : baseEy;
    const ex = baseEx;
    // Šikmá čára od bodu
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    // Vodorovná polička
    ctx.lineTo(ex + shelfLen, ey);
    ctx.stroke();
    // Kroužek na bodě
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.stroke();
    // Text souřadnic
    ctx.fillStyle = '#cdd6f4';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(labelText, ex + 2, ey - 3);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
    return;
  }

  ctx.beginPath();
  ctx.arc(sx, sy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx - 6, sy);
  ctx.lineTo(sx + 6, sy);
  ctx.moveTo(sx, sy - 6);
  ctx.lineTo(sx, sy + 6);
  ctx.stroke();
}

/** @param {import('./types.js').LineObject} obj */
export function drawLine(obj) {
  const [sx1, sy1] = worldToScreen(obj.x1, obj.y1);
  const [sx2, sy2] = worldToScreen(obj.x2, obj.y2);

  if (obj.isDimension) {
    const dimType = obj.dimType || 'linear';
    const dimSize = Math.round(Math.min(24, Math.max(11, 8 + state.zoom * 4.5)));
    ctx.font = dimSize + 'px Consolas';
    ctx.fillStyle = '#cdd6f4';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    if (dimType === 'angular') {
      // ── Úhlová kóta – oblouk s popiskem úhlu ──
      const cx = obj.dimCenterX, cy = obj.dimCenterY;
      const [scx, scy] = worldToScreen(cx, cy);
      const r = obj.dimRadius || 20;
      const sr = r * state.zoom;
      const startA = Math.atan2(obj.y1 - cy, obj.x1 - cx);
      const endA = Math.atan2(obj.y2 - cy, obj.x2 - cx);
      // Odkazové čáry od středu k oblouku
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(scx, scy);
      ctx.lineTo(sx1, sy1);
      ctx.moveTo(scx, scy);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
      // Oblouk kóty
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(scx, scy, sr * 0.8, -startA, -endA, true);
      ctx.stroke();
      // Šipky na koncích oblouku
      const aR = sr * 0.8;
      const arrA1x = scx + aR * Math.cos(-startA);
      const arrA1y = scy + aR * Math.sin(-startA);
      const arrA2x = scx + aR * Math.cos(-endA);
      const arrA2y = scy + aR * Math.sin(-endA);
      drawDimArrow(arrA1x, arrA1y, scx, scy);
      drawDimArrow(arrA2x, arrA2y, scx, scy);
      // Text úhlu
      let sweep = obj.dimAngle || (endA - startA);
      if (sweep < 0) sweep += 2 * Math.PI;
      const midA = startA + sweep / 2;
      const labelX = scx + aR * Math.cos(-midA);
      const labelY = scy + aR * Math.sin(-midA);
      const labelText = `${(sweep * 180 / Math.PI).toFixed(1)}°`;
      ctx.fillText(labelText, labelX, labelY - 4);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
      return;
    }

    if (dimType === 'diameter') {
      // ── Průměrová kóta – čára přes střed se symbolem ⌀ ──
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
      // Šipky na obou koncích
      drawDimArrow(sx1, sy1, sx2, sy2);
      drawDimArrow(sx2, sy2, sx1, sy1);
      // Text ⌀ hodnota
      const diam = (obj.dimRadius || 0) * 2;
      const mx = (sx1 + sx2) / 2;
      const my = (sy1 + sy2) / 2;
      const labelText = `⌀${diam.toFixed(2)}`;
      const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
      let textAngle = angle;
      if (textAngle > Math.PI / 2) textAngle -= Math.PI;
      if (textAngle < -Math.PI / 2) textAngle += Math.PI;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(textAngle);
      ctx.fillText(labelText, 0, -4);
      ctx.restore();
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
      return;
    }

    if (dimType === 'radius') {
      // ── Radiální kóta – čára od středu k bodu s R ──
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
      // Šipka pouze na vnějším konci (sx2, sy2)
      drawDimArrow(sx2, sy2, sx1, sy1);
      // Kroužek na středu
      ctx.beginPath();
      ctx.arc(sx1, sy1, 2.5, 0, Math.PI * 2);
      ctx.stroke();
      // Text R hodnota
      const radius = obj.dimRadius || Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1);
      const mx = (sx1 + sx2) / 2;
      const my = (sy1 + sy2) / 2;
      const labelText = `R${radius.toFixed(2)}`;
      const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
      let textAngle = angle;
      if (textAngle > Math.PI / 2) textAngle -= Math.PI;
      if (textAngle < -Math.PI / 2) textAngle += Math.PI;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(textAngle);
      ctx.fillText(labelText, 0, -4);
      ctx.restore();
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
      return;
    }

    // ── Lineární kóta (výchozí) – odkazové čáry + odsazená kóta + šipky + text ──
    const hasSrc = obj.dimSrcX1 !== undefined;
    const ox1 = hasSrc ? obj.dimSrcX1 : obj.x1;
    const oy1 = hasSrc ? obj.dimSrcY1 : obj.y1;
    const ox2 = hasSrc ? obj.dimSrcX2 : obj.x2;
    const oy2 = hasSrc ? obj.dimSrcY2 : obj.y2;
    const [osx1, osy1] = worldToScreen(ox1, oy1);
    const [osx2, osy2] = worldToScreen(ox2, oy2);

    const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
    const extOver = 4;
    const enx = -Math.sin(angle) * extOver;
    const eny = Math.cos(angle) * extOver;

    // Odkazové čáry
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(osx1, osy1);
    ctx.lineTo(sx1 + enx, sy1 + eny);
    ctx.moveTo(osx2, osy2);
    ctx.lineTo(sx2 + enx, sy2 + eny);
    ctx.stroke();

    // Hlavní kótovací čára
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();

    // Šipky
    drawDimArrow(sx1, sy1, sx2, sy2);
    drawDimArrow(sx2, sy2, sx1, sy1);

    // Text délky – rotovaný rovnoběžně s kótou, s detekcí kolizí
    const len = Math.hypot(ox2 - ox1, oy2 - oy1);
    const mx = (sx1 + sx2) / 2;
    const my = (sy1 + sy2) / 2;
    const labelText = len.toFixed(2);
    const textW = ctx.measureText(labelText).width;
    const textH = dimSize;

    const resolved = resolveDimLabelPos(mx - textW / 2, my - 4, textW, textH);
    const labelY = resolved.y;

    if (resolved.collided) {
      ctx.strokeStyle = COLORS.textSecondary;
      ctx.lineWidth = 0.7;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx, labelY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(mx, my, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    let textAngle = angle;
    if (textAngle > Math.PI / 2) textAngle -= Math.PI;
    if (textAngle < -Math.PI / 2) textAngle += Math.PI;
    ctx.save();
    if (resolved.collided) {
      ctx.translate(mx, labelY);
    } else {
      ctx.translate(mx, my);
      ctx.rotate(textAngle);
    }
    ctx.fillText(labelText, 0, -4);
    ctx.restore();
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
    return;
  }

  if (obj.type === "constr") {
    const dx = sx2 - sx1,
      dy = sy2 - sy1;
    const len = Math.hypot(dx, dy);
    if (len < 0.1) return;
    const scale = 5000 / len;
    ctx.beginPath();
    ctx.moveTo(sx1 - dx * scale, sy1 - dy * scale);
    ctx.lineTo(sx2 + dx * scale, sy2 + dy * scale);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(sx1, sy1, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx2, sy2, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

/** @param {import('./types.js').CircleObject} obj */
export function drawCircle(obj) {
  const [sx, sy] = worldToScreen(obj.cx, obj.cy);
  const r = obj.r * state.zoom;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sx, sy, 2, 0, Math.PI * 2);
  ctx.fill();
}

/** @param {import('./types.js').ArcObject} obj */
export function drawArc(obj) {
  const [sx, sy] = worldToScreen(obj.cx, obj.cy);
  const r = obj.r * state.zoom;
  ctx.beginPath();
  ctx.arc(sx, sy, r, -obj.endAngle, -obj.startAngle);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sx, sy, 2, 0, Math.PI * 2);
  ctx.fill();
}

/** @param {import('./types.js').RectObject} obj */
export function drawRect(obj) {
  const [sx1, sy1] = worldToScreen(obj.x1, obj.y1);
  const [sx2, sy2] = worldToScreen(obj.x2, obj.y2);
  ctx.beginPath();
  ctx.rect(
    Math.min(sx1, sx2),
    Math.min(sy1, sy2),
    Math.abs(sx2 - sx1),
    Math.abs(sy2 - sy1),
  );
  ctx.stroke();
}

/** @param {import('./types.js').PolylineObject} obj */
export function drawPolyline(obj, isSel, normalColor, objIdx) {
  const n = obj.vertices.length;
  if (n < 2) return;
  const segCount = obj.closed ? n : n - 1;
  const selSeg = state.selectedSegment;
  const hasSelSeg = isSel && selSeg !== null && selSeg >= 0 && selSeg < segCount
    && state._selectedSegmentObjIdx === objIdx;

  // Save current styles
  const baseStroke = ctx.strokeStyle;
  const baseWidth = ctx.lineWidth;

  for (let i = 0; i < segCount; i++) {
    const p1 = obj.vertices[i];
    const p2 = obj.vertices[(i + 1) % n];
    const b = obj.bulges[i] || 0;
    const [sx1, sy1] = worldToScreen(p1.x, p1.y);
    const [sx2, sy2] = worldToScreen(p2.x, p2.y);

    // When a segment is selected: selected segment = white, rest = normal color
    if (hasSelSeg && i === selSeg) {
      ctx.strokeStyle = COLORS.selected;  // White for selected segment
      ctx.lineWidth = LINE_WIDTH_SELECTED;
    } else if (hasSelSeg) {
      ctx.strokeStyle = normalColor || COLORS.primary;
      ctx.lineWidth = LINE_WIDTH;
    }

    if (b === 0) {
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
    } else {
      const arc = bulgeToArc(p1, p2, b);
      if (arc) {
        const [scx, scy] = worldToScreen(arc.cx, arc.cy);
        const sr = arc.r * state.zoom;
        ctx.beginPath();
        ctx.arc(scx, scy, sr, -arc.endAngle, -arc.startAngle, b < 0);
        ctx.stroke();
      }
    }
  }

  // Restore styles
  ctx.strokeStyle = baseStroke;
  ctx.lineWidth = baseWidth;

  // Vertex dots
  for (let vi = 0; vi < n; vi++) {
    const v = obj.vertices[vi];
    const [sx, sy] = worldToScreen(v.x, v.y);
    // Highlight vertices of selected segment in white, others in normal color
    const isSegVertex = hasSelSeg && (vi === selSeg || vi === (selSeg + 1) % n);
    if (hasSelSeg) {
      ctx.fillStyle = isSegVertex ? COLORS.selected : (normalColor || COLORS.primary);
    } else {
      ctx.fillStyle = baseStroke;
    }
    ctx.beginPath();
    ctx.arc(sx, sy, isSegVertex ? 4.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Restore fillStyle
  ctx.fillStyle = baseStroke;
}

/** @param {import('./types.js').TextObject} obj */
export function drawText(obj) {
  const [sx, sy] = worldToScreen(obj.x, obj.y);
  const fontSize = obj.fontSize || 14;
  const screenSize = Math.round(Math.min(48, Math.max(8, fontSize * state.zoom * 0.5)));
  ctx.font = screenSize + 'px Consolas';
  ctx.fillStyle = obj.color || '#cdd6f4';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  if (obj.rotation) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-obj.rotation);
    ctx.fillText(obj.text || '', 0, 0);
    ctx.restore();
  } else {
    ctx.fillText(obj.text || '', sx, sy);
  }
  // Malý marker na kotevním bodě
  ctx.beginPath();
  ctx.arc(sx, sy, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

// ── Vazební značky (constraints) ──
/** Offset značky od segmentu (v pixelech na obrazovce). */
const CONSTRAINT_OFFSET_PX = 22;

/** Spočítá world-souřadnice značky vazby – kolmo od středu segmentu. */
function _constraintMarkerPos(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // Normála (kolmice) – vždy směrem "nahoru" v screen (tj. kladné Y ve world)
  let nx = -dy / len, ny = dx / len;
  if (ny < 0) { nx = -nx; ny = -ny; }
  const off = CONSTRAINT_OFFSET_PX / state.zoom;
  return { x: mx + nx * off, y: my + ny * off };
}

/** Vykreslí symboly vazeb (═ vodorovná, ║ svislá, ∥ rovnoběžná) u segmentů. */
function drawConstraintMarkers() {
  const markerSize = Math.max(10, Math.min(18, 8 + state.zoom * 4));
  const isSelConstr = state._selectedConstraint;

  state.objects.forEach((obj, idx) => {
    const layer = state.layers.find(l => l.id === obj.layer);
    if (layer && !layer.visible) return;

    // Úsečky s vazbou
    if (obj.constraint && (obj.type === 'line' || obj.type === 'constr')) {
      const pos = _constraintMarkerPos(obj.x1, obj.y1, obj.x2, obj.y2);
      const isSel = isSelConstr && isSelConstr.objIdx === idx && isSelConstr.segIdx === null;
      _drawConstraintIcon(pos.x, pos.y, obj.constraint, markerSize, isSel);
    }

    // Kontury se segmentovými vazbami
    if (obj.segConstraints && obj.type === 'polyline') {
      const n = obj.vertices.length;
      for (const [si, type] of Object.entries(obj.segConstraints)) {
        const i = parseInt(si);
        const p1 = obj.vertices[i];
        const p2 = obj.vertices[(i + 1) % n];
        if (!p1 || !p2) continue;
        const pos = _constraintMarkerPos(p1.x, p1.y, p2.x, p2.y);
        const isSel = isSelConstr && isSelConstr.objIdx === idx && isSelConstr.segIdx === i;
        _drawConstraintIcon(pos.x, pos.y, type, markerSize, isSel);
      }
    }
  });
}

/** Vykreslí ikonu vazby na daných world-souřadnicích (přímo, bez dalšího offsetu). */
function _drawConstraintIcon(wx, wy, type, size, isSelected) {
  const [sx, sy] = worldToScreen(wx, wy);

  ctx.save();
  const bw = size + 8, bh = size + 4;
  const rx = sx - bw / 2, ry = sy - bh / 2;

  // Pozadí značky
  ctx.fillStyle = isSelected ? '#f38ba8' : 'rgba(30, 30, 46, 0.85)';
  ctx.fillRect(rx, ry, bw, bh);

  // Obrys
  ctx.strokeStyle = isSelected ? '#f38ba8' : '#cdd6f4';
  ctx.lineWidth = 1;
  ctx.strokeRect(rx, ry, bw, bh);

  // Symbol
  ctx.fillStyle = isSelected ? '#1e1e2e' : '#f9e2af';
  ctx.font = `bold ${size}px Consolas`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let symbol = '?';
  if (type === 'horizontal') symbol = (state.nullPointActive && state.nullPointAngle) ? '═∡' : '═';
  else if (type === 'vertical') symbol = (state.nullPointActive && state.nullPointAngle) ? '║∡' : '║';
  else if (type === 'parallel') symbol = '∥';
  ctx.fillText(symbol, sx, sy);
  ctx.restore();
}

// ── Vodící čára pro angle snap ──
function renderAngleSnapGuide() {
  if (!state.angleSnap || !state.drawing || state.tempPoints.length === 0) return;
  const tools = ['line', 'constr', 'polyline', 'measure', 'dimension'];
  if (!tools.includes(state.tool)) return;

  const ref = state.tempPoints[state.tempPoints.length - 1];
  const mx = state.mouse.x, my = state.mouse.y;
  const dx = mx - ref.x, dy = my - ref.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-9) return;

  const angle = Math.atan2(dy, dx);
  // Offset od natočeného nulového bodu
  const offsetRad = (state.nullPointActive && state.nullPointAngle) ? (state.nullPointAngle * Math.PI / 180) : 0;
  const stepRad = (state.angleSnapStep * Math.PI) / 180;
  const relAngle = angle - offsetRad;
  const snappedAngle = Math.round(relAngle / stepRad) * stepRad + offsetRad;

  // Zobrazit vodítko jen když je úhel v toleranci (magnetický snap)
  const toleranceRad = (state.angleSnapTolerance * Math.PI) / 180;
  const diff = Math.abs(angle - snappedAngle);
  if (diff > toleranceRad) return;

  // Vodící čára – tečkovaná zelená (jen po délku ke kurzoru, neprodlužovat)
  const gx = ref.x + dist * Math.cos(snappedAngle);
  const gy = ref.y + dist * Math.sin(snappedAngle);
  const [sx1, sy1] = worldToScreen(ref.x, ref.y);
  const [sx2, sy2] = worldToScreen(gx, gy);

  ctx.save();
  ctx.strokeStyle = COLORS.dimension;
  ctx.lineWidth = 1;
  ctx.setLineDash(CONSTRUCTION_DASH);
  ctx.beginPath();
  ctx.moveTo(sx1, sy1);
  ctx.lineTo(sx2, sy2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Koncový bod snap čáry – zvýrazněný
  ctx.fillStyle = COLORS.dimension;
  ctx.beginPath();
  ctx.arc(sx2, sy2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Label s úhlem (zobrazit relativní úhel vůči natočení, pokud je aktivní)
  const angleDeg = ((snappedAngle * 180) / Math.PI);
  const dispAngle = (state.nullPointActive && state.nullPointAngle)
    ? (angleDeg - state.nullPointAngle) : angleDeg;
  const labelSize = Math.round(Math.min(22, Math.max(14, 10 + state.zoom * 6)));
  ctx.font = `${Math.max(10, labelSize - 2)}px Consolas`;
  ctx.fillStyle = COLORS.dimension;
  const labelX = sx2 + 10;
  const labelY = sy2 - 10;
  ctx.fillText(`${dispAngle.toFixed(1)}°`, labelX, labelY);
  ctx.restore();
}
