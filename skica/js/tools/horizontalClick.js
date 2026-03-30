// ╔══════════════════════════════════════════════════════════════╗
// ║  Vodorovnost – click logika                                ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, pushUndo, showToast } from '../state.js';
import { renderAll } from '../render.js';
import { findObjectAt, calculateAllIntersections } from '../geometry.js';
import { getLineSegment, setConstraint, propagateConstraints, analyzeSelection } from './helpers.js';
import { showEndpointChoiceDialog } from '../dialogs.js';

/** Vyrovná úsečku/segment kontury do vodorovné polohy.
 *  Kotevní bod = koncový bod bližší ke kliknutí (zůstane na místě),
 *  druhý koncový bod se posune vodorovně ve stejném směru. */
export function handleHorizontalClick(wx, wy) {
  const idx = findObjectAt(wx, wy);
  if (idx === null) { showToast("Klepněte na úsečku nebo segment kontury"); return; }
  const obj = state.objects[idx];
  const ls = getLineSegment(obj, wx, wy);
  if (!ls) {
    showToast("Vodorovnost funguje pouze pro úsečky a rovné segmenty kontur");
    return;
  }

  const len = Math.hypot(ls.seg.x2 - ls.seg.x1, ls.seg.y2 - ls.seg.y1);
  if (len < 1e-9) { showToast("Segment má nulovou délku"); return; }
  // Zjistit, ke kterému konci je klik blíž → ten bude kotva
  const d1 = Math.hypot(wx - ls.seg.x1, wy - ls.seg.y1);
  const d2 = Math.hypot(wx - ls.seg.x2, wy - ls.seg.y2);
  // Zachovat původní směr (dx kladné/záporné)
  const sign = (ls.seg.x2 - ls.seg.x1) >= 0 ? 1 : -1;

  pushUndo();
  let movedEnd;
  if (d1 <= d2) {
    // P1 je kotva, P2 se posune
    ls.setP2(ls.seg.x1 + sign * len, ls.seg.y1);
    movedEnd = 'p2';
  } else {
    // P2 je kotva, P1 se posune
    ls.setP1(ls.seg.x2 - sign * len, ls.seg.y2);
    movedEnd = 'p1';
  }

  // Uložit vazbu na objekt
  setConstraint(obj, ls.segIdx, 'horizontal');
  // Propagovat na sousední segmenty polyline
  propagateConstraints(obj, ls.segIdx, movedEnd);

  calculateAllIntersections();
  renderAll();
  showToast("Vyrovnáno vodorovně ✓");
}

/** Vodorovnost z předvybraného objektu. Vrací true pokud se operace provedla. */
export function horizontalFromSelection() {
  const { lines } = analyzeSelection();
  if (lines.length !== 1) return false;

  const lineInfo = lines[0];
  const idx = lineInfo.idx;
  const obj = state.objects[idx];
  if (!obj) return false;

  let ls;
  if (obj.type === 'polyline' && lineInfo.segIdx !== null) {
    const v = obj.vertices, si = lineInfo.segIdx, n = v.length;
    const p1 = v[si], p2 = v[(si + 1) % n];
    if ((obj.bulges?.[si] || 0) !== 0) { showToast("Vodorovnost obloukového segmentu není podporována"); return true; }
    ls = { seg: { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }, setP1: (x, y) => { p1.x = x; p1.y = y; }, setP2: (x, y) => { p2.x = x; p2.y = y; }, segIdx: si };
  } else {
    ls = getLineSegment(obj, (obj.x1 + obj.x2) / 2, (obj.y1 + obj.y2) / 2);
  }
  if (!ls) return false;

  const len = Math.hypot(ls.seg.x2 - ls.seg.x1, ls.seg.y2 - ls.seg.y1);
  if (len < 1e-9) { showToast("Segment má nulovou délku"); return true; }

  const sign = (ls.seg.x2 - ls.seg.x1) >= 0 ? 1 : -1;

  showEndpointChoiceDialog("Vodorovnost – výběr kotvy", ls.seg,
    "Kotva P1 (fixní)", "Kotva P2 (fixní)",
    (end) => {
      pushUndo();
      let movedEnd;
      if (end === 1) {
        ls.setP2(ls.seg.x1 + sign * len, ls.seg.y1);
        movedEnd = 'p2';
      } else {
        ls.setP1(ls.seg.x2 - sign * len, ls.seg.y2);
        movedEnd = 'p1';
      }
      setConstraint(obj, ls.segIdx, 'horizontal');
      propagateConstraints(obj, ls.segIdx, movedEnd);
      calculateAllIntersections();
      renderAll();
      showToast("Vyrovnáno vodorovně ✓");
    }
  );
  return true;
}
