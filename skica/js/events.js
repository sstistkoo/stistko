// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Myš, klávesnice, kolečko                          ║
// ╚══════════════════════════════════════════════════════════════╝

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
  if (state.snapToGrid || state.snapToPoints) [wx, wy] = snapPt(rawWx, rawWy);
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

  document.getElementById("coordDisplay").textContent =
    `X: ${wx.toFixed(3)}   Z: ${wy.toFixed(3)}${extra}`;

  if (isPanning) {
    state.panX = panStartPX + (e.clientX - panStartX);
    state.panY = panStartPY + (e.clientY - panStartY);
  }

  // Přetahování objektu
  if (state.dragging && state.dragObjIdx !== null) {
    const obj = state.objects[state.dragObjIdx];
    const dx = wx - state.dragStartWorld.x;
    const dy = wy - state.dragStartWorld.y;
    const snapShot = JSON.parse(state.dragObjSnapshot);
    Object.assign(obj, snapShot);
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

  const wx = state.mouse.x,
    wy = state.mouse.y;

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
          drawCanvas.style.cursor = "move";
          setHint("Táhněte objekt, klikněte pro umístění");
        }
      } else {
        state.dragging = false;
        state.dragObjIdx = null;
        drawCanvas.style.cursor = "crosshair";
        updateProperties();
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
        setHint(
          "Klikněte na koncový bod" +
            (state.tool === "constr" ? " konstrukční čáry" : ""),
        );
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
        setHint("Klikněte pro poloměr nebo Enter pro číselné zadání");
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
        setHint("Klikněte na počáteční bod oblouku");
      } else if (state.tempPoints.length === 1) {
        state.tempPoints.push({ x: wx, y: wy });
        setHint("Klikněte na koncový bod oblouku");
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
        setHint("Klikněte na protější roh");
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
  }
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
    const mx = state.mouse.sx,
      my = state.mouse.sy;
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
    if (state.dragging) {
      const obj = state.objects[state.dragObjIdx];
      Object.assign(obj, JSON.parse(state.dragObjSnapshot));
      state.dragging = false;
      state.dragObjIdx = null;
      drawCanvas.style.cursor = "crosshair";
    }
    state.drawing = false;
    state.tempPoints = [];
    state.selected = null;
    updateProperties();
    renderAll();
    resetHint();
  }

  if (e.ctrlKey && e.key === "z") {
    e.preventDefault();
    undo();
    return;
  }
  if (e.ctrlKey && e.key === "y") {
    e.preventDefault();
    redo();
    return;
  }
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    saveProject();
    return;
  }

  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")
    return;

  const shortcuts = {
    v: "select",
    w: "move",
    p: "point",
    l: "line",
    k: "constr",
    c: "circle",
    a: "arc",
    r: "rect",
    m: "measure",
  };
  if (shortcuts[e.key.toLowerCase()])
    setTool(shortcuts[e.key.toLowerCase()]);
  if (e.key.toLowerCase() === "g") {
    state.snapToGrid = !state.snapToGrid;
    updateSnapBtn();
    renderAll();
  }
  if (e.key.toLowerCase() === "d") {
    state.showDimensions = !state.showDimensions;
    updateDimsBtn();
    renderAll();
  }
  if (e.key === "[") {
    cycleGridSize(-1);
  }
  if (e.key === "]") {
    cycleGridSize(1);
  }
  if (e.key.toLowerCase() === "n") {
    if (e.shiftKey) {
      showPolarDrawingDialog();
    } else {
      showNumericalInputDialog();
    }
  }
  if (e.key === "Delete" && state.selected !== null) {
    pushUndo();
    state.objects.splice(state.selected, 1);
    state.selected = null;
    updateObjectList();
    updateProperties();
    renderAll();
  }
  if (e.key === "Enter" && state.drawing && state.tool === "circle") {
    e.preventDefault();
    showCircleRadiusDialog();
  }
});

drawCanvas.addEventListener("contextmenu", (e) => e.preventDefault());

// ── Klik logika sdílená s touch ──
function handleCanvasClick(wx, wy) {
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
  }
}
