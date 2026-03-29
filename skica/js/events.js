// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Myš, klávesnice, kolečko                          ║
// ╚══════════════════════════════════════════════════════════════╝

import { COLORS, ZOOM_FACTOR, ZOOM_MIN, ZOOM_MAX, SNAP_POINT_THRESHOLD, PASTE_OFFSET } from './constants.js';
import { drawCanvas, screenToWorld, snapPt, applyAngleSnap } from './canvas.js';
import { state, pushUndo, undo, redo, showToast, toDisplayCoords, resetDrawingState, displayX, xPrefix } from './state.js';
import { renderAll } from './render.js';
import { moveObject, addObject } from './objects.js';
import { setTool, resetHint, setHint, updateProperties, updateObjectList, updateSnapPtsBtn, updateDimsBtn, toggleCoordMode, updateCoordModeBtn, updateSnapGridBtn, updateAngleSnapBtn, showGridSizeDialog, showAngleSnapDialog, toggleHelp } from './ui.js';
import { findObjectAt, selectObjectAt, calculateAllIntersections, mirrorObject, linearArray, rotateObject, findSegmentAt } from './geometry.js';
import { showNumericalInputDialog, showPolarDrawingDialog, showMeasureResult, showCircleRadiusDialog, showIntersectionInfo, showMeasureObjectInfo, showBulgeDialog, showMirrorDialog, showLinearArrayDialog, showRotateDialog } from './dialogs.js';
import { saveProject, showExportImageDialog, showProjectsDialog, showSaveAsDialog } from './storage.js';
import { bulgeToArc, getObjectSnapPoints } from './utils.js';
import { bridge } from './bridge.js';
import { handleTangentClick, handleOffsetClick, handleTrimClick, handleExtendClick, handleFilletClick, handlePerpClick, handleHorizontalClick, handleParallelClick, handleDimensionClick, handleSnapPointClick } from './tools/index.js';

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
    const d = toDisplayCoords(wx, wy);
    const prefix = state.coordMode === 'inc' ? 'Δ' : '';
    const isKarusel = state.machineType === 'karusel';
    const xp = xPrefix();
    const coordText = isKarusel
      ? `${prefix}${xp}X: ${displayX(d.x).toFixed(3)}   ${prefix}Z: ${d.y.toFixed(3)}${extra}`
      : `${prefix}Z: ${d.x.toFixed(3)}   ${prefix}${xp}X: ${displayX(d.y).toFixed(3)}${extra}`;
    document.getElementById("coordDisplay").textContent = coordText;
  }

  if (isPanning) {
    state.panX = panStartPX + (e.clientX - panStartX);
    state.panY = panStartPY + (e.clientY - panStartY);
  }

  // Přetahování objektu
  if (state.dragging && state.dragObjIdx !== null && state.objects[state.dragObjIdx]) {
    const obj = state.objects[state.dragObjIdx];
    const dx = wx - state.dragStartWorld.x;
    const dy = wy - state.dragStartWorld.y;
    if (state.dragObjSnapshot) {
      const snapShot = JSON.parse(state.dragObjSnapshot);
      Object.assign(obj, snapShot);
    }
    moveObject(obj, dx, dy);
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

  handleCanvasClick(state.mouse.x, state.mouse.y);
});

drawCanvas.addEventListener("mouseup", (e) => {
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
    // Close help overlay if open
    const helpOverlay = document.getElementById('helpOverlay');
    if (helpOverlay && helpOverlay.classList.contains('visible')) {
      helpOverlay.classList.remove('visible');
      return;
    }
    // Exit segment editing mode first
    if (state.selectedSegment !== null) {
      state.selectedSegment = null;
      updateProperties();
      renderAll();
      return;
    }
    if (state.dragging) {
      const obj = state.objects[state.dragObjIdx];
      if (obj && state.dragObjSnapshot) {
        Object.assign(obj, JSON.parse(state.dragObjSnapshot));
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
    if (state.selected !== null) {
      state.clipboard = JSON.parse(JSON.stringify(state.objects[state.selected]));
      showToast("Objekt zkopírován");
    }
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "v") {
    if (state.clipboard) {
      const copy = JSON.parse(JSON.stringify(state.clipboard));
      copy.id = state.nextId;
      copy.name = (copy.name || copy.type) + " (kopie)";
      // Offset pasted object slightly
      moveObject(copy, PASTE_OFFSET, PASTE_OFFSET);
      addObject(copy);
      state.selected = state.objects.length - 1;
      updateObjectList();
      updateProperties();
      showToast("Objekt vložen");
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
  };
  // Shift+M = mirror, Shift+N = polar, Shift+G = angle snap – skip tool shortcuts
  // B is only snapPoint when not drawing polyline
  if (e.key.toLowerCase() === 'b' && state.drawing && state.tool === 'polyline') {
    // handled separately below for bulge
  } else if (!(e.shiftKey && ['m','n','g'].includes(e.key.toLowerCase())) && shortcuts[e.key.toLowerCase()])
    setTool(shortcuts[e.key.toLowerCase()]);

  if (e.key.toLowerCase() === "s") {
    state.snapToPoints = !state.snapToPoints;
    updateSnapPtsBtn();
    renderAll();
    showToast(state.snapToPoints ? "Snap k bodům: ON" : "Snap k bodům: OFF");
  }
  if (e.key.toLowerCase() === "d") {
    state.showDimensions = !state.showDimensions;
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
  if (e.key === "Delete" && state.selected !== null) {
    const obj = state.objects[state.selected];
    // Delete individual segment from polyline
    if (obj && obj.type === 'polyline' && state.selectedSegment !== null) {
      e.preventDefault();
      deleteSelectedSegment();
      return;
    }
    pushUndo();
    state.objects.splice(state.selected, 1);
    state.selected = null;
    state.selectedSegment = null;
    updateObjectList();
    updateProperties();
    calculateAllIntersections();
    renderAll();
  }

  // Shift+M: Zrcadlení vybraného objektu
  if (e.key === "M" && e.shiftKey && state.selected !== null) {
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
      addObject({
        type: 'polyline',
        vertices: state.tempPoints.slice(),
        bulges: bulges.slice(0, closed ? state.tempPoints.length : state.tempPoints.length - 1),
        closed,
        name: `Kontura ${state.nextId}`,
      });
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
  menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:6px;padding:4px 0;z-index:9999;font-size:13px;font-family:Consolas,monospace;box-shadow:0 4px 12px rgba(0,0,0,.5);`;

  const itemStyle = `padding:6px 16px;cursor:pointer;color:${COLORS.text};white-space:nowrap;`;
  let menuItems = `<div class="ctx-item" data-action="ref" style="${itemStyle}">📍 Nastavit jako referenci (INC)</div>`;
  if (ctxIdx !== null) {
    state.selected = ctxIdx;
    updateObjectList();
    updateProperties();
    renderAll();
    menuItems += `<div style="border-top:1px solid ${COLORS.surfaceHover};margin:2px 0"></div>`;
    menuItems += `<div class="ctx-item" data-action="mirror" style="${itemStyle}">🪞 Zrcadlit (Shift+M)</div>`;
    menuItems += `<div class="ctx-item" data-action="rotate" style="${itemStyle}">🔄 Otočit</div>`;
    menuItems += `<div class="ctx-item" data-action="array" style="${itemStyle}">📏 Lineární pole</div>`;
    menuItems += `<div class="ctx-item" data-action="offset" style="${itemStyle}">⇔ Offset</div>`;
    if (state.objects[ctxIdx] && state.objects[ctxIdx].type === 'polyline') {
      menuItems += `<div class="ctx-item" data-action="explode" style="${itemStyle}">💥 Rozložit konturu</div>`;
    }
    menuItems += `<div style="border-top:1px solid ${COLORS.surfaceHover};margin:2px 0"></div>`;
    menuItems += `<div class="ctx-item" data-action="delete" style="${itemStyle};color:${COLORS.delete}">🗑 Smazat</div>`;
  }
  menu.innerHTML = menuItems;
  document.body.appendChild(menu);

  menu.querySelectorAll('.ctx-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      menu.remove();
      if (action === 'ref') {
        state.incReference = { x: wx, y: wy };
        if (state.coordMode !== 'inc') state.coordMode = 'inc';
        updateCoordModeBtn();
        renderAll();
        showToast(`Reference: ${state.machineType === 'karusel' ? 'X' : 'Z'}=${wx.toFixed(3)} ${state.machineType === 'karusel' ? 'Z' : 'X'}=${wy.toFixed(3)}`);
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
    item.addEventListener('mouseenter', function() { this.style.background = COLORS.surfaceHover; });
    item.addEventListener('mouseleave', function() { this.style.background = ''; });
  });

  const closeMenu = (ev) => {
    if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', closeMenu); }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 0);
});

// ── Klik logika sdílená s touch ──
/**
 * Zpracování kliku na canvas (volané i z touch modulu).
 * @param {number} wx
 * @param {number} wy
 */
export function handleCanvasClick(wx, wy) {
  switch (state.tool) {
    case "select":
      selectObjectAt(wx, wy);
      break;

    case "move":
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
      break;

    case "point":
      addObject({
        type: "point",
        x: wx,
        y: wy,
        name: `Bod ${state.nextId}`,
      });
      break;

    case "line":
    case "constr":
    case "measure":
      if (!state.drawing) {
        if (state.tool === "measure") {
          // Klik na snap point (koncový bod, průsečík, střed) → začne měření
          // Klik na tělo objektu (ne snap point) → ukáže info o objektu
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
        }
        state.drawing = true;
        state.tempPoints = [{ x: wx, y: wy }];
        setHint(state.tool === "measure" ? "Klepněte na 2. bod pro měření" : "Klepněte na koncový bod");
        renderAll();
      } else {
        const tp = state.tempPoints[0];
        if (state.tool === "line" || state.tool === "constr") {
          if (Math.hypot(wx - tp.x, wy - tp.y) < 1e-9) {
            showToast("Úsečka má nulovou délku");
            state.drawing = false;
            state.tempPoints = [];
            resetHint();
            break;
          }
          addObject({
            type: state.tool === "constr" ? "constr" : "line",
            x1: tp.x,
            y1: tp.y,
            x2: wx,
            y2: wy,
            name: `${state.tool === "constr" ? "Konstr" : "Úsečka"} ${state.nextId}`,
            dashed: state.tool === "constr",
          });
        } else {
          // Odstraní dočasný coord label z 1. bodu
          const tempIdx = state.objects.findIndex(o => o.isMeasureTemp);
          if (tempIdx !== -1) state.objects.splice(tempIdx, 1);

          const d = Math.hypot(wx - tp.x, wy - tp.y);
          const angle =
            (Math.atan2(wy - tp.y, wx - tp.x) * 180) / Math.PI;
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
        }
        state.drawing = false;
        state.tempPoints = [];
        resetHint();
      }
      break;

    case "circle":
      if (!state.drawing) {
        state.drawing = true;
        state.tempPoints = [{ x: wx, y: wy }];
        setHint("Klepněte pro poloměr");
        renderAll();
      } else {
        const cp = state.tempPoints[0];
        const r = Math.hypot(wx - cp.x, wy - cp.y);
        if (r < 1e-9) {
          showToast("Kružnice má nulový poloměr");
          state.drawing = false;
          state.tempPoints = [];
          resetHint();
          break;
        }
        addObject({
          type: "circle",
          cx: cp.x,
          cy: cp.y,
          r,
          name: `Kružnice ${state.nextId}`,
        });
        state.drawing = false;
        state.tempPoints = [];
        resetHint();
      }
      break;

    case "arc":
      if (!state.drawing) {
        state.drawing = true;
        state.tempPoints = [{ x: wx, y: wy }];
        setHint("Klepněte na počáteční bod oblouku");
        renderAll();
      } else if (state.tempPoints.length === 1) {
        state.tempPoints.push({ x: wx, y: wy });
        setHint("Klepněte na koncový bod oblouku");
        renderAll();
      } else {
        const ctr = state.tempPoints[0],
          p1 = state.tempPoints[1];
        const r = Math.hypot(p1.x - ctr.x, p1.y - ctr.y);
        if (r < 1e-9) {
          showToast("Oblouk má nulový poloměr");
          state.drawing = false;
          state.tempPoints = [];
          resetHint();
          break;
        }
        const startAngle = Math.atan2(p1.y - ctr.y, p1.x - ctr.x);
        const endAngle = Math.atan2(wy - ctr.y, wx - ctr.x);
        addObject({
          type: "arc",
          cx: ctr.x,
          cy: ctr.y,
          r,
          startAngle,
          endAngle,
          name: `Oblouk ${state.nextId}`,
        });
        state.drawing = false;
        state.tempPoints = [];
        resetHint();
      }
      break;

    case "rect":
      if (!state.drawing) {
        state.drawing = true;
        state.tempPoints = [{ x: wx, y: wy }];
        setHint("Klepněte na protější roh");
        renderAll();
      } else {
        const rp = state.tempPoints[0];
        if (Math.abs(wx - rp.x) < 1e-9 && Math.abs(wy - rp.y) < 1e-9) {
          showToast("Obdélník má nulovou velikost");
          state.drawing = false;
          state.tempPoints = [];
          resetHint();
          break;
        }
        addObject({
          type: "rect",
          x1: rp.x,
          y1: rp.y,
          x2: wx,
          y2: wy,
          name: `Obdélník ${state.nextId}`,
        });
        state.drawing = false;
        state.tempPoints = [];
        resetHint();
      }
      break;

    case "polyline":
      if (!state.drawing) {
        state.drawing = true;
        state.tempPoints = [{ x: wx, y: wy }];
        state._polylineBulges = [];
        setHint("Klepněte na další bod kontury (Enter = dokončit, Shift+Enter = uzavřít, B = oblouk)");
        renderAll();
      } else {
        state.tempPoints.push({ x: wx, y: wy });
        // Add bulge=0 for the new segment
        if (!state._polylineBulges) state._polylineBulges = [];
        state._polylineBulges.push(0);
        setHint(`Bod ${state.tempPoints.length} přidán (Enter = dokončit, Shift+Enter = uzavřít, B = oblouk)`);
        renderAll();
      }
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
/** Spustí dialog pro rotaci vybraného objektu. */
function startRotateAction() {
  if (state.selected === null) { showToast("Nejdříve vyberte objekt"); return; }
  const obj = state.objects[state.selected];

  showRotateDialog(obj, (deg) => {
    pushUndo();
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
  if (state.selected === null) { showToast("Nejdříve vyberte objekt"); return; }
  // Pokud je vybrán segment kontury, smazat jen segment (případně rozdělit konturu)
  const selObj = state.objects[state.selected];
  if (selObj && selObj.type === 'polyline' && state.selectedSegment !== null) {
    deleteSelectedSegment();
    return;
  }
  pushUndo();
  state.objects.splice(state.selected, 1);
  state.selected = null;
  state.selectedSegment = null;
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
    state.objects.splice(state.selected, 1);
    state.selected = null;
    state.selectedSegment = null;
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
/** Spustí dialog pro zrcadlení vybraného objektu. */
function startMirrorAction() {
  if (state.selected === null) { showToast("Nejdříve vyberte objekt"); return; }
  const obj = state.objects[state.selected];

  showMirrorDialog(obj, (axis) => {
    if (axis === 'custom') {
      showToast("Klepněte na první bod osy zrcadlení");
      setHint("Klepněte na první bod osy zrcadlení");
      state._mirrorObj = obj;
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
          const copy = mirrorObject(state._mirrorObj, 'custom', p1, p2);
          addObject(copy);
          showToast("Objekt zrcadlen ✓");
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
      // Store cleanup so Escape/resetDrawingState can remove listeners
      state._mirrorCleanup = cleanupMirrorListeners;
    } else {
      const copy = mirrorObject(obj, axis, null, null);
      addObject(copy);
      showToast(`Objekt zrcadlen podle osy ${axis === 'x' ? 'X' : 'Z'} ✓`);
    }
  });
}

// ── Lineární pole akce ──
/** Spustí dialog pro vytvoření lineárního pole z vybraného objektu. */
function startLinearArrayAction() {
  if (state.selected === null) { showToast("Nejdříve vyberte objekt"); return; }
  const obj = state.objects[state.selected];

  showLinearArrayDialog(obj, (dx, dz, count) => {
    const copies = linearArray(obj, dx, dz, count);
    for (const copy of copies) {
      addObject(copy);
    }
    showToast(`Vytvořeno ${copies.length} kopií`);
  });
}

// Export pro ui.js context menu
export { startMirrorAction, startLinearArrayAction, startRotateAction, deleteSelected };

// ── Tlačítka Smazat a Otočit ──
document.getElementById("btnDelete").addEventListener("click", deleteSelected);
document.getElementById("btnRotate").addEventListener("click", startRotateAction);

// ── Double-click: dokončit konturu / vybrat segment ──
drawCanvas.addEventListener("dblclick", (e) => {
  if (state.drawing && state.tool === "polyline" && state.tempPoints.length >= 2) {
    e.preventDefault();
    // Remove the last point that was added by the second click of dblclick
    // (the first click of dblclick already added a point via mousedown)
    const bulges = state._polylineBulges || [];
    while (bulges.length < state.tempPoints.length - 1) bulges.push(0);
    addObject({
      type: 'polyline',
      vertices: state.tempPoints.slice(),
      bulges: bulges.slice(0, state.tempPoints.length - 1),
      closed: false,
      name: `Kontura ${state.nextId}`,
    });
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
      state.selectedSegment = findSegmentAt(state.objects[idx], wx, wy);
      updateProperties();
      updateObjectList();
      renderAll();
      showToast(`Segment ${(state.selectedSegment || 0) + 1} vybrán`);
    }
  }
});
