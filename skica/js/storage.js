// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Ukládání / Načítání / CNC export                  ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, showToast, pushUndo, setPushUndoHook } from './state.js';
import { updateObjectList, updateProperties } from './ui.js';
import { calculateAllIntersections } from './geometry.js';

// ── Save / Load ──
export function saveProject() {
  const data = {
    version: 2,
    objects: state.objects,
    intersections: state.intersections,
    nextId: state.nextId,
    gridSize: state.gridSize,
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
  let out = "; === SKICA – CNC Soustružník (X,Z) ===\n";
  out += `; Datum: ${new Date().toLocaleString("cs")}\n`;
  out += `; Počet objektů: ${state.objects.length}\n`;
  out += `; Průsečíků: ${state.intersections.length}\n\n`;

  out += "; --- Objekty ---\n";
  state.objects.forEach((obj) => {
    if (obj.type === "constr") return;
    switch (obj.type) {
      case "point":
        out += `; ${obj.name}\nG00 X${obj.x.toFixed(3)} Z${obj.y.toFixed(3)}\n`;
        break;
      case "line":
        out += `; ${obj.name} (délka: ${Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1).toFixed(3)})\n`;
        out += `G00 X${obj.x1.toFixed(3)} Z${obj.y1.toFixed(3)}\nG01 X${obj.x2.toFixed(3)} Z${obj.y2.toFixed(3)}\n`;
        break;
      case "circle":
        out += `; ${obj.name} (R: ${obj.r.toFixed(3)})\n`;
        // Split full circle into two half-circles for CNC compatibility
        out += `G00 X${(obj.cx + obj.r).toFixed(3)} Z${obj.cy.toFixed(3)}\n`;
        out += `G02 X${(obj.cx - obj.r).toFixed(3)} Z${obj.cy.toFixed(3)} I${(-obj.r).toFixed(3)} K0.000\n`;
        out += `G02 X${(obj.cx + obj.r).toFixed(3)} Z${obj.cy.toFixed(3)} I${obj.r.toFixed(3)} K0.000\n`;
        break;
      case "arc":
        out += `; ${obj.name} (R: ${obj.r.toFixed(3)})\n`;
        const sx = obj.cx + obj.r * Math.cos(obj.startAngle),
          sy = obj.cy + obj.r * Math.sin(obj.startAngle);
        const ex = obj.cx + obj.r * Math.cos(obj.endAngle),
          ey = obj.cy + obj.r * Math.sin(obj.endAngle);
        out += `G00 X${sx.toFixed(3)} Z${sy.toFixed(3)}\nG02 X${ex.toFixed(3)} Z${ey.toFixed(3)} R${obj.r.toFixed(3)}\n`;
        break;
      case "rect":
        out += `; ${obj.name} (${Math.abs(obj.x2 - obj.x1).toFixed(2)} × ${Math.abs(obj.y2 - obj.y1).toFixed(2)})\n`;
        out += `G00 X${obj.x1.toFixed(3)} Z${obj.y1.toFixed(3)}\n`;
        out += `G01 X${obj.x2.toFixed(3)} Z${obj.y1.toFixed(3)}\n`;
        out += `G01 X${obj.x2.toFixed(3)} Z${obj.y2.toFixed(3)}\n`;
        out += `G01 X${obj.x1.toFixed(3)} Z${obj.y2.toFixed(3)}\n`;
        out += `G01 X${obj.x1.toFixed(3)} Z${obj.y1.toFixed(3)}\n`;
        break;
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
