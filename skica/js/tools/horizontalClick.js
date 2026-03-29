// ╔══════════════════════════════════════════════════════════════╗
// ║  Vodorovnost – click logika                                ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, pushUndo, showToast } from '../state.js';
import { renderAll } from '../render.js';
import { findObjectAt, calculateAllIntersections } from '../geometry.js';
import { getLineSegment, setConstraint } from './helpers.js';

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
  // Zjistit, ke kterému konci je klik blíž → ten bude kotva
  const d1 = Math.hypot(wx - ls.seg.x1, wy - ls.seg.y1);
  const d2 = Math.hypot(wx - ls.seg.x2, wy - ls.seg.y2);
  // Zachovat původní směr (dx kladné/záporné)
  const sign = (ls.seg.x2 - ls.seg.x1) >= 0 ? 1 : -1;

  pushUndo();
  if (d1 <= d2) {
    // P1 je kotva, P2 se posune
    ls.setP2(ls.seg.x1 + sign * len, ls.seg.y1);
  } else {
    // P2 je kotva, P1 se posune
    ls.setP1(ls.seg.x2 - sign * len, ls.seg.y2);
  }

  // Uložit vazbu na objekt
  setConstraint(obj, ls.segIdx, 'horizontal');

  calculateAllIntersections();
  renderAll();
  showToast("Vyrovnáno vodorovně ✓");
}
