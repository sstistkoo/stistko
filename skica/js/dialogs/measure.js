// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Dialogy / Měření                                 ║
// ║  (showMeasureResult, showIntersectionInfo, showMeasureObj) ║
// ╚══════════════════════════════════════════════════════════════╝

import { COLORS } from '../constants.js';
import { makeInputOverlay } from '../dialogFactory.js';
import { state, showToast, toDisplayCoords, axisLabels, displayX, xPrefix, coordHelpers } from '../state.js';
import { addObject } from '../objects.js';
import { renderAll } from '../render.js';
import { typeLabel, bulgeToArc } from '../utils.js';
import { updateObjectList } from '../ui.js';
import { addDimensionForObject } from './dimension.js';
import { showEditObjectDialog } from './mobileEdit.js';

// ── Měření – dialog výsledku ──
/**
 * @param {import('../types.js').Point2D} p1
 * @param {import('../types.js').Point2D} p2
 * @param {number} d
 * @param {number} angle
 */
export function showMeasureResult(p1, p2, d, angle) {
  const dp1 = toDisplayCoords(p1.x, p1.y);
  const dp2 = toDisplayCoords(p2.x, p2.y);
  const pf = state.coordMode === 'inc' ? 'Δ' : '';
  const { H, V, Hp, Vp, fH, fV } = coordHelpers();
  const incRow = state.coordMode === 'inc' ? `
        <tr><td colspan="2" style="color:${COLORS.border};font-size:11px;padding-top:6px">── Inkrementální (od reference) ──</td></tr>
        <tr><td style="color:${COLORS.label}">${pf}Bod 1:</td><td style="color:${COLORS.preview}">${pf}${Hp}${H}${fH(dp1.x).toFixed(3)} ${pf}${Vp}${V}${fV(dp1.y).toFixed(3)}</td></tr>
        <tr><td style="color:${COLORS.label}">${pf}Bod 2:</td><td style="color:${COLORS.preview}">${pf}${Hp}${H}${fH(dp2.x).toFixed(3)} ${pf}${Vp}${V}${fV(dp2.y).toFixed(3)}</td></tr>
  ` : '';
  const overlay = makeInputOverlay(`
    <div class="input-dialog">
      <h3>📏 Výsledek měření</h3>
      <table style="width:100%;font-family:Consolas;font-size:13px;">
        <tr><td style="color:${COLORS.label}">Vzdálenost:</td><td style="color:${COLORS.selected}">${d.toFixed(3)} mm</td></tr>
        <tr><td style="color:${COLORS.label}">Úhel:</td><td style="color:${COLORS.selected}">${angle.toFixed(2)}°</td></tr>
        <tr><td style="color:${COLORS.label}">Δ${Hp}${H}:</td><td style="color:${COLORS.preview}">${fH(p2.x - p1.x).toFixed(3)}</td></tr>
        <tr><td style="color:${COLORS.label}">Δ${Vp}${V}:</td><td style="color:${COLORS.preview}">${fV(p2.y - p1.y).toFixed(3)}</td></tr>
        <tr><td style="color:${COLORS.label}">Bod 1:</td><td style="color:${COLORS.primary}">${Hp}${H}${fH(p1.x).toFixed(3)} ${Vp}${V}${fV(p1.y).toFixed(3)}</td></tr>
        <tr><td style="color:${COLORS.label}">Bod 2:</td><td style="color:${COLORS.primary}">${Hp}${H}${fH(p2.x).toFixed(3)} ${Vp}${V}${fV(p2.y).toFixed(3)}</td></tr>
        ${incRow}
      </table>
      <div class="btn-row">
        <button class="btn-cancel" id="measureAddDim">📐 Přidat kótu</button>
        <button class="btn-ok btn-cancel-overlay">OK</button>
      </div>
    </div>`);
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
        color: COLORS.textSecondary,
      });
      showToast(`Kóta ${d.toFixed(2)}mm přidána`);
      overlay.remove();
    });
  overlay.querySelector(".btn-ok").focus();
}

// ── Měření – info o průsečíku ──
/**
 * Zobrazí info o průsečíkovém bodu.
 * @param {import('../types.js').Point2D} pt
 */
export function showIntersectionInfo(pt) {
  const { H, V, Hp, Vp, fH, fV } = coordHelpers();
  const hv = fH(pt.x);
  const vv = fV(pt.y);
  const overlay = makeInputOverlay(`
    <div class="input-dialog">
      <h3>⨯ Průsečík</h3>
      <table style="width:100%;font-family:Consolas;font-size:14px;">
        <tr><td style="color:${COLORS.label}">${Hp}${H}:</td><td style="color:${COLORS.selected};font-size:16px">${hv.toFixed(3)}</td></tr>
        <tr><td style="color:${COLORS.label}">${Vp}${V}:</td><td style="color:${COLORS.selected};font-size:16px">${vv.toFixed(3)}</td></tr>
      </table>
      <div class="btn-row">
        <button class="btn-cancel" id="intCopy">📋 Kopírovat</button>
        <button class="btn-cancel" id="intAddPoint">📍 Vytvořit bod</button>
        <button class="btn-ok btn-cancel-overlay">OK</button>
      </div>
    </div>`);

  overlay.querySelector("#intCopy").addEventListener("click", () => {
    const text = `${Hp}${H}${hv.toFixed(3)} ${Vp}${V}${vv.toFixed(3)}`;
    navigator.clipboard.writeText(text).then(() => showToast(`Zkopírováno: ${text}`));
  });
  overlay.querySelector("#intAddPoint").addEventListener("click", () => {
    addObject({ type: "point", x: pt.x, y: pt.y, name: `Bod ${state.nextId}` });
    showToast(`Bod ${Hp}${H}${hv.toFixed(2)} ${Vp}${V}${vv.toFixed(2)} vytvořen`);
    overlay.remove();
  });
  overlay.querySelector(".btn-ok").focus();
}

// ── Měření – info o existujícím objektu ──
/**
 * @param {import('../types.js').DrawObject} obj
 * @param {number} wx
 * @param {number} wy
 */
export function showMeasureObjectInfo(obj, wx, wy, objIdx) {
  const html = buildObjectInfoDialog(obj, objIdx);
  const overlay = makeInputOverlay(html);
  overlay.querySelector(".btn-ok").focus();
}

function buildObjectInfoDialog(obj, objIdx) {
  const { H, V, Hp, Vp, fH, fV } = coordHelpers();
  let rows = "";
  rows += `<tr><td style="color:${COLORS.label}">Typ:</td><td style="color:${COLORS.text}">${typeLabel(obj.type)}</td></tr>`;
  if (obj.name) {
    const safeName = obj.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    rows += `<tr><td style="color:${COLORS.label}">Název:</td><td style="color:${COLORS.text}">${safeName}</td></tr>`;
  }

  switch (obj.type) {
    case "point":
      rows += `<tr><td style="color:${COLORS.label}">${Hp}${H}:</td><td style="color:${COLORS.selected}">${fH(obj.x).toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">${Vp}${V}:</td><td style="color:${COLORS.selected}">${fV(obj.y).toFixed(3)}</td></tr>`;
      break;
    case "line":
    case "constr": {
      const len = Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1);
      const angle =
        (Math.atan2(obj.y2 - obj.y1, obj.x2 - obj.x1) * 180) / Math.PI;
      rows += `<tr><td style="color:${COLORS.label}">Bod 1:</td><td style="color:${COLORS.primary}">${Hp}${H}${fH(obj.x1).toFixed(3)} ${Vp}${V}${fV(obj.y1).toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Bod 2:</td><td style="color:${COLORS.primary}">${Hp}${H}${fH(obj.x2).toFixed(3)} ${Vp}${V}${fV(obj.y2).toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Délka:</td><td style="color:${COLORS.selected}">${len.toFixed(3)} mm</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Úhel:</td><td style="color:${COLORS.selected}">${angle.toFixed(2)}°</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Δ${Hp}${H}:</td><td style="color:${COLORS.preview}">${fH(obj.x2 - obj.x1).toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Δ${Vp}${V}:</td><td style="color:${COLORS.preview}">${fV(obj.y2 - obj.y1).toFixed(3)}</td></tr>`;
      break;
    }
    case "circle":
      rows += `<tr><td style="color:${COLORS.label}">Střed:</td><td style="color:${COLORS.primary}">${Hp}${H}${fH(obj.cx).toFixed(3)} ${Vp}${V}${fV(obj.cy).toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Poloměr:</td><td style="color:${COLORS.selected}">${obj.r.toFixed(3)} mm</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Průměr:</td><td style="color:${COLORS.selected}">${(obj.r * 2).toFixed(3)} mm</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Obvod:</td><td style="color:${COLORS.preview}">${(2 * Math.PI * obj.r).toFixed(3)} mm</td></tr>`;
      break;
    case "arc":
      rows += `<tr><td style="color:${COLORS.label}">Střed:</td><td style="color:${COLORS.primary}">${Hp}${H}${fH(obj.cx).toFixed(3)} ${Vp}${V}${fV(obj.cy).toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Poloměr:</td><td style="color:${COLORS.selected}">${obj.r.toFixed(3)} mm</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Start:</td><td style="color:${COLORS.preview}">${((obj.startAngle * 180) / Math.PI).toFixed(2)}°</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Konec:</td><td style="color:${COLORS.preview}">${((obj.endAngle * 180) / Math.PI).toFixed(2)}°</td></tr>`;
      break;
    case "rect": {
      const w = Math.abs(obj.x2 - obj.x1);
      const h = Math.abs(obj.y2 - obj.y1);
      rows += `<tr><td style="color:${COLORS.label}">Roh 1:</td><td style="color:${COLORS.primary}">${Hp}${H}${fH(obj.x1).toFixed(3)} ${Vp}${V}${fV(obj.y1).toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Roh 2:</td><td style="color:${COLORS.primary}">${Hp}${H}${fH(obj.x2).toFixed(3)} ${Vp}${V}${fV(obj.y2).toFixed(3)}</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Šířka:</td><td style="color:${COLORS.selected}">${w.toFixed(3)} mm</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Výška:</td><td style="color:${COLORS.selected}">${h.toFixed(3)} mm</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Obvod:</td><td style="color:${COLORS.preview}">${(2 * (w + h)).toFixed(3)} mm</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Plocha:</td><td style="color:${COLORS.preview}">${(w * h).toFixed(3)} mm²</td></tr>`;
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
      rows += `<tr><td style="color:${COLORS.label}">Vrcholů:</td><td style="color:${COLORS.selected}">${pn}</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Segmentů:</td><td style="color:${COLORS.selected}">${pSegCnt} (${pArcCnt} oblouků)</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Uzavřená:</td><td style="color:${COLORS.selected}">${obj.closed ? 'Ano' : 'Ne'}</td></tr>`;
      rows += `<tr><td style="color:${COLORS.label}">Celk. délka:</td><td style="color:${COLORS.selected}">${pTotalLen.toFixed(3)} mm</td></tr>`;
      for (let i = 0; i < pn; i++) {
        rows += `<tr><td style="color:${COLORS.label}">V${i + 1}:</td><td style="color:${COLORS.primary}">${Hp}${H}${fH(obj.vertices[i].x).toFixed(3)} ${Vp}${V}${fV(obj.vertices[i].y).toFixed(3)}</td></tr>`;
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
        ${objIdx !== undefined ? `<button class="btn-cancel" id="objEdit" style="color:${COLORS.dimension};border-color:${COLORS.dimension}55">✏️ Upravit</button>` : ''}
        <button class="btn-ok btn-cancel-overlay">OK</button>
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
