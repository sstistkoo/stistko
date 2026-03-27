// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Renderování (mřížka, objekty, kóty, snap)         ║
// ╚══════════════════════════════════════════════════════════════╝

import { drawCanvas, ctx, worldToScreen, screenToWorld } from './canvas.js';
import { state, toDisplayCoords } from './state.js';
import { bridge } from './bridge.js';
import { bulgeToArc } from './utils.js';
import { projectPointToLine } from './geometry.js';

let _renderRAF = null;
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
  });
}

// ── Osy ──
function renderAxes() {
  const w = drawCanvas.width,
    h = drawCanvas.height;
  const g = ctx;

  // Adaptive step for axis labels
  const baseStep = 10 * state.zoom;
  let drawStep = baseStep,
    drawGridSize = 10;
  while (drawStep < 15) {
    drawStep *= 2;
    drawGridSize *= 2;
  }

  // Osy
  g.lineWidth = 1.5;
  g.strokeStyle = "#f38ba855";
  g.beginPath();
  g.moveTo(0, state.panY);
  g.lineTo(w, state.panY);
  g.stroke();
  g.strokeStyle = "#a6e3a155";
  g.beginPath();
  g.moveTo(state.panX, 0);
  g.lineTo(state.panX, h);
  g.stroke();

  // Popisky os
  const startX = state.panX % drawStep,
    startY = state.panY % drawStep;
  g.font = "13px Consolas";
  g.fillStyle = "#6c7086";
  for (let x = startX; x < w; x += drawStep) {
    const [wx] = screenToWorld(x, 0);
    const label = Math.round(wx / drawGridSize) * drawGridSize;
    if (label === 0) continue;
    g.fillText(label.toString(), x + 2, state.panY - 5);
  }
  for (let y = startY; y < h; y += drawStep) {
    const [, wy] = screenToWorld(0, y);
    const label = Math.round(wy / drawGridSize) * drawGridSize;
    if (label === 0) continue;
    g.fillText(label.toString(), state.panX + 4, y - 3);
  }
  g.fillStyle = "#f9e2af";
  g.font = "14px Consolas";
  g.fillText("0", state.panX + 4, state.panY - 5);

  // Origin marker – terčík na 0,0
  g.strokeStyle = "#f9e2af88";
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
  g.fillStyle = "#f38ba8";
  g.fillText("X", w - 18, state.panY - 8);
  g.fillStyle = "#a6e3a1";
  g.fillText("Z", state.panX + 8, 16);
}

// ── Vykreslení objektů ──
function renderObjects() {
  const w = drawCanvas.width,
    h = drawCanvas.height;
  ctx.clearRect(0, 0, w, h);

  // Dynamická velikost písma podle zoomu
  const labelSize = Math.round(Math.min(22, Math.max(14, 10 + state.zoom * 6)));

  state.objects.forEach((obj, idx) => {
    // Skip objects on invisible layers
    const layer = state.layers.find(l => l.id === obj.layer);
    if (layer && !layer.visible) return;

    const isSel = idx === state.selected;
    const isConstr = obj.type === "constr";
    const layerColor = layer ? layer.color : '#89b4fa';
    ctx.strokeStyle = isSel
      ? "#f9e2af"
      : isConstr
        ? "#6c7086"
        : obj.color || layerColor;
    ctx.fillStyle = isSel
      ? "#f9e2af"
      : isConstr
        ? "#6c7086"
        : obj.color || layerColor;
    ctx.lineWidth = isSel ? 2.5 : 1.5;
    ctx.setLineDash(isConstr || obj.dashed ? [6, 4] : []);

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
        drawPolyline(obj, isSel);
        break;
    }
    ctx.setLineDash([]);

    // Kóty
    if (state.showDimensions && !isConstr) drawDimension(obj);
  });

  // ── Vazební značky (constraints) ──
  drawConstraintMarkers();

  // Průsečíky
  state.intersections.forEach((pt) => {
    const [sx, sy] = worldToScreen(pt.x, pt.y);
    ctx.fillStyle = "#a6e3a1";
    ctx.strokeStyle = "#a6e3a1";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `${labelSize}px Consolas`;
    const dp = toDisplayCoords(pt.x, pt.y);
    const pf = state.coordMode === 'inc' ? 'Δ' : '';
    ctx.fillText(
      `${pf}X${dp.x.toFixed(2)} ${pf}Z${dp.y.toFixed(2)}`,
      sx + 8,
      sy - 8,
    );
  });

  // Dočasné kreslení
  if (state.drawing && state.tempPoints.length > 0) {
    ctx.strokeStyle = "#f5c2e7";
    ctx.fillStyle = "#f5c2e7";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
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
      ctx.fillStyle = "#f5c2e7";
      ctx.beginPath();
      ctx.arc(sx1, sy1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f5c2e7";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
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
      ctx.strokeStyle = "#f5c2e7";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      const tempBulges = state._polylineBulges || [];
      // Zvýrazněný startovací bod kontury
      const [sfx, sfy] = worldToScreen(tp[0].x, tp[0].y);
      ctx.setLineDash([]);
      ctx.fillStyle = "#f9e2af";
      ctx.beginPath();
      ctx.arc(sfx, sfy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.setLineDash([4, 4]);
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
        ctx.fillStyle = "#f5c2e7";
        ctx.beginPath();
        ctx.arc(sx1, sy1, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Last placed vertex
      const lastPt = tp[tp.length - 1];
      const [slx, sly] = worldToScreen(lastPt.x, lastPt.y);
      ctx.fillStyle = "#f5c2e7";
      ctx.beginPath();
      ctx.arc(slx, sly, 3, 0, Math.PI * 2);
      ctx.fill();
      // Preview line to cursor
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#f5c2e7";
      ctx.lineWidth = 1;
      const [smx, smy] = worldToScreen(mx, my);
      ctx.beginPath();
      ctx.moveTo(slx, sly);
      ctx.lineTo(smx, smy);
      ctx.stroke();
      // Koncový bod preview – zvýrazněný
      ctx.setLineDash([]);
      ctx.fillStyle = "#f5c2e7";
      ctx.beginPath();
      ctx.arc(smx, smy, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Distance info
      const dd = Math.hypot(mx - lastPt.x, my - lastPt.y);
      const ang = (Math.atan2(my - lastPt.y, mx - lastPt.x) * 180) / Math.PI;
      ctx.setLineDash([]);
      ctx.font = `${labelSize}px Consolas`;
      ctx.fillStyle = "#f5c2e7";
      ctx.fillText(
        `${dd.toFixed(3)} mm  ${ang.toFixed(1)}°  [${tp.length} bodů]`,
        (slx + smx) / 2 + 8,
        (sly + smy) / 2 - 8,
      );
    }
    if (state.tool === "tangent" && tp.length === 1) {
      // Preview: bod tečny – zobrazit bod
      const [sx1, sy1] = worldToScreen(tp[0].x, tp[0].y);
      ctx.fillStyle = "#fab387";
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
        ctx.strokeStyle = "#89b4fa";
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
        ctx.fillStyle = "#89b4fa";
        ctx.fillText(`∥ d=${dist.toFixed(2)}mm`, (sx1 + sx2) / 2 + 8, (sy1 + sy2) / 2 - 8);
      }
    }
    // Preview: Kóta (2 body)
    if (state.tool === "dimension" && tp.length === 1) {
      const [sx1, sy1] = worldToScreen(tp[0].x, tp[0].y);
      const [sx2, sy2] = worldToScreen(mx, my);
      const d = Math.hypot(mx - tp[0].x, my - tp[0].y);
      ctx.strokeStyle = "#9399b2";
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
      ctx.fillStyle = "#9399b2";
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
    ctx.strokeStyle = "#fab387";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(spx, spy, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(spx, spy, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#fab387";
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
}

// ── Snap indikátor u kurzoru ──
function drawSnapIndicator() {
  if (!state.mouse.snapped) return;
  const [sx, sy] = worldToScreen(state.mouse.x, state.mouse.y);
  const snapLabelSize = Math.round(Math.min(22, Math.max(14, 10 + state.zoom * 6)));

  if (state.mouse.snapType === 'point') {
    // Snap k bodu – žlutý čtvereček
    ctx.strokeStyle = "#f9e2af";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(sx - 6, sy - 6, 12, 12);
    ctx.stroke();
    ctx.font = `${Math.max(9, snapLabelSize - 4)}px Consolas`;
    ctx.fillStyle = "#f9e2af";
    ctx.fillText("SNAP", sx + 9, sy - 3);
  } else if (state.mouse.snapType === 'grid') {
    // Snap na mřížku – menší indikátor, jiná barva
    ctx.strokeStyle = "#a6adc8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(sx - 4, sy - 4, 8, 8);
    ctx.stroke();
    ctx.font = `${Math.max(9, snapLabelSize - 4)}px Consolas`;
    ctx.fillStyle = "#a6adc8";
    ctx.fillText("GRID", sx + 7, sy - 3);
  } else if (state.mouse.snapType === 'edge') {
    // Snap k hraně objektu – kolečko + trojúhelník
    ctx.strokeStyle = "#cba6f7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `${Math.max(9, snapLabelSize - 4)}px Consolas`;
    ctx.fillStyle = "#cba6f7";
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
  const arrowLen = 8;
  const arrowAngle = Math.PI / 7;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(fromX + arrowLen * Math.cos(angle + arrowAngle), fromY + arrowLen * Math.sin(angle + arrowAngle));
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(fromX + arrowLen * Math.cos(angle - arrowAngle), fromY + arrowLen * Math.sin(angle - arrowAngle));
  ctx.stroke();
}

// ── Kóty / rozměry ──
function drawDimension(obj) {
  const dimSize = Math.round(Math.min(18, Math.max(12, 8 + state.zoom * 4)));
  ctx.font = `${dimSize}px Consolas`;
  ctx.fillStyle = "#9399b2";
  const offset = 14;
  switch (obj.type) {
    case "line": {
      const [sx1, sy1] = worldToScreen(obj.x1, obj.y1);
      const [sx2, sy2] = worldToScreen(obj.x2, obj.y2);
      const len = Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1);
      const mx = (sx1 + sx2) / 2,
        my = (sy1 + sy2) / 2;
      const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
      const nx = -Math.sin(angle) * offset,
        ny = Math.cos(angle) * offset;
      ctx.fillText(len.toFixed(2), mx + nx, my + ny);
      break;
    }
    case "circle": {
      const [sx, sy] = worldToScreen(obj.cx, obj.cy);
      ctx.fillText(`R${obj.r.toFixed(2)}`, sx + 6, sy - 6);
      ctx.fillText(`⌀${(obj.r * 2).toFixed(2)}`, sx + 6, sy + 14);
      break;
    }
    case "arc": {
      const [sx, sy] = worldToScreen(obj.cx, obj.cy);
      ctx.fillText(`R${obj.r.toFixed(2)}`, sx + 6, sy - 6);
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
    const ex = sx + leaderLen;
    const ey = sy - leaderLen;
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
    const dimSize = Math.round(Math.min(14, Math.max(10, 7 + state.zoom * 2.5)));
    ctx.font = dimSize + 'px Consolas';
    ctx.fillStyle = obj.color || '#9399b2';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('X' + obj.x.toFixed(2) + '  Z' + obj.y.toFixed(2), ex + 2, ey - 3);
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
    // Klasické kótování: odkazové čáry + odsazená kóta + šipky + text
    const hasSrc = obj.dimSrcX1 !== undefined;
    // Zdrojové body (původní úsečka)
    const ox1 = hasSrc ? obj.dimSrcX1 : obj.x1;
    const oy1 = hasSrc ? obj.dimSrcY1 : obj.y1;
    const ox2 = hasSrc ? obj.dimSrcX2 : obj.x2;
    const oy2 = hasSrc ? obj.dimSrcY2 : obj.y2;
    const [osx1, osy1] = worldToScreen(ox1, oy1);
    const [osx2, osy2] = worldToScreen(ox2, oy2);

    // Kótovací čára (odsazená)
    const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
    const extOver = 4; // přesah odkazové čáry za kótu
    const enx = -Math.sin(angle) * extOver;
    const eny = Math.cos(angle) * extOver;

    // Odkazové čáry (od zdrojových bodů ke kótě + přesah)
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

    // Text délky
    const len = Math.hypot(ox2 - ox1, oy2 - oy1);
    const dimSize = Math.round(Math.min(16, Math.max(11, 8 + state.zoom * 3)));
    ctx.font = dimSize + 'px Consolas';
    ctx.fillStyle = obj.color || '#9399b2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const tnx = -Math.sin(angle) * 4;
    const tny = Math.cos(angle) * 4;
    ctx.fillText(len.toFixed(2), (sx1 + sx2) / 2 + tnx, (sy1 + sy2) / 2 + tny);
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
export function drawPolyline(obj, isSel) {
  const n = obj.vertices.length;
  if (n < 2) return;
  const segCount = obj.closed ? n : n - 1;
  const selSeg = state.selectedSegment;
  const hasSelSeg = isSel && selSeg !== null && selSeg >= 0 && selSeg < segCount;

  // Save current styles for non-selected segments
  const baseStroke = ctx.strokeStyle;
  const baseWidth = ctx.lineWidth;

  for (let i = 0; i < segCount; i++) {
    const p1 = obj.vertices[i];
    const p2 = obj.vertices[(i + 1) % n];
    const b = obj.bulges[i] || 0;
    const [sx1, sy1] = worldToScreen(p1.x, p1.y);
    const [sx2, sy2] = worldToScreen(p2.x, p2.y);

    // Highlight selected segment
    if (hasSelSeg && i === selSeg) {
      ctx.strokeStyle = "#f38ba8";  // Pink for selected segment
      ctx.lineWidth = 3.5;
    } else if (hasSelSeg) {
      ctx.strokeStyle = baseStroke;
      ctx.lineWidth = baseWidth;
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
    // Highlight vertices of selected segment
    const isSegVertex = hasSelSeg && (vi === selSeg || vi === (selSeg + 1) % n);
    ctx.fillStyle = isSegVertex ? "#f38ba8" : ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(sx, sy, isSegVertex ? 4.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Restore fillStyle
  ctx.fillStyle = baseStroke;
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
  if (type === 'horizontal') symbol = '═';
  else if (type === 'vertical') symbol = '║';
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
  const stepRad = (state.angleSnapStep * Math.PI) / 180;
  const snappedAngle = Math.round(angle / stepRad) * stepRad;

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
  ctx.strokeStyle = "#a6e3a1";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(sx1, sy1);
  ctx.lineTo(sx2, sy2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Koncový bod snap čáry – zvýrazněný
  ctx.fillStyle = "#a6e3a1";
  ctx.beginPath();
  ctx.arc(sx2, sy2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Label s úhlem
  const angleDeg = ((snappedAngle * 180) / Math.PI);
  const labelSize = Math.round(Math.min(22, Math.max(14, 10 + state.zoom * 6)));
  ctx.font = `${Math.max(10, labelSize - 2)}px Consolas`;
  ctx.fillStyle = "#a6e3a1";
  const labelX = sx2 + 10;
  const labelY = sy2 - 10;
  ctx.fillText(`${angleDeg.toFixed(1)}°`, labelX, labelY);
  ctx.restore();
}
