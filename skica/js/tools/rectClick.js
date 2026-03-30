import { state, showToast } from '../state.js';
import { addObject } from '../objects.js';
import { startDrawing, finishDrawing } from './helpers.js';
import { showPostDrawRectDialog } from '../dialogs/postDrawDialog.js';

/**
 * @param {number} wx
 * @param {number} wy
 */
export function handleRectClick(wx, wy) {
  if (!state.drawing) {
    startDrawing(wx, wy, "Klepněte na protější roh");
  } else {
    const rp = state.tempPoints[0];
    if (Math.abs(wx - rp.x) < 1e-9 && Math.abs(wy - rp.y) < 1e-9) {
      showToast("Obdélník má nulovou velikost");
      finishDrawing();
      return;
    }
    const rectObj = addObject({
      type: "rect",
      x1: rp.x,
      y1: rp.y,
      x2: wx,
      y2: wy,
      name: `Obdélník ${state.nextId}`,
    });
    finishDrawing();
    if (rectObj) showPostDrawRectDialog(rectObj);
  }
}
