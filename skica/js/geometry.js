// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Geometrie: vzdálenosti, průsečíky                  ║
// ╚══════════════════════════════════════════════════════════════╝

import { state } from './state.js';
import { distPointToSegment, isAngleBetween, bulgeToArc } from './utils.js';
import { renderAll } from './render.js';
import { bridge } from './bridge.js';

// ── Hledání a výběr objektu ──
export function findObjectAt(wx, wy) {
  let closest = null,
    closestDist = Infinity;
  state.objects.forEach((obj, idx) => {
    const d = distToObject(obj, wx, wy);
    if (d < closestDist) {
      closestDist = d;
      closest = idx;
    }
  });
  const threshold = 15 / state.zoom;
  return closestDist < threshold ? closest : null;
}

export function selectObjectAt(wx, wy) {
  state.selected = findObjectAt(wx, wy);
  if (bridge.updateProperties) bridge.updateProperties();
  if (bridge.updateObjectList) bridge.updateObjectList();
  renderAll();
}

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

export function calculateAllIntersections() {
  const pts = [];
  const objs = state.objects;
  for (let i = 0; i < objs.length; i++) {
    for (let j = i + 1; j < objs.length; j++) {
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

// ── Bridge registrace ──
bridge.calculateAllIntersections = () => calculateAllIntersections();
