import { state, pushUndo } from '../state.js';
import { findObjectAt, calculateAllIntersections } from '../geometry.js';
import { updateProperties, resetHint, setHint } from '../ui.js';
import { moveObject } from '../objects.js';
import { renderAll } from '../render.js';

/**
 * @param {number} wx
 * @param {number} wy
 */
export function handleMoveClick(wx, wy) {
  if (!state.dragging) {
    // Multi-select přesun
    if (state.multiSelected.size > 0) {
      pushUndo();
      state.dragging = true;
      state.dragObjIdx = -1; // signál pro multi-drag
      state.dragStartWorld = { x: wx, y: wy };
      state._multiDragSnapshots = [...state.multiSelected].map(i => ({
        idx: i,
        snapshot: JSON.stringify(state.objects[i]),
      }));
      setHint("Klepněte pro umístění");
      return;
    }
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
    if (state.dragObjIdx === -1 && state._multiDragSnapshots) {
      // Finalizace multi-drag
      state.dragging = false;
      state.dragObjIdx = null;
      state._multiDragSnapshots = null;
      updateProperties();
      calculateAllIntersections();
      resetHint();
      return;
    }
    state.dragging = false;
    state.dragObjIdx = null;
    updateProperties();
    calculateAllIntersections();
    resetHint();
  }
}
