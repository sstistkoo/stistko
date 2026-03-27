// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Myš, klávesnice, kolečko                          ║
// ╚══════════════════════════════════════════════════════════════╝

import { drawCanvas, screenToWorld, snapPt, applyAngleSnap } from './canvas.js';
import { state, pushUndo, undo, redo, showToast, toDisplayCoords } from './state.js';
import { renderAll } from './render.js';
import { moveObject, addObject } from './objects.js';
import { setTool, resetHint, setHint, updateProperties, updateObjectList, updateSnapPtsBtn, updateDimsBtn, toggleCoordMode, updateCoordModeBtn, updateSnapGridBtn, updateAngleSnapBtn, showGridSizeDialog, showAngleSnapDialog, toggleHelp } from './ui.js';
import { findObjectAt, selectObjectAt, calculateAllIntersections, tangentsFromPointToCircle, tangentsTwoCircles, offsetObject, mirrorObject, linearArray, getLines, getCircles, intersectLineLine, intersectLineCircle, rotateObject, filletTwoLines, projectPointToLine, circlePositionsTangentToLine, circlePositionsTangentToTwoLines, findSegmentAt } from './geometry.js';
import { showNumericalInputDialog, showPolarDrawingDialog, showMeasureResult, showCircleRadiusDialog, showIntersectionInfo, showMeasureObjectInfo, showBulgeDialog, showTangentChoiceDialog, showTangentPositionDialog, showOffsetDialog, showMirrorDialog, showLinearArrayDialog, showRotateDialog, showFilletDialog, addDimensionForObject } from './dialogs.js';
import { saveProject, showExportImageDialog, showProjectsDialog, showSaveAsDialog } from './storage.js';
import { bulgeToArc } from './utils.js';
import { bridge } from './bridge.js';

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
    document.getElementById("coordDisplay").textContent =
      `${prefix}X: ${d.x.toFixed(3)}   ${prefix}Z: ${d.y.toFixed(3)}${extra}`;
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
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const rect = drawCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    state.panX = mx - (mx - state.panX) * factor;
    state.panY = my - (my - state.panY) * factor;
    state.zoom *= factor;
    state.zoom = Math.max(0.05, Math.min(200, state.zoom));
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
    state.drawing = false;
    state.tempPoints = [];
    state._polylineBulges = [];
    state._parallelRefIdx = null;
    state._parallelRefSeg = null;
    state._snapPointState = null;
    state._tangentMode = null;
    state._tangentFirstCircle = null;
    state._tangentFirstLine = null;
    state.selected = null;
    state.selectedSegment = null;
    state._selectedConstraint = null;
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
      moveObject(copy, 10, 10);
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
  menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;background:#313244;border:1px solid #585b70;border-radius:6px;padding:4px 0;z-index:9999;font-size:13px;font-family:Consolas,monospace;box-shadow:0 4px 12px rgba(0,0,0,.5);`;

  const itemStyle = 'padding:6px 16px;cursor:pointer;color:#cdd6f4;white-space:nowrap;';
  let menuItems = `<div class="ctx-item" data-action="ref" style="${itemStyle}">📍 Nastavit jako referenci (INC)</div>`;
  if (ctxIdx !== null) {
    state.selected = ctxIdx;
    updateObjectList();
    updateProperties();
    renderAll();
    menuItems += `<div style="border-top:1px solid #45475a;margin:2px 0"></div>`;
    menuItems += `<div class="ctx-item" data-action="mirror" style="${itemStyle}">🪞 Zrcadlit (Shift+M)</div>`;
    menuItems += `<div class="ctx-item" data-action="rotate" style="${itemStyle}">🔄 Otočit</div>`;
    menuItems += `<div class="ctx-item" data-action="array" style="${itemStyle}">📏 Lineární pole</div>`;
    menuItems += `<div class="ctx-item" data-action="offset" style="${itemStyle}">⇔ Offset</div>`;
    if (state.objects[ctxIdx] && state.objects[ctxIdx].type === 'polyline') {
      menuItems += `<div class="ctx-item" data-action="explode" style="${itemStyle}">💥 Rozložit konturu</div>`;
    }
    menuItems += `<div style="border-top:1px solid #45475a;margin:2px 0"></div>`;
    menuItems += `<div class="ctx-item" data-action="delete" style="${itemStyle};color:#f38ba8">🗑 Smazat</div>`;
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
        showToast(`Reference: X=${wx.toFixed(3)} Z=${wy.toFixed(3)}`);
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
    item.addEventListener('mouseenter', function() { this.style.background = '#45475a'; });
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
        // Měření: nejdříve průsečíky, pak objekty
        if (state.tool === "measure") {
          const intThreshold = 12 / state.zoom;
          let nearestInt = null, nearestIntD = Infinity;
          for (const pt of state.intersections) {
            const d = Math.hypot(pt.x - wx, pt.y - wy);
            if (d < intThreshold && d < nearestIntD) {
              nearestIntD = d;
              nearestInt = pt;
            }
          }
          if (nearestInt) {
            showIntersectionInfo(nearestInt);
            return;
          }
          const idx = findObjectAt(wx, wy);
          if (idx !== null) {
            showMeasureObjectInfo(state.objects[idx], wx, wy, idx);
            return;
          }
        }
        state.drawing = true;
        state.tempPoints = [{ x: wx, y: wy }];
        setHint("Klepněte na koncový bod");
      } else {
        const tp = state.tempPoints[0];
        if (state.tool === "line" || state.tool === "constr") {
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
          const d = Math.hypot(wx - tp.x, wy - tp.y);
          const angle =
            (Math.atan2(wy - tp.y, wx - tp.x) * 180) / Math.PI;
          showMeasureResult(tp, { x: wx, y: wy }, d, angle);
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
      } else {
        const cp = state.tempPoints[0];
        const r = Math.hypot(wx - cp.x, wy - cp.y);
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
      } else if (state.tempPoints.length === 1) {
        state.tempPoints.push({ x: wx, y: wy });
        setHint("Klepněte na koncový bod oblouku");
      } else {
        const ctr = state.tempPoints[0],
          p1 = state.tempPoints[1];
        const r = Math.hypot(p1.x - ctr.x, p1.y - ctr.y);
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
      } else {
        const rp = state.tempPoints[0];
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
      } else {
        state.tempPoints.push({ x: wx, y: wy });
        // Add bulge=0 for the new segment
        if (!state._polylineBulges) state._polylineBulges = [];
        state._polylineBulges.push(0);
        setHint(`Bod ${state.tempPoints.length} přidán (Enter = dokončit, Shift+Enter = uzavřít, B = oblouk)`);
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

// ── Tečna – click logika ──
function handleTangentClick(wx, wy) {
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

// ── Offset – click logika ──
function handleOffsetClick(wx, wy) {
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
        cleanupSideListeners();
        onSideClick(e);
      }
    }

    drawCanvas.addEventListener("click", onSideClick);
    drawCanvas.addEventListener("touchend", onSideTouch);
  });
}

// ── Helper: get line-like segment from object (line, constr, or polyline segment) ──
/**
 * Vrátí segment (x1,y1,x2,y2) a setter funkce pro úpravy.
 * @returns {{ seg: {x1,y1,x2,y2}, setP1: function, setP2: function, segIdx: number|null } | null}
 */
function getLineSegment(obj, wx, wy) {
  if (obj.type === 'line' || obj.type === 'constr') {
    return {
      seg: { x1: obj.x1, y1: obj.y1, x2: obj.x2, y2: obj.y2 },
      setP1: (x, y) => { obj.x1 = x; obj.y1 = y; },
      setP2: (x, y) => { obj.x2 = x; obj.y2 = y; },
      segIdx: null
    };
  }
  if (obj.type === 'polyline') {
    const si = findSegmentAt(obj, wx, wy);
    if (si === null) return null;
    const b = obj.bulges[si] || 0;
    if (b !== 0) return null; // arc segments not supported
    const n = obj.vertices.length;
    const p1 = obj.vertices[si];
    const p2 = obj.vertices[(si + 1) % n];
    return {
      seg: { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y },
      setP1: (x, y) => { p1.x = x; p1.y = y; },
      setP2: (x, y) => { p2.x = x; p2.y = y; },
      segIdx: si
    };
  }
  return null;
}

// ── Oříznutí úsečky ──
/** Ořízne úsečku k nejbližšímu průsečíku na straně kliknutí. */
function handleTrimClick(wx, wy) {
  const idx = findObjectAt(wx, wy);
  if (idx === null) { showToast("Klepněte na úsečku k oříznutí"); return; }
  const obj = state.objects[idx];
  const ls = getLineSegment(obj, wx, wy);
  if (!ls) {
    showToast("Oříznutí funguje pouze pro úsečky a rovné segmenty kontur");
    return;
  }

  // Collect all intersection points on this line segment from other objects
  const pts = [];
  const lineSeg = { x1: ls.seg.x1, y1: ls.seg.y1, x2: ls.seg.x2, y2: ls.seg.y2, isConstr: false };
  for (let i = 0; i < state.objects.length; i++) {
    if (i === idx) continue;
    const other = state.objects[i];
    for (const seg of getLines(other)) {
      pts.push(...intersectLineLine(lineSeg, seg));
    }
    for (const circ of getCircles(other)) {
      pts.push(...intersectLineCircle(lineSeg, circ));
    }
  }

  if (pts.length === 0) { showToast("Žádný průsečík pro oříznutí"); return; }

  // Determine which end of the line is closer to click point
  const d1 = Math.hypot(wx - ls.seg.x1, wy - ls.seg.y1);
  const d2 = Math.hypot(wx - ls.seg.x2, wy - ls.seg.y2);
  const trimEnd = d1 < d2 ? 1 : 2; // 1 = trim start(x1,y1), 2 = trim end(x2,y2)

  // Find intersection closest to the trimmed end
  let bestPt = null, bestDist = Infinity;
  for (const p of pts) {
    const d = trimEnd === 1
      ? Math.hypot(p.x - ls.seg.x1, p.y - ls.seg.y1)
      : Math.hypot(p.x - ls.seg.x2, p.y - ls.seg.y2);
    if (d < bestDist && d > 1e-9) {
      bestDist = d;
      bestPt = p;
    }
  }
  if (!bestPt) { showToast("Žádný vhodný průsečík"); return; }

  pushUndo();
  if (trimEnd === 1) { ls.setP1(bestPt.x, bestPt.y); }
  else { ls.setP2(bestPt.x, bestPt.y); }

  calculateAllIntersections();
  renderAll();
  showToast("Oříznuto ✓");
}

// ── Prodloužení úsečky ──
/** Prodlouží úsečku k nejbližšímu průsečíku s jiným objektem na straně kliknutí. */
function handleExtendClick(wx, wy) {
  const idx = findObjectAt(wx, wy);
  if (idx === null) { showToast("Klepněte na úsečku k prodloužení"); return; }
  const obj = state.objects[idx];
  const ls = getLineSegment(obj, wx, wy);
  if (!ls) {
    showToast("Prodloužení funguje pouze pro úsečky a rovné segmenty kontur");
    return;
  }

  // Which end to extend (closer to click)
  const d1 = Math.hypot(wx - ls.seg.x1, wy - ls.seg.y1);
  const d2 = Math.hypot(wx - ls.seg.x2, wy - ls.seg.y2);
  const extEnd = d1 < d2 ? 1 : 2;

  // Create an infinite line (construction) to find intersections beyond the segment
  const infLine = { x1: ls.seg.x1, y1: ls.seg.y1, x2: ls.seg.x2, y2: ls.seg.y2, isConstr: true };

  const pts = [];
  for (let i = 0; i < state.objects.length; i++) {
    if (i === idx) continue;
    const other = state.objects[i];
    for (const seg of getLines(other)) {
      pts.push(...intersectLineLine(infLine, seg));
    }
    for (const circ of getCircles(other)) {
      pts.push(...intersectLineCircle(infLine, circ));
    }
  }

  if (pts.length === 0) { showToast("Žádný objekt pro prodloužení"); return; }

  // Filter: only points beyond the extended end (along the line direction)
  const dx = ls.seg.x2 - ls.seg.x1, dy = ls.seg.y2 - ls.seg.y1;
  const len2 = dx * dx + dy * dy;
  const candidates = [];
  for (const p of pts) {
    const t = ((p.x - ls.seg.x1) * dx + (p.y - ls.seg.y1) * dy) / len2;
    // extEnd=1: we extend beyond x1, so t < 0
    // extEnd=2: we extend beyond x2, so t > 1
    if (extEnd === 1 && t < 1e-9) {
      candidates.push({ pt: p, dist: Math.hypot(p.x - ls.seg.x1, p.y - ls.seg.y1) });
    } else if (extEnd === 2 && t > 1 - 1e-9) {
      candidates.push({ pt: p, dist: Math.hypot(p.x - ls.seg.x2, p.y - ls.seg.y2) });
    }
  }

  if (candidates.length === 0) { showToast("Žádný průsečík ve směru prodloužení"); return; }

  // Pick closest
  candidates.sort((a, b) => a.dist - b.dist);
  const best = candidates[0].pt;

  pushUndo();
  if (extEnd === 1) { ls.setP1(best.x, best.y); }
  else { ls.setP2(best.x, best.y); }

  calculateAllIntersections();
  renderAll();
  showToast("Prodlouženo ✓");
}

// ── Zaoblení (Fillet) ──
/** Klik na první úsečku → dialog → klik na druhou → zaoblení. */
function handleFilletClick(wx, wy) {
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

// ── Vazby (constraints) – helper ──
/** Nastaví vazbu na objekt/segment.
 *  Pro úsečky: obj.constraint = type
 *  Pro kontury: obj.segConstraints = { segIdx: type, ... }
 */
function setConstraint(obj, segIdx, type) {
  if (segIdx !== null && segIdx !== undefined) {
    if (!obj.segConstraints) obj.segConstraints = {};
    obj.segConstraints[segIdx] = type;
  } else {
    obj.constraint = type;
  }
}

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

// ── Vodorovnost – click logika ──
/** Vyrovná úsečku/segment kontury do vodorovné polohy.
 *  Kotevní bod = koncový bod bližší ke kliknutí (zůstane na místě),
 *  druhý koncový bod se posune vodorovně ve stejném směru. */
function handleHorizontalClick(wx, wy) {
  const idx = findObjectAt(wx, wy);
  if (idx === null) { showToast("Klepněte na úsečku nebo segment kontury"); return; }
  const obj = state.objects[idx];
  const ls = getLineSegment(obj, wx, wy);
  if (!ls) {
    showToast("Vodorovnost funguje pouze pro úsečky a rovné segmenty kontur");
    return;
  }

  const len = Math.hypot(ls.seg.x2 - ls.seg.x1, ls.seg.y2 - ls.seg.y1);
  // Zjistit, ke kterému konci je klik blíž → ten bude kotva
  const d1 = Math.hypot(wx - ls.seg.x1, wy - ls.seg.y1);
  const d2 = Math.hypot(wx - ls.seg.x2, wy - ls.seg.y2);
  // Zachovat původní směr (dx kladné/záporné)
  const sign = (ls.seg.x2 - ls.seg.x1) >= 0 ? 1 : -1;

  pushUndo();
  if (d1 <= d2) {
    // P1 je kotva, P2 se posune
    ls.setP2(ls.seg.x1 + sign * len, ls.seg.y1);
  } else {
    // P2 je kotva, P1 se posune
    ls.setP1(ls.seg.x2 - sign * len, ls.seg.y2);
  }

  // Uložit vazbu na objekt
  setConstraint(obj, ls.segIdx, 'horizontal');

  calculateAllIntersections();
  renderAll();
  showToast("Vyrovnáno vodorovně ✓");
}

// ── Kolmost – click logika ──
/** Vyrovná úsečku/segment kontury do svislé polohy.
 *  Kotevní bod = koncový bod bližší ke kliknutí (zůstane na místě),
 *  druhý koncový bod se posune svisle ve stejném směru. */
function handlePerpClick(wx, wy) {
  const idx = findObjectAt(wx, wy);
  if (idx === null) { showToast("Klepněte na úsečku nebo segment kontury"); return; }
  const obj = state.objects[idx];
  const ls = getLineSegment(obj, wx, wy);
  if (!ls) {
    showToast("Kolmost funguje pouze pro úsečky a rovné segmenty kontur");
    return;
  }

  const len = Math.hypot(ls.seg.x2 - ls.seg.x1, ls.seg.y2 - ls.seg.y1);
  // Zjistit, ke kterému konci je klik blíž → ten bude kotva
  const d1 = Math.hypot(wx - ls.seg.x1, wy - ls.seg.y1);
  const d2 = Math.hypot(wx - ls.seg.x2, wy - ls.seg.y2);
  // Zachovat původní směr (dy kladné/záporné)
  const sign = (ls.seg.y2 - ls.seg.y1) >= 0 ? 1 : -1;

  pushUndo();
  if (d1 <= d2) {
    // P1 je kotva, P2 se posune svisle
    ls.setP2(ls.seg.x1, ls.seg.y1 + sign * len);
  } else {
    // P2 je kotva, P1 se posune svisle
    ls.setP1(ls.seg.x2, ls.seg.y2 - sign * len);
  }

  // Uložit vazbu na objekt
  setConstraint(obj, ls.segIdx, 'vertical');

  calculateAllIntersections();
  renderAll();
  showToast("Vyrovnáno svisle ✓");
}

// ── Rovnoběžka – click logika ──
function handleParallelClick(wx, wy) {
  if (!state.drawing) {
    // 1. klik: vyber úsečku nebo segment kontury
    const idx = findObjectAt(wx, wy);
    if (idx === null) { showToast("Klepněte na úsečku"); return; }
    const obj = state.objects[idx];
    const ls = getLineSegment(obj, wx, wy);
    if (!ls) {
      showToast("Rovnoběžka funguje pouze pro úsečky a rovné segmenty kontur");
      return;
    }
    state.drawing = true;
    state._parallelRefIdx = idx;
    state._parallelRefSeg = ls;
    state._parallelClickX = wx;
    state._parallelClickY = wy;
    state.selected = idx;
    state.selectedSegment = ls.segIdx;  // zvýrazní jen kliknutý segment kontury
    renderAll();
    setHint("Klepněte na úsečku → otočí první do rovnoběžnosti, nebo na bod → nová rovnoběžka");
  } else {
    const refSeg = state._parallelRefSeg;
    if (!refSeg) { state.drawing = false; resetHint(); return; }

    // Podívat se, zda 2. klik je na jinou úsečku/segment
    const idx2 = findObjectAt(wx, wy);
    if (idx2 !== null) {
      const obj2 = state.objects[idx2];
      const ls2 = getLineSegment(obj2, wx, wy);
      if (ls2 && !(idx2 === state._parallelRefIdx && ls2.segIdx === refSeg.segIdx)) {
        // Režim: otočit první segment do rovnoběžnosti s druhým
        const refAngle = Math.atan2(ls2.seg.y2 - ls2.seg.y1, ls2.seg.x2 - ls2.seg.x1);
        const curAngle = Math.atan2(refSeg.seg.y2 - refSeg.seg.y1, refSeg.seg.x2 - refSeg.seg.x1);
        // Vybrat bližší z refAngle a refAngle+π (obojí je rovnoběžné)
        let targetAngle = refAngle;
        const diff1 = Math.abs(Math.atan2(Math.sin(refAngle - curAngle), Math.cos(refAngle - curAngle)));
        const alt = refAngle + Math.PI;
        const diff2 = Math.abs(Math.atan2(Math.sin(alt - curAngle), Math.cos(alt - curAngle)));
        if (diff2 < diff1) targetAngle = alt;

        const len = Math.hypot(refSeg.seg.x2 - refSeg.seg.x1, refSeg.seg.y2 - refSeg.seg.y1);
        // Kotevní bod = konec bližší k prvnímu kliknutí (zachová propojení kontury)
        const cx = state._parallelClickX, cy = state._parallelClickY;
        const d1 = Math.hypot(cx - refSeg.seg.x1, cy - refSeg.seg.y1);
        const d2 = Math.hypot(cx - refSeg.seg.x2, cy - refSeg.seg.y2);

        pushUndo();
        if (d1 <= d2) {
          // P1 je kotva
          refSeg.setP2(refSeg.seg.x1 + len * Math.cos(targetAngle), refSeg.seg.y1 + len * Math.sin(targetAngle));
        } else {
          // P2 je kotva
          refSeg.setP1(refSeg.seg.x2 - len * Math.cos(targetAngle), refSeg.seg.y2 - len * Math.sin(targetAngle));
        }
        // Uložit vazbu na objekt
        setConstraint(state.objects[state._parallelRefIdx], refSeg.segIdx, 'parallel');

        showToast("Otočeno do rovnoběžnosti ✓");
        state.drawing = false;
        state._parallelRefIdx = null;
        state._parallelRefSeg = null;
        state.selectedSegment = null;
        calculateAllIntersections();
        renderAll();
        resetHint();
        return;
      }
    }

    // Režim: nová rovnoběžka procházející bodem (původní chování)
    const dx = refSeg.seg.x2 - refSeg.seg.x1;
    const dy = refSeg.seg.y2 - refSeg.seg.y1;
    pushUndo();
    addObject({
      type: 'line',
      x1: wx - dx / 2, y1: wy - dy / 2,
      x2: wx + dx / 2, y2: wy + dy / 2,
      name: `Rovnoběžka ${state.nextId}`,
    });
    showToast("Rovnoběžka vytvořena ✓");
    state.drawing = false;
    state._parallelRefIdx = null;
    state._parallelRefSeg = null;
    state.selectedSegment = null;
    calculateAllIntersections();
    renderAll();
    resetHint();
  }
}

// ── Kóta – click logika ──
function handleDimensionClick(wx, wy) {
  if (!state.drawing) {
    // Režim B: klik na existující objekt → přidá kótu
    const idx = findObjectAt(wx, wy);
    if (idx !== null) {
      const obj = state.objects[idx];
      pushUndo();
      addDimensionForObject(obj);
      calculateAllIntersections();
      renderAll();
      return;
    }
    // Režim A: 2 body – 1. klik
    state.drawing = true;
    state.tempPoints = [{ x: wx, y: wy }];
    setHint("Klepněte na druhý bod pro kótu");
  } else {
    // 2. klik – dokončit kótu mezi body
    const p1 = state.tempPoints[0];
    const d = Math.hypot(wx - p1.x, wy - p1.y);
    if (d < 1e-6) { showToast("Body jsou totožné"); return; }
    pushUndo();
    addObject({
      type: 'line',
      x1: p1.x, y1: p1.y,
      x2: wx, y2: wy,
      name: `Kóta ${d.toFixed(2)}mm`,
      isDimension: true,
      color: '#9399b2',
      layer: 2,
    });
    showToast(`Kóta ${d.toFixed(2)}mm přidána ✓`);
    state.drawing = false;
    state.tempPoints = [];
    calculateAllIntersections();
    renderAll();
    resetHint();
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

      // Add second half as new object
      if (verts2.length >= 2) {
        const newObj = {
          type: 'polyline',
          vertices: verts2,
          bulges: bulges2,
          closed: false,
          name: `Kontura ${state.nextId}`,
          layer: obj.layer,
          color: obj.color,
        };
        addObject(newObj);
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
          drawCanvas.removeEventListener("click", handleMirrorClick);
          drawCanvas.removeEventListener("touchend", handleMirrorTouch);
          const p1 = state._mirrorAxisPoints[0];
          const p2 = { x: mwx, y: mwy };
          const copy = mirrorObject(state._mirrorObj, 'custom', p1, p2);
          addObject(copy);
          showToast("Objekt zrcadlen ✓");
          resetHint();
          state._mirrorObj = null;
          state._mirrorStep = null;
          state._mirrorAxisPoints = null;
        }
      }

      function handleMirrorTouch(e) {
        if (e.changedTouches.length === 1) { e.preventDefault(); handleMirrorClick(e); }
      }

      drawCanvas.addEventListener("click", handleMirrorClick);
      drawCanvas.addEventListener("touchend", handleMirrorTouch);
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

// ── Přichytit bod – přesun koncového bodu k jinému snap bodu ──
/**
 * Najde nejbližší koncový/klíčový bod objektu k zadaným souřadnicím.
 * Vrátí { objIdx, propKey (nebo vertexIdx), x, y, dist }.
 */
function findNearestEndpoint(wx, wy) {
  const threshold = 20 / state.zoom;
  let best = null;
  state.objects.forEach((obj, idx) => {
    const layer = state.layers ? state.layers.find(l => l.id === obj.layer) : null;
    if (layer && (layer.locked || !layer.visible)) return;
    const candidates = [];
    switch (obj.type) {
      case 'point':
        candidates.push({ key: 'xy', x: obj.x, y: obj.y });
        break;
      case 'line':
      case 'constr':
        candidates.push({ key: 'p1', x: obj.x1, y: obj.y1 });
        candidates.push({ key: 'p2', x: obj.x2, y: obj.y2 });
        break;
      case 'circle':
        candidates.push({ key: 'center', x: obj.cx, y: obj.cy });
        break;
      case 'arc':
        candidates.push({ key: 'center', x: obj.cx, y: obj.cy });
        break;
      case 'rect':
        candidates.push({ key: 'p1', x: obj.x1, y: obj.y1 });
        candidates.push({ key: 'p2', x: obj.x2, y: obj.y2 });
        break;
      case 'polyline':
        obj.vertices.forEach((v, vi) => {
          candidates.push({ key: 'v' + vi, x: v.x, y: v.y, vertexIdx: vi });
        });
        break;
    }
    for (const c of candidates) {
      const d = Math.hypot(c.x - wx, c.y - wy);
      if (d < threshold && (!best || d < best.dist)) {
        best = { objIdx: idx, key: c.key, x: c.x, y: c.y, dist: d, vertexIdx: c.vertexIdx };
      }
    }
  });
  return best;
}

/** Přesune koncový bod objektu na novou pozici. */
function moveEndpoint(objIdx, key, nx, ny) {
  const obj = state.objects[objIdx];
  switch (key) {
    case 'xy':
      obj.x = nx; obj.y = ny;
      break;
    case 'p1':
      obj.x1 = nx; obj.y1 = ny;
      break;
    case 'p2':
      obj.x2 = nx; obj.y2 = ny;
      break;
    case 'center':
      obj.cx = nx; obj.cy = ny;
      break;
    default:
      if (key.startsWith('v') && obj.type === 'polyline') {
        const vi = parseInt(key.substring(1), 10);
        if (obj.vertices[vi]) {
          obj.vertices[vi].x = nx;
          obj.vertices[vi].y = ny;
        }
      }
      break;
  }
}

function handleSnapPointClick(wx, wy) {
  if (!state._snapPointState) {
    // Krok 1: vyber koncový bod
    const ep = findNearestEndpoint(wx, wy);
    if (!ep) {
      showToast("Klepněte blíž ke koncovému bodu objektu");
      return;
    }
    state._snapPointState = ep;
    state.selected = ep.objIdx;
    updateProperties();
    setHint("Klepněte na cílový bod (snap) pro přichycení");
    showToast("Bod vybrán – klepněte na cílový bod");
    renderAll();
  } else {
    // Krok 2: přesuň na cílový bod
    pushUndo();
    const src = state._snapPointState;
    moveEndpoint(src.objIdx, src.key, wx, wy);
    calculateAllIntersections();
    showToast("Bod přichycen");
    state._snapPointState = null;
    resetHint();
    renderAll();
  }
}

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
