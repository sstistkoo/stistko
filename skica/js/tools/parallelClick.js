// ╔══════════════════════════════════════════════════════════════╗
// ║  Rovnoběžka – click logika                                 ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, pushUndo, showToast } from '../state.js';
import { renderAll } from '../render.js';
import { addObject } from '../objects.js';
import { setHint, resetHint } from '../ui.js';
import { findObjectAt, calculateAllIntersections } from '../geometry.js';
import { getLineSegment, setConstraint } from './helpers.js';

export function handleParallelClick(wx, wy) {
  if (!state.drawing) {
    // 1. klik: vyber úsečku nebo segment kontury
    const idx = findObjectAt(wx, wy);
    if (idx === null) { showToast("Klepněte na úsečku"); return; }
    const obj = state.objects[idx];
    const ls = getLineSegment(obj, wx, wy);
    if (!ls) {
      showToast("Rovnoběžka funguje pouze pro úsečky a rovné segmenty kontur");
      return;
    }
    state.drawing = true;
    state._parallelRefIdx = idx;
    state._parallelRefSeg = ls;
    state._parallelClickX = wx;
    state._parallelClickY = wy;
    state.selected = idx;
    state.selectedSegment = ls.segIdx;  // zvýrazní jen kliknutý segment kontury
    renderAll();
    setHint("Klepněte na úsečku → otočí první do rovnoběžnosti, nebo na bod → nová rovnoběžka");
  } else {
    const refSeg = state._parallelRefSeg;
    if (!refSeg) { state.drawing = false; resetHint(); return; }

    // Podívat se, zda 2. klik je na jinou úsečku/segment
    const idx2 = findObjectAt(wx, wy);
    if (idx2 !== null) {
      const obj2 = state.objects[idx2];
      const ls2 = getLineSegment(obj2, wx, wy);
      if (ls2 && !(idx2 === state._parallelRefIdx && ls2.segIdx === refSeg.segIdx)) {
        // Režim: otočit první segment do rovnoběžnosti s druhým
        const refAngle = Math.atan2(ls2.seg.y2 - ls2.seg.y1, ls2.seg.x2 - ls2.seg.x1);
        const curAngle = Math.atan2(refSeg.seg.y2 - refSeg.seg.y1, refSeg.seg.x2 - refSeg.seg.x1);
        // Vybrat bližší z refAngle a refAngle+π (obojí je rovnoběžné)
        let targetAngle = refAngle;
        const diff1 = Math.abs(Math.atan2(Math.sin(refAngle - curAngle), Math.cos(refAngle - curAngle)));
        const alt = refAngle + Math.PI;
        const diff2 = Math.abs(Math.atan2(Math.sin(alt - curAngle), Math.cos(alt - curAngle)));
        if (diff2 < diff1) targetAngle = alt;

        const len = Math.hypot(refSeg.seg.x2 - refSeg.seg.x1, refSeg.seg.y2 - refSeg.seg.y1);
        // Kotevní bod = konec bližší k prvnímu kliknutí (zachová propojení kontury)
        const cx = state._parallelClickX, cy = state._parallelClickY;
        const d1 = Math.hypot(cx - refSeg.seg.x1, cy - refSeg.seg.y1);
        const d2 = Math.hypot(cx - refSeg.seg.x2, cy - refSeg.seg.y2);

        pushUndo();
        if (d1 <= d2) {
          // P1 je kotva
          refSeg.setP2(refSeg.seg.x1 + len * Math.cos(targetAngle), refSeg.seg.y1 + len * Math.sin(targetAngle));
        } else {
          // P2 je kotva
          refSeg.setP1(refSeg.seg.x2 - len * Math.cos(targetAngle), refSeg.seg.y2 - len * Math.sin(targetAngle));
        }
        // Uložit vazbu na objekt
        setConstraint(state.objects[state._parallelRefIdx], refSeg.segIdx, 'parallel');

        showToast("Otočeno do rovnoběžnosti ✓");
        state.drawing = false;
        state._parallelRefIdx = null;
        state._parallelRefSeg = null;
        state.selectedSegment = null;
        calculateAllIntersections();
        renderAll();
        resetHint();
        return;
      }
    }

    // Režim: nová rovnoběžka procházející bodem (původní chování)
    const dx = refSeg.seg.x2 - refSeg.seg.x1;
    const dy = refSeg.seg.y2 - refSeg.seg.y1;
    pushUndo();
    addObject({
      type: 'line',
      x1: wx - dx / 2, y1: wy - dy / 2,
      x2: wx + dx / 2, y2: wy + dy / 2,
      name: `Rovnoběžka ${state.nextId}`,
    });
    showToast("Rovnoběžka vytvořena ✓");
    state.drawing = false;
    state._parallelRefIdx = null;
    state._parallelRefSeg = null;
    state.selectedSegment = null;
    calculateAllIntersections();
    renderAll();
    resetHint();
  }
}
