// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – UI panely, toolbar, hinty                          ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Seznam objektů ──
function updateObjectList() {
  const ul = document.getElementById("objectList");
  ul.innerHTML = "";
  const icons = {
    point: "·",
    line: "/",
    constr: "⁄",
    circle: "○",
    arc: "⌒",
    rect: "□",
  };
  state.objects.forEach((obj, idx) => {
    const li = document.createElement("li");
    li.className = idx === state.selected ? "selected" : "";
    li.innerHTML = `<span><span class="obj-icon">${icons[obj.type] || "?"}</span>${obj.name || obj.type + " " + obj.id}</span><button class="del-btn" title="Smazat">✕</button>`;
    li.querySelector("span").addEventListener("click", () => {
      state.selected = idx;
      updateObjectList();
      updateProperties();
      renderAll();
    });
    li.querySelector(".del-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      pushUndo();
      state.objects.splice(idx, 1);
      if (state.selected === idx) state.selected = null;
      else if (state.selected > idx) state.selected--;
      updateObjectList();
      updateProperties();
      renderAll();
    });
    ul.appendChild(li);
  });
}

// ── Vlastnosti objektu ──
function updateProperties() {
  const tbody = document.querySelector("#propTable tbody");
  tbody.innerHTML = "";
  if (state.selected === null) {
    tbody.innerHTML =
      '<tr><td colspan="2" style="color:#6c7086">Není vybrán objekt</td></tr>';
    return;
  }
  const obj = state.objects[state.selected];

  // Helper: přidá řádek s editovatelným inputem
  function addEditRow(label, value, onChange, step) {
    const tr = document.createElement("tr");
    const tdLabel = document.createElement("td");
    tdLabel.textContent = label;
    const tdVal = document.createElement("td");
    const input = document.createElement("input");
    input.type = "number";
    input.className = "prop-input";
    input.value = parseFloat(value).toFixed(4);
    input.step = step || "0.1";
    input.addEventListener("change", () => {
      const v = parseFloat(input.value);
      if (!isNaN(v)) {
        pushUndo();
        onChange(v);
        renderAll();
        refreshComputedProps();
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
      e.stopPropagation();
    });
    tdVal.appendChild(input);
    tr.appendChild(tdLabel);
    tr.appendChild(tdVal);
    tbody.appendChild(tr);
  }

  // Helper: přidá read-only řádek
  function addInfoRow(label, value) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${label}</td><td class="prop-readonly">${value}</td>`;
    tbody.appendChild(tr);
  }

  // Helper: přidá textový input (pro jméno)
  function addTextRow(label, value, onChange) {
    const tr = document.createElement("tr");
    const tdLabel = document.createElement("td");
    tdLabel.textContent = label;
    const tdVal = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "prop-name-input";
    input.value = value;
    input.addEventListener("change", () => {
      onChange(input.value);
      updateObjectList();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
      e.stopPropagation();
    });
    tdVal.appendChild(input);
    tr.appendChild(tdLabel);
    tr.appendChild(tdVal);
    tbody.appendChild(tr);
  }

  // Aktualizace computed polí bez rebuild
  function refreshComputedProps() {
    const computed = tbody.querySelectorAll(".prop-readonly");
    if (!computed.length) return;
    const compData = getComputedData(obj);
    computed.forEach((el, i) => {
      if (compData[i] !== undefined) el.textContent = compData[i];
    });
  }

  function getComputedData(o) {
    switch (o.type) {
      case "line":
      case "constr":
        return [
          Math.hypot(o.x2 - o.x1, o.y2 - o.y1).toFixed(4),
          ((Math.atan2(o.y2 - o.y1, o.x2 - o.x1) * 180) / Math.PI).toFixed(2) + "°"
        ];
      case "circle":
        return [
          (o.r * 2).toFixed(4),
          (2 * Math.PI * o.r).toFixed(4)
        ];
      case "rect":
        return [
          Math.abs(o.x2 - o.x1).toFixed(4),
          Math.abs(o.y2 - o.y1).toFixed(4)
        ];
      default:
        return [];
    }
  }

  // Typ (read-only)
  addInfoRow("Typ", typeLabel(obj.type));
  // Název (editovatelný)
  addTextRow("Název", obj.name || "", (v) => { obj.name = v; });

  switch (obj.type) {
    case "point":
      addEditRow("X", obj.x, (v) => { obj.x = v; });
      addEditRow("Z", obj.y, (v) => { obj.y = v; });
      break;
    case "line":
    case "constr":
      addEditRow("X1", obj.x1, (v) => { obj.x1 = v; });
      addEditRow("Z1", obj.y1, (v) => { obj.y1 = v; });
      addEditRow("X2", obj.x2, (v) => { obj.x2 = v; });
      addEditRow("Z2", obj.y2, (v) => { obj.y2 = v; });
      addInfoRow("Délka", Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1).toFixed(4));
      addInfoRow("Úhel", ((Math.atan2(obj.y2 - obj.y1, obj.x2 - obj.x1) * 180) / Math.PI).toFixed(2) + "°");
      break;
    case "circle":
      addEditRow("Střed X", obj.cx, (v) => { obj.cx = v; });
      addEditRow("Střed Z", obj.cy, (v) => { obj.cy = v; });
      addEditRow("Poloměr", obj.r, (v) => { if (v > 0) obj.r = v; }, "0.01");
      addInfoRow("Průměr", (obj.r * 2).toFixed(4));
      addInfoRow("Obvod", (2 * Math.PI * obj.r).toFixed(4));
      break;
    case "arc":
      addEditRow("Střed X", obj.cx, (v) => { obj.cx = v; });
      addEditRow("Střed Z", obj.cy, (v) => { obj.cy = v; });
      addEditRow("Poloměr", obj.r, (v) => { if (v > 0) obj.r = v; }, "0.01");
      addEditRow("Start°", (obj.startAngle * 180 / Math.PI), (v) => { obj.startAngle = v * Math.PI / 180; }, "1");
      addEditRow("Konec°", (obj.endAngle * 180 / Math.PI), (v) => { obj.endAngle = v * Math.PI / 180; }, "1");
      break;
    case "rect":
      addEditRow("X1", obj.x1, (v) => { obj.x1 = v; });
      addEditRow("Z1", obj.y1, (v) => { obj.y1 = v; });
      addEditRow("X2", obj.x2, (v) => { obj.x2 = v; });
      addEditRow("Z2", obj.y2, (v) => { obj.y2 = v; });
      addInfoRow("Šířka", Math.abs(obj.x2 - obj.x1).toFixed(4));
      addInfoRow("Výška", Math.abs(obj.y2 - obj.y1).toFixed(4));
      break;
  }
}

// ── Seznam průsečíků ──
function updateIntersectionList() {
  const ul = document.getElementById("intersectionList");
  ul.innerHTML = "";
  if (state.intersections.length === 0) {
    ul.innerHTML =
      '<li style="color:#6c7086;cursor:default">Žádné průsečíky</li>';
    return;
  }
  state.intersections.forEach((pt, i) => {
    const li = document.createElement("li");
    li.innerHTML = `P${i + 1}:  X=${pt.x.toFixed(4)}  Z=${pt.y.toFixed(4)} <span class="copy-hint">klik=kopírovat</span>`;
    li.title = "Klikněte pro zkopírování souřadnic";
    li.addEventListener("click", () => {
      const text = `X${pt.x.toFixed(4)} Z${pt.y.toFixed(4)}`;
      navigator.clipboard
        .writeText(text)
        .then(() => showToast(`Zkopírováno: ${text}`));
    });
    ul.appendChild(li);
  });
}

// ── Panely ──
function togglePanel(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === "none" ? "" : "none";
}

// ── Toolbar ──
document.querySelectorAll("[data-tool]").forEach((btn) => {
  btn.addEventListener("click", () => setTool(btn.dataset.tool));
});

function setTool(tool) {
  state.tool = tool;
  state.drawing = false;
  state.tempPoints = [];
  if (state.dragging) {
    const obj = state.objects[state.dragObjIdx];
    Object.assign(obj, JSON.parse(state.dragObjSnapshot));
    state.dragging = false;
    state.dragObjIdx = null;
  }
  drawCanvas.style.cursor = tool === "move" ? "move" : "crosshair";
  document
    .querySelectorAll("[data-tool]")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.tool === tool),
    );
  document.getElementById("statusTool").textContent =
    "Nástroj: " + toolLabel(tool);
  resetHint();
  renderAll();
}

// ── Hinty ──
function setHint(text) {
  document.getElementById("statusHint").textContent = text;
}

function resetHint() {
  const hints = {
    select: "Klikněte pro výběr objektu",
    move: "Klikněte na objekt pro přesun",
    point: "Klikněte pro umístění bodu",
    line: "Klikněte na počáteční bod úsečky",
    constr: "Klikněte na počáteční bod konstrukční čáry",
    circle: "Klikněte na střed kružnice",
    arc: "Klikněte na střed oblouku",
    rect: "Klikněte na první roh obdélníku",
    measure: "Klepněte na objekt pro info, nebo na prázdné místo pro měření",
  };
  setHint(hints[state.tool] || "");
}

// ── Snap tlačítko ──
function updateSnapBtn() {
  const btn = document.getElementById("btnSnap");
  const ind = btn.querySelector(".snap-ind");
  ind.className =
    "snap-ind " + (state.snapToGrid ? "snap-on" : "snap-off");
}

document.getElementById("btnSnap").addEventListener("click", () => {
  state.snapToGrid = !state.snapToGrid;
  updateSnapBtn();
  renderAll();
});

// ── Kóty tlačítko ──
function updateDimsBtn() {
  document
    .getElementById("btnDims")
    .classList.toggle("active", state.showDimensions);
}

document.getElementById("btnDims").addEventListener("click", () => {
  state.showDimensions = !state.showDimensions;
  updateDimsBtn();
  renderAll();
});

// ── Undo/Redo tlačítka ──
document.getElementById("btnUndo").addEventListener("click", undo);
document.getElementById("btnRedo").addEventListener("click", redo);

// ── Průsečíky ──
document
  .getElementById("btnCalcInt")
  .addEventListener("click", calculateAllIntersections);

// ── Smazat vše ──
document.getElementById("btnClearAll").addEventListener("click", () => {
  if (confirm("Opravdu smazat všechny objekty?")) {
    pushUndo();
    state.objects = [];
    state.selected = null;
    state.intersections = [];
    state.nextId = 1;
    updateObjectList();
    updateProperties();
    updateIntersectionList();
    document.getElementById("cncOutput").textContent =
      "Klikněte 📋 CNC Export";
    renderAll();
  }
});

// ── Velikost mřížky ──
const gridSizes = [1, 2, 5, 10, 20, 50];

function updateGridDisplay() {
  const el = document.getElementById("statusGrid");
  if (el) el.textContent = `Mřížka: ${state.gridSize}`;
}

function cycleGridSize(direction) {
  const idx = gridSizes.indexOf(state.gridSize);
  let newIdx;
  if (idx === -1) {
    // Aktuální hodnota není v seznamu, najdi nejbližší
    newIdx = gridSizes.findIndex(s => s >= state.gridSize);
    if (newIdx === -1) newIdx = gridSizes.length - 1;
  } else {
    newIdx = idx + direction;
  }
  newIdx = Math.max(0, Math.min(gridSizes.length - 1, newIdx));
  state.gridSize = gridSizes[newIdx];
  updateGridDisplay();
  renderAll();
  showToast(`Mřížka: ${state.gridSize}`);
}

document.getElementById("statusGrid").addEventListener("click", () => {
  cycleGridSize(1);
});
document.getElementById("statusGrid").addEventListener("contextmenu", (e) => {
  e.preventDefault();
  cycleGridSize(-1);
});
