// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Dialogy (měření, poloměr, čísla, polární)         ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, showToast, pushUndo, toDisplayCoords, fromIncToAbs } from './state.js';
import { addObject } from './objects.js';
import { screenToWorld, snapPt, drawCanvas } from './canvas.js';
import { renderAll } from './render.js';
import { typeLabel, getObjectSnapPoints, bulgeToArc, radiusToBulge } from './utils.js';
import { updateObjectList, updateProperties, resetHint } from './ui.js';
import { calculateAllIntersections, offsetObject, mirrorObject, linearArray } from './geometry.js';

// ── Helper: nastaví inputmode="decimal" na všechna numerická pole v elementu ──
/** @param {HTMLElement} container */
export function applyMobileInputMode(container) {
  container.querySelectorAll('input[type="number"]').forEach((inp) => {
    inp.setAttribute("inputmode", "decimal");
  });
}

// Auto-apply inputmode na nové dialogy
const _dialogObserver = new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType === 1 && node.classList && node.classList.contains("input-overlay")) {
        applyMobileInputMode(node);
      }
    }
  }
});
_dialogObserver.observe(document.body, { childList: true });

// ── Měření – dialog výsledku ──
/**
 * @param {import('./types.js').Point2D} p1
 * @param {import('./types.js').Point2D} p2
 * @param {number} d
 * @param {number} angle
 */
export function showMeasureResult(p1, p2, d, angle) {
  const dp1 = toDisplayCoords(p1.x, p1.y);
  const dp2 = toDisplayCoords(p2.x, p2.y);
  const pf = state.coordMode === 'inc' ? 'Δ' : '';
  const incRow = state.coordMode === 'inc' ? `
        <tr><td colspan="2" style="color:#585b70;font-size:11px;padding-top:6px">── Inkrementální (od reference) ──</td></tr>
        <tr><td style="color:#a6adc8">${pf}Bod 1:</td><td style="color:#f5c2e7">${pf}X${dp1.x.toFixed(3)} ${pf}Z${dp1.y.toFixed(3)}</td></tr>
        <tr><td style="color:#a6adc8">${pf}Bod 2:</td><td style="color:#f5c2e7">${pf}X${dp2.x.toFixed(3)} ${pf}Z${dp2.y.toFixed(3)}</td></tr>
  ` : '';
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>📏 Výsledek měření</h3>
      <table style="width:100%;font-family:Consolas;font-size:13px;">
        <tr><td style="color:#a6adc8">Vzdálenost:</td><td style="color:#f9e2af">${d.toFixed(3)} mm</td></tr>
        <tr><td style="color:#a6adc8">Úhel:</td><td style="color:#f9e2af">${angle.toFixed(2)}°</td></tr>
        <tr><td style="color:#a6adc8">ΔX:</td><td style="color:#f5c2e7">${(p2.x - p1.x).toFixed(3)}</td></tr>
        <tr><td style="color:#a6adc8">ΔZ:</td><td style="color:#f5c2e7">${(p2.y - p1.y).toFixed(3)}</td></tr>
        <tr><td style="color:#a6adc8">Bod 1:</td><td style="color:#89b4fa">X${p1.x.toFixed(3)} Z${p1.y.toFixed(3)}</td></tr>
        <tr><td style="color:#a6adc8">Bod 2:</td><td style="color:#89b4fa">X${p2.x.toFixed(3)} Z${p2.y.toFixed(3)}</td></tr>
        ${incRow}
      </table>
      <div class="btn-row">
        <button class="btn-cancel" id="measureAddDim">📐 Přidat kótu</button>
        <button class="btn-ok" onclick="this.closest('.input-overlay').remove()">OK</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay
    .querySelector("#measureAddDim")
    .addEventListener("click", () => {
      // Přidat kótovací úsečku jako objekt
      addObject({
        type: "line",
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        name: `Kóta ${d.toFixed(2)}mm`,
        isDimension: true,
        color: "#9399b2",
      });
      showToast(`Kóta ${d.toFixed(2)}mm přidána`);
      overlay.remove();
    });
  overlay.querySelector(".btn-ok").focus();
}

// ── Dialog pro zadání poloměru kružnice ──
/** Otevře dialog pro přímé zadání poloměru kružnice. */
export function showCircleRadiusDialog() {
  const cp = state.tempPoints[0];
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>Kružnice – zadání poloměru</h3>
      <label>Střed: X=${cp.x.toFixed(2)}, Z=${cp.y.toFixed(2)}</label>
      <label>Poloměr (mm):</label>
      <input type="number" id="dlgRadius" step="0.001" min="0.001" value="10" inputmode="decimal" autofocus>
      <div class="btn-row">
        <button class="btn-cancel" onclick="this.closest('.input-overlay').remove()">Zrušit</button>
        <button class="btn-ok" id="dlgOk">OK</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const inp = overlay.querySelector("#dlgRadius");
  inp.focus();
  inp.select();
  const accept = () => {
    const r = parseFloat(inp.value);
    if (r > 0) {
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
    overlay.remove();
  };
  overlay.querySelector("#dlgOk").addEventListener("click", accept);
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") accept();
    if (e.key === "Escape") overlay.remove();
  });
}

// ── Numerický vstup – dialog pro přesné zadání souřadnic ──
document
  .getElementById("btnNumInput")
  .addEventListener("click", showNumericalInputDialog);

// Stav pro chaining je uložen v state.numDialogChain

/** Otevře dialog pro číselné zadání souřadnic objektu. */
export function showNumericalInputDialog() {
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog" style="min-width:400px">
      <h3>🔢 Číselné zadání objektu</h3>
      <div id="numModeInfo" style="font-size:11px;margin-bottom:8px;padding:4px 8px;border-radius:4px;font-family:Consolas;${state.coordMode === 'inc' ? 'background:#f9e2af22;color:#f9e2af' : 'color:#6c7086'}">
        Režim: ${state.coordMode === 'inc' ? 'INC (přírůstkový) – hodnoty jsou Δ od reference X=' + state.incReference.x.toFixed(3) + ' Z=' + state.incReference.y.toFixed(3) : 'ABS (absolutní)'}
      </div>
      <label>Typ objektu:</label>
      <select id="numType">
        <option value="point">Bod</option>
        <option value="line" selected>Úsečka</option>
        <option value="constr">Konstrukční čára</option>
        <option value="circle">Kružnice</option>
        <option value="arc">Oblouk</option>
        <option value="rect">Obdélník</option>
        <option value="polyline">Kontura</option>
      </select>
      <div id="numFields"></div>
      <div class="btn-row">
        <button class="btn-cancel" id="numCancel">Zrušit</button>
        <button class="btn-ok" id="numOk">Vytvořit</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const typeSelect = overlay.querySelector("#numType");
  const fieldsDiv = overlay.querySelector("#numFields");

  // -- Pick from map helper --
  let _pickCallback = null;

  function pickFromMap(callback) {
    _pickCallback = callback;
    overlay.style.display = "none";
    showToast("Klikněte na mapu pro výběr bodu...");

    function onPick(e) {
      const rect = drawCanvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      let [wx, wy] = screenToWorld(sx, sy);
      if (state.snapToPoints) [wx, wy] = snapPt(wx, wy);
      drawCanvas.removeEventListener("click", onPick);
      drawCanvas.removeEventListener("touchend", onTouch);
      overlay.style.display = "flex";
      callback(wx, wy);
    }

    function onTouch(e) {
      if (e.changedTouches.length === 1) {
        const t = e.changedTouches[0];
        const rect = drawCanvas.getBoundingClientRect();
        const sx = t.clientX - rect.left;
        const sy = t.clientY - rect.top;
        let [wx, wy] = screenToWorld(sx, sy);
        if (state.snapToPoints) [wx, wy] = snapPt(wx, wy);
        drawCanvas.removeEventListener("click", onPick);
        drawCanvas.removeEventListener("touchend", onTouch);
        overlay.style.display = "flex";
        e.preventDefault();
        callback(wx, wy);
      }
    }

    drawCanvas.addEventListener("click", onPick, { once: true });
    drawCanvas.addEventListener("touchend", onTouch, { once: true });
  }

  function pickBtn(label) {
    return `<button type="button" class="pick-btn" title="Vybrat z mapy">${label}</button>`;
  }

  // Chain values
  const chainX = state.numDialogChain.x !== null ? state.numDialogChain.x.toFixed(3) : "0";
  const chainY = state.numDialogChain.y !== null ? state.numDialogChain.y.toFixed(3) : "0";
  const hasChain = state.numDialogChain.x !== null;
  const isInc = state.coordMode === 'inc';
  const lbl = (name) => isInc ? 'Δ' + name : name;
  // V INC režimu chain hodnoty zobrazit jako delta od reference
  const chainDispX = hasChain ? (isInc ? (state.numDialogChain.x - state.incReference.x).toFixed(3) : chainX) : "0";
  const chainDispY = hasChain ? (isInc ? (state.numDialogChain.y - state.incReference.y).toFixed(3) : chainY) : "0";

  function updateFields() {
    const t = typeSelect.value;
    let html = "";
    switch (t) {
      case "point":
        html = `<div class="input-row"><div><label>${lbl('X')}:</label><input type="number" id="nx" step="0.001" value="${hasChain ? chainDispX : '0'}"></div>
                <div><label>${lbl('Z')}:</label><input type="number" id="ny" step="0.001" value="${hasChain ? chainDispY : '0'}"></div>
                <div class="pick-col">${pickBtn("🎯")}</div></div>
                ${hasChain ? '<div id="numChainInfo" style="font-size:11px;color:#9399b2;margin-top:4px"></div>' : ''}`;
        break;
      case "line":
      case "constr":
        html = `<div class="input-row"><div><label>${lbl('X1')}:</label><input type="number" id="nx1" step="0.001" value="${hasChain ? chainDispX : '0'}"></div>
                <div><label>${lbl('Z1')}:</label><input type="number" id="ny1" step="0.001" value="${hasChain ? chainDispY : '0'}"></div>
                <div class="pick-col">${pickBtn("🎯1")}</div></div>
                <div class="input-row"><div><label>${lbl('X2')}:</label><input type="number" id="nx2" step="0.001" value="0"></div>
                <div><label>${lbl('Z2')}:</label><input type="number" id="ny2" step="0.001" value="0"></div>
                <div class="pick-col">${pickBtn("🎯2")}</div></div>
                <div id="numLineInfo" style="font-size:11px;color:#9399b2;margin-top:4px"></div>
                <label style="font-size:11px;color:#6c7086;margin-top:4px">Nebo: Délka a polární úhel</label>
                <div class="input-row"><div><label>Délka:</label><input type="number" id="nlen" step="0.001" value=""></div>
                <div><label>Úhel (°):</label><input type="number" id="nang" step="0.001" value=""></div></div>`;
        break;
      case "circle":
        html = `<div class="input-row"><div><label>${lbl('Střed X')}:</label><input type="number" id="ncx" step="0.001" value="${hasChain ? chainDispX : '0'}"></div>
                <div><label>${lbl('Střed Z')}:</label><input type="number" id="ncy" step="0.001" value="${hasChain ? chainDispY : '0'}"></div>
                <div class="pick-col">${pickBtn("🎯")}</div></div>
                <div class="input-row"><div><label>Poloměr:</label><input type="number" id="nr" step="0.001" value="10"></div>
                <div class="pick-col">${pickBtn("📏 R")}</div></div>`;
        break;
      case "arc":
        html = `<div class="input-row"><div><label>${lbl('Střed X')}:</label><input type="number" id="ncx" step="0.001" value="${hasChain ? chainDispX : '0'}"></div>
                <div><label>${lbl('Střed Z')}:</label><input type="number" id="ncy" step="0.001" value="${hasChain ? chainDispY : '0'}"></div>
                <div class="pick-col">${pickBtn("🎯")}</div></div>
                <div class="input-row"><div><label>Poloměr:</label><input type="number" id="nr" step="0.001" value="10"></div>
                <div class="pick-col">${pickBtn("📏 R")}</div></div>
                <div class="input-row"><div><label>Start (°):</label><input type="number" id="nsa" step="1" value="0"></div>
                <div class="pick-col">${pickBtn("📐 S")}</div></div>
                <div class="input-row"><div><label>Konec (°):</label><input type="number" id="nea" step="1" value="90"></div>
                <div class="pick-col">${pickBtn("📐 E")}</div></div>`;
        break;
      case "rect":
        html = `<div class="input-row"><div><label>${lbl('X1')}:</label><input type="number" id="nx1" step="0.001" value="${hasChain ? chainDispX : '0'}"></div>
                <div><label>${lbl('Z1')}:</label><input type="number" id="ny1" step="0.001" value="${hasChain ? chainDispY : '0'}"></div>
                <div class="pick-col">${pickBtn("🎯1")}</div></div>
                <div class="input-row"><div><label>${lbl('X2')}:</label><input type="number" id="nx2" step="0.001" value="0"></div>
                <div><label>${lbl('Z2')}:</label><input type="number" id="ny2" step="0.001" value="0"></div>
                <div class="pick-col">${pickBtn("🎯2")}</div></div>
                <label style="font-size:11px;color:#6c7086;margin-top:4px">Nebo: Šířka × Výška od bodu 1</label>
                <div class="input-row"><div><label>Šířka:</label><input type="number" id="nw" step="0.001" value=""></div>
                <div><label>Výška:</label><input type="number" id="nh" step="0.001" value=""></div></div>`;
        break;
      case "polyline":
        html = `<div style="font-size:12px;color:#a6adc8;margin-bottom:8px">Zadávejte body po jednom. Klikněte "Přidat bod" pro každý vrchol kontury.</div>
                <div class="input-row"><div><label>${lbl('X')}:</label><input type="number" id="nx" step="0.001" value="${hasChain ? chainDispX : '0'}"></div>
                <div><label>${lbl('Z')}:</label><input type="number" id="ny" step="0.001" value="${hasChain ? chainDispY : '0'}"></div>
                <div class="pick-col">${pickBtn("🎯")}</div></div>
                <div id="polyVertexList" style="max-height:150px;overflow-y:auto;font-size:11px;font-family:Consolas;color:#a6adc8;margin:8px 0;padding:4px;background:#11111b;border-radius:4px;display:none"></div>
                <div style="display:flex;gap:6px;margin-bottom:8px">
                  <button class="btn-ok" id="polyAddVtx" style="font-size:11px;padding:3px 8px;flex:1">➕ Přidat bod</button>
                  <label style="font-size:11px;display:flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap">
                    <input type="checkbox" id="polyClosed"> Uzavřená
                  </label>
                </div>`;
        break;
    }
    fieldsDiv.innerHTML = html;

    // Wire pick buttons
    const pickBtns = fieldsDiv.querySelectorAll(".pick-btn");
    pickBtns.forEach((btn, i) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        pickFromMap((wx, wy) => {
          const t2 = typeSelect.value;
          // V INC režimu převést absolutní souřadnice na delta pro pole
          const dp = isInc ? toDisplayCoords(wx, wy) : { x: wx, y: wy };
          if (t2 === "point") {
            const nx = overlay.querySelector("#nx");
            const ny = overlay.querySelector("#ny");
            if (nx) nx.value = dp.x.toFixed(3);
            if (ny) ny.value = dp.y.toFixed(3);
            updateChainInfo();
          } else if (t2 === "line" || t2 === "constr" || t2 === "rect") {
            if (i === 0) {
              const f1 = overlay.querySelector("#nx1");
              const f2 = overlay.querySelector("#ny1");
              if (f1) f1.value = dp.x.toFixed(3);
              if (f2) f2.value = dp.y.toFixed(3);
            } else {
              const f1 = overlay.querySelector("#nx2");
              const f2 = overlay.querySelector("#ny2");
              if (f1) f1.value = dp.x.toFixed(3);
              if (f2) f2.value = dp.y.toFixed(3);
              // Auto-fill rect width/height (delta od delta = absolutní rozdíl)
              if (t2 === "rect") {
                const x1v = parseFloat(overlay.querySelector("#nx1")?.value) || 0;
                const y1v = parseFloat(overlay.querySelector("#ny1")?.value) || 0;
                const nw = overlay.querySelector("#nw");
                const nh = overlay.querySelector("#nh");
                if (nw) nw.value = (dp.x - x1v).toFixed(3);
                if (nh) nh.value = (dp.y - y1v).toFixed(3);
              }
            }
            updateLineInfo();
          } else if (t2 === "circle" || t2 === "arc") {
            const cxInp = overlay.querySelector("#ncx");
            const cyInp = overlay.querySelector("#ncy");
            const rInp = overlay.querySelector("#nr");
            const saInp = overlay.querySelector("#nsa");
            const eaInp = overlay.querySelector("#nea");
            const cx = parseFloat(cxInp ? cxInp.value : 0) || 0;
            const cy = parseFloat(cyInp ? cyInp.value : 0) || 0;
            // Pro výpočet poloměru/úhlu potřebujeme absolutní střed
            const absCenter = isInc ? fromIncToAbs(cx, cy) : { x: cx, y: cy };
            if (i === 0) {
              // Pick středu
              if (cxInp) cxInp.value = dp.x.toFixed(3);
              if (cyInp) cyInp.value = dp.y.toFixed(3);
            } else if (i === 1) {
              // Pick bodu pro poloměr – vzdálenost od absolutního středu
              if (rInp) {
                const r = Math.hypot(wx - absCenter.x, wy - absCenter.y);
                rInp.value = r.toFixed(3);
              }
            } else if (i === 2 && saInp) {
              // Pick bodu pro start úhel
              const ang = Math.atan2(wy - absCenter.y, wx - absCenter.x) * 180 / Math.PI;
              saInp.value = ang.toFixed(2);
            } else if (i === 3 && eaInp) {
              // Pick bodu pro konec úhel
              const ang = Math.atan2(wy - absCenter.y, wx - absCenter.x) * 180 / Math.PI;
              eaInp.value = ang.toFixed(2);
            }
          }
          showToast(`Bod: X${wx.toFixed(2)} Z${wy.toFixed(2)}`);
        });
      });
    });

    const first = fieldsDiv.querySelector("input");
    if (first) setTimeout(() => first.focus(), 50);

    // Přidat inputmode="decimal" pro numerická pole (mobilní klávesnice)
    fieldsDiv.querySelectorAll('input[type="number"]').forEach((inp) => {
      inp.setAttribute("inputmode", "decimal");
    });

    // Auto-update info pro úsečky/konstr.
    function updateLineInfo() {
      const info = fieldsDiv.querySelector("#numLineInfo");
      if (!info) return;
      const x1 = parseFloat(fieldsDiv.querySelector("#nx1")?.value);
      const y1 = parseFloat(fieldsDiv.querySelector("#ny1")?.value);
      const x2 = parseFloat(fieldsDiv.querySelector("#nx2")?.value);
      const y2 = parseFloat(fieldsDiv.querySelector("#ny2")?.value);
      if ([x1,y1,x2,y2].every(v => isFinite(v))) {
        const d = Math.hypot(x2-x1, y2-y1);
        const a = Math.atan2(y2-y1, x2-x1) * 180 / Math.PI;
        info.textContent = `Délka: ${d.toFixed(3)} mm  |  Úhel: ${a.toFixed(2)}°`;
      }
    }
    ["#nx1","#ny1","#nx2","#ny2"].forEach(sel => {
      const inp = fieldsDiv.querySelector(sel);
      if (inp) inp.addEventListener("input", updateLineInfo);
    });
    updateLineInfo();

    // Auto-update info pro bod (chain distance)
    function updateChainInfo() {
      const info = fieldsDiv.querySelector("#numChainInfo");
      if (!info || !hasChain) return;
      const nx = parseFloat(fieldsDiv.querySelector("#nx")?.value);
      const ny = parseFloat(fieldsDiv.querySelector("#ny")?.value);
      if (isFinite(nx) && isFinite(ny)) {
        // V INC režimu pole obsahuje delta – převést na absolutní pro porovnání s chain
        const abs = isInc ? fromIncToAbs(nx, ny) : { x: nx, y: ny };
        const d = Math.hypot(abs.x - state.numDialogChain.x, abs.y - state.numDialogChain.y);
        const a = Math.atan2(abs.y - state.numDialogChain.y, abs.x - state.numDialogChain.x) * 180 / Math.PI;
        info.textContent = `Od předchozího: ${d.toFixed(3)} mm  |  Úhel: ${a.toFixed(2)}°`;
      }
    }
    ["#nx","#ny"].forEach(sel => {
      const inp = fieldsDiv.querySelector(sel);
      if (inp) inp.addEventListener("input", updateChainInfo);
    });
    updateChainInfo();

    // Rect: sync W/H ↔ X2/Z2
    function syncRectWH() {
      const nw = fieldsDiv.querySelector("#nw");
      const nh = fieldsDiv.querySelector("#nh");
      if (!nw || !nh) return;
      const x1 = parseFloat(fieldsDiv.querySelector("#nx1")?.value);
      const y1 = parseFloat(fieldsDiv.querySelector("#ny1")?.value);
      const x2f = fieldsDiv.querySelector("#nx2");
      const y2f = fieldsDiv.querySelector("#ny2");
      // W/H → X2/Z2
      nw.addEventListener("input", () => {
        const w = parseFloat(nw.value);
        if (isFinite(x1) && isFinite(w) && x2f) x2f.value = (x1 + w).toFixed(3);
      });
      nh.addEventListener("input", () => {
        const h = parseFloat(nh.value);
        if (isFinite(y1) && isFinite(h) && y2f) y2f.value = (y1 + h).toFixed(3);
      });
      // X2/Z2 → W/H
      if (x2f) x2f.addEventListener("input", () => {
        const v = parseFloat(x2f.value);
        if (isFinite(x1) && isFinite(v)) nw.value = (v - x1).toFixed(3);
      });
      if (y2f) y2f.addEventListener("input", () => {
        const v = parseFloat(y2f.value);
        if (isFinite(y1) && isFinite(v)) nh.value = (v - y1).toFixed(3);
      });
    }
    syncRectWH();

    // Polyline vertex management
    const polyAddBtn = fieldsDiv.querySelector("#polyAddVtx");
    if (polyAddBtn) {
      if (!overlay._polyVerts) overlay._polyVerts = [];
      if (!overlay._polyBulges) overlay._polyBulges = [];
      const vtxList = fieldsDiv.querySelector("#polyVertexList");

      function updateVtxList() {
        if (overlay._polyVerts.length > 0) {
          vtxList.style.display = "";
          vtxList.innerHTML = overlay._polyVerts.map((v, vi) =>
            `<div>V${vi + 1}: X${v.x.toFixed(3)} Z${v.y.toFixed(3)}</div>`
          ).join("");
          vtxList.scrollTop = vtxList.scrollHeight;
        }
      }

      polyAddBtn.addEventListener("click", () => {
        const vx = parseFloat(fieldsDiv.querySelector("#nx")?.value);
        const vy = parseFloat(fieldsDiv.querySelector("#ny")?.value);
        if (!isFinite(vx) || !isFinite(vy)) return;
        const abs = isInc ? fromIncToAbs(vx, vy) : { x: vx, y: vy };
        overlay._polyVerts.push(abs);
        if (overlay._polyVerts.length > 1) {
          overlay._polyBulges.push(0);
        }
        updateVtxList();
        showToast(`Bod ${overlay._polyVerts.length}: X${abs.x.toFixed(2)} Z${abs.y.toFixed(2)}`);
      });
      updateVtxList();
    }
  }

  typeSelect.addEventListener("change", updateFields);
  updateFields();

  // Highlight chained start point
  if (hasChain) {
    showToast(`Pokračování od X${state.numDialogChain.x.toFixed(2)} Z${state.numDialogChain.y.toFixed(2)}`);
  }

  function createObject() {
    const t = typeSelect.value;
    // Konverze INC → ABS
    const toAbs = (vx, vy) => isInc ? fromIncToAbs(vx, vy) : { x: vx, y: vy };
    try {
      switch (t) {
        case "point": {
          const raw = toAbs(
            parseFloat(overlay.querySelector("#nx").value),
            parseFloat(overlay.querySelector("#ny").value)
          );
          addObject({ type: "point", x: raw.x, y: raw.y, name: `Bod ${state.nextId}` });
          state.numDialogChain = { x: raw.x, y: raw.y };
          break;
        }
        case "line":
        case "constr": {
          let p1 = toAbs(
            parseFloat(overlay.querySelector("#nx1").value),
            parseFloat(overlay.querySelector("#ny1").value)
          );
          let x2r = parseFloat(overlay.querySelector("#nx2").value);
          let y2r = parseFloat(overlay.querySelector("#ny2").value);
          const len = parseFloat(overlay.querySelector("#nlen").value);
          const ang = parseFloat(overlay.querySelector("#nang").value);
          if (!isNaN(len) && !isNaN(ang) && len > 0) {
            const rad = (ang * Math.PI) / 180;
            // Polární vždy od bodu 1 (absolutního)
            x2r = (isInc ? 0 : p1.x) + len * Math.cos(rad);
            y2r = (isInc ? 0 : p1.y) + len * Math.sin(rad);
            if (isInc) {
              // Polar délka+úhel v INC = delta od bodu 1
              const abs2 = { x: p1.x + len * Math.cos(rad), y: p1.y + len * Math.sin(rad) };
              addObject({
                type: t,
                x1: p1.x, y1: p1.y, x2: abs2.x, y2: abs2.y,
                name: `${t === "constr" ? "Konstr" : "Úsečka"} ${state.nextId}`,
                dashed: t === "constr",
              });
              state.numDialogChain = { x: abs2.x, y: abs2.y };
              break;
            }
          }
          let p2 = toAbs(x2r, y2r);
          addObject({
            type: t,
            x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
            name: `${t === "constr" ? "Konstr" : "Úsečka"} ${state.nextId}`,
            dashed: t === "constr",
          });
          state.numDialogChain = { x: p2.x, y: p2.y };
          break;
        }
        case "circle": {
          const c = toAbs(
            parseFloat(overlay.querySelector("#ncx").value),
            parseFloat(overlay.querySelector("#ncy").value)
          );
          const r = parseFloat(overlay.querySelector("#nr").value);
          addObject({
            type: "circle", cx: c.x, cy: c.y, r,
            name: `Kružnice ${state.nextId}`,
          });
          state.numDialogChain = { x: c.x, y: c.y };
          break;
        }
        case "arc": {
          const c = toAbs(
            parseFloat(overlay.querySelector("#ncx").value),
            parseFloat(overlay.querySelector("#ncy").value)
          );
          const r = parseFloat(overlay.querySelector("#nr").value);
          const sa =
            (parseFloat(overlay.querySelector("#nsa").value) * Math.PI) / 180;
          const ea =
            (parseFloat(overlay.querySelector("#nea").value) * Math.PI) / 180;
          addObject({
            type: "arc", cx: c.x, cy: c.y, r,
            startAngle: sa, endAngle: ea,
            name: `Oblouk ${state.nextId}`,
          });
          const endX = c.x + r * Math.cos(ea);
          const endY = c.y + r * Math.sin(ea);
          state.numDialogChain = { x: endX, y: endY };
          break;
        }
        case "rect": {
          let p1 = toAbs(
            parseFloat(overlay.querySelector("#nx1").value),
            parseFloat(overlay.querySelector("#ny1").value)
          );
          let x2r = parseFloat(overlay.querySelector("#nx2").value);
          let y2r = parseFloat(overlay.querySelector("#ny2").value);
          const w = parseFloat(overlay.querySelector("#nw").value);
          const h = parseFloat(overlay.querySelector("#nh").value);
          if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
            // Šířka/výška je vždy relativní delta
            const p2 = { x: p1.x + w, y: p1.y + h };
            addObject({
              type: "rect", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
              name: `Obdélník ${state.nextId}`,
            });
            state.numDialogChain = { x: p2.x, y: p2.y };
            break;
          }
          let p2 = toAbs(x2r, y2r);
          addObject({
            type: "rect", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
            name: `Obdélník ${state.nextId}`,
          });
          state.numDialogChain = { x: p2.x, y: p2.y };
          break;
        }
        case "polyline": {
          const verts = overlay._polyVerts || [];
          if (verts.length < 2) {
            showToast("Kontura potřebuje alespoň 2 body");
            return false;
          }
          const closed = overlay.querySelector("#polyClosed")?.checked || false;
          const bulges = overlay._polyBulges || [];
          while (bulges.length < (closed ? verts.length : verts.length - 1)) bulges.push(0);
          addObject({
            type: "polyline",
            vertices: verts.slice(),
            bulges: bulges.slice(0, closed ? verts.length : verts.length - 1),
            closed,
            name: `Kontura ${state.nextId}`,
          });
          const lastV = verts[verts.length - 1];
          state.numDialogChain = { x: lastV.x, y: lastV.y };
          break;
        }
      }
      return true;
    } catch (err) {
      showToast("Chyba – zkontrolujte hodnoty");
      return false;
    }
  }

  // Vytvořit a zavřít
  overlay.querySelector("#numOk").addEventListener("click", () => {
    if (createObject()) overlay.remove();
  });

  // Zrušit
  overlay.querySelector("#numCancel").addEventListener("click", () => {
    state.numDialogChain = { x: null, y: null };
    overlay.remove();
  });

  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      if (createObject()) overlay.remove();
    }
    if (e.key === "Escape") overlay.remove();
  });
}

// ── Polární kreslení z referenčního bodu ──
document
  .getElementById("btnPolar")
  .addEventListener("click", showPolarDrawingDialog);

/** Otevře dialog pro polární kreslení (délka + úhel). */
export function showPolarDrawingDialog() {
  let refX = 0,
    refZ = 0;
  // V INC režimu použít incReference jako výchozí referenční bod
  if (state.coordMode === 'inc') {
    refX = state.incReference.x;
    refZ = state.incReference.y;
  }
  if (state.selected !== null) {
    const sel = state.objects[state.selected];
    if (sel.type === "point") {
      refX = sel.x;
      refZ = sel.y;
    } else if (sel.type === "line" || sel.type === "constr") {
      refX = sel.x2;
      refZ = sel.y2;
    } else if (sel.type === "circle" || sel.type === "arc") {
      refX = sel.cx;
      refZ = sel.cy;
    }
  }

  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog" style="min-width:460px">
      <h3>📐 Polární kreslení z bodu</h3>
      <p style="font-size:12px;color:#6c7086;margin-bottom:10px">
        Zadejte referenční bod a pak přidávejte segmenty pomocí délky a úhlu.<br>
        Vhodné pro překreslování z výkresů se zadanými hodnotami.
      </p>
      <label>Referenční bod:</label>
      <div class="input-row">
        <div><label>X:</label><input type="number" id="polRefX" step="0.001" value="${refX}"></div>
        <div><label>Z:</label><input type="number" id="polRefZ" step="0.001" value="${refZ}"></div>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:10px">
        <button class="btn-ok" id="polMarkRef" style="font-size:11px;padding:3px 8px">📍 Označit ref. bod</button>
        <button class="btn-ok" id="polFromSelected" style="font-size:11px;padding:3px 8px;background:#a6e3a1;border-color:#a6e3a1">📌 Z vybraného objektu</button>
      </div>
      <hr style="border-color:#45475a;margin:8px 0">
      <label>Segment (polární souřadnice od ref. bodu):</label>
      <div class="input-row">
        <div><label>Délka:</label><input type="number" id="polLen" step="0.001" value="10"></div>
        <div><label>Úhel (°):</label><input type="number" id="polAng" step="0.001" value="0"></div>
      </div>
      <div class="input-row">
        <div><label>Typ:</label>
          <select id="polType" style="width:100%">
            <option value="line" selected>Úsečka</option>
            <option value="constr">Konstrukční čára</option>
            <option value="point">Bod (na konci)</option>
          </select>
        </div>
        <div style="display:flex;align-items:end">
          <label style="font-size:11px;display:flex;align-items:center;gap:4px;cursor:pointer">
            <input type="checkbox" id="polChain" checked> Řetězit (konec → nový ref.)
          </label>
        </div>
      </div>
      <div id="polHistory" style="max-height:120px;overflow-y:auto;font-size:11px;font-family:Consolas;color:#a6adc8;margin:8px 0;padding:4px;background:#11111b;border-radius:4px;display:none"></div>
      <div class="btn-row">
        <button class="btn-cancel" id="polClose">Zavřít</button>
        <button class="btn-ok" id="polAdd">➕ Přidat segment</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const polRefX = overlay.querySelector("#polRefX");
  const polRefZ = overlay.querySelector("#polRefZ");
  const polLen = overlay.querySelector("#polLen");
  const polAng = overlay.querySelector("#polAng");
  const polType = overlay.querySelector("#polType");
  const polChain = overlay.querySelector("#polChain");
  const polHistory = overlay.querySelector("#polHistory");
  let segCount = 0;

  overlay.querySelector("#polMarkRef").addEventListener("click", () => {
    const rx = parseFloat(polRefX.value);
    const rz = parseFloat(polRefZ.value);
    if (isNaN(rx) || isNaN(rz)) return;
    addObject({
      type: "point",
      x: rx,
      y: rz,
      name: `Ref ${state.nextId}`,
    });
    showToast(`Referenční bod X${rx} Z${rz} vytvořen`);
  });

  overlay
    .querySelector("#polFromSelected")
    .addEventListener("click", () => {
      if (state.selected === null) {
        showToast("Žádný vybraný objekt");
        return;
      }
      const sel = state.objects[state.selected];
      if (sel.type === "point") {
        polRefX.value = sel.x;
        polRefZ.value = sel.y;
      } else if (sel.type === "line" || sel.type === "constr") {
        polRefX.value = sel.x2;
        polRefZ.value = sel.y2;
      } else if (sel.type === "circle" || sel.type === "arc") {
        polRefX.value = sel.cx;
        polRefZ.value = sel.cy;
      } else if (sel.type === "rect") {
        polRefX.value = sel.x1;
        polRefZ.value = sel.y1;
      }
      showToast("Ref. bod načten z vybraného objektu");
    });

  overlay.querySelector("#polAdd").addEventListener("click", () => {
    const rx = parseFloat(polRefX.value);
    const rz = parseFloat(polRefZ.value);
    const len = parseFloat(polLen.value);
    const angDeg = parseFloat(polAng.value);
    if (
      isNaN(rx) ||
      isNaN(rz) ||
      isNaN(len) ||
      isNaN(angDeg) ||
      len <= 0
    ) {
      showToast("Zkontrolujte hodnoty (délka musí být > 0)");
      return;
    }

    const rad = (angDeg * Math.PI) / 180;
    const endX = rx + len * Math.cos(rad);
    const endZ = rz + len * Math.sin(rad);
    const typ = polType.value;

    if (typ === "point") {
      addObject({
        type: "point",
        x: endX,
        y: endZ,
        name: `Bod ${state.nextId}`,
      });
    } else {
      addObject({
        type: typ === "constr" ? "constr" : "line",
        x1: rx,
        y1: rz,
        x2: endX,
        y2: endZ,
        name: `${typ === "constr" ? "Konstr" : "Úsečka"} ${state.nextId}`,
        dashed: typ === "constr",
      });
    }

    segCount++;
    polHistory.style.display = "";
    polHistory.innerHTML += `<div>#${segCount}: X${rx.toFixed(2)} Z${rz.toFixed(2)} → d=${len} ∠${angDeg}° → X${endX.toFixed(2)} Z${endZ.toFixed(2)}</div>`;
    polHistory.scrollTop = polHistory.scrollHeight;

    if (polChain.checked) {
      polRefX.value = endX.toFixed(3);
      polRefZ.value = endZ.toFixed(3);
    }

    polLen.focus();
    polLen.select();
    showToast(`Segment #${segCount} přidán`);
  });

  overlay
    .querySelector("#polClose")
    .addEventListener("click", () => overlay.remove());

  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT")
      overlay.querySelector("#polAdd").click();
    if (e.key === "Escape") overlay.remove();
  });

  polLen.focus();
}

// ── Dialog pro nastavení bulge (oblouk segmentu kontury) ──
/**
 * @param {import('./types.js').Point2D} p1
 * @param {import('./types.js').Point2D} p2
 * @param {number} currentBulge
 * @param {function(number): void} onAccept
 */
export function showBulgeDialog(p1, p2, currentBulge, onAccept) {
  const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const minRadius = d / 2;
  // Compute current radius from bulge
  let currentRadius = '';
  let currentCW = false;
  if (currentBulge !== 0) {
    const theta = 4 * Math.atan(Math.abs(currentBulge));
    currentRadius = (d / (2 * Math.sin(theta / 2))).toFixed(3);
    currentCW = currentBulge < 0;
  }

  const overlay = document.createElement('div');
  overlay.className = 'input-overlay';
  overlay.innerHTML = `
    <div class="input-dialog" style="min-width:360px">
      <h3>⌒ Oblouk segmentu</h3>
      <table style="width:100%;font-family:Consolas;font-size:12px;margin-bottom:8px">
        <tr><td style="color:#a6adc8">Bod 1:</td><td style="color:#89b4fa">X${p1.x.toFixed(3)} Z${p1.y.toFixed(3)}</td></tr>
        <tr><td style="color:#a6adc8">Bod 2:</td><td style="color:#89b4fa">X${p2.x.toFixed(3)} Z${p2.y.toFixed(3)}</td></tr>
        <tr><td style="color:#a6adc8">Tětiva:</td><td style="color:#f9e2af">${d.toFixed(3)} mm</td></tr>
        <tr><td style="color:#a6adc8">Min. R:</td><td style="color:#f5c2e7">${minRadius.toFixed(3)} mm</td></tr>
      </table>
      <label>Poloměr oblouku (mm):</label>
      <input type="number" id="dlgBulgeR" step="0.001" min="${minRadius.toFixed(3)}" value="${currentRadius || (minRadius * 2).toFixed(3)}" inputmode="decimal" autofocus>
      <label style="margin-top:8px">Směr:</label>
      <select id="dlgBulgeDir">
        <option value="ccw" ${!currentCW ? 'selected' : ''}>CCW (proti směru hodinových ručiček)</option>
        <option value="cw" ${currentCW ? 'selected' : ''}>CW (po směru hodinových ručiček)</option>
      </select>
      <div id="dlgBulgeInfo" style="font-size:11px;color:#9399b2;margin-top:8px;font-family:Consolas"></div>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn-cancel" id="dlgBulgeRemove" style="background:#f38ba8;border-color:#f38ba8">Rovný seg.</button>
        <button class="btn-cancel" onclick="this.closest('.input-overlay').remove()">Zrušit</button>
        <button class="btn-ok" id="dlgBulgeOk">OK</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const rInput = overlay.querySelector('#dlgBulgeR');
  const dirSelect = overlay.querySelector('#dlgBulgeDir');
  const infoDiv = overlay.querySelector('#dlgBulgeInfo');

  function updateInfo() {
    const r = parseFloat(rInput.value);
    if (!isFinite(r) || r < minRadius - 0.001) {
      infoDiv.textContent = 'Poloměr příliš malý';
      return;
    }
    const cw = dirSelect.value === 'cw';
    const b = radiusToBulge(p1, p2, r, cw);
    const theta = 4 * Math.atan(Math.abs(b));
    infoDiv.textContent = `Bulge: ${b.toFixed(4)} | Úhel: ${(theta * 180 / Math.PI).toFixed(1)}° | ${cw ? 'CW' : 'CCW'}`;
  }
  rInput.addEventListener('input', updateInfo);
  dirSelect.addEventListener('change', updateInfo);
  updateInfo();

  rInput.focus();
  rInput.select();

  const accept = () => {
    const r = parseFloat(rInput.value);
    if (!isFinite(r) || r < minRadius - 0.001) {
      showToast('Poloměr příliš malý (min: ' + minRadius.toFixed(3) + ')');
      return;
    }
    const cw = dirSelect.value === 'cw';
    const b = radiusToBulge(p1, p2, r, cw);
    onAccept(b);
    overlay.remove();
  };

  overlay.querySelector('#dlgBulgeOk').addEventListener('click', accept);
  overlay.querySelector('#dlgBulgeRemove').addEventListener('click', () => {
    onAccept(0);
    overlay.remove();
  });
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') accept();
    if (e.key === 'Escape') overlay.remove();
  });
}

// ── Měření – info o průsečíku ──
/**
 * Zobrazí info o průsečíkovém bodu.
 * @param {import('./types.js').Point2D} pt
 */
export function showIntersectionInfo(pt) {
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>⨯ Průsečík</h3>
      <table style="width:100%;font-family:Consolas;font-size:14px;">
        <tr><td style="color:#a6adc8">X:</td><td style="color:#f9e2af;font-size:16px">${pt.x.toFixed(3)}</td></tr>
        <tr><td style="color:#a6adc8">Z:</td><td style="color:#f9e2af;font-size:16px">${pt.y.toFixed(3)}</td></tr>
      </table>
      <div class="btn-row">
        <button class="btn-cancel" id="intCopy">📋 Kopírovat</button>
        <button class="btn-cancel" id="intAddPoint">📍 Vytvořit bod</button>
        <button class="btn-ok" onclick="this.closest('.input-overlay').remove()">OK</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector("#intCopy").addEventListener("click", () => {
    const text = `X${pt.x.toFixed(3)} Z${pt.y.toFixed(3)}`;
    navigator.clipboard.writeText(text).then(() => showToast(`Zkopírováno: ${text}`));
  });
  overlay.querySelector("#intAddPoint").addEventListener("click", () => {
    addObject({ type: "point", x: pt.x, y: pt.y, name: `Bod ${state.nextId}` });
    showToast(`Bod X${pt.x.toFixed(2)} Z${pt.y.toFixed(2)} vytvořen`);
    overlay.remove();
  });
  overlay.querySelector(".btn-ok").focus();
}

// ── Měření – info o existujícím objektu ──
/**
 * @param {import('./types.js').DrawObject} obj
 * @param {number} wx
 * @param {number} wy
 */
export function showMeasureObjectInfo(obj, wx, wy, objIdx) {
  // Detekce, zda jsme kliknuli blízko koncového bodu
  const threshold = 15 / state.zoom;
  const snapPoints = getObjectSnapPoints(obj);
  let nearestPt = null;
  let nearestDist = Infinity;
  for (const pt of snapPoints) {
    const d = Math.hypot(pt.x - wx, pt.y - wy);
    if (d < nearestDist) {
      nearestDist = d;
      nearestPt = pt;
    }
  }

  const clickedEndpoint = nearestDist < threshold;
  let html = "";

  if (clickedEndpoint && nearestPt) {
    // Klik na koncový bod – zobrazit souřadnice
    html = `
      <div class="input-dialog">
        <h3>📍 Souřadnice bodu</h3>
        <table style="width:100%;font-family:Consolas;font-size:13px;">
          <tr><td style="color:#a6adc8">X:</td><td style="color:#f9e2af">${nearestPt.x.toFixed(3)}</td></tr>
          <tr><td style="color:#a6adc8">Z:</td><td style="color:#f9e2af">${nearestPt.y.toFixed(3)}</td></tr>
        </table>
        <div class="btn-row">
          <button class="btn-cancel" id="ptCopy">📋 Kopírovat</button>
          <button class="btn-cancel" id="ptAddPoint">📍 Vytvořit bod</button>
          <button class="btn-ok" onclick="this.closest('.input-overlay').remove()">OK</button>
        </div>
      </div>`;
  } else {
    // Klik na tělo objektu – zobrazit info
    html = buildObjectInfoDialog(obj, objIdx);
  }

  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  if (clickedEndpoint && nearestPt) {
    overlay.querySelector("#ptCopy").addEventListener("click", () => {
      const text = `X${nearestPt.x.toFixed(3)} Z${nearestPt.y.toFixed(3)}`;
      navigator.clipboard
        .writeText(text)
        .then(() => showToast(`Zkopírováno: ${text}`));
    });
    overlay.querySelector("#ptAddPoint").addEventListener("click", () => {
      addObject({
        type: "point",
        x: nearestPt.x,
        y: nearestPt.y,
        name: `Bod ${state.nextId}`,
      });
      showToast(
        `Bod X${nearestPt.x.toFixed(2)} Z${nearestPt.y.toFixed(2)} vytvořen`,
      );
      overlay.remove();
    });
  }

  overlay.querySelector(".btn-ok").focus();
}

function buildObjectInfoDialog(obj, objIdx) {
  let rows = "";
  rows += `<tr><td style="color:#a6adc8">Typ:</td><td style="color:#cdd6f4">${typeLabel(obj.type)}</td></tr>`;
  if (obj.name)
    rows += `<tr><td style="color:#a6adc8">Název:</td><td style="color:#cdd6f4">${obj.name}</td></tr>`;

  switch (obj.type) {
    case "point":
      rows += `<tr><td style="color:#a6adc8">X:</td><td style="color:#f9e2af">${obj.x.toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Z:</td><td style="color:#f9e2af">${obj.y.toFixed(3)}</td></tr>`;
      break;
    case "line":
    case "constr": {
      const len = Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1);
      const angle =
        (Math.atan2(obj.y2 - obj.y1, obj.x2 - obj.x1) * 180) / Math.PI;
      rows += `<tr><td style="color:#a6adc8">Bod 1:</td><td style="color:#89b4fa">X${obj.x1.toFixed(3)} Z${obj.y1.toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Bod 2:</td><td style="color:#89b4fa">X${obj.x2.toFixed(3)} Z${obj.y2.toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Délka:</td><td style="color:#f9e2af">${len.toFixed(3)} mm</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Úhel:</td><td style="color:#f9e2af">${angle.toFixed(2)}°</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">ΔX:</td><td style="color:#f5c2e7">${(obj.x2 - obj.x1).toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">ΔZ:</td><td style="color:#f5c2e7">${(obj.y2 - obj.y1).toFixed(3)}</td></tr>`;
      break;
    }
    case "circle":
      rows += `<tr><td style="color:#a6adc8">Střed:</td><td style="color:#89b4fa">X${obj.cx.toFixed(3)} Z${obj.cy.toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Poloměr:</td><td style="color:#f9e2af">${obj.r.toFixed(3)} mm</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Průměr:</td><td style="color:#f9e2af">${(obj.r * 2).toFixed(3)} mm</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Obvod:</td><td style="color:#f5c2e7">${(2 * Math.PI * obj.r).toFixed(3)} mm</td></tr>`;
      break;
    case "arc":
      rows += `<tr><td style="color:#a6adc8">Střed:</td><td style="color:#89b4fa">X${obj.cx.toFixed(3)} Z${obj.cy.toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Poloměr:</td><td style="color:#f9e2af">${obj.r.toFixed(3)} mm</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Start:</td><td style="color:#f5c2e7">${((obj.startAngle * 180) / Math.PI).toFixed(2)}°</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Konec:</td><td style="color:#f5c2e7">${((obj.endAngle * 180) / Math.PI).toFixed(2)}°</td></tr>`;
      break;
    case "rect": {
      const w = Math.abs(obj.x2 - obj.x1);
      const h = Math.abs(obj.y2 - obj.y1);
      rows += `<tr><td style="color:#a6adc8">Roh 1:</td><td style="color:#89b4fa">X${obj.x1.toFixed(3)} Z${obj.y1.toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Roh 2:</td><td style="color:#89b4fa">X${obj.x2.toFixed(3)} Z${obj.y2.toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Šířka:</td><td style="color:#f9e2af">${w.toFixed(3)} mm</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Výška:</td><td style="color:#f9e2af">${h.toFixed(3)} mm</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Obvod:</td><td style="color:#f5c2e7">${(2 * (w + h)).toFixed(3)} mm</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Plocha:</td><td style="color:#f5c2e7">${(w * h).toFixed(3)} mm²</td></tr>`;
      break;
    }
    case "polyline": {
      const pn = obj.vertices.length;
      const pSegCnt = obj.closed ? pn : pn - 1;
      let pTotalLen = 0;
      let pArcCnt = 0;
      for (let i = 0; i < pSegCnt; i++) {
        const pp1 = obj.vertices[i];
        const pp2 = obj.vertices[(i + 1) % pn];
        const pb = obj.bulges[i] || 0;
        if (pb === 0) {
          pTotalLen += Math.hypot(pp2.x - pp1.x, pp2.y - pp1.y);
        } else {
          pArcCnt++;
          const parc = bulgeToArc(pp1, pp2, pb);
          if (parc) {
            const theta = 4 * Math.atan(Math.abs(pb));
            pTotalLen += parc.r * theta;
          }
        }
      }
      rows += `<tr><td style="color:#a6adc8">Vrcholů:</td><td style="color:#f9e2af">${pn}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Segmentů:</td><td style="color:#f9e2af">${pSegCnt} (${pArcCnt} oblouků)</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Uzavřená:</td><td style="color:#f9e2af">${obj.closed ? 'Ano' : 'Ne'}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Celk. délka:</td><td style="color:#f9e2af">${pTotalLen.toFixed(3)} mm</td></tr>`;
      for (let i = 0; i < pn; i++) {
        rows += `<tr><td style="color:#a6adc8">V${i + 1}:</td><td style="color:#89b4fa">X${obj.vertices[i].x.toFixed(3)} Z${obj.vertices[i].y.toFixed(3)}</td></tr>`;
      }
      break;
    }
  }

  let addDimBtn = "";
  if (obj.type === "line" || obj.type === "constr") {
    addDimBtn = `<button class="btn-cancel" id="objAddDim">📐 Přidat kótu</button>`;
  } else if (obj.type === "circle" || obj.type === "arc") {
    addDimBtn = `<button class="btn-cancel" id="objAddDim">📐 Přidat kótu R</button>`;
  } else if (obj.type === "rect") {
    addDimBtn = `<button class="btn-cancel" id="objAddDim">📐 Přidat kóty</button>`;
  }

  let html = `
    <div class="input-dialog">
      <h3>📏 Info o objektu</h3>
      <table style="width:100%;font-family:Consolas;font-size:13px;">
        ${rows}
      </table>
      <div class="btn-row">
        ${addDimBtn}
        <button class="btn-cancel" id="objCopy">📋 Kopírovat</button>
        ${objIdx !== undefined ? '<button class="btn-cancel" id="objEdit" style="color:#a6e3a1;border-color:#a6e3a155">✏️ Upravit</button>' : ''}
        <button class="btn-ok" onclick="this.closest('.input-overlay').remove()">OK</button>
      </div>
    </div>`;

  // Přidat event listenery po připojení ke DOM (musí být přes setTimeout)
  setTimeout(() => {
    const overlay = document.querySelector(".input-overlay:last-child");
    if (!overlay) return;

    const copyBtn = overlay.querySelector("#objCopy");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const table = overlay.querySelector("table");
        const text = table.innerText;
        navigator.clipboard
          .writeText(text)
          .then(() => showToast("Info zkopírováno"));
      });
    }

    const dimBtn = overlay.querySelector("#objAddDim");
    if (dimBtn) {
      dimBtn.addEventListener("click", () => {
        addDimensionForObject(obj);
        overlay.remove();
      });
    }

    const editBtn = overlay.querySelector("#objEdit");
    if (editBtn && objIdx !== undefined) {
      editBtn.addEventListener("click", () => {
        state.selected = objIdx;
        updateObjectList();
        renderAll();
        overlay.remove();
        showEditObjectDialog(objIdx);
      });
    }
  }, 0);

  return html;
}

// ── Přidání kót k objektu ──
export function addDimensionForObject(obj) {
  switch (obj.type) {
    case "line":
    case "constr": {
      const len = Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1);
      addObject({
        type: "line",
        x1: obj.x1,
        y1: obj.y1,
        x2: obj.x2,
        y2: obj.y2,
        name: `Kóta ${len.toFixed(2)}mm`,
        isDimension: true,
        color: "#9399b2",
      });
      showToast(`Kóta ${len.toFixed(2)}mm přidána`);
      break;
    }
    case "circle": {
      addObject({
        type: "line",
        x1: obj.cx,
        y1: obj.cy,
        x2: obj.cx + obj.r,
        y2: obj.cy,
        name: `Kóta R${obj.r.toFixed(2)}`,
        isDimension: true,
        color: "#9399b2",
      });
      showToast(`Kóta R${obj.r.toFixed(2)} přidána`);
      break;
    }
    case "arc": {
      addObject({
        type: "line",
        x1: obj.cx,
        y1: obj.cy,
        x2: obj.cx + obj.r,
        y2: obj.cy,
        name: `Kóta R${obj.r.toFixed(2)}`,
        isDimension: true,
        color: "#9399b2",
      });
      showToast(`Kóta R${obj.r.toFixed(2)} přidána`);
      break;
    }
    case "rect": {
      const w = Math.abs(obj.x2 - obj.x1);
      const h = Math.abs(obj.y2 - obj.y1);
      // Šířka – horní hrana
      addObject({
        type: "line",
        x1: obj.x1,
        y1: Math.max(obj.y1, obj.y2),
        x2: obj.x2,
        y2: Math.max(obj.y1, obj.y2),
        name: `Kóta ${w.toFixed(2)}mm`,
        isDimension: true,
        color: "#9399b2",
      });
      // Výška – pravá hrana
      addObject({
        type: "line",
        x1: Math.max(obj.x1, obj.x2),
        y1: obj.y1,
        x2: Math.max(obj.x1, obj.x2),
        y2: obj.y2,
        name: `Kóta ${h.toFixed(2)}mm`,
        isDimension: true,
        color: "#9399b2",
      });
      showToast(`Kóty ${w.toFixed(2)} × ${h.toFixed(2)}mm přidány`);
      break;
    }
  }
}

// ── Mobile Edit Dialog ──
/** Otevře mobilní dialog pro editaci vybraného objektu. */
export function showMobileEditDialog() {
  if (state.objects.length === 0) {
    showToast("Žádné objekty k úpravě");
    return;
  }

  // Pokud je vybraný objekt, rovnou ho editovat
  if (state.selected !== null) {
    showEditObjectDialog(state.selected);
    return;
  }

  // Jinak nabídnout výběr
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";

  let listHtml = state.objects.map((obj, idx) => {
    const icon = { point: "·", line: "╱", constr: "┄", circle: "○", arc: "◜", rect: "▭", polyline: "⛓" }[obj.type] || "?";
    return `<div class="edit-obj-item" data-idx="${idx}" style="padding:10px 12px;cursor:pointer;border-bottom:1px solid #313244;display:flex;align-items:center;gap:8px;transition:background 0.15s">
      <span style="font-size:18px;width:24px;text-align:center">${icon}</span>
      <span style="flex:1;color:#cdd6f4">${obj.name || typeLabel(obj.type)}</span>
      <span style="font-size:11px;color:#6c7086">${typeLabel(obj.type)}</span>
    </div>`;
  }).join("");

  overlay.innerHTML = `
    <div class="input-dialog" style="max-height:80vh;overflow-y:auto">
      <h3>✏️ Vyberte objekt k úpravě</h3>
      <div style="max-height:50vh;overflow-y:auto;border:1px solid #313244;border-radius:4px;margin-bottom:12px">
        ${listHtml}
      </div>
      <div class="btn-row">
        <button class="btn-cancel" onclick="this.closest('.input-overlay').remove()">Zrušit</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelectorAll(".edit-obj-item").forEach((item) => {
    item.addEventListener("click", () => {
      const idx = parseInt(item.dataset.idx);
      overlay.remove();
      state.selected = idx;
      updateObjectList();
      renderAll();
      showEditObjectDialog(idx);
    });
    item.addEventListener("mouseenter", () => item.style.background = "#313244");
    item.addEventListener("mouseleave", () => item.style.background = "");
  });
}

function showEditObjectDialog(idx) {
  const obj = state.objects[idx];
  if (!obj) { showToast("Objekt nenalezen"); return; }

  const overlay = document.createElement("div");
  overlay.className = "input-overlay";

  function buildFields() {
    let fieldsHtml = "";
    const nameVal = obj.name || "";

    fieldsHtml += `<label>Název:</label>
      <input type="text" id="editName" value="${nameVal}" style="margin-bottom:8px">`;

    switch (obj.type) {
      case "point":
        fieldsHtml += `
          <div class="input-row"><div><label>X:</label><input type="number" id="editX" step="0.001" value="${obj.x.toFixed(3)}"></div>
          <div><label>Z:</label><input type="number" id="editY" step="0.001" value="${obj.y.toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="xy">🎯</button></div></div>`;
        break;
      case "line":
      case "constr":
        fieldsHtml += `
          <div class="input-row"><div><label>X1:</label><input type="number" id="editX1" step="0.001" value="${obj.x1.toFixed(3)}"></div>
          <div><label>Z1:</label><input type="number" id="editY1" step="0.001" value="${obj.y1.toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="p1">🎯1</button></div></div>
          <div class="input-row"><div><label>X2:</label><input type="number" id="editX2" step="0.001" value="${obj.x2.toFixed(3)}"></div>
          <div><label>Z2:</label><input type="number" id="editY2" step="0.001" value="${obj.y2.toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="p2">🎯2</button></div></div>
          <div style="font-size:12px;color:#9399b2;margin-top:4px">Délka: <span id="editLen">${Math.hypot(obj.x2-obj.x1, obj.y2-obj.y1).toFixed(3)}</span> mm</div>`;
        break;
      case "circle":
        fieldsHtml += `
          <div class="input-row"><div><label>Střed X:</label><input type="number" id="editCX" step="0.001" value="${obj.cx.toFixed(3)}"></div>
          <div><label>Střed Z:</label><input type="number" id="editCY" step="0.001" value="${obj.cy.toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="center">🎯</button></div></div>
          <div class="input-row"><div><label>Poloměr:</label><input type="number" id="editR" step="0.001" value="${obj.r.toFixed(3)}" min="0.001"></div>
          <div><label>Průměr:</label><input type="number" id="editD" step="0.001" value="${(obj.r*2).toFixed(3)}" min="0.002"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="radius">📏R</button></div></div>`;
        break;
      case "arc":
        fieldsHtml += `
          <div class="input-row"><div><label>Střed X:</label><input type="number" id="editCX" step="0.001" value="${obj.cx.toFixed(3)}"></div>
          <div><label>Střed Z:</label><input type="number" id="editCY" step="0.001" value="${obj.cy.toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="center">🎯</button></div></div>
          <div class="input-row"><div><label>Poloměr:</label><input type="number" id="editR" step="0.001" value="${obj.r.toFixed(3)}" min="0.001"></div>
          <div><label>Průměr:</label><input type="number" id="editD" step="0.001" value="${(obj.r*2).toFixed(3)}" min="0.002"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="radius">📏R</button></div></div>
          <div class="input-row"><div><label>Start (°):</label><input type="number" id="editSA" step="1" value="${(obj.startAngle*180/Math.PI).toFixed(2)}"></div>
          <div><label>Konec (°):</label><input type="number" id="editEA" step="1" value="${(obj.endAngle*180/Math.PI).toFixed(2)}"></div></div>`;
        break;
      case "rect":
        fieldsHtml += `
          <div class="input-row"><div><label>X1:</label><input type="number" id="editX1" step="0.001" value="${obj.x1.toFixed(3)}"></div>
          <div><label>Z1:</label><input type="number" id="editY1" step="0.001" value="${obj.y1.toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="p1">🎯1</button></div></div>
          <div class="input-row"><div><label>X2:</label><input type="number" id="editX2" step="0.001" value="${obj.x2.toFixed(3)}"></div>
          <div><label>Z2:</label><input type="number" id="editY2" step="0.001" value="${obj.y2.toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="p2">🎯2</button></div></div>
          <div style="font-size:12px;color:#9399b2;margin-top:4px">Rozměr: <span id="editDim">${Math.abs(obj.x2-obj.x1).toFixed(2)} × ${Math.abs(obj.y2-obj.y1).toFixed(2)}</span> mm</div>`;
        break;
      case "polyline": {
        const verts = obj.vertices || [];
        const bulges = obj.bulges || [];
        fieldsHtml += `<div style="margin-bottom:6px">
          <label><input type="checkbox" id="editClosed" ${obj.closed ? "checked" : ""}> Uzavřená kontura</label></div>`;
        fieldsHtml += `<div id="polyVertList" style="max-height:220px;overflow-y:auto">`;
        for (let i = 0; i < verts.length; i++) {
          const b = bulges[i] || 0;
          fieldsHtml += `<div class="input-row" style="margin-bottom:2px">
            <div><label>V${i+1} X:</label><input type="number" class="polyVX" data-idx="${i}" step="0.001" value="${verts[i].x.toFixed(3)}"></div>
            <div><label>Z:</label><input type="number" class="polyVY" data-idx="${i}" step="0.001" value="${verts[i].y.toFixed(3)}"></div>
            <div style="width:60px"><label>B:</label><input type="number" class="polyVB" data-idx="${i}" step="0.01" value="${b.toFixed(4)}" style="width:55px"></div>
          </div>`;
        }
        fieldsHtml += `</div>`;
        const arcCount = bulges.filter(b => b !== 0).length;
        fieldsHtml += `<div style="font-size:12px;color:#9399b2;margin-top:4px">Vrcholů: ${verts.length}, Segmentů: ${Math.max(0, verts.length - (obj.closed ? 0 : 1))}, Oblouků: ${arcCount}</div>`;
        break;
      }
    }
    return fieldsHtml;
  }

  const icon = { point: "·", line: "╱", constr: "┄", circle: "○", arc: "◜", rect: "▭", polyline: "⛓" }[obj.type] || "?";

  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>✏️ Upravit: ${icon} ${obj.name || typeLabel(obj.type)}</h3>
      <div id="editFields">${buildFields()}</div>
      <div class="btn-row">
        <button class="btn-cancel" id="editDelete" style="color:#f38ba8;border-color:#f38ba855">🗑 Smazat</button>
        <button class="btn-cancel" id="editCancel">Zrušit</button>
        <button class="btn-ok" id="editOk">Uložit</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  // Wire pick buttons
  function wirePickButtons() {
    overlay.querySelectorAll(".pick-btn").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const pickType = btn.dataset.pick;
        overlay.style.display = "none";
        showToast("Klikněte na mapu pro výběr bodu...");

        function onPick(e) {
          const rect = drawCanvas.getBoundingClientRect();
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          let [wx, wy] = screenToWorld(sx, sy);
          if (state.snapToPoints) [wx, wy] = snapPt(wx, wy);
          drawCanvas.removeEventListener("click", onPick);
          drawCanvas.removeEventListener("touchend", onTouch);
          overlay.style.display = "flex";
          fillPickedValue(pickType, wx, wy);
          showToast(`Bod: X${wx.toFixed(2)} Z${wy.toFixed(2)}`);
        }

        function onTouch(e) {
          if (e.changedTouches.length === 1) {
            const t = e.changedTouches[0];
            const rect = drawCanvas.getBoundingClientRect();
            const sx = t.clientX - rect.left;
            const sy = t.clientY - rect.top;
            let [wx, wy] = screenToWorld(sx, sy);
            if (state.snapToPoints) [wx, wy] = snapPt(wx, wy);
            drawCanvas.removeEventListener("click", onPick);
            drawCanvas.removeEventListener("touchend", onTouch);
            overlay.style.display = "flex";
            e.preventDefault();
            fillPickedValue(pickType, wx, wy);
            showToast(`Bod: X${wx.toFixed(2)} Z${wy.toFixed(2)}`);
          }
        }

        drawCanvas.addEventListener("click", onPick, { once: true });
        drawCanvas.addEventListener("touchend", onTouch, { once: true });
      });
    });
  }

  function fillPickedValue(pickType, wx, wy) {
    if (pickType === "xy") {
      const fx = overlay.querySelector("#editX");
      const fy = overlay.querySelector("#editY");
      if (fx) fx.value = wx.toFixed(3);
      if (fy) fy.value = wy.toFixed(3);
    } else if (pickType === "p1") {
      const fx = overlay.querySelector("#editX1");
      const fy = overlay.querySelector("#editY1");
      if (fx) fx.value = wx.toFixed(3);
      if (fy) fy.value = wy.toFixed(3);
    } else if (pickType === "p2") {
      const fx = overlay.querySelector("#editX2");
      const fy = overlay.querySelector("#editY2");
      if (fx) fx.value = wx.toFixed(3);
      if (fy) fy.value = wy.toFixed(3);
    } else if (pickType === "center") {
      const fx = overlay.querySelector("#editCX");
      const fy = overlay.querySelector("#editCY");
      if (fx) fx.value = wx.toFixed(3);
      if (fy) fy.value = wy.toFixed(3);
    } else if (pickType === "radius") {
      const cxV = parseFloat(overlay.querySelector("#editCX")?.value) || 0;
      const cyV = parseFloat(overlay.querySelector("#editCY")?.value) || 0;
      const r = Math.hypot(wx - cxV, wy - cyV);
      const ri = overlay.querySelector("#editR");
      const di = overlay.querySelector("#editD");
      if (ri) ri.value = r.toFixed(3);
      if (di) di.value = (r * 2).toFixed(3);
    }
    updateEditInfo();
  }

  wirePickButtons();

  // Auto-update line length & rect dims
  function updateEditInfo() {
    const lenSpan = overlay.querySelector("#editLen");
    if (lenSpan) {
      const x1 = parseFloat(overlay.querySelector("#editX1")?.value);
      const y1 = parseFloat(overlay.querySelector("#editY1")?.value);
      const x2 = parseFloat(overlay.querySelector("#editX2")?.value);
      const y2 = parseFloat(overlay.querySelector("#editY2")?.value);
      if ([x1,y1,x2,y2].every(v => isFinite(v))) {
        lenSpan.textContent = Math.hypot(x2-x1, y2-y1).toFixed(3);
      }
    }
    const dimSpan = overlay.querySelector("#editDim");
    if (dimSpan) {
      const x1 = parseFloat(overlay.querySelector("#editX1")?.value);
      const y1 = parseFloat(overlay.querySelector("#editY1")?.value);
      const x2 = parseFloat(overlay.querySelector("#editX2")?.value);
      const y2 = parseFloat(overlay.querySelector("#editY2")?.value);
      if ([x1,y1,x2,y2].every(v => isFinite(v))) {
        dimSpan.textContent = `${Math.abs(x2-x1).toFixed(2)} × ${Math.abs(y2-y1).toFixed(2)}`;
      }
    }
  }
  ["#editX1","#editY1","#editX2","#editY2"].forEach(sel => {
    const inp = overlay.querySelector(sel);
    if (inp) inp.addEventListener("input", updateEditInfo);
  });

  // Sync radius/diameter
  const rInput = overlay.querySelector("#editR");
  const dInput = overlay.querySelector("#editD");
  if (rInput && dInput) {
    rInput.addEventListener("input", () => {
      const r = parseFloat(rInput.value);
      if (!isNaN(r) && r > 0) dInput.value = (r * 2).toFixed(3);
    });
    dInput.addEventListener("input", () => {
      const d = parseFloat(dInput.value);
      if (!isNaN(d) && d > 0) rInput.value = (d / 2).toFixed(3);
    });
  }

  // Save
  overlay.querySelector("#editOk").addEventListener("click", () => {
    pushUndo();
    obj.name = overlay.querySelector("#editName").value;
    switch (obj.type) {
      case "point":
        obj.x = parseFloat(overlay.querySelector("#editX").value);
        obj.y = parseFloat(overlay.querySelector("#editY").value);
        break;
      case "line":
      case "constr":
        obj.x1 = parseFloat(overlay.querySelector("#editX1").value);
        obj.y1 = parseFloat(overlay.querySelector("#editY1").value);
        obj.x2 = parseFloat(overlay.querySelector("#editX2").value);
        obj.y2 = parseFloat(overlay.querySelector("#editY2").value);
        break;
      case "circle":
        obj.cx = parseFloat(overlay.querySelector("#editCX").value);
        obj.cy = parseFloat(overlay.querySelector("#editCY").value);
        obj.r = parseFloat(overlay.querySelector("#editR").value);
        break;
      case "arc":
        obj.cx = parseFloat(overlay.querySelector("#editCX").value);
        obj.cy = parseFloat(overlay.querySelector("#editCY").value);
        obj.r = parseFloat(overlay.querySelector("#editR").value);
        obj.startAngle = parseFloat(overlay.querySelector("#editSA").value) * Math.PI / 180;
        obj.endAngle = parseFloat(overlay.querySelector("#editEA").value) * Math.PI / 180;
        break;
      case "rect":
        obj.x1 = parseFloat(overlay.querySelector("#editX1").value);
        obj.y1 = parseFloat(overlay.querySelector("#editY1").value);
        obj.x2 = parseFloat(overlay.querySelector("#editX2").value);
        obj.y2 = parseFloat(overlay.querySelector("#editY2").value);
        break;
      case "polyline": {
        obj.closed = overlay.querySelector("#editClosed")?.checked || false;
        const vxInputs = overlay.querySelectorAll(".polyVX");
        const vyInputs = overlay.querySelectorAll(".polyVY");
        const vbInputs = overlay.querySelectorAll(".polyVB");
        for (let i = 0; i < vxInputs.length; i++) {
          obj.vertices[i] = {
            x: parseFloat(vxInputs[i].value) || 0,
            y: parseFloat(vyInputs[i].value) || 0
          };
          obj.bulges[i] = parseFloat(vbInputs[i].value) || 0;
        }
        break;
      }
    }
    updateObjectList();
    updateProperties();
    calculateAllIntersections();
    overlay.remove();
    showToast("Objekt upraven ✓");
  });

  // Delete
  overlay.querySelector("#editDelete").addEventListener("click", () => {
    pushUndo();
    state.objects.splice(idx, 1);
    if (state.selected === idx) state.selected = null;
    else if (state.selected > idx) state.selected--;
    updateObjectList();
    updateProperties();
    calculateAllIntersections();
    overlay.remove();
    showToast("Objekt smazán");
  });

  // Cancel
  overlay.querySelector("#editCancel").addEventListener("click", () => {
    overlay.remove();
  });

  // Keyboard
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      overlay.querySelector("#editOk").click();
    }
    if (e.key === "Escape") overlay.remove();
  });
}

// ── Dialog pro offset ──
/**
 * @param {import('./types.js').DrawObject} obj
 * @param {function(number): void} onSideClick
 */
export function showOffsetDialog(obj, onSideClick) {
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>Offset – paralelní kopie</h3>
      <label>Objekt: ${obj.name || typeLabel(obj.type)}</label>
      <label>Vzdálenost offsetu (mm):</label>
      <input type="number" id="dlgOffsetDist" step="0.1" min="0.001" value="5" inputmode="decimal" autofocus>
      <div class="btn-row">
        <button class="btn-cancel" onclick="this.closest('.input-overlay').remove()">Zrušit</button>
        <button class="btn-ok" id="dlgOffsetOk">OK – klikni na stranu</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const inp = overlay.querySelector("#dlgOffsetDist");
  inp.focus();
  inp.select();

  function accept() {
    const dist = parseFloat(inp.value);
    if (isNaN(dist) || dist <= 0) { showToast("Zadejte kladnou vzdálenost"); return; }
    overlay.remove();
    onSideClick(dist);
  }
  overlay.querySelector("#dlgOffsetOk").addEventListener("click", accept);
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") accept();
    if (e.key === "Escape") overlay.remove();
    e.stopPropagation();
  });
}

// ── Dialog pro zrcadlení ──
// ── Dialog pro zrcadlení ──
/**
 * @param {import('./types.js').DrawObject} obj
 * @param {function(string): void} callback  volané s 'x'|'z'|'custom'
 */
export function showMirrorDialog(obj, callback) {
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>🪞 Zrcadlit objekt</h3>
      <label>Objekt: ${obj.name || typeLabel(obj.type)}</label>
      <div style="margin:10px 0">
        <label style="display:block;margin-bottom:6px;font-weight:bold;color:#a6adc8">Zrcadlit podle:</label>
        <div class="btn-row" style="flex-direction:column;gap:6px">
          <button class="btn-ok mirror-opt" data-axis="x" style="width:100%">↔ Osa X (horizontální)</button>
          <button class="btn-ok mirror-opt" data-axis="z" style="width:100%">↕ Osa Z (vertikální)</button>
          <button class="btn-ok mirror-opt" data-axis="custom" style="width:100%">📐 Vlastní osa (2 body)</button>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn-cancel" onclick="this.closest('.input-overlay').remove()">Zrušit</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelectorAll(".mirror-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      const axis = btn.dataset.axis;
      overlay.remove();
      callback(axis);
    });
  });

  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") overlay.remove();
  });
  overlay.setAttribute("tabindex", "-1");
  overlay.focus();
}

// ── Dialog pro lineární pole ──
/**
 * @param {import('./types.js').DrawObject} obj
 * @param {function(number,number,number): void} callback  (dx, dz, count)
 */
export function showLinearArrayDialog(obj, callback) {
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>📏 Lineární pole</h3>
      <label>Objekt: ${obj.name || typeLabel(obj.type)}</label>
      <label>Počet kopií:</label>
      <input type="number" id="dlgArrayCount" step="1" min="1" value="5" inputmode="numeric">
      <label>Posun ΔX (mm):</label>
      <input type="number" id="dlgArrayDX" step="0.1" value="10" inputmode="decimal">
      <label>Posun ΔZ (mm):</label>
      <input type="number" id="dlgArrayDZ" step="0.1" value="0" inputmode="decimal">
      <div class="btn-row">
        <button class="btn-cancel" onclick="this.closest('.input-overlay').remove()">Zrušit</button>
        <button class="btn-ok" id="dlgArrayOk">Vytvořit</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#dlgArrayCount").focus();

  function accept() {
    const count = parseInt(overlay.querySelector("#dlgArrayCount").value);
    const dx = parseFloat(overlay.querySelector("#dlgArrayDX").value);
    const dz = parseFloat(overlay.querySelector("#dlgArrayDZ").value);
    if (isNaN(count) || count < 1) { showToast("Zadejte kladný počet"); return; }
    if (isNaN(dx) && isNaN(dz)) { showToast("Zadejte posun"); return; }
    overlay.remove();
    callback(dx || 0, dz || 0, count);
  }
  overlay.querySelector("#dlgArrayOk").addEventListener("click", accept);
  overlay.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") accept();
      if (e.key === "Escape") overlay.remove();
      e.stopPropagation();
    });
  });
}

// ── Dialog pro výběr tečny ──
/**
 * @param {import('./types.js').TangentLine[]} tangentLines
 * @param {function(number[]): void} callback  indexy vybraných tečen
 */
export function showTangentChoiceDialog(tangentLines, callback) {
  if (tangentLines.length === 0) { showToast("Tečna neexistuje"); return; }
  if (tangentLines.length === 1) { callback([0]); return; }

  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  const btns = tangentLines.map((_, i) =>
    `<button class="btn-ok tangent-choice" data-idx="${i}" style="width:100%">Tečna ${i + 1}</button>`
  ).join("");
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>Tečny – výběr</h3>
      <label>Nalezeno ${tangentLines.length} tečen. Vyberte:</label>
      <div class="btn-row" style="flex-direction:column;gap:6px">
        ${btns}
        <button class="btn-ok tangent-all" style="width:100%;background:#a6e3a1;color:#1e1e2e">✓ Vytvořit všechny</button>
      </div>
      <div class="btn-row">
        <button class="btn-cancel" onclick="this.closest('.input-overlay').remove()">Zrušit</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelectorAll(".tangent-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      overlay.remove();
      callback([parseInt(btn.dataset.idx)]);
    });
  });
  overlay.querySelector(".tangent-all").addEventListener("click", () => {
    overlay.remove();
    callback(tangentLines.map((_, i) => i));
  });

  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") overlay.remove();
  });
  overlay.setAttribute("tabindex", "-1");
  overlay.focus();
}

// ── Dialog pro rotaci ──
/**
 * @param {import('./types.js').DrawObject} obj
 * @param {function(number): void} callback  volané s úhlem ve stupních
 */
export function showRotateDialog(obj, callback) {
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>Otočit objekt</h3>
      <label>Objekt: ${obj.name || typeLabel(obj.type)}</label>
      <label>Úhel otočení (°):</label>
      <input type="number" id="dlgRotateAngle" step="1" value="90" inputmode="decimal" autofocus>
      <div class="btn-row">
        <button class="btn-cancel" onclick="this.closest('.input-overlay').remove()">Zrušit</button>
        <button class="btn-ok" id="dlgRotateOk">Otočit</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const inp = overlay.querySelector("#dlgRotateAngle");
  inp.focus();
  inp.select();

  function accept() {
    const deg = parseFloat(inp.value);
    if (isNaN(deg)) { showToast("Zadejte platný úhel"); return; }
    overlay.remove();
    callback(deg);
  }
  overlay.querySelector("#dlgRotateOk").addEventListener("click", accept);
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") accept();
    if (e.key === "Escape") overlay.remove();
    e.stopPropagation();
  });
}

// ── Dialog pro zaoblení ──
/**
 * @param {function(number): void} callback  volané s poloměrem
 */
export function showFilletDialog(callback) {
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>Zaoblení (Fillet)</h3>
      <label>Poloměr zaoblení (mm):</label>
      <input type="number" id="dlgFilletRadius" step="0.1" min="0.001" value="2" inputmode="decimal" autofocus>
      <div class="btn-row">
        <button class="btn-cancel" onclick="this.closest('.input-overlay').remove()">Zrušit</button>
        <button class="btn-ok" id="dlgFilletOk">OK – klikněte na 2. úsečku</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const inp = overlay.querySelector("#dlgFilletRadius");
  inp.focus();
  inp.select();

  function accept() {
    const r = parseFloat(inp.value);
    if (isNaN(r) || r <= 0) { showToast("Zadejte kladný poloměr"); return; }
    overlay.remove();
    callback(r);
  }
  overlay.querySelector("#dlgFilletOk").addEventListener("click", accept);
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") accept();
    if (e.key === "Escape") overlay.remove();
    e.stopPropagation();
  });
}
