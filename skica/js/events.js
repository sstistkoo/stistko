// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Myš, klávesnice, kolečko                          ║
// ╚══════════════════════════════════════════════════════════════╝

import { drawCanvas, screenToWorld, snapPt, applyAngleSnap } from './canvas.js';
import { state, pushUndo, undo, redo, showToast, toDisplayCoords } from './state.js';
import { renderAll } from './render.js';
import { moveObject, addObject } from './objects.js';
import { setTool, resetHint, setHint, updateProperties, updateObjectList, updateSnapPtsBtn, updateDimsBtn, toggleCoordMode, updateCoordModeBtn, updateSnapGridBtn, updateAngleSnapBtn, showGridSizeDialog, showAngleSnapDialog, toggleHelp } from './ui.js';
import { findObjectAt, selectObjectAt, calculateAllIntersections, tangentsFromPointToCircle, tangentsTwoCircles, offsetObject, mirrorObject, linearArray, getLines, getCircles, intersectLineLine, intersectLineCircle, rotateObject, filletTwoLines } from './geometry.js';
import { showNumericalInputDialog, showPolarDrawingDialog, showMeasureResult, showCircleRadiusDialog, showIntersectionInfo, showMeasureObjectInfo, showBulgeDialog, showTangentChoiceDialog, showOffsetDialog, showMirrorDialog, showLinearArrayDialog, showRotateDialog, showFilletDialog } from './dialogs.js';
import { saveProject, showExportImageDialog, showProjectsDialog, showSaveAsDialog } from './storage.js';
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
      && ['line', 'constr', 'polyline', 'measure'].includes(state.tool)) {
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
    if (helpOverlay && helpOverlay.style.display !== 'none') {
      helpOverlay.style.display = 'none';
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
    state.selected = null;
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
  };
  // Shift+M = mirror, Shift+N = polar, Shift+G = angle snap – skip tool shortcuts
  if (!(e.shiftKey && ['m','n','g'].includes(e.key.toLowerCase())) && shortcuts[e.key.toLowerCase()])
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
    pushUndo();
    state.objects.splice(state.selected, 1);
    state.selected = null;
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
            showMeasureObjectInfo(state.objects[idx], wx, wy);
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
        state._tangentMode = 'circle-circle';
        state._tangentFirstCircle = idx;
        setHint("Klepněte na druhou kružnici/oblouk pro tečny");
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
    } else if (state._tangentMode === 'circle-circle') {
      // Druhý klik: druhá kružnice
      const idx = findObjectAt(wx, wy);
      if (idx === null) { showToast("Klepněte na kružnici nebo oblouk"); return; }
      const obj = state.objects[idx];
      if (obj.type !== 'circle' && obj.type !== 'arc') {
        showToast("Vyberte kružnici nebo oblouk");
        return;
      }
      if (idx === state._tangentFirstCircle) {
        showToast("Vyberte jinou kružnici");
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
    }
    state.drawing = false;
    state.tempPoints = [];
    state._tangentMode = null;
    state._tangentFirstCircle = null;
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

// ── Oříznutí úsečky ──
/** Ořízne úsečku k nejbližšímu průsečíku na straně kliknutí. */
function handleTrimClick(wx, wy) {
  const idx = findObjectAt(wx, wy);
  if (idx === null) { showToast("Klepněte na úsečku k oříznutí"); return; }
  const obj = state.objects[idx];
  if (obj.type !== "line" && obj.type !== "constr") {
    showToast("Oříznutí funguje pouze pro úsečky");
    return;
  }

  // Collect all intersection points on this line segment from other objects
  const pts = [];
  const lineSeg = { x1: obj.x1, y1: obj.y1, x2: obj.x2, y2: obj.y2, isConstr: false };
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
  const d1 = Math.hypot(wx - obj.x1, wy - obj.y1);
  const d2 = Math.hypot(wx - obj.x2, wy - obj.y2);
  const trimEnd = d1 < d2 ? 1 : 2; // 1 = trim start(x1,y1), 2 = trim end(x2,y2)

  // Find intersection closest to the trimmed end
  let bestPt = null, bestDist = Infinity;
  for (const p of pts) {
    const d = trimEnd === 1
      ? Math.hypot(p.x - obj.x1, p.y - obj.y1)
      : Math.hypot(p.x - obj.x2, p.y - obj.y2);
    if (d < bestDist && d > 1e-9) {
      bestDist = d;
      bestPt = p;
    }
  }
  if (!bestPt) { showToast("Žádný vhodný průsečík"); return; }

  pushUndo();
  if (trimEnd === 1) { obj.x1 = bestPt.x; obj.y1 = bestPt.y; }
  else { obj.x2 = bestPt.x; obj.y2 = bestPt.y; }

  calculateAllIntersections();
  renderAll();
  showToast("Úsečka oříznuta ✓");
}

// ── Prodloužení úsečky ──
/** Prodlouží úsečku k nejbližšímu průsečíku s jiným objektem na straně kliknutí. */
function handleExtendClick(wx, wy) {
  const idx = findObjectAt(wx, wy);
  if (idx === null) { showToast("Klepněte na úsečku k prodloužení"); return; }
  const obj = state.objects[idx];
  if (obj.type !== "line" && obj.type !== "constr") {
    showToast("Prodloužení funguje pouze pro úsečky");
    return;
  }

  // Which end to extend (closer to click)
  const d1 = Math.hypot(wx - obj.x1, wy - obj.y1);
  const d2 = Math.hypot(wx - obj.x2, wy - obj.y2);
  const extEnd = d1 < d2 ? 1 : 2;

  // Create an infinite line (construction) to find intersections beyond the segment
  const infLine = { x1: obj.x1, y1: obj.y1, x2: obj.x2, y2: obj.y2, isConstr: true };

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
  const dx = obj.x2 - obj.x1, dy = obj.y2 - obj.y1;
  const len2 = dx * dx + dy * dy;
  const candidates = [];
  for (const p of pts) {
    const t = ((p.x - obj.x1) * dx + (p.y - obj.y1) * dy) / len2;
    // extEnd=1: we extend beyond x1, so t < 0
    // extEnd=2: we extend beyond x2, so t > 1
    if (extEnd === 1 && t < 1e-9) {
      candidates.push({ pt: p, dist: Math.hypot(p.x - obj.x1, p.y - obj.y1) });
    } else if (extEnd === 2 && t > 1 - 1e-9) {
      candidates.push({ pt: p, dist: Math.hypot(p.x - obj.x2, p.y - obj.y2) });
    }
  }

  if (candidates.length === 0) { showToast("Žádný průsečík ve směru prodloužení"); return; }

  // Pick closest
  candidates.sort((a, b) => a.dist - b.dist);
  const best = candidates[0].pt;

  pushUndo();
  if (extEnd === 1) { obj.x1 = best.x; obj.y1 = best.y; }
  else { obj.x2 = best.x; obj.y2 = best.y; }

  calculateAllIntersections();
  renderAll();
  showToast("Úsečka prodloužena ✓");
}

// ── Zaoblení (Fillet) ──
/** Klik na první úsečku → dialog → klik na druhou → zaoblení. */
function handleFilletClick(wx, wy) {
  const idx = findObjectAt(wx, wy);
  if (idx === null) { showToast("Klepněte na první úsečku pro zaoblení"); return; }
  const obj1 = state.objects[idx];
  if (obj1.type !== "line" && obj1.type !== "constr") {
    showToast("Zaoblení funguje pouze mezi úsečkami");
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
      if (idx2 === null || idx2 === idx) { showToast("Klepněte na jinou úsečku"); return; }
      const obj2 = state.objects[idx2];
      if (obj2.type !== "line" && obj2.type !== "constr") { showToast("Zaoblení funguje pouze mezi úsečkami"); return; }

      drawCanvas.removeEventListener("click", onSecondClick);
      drawCanvas.removeEventListener("touchend", onSecondTouch);

      pushUndo();
      const result = filletTwoLines(obj1, obj2, radius);
      if (!result.ok) { showToast(result.msg); return; }

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

// ── Smazání vybraného objektu ──
function deleteSelected() {
  if (state.selected === null) { showToast("Nejdříve vyberte objekt"); return; }
  pushUndo();
  state.objects.splice(state.selected, 1);
  state.selected = null;
  updateObjectList();
  updateProperties();
  calculateAllIntersections();
  renderAll();
  showToast("Objekt smazán ✓");
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

// ── Tlačítka Smazat a Otočit ──
document.getElementById("btnDelete").addEventListener("click", deleteSelected);
document.getElementById("btnRotate").addEventListener("click", startRotateAction);

// ── Double-click: dokončit konturu ──
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
  }
});
