// ╔══════════════════════════════════════════════════════════════╗
// ║  Tečna – click logika                                      ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, pushUndo, showToast } from '../state.js';
import { renderAll } from '../render.js';
import { addObject } from '../objects.js';
import { setHint, resetHint } from '../ui.js';
import { findObjectAt, calculateAllIntersections, tangentsFromPointToCircle, tangentsTwoCircles, circlePositionsTangentToLine, circlePositionsTangentToTwoLines } from '../geometry.js';
import { showTangentChoiceDialog, showTangentPositionDialog } from '../dialogs.js';

export function handleTangentClick(wx, wy) {
  if (!state.drawing) {
    // První klik: bod nebo kružnice?
    const idx = findObjectAt(wx, wy);
    if (idx !== null) {
      const obj = state.objects[idx];
      if (obj.type === 'circle' || obj.type === 'arc') {
        // Režim B: první kružnice
        state.drawing = true;
        state._tangentMode = 'circle-first';
        state._tangentFirstCircle = idx;
        setHint("Klepněte na kružnici pro tečny, nebo úsečku pro tečné napojení");
        return;
      }
    }
    // Režim A: bod
    state.drawing = true;
    state._tangentMode = 'point-circle';
    state.tempPoints = [{ x: wx, y: wy }];
    setHint("Klepněte na kružnici/oblouk pro tečnu z bodu");
  } else {
    if (state._tangentMode === 'point-circle') {
      // Druhý klik: musí být na kružnici/oblouk
      const idx = findObjectAt(wx, wy);
      if (idx === null) { showToast("Klepněte na kružnici nebo oblouk"); return; }
      const obj = state.objects[idx];
      if (obj.type !== 'circle' && obj.type !== 'arc') {
        showToast("Vyberte kružnici nebo oblouk");
        return;
      }
      const p = state.tempPoints[0];
      const tangents = tangentsFromPointToCircle(p.x, p.y, obj.cx, obj.cy, obj.r);
      if (tangents.length === 0) {
        showToast("Tečna neexistuje (bod uvnitř kružnice)");
      } else {
        showTangentChoiceDialog(tangents, (indices) => {
          for (const i of indices) {
            const t = tangents[i];
            addObject({
              type: 'line',
              x1: t.x1, y1: t.y1, x2: t.x2, y2: t.y2,
              name: `Tečna ${state.nextId}`,
            });
          }
          showToast(`Vytvořeno ${indices.length} tečn${indices.length === 1 ? 'a' : indices.length < 5 ? 'y' : ''}`);
        });
      }
    } else if (state._tangentMode === 'circle-first') {
      const idx = findObjectAt(wx, wy);
      if (idx === null) { showToast("Klepněte na kružnici, oblouk nebo úsečku"); return; }
      const obj = state.objects[idx];

      if (obj.type === 'circle' || obj.type === 'arc') {
        // Režim B1: kružnice → kružnice (tečné úsečky)
        if (idx === state._tangentFirstCircle) {
          showToast("Vyberte jinou kružnici nebo úsečku");
          return;
        }
        const c1 = state.objects[state._tangentFirstCircle];
        const tangents = tangentsTwoCircles(c1.cx, c1.cy, c1.r, obj.cx, obj.cy, obj.r);
        if (tangents.length === 0) {
          showToast("Tečny neexistují");
        } else {
          showTangentChoiceDialog(tangents, (indices) => {
            for (const i of indices) {
              const t = tangents[i];
              addObject({
                type: 'line',
                x1: t.x1, y1: t.y1, x2: t.x2, y2: t.y2,
                name: `Tečna ${state.nextId}`,
              });
            }
            showToast(`Vytvořeno ${indices.length} tečen`);
          });
        }
      } else if (obj.type === 'line' || obj.type === 'constr') {
        // Režim B2: kružnice → úsečka (přesun kružnice tečně k úsečce)
        const circIdx = state._tangentFirstCircle;
        const circ = state.objects[circIdx];
        const lineIdx = idx;
        const positions = circlePositionsTangentToLine(circ.cx, circ.cy, circ.r, obj.x1, obj.y1, obj.x2, obj.y2);
        if (positions.length === 0) {
          showToast("Tečnou pozici nelze vypočítat");
        } else {
          showTangentPositionDialog(positions, circ, (chosenIdx) => {
            pushUndo();
            circ.cx = positions[chosenIdx].cx;
            circ.cy = positions[chosenIdx].cy;
            calculateAllIntersections();
            renderAll();
            showToast("Kružnice přesunuta tečně k úsečce");
            // Nabídnout druhou úsečku
            state.drawing = true;
            state._tangentMode = 'circle-line-2';
            state._tangentFirstCircle = circIdx;
            state._tangentFirstLine = lineIdx;
            setHint("Klepněte na druhou úsečku pro tečnost s oběma, nebo Esc/zrušit");
          });
          return; // dialog řídí další stav
        }
      } else {
        showToast("Vyberte kružnici, oblouk nebo úsečku");
        return;
      }
    } else if (state._tangentMode === 'circle-line-2') {
      // Třetí klik: druhá úsečka pro tečnost se dvěma úsečkami
      const idx = findObjectAt(wx, wy);
      if (idx === null) { showToast("Klepněte na úsečku"); return; }
      const obj = state.objects[idx];
      if (obj.type !== 'line' && obj.type !== 'constr') {
        showToast("Vyberte úsečku");
        return;
      }
      if (idx === state._tangentFirstLine) {
        showToast("Vyberte jinou úsečku");
        return;
      }
      const circ = state.objects[state._tangentFirstCircle];
      const line1 = state.objects[state._tangentFirstLine];
      const positions = circlePositionsTangentToTwoLines(circ.r, line1, obj);
      if (positions.length === 0) {
        showToast("Tečnou pozici ke dvěma úsečkám nelze najít");
      } else {
        showTangentPositionDialog(positions, circ, (chosenIdx) => {
          pushUndo();
          circ.cx = positions[chosenIdx].cx;
          circ.cy = positions[chosenIdx].cy;
          calculateAllIntersections();
          renderAll();
          showToast("Kružnice přesunuta tečně ke dvěma úsečkám");
        });
      }
    }
    // Reset stavu
    state.drawing = false;
    state.tempPoints = [];
    state._tangentMode = null;
    state._tangentFirstCircle = null;
    state._tangentFirstLine = null;
    resetHint();
  }
}
