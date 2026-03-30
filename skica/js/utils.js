// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Pomocné funkce (snap body, geometrie, labely)      ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Bezpečný parser matematických výrazů (bez eval / new Function) ──

/**
 * Rekurzivní sestupný parser aritmetických výrazů.
 * Podporuje: +, -, *, /, ** (nebo ^), závorky, unární mínus, desetinná čísla, vědeckou notaci.
 * Matematické funkce: sin, cos, tan, asin, acos, atan, sqrt, abs, log, ln, round, floor, ceil.
 * Konstanty: pi, e.
 * @param {string} src
 * @returns {number}
 */
export function _parseMathExpr(src) {
  let pos = 0;
  const deg = Math.PI / 180;

  const FUNCS = {
    sin:   v => Math.sin(v * deg),
    cos:   v => Math.cos(v * deg),
    tan:   v => Math.tan(v * deg),
    asin:  v => Math.asin(v) / deg,
    acos:  v => Math.acos(v) / deg,
    atan:  v => Math.atan(v) / deg,
    sinr:  v => Math.sin(v),
    cosr:  v => Math.cos(v),
    tanr:  v => Math.tan(v),
    sqrt:  v => Math.sqrt(v),
    abs:   v => Math.abs(v),
    log:   v => Math.log10(v),
    ln:    v => Math.log(v),
    round: v => Math.round(v),
    floor: v => Math.floor(v),
    ceil:  v => Math.ceil(v),
  };

  const CONSTS = {
    pi: Math.PI,
    e:  Math.E,
  };

  function skip() { while (pos < src.length && src[pos] === ' ') pos++; }

  function parseIdent() {
    const start = pos;
    while (pos < src.length && ((src[pos] >= 'a' && src[pos] <= 'z') || (src[pos] >= 'A' && src[pos] <= 'Z'))) pos++;
    return src.substring(start, pos).toLowerCase();
  }

  function parseNumber() {
    skip();
    const start = pos;
    if (src[pos] === '+' || src[pos] === '-') pos++;
    if (pos < src.length && src[pos] === '.' || (src[pos] >= '0' && src[pos] <= '9')) {
      while (pos < src.length && src[pos] >= '0' && src[pos] <= '9') pos++;
      if (pos < src.length && src[pos] === '.') { pos++; while (pos < src.length && src[pos] >= '0' && src[pos] <= '9') pos++; }
    }
    if (pos < src.length && (src[pos] === 'e' || src[pos] === 'E') && (pos + 1 < src.length && (src[pos + 1] >= '0' && src[pos + 1] <= '9' || src[pos + 1] === '+' || src[pos + 1] === '-'))) {
      pos++;
      if (pos < src.length && (src[pos] === '+' || src[pos] === '-')) pos++;
      while (pos < src.length && src[pos] >= '0' && src[pos] <= '9') pos++;
    }
    const n = parseFloat(src.substring(start, pos));
    if (isNaN(n)) throw new Error('num');
    return n;
  }

  function parseAtom() {
    skip();
    if (src[pos] === '(') { pos++; const v = parseExpr(); skip(); if (src[pos] !== ')') throw new Error(')'); pos++; return v; }
    // Identifikátor – funkce nebo konstanta
    if (pos < src.length && ((src[pos] >= 'a' && src[pos] <= 'z') || (src[pos] >= 'A' && src[pos] <= 'Z'))) {
      const name = parseIdent();
      skip();
      // Funkce – očekáváme závorku
      if (src[pos] === '(') {
        const fn = FUNCS[name];
        if (!fn) throw new Error('fn:' + name);
        pos++; // skip '('
        const arg = parseExpr();
        skip();
        if (src[pos] !== ')') throw new Error(')');
        pos++;
        return fn(arg);
      }
      // Konstanta
      if (name in CONSTS) return CONSTS[name];
      throw new Error('id:' + name);
    }
    return parseNumber();
  }

  function parseUnary() {
    skip();
    if (src[pos] === '-') { pos++; return -parseUnary(); }
    if (src[pos] === '+') { pos++; return parseUnary(); }
    return parseAtom();
  }

  function parsePower() {
    let b = parseUnary(); skip();
    if (pos < src.length - 1 && src[pos] === '*' && src[pos + 1] === '*') { pos += 2; return Math.pow(b, parsePower()); }
    return b;
  }

  function parseTerm() {
    let l = parsePower(); skip();
    while (pos < src.length && (src[pos] === '*' || src[pos] === '/') && !(src[pos] === '*' && src[pos + 1] === '*')) {
      const op = src[pos++]; const r = parsePower(); l = op === '*' ? l * r : l / r; skip();
    }
    return l;
  }

  function parseExpr() {
    let l = parseTerm(); skip();
    while (pos < src.length && (src[pos] === '+' || src[pos] === '-')) {
      const op = src[pos++]; const r = parseTerm(); l = op === '+' ? l + r : l - r; skip();
    }
    return l;
  }

  const result = parseExpr();
  skip();
  if (pos !== src.length) throw new Error('end');
  return result;
}

// ── Bezpečné vyhodnocení matematického výrazu z inputu ──
/** @param {string} str - text z inputu, např. "123+56", "200/3", "(10+5)*2" */
export function safeEvalMath(str) {
  if (typeof str !== 'string') str = String(str ?? '');
  str = str.trim().replace(/,/g, '.');
  if (str === '') return NaN;
  // Povolit: čísla, operátory +−*/(), tečky, mezery, písmena (funkce/konstanty)
  if (!/^[\d+\-*/().^\sa-zA-Z]+$/.test(str)) return NaN;
  // Kontrola závorek
  let depth = 0;
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) return NaN;
  }
  if (depth !== 0) return NaN;
  try {
    const expr = str.replace(/\^/g, '**');
    const result = _parseMathExpr(expr);
    return typeof result === 'number' && isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

// ── Snap body objektů ──
/**
 * Vrátí snap body daného objektu.
 * @param {import('./types.js').DrawObject} obj
 * @returns {import('./types.js').Point2D[]}
 */
export function getObjectSnapPoints(obj) {
  switch (obj.type) {
    case "point":
      return [{ x: obj.x, y: obj.y }];
    case "line":
    case "constr":
      return [
        { x: obj.x1, y: obj.y1 },
        { x: obj.x2, y: obj.y2 },
        { x: (obj.x1 + obj.x2) / 2, y: (obj.y1 + obj.y2) / 2, mid: true },
      ];
    case "circle":
      return [
        { x: obj.cx, y: obj.cy },
        { x: obj.cx + obj.r, y: obj.cy },
        { x: obj.cx - obj.r, y: obj.cy },
        { x: obj.cx, y: obj.cy + obj.r },
        { x: obj.cx, y: obj.cy - obj.r },
      ];
    case "arc":
      return [
        { x: obj.cx, y: obj.cy },
        {
          x: obj.cx + obj.r * Math.cos(obj.startAngle),
          y: obj.cy + obj.r * Math.sin(obj.startAngle),
        },
        {
          x: obj.cx + obj.r * Math.cos(obj.endAngle),
          y: obj.cy + obj.r * Math.sin(obj.endAngle),
        },
      ];
    case "rect":
      return [
        { x: obj.x1, y: obj.y1 },
        { x: obj.x2, y: obj.y1 },
        { x: obj.x2, y: obj.y2 },
        { x: obj.x1, y: obj.y2 },
        { x: (obj.x1 + obj.x2) / 2, y: (obj.y1 + obj.y2) / 2, mid: true },
      ];
    case "polyline": {
      const pts = obj.vertices.map(v => ({ x: v.x, y: v.y }));
      // Midpoints of each segment (tagged with mid flag)
      const n = obj.vertices.length;
      const segCount = obj.closed ? n : n - 1;
      for (let i = 0; i < segCount; i++) {
        const p1 = obj.vertices[i];
        const p2 = obj.vertices[(i + 1) % n];
        const b = obj.bulges[i] || 0;
        if (b === 0) {
          pts.push({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, mid: true });
        } else {
          const arc = bulgeToArc(p1, p2, b);
          if (arc) {
            const midAngle = (arc.startAngle + arc.endAngle) / 2;
            // Adjust midAngle for arc direction
            let ma;
            if (b > 0) {
              ma = arc.startAngle + normalizeAngleDiff(arc.endAngle - arc.startAngle, true) / 2;
            } else {
              ma = arc.startAngle + normalizeAngleDiff(arc.endAngle - arc.startAngle, false) / 2;
            }
            pts.push({ x: arc.cx + arc.r * Math.cos(ma), y: arc.cy + arc.r * Math.sin(ma), mid: true });
          } else {
            pts.push({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, mid: true });
          }
        }
      }
      return pts;
    }
    case "text":
      return [{ x: obj.x, y: obj.y }];
    default:
      return [];
  }
}

// Helper: normalize angle difference for CCW or CW direction
function normalizeAngleDiff(diff, ccw) {
  if (ccw) {
    while (diff < 0) diff += 2 * Math.PI;
    if (diff === 0) diff = 2 * Math.PI;
  } else {
    while (diff > 0) diff -= 2 * Math.PI;
    if (diff === 0) diff = -2 * Math.PI;
  }
  return diff;
}

// ── Nejbližší bod na objektu (pro snap k hraně) ──
/**
 * Vrátí nejbližší bod na hraně objektu (úsečka, kružnice, oblouk, obdélník).
 * @param {import('./types.js').DrawObject} obj
 * @param {number} wx
 * @param {number} wy
 * @returns {{x: number, y: number, dist: number}|null}
 */
export function getNearestPointOnObject(obj, wx, wy) {
  switch (obj.type) {
    case "line":
    case "constr": {
      const p = nearestOnSegment(wx, wy, obj.x1, obj.y1, obj.x2, obj.y2);
      return { x: p.x, y: p.y, dist: Math.hypot(wx - p.x, wy - p.y) };
    }
    case "circle": {
      const dx = wx - obj.cx, dy = wy - obj.cy;
      const d = Math.hypot(dx, dy);
      if (d < 1e-10) return { x: obj.cx + obj.r, y: obj.cy, dist: obj.r };
      return { x: obj.cx + (dx / d) * obj.r, y: obj.cy + (dy / d) * obj.r, dist: Math.abs(d - obj.r) };
    }
    case "arc": {
      const dx = wx - obj.cx, dy = wy - obj.cy;
      const d = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      if (d < 1e-10) return null;
      if (isAngleBetween(angle, obj.startAngle, obj.endAngle)) {
        return { x: obj.cx + (dx / d) * obj.r, y: obj.cy + (dy / d) * obj.r, dist: Math.abs(d - obj.r) };
      }
      // Mimo oblouk – nejbližší koncový bod
      const s = { x: obj.cx + obj.r * Math.cos(obj.startAngle), y: obj.cy + obj.r * Math.sin(obj.startAngle) };
      const e = { x: obj.cx + obj.r * Math.cos(obj.endAngle), y: obj.cy + obj.r * Math.sin(obj.endAngle) };
      const ds = Math.hypot(wx - s.x, wy - s.y);
      const de = Math.hypot(wx - e.x, wy - e.y);
      return ds < de ? { x: s.x, y: s.y, dist: ds } : { x: e.x, y: e.y, dist: de };
    }
    case "rect": {
      const segs = [
        [obj.x1, obj.y1, obj.x2, obj.y1],
        [obj.x2, obj.y1, obj.x2, obj.y2],
        [obj.x2, obj.y2, obj.x1, obj.y2],
        [obj.x1, obj.y2, obj.x1, obj.y1],
      ];
      let best = null;
      for (const [x1, y1, x2, y2] of segs) {
        const p = nearestOnSegment(wx, wy, x1, y1, x2, y2);
        const d = Math.hypot(wx - p.x, wy - p.y);
        if (!best || d < best.dist) best = { x: p.x, y: p.y, dist: d };
      }
      return best;
    }
    default:
      return null;
  }
}

/** Nejbližší bod na úsečce. */
function nearestOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: x1, y: y1 };
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: x1 + t * dx, y: y1 + t * dy };
}

// ── Vzdálenost bodu od úsečky ──
/**
 * @param {number} px
 * @param {number} py
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
export function distPointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1,
    dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ── Test úhlu v rozsahu ──
/**
 * @param {number} angle
 * @param {number} start
 * @param {number} end
 * @param {boolean} [ccw] - Pokud true/false, testuje s tolerancí v daném směru
 * @returns {boolean}
 */
export function isAngleBetween(angle, start, end, ccw) {
  const norm = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (ccw === undefined) {
    // Původní chování: CCW sweep, bez tolerance
    const a = norm(angle - start);
    const e = norm(end - start);
    return a <= e;
  }
  if (ccw) {
    // CCW sweep s tolerancí
    const a = norm(angle - start);
    const e = norm(end - start);
    return a <= e + 1e-9;
  } else {
    // CW sweep s tolerancí
    const a = norm(start - angle);
    const e = norm(start - end);
    return a <= e + 1e-9;
  }
}

// ── Popisky typů ──
/**
 * @param {string} t
 * @returns {string}
 */
export function typeLabel(t) {
  return (
    {
      point: "Bod",
      line: "Úsečka",
      constr: "Konstrukční",
      circle: "Kružnice",
      arc: "Oblouk",
      rect: "Obdélník",
      polyline: "Kontura",
      text: "Text",
    }[t] || t
  );
}

/**
 * @param {string} t
 * @returns {string}
 */
export function toolLabel(t) {
  return (
    {
      select: "Výběr",
      move: "Přesun",
      point: "Bod",
      line: "Úsečka",
      constr: "Konstr. čára",
      circle: "Kružnice",
      arc: "Oblouk",
      rect: "Obdélník",
      polyline: "Kontura",
      measure: "Měření",
      tangent: "Tečna",
      offset: "Offset",
      trim: "Oříznout",
      extend: "Prodloužit",
      fillet: "Zaoblení",
      perp: "Kolmice",
      horizontal: "Vodorovnost",
      parallel: "Rovnoběžka",
      dimension: "Kóta",
      snapPoint: "Přichytit bod",
      text: "Text",
      deleteObj: "Smaž obj.",
    }[t] || t
  );
}

// ── Bulge → Arc konverze (DXF standard) ──
// bulge = tan(θ/4), kladný = CCW, záporný = CW
/**
 * @param {import('./types.js').Point2D} p1
 * @param {import('./types.js').Point2D} p2
 * @param {number} bulge
 * @returns {import('./types.js').BulgeArc|null}
 */
export function bulgeToArc(p1, p2, bulge) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-10 || bulge === 0) return null;

  const theta = 4 * Math.atan(Math.abs(bulge));
  const r = d / (2 * Math.sin(theta / 2));

  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;

  // Unit normal to chord (pointing left of P1→P2)
  const nx = -dy / d;
  const ny = dx / d;

  const h = r * Math.cos(theta / 2);
  const sign = bulge > 0 ? 1 : -1;
  const cx = mx + sign * h * nx;
  const cy = my + sign * h * ny;

  const startAngle = Math.atan2(p1.y - cy, p1.x - cx);
  const endAngle = Math.atan2(p2.y - cy, p2.x - cx);

  return { cx, cy, r, startAngle, endAngle, ccw: bulge > 0 };
}

// ── Radius + direction → bulge ──
/**
 * @param {import('./types.js').Point2D} p1
 * @param {import('./types.js').Point2D} p2
 * @param {number} radius
 * @param {boolean} cw
 * @returns {number}
 */
export function radiusToBulge(p1, p2, radius, cw) {
  const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (d < 1e-10 || radius < d / 2 - 1e-10) return 0;
  const halfAngle = Math.asin(Math.min(1, d / (2 * radius)));
  const bulge = Math.tan(halfAngle / 2);
  return cw ? -bulge : bulge;
}

// ── Hluboká kopie objektu ──
/**
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function deepClone(obj) {
  return structuredClone(obj);
}
