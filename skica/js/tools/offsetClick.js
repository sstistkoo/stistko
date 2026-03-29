// ╔══════════════════════════════════════════════════════════════╗
// ║  Offset – click logika                                     ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, showToast } from '../state.js';
import { renderAll } from '../render.js';
import { addObject } from '../objects.js';
import { setHint, resetHint } from '../ui.js';
import { drawCanvas, screenToWorld } from '../canvas.js';
import { findObjectAt, offsetObject } from '../geometry.js';
import { showOffsetDialog } from '../dialogs.js';

export function handleOffsetClick(wx, wy) {
  const idx = findObjectAt(wx, wy);
  if (idx === null) { showToast("Klepněte na objekt pro offset"); return; }
  const obj = state.objects[idx];
  if (obj.type === 'point') { showToast("Offset nelze použít na bod"); return; }

  showOffsetDialog(obj, (dist) => {
    // Pro circle/arc: klikni na stranu (vně/uvnitř)
    showToast("Klepněte na stranu pro směr offsetu");
    setHint("Klepněte na stranu objektu pro směr offsetu");

    function cleanupSideListeners() {
      drawCanvas.removeEventListener("click", onSideClick);
      drawCanvas.removeEventListener("touchend", onSideTouch);
    }

    function onSideClick(e) {
      const rect = drawCanvas.getBoundingClientRect();
      const sx = (e.clientX || e.changedTouches?.[0]?.clientX) - rect.left;
      const sy = (e.clientY || e.changedTouches?.[0]?.clientY) - rect.top;
      const [cwx, cwy] = screenToWorld(sx, sy);
      cleanupSideListeners();

      // Determine side
      let side = 1;
      if (obj.type === 'circle' || obj.type === 'arc') {
        const dToCenter = Math.hypot(cwx - obj.cx, cwy - obj.cy);
        side = dToCenter > obj.r ? 1 : -1;
      } else if (obj.type === 'line' || obj.type === 'constr') {
        const dx = obj.x2 - obj.x1, dy = obj.y2 - obj.y1;
        const cross = dx * (cwy - obj.y1) - dy * (cwx - obj.x1);
        side = cross > 0 ? 1 : -1;
      } else if (obj.type === 'rect') {
        const cx = (obj.x1 + obj.x2) / 2, cy = (obj.y1 + obj.y2) / 2;
        const dToCenter = Math.max(Math.abs(cwx - cx), Math.abs(cwy - cy));
        const halfW = Math.abs(obj.x2 - obj.x1) / 2, halfH = Math.abs(obj.y2 - obj.y1) / 2;
        side = dToCenter > Math.max(halfW, halfH) ? 1 : -1;
      } else if (obj.type === 'polyline' && obj.vertices.length >= 2) {
        const p1 = obj.vertices[0], p2 = obj.vertices[1];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const cross = dx * (cwy - p1.y) - dy * (cwx - p1.x);
        side = cross > 0 ? 1 : -1;
      }

      const result = offsetObject(obj, dist, side);
      if (result) {
        addObject(result);
        showToast(`Offset ${dist}mm vytvořen`);
      } else {
        showToast("Offset nelze vytvořit (příliš malý poloměr?)");
      }
      resetHint();
    }

    function onSideTouch(e) {
      if (e.changedTouches.length === 1) {
        e.preventDefault();
        onSideClick(e);
      }
    }

    drawCanvas.addEventListener("click", onSideClick);
    drawCanvas.addEventListener("touchend", onSideTouch);
    state._toolCleanup = cleanupSideListeners;
  });
}
