// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Dialogy / Objektové operace                      ║
// ║  (offset, mirror, linArray, rotate, fillet)                ║
// ╚══════════════════════════════════════════════════════════════╝

import { COLORS } from '../constants.js';
import { makeInputOverlay } from '../dialogFactory.js';
import { state, showToast, axisLabels } from '../state.js';
import { typeLabel, safeEvalMath } from '../utils.js';

// ── Dialog pro offset ──
/**
 * @param {import('../types.js').DrawObject} obj
 * @param {function(number): void} onSideClick
 */
export function showOffsetDialog(obj, onSideClick) {
  const overlay = makeInputOverlay(`
    <div class="input-dialog">
      <h3>Offset – paralelní kopie</h3>
      <label>Objekt: ${obj.name || typeLabel(obj.type)}</label>
      <label>Vzdálenost offsetu (mm):</label>
      <input type="text" id="dlgOffsetDist" value="5" inputmode="decimal" autofocus>
      <div class="btn-row">
        <button class="btn-cancel btn-cancel-overlay">Zrušit</button>
        <button class="btn-ok" id="dlgOffsetOk">OK – klikni na stranu</button>
      </div>
    </div>`);
  const inp = overlay.querySelector("#dlgOffsetDist");
  inp.focus();
  inp.select();

  function accept() {
    const dist = safeEvalMath(inp.value);
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

// ── Dialog pro offset s polárním úhlem (multi-select) ──
/**
 * @param {string} label - popis výběru (např. "3 objekty")
 * @param {function(number, number): void} callback - (dist, angleDeg)
 */
export function showOffsetAngleDialog(label, callback) {
  const overlay = makeInputOverlay(`
    <div class="input-dialog">
      <h3>Offset – směrová kopie</h3>
      <label>${label}</label>
      <label>Vzdálenost (mm):</label>
      <input type="text" id="dlgOffDist" value="5" inputmode="decimal" autofocus>
      <label>Úhel směru (°):</label>
      <input type="text" id="dlgOffAngle" value="90" inputmode="decimal">
      <div style="font-size:11px;opacity:0.6;margin:4px 0">0°=vpravo, 90°=nahoru, 180°=vlevo, 270°=dolů</div>
      <div class="btn-row">
        <button class="btn-cancel btn-cancel-overlay">Zrušit</button>
        <button class="btn-ok" id="dlgOffAngleOk">Vytvořit offset</button>
      </div>
    </div>`);
  const inpDist = overlay.querySelector("#dlgOffDist");
  const inpAngle = overlay.querySelector("#dlgOffAngle");
  inpDist.focus();
  inpDist.select();

  function accept() {
    const dist = safeEvalMath(inpDist.value);
    const angle = safeEvalMath(inpAngle.value);
    if (isNaN(dist) || dist <= 0) { showToast("Zadejte kladnou vzdálenost"); return; }
    if (isNaN(angle)) { showToast("Zadejte úhel"); return; }
    overlay.remove();
    callback(dist, angle);
  }
  overlay.querySelector("#dlgOffAngleOk").addEventListener("click", accept);
  const handleKey = (e) => {
    if (e.key === "Enter") accept();
    if (e.key === "Escape") overlay.remove();
    e.stopPropagation();
  };
  inpDist.addEventListener("keydown", handleKey);
  inpAngle.addEventListener("keydown", handleKey);
}

// ── Dialog pro zrcadlení ──
/**
 * @param {import('../types.js').DrawObject} obj
 * @param {function(string): void} callback  volané s 'x'|'z'|'custom'
 */
export function showMirrorDialog(obj, callback) {
  const hasAngle = state.nullPointActive && state.nullPointAngle;
  const angleNote = hasAngle ? ` (${state.nullPointAngle}°)` : '';
  const overlay = makeInputOverlay(`
    <div class="input-dialog">
      <h3>🪞 Zrcadlit objekt</h3>
      <label>Objekt: ${obj.name || typeLabel(obj.type)}</label>
      <div style="margin:10px 0">
        <label style="display:block;margin-bottom:6px;font-weight:bold;color:${COLORS.label}">Zrcadlit podle:</label>
        <div class="btn-row" style="flex-direction:column;gap:6px">
          <button class="btn-ok mirror-opt" data-axis="x" style="width:100%">↔ Osa X (horizontální${angleNote})</button>
          <button class="btn-ok mirror-opt" data-axis="z" style="width:100%">↕ Osa Z (vertikální${angleNote})</button>
          <button class="btn-ok mirror-opt" data-axis="custom" style="width:100%">📐 Vlastní osa (2 body)</button>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn-cancel btn-cancel-overlay">Zrušit</button>
      </div>
    </div>`);

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
 * @param {import('../types.js').DrawObject} obj
 * @param {function(number,number,number): void} callback  (dx, dz, count)
 */
export function showLinearArrayDialog(obj, callback) {
  const overlay = makeInputOverlay(`
    <div class="input-dialog">
      <h3>📏 Lineární pole</h3>
      <label>Objekt: ${obj.name || typeLabel(obj.type)}</label>
      <label>Počet kopií:</label>
      <input type="text" id="dlgArrayCount" value="5" inputmode="numeric">
      <label>Posun Δ${axisLabels()[0]} (mm):</label>
      <input type="text" id="dlgArrayDX" value="10" inputmode="decimal">
      <label>Posun Δ${axisLabels()[1]} (mm):</label>
      <input type="text" id="dlgArrayDZ" value="0" inputmode="decimal">
      <div class="btn-row">
        <button class="btn-cancel btn-cancel-overlay">Zrušit</button>
        <button class="btn-ok" id="dlgArrayOk">Vytvořit</button>
      </div>
    </div>`);
  overlay.querySelector("#dlgArrayCount").focus();

  function accept() {
    const count = parseInt(overlay.querySelector("#dlgArrayCount").value);
    const dx = safeEvalMath(overlay.querySelector("#dlgArrayDX").value);
    const dz = safeEvalMath(overlay.querySelector("#dlgArrayDZ").value);
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

// ── Dialog pro rotaci ──
/**
 * @param {import('../types.js').DrawObject} obj
 * @param {function(number): void} callback  volané s úhlem ve stupních
 */
export function showRotateDialog(obj, callback) {
  const overlay = makeInputOverlay(`
    <div class="input-dialog">
      <h3>Otočit objekt</h3>
      <label>Objekt: ${obj.name || typeLabel(obj.type)}</label>
      <label>Úhel otočení (°):</label>
      <input type="text" id="dlgRotateAngle" value="90" inputmode="decimal" autofocus>
      <div class="btn-row">
        <button class="btn-cancel btn-cancel-overlay">Zrušit</button>
        <button class="btn-ok" id="dlgRotateOk">Otočit</button>
      </div>
    </div>`);
  const inp = overlay.querySelector("#dlgRotateAngle");
  inp.focus();
  inp.select();

  function accept() {
    const deg = safeEvalMath(inp.value);
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
  const overlay = makeInputOverlay(`
    <div class="input-dialog">
      <h3>Zaoblení (Fillet)</h3>
      <label>Poloměr zaoblení (mm):</label>
      <input type="text" id="dlgFilletRadius" value="2" inputmode="decimal" autofocus>
      <div class="btn-row">
        <button class="btn-cancel btn-cancel-overlay">Zrušit</button>
        <button class="btn-ok" id="dlgFilletOk">OK – klikněte na 2. úsečku</button>
      </div>
    </div>`);
  const inp = overlay.querySelector("#dlgFilletRadius");
  inp.focus();
  inp.select();

  function accept() {
    const r = safeEvalMath(inp.value);
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

// ── Dialog pro výběr koncového bodu úsečky ──
/**
 * Zobrazí dialog se dvěma tlačítky pro výběr konce úsečky.
 * @param {string} title     – titulek dialogu
 * @param {{x1:number,y1:number,x2:number,y2:number}} seg – segment
 * @param {string} label1    – popis akce pro P1
 * @param {string} label2    – popis akce pro P2
 * @param {function(1|2): void} callback – voláno s 1 nebo 2
 */
export function showEndpointChoiceDialog(title, seg, label1, label2, callback) {
  const p1 = `(${seg.x1.toFixed(2)}, ${seg.y1.toFixed(2)})`;
  const p2 = `(${seg.x2.toFixed(2)}, ${seg.y2.toFixed(2)})`;
  const overlay = makeInputOverlay(`
    <div class="input-dialog">
      <h3>${title}</h3>
      <div class="btn-row" style="flex-direction:column;gap:6px">
        <button class="btn-ok ep-choice" data-end="1" style="width:100%">${label1} ${p1}</button>
        <button class="btn-ok ep-choice" data-end="2" style="width:100%">${label2} ${p2}</button>
      </div>
      <div class="btn-row">
        <button class="btn-cancel btn-cancel-overlay">Zrušit</button>
      </div>
    </div>`);

  overlay.querySelectorAll(".ep-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      overlay.remove();
      callback(parseInt(btn.dataset.end));
    });
  });

  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") overlay.remove();
  });
  overlay.setAttribute("tabindex", "-1");
  overlay.focus();
}
