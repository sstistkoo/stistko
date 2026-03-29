// ╔══════════════════════════════════════════════════════════════╗
// ║  Zaoblení (Fillet) – click logika                          ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, pushUndo, showToast } from '../state.js';
import { renderAll } from '../render.js';
import { addObject } from '../objects.js';
import { setHint, resetHint } from '../ui.js';
import { drawCanvas, screenToWorld, snapPt } from '../canvas.js';
import { findObjectAt, calculateAllIntersections, filletTwoLines } from '../geometry.js';
import { showFilletDialog } from '../dialogs.js';
import { getLineSegment } from './helpers.js';

/** Klik na první úsečku → dialog → klik na druhou → zaoblení. */
export function handleFilletClick(wx, wy) {
  const idx = findObjectAt(wx, wy);
  if (idx === null) { showToast("Klepněte na první úsečku pro zaoblení"); return; }
  const obj1 = state.objects[idx];
  const ls1 = getLineSegment(obj1, wx, wy);
  if (!ls1) {
    showToast("Zaoblení funguje pouze pro úsečky a rovné segmenty kontur");
    return;
  }

  state.selected = idx;
  renderAll();
  setHint("Zadejte poloměr zaoblení");

  showFilletDialog((radius) => {
    setHint("Klepněte na druhou úsečku");
    showToast("Klepněte na druhou úsečku");

    function onSecondClick(e) {
      const rect = drawCanvas.getBoundingClientRect();
      const sx = (e.clientX || e.changedTouches?.[0]?.clientX) - rect.left;
      const sy = (e.clientY || e.changedTouches?.[0]?.clientY) - rect.top;
      let [wx2, wy2] = screenToWorld(sx, sy);
      if (state.snapToPoints) [wx2, wy2] = snapPt(wx2, wy2);

      const idx2 = findObjectAt(wx2, wy2);
      if (idx2 === null) { showToast("Klepněte na úsečku"); return; }
      if (idx2 === idx && ls1.segIdx === null) { showToast("Klepněte na jinou úsečku"); return; }
      const obj2 = state.objects[idx2];
      const ls2 = getLineSegment(obj2, wx2, wy2);
      if (!ls2) { showToast("Zaoblení funguje pouze pro úsečky a rovné segmenty kontur"); return; }
      // Same polyline, same segment?
      if (idx2 === idx && ls1.segIdx !== null && ls2.segIdx === ls1.segIdx) { showToast("Klepněte na jiný segment"); return; }

      drawCanvas.removeEventListener("click", onSecondClick);
      drawCanvas.removeEventListener("touchend", onSecondTouch);

      // Create proxy objects for filletTwoLines
      const proxy1 = { x1: ls1.seg.x1, y1: ls1.seg.y1, x2: ls1.seg.x2, y2: ls1.seg.y2 };
      const proxy2 = { x1: ls2.seg.x1, y1: ls2.seg.y1, x2: ls2.seg.x2, y2: ls2.seg.y2 };

      pushUndo();
      const result = filletTwoLines(proxy1, proxy2, radius);
      if (!result.ok) { showToast(result.msg); return; }

      // Write back trimmed endpoints
      ls1.setP1(proxy1.x1, proxy1.y1);
      ls1.setP2(proxy1.x2, proxy1.y2);
      ls2.setP1(proxy2.x1, proxy2.y1);
      ls2.setP2(proxy2.x2, proxy2.y2);

      result.arc.name = `Zaoblení R${radius}`;
      addObject(result.arc);
      calculateAllIntersections();
      renderAll();
      resetHint();
      showToast(`Zaoblení R${radius} vytvořeno ✓`);
    }

    function onSecondTouch(e) {
      if (e.changedTouches.length === 1) { e.preventDefault(); onSecondClick(e); }
    }

    drawCanvas.addEventListener("click", onSecondClick);
    drawCanvas.addEventListener("touchend", onSecondTouch);
  });
}
