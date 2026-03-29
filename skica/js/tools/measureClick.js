import { COLORS, SNAP_POINT_THRESHOLD } from '../constants.js';
import { state } from '../state.js';
import { addObject } from '../objects.js';
import { renderAll } from '../render.js';
import { resetHint, setHint } from '../ui.js';
import { findObjectAt } from '../geometry.js';
import { getObjectSnapPoints } from '../utils.js';
import { showMeasureResult, showMeasureObjectInfo } from '../dialogs.js';

/**
 * @param {number} wx
 * @param {number} wy
 */
export function handleMeasureClick(wx, wy) {
  if (!state.drawing) {
    const snapThreshold = SNAP_POINT_THRESHOLD / state.zoom;
    let isOnSnapPoint = false;

    // Kontrola průsečíků
    for (const pt of state.intersections) {
      if (Math.hypot(pt.x - wx, pt.y - wy) < snapThreshold) {
        isOnSnapPoint = true;
        break;
      }
    }
    // Kontrola snap bodů objektů (konce úseček, středy kružnic, ...)
    if (!isOnSnapPoint) {
      for (const obj of state.objects) {
        for (const pt of getObjectSnapPoints(obj)) {
          if (Math.hypot(pt.x - wx, pt.y - wy) < snapThreshold) {
            isOnSnapPoint = true;
            break;
          }
        }
        if (isOnSnapPoint) break;
      }
    }

    if (!isOnSnapPoint) {
      // Klik na tělo objektu → info dialog
      const idx = findObjectAt(wx, wy);
      if (idx !== null) {
        showMeasureObjectInfo(state.objects[idx], wx, wy, idx);
        return;
      }
    }
    // Přidá dočasný coord label na 1. bod měření
    addObject({
      type: "point",
      x: wx, y: wy,
      name: `Měření bod 1`,
      isDimension: true,
      isCoordLabel: true,
      isMeasureTemp: true,
      color: COLORS.textSecondary,
    });
    state.drawing = true;
    state.tempPoints = [{ x: wx, y: wy }];
    setHint("Klepněte na 2. bod pro měření");
    renderAll();
  } else {
    const tp = state.tempPoints[0];
    // Odstraní dočasný coord label z 1. bodu
    const tempIdx = state.objects.findIndex(o => o.isMeasureTemp);
    if (tempIdx !== -1) state.objects.splice(tempIdx, 1);

    const d = Math.hypot(wx - tp.x, wy - tp.y);
    const angle = (Math.atan2(wy - tp.y, wx - tp.x) * 180) / Math.PI;
    // Automaticky přidá kótu na výkres
    const p1 = tp;
    const p2 = { x: wx, y: wy };
    // Odsazení kóty od měřené čáry
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    const offset = Math.max(8, len * 0.15);
    const nx = len > 0 ? (-dy / len) * offset : offset;
    const ny = len > 0 ? (dx / len) * offset : 0;
    addObject({
      type: "line",
      x1: p1.x + nx, y1: p1.y + ny,
      x2: p2.x + nx, y2: p2.y + ny,
      name: `Kóta ${d.toFixed(2)}mm`,
      isDimension: true,
      dimSrcX1: p1.x, dimSrcY1: p1.y,
      dimSrcX2: p2.x, dimSrcY2: p2.y,
      color: COLORS.textSecondary,
    });
    showMeasureResult(tp, p2, d, angle);
    state.drawing = false;
    state.tempPoints = [];
    resetHint();
  }
}
