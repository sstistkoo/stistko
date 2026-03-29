// ╔══════════════════════════════════════════════════════════════╗
// ║  Kóta – click logika                                       ║
// ╚══════════════════════════════════════════════════════════════╝

import { COLORS } from '../constants.js';
import { state, pushUndo, showToast } from '../state.js';
import { renderAll } from '../render.js';
import { addObject } from '../objects.js';
import { setHint, resetHint } from '../ui.js';
import { findObjectAt, calculateAllIntersections } from '../geometry.js';
import { addDimensionForObject } from '../dialogs.js';

export function handleDimensionClick(wx, wy) {
  if (!state.drawing) {
    // Snap k bodu (endpoint/midpoint) → kóta souřadnic bodu
    if (state.mouse.snapType === 'point') {
      pushUndo();
      addDimensionForObject({ type: 'point', x: wx, y: wy });
      calculateAllIntersections();
      renderAll();
      return;
    }
    // Režim B: klik na existující objekt → přidá kótu
    const idx = findObjectAt(wx, wy);
    if (idx !== null) {
      const obj = state.objects[idx];
      pushUndo();
      addDimensionForObject(obj);
      calculateAllIntersections();
      renderAll();
      return;
    }
    // Režim A: 2 body – 1. klik
    state.drawing = true;
    state.tempPoints = [{ x: wx, y: wy }];
    setHint("Klepněte na druhý bod pro kótu");
  } else {
    // 2. klik – dokončit kótu mezi body
    const p1 = state.tempPoints[0];
    const d = Math.hypot(wx - p1.x, wy - p1.y);
    if (d < 1e-6) { showToast("Body jsou totožné"); return; }
    pushUndo();
    addObject({
      type: 'line',
      x1: p1.x, y1: p1.y,
      x2: wx, y2: wy,
      name: `Kóta ${d.toFixed(2)}mm`,
      isDimension: true,
      color: COLORS.textSecondary,
      layer: 2,
    });
    showToast(`Kóta ${d.toFixed(2)}mm přidána ✓`);
    state.drawing = false;
    state.tempPoints = [];
    calculateAllIntersections();
    renderAll();
    resetHint();
  }
}
