// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Inicializace aplikace                              ║
// ╚══════════════════════════════════════════════════════════════╝

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

console.log(
  "%c SKICA – CAD pro CNC soustružník v3 (X,Z) ",
  "background:#89b4fa;color:#1e1e2e;font-size:18px;font-weight:bold;padding:4px 12px;border-radius:4px;",
);
console.log(
  "Klávesové zkratky: V=Výběr, W=Přesun, P=Bod, L=Úsečka, K=Konstr., C=Kružnice, A=Oblouk, R=Obdélník, M=Měření, G=Snap, D=Kóty, N=Čísla, Shift+N=Polární, Ctrl+Z=Zpět, Ctrl+Y=Vpřed, Ctrl+S=Uložit, Del=Smazat",
);
