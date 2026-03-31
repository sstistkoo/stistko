// ╔══════════════════════════════════════════════════════════════╗
// ║  Prodloužení objektů – click logika                        ║
// ║  Podporuje: úsečky, oblouky, rovné segmenty kontur         ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, pushUndo, showToast } from '../state.js';
import { renderAll } from '../render.js';
import { findObjectAt, calculateAllIntersections, getLines, getCircles, intersectLineLine, intersectLineCircle, intersectCircleCircle } from '../geometry.js';
import { getLineSegment, analyzeSelection } from './helpers.js';
import { showEndpointChoiceDialog } from '../dialogs.js';
import { isAnchored } from './anchorClick.js';
import { updateAssociativeDimensions } from '../dialogs/dimension.js';
import { isAngleBetween } from '../utils.js';

// ── Helpers ──

/** Normalizuje úhel do [0, 2π). */
function normalizeAngle(a) {
  return ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

/**
 * Sebere průsečíky plné kružnice (rozšířený oblouk) se všemi ostatními objekty.
 * Vrací body na plné kružnici, ne jen na oblouku.
 */
function collectFullCircleIntersections(idx, cx, cy, r) {
  const fullCircle = { cx, cy, r }; // bez startAngle/endAngle = plná kružnice
  const pts = [];
  for (let i = 0; i < state.objects.length; i++) {
    if (i === idx) continue;
    const other = state.objects[i];
    if (other.isDimension || other.isCoordLabel || other.skipIntersections) continue;
    for (const seg of getLines(other)) {
      pts.push(...intersectLineCircle(seg, fullCircle));
    }
    for (const circ of getCircles(other)) {
      pts.push(...intersectCircleCircle(fullCircle, circ));
    }
  }
  // Deduplikace
  const unique = [];
  for (const pt of pts) {
    if (!unique.some(u => Math.hypot(u.x - pt.x, u.y - pt.y) < 1e-6)) {
      unique.push(pt);
    }
  }
  return unique;
}

// ── Prodloužení oblouku ──

function extendArc(idx, obj, wx, wy) {
  const cx = obj.cx, cy = obj.cy, r = obj.r;
  const ccw = obj.ccw !== false;

  // Koncové body oblouku
  const startPt = { x: cx + r * Math.cos(obj.startAngle), y: cy + r * Math.sin(obj.startAngle) };
  const endPt = { x: cx + r * Math.cos(obj.endAngle), y: cy + r * Math.sin(obj.endAngle) };

  // Určit, který konec je blíž kliknutí
  const a1 = isAnchored(startPt.x, startPt.y);
  const a2 = isAnchored(endPt.x, endPt.y);
  if (a1 && a2) { showToast("Oba konce jsou zakotveny – nelze prodloužit"); return; }

  let extEnd; // 1 = start, 2 = end
  if (a1) { extEnd = 2; }
  else if (a2) { extEnd = 1; }
  else {
    const d1 = Math.hypot(wx - startPt.x, wy - startPt.y);
    const d2 = Math.hypot(wx - endPt.x, wy - endPt.y);
    extEnd = d1 < d2 ? 1 : 2;
  }

  // Najít průsečíky plné kružnice s ostatními objekty
  const allPts = collectFullCircleIntersections(idx, cx, cy, r);
  if (allPts.length === 0) { showToast("Žádný objekt pro prodloužení"); return; }

  // Filtrovat: jen body MIMO aktuální oblouk (= body ve směru prodloužení)
  const candidates = [];
  for (const p of allPts) {
    const angle = Math.atan2(p.y - cy, p.x - cx);
    // Bod už je na oblouku → přeskočit
    if (isAngleBetween(angle, obj.startAngle, obj.endAngle, ccw)) continue;

    // Vzdálenost od prodlužovaného konce po oblouku
    let dist;
    if (extEnd === 1) {
      // Prodlužujeme za startAngle (proti směru oblouku)
      if (ccw) {
        // CCW oblouk: start → end je CCW, prodloužení za start je CW
        dist = normalizeAngle(obj.startAngle - angle);
      } else {
        dist = normalizeAngle(angle - obj.startAngle);
      }
    } else {
      // Prodlužujeme za endAngle (ve směru oblouku)
      if (ccw) {
        dist = normalizeAngle(angle - obj.endAngle);
      } else {
        dist = normalizeAngle(obj.endAngle - angle);
      }
    }
    if (dist > 1e-9) {
      candidates.push({ pt: p, angle, dist });
    }
  }

  if (candidates.length === 0) { showToast("Žádný průsečík ve směru prodloužení"); return; }

  // Nejbližší bod
  candidates.sort((a, b) => a.dist - b.dist);
  const best = candidates[0];

  pushUndo();
  if (extEnd === 1) {
    obj.startAngle = best.angle;
  } else {
    obj.endAngle = best.angle;
  }

  calculateAllIntersections();
  updateAssociativeDimensions();
  renderAll();
  showToast("Oblouk prodloužen ✓");
}

// ── Prodloužení úsečky ──

function extendLine(idx, obj, ls, wx, wy) {
  // Which end to extend (closer to click)
  const a1 = isAnchored(ls.seg.x1, ls.seg.y1);
  const a2 = isAnchored(ls.seg.x2, ls.seg.y2);
  if (a1 && a2) { showToast("Oba konce jsou zakotveny – nelze prodloužit"); return; }
  let extEnd;
  if (a1) { extEnd = 2; }
  else if (a2) { extEnd = 1; }
  else {
    const d1 = Math.hypot(wx - ls.seg.x1, wy - ls.seg.y1);
    const d2 = Math.hypot(wx - ls.seg.x2, wy - ls.seg.y2);
    extEnd = d1 < d2 ? 1 : 2;
  }

  // Create an infinite line (construction) to find intersections beyond the segment
  const infLine = { x1: ls.seg.x1, y1: ls.seg.y1, x2: ls.seg.x2, y2: ls.seg.y2, isConstr: true };

  const pts = [];
  for (let i = 0; i < state.objects.length; i++) {
    if (i === idx) continue;
    const other = state.objects[i];
    if (other.isDimension || other.isCoordLabel || other.skipIntersections) continue;
    for (const seg of getLines(other)) {
      pts.push(...intersectLineLine(infLine, seg));
    }
    for (const circ of getCircles(other)) {
      pts.push(...intersectLineCircle(infLine, circ));
    }
  }

  if (pts.length === 0) { showToast("Žádný objekt pro prodloužení"); return; }

  // Filter: only points beyond the extended end (along the line direction)
  const dx = ls.seg.x2 - ls.seg.x1, dy = ls.seg.y2 - ls.seg.y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) { showToast("Úsečka má nulovou délku"); return; }
  const candidates = [];
  for (const p of pts) {
    const t = ((p.x - ls.seg.x1) * dx + (p.y - ls.seg.y1) * dy) / len2;
    if (extEnd === 1 && t < 1e-9) {
      candidates.push({ pt: p, dist: Math.hypot(p.x - ls.seg.x1, p.y - ls.seg.y1) });
    } else if (extEnd === 2 && t > 1 - 1e-9) {
      candidates.push({ pt: p, dist: Math.hypot(p.x - ls.seg.x2, p.y - ls.seg.y2) });
    }
  }

  if (candidates.length === 0) { showToast("Žádný průsečík ve směru prodloužení"); return; }

  // Pick closest
  candidates.sort((a, b) => a.dist - b.dist);
  const best = candidates[0].pt;

  pushUndo();
  if (extEnd === 1) { ls.setP1(best.x, best.y); }
  else { ls.setP2(best.x, best.y); }

  calculateAllIntersections();
  updateAssociativeDimensions();
  renderAll();
  showToast("Prodlouženo ✓");
}

// ── Hlavní vstupní bod ──

/** Prodlouží objekt k nejbližšímu průsečíku s jiným objektem na straně kliknutí. */
export function handleExtendClick(wx, wy) {
  const idx = findObjectAt(wx, wy);
  if (idx === null) { showToast("Klepněte na objekt k prodloužení"); return; }
  const obj = state.objects[idx];

  // Oblouk
  if (obj.type === 'arc') {
    return extendArc(idx, obj, wx, wy);
  }

  // Úsečka / kontura (rovný segment)
  const ls = getLineSegment(obj, wx, wy);
  if (!ls) {
    showToast("Prodloužení tohoto typu objektu není podporováno");
    return;
  }
  extendLine(idx, obj, ls, wx, wy);
}

/** Prodloužení z předvybraného objektu. Vrací true pokud se operace provedla. */
export function extendFromSelection() {
  const { lines, circles } = analyzeSelection();

  // Prodloužení oblouku z výběru
  if (circles.length === 1 && lines.length === 0) {
    const circInfo = circles[0];
    const idx = circInfo.idx;
    const obj = state.objects[idx];
    if (!obj) return false;
    if (obj.type === 'circle') {
      showToast("Kružnice je již uzavřená – nelze prodloužit");
      return true;
    }
    if (obj.type !== 'arc') return false;

    const cx = obj.cx, cy = obj.cy, r = obj.r;
    const ccw = obj.ccw !== false;

    const startPt = { x: cx + r * Math.cos(obj.startAngle), y: cy + r * Math.sin(obj.startAngle) };
    const endPt = { x: cx + r * Math.cos(obj.endAngle), y: cy + r * Math.sin(obj.endAngle) };

    const allPts = collectFullCircleIntersections(idx, cx, cy, r);
    if (allPts.length === 0) { showToast("Žádný objekt pro prodloužení"); return true; }

    const a1 = isAnchored(startPt.x, startPt.y);
    const a2 = isAnchored(endPt.x, endPt.y);
    if (a1 && a2) { showToast("Oba konce jsou zakotveny – nelze prodloužit"); return true; }

    // Rozdělit průsečíky podle směru
    const candsStart = [], candsEnd = [];
    for (const p of allPts) {
      const angle = Math.atan2(p.y - cy, p.x - cx);
      if (isAngleBetween(angle, obj.startAngle, obj.endAngle, ccw)) continue;
      const distStart = ccw ? normalizeAngle(obj.startAngle - angle) : normalizeAngle(angle - obj.startAngle);
      const distEnd = ccw ? normalizeAngle(angle - obj.endAngle) : normalizeAngle(obj.endAngle - angle);
      if (distStart > 1e-9) candsStart.push({ pt: p, angle, dist: distStart });
      if (distEnd > 1e-9) candsEnd.push({ pt: p, angle, dist: distEnd });
    }

    if (candsStart.length === 0 && candsEnd.length === 0) {
      showToast("Žádný průsečík ve směru prodloužení");
      return true;
    }

    showEndpointChoiceDialog("Prodloužení oblouku – výběr konce",
      { x1: startPt.x, y1: startPt.y, x2: endPt.x, y2: endPt.y },
      a1 ? "⚓ Začátek (zakotven)" : (candsStart.length > 0 ? "Prodloužit ze začátku" : "⚠ Ze začátku (žádný průsečík)"),
      a2 ? "⚓ Konec (zakotven)" : (candsEnd.length > 0 ? "Prodloužit z konce" : "⚠ Z konce (žádný průsečík)"),
      (end) => {
        if (end === 1 && a1) { showToast("Tento konec je zakotven – nelze prodloužit"); return; }
        if (end === 2 && a2) { showToast("Tento konec je zakotven – nelze prodloužit"); return; }
        const candidates = end === 1 ? candsStart : candsEnd;
        if (candidates.length === 0) { showToast("Žádný průsečík ve směru prodloužení"); return; }
        candidates.sort((a, b) => a.dist - b.dist);
        const best = candidates[0];
        pushUndo();
        if (end === 1) obj.startAngle = best.angle;
        else obj.endAngle = best.angle;
        calculateAllIntersections();
        updateAssociativeDimensions();
        renderAll();
        showToast("Oblouk prodloužen ✓");
      }
    );
    return true;
  }

  if (lines.length !== 1) return false;

  const lineInfo = lines[0];
  const idx = lineInfo.idx;
  const obj = state.objects[idx];
  if (!obj) return false;

  let ls;
  if (obj.type === 'polyline' && lineInfo.segIdx !== null) {
    const v = obj.vertices;
    const si = lineInfo.segIdx;
    const n = v.length;
    const p1 = v[si], p2 = v[(si + 1) % n];
    const b = obj.bulges?.[si] || 0;
    if (b !== 0) { showToast("Prodloužení obloukového segmentu není podporováno"); return true; }
    ls = {
      seg: { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y },
      setP1: (x, y) => { p1.x = x; p1.y = y; },
      setP2: (x, y) => { p2.x = x; p2.y = y; },
      segIdx: si
    };
  } else {
    ls = getLineSegment(obj, (obj.x1 + obj.x2) / 2, (obj.y1 + obj.y2) / 2);
  }
  if (!ls) return false;

  const dx = ls.seg.x2 - ls.seg.x1, dy = ls.seg.y2 - ls.seg.y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) { showToast("Úsečka má nulovou délku"); return true; }

  // Najít průsečíky s nekonečnou úsečkou
  const infLine = { x1: ls.seg.x1, y1: ls.seg.y1, x2: ls.seg.x2, y2: ls.seg.y2, isConstr: true };
  const pts = [];
  for (let i = 0; i < state.objects.length; i++) {
    if (i === idx) continue;
    const other = state.objects[i];
    if (other.isDimension || other.isCoordLabel || other.skipIntersections) continue;
    for (const seg of getLines(other)) pts.push(...intersectLineLine(infLine, seg));
    for (const circ of getCircles(other)) pts.push(...intersectLineCircle(infLine, circ));
  }
  if (pts.length === 0) { showToast("Žádný objekt pro prodloužení"); return true; }

  // Zjistit, zda existují průsečíky v obou směrech
  const cands1 = [], cands2 = [];
  for (const p of pts) {
    const t = ((p.x - ls.seg.x1) * dx + (p.y - ls.seg.y1) * dy) / len2;
    if (t < 1e-9) cands1.push({ pt: p, dist: Math.hypot(p.x - ls.seg.x1, p.y - ls.seg.y1) });
    if (t > 1 - 1e-9) cands2.push({ pt: p, dist: Math.hypot(p.x - ls.seg.x2, p.y - ls.seg.y2) });
  }

  if (cands1.length === 0 && cands2.length === 0) {
    showToast("Žádný průsečík ve směru prodloužení");
    return true;
  }

  // Kontrola kotev
  const a1 = isAnchored(ls.seg.x1, ls.seg.y1);
  const a2 = isAnchored(ls.seg.x2, ls.seg.y2);
  if (a1 && a2) { showToast("Oba konce jsou zakotveny – nelze prodloužit"); return true; }

  showEndpointChoiceDialog("Prodloužení – výběr konce", ls.seg,
    a1 ? "⚓ Začátek (zakotven)" : (cands1.length > 0 ? "Prodloužit ze začátku" : "⚠ Ze začátku (žádný průsečík)"),
    a2 ? "⚓ Konec (zakotven)" : (cands2.length > 0 ? "Prodloužit z konce" : "⚠ Z konce (žádný průsečík)"),
    (end) => {
      if (end === 1 && a1) { showToast("Tento konec je zakotven – nelze prodloužit"); return; }
      if (end === 2 && a2) { showToast("Tento konec je zakotven – nelze prodloužit"); return; }
      const candidates = end === 1 ? cands1 : cands2;
      if (candidates.length === 0) { showToast("Žádný průsečík ve směru prodloužení"); return; }
      candidates.sort((a, b) => a.dist - b.dist);
      const best = candidates[0].pt;
      pushUndo();
      if (end === 1) ls.setP1(best.x, best.y);
      else ls.setP2(best.x, best.y);
      calculateAllIntersections();
      updateAssociativeDimensions();
      renderAll();
      showToast("Prodlouženo ✓");
    }
  );
  return true;
}
