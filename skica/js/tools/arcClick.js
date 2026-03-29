import { state, showToast } from '../state.js';
import { addObject } from '../objects.js';
import { renderAll } from '../render.js';
import { resetHint, setHint } from '../ui.js';

/**
 * @param {number} wx
 * @param {number} wy
 */
export function handleArcClick(wx, wy) {
  if (!state.drawing) {
    state.drawing = true;
    state.tempPoints = [{ x: wx, y: wy }];
    setHint("Klepněte na počáteční bod oblouku");
    renderAll();
  } else if (state.tempPoints.length === 1) {
    state.tempPoints.push({ x: wx, y: wy });
    setHint("Klepněte na koncový bod oblouku");
    renderAll();
  } else {
    const ctr = state.tempPoints[0],
      p1 = state.tempPoints[1];
    const r = Math.hypot(p1.x - ctr.x, p1.y - ctr.y);
    if (r < 1e-9) {
      showToast("Oblouk má nulový poloměr");
      state.drawing = false;
      state.tempPoints = [];
      resetHint();
      return;
    }
    const startAngle = Math.atan2(p1.y - ctr.y, p1.x - ctr.x);
    const endAngle = Math.atan2(wy - ctr.y, wx - ctr.x);
    addObject({
      type: "arc",
      cx: ctr.x,
      cy: ctr.y,
      r,
      startAngle,
      endAngle,
      name: `Oblouk ${state.nextId}`,
    });
    state.drawing = false;
    state.tempPoints = [];
    resetHint();
  }
}
