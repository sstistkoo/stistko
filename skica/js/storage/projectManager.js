// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Správa projektů (multi-project)                    ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, showToast, pushUndo } from '../state.js';
import { COLORS } from '../constants.js';
import { updateObjectList, updateProperties, updateLayerList, updateStatusProject, updateMachineTypeBtn, updateXDisplayBtn } from '../ui.js';
import { calculateAllIntersections } from '../geometry.js';
import { saveProjectToDB, loadProjectFromDB, deleteProjectFromDB, getAllProjects, setMeta, getMeta } from '../idb.js';
import { deepClone } from '../utils.js';

// ── Pomocné funkce ──

async function _saveToProjects(name, data) {
  await saveProjectToDB(name, {
    ...data,
    savedAt: new Date().toISOString(),
    objectCount: (data.objects || []).length,
  });
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
    machineType: state.machineType,
    xDisplayMode: state.xDisplayMode,
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
  if (data.machineType) state.machineType = data.machineType;
  state.xDisplayMode = data.xDisplayMode || 'radius';
  if (data.layers) {
    state.layers = data.layers;
    state.activeLayer = data.activeLayer || 0;
    state.nextLayerId = data.nextLayerId || (data.layers.length > 0 ? Math.max(...data.layers.map(l => l.id)) + 1 : 1);
  } else {
    state.objects.forEach(obj => { if (obj.layer === undefined) obj.layer = 0; });
  }
  state.selected = null;
  state.multiSelected.clear();
  updateObjectList();
  updateProperties();
  updateLayerList();
  calculateAllIntersections();
  updateMachineTypeBtn();
  updateXDisplayBtn();
}

// ── Save / Load ──

/** Uloží aktuální projekt do IndexedDB. */
export async function saveProject() {
  const data = _buildProjectData();
  await setMeta('currentProjectData', data);
  await _saveToProjects(state.projectName, data);
  showToast("Projekt uložen");
  updateStatusProject();
}

/** Načte projekt z IndexedDB. */
export async function loadProject() {
  try {
    const data = await getMeta('currentProjectData');
    if (!data) {
      showToast("Žádný uložený projekt");
      return;
    }
    _loadProjectData(data);
    showToast(`Načteno ${state.objects.length} objektů`);
  } catch (e) {
    showToast("Chyba při načítání projektu");
  }
}

/** @param {string} name */
export async function openProject(name) {
  const data = await loadProjectFromDB(name);
  if (!data) { showToast('Projekt nenalezen'); return; }
  _loadProjectData(data);
  state.projectName = name;
  updateStatusProject();
  showToast(`Otevřen projekt: ${name}`);
}

/** @param {string} name */
export async function deleteProject(name) {
  await deleteProjectFromDB(name);
  showToast(`Projekt "${name}" smazán`);
}

/**
 * @param {string} oldName
 * @param {string} newName
 */
export async function renameProject(oldName, newName) {
  if (!newName || newName.trim() === '') return;
  newName = newName.trim();
  const data = await loadProjectFromDB(oldName);
  if (!data) return;
  const existing = await loadProjectFromDB(newName);
  if (existing) { showToast('Projekt s tímto názvem již existuje'); return; }
  await saveProjectToDB(newName, data);
  await deleteProjectFromDB(oldName);
  if (state.projectName === oldName) {
    state.projectName = newName;
    updateStatusProject();
  }
  showToast(`Přejmenováno na "${newName}"`);
}

/** @param {string} name */
export async function duplicateProject(name) {
  const data = await loadProjectFromDB(name);
  if (!data) return;
  const allProjects = await getAllProjects();
  let newName = name + ' (kopie)';
  let i = 2;
  while (allProjects[newName]) { newName = name + ` (kopie ${i++})`; }
  const copy = deepClone(data);
  copy.savedAt = new Date().toISOString();
  await saveProjectToDB(newName, copy);
  showToast(`Vytvořena kopie: ${newName}`);
}

/** Vytvoří nový prázdný projekt. */
export function newProject() {
  pushUndo();
  state.objects = [];
  state.nextId = 1;
  state.selected = null;
  state.multiSelected.clear();
  state.intersections = [];
  state.projectName = 'Bez názvu';
  state.layers = [
    { id: 0, name: 'Kontura', color: COLORS.primary, visible: true, locked: false },
    { id: 1, name: 'Konstrukce', color: COLORS.construction, visible: true, locked: false },
    { id: 2, name: 'Kóty', color: COLORS.dimension, visible: true, locked: false },
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

  async function doSave() {
    const name = inp.value.trim();
    if (!name) return;
    state.projectName = name;
    const data = _buildProjectData();
    await setMeta('currentProjectData', data);
    await _saveToProjects(name, data);
    updateStatusProject();
    overlay.remove();
    showToast(`Uloženo jako "${name}"`);
  }

  overlay.querySelector('#saveAsOk').addEventListener('click', doSave);
  overlay.querySelector('#saveAsCancel').addEventListener('click', () => overlay.remove());
}

/** Otevře dialog se správou projektů. */
export async function showProjectsDialog() {
  const projects = await getAllProjects();

  const overlay = document.createElement('div');
  overlay.className = 'input-overlay';

  function buildList(projs) {
    let html = '';
    const sortedNames = Object.keys(projs).sort((a, b) => {
      return (projs[b].savedAt || '').localeCompare(projs[a].savedAt || '');
    });
    if (sortedNames.length === 0) {
      html = '<li style="color:' + COLORS.textMuted + ';padding:12px;text-align:center">Žádné uložené projekty</li>';
    } else {
      for (const name of sortedNames) {
        const p = projs[name];
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
      <ul class="project-list">${buildList(projects)}</ul>
      <div class="btn-row" style="flex-direction:column;gap:8px;align-items:stretch">
        <button class="btn-ok" id="projNew" style="width:100%">➕ Nový projekt</button>
        <button class="btn-cancel" id="projClose" style="width:100%">Zavřít</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  async function refreshList() {
    const freshProjs = await getAllProjects();
    overlay.querySelector('.project-list').innerHTML = buildList(freshProjs);
    attachListeners();
  }

  function attachListeners() {
    overlay.querySelectorAll('.project-item').forEach(item => {
      const name = item.dataset.name;
      item.querySelectorAll('.project-action-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const act = btn.dataset.act;
          if (act === 'open') {
            await openProject(name);
            overlay.remove();
          } else if (act === 'rename') {
            const newName = prompt('Nový název:', name);
            if (newName && newName.trim()) {
              await renameProject(name, newName.trim());
              await refreshList();
            }
          } else if (act === 'duplicate') {
            await duplicateProject(name);
            await refreshList();
          } else if (act === 'delete') {
            if (confirm(`Opravdu smazat "${name}"?`)) {
              await deleteProject(name);
              await refreshList();
            }
          }
        });
      });
      // Double-click to open
      item.addEventListener('dblclick', async () => {
        await openProject(name);
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

// ── Tlačítka ──
document.getElementById("btnSave").addEventListener("click", saveProject);
document.getElementById("btnProjects")?.addEventListener("click", () => showProjectsDialog());
