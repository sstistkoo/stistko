// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Inicializace aplikace (ES Module entry point)      ║
// ╚══════════════════════════════════════════════════════════════╝

import { state } from './state.js';
import { resizeCanvases } from './canvas.js';
import { calculateAllIntersections } from './geometry.js';
import { updateObjectList, updateProperties, resetHint, updateDimsBtn, updateSnapPtsBtn, updateCoordModeBtn, updateMachineTypeBtn, updateXDisplayBtn, togglePanel, updateLayerList, updateStatusProject, checkFirstRunHelp } from './ui.js';
import { initAutoSave } from './storage.js';
import { getMeta, setMeta, migrateFromLocalStorage } from './idb.js';
import { bridge } from './bridge.js';

// Side-effect imports — tyto moduly registrují event listenery při načtení
import './render.js';
import './objects.js';
import './events.js';
import './touch.js';
import './dialogs.js';

// ── Expose togglePanel for inline onclick in HTML ──
window.togglePanel = togglePanel;

// ── Auto-load při startu ──
async function tryAutoLoad() {
  try {
    const data = await getMeta('currentProjectData');
    if (data && data.objects && data.objects.length > 0) {
      state.objects = data.objects;
      state.nextId = data.nextId || 1;
      if (data.gridSize && data.gridSize > 0)
        state.gridSize = data.gridSize;
      if (data.coordMode) state.coordMode = data.coordMode;
      if (data.incReference) state.incReference = data.incReference;
      if (data.machineType) state.machineType = data.machineType;
      state.xDisplayMode = data.xDisplayMode || 'radius';
      if (data.layers) {
        state.layers = data.layers;
        state.activeLayer = data.activeLayer || 0;
        state.nextLayerId = data.nextLayerId || (Math.max(...data.layers.map(l => l.id)) + 1);
      } else {
        state.objects.forEach(obj => { if (obj.layer === undefined) obj.layer = 0; });
      }
      updateObjectList();
      updateProperties();
      updateLayerList();
    }
  } catch (e) {}
}

// ── Auto-save každých 30 s ──
setInterval(() => {
  if (state.objects.length > 0) {
    const data = {
      version: 3.1,
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
    setMeta('currentProjectData', data);
  }
}, 30000);

// ── Inicializace ──
(async () => {
  await migrateFromLocalStorage();
  await tryAutoLoad();
  resizeCanvases();
  if (state.objects.length > 0) calculateAllIntersections();
  resetHint();
  updateDimsBtn();
  updateSnapPtsBtn();
  updateCoordModeBtn();
  updateMachineTypeBtn();
  updateXDisplayBtn();
  updateLayerList();
  initAutoSave();
  updateStatusProject();
  if (bridge.updateMobileCoords) bridge.updateMobileCoords(0, 0);
  checkFirstRunHelp();
})();

// ── PWA Service Worker ──
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js")
    .then(() => console.log("SW: Registrován"))
    .catch((e) => console.warn("SW: Chyba", e));
}

console.log(
  "%c SKICA – CAD pro CNC soustružník v3 (X,Z) ",
  "background:#89b4fa;color:#1e1e2e;font-size:18px;font-weight:bold;padding:4px 12px;border-radius:4px;",
);
console.log(
  "Klávesové zkratky: V=Výběr, W=Přesun, P=Bod, L=Úsečka, K=Konstr., C=Kružnice, A=Oblouk, R=Obdélník, M=Měření, S=Snap, D=Kóty, N=Čísla, Shift+N=Polární, I=ABS/INC, X=Oříz, E=Prodl., F=Zaoblení, J=Kolmice, H=Rovnob., U=Kóta, Ctrl+Z=Zpět, Ctrl+Y=Vpřed, Ctrl+S=Uložit, Del=Smazat",
);
