// ╔══════════════════════════════════════════════════════════════╗
// ║  Sdílené helpery pro tool handlery                         ║
// ╚══════════════════════════════════════════════════════════════╝

import { findSegmentAt } from '../geometry.js';

// ── Helper: get line-like segment from object (line, constr, or polyline segment) ──
/**
 * Vrátí segment (x1,y1,x2,y2) a setter funkce pro úpravy.
 * @returns {{ seg: {x1,y1,x2,y2}, setP1: function, setP2: function, segIdx: number|null } | null}
 */
export function getLineSegment(obj, wx, wy) {
  if (obj.type === 'line' || obj.type === 'constr') {
    return {
      seg: { x1: obj.x1, y1: obj.y1, x2: obj.x2, y2: obj.y2 },
      setP1: (x, y) => { obj.x1 = x; obj.y1 = y; },
      setP2: (x, y) => { obj.x2 = x; obj.y2 = y; },
      segIdx: null
    };
  }
  if (obj.type === 'polyline') {
    const si = findSegmentAt(obj, wx, wy);
    if (si === null) return null;
    const b = obj.bulges[si] || 0;
    if (b !== 0) return null; // arc segments not supported
    const n = obj.vertices.length;
    const p1 = obj.vertices[si];
    const p2 = obj.vertices[(si + 1) % n];
    return {
      seg: { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y },
      setP1: (x, y) => { p1.x = x; p1.y = y; },
      setP2: (x, y) => { p2.x = x; p2.y = y; },
      segIdx: si
    };
  }
  return null;
}

// ── Vazby (constraints) – helper ──
/** Nastaví vazbu na objekt/segment.
 *  Pro úsečky: obj.constraint = type
 *  Pro kontury: obj.segConstraints = { segIdx: type, ... }
 */
export function setConstraint(obj, segIdx, type) {
  if (segIdx !== null && segIdx !== undefined) {
    if (!obj.segConstraints) obj.segConstraints = {};
    obj.segConstraints[segIdx] = type;
  } else {
    obj.constraint = type;
  }
}
