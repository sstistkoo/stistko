// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – CNC Kalkulátory                                    ║
// ╚══════════════════════════════════════════════════════════════╝

import { showToast } from "./state.js";

// ── Helper ──
function makeOverlay(type, title, bodyHTML, windowClass) {
  if (document.querySelector(`.calc-overlay[data-type=${type}]`)) return null;
  const overlay = document.createElement("div");
  overlay.className = "calc-overlay";
  overlay.dataset.type = type;
  overlay.innerHTML =
    '<div class="calc-window ' + (windowClass || "cnc-window") + '">' +
      '<div class="calc-titlebar"><h3>' + title + '</h3><button class="calc-close-btn">\u2715</button></div>' +
      '<div class="calc-body">' + bodyHTML + '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.querySelector(".calc-close-btn").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  return overlay;
}

// ══════════════════════════════════════════════════════════════
// ► Řezné podmínky
// ══════════════════════════════════════════════════════════════
export function openCuttingCalc() {
  const body =
    '<div class="cnc-fields">' +
      '<label class="cnc-field"><span>D <small>mm</small></span><input type="number" data-id="D" step="any" placeholder="Průměr"></label>' +
      '<label class="cnc-field"><span>Vc <small>m/min</small></span><input type="number" data-id="Vc" step="any" placeholder="Řezná rychlost"></label>' +
      '<label class="cnc-field"><span>n <small>min\u207B\u00B9</small></span><input type="number" data-id="n" step="any" placeholder="Otáčky"></label>' +
      '<label class="cnc-field"><span>f <small>mm/ot</small></span><input type="number" data-id="f" step="any" placeholder="Posuv"></label>' +
      '<label class="cnc-field"><span>Vf <small>mm/min</small></span><input type="number" data-id="Vf" step="any" placeholder="Posuvová rychlost"></label>' +
    '</div>' +
    '<div class="cnc-info" id="cuttingInfo"></div>' +
    '<div class="cnc-actions">' +
      '<button class="cnc-btn cnc-btn-clear">\uD83D\uDDD1 Vymazat</button>' +
      '<button class="cnc-btn cnc-btn-copy">\uD83D\uDCCB Kopírovat</button>' +
    '</div>';

  const overlay = makeOverlay("cutting", "\u2699\uFE0F Řezné podmínky", body);
  if (!overlay) return;

  const fieldIds = ["D","Vc","n","f","Vf"];
  const inputs = {};
  fieldIds.forEach(id => { inputs[id] = overlay.querySelector('[data-id="' + id + '"]'); });
  const edited = new Set();
  const infoEl = overlay.querySelector("#cuttingInfo");

  function val(inp) { return inp.value !== "" ? parseFloat(inp.value) : null; }
  function setC(inp, v) { inp.value = parseFloat(v.toFixed(4)); inp.classList.add("computed"); }

  function solve() {
    fieldIds.forEach(id => { if (!edited.has(id)) { inputs[id].classList.remove("computed"); } });
    const D = val(inputs.D), Vc = val(inputs.Vc), n = val(inputs.n), f = val(inputs.f), Vf = val(inputs.Vf);

    if (D && Vc && !edited.has("n")) setC(inputs.n, (1000 * Vc) / (Math.PI * D));
    const n2 = val(inputs.n);
    if (D && n2 && !edited.has("Vc")) setC(inputs.Vc, (Math.PI * D * n2) / 1000);
    const n3 = val(inputs.n);
    if (f && n3 && !edited.has("Vf")) setC(inputs.Vf, f * n3);
    if (Vf && n3 && !edited.has("f")) setC(inputs.f, Vf / n3);
    const Vf2 = val(inputs.Vf);
    if (Vf2 && n3 && !edited.has("f") && !f) setC(inputs.f, Vf2 / n3);

    const parts = [];
    fieldIds.forEach(id => { const v = val(inputs[id]); if (v !== null) parts.push(id + "=" + inputs[id].value); });
    infoEl.textContent = parts.length ? parts.join("  \u2502  ") : "";
  }

  fieldIds.forEach(id => {
    inputs[id].addEventListener("input", () => {
      if (inputs[id].value !== "") { edited.add(id); inputs[id].classList.remove("computed"); }
      else { edited.delete(id); }
      fieldIds.forEach(k => { if (!edited.has(k)) inputs[k].value = ""; });
      solve();
    });
  });

  overlay.querySelector(".cnc-btn-clear").addEventListener("click", () => {
    fieldIds.forEach(id => { inputs[id].value = ""; inputs[id].classList.remove("computed"); });
    edited.clear(); infoEl.textContent = "";
  });
  overlay.querySelector(".cnc-btn-copy").addEventListener("click", () => {
    const parts = [];
    fieldIds.forEach(id => { const v = val(inputs[id]); if (v !== null) parts.push(id + "=" + inputs[id].value); });
    if (parts.length) navigator.clipboard.writeText(parts.join("  ")).then(() => showToast("Zkopírováno"));
  });
}

// ══════════════════════════════════════════════════════════════
// ► Kužel
// ══════════════════════════════════════════════════════════════
export function openTaperCalc() {
  const morseData = [
    { name: "MT0", D: 9.045, d: 6.401, L: 49.8 },
    { name: "MT1", D: 12.065, d: 9.371, L: 53.5 },
    { name: "MT2", D: 17.780, d: 14.533, L: 64.0 },
    { name: "MT3", D: 23.825, d: 19.761, L: 80.5 },
    { name: "MT4", D: 31.267, d: 25.908, L: 102.5 },
    { name: "MT5", D: 44.399, d: 37.468, L: 129.5 },
  ];
  var morseRows = "";
  for (var mi = 0; mi < morseData.length; mi++) {
    var m = morseData[mi];
    var ang = Math.atan((m.D - m.d) / (2 * m.L)) * 180 / Math.PI;
    morseRows += '<tr data-mD="' + m.D + '" data-md="' + m.d + '" data-mL="' + m.L + '">' +
      '<td>' + m.name + '</td><td>' + m.D + '</td><td>' + m.d + '</td><td>' + m.L + '</td><td>' + ang.toFixed(4) + '\u00B0</td></tr>';
  }

  const body =
    '<div class="cnc-fields">' +
      '<label class="cnc-field"><span>D <small>mm</small></span><input type="number" data-id="D" step="any" placeholder="Velký \u00D8"></label>' +
      '<label class="cnc-field"><span>d <small>mm</small></span><input type="number" data-id="d" step="any" placeholder="Malý \u00D8"></label>' +
      '<label class="cnc-field"><span>L <small>mm</small></span><input type="number" data-id="L" step="any" placeholder="Délka"></label>' +
      '<label class="cnc-field"><span>\u03B1 <small>\u00B0</small></span><input type="number" data-id="a" step="any" placeholder="Polo. úhel"></label>' +
    '</div>' +
    '<div class="cnc-info" id="taperInfo"></div>' +
    '<div class="cnc-actions">' +
      '<button class="cnc-btn cnc-btn-clear">\uD83D\uDDD1 Vymazat</button>' +
      '<button class="cnc-btn cnc-btn-copy">\uD83D\uDCCB Kopírovat</button>' +
    '</div>' +
    '<div class="cnc-table-label">Morse kužely <small>(klikni pro vyplnění)</small></div>' +
    '<div class="cnc-table-wrap">' +
      '<table class="cnc-table"><thead><tr><th></th><th>D</th><th>d</th><th>L</th><th>\u03B1</th></tr></thead>' +
      '<tbody>' + morseRows + '</tbody></table>' +
    '</div>';

  const overlay = makeOverlay("taper", "\uD83D\uDD3A Kužel", body);
  if (!overlay) return;

  const inpD = overlay.querySelector('[data-id="D"]');
  const inpd = overlay.querySelector('[data-id="d"]');
  const inpL = overlay.querySelector('[data-id="L"]');
  const inpA = overlay.querySelector('[data-id="a"]');
  const allInp = [inpD, inpd, inpL, inpA];
  const edited = new Set();
  const infoEl = overlay.querySelector("#taperInfo");

  function v(inp) { return inp.value !== "" ? parseFloat(inp.value) : null; }
  function sc(inp, val) { inp.value = parseFloat(val.toFixed(4)); inp.classList.add("computed"); }

  function solve() {
    allInp.forEach(inp => { if (!edited.has(inp.dataset.id)) inp.classList.remove("computed"); });
    const D = v(inpD), d = v(inpd), L = v(inpL), a = v(inpA);
    const aRad = a !== null ? a * Math.PI / 180 : null;

    if (D !== null && d !== null && L !== null && !edited.has("a"))
      sc(inpA, Math.atan((D - d) / (2 * L)) * 180 / Math.PI);
    if (d !== null && L !== null && aRad !== null && !edited.has("D"))
      sc(inpD, d + 2 * L * Math.tan(aRad));
    if (D !== null && L !== null && aRad !== null && !edited.has("d"))
      sc(inpd, D - 2 * L * Math.tan(aRad));
    if (D !== null && d !== null && aRad !== null && !edited.has("L"))
      sc(inpL, (D - d) / (2 * Math.tan(aRad)));

    const D2 = v(inpD), d2 = v(inpd), L2 = v(inpL);
    if (D2 !== null && d2 !== null && L2 !== null && !edited.has("a") && v(inpA) === null)
      sc(inpA, Math.atan((D2 - d2) / (2 * L2)) * 180 / Math.PI);

    const parts = [];
    if (v(inpD) !== null && v(inpd) !== null && v(inpL) !== null) {
      const taper = (v(inpD) - v(inpd)) / v(inpL);
      parts.push("Kuželovitost: " + taper.toFixed(6));
      parts.push("1:" + (1 / taper).toFixed(2));
    }
    infoEl.textContent = parts.join("  \u2502  ");
  }

  allInp.forEach(inp => {
    inp.addEventListener("input", () => {
      const id = inp.dataset.id;
      if (inp.value !== "") { edited.add(id); inp.classList.remove("computed"); }
      else { edited.delete(id); }
      allInp.forEach(i => { if (!edited.has(i.dataset.id)) i.value = ""; });
      solve();
    });
  });

  overlay.querySelectorAll(".cnc-table tbody tr").forEach(tr => {
    tr.addEventListener("click", () => {
      inpD.value = tr.dataset.mD;
      inpd.value = tr.dataset.md;
      inpL.value = tr.dataset.mL;
      inpA.value = "";
      edited.clear(); edited.add("D"); edited.add("d"); edited.add("L");
      allInp.forEach(i => i.classList.remove("computed"));
      solve();
    });
  });

  overlay.querySelector(".cnc-btn-clear").addEventListener("click", () => {
    allInp.forEach(i => { i.value = ""; i.classList.remove("computed"); });
    edited.clear(); infoEl.textContent = "";
  });
  overlay.querySelector(".cnc-btn-copy").addEventListener("click", () => {
    const p = [];
    if (v(inpD) !== null) p.push("D=" + inpD.value);
    if (v(inpd) !== null) p.push("d=" + inpd.value);
    if (v(inpL) !== null) p.push("L=" + inpL.value);
    if (v(inpA) !== null) p.push("\u03B1=" + inpA.value + "\u00B0");
    if (p.length) navigator.clipboard.writeText(p.join("  ")).then(() => showToast("Zkopírováno"));
  });
}

// ══════════════════════════════════════════════════════════════
// ► Závity
// ══════════════════════════════════════════════════════════════
export function openThreadCalc() {
  const threads = [
    { n: "M1", p: 0.25, d: 0.75 }, { n: "M1.2", p: 0.25, d: 0.95 },
    { n: "M1.6", p: 0.35, d: 1.25 }, { n: "M2", p: 0.4, d: 1.6 },
    { n: "M2.5", p: 0.45, d: 2.05 }, { n: "M3", p: 0.5, d: 2.5 },
    { n: "M4", p: 0.7, d: 3.3 }, { n: "M5", p: 0.8, d: 4.2 },
    { n: "M6", p: 1.0, d: 5.0 }, { n: "M8", p: 1.25, d: 6.8 },
    { n: "M10", p: 1.5, d: 8.5 }, { n: "M12", p: 1.75, d: 10.2 },
    { n: "M14", p: 2.0, d: 12.0 }, { n: "M16", p: 2.0, d: 14.0 },
    { n: "M18", p: 2.5, d: 15.5 }, { n: "M20", p: 2.5, d: 17.5 },
    { n: "M22", p: 2.5, d: 19.5 }, { n: "M24", p: 3.0, d: 21.0 },
    { n: "M27", p: 3.0, d: 24.0 }, { n: "M30", p: 3.5, d: 26.5 },
  ];
  var rows = "";
  for (var ti = 0; ti < threads.length; ti++) {
    var t = threads[ti];
    var tpi = (25.4 / t.p).toFixed(1);
    rows += '<tr data-text="' + t.n + '  P=' + t.p + 'mm  vrt\u00E1k=' + t.d + 'mm">' +
      '<td>' + t.n + '</td><td>' + t.p + '</td><td>' + t.d + '</td><td>' + tpi + '</td></tr>';
  }

  const body =
    '<input type="text" class="cnc-filter" placeholder="Filtr (nap\u0159. M10)..." id="threadFilter">' +
    '<div class="cnc-table-wrap cnc-table-tall">' +
      '<table class="cnc-table" id="threadTable">' +
        '<thead><tr><th>Z\u00E1vit</th><th>Stoup\u00E1n\u00ED<br><small>mm</small></th><th>Vrt\u00E1k<br><small>mm</small></th><th>TPI<br><small>ref</small></th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>' +
    '<div class="cnc-table-label">Ru\u010Dn\u00ED v\u00FDpo\u010Det</div>' +
    '<div class="cnc-fields">' +
      '<label class="cnc-field"><span>D <small>mm</small></span><input type="number" data-id="tD" step="any" placeholder="Vn\u011Bj\u0161\u00ED \u00D8"></label>' +
      '<label class="cnc-field"><span>P <small>mm</small></span><input type="number" data-id="tP" step="any" placeholder="Stoup\u00E1n\u00ED"></label>' +
      '<label class="cnc-field"><span>Vrt\u00E1k <small>mm</small></span><input type="number" data-id="tDrill" step="any" placeholder="D \u2212 P" readonly></label>' +
      '<label class="cnc-field"><span>TPI <small>ref</small></span><input type="number" data-id="tTPI" step="any" placeholder="25.4/P" readonly></label>' +
    '</div>';

  const overlay = makeOverlay("thread", "\uD83D\uDD29 Z\u00E1vity", body);
  if (!overlay) return;

  const filter = overlay.querySelector("#threadFilter");
  const tbody = overlay.querySelector("#threadTable tbody");
  const inpD = overlay.querySelector('[data-id="tD"]');
  const inpP = overlay.querySelector('[data-id="tP"]');
  const inpDrill = overlay.querySelector('[data-id="tDrill"]');
  const inpTPI = overlay.querySelector('[data-id="tTPI"]');

  filter.addEventListener("input", () => {
    const q = filter.value.toLowerCase();
    tbody.querySelectorAll("tr").forEach(tr => {
      tr.style.display = tr.children[0].textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });

  tbody.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", () => {
      navigator.clipboard.writeText(tr.dataset.text).then(() => showToast("Zkop\u00EDrov\u00E1no: " + tr.dataset.text));
    });
  });

  function calcManual() {
    const D = inpD.value !== "" ? parseFloat(inpD.value) : null;
    const P = inpP.value !== "" ? parseFloat(inpP.value) : null;
    inpDrill.value = (D !== null && P !== null) ? parseFloat((D - P).toFixed(3)) : "";
    inpTPI.value = P ? parseFloat((25.4 / P).toFixed(1)) : "";
    if (inpDrill.value) inpDrill.classList.add("computed"); else inpDrill.classList.remove("computed");
    if (inpTPI.value) inpTPI.classList.add("computed"); else inpTPI.classList.remove("computed");
  }
  inpD.addEventListener("input", calcManual);
  inpP.addEventListener("input", calcManual);
}

// ══════════════════════════════════════════════════════════════
// ► Převodník
// ══════════════════════════════════════════════════════════════
export function openConvertCalc() {
  const body =
    '<div class="conv-section">' +
      '<div class="conv-label">D\u00E9lka</div>' +
      '<div class="conv-row">' +
        '<label class="conv-inp"><input type="number" data-conv="mm" step="any" placeholder="0"><small>mm</small></label>' +
        '<span class="conv-arrow">\u2194</span>' +
        '<label class="conv-inp"><input type="number" data-conv="inch" step="any" placeholder="0"><small>inch</small></label>' +
      '</div>' +
    '</div>' +
    '<div class="conv-section">' +
      '<div class="conv-label">\u00DAhly</div>' +
      '<div class="conv-row">' +
        '<label class="conv-inp"><input type="number" data-conv="deg" step="any" placeholder="0"><small>\u00B0</small></label>' +
        '<span class="conv-arrow">\u2194</span>' +
        '<label class="conv-inp"><input type="number" data-conv="rad" step="any" placeholder="0"><small>rad</small></label>' +
      '</div>' +
    '</div>' +
    '<div class="conv-section">' +
      '<div class="conv-label">Drsnost</div>' +
      '<div class="conv-row">' +
        '<label class="conv-inp"><input type="number" data-conv="ra" step="any" placeholder="0"><small>Ra</small></label>' +
        '<span class="conv-arrow">\u2194</span>' +
        '<label class="conv-inp"><input type="number" data-conv="rz" step="any" placeholder="0"><small>Rz</small></label>' +
      '</div>' +
    '</div>';

  const overlay = makeOverlay("convert", "\uD83D\uDD04 P\u0159evodn\u00EDk", body);
  if (!overlay) return;

  const gc = id => overlay.querySelector('[data-conv="' + id + '"]');
  const pairs = [
    { a: gc("mm"), b: gc("inch"), aToB: v => v / 25.4, bToA: v => v * 25.4 },
    { a: gc("deg"), b: gc("rad"), aToB: v => v * Math.PI / 180, bToA: v => v * 180 / Math.PI },
    { a: gc("ra"), b: gc("rz"), aToB: v => v * 4, bToA: v => v / 4 },
  ];
  pairs.forEach(function(pair) {
    pair.a.addEventListener("input", () => {
      if (pair.a.value === "") { pair.b.value = ""; return; }
      pair.b.value = parseFloat(pair.aToB(parseFloat(pair.a.value)).toFixed(6));
    });
    pair.b.addEventListener("input", () => {
      if (pair.b.value === "") { pair.a.value = ""; return; }
      pair.a.value = parseFloat(pair.bToA(parseFloat(pair.b.value)).toFixed(6));
    });
  });
}

// ══════════════════════════════════════════════════════════════
// ► Hmotnost
// ══════════════════════════════════════════════════════════════
export function openWeightCalc() {
  const body =
    '<div class="cnc-fields">' +
      '<label class="cnc-field cnc-field-full"><span>Tvar</span>' +
        '<select data-id="wShape">' +
          '<option value="rod">Kulatina (pln\u00E1)</option>' +
          '<option value="tube">Trubka</option>' +
          '<option value="flat">Ploch\u00E1 ty\u010D</option>' +
        '</select></label>' +
      '<label class="cnc-field cnc-field-full"><span>Materi\u00E1l</span>' +
        '<select data-id="wMat">' +
          '<option value="7850">Ocel (11 523) \u2013 7850</option>' +
          '<option value="7900">Nerez (17 240) \u2013 7900</option>' +
          '<option value="2700">Hlin\u00EDk \u2013 2700</option>' +
          '<option value="8500">Mosaz \u2013 8500</option>' +
          '<option value="8960">M\u011B\u010F \u2013 8960</option>' +
          '<option value="8800">Bronz \u2013 8800</option>' +
          '<option value="1410">POM (ertacetal) \u2013 1410</option>' +
          '<option value="1140">PA6 (nylon) \u2013 1140</option>' +
        '</select></label>' +
    '</div>' +
    '<div class="cnc-fields" id="wDims">' +
      '<label class="cnc-field" id="wDField"><span>D <small>mm</small></span><input type="number" data-id="wD" step="any" placeholder="Pr\u016Fm\u011Br"></label>' +
      '<label class="cnc-field" id="wdField" style="display:none"><span>d <small>mm</small></span><input type="number" data-id="wd" step="any" placeholder="Vnit\u0159n\u00ED \u00D8"></label>' +
      '<label class="cnc-field" id="wWField" style="display:none"><span>\u0160 <small>mm</small></span><input type="number" data-id="wW" step="any" placeholder="\u0160\u00ED\u0159ka"></label>' +
      '<label class="cnc-field" id="wHField" style="display:none"><span>V <small>mm</small></span><input type="number" data-id="wH" step="any" placeholder="V\u00FD\u0161ka"></label>' +
      '<label class="cnc-field"><span>L <small>mm</small></span><input type="number" data-id="wL" step="any" placeholder="D\u00E9lka"></label>' +
    '</div>' +
    '<div class="cnc-result" id="wResult">Zadejte rozm\u011Bry\u2026</div>' +
    '<div class="cnc-actions"><button class="cnc-btn cnc-btn-copy">\uD83D\uDCCB Kopírovat</button></div>';

  const overlay = makeOverlay("weight", "\u2696\uFE0F Hmotnost", body);
  if (!overlay) return;

  const shape = overlay.querySelector('[data-id="wShape"]');
  const mat = overlay.querySelector('[data-id="wMat"]');
  const inpD = overlay.querySelector('[data-id="wD"]');
  const inpd = overlay.querySelector('[data-id="wd"]');
  const inpW = overlay.querySelector('[data-id="wW"]');
  const inpH = overlay.querySelector('[data-id="wH"]');
  const inpL = overlay.querySelector('[data-id="wL"]');
  const dField = overlay.querySelector("#wDField");
  const dFieldInner = overlay.querySelector("#wdField");
  const wField = overlay.querySelector("#wWField");
  const hField = overlay.querySelector("#wHField");
  const resultEl = overlay.querySelector("#wResult");

  function updateShape() {
    const s = shape.value;
    dField.style.display = (s === "flat") ? "none" : "";
    dFieldInner.style.display = (s === "tube") ? "" : "none";
    wField.style.display = (s === "flat") ? "" : "none";
    hField.style.display = (s === "flat") ? "" : "none";
    calc();
  }

  function calc() {
    const s = shape.value;
    const rho = parseFloat(mat.value);
    const L = inpL.value !== "" ? parseFloat(inpL.value) : null;
    var vol = null;

    if (s === "rod") {
      const D = inpD.value !== "" ? parseFloat(inpD.value) : null;
      if (D && L) vol = Math.PI / 4 * D * D * L;
    } else if (s === "tube") {
      const D = inpD.value !== "" ? parseFloat(inpD.value) : null;
      const d = inpd.value !== "" ? parseFloat(inpd.value) : null;
      if (D && d && L) vol = Math.PI / 4 * (D * D - d * d) * L;
    } else {
      const W = inpW.value !== "" ? parseFloat(inpW.value) : null;
      const H = inpH.value !== "" ? parseFloat(inpH.value) : null;
      if (W && H && L) vol = W * H * L;
    }

    if (vol !== null) {
      const volCm3 = vol / 1000;
      const mass = vol * rho / 1e9;
      resultEl.innerHTML = '<strong>' + mass.toFixed(3) + ' kg</strong>  (' + (mass * 1000).toFixed(1) + ' g)  \u2502  ' + volCm3.toFixed(2) + ' cm\u00B3';
    } else {
      resultEl.textContent = "Zadejte rozm\u011Bry\u2026";
    }
  }

  shape.addEventListener("change", updateShape);
  [mat, inpD, inpd, inpW, inpH, inpL].forEach(el => el.addEventListener("input", calc));
  updateShape();

  overlay.querySelector(".cnc-btn-copy").addEventListener("click", () => {
    if (resultEl.textContent && resultEl.textContent !== "Zadejte rozm\u011Bry\u2026") {
      navigator.clipboard.writeText(resultEl.textContent).then(() => showToast("Zkop\u00EDrov\u00E1no"));
    }
  });
}
