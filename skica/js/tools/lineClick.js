import { state, showToast } from '../state.js';
import { addObject } from '../objects.js';
import { renderAll } from '../render.js';
import { resetHint, setHint } from '../ui.js';

/**
 * @param {number} wx
 * @param {number} wy
 */
export function handleLineClick(wx, wy) {
  if (!state.drawing) {
    state.drawing = true;
    state.tempPoints = [{ x: wx, y: wy }];
    setHint("Klepněte na koncový bod");
    renderAll();
  } else {
    const tp = state.tempPoints[0];
    if (Math.hypot(wx - tp.x, wy - tp.y) < 1e-9) {
      showToast("Úsečka má nulovou délku");
      state.drawing = false;
      state.tempPoints = [];
      resetHint();
      return;
    }
    addObject({
      type: state.tool === "constr" ? "constr" : "line",
      x1: tp.x,
      y1: tp.y,
      x2: wx,
      y2: wy,
      name: `${state.tool === "constr" ? "Konstr" : "Úsečka"} ${state.nextId}`,
      dashed: state.tool === "constr",
    });
    state.drawing = false;
    state.tempPoints = [];
    resetHint();
  }
}
