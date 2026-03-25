// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Inicializace aplikace (ES Module entry point)      ║
// ╚══════════════════════════════════════════════════════════════╝

import { state } from './state.js';
import { resizeCanvases } from './canvas.js';
import { calculateAllIntersections } from './geometry.js';
import { updateObjectList, updateProperties, resetHint, updateDimsBtn, updateSnapPtsBtn, updateCoordModeBtn, togglePanel } from './ui.js';
import { initAutoSave } from './storage.js';

// Side-effect imports — tyto moduly registrují event listenery při načtení
import './render.js';
import './objects.js';
import './events.js';
import './touch.js';
import './dialogs.js';

// ── Expose togglePanel for inline onclick in HTML ──
window.togglePanel = togglePanel;

// ── Auto-load při startu ──
function tryAutoLoad() {
  const raw = localStorage.getItem("skica_project");
  if (raw) {
    try {
      const data = JSON.parse(raw);
      if (data.objects && data.objects.length > 0) {
        state.objects = data.objects;
        state.nextId = data.nextId || 1;
        if (data.gridSize && data.gridSize > 0)
          state.gridSize = data.gridSize;
        if (data.coordMode) state.coordMode = data.coordMode;
        if (data.incReference) state.incReference = data.incReference;
        updateObjectList();
        updateProperties();
      }
    } catch (e) {}
  }
}

// ── Auto-save každých 30 s ──
setInterval(() => {
  if (state.objects.length > 0) {
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
  }
}, 30000);

// ── Inicializace ──
tryAutoLoad();
resizeCanvases();
if (state.objects.length > 0) calculateAllIntersections();
resetHint();
updateDimsBtn();
updateSnapPtsBtn();
updateCoordModeBtn();
initAutoSave();

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
  "Klávesové zkratky: V=Výběr, W=Přesun, P=Bod, L=Úsečka, K=Konstr., C=Kružnice, A=Oblouk, R=Obdélník, M=Měření, S=Snap, D=Kóty, N=Čísla, Shift+N=Polární, I=ABS/INC, Ctrl+Z=Zpět, Ctrl+Y=Vpřed, Ctrl+S=Uložit, Del=Smazat",
);
