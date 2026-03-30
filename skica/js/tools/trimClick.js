// ╔══════════════════════════════════════════════════════════════╗
// ║  Oříznutí úsečky – click logika                            ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, pushUndo, showToast } from '../state.js';
import { renderAll } from '../render.js';
import { findObjectAt, calculateAllIntersections, getLines, getCircles, intersectLineLine, intersectLineCircle } from '../geometry.js';
import { getLineSegment, analyzeSelection } from './helpers.js';
import { showEndpointChoiceDialog } from '../dialogs.js';

/** Ořízne úsečku k nejbližšímu průsečíku na straně kliknutí. */
export function handleTrimClick(wx, wy) {
  const idx = findObjectAt(wx, wy);
  if (idx === null) { showToast("Klepněte na úsečku k oříznutí"); return; }
  const obj = state.objects[idx];
  const ls = getLineSegment(obj, wx, wy);
  if (!ls) {
    showToast("Oříznutí funguje pouze pro úsečky a rovné segmenty kontur");
    return;
  }

  // Guard: zero-length segment
  const dx0 = ls.seg.x2 - ls.seg.x1, dy0 = ls.seg.y2 - ls.seg.y1;
  if (dx0 * dx0 + dy0 * dy0 < 1e-12) { showToast("Úsečka má nulovou délku"); return; }

  // Collect all intersection points on this line segment from other objects
  const pts = [];
  const lineSeg = { x1: ls.seg.x1, y1: ls.seg.y1, x2: ls.seg.x2, y2: ls.seg.y2, isConstr: false };
  for (let i = 0; i < state.objects.length; i++) {
    if (i === idx) continue;
    const other = state.objects[i];
    for (const seg of getLines(other)) {
      pts.push(...intersectLineLine(lineSeg, seg));
    }
    for (const circ of getCircles(other)) {
      pts.push(...intersectLineCircle(lineSeg, circ));
    }
  }

  if (pts.length === 0) { showToast("Žádný průsečík pro oříznutí"); return; }

  // Determine which end of the line is closer to click point
  const d1 = Math.hypot(wx - ls.seg.x1, wy - ls.seg.y1);
  const d2 = Math.hypot(wx - ls.seg.x2, wy - ls.seg.y2);
  const trimEnd = d1 < d2 ? 1 : 2; // 1 = trim start(x1,y1), 2 = trim end(x2,y2)

  // Find intersection closest to the trimmed end
  let bestPt = null, bestDist = Infinity;
  for (const p of pts) {
    const d = trimEnd === 1
      ? Math.hypot(p.x - ls.seg.x1, p.y - ls.seg.y1)
      : Math.hypot(p.x - ls.seg.x2, p.y - ls.seg.y2);
    if (d < bestDist && d > 1e-9) {
      bestDist = d;
      bestPt = p;
    }
  }
  if (!bestPt) { showToast("Žádný vhodný průsečík"); return; }

  pushUndo();
  if (trimEnd === 1) { ls.setP1(bestPt.x, bestPt.y); }
  else { ls.setP2(bestPt.x, bestPt.y); }

  calculateAllIntersections();
  renderAll();
  showToast("Oříznuto ✓");
}

/** Oříznutí z předvybraného objektu. Vrací true pokud se operace provedla. */
export function trimFromSelection() {
  const { lines } = analyzeSelection();
  if (lines.length !== 1) return false;

  const lineInfo = lines[0];
  const idx = lineInfo.idx;
  const obj = state.objects[idx];
  if (!obj) return false;

  // Pro polyline s vybraným segmentem musíme použít getLineSegment se segIdx
  let ls;
  if (obj.type === 'polyline' && lineInfo.segIdx !== null) {
    const v = obj.vertices;
    const si = lineInfo.segIdx;
    const n = v.length;
    const p1 = v[si], p2 = v[(si + 1) % n];
    const b = obj.bulges?.[si] || 0;
    if (b !== 0) { showToast("Oříznutí obloukového segmentu není podporováno"); return true; }
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

  const dx0 = ls.seg.x2 - ls.seg.x1, dy0 = ls.seg.y2 - ls.seg.y1;
  if (dx0 * dx0 + dy0 * dy0 < 1e-12) { showToast("Úsečka má nulovou délku"); return true; }

  // Najít průsečíky
  const pts = [];
  const lineSeg = { x1: ls.seg.x1, y1: ls.seg.y1, x2: ls.seg.x2, y2: ls.seg.y2, isConstr: false };
  for (let i = 0; i < state.objects.length; i++) {
    if (i === idx) continue;
    const other = state.objects[i];
    for (const seg of getLines(other)) pts.push(...intersectLineLine(lineSeg, seg));
    for (const circ of getCircles(other)) pts.push(...intersectLineCircle(lineSeg, circ));
  }
  if (pts.length === 0) { showToast("Žádný průsečík pro oříznutí"); return true; }

  showEndpointChoiceDialog("Oříznutí – výběr konce", ls.seg,
    "Oříznout ze začátku", "Oříznout z konce",
    (end) => {
      let bestPt = null, bestDist = Infinity;
      for (const p of pts) {
        const d = end === 1
          ? Math.hypot(p.x - ls.seg.x1, p.y - ls.seg.y1)
          : Math.hypot(p.x - ls.seg.x2, p.y - ls.seg.y2);
        if (d < bestDist && d > 1e-9) { bestDist = d; bestPt = p; }
      }
      if (!bestPt) { showToast("Žádný vhodný průsečík"); return; }
      pushUndo();
      if (end === 1) ls.setP1(bestPt.x, bestPt.y);
      else ls.setP2(bestPt.x, bestPt.y);
      calculateAllIntersections();
      renderAll();
      showToast("Oříznuto ✓");
    }
  );
  return true;
}
