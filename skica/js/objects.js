// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Správa objektů (přidání, přesun)                  ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, pushUndo } from './state.js';
import { updateObjectList } from './ui.js';
import { calculateAllIntersections } from './geometry.js';
import { autoCenterView } from './canvas.js';

/**
 * Přidá objekt do výkresu (push undo, přiřazení ID a vrstvy).
 * @param {import('./types.js').DrawObject} obj
 * @returns {import('./types.js').DrawObject}
 */
export function addObject(obj) {
  pushUndo();
  obj.id = state.nextId++;
  // Assign layer: construction lines default to layer 1, others to active layer
  if (obj.layer === undefined) {
    obj.layer = (obj.type === 'constr') ? 1 : state.activeLayer;
  }
  state.objects.push(obj);
  updateObjectList();
  calculateAllIntersections(); // Auto-přepočet průsečíků (volá renderAll)
  // Auto-center jen při prvním objektu (na mobilu)
  if (window.innerWidth <= 900 && state.objects.length === 1) {
    autoCenterView();
  }
  return obj;
}

/**
 * Posune objekt o delta.
 * @param {import('./types.js').DrawObject} obj
 * @param {number} dx
 * @param {number} dy
 */
export function moveObject(obj, dx, dy) {
  switch (obj.type) {
    case "point":
      obj.x += dx;
      obj.y += dy;
      break;
    case "line":
    case "constr":
      obj.x1 += dx;
      obj.y1 += dy;
      obj.x2 += dx;
      obj.y2 += dy;
      break;
    case "circle":
      obj.cx += dx;
      obj.cy += dy;
      break;
    case "arc":
      obj.cx += dx;
      obj.cy += dy;
      break;
    case "rect":
      obj.x1 += dx;
      obj.y1 += dy;
      obj.x2 += dx;
      obj.y2 += dy;
      break;
    case "polyline":
      for (const v of obj.vertices) {
        v.x += dx;
        v.y += dy;
      }
      break;
  }
}
