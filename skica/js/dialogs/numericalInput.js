// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Dialogy / Numerický vstup                        ║
// ╚══════════════════════════════════════════════════════════════╝

import { COLORS } from '../constants.js';
import { makeInputOverlay } from '../dialogFactory.js';
import { state, showToast, fromIncToAbs, axisLabels, toDisplayCoords } from '../state.js';
import { addObject, addRectAsSegments, addPolylineAsSegments } from '../objects.js';
import { screenToWorld, snapPt, drawCanvas } from '../canvas.js';
import { safeEvalMath } from '../utils.js';
import { wireExprInputs } from './mobileEdit.js';

// ── Numerický vstup – dialog pro přesné zadání souřadnic ──
document
  .getElementById("btnNumInput")
  .addEventListener("click", showNumericalInputDialog);

// Stav pro chaining je uložen v state.numDialogChain

/** Otevře dialog pro číselné zadání souřadnic objektu. */
export function showNumericalInputDialog() {
  const overlay = makeInputOverlay(`
    <div class="input-dialog" style="min-width:400px">
      <h3>🔢 Číselné zadání objektu</h3>
      <div id="numModeInfo" style="font-size:11px;margin-bottom:8px;padding:4px 8px;border-radius:4px;font-family:Consolas;${state.coordMode === 'inc' ? `background:${COLORS.selected}22;color:${COLORS.selected}` : `color:${COLORS.textMuted}`}">
        Režim: ${state.coordMode === 'inc' ? 'INC (přírůstkový) – hodnoty jsou Δ od reference ' + axisLabels()[0] + '=' + state.incReference.x.toFixed(3) + ' ' + axisLabels()[1] + '=' + state.incReference.y.toFixed(3) : 'ABS (absolutní)'}
      </div>
      <div style="font-size:10px;color:${COLORS.border};margin-bottom:6px;font-style:italic">💡 Pole podporují matematické výrazy: 123+56, 200/3, (10+5)*2</div>
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
    </div>`);

  const typeSelect = overlay.querySelector("#numType");
  const fieldsDiv = overlay.querySelector("#numFields");

  // -- Pick from map helper --
  let _pickCallback = null;

  let _pickCleanup = null;

  function pickFromMap(callback) {
    _pickCallback = callback;
    overlay.style.display = "none";
    showToast("Klikněte na mapu pro výběr bodu...");

    function cleanup() {
      drawCanvas.removeEventListener("click", onPick);
      drawCanvas.removeEventListener("touchend", onTouch);
      _pickCleanup = null;
    }

    function onPick(e) {
      const rect = drawCanvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      let [wx, wy] = screenToWorld(sx, sy);
      if (state.snapToPoints) [wx, wy] = snapPt(wx, wy);
      cleanup();
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
        cleanup();
        overlay.style.display = "flex";
        e.preventDefault();
        callback(wx, wy);
      }
    }

    drawCanvas.addEventListener("click", onPick);
    drawCanvas.addEventListener("touchend", onTouch);
    _pickCleanup = cleanup;
  }

  function pickBtn(label) {
    return `<button type="button" class="pick-btn" title="Vybrat z mapy">${label}</button>`;
  }

  // Chain values
  const chainX = state.numDialogChain.x !== null ? state.numDialogChain.x.toFixed(3) : "0";
  const chainY = state.numDialogChain.y !== null ? state.numDialogChain.y.toFixed(3) : "0";
  const hasChain = state.numDialogChain.x !== null;
  const isInc = state.coordMode === 'inc';
  const [H, V] = axisLabels();
  const lbl = (name) => isInc ? 'Δ' + name : name;
  // V INC režimu chain hodnoty zobrazit jako delta od reference
  const chainDispX = hasChain ? (isInc ? (state.numDialogChain.x - state.incReference.x).toFixed(3) : chainX) : "0";
  const chainDispY = hasChain ? (isInc ? (state.numDialogChain.y - state.incReference.y).toFixed(3) : chainY) : "0";

  function updateFields() {
    const t = typeSelect.value;
    let html = "";
    switch (t) {
      case "point":
        html = `<div class="input-row"><div><label>${lbl(H)}:</label><input type="text" id="nx" value="${hasChain ? chainDispX : '0'}"></div>
                <div><label>${lbl(V)}:</label><input type="text" id="ny" value="${hasChain ? chainDispY : '0'}"></div>
                <div class="pick-col">${pickBtn("🎯")}</div></div>
                ${hasChain ? `<div id="numChainInfo" style="font-size:11px;color:${COLORS.textSecondary};margin-top:4px"></div>` : ''}`;
        break;
      case "line":
      case "constr":
        html = `<div class="input-row"><div><label>${lbl(H+'1')}:</label><input type="text" id="nx1" value="${hasChain ? chainDispX : '0'}"></div>
                <div><label>${lbl(V+'1')}:</label><input type="text" id="ny1" value="${hasChain ? chainDispY : '0'}"></div>
                <div class="pick-col">${pickBtn("🎯1")}</div></div>
                <div class="input-row"><div><label>${lbl(H+'2')}:</label><input type="text" id="nx2" value="0"></div>
                <div><label>${lbl(V+'2')}:</label><input type="text" id="ny2" value="0"></div>
                <div class="pick-col">${pickBtn("🎯2")}</div></div>
                <div id="numLineInfo" style="font-size:11px;color:${COLORS.textSecondary};margin-top:4px"></div>
                <label style="font-size:11px;color:${COLORS.textMuted};margin-top:4px">Nebo: Délka a polární úhel</label>
                <div class="input-row"><div><label>Délka:</label><input type="text" id="nlen" value=""></div>
                <div><label>Úhel (°):</label><input type="text" id="nang" value=""></div></div>`;
        break;
      case "circle":
        html = `<div class="input-row"><div><label>${lbl('Střed '+H)}:</label><input type="text" id="ncx" value="${hasChain ? chainDispX : '0'}"></div>
                <div><label>${lbl('Střed '+V)}:</label><input type="text" id="ncy" value="${hasChain ? chainDispY : '0'}"></div>
                <div class="pick-col">${pickBtn("🎯")}</div></div>
                <div class="input-row"><div><label>Poloměr:</label><input type="text" id="nr" value="10"></div>
                <div class="pick-col">${pickBtn("📏 R")}</div></div>`;
        break;
      case "arc":
        html = `<div class="input-row"><div><label>${lbl('Střed '+H)}:</label><input type="text" id="ncx" value="${hasChain ? chainDispX : '0'}"></div>
                <div><label>${lbl('Střed '+V)}:</label><input type="text" id="ncy" value="${hasChain ? chainDispY : '0'}"></div>
                <div class="pick-col">${pickBtn("🎯")}</div></div>
                <div class="input-row"><div><label>Poloměr:</label><input type="text" id="nr" value="10"></div>
                <div class="pick-col">${pickBtn("📏 R")}</div></div>
                <div class="input-row"><div><label>Start (°):</label><input type="text" id="nsa" value="0"></div>
                <div class="pick-col">${pickBtn("📐 S")}</div></div>
                <div class="input-row"><div><label>Konec (°):</label><input type="text" id="nea" value="90"></div>
                <div class="pick-col">${pickBtn("📐 E")}</div></div>
                <div class="input-row"><div><label>Směr:</label><select id="narcDir">
                  <option value="cw">↻ CW (po směru)</option>
                  <option value="ccw">↺ CCW (proti směru)</option>
                </select></div></div>`;
        break;
      case "rect":
        html = `<div class="input-row"><div><label>${lbl(H+'1')}:</label><input type="text" id="nx1" value="${hasChain ? chainDispX : '0'}"></div>
                <div><label>${lbl(V+'1')}:</label><input type="text" id="ny1" value="${hasChain ? chainDispY : '0'}"></div>
                <div class="pick-col">${pickBtn("🎯1")}</div></div>
                <div class="input-row"><div><label>${lbl(H+'2')}:</label><input type="text" id="nx2" value="0"></div>
                <div><label>${lbl(V+'2')}:</label><input type="text" id="ny2" value="0"></div>
                <div class="pick-col">${pickBtn("🎯2")}</div></div>
                <label style="font-size:11px;color:${COLORS.textMuted};margin-top:4px">Nebo: Šířka × Výška od bodu 1</label>
                <div class="input-row"><div><label>Šířka:</label><input type="text" id="nw" value=""></div>
                <div><label>Výška:</label><input type="text" id="nh" value=""></div></div>`;
        break;
      case "polyline":
        html = `<div style="font-size:12px;color:${COLORS.label};margin-bottom:8px">Zadávejte body po jednom. Klikněte "Přidat bod" pro každý vrchol kontury.</div>
                <div class="input-row"><div><label>${lbl(H)}:</label><input type="text" id="nx" value="${hasChain ? chainDispX : '0'}"></div>
                <div><label>${lbl(V)}:</label><input type="text" id="ny" value="${hasChain ? chainDispY : '0'}"></div>
                <div class="pick-col">${pickBtn("🎯")}</div></div>
                <div id="polyVertexList" style="max-height:150px;overflow-y:auto;font-size:11px;font-family:Consolas;color:${COLORS.label};margin:8px 0;padding:4px;background:${COLORS.bgDarker};border-radius:4px;display:none"></div>
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
                const x1v = safeEvalMath(overlay.querySelector("#nx1")?.value) || 0;
                const y1v = safeEvalMath(overlay.querySelector("#ny1")?.value) || 0;
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
            const cx = safeEvalMath(cxInp ? cxInp.value : 0) || 0;
            const cy = safeEvalMath(cyInp ? cyInp.value : 0) || 0;
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

    // Auto-select obsahu při kliknutí + vyhodnocení výrazu při opuštění pole
    wireExprInputs(fieldsDiv);

    // Auto-update info pro úsečky/konstr.
    function updateLineInfo() {
      const info = fieldsDiv.querySelector("#numLineInfo");
      if (!info) return;
      const x1 = safeEvalMath(fieldsDiv.querySelector("#nx1")?.value);
      const y1 = safeEvalMath(fieldsDiv.querySelector("#ny1")?.value);
      const x2 = safeEvalMath(fieldsDiv.querySelector("#nx2")?.value);
      const y2 = safeEvalMath(fieldsDiv.querySelector("#ny2")?.value);
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
      const nx = safeEvalMath(fieldsDiv.querySelector("#nx")?.value);
      const ny = safeEvalMath(fieldsDiv.querySelector("#ny")?.value);
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
      const x1 = safeEvalMath(fieldsDiv.querySelector("#nx1")?.value);
      const y1 = safeEvalMath(fieldsDiv.querySelector("#ny1")?.value);
      const x2f = fieldsDiv.querySelector("#nx2");
      const y2f = fieldsDiv.querySelector("#ny2");
      // W/H → X2/Z2
      nw.addEventListener("input", () => {
        const w = safeEvalMath(nw.value);
        if (isFinite(x1) && isFinite(w) && x2f) x2f.value = (x1 + w).toFixed(3);
      });
      nh.addEventListener("input", () => {
        const h = safeEvalMath(nh.value);
        if (isFinite(y1) && isFinite(h) && y2f) y2f.value = (y1 + h).toFixed(3);
      });
      // X2/Z2 → W/H
      if (x2f) x2f.addEventListener("input", () => {
        const v = safeEvalMath(x2f.value);
        if (isFinite(x1) && isFinite(v)) nw.value = (v - x1).toFixed(3);
      });
      if (y2f) y2f.addEventListener("input", () => {
        const v = safeEvalMath(y2f.value);
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
            `<div>V${vi + 1}: ${H}${v.x.toFixed(3)} ${V}${v.y.toFixed(3)}</div>`
          ).join("");
          vtxList.scrollTop = vtxList.scrollHeight;
        }
      }

      polyAddBtn.addEventListener("click", () => {
        const vx = safeEvalMath(fieldsDiv.querySelector("#nx")?.value);
        const vy = safeEvalMath(fieldsDiv.querySelector("#ny")?.value);
        if (!isFinite(vx) || !isFinite(vy)) return;
        const abs = isInc ? fromIncToAbs(vx, vy) : { x: vx, y: vy };
        overlay._polyVerts.push(abs);
        if (overlay._polyVerts.length > 1) {
          overlay._polyBulges.push(0);
        }
        updateVtxList();
        showToast(`Bod ${overlay._polyVerts.length}: ${H}${abs.x.toFixed(2)} ${V}${abs.y.toFixed(2)}`);
      });
      updateVtxList();
    }
  }

  typeSelect.addEventListener("change", updateFields);
  updateFields();

  // Highlight chained start point
  if (hasChain) {
    showToast(`Pokračování od ${H}${state.numDialogChain.x.toFixed(2)} ${V}${state.numDialogChain.y.toFixed(2)}`);
  }

  function createObject() {
    const t = typeSelect.value;
    // Konverze INC → ABS
    const toAbs = (vx, vy) => isInc ? fromIncToAbs(vx, vy) : { x: vx, y: vy };
    try {
      switch (t) {
        case "point": {
          const raw = toAbs(
            safeEvalMath(overlay.querySelector("#nx").value),
            safeEvalMath(overlay.querySelector("#ny").value)
          );
          addObject({ type: "point", x: raw.x, y: raw.y, name: `Bod ${state.nextId}` });
          state.numDialogChain = { x: raw.x, y: raw.y };
          break;
        }
        case "line":
        case "constr": {
          let p1 = toAbs(
            safeEvalMath(overlay.querySelector("#nx1").value),
            safeEvalMath(overlay.querySelector("#ny1").value)
          );
          let x2r = safeEvalMath(overlay.querySelector("#nx2").value);
          let y2r = safeEvalMath(overlay.querySelector("#ny2").value);
          const len = safeEvalMath(overlay.querySelector("#nlen").value);
          const ang = safeEvalMath(overlay.querySelector("#nang").value);
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
            safeEvalMath(overlay.querySelector("#ncx").value),
            safeEvalMath(overlay.querySelector("#ncy").value)
          );
          const r = safeEvalMath(overlay.querySelector("#nr").value);
          addObject({
            type: "circle", cx: c.x, cy: c.y, r,
            name: `Kružnice ${state.nextId}`,
          });
          state.numDialogChain = { x: c.x, y: c.y };
          break;
        }
        case "arc": {
          const c = toAbs(
            safeEvalMath(overlay.querySelector("#ncx").value),
            safeEvalMath(overlay.querySelector("#ncy").value)
          );
          const r = safeEvalMath(overlay.querySelector("#nr").value);
          const sa =
            (safeEvalMath(overlay.querySelector("#nsa").value) * Math.PI) / 180;
          const ea =
            (safeEvalMath(overlay.querySelector("#nea").value) * Math.PI) / 180;
          const arcCcw = overlay.querySelector("#narcDir")?.value === 'ccw';
          addObject({
            type: "arc", cx: c.x, cy: c.y, r,
            startAngle: sa, endAngle: ea,
            ccw: arcCcw,
            name: `Oblouk ${state.nextId}`,
          });
          const endX = c.x + r * Math.cos(ea);
          const endY = c.y + r * Math.sin(ea);
          state.numDialogChain = { x: endX, y: endY };
          break;
        }
        case "rect": {
          let p1 = toAbs(
            safeEvalMath(overlay.querySelector("#nx1").value),
            safeEvalMath(overlay.querySelector("#ny1").value)
          );
          let x2r = safeEvalMath(overlay.querySelector("#nx2").value);
          let y2r = safeEvalMath(overlay.querySelector("#ny2").value);
          const w = safeEvalMath(overlay.querySelector("#nw").value);
          const h = safeEvalMath(overlay.querySelector("#nh").value);
          if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
            // Šířka/výška je vždy relativní delta
            const p2 = { x: p1.x + w, y: p1.y + h };
            addRectAsSegments(p1.x, p1.y, p2.x, p2.y);
            state.numDialogChain = { x: p2.x, y: p2.y };
            break;
          }
          let p2 = toAbs(x2r, y2r);
          addRectAsSegments(p1.x, p1.y, p2.x, p2.y);
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
          addPolylineAsSegments(verts.slice(), bulges.slice(0, closed ? verts.length : verts.length - 1), closed);
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
    if (createObject()) { if (_pickCleanup) _pickCleanup(); overlay.remove(); }
  });

  // Zrušit
  overlay.querySelector("#numCancel").addEventListener("click", () => {
    state.numDialogChain = { x: null, y: null };
    if (_pickCleanup) _pickCleanup();
    overlay.remove();
  });

  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      if (createObject()) { if (_pickCleanup) _pickCleanup(); overlay.remove(); }
    }
    if (e.key === "Escape") { if (_pickCleanup) _pickCleanup(); overlay.remove(); }
  });
}
