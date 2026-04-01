// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Boolean operace (sjednocení, odečtení, průnik)   ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, showToast } from '../state.js';
import { addObject } from '../objects.js';
import { findObjectAt, calculateAllIntersections } from '../geometry.js';
import { setHint } from '../ui.js';
import { renderAll } from '../render.js';
import { deepClone, getRectCorners } from '../utils.js';
import { showBooleanDialog } from '../dialogs/booleanDialog.js';

// ── Stav nástroje ──
let boolFirstIdx = null;

export function resetBooleanState() {
  boolFirstIdx = null;
}

/**
 * Handler kliknutí pro booleovský nástroj.
 * Fáze 1: klik na první uzavřenou konturu → uloží index
 * Fáze 2: klik na druhou → dialog → provede operaci
 */
export function handleBooleanClick(wx, wy) {
  const idx = findObjectAt(wx, wy);
  if (idx === null) {
    showToast('Klikněte na uzavřený objekt');
    return;
  }

  const obj = state.objects[idx];
  if (!_isClosedShape(obj)) {
    showToast('Objekt není uzavřená kontura (kružnice, obdélník nebo uzavřená polyline)');
    return;
  }

  if (boolFirstIdx === null) {
    // Fáze 1: výběr prvního objektu
    boolFirstIdx = idx;
    state.selected = idx;
    renderAll();
    setHint('Klikněte na druhou uzavřenou konturu');
    return;
  }

  // Fáze 2: výběr druhého objektu
  if (idx === boolFirstIdx) {
    showToast('Vyberte jiný objekt');
    return;
  }

  const objA = state.objects[boolFirstIdx];
  const objB = obj;
  const idxA = boolFirstIdx;
  const idxB = idx;

  // Resetovat stav před dialogem
  boolFirstIdx = null;

  showBooleanDialog((operation) => {
    const polyA = _objectToPolygon(objA);
    const polyB = _objectToPolygon(objB);

    if (!polyA || !polyB || polyA.length < 3 || polyB.length < 3) {
      showToast('Nepodařilo se převést kontury na polygony');
      return;
    }

    let result;
    switch (operation) {
      case 'union':
        result = polygonUnion(polyA, polyB);
        break;
      case 'subtract':
        result = polygonSubtract(polyA, polyB);
        break;
      case 'intersect':
        result = polygonIntersect(polyA, polyB);
        break;
    }

    if (!result || result.length < 3) {
      showToast('Výsledek booleovské operace je prázdný');
      return;
    }

    // Smazat zdrojové objekty (vyšší index nejdřív)
    const toRemove = [idxA, idxB].sort((a, b) => b - a);
    for (const ri of toRemove) {
      state.objects.splice(ri, 1);
    }

    // Přidat výsledek
    const opLabels = { union: 'Sjednocení', subtract: 'Odečtení', intersect: 'Průnik' };
    addObject({
      type: 'polyline',
      vertices: result,
      bulges: new Array(result.length).fill(0),
      closed: true,
      name: `${opLabels[operation]} ${state.nextId}`,
    });

    calculateAllIntersections();
    renderAll();
    showToast(`${opLabels[operation]} provedeno ✓`);
    setHint('Klikněte na první uzavřenou konturu');
  });
}

// ══════════════════════════════════════════════════════════════
// Pomocné funkce
// ══════════════════════════════════════════════════════════════

/** Zjistí, zda je objekt uzavřená kontura. */
function _isClosedShape(obj) {
  if (!obj) return false;
  if (obj.type === 'circle') return true;
  if (obj.type === 'rect') return true;
  if (obj.type === 'polyline' && obj.closed) return true;
  return false;
}

/** Převede objekt na polygon (pole {x,y} bodů). */
function _objectToPolygon(obj) {
  switch (obj.type) {
    case 'circle':
      return _circleToPolygon(obj.cx, obj.cy, obj.r, 64);
    case 'rect':
      return getRectCorners(obj);
    case 'polyline':
      return _polylineToPolygon(obj);
    default:
      return null;
  }
}

/** Aproximuje kružnici jako polygon s N body. */
function _circleToPolygon(cx, cy, r, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

/** Převede polyline (s bulges) na polygon flat body. */
function _polylineToPolygon(obj) {
  if (!obj.vertices || obj.vertices.length < 3) return null;
  const result = [];
  const n = obj.vertices.length;
  for (let i = 0; i < n; i++) {
    const p1 = obj.vertices[i];
    const p2 = obj.vertices[(i + 1) % n];
    const bulge = (obj.bulges && obj.bulges[i]) || 0;
    if (Math.abs(bulge) > 1e-6) {
      // Obloukový segment → aproximace body
      const arcPts = _bulgeToPoints(p1, p2, bulge, 16);
      // Přidat vše kromě posledního bodu (ten = p2, přidá se dalším segmentem)
      for (let j = 0; j < arcPts.length - 1; j++) {
        result.push(arcPts[j]);
      }
    } else {
      result.push({ x: p1.x, y: p1.y });
    }
  }
  return result;
}

/** Převede bulge segment na pole bodů. */
function _bulgeToPoints(p1, p2, bulge, segments) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-10) return [{ x: p1.x, y: p1.y }];

  const sagitta = Math.abs(bulge) * d / 2;
  const r = ((d / 2) * (d / 2) + sagitta * sagitta) / (2 * sagitta);
  const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
  const nx = -dy / d, ny = dx / d;
  const sign = bulge > 0 ? 1 : -1;
  const offset = r - sagitta;
  const cx = mx + sign * nx * offset;
  const cy = my + sign * ny * offset;

  let a1 = Math.atan2(p1.y - cy, p1.x - cx);
  let a2 = Math.atan2(p2.y - cy, p2.x - cx);

  if (bulge > 0) {
    if (a2 < a1) a2 += 2 * Math.PI;
  } else {
    if (a1 < a2) a1 += 2 * Math.PI;
  }

  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = a1 + (a2 - a1) * t;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

// ══════════════════════════════════════════════════════════════
// Polygon Boolean Operations (Sutherland-Hodgman based)
// ══════════════════════════════════════════════════════════════

/**
 * Průnik dvou konvexních/konkávních polygonů.
 * Používá Sutherland-Hodgman clipping.
 */
export function polygonIntersect(subjectPoly, clipPoly) {
  return sutherlandHodgman(subjectPoly, clipPoly);
}

/**
 * Sjednocení dvou polygonů.
 * Union = A + B - (A ∩ B) — implementováno přes obrys.
 */
export function polygonUnion(polyA, polyB) {
  // Pokud se nepřekrývají, vrátit obě jako jeden polygon (přibližně)
  const inter = sutherlandHodgman(polyA, polyB);
  if (!inter || inter.length < 3) {
    // Nepřekrývají se — sloučit jako jeden polygon
    // Najít nejbližší body a spojit
    return _mergeDisjoint(polyA, polyB);
  }
  // Překrývající se — výpočet union obrysu
  return _computeUnion(polyA, polyB);
}

/**
 * Odečtení polygonu B od A.
 * A - B: body A, které jsou mimo B.
 */
export function polygonSubtract(polyA, polyB) {
  const inter = sutherlandHodgman(polyA, polyB);
  if (!inter || inter.length < 3) {
    // B neovlivňuje A — vrátit A
    return polyA.map(p => ({ x: p.x, y: p.y }));
  }
  return _computeSubtract(polyA, polyB);
}

// ── Sutherland-Hodgman polygon clipping ──

function sutherlandHodgman(subject, clip) {
  let output = subject.map(p => ({ x: p.x, y: p.y }));

  for (let i = 0; i < clip.length; i++) {
    if (output.length === 0) return [];
    const input = output;
    output = [];
    const edgeStart = clip[i];
    const edgeEnd = clip[(i + 1) % clip.length];

    for (let j = 0; j < input.length; j++) {
      const current = input[j];
      const prev = input[(j + input.length - 1) % input.length];
      const currInside = _isLeft(edgeStart, edgeEnd, current);
      const prevInside = _isLeft(edgeStart, edgeEnd, prev);

      if (currInside) {
        if (!prevInside) {
          const inter = _lineIntersect(prev, current, edgeStart, edgeEnd);
          if (inter) output.push(inter);
        }
        output.push({ x: current.x, y: current.y });
      } else if (prevInside) {
        const inter = _lineIntersect(prev, current, edgeStart, edgeEnd);
        if (inter) output.push(inter);
      }
    }
  }
  return output;
}

/** Bod je "vlevo" od orientované hrany (inside). */
function _isLeft(a, b, p) {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= 0;
}

/** Průsečík dvou úseček (p1→p2 a p3→p4). */
function _lineIntersect(p1, p2, p3, p4) {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  return { x: p1.x + t * d1x, y: p1.y + t * d1y };
}

/** Test bod uvnitř polygonu (ray casting). */
function _pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if (((yi > pt.y) !== (yj > pt.y)) &&
        (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/** Plocha polygonu (signed). */
function _signedArea(poly) {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    area += poly[i].x * poly[j].y;
    area -= poly[j].x * poly[i].y;
  }
  return area / 2;
}

/** Zajistí CCW orientaci polygonu. */
function _ensureCCW(poly) {
  if (_signedArea(poly) < 0) poly.reverse();
  return poly;
}

// ── Union: obrysový přístup přes řazení průsečíků ──

function _computeUnion(polyA, polyB) {
  _ensureCCW(polyA);
  _ensureCCW(polyB);

  // Najít body A mimo B a body B mimo A, plus průsečíky
  const result = [];

  // Sbírat body A, které leží mimo B
  for (const p of polyA) {
    if (!_pointInPolygon(p, polyB)) {
      result.push({ x: p.x, y: p.y });
    }
  }
  // Sbírat body B, které leží mimo A
  for (const p of polyB) {
    if (!_pointInPolygon(p, polyA)) {
      result.push({ x: p.x, y: p.y });
    }
  }
  // Přidat průsečíky hran
  const inters = _findAllEdgeIntersections(polyA, polyB);
  for (const p of inters) {
    result.push(p);
  }

  if (result.length < 3) {
    // Jeden polygon zcela obsahuje druhý
    const aArea = Math.abs(_signedArea(polyA));
    const bArea = Math.abs(_signedArea(polyB));
    return aArea >= bArea
      ? polyA.map(p => ({ x: p.x, y: p.y }))
      : polyB.map(p => ({ x: p.x, y: p.y }));
  }

  return _convexHullSort(result);
}

function _computeSubtract(polyA, polyB) {
  _ensureCCW(polyA);
  _ensureCCW(polyB);

  const result = [];

  // Body A mimo B
  for (const p of polyA) {
    if (!_pointInPolygon(p, polyB)) {
      result.push({ x: p.x, y: p.y });
    }
  }
  // Průsečíky hran
  const inters = _findAllEdgeIntersections(polyA, polyB);
  for (const p of inters) {
    result.push(p);
  }
  // Body B uvnitř A (obrácený obrys výřezu)
  const bInside = [];
  for (const p of polyB) {
    if (_pointInPolygon(p, polyA)) {
      bInside.push({ x: p.x, y: p.y });
    }
  }
  // Přidat body B uvnitř A v obráceném pořadí (díra)
  bInside.reverse();
  for (const p of bInside) {
    result.push(p);
  }

  if (result.length < 3) {
    return polyA.map(p => ({ x: p.x, y: p.y }));
  }

  return _sortPolygonPoints(result);
}

/** Najde všechny průsečíky hran dvou polygonů. */
function _findAllEdgeIntersections(polyA, polyB) {
  const result = [];
  for (let i = 0; i < polyA.length; i++) {
    const a1 = polyA[i], a2 = polyA[(i + 1) % polyA.length];
    for (let j = 0; j < polyB.length; j++) {
      const b1 = polyB[j], b2 = polyB[(j + 1) % polyB.length];
      const inter = _segmentIntersect(a1, a2, b1, b2);
      if (inter) result.push(inter);
    }
  }
  return result;
}

/** Průsečík dvou úseček (s kontrolou rozsahu t,u ∈ [0,1]). */
function _segmentIntersect(p1, p2, p3, p4) {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: p1.x + t * d1x, y: p1.y + t * d1y };
  }
  return null;
}

/** Seřadí body polygonu úhlově kolem těžiště. */
function _sortPolygonPoints(pts) {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  pts.sort((a, b) => {
    const aa = Math.atan2(a.y - cy, a.x - cx);
    const ba = Math.atan2(b.y - cy, b.x - cx);
    return aa - ba;
  });
  // Odstranit duplicity
  return _removeDuplicates(pts);
}

/** Konvexní obal + řazení (pro union disjunktních polygonů). */
function _convexHullSort(pts) {
  return _sortPolygonPoints(pts);
}

/** Spojení dvou nepřekrývajících se polygonů. */
function _mergeDisjoint(polyA, polyB) {
  // Najít nejbližší páry bodů
  let minDist = Infinity, bestA = 0, bestB = 0;
  for (let i = 0; i < polyA.length; i++) {
    for (let j = 0; j < polyB.length; j++) {
      const d = Math.hypot(polyA[i].x - polyB[j].x, polyA[i].y - polyB[j].y);
      if (d < minDist) { minDist = d; bestA = i; bestB = j; }
    }
  }
  // Sestavit cestu: A od bestA → zpět do bestA, přejít do B bestB → zpět
  const result = [];
  for (let i = 0; i <= polyA.length; i++) {
    const p = polyA[(bestA + i) % polyA.length];
    result.push({ x: p.x, y: p.y });
  }
  for (let i = 0; i <= polyB.length; i++) {
    const p = polyB[(bestB + i) % polyB.length];
    result.push({ x: p.x, y: p.y });
  }
  return result;
}

/** Odstraní téměř-duplicitní body. */
function _removeDuplicates(pts) {
  if (pts.length < 2) return pts;
  const result = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = result[result.length - 1];
    if (Math.hypot(pts[i].x - prev.x, pts[i].y - prev.y) > 1e-6) {
      result.push(pts[i]);
    }
  }
  return result;
}
