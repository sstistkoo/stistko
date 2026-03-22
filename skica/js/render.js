// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Renderování (mřížka, objekty, kóty, snap)         ║
// ╚══════════════════════════════════════════════════════════════╝

let _renderRAF = null;
function renderAll() {
  if (_renderRAF) return;
  _renderRAF = requestAnimationFrame(() => {
    _renderRAF = null;
    renderObjects();
    renderAxes();
    // Aktualizovat mobilní Cancel tlačítko
    if (typeof updateMobileCancelBtn === "function") updateMobileCancelBtn();
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
    const isSel = idx === state.selected;
    const isConstr = obj.type === "constr";
    ctx.strokeStyle = isSel
      ? "#f9e2af"
      : isConstr
        ? "#6c7086"
        : obj.color || "#89b4fa";
    ctx.fillStyle = isSel
      ? "#f9e2af"
      : isConstr
        ? "#6c7086"
        : obj.color || "#89b4fa";
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
    ctx.fillText(
      `X${pt.x.toFixed(2)} Z${pt.y.toFixed(2)}`,
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
    ctx.setLineDash([]);
  }

  // Snap indikátor
  drawSnapIndicator();
}

// ── Snap indikátor u kurzoru ──
function drawSnapIndicator() {
  if (!state.mouse.snapped) return;
  const [sx, sy] = worldToScreen(state.mouse.x, state.mouse.y);

  if (state.mouse.snapType === 'point') {
    // Snap k bodu – žlutý čtvereček
    ctx.strokeStyle = "#f9e2af";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(sx - 6, sy - 6, 12, 12);
    ctx.stroke();
    // Malý popisek
    const snapLabelSize = Math.round(Math.min(22, Math.max(14, 10 + state.zoom * 6)));
    ctx.font = `${Math.max(9, snapLabelSize - 4)}px Consolas`;
    ctx.fillStyle = "#f9e2af";
    ctx.fillText("SNAP", sx + 9, sy - 3);
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
  }
}

// ── Kreslicí primitiva ──
function drawPoint(obj) {
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

function drawLine(obj) {
  const [sx1, sy1] = worldToScreen(obj.x1, obj.y1);
  const [sx2, sy2] = worldToScreen(obj.x2, obj.y2);

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

function drawCircle(obj) {
  const [sx, sy] = worldToScreen(obj.cx, obj.cy);
  const r = obj.r * state.zoom;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sx, sy, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawArc(obj) {
  const [sx, sy] = worldToScreen(obj.cx, obj.cy);
  const r = obj.r * state.zoom;
  ctx.beginPath();
  ctx.arc(sx, sy, r, -obj.endAngle, -obj.startAngle);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sx, sy, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawRect(obj) {
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
