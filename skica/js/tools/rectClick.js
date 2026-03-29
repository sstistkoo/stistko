import { state, showToast } from '../state.js';
import { addObject } from '../objects.js';
import { renderAll } from '../render.js';
import { resetHint, setHint } from '../ui.js';

/**
 * @param {number} wx
 * @param {number} wy
 */
export function handleRectClick(wx, wy) {
  if (!state.drawing) {
    state.drawing = true;
    state.tempPoints = [{ x: wx, y: wy }];
    setHint("Klepněte na protější roh");
    renderAll();
  } else {
    const rp = state.tempPoints[0];
    if (Math.abs(wx - rp.x) < 1e-9 && Math.abs(wy - rp.y) < 1e-9) {
      showToast("Obdélník má nulovou velikost");
      state.drawing = false;
      state.tempPoints = [];
      resetHint();
      return;
    }
    addObject({
      type: "rect",
      x1: rp.x,
      y1: rp.y,
      x2: wx,
      y2: wy,
      name: `Obdélník ${state.nextId}`,
    });
    state.drawing = false;
    state.tempPoints = [];
    resetHint();
  }
}
