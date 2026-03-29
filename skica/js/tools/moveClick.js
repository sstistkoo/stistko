import { state, pushUndo } from '../state.js';
import { findObjectAt, calculateAllIntersections } from '../geometry.js';
import { updateProperties, resetHint, setHint } from '../ui.js';

/**
 * @param {number} wx
 * @param {number} wy
 */
export function handleMoveClick(wx, wy) {
  if (!state.dragging) {
    const idx = findObjectAt(wx, wy);
    if (idx !== null) {
      pushUndo();
      state.dragging = true;
      state.dragObjIdx = idx;
      state.dragStartWorld = { x: wx, y: wy };
      state.dragObjSnapshot = JSON.stringify(state.objects[idx]);
      state.selected = idx;
      updateProperties();
      setHint("Klepněte pro umístění");
    }
  } else {
    state.dragging = false;
    state.dragObjIdx = null;
    updateProperties();
    calculateAllIntersections();
    resetHint();
  }
}
