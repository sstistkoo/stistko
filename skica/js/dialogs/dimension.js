// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Dialogy / Kóty (addDimensionForObject)           ║
// ╚══════════════════════════════════════════════════════════════╝

import { COLORS } from '../constants.js';
import { state, showToast, axisLabels } from '../state.js';
import { addObject } from '../objects.js';
import { bulgeToArc } from '../utils.js';

// ── Přidání kót k objektu ──
export function addDimensionForObject(obj) {
  switch (obj.type) {
    case "point": {
      // Kóta bodu: odkazová čára se souřadnicemi (leader)
      addObject({
        type: "point",
        x: obj.x,
        y: obj.y,
        name: `Kóta [${obj.x.toFixed(2)}, ${obj.y.toFixed(2)}]`,
        isDimension: true,
        isCoordLabel: true,
        color: COLORS.textSecondary,
      });
      showToast(`Kóta ${axisLabels()[0]}${obj.x.toFixed(2)} ${axisLabels()[1]}${obj.y.toFixed(2)} přidána`);
      break;
    }
    case "line":
    case "constr": {
      const len = Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1);
      // Offset kolmo k úsečce (ve world coords)
      const dimOffset = 8;
      const ang = Math.atan2(obj.y2 - obj.y1, obj.x2 - obj.x1);
      const nx = -Math.sin(ang) * dimOffset;
      const ny = Math.cos(ang) * dimOffset;
      addObject({
        type: "line",
        x1: obj.x1 + nx,
        y1: obj.y1 + ny,
        x2: obj.x2 + nx,
        y2: obj.y2 + ny,
        isDimension: true,
        dimSrcX1: obj.x1,
        dimSrcY1: obj.y1,
        dimSrcX2: obj.x2,
        dimSrcY2: obj.y2,
        name: `Kóta ${len.toFixed(2)}mm`,
        color: COLORS.textSecondary,
      });
      showToast(`Kóta ${len.toFixed(2)}mm přidána`);
      break;
    }
    case "circle": {
      addObject({
        type: "line",
        x1: obj.cx,
        y1: obj.cy,
        x2: obj.cx + obj.r,
        y2: obj.cy,
        name: `Kóta R${obj.r.toFixed(2)}`,
        isDimension: true,
        color: COLORS.textSecondary,
      });
      showToast(`Kóta R${obj.r.toFixed(2)} přidána`);
      break;
    }
    case "arc": {
      addObject({
        type: "line",
        x1: obj.cx,
        y1: obj.cy,
        x2: obj.cx + obj.r,
        y2: obj.cy,
        name: `Kóta R${obj.r.toFixed(2)}`,
        isDimension: true,
        color: COLORS.textSecondary,
      });
      showToast(`Kóta R${obj.r.toFixed(2)} přidána`);
      break;
    }
    case "rect": {
      const w = Math.abs(obj.x2 - obj.x1);
      const h = Math.abs(obj.y2 - obj.y1);
      // Šířka – horní hrana
      addObject({
        type: "line",
        x1: obj.x1,
        y1: Math.max(obj.y1, obj.y2),
        x2: obj.x2,
        y2: Math.max(obj.y1, obj.y2),
        name: `Kóta ${w.toFixed(2)}mm`,
        isDimension: true,
        color: COLORS.textSecondary,
      });
      // Výška – pravá hrana
      addObject({
        type: "line",
        x1: Math.max(obj.x1, obj.x2),
        y1: obj.y1,
        x2: Math.max(obj.x1, obj.x2),
        y2: obj.y2,
        name: `Kóta ${h.toFixed(2)}mm`,
        isDimension: true,
        color: COLORS.textSecondary,
      });
      showToast(`Kóty ${w.toFixed(2)} × ${h.toFixed(2)}mm přidány`);
      break;
    }
    case "polyline": {
      if (!obj.vertices || obj.vertices.length < 2) {
        showToast("Kontura nemá dostatek bodů");
        break;
      }
      const verts = obj.vertices;
      const n = verts.length;
      const segCount = obj.closed ? n : n - 1;
      let dimCount = 0;
      for (let i = 0; i < segCount; i++) {
        const p1 = verts[i];
        const p2 = verts[(i + 1) % n];
        const b = (obj.bulges && obj.bulges[i]) || 0;
        if (Math.abs(b) > 1e-6) {
          // Obloukový segment – kóta poloměru
          const arc = bulgeToArc(p1, p2, b);
          if (arc) {
            addObject({
              type: "line",
              x1: arc.cx, y1: arc.cy,
              x2: arc.cx + arc.r, y2: arc.cy,
              name: `Kóta R${arc.r.toFixed(2)}`,
              isDimension: true,
              color: COLORS.textSecondary,
            });
            dimCount++;
          }
        } else {
          // Přímý segment – kóta délky
          const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          if (len > 1e-6) {
            addObject({
              type: "line",
              x1: p1.x, y1: p1.y,
              x2: p2.x, y2: p2.y,
              name: `Kóta ${len.toFixed(2)}mm`,
              isDimension: true,
              color: COLORS.textSecondary,
            });
            dimCount++;
          }
        }
      }
      showToast(`${dimCount} kót přidáno ke kontuře`);
      break;
    }
    default:
      showToast("Pro tento typ objektu nelze přidat kótu");
      break;
  }
}
