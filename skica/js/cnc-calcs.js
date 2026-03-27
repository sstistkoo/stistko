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

// ══════════════════════════════════════════════════════════════
// ► Tolerance (ISO 2768 + ISO 286)
// ══════════════════════════════════════════════════════════════
export function openToleranceCalc() {
  // ── ISO 2768-1 : volné míry ──
  // [maxDim, f, m, c, v]  (±mm)
  var freeRows = [
    [3,    0.05, 0.1,  0.2,  null],
    [6,    0.05, 0.1,  0.3,  0.5],
    [30,   0.1,  0.2,  0.5,  1.0],
    [120,  0.15, 0.3,  0.8,  1.5],
    [400,  0.2,  0.5,  1.2,  2.5],
    [1000, 0.3,  0.8,  2.0,  4.0],
    [2000, 0.5,  1.2,  3.0,  6.0],
    [4000, null, 2.0,  4.0,  8.0],
  ];
  var freeHTML = '<table class="cnc-table"><thead><tr>' +
    '<th>Rozm\u011Br (mm)</th><th>f</th><th>m</th><th>c</th><th>v</th></tr></thead><tbody>';
  var prevMax = 0.5;
  for (var fi = 0; fi < freeRows.length; fi++) {
    var r = freeRows[fi];
    freeHTML += '<tr><td>' + prevMax + ' \u2013 ' + r[0] + '</td>';
    for (var ci = 1; ci <= 4; ci++) {
      freeHTML += '<td>' + (r[ci] !== null ? '\u00B1' + r[ci] : '\u2014') + '</td>';
    }
    freeHTML += '</tr>';
    prevMax = r[0];
  }
  freeHTML += '</tbody></table>';

  // ── ISO 286 data ──
  // Dimension ranges [min, max] in mm
  var dimRanges = [
    [1,3],[3,6],[6,10],[10,18],[18,30],[30,50],[50,80],[80,120],
    [120,180],[180,250],[250,315],[315,400],[400,500]
  ];

  // IT grade tolerances in µm, indexed by dimRange then IT grade (IT1..IT18)
  var itTable = [
    /*1-3*/    [0.8,1.2,2,3,4,6,10,14,25,40,60,100,140,250,400,600,1000,1400],
    /*3-6*/    [1,1.5,2.5,4,5,8,12,18,30,48,75,120,180,300,480,750,1200,1800],
    /*6-10*/   [1,1.5,2.5,4,6,9,15,22,36,58,90,150,220,360,580,900,1500,2200],
    /*10-18*/  [1.2,2,3,5,8,11,18,27,43,70,110,180,270,430,700,1100,1800,2700],
    /*18-30*/  [1.5,2.5,4,6,9,13,21,33,52,84,130,210,330,520,840,1300,2100,3300],
    /*30-50*/  [1.5,2.5,4,7,11,16,25,39,62,100,160,250,390,620,1000,1600,2500,3900],
    /*50-80*/  [2,3,5,8,13,19,30,46,74,120,190,300,460,740,1200,1900,3000,4600],
    /*80-120*/ [2.5,4,6,10,15,22,35,54,87,140,220,350,540,870,1400,2200,3500,5400],
    /*120-180*/[3.5,5,8,12,18,25,40,63,100,160,250,400,630,1000,1600,2500,4000,6300],
    /*180-250*/[4.5,7,10,14,20,29,46,72,115,185,290,460,720,1150,1850,2900,4600,7200],
    /*250-315*/[6,8,12,16,23,32,52,81,130,210,320,520,810,1300,2100,3200,5200,8100],
    /*315-400*/[7,9,13,18,25,36,57,89,140,230,360,570,890,1400,2300,3600,5700,8900],
    /*400-500*/[8,10,15,20,27,40,63,97,155,250,400,630,970,1550,2500,4000,6300,9700],
  ];

  // Fundamental deviations in µm (shaft lowercase, hole uppercase)
  // Shaft: deviation is upper deviation (negative for a-h)
  // Key: letter -> array of values per dimRange
  var shaftDev = {
    a:  [-270,-270,-280,-290,-300,-310,-320,-340,-360,-380,-410,-440,-480],
    b:  [-140,-140,-150,-150,-160,-170,-180,-190,-200,-210,-230,-240,-260],
    c:  [-60,-70,-80,-95,-110,-120,-130,-140,-150,-170,-180,-190,-200],
    d:  [-20,-30,-40,-50,-65,-80,-100,-120,-145,-170,-190,-210,-230],
    e:  [-14,-20,-25,-32,-40,-50,-60,-72,-85,-100,-110,-125,-135],
    f:  [-6,-10,-13,-16,-20,-25,-30,-36,-43,-50,-56,-62,-68],
    g:  [-2,-4,-5,-6,-7,-9,-10,-12,-14,-15,-17,-18,-20],
    h:  [0,0,0,0,0,0,0,0,0,0,0,0,0],
    js: [0,0,0,0,0,0,0,0,0,0,0,0,0], // special: ±IT/2
    j:  [2,5,5,5,5,6,6,6,6,7,7,7,7],  // approximate j5-j8
    k:  [4,6,7,8,9,11,13,15,18,20,22,24,27],
    m:  [6,9,12,15,17,20,24,28,33,37,41,45,50],
    n:  [10,16,19,23,28,33,39,45,52,60,66,73,80],
    p:  [12,20,24,29,35,42,51,59,68,79,88,98,108],
    r:  [16,23,28,34,41,50,60,71,83,96,108,119,131],
    s:  [20,27,32,39,48,59,72,85,100,117,133,148,165],
  };

  // Hole: lower deviation (positive for A-H... actually A-G negative from zero, H=0)
  // For holes, deviation is LOWER deviation. H=0 always.
  // A-G have negative upper dev (hole is shifted up = positive lower dev)
  // Wait: For HOLES the fundamental deviation IS the lower deviation for A-H,
  // and upper deviation for J-Z.
  // Actually: Hole A = large clearance (positive lower deviation, big)
  // H = lower deviation = 0
  // K,M,N,P = transition/interference (negative lower deviation)
  // The hole deviation = -shaft deviation for same letter (approximately)
  var holeDev = {};
  var holeLetters = ["A","B","C","D","E","F","G","H","JS","J","K","M","N","P","R","S"];
  var shaftLetters = ["a","b","c","d","e","f","g","h","js","j","k","m","n","p","r","s"];
  // For holes A-H: lower deviation = positive of |shaft upper deviation|
  // For holes K-ZC: lower deviation = negative of shaft deviation
  for (var hi = 0; hi < holeLetters.length; hi++) {
    var sl = shaftLetters[hi];
    var hl = holeLetters[hi];
    var sVals = shaftDev[sl];
    if (sl === "js") {
      holeDev[hl] = [0,0,0,0,0,0,0,0,0,0,0,0,0]; // special
    } else if (sl <= "h") {
      // a-h: shaft has negative upper dev, hole gets positive lower dev
      holeDev[hl] = sVals.map(function(v) { return -v; });
    } else {
      // j-z: shaft has positive lower dev, hole gets negative lower dev
      holeDev[hl] = sVals.map(function(v) { return -v; });
    }
  }

  // Build grid buttons instead of selects
  var shaftBtns = '', holeBtns = '';
  for (var si = 0; si < shaftLetters.length; si++) {
    var act = shaftLetters[si] === 'h' ? ' tol-g-active' : '';
    shaftBtns += '<button class="tol-g-btn' + act + '" data-val="' + shaftLetters[si] + '">' + shaftLetters[si] + '</button>';
  }
  for (var hi2 = 0; hi2 < holeLetters.length; hi2++) {
    var act2 = holeLetters[hi2] === 'H' ? ' tol-g-active' : '';
    holeBtns += '<button class="tol-g-btn' + act2 + '" data-val="' + holeLetters[hi2] + '">' + holeLetters[hi2] + '</button>';
  }

  var itBtns = '';
  for (var it = 1; it <= 18; it++) {
    var act3 = (it === 7) ? ' tol-g-active' : '';
    itBtns += '<button class="tol-g-btn' + act3 + '" data-val="' + it + '">' + it + '</button>';
  }

  var body =
    '<div class="cnc-table-label">Voln\u00E9 m\u00EDry \u2013 \u010CSN EN ISO 2768-1</div>' +
    '<div class="cnc-table-wrap">' + freeHTML + '</div>' +
    '<div class="cnc-table-label" style="margin-top:12px">Tolerovan\u00E9 rozm\u011Bry \u2013 \u010CSN EN ISO 286-1</div>' +
    '<div class="cnc-fields">' +
      '<label class="cnc-field cnc-field-full"><span>Jmenovit\u00FD rozm\u011Br <small>mm</small></span>' +
        '<input type="number" data-id="tolDim" step="any" placeholder="nap\u0159. 25"></label>' +
    '</div>' +
    '<div class="tol-toggle-row">' +
      '<button class="tol-toggle tol-active" data-mode="hole">D\u00EDra</button>' +
      '<button class="tol-toggle" data-mode="shaft">H\u0159\u00EDdel</button>' +
    '</div>' +
    '<div class="cnc-field cnc-field-full"><span>T\u0159\u00EDda</span>' +
      '<div class="tol-grid tol-class-grid" data-id="tolClass">' + holeBtns + '</div></div>' +
    '<div class="cnc-field cnc-field-full"><span>Stupe\u0148</span>' +
      '<div class="tol-grid tol-it-grid" data-id="tolIT">' + itBtns + '</div></div>' +
    '<div class="cnc-result" id="tolResult">Zadejte rozm\u011Br\u2026</div>' +
    '<div class="cnc-actions"><button class="cnc-btn cnc-btn-copy">\uD83D\uDCCB Kopírovat</button></div>';

  var overlay = makeOverlay("tolerance", "\uD83D\uDCCF Tolerance", body);
  if (!overlay) return;

  var inpDim = overlay.querySelector('[data-id="tolDim"]');
  var gridClass = overlay.querySelector('[data-id="tolClass"]');
  var gridIT = overlay.querySelector('[data-id="tolIT"]');
  var resultEl = overlay.querySelector("#tolResult");
  var btnHole = overlay.querySelector('[data-mode="hole"]');
  var btnShaft = overlay.querySelector('[data-mode="shaft"]');
  var isHole = true;

  function getGridVal(grid) {
    var a = grid.querySelector('.tol-g-active');
    return a ? a.dataset.val : null;
  }

  function initGrid(grid, onChange) {
    grid.addEventListener('click', function(e) {
      var btn = e.target.closest('.tol-g-btn');
      if (!btn) return;
      var prev = grid.querySelector('.tol-g-active');
      if (prev) prev.classList.remove('tol-g-active');
      btn.classList.add('tol-g-active');
      if (onChange) onChange();
    });
  }

  initGrid(gridClass, calc);
  initGrid(gridIT, calc);

  function setMode(hole) {
    isHole = hole;
    btnHole.classList.toggle("tol-active", hole);
    btnShaft.classList.toggle("tol-active", !hole);
    gridClass.innerHTML = hole ? holeBtns : shaftBtns;
    calc();
  }
  btnHole.addEventListener("click", function() { setMode(true); });
  btnShaft.addEventListener("click", function() { setMode(false); });

  function calc() {
    var dim = inpDim.value !== "" ? parseFloat(inpDim.value) : null;
    if (dim === null || dim < 1 || dim > 500) {
      resultEl.textContent = dim !== null ? "Rozm\u011Br mimo rozsah (1\u2013500 mm)" : "Zadejte rozm\u011Br\u2026";
      return;
    }

    // find dimension range index
    var ri = -1;
    for (var i = 0; i < dimRanges.length; i++) {
      if (dim > dimRanges[i][0] && dim <= dimRanges[i][1]) { ri = i; break; }
    }
    // edge case: dim == 1 fits first range
    if (dim === 1) ri = 0;
    if (ri < 0) { resultEl.textContent = "Rozm\u011Br mimo rozsah"; return; }

    var itGrade = parseInt(getGridVal(gridIT)); // 1..18
    var tol = itTable[ri][itGrade - 1]; // µm

    var letter = getGridVal(gridClass);
    var devTable = isHole ? holeDev : shaftDev;
    var dev = devTable[letter];
    if (!dev) { resultEl.textContent = "Neplatn\u00E1 t\u0159\u00EDda"; return; }

    var fundDev = dev[ri]; // µm

    var upper, lower; // in µm
    if (isHole) {
      // Hole: for A-H fundamental deviation is lower deviation
      if (letter === "JS") {
        lower = -Math.round(tol / 2);
        upper = Math.round(tol / 2);
      } else if (letter <= "H") {
        // A-H: lower dev is positive (or zero for H), upper = lower + tol
        lower = fundDev;
        upper = fundDev + tol;
      } else {
        // J-ZC: fund dev is upper deviation (negative)
        upper = fundDev;
        lower = fundDev - tol;
      }
    } else {
      // Shaft: for a-h fundamental deviation is upper deviation
      if (letter === "js") {
        upper = Math.round(tol / 2);
        lower = -Math.round(tol / 2);
      } else if (letter <= "h") {
        // a-h: upper dev is negative (or zero for h), lower = upper - tol
        upper = fundDev;
        lower = fundDev - tol;
      } else {
        // j-z: fund dev is lower deviation (positive)
        lower = fundDev;
        upper = fundDev + tol;
      }
    }

    var dimMax = dim + upper / 1000;
    var dimMin = dim + lower / 1000;
    var sign = function(v) { return v > 0 ? "+" + v : "" + v; };

    var label = isHole ? letter.toUpperCase() : letter;
    var tolLabel = dim + " " + label + itGrade;

    resultEl.innerHTML =
      '<strong>' + tolLabel + '</strong><br>' +
      'Horn\u00ED \u00FAdchylka: ' + sign(upper) + ' \u00B5m \u2502 Doln\u00ED: ' + sign(lower) + ' \u00B5m<br>' +
      '\u00D8 max: <strong>' + dimMax.toFixed(3) + '</strong> mm \u2502 \u00D8 min: <strong>' + dimMin.toFixed(3) + '</strong> mm<br>' +
      'Tolerance: ' + tol + ' \u00B5m (' + (tol / 1000).toFixed(3) + ' mm)';
  }

  inpDim.addEventListener("input", calc);

  overlay.querySelector(".cnc-btn-copy").addEventListener("click", function() {
    if (resultEl.textContent && resultEl.textContent !== "Zadejte rozm\u011Br\u2026") {
      navigator.clipboard.writeText(resultEl.textContent).then(function() { showToast("Zkop\u00EDrov\u00E1no"); });
    }
  });
}
