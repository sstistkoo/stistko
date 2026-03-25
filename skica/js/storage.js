// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Ukládání / Načítání / CNC export                  ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, showToast, pushUndo, setPushUndoHook } from './state.js';
import { updateObjectList, updateProperties } from './ui.js';
import { calculateAllIntersections } from './geometry.js';
import { bulgeToArc } from './utils.js';

// ── Save / Load ──
export function saveProject() {
  const data = {
    version: 2,
    objects: state.objects,
    intersections: state.intersections,
    nextId: state.nextId,
    gridSize: state.gridSize,
    coordMode: state.coordMode,
    incReference: state.incReference,
  };
  localStorage.setItem("skica_project", JSON.stringify(data));
  showToast("Projekt uložen");
}

export function loadProject() {
  const raw = localStorage.getItem("skica_project");
  if (!raw) {
    showToast("Žádný uložený projekt");
    return;
  }
  try {
    const data = JSON.parse(raw);
    pushUndo();
    state.objects = data.objects || [];
    state.nextId = data.nextId || 1;
    if (data.gridSize && data.gridSize > 0)
      state.gridSize = data.gridSize;
    if (data.coordMode) state.coordMode = data.coordMode;
    if (data.incReference) state.incReference = data.incReference;
    state.selected = null;
    updateObjectList();
    updateProperties();
    calculateAllIntersections();
    showToast(`Načteno ${state.objects.length} objektů`);
  } catch (e) {
    showToast("Chyba při načítání projektu");
  }
}

export function exportProjectFile() {
  const data = {
    version: 2,
    objects: state.objects,
    intersections: state.intersections,
    nextId: state.nextId,
    gridSize: state.gridSize,
    coordMode: state.coordMode,
    incReference: state.incReference,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "skica_projekt.json";
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Projekt exportován jako soubor");
}

export function importProjectFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        pushUndo();
        state.objects = data.objects || [];
        state.nextId = data.nextId || 1;
        if (data.gridSize && data.gridSize > 0)
          state.gridSize = data.gridSize;
        if (data.coordMode) state.coordMode = data.coordMode;
        if (data.incReference) state.incReference = data.incReference;
        state.selected = null;
        updateObjectList();
        updateProperties();
        calculateAllIntersections();
        showToast(`Importováno ${state.objects.length} objektů`);
      } catch (err) {
        showToast("Chyba při čtení souboru");
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

// ── Tlačítka Save/Load ──
document.getElementById("btnSave").addEventListener("click", saveProject);
document.getElementById("btnLoad").addEventListener("click", () => {
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>📂 Načíst projekt</h3>
      <div class="btn-row" style="flex-direction:column;gap:8px;align-items:stretch">
        <button class="btn-ok" id="loadLocal" style="width:100%">Načíst z paměti prohlížeče</button>
        <button class="btn-ok" id="loadFile" style="width:100%">Importovat ze souboru (.json)</button>
        <button class="btn-ok" id="exportFile" style="width:100%;background:#f9e2af;border-color:#f9e2af">Exportovat do souboru</button>
        <button class="btn-cancel" onclick="this.closest('.input-overlay').remove()" style="width:100%">Zrušit</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#loadLocal").addEventListener("click", () => {
    overlay.remove();
    loadProject();
  });
  overlay.querySelector("#loadFile").addEventListener("click", () => {
    overlay.remove();
    importProjectFile();
  });
  overlay.querySelector("#exportFile").addEventListener("click", () => {
    overlay.remove();
    exportProjectFile();
  });
});

// ── CNC Export ──
document.getElementById("btnExport").addEventListener("click", () => {
  const isInc = state.coordMode === 'inc';
  let out = "; === SKICA – CNC Soustružník (X,Z) ===\n";
  out += `; Datum: ${new Date().toLocaleString("cs")}\n`;
  out += `; Počet objektů: ${state.objects.length}\n`;
  out += `; Průsečíků: ${state.intersections.length}\n`;
  out += `; Režim: ${isInc ? 'Inkrementální (INC)' : 'Absolutní (ABS)'}\n`;
  if (isInc) out += `; Reference: X${state.incReference.x.toFixed(3)} Z${state.incReference.y.toFixed(3)}\n`;
  out += "\n";
  out += isInc ? "G91 ; Inkrementální režim\n\n" : "G90 ; Absolutní režim\n\n";

  let prevX = isInc ? state.incReference.x : 0;
  let prevY = isInc ? state.incReference.y : 0;

  function fmtCoord(x, y) {
    if (isInc) {
      const dx = x - prevX;
      const dy = y - prevY;
      prevX = x;
      prevY = y;
      return `X${dx.toFixed(3)} Z${dy.toFixed(3)}`;
    }
    return `X${x.toFixed(3)} Z${y.toFixed(3)}`;
  }

  out += "; --- Objekty ---\n";
  state.objects.forEach((obj) => {
    if (obj.type === "constr") return;
    switch (obj.type) {
      case "point":
        out += `; ${obj.name}\nG00 ${fmtCoord(obj.x, obj.y)}\n`;
        break;
      case "line":
        out += `; ${obj.name} (délka: ${Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1).toFixed(3)})\n`;
        out += `G00 ${fmtCoord(obj.x1, obj.y1)}\nG01 ${fmtCoord(obj.x2, obj.y2)}\n`;
        break;
      case "circle":
        out += `; ${obj.name} (R: ${obj.r.toFixed(3)})\n`;
        if (isInc) {
          // V INC režimu: přesun na startovní bod, pak 2 půlkruhy s I,K offsety
          out += `G00 ${fmtCoord(obj.cx + obj.r, obj.cy)}\n`;
          // Půlkruh 1: I,K jsou relativní k aktuální pozici vždy
          out += `G02 X${(-2 * obj.r).toFixed(3)} Z0.000 I${(-obj.r).toFixed(3)} K0.000\n`;
          prevX = obj.cx - obj.r; prevY = obj.cy;
          out += `G02 X${(2 * obj.r).toFixed(3)} Z0.000 I${obj.r.toFixed(3)} K0.000\n`;
          prevX = obj.cx + obj.r; prevY = obj.cy;
        } else {
          out += `G00 X${(obj.cx + obj.r).toFixed(3)} Z${obj.cy.toFixed(3)}\n`;
          out += `G02 X${(obj.cx - obj.r).toFixed(3)} Z${obj.cy.toFixed(3)} I${(-obj.r).toFixed(3)} K0.000\n`;
          out += `G02 X${(obj.cx + obj.r).toFixed(3)} Z${obj.cy.toFixed(3)} I${obj.r.toFixed(3)} K0.000\n`;
        }
        break;
      case "arc": {
        out += `; ${obj.name} (R: ${obj.r.toFixed(3)})\n`;
        const sx = obj.cx + obj.r * Math.cos(obj.startAngle),
          sy = obj.cy + obj.r * Math.sin(obj.startAngle);
        const ex = obj.cx + obj.r * Math.cos(obj.endAngle),
          ey = obj.cy + obj.r * Math.sin(obj.endAngle);
        out += `G00 ${fmtCoord(sx, sy)}\nG02 ${fmtCoord(ex, ey)} R${obj.r.toFixed(3)}\n`;
        break;
      }
      case "rect":
        out += `; ${obj.name} (${Math.abs(obj.x2 - obj.x1).toFixed(2)} × ${Math.abs(obj.y2 - obj.y1).toFixed(2)})\n`;
        out += `G00 ${fmtCoord(obj.x1, obj.y1)}\n`;
        out += `G01 ${fmtCoord(obj.x2, obj.y1)}\n`;
        out += `G01 ${fmtCoord(obj.x2, obj.y2)}\n`;
        out += `G01 ${fmtCoord(obj.x1, obj.y2)}\n`;
        out += `G01 ${fmtCoord(obj.x1, obj.y1)}\n`;
        break;
      case "polyline": {
        const pn = obj.vertices.length;
        const pSegCnt = obj.closed ? pn : pn - 1;
        out += `; ${obj.name} (${pn} vrcholů${obj.closed ? ', uzavřená' : ''})\n`;
        // Rapid to first vertex
        out += `G00 ${fmtCoord(obj.vertices[0].x, obj.vertices[0].y)}\n`;
        // Segments
        for (let i = 0; i < pSegCnt; i++) {
          const pp2 = obj.vertices[(i + 1) % pn];
          const pb = obj.bulges[i] || 0;
          if (pb === 0) {
            out += `G01 ${fmtCoord(pp2.x, pp2.y)}\n`;
          } else {
            const pp1 = obj.vertices[i];
            const parc = bulgeToArc(pp1, pp2, pb);
            if (parc) {
              const gCode = pb < 0 ? 'G02' : 'G03'; // CW = G02, CCW = G03
              out += `${gCode} ${fmtCoord(pp2.x, pp2.y)} R${parc.r.toFixed(3)}\n`;
            } else {
              out += `G01 ${fmtCoord(pp2.x, pp2.y)}\n`;
            }
          }
        }
        break;
      }
    }
    out += "\n";
  });

  if (state.intersections.length > 0) {
    out += "; --- Průsečíky ---\n";
    state.intersections.forEach((pt, i) => {
      out += `; P${i + 1}: X${pt.x.toFixed(3)} Z${pt.y.toFixed(3)}\n`;
    });
  }
  out += "\n; === Konec ===\n";
  document.getElementById("cncOutput").textContent = out;
  navigator.clipboard
    .writeText(out)
    .then(() => showToast("CNC export zkopírován do schránky"))
    .catch(() => showToast("CNC export vygenerován v panelu"));
});

// ╔══════════════════════════════════════════════════════════════╗
// ║  Automatické ukládání do localStorage                       ║
// ╚══════════════════════════════════════════════════════════════╝

let _autoSaveTimer = null;

function scheduleAutoSave() {
  if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    saveProject();
  }, 3000);
}

// Hook do pushUndo – automaticky uložit po každé změně
export function initAutoSave() {
  setPushUndoHook(scheduleAutoSave);
}
