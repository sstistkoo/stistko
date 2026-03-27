// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Ukládání / Načítání / CNC export                  ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, showToast, pushUndo, setPushUndoHook } from './state.js';
import { updateObjectList, updateProperties, updateLayerList, updateStatusProject } from './ui.js';
import { calculateAllIntersections } from './geometry.js';
import { bulgeToArc } from './utils.js';
import { parseDXF } from './dxf.js';
import { autoCenterView } from './canvas.js';
import { bridge } from './bridge.js';

// ── Save / Load ──
/** Uloží aktuální projekt do localStorage. */
export function saveProject() {
  const data = {
    version: 3,
    objects: state.objects,
    intersections: state.intersections,
    nextId: state.nextId,
    gridSize: state.gridSize,
    coordMode: state.coordMode,
    incReference: state.incReference,
    layers: state.layers,
    activeLayer: state.activeLayer,
    nextLayerId: state.nextLayerId,
  };
  // Uložit do single-project slotu (backward compat)
  localStorage.setItem("skica_project", JSON.stringify(data));
  // Uložit do multi-project storage
  _saveToProjects(state.projectName, data);
  showToast("Projekt uložen");
  updateStatusProject();
}

/** Načte projekt z localStorage. */
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
    // Layers backward compatibility
    if (data.layers) {
      state.layers = data.layers;
      state.activeLayer = data.activeLayer || 0;
      state.nextLayerId = data.nextLayerId || (Math.max(...data.layers.map(l => l.id)) + 1);
    } else {
      state.objects.forEach(obj => { if (obj.layer === undefined) obj.layer = 0; });
    }
    state.selected = null;
    updateObjectList();
    updateProperties();
    updateLayerList();
    calculateAllIntersections();
    showToast(`Načteno ${state.objects.length} objektů`);
  } catch (e) {
    showToast("Chyba při načítání projektu");
  }
}

/** Exportuje projekt jako .skica JSON soubor. */
export function exportProjectFile() {
  const data = {
    version: 3,
    objects: state.objects,
    intersections: state.intersections,
    nextId: state.nextId,
    gridSize: state.gridSize,
    coordMode: state.coordMode,
    incReference: state.incReference,
    layers: state.layers,
    activeLayer: state.activeLayer,
    nextLayerId: state.nextLayerId,
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

/** Importuje .skica JSON soubor. */
const VALID_OBJ_TYPES = ['point', 'line', 'constr', 'circle', 'arc', 'rect', 'polyline'];
const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_OBJECTS = 10000;

function validateImportData(data) {
  if (!data || typeof data !== 'object') throw new Error("Neplatná data");
  const objs = data.objects;
  if (!Array.isArray(objs)) throw new Error("Chybí pole objektů");
  if (objs.length > MAX_OBJECTS) throw new Error(`Příliš mnoho objektů (max ${MAX_OBJECTS})`);
  for (let i = 0; i < objs.length; i++) {
    const o = objs[i];
    if (!o || typeof o !== 'object') throw new Error(`Neplatný objekt #${i}`);
    if (!VALID_OBJ_TYPES.includes(o.type)) throw new Error(`Neznámý typ "${o.type}" u objektu #${i}`);
    // Validate all numeric properties are finite
    for (const key of ['x','y','x1','y1','x2','y2','cx','cy','r','startAngle','endAngle']) {
      if (key in o && !isFinite(o[key])) throw new Error(`Neplatná souřadnice ${key} u objektu #${i}`);
    }
  }
}

export function importProjectFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMPORT_SIZE) {
      showToast(`Soubor je příliš velký (max ${MAX_IMPORT_SIZE / 1024 / 1024} MB)`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        validateImportData(data);
        pushUndo();
        state.objects = data.objects || [];
        state.nextId = data.nextId || 1;
        if (data.gridSize && data.gridSize > 0)
          state.gridSize = data.gridSize;
        if (data.coordMode) state.coordMode = data.coordMode;
        if (data.incReference) state.incReference = data.incReference;
        if (data.layers) {
          state.layers = data.layers;
          state.activeLayer = data.activeLayer || 0;
          state.nextLayerId = data.nextLayerId || (Math.max(...data.layers.map(l => l.id)) + 1);
        } else {
          state.objects.forEach(obj => { if (obj.layer === undefined) obj.layer = 0; });
        }
        state.selected = null;
        updateObjectList();
        updateProperties();
        updateLayerList();
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

/** Importuje DXF soubor. */
export function importDXFFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.dxf';
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const { entities, errors } = parseDXF(ev.target.result);
        if (entities.length === 0) {
          showToast(errors.length > 0 ? `Chyba: ${errors[0]}` : 'Žádné entity v DXF souboru');
          return;
        }
        pushUndo();
        const typeNames = {
          point: 'Bod', line: 'Úsečka', circle: 'Kružnice',
          arc: 'Oblouk', polyline: 'Kontura'
        };
        for (const entity of entities) {
          entity.id = state.nextId++;
          entity.name = `${typeNames[entity.type] || entity.type} ${entity.id}`;
          if (entity.layer === undefined) entity.layer = state.activeLayer;
          state.objects.push(entity);
        }
        state.selected = null;
        updateObjectList();
        updateProperties();
        calculateAllIntersections();
        autoCenterView();
        let msg = `Importováno ${entities.length} objektů z DXF`;
        if (errors.length > 0) msg += ` (${errors.length} varování)`;
        showToast(msg);
        if (errors.length > 0) console.warn('DXF import warnings:', errors);
      } catch (err) {
        showToast('Chyba při čtení DXF souboru');
        console.error('DXF import error:', err);
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

// ── Tlačítka Save/Load ──
document.getElementById("btnSave").addEventListener("click", saveProject);
document.getElementById("btnExportImage")?.addEventListener("click", () => showExportImageDialog());
document.getElementById("btnProjects")?.addEventListener("click", () => showProjectsDialog());
document.getElementById("btnLoad").addEventListener("click", () => {
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>📂 Načíst projekt</h3>
      <div class="btn-row" style="flex-direction:column;gap:8px;align-items:stretch">
        <button class="btn-ok" id="loadLocal" style="width:100%">Načíst z paměti prohlížeče</button>
        <button class="btn-ok" id="loadFile" style="width:100%">Importovat ze souboru (.json)</button>
        <button class="btn-ok" id="loadDXF" style="width:100%">📐 Importovat DXF soubor (.dxf)</button>
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
  overlay.querySelector("#loadDXF").addEventListener("click", () => {
    overlay.remove();
    importDXFFile();
  });
  overlay.querySelector("#exportFile").addEventListener("click", () => {
    overlay.remove();
    exportProjectFile();
  });
});

// ── CNC Export ──
function runCncExport() {
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
  let lastEndX = null;
  let lastEndY = null;

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

  function needsRapid(x, y) {
    if (lastEndX === null) return true;
    return Math.abs(x - lastEndX) > 5e-4 || Math.abs(y - lastEndY) > 5e-4;
  }

  // ── Helpers: trimming to intersections ──
  function isInsideAnyCircle(px, py) {
    return state.objects.some(o =>
      o.type === 'circle' && Math.hypot(px - o.cx, py - o.cy) < o.r - 0.01
    );
  }

  function ptOnSegment(px, py, ax, ay, bx, by) {
    const segLen = Math.hypot(bx - ax, by - ay);
    if (segLen < 1e-9) return false;
    const d1 = Math.hypot(px - ax, py - ay);
    const d2 = Math.hypot(px - bx, py - by);
    return Math.abs(d1 + d2 - segLen) < 0.1;
  }

  function nearestPt(pts, rx, ry) {
    let best = null, bestD = Infinity;
    for (const pt of pts) {
      const d = Math.hypot(pt.x - rx, pt.y - ry);
      if (d < bestD) { best = pt; bestD = d; }
    }
    return best;
  }

  // ── Pre-process: trim + orient right-to-left + sort ──
  const items = [];
  for (const obj of state.objects) {
    if (obj.type === 'constr') continue;

    if (obj.type === 'line') {
      let x1 = obj.x1, y1 = obj.y1, x2 = obj.x2, y2 = obj.y2;

      // Trim endpoints that are inside circles
      const onSeg = state.intersections.filter(pt =>
        ptOnSegment(pt.x, pt.y, x1, y1, x2, y2)
      );
      if (onSeg.length > 0) {
        if (isInsideAnyCircle(x1, y1)) {
          const p = nearestPt(onSeg, x1, y1);
          if (p) { x1 = p.x; y1 = p.y; }
        }
        if (isInsideAnyCircle(x2, y2)) {
          const p = nearestPt(onSeg, x2, y2);
          if (p) { x2 = p.x; y2 = p.y; }
        }
      }

      // Orient right to left (higher X first)
      if (x1 < x2) { [x1, x2] = [x2, x1]; [y1, y2] = [y2, y1]; }

      items.push({
        type: 'line', name: obj.name,
        x1, y1, x2, y2,
        _sortX: Math.max(x1, x2)
      });
    } else if (obj.type === 'point') {
      items.push({ ...obj, _sortX: obj.x });
    } else if (obj.type === 'circle') {
      items.push({ ...obj, _sortX: obj.cx + obj.r });
    } else if (obj.type === 'arc') {
      items.push({ ...obj, _sortX: obj.cx + obj.r });
    } else if (obj.type === 'rect') {
      // Orient right to left
      let rx1 = obj.x1, ry1 = obj.y1, rx2 = obj.x2, ry2 = obj.y2;
      if (rx1 < rx2) { [rx1, rx2] = [rx2, rx1]; [ry1, ry2] = [ry2, ry1]; }
      items.push({ ...obj, x1: rx1, y1: ry1, x2: rx2, y2: ry2, _sortX: Math.max(rx1, rx2) });
    } else if (obj.type === 'polyline') {
      items.push({ ...obj, _sortX: Math.max(...obj.vertices.map(v => v.x)) });
    }
  }

  // Sort right to left (highest X first)
  items.sort((a, b) => b._sortX - a._sortX);

  out += "; --- Objekty (zprava doleva) ---\n";
  items.forEach((obj) => {
    switch (obj.type) {
      case "point":
        out += `; ${obj.name}\n`;
        if (needsRapid(obj.x, obj.y)) out += `G00 ${fmtCoord(obj.x, obj.y)}\n`;
        lastEndX = obj.x; lastEndY = obj.y;
        break;
      case "line":
        out += `; ${obj.name} (délka: ${Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1).toFixed(3)})\n`;
        if (needsRapid(obj.x1, obj.y1)) out += `G00 ${fmtCoord(obj.x1, obj.y1)}\n`;
        out += `G01 ${fmtCoord(obj.x2, obj.y2)}\n`;
        lastEndX = obj.x2; lastEndY = obj.y2;
        break;
      case "circle": {
        out += `; ${obj.name} (R: ${obj.r.toFixed(3)})\n`;
        const cStartX = obj.cx + obj.r, cStartY = obj.cy;
        if (needsRapid(cStartX, cStartY)) out += `G00 ${fmtCoord(cStartX, cStartY)}\n`;
        if (isInc) {
          out += `G02 X${(-2 * obj.r).toFixed(3)} Z0.000 I${(-obj.r).toFixed(3)} K0.000\n`;
          prevX = obj.cx - obj.r; prevY = obj.cy;
          out += `G02 X${(2 * obj.r).toFixed(3)} Z0.000 I${obj.r.toFixed(3)} K0.000\n`;
          prevX = obj.cx + obj.r; prevY = obj.cy;
        } else {
          out += `G02 X${(obj.cx - obj.r).toFixed(3)} Z${obj.cy.toFixed(3)} I${(-obj.r).toFixed(3)} K0.000\n`;
          out += `G02 X${(obj.cx + obj.r).toFixed(3)} Z${obj.cy.toFixed(3)} I${obj.r.toFixed(3)} K0.000\n`;
        }
        lastEndX = cStartX; lastEndY = cStartY;
        break;
      }
      case "arc": {
        out += `; ${obj.name} (R: ${obj.r.toFixed(3)})\n`;
        const sx = obj.cx + obj.r * Math.cos(obj.startAngle),
          sy = obj.cy + obj.r * Math.sin(obj.startAngle);
        const ex = obj.cx + obj.r * Math.cos(obj.endAngle),
          ey = obj.cy + obj.r * Math.sin(obj.endAngle);
        if (needsRapid(sx, sy)) out += `G00 ${fmtCoord(sx, sy)}\n`;
        out += `G02 ${fmtCoord(ex, ey)} R${obj.r.toFixed(3)}\n`;
        lastEndX = ex; lastEndY = ey;
        break;
      }
      case "rect":
        out += `; ${obj.name} (${Math.abs(obj.x2 - obj.x1).toFixed(2)} × ${Math.abs(obj.y2 - obj.y1).toFixed(2)})\n`;
        if (needsRapid(obj.x1, obj.y1)) out += `G00 ${fmtCoord(obj.x1, obj.y1)}\n`;
        out += `G01 ${fmtCoord(obj.x2, obj.y1)}\n`;
        out += `G01 ${fmtCoord(obj.x2, obj.y2)}\n`;
        out += `G01 ${fmtCoord(obj.x1, obj.y2)}\n`;
        out += `G01 ${fmtCoord(obj.x1, obj.y1)}\n`;
        lastEndX = obj.x1; lastEndY = obj.y1;
        break;
      case "polyline": {
        const pn = obj.vertices.length;
        const pSegCnt = obj.closed ? pn : pn - 1;
        out += `; ${obj.name} (${pn} vrcholů${obj.closed ? ', uzavřená' : ''})\n`;
        if (needsRapid(obj.vertices[0].x, obj.vertices[0].y)) {
          out += `G00 ${fmtCoord(obj.vertices[0].x, obj.vertices[0].y)}\n`;
        }
        for (let i = 0; i < pSegCnt; i++) {
          const pp2 = obj.vertices[(i + 1) % pn];
          const pb = obj.bulges[i] || 0;
          if (pb === 0) {
            out += `G01 ${fmtCoord(pp2.x, pp2.y)}\n`;
          } else {
            const pp1 = obj.vertices[i];
            const parc = bulgeToArc(pp1, pp2, pb);
            if (parc) {
              const gCode = pb < 0 ? 'G02' : 'G03';
              out += `${gCode} ${fmtCoord(pp2.x, pp2.y)} R${parc.r.toFixed(3)}\n`;
            } else {
              out += `G01 ${fmtCoord(pp2.x, pp2.y)}\n`;
            }
          }
        }
        const lastV = obj.closed ? obj.vertices[0] : obj.vertices[pn - 1];
        lastEndX = lastV.x; lastEndY = lastV.y;
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
  return out;
}

function copyCncToClipboard() {
  const out = document.getElementById("cncOutput").textContent;
  if (!out) {
    runCncExport();
  }
  const text = document.getElementById("cncOutput").textContent;
  navigator.clipboard
    .writeText(text)
    .then(() => showToast("CNC export zkopírován do schránky"))
    .catch(() => showToast("Nelze zkopírovat do schránky"));
}

document.getElementById("btnExport").addEventListener("click", () => {
  runCncExport();
  copyCncToClipboard();
});
document.getElementById("btnCncCopy").addEventListener("click", copyCncToClipboard);
bridge.runCncExport = runCncExport;

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
/** Inicializuje autosave (interval + pushUndo hook). */
export function initAutoSave() {
  setPushUndoHook(scheduleAutoSave);
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  Správa projektů (multi-project)                            ║
// ╚══════════════════════════════════════════════════════════════╝

function _getProjects() {
  try {
    return JSON.parse(localStorage.getItem('skica_projects') || '{}');
  } catch { return {}; }
}

function _setProjects(projects) {
  localStorage.setItem('skica_projects', JSON.stringify(projects));
}

function _saveToProjects(name, data) {
  const projects = _getProjects();
  projects[name] = {
    ...data,
    savedAt: new Date().toISOString(),
    objectCount: (data.objects || []).length,
  };
  _setProjects(projects);
}

function _buildProjectData() {
  return {
    version: 3,
    objects: state.objects,
    intersections: state.intersections,
    nextId: state.nextId,
    gridSize: state.gridSize,
    coordMode: state.coordMode,
    incReference: state.incReference,
    layers: state.layers,
    activeLayer: state.activeLayer,
    nextLayerId: state.nextLayerId,
  };
}

function _loadProjectData(data) {
  pushUndo();
  state.objects = data.objects || [];
  state.nextId = data.nextId || 1;
  if (data.gridSize && data.gridSize > 0) state.gridSize = data.gridSize;
  if (data.coordMode) state.coordMode = data.coordMode;
  if (data.incReference) state.incReference = data.incReference;
  if (data.layers) {
    state.layers = data.layers;
    state.activeLayer = data.activeLayer || 0;
    state.nextLayerId = data.nextLayerId || (Math.max(...data.layers.map(l => l.id)) + 1);
  } else {
    state.objects.forEach(obj => { if (obj.layer === undefined) obj.layer = 0; });
  }
  state.selected = null;
  updateObjectList();
  updateProperties();
  updateLayerList();
  calculateAllIntersections();
}

/** @param {string} name */
export function openProject(name) {
  const projects = _getProjects();
  const data = projects[name];
  if (!data) { showToast('Projekt nenalezen'); return; }
  _loadProjectData(data);
  state.projectName = name;
  updateStatusProject();
  showToast(`Otevřen projekt: ${name}`);
}

/** @param {string} name */
export function deleteProject(name) {
  const projects = _getProjects();
  delete projects[name];
  _setProjects(projects);
  showToast(`Projekt "${name}" smazán`);
}

/**
 * @param {string} oldName
 * @param {string} newName
 */
export function renameProject(oldName, newName) {
  if (!newName || newName.trim() === '') return;
  newName = newName.trim();
  const projects = _getProjects();
  if (!projects[oldName]) return;
  if (projects[newName]) { showToast('Projekt s tímto názvem již existuje'); return; }
  projects[newName] = projects[oldName];
  delete projects[oldName];
  _setProjects(projects);
  if (state.projectName === oldName) {
    state.projectName = newName;
    updateStatusProject();
  }
  showToast(`Přejmenováno na "${newName}"`);
}

/** @param {string} name */
export function duplicateProject(name) {
  const projects = _getProjects();
  if (!projects[name]) return;
  let newName = name + ' (kopie)';
  let i = 2;
  while (projects[newName]) { newName = name + ` (kopie ${i++})`; }
  projects[newName] = JSON.parse(JSON.stringify(projects[name]));
  projects[newName].savedAt = new Date().toISOString();
  _setProjects(projects);
  showToast(`Vytvořena kopie: ${newName}`);
}

/** Vytvoří nový prázdný projekt. */
export function newProject() {
  pushUndo();
  state.objects = [];
  state.nextId = 1;
  state.selected = null;
  state.intersections = [];
  state.projectName = 'Bez názvu';
  state.layers = [
    { id: 0, name: 'Kontura', color: '#89b4fa', visible: true, locked: false },
    { id: 1, name: 'Konstrukce', color: '#6c7086', visible: true, locked: false },
    { id: 2, name: 'Kóty', color: '#a6e3a1', visible: true, locked: false },
  ];
  state.activeLayer = 0;
  state.nextLayerId = 3;
  updateObjectList();
  updateProperties();
  updateLayerList();
  updateStatusProject();
  showToast('Nový projekt');
}

/** Otevře dialog pro uložení projektu pod novým názvem. */
export function showSaveAsDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'input-overlay';
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>💾 Uložit jako</h3>
      <label>Název projektu:</label>
      <input type="text" id="saveAsName" value="${state.projectName}" autofocus>
      <div class="btn-row">
        <button class="btn-cancel" id="saveAsCancel">Zrušit</button>
        <button class="btn-ok" id="saveAsOk">Uložit</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const inp = overlay.querySelector('#saveAsName');
  inp.select();
  inp.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') doSave();
    if (e.key === 'Escape') overlay.remove();
  });

  function doSave() {
    const name = inp.value.trim();
    if (!name) return;
    state.projectName = name;
    const data = _buildProjectData();
    localStorage.setItem('skica_project', JSON.stringify(data));
    _saveToProjects(name, data);
    updateStatusProject();
    overlay.remove();
    showToast(`Uloženo jako "${name}"`);
  }

  overlay.querySelector('#saveAsOk').addEventListener('click', doSave);
  overlay.querySelector('#saveAsCancel').addEventListener('click', () => overlay.remove());
}

/** Otevře dialog se správou projektů. */
export function showProjectsDialog() {
  const projects = _getProjects();
  const names = Object.keys(projects).sort((a, b) => {
    const da = projects[b].savedAt || '';
    const db = projects[a].savedAt || '';
    return da.localeCompare(db);
  });

  const overlay = document.createElement('div');
  overlay.className = 'input-overlay';

  function buildList() {
    let html = '';
    const sortedNames = Object.keys(_getProjects()).sort((a, b) => {
      const pa = _getProjects();
      return (pa[b].savedAt || '').localeCompare(pa[a].savedAt || '');
    });
    if (sortedNames.length === 0) {
      html = '<li style="color:#6c7086;padding:12px;text-align:center">Žádné uložené projekty</li>';
    } else {
      for (const name of sortedNames) {
        const p = _getProjects()[name];
        const date = p.savedAt ? new Date(p.savedAt).toLocaleString('cs') : '–';
        const count = p.objectCount || (p.objects || []).length;
        const isActive = name === state.projectName;
        html += `
          <li class="project-item${isActive ? ' active' : ''}" data-name="${name.replace(/"/g, '&quot;')}">
            <div class="project-info">
              <div class="project-name">${name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}</div>
              <div class="project-meta">${date} · ${count} objektů</div>
            </div>
            <div class="project-actions">
              <button class="project-action-btn" data-act="open" title="Otevřít">📂</button>
              <button class="project-action-btn" data-act="rename" title="Přejmenovat">✏️</button>
              <button class="project-action-btn" data-act="duplicate" title="Duplikovat">📋</button>
              <button class="project-action-btn del" data-act="delete" title="Smazat">🗑</button>
            </div>
          </li>`;
      }
    }
    return html;
  }

  overlay.innerHTML = `
    <div class="input-dialog" style="min-width:400px;max-width:520px">
      <h3>📁 Správa projektů</h3>
      <ul class="project-list">${buildList()}</ul>
      <div class="btn-row" style="flex-direction:column;gap:8px;align-items:stretch">
        <button class="btn-ok" id="projNew" style="width:100%">➕ Nový projekt</button>
        <button class="btn-cancel" id="projClose" style="width:100%">Zavřít</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  function refreshList() {
    overlay.querySelector('.project-list').innerHTML = buildList();
    attachListeners();
  }

  function attachListeners() {
    overlay.querySelectorAll('.project-item').forEach(item => {
      const name = item.dataset.name;
      item.querySelectorAll('.project-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const act = btn.dataset.act;
          if (act === 'open') {
            openProject(name);
            overlay.remove();
          } else if (act === 'rename') {
            const newName = prompt('Nový název:', name);
            if (newName && newName.trim()) {
              renameProject(name, newName.trim());
              refreshList();
            }
          } else if (act === 'duplicate') {
            duplicateProject(name);
            refreshList();
          } else if (act === 'delete') {
            if (confirm(`Opravdu smazat "${name}"?`)) {
              deleteProject(name);
              refreshList();
            }
          }
        });
      });
      // Double-click to open
      item.addEventListener('dblclick', () => {
        openProject(name);
        overlay.remove();
      });
    });
  }

  attachListeners();
  overlay.querySelector('#projNew').addEventListener('click', () => {
    newProject();
    overlay.remove();
  });
  overlay.querySelector('#projClose').addEventListener('click', () => overlay.remove());
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  SVG / PNG Export                                           ║
// ╚══════════════════════════════════════════════════════════════╝

function getObjectsBoundingBox() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasObjects = false;

  for (const obj of state.objects) {
    const layer = state.layers.find(l => l.id === obj.layer);
    if (layer && !layer.visible) continue;
    hasObjects = true;

    switch (obj.type) {
      case 'point':
        minX = Math.min(minX, obj.x); maxX = Math.max(maxX, obj.x);
        minY = Math.min(minY, obj.y); maxY = Math.max(maxY, obj.y);
        break;
      case 'line': case 'constr':
        minX = Math.min(minX, obj.x1, obj.x2); maxX = Math.max(maxX, obj.x1, obj.x2);
        minY = Math.min(minY, obj.y1, obj.y2); maxY = Math.max(maxY, obj.y1, obj.y2);
        break;
      case 'circle':
        minX = Math.min(minX, obj.cx - obj.r); maxX = Math.max(maxX, obj.cx + obj.r);
        minY = Math.min(minY, obj.cy - obj.r); maxY = Math.max(maxY, obj.cy + obj.r);
        break;
      case 'arc': {
        // Start/end points
        const sx = obj.cx + obj.r * Math.cos(obj.startAngle);
        const sy = obj.cy + obj.r * Math.sin(obj.startAngle);
        const ex = obj.cx + obj.r * Math.cos(obj.endAngle);
        const ey = obj.cy + obj.r * Math.sin(obj.endAngle);
        minX = Math.min(minX, sx, ex); maxX = Math.max(maxX, sx, ex);
        minY = Math.min(minY, sy, ey); maxY = Math.max(maxY, sy, ey);
        // Check cardinal angles
        const cardinals = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
        for (const a of cardinals) {
          if (isAngleBetweenExport(obj.startAngle, obj.endAngle, a)) {
            const px = obj.cx + obj.r * Math.cos(a);
            const py = obj.cy + obj.r * Math.sin(a);
            minX = Math.min(minX, px); maxX = Math.max(maxX, px);
            minY = Math.min(minY, py); maxY = Math.max(maxY, py);
          }
        }
        break;
      }
      case 'rect':
        minX = Math.min(minX, obj.x1, obj.x2); maxX = Math.max(maxX, obj.x1, obj.x2);
        minY = Math.min(minY, obj.y1, obj.y2); maxY = Math.max(maxY, obj.y1, obj.y2);
        break;
      case 'polyline':
        for (const v of obj.vertices) {
          minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
          minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        }
        break;
    }
  }

  if (!hasObjects) return { minX: -100, minY: -100, maxX: 100, maxY: 100 };
  return { minX, minY, maxX, maxY };
}

function isAngleBetweenExport(start, end, angle) {
  // Normalize angles to [0, 2PI]
  const TAU = Math.PI * 2;
  const s = ((start % TAU) + TAU) % TAU;
  const e = ((end % TAU) + TAU) % TAU;
  const a = ((angle % TAU) + TAU) % TAU;
  if (s <= e) return a >= s && a <= e;
  return a >= s || a <= e;
}

function getObjColor(obj) {
  const layer = state.layers.find(l => l.id === obj.layer);
  const layerColor = layer ? layer.color : '#89b4fa';
  if (obj.type === 'constr') return '#6c7086';
  return obj.color || layerColor;
}

function exportSVG(background) {
  const bb = getObjectsBoundingBox();
  const padX = (bb.maxX - bb.minX) * 0.1 || 10;
  const padY = (bb.maxY - bb.minY) * 0.1 || 10;
  const vx = bb.minX - padX;
  const vy = -(bb.maxY + padY); // flip Y for SVG
  const vw = (bb.maxX - bb.minX) + 2 * padX;
  const vh = (bb.maxY - bb.minY) + 2 * padY;

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('xmlns', ns);
  svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
  svg.setAttribute('width', Math.round(vw));
  svg.setAttribute('height', Math.round(vh));

  // Background
  if (background !== 'transparent') {
    const bgRect = document.createElementNS(ns, 'rect');
    bgRect.setAttribute('x', vx);
    bgRect.setAttribute('y', vy);
    bgRect.setAttribute('width', vw);
    bgRect.setAttribute('height', vh);
    bgRect.setAttribute('fill', background === 'dark' ? '#1e1e2e' : '#ffffff');
    svg.appendChild(bgRect);
  }

  // Objects
  for (const obj of state.objects) {
    const layer = state.layers.find(l => l.id === obj.layer);
    if (layer && !layer.visible) continue;

    const color = getObjColor(obj);
    const strokeW = obj.type === 'constr' ? 1 : 1.5;
    const dash = (obj.type === 'constr' || obj.dashed) ? '6,4' : '';

    switch (obj.type) {
      case 'point': {
        const g = document.createElementNS(ns, 'g');
        const c = document.createElementNS(ns, 'circle');
        c.setAttribute('cx', obj.x);
        c.setAttribute('cy', -obj.y);
        c.setAttribute('r', 2);
        c.setAttribute('fill', color);
        g.appendChild(c);
        // crosshair
        const l1 = document.createElementNS(ns, 'line');
        l1.setAttribute('x1', obj.x - 4); l1.setAttribute('y1', -obj.y);
        l1.setAttribute('x2', obj.x + 4); l1.setAttribute('y2', -obj.y);
        l1.setAttribute('stroke', color); l1.setAttribute('stroke-width', '1');
        g.appendChild(l1);
        const l2 = document.createElementNS(ns, 'line');
        l2.setAttribute('x1', obj.x); l2.setAttribute('y1', -obj.y - 4);
        l2.setAttribute('x2', obj.x); l2.setAttribute('y2', -obj.y + 4);
        l2.setAttribute('stroke', color); l2.setAttribute('stroke-width', '1');
        g.appendChild(l2);
        svg.appendChild(g);
        break;
      }
      case 'line': case 'constr': {
        const el = document.createElementNS(ns, 'line');
        el.setAttribute('x1', obj.x1); el.setAttribute('y1', -obj.y1);
        el.setAttribute('x2', obj.x2); el.setAttribute('y2', -obj.y2);
        el.setAttribute('stroke', color);
        el.setAttribute('stroke-width', strokeW);
        el.setAttribute('fill', 'none');
        if (dash) el.setAttribute('stroke-dasharray', dash);
        svg.appendChild(el);
        break;
      }
      case 'circle': {
        const el = document.createElementNS(ns, 'circle');
        el.setAttribute('cx', obj.cx); el.setAttribute('cy', -obj.cy);
        el.setAttribute('r', obj.r);
        el.setAttribute('stroke', color);
        el.setAttribute('stroke-width', strokeW);
        el.setAttribute('fill', 'none');
        if (dash) el.setAttribute('stroke-dasharray', dash);
        svg.appendChild(el);
        break;
      }
      case 'arc': {
        const sx = obj.cx + obj.r * Math.cos(obj.startAngle);
        const sy = obj.cy + obj.r * Math.sin(obj.startAngle);
        const ex = obj.cx + obj.r * Math.cos(obj.endAngle);
        const ey = obj.cy + obj.r * Math.sin(obj.endAngle);
        let sweep = obj.endAngle - obj.startAngle;
        if (sweep < 0) sweep += Math.PI * 2;
        const largeArc = sweep > Math.PI ? 1 : 0;
        // In SVG Y is flipped, so sweep direction is inverted
        const d = `M ${sx} ${-sy} A ${obj.r} ${obj.r} 0 ${largeArc} 0 ${ex} ${-ey}`;
        const el = document.createElementNS(ns, 'path');
        el.setAttribute('d', d);
        el.setAttribute('stroke', color);
        el.setAttribute('stroke-width', strokeW);
        el.setAttribute('fill', 'none');
        if (dash) el.setAttribute('stroke-dasharray', dash);
        svg.appendChild(el);
        break;
      }
      case 'rect': {
        const el = document.createElementNS(ns, 'rect');
        const rx = Math.min(obj.x1, obj.x2);
        const ry = Math.max(obj.y1, obj.y2); // top in world = lowest -Y in SVG
        el.setAttribute('x', rx);
        el.setAttribute('y', -ry);
        el.setAttribute('width', Math.abs(obj.x2 - obj.x1));
        el.setAttribute('height', Math.abs(obj.y2 - obj.y1));
        el.setAttribute('stroke', color);
        el.setAttribute('stroke-width', strokeW);
        el.setAttribute('fill', 'none');
        if (dash) el.setAttribute('stroke-dasharray', dash);
        svg.appendChild(el);
        break;
      }
      case 'polyline': {
        const n = obj.vertices.length;
        if (n < 2) break;
        const segCount = obj.closed ? n : n - 1;
        let d = `M ${obj.vertices[0].x} ${-obj.vertices[0].y}`;
        for (let i = 0; i < segCount; i++) {
          const p2 = obj.vertices[(i + 1) % n];
          const b = obj.bulges[i] || 0;
          if (b === 0) {
            d += ` L ${p2.x} ${-p2.y}`;
          } else {
            const arc = bulgeToArc(obj.vertices[i], p2, b);
            if (arc) {
              const largeArc = Math.abs(4 * Math.atan(Math.abs(b))) > Math.PI ? 1 : 0;
              const sweepFlag = b > 0 ? 0 : 1;
              d += ` A ${arc.r} ${arc.r} 0 ${largeArc} ${sweepFlag} ${p2.x} ${-p2.y}`;
            } else {
              d += ` L ${p2.x} ${-p2.y}`;
            }
          }
        }
        if (obj.closed) d += ' Z';
        const el = document.createElementNS(ns, 'path');
        el.setAttribute('d', d);
        el.setAttribute('stroke', color);
        el.setAttribute('stroke-width', strokeW);
        el.setAttribute('fill', 'none');
        if (dash) el.setAttribute('stroke-dasharray', dash);
        svg.appendChild(el);
        break;
      }
    }

    // Kóty jako text
    if (state.showDimensions && obj.type !== 'constr') {
      const dimText = getDimensionText(obj);
      if (dimText) {
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('x', dimText.x);
        t.setAttribute('y', -dimText.y);
        t.setAttribute('fill', '#9399b2');
        t.setAttribute('font-size', '4');
        t.setAttribute('font-family', 'Consolas, monospace');
        t.textContent = dimText.text;
        svg.appendChild(t);
      }
    }
  }

  // Serialize and download
  const serializer = new XMLSerializer();
  const svgStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(svg);
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${state.projectName || 'skica'}.svg`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('SVG exportováno');
}

function getDimensionText(obj) {
  switch (obj.type) {
    case 'line': {
      const len = Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1);
      return { x: (obj.x1 + obj.x2) / 2 + 2, y: (obj.y1 + obj.y2) / 2 + 2, text: len.toFixed(2) };
    }
    case 'circle':
      return { x: obj.cx + 2, y: obj.cy + 2, text: `R${obj.r.toFixed(2)}` };
    case 'arc':
      return { x: obj.cx + 2, y: obj.cy + 2, text: `R${obj.r.toFixed(2)}` };
    case 'rect': {
      const w = Math.abs(obj.x2 - obj.x1), h = Math.abs(obj.y2 - obj.y1);
      return { x: (obj.x1 + obj.x2) / 2, y: Math.max(obj.y1, obj.y2) + 3, text: `${w.toFixed(2)} × ${h.toFixed(2)}` };
    }
    default: return null;
  }
}

function exportPNG(scale, background) {
  const bb = getObjectsBoundingBox();
  const padX = (bb.maxX - bb.minX) * 0.1 || 10;
  const padY = (bb.maxY - bb.minY) * 0.1 || 10;
  const worldW = (bb.maxX - bb.minX) + 2 * padX;
  const worldH = (bb.maxY - bb.minY) + 2 * padY;

  // Base pixel size: 1 world unit = 2 pixels at 1×
  const basePixPerUnit = 2;
  const canvasW = Math.ceil(worldW * basePixPerUnit * scale);
  const canvasH = Math.ceil(worldH * basePixPerUnit * scale);

  const offCanvas = document.createElement('canvas');
  offCanvas.width = canvasW;
  offCanvas.height = canvasH;
  const g = offCanvas.getContext('2d');

  // Background
  if (background === 'transparent') {
    g.clearRect(0, 0, canvasW, canvasH);
  } else {
    g.fillStyle = background === 'dark' ? '#1e1e2e' : '#ffffff';
    g.fillRect(0, 0, canvasW, canvasH);
  }

  // Transform: world → offscreen pixel coords
  const zoom = basePixPerUnit * scale;
  const panX = -bb.minX * zoom + padX * zoom;
  const panY = bb.maxY * zoom + padY * zoom;

  function w2s(wx, wy) {
    return [wx * zoom + panX, -wy * zoom + panY];
  }

  // Render all visible objects
  for (const obj of state.objects) {
    const layer = state.layers.find(l => l.id === obj.layer);
    if (layer && !layer.visible) continue;

    const color = getObjColor(obj);
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = 1.5 * scale;
    g.setLineDash((obj.type === 'constr' || obj.dashed) ? [6 * scale, 4 * scale] : []);

    switch (obj.type) {
      case 'point': {
        const [sx, sy] = w2s(obj.x, obj.y);
        g.beginPath(); g.arc(sx, sy, 3 * scale, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.moveTo(sx - 6 * scale, sy); g.lineTo(sx + 6 * scale, sy);
        g.moveTo(sx, sy - 6 * scale); g.lineTo(sx, sy + 6 * scale); g.stroke();
        break;
      }
      case 'line': case 'constr': {
        const [sx1, sy1] = w2s(obj.x1, obj.y1);
        const [sx2, sy2] = w2s(obj.x2, obj.y2);
        g.beginPath(); g.moveTo(sx1, sy1); g.lineTo(sx2, sy2); g.stroke();
        break;
      }
      case 'circle': {
        const [sx, sy] = w2s(obj.cx, obj.cy);
        const r = obj.r * zoom;
        g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.stroke();
        break;
      }
      case 'arc': {
        const [sx, sy] = w2s(obj.cx, obj.cy);
        const r = obj.r * zoom;
        g.beginPath(); g.arc(sx, sy, r, -obj.endAngle, -obj.startAngle); g.stroke();
        break;
      }
      case 'rect': {
        const [sx1, sy1] = w2s(obj.x1, obj.y1);
        const [sx2, sy2] = w2s(obj.x2, obj.y2);
        g.beginPath();
        g.rect(Math.min(sx1, sx2), Math.min(sy1, sy2), Math.abs(sx2 - sx1), Math.abs(sy2 - sy1));
        g.stroke();
        break;
      }
      case 'polyline': {
        const n = obj.vertices.length;
        if (n < 2) break;
        const segCount = obj.closed ? n : n - 1;
        for (let i = 0; i < segCount; i++) {
          const p1 = obj.vertices[i];
          const p2 = obj.vertices[(i + 1) % n];
          const b = obj.bulges[i] || 0;
          const [sx1, sy1] = w2s(p1.x, p1.y);
          const [sx2, sy2] = w2s(p2.x, p2.y);
          if (b === 0) {
            g.beginPath(); g.moveTo(sx1, sy1); g.lineTo(sx2, sy2); g.stroke();
          } else {
            const arc = bulgeToArc(p1, p2, b);
            if (arc) {
              const [scx, scy] = w2s(arc.cx, arc.cy);
              const sr = arc.r * zoom;
              g.beginPath(); g.arc(scx, scy, sr, -arc.endAngle, -arc.startAngle, b < 0); g.stroke();
            }
          }
        }
        break;
      }
    }
    g.setLineDash([]);
  }

  offCanvas.toBlob((blob) => {
    if (!blob) { showToast('Chyba při generování PNG'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${state.projectName || 'skica'}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('PNG exportováno');
  }, 'image/png');
}

/** Otevře dialog pro export obrázku (PNG). */
export function showExportImageDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'input-overlay';
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>🖼 Export obrazu</h3>
      <label>Formát:</label>
      <select id="expFormat">
        <option value="svg">SVG (vektorový)</option>
        <option value="png">PNG (rastrový)</option>
      </select>
      <div id="pngOptions">
        <label>Rozlišení PNG:</label>
        <select id="expScale">
          <option value="1">1× (standardní)</option>
          <option value="2" selected>2× (vysoké)</option>
          <option value="4">4× (velmi vysoké)</option>
        </select>
      </div>
      <label>Pozadí:</label>
      <select id="expBg">
        <option value="dark">Tmavé (#1e1e2e)</option>
        <option value="white">Bílé</option>
        <option value="transparent">Průhledné</option>
      </select>
      <div class="btn-row">
        <button class="btn-cancel" id="expCancel">Zrušit</button>
        <button class="btn-ok" id="expOk">Exportovat</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const fmtSel = overlay.querySelector('#expFormat');
  const pngOpts = overlay.querySelector('#pngOptions');
  fmtSel.addEventListener('change', () => {
    pngOpts.style.display = fmtSel.value === 'png' ? '' : 'none';
  });

  overlay.querySelector('#expOk').addEventListener('click', () => {
    const format = fmtSel.value;
    const bg = overlay.querySelector('#expBg').value;
    const scale = parseInt(overlay.querySelector('#expScale')?.value || '2');
    overlay.remove();
    if (format === 'svg') {
      exportSVG(bg);
    } else {
      exportPNG(scale, bg);
    }
  });
  overlay.querySelector('#expCancel').addEventListener('click', () => overlay.remove());
  // Propagace keydown prevence
  overlay.querySelectorAll('select').forEach(sel => {
    sel.addEventListener('keydown', e => e.stopPropagation());
  });
}
