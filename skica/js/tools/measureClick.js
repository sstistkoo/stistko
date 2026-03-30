import { COLORS, SNAP_POINT_THRESHOLD } from '../constants.js';
import { state, showToast } from '../state.js';
import { addObject } from '../objects.js';
import { renderAll } from '../render.js';
import { resetHint, setHint } from '../ui.js';
import { findObjectAt } from '../geometry.js';
import { showMeasureResult, showMeasureObjectInfo } from '../dialogs.js';

/**
 * Měření vzdálenosti mezi dvěma rovnoběžnými úsečkami.
 * Vrací null pokud nejsou rovnoběžné.
 */
function measureParallelLines(obj1, obj2) {
  const dx1 = obj1.x2 - obj1.x1, dy1 = obj1.y2 - obj1.y1;
  const dx2 = obj2.x2 - obj2.x1, dy2 = obj2.y2 - obj2.y1;
  const len1 = Math.hypot(dx1, dy1);
  const len2 = Math.hypot(dx2, dy2);
  if (len1 < 1e-9 || len2 < 1e-9) return null;
  // Kontrola rovnoběžnosti (cross product ≈ 0)
  const cross = Math.abs(dx1 * dy2 - dy1 * dx2) / (len1 * len2);
  if (cross > 0.01) return null; // nejsou rovnoběžné (tolerance ~0.6°)
  // Vzdálenost bodu (x1,y1) druhé úsečky od přímky první úsečky
  const dist = Math.abs(dx1 * (obj1.y1 - obj2.y1) - dy1 * (obj1.x1 - obj2.x1)) / len1;
  return dist;
}

/**
 * @param {number} wx
 * @param {number} wy
 */
export function handleMeasureClick(wx, wy) {
  // Multi-select: měření vzdálenosti mezi dvěma rovnoběžnými úsečkami
  if (!state.drawing && state.multiSelected.size === 2) {
    const indices = [...state.multiSelected];
    const obj1 = state.objects[indices[0]];
    const obj2 = state.objects[indices[1]];
    if (obj1 && obj2 &&
        (obj1.type === 'line' || obj1.type === 'constr') &&
        (obj2.type === 'line' || obj2.type === 'constr')) {
      const dist = measureParallelLines(obj1, obj2);
      if (dist !== null) {
        // Najít nejbližší body pro kótu
        const mx1 = (obj1.x1 + obj1.x2) / 2, my1 = (obj1.y1 + obj1.y2) / 2;
        const mx2 = (obj2.x1 + obj2.x2) / 2, my2 = (obj2.y1 + obj2.y2) / 2;
        const dx = obj1.x2 - obj1.x1, dy = obj1.y2 - obj1.y1;
        const len = Math.hypot(dx, dy);
        // Kolmý směr
        const nx = -dy / len, ny = dx / len;
        // Projekce bodu obj2 na přímku obj1 aby kóta byla kolmá
        const t = ((mx2 - mx1) * nx + (my2 - my1) * ny);
        const p1 = { x: mx1, y: my1 };
        const p2 = { x: mx1 + nx * t, y: my1 + ny * t };
        addObject({
          type: "line",
          x1: p1.x, y1: p1.y,
          x2: p2.x, y2: p2.y,
          name: `Kóta ${dist.toFixed(3)}mm`,
          isDimension: true,
          dimSrcX1: p1.x, dimSrcY1: p1.y,
          dimSrcX2: p2.x, dimSrcY2: p2.y,
          color: COLORS.textSecondary,
        });
        const angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
        showMeasureResult(p1, p2, dist, angle);
        state.multiSelected.clear();
        state.selected = null;
        renderAll();
        return;
      } else {
        showToast("Úsečky nejsou rovnoběžné");
        return;
      }
    }
  }

  if (!state.drawing) {
    const snapThreshold = SNAP_POINT_THRESHOLD / state.zoom;

    // 1) Průsečíky mají nejvyšší prioritu – měření od průsečíku
    let isOnIntersection = false;
    for (const pt of state.intersections) {
      if (Math.hypot(pt.x - wx, pt.y - wy) < snapThreshold) {
        isOnIntersection = true;
        break;
      }
    }

    // 2) Klik na tělo objektu → info dialog (pokud to není průsečík)
    if (!isOnIntersection) {
      const bodyIdx = findObjectAt(wx, wy);
      if (bodyIdx !== null) {
        showMeasureObjectInfo(state.objects[bodyIdx], wx, wy, bodyIdx);
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
