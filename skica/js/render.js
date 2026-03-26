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
        drawPolyline(obj);
        break;
    }
    ctx.setLineDash([]);

    // Kóty
    if (state.showDimensions && !isConstr) drawDimension(obj);
  });

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
    // Preview: Kolmice
    if (state.tool === "perp" && state._perpRefIdx != null) {
      const refObj = state.objects[state._perpRefIdx];
      if (refObj) {
        const foot = projectPointToLine(mx, my, refObj.x1, refObj.y1, refObj.x2, refObj.y2);
        const [sx1, sy1] = worldToScreen(mx, my);
        const [sx2, sy2] = worldToScreen(foot.x, foot.y);
        ctx.strokeStyle = "#a6e3a1";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
        // Pata kolmice
        ctx.fillStyle = "#a6e3a1";
        ctx.beginPath();
        ctx.arc(sx2, sy2, 4, 0, Math.PI * 2);
        ctx.fill();
        // Info
        const d = Math.hypot(mx - foot.x, my - foot.y);
        ctx.setLineDash([]);
        ctx.font = `${labelSize}px Consolas`;
        ctx.fillText(`⊥ ${d.toFixed(2)}mm`, (sx1 + sx2) / 2 + 8, (sy1 + sy2) / 2 - 8);
      }
    }
    // Preview: Rovnoběžka
    if (state.tool === "parallel" && state._parallelRefIdx != null) {
      const refObj = state.objects[state._parallelRefIdx];
      if (refObj) {
        const dx = refObj.x2 - refObj.x1;
        const dy = refObj.y2 - refObj.y1;
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
        const foot = projectPointToLine(mx, my, refObj.x1, refObj.y1, refObj.x2, refObj.y2);
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
    // Kótovací úsečka: šipky + text + odkazové čáry
    const extLen = 6;
    const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
    const nx = -Math.sin(angle) * extLen, ny = Math.cos(angle) * extLen;
    // Odkazové čáry
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx1 + nx, sy1 + ny);
    ctx.lineTo(sx1 - nx, sy1 - ny);
    ctx.moveTo(sx2 + nx, sy2 + ny);
    ctx.lineTo(sx2 - nx, sy2 - ny);
    ctx.stroke();
    // Hlavní čára
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();
    // Šipky
    drawDimArrow(sx1, sy1, sx2, sy2);
    drawDimArrow(sx2, sy2, sx1, sy1);
    // Text
    const len = Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1);
    const dimSize = Math.round(Math.min(16, Math.max(11, 8 + state.zoom * 3)));
    ctx.font = `${dimSize}px Consolas`;
    ctx.fillStyle = obj.color || "#9399b2";
    const tnx = -Math.sin(angle) * 12, tny = Math.cos(angle) * 12;
    ctx.fillText(`${len.toFixed(2)}`, (sx1 + sx2) / 2 + tnx, (sy1 + sy2) / 2 + tny);
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
export function drawPolyline(obj) {
  const n = obj.vertices.length;
  if (n < 2) return;
  const segCount = obj.closed ? n : n - 1;

  for (let i = 0; i < segCount; i++) {
    const p1 = obj.vertices[i];
    const p2 = obj.vertices[(i + 1) % n];
    const b = obj.bulges[i] || 0;
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
  }
  // Vertex dots
  for (const v of obj.vertices) {
    const [sx, sy] = worldToScreen(v.x, v.y);
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
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

  // Vodící čára – tečkovaná zelená
  const guideLen = Math.max(dist * 1.5, 200 / state.zoom);
  const gx = ref.x + guideLen * Math.cos(snappedAngle);
  const gy = ref.y + guideLen * Math.sin(snappedAngle);
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

  // Label s úhlem
  const angleDeg = ((snappedAngle * 180) / Math.PI);
  const labelSize = Math.round(Math.min(22, Math.max(14, 10 + state.zoom * 6)));
  ctx.font = `${Math.max(10, labelSize - 2)}px Consolas`;
  ctx.fillStyle = "#a6e3a1";
  const labelX = (sx1 + sx2) / 2 + 8;
  const labelY = (sy1 + sy2) / 2 - 8;
  ctx.fillText(`${angleDeg.toFixed(1)}°`, labelX, labelY);
  ctx.restore();
}
