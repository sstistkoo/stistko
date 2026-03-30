// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Dialogy / Mobile edit + sdílené helpery           ║
// ║  (showMobileEditDialog, showEditObjectDialog,              ║
// ║   applyMobileInputMode, wireExprInputs)                    ║
// ╚══════════════════════════════════════════════════════════════╝

import { COLORS } from '../constants.js';
import { makeInputOverlay } from '../dialogFactory.js';
import { state, showToast, pushUndo, axisLabels } from '../state.js';
import { screenToWorld, snapPt, drawCanvas } from '../canvas.js';
import { renderAll } from '../render.js';
import { typeLabel, safeEvalMath } from '../utils.js';
import { updateObjectList, updateProperties } from '../ui.js';
import { calculateAllIntersections } from '../geometry.js';
import { updateAssociativeDimensions } from './dimension.js';

// ── Helper: auto-select + vyhodnocení mat. výrazů při blur ──
/** @param {HTMLElement} container */
export function wireExprInputs(container) {
  container.querySelectorAll('input[type="text"]').forEach(inp => {
    inp.addEventListener("focus", () => inp.select());
    inp.addEventListener("blur", () => {
      const raw = inp.value.trim();
      if (raw === '' || /^-?\d+\.?\d*$/.test(raw)) return;
      const result = safeEvalMath(raw);
      if (isFinite(result)) inp.value = result;
    });
  });
}

// ── Helper: nastaví inputmode="decimal" na všechna numerická pole v elementu ──
/** @param {HTMLElement} container */
export function applyMobileInputMode(container) {
  container.querySelectorAll('input[type="text"]').forEach((inp) => {
    inp.setAttribute("inputmode", "decimal");
  });
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
  let listHtml = state.objects.map((obj, idx) => {
    const icon = { point: "·", line: "╱", constr: "┄", circle: "○", arc: "◜", rect: "▭", polyline: "⛓" }[obj.type] || "?";
    return `<div class="edit-obj-item" data-idx="${idx}" style="padding:10px 12px;cursor:pointer;border-bottom:1px solid ${COLORS.surface};display:flex;align-items:center;gap:8px;transition:background 0.15s">
      <span style="font-size:18px;width:24px;text-align:center">${icon}</span>
      <span style="flex:1;color:${COLORS.text}">${obj.name || typeLabel(obj.type)}</span>
      <span style="font-size:11px;color:${COLORS.textMuted}">${typeLabel(obj.type)}</span>
    </div>`;
  }).join("");

  const overlay = makeInputOverlay(`
    <div class="input-dialog" style="max-height:80vh;overflow-y:auto">
      <h3>✏️ Vyberte objekt k úpravě</h3>
      <div style="max-height:50vh;overflow-y:auto;border:1px solid ${COLORS.surface};border-radius:4px;margin-bottom:12px">
        ${listHtml}
      </div>
      <div class="btn-row">
        <button class="btn-cancel btn-cancel-overlay">Zrušit</button>
      </div>
    </div>`);

  overlay.querySelectorAll(".edit-obj-item").forEach((item) => {
    item.addEventListener("click", () => {
      const idx = parseInt(item.dataset.idx);
      overlay.remove();
      state.selected = idx;
      updateObjectList();
      renderAll();
      showEditObjectDialog(idx);
    });
    item.addEventListener("mouseenter", () => item.style.background = COLORS.surface);
    item.addEventListener("mouseleave", () => item.style.background = "");
  });
}

export function showEditObjectDialog(idx) {
  const obj = state.objects[idx];
  if (!obj) { showToast("Objekt nenalezen"); return; }

  function buildFields() {
    const [H, V] = axisLabels();
    let fieldsHtml = "";
    const nameVal = obj.name || "";

    fieldsHtml += `<label>Název:</label>
      <input type="text" id="editName" value="${nameVal}" style="margin-bottom:8px">`;

    switch (obj.type) {
      case "point":
        fieldsHtml += `
          <div class="input-row"><div><label>${H}:</label><input type="text" id="editX" value="${obj.x.toFixed(3)}"></div>
          <div><label>${V}:</label><input type="text" id="editY" value="${obj.y.toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="xy">🎯</button></div></div>`;
        break;
      case "line":
      case "constr":
        fieldsHtml += `
          <div class="input-row"><div><label>${H}1:</label><input type="text" id="editX1" value="${obj.x1.toFixed(3)}"></div>
          <div><label>${V}1:</label><input type="text" id="editY1" value="${obj.y1.toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="p1">🎯1</button></div></div>
          <div class="input-row"><div><label>${H}2:</label><input type="text" id="editX2" value="${obj.x2.toFixed(3)}"></div>
          <div><label>${V}2:</label><input type="text" id="editY2" value="${obj.y2.toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="p2">🎯2</button></div></div>
          <div style="font-size:12px;color:${COLORS.textSecondary};margin-top:4px">Délka: <span id="editLen">${Math.hypot(obj.x2-obj.x1, obj.y2-obj.y1).toFixed(3)}</span> mm</div>`;
        break;
      case "circle":
        fieldsHtml += `
          <div class="input-row"><div><label>Střed ${H}:</label><input type="text" id="editCX" value="${obj.cx.toFixed(3)}"></div>
          <div><label>Střed ${V}:</label><input type="text" id="editCY" value="${obj.cy.toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="center">🎯</button></div></div>
          <div class="input-row"><div><label>Poloměr:</label><input type="text" id="editR" value="${obj.r.toFixed(3)}"></div>
          <div><label>Průměr:</label><input type="text" id="editD" value="${(obj.r*2).toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="radius">📏R</button></div></div>`;
        break;
      case "arc":
        fieldsHtml += `
          <div class="input-row"><div><label>Střed ${H}:</label><input type="text" id="editCX" value="${obj.cx.toFixed(3)}"></div>
          <div><label>Střed ${V}:</label><input type="text" id="editCY" value="${obj.cy.toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="center">🎯</button></div></div>
          <div class="input-row"><div><label>Poloměr:</label><input type="text" id="editR" value="${obj.r.toFixed(3)}"></div>
          <div><label>Průměr:</label><input type="text" id="editD" value="${(obj.r*2).toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="radius">📏R</button></div></div>
          <div class="input-row"><div><label>Start (°):</label><input type="text" id="editSA" value="${(obj.startAngle*180/Math.PI).toFixed(2)}"></div>
          <div><label>Konec (°):</label><input type="text" id="editEA" value="${(obj.endAngle*180/Math.PI).toFixed(2)}"></div></div>`;
        break;
      case "rect":
        fieldsHtml += `
          <div class="input-row"><div><label>${H}1:</label><input type="text" id="editX1" value="${obj.x1.toFixed(3)}"></div>
          <div><label>${V}1:</label><input type="text" id="editY1" value="${obj.y1.toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="p1">🎯1</button></div></div>
          <div class="input-row"><div><label>${H}2:</label><input type="text" id="editX2" value="${obj.x2.toFixed(3)}"></div>
          <div><label>${V}2:</label><input type="text" id="editY2" value="${obj.y2.toFixed(3)}"></div>
          <div class="pick-col"><button type="button" class="pick-btn" data-pick="p2">🎯2</button></div></div>
          <div style="font-size:12px;color:${COLORS.textSecondary};margin-top:4px">Rozměr: <span id="editDim">${Math.abs(obj.x2-obj.x1).toFixed(2)} × ${Math.abs(obj.y2-obj.y1).toFixed(2)}</span> mm</div>`;
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
            <div><label>V${i+1} ${H}:</label><input type="text" class="polyVX" data-idx="${i}" value="${verts[i].x.toFixed(3)}"></div>
            <div><label>${V}:</label><input type="text" class="polyVY" data-idx="${i}" value="${verts[i].y.toFixed(3)}"></div>
            <div style="width:60px"><label>B:</label><input type="text" class="polyVB" data-idx="${i}" value="${b.toFixed(4)}" style="width:55px"></div>
          </div>`;
        }
        fieldsHtml += `</div>`;
        const arcCount = bulges.filter(b => b !== 0).length;
        fieldsHtml += `<div style="font-size:12px;color:${COLORS.textSecondary};margin-top:4px">Vrcholů: ${verts.length}, Segmentů: ${Math.max(0, verts.length - (obj.closed ? 0 : 1))}, Oblouků: ${arcCount}</div>`;
        break;
      }
    }
    return fieldsHtml;
  }

  const icon = { point: "·", line: "╱", constr: "┄", circle: "○", arc: "◜", rect: "▭", polyline: "⛓" }[obj.type] || "?";

  const overlay = makeInputOverlay(`
    <div class="input-dialog">
      <h3>✏️ Upravit: ${icon} ${obj.name || typeLabel(obj.type)}</h3>
      <div id="editFields">${buildFields()}</div>
      <div class="btn-row">
        <button class="btn-cancel" id="editDelete" style="color:${COLORS.delete};border-color:${COLORS.delete}55">🗑 Smazat</button>
        <button class="btn-cancel" id="editCancel">Zrušit</button>
        <button class="btn-ok" id="editOk">Uložit</button>
      </div>
    </div>`);

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
      const cxV = safeEvalMath(overlay.querySelector("#editCX")?.value) || 0;
      const cyV = safeEvalMath(overlay.querySelector("#editCY")?.value) || 0;
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
      const x1 = safeEvalMath(overlay.querySelector("#editX1")?.value);
      const y1 = safeEvalMath(overlay.querySelector("#editY1")?.value);
      const x2 = safeEvalMath(overlay.querySelector("#editX2")?.value);
      const y2 = safeEvalMath(overlay.querySelector("#editY2")?.value);
      if ([x1,y1,x2,y2].every(v => isFinite(v))) {
        lenSpan.textContent = Math.hypot(x2-x1, y2-y1).toFixed(3);
      }
    }
    const dimSpan = overlay.querySelector("#editDim");
    if (dimSpan) {
      const x1 = safeEvalMath(overlay.querySelector("#editX1")?.value);
      const y1 = safeEvalMath(overlay.querySelector("#editY1")?.value);
      const x2 = safeEvalMath(overlay.querySelector("#editX2")?.value);
      const y2 = safeEvalMath(overlay.querySelector("#editY2")?.value);
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
      const r = safeEvalMath(rInput.value);
      if (!isNaN(r) && r > 0) dInput.value = (r * 2).toFixed(3);
    });
    dInput.addEventListener("input", () => {
      const d = safeEvalMath(dInput.value);
      if (!isNaN(d) && d > 0) rInput.value = (d / 2).toFixed(3);
    });
  }

  // Save
  overlay.querySelector("#editOk").addEventListener("click", () => {
    pushUndo();
    obj.name = overlay.querySelector("#editName").value;
    switch (obj.type) {
      case "point":
        obj.x = safeEvalMath(overlay.querySelector("#editX").value);
        obj.y = safeEvalMath(overlay.querySelector("#editY").value);
        break;
      case "line":
      case "constr":
        obj.x1 = safeEvalMath(overlay.querySelector("#editX1").value);
        obj.y1 = safeEvalMath(overlay.querySelector("#editY1").value);
        obj.x2 = safeEvalMath(overlay.querySelector("#editX2").value);
        obj.y2 = safeEvalMath(overlay.querySelector("#editY2").value);
        break;
      case "circle":
        obj.cx = safeEvalMath(overlay.querySelector("#editCX").value);
        obj.cy = safeEvalMath(overlay.querySelector("#editCY").value);
        obj.r = safeEvalMath(overlay.querySelector("#editR").value);
        break;
      case "arc":
        obj.cx = safeEvalMath(overlay.querySelector("#editCX").value);
        obj.cy = safeEvalMath(overlay.querySelector("#editCY").value);
        obj.r = safeEvalMath(overlay.querySelector("#editR").value);
        obj.startAngle = safeEvalMath(overlay.querySelector("#editSA").value) * Math.PI / 180;
        obj.endAngle = safeEvalMath(overlay.querySelector("#editEA").value) * Math.PI / 180;
        break;
      case "rect":
        obj.x1 = safeEvalMath(overlay.querySelector("#editX1").value);
        obj.y1 = safeEvalMath(overlay.querySelector("#editY1").value);
        obj.x2 = safeEvalMath(overlay.querySelector("#editX2").value);
        obj.y2 = safeEvalMath(overlay.querySelector("#editY2").value);
        break;
      case "polyline": {
        obj.closed = overlay.querySelector("#editClosed")?.checked || false;
        const vxInputs = overlay.querySelectorAll(".polyVX");
        const vyInputs = overlay.querySelectorAll(".polyVY");
        const vbInputs = overlay.querySelectorAll(".polyVB");
        for (let i = 0; i < vxInputs.length; i++) {
          obj.vertices[i] = {
            x: safeEvalMath(vxInputs[i].value) || 0,
            y: safeEvalMath(vyInputs[i].value) || 0
          };
          obj.bulges[i] = safeEvalMath(vbInputs[i].value) || 0;
        }
        break;
      }
    }
    updateAssociativeDimensions();
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
