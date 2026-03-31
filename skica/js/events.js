// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Myš, klávesnice, kolečko                          ║
// ╚══════════════════════════════════════════════════════════════╝

import { ZOOM_FACTOR, ZOOM_MIN, ZOOM_MAX, PASTE_OFFSET } from './constants.js';
import { drawCanvas, screenToWorld, snapPt, applyAngleSnap } from './canvas.js';
import { state, pushUndo, undo, redo, showToast, resetDrawingState, fmtStatusCoords } from './state.js';
import { renderAll, getObjectBounds, boundsOverlap } from './render.js';
import { moveObject, addObject, addPolylineAsSegments } from './objects.js';
import { setTool, resetHint, setHint, updateProperties, updateObjectList, updateSnapPtsBtn, updateDimsBtn, toggleCoordMode, updateCoordModeBtn, updateSnapGridBtn, updateAngleSnapBtn, showGridSizeDialog, showAngleSnapDialog, toggleHelp, updateNullPointUI } from './ui.js';
import { findObjectAt, selectObjectAt, calculateAllIntersections, mirrorObject, linearArray, rotateObject, findSegmentAt, findConstraintAt } from './geometry.js';
import { showNumericalInputDialog, showPolarDrawingDialog, showCircleRadiusDialog, showBulgeDialog, showMirrorDialog, showLinearArrayDialog, showRotateDialog } from './dialogs.js';
import { saveProject, showExportImageDialog, showProjectsDialog, showSaveAsDialog } from './storage.js';
import { bulgeToArc, deepClone } from './utils.js';
import { bridge } from './bridge.js';
import { updateAssociativeDimensions } from './dialogs/dimension.js';
import { handleTangentClick, tangentFromSelection, handleOffsetClick, offsetFromSelection, handleTrimClick, trimFromSelection, handleExtendClick, extendFromSelection, handleFilletClick, filletFromSelection, handlePerpClick, perpFromSelection, handleHorizontalClick, horizontalFromSelection, handleParallelClick, parallelFromSelection, handleDimensionClick, handleSnapPointClick, handleMoveClick, handleLineClick, handleMeasureClick, handleCircleClick, handleArcClick, handleRectClick, handlePolylineClick, measureSelection, handleTextClick, handleAnchorClick, removeAnchorsForObject, removeAnchorAt, hasAnchoredPoint } from './tools/index.js';
import { showPostDrawPointDialog } from './dialogs/postDrawDialog.js';

// Registrace measureSelection na bridge (aby ui.js nemusel importovat přímo – kruhová závislost)
bridge.measureSelection = measureSelection;
bridge.tangentFromSelection = tangentFromSelection;
bridge.offsetFromSelection = offsetFromSelection;
bridge.trimFromSelection = trimFromSelection;
bridge.extendFromSelection = extendFromSelection;
bridge.filletFromSelection = filletFromSelection;
bridge.perpFromSelection = perpFromSelection;
bridge.horizontalFromSelection = horizontalFromSelection;
bridge.parallelFromSelection = parallelFromSelection;

let isPanning = false;
let panStartX, panStartY, panStartPX, panStartPY;

// ── Pohyb myší ──
drawCanvas.addEventListener("mousemove", (e) => {
  const rect = drawCanvas.getBoundingClientRect();
  state.mouse.sx = e.clientX - rect.left;
  state.mouse.sy = e.clientY - rect.top;
  let [rawWx, rawWy] = screenToWorld(state.mouse.sx, state.mouse.sy);
  state.mouse.rawX = rawWx;
  state.mouse.rawY = rawWy;
  let [wx, wy] = [rawWx, rawWy];
  if (state.snapToPoints) [wx, wy] = snapPt(rawWx, rawWy);

  // Angle snap – jen při kreslení, a jen pokud object snap nezachytil bod
  if (state.angleSnap && state.drawing && state.tempPoints.length > 0
      && ['line', 'constr', 'polyline', 'measure', 'dimension'].includes(state.tool)) {
    if (state.mouse.snapType !== 'point') {
      const ref = state.tempPoints[state.tempPoints.length - 1];
      [wx, wy] = applyAngleSnap(wx, wy, ref);
    }
  }

  state.mouse.x = wx;
  state.mouse.y = wy;

  // Polar info z referenčního bodu
  let extra = "";
  if (state.drawing && state.tempPoints.length > 0) {
    const ref = state.tempPoints[state.tempPoints.length - 1];
    const ddx = wx - ref.x,
      ddy = wy - ref.y;
    const dist = Math.hypot(ddx, ddy);
    const ang = (Math.atan2(ddy, ddx) * 180) / Math.PI;
    extra = `   |   d=${dist.toFixed(2)}  ∠=${ang.toFixed(1)}°`;
  }

  if (bridge.updateMobileCoords) {
    bridge.updateMobileCoords(wx, wy, extra);
  } else {
    document.getElementById("coordDisplay").textContent = fmtStatusCoords(wx, wy, extra);
  }

  if (isPanning) {
    state.panX = panStartPX + (e.clientX - panStartX);
    state.panY = panStartPY + (e.clientY - panStartY);
  }

  // Přetahování objektu
  if (state.dragging && state.dragObjIdx !== null) {
    const dx = wx - state.dragStartWorld.x;
    const dy = wy - state.dragStartWorld.y;
    try {
      if (state.dragObjIdx === -1 && state._multiDragSnapshots) {
        // Multi-drag: nejprve obnovit vše ze snapshot
        for (const { idx, snapshot } of state._multiDragSnapshots) {
          const obj = state.objects[idx];
          if (obj) Object.assign(obj, JSON.parse(snapshot));
        }
        // Přesunout ne-kótové objekty + nenavázané kóty (bez sourceObjId)
        for (const { idx } of state._multiDragSnapshots) {
          const obj = state.objects[idx];
          if (!obj) continue;
          if (!obj.isDimension && !obj.isCoordLabel) {
            // Běžný objekt → moveObject (aktualizuje i asociativní kóty)
            moveObject(obj, dx, dy);
          } else if (!obj.sourceObjId) {
            // Nenavázaná kóta → přesunout přímo (bez asociativní aktualizace)
            if (obj.type === 'point') { obj.x += dx; obj.y += dy; }
            else if (obj.type === 'line') {
              obj.x1 += dx; obj.y1 += dy;
              obj.x2 += dx; obj.y2 += dy;
              if (obj.dimSrcX1 != null) { obj.dimSrcX1 += dx; obj.dimSrcY1 += dy; }
              if (obj.dimSrcX2 != null) { obj.dimSrcX2 += dx; obj.dimSrcY2 += dy; }
              if (obj.dimCenterX != null) { obj.dimCenterX += dx; obj.dimCenterY += dy; }
            }
          }
          // Asociativní kóty (s sourceObjId) se aktualizují přes updateAssociativeDimensions
        }
        // Finální aktualizace asociativních kót
        updateAssociativeDimensions();
      } else if (state.objects[state.dragObjIdx]) {
        const obj = state.objects[state.dragObjIdx];
        if (state.dragObjSnapshot) {
          const snapShot = JSON.parse(state.dragObjSnapshot);
          Object.assign(obj, snapShot);
        }
        moveObject(obj, dx, dy);
      }
    } catch (e) {
      console.warn('Chyba při přetahování:', e);
      state.dragging = false;
      state.dragObjIdx = null;
    }
  }

  renderAll();
});

// ── Klik myší ──
drawCanvas.addEventListener("mousedown", (e) => {
  if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panStartPX = state.panX;
    panStartPY = state.panY;
    drawCanvas.style.cursor = "grabbing";
    e.preventDefault();
    return;
  }
  if (e.button !== 0) return;

  // Obdélníkový výběr: začít tažení z prázdného místa v select režimu
  if (state.tool === "select" && !state.drawing && !state.dragging) {
    const hitObj = findObjectAt(state.mouse.x, state.mouse.y);
    if (hitObj === null) {
      state._rectSelecting = true;
      state._rectStart = { x: state.mouse.x, y: state.mouse.y };
      return;
    }
  }

  handleCanvasClick(state.mouse.x, state.mouse.y);
});

drawCanvas.addEventListener("mouseup", (e) => {
  // Dokončit obdélníkový výběr
  if (state._rectSelecting && state._rectStart) {
    _finishRectSelection();
    renderAll();
    return;
  }
  if (isPanning) {
    isPanning = false;
    drawCanvas.style.cursor = "crosshair";
  }
});

// ── Zoom kolečkem ──
drawCanvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    const rect = drawCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    state.panX = mx - (mx - state.panX) * factor;
    state.panY = my - (my - state.panY) * factor;
    state.zoom *= factor;
    state.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.zoom));
    document.getElementById("statusZoom").textContent =
      `Zoom: ${(state.zoom * 100).toFixed(0)}%`;
    renderAll();
  },
  { passive: false },
);

// ── Klávesnice ──
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // Close topmost dialog overlay if open
    const topOverlay = document.querySelector('.input-overlay, .calc-overlay');
    if (topOverlay) {
      topOverlay.remove();
      return;
    }
    // Close help overlay if open
    const helpOverlay = document.getElementById('helpOverlay');
    if (helpOverlay && helpOverlay.classList.contains('visible')) {
      helpOverlay.classList.remove('visible');
      return;
    }
    // Exit segment editing mode first
    if (state.selectedSegment !== null || state.multiSelectedSegments.size > 0) {
      state.selectedSegment = null;
      state._selectedSegmentObjIdx = null;
      state.multiSelectedSegments.clear();
      updateProperties();
      renderAll();
      return;
    }
    // Cancel rectangle selection
    if (state._rectSelecting) {
      state._rectSelecting = false;
      state._rectStart = null;
      renderAll();
      return;
    }
    if (state.dragging) {
      if (state.dragObjIdx === -1 && state._multiDragSnapshots) {
        // Revert multi-drag
        for (const { idx, snapshot } of state._multiDragSnapshots) {
          const obj = state.objects[idx];
          if (obj) Object.assign(obj, JSON.parse(snapshot));
        }
        state._multiDragSnapshots = null;
      } else {
        const obj = state.objects[state.dragObjIdx];
        if (obj && state.dragObjSnapshot) {
          Object.assign(obj, JSON.parse(state.dragObjSnapshot));
        }
      }
      state.dragging = false;
      state.dragObjIdx = null;
      drawCanvas.style.cursor = "crosshair";
    }
    resetDrawingState();
    // Odstranit dočasný měřicí bod
    const mTempIdx = state.objects.findIndex(o => o.isMeasureTemp);
    if (mTempIdx !== -1) state.objects.splice(mTempIdx, 1);
    state.selected = null;
    state.selectedSegment = null;
    state._selectedSegmentObjIdx = null;
    state.multiSelected.clear();
    state.multiSelectedSegments.clear();
    state.selectedPoint = null;
    // Escape z deleteObj módu → zpět na select
    if (state.tool === 'deleteObj') setTool('select');
    updateProperties();
    renderAll();
    resetHint();
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault();
    undo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "y") {
    e.preventDefault();
    redo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
    e.preventDefault();
    showSaveAsDialog();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    saveProject();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "p") {
    e.preventDefault();
    showProjectsDialog();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "c") {
    if (state.multiSelected.size > 0) {
      state.clipboard = [...state.multiSelected].map(i => deepClone(state.objects[i]));
      showToast(`${state.multiSelected.size} objektů zkopírováno`);
    } else if (state.selected !== null) {
      state.clipboard = deepClone(state.objects[state.selected]);
      showToast("Objekt zkopírován");
    }
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "v") {
    if (state.clipboard) {
      if (Array.isArray(state.clipboard)) {
        pushUndo();
        state.multiSelected.clear();
        for (const orig of state.clipboard) {
          const copy = deepClone(orig);
          copy.id = state.nextId;
          copy.name = (copy.name || copy.type) + " (kopie)";
          moveObject(copy, PASTE_OFFSET, PASTE_OFFSET);
          addObject(copy);
          state.multiSelected.add(state.objects.length - 1);
        }
        state.selected = state.objects.length - 1;
        updateObjectList();
        updateProperties();
        showToast(`${state.clipboard.length} objektů vloženo`);
      } else {
        const copy = deepClone(state.clipboard);
        copy.id = state.nextId;
        copy.name = (copy.name || copy.type) + " (kopie)";
        moveObject(copy, PASTE_OFFSET, PASTE_OFFSET);
        addObject(copy);
        state.selected = state.objects.length - 1;
        state.multiSelected.clear();
        updateObjectList();
        updateProperties();
        showToast("Objekt vložen");
      }
    }
    return;
  }

  if (e.key === "F1") {
    e.preventDefault();
    toggleHelp();
    return;
  }

  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")
    return;

  if (e.key === "?") {
    toggleHelp();
    return;
  }

  const shortcuts = {
    v: "select",
    w: "move",
    p: "point",
    l: "line",
    k: "constr",
    c: "circle",
    a: "arc",
    r: "rect",
    q: "polyline",
    m: "measure",
    t: "tangent",
    o: "offset",
    x: "trim",
    e: "extend",
    f: "fillet",
    j: "perp",
    z: "horizontal",
    h: "parallel",
    u: "dimension",
    b: "snapPoint",
    i: "text",
  };
  // Shift+M = mirror, Shift+N = polar, Shift+G = angle snap – skip tool shortcuts
  // B is only snapPoint when not drawing polyline
  if (e.key.toLowerCase() === 'b' && state.drawing && state.tool === 'polyline') {
    // handled separately below for bulge
  } else if (!(e.shiftKey && ['m','n','g'].includes(e.key.toLowerCase())) && shortcuts[e.key.toLowerCase()]) {
    // M (measure): pokud je výběr → okamžitě změřit
    if (e.key.toLowerCase() === 'm' && !e.shiftKey && measureSelection()) {
      // měření provedeno přes výběr
    } else {
      setTool(shortcuts[e.key.toLowerCase()]);
    }
  }

  if (e.key.toLowerCase() === "s") {
    state.snapToPoints = !state.snapToPoints;
    updateSnapPtsBtn();
    renderAll();
    showToast(state.snapToPoints ? "Snap k bodům: ON" : "Snap k bodům: OFF");
  }
  if (e.key.toLowerCase() === "d") {
    const cycle = { all: 'intersections', intersections: 'none', none: 'all' };
    state.showDimensions = cycle[state.showDimensions] || 'all';
    updateDimsBtn();
    renderAll();
  }

  if (e.key.toLowerCase() === "i") {
    toggleCoordMode();
  }

  if (e.key.toLowerCase() === "n") {
    if (e.shiftKey) {
      showPolarDrawingDialog();
    } else {
      showNumericalInputDialog();
    }
  }
  if (e.key.toLowerCase() === "g") {
    if (e.shiftKey) {
      state.angleSnap = !state.angleSnap;
      updateAngleSnapBtn();
      renderAll();
      showToast(state.angleSnap ? `Úhlový snap: ON (${state.angleSnapStep}°)` : "Úhlový snap: OFF");
    } else {
      state.snapToGrid = !state.snapToGrid;
      updateSnapGridBtn();
      renderAll();
      showToast(state.snapToGrid ? `Snap na mřížku: ON (${state.gridSize})` : "Snap na mřížku: OFF");
    }
  }
  if (e.key === "Delete" && (state.selected !== null || state.multiSelected.size > 0)) {
    const obj = state.selected !== null ? state.objects[state.selected] : null;
    // Delete individual segment from polyline (only in single-select mode)
    if (state.multiSelected.size === 0 && obj && obj.type === 'polyline' && state.selectedSegment !== null) {
      e.preventDefault();
      deleteSelectedSegment();
      return;
    }
    deleteSelected();
  }

  // Shift+M: Zrcadlení vybraného objektu
  if (e.key === "M" && e.shiftKey && (state.selected !== null || state.multiSelected.size > 0)) {
    e.preventDefault();
    startMirrorAction();
  }
  if (e.key === "Enter" && state.drawing && state.tool === "circle") {
    e.preventDefault();
    showCircleRadiusDialog();
  }
  // Polyline: Enter = ukončit (otevřená), Shift+Enter = uzavřít
  if (e.key === "Enter" && state.drawing && state.tool === "polyline") {
    e.preventDefault();
    if (state.tempPoints.length >= 2) {
      const closed = e.shiftKey;
      const bulges = state._polylineBulges || [];
      // Ensure bulges array matches segment count
      if (closed) {
        while (bulges.length < state.tempPoints.length) bulges.push(0);
      } else {
        while (bulges.length < state.tempPoints.length - 1) bulges.push(0);
      }
      addPolylineAsSegments(state.tempPoints.slice(), bulges.slice(0, closed ? state.tempPoints.length : state.tempPoints.length - 1), closed);
      state.drawing = false;
      state.tempPoints = [];
      state._polylineBulges = [];
      resetHint();
      showToast(closed ? 'Kontura uzavřena' : 'Kontura dokončena');
    }
  }
  // Polyline: B = bulge dialog pro poslední segment
  if (e.key.toLowerCase() === "b" && state.drawing && state.tool === "polyline") {
    if (state.tempPoints.length >= 2) {
      const idx = state.tempPoints.length - 2;
      const p1 = state.tempPoints[idx];
      const p2 = state.tempPoints[idx + 1];
      showBulgeDialog(p1, p2, state._polylineBulges[idx] || 0, (newBulge) => {
        if (!state._polylineBulges) state._polylineBulges = [];
        state._polylineBulges[idx] = newBulge;
        renderAll();
      });
    }
  }
  // B key in segment editing mode: bulge dialog for selected segment
  if (e.key.toLowerCase() === "b" && !state.drawing && state.selected !== null && state.selectedSegment !== null) {
    const obj = state.objects[state.selected];
    if (obj && obj.type === 'polyline') {
      const si = state.selectedSegment;
      const pn = obj.vertices.length;
      const p1 = obj.vertices[si];
      const p2 = obj.vertices[(si + 1) % pn];
      showBulgeDialog(p1, p2, obj.bulges[si] || 0, (newBulge) => {
        pushUndo();
        obj.bulges[si] = newBulge;
        updateProperties();
        renderAll();
      });
    }
  }
});

drawCanvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const rect = drawCanvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  let [wx, wy] = screenToWorld(sx, sy);
  if (state.snapToPoints) [wx, wy] = snapPt(wx, wy);

  // Polyline: pravý klik = bulge dialog pro poslední segment
  if (state.drawing && state.tool === "polyline" && state.tempPoints.length >= 2) {
    const idx = state.tempPoints.length - 2;
    const p1 = state.tempPoints[idx];
    const p2 = state.tempPoints[idx + 1];
    showBulgeDialog(p1, p2, state._polylineBulges[idx] || 0, (newBulge) => {
      if (!state._polylineBulges) state._polylineBulges = [];
      state._polylineBulges[idx] = newBulge;
      renderAll();
    });
    return;
  }

  // Zobrazit kontextové menu pro nastavení reference
  const existing = document.querySelector('.skica-context-menu');
  if (existing) existing.remove();

  // Detekce objektu pod kurzorem pro kontextové akce
  const ctxIdx = findObjectAt(wx, wy);

  const menu = document.createElement('div');
  menu.className = 'skica-context-menu';
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;

  // Build context menu items safely (no innerHTML)
  const menuDef = [
    { label: '📍 Nastavit jako referenci (INC)', action: 'ref' },
  ];
  if (ctxIdx !== null) {
    state.selected = ctxIdx;
    state.multiSelected.clear();
    state.selectedPoint = null;
    updateObjectList();
    updateProperties();
    renderAll();
    menuDef.push({ sep: true });
    menuDef.push({ label: '🪞 Zrcadlit (Shift+M)', action: 'mirror' });
    menuDef.push({ label: '🔄 Otočit', action: 'rotate' });
    menuDef.push({ label: '📏 Lineární pole', action: 'array' });
    menuDef.push({ label: '⇔ Offset', action: 'offset' });
    if (state.objects[ctxIdx] && state.objects[ctxIdx].type === 'polyline') {
      menuDef.push({ label: '💥 Rozložit konturu', action: 'explode' });
    }
    menuDef.push({ sep: true });
    menuDef.push({ label: '🗑 Smazat', action: 'delete', cls: 'ctx-delete' });
  }
  for (const entry of menuDef) {
    if (entry.sep) {
      const sep = document.createElement('div');
      sep.className = 'ctx-sep';
      menu.appendChild(sep);
    } else {
      const item = document.createElement('div');
      item.className = 'ctx-item' + (entry.cls ? ` ${entry.cls}` : '');
      item.dataset.action = entry.action;
      item.textContent = entry.label;
      menu.appendChild(item);
    }
  }
  document.body.appendChild(menu);

  menu.querySelectorAll('.ctx-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      menu.remove();
      if (action === 'ref') {
        state.incReference = { x: wx, y: wy };
        state.nullPointActive = true;
        if (state.coordMode !== 'inc') state.coordMode = 'inc';
        updateCoordModeBtn();
        updateNullPointUI();
        renderAll();
        showToast(`Nulový bod: ${state.machineType === 'karusel' ? 'X' : 'Z'}=${wx.toFixed(3)} ${state.machineType === 'karusel' ? 'Z' : 'X'}=${wy.toFixed(3)}`);
      } else if (action === 'mirror') {
        startMirrorAction();
      } else if (action === 'rotate') {
        startRotateAction();
      } else if (action === 'array') {
        startLinearArrayAction();
      } else if (action === 'offset') {
        if (ctxIdx !== null && state.objects[ctxIdx]) {
          handleOffsetClick(wx, wy);
        }
      } else if (action === 'explode') {
        explodeSelectedPolyline();
      } else if (action === 'delete') {
        deleteSelected();
      }
    });
  });

  const closeMenu = (ev) => {
    if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', closeMenu); }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 0);
});

// ── Obdélníkový výběr – dokončení ──
function _finishRectSelection() {
  if (!state._rectStart) { state._rectSelecting = false; return; }
  const sx = state._rectStart.x, sy = state._rectStart.y;
  const ex = state.mouse.x, ey = state.mouse.y;
  // Pokud byl pohyb minimální, zachovat se jako klik do prázdna (deselect)
  if (Math.hypot(ex - sx, ey - sy) < 0.5) {
    state._rectSelecting = false;
    state._rectStart = null;
    selectObjectAt(sx, sy);
    return;
  }
  const bbox = {
    minX: Math.min(sx, ex), minY: Math.min(sy, ey),
    maxX: Math.max(sx, ex), maxY: Math.max(sy, ey),
  };
  state.multiSelected.clear();
  state.selected = null;
  state.selectedPoint = null;
  let firstIdx = null;
  state.objects.forEach((obj, idx) => {
    if (obj.isDimension || obj.isCoordLabel) return;
    const layer = state.layers.find(l => l.id === obj.layer);
    if (layer && (!layer.visible || layer.locked)) return;
    const ob = getObjectBounds(obj);
    if (ob && boundsOverlap(ob, bbox)) {
      state.multiSelected.add(idx);
      if (firstIdx === null) firstIdx = idx;
    }
  });
  if (state.multiSelected.size === 1) {
    state.selected = firstIdx;
    state.multiSelected.clear();
  }
  state._rectSelecting = false;
  state._rectStart = null;
  updateObjectList();
  updateProperties();
}

// ── Klik logika sdílená s touch ──
/**
 * Zpracování kliku na canvas (volané i z touch modulu).
 * @param {number} wx
 * @param {number} wy
 * @param {{ addToSelection?: boolean }} [opts]
 */
export function handleCanvasClick(wx, wy) {
  switch (state.tool) {
    case "select":
      selectObjectAt(wx, wy);
      break;

    case "move":
      handleMoveClick(wx, wy);
      break;

    case "point": {
      const ptObj = addObject({
        type: "point",
        x: wx,
        y: wy,
        name: `Bod ${state.nextId}`,
      });
      if (ptObj) showPostDrawPointDialog(ptObj);
      break;
    }

    case "line":
    case "constr":
      handleLineClick(wx, wy);
      break;

    case "measure":
      handleMeasureClick(wx, wy);
      break;

    case "circle":
      handleCircleClick(wx, wy);
      break;

    case "arc":
      handleArcClick(wx, wy);
      break;

    case "rect":
      handleRectClick(wx, wy);
      break;

    case "polyline":
      handlePolylineClick(wx, wy);
      break;

    case "tangent":
      handleTangentClick(wx, wy);
      break;

    case "offset":
      handleOffsetClick(wx, wy);
      break;

    case "trim":
      handleTrimClick(wx, wy);
      break;

    case "extend":
      handleExtendClick(wx, wy);
      break;

    case "fillet":
      handleFilletClick(wx, wy);
      break;

    case "perp":
      handlePerpClick(wx, wy);
      break;

    case "horizontal":
      handleHorizontalClick(wx, wy);
      break;

    case "parallel":
      handleParallelClick(wx, wy);
      break;

    case "dimension":
      handleDimensionClick(wx, wy);
      break;

    case "snapPoint":
      handleSnapPointClick(wx, wy);
      break;

    case "text":
      handleTextClick(wx, wy);
      break;

    case "anchor":
      handleAnchorClick(wx, wy);
      break;

    case "deleteObj": {
      // Nejprve zkusit vazbu (constraint marker)
      const constr = findConstraintAt(wx, wy);
      if (constr) {
        pushUndo();
        const cObj = state.objects[constr.objIdx];
        if (cObj) removeConstraint(cObj, constr.segIdx);
        renderAll();
        showToast("Vazba odstraněna ✓");
        break;
      }
      // Pak objekt
      const idx = findObjectAt(wx, wy);
      if (idx !== null) {
        pushUndo();
        removeAnchorsForObject(state.objects[idx]);
        state.objects.splice(idx, 1);
        updateObjectList();
        updateProperties();
        calculateAllIntersections();
        renderAll();
        showToast("Objekt smazán ✓");
      } else {
        // Nakonec zkusit kotvu
        pushUndo();
        if (removeAnchorAt(wx, wy)) {
          renderAll();
          showToast("Kotva odstraněna ✓");
        } else {
          state.undoStack.pop();
        }
      }
      break;
    }
  }
}

// ── Vazby (constraints) – helper ──
/** Odstraní vazbu z objektu/segmentu. */
function removeConstraint(obj, segIdx) {
  if (segIdx !== null && segIdx !== undefined) {
    if (obj.segConstraints) {
      delete obj.segConstraints[segIdx];
      if (Object.keys(obj.segConstraints).length === 0) delete obj.segConstraints;
    }
  } else {
    delete obj.constraint;
  }
}

// ── Rotace akce ──
/** Spustí dialog pro rotaci vybraného objektu (podporuje multi-select). */
function startRotateAction() {
  const indices = state.multiSelected.size > 0
    ? [...state.multiSelected]
    : state.selected !== null ? [state.selected] : [];
  if (indices.length === 0) { showToast("Nejdříve vyberte objekt"); return; }
  const objs = indices.map(i => state.objects[i]);
  const refObj = objs[0];

  showRotateDialog(refObj, (deg) => {
    pushUndo();
    for (const obj of objs) {
      if (hasAnchoredPoint(obj)) {
        showToast("Zakotvené objekty nelze otáčet");
        continue;
      }
      // Rotate around object center
      let cx, cy;
      switch (obj.type) {
        case 'point': cx = obj.x; cy = obj.y; break;
        case 'line': case 'constr':
          cx = (obj.x1 + obj.x2) / 2; cy = (obj.y1 + obj.y2) / 2; break;
        case 'circle': case 'arc':
          cx = obj.cx; cy = obj.cy; break;
        case 'rect':
          cx = (obj.x1 + obj.x2) / 2; cy = (obj.y1 + obj.y2) / 2; break;
        case 'polyline': {
          const vs = obj.vertices;
          cx = vs.reduce((s, v) => s + v.x, 0) / vs.length;
          cy = vs.reduce((s, v) => s + v.y, 0) / vs.length;
          break;
        }
        default: cx = 0; cy = 0;
      }
      rotateObject(obj, cx, cy, deg * Math.PI / 180);
    }
    calculateAllIntersections();
    renderAll();
    showToast(`Otočeno o ${deg}° ✓`);
  });
}

// ── Smazání vybraného objektu nebo vazby ──
function deleteSelected() {
  // Pokud je vybrána vazební značka, smazat jen vazbu
  if (state._selectedConstraint) {
    const c = state._selectedConstraint;
    const obj = state.objects[c.objIdx];
    if (obj) {
      pushUndo();
      removeConstraint(obj, c.segIdx);
      state._selectedConstraint = null;
      renderAll();
      showToast("Vazba odstraněna ✓");
    }
    return;
  }

  // Multi-select smazání
  if (state.multiSelected.size > 0) {
    pushUndo();
    const indices = [...state.multiSelected].sort((a, b) => b - a); // sestupně
    for (const idx of indices) {
      removeAnchorsForObject(state.objects[idx]);
      state.objects.splice(idx, 1);
    }
    state.selected = null;
    state.selectedSegment = null;
    state._selectedSegmentObjIdx = null;
    state.multiSelected.clear();
    state.multiSelectedSegments.clear();
    state.selectedPoint = null;
    updateObjectList();
    updateProperties();
    calculateAllIntersections();
    renderAll();
    showToast(`Smazáno ${indices.length} objektů ✓`);
    return;
  }

  if (state.selected === null) { showToast("Nejdříve vyberte objekt"); return; }
  // Pokud je vybrán segment kontury, smazat jen segment (případně rozdělit konturu)
  const selObj = state.objects[state.selected];
  if (selObj && selObj.type === 'polyline' && state.selectedSegment !== null) {
    deleteSelectedSegment();
    return;
  }
  pushUndo();
  removeAnchorsForObject(state.objects[state.selected]);
  state.objects.splice(state.selected, 1);
  state.selected = null;
  state.selectedSegment = null;
  state._selectedSegmentObjIdx = null;
  state.multiSelectedSegments.clear();
  state.selectedPoint = null;
  updateObjectList();
  updateProperties();
  calculateAllIntersections();
  renderAll();
  showToast("Objekt smazán ✓");
}

// ── Smazání vybraného segmentu kontury ──
function deleteSelectedSegment() {
  if (state.selected === null || state.selectedSegment === null) return;
  const obj = state.objects[state.selected];
  if (!obj || obj.type !== 'polyline') return;
  const segIdx = state.selectedSegment;
  const n = obj.vertices.length;
  const segCount = obj.closed ? n : n - 1;
  if (segIdx < 0 || segIdx >= segCount) return;

  pushUndo();

  if (n <= 2) {
    // Only 2 vertices = 1 segment → delete the whole polyline
    removeAnchorsForObject(state.objects[state.selected]);
    state.objects.splice(state.selected, 1);
    state.selected = null;
    state.selectedSegment = null;
    state._selectedSegmentObjIdx = null;
    state.multiSelectedSegments.clear();
  } else if (obj.closed) {
    // Closed polyline: remove vertex at segIdx+1 (or segIdx for last segment), open the polyline
    // Remove the end vertex of this segment, reorder so segIdx+1 becomes the break point
    const removeIdx = (segIdx + 1) % n;
    obj.vertices.splice(removeIdx, 1);
    obj.bulges.splice(segIdx, 1);
    obj.closed = false;
    // Reorder so the break is at start/end
    if (removeIdx > 0 && removeIdx < obj.vertices.length) {
      const newVerts = [...obj.vertices.slice(removeIdx), ...obj.vertices.slice(0, removeIdx)];
      const newBulges = [...obj.bulges.slice(removeIdx), ...obj.bulges.slice(0, removeIdx)];
      obj.vertices = newVerts;
      obj.bulges = newBulges;
    }
    state.selectedSegment = null;
    state._selectedSegmentObjIdx = null;
    state.multiSelectedSegments.clear();
  } else {
    // Open polyline: remove vertex to delete segment
    if (segIdx === 0) {
      // First segment → remove the first vertex
      obj.vertices.splice(0, 1);
      obj.bulges.splice(0, 1);
    } else if (segIdx === segCount - 1) {
      // Last segment → remove the last vertex
      obj.vertices.splice(n - 1, 1);
      obj.bulges.splice(segIdx, 1);
    } else {
      // Middle segment → split into two polylines
      const verts1 = obj.vertices.slice(0, segIdx + 1);
      const bulges1 = obj.bulges.slice(0, segIdx);
      const verts2 = obj.vertices.slice(segIdx + 1);
      const bulges2 = obj.bulges.slice(segIdx + 1);

      // Replace current object with first half
      obj.vertices = verts1;
      obj.bulges = bulges1;
      obj.closed = false;

      // Add second half as new object (without addObject to avoid double pushUndo)
      if (verts2.length >= 2) {
        const newObj = {
          type: 'polyline',
          vertices: verts2,
          bulges: bulges2,
          closed: false,
          name: `Kontura ${state.nextId++}`,
          layer: obj.layer,
          color: obj.color,
        };
        state.objects.push(newObj);
      }
    }
    state.selectedSegment = null;
    state._selectedSegmentObjIdx = null;
    state.multiSelectedSegments.clear();
  }

  updateObjectList();
  updateProperties();
  calculateAllIntersections();
  renderAll();
  showToast("Segment smazán ✓");
}

// ── Rozložení kontury na segmenty ──
function explodeSelectedPolyline() {
  if (state.selected === null) return;
  const obj = state.objects[state.selected];
  if (!obj || obj.type !== 'polyline') { showToast("Vyberte konturu"); return; }

  const n = obj.vertices.length;
  const segCount = obj.closed ? n : n - 1;
  if (segCount < 1) return;

  pushUndo();

  const newObjects = [];
  for (let i = 0; i < segCount; i++) {
    const p1 = obj.vertices[i];
    const p2 = obj.vertices[(i + 1) % n];
    const b = obj.bulges[i] || 0;

    if (b === 0) {
      // Straight segment → line
      newObjects.push({
        type: 'line',
        x1: p1.x, y1: p1.y,
        x2: p2.x, y2: p2.y,
        name: `Úsečka ${state.nextId + newObjects.length}`,
        layer: obj.layer,
        color: obj.color,
      });
    } else {
      // Arc segment → arc
      const arc = bulgeToArc(p1, p2, b);
      if (arc) {
        newObjects.push({
          type: 'arc',
          cx: arc.cx, cy: arc.cy,
          r: arc.r,
          startAngle: arc.startAngle,
          endAngle: arc.endAngle,
          name: `Oblouk ${state.nextId + newObjects.length}`,
          layer: obj.layer,
          color: obj.color,
        });
      }
    }
  }

  // Remove the polyline
  state.objects.splice(state.selected, 1);
  state.selected = null;
  state.selectedSegment = null;
  state._selectedSegmentObjIdx = null;
  state.multiSelectedSegments.clear();

  // Add new individual objects (without pushUndo, already done)
  for (const no of newObjects) {
    no.id = state.nextId++;
    if (no.layer === undefined) no.layer = state.activeLayer;
    state.objects.push(no);
  }

  updateObjectList();
  updateProperties();
  calculateAllIntersections();
  renderAll();
  showToast(`Kontura rozložena na ${newObjects.length} segmentů ✓`);
}

// ── Zrcadlení akce ──
/** Spustí dialog pro zrcadlení vybraného objektu (podporuje multi-select). */
function startMirrorAction() {
  // Získat objekty pro zrcadlení
  const indices = state.multiSelected.size > 0
    ? [...state.multiSelected]
    : state.selected !== null ? [state.selected] : [];
  if (indices.length === 0) { showToast("Nejdříve vyberte objekt"); return; }
  const objs = indices.map(i => state.objects[i]);
  const refObj = objs[0]; // pro dialog

  showMirrorDialog(refObj, (axis) => {
    if (axis === 'custom') {
      showToast("Klepněte na první bod osy zrcadlení");
      setHint("Klepněte na první bod osy zrcadlení");
      state._mirrorObj = objs;
      state._mirrorStep = 'p1';
      state._mirrorAxisPoints = [];

      function handleMirrorClick(e) {
        const rect = drawCanvas.getBoundingClientRect();
        const sx = (e.clientX || e.changedTouches?.[0]?.clientX) - rect.left;
        const sy = (e.clientY || e.changedTouches?.[0]?.clientY) - rect.top;
        let [mwx, mwy] = screenToWorld(sx, sy);
        if (state.snapToPoints) [mwx, mwy] = snapPt(mwx, mwy);

        if (state._mirrorStep === 'p1') {
          state._mirrorAxisPoints.push({ x: mwx, y: mwy });
          state._mirrorStep = 'p2';
          setHint("Klepněte na druhý bod osy zrcadlení");
        } else {
          cleanupMirrorListeners();
          const p1 = state._mirrorAxisPoints[0];
          const p2 = { x: mwx, y: mwy };
          for (const o of state._mirrorObj) {
            const copy = mirrorObject(o, 'custom', p1, p2);
            addObject(copy);
          }
          showToast(`${state._mirrorObj.length > 1 ? state._mirrorObj.length + ' objektů zrcadleno' : 'Objekt zrcadlen'} ✓`);
          resetHint();
          state._mirrorObj = null;
          state._mirrorStep = null;
          state._mirrorAxisPoints = null;
          state._mirrorCleanup = null;
        }
      }

      function handleMirrorTouch(e) {
        if (e.changedTouches.length === 1) { e.preventDefault(); handleMirrorClick(e); }
      }

      function cleanupMirrorListeners() {
        drawCanvas.removeEventListener("click", handleMirrorClick);
        drawCanvas.removeEventListener("touchend", handleMirrorTouch);
      }

      drawCanvas.addEventListener("click", handleMirrorClick);
      drawCanvas.addEventListener("touchend", handleMirrorTouch);
      state._mirrorCleanup = cleanupMirrorListeners;
    } else {
      for (const o of objs) {
        const copy = mirrorObject(o, axis, null, null);
        addObject(copy);
      }
      showToast(`${objs.length > 1 ? objs.length + ' objektů zrcadleno' : 'Objekt zrcadlen'} podle osy ${axis === 'x' ? 'X' : 'Z'} ✓`);
    }
  });
}

// ── Lineární pole akce ──
/** Spustí dialog pro vytvoření lineárního pole (podporuje multi-select). */
function startLinearArrayAction() {
  const indices = state.multiSelected.size > 0
    ? [...state.multiSelected]
    : state.selected !== null ? [state.selected] : [];
  if (indices.length === 0) { showToast("Nejdříve vyberte objekt"); return; }
  const objs = indices.map(i => state.objects[i]);

  showLinearArrayDialog(objs[0], (dx, dz, count) => {
    for (const obj of objs) {
      const copies = linearArray(obj, dx, dz, count);
      for (const copy of copies) {
        addObject(copy);
      }
    }
    showToast(`Vytvořeno ${count} kopií${objs.length > 1 ? ` z ${objs.length} objektů` : ''}`);
  });
}

// Export pro ui.js context menu
export { startMirrorAction, startLinearArrayAction, startRotateAction, deleteSelected };

// ── Tlačítka Smazat a Otočit ──
document.getElementById("btnDelete").addEventListener("click", () => {
  // Pokud je něco vybrané, smazat rovnou
  if (state.selected !== null || state.multiSelected.size > 0 || state._selectedConstraint) {
    deleteSelected();
    return;
  }
  // Nic nevybráno → toggle deleteObj mód
  if (state.tool === 'deleteObj') {
    setTool('select');
  } else {
    setTool('deleteObj');
  }
});
document.getElementById("btnRotate").addEventListener("click", startRotateAction);

// ── Double-click: dokončit konturu / vybrat segment ──
drawCanvas.addEventListener("dblclick", (e) => {
  if (state.drawing && state.tool === "polyline" && state.tempPoints.length >= 2) {
    e.preventDefault();
    // Remove the last point that was added by the second click of dblclick
    // (the first click of dblclick already added a point via mousedown)
    const bulges = state._polylineBulges || [];
    while (bulges.length < state.tempPoints.length - 1) bulges.push(0);
    addPolylineAsSegments(state.tempPoints.slice(), bulges.slice(0, state.tempPoints.length - 1), false);
    state.drawing = false;
    state.tempPoints = [];
    state._polylineBulges = [];
    resetHint();
    showToast('Kontura dokončena');
    return;
  }

  // Double-click on polyline: enter segment editing mode
  if (!state.drawing && state.tool === 'select') {
    const rect = drawCanvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    let [wx, wy] = screenToWorld(sx, sy);
    if (state.snapToPoints) [wx, wy] = snapPt(wx, wy);
    const idx = findObjectAt(wx, wy);
    if (idx !== null && state.objects[idx].type === 'polyline') {
      state.selected = idx;
      state.multiSelected.clear();
      state.selectedPoint = null;
      state.selectedSegment = findSegmentAt(state.objects[idx], wx, wy);
      state._selectedSegmentObjIdx = idx;
      updateProperties();
      updateObjectList();
      renderAll();
      showToast(`Segment ${(state.selectedSegment || 0) + 1} vybrán`);
    }
  }
});
