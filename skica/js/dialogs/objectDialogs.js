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

// ── Sdružený dialog zaoblení / zkosení ──
/**
 * @param {function(string, number, number): void} callback  volané s (mode, p1, p2)
 *   mode='fillet' → p1=radius, p2=0
 *   mode='chamfer' → p1=dist1, p2=dist2
 */
export function showFilletChamferDialog(callback) {
  const overlay = makeInputOverlay(`
    <div class="input-dialog">
      <h3>Zaoblení / Zkosení</h3>
      <div class="btn-row" style="margin-bottom:8px;gap:4px">
        <button class="btn-ok fc-mode-btn active" data-mode="fillet" style="flex:1;font-size:0.85em">⌒ Zaoblení</button>
        <button class="btn-cancel fc-mode-btn" data-mode="chamfer" style="flex:1;font-size:0.85em">⌿ Zkosení</button>
      </div>
      <div id="fcFillet">
        <label>Poloměr zaoblení (mm):</label>
        <input type="text" id="dlgFcRadius" value="2" inputmode="decimal" autofocus>
      </div>
      <div id="fcChamfer" style="display:none">
        <div class="btn-row" style="margin-bottom:6px;gap:4px">
          <button class="btn-ok chamfer-sub-btn active" data-sub="dd" style="flex:1;font-size:0.8em">Vzdál. × Vzdál.</button>
          <button class="btn-cancel chamfer-sub-btn" data-sub="da" style="flex:1;font-size:0.8em">Vzdál. × Úhel</button>
        </div>
        <div id="fcChamferDD">
          <label>Vzdálenost 1 (mm):</label>
          <input type="text" id="dlgFcD1" value="2" inputmode="decimal">
          <label style="margin-top:6px">Vzdálenost 2 (mm):</label>
          <input type="text" id="dlgFcD2" value="2" inputmode="decimal">
        </div>
        <div id="fcChamferDA" style="display:none">
          <label>Vzdálenost (mm):</label>
          <input type="text" id="dlgFcDist" value="2" inputmode="decimal">
          <label style="margin-top:6px">Úhel (°):</label>
          <input type="text" id="dlgFcAngle" value="45" inputmode="decimal">
        </div>
      </div>
      <div class="btn-row">
        <button class="btn-cancel btn-cancel-overlay">Zrušit</button>
        <button class="btn-ok" id="dlgFcOk">OK – klikněte na 2. úsečku</button>
      </div>
    </div>`);

  const filletDiv = overlay.querySelector("#fcFillet");
  const chamferDiv = overlay.querySelector("#fcChamfer");
  const modeBtns = overlay.querySelectorAll(".fc-mode-btn");
  let mode = 'fillet';

  modeBtns.forEach(btn => btn.addEventListener("click", () => {
    mode = btn.dataset.mode;
    modeBtns.forEach(b => { b.classList.toggle("active", b === btn); b.classList.toggle("btn-ok", b === btn); b.classList.toggle("btn-cancel", b !== btn); });
    filletDiv.style.display = mode === 'fillet' ? '' : 'none';
    chamferDiv.style.display = mode === 'chamfer' ? '' : 'none';
    if (mode === 'fillet') { const inp = overlay.querySelector("#dlgFcRadius"); inp.focus(); inp.select(); }
    else { const inp = overlay.querySelector("#dlgFcD1"); inp.focus(); inp.select(); }
  }));

  // Chamfer sub-mode (dd/da)
  const ddDiv = overlay.querySelector("#fcChamferDD");
  const daDiv = overlay.querySelector("#fcChamferDA");
  const subBtns = overlay.querySelectorAll(".chamfer-sub-btn");
  let chamferSub = 'dd';
  subBtns.forEach(btn => btn.addEventListener("click", () => {
    chamferSub = btn.dataset.sub;
    subBtns.forEach(b => { b.classList.toggle("active", b === btn); b.classList.toggle("btn-ok", b === btn); b.classList.toggle("btn-cancel", b !== btn); });
    ddDiv.style.display = chamferSub === 'dd' ? '' : 'none';
    daDiv.style.display = chamferSub === 'da' ? '' : 'none';
  }));

  const firstInp = overlay.querySelector("#dlgFcRadius");
  firstInp.focus();
  firstInp.select();

  function accept() {
    if (mode === 'fillet') {
      const r = safeEvalMath(overlay.querySelector("#dlgFcRadius").value);
      if (isNaN(r) || r <= 0) { showToast("Zadejte kladný poloměr"); return; }
      overlay.remove();
      callback('fillet', r, 0);
    } else {
      let d1, d2;
      if (chamferSub === 'dd') {
        d1 = safeEvalMath(overlay.querySelector("#dlgFcD1").value);
        d2 = safeEvalMath(overlay.querySelector("#dlgFcD2").value);
        if (isNaN(d1) || d1 <= 0 || isNaN(d2) || d2 <= 0) { showToast("Zadejte kladné vzdálenosti"); return; }
      } else {
        d1 = safeEvalMath(overlay.querySelector("#dlgFcDist").value);
        const angle = safeEvalMath(overlay.querySelector("#dlgFcAngle").value);
        if (isNaN(d1) || d1 <= 0 || isNaN(angle) || angle <= 0 || angle >= 90) { showToast("Zadejte kladnou vzdálenost a úhel 0–90°"); return; }
        d2 = d1 * Math.tan(angle * Math.PI / 180);
      }
      overlay.remove();
      callback('chamfer', d1, d2);
    }
  }
  overlay.querySelector("#dlgFcOk").addEventListener("click", accept);
  overlay.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") accept();
      if (e.key === "Escape") overlay.remove();
      e.stopPropagation();
    });
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

// ── Dialog pro zkosení (chamfer) ──
/**
 * @param {function(number, number): void} callback  volané s (dist1, dist2)
 */
export function showChamferDialog(callback) {
  const overlay = makeInputOverlay(`
    <div class="input-dialog">
      <h3>Zkosení (Chamfer)</h3>
      <div class="btn-row" style="margin-bottom:8px;gap:4px">
        <button class="btn-ok chamfer-mode-btn active" data-mode="dd" style="flex:1;font-size:0.85em">Vzdálenost × Vzdálenost</button>
        <button class="btn-cancel chamfer-mode-btn" data-mode="da" style="flex:1;font-size:0.85em">Vzdálenost × Úhel</button>
      </div>
      <div id="chamferDD">
        <label>Vzdálenost 1 (mm):</label>
        <input type="text" id="dlgChamferD1" value="2" inputmode="decimal" autofocus>
        <label style="margin-top:6px">Vzdálenost 2 (mm):</label>
        <input type="text" id="dlgChamferD2" value="2" inputmode="decimal">
      </div>
      <div id="chamferDA" style="display:none">
        <label>Vzdálenost (mm):</label>
        <input type="text" id="dlgChamferDist" value="2" inputmode="decimal">
        <label style="margin-top:6px">Úhel (°):</label>
        <input type="text" id="dlgChamferAngle" value="45" inputmode="decimal">
      </div>
      <div class="btn-row">
        <button class="btn-cancel btn-cancel-overlay">Zrušit</button>
        <button class="btn-ok" id="dlgChamferOk">OK – klikněte na 2. úsečku</button>
      </div>
    </div>`);

  const ddDiv = overlay.querySelector("#chamferDD");
  const daDiv = overlay.querySelector("#chamferDA");
  const modeBtns = overlay.querySelectorAll(".chamfer-mode-btn");
  let mode = 'dd';

  modeBtns.forEach(btn => btn.addEventListener("click", () => {
    mode = btn.dataset.mode;
    modeBtns.forEach(b => b.classList.toggle("active", b === btn));
    modeBtns.forEach(b => b.classList.toggle("btn-ok", b === btn));
    modeBtns.forEach(b => b.classList.toggle("btn-cancel", b !== btn));
    ddDiv.style.display = mode === 'dd' ? '' : 'none';
    daDiv.style.display = mode === 'da' ? '' : 'none';
    const first = mode === 'dd' ? overlay.querySelector("#dlgChamferD1") : overlay.querySelector("#dlgChamferDist");
    first.focus(); first.select();
  }));

  const inp1 = overlay.querySelector("#dlgChamferD1");
  inp1.focus();
  inp1.select();

  function accept() {
    let d1, d2;
    if (mode === 'dd') {
      d1 = safeEvalMath(overlay.querySelector("#dlgChamferD1").value);
      d2 = safeEvalMath(overlay.querySelector("#dlgChamferD2").value);
      if (isNaN(d1) || d1 <= 0 || isNaN(d2) || d2 <= 0) { showToast("Zadejte kladné vzdálenosti"); return; }
    } else {
      d1 = safeEvalMath(overlay.querySelector("#dlgChamferDist").value);
      const angle = safeEvalMath(overlay.querySelector("#dlgChamferAngle").value);
      if (isNaN(d1) || d1 <= 0 || isNaN(angle) || angle <= 0 || angle >= 90) { showToast("Zadejte kladnou vzdálenost a úhel 0–90°"); return; }
      d2 = d1 * Math.tan(angle * Math.PI / 180);
    }
    overlay.remove();
    callback(d1, d2);
  }
  overlay.querySelector("#dlgChamferOk").addEventListener("click", accept);
  // Enter on any input triggers accept
  overlay.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") accept();
      if (e.key === "Escape") overlay.remove();
      e.stopPropagation();
    });
  });
}

// ── Dialog pro škálování ──
/**
 * @param {function(number): void} callback  volané s faktorem
 */
export function showScaleDialog(callback) {
  const overlay = makeInputOverlay(`
    <div class="input-dialog">
      <h3>Škálování (Scale)</h3>
      <label>Měřítkový faktor:</label>
      <input type="text" id="dlgScaleFactor" value="2" inputmode="decimal" autofocus>
      <div style="font-size:0.85em;color:#888;margin:4px 0">Např. 2 = dvojnásobek, 0.5 = polovina</div>
      <div class="btn-row">
        <button class="btn-cancel btn-cancel-overlay">Zrušit</button>
        <button class="btn-ok" id="dlgScaleOk">OK</button>
      </div>
    </div>`);
  const inp = overlay.querySelector("#dlgScaleFactor");
  inp.focus();
  inp.select();

  function accept() {
    const f = safeEvalMath(inp.value);
    if (isNaN(f) || f === 0) { showToast("Zadejte nenulový faktor"); return; }
    overlay.remove();
    callback(f);
  }
  overlay.querySelector("#dlgScaleOk").addEventListener("click", accept);
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
