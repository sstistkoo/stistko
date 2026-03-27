// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Geometrie: vzdálenosti, průsečíky                  ║
// ╚══════════════════════════════════════════════════════════════╝

import { state } from './state.js';
import { distPointToSegment, isAngleBetween, bulgeToArc } from './utils.js';
import { renderAll } from './render.js';
import { bridge } from './bridge.js';

// ── Hledání a výběr objektu ──

/**
 * Najde vazební značku na pozici [wx,wy].
 * Značky jsou odsazeny kolmo od segmentu (stejný offset jako v rendereru).
 * @returns {{ objIdx: number, segIdx: number|null }|null}
 */
const CONSTRAINT_OFFSET_PX = 22;  // musí odpovídat render.js

function _constraintPos(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len, ny = dx / len;
  if (ny < 0) { nx = -nx; ny = -ny; }
  const off = CONSTRAINT_OFFSET_PX / state.zoom;
  return { x: mx + nx * off, y: my + ny * off };
}

export function findConstraintAt(wx, wy) {
  const threshold = 20 / state.zoom;
  let best = null, bestDist = Infinity;

  state.objects.forEach((obj, idx) => {
    const layer = state.layers.find(l => l.id === obj.layer);
    if (layer && !layer.visible) return;

    // Úsečky s vazbou
    if (obj.constraint && (obj.type === 'line' || obj.type === 'constr')) {
      const pos = _constraintPos(obj.x1, obj.y1, obj.x2, obj.y2);
      const d = Math.hypot(wx - pos.x, wy - pos.y);
      if (d < threshold && d < bestDist) {
        bestDist = d;
        best = { objIdx: idx, segIdx: null };
      }
    }

    // Kontury se segmentovými vazbami
    if (obj.segConstraints && obj.type === 'polyline') {
      const n = obj.vertices.length;
      for (const [si, type] of Object.entries(obj.segConstraints)) {
        const i = parseInt(si);
        const p1 = obj.vertices[i];
        const p2 = obj.vertices[(i + 1) % n];
        if (!p1 || !p2) continue;
        const pos = _constraintPos(p1.x, p1.y, p2.x, p2.y);
        const d = Math.hypot(wx - pos.x, wy - pos.y);
        if (d < threshold && d < bestDist) {
          bestDist = d;
          best = { objIdx: idx, segIdx: i };
        }
      }
    }
  });
  return best;
}

/**
 * Najde index objektu nejblíž bodu [wx,wy].
 * @param {number} wx
 * @param {number} wy
 * @returns {number|null}
 */
export function findObjectAt(wx, wy) {
  let closest = null,
    closestDist = Infinity;
  state.objects.forEach((obj, idx) => {
    // Skip objects on locked or invisible layers
    const layer = state.layers.find(l => l.id === obj.layer);
    if (layer && (layer.locked || !layer.visible)) return;

    const d = distToObject(obj, wx, wy);
    if (d < closestDist) {
      closestDist = d;
      closest = idx;
    }
  });
  const threshold = 15 / state.zoom;
  return closestDist < threshold ? closest : null;
}

/**
 * Vybere objekt na pozici [wx,wy].
 * @param {number} wx
 * @param {number} wy
 */
export function selectObjectAt(wx, wy) {
  // Nejdřív zkontrolovat, zda klik je na vazební značku
  const constr = findConstraintAt(wx, wy);
  if (constr) {
    state._selectedConstraint = constr;
    state.selected = constr.objIdx;
    state.selectedSegment = constr.segIdx;
    if (bridge.updateProperties) bridge.updateProperties();
    if (bridge.updateObjectList) bridge.updateObjectList();
    renderAll();
    return;
  }
  state._selectedConstraint = null;

  const newSel = findObjectAt(wx, wy);
  // If clicking on already-selected polyline, select the nearest segment
  if (newSel !== null && newSel === state.selected && state.objects[newSel].type === 'polyline') {
    state.selectedSegment = findSegmentAt(state.objects[newSel], wx, wy);
  } else {
    state.selected = newSel;
    state.selectedSegment = null;
  }
  if (bridge.updateProperties) bridge.updateProperties();
  if (bridge.updateObjectList) bridge.updateObjectList();
  renderAll();
}

/**
 * Najde index segmentu polyline nejblíž bodu [wx,wy].
 * @param {import('./types.js').PolylineObject} obj
 * @param {number} wx
 * @param {number} wy
 * @returns {number|null}
 */
export function findSegmentAt(obj, wx, wy) {
  if (obj.type !== 'polyline') return null;
  const n = obj.vertices.length;
  if (n < 2) return null;
  const segCount = obj.closed ? n : n - 1;
  let minD = Infinity, bestIdx = null;
  for (let i = 0; i < segCount; i++) {
    const p1 = obj.vertices[i];
    const p2 = obj.vertices[(i + 1) % n];
    const b = obj.bulges[i] || 0;
    let d;
    if (b === 0) {
      d = distPointToSegment(wx, wy, p1.x, p1.y, p2.x, p2.y);
    } else {
      const arc = bulgeToArc(p1, p2, b);
      if (arc) {
        const distToCircle = Math.abs(Math.hypot(wx - arc.cx, wy - arc.cy) - arc.r);
        const angle = Math.atan2(wy - arc.cy, wx - arc.cx);
        if (isAngleBetweenArc(angle, arc.startAngle, arc.endAngle, arc.ccw)) {
          d = distToCircle;
        } else {
          d = Math.min(Math.hypot(wx - p1.x, wy - p1.y), Math.hypot(wx - p2.x, wy - p2.y));
        }
      } else {
        d = distPointToSegment(wx, wy, p1.x, p1.y, p2.x, p2.y);
      }
    }
    if (d < minD) { minD = d; bestIdx = i; }
  }
  return bestIdx;
}

/**
 * Vzdálenost bodu od objektu.
 * @param {import('./types.js').DrawObject} obj
 * @param {number} wx
 * @param {number} wy
 * @returns {number}
 */
export function distToObject(obj, wx, wy) {
  switch (obj.type) {
    case "point":
      return Math.hypot(wx - obj.x, wy - obj.y);
    case "line":
    case "constr":
      return distPointToSegment(wx, wy, obj.x1, obj.y1, obj.x2, obj.y2);
    case "circle":
      return Math.abs(Math.hypot(wx - obj.cx, wy - obj.cy) - obj.r);
    case "arc": {
      const dist = Math.abs(
        Math.hypot(wx - obj.cx, wy - obj.cy) - obj.r,
      );
      const angle = Math.atan2(wy - obj.cy, wx - obj.cx);
      return isAngleBetween(angle, obj.startAngle, obj.endAngle)
        ? dist
        : dist + 100;
    }
    case "rect": {
      const d1 = distPointToSegment(wx, wy, obj.x1, obj.y1, obj.x2, obj.y1);
      const d2 = distPointToSegment(wx, wy, obj.x2, obj.y1, obj.x2, obj.y2);
      const d3 = distPointToSegment(wx, wy, obj.x2, obj.y2, obj.x1, obj.y2);
      const d4 = distPointToSegment(wx, wy, obj.x1, obj.y2, obj.x1, obj.y1);
      return Math.min(d1, d2, d3, d4);
    }
    case "polyline": {
      let minD = Infinity;
      const n = obj.vertices.length;
      const segCount = obj.closed ? n : n - 1;
      for (let i = 0; i < segCount; i++) {
        const p1 = obj.vertices[i];
        const p2 = obj.vertices[(i + 1) % n];
        const b = obj.bulges[i] || 0;
        let d;
        if (b === 0) {
          d = distPointToSegment(wx, wy, p1.x, p1.y, p2.x, p2.y);
        } else {
          const arc = bulgeToArc(p1, p2, b);
          if (arc) {
            const distToCircle = Math.abs(Math.hypot(wx - arc.cx, wy - arc.cy) - arc.r);
            const angle = Math.atan2(wy - arc.cy, wx - arc.cx);
            if (isAngleBetweenArc(angle, arc.startAngle, arc.endAngle, arc.ccw)) {
              d = distToCircle;
            } else {
              d = Math.min(Math.hypot(wx - p1.x, wy - p1.y), Math.hypot(wx - p2.x, wy - p2.y));
            }
          } else {
            d = distPointToSegment(wx, wy, p1.x, p1.y, p2.x, p2.y);
          }
        }
        if (d < minD) minD = d;
      }
      return minD;
    }
    default:
      return Infinity;
  }
}

// ── Test úhlu v rozsahu oblouku (s podporou CW/CCW) ──
function isAngleBetweenArc(angle, start, end, ccw) {
  const norm = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (ccw) {
    const a = norm(angle - start);
    const e = norm(end - start);
    return a <= e + 1e-9;
  } else {
    const a = norm(start - angle);
    const e = norm(start - end);
    return a <= e + 1e-9;
  }
}

// ────────────────────────────────
// ── VÝPOČET PRŮSEČÍKŮ ──
// ────────────────────────────────

/**
 * Vrátí úsečkové segmenty objektu.
 * @param {import('./types.js').DrawObject} obj
 * @returns {import('./types.js').LineSeg[]}
 */
export function getLines(obj) {
  if (obj.type === "line" || obj.type === "constr")
    return [
      {
        x1: obj.x1,
        y1: obj.y1,
        x2: obj.x2,
        y2: obj.y2,
        isConstr: obj.type === "constr",
      },
    ];
  if (obj.type === "rect")
    return [
      { x1: obj.x1, y1: obj.y1, x2: obj.x2, y2: obj.y1 },
      { x1: obj.x2, y1: obj.y1, x2: obj.x2, y2: obj.y2 },
      { x1: obj.x2, y1: obj.y2, x2: obj.x1, y2: obj.y2 },
      { x1: obj.x1, y1: obj.y2, x2: obj.x1, y2: obj.y1 },
    ];
  if (obj.type === "polyline") {
    const lines = [];
    const n = obj.vertices.length;
    const segCount = obj.closed ? n : n - 1;
    for (let i = 0; i < segCount; i++) {
      if ((obj.bulges[i] || 0) === 0) {
        const p1 = obj.vertices[i];
        const p2 = obj.vertices[(i + 1) % n];
        lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
      }
    }
    return lines;
  }
  return [];
}

/**
 * Vrátí kružnicové/obloukové segmenty objektu.
 * @param {import('./types.js').DrawObject} obj
 * @returns {import('./types.js').CircleSeg[]}
 */
export function getCircles(obj) {
  if (obj.type === "circle")
    return [{ cx: obj.cx, cy: obj.cy, r: obj.r }];
  if (obj.type === "arc")
    return [
      {
        cx: obj.cx,
        cy: obj.cy,
        r: obj.r,
        startAngle: obj.startAngle,
        endAngle: obj.endAngle,
      },
    ];
  if (obj.type === "polyline") {
    const arcs = [];
    const n = obj.vertices.length;
    const segCount = obj.closed ? n : n - 1;
    for (let i = 0; i < segCount; i++) {
      const b = obj.bulges[i] || 0;
      if (b !== 0) {
        const p1 = obj.vertices[i];
        const p2 = obj.vertices[(i + 1) % n];
        const arc = bulgeToArc(p1, p2, b);
        if (arc) {
          arcs.push({
            cx: arc.cx,
            cy: arc.cy,
            r: arc.r,
            startAngle: arc.startAngle,
            endAngle: arc.endAngle,
          });
        }
      }
    }
    return arcs;
  }
  return [];
}

/**
 * Průsečík dvou úseček / konstrukčních přímek.
 * @param {import('./types.js').LineSeg} l1
 * @param {import('./types.js').LineSeg} l2
 * @returns {import('./types.js').Point2D[]}
 */
export function intersectLineLine(l1, l2) {
  const { x1, y1, x2, y2 } = l1;
  const { x1: x3, y1: y3, x2: x4, y2: y4 } = l2;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return [];
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  const tOk = l1.isConstr ? true : t >= -1e-9 && t <= 1 + 1e-9;
  const uOk = l2.isConstr ? true : u >= -1e-9 && u <= 1 + 1e-9;
  if (tOk && uOk) {
    return [{ x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) }];
  }
  return [];
}

/**
 * Průsečíky přímky a kružnice/oblouku.
 * @param {import('./types.js').LineSeg} line
 * @param {import('./types.js').CircleSeg} circle
 * @returns {import('./types.js').Point2D[]}
 */
export function intersectLineCircle(line, circle) {
  const { x1, y1, x2, y2 } = line;
  const { cx, cy, r } = circle;
  const dx = x2 - x1,
    dy = y2 - y1;
  const fx = x1 - cx,
    fy = y1 - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  let disc = b * b - 4 * a * c;
  if (disc < 0) return [];
  disc = Math.sqrt(disc);
  const results = [];
  for (const sign of [-1, 1]) {
    const t = (-b + sign * disc) / (2 * a);
    const tOk = line.isConstr ? true : t >= -1e-9 && t <= 1 + 1e-9;
    if (tOk) {
      const pt = { x: x1 + t * dx, y: y1 + t * dy };
      if (circle.startAngle !== undefined) {
        const angle = Math.atan2(pt.y - cy, pt.x - cx);
        if (!isAngleBetween(angle, circle.startAngle, circle.endAngle))
          continue;
      }
      results.push(pt);
    }
  }
  return results;
}

/**
 * Průsečíky dvou kružnic/oblouků.
 * @param {import('./types.js').CircleSeg} c1
 * @param {import('./types.js').CircleSeg} c2
 * @returns {import('./types.js').Point2D[]}
 */
export function intersectCircleCircle(c1, c2) {
  const dx = c2.cx - c1.cx,
    dy = c2.cy - c1.cy;
  const d = Math.hypot(dx, dy);
  if (
    d > c1.r + c2.r + 1e-10 ||
    d < Math.abs(c1.r - c2.r) - 1e-10 ||
    d < 1e-10
  )
    return [];
  const a = (c1.r * c1.r - c2.r * c2.r + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, c1.r * c1.r - a * a));
  const px = c1.cx + (a * dx) / d,
    py = c1.cy + (a * dy) / d;
  const results = [];
  for (const sign of [-1, 1]) {
    const pt = {
      x: px + (sign * h * dy) / d,
      y: py - (sign * h * dx) / d,
    };
    let ok = true;
    if (c1.startAngle !== undefined) {
      const ang = Math.atan2(pt.y - c1.cy, pt.x - c1.cx);
      if (!isAngleBetween(ang, c1.startAngle, c1.endAngle)) ok = false;
    }
    if (c2.startAngle !== undefined) {
      const ang = Math.atan2(pt.y - c2.cy, pt.x - c2.cx);
      if (!isAngleBetween(ang, c2.startAngle, c2.endAngle)) ok = false;
    }
    if (ok) results.push(pt);
  }
  if (
    results.length === 2 &&
    Math.hypot(results[0].x - results[1].x, results[0].y - results[1].y) <
      1e-8
  )
    results.pop();
  return results;
}

/** Přepočítá všechny průsečíky mezi objekty. */
export function calculateAllIntersections() {
  const pts = [];
  const objs = state.objects;
  for (let i = 0; i < objs.length; i++) {
    if (objs[i].isDimension || objs[i].isCoordLabel) continue;
    for (let j = i + 1; j < objs.length; j++) {
      if (objs[j].isDimension || objs[j].isCoordLabel) continue;
      const lines1 = getLines(objs[i]),
        lines2 = getLines(objs[j]);
      const circs1 = getCircles(objs[i]),
        circs2 = getCircles(objs[j]);
      for (const l1 of lines1)
        for (const l2 of lines2) pts.push(...intersectLineLine(l1, l2));
      for (const l of lines1)
        for (const c of circs2) pts.push(...intersectLineCircle(l, c));
      for (const l of lines2)
        for (const c of circs1) pts.push(...intersectLineCircle(l, c));
      for (const c1 of circs1)
        for (const c2 of circs2)
          pts.push(...intersectCircleCircle(c1, c2));
    }
  }
  const unique = [];
  for (const pt of pts) {
    if (!unique.some((u) => Math.hypot(u.x - pt.x, u.y - pt.y) < 1e-6))
      unique.push(pt);
  }
  state.intersections = unique;
  if (bridge.updateIntersectionList) bridge.updateIntersectionList();
  renderAll();
}

// ── Tečny z bodu ke kružnici ──
/**
 * @param {number} px
 * @param {number} py
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @returns {import('./types.js').TangentLine[]}
 */
export function tangentsFromPointToCircle(px, py, cx, cy, r) {
  const dx = px - cx, dy = py - cy;
  const d = Math.hypot(dx, dy);
  if (d < r - 1e-9) return []; // bod uvnitř
  if (d < r + 1e-9) {
    // bod na kružnici – jedna tečna (kolmice)
    const nx = -dy / d, ny = dx / d;
    return [{ x1: px, y1: py, x2: px + nx * r, y2: py + ny * r }];
  }
  const L = Math.sqrt(d * d - r * r);
  const baseAngle = Math.atan2(dy, dx);
  const halfAngle = Math.acos(r / d);
  const results = [];
  for (const sign of [-1, 1]) {
    const a = baseAngle + Math.PI + sign * halfAngle;
    const tx = cx + r * Math.cos(a);
    const ty = cy + r * Math.sin(a);
    results.push({ x1: px, y1: py, x2: tx, y2: ty });
  }
  return results;
}

// ── Tečny dvou kružnic (vnější + vnitřní) ──
/**
 * @param {number} cx1
 * @param {number} cy1
 * @param {number} r1
 * @param {number} cx2
 * @param {number} cy2
 * @param {number} r2
 * @returns {import('./types.js').TangentLine[]}
 */
export function tangentsTwoCircles(cx1, cy1, r1, cx2, cy2, r2) {
  const results = [];
  const d = Math.hypot(cx2 - cx1, cy2 - cy1);
  if (d < 1e-9) return [];
  const angle = Math.atan2(cy2 - cy1, cx2 - cx1);

  // Vnější tečny
  if (d >= Math.abs(r1 - r2) - 1e-9) {
    const ratio = (r1 - r2) / d;
    const clampedRatio = Math.max(-1, Math.min(1, ratio));
    const alpha = Math.asin(clampedRatio);
    for (const sign of [-1, 1]) {
      const beta = angle + sign * (Math.PI / 2 - alpha);
      const tx1 = cx1 + r1 * Math.cos(beta);
      const ty1 = cy1 + r1 * Math.sin(beta);
      const tx2 = cx2 + r2 * Math.cos(beta);
      const ty2 = cy2 + r2 * Math.sin(beta);
      results.push({ x1: tx1, y1: ty1, x2: tx2, y2: ty2 });
    }
  }

  // Vnitřní tečny
  if (d >= r1 + r2 - 1e-9) {
    const ratio = (r1 + r2) / d;
    const clampedRatio = Math.max(-1, Math.min(1, ratio));
    const alpha = Math.asin(clampedRatio);
    for (const sign of [-1, 1]) {
      const beta = angle + sign * (Math.PI / 2 - alpha);
      const tx1 = cx1 + r1 * Math.cos(beta);
      const ty1 = cy1 + r1 * Math.sin(beta);
      const tx2 = cx2 - r2 * Math.cos(beta);
      const ty2 = cy2 - r2 * Math.sin(beta);
      results.push({ x1: tx1, y1: ty1, x2: tx2, y2: ty2 });
    }
  }

  return results;
}

// ── Offset objektu ──
/**
 * Vytvoří offsetovanou kopii objektu.
 * @param {import('./types.js').DrawObject} obj
 * @param {number} dist
 * @param {number} side  1 = vně/vpravo, -1 = uvnitř/vlevo
 * @returns {import('./types.js').DrawObject|null}
 */
// ── Pozice kružnice tečné k úsečce ──
export function circlePositionsTangentToLine(cx, cy, r, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-10) return [];
  const nx = -dy / len, ny = dx / len;
  const t = ((cx - x1) * dx + (cy - y1) * dy) / (len * len);
  const footX = x1 + t * dx, footY = y1 + t * dy;
  return [
    { cx: footX + nx * r, cy: footY + ny * r },
    { cx: footX - nx * r, cy: footY - ny * r }
  ];
}

// ── Pozice kružnice tečné ke dvěma úsečkám ──
export function circlePositionsTangentToTwoLines(r, l1, l2) {
  const results = [];
  const offsets1 = lineOffsets(l1.x1, l1.y1, l1.x2, l1.y2, r);
  const offsets2 = lineOffsets(l2.x1, l2.y1, l2.x2, l2.y2, r);
  for (const o1 of offsets1) {
    for (const o2 of offsets2) {
      const pt = intersectInfiniteLines(o1, o2);
      if (pt) results.push({ cx: pt.x, cy: pt.y });
    }
  }
  return results;
}

function lineOffsets(x1, y1, x2, y2, d) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-10) return [];
  const nx = -dy / len * d, ny = dx / len * d;
  return [
    { x1: x1 + nx, y1: y1 + ny, x2: x2 + nx, y2: y2 + ny },
    { x1: x1 - nx, y1: y1 - ny, x2: x2 - nx, y2: y2 - ny }
  ];
}

function intersectInfiniteLines(l1, l2) {
  const d1x = l1.x2 - l1.x1, d1y = l1.y2 - l1.y1;
  const d2x = l2.x2 - l2.x1, d2y = l2.y2 - l2.y1;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((l2.x1 - l1.x1) * d2y - (l2.y1 - l1.y1) * d2x) / denom;
  return { x: l1.x1 + t * d1x, y: l1.y1 + t * d1y };
}

/**
 * Projekce bodu na přímku (pata kolmice).
 * @param {number} px
 * @param {number} py
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {{x: number, y: number}}
 */
export function projectPointToLine(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-20) return { x: x1, y: y1 };
  const t = ((px - x1) * dx + (py - y1) * dy) / len2;
  return { x: x1 + t * dx, y: y1 + t * dy };
}

export function offsetObject(obj, dist, side) {
  // side: 1 = vně/vpravo, -1 = uvnitř/vlevo
  const d = dist * side;
  switch (obj.type) {
    case 'line':
    case 'constr': {
      const dx = obj.x2 - obj.x1, dy = obj.y2 - obj.y1;
      const len = Math.hypot(dx, dy);
      if (len < 1e-10) return null;
      const nx = -dy / len * d, ny = dx / len * d;
      return {
        type: obj.type,
        x1: obj.x1 + nx, y1: obj.y1 + ny,
        x2: obj.x2 + nx, y2: obj.y2 + ny,
        name: `${obj.name || obj.type} (offset)`,
        dashed: obj.dashed,
        color: obj.color,
      };
    }
    case 'circle': {
      const newR = obj.r + d;
      if (newR < 1e-10) return null;
      return {
        type: 'circle',
        cx: obj.cx, cy: obj.cy, r: newR,
        name: `${obj.name || 'Kružnice'} (offset)`,
        color: obj.color,
      };
    }
    case 'arc': {
      const newR = obj.r + d;
      if (newR < 1e-10) return null;
      return {
        type: 'arc',
        cx: obj.cx, cy: obj.cy, r: newR,
        startAngle: obj.startAngle, endAngle: obj.endAngle,
        name: `${obj.name || 'Oblouk'} (offset)`,
        color: obj.color,
      };
    }
    case 'rect': {
      const x1 = Math.min(obj.x1, obj.x2), y1 = Math.min(obj.y1, obj.y2);
      const x2 = Math.max(obj.x1, obj.x2), y2 = Math.max(obj.y1, obj.y2);
      const nx1 = x1 - d, ny1 = y1 - d;
      const nx2 = x2 + d, ny2 = y2 + d;
      if (nx2 <= nx1 || ny2 <= ny1) return null;
      return {
        type: 'rect',
        x1: nx1, y1: ny1, x2: nx2, y2: ny2,
        name: `${obj.name || 'Obdélník'} (offset)`,
        color: obj.color,
      };
    }
    case 'polyline': {
      const verts = obj.vertices;
      const n = verts.length;
      const segCount = obj.closed ? n : n - 1;
      // Offset each segment and compute new vertices
      const offsetLines = [];
      for (let i = 0; i < segCount; i++) {
        const p1 = verts[i];
        const p2 = verts[(i + 1) % n];
        const sdx = p2.x - p1.x, sdy = p2.y - p1.y;
        const slen = Math.hypot(sdx, sdy);
        if (slen < 1e-10) { offsetLines.push(null); continue; }
        const nx = -sdy / slen * d, ny = sdx / slen * d;
        offsetLines.push({
          x1: p1.x + nx, y1: p1.y + ny,
          x2: p2.x + nx, y2: p2.y + ny,
        });
      }
      // Trim/extend at corners
      const newVerts = [];
      for (let i = 0; i < segCount; i++) {
        const curr = offsetLines[i];
        const prev = offsetLines[(i - 1 + segCount) % segCount];
        if (!curr) continue;
        if (obj.closed || i > 0) {
          if (prev) {
            const inter = lineLineIntersect(prev, curr);
            if (inter) { newVerts.push({ x: inter.x, y: inter.y }); continue; }
          }
        }
        newVerts.push({ x: curr.x1, y: curr.y1 });
      }
      // Přidat koncový bod
      if (!obj.closed && offsetLines.length > 0) {
        const last = offsetLines[offsetLines.length - 1];
        if (last) newVerts.push({ x: last.x2, y: last.y2 });
      }
      if (newVerts.length < 2) return null;
      return {
        type: 'polyline',
        vertices: newVerts,
        bulges: new Array(obj.closed ? newVerts.length : newVerts.length - 1).fill(0),
        closed: obj.closed,
        name: `${obj.name || 'Kontura'} (offset)`,
        color: obj.color,
      };
    }
    default:
      return null;
  }
}

function lineLineIntersect(l1, l2) {
  const dx1 = l1.x2 - l1.x1, dy1 = l1.y2 - l1.y1;
  const dx2 = l2.x2 - l2.x1, dy2 = l2.y2 - l2.y1;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((l2.x1 - l1.x1) * dy2 - (l2.y1 - l1.y1) * dx2) / denom;
  return { x: l1.x1 + t * dx1, y: l1.y1 + t * dy1 };
}

// ── Zrcadlení objektu ──
/**
 * @param {import('./types.js').DrawObject} obj
 * @param {'x'|'z'|'custom'} axis
 * @param {import('./types.js').Point2D} [p1]
 * @param {import('./types.js').Point2D} [p2]
 * @returns {import('./types.js').DrawObject}
 */
export function mirrorObject(obj, axis, p1, p2) {
  // axis: 'x' (horizontální), 'z' (vertikální), 'custom' (2 body p1,p2)
  const copy = JSON.parse(JSON.stringify(obj));
  delete copy.id;

  function mirrorPoint(px, py) {
    if (axis === 'x') return { x: px, y: -py };
    if (axis === 'z') return { x: -px, y: py };
    // Vlastní osa: reflexe přes přímku p1-p2
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-10) return { x: px, y: py };
    const t = ((px - p1.x) * dx + (py - p1.y) * dy) / lenSq;
    const projX = p1.x + t * dx, projY = p1.y + t * dy;
    return { x: 2 * projX - px, y: 2 * projY - py };
  }

  switch (copy.type) {
    case 'point': {
      const m = mirrorPoint(copy.x, copy.y);
      copy.x = m.x; copy.y = m.y;
      break;
    }
    case 'line':
    case 'constr': {
      const m1 = mirrorPoint(copy.x1, copy.y1);
      const m2 = mirrorPoint(copy.x2, copy.y2);
      copy.x1 = m1.x; copy.y1 = m1.y;
      copy.x2 = m2.x; copy.y2 = m2.y;
      break;
    }
    case 'circle': {
      const m = mirrorPoint(copy.cx, copy.cy);
      copy.cx = m.x; copy.cy = m.y;
      break;
    }
    case 'arc': {
      const m = mirrorPoint(copy.cx, copy.cy);
      copy.cx = m.x; copy.cy = m.y;
      // Zrcadlení flipne direction – prohodíme start/end a obrátíme
      const sP = mirrorPoint(
        obj.cx + obj.r * Math.cos(obj.startAngle),
        obj.cy + obj.r * Math.sin(obj.startAngle)
      );
      const eP = mirrorPoint(
        obj.cx + obj.r * Math.cos(obj.endAngle),
        obj.cy + obj.r * Math.sin(obj.endAngle)
      );
      copy.startAngle = Math.atan2(eP.y - m.y, eP.x - m.x);
      copy.endAngle = Math.atan2(sP.y - m.y, sP.x - m.x);
      break;
    }
    case 'rect': {
      const m1 = mirrorPoint(copy.x1, copy.y1);
      const m2 = mirrorPoint(copy.x2, copy.y2);
      copy.x1 = m1.x; copy.y1 = m1.y;
      copy.x2 = m2.x; copy.y2 = m2.y;
      break;
    }
    case 'polyline': {
      copy.vertices = copy.vertices.map(v => {
        const m = mirrorPoint(v.x, v.y);
        return { x: m.x, y: m.y };
      });
      // Zrcadlení obrací bulge znaménka
      copy.bulges = copy.bulges.map(b => -b);
      break;
    }
  }
  copy.name = `${obj.name || obj.type} (zrcadlo)`;
  return copy;
}

// ── Lineární pole ──
/**
 * @param {import('./types.js').DrawObject} obj
 * @param {number} dx
 * @param {number} dy
 * @param {number} count
 * @returns {import('./types.js').DrawObject[]}
 */
export function linearArray(obj, dx, dy, count) {
  const copies = [];
  for (let i = 1; i <= count; i++) {
    const copy = JSON.parse(JSON.stringify(obj));
    delete copy.id;
    switch (copy.type) {
      case 'point':
        copy.x += dx * i; copy.y += dy * i; break;
      case 'line': case 'constr':
        copy.x1 += dx * i; copy.y1 += dy * i;
        copy.x2 += dx * i; copy.y2 += dy * i; break;
      case 'circle':
        copy.cx += dx * i; copy.cy += dy * i; break;
      case 'arc':
        copy.cx += dx * i; copy.cy += dy * i; break;
      case 'rect':
        copy.x1 += dx * i; copy.y1 += dy * i;
        copy.x2 += dx * i; copy.y2 += dy * i; break;
      case 'polyline':
        copy.vertices = copy.vertices.map(v => ({ x: v.x + dx * i, y: v.y + dy * i }));
        break;
    }
    copy.name = `${obj.name || obj.type} (pole ${i + 1})`;
    copies.push(copy);
  }
  return copies;
}

// ── Rotace objektu ──
/**
 * Otočí objekt kolem bodu [cx,cy] o úhel (radiány).
 * Modifikuje objekt in-place.
 * @param {import('./types.js').DrawObject} obj
 * @param {number} cx  střed rotace X
 * @param {number} cy  střed rotace Y
 * @param {number} angle  úhel v radiánech
 */
export function rotateObject(obj, cx, cy, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  function rp(px, py) {
    const dx = px - cx, dy = py - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  }
  switch (obj.type) {
    case 'point': {
      const m = rp(obj.x, obj.y);
      obj.x = m.x; obj.y = m.y; break;
    }
    case 'line': case 'constr': {
      const m1 = rp(obj.x1, obj.y1), m2 = rp(obj.x2, obj.y2);
      obj.x1 = m1.x; obj.y1 = m1.y; obj.x2 = m2.x; obj.y2 = m2.y; break;
    }
    case 'circle': {
      const m = rp(obj.cx, obj.cy);
      obj.cx = m.x; obj.cy = m.y; break;
    }
    case 'arc': {
      const m = rp(obj.cx, obj.cy);
      obj.cx = m.x; obj.cy = m.y;
      obj.startAngle += angle; obj.endAngle += angle;
      break;
    }
    case 'rect': {
      const m1 = rp(obj.x1, obj.y1), m2 = rp(obj.x2, obj.y2);
      obj.x1 = m1.x; obj.y1 = m1.y; obj.x2 = m2.x; obj.y2 = m2.y; break;
    }
    case 'polyline': {
      obj.vertices = obj.vertices.map(v => rp(v.x, v.y));
      break;
    }
  }
}

// ── Zaoblení dvou úseček ──
/**
 * Vytvoří zaoblení (fillet) mezi dvěma úsečkami.
 * Najde průsečík, ořízne obě úsečky a vrátí oblouk.
 * @param {import('./types.js').DrawObject} line1
 * @param {import('./types.js').DrawObject} line2
 * @param {number} radius
 * @returns {{ arc: import('./types.js').DrawObject, ok: boolean, msg?: string }}
 */
export function filletTwoLines(line1, line2, radius) {
  // Find intersection of infinite lines
  const d1x = line1.x2 - line1.x1, d1y = line1.y2 - line1.y1;
  const d2x = line2.x2 - line2.x1, d2y = line2.y2 - line2.y1;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return { ok: false, msg: "Úsečky jsou rovnoběžné" };

  const t = ((line2.x1 - line1.x1) * d2y - (line2.y1 - line1.y1) * d2x) / denom;
  const ix = line1.x1 + t * d1x, iy = line1.y1 + t * d1y;

  // Unit direction vectors
  const len1 = Math.hypot(d1x, d1y), len2 = Math.hypot(d2x, d2y);
  const u1x = d1x / len1, u1y = d1y / len1;
  const u2x = d2x / len2, u2y = d2y / len2;

  // Angle between lines
  const halfAngle = Math.acos(Math.min(1, Math.abs(u1x * u2x + u1y * u2y)));
  if (halfAngle < 1e-9) return { ok: false, msg: "Úsečky jsou téměř rovnoběžné" };

  const tanHalf = Math.tan(Math.PI / 2 - halfAngle);
  if (Math.abs(tanHalf) < 1e-9) return { ok: false, msg: "Nelze vytvořit zaoblení" };
  const dist = radius / tanHalf; // distance from intersection to tangent point

  // Determine directions: point AWAY from intersection along each line
  // We need to figure out which direction on each line goes away from intersection
  const d1a = Math.hypot(line1.x1 - ix, line1.y1 - iy);
  const d1b = Math.hypot(line1.x2 - ix, line1.y2 - iy);
  const dir1x = d1a > d1b ? (line1.x1 - ix) : (line1.x2 - ix);
  const dir1y = d1a > d1b ? (line1.y1 - iy) : (line1.y2 - iy);
  const dlen1 = Math.hypot(dir1x, dir1y);
  const n1x = dir1x / dlen1, n1y = dir1y / dlen1;

  const d2a = Math.hypot(line2.x1 - ix, line2.y1 - iy);
  const d2b = Math.hypot(line2.x2 - ix, line2.y2 - iy);
  const dir2x = d2a > d2b ? (line2.x1 - ix) : (line2.x2 - ix);
  const dir2y = d2a > d2b ? (line2.y1 - iy) : (line2.y2 - iy);
  const dlen2 = Math.hypot(dir2x, dir2y);
  const n2x = dir2x / dlen2, n2y = dir2y / dlen2;

  // Tangent points on each line
  const tp1x = ix + n1x * dist, tp1y = iy + n1y * dist;
  const tp2x = ix + n2x * dist, tp2y = iy + n2y * dist;

  // Arc center: offset from intersection along bisector
  const bx = n1x + n2x, by = n1y + n2y;
  const blen = Math.hypot(bx, by);
  if (blen < 1e-10) return { ok: false, msg: "Nelze určit střed zaoblení" };
  const centerDist = Math.sqrt(radius * radius + dist * dist);
  const cX = ix + (bx / blen) * centerDist;
  const cY = iy + (by / blen) * centerDist;

  // Start and end angles
  const startAngle = Math.atan2(tp1y - cY, tp1x - cX);
  const endAngle = Math.atan2(tp2y - cY, tp2x - cX);

  // Trim lines: move the endpoint closer to intersection to the tangent point
  if (d1a < d1b) { line1.x1 = tp1x; line1.y1 = tp1y; }
  else { line1.x2 = tp1x; line1.y2 = tp1y; }

  if (d2a < d2b) { line2.x1 = tp2x; line2.y1 = tp2y; }
  else { line2.x2 = tp2x; line2.y2 = tp2y; }

  return {
    ok: true,
    arc: {
      type: 'arc',
      cx: cX, cy: cY,
      r: radius,
      startAngle, endAngle,
    }
  };
}

// ── Bridge registrace ──
bridge.calculateAllIntersections = () => calculateAllIntersections();
