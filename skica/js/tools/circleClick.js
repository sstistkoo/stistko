import { state, showToast } from '../state.js';
import { addObject } from '../objects.js';
import { renderAll } from '../render.js';
import { resetHint, setHint } from '../ui.js';

/**
 * @param {number} wx
 * @param {number} wy
 */
export function handleCircleClick(wx, wy) {
  if (!state.drawing) {
    state.drawing = true;
    state.tempPoints = [{ x: wx, y: wy }];
    setHint("Klepněte pro poloměr");
    renderAll();
  } else {
    const cp = state.tempPoints[0];
    const r = Math.hypot(wx - cp.x, wy - cp.y);
    if (r < 1e-9) {
      showToast("Kružnice má nulový poloměr");
      state.drawing = false;
      state.tempPoints = [];
      resetHint();
      return;
    }
    addObject({
      type: "circle",
      cx: cp.x,
      cy: cp.y,
      r,
      name: `Kružnice ${state.nextId}`,
    });
    state.drawing = false;
    state.tempPoints = [];
    resetHint();
  }
}
