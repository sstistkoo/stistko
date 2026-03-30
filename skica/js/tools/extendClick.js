// ╔══════════════════════════════════════════════════════════════╗
// ║  Prodloužení úsečky – click logika                         ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, pushUndo, showToast } from '../state.js';
import { renderAll } from '../render.js';
import { findObjectAt, calculateAllIntersections, getLines, getCircles, intersectLineLine, intersectLineCircle } from '../geometry.js';
import { getLineSegment, analyzeSelection } from './helpers.js';
import { showEndpointChoiceDialog } from '../dialogs.js';

/** Prodlouží úsečku k nejbližšímu průsečíku s jiným objektem na straně kliknutí. */
export function handleExtendClick(wx, wy) {
  const idx = findObjectAt(wx, wy);
  if (idx === null) { showToast("Klepněte na úsečku k prodloužení"); return; }
  const obj = state.objects[idx];
  const ls = getLineSegment(obj, wx, wy);
  if (!ls) {
    showToast("Prodloužení funguje pouze pro úsečky a rovné segmenty kontur");
    return;
  }

  // Which end to extend (closer to click)
  const d1 = Math.hypot(wx - ls.seg.x1, wy - ls.seg.y1);
  const d2 = Math.hypot(wx - ls.seg.x2, wy - ls.seg.y2);
  const extEnd = d1 < d2 ? 1 : 2;

  // Create an infinite line (construction) to find intersections beyond the segment
  const infLine = { x1: ls.seg.x1, y1: ls.seg.y1, x2: ls.seg.x2, y2: ls.seg.y2, isConstr: true };

  const pts = [];
  for (let i = 0; i < state.objects.length; i++) {
    if (i === idx) continue;
    const other = state.objects[i];
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
    // extEnd=1: we extend beyond x1, so t < 0
    // extEnd=2: we extend beyond x2, so t > 1
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
  renderAll();
  showToast("Prodlouženo ✓");
}

/** Prodloužení z předvybraného objektu. Vrací true pokud se operace provedla. */
export function extendFromSelection() {
  const { lines } = analyzeSelection();
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

  showEndpointChoiceDialog("Prodloužení – výběr konce", ls.seg,
    cands1.length > 0 ? "Prodloužit ze začátku" : "⚠ Ze začátku (žádný průsečík)",
    cands2.length > 0 ? "Prodloužit z konce" : "⚠ Z konce (žádný průsečík)",
    (end) => {
      const candidates = end === 1 ? cands1 : cands2;
      if (candidates.length === 0) { showToast("Žádný průsečík ve směru prodloužení"); return; }
      candidates.sort((a, b) => a.dist - b.dist);
      const best = candidates[0].pt;
      pushUndo();
      if (end === 1) ls.setP1(best.x, best.y);
      else ls.setP2(best.x, best.y);
      calculateAllIntersections();
      renderAll();
      showToast("Prodlouženo ✓");
    }
  );
  return true;
}
