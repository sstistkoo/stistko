/**
 * DRAWING.JS - Kreslicí engine a geometrické operace (ES6 hybridní)
 * - Canvas rendering
 * - Shape management
 * - Intersection calculations
 * - Snap points
 * @module drawing
 */

// ===== ES6 EXPORT PLACEHOLDER =====
// export const DRAWING = {}; // Bude aktivováno po plné migraci

// Globální proměnné jsou inicializovány v globals.js
// Pouze se zde odkažují!

// ===== COORDINATE CONVERSION =====

function worldToScreen(wx, wy) {
  return {
    x: wx * window.zoom + window.panX,
    y: window.panY - wy * window.zoom,
  };
}

function screenToWorld(sx, sy) {
  return {
    x: (sx - window.panX) / window.zoom,
    y: (window.panY - sy) / window.zoom,
  };
}

// ===== SNAP POINTS & GEOMETRY =====

function updateSnapPoints() {
  window.cachedSnapPoints = [];

  // 1. Manuální body
  window.points.forEach((p) => {
    window.cachedSnapPoints.push({ x: p.x, y: p.y, type: "point", ref: p });
  });

  // 2. Koncové body a středy z tvarů
  window.shapes.forEach((s) => {
    if (s.type === "line") {
      window.cachedSnapPoints.push({ x: s.x1, y: s.y1, type: "endpoint" });
      window.cachedSnapPoints.push({ x: s.x2, y: s.y2, type: "endpoint" });
    } else if (s.type === "circle") {
      window.cachedSnapPoints.push({ x: s.cx, y: s.cy, type: "center" });
    } else if (s.type === "rectangle") {
      // Přidej rohy obdélníku jako koncové body a také střed
      const x1 = s.x1;
      const y1 = s.y1;
      const x2 = s.x2;
      const y2 = s.y2;

      window.cachedSnapPoints.push({ x: x1, y: y1, type: "endpoint" });
      window.cachedSnapPoints.push({ x: x1, y: y2, type: "endpoint" });
      window.cachedSnapPoints.push({ x: x2, y: y1, type: "endpoint" });
      window.cachedSnapPoints.push({ x: x2, y: y2, type: "endpoint" });

      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      window.cachedSnapPoints.push({ x: cx, y: cy, type: "center" });
    }
  });

  // 3. Průsečíky
  // 3. Průsečíky - podporujeme i hrany obdélníků (převést rectangle -> 4 line segs)
  function shapeToSegments(s) {
    if (!s) return [];
    if (s.type === "line") return [s];
    if (s.type === "circle") return [s];
    if (s.type === "rectangle") {
      const x1 = s.x1;
      const y1 = s.y1;
      const x2 = s.x2;
      const y2 = s.y2;
      const rx1 = Math.min(x1, x2);
      const rx2 = Math.max(x1, x2);
      const ry1 = Math.min(y1, y2);
      const ry2 = Math.max(y1, y2);

      return [
        { type: "line", x1: rx1, y1: ry1, x2: rx2, y2: ry1 }, // top
        { type: "line", x1: rx2, y1: ry1, x2: rx2, y2: ry2 }, // right
        { type: "line", x1: rx2, y1: ry2, x2: rx1, y2: ry2 }, // bottom
        { type: "line", x1: rx1, y1: ry2, x2: rx1, y2: ry1 }, // left
      ];
    }
    return [];
  }

  for (let i = 0; i < window.shapes.length; i++) {
    for (let j = i + 1; j < window.shapes.length; j++) {
      const s1 = window.shapes[i];
      const s2 = window.shapes[j];

      const segs1 = shapeToSegments(s1);
      const segs2 = shapeToSegments(s2);

      for (let a of segs1) {
        for (let b of segs2) {
          let intersects = [];
          if (a.type === "line" && b.type === "line") {
            const pt = lineIntersection(a, b);
            if (pt) intersects.push(pt);
          } else if (a.type === "line" && b.type === "circle") {
            intersects = intersectLineCircle(a, b);
          } else if (a.type === "circle" && b.type === "line") {
            intersects = intersectLineCircle(b, a);
          } else if (a.type === "circle" && b.type === "circle") {
            intersects = intersectCircleCircle(a, b);
          }

          intersects.forEach((pt) => {
            window.cachedSnapPoints.push({ x: pt.x, y: pt.y, type: "intersection" });
          });
        }
      }
    }
  }
  window.logDebug && window.logDebug('[updateSnapPoints] cachedSnapPoints count =', window.cachedSnapPoints.length);
}

function snapPointInternal(pt) {
  let snapped = { ...pt };
  let snapInfo = null;

  let bestDist = window.snapDistance; // Max vzdálenost

  for (let p of window.cachedSnapPoints) {
    const screenP = worldToScreen(p.x, p.y);
    const screenPt = worldToScreen(pt.x, pt.y);
    const dist = Math.sqrt(
      (screenP.x - screenPt.x) ** 2 + (screenP.y - screenPt.y) ** 2
    );

    if (dist < bestDist) {
      bestDist = dist;
      snapped = { x: p.x, y: p.y };
      snapInfo = { type: p.type, x: p.x, y: p.y };
    }
  }

  // Pokud jsme nenašli bod, zkusíme mřížku
  if (!snapInfo && window.snapToGrid) {
    const gx = Math.round(pt.x / window.gridSize) * window.gridSize;
    const gy = Math.round(pt.y / window.gridSize) * window.gridSize;
    const screenG = worldToScreen(gx, gy);
    const screenPt = worldToScreen(pt.x, pt.y);
    const dist = Math.sqrt(
      (screenG.x - screenPt.x) ** 2 + (screenG.y - screenPt.y) ** 2
    );

    if (dist < window.snapDistance) {
      snapped.x = gx;
      snapped.y = gy;
      snapInfo = { type: "grid", x: gx, y: gy };
    }
  }

  return { point: snapped, snapInfo };
}

// Aktualizace nastavení snappingu z UI prvků
function updateSnapSettings() {
  window.snapToGrid = document.getElementById("snapGrid")?.checked || false;
  window.snapToPoints = document.getElementById("snapPoints")?.checked !== false;
  const orthoCheckbox = document.getElementById("orthoMode");
  if (orthoCheckbox) window.orthoMode = orthoCheckbox.checked;
  const snapDistInput = document.getElementById("snapDistance");
  if (snapDistInput) window.snapDistance = parseFloat(snapDistInput.value) || 15;
}

// ===== RENDERING =====

function draw() {
  window.logDebug && window.logDebug('[draw] start, selectedItems.length=', (window.selectedItems||[]).length);
  // Debug: expose last selection time for tracing
  if (window._lastSelectionTime) {
    window.logDebug && window.logDebug('[draw] _lastSelectionTime=', window._lastSelectionTime);
  }
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (document.getElementById("showGrid")?.checked) {
    drawGrid(ctx, canvas);
  }

  if (document.getElementById("showAxes")?.checked) {
    drawAxes(ctx, canvas);
  }

  // Nakreslit tvary
  window.shapes.forEach((s) => drawShape(ctx, s, canvas));

  // Nakreslit body - VŽDYCKY, ne jen když je zaškrtnut checkbox
  if (window.cachedSnapPoints && window.cachedSnapPoints.length > 0) {
    window.cachedSnapPoints.forEach((p) => {
      if (p.type === "point") {
        const sp = worldToScreen(p.x, p.y);
        ctx.beginPath();
        ctx.fillStyle = "#ff4444";
        ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // Nakreslit ostatní snap body (průsečíky, endpoints) - jen pokud je zaškrtnut
  if (document.getElementById("showPoints")?.checked) {
    window.cachedSnapPoints.forEach((p) => {
      if (p.type !== "point") {
        const sp = worldToScreen(p.x, p.y);
        ctx.beginPath();

        if (p.type === "intersection") {
          ctx.fillStyle = "#ffffff";
          ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = "#a0a0a0";
          ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    });
  }

  // ===== KRESLENÍ VYBRANÝCH POLOŽEK =====
  if (window.selectedItems && window.selectedItems.length > 0) {
    window.selectedItems.forEach((item) => {
      ctx.save();

      window.logDebug && window.logDebug('[draw] rendering selected item', item);

      if (item.category === "shape") {
        const s = item.ref;

        // Zvýraznění (magenta)
        ctx.strokeStyle = "#ff66ff";
        ctx.lineWidth = 4;
        ctx.beginPath();

        if (s.type === "line") {
          const p1 = worldToScreen(s.x1, s.y1);
          const p2 = worldToScreen(s.x2, s.y2);
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        } else if (s.type === "circle") {
          const c = worldToScreen(s.cx, s.cy);
          ctx.arc(c.x, c.y, s.r * window.zoom, 0, Math.PI * 2);

          // Zobrazit střed kružnice
          ctx.fillStyle = "#ffff00";
          ctx.beginPath();
          ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (s.type === "rectangle") {
          const p1 = worldToScreen(s.x1, s.y1);
          const p2 = worldToScreen(s.x2, s.y2);

          const x = Math.min(p1.x, p2.x);
          const y = Math.min(p1.y, p2.y);
          const width = Math.abs(p2.x - p1.x);
          const height = Math.abs(p2.y - p1.y);

          ctx.strokeRect(x, y, width, height);
        }

        ctx.stroke();

        // Popisek s písmenem
        if (item.label) {
          const labelPos = s.type === "line"
            ? worldToScreen((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2)
            : worldToScreen(s.cx, s.cy);

          // Detekce mobilního zařízení pro větší písmo
          const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
          const fontSize = isMobile ? 28 : 16;
          const textSize = isMobile ? 36 : 20;
          const labelOffset = isMobile ? 45 : 30;

          // Pozadí (černé)
          ctx.fillStyle = "#000000";
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillRect(labelPos.x - textSize / 2, labelPos.y - labelOffset - textSize / 2, textSize, textSize);

          // Text (žlutý)
          ctx.fillStyle = "#ffff00";
          ctx.fillText(item.label, labelPos.x, labelPos.y - labelOffset);
        }
      } else if (item.category === "point") {
        const p = worldToScreen(item.x, item.y);

        // Zvýraznění (výchozí magenta, ale pokud item.highlightColor existuje, použij ji)
        ctx.fillStyle = item.highlightColor || "#ff66ff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Popisek s písmenem
        if (item.label) {
          // Detekce mobilního zařízení pro větší písmo
          const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
          const fontSize = isMobile ? 28 : 16;
          const textSize = isMobile ? 36 : 20;
          const labelOffset = isMobile ? 45 : 30;

          // Pozadí (černé)
          ctx.fillStyle = "#000000";
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillRect(p.x - textSize / 2, p.y - labelOffset - textSize / 2, textSize, textSize);

          // Text (žlutý)
          ctx.fillStyle = "#ffff00";
          ctx.fillText(item.label, p.x, p.y - labelOffset);
        }
      }

      ctx.restore();
    });

    // Zobrazení vzdálenosti mezi 2 vybranými body
    if (window.selectedItems.length === 2) {
      const item1 = window.selectedItems[0];
      const item2 = window.selectedItems[1];

      if (item1.category === "point" && item2.category === "point") {
        const p1 = worldToScreen(item1.x, item1.y);
        const p2 = worldToScreen(item2.x, item2.y);

        // Linka mezi body
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Vzdálenost
        const dist = Math.sqrt((item1.x - item2.x) ** 2 + (item1.y - item2.y) ** 2);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        ctx.fillStyle = "#000000";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const text = `${dist.toFixed(2)} mm`;
        const textWidth = ctx.measureText(text).width + 8;
        const textHeight = 16;
        ctx.fillRect(midX - textWidth / 2, midY - 12 - textHeight / 2, textWidth, textHeight);

        ctx.fillStyle = "#00ffff";
        ctx.fillText(text, midX, midY - 12);
      }
    }
  }

  // Nakreslit tempShape (náhled během kreslení)
  if (window.tempShape) {
    ctx.strokeStyle = window.tempShape.color || "#4a9eff";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    if (window.tempShape.type === "line") {
      const p1 = worldToScreen(window.tempShape.x1, window.tempShape.y1);
      const p2 = worldToScreen(window.tempShape.x2, window.tempShape.y2);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    } else if (window.tempShape.type === "circle") {
      const c = worldToScreen(window.tempShape.cx, window.tempShape.cy);
      ctx.beginPath();
      ctx.arc(c.x, c.y, window.tempShape.r * window.zoom, 0, Math.PI * 2);
      ctx.stroke();
    } else if (window.tempShape.type === "rectangle") {
      const p1 = worldToScreen(window.tempShape.x1, window.tempShape.y1);
      const p2 = worldToScreen(window.tempShape.x2, window.tempShape.y2);

      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const width = Math.abs(p2.x - p1.x);
      const height = Math.abs(p2.y - p1.y);

      ctx.strokeRect(x, y, width, height);
    }

    ctx.setLineDash([]);
  }

  // ===== PICK POINT MODE - Zvýraznění nejbližšího snap bodu =====
  if (window.pickPointMode && window.highlightedSnapPoint) {
    const snap = window.highlightedSnapPoint;
    const sp = worldToScreen(snap.x, snap.y);

    // Pulzující efekt
    const time = Date.now() / 200;
    const pulseRadius = 12 + Math.sin(time) * 4;

    // Vnější kruh (zelený glow)
    ctx.save();
    ctx.fillStyle = "rgba(74, 222, 128, 0.3)";
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, pulseRadius + 8, 0, Math.PI * 2);
    ctx.fill();

    // Střední kruh (zelený)
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, pulseRadius, 0, Math.PI * 2);
    ctx.fill();

    // Vnitřní kruh (tmavý)
    ctx.fillStyle = "#1a2a1a";
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Label typu bodu
    if (snap.label) {
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      // Pozadí labelu
      const textWidth = ctx.measureText(snap.label).width + 12;
      ctx.fillStyle = "rgba(26, 42, 26, 0.9)";
      ctx.fillRect(sp.x - textWidth / 2, sp.y - pulseRadius - 26, textWidth, 20);

      // Okraj
      ctx.strokeStyle = "#4ade80";
      ctx.lineWidth = 1;
      ctx.strokeRect(sp.x - textWidth / 2, sp.y - pulseRadius - 26, textWidth, 20);

      // Text
      ctx.fillStyle = "#4ade80";
      ctx.fillText(snap.label, sp.x, sp.y - pulseRadius - 10);
    }

    ctx.restore();
  }

  // Pokud není nic vybráno, zruš perzistentní info (pokud bylo nastaveno)
  try {
    if (!window.selectedItems || window.selectedItems.length === 0) {
      const infoEl = document.getElementById('snapInfo');
      if (infoEl && infoEl.dataset && infoEl.dataset.persistent) {
        try { delete infoEl.dataset.persistent; } catch (e) {}
        try { infoEl.style.display = 'none'; } catch (e) {}
      }
    }
  } catch (e) {}
}

function drawGrid(ctx, canvas) {
  const tl = screenToWorld(0, 0);
  const br = screenToWorld(canvas.width, canvas.height);

  const gridPixels = gridSize * zoom;

  let displayGrid = gridSize;
  let skipFactor = 1;

  if (gridPixels < 3) {
    skipFactor = Math.ceil(3 / gridPixels);
    displayGrid = gridSize * skipFactor;
  }

  // Sekundární mřížka
  if (skipFactor > 1 && gridPixels * 5 >= 3) {
    ctx.strokeStyle = "#141414";
    const fineGrid = gridSize * Math.min(5, skipFactor);
    const sx = Math.floor(Math.min(tl.x, br.x) / fineGrid) * fineGrid;
    const ex = Math.ceil(Math.max(tl.x, br.x) / fineGrid) * fineGrid;
    const sy = Math.floor(Math.min(tl.y, br.y) / fineGrid) * fineGrid;
    const ey = Math.ceil(Math.max(tl.y, br.y) / fineGrid) * fineGrid;

    for (let x = sx; x <= ex; x += fineGrid) {
      const p = worldToScreen(x, 0);
      ctx.beginPath();
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, canvas.height);
      ctx.stroke();
    }

    for (let y = sy; y <= ey; y += fineGrid) {
      const p = worldToScreen(0, y);
      ctx.beginPath();
      ctx.moveTo(0, p.y);
      ctx.lineTo(canvas.width, p.y);
      ctx.stroke();
    }
  }

  // Hlavní mřížka
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 1;

  const sx = Math.floor(Math.min(tl.x, br.x) / displayGrid) * displayGrid;
  const ex = Math.ceil(Math.max(tl.x, br.x) / displayGrid) * displayGrid;
  const sy = Math.floor(Math.min(tl.y, br.y) / displayGrid) * displayGrid;
  const ey = Math.ceil(Math.max(tl.y, br.y) / displayGrid) * displayGrid;

  for (let x = sx; x <= ex; x += displayGrid) {
    const p = worldToScreen(x, 0);
    ctx.beginPath();
    ctx.moveTo(p.x, 0);
    ctx.lineTo(p.x, canvas.height);
    ctx.stroke();
  }

  for (let y = sy; y <= ey; y += displayGrid) {
    const p = worldToScreen(0, y);
    ctx.beginPath();
    ctx.moveTo(0, p.y);
    ctx.lineTo(canvas.width, p.y);
    ctx.stroke();
  }

  ctx.fillStyle = "#4a4a4a";
  ctx.font = "11px Arial";
  const gridLabel = gridSize >= 1 ? `${gridSize}mm` : `${gridSize.toFixed(2)}mm`;
  const displayLabel =
    skipFactor > 1
      ? `Mřížka: ${gridLabel} (zobrazeno každý ${skipFactor}.)`
      : `Mřížka: ${gridLabel}`;
  ctx.fillText(displayLabel, 10, canvas.height - 40);
  ctx.fillText(`Zoom: ${((zoom / 2) * 100).toFixed(0)}%`, 10, canvas.height - 25);
}

function drawAxes(ctx, canvas) {
  ctx.strokeStyle = "#3a3a3a";
  ctx.lineWidth = 2;

  const ox = worldToScreen(0, 0);

  if (ox.y >= 0 && ox.y <= canvas.height) {
    ctx.setLineDash([15, 5, 3, 5]);
    ctx.beginPath();
    ctx.moveTo(0, ox.y);
    ctx.lineTo(canvas.width, ox.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(canvas.width - 15, ox.y - 5);
    ctx.lineTo(canvas.width - 5, ox.y);
    ctx.lineTo(canvas.width - 15, ox.y + 5);
    ctx.stroke();
  }

  if (ox.x >= 0 && ox.x <= canvas.width) {
    ctx.beginPath();
    ctx.moveTo(ox.x, 0);
    ctx.lineTo(ox.x, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ox.x - 5, 15);
    ctx.lineTo(ox.x, 5);
    ctx.lineTo(ox.x + 5, 15);
    ctx.stroke();
  }

  if (document.getElementById("showAxisLabels")?.checked) {
    ctx.fillStyle = "#6ab0ff";
    ctx.font = "bold 14px Arial";

    if (axisMode === "lathe") {
      if (ox.y >= 0 && ox.y <= canvas.height) {
        ctx.fillText("Z", canvas.width - 25, ox.y - 10);
        ctx.fillStyle = "#888";
        ctx.font = "11px Arial";
        ctx.fillText("(délka)", canvas.width - 60, ox.y - 10);
      }
      if (ox.x >= 0 && ox.x <= canvas.width) {
        ctx.fillStyle = "#6ab0ff";
        ctx.font = "bold 14px Arial";
        ctx.fillText("X", ox.x + 10, 20);
        ctx.fillStyle = "#888";
        ctx.font = "11px Arial";
        const label =
          xMeasureMode === "diameter" ? "(průměr ⌀)" : "(poloměr R)";
        ctx.fillText(label, ox.x + 10, 35);
      }
    } else {
      if (ox.y >= 0 && ox.y <= canvas.height) {
        ctx.fillText("X", canvas.width - 25, ox.y - 10);
      }
      if (ox.x >= 0 && ox.x <= canvas.width) {
        ctx.fillText("Y", ox.x + 10, 20);
      }
    }

    if (
      ox.x >= 0 &&
      ox.x <= canvas.width &&
      ox.y >= 0 &&
      ox.y <= canvas.height
    ) {
      ctx.strokeStyle = "#6ab0ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ox.x, ox.y, 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#6ab0ff";
      ctx.font = "12px Arial";
      ctx.fillText("0", ox.x + 10, ox.y + 15);
    }
  }
}

// 🔍 Helper: Find lines adjacent to a circle (potential tangent lines for fillet)
function findAdjacentLines(circle, shapes) {
  const tolerance = circle.r * 1.5; // Lines within 1.5x radius are considered adjacent
  const adjacentLines = [];

  shapes.forEach(s => {
    if (s.type === "line") {
      // Check if line is near the circle
      const dist1 = Math.sqrt((s.x1 - circle.cx) ** 2 + (s.y1 - circle.cy) ** 2);
      const dist2 = Math.sqrt((s.x2 - circle.cx) ** 2 + (s.y2 - circle.cy) ** 2);

      if (dist1 < tolerance || dist2 < tolerance) {
        adjacentLines.push(s);
      }
    }
  });

  return adjacentLines;
}

// 📐 Helper: Calculate tangent angles for arc between two lines
function calculateTangentAngles(circle, line1, line2) {
  // Find the angles where circle touches each line
  const angles = [];

  [line1, line2].forEach(line => {
    // Calculate perpendicular from circle center to line
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return;

    // Unit vector along line
    const ux = dx / len;
    const uy = dy / len;

    // Vector from line start to circle center
    const px = circle.cx - line.x1;
    const py = circle.cy - line.y1;

    // Project onto line
    const proj = px * ux + py * uy;
    const closestX = line.x1 + proj * ux;
    const closestY = line.y1 + proj * uy;

    // Angle from circle center to closest point on line
    const angle = Math.atan2(closestY - circle.cy, closestX - circle.cx);
    angles.push(angle);
  });

  if (angles.length === 2) {
    return { start: angles[0], end: angles[1] };
  }

  return null;
}

function drawShape(ctx, s, canvas) {
  let strokeColor = s.color || "#4a9eff";

  // Zvýraznění při přichycení na polární úhel
  if (s.type === "line" && window.updateSnap) {
    const snap = window.updateSnap(s, { x: s.x2, y: s.y2 });
    if (snap.snapped) strokeColor = snap.color;
  }

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;

  // === BOD (point) ===
  if (s.type === "point") {
    const p = worldToScreen(s.x, s.y);
    const pointSize = 6;

    // Vnější kroužek
    ctx.beginPath();
    ctx.arc(p.x, p.y, pointSize, 0, Math.PI * 2);
    ctx.fillStyle = s.color || "#4ade80";
    ctx.fill();
    ctx.strokeStyle = "#166534";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Vnitřní tečka
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    return;
  }

  // Aplikovat styl čáry
  if (s.lineStyle === "thick") {
    ctx.lineWidth = 4;
  } else if (s.lineStyle === "thin") {
    ctx.lineWidth = 1;
  } else if (s.lineStyle === "dashed") {
    ctx.setLineDash([8, 4]);
  } else if (s.lineStyle === "dotted") {
    ctx.setLineDash([2, 2]);
  } else {
    ctx.setLineDash([]);
  }

  if (s.type === "line") {
    const p1 = worldToScreen(s.x1, s.y1);
    const p2 = worldToScreen(s.x2, s.y2);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  if (s.type === "circle") {
    const c = worldToScreen(s.cx, s.cy);

    // 🔍 Auto-detect tangential fillet: check if circle is between two lines
    const adjacentLines = findAdjacentLines(s, window.shapes);

    if (adjacentLines.length >= 2) {
      // Draw only the arc portion that connects the two lines
      const angles = calculateTangentAngles(s, adjacentLines[0], adjacentLines[1]);
      if (angles && angles.start !== undefined && angles.end !== undefined) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, s.r * zoom, angles.start, angles.end, false);
        ctx.stroke();
        return; // Don't draw full circle
      }
    }

    // Default: draw full circle (když není 2 sousední čáry NEBO selhala detekce úhlů)
    ctx.beginPath();
    ctx.arc(c.x, c.y, s.r * zoom, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (s.type === "rectangle") {
    const p1 = worldToScreen(s.x1, s.y1);
    const p2 = worldToScreen(s.x2, s.y2);

    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const width = Math.abs(p2.x - p1.x);
    const height = Math.abs(p2.y - p1.y);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = s.lineStyle === "thick" ? 4 : (s.lineStyle === "thin" ? 1 : 2);

    // Kresli obdélník jako čtyři samostatné úsečky (aby bylo jasné, že jde o 4 segmenty)
    ctx.beginPath();
    const r1 = { x: p1.x, y: p1.y };
    const r2 = { x: p2.x, y: p1.y };
    const r3 = { x: p2.x, y: p2.y };
    const r4 = { x: p1.x, y: p2.y };
    ctx.moveTo(r1.x, r1.y);
    ctx.lineTo(r2.x, r2.y);
    ctx.lineTo(r3.x, r3.y);
    ctx.lineTo(r4.x, r4.y);
    ctx.closePath();
    ctx.stroke();
  }

  if (s.type === "arc") {
    const c = worldToScreen(s.cx, s.cy);

    let angle1, angle2, counterclockwise;
    let p1, p2; // Declare outside to avoid "not defined" errors

    // Support two arc formats:
    // 1. AI-generated: {cx, cy, r, startAngle, endAngle, counterclockwise}
    // 2. User-drawn: {x1, y1, x2, y2, cx, cy, r, angle}

    if (typeof s.startAngle === "number" && typeof s.endAngle === "number") {
      // Format 1: Direct angles (in degrees from AI)
      angle1 = (s.startAngle * Math.PI) / 180; // Convert to radians
      angle2 = (s.endAngle * Math.PI) / 180;
      counterclockwise = s.counterclockwise || false;

      // Calculate endpoint positions for drawing dots
      p1 = {
        x: c.x + s.r * zoom * Math.cos(angle1),
        y: c.y + s.r * zoom * Math.sin(angle1)
      };
      p2 = {
        x: c.x + s.r * zoom * Math.cos(angle2),
        y: c.y + s.r * zoom * Math.sin(angle2)
      };
    } else if (s.x1 !== undefined && s.y1 !== undefined) {
      // Format 2: Calculate from endpoints
      p1 = worldToScreen(s.x1, s.y1);
      p2 = worldToScreen(s.x2, s.y2);
      angle1 = Math.atan2(p1.y - c.y, p1.x - c.x);
      angle2 = Math.atan2(p2.y - c.y, p2.x - c.x);
      counterclockwise = s.angle > 180 ? true : false;
    } else {
      return; // Invalid arc
    }

    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = s.lineStyle === "thick" ? 4 : (s.lineStyle === "thin" ? 1 : 2);

    if (s.lineStyle === "dashed") {
      ctx.setLineDash([8, 4]);
    } else if (s.lineStyle === "dotted") {
      ctx.setLineDash([2, 2]);
    }

    ctx.beginPath();
    ctx.arc(
      c.x,
      c.y,
      s.r * zoom,
      angle1,
      angle2,
      counterclockwise
    );
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = strokeColor;
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ===== KÓTY (DIMENSIONS) =====
  if (s.type === "dimension") {
    ctx.strokeStyle = window.dimensionLineColor || "#ffa500";
    ctx.fillStyle = window.dimensionTextColor || "#ffff99";
    ctx.lineWidth = 0.4;
    ctx.font = "bold 12px Arial";

    if (s.dimType === "linear") {
      const p1 = worldToScreen(s.x1, s.y1);
      const p2 = worldToScreen(s.x2, s.y2);

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const offsetDist = 25;
      // Offset vždy nahoru (kolmo na čáru, v kladném Y směru)
      const offsetX = Math.cos(angle + Math.PI / 2) * offsetDist;
      const offsetY = Math.sin(angle + Math.PI / 2) * offsetDist;

      // Pokud je offsetY kladný, flip - chceme aby kóta byla vždy nahoru
      const finalOffsetX = offsetY < 0 ? offsetX : -offsetX;
      const finalOffsetY = offsetY < 0 ? offsetY : -offsetY;

      const dp1x = p1.x + finalOffsetX;
      const dp1y = p1.y + finalOffsetY;
      const dp2x = p2.x + finalOffsetX;
      const dp2y = p2.y + finalOffsetY;

      // Svislé čáry (čárkované)
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(dp1x, dp1y);
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(dp2x, dp2y);
      ctx.stroke();

      // Hlavní čára
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(dp1x, dp1y);
      ctx.lineTo(dp2x, dp2y);
      ctx.stroke();

      // Šipky - na koncích kóty, s logickou přizpůsobením
      const arrowLen = Math.hypot(dp2x - dp1x, dp2y - dp1y);
      const minSpace = 60; // minimální prostor pro šipku + hodnotu

      let arrow1x = dp1x, arrow1y = dp1y, arrow2x = dp2x, arrow2y = dp2y;

      // Pokud je kóta příliš krátká, posunout šipky ven
      if (arrowLen < minSpace) {
        const arrowDist = 25; // vzdálenost šipek ven od koncových bodů
        const arrowDirX = (dp2x - dp1x) / arrowLen;
        const arrowDirY = (dp2y - dp1y) / arrowLen;

        arrow1x = dp1x - arrowDirX * arrowDist;
        arrow1y = dp1y - arrowDirY * arrowDist;
        arrow2x = dp2x + arrowDirX * arrowDist;
        arrow2y = dp2y + arrowDirY * arrowDist;
      }

      drawArrow(ctx, arrow1x, arrow1y, angle + Math.PI, 8);
      drawArrow(ctx, arrow2x, arrow2y, angle, 8);

      // Text - nad úsečkou, rovnoběžně zarovnán
      const textX = (dp1x + dp2x) / 2;
      const textY = (dp1y + dp2y) / 2 - 15;

      ctx.save();
      ctx.translate(textX, textY);

      // Opravit orientaci textu - pokud je úhel obrácený, natočit zpět
      let textAngle = angle;
      if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
        textAngle = angle + Math.PI;
      }
      ctx.rotate(textAngle);

      ctx.fillStyle = window.dimensionTextColor || "#ffff99";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (s.value !== null && s.value !== undefined) {
        ctx.fillText(`${s.value.toFixed(1)}`, 0, 0);
      }

      ctx.restore();
      ctx.textAlign = "start";
    } else if (s.dimType === "radius") {
      const c = worldToScreen(s.cx, s.cy);
      const angle = Math.PI / 4;
      const r = s.r * zoom;
      const ex = c.x + r * Math.cos(angle);
      const ey = c.y + r * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      drawArrow(ctx, ex, ey, angle, 8);

      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(ex + 10, ey - 12, 60, 16);
      ctx.fillStyle = window.dimensionTextColor || "#ffff99";
      if (s.value !== null && s.value !== undefined) {
        ctx.fillText(`${s.label}${s.value.toFixed(1)}`, ex + 15, ey);
      }
    } else if (s.dimType === "center") {
      const c = worldToScreen(s.cx, s.cy);
      const size = 8;

      ctx.beginPath();
      ctx.moveTo(c.x - size, c.y);
      ctx.lineTo(c.x + size, c.y);
      ctx.moveTo(c.x, c.y - size);
      ctx.lineTo(c.x, c.y + size);
      ctx.stroke();
    } else if (s.dimType === "rectWidth") {
      const p1 = worldToScreen(s.x1, s.y1);
      const p2 = worldToScreen(s.x2, s.y2);

      const angle = 0; // Vodorovná
      const offsetDist = 25;
      const offsetY = -offsetDist;

      const dp1x = p1.x;
      const dp1y = p1.y + offsetY;
      const dp2x = p2.x;
      const dp2y = p2.y + offsetY;

      // Svislé čáry (čárkované)
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(dp1x, dp1y);
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(dp2x, dp2y);
      ctx.stroke();

      // Hlavní čára
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(dp1x, dp1y);
      ctx.lineTo(dp2x, dp2y);
      ctx.stroke();

      // Šipky
      drawArrow(ctx, dp1x, dp1y, 0, 8);
      drawArrow(ctx, dp2x, dp2y, Math.PI, 8);

      // Text - nad úsečkou
      const textX = (dp1x + dp2x) / 2;
      const textY = dp1y - 15;

      ctx.save();
      ctx.translate(textX, textY);

      ctx.fillStyle = window.dimensionTextColor || "#ffff99";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (s.value !== null && s.value !== undefined) {
        ctx.fillText(`${s.value.toFixed(1)}`, 0, 0);
      }

      ctx.restore();
      ctx.textAlign = "start";
    } else if (s.dimType === "rectHeight") {
      const p1 = worldToScreen(s.x1, s.y1);
      const p2 = worldToScreen(s.x1, s.y2);

      const angle = Math.PI / 2; // Svislá
      const offsetDist = 30;
      const offsetX = -offsetDist;

      const dp1x = p1.x + offsetX;
      const dp1y = p1.y;
      const dp2x = p2.x + offsetX;
      const dp2y = p2.y;

      // Vodorovné čáry (čárkované)
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(dp1x, dp1y);
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(dp2x, dp2y);
      ctx.stroke();

      // Hlavní čára
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(dp1x, dp1y);
      ctx.lineTo(dp2x, dp2y);
      ctx.stroke();

      // Šipky
      drawArrow(ctx, dp1x, dp1y, Math.PI / 2, 8);
      drawArrow(ctx, dp2x, dp2y, -Math.PI / 2, 8);

      // Text - nad úsečkou, rovnoběžně zarovnán
      const textX = dp1x - 15;
      const textY = (dp1y + dp2y) / 2;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(Math.PI / 2);

      ctx.fillStyle = window.dimensionTextColor || "#ffff99";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (s.value !== null && s.value !== undefined) {
        ctx.fillText(`${s.value.toFixed(1)}`, 0, 0);
      }

      ctx.restore();
      ctx.textAlign = "start";
    }
  }
}

function drawArrow(ctx, x, y, angle, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size / 2);
  ctx.lineTo(-size, size / 2);
  ctx.closePath();
  ctx.fillStyle = "#ffa500";
  ctx.fill();
  ctx.restore();
}

// ===== UNDO/REDO =====

// Initialize undo/redo stacks if not already done
if (!window.undoStack) window.undoStack = [];
if (!window.redoStack) window.redoStack = [];
const MAX_HISTORY = 10;

function saveState() {
  const state = {
    shapes: JSON.parse(JSON.stringify(window.shapes)),
    points: JSON.parse(JSON.stringify(window.points)),
  };

  window.undoStack.push(state);

  if (window.undoStack.length > MAX_HISTORY) {
    window.undoStack.shift();
  }

  window.redoStack = [];
}

function undo() {
  if (window.undoStack.length === 0) {
    const info = document.getElementById("snapInfo");
    if (info) {
      info.textContent = "⚠️ Není co vrátit zpět";
      info.style.display = "block";
      setTimeout(() => (info.style.display = "none"), 1000);
    }
    return;
  }

  const currentState = {
    shapes: JSON.parse(JSON.stringify(window.shapes)),
    points: JSON.parse(JSON.stringify(window.points)),
  };
  window.redoStack.push(currentState);

  if (window.redoStack.length > MAX_HISTORY) {
    window.redoStack.shift();
  }

  const prevState = window.undoStack.pop();
  window.shapes.length = 0;
  window.shapes.push(...JSON.parse(JSON.stringify(prevState.shapes)));
  window.points.length = 0;
  window.points.push(...JSON.parse(JSON.stringify(prevState.points)));

  updateSnapPoints();
  draw();

  const info = document.getElementById("snapInfo");
  if (info) {
    info.textContent = `↶ Zpět (zbývá ${window.undoStack.length})`;
    info.style.display = "block";
    setTimeout(() => (info.style.display = "none"), 1000);
  }
}

function redo() {
  if (window.redoStack.length === 0) {
    const info = document.getElementById("snapInfo");
    if (info) {
      info.textContent = "⚠️ Není co vrátit vpřed";
      info.style.display = "block";
      setTimeout(() => (info.style.display = "none"), 1000);
    }
    return;
  }

  const currentState = {
    shapes: JSON.parse(JSON.stringify(window.shapes)),
    points: JSON.parse(JSON.stringify(window.points)),
  };
  window.undoStack.push(currentState);

  if (window.undoStack.length > MAX_HISTORY) {
    window.undoStack.shift();
  }

  const nextState = window.redoStack.pop();
  window.shapes.length = 0;
  window.shapes.push(...JSON.parse(JSON.stringify(nextState.shapes)));
  window.points.length = 0;
  window.points.push(...JSON.parse(JSON.stringify(nextState.points)));

  updateSnapPoints();
  draw();

  const info = document.getElementById("snapInfo");
  if (info) {
    info.textContent = `↷ Vpřed (zbývá ${window.redoStack.length})`;
    info.style.display = "block";
    setTimeout(() => (info.style.display = "none"), 1000);
  }
}

// Export functions to window global
window.draw = draw;
window.undo = undo;
window.redo = redo;
window.aiUndo = undo;  // Alias for aiUndo
window.aiRedo = redo;  // Alias for aiRedo
window.saveState = saveState;
window.updateSnapSettings = updateSnapSettings;
window.updateSnapPoints = updateSnapPoints;
window.screenToWorld = screenToWorld;
window.worldToScreen = worldToScreen;
window.snapPoint = function(x, y) {
  const result = snapPointInternal({ x, y });
  return result.point;
};

// ===== UTILITY FUNCTIONS =====

window.calculateIntersections = function () {
  const intersections = [];

  // Najdi průsečíky mezi všemi tvary
  for (let i = 0; i < window.shapes.length; i++) {
    for (let j = i + 1; j < window.shapes.length; j++) {
      const s1 = window.shapes[i];
      const s2 = window.shapes[j];

      if (s1.type === "line" && s2.type === "line") {
        // Průsečík dvou čar
        const denom = (s1.x1 - s1.x2) * (s2.y1 - s2.y2) - (s1.y1 - s1.y2) * (s2.x1 - s2.x2);
        if (Math.abs(denom) > 1e-10) {
          const t = ((s1.x1 - s2.x1) * (s2.y1 - s2.y2) - (s1.y1 - s2.y1) * (s2.x1 - s2.x2)) / denom;
          const u = -((s1.x1 - s1.x2) * (s1.y1 - s2.y1) - (s1.y1 - s1.y2) * (s1.x1 - s2.x1)) / denom;

          if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            intersections.push({
              x: s1.x1 + t * (s1.x2 - s1.x1),
              y: s1.y1 + t * (s1.y2 - s1.y1)
            });
          }
        }
      }
    }
  }

  // Přidej průsečíky jako body
  intersections.forEach(pt => {
    if (!window.points.some(p => Math.abs(p.x - pt.x) < 1 && Math.abs(p.y - pt.y) < 1)) {
      window.points.push(pt);
    }
  });

  if (window.draw) window.draw();
};

window.showColorPicker = function () {
  if (!window.selectedItems || window.selectedItems.length === 0) {
    alert("❌ Nejprve vyberte objekty pro změnu barvy!");
    return;
  }

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = window.currentColor;
  colorInput.onchange = function () {
    window.currentColor = this.value;
    // Aplikovat barvu na všechny vybrané objekty
    for (let item of window.selectedItems) {
      if (item.type === "shape") {
        for (let s of window.shapes) {
          if (s === item.obj) {
            s.color = window.currentColor;
          }
        }
      }
    }
    if (window.saveState) window.saveState();
    if (window.draw) window.draw();
  };
  colorInput.click();
};

window.clearAll = function () {
  if (confirm("Opravdu chceš vymazat všechny tvary?")) {
    window.shapes = [];
    window.points = [];
    window.selectedItems = [];

    // Zapsat přímo PRÁZDNÝ projekt do localStorage (ne jen smazat)
    try {
      const emptyProject = {
        version: "1.0",
        date: new Date().toISOString(),
        settings: {
          zoom: window.zoom || 1,
          panX: window.panX || 0,
          panY: window.panY || 0,
        },
        shapes: [],
        points: [],
      };
      localStorage.setItem('autosave_project', JSON.stringify(emptyProject));
    } catch (e) {
    }

    if (window.saveState) window.saveState();
    if (window.draw) window.draw();
  }
};

window.exportPNG = function () {
  const canvas = document.getElementById("canvas");
  if (!canvas) return;

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "drawing_" + new Date().getTime() + ".png";
  link.click();
};

// ===== SELECTION & STATE =====
window.clearSelection = function () {
  if (!window.selectedItems) window.selectedItems = [];
  window.selectedItems = [];
  window.selectedShape = null;
  if (window.draw) window.draw();
};

// ===== BOOLEAN OPERATIONS =====
// Implementováno v ui.js - tyto jsou jen záložky
// Odkazují na ui.js verze s plnou funkcionalitou

// ===== DIMENSION OPERATIONS =====
window.deleteAllDimensions = function () {
  const countBefore = window.shapes.filter((s) => s.type === "dimension").length;

  if (countBefore === 0) {
    return;
  }

  window.shapes = window.shapes.filter((s) => s.type !== "dimension");

  if (window.saveState) window.saveState();
};

window.dimensionAll = function () {
  if (!window.saveState) return;
  if (!window.updateSnapPoints) return;
  if (!window.draw) return;
  if (!window.shapes) window.shapes = [];

  window.saveState();
  let countAdded = 0;

  for (let s of window.shapes) {
    if (s.type === "circle") {
      const displayR = window.xMeasureMode === "diameter" ? s.r * 2 : s.r;
      const label = window.xMeasureMode === "diameter" ? "⌀" : "R";

      window.shapes.push({
        type: "dimension",
        dimType: "radius",
        target: s,
        value: displayR,
        label: label,
        cx: s.cx,
        cy: s.cy,
        r: s.r,
      });

      window.shapes.push({
        type: "dimension",
        dimType: "center",
        cx: s.cx,
        cy: s.cy,
      });

      countAdded++;
    } else if (s.type === "line") {
      const dx = s.x2 - s.x1;
      const dy = s.y2 - s.y1;
      const len = Math.sqrt(dx * dx + dy * dy);

      window.shapes.push({
        type: "dimension",
        dimType: "linear",
        target: s,
        value: len,
        x1: s.x1,
        y1: s.y1,
        x2: s.x2,
        y2: s.y2,
      });

      countAdded++;
    } else if (s.type === "rectangle") {
      const w = Math.abs(s.x2 - s.x1);
      const h = Math.abs(s.y2 - s.y1);

      // Kóta šířky
      window.shapes.push({
        type: "dimension",
        dimType: "rectWidth",
        target: s,
        value: w,
        x1: s.x1,
        y1: s.y1,
        x2: s.x2,
        y2: s.y1,
      });

      // Kóta výšky
      window.shapes.push({
        type: "dimension",
        dimType: "rectHeight",
        target: s,
        value: h,
        x1: s.x1,
        y1: s.y1,
        x2: s.x1,
        y2: s.y2,
      });

      countAdded += 2;
    }
  }

  if (countAdded === 0) {
    return;
  }

  window.updateSnapPoints();
  window.draw();
};

// ===== ARC TOOL =====
window.createArc = function (x1, y1, x2, y2, angle) {
  // angle je úhel oblouku v stupních
  // Vypočítáme střed a poloměr
  const mid_x = (x1 + x2) / 2;
  const mid_y = (y1 + y2) / 2;
  const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  // Polovina úhlu v radiánech
  const half_angle = (angle * Math.PI) / 360;

  // Poloměr oblouku
  const r = d / 2 / Math.sin(half_angle);

  // Směr mezi body
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dir_angle = Math.atan2(dy, dx);

  // Střed oblouku (kolmo na polovinu délky)
  const perp_angle = dir_angle + Math.PI / 2;
  const h = r * Math.cos(half_angle);
  const cx = mid_x + h * Math.cos(perp_angle);
  const cy = mid_y + h * Math.sin(perp_angle);

  const newArc = {
    type: "arc",
    cx: cx,
    cy: cy,
    r: r,
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2,
    angle: angle,
    color: window.defaultDrawColor || "#4a9eff",
    lineStyle: window.defaultDrawLineStyle || "solid",
  };

  window.shapes.push(newArc);
  if (window.saveState) window.saveState();
  if (window.updateSnapPoints) window.updateSnapPoints();
  if (window.draw) window.draw();
};

// ===== ROTATE TOOL =====
window.beginRotate = function () {
  if (!window.selectedItems || window.selectedItems.length === 0) {
    alert("❌ Nejprve vyberte objekty pro rotaci!");
    return;
  }
  window.rotateStep = 0;
  window.rotateCenter = null;
  if (window.setMode) window.setMode("rotate");
};

window.performRotate = function () {
  if (!window.rotateCenter || !window.selectedItems || window.selectedItems.length === 0) {
    alert("⚠️ Nejdříve vyberte objekty a střed rotace!");
    return;
  }

  if (window.saveState) window.saveState();
  const angleRad = (window.rotateAngle * Math.PI) / 180;
  const cos_a = Math.cos(angleRad);
  const sin_a = Math.sin(angleRad);

  for (let item of window.selectedItems) {
    if (item.type === "shape") {
      const s = item.obj;

      if (s.type === "line") {
        const dx1 = s.x1 - window.rotateCenter.x;
        const dy1 = s.y1 - window.rotateCenter.y;
        s.x1 = window.rotateCenter.x + (dx1 * cos_a - dy1 * sin_a);
        s.y1 = window.rotateCenter.y + (dx1 * sin_a + dy1 * cos_a);

        const dx2 = s.x2 - window.rotateCenter.x;
        const dy2 = s.y2 - window.rotateCenter.y;
        s.x2 = window.rotateCenter.x + (dx2 * cos_a - dy2 * sin_a);
        s.y2 = window.rotateCenter.y + (dx2 * sin_a + dy2 * cos_a);
      } else if (s.type === "circle") {
        const dx = s.cx - window.rotateCenter.x;
        const dy = s.cy - window.rotateCenter.y;
        s.cx = window.rotateCenter.x + (dx * cos_a - dy * sin_a);
        s.cy = window.rotateCenter.y + (dx * sin_a + dy * cos_a);
      } else if (s.type === "arc") {
        const dx_start = s.x1 - window.rotateCenter.x;
        const dy_start = s.y1 - window.rotateCenter.y;
        s.x1 = window.rotateCenter.x + (dx_start * cos_a - dy_start * sin_a);
        s.y1 = window.rotateCenter.y + (dx_start * sin_a + dy_start * cos_a);

        const dx_end = s.x2 - window.rotateCenter.x;
        const dy_end = s.y2 - window.rotateCenter.y;
        s.x2 = window.rotateCenter.x + (dx_end * cos_a - dy_end * sin_a);
        s.y2 = window.rotateCenter.y + (dx_end * sin_a + dy_end * cos_a);

        const dx_c = s.cx - window.rotateCenter.x;
        const dy_c = s.cy - window.rotateCenter.y;
        s.cx = window.rotateCenter.x + (dx_c * cos_a - dy_c * sin_a);
        s.cy = window.rotateCenter.y + (dx_c * sin_a + dy_c * cos_a);
      }
    } else if (item.type === "point") {
      const p = item.obj;
      const dx = p.x - window.rotateCenter.x;
      const dy = p.y - window.rotateCenter.y;
      p.x = window.rotateCenter.x + (dx * cos_a - dy * sin_a);
      p.y = window.rotateCenter.y + (dx * sin_a + dy * cos_a);
    }
  }

  window.rotateStep = 0;
  window.rotateCenter = null;
  window.rotateAngle = 0;
  window.selectedItems = [];
  if (window.updateSnapPoints) window.updateSnapPoints();
  if (window.draw) window.draw();
  alert(`✅ Rotace o ${window.rotateAngle}° aplikována`);
  if (window.setMode) window.setMode("pan");
};

// ===== POLAR SNAP =====
window.togglePolarSnapLegacy = function () {
  window.polarSnapEnabled = !window.polarSnapEnabled;
  const checkbox = document.getElementById("polarSnapCheckboxLegacy");
  if (checkbox) {
    checkbox.checked = window.polarSnapEnabled;
  }
};

// ===== GRID SPACING =====
window.setGridSpacing = function (spacing) {
  window.gridSpacing = spacing;
  document.getElementById("gridSpacing").value = spacing;
  window.draw();
};

window.updateGridSpacing = function () {
  window.gridSpacing = parseFloat(document.getElementById("gridSpacing").value);
  window.draw();
};

// ===== SIMDXF IMPORT =====
window.importSimDxfProject = function (input) {
  const file = input.files[0];
  if (!file) return;

  // Zkontrolovat příponu
  if (!file.name.endsWith(".json")) {
    alert("❌ Chyba: Můžeš načíst pouze .json soubory!");
    input.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const simDxfData = JSON.parse(e.target.result);

      // Validace struktury SimDxf JSON
      if (!simDxfData.points || !Array.isArray(simDxfData.points)) {
        throw new Error("Neplatný formát SimDxf - chybí pole points");
      }

      // Potvrdit import (pokud už něco nakresleného)
      if (window.shapes.length > 0 || window.points.length > 0) {
        const confirm = window.confirm(
          "⚠️ Importem z SimDxf přepíšeš aktuální kreslení.\n\n" +
          "Chceš pokračovat?"
        );
        if (!confirm) {
          input.value = "";
          return;
        }
      }

      // Konvertovat SimDxf na 2D_AI formát
      const converted = window.convertSimDxfToShapes(simDxfData);

      // Vyčistit stávající kreslení
      window.shapes.length = 0;
      window.points.length = 0;

      // Načíst konvertovaná data
      window.shapes.push(...converted.shapes);
      window.points.push(...converted.points);

      // Nastavit počátek (Auto-Zero)
      if (simDxfData.machineType) {
        const modeInfo = document.getElementById("modeInfo");
        if (modeInfo) {
          modeInfo.textContent = `📥 Import z SimDxf: ${simDxfData.machineType || "Import"}`;
          modeInfo.classList.add("show");
          setTimeout(() => {
            modeInfo.classList.remove("show");
          }, 3000);
        }
      }

      // Vykreslení
      window.fitCanvasToShapes();
      window.draw();

      // Resetovat file input
      input.value = "";
    } catch (error) {
      alert(`❌ Chyba při importu: ${error.message}`);
      input.value = "";
    }
  };

  reader.readAsText(file);
};

window.convertSimDxfToShapes = function (simDxfData) {
  const newShapes = [];
  const newPoints = [];

  const pointsList = simDxfData.points || [];

  for (let i = 0; i < pointsList.length; i++) {
    const current = pointsList[i];
    const next = pointsList[i + 1];

    // Konverze souřadnic: SimDxf (x=Z, z=X) → 2D_AI (x=X, y=Y/Z)
    const x1 = window.convertCoordinate(current.x, "z");
    const y1 = window.convertCoordinate(current.z, "x");

    // Pokud existuje přestup (break flag), přidáme bod
    if (current.break) {
      newPoints.push({ type: "point", x: x1, y: y1, id: `simDxf_${current.id}` });
    }

    if (!next) continue; // Poslední bod

    const x2 = window.convertCoordinate(next.x, "z");
    const y2 = window.convertCoordinate(next.z, "x");

    // Zpracování podle typu
    if (current.type === "arc" && current.r !== undefined) {
      const cx = window.convertCoordinate(current.cx, "z");
      const cy = window.convertCoordinate(current.cz, "x");
      const r = Math.abs(current.r);

      newShapes.push({
        type: "circle",
        cx: cx,
        cy: cy,
        r: r,
        id: `simDxf_arc_${current.id}`,
      });
    } else {
      newShapes.push({
        type: "line",
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        id: `simDxf_line_${current.id}`,
      });
    }
  }

  return { shapes: newShapes, points: newPoints };
};

window.convertCoordinate = function (value, axis) {
  // SimDxf souřadnice jsou v mm (typicky 0-100+)
  // Vraťíme jako je (bez změny měřítka)
  return parseFloat(value) || 0;
};

window.fitCanvasToShapes = function () {
  // Pokud máme nějaké tvary, přizpůsobíme canvas na jejich velikost
  if (window.shapes.length === 0) {
    window.zoom = 1;
    window.panX = window.canvas.width / 2;
    window.panY = -window.canvas.height / 2;
    return;
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  // Najít hranice všech tvarů
  for (const shape of window.shapes) {
    if (shape.type === "line") {
      minX = Math.min(minX, shape.x1, shape.x2);
      maxX = Math.max(maxX, shape.x1, shape.x2);
      minY = Math.min(minY, shape.y1, shape.y2);
      maxY = Math.max(maxY, shape.y1, shape.y2);
    } else if (shape.type === "circle") {
      minX = Math.min(minX, shape.cx - shape.r);
      maxX = Math.max(maxX, shape.cx + shape.r);
      minY = Math.min(minY, shape.cy - shape.r);
      maxY = Math.max(maxY, shape.cy + shape.r);
    } else if (shape.type === "point") {
      minX = Math.min(minX, shape.x);
      maxX = Math.max(maxX, shape.x);
      minY = Math.min(minY, shape.y);
      maxY = Math.max(maxY, shape.y);
    }
  }

  // Přidat margini
  const width = maxX - minX || 100;
  const height = maxY - minY || 100;
  const margin = 50;

  // Vypočítat zoom aby se vešlo
  const zoomX = (window.canvas.width - 2 * margin) / width;
  const zoomY = (window.canvas.height - 2 * margin) / height;
  window.zoom = Math.min(zoomX, zoomY, 5);

  // Vykreslit na střed
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  window.panX = window.canvas.width / 2 - centerX * window.zoom;
  window.panY = window.canvas.height / 2 - centerY * window.zoom;
};

// ===== POLÁRNÍ SOUŘADNICE =====
window.addLinePolar = function() {
  const z0 = parseFloat(document.getElementById("polarStartZ").value);
  let x0 = parseFloat(document.getElementById("polarStartX").value);
  if (window.xMeasureMode === "diameter") x0 /= 2;
  const dist = parseFloat(document.getElementById("polarDist").value);
  const angle = (parseFloat(document.getElementById("polarAngle").value) * Math.PI) / 180;
  const z1 = z0 + dist * Math.cos(angle);
  const x1 = x0 + dist * Math.sin(angle);
  window.shapes.push({ type: "line", x1: z0, y1: x0, x2: z1, y2: x1, color: window.defaultDrawColor || "#4a9eff", lineStyle: window.defaultDrawLineStyle || "solid" });
  let displayX1 = x1;
  if (window.xMeasureMode === "diameter") displayX1 *= 2;
  document.getElementById("polarStartZ").value = z1.toFixed(2);
  document.getElementById("polarStartX").value = displayX1.toFixed(2);
  window.updateSnapPoints();
  window.draw();
};

window.addPointPolar = function() {
  const z0 = parseFloat(document.getElementById("polarStartZ").value);
  let x0 = parseFloat(document.getElementById("polarStartX").value);
  if (window.xMeasureMode === "diameter") x0 /= 2;
  const dist = parseFloat(document.getElementById("polarDist").value);
  const angle = (parseFloat(document.getElementById("polarAngle").value) * Math.PI) / 180;
  const z1 = z0 + dist * Math.cos(angle);
  const x1 = x0 + dist * Math.sin(angle);
  window.points.push({ x: z1, y: x1 });
  let displayX1 = x1;
  if (window.xMeasureMode === "diameter") displayX1 *= 2;
  document.getElementById("polarStartZ").value = z1.toFixed(2);
  document.getElementById("polarStartX").value = displayX1.toFixed(2);
  window.updateSnapPoints();
  window.draw();
};

// ===== LINE COORDINATES =====
window.setLineStart = function() {
  let yVal = window.cursorPos.y;
  if (window.xMeasureMode === "diameter") yVal *= 2;
  document.getElementById("lineZ1").value = window.cursorPos.x.toFixed(2);
  document.getElementById("lineX1").value = yVal.toFixed(2);
};

window.setLineEnd = function() {
  let yVal = window.cursorPos.y;
  if (window.xMeasureMode === "diameter") yVal *= 2;
  document.getElementById("lineZ2").value = window.cursorPos.x.toFixed(2);
  document.getElementById("lineX2").value = yVal.toFixed(2);
};

window.addLineByCoords = function() {
  const z1 = parseFloat(document.getElementById("lineZ1").value);
  let x1 = parseFloat(document.getElementById("lineX1").value);
  const z2 = parseFloat(document.getElementById("lineZ2").value);
  let x2 = parseFloat(document.getElementById("lineX2").value);
  if (window.xMeasureMode === "diameter") { x1 /= 2; x2 /= 2; }
  window.shapes.push({ type: "line", x1: z1, y1: x1, x2: z2, y2: x2, color: window.defaultDrawColor || "#4a9eff", lineStyle: window.defaultDrawLineStyle || "solid" });
  window.updateSnapPoints();
  window.draw();
};

// ===== CIRCLE COORDINATES =====
window.setCircleCenter = function() {
  let yVal = window.cursorPos.y;
  if (window.xMeasureMode === "diameter") yVal *= 2;
  document.getElementById("quickCircleZ").value = window.cursorPos.x.toFixed(2);
  document.getElementById("quickCircleX").value = yVal.toFixed(2);
};

// ===== CIRCLE MODAL =====
window.closeCircleModal = function() {
  document.getElementById("circleModal").style.display = "none";
  window.pendingCircleCenter = null;
  window.tempShape = null;
  window.draw();
};

window.confirmCircle = function() {
  const r = parseFloat(document.getElementById("circleInputR").value);
  if (window.pendingCircleCenter && !isNaN(r) && r > 0) {
    window.shapes.push({
      type: "circle",
      cx: window.pendingCircleCenter.x,
      cy: window.pendingCircleCenter.y,
      r: r
    });
    window.saveState();
    window.updateSnapPoints();
  }
  window.closeCircleModal();
};

window.updateCircleInputs = function(source) {
  const inputR = document.getElementById("circleInputR");
  const inputD = document.getElementById("circleInputD");
  if (source === "R") {
    const r = parseFloat(inputR.value);
    if (!isNaN(r)) inputD.value = (r * 2).toFixed(2);
  } else {
    const d = parseFloat(inputD.value);
    if (!isNaN(d)) inputR.value = (d / 2).toFixed(2);
  }
};

// ===== CONSTRAINT MODAL =====
window.closeConstraintModal = function() {
  document.getElementById("constraintModal").style.display = "none";
};

window.applyConstraint = function(constraintType) {
  window.closeConstraintModal();
  window.constraintMode = constraintType;
  window.constraintSelection = [];
  const info = document.getElementById("modeInfo");
  const constraintNames = {
    point: "📍 Bod",
    distance: "📏 Vzdálenost",
    radius: "⭕ Radius",
    polarAngle: "⟲ Polární úhel",
    horizontal: "➡️ Vodorovně",
    vertical: "⬆️ Svisle"
  };
  if (info) {
    info.innerHTML = `🔒 <strong>${constraintNames[constraintType]}</strong>: Klikej na objekty na plátně<br/><small>(ESC = zrušit)`;
  }
  if (window.canvas) window.canvas.style.cursor = "crosshair";
};

window.cancelConstraintValue = function() {
  document.getElementById("constraintPointModal").style.display = "none";
  document.getElementById("constraintDistanceModal").style.display = "none";
  document.getElementById("constraintRadiusModal").style.display = "none";
  document.getElementById("constraintPolarAngleModal").style.display = "none";
  window.constraintMode = null;
  window.constraintSelection = [];
  if (window.canvas) window.canvas.style.cursor = "default";
};

window.confirmConstraintPoint = function() {
  let constraintX = parseFloat(document.getElementById("constraintPointX").value) || 0;
  const constraintZ = parseFloat(document.getElementById("constraintPointZ").value) || 0;
  if (window.xMeasureMode === "diameter") constraintX /= 2;
  window.applyConstraintToSelection("point", { x: constraintZ, y: constraintX });
  window.cancelConstraintValue();
};

window.confirmConstraintDistance = function() {
  const distance = parseFloat(document.getElementById("constraintDistanceValue").value) || 0;
  window.applyConstraintToSelection("distance", distance);
  window.cancelConstraintValue();
};

window.confirmConstraintRadius = function() {
  const radius = parseFloat(document.getElementById("constraintRadiusValue").value) || 0;
  window.applyConstraintToSelection("radius", radius);
  window.cancelConstraintValue();
};

window.confirmConstraintPolarAngle = function() {
  const angle = parseFloat(document.getElementById("constraintPolarAngleValue").value) || 0;
  window.applyConstraintToSelection("polarAngle", angle);
  window.cancelConstraintValue();
};

window.removeConstraint = function(type) {
  document.getElementById("constraintPointModal").style.display = "none";
  document.getElementById("constraintDistanceModal").style.display = "none";
  document.getElementById("constraintRadiusModal").style.display = "none";
  document.getElementById("constraintPolarAngleModal").style.display = "none";
  window.constraintSelection = [];
  if (window.canvas) window.canvas.style.cursor = "crosshair";
  const info = document.getElementById("modeInfo");
  if (info) {
    info.innerHTML = `❌ <strong>ODSTRANĚNÍ FIXACE</strong>: Klikni na objekt(y) k smazání fixace<br/><small>(Klikáš-li na kótu s fixací, fixace se smaže)</small>`;
  }
};

// ===== HELPER FUNCTIONS =====
window.applyConstraintToSelection = function(constraintType, value) {
  const targetItems = window.constraintSelection.length > 0 ? window.constraintSelection : window.selectedItems;
  if (targetItems.length === 0) {
    alert("❌ Žádné objekty nejsou vybrány!");
    return;
  }
  const info = document.getElementById("modeInfo");
  if (info) {
    info.textContent = `✅ Fixace aplikována`;
    info.classList.add("show");
    setTimeout(() => info.classList.remove("show"), 2000);
  }
  window.constraintMode = null;
  window.constraintSelection = [];
  if (window.canvas) window.canvas.style.cursor = "default";
  window.draw();
};
