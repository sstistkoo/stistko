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
// ► Řezné podmínky (rozšířené: materiálové předvolby, ap, Pc, ts)
// ══════════════════════════════════════════════════════════════

// Databáze materiálů: [název, Vc_SK m/min, Vc_HSS m/min, f_hrub mm/ot, f_dok mm/ot, kc MPa]
const cuttingMaterials = [
  ["Ocel 11 523 (S355)",      180, 35, 0.3, 0.1, 1800],
  ["Ocel 12 050 (C45)",       160, 30, 0.25, 0.08, 2000],
  ["Ocel 14 220 (16MnCr5)",   140, 25, 0.2, 0.08, 2100],
  ["Ocel 15 142 (42CrMo4)",   120, 20, 0.2, 0.06, 2200],
  ["Nerez 17 240 (X5CrNi)",   100, 15, 0.15, 0.06, 2400],
  ["Nerez 17 346 (X2CrNiMo)", 90,  12, 0.12, 0.05, 2500],
  ["Litina 42 2420 (GG25)",   200, 40, 0.3, 0.1, 1100],
  ["Hliník (AlCu4Mg)",        400, 80, 0.4, 0.15, 700],
  ["Hliník (slitiny Si)",     300, 60, 0.3, 0.12, 800],
  ["Mosaz (CuZn39Pb3)",       250, 50, 0.3, 0.1, 780],
  ["Měď (Cu-ETP)",            200, 40, 0.2, 0.08, 900],
  ["Bronz (CuSn8)",           120, 25, 0.2, 0.08, 1000],
  ["POM (ertacetal)",          300, 80, 0.3, 0.1, 250],
  ["PA6 (nylon)",              250, 60, 0.3, 0.1, 200],
];

export function openCuttingCalc() {
  var matOptions = '';
  for (var i = 0; i < cuttingMaterials.length; i++) {
    var m = cuttingMaterials[i];
    matOptions += '<option value="' + i + '">' + m[0] + '</option>';
  }

  const body =
    '<div class="cnc-fields">' +
      '<label class="cnc-field cnc-field-full"><span>Materiál <small>(předvolba)</small></span>' +
        '<select data-id="cMat"><option value="">-- Ruční zadání --</option>' + matOptions + '</select></label>' +
    '</div>' +
    '<div class="cnc-mat-hint" id="cMatHint"></div>' +
    '<div class="cnc-fields">' +
      '<label class="cnc-field"><span>D <small>mm</small></span><input type="number" data-id="D" step="any" placeholder="Průměr"></label>' +
      '<label class="cnc-field"><span>Vc <small>m/min</small></span><input type="number" data-id="Vc" step="any" placeholder="Řezná rychlost"></label>' +
      '<label class="cnc-field"><span>n <small>min\u207B\u00B9</small></span><input type="number" data-id="n" step="any" placeholder="Otáčky"></label>' +
      '<label class="cnc-field"><span>f <small>mm/ot</small></span><input type="number" data-id="f" step="any" placeholder="Posuv"></label>' +
      '<label class="cnc-field"><span>Vf <small>mm/min</small></span><input type="number" data-id="Vf" step="any" placeholder="Posuvová rychlost"></label>' +
      '<label class="cnc-field"><span>ap <small>mm</small></span><input type="number" data-id="ap" step="any" placeholder="Hloubka řezu"></label>' +
      '<label class="cnc-field"><span>L <small>mm</small></span><input type="number" data-id="cL" step="any" placeholder="Délka řezu"></label>' +
    '</div>' +
    '<div class="cnc-info" id="cuttingInfo"></div>' +
    '<div class="cnc-result" id="cuttingExtra"></div>' +
    '<div class="cnc-actions">' +
      '<button class="cnc-btn cnc-btn-clear">\uD83D\uDDD1 Vymazat</button>' +
      '<button class="cnc-btn cnc-btn-copy">\uD83D\uDCCB Kopírovat</button>' +
    '</div>';

  const overlay = makeOverlay("cutting", "\u2699\uFE0F Řezné podmínky", body);
  if (!overlay) return;

  const fieldIds = ["D","Vc","n","f","Vf","ap","cL"];
  const inputs = {};
  fieldIds.forEach(id => { inputs[id] = overlay.querySelector('[data-id="' + id + '"]'); });
  const matSel = overlay.querySelector('[data-id="cMat"]');
  const matHint = overlay.querySelector("#cMatHint");
  const edited = new Set();
  const infoEl = overlay.querySelector("#cuttingInfo");
  const extraEl = overlay.querySelector("#cuttingExtra");

  function val(inp) { return inp.value !== "" ? parseFloat(inp.value) : null; }
  function setC(inp, v) { inp.value = parseFloat(v.toFixed(4)); inp.classList.add("computed"); }

  // Materiálová předvolba
  matSel.addEventListener("change", () => {
    const idx = matSel.value;
    if (idx === "") {
      matHint.innerHTML = "";
      return;
    }
    const m = cuttingMaterials[parseInt(idx)];
    matHint.innerHTML =
      '<span>Vc SK: <strong>' + m[1] + '</strong> m/min</span>' +
      '<span>Vc HSS: <strong>' + m[2] + '</strong> m/min</span>' +
      '<span>f hrub: <strong>' + m[3] + '</strong></span>' +
      '<span>f dok: <strong>' + m[4] + '</strong></span>' +
      '<span>kc: <strong>' + m[5] + '</strong> MPa</span>';
  });

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
    ["D","Vc","n","f","Vf"].forEach(id => { const v = val(inputs[id]); if (v !== null) parts.push(id + "=" + inputs[id].value); });
    infoEl.textContent = parts.length ? parts.join("  \u2502  ") : "";

    // Extra výpočty: strojní čas, řezný výkon
    const extraParts = [];
    const ap = val(inputs.ap);
    const cL = val(inputs.cL);
    const fFinal = val(inputs.f);
    const nFinal = val(inputs.n);
    const VcFinal = val(inputs.Vc);
    const VfFinal = val(inputs.Vf) || (fFinal && nFinal ? fFinal * nFinal : null);

    // Strojní čas
    if (cL && VfFinal && VfFinal > 0) {
      const ts = cL / VfFinal;
      extraParts.push("Strojní čas: <strong>" + ts.toFixed(2) + " min</strong> (" + (ts * 60).toFixed(0) + " s)");
    }

    // Řezný výkon Pc = (kc × ap × f × Vc) / (60 × 10³)
    const matIdx = matSel.value;
    if (matIdx !== "" && ap && fFinal && VcFinal) {
      const kc = cuttingMaterials[parseInt(matIdx)][5];
      const Pc = (kc * ap * fFinal * VcFinal) / (60 * 1000);
      extraParts.push("Řezný výkon: <strong>" + Pc.toFixed(2) + " kW</strong> (kc=" + kc + " MPa)");
    }

    if (ap) extraParts.push("Hloubka řezu: " + ap + " mm");

    extraEl.innerHTML = extraParts.length ? extraParts.join("<br>") : "";
  }

  fieldIds.forEach(id => {
    inputs[id].addEventListener("input", () => {
      if (inputs[id].value !== "") { edited.add(id); inputs[id].classList.remove("computed"); }
      else { edited.delete(id); }
      // Vymazat jen provázané parametry (D,Vc,n,f,Vf), ne ap a L
      ["D","Vc","n","f","Vf"].forEach(k => { if (!edited.has(k)) inputs[k].value = ""; });
      solve();
    });
  });

  overlay.querySelector(".cnc-btn-clear").addEventListener("click", () => {
    fieldIds.forEach(id => { inputs[id].value = ""; inputs[id].classList.remove("computed"); });
    edited.clear(); infoEl.textContent = ""; extraEl.innerHTML = "";
    matSel.value = ""; matHint.innerHTML = "";
  });
  overlay.querySelector(".cnc-btn-copy").addEventListener("click", () => {
    const parts = [];
    fieldIds.forEach(id => { const v = val(inputs[id]); if (v !== null) parts.push(id + "=" + inputs[id].value); });
    if (extraEl.textContent) parts.push(extraEl.textContent);
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
  const metricData = [
    { name: "4 (1:20)", D: 4, ratio: 20 },
    { name: "6 (1:20)", D: 6, ratio: 20 },
    { name: "80 (1:20)", D: 80, ratio: 20 },
    { name: "100 (1:20)", D: 100, ratio: 20 },
    { name: "120 (1:20)", D: 120, ratio: 20 },
    { name: "160 (1:20)", D: 160, ratio: 20 },
    { name: "200 (1:20)", D: 200, ratio: 20 },
    { name: "7:24 ISO 30", D: 31.75, ratio: 3.4286 },
    { name: "7:24 ISO 40", D: 44.45, ratio: 3.4286 },
    { name: "7:24 ISO 50", D: 69.85, ratio: 3.4286 },
    { name: "1:10", D: 0, ratio: 10 },
    { name: "1:5",  D: 0, ratio: 5 },
    { name: "1:50", D: 0, ratio: 50 },
  ];

  var morseRows = "";
  for (var mi = 0; mi < morseData.length; mi++) {
    var m = morseData[mi];
    var ang = Math.atan((m.D - m.d) / (2 * m.L)) * 180 / Math.PI;
    morseRows += '<tr data-mD="' + m.D + '" data-md="' + m.d + '" data-mL="' + m.L + '">' +
      '<td>' + m.name + '</td><td>' + m.D + '</td><td>' + m.d + '</td><td>' + m.L + '</td><td>' + ang.toFixed(4) + '\u00B0</td></tr>';
  }
  var metricRows = "";
  for (var mti = 0; mti < metricData.length; mti++) {
    var mt = metricData[mti];
    var mAng = Math.atan(1 / (2 * mt.ratio)) * 180 / Math.PI;
    metricRows += '<tr data-ratio="' + mt.ratio + '" data-mD="' + mt.D + '">' +
      '<td>' + mt.name + '</td><td>1:' + mt.ratio + '</td><td>' + mAng.toFixed(4) + '\u00B0</td></tr>';
  }

  const body =
    '<div class="cnc-fields">' +
      '<label class="cnc-field"><span>D <small>mm</small></span><input type="number" data-id="D" step="any" placeholder="Velký \u00D8"></label>' +
      '<label class="cnc-field"><span>d <small>mm</small></span><input type="number" data-id="d" step="any" placeholder="Malý \u00D8"></label>' +
      '<label class="cnc-field"><span>L <small>mm</small></span><input type="number" data-id="L" step="any" placeholder="Délka"></label>' +
      '<label class="cnc-field"><span>\u03B1 <small>\u00B0</small></span><input type="number" data-id="a" step="any" placeholder="Polo. úhel"></label>' +
    '</div>' +
    '<div class="cnc-info" id="taperInfo"></div>' +
    '<div class="cnc-result" id="taperSlide"></div>' +
    '<div class="cnc-actions">' +
      '<button class="cnc-btn cnc-btn-clear">\uD83D\uDDD1 Vymazat</button>' +
      '<button class="cnc-btn cnc-btn-copy">\uD83D\uDCCB Kopírovat</button>' +
    '</div>' +
    '<div class="cnc-table-label">Morse kužely <small>(klikni pro vyplnění)</small></div>' +
    '<div class="cnc-table-wrap">' +
      '<table class="cnc-table"><thead><tr><th></th><th>D</th><th>d</th><th>L</th><th>\u03B1</th></tr></thead>' +
      '<tbody>' + morseRows + '</tbody></table>' +
    '</div>' +
    '<div class="cnc-table-label" style="margin-top:8px">Metrické a ISO kužely <small>(klikni)</small></div>' +
    '<div class="cnc-table-wrap">' +
      '<table class="cnc-table" id="metricTaperTbl"><thead><tr><th>Kužel</th><th>Poměr</th><th>\u03B1</th></tr></thead>' +
      '<tbody>' + metricRows + '</tbody></table>' +
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
  const slideEl = overlay.querySelector("#taperSlide");

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
    const slideParts = [];
    if (v(inpD) !== null && v(inpd) !== null && v(inpL) !== null) {
      const taper = (v(inpD) - v(inpd)) / v(inpL);
      parts.push("Kuželovitost: " + taper.toFixed(6));
      parts.push("1:" + (1 / taper).toFixed(2));
    }
    infoEl.textContent = parts.join("  \u2502  ");

    // Náklon příčného suportu / koníku
    const aFinal = v(inpA);
    const LFinal = v(inpL);
    const DFinal = v(inpD);
    const dFinal = v(inpd);
    if (aFinal !== null && aFinal > 0) {
      var tanA = Math.tan(aFinal * Math.PI / 180);
      slideParts.push("\uD83D\uDD27 <strong>Náklon suportu:</strong> " + aFinal.toFixed(4) + "°");
      if (LFinal) {
        var slideOffset = tanA * LFinal;
        slideParts.push("Příčný posun koníku: <strong>" + (slideOffset / 2).toFixed(3) + " mm</strong> (na délku " + LFinal + " mm)");
      }
      if (DFinal !== null && dFinal !== null) {
        slideParts.push("Příčný přísuv na stranu: <strong>" + ((DFinal - dFinal) / 2).toFixed(3) + " mm</strong>");
      }
    }
    slideEl.innerHTML = slideParts.length ? slideParts.join("<br>") : "";
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

  // Morse table click
  overlay.querySelectorAll(".cnc-table tbody tr").forEach(tr => {
    if (!tr.dataset.mD && !tr.dataset.ratio) return;
    tr.addEventListener("click", () => {
      if (tr.dataset.ratio) {
        // Metrický kužel – vyplnit poměr
        var ratio = parseFloat(tr.dataset.ratio);
        var mD = parseFloat(tr.dataset.mD);
        var halfAngle = Math.atan(1 / (2 * ratio)) * 180 / Math.PI;
        inpA.value = halfAngle.toFixed(4);
        if (mD > 0) { inpD.value = mD; edited.add("D"); }
        else { inpD.value = ""; edited.delete("D"); }
        inpd.value = ""; inpL.value = "";
        edited.delete("d"); edited.delete("L");
        edited.add("a");
        allInp.forEach(i => i.classList.remove("computed"));
        solve();
        return;
      }
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
    edited.clear(); infoEl.textContent = ""; slideEl.innerHTML = "";
  });
  overlay.querySelector(".cnc-btn-copy").addEventListener("click", () => {
    const p = [];
    if (v(inpD) !== null) p.push("D=" + inpD.value);
    if (v(inpd) !== null) p.push("d=" + inpd.value);
    if (v(inpL) !== null) p.push("L=" + inpL.value);
    if (v(inpA) !== null) p.push("\u03B1=" + inpA.value + "\u00B0");
    if (slideEl.textContent) p.push(slideEl.textContent);
    if (p.length) navigator.clipboard.writeText(p.join("  ")).then(() => showToast("Zkopírováno"));
  });
}

// ══════════════════════════════════════════════════════════════
// ► Závity – M, G, Tr, UNC, UNF, BSW, NPT, Acme
// ══════════════════════════════════════════════════════════════
export function openThreadCalc() {
  // ── DATA ──────────────────────────────────────────────────
  // M hrubé – ISO 261, úhel 60°
  var mCoarse = [
    {D:1,P:0.25},{D:1.1,P:0.25},{D:1.2,P:0.25},{D:1.4,P:0.3},{D:1.6,P:0.35},
    {D:1.8,P:0.35},{D:2,P:0.4},{D:2.2,P:0.45},{D:2.5,P:0.45},{D:3,P:0.5},
    {D:3.5,P:0.6},{D:4,P:0.7},{D:4.5,P:0.75},{D:5,P:0.8},{D:6,P:1},
    {D:7,P:1},{D:8,P:1.25},{D:9,P:1.25},{D:10,P:1.5},{D:11,P:1.5},
    {D:12,P:1.75},{D:14,P:2},{D:16,P:2},{D:18,P:2.5},{D:20,P:2.5},
    {D:22,P:2.5},{D:24,P:3},{D:27,P:3},{D:30,P:3.5},{D:33,P:3.5},
    {D:36,P:4},{D:39,P:4},{D:42,P:4.5},{D:45,P:4.5},{D:48,P:5},
    {D:52,P:5},{D:56,P:5.5},{D:60,P:5.5},{D:64,P:6},{D:68,P:6},
  ];

  // M jemné – ISO 261, úhel 60°
  var mFine = [
    {D:8,P:1},{D:8,P:0.75},{D:10,P:1.25},{D:10,P:1},{D:10,P:0.75},
    {D:12,P:1.5},{D:12,P:1.25},{D:12,P:1},{D:14,P:1.5},{D:14,P:1.25},
    {D:14,P:1},{D:16,P:1.5},{D:16,P:1},{D:18,P:2},{D:18,P:1.5},
    {D:18,P:1},{D:20,P:2},{D:20,P:1.5},{D:20,P:1},{D:22,P:2},
    {D:22,P:1.5},{D:22,P:1},{D:24,P:2},{D:24,P:1.5},{D:24,P:1},
    {D:27,P:2},{D:27,P:1.5},{D:27,P:1},{D:30,P:2},{D:30,P:1.5},
    {D:30,P:1},{D:33,P:2},{D:33,P:1.5},{D:36,P:3},{D:36,P:2},
    {D:36,P:1.5},{D:39,P:3},{D:39,P:2},{D:39,P:1.5},{D:42,P:3},
    {D:42,P:2},{D:42,P:1.5},{D:45,P:3},{D:45,P:2},{D:45,P:1.5},
    {D:48,P:3},{D:48,P:2},{D:48,P:1.5},{D:52,P:3},{D:52,P:2},
    {D:52,P:1.5},{D:56,P:3},{D:56,P:2},{D:56,P:1.5},{D:60,P:3},
    {D:60,P:2},{D:60,P:1.5},{D:64,P:3},{D:64,P:2},{D:64,P:1.5},
    {D:68,P:3},{D:68,P:2},{D:68,P:1.5},
  ];

  // G (BSP) trubkový válcový – ISO 228, úhel 55°, stoupání v TPI
  var gThreads = [
    {n:"G 1/8",    D:9.728,  tpi:28},
    {n:"G 1/4",    D:13.157, tpi:19},
    {n:"G 3/8",    D:16.662, tpi:19},
    {n:"G 1/2",    D:20.955, tpi:14},
    {n:"G 5/8",    D:22.911, tpi:14},
    {n:"G 3/4",    D:26.441, tpi:14},
    {n:"G 7/8",    D:30.201, tpi:14},
    {n:"G 1",      D:33.249, tpi:11},
    {n:"G 1 1/8",  D:37.897, tpi:11},
    {n:"G 1 1/4",  D:41.910, tpi:11},
    {n:"G 1 3/8",  D:44.323, tpi:11},
    {n:"G 1 1/2",  D:47.803, tpi:11},
    {n:"G 1 3/4",  D:53.746, tpi:11},
    {n:"G 2",      D:59.614, tpi:11},
    {n:"G 2 1/4",  D:65.710, tpi:11},
    {n:"G 2 1/2",  D:75.184, tpi:11},
    {n:"G 2 3/4",  D:81.534, tpi:11},
    {n:"G 3",      D:87.884, tpi:11},
    {n:"G 3 1/2",  D:100.330,tpi:11},
    {n:"G 4",      D:113.030,tpi:11},
  ];

  // Tr trapézový – ISO 2904, úhel 30°
  var trThreads = [
    {D:8,P:1.5},{D:9,P:1.5},{D:9,P:2},{D:10,P:2},{D:10,P:3},
    {D:11,P:2},{D:11,P:3},{D:12,P:2},{D:12,P:3},{D:14,P:2},
    {D:14,P:3},{D:16,P:2},{D:16,P:4},{D:18,P:2},{D:18,P:4},
    {D:20,P:2},{D:20,P:4},{D:22,P:3},{D:22,P:5},{D:24,P:3},
    {D:24,P:5},{D:26,P:3},{D:26,P:5},{D:28,P:3},{D:28,P:5},
    {D:30,P:3},{D:30,P:6},{D:32,P:3},{D:32,P:6},{D:34,P:3},
    {D:34,P:6},{D:36,P:3},{D:36,P:6},{D:38,P:3},{D:38,P:7},
    {D:40,P:3},{D:40,P:7},{D:42,P:3},{D:42,P:7},{D:44,P:3},
    {D:44,P:7},{D:46,P:3},{D:46,P:8},{D:48,P:3},{D:48,P:8},
    {D:50,P:3},{D:50,P:8},{D:52,P:3},{D:52,P:8},{D:55,P:3},
    {D:55,P:9},{D:60,P:3},{D:60,P:9},{D:65,P:4},{D:65,P:10},
    {D:70,P:4},{D:70,P:10},{D:75,P:4},{D:75,P:10},{D:80,P:4},
    {D:80,P:10},{D:85,P:4},{D:85,P:12},{D:90,P:4},{D:90,P:12},
    {D:95,P:4},{D:95,P:12},{D:100,P:4},{D:100,P:12},
  ];

  // UNC – Unified National Coarse (ASME B1.1), úhel 60°
  var uncThreads = [
    {n:'#1',   D:1.854, tpi:64},  {n:'#2',   D:2.184, tpi:56},
    {n:'#3',   D:2.515, tpi:48},  {n:'#4',   D:2.845, tpi:40},
    {n:'#5',   D:3.175, tpi:40},  {n:'#6',   D:3.505, tpi:32},
    {n:'#8',   D:4.166, tpi:32},  {n:'#10',  D:4.826, tpi:24},
    {n:'#12',  D:5.486, tpi:24},
    {n:'1/4"',  D:6.350, tpi:20},  {n:'5/16"', D:7.938, tpi:18},
    {n:'3/8"',  D:9.525, tpi:16},  {n:'7/16"', D:11.112,tpi:14},
    {n:'1/2"',  D:12.700,tpi:13},  {n:'9/16"', D:14.288,tpi:12},
    {n:'5/8"',  D:15.875,tpi:11},  {n:'3/4"',  D:19.050,tpi:10},
    {n:'7/8"',  D:22.225,tpi:9},   {n:'1"',    D:25.400,tpi:8},
    {n:'1-1/8"',D:28.575,tpi:7},   {n:'1-1/4"',D:31.750,tpi:7},
    {n:'1-3/8"',D:34.925,tpi:6},   {n:'1-1/2"',D:38.100,tpi:6},
    {n:'1-3/4"',D:44.450,tpi:5},   {n:'2"',    D:50.800,tpi:4.5},
    {n:'2-1/4"',D:57.150,tpi:4.5}, {n:'2-1/2"',D:63.500,tpi:4},
    {n:'2-3/4"',D:69.850,tpi:4},   {n:'3"',    D:76.200,tpi:4},
    {n:'3-1/4"',D:82.550,tpi:4},   {n:'3-1/2"',D:88.900,tpi:4},
    {n:'3-3/4"',D:95.250,tpi:4},   {n:'4"',    D:101.600,tpi:4},
  ];

  // UNF – Unified National Fine (ASME B1.1), úhel 60°
  var unfThreads = [
    {n:'#0',   D:1.524, tpi:80},  {n:'#1',   D:1.854, tpi:72},
    {n:'#2',   D:2.184, tpi:64},  {n:'#3',   D:2.515, tpi:56},
    {n:'#4',   D:2.845, tpi:48},  {n:'#5',   D:3.175, tpi:44},
    {n:'#6',   D:3.505, tpi:40},  {n:'#8',   D:4.166, tpi:36},
    {n:'#10',  D:4.826, tpi:32},  {n:'#12',  D:5.486, tpi:28},
    {n:'1/4"',  D:6.350, tpi:28},  {n:'5/16"', D:7.938, tpi:24},
    {n:'3/8"',  D:9.525, tpi:24},  {n:'7/16"', D:11.112,tpi:20},
    {n:'1/2"',  D:12.700,tpi:20},  {n:'9/16"', D:14.288,tpi:18},
    {n:'5/8"',  D:15.875,tpi:18},  {n:'3/4"',  D:19.050,tpi:16},
    {n:'7/8"',  D:22.225,tpi:14},  {n:'1"',    D:25.400,tpi:12},
    {n:'1-1/8"',D:28.575,tpi:12},  {n:'1-1/4"',D:31.750,tpi:12},
    {n:'1-3/8"',D:34.925,tpi:12},  {n:'1-1/2"',D:38.100,tpi:12},
  ];

  // BSW – British Standard Whitworth (BS 84), úhel 55°
  var bswThreads = [
    {n:'1/8"',  D:3.175, tpi:40},   {n:'3/16"', D:4.762, tpi:24},
    {n:'1/4"',  D:6.350, tpi:20},   {n:'5/16"', D:7.938, tpi:18},
    {n:'3/8"',  D:9.525, tpi:16},   {n:'7/16"', D:11.112,tpi:14},
    {n:'1/2"',  D:12.700,tpi:12},   {n:'9/16"', D:14.288,tpi:12},
    {n:'5/8"',  D:15.875,tpi:11},   {n:'3/4"',  D:19.050,tpi:10},
    {n:'7/8"',  D:22.225,tpi:9},    {n:'1"',    D:25.400,tpi:8},
    {n:'1-1/8"',D:28.575,tpi:7},    {n:'1-1/4"',D:31.750,tpi:7},
    {n:'1-3/8"',D:34.925,tpi:6},    {n:'1-1/2"',D:38.100,tpi:6},
    {n:'1-5/8"',D:41.275,tpi:5},    {n:'1-3/4"',D:44.450,tpi:5},
    {n:'2"',    D:50.800,tpi:4.5},   {n:'2-1/4"',D:57.150,tpi:4},
    {n:'2-1/2"',D:63.500,tpi:4},     {n:'2-3/4"',D:69.850,tpi:3.5},
    {n:'3"',    D:76.200,tpi:3.5},
  ];

  // NPT – National Pipe Taper (ASME B1.20.1), úhel 60°, kuželovitost 1:16 (1°47'24")
  var nptThreads = [
    {n:'1/16"',  D:7.938,  tpi:27},
    {n:'1/8"',   D:10.287, tpi:27},
    {n:'1/4"',   D:13.716, tpi:18},
    {n:'3/8"',   D:17.145, tpi:18},
    {n:'1/2"',   D:21.336, tpi:14},
    {n:'3/4"',   D:26.670, tpi:14},
    {n:'1"',     D:33.401, tpi:11.5},
    {n:'1-1/4"', D:42.164, tpi:11.5},
    {n:'1-1/2"', D:48.260, tpi:11.5},
    {n:'2"',     D:60.325, tpi:11.5},
    {n:'2-1/2"', D:73.025, tpi:8},
    {n:'3"',     D:88.900, tpi:8},
    {n:'3-1/2"', D:101.600,tpi:8},
    {n:'4"',     D:114.300,tpi:8},
  ];

  // Acme – pilový/lichoběžníkový (ASME B1.5), úhel 29°
  var acmeThreads = [
    {n:'1/4"',  D:6.350,  tpi:16},  {n:'5/16"', D:7.938, tpi:14},
    {n:'3/8"',  D:9.525,  tpi:12},  {n:'7/16"', D:11.112,tpi:12},
    {n:'1/2"',  D:12.700, tpi:10},  {n:'5/8"',  D:15.875,tpi:8},
    {n:'3/4"',  D:19.050, tpi:6},   {n:'7/8"',  D:22.225,tpi:6},
    {n:'1"',    D:25.400, tpi:5},    {n:'1-1/4"',D:31.750,tpi:5},
    {n:'1-1/2"',D:38.100, tpi:4},   {n:'1-3/4"',D:44.450,tpi:4},
    {n:'2"',    D:50.800, tpi:4},    {n:'2-1/2"',D:63.500,tpi:3},
    {n:'3"',    D:76.200, tpi:2},    {n:'3-1/2"',D:88.900,tpi:2},
    {n:'4"',    D:101.600,tpi:2},    {n:'5"',    D:127.000,tpi:2},
  ];

  // ── BUILD ROWS ────────────────────────────────────────────
  function buildMetricRows(arr, prefix) {
    var html = '';
    for (var i = 0; i < arr.length; i++) {
      var t = arr[i];
      var lbl = prefix + t.D + (prefix === 'M' && arr === mFine ? '\u00D7' + t.P : '');
      html += '<tr data-type="' + prefix + '" data-d="' + t.D + '" data-p="' + t.P + '">' +
        '<td>' + lbl + '</td><td>' + t.P + '</td><td>' + t.D + '</td></tr>';
    }
    return html;
  }

  function buildGRows() {
    var html = '';
    for (var i = 0; i < gThreads.length; i++) {
      var g = gThreads[i];
      var P = (25.4 / g.tpi);
      html += '<tr data-type="G" data-d="' + g.D + '" data-p="' + P.toFixed(4) + '" data-tpi="' + g.tpi + '" data-n="' + g.n + '">' +
        '<td>' + g.n + '</td><td>' + g.tpi + '</td><td>' + g.D.toFixed(3) + '</td></tr>';
    }
    return html;
  }

  function buildTrRows() {
    var html = '';
    for (var i = 0; i < trThreads.length; i++) {
      var t = trThreads[i];
      html += '<tr data-type="Tr" data-d="' + t.D + '" data-p="' + t.P + '">' +
        '<td>Tr' + t.D + '\u00D7' + t.P + '</td><td>' + t.P + '</td><td>' + t.D + '</td></tr>';
    }
    return html;
  }

  function buildImperialRows(arr, prefix) {
    var html = '';
    for (var i = 0; i < arr.length; i++) {
      var t = arr[i];
      var P = (25.4 / t.tpi);
      html += '<tr data-type="' + prefix + '" data-d="' + t.D + '" data-p="' + P.toFixed(4) + '" data-tpi="' + t.tpi + '" data-n="' + t.n + '">' +
        '<td>' + prefix + ' ' + t.n + '</td><td>' + t.tpi + '</td><td>' + t.D.toFixed(3) + '</td></tr>';
    }
    return html;
  }

  // ── THREAD PASSES (průchody soustružení závitu) ─────────
  function threadPassesHTML(totalDepth, label) {
    if (totalDepth <= 0) return '';
    var nPasses;
    if (totalDepth <= 0.5) nPasses = 3;
    else if (totalDepth <= 1.0) nPasses = 5;
    else if (totalDepth <= 1.5) nPasses = 7;
    else if (totalDepth <= 2.0) nPasses = 9;
    else if (totalDepth <= 3.0) nPasses = 11;
    else nPasses = Math.ceil(totalDepth / 0.25);

    var html = '<tr class="thr-sep"><td colspan="2"></td></tr>' +
      '<tr><td colspan="2" style="color:#89b4fa;font-weight:600">\uD83D\uDD27 Pr\u016Fchody ' + label + ' (' + nPasses + '\u00D7)</td></tr>';

    var cumDepth = 0;
    for (var i = 1; i <= nPasses; i++) {
      var target = totalDepth * Math.sqrt(i / nPasses);
      var cut = target - cumDepth;
      if (i === nPasses) { target = totalDepth; cut = totalDepth - cumDepth; }
      html += '<tr><td style="color:#6c7086">' + i + '.</td>' +
        '<td>ap=' + cut.toFixed(3) + '  \u2211=' + target.toFixed(3) + ' mm</td></tr>';
      cumDepth = target;
    }
    html += '<tr><td style="color:#6c7086">' + (nPasses + 1) + '.</td>' +
      '<td style="color:#a6e3a1">jisk\u0159iv\u00FD (ap=0, spring pass)</td></tr>';
    return html;
  }

  // ── DETAIL FUNCTIONS ──────────────────────────────────────
  function detailMetric(D, P, label) {
    var H    = 0.866025 * P;
    var d2   = D - 0.6495 * P;
    var d3   = D - 1.2269 * P;
    var D1   = D - 1.0825 * P;
    var hExt = 0.6134 * P;
    var hInt = 0.5413 * P;
    var drill = D - P;
    return '<div class="thr-detail-title">' + label + '</div>' +
      '<table class="thr-detail-tbl">' +
        '<tr><td>Stoup\u00E1n\u00ED P</td><td><strong>' + P + '</strong> mm</td></tr>' +
        '<tr><td>Vrcholov\u00FD \u00FAhel</td><td><strong>60\u00B0</strong></td></tr>' +
        '<tr><td>V\u00FD\u0161ka troj. H</td><td>' + H.toFixed(3) + ' mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 D</td><td><strong>' + D.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>St\u0159edn\u00ED \u00F8 d\u2082</td><td><strong>' + d2.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 \u0161roub d\u2083</td><td><strong>' + d3.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 matice D\u2081</td><td><strong>' + D1.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Hloubka vn\u011Bj\u0161\u00ED</td><td><strong>' + hExt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Hloubka vnit\u0159n\u00ED</td><td><strong>' + hInt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED (D\u2212P)</td><td><strong>' + drill.toFixed(2) + '</strong> mm</td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED (D\u2081)</td><td><strong>' + D1.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>P\u0159eds. \u00F8 (d\u2083)</td><td><strong>' + d3.toFixed(3) + '</strong> mm</td></tr>' +
        threadPassesHTML(hExt, 'vn\u011Bj\u0161\u00ED') +
        threadPassesHTML(hInt, 'vnit\u0159n\u00ED') +
      '</table>';
  }

  function detailG(D, P, tpi, name) {
    var H    = 0.960491 * P;
    var d2   = D - 0.6403 * P;
    var d1   = D - 1.2806 * P;
    var hExt = 0.6403 * P;
    var drill = d1;
    return '<div class="thr-detail-title">' + name + ' \u2013 ISO 228</div>' +
      '<table class="thr-detail-tbl">' +
        '<tr><td>Z\u00E1vit\u016F/palec (TPI)</td><td><strong>' + tpi + '</strong></td></tr>' +
        '<tr><td>Stoup\u00E1n\u00ED P</td><td><strong>' + P.toFixed(4) + '</strong> mm</td></tr>' +
        '<tr><td>Vrcholov\u00FD \u00FAhel</td><td><strong>55\u00B0</strong></td></tr>' +
        '<tr><td>V\u00FD\u0161ka troj. H</td><td>' + H.toFixed(3) + ' mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 D</td><td><strong>' + D.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>St\u0159edn\u00ED \u00F8 d\u2082</td><td><strong>' + d2.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 d\u2081</td><td><strong>' + d1.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Hloubka profilu</td><td><strong>' + hExt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED</td><td><strong>' + drill.toFixed(3) + '</strong> mm</td></tr>' +
        threadPassesHTML(hExt, 'profil') +
      '</table>';
  }

  function detailTr(D, P, label) {
    var H1   = 0.5 * P;
    var ac   = 0.25;
    var d2   = D - 0.5 * P;
    var d3   = D - P - 2 * ac;
    var D4   = D - 2 * ac;
    var D1   = D - P;
    var hExt = H1 + ac;
    var drill = D - P - 0.5;
    return '<div class="thr-detail-title">' + label + ' \u2013 ISO 2904</div>' +
      '<table class="thr-detail-tbl">' +
        '<tr><td>Stoup\u00E1n\u00ED P</td><td><strong>' + P + '</strong> mm</td></tr>' +
        '<tr><td>Vrcholov\u00FD \u00FAhel</td><td><strong>30\u00B0</strong></td></tr>' +
        '<tr><td>V\u00FD\u0161ka profilu H\u2081</td><td>' + H1.toFixed(3) + ' mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 D</td><td><strong>' + D.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>St\u0159edn\u00ED \u00F8 d\u2082</td><td><strong>' + d2.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 \u0161roub d\u2083</td><td><strong>' + d3.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 matice D\u2084</td><td><strong>' + D4.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Vnit\u0159n\u00ED \u00F8 matice D\u2081</td><td><strong>' + D1.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Hloubka profilu</td><td><strong>' + hExt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED (\u0161roub)</td><td><strong>' + d3.toFixed(2) + '</strong> mm</td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED (matice)</td><td><strong>' + D1.toFixed(2) + '</strong> mm</td></tr>' +
        threadPassesHTML(hExt, 'profil') +
      '</table>';
  }

  // UNC/UNF – 60° profil, stejné vzorce jako metrický
  function detailUN(D, P, tpi, name, std) {
    var H    = 0.866025 * P;
    var d2   = D - 0.6495 * P;
    var d3   = D - 1.2269 * P;
    var D1   = D - 1.0825 * P;
    var hExt = 0.6134 * P;
    var hInt = 0.5413 * P;
    var drill = D1;
    return '<div class="thr-detail-title">' + name + ' \u2013 ' + std + '</div>' +
      '<table class="thr-detail-tbl">' +
        '<tr><td>Z\u00E1vit\u016F/palec (TPI)</td><td><strong>' + tpi + '</strong></td></tr>' +
        '<tr><td>Stoup\u00E1n\u00ED P</td><td><strong>' + P.toFixed(4) + '</strong> mm</td></tr>' +
        '<tr><td>Vrcholov\u00FD \u00FAhel</td><td><strong>60\u00B0</strong></td></tr>' +
        '<tr><td>V\u00FD\u0161ka troj. H</td><td>' + H.toFixed(3) + ' mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 D</td><td><strong>' + D.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>St\u0159edn\u00ED \u00F8 d\u2082</td><td><strong>' + d2.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 \u0161roub d\u2083</td><td><strong>' + d3.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 matice D\u2081</td><td><strong>' + D1.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Hloubka vn\u011Bj\u0161\u00ED</td><td><strong>' + hExt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Hloubka vnit\u0159n\u00ED</td><td><strong>' + hInt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED</td><td><strong>' + drill.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>P\u0159eds. \u00F8</td><td><strong>' + d3.toFixed(3) + '</strong> mm</td></tr>' +
        threadPassesHTML(hExt, 'vn\u011Bj\u0161\u00ED') +
        threadPassesHTML(hInt, 'vnit\u0159n\u00ED') +
      '</table>';
  }

  // BSW – Whitworth 55° profil
  function detailBSW(D, P, tpi, name) {
    var H    = 0.960491 * P;
    var d2   = D - 0.6403 * P;
    var d1   = D - 1.2806 * P;
    var hExt = 0.6403 * P;
    var drill = d1;
    return '<div class="thr-detail-title">' + name + ' \u2013 BS 84 (Whitworth)</div>' +
      '<table class="thr-detail-tbl">' +
        '<tr><td>Z\u00E1vit\u016F/palec (TPI)</td><td><strong>' + tpi + '</strong></td></tr>' +
        '<tr><td>Stoup\u00E1n\u00ED P</td><td><strong>' + P.toFixed(4) + '</strong> mm</td></tr>' +
        '<tr><td>Vrcholov\u00FD \u00FAhel</td><td><strong>55\u00B0</strong></td></tr>' +
        '<tr><td>V\u00FD\u0161ka troj. H</td><td>' + H.toFixed(3) + ' mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 D</td><td><strong>' + D.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>St\u0159edn\u00ED \u00F8 d\u2082</td><td><strong>' + d2.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 d\u2081</td><td><strong>' + d1.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Hloubka profilu</td><td><strong>' + hExt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED</td><td><strong>' + drill.toFixed(3) + '</strong> mm</td></tr>' +
        threadPassesHTML(hExt, 'profil') +
      '</table>';
  }

  // NPT – 60° profil, kuželový 1:16
  function detailNPT(D, P, tpi, name) {
    var H    = 0.866025 * P;
    var d2   = D - 0.6495 * P;
    var d3   = D - 1.2269 * P;
    var hExt = 0.6134 * P;
    var taperAngle = '1\u00B047\u203224"';
    var taperRate = '1:16 (6,25 %)';
    return '<div class="thr-detail-title">' + name + ' \u2013 ASME B1.20.1</div>' +
      '<table class="thr-detail-tbl">' +
        '<tr><td>Z\u00E1vit\u016F/palec (TPI)</td><td><strong>' + tpi + '</strong></td></tr>' +
        '<tr><td>Stoup\u00E1n\u00ED P</td><td><strong>' + P.toFixed(4) + '</strong> mm</td></tr>' +
        '<tr><td>Vrcholov\u00FD \u00FAhel</td><td><strong>60\u00B0</strong></td></tr>' +
        '<tr><td>V\u00FD\u0161ka troj. H</td><td>' + H.toFixed(3) + ' mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>\u26A0 Ku\u017Eelovitost</td><td><strong>' + taperRate + '</strong></td></tr>' +
        '<tr><td>\u00DAhel ku\u017Eele</td><td><strong>' + taperAngle + '</strong></td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 D</td><td><strong>' + D.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>St\u0159edn\u00ED \u00F8 d\u2082</td><td><strong>' + d2.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 d\u2083</td><td><strong>' + d3.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Hloubka profilu</td><td><strong>' + hExt.toFixed(3) + '</strong> mm</td></tr>' +
        threadPassesHTML(hExt, 'profil') +
      '</table>';
  }

  // Acme – 29° profil
  function detailAcme(D, P, tpi, name) {
    var H1   = 0.5 * P;
    var ac   = 0.25;
    var d2   = D - 0.5 * P;
    var d3   = D - P - 2 * ac;
    var D1   = D - P;
    var hExt = H1 + ac;
    return '<div class="thr-detail-title">' + name + ' \u2013 ASME B1.5 (Acme)</div>' +
      '<table class="thr-detail-tbl">' +
        '<tr><td>Z\u00E1vit\u016F/palec (TPI)</td><td><strong>' + tpi + '</strong></td></tr>' +
        '<tr><td>Stoup\u00E1n\u00ED P</td><td><strong>' + P.toFixed(4) + '</strong> mm</td></tr>' +
        '<tr><td>Vrcholov\u00FD \u00FAhel</td><td><strong>29\u00B0</strong></td></tr>' +
        '<tr><td>V\u00FD\u0161ka profilu H\u2081</td><td>' + H1.toFixed(3) + ' mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Vn\u011Bj\u0161\u00ED \u00F8 D</td><td><strong>' + D.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>St\u0159edn\u00ED \u00F8 d\u2082</td><td><strong>' + d2.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Mal\u00FD \u00F8 d\u2083</td><td><strong>' + d3.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr><td>Vnit\u0159n\u00ED \u00F8 matice D\u2081</td><td><strong>' + D1.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>Hloubka profilu</td><td><strong>' + hExt.toFixed(3) + '</strong> mm</td></tr>' +
        '<tr class="thr-sep"><td colspan="2"></td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED (\u0161roub)</td><td><strong>' + d3.toFixed(2) + '</strong> mm</td></tr>' +
        '<tr><td>P\u0159edvrtan\u00ED (matice)</td><td><strong>' + D1.toFixed(2) + '</strong> mm</td></tr>' +
        threadPassesHTML(hExt, 'profil') +
      '</table>';
  }

  // ── HEADERS per type ──
  var headerM   = '<tr><th>Z\u00E1vit</th><th>P <small>mm</small></th><th>D <small>mm</small></th></tr>';
  var headerTPI = '<tr><th>Z\u00E1vit</th><th>TPI</th><th>D <small>mm</small></th></tr>';
  var headerTr  = '<tr><th>Z\u00E1vit</th><th>P <small>mm</small></th><th>D <small>mm</small></th></tr>';

  // ── THREAD HELP ──
  var helpHTML =
    '<div class="thr-help-section">' +
      '<div class="thr-help-title">\uD83D\uDCD6 P\u0159ehled typ\u016F z\u00E1vit\u016F</div>' +

      '<div class="thr-help-group">' +
        '<div class="thr-help-cat">\u2500\u2500 METRICK\u00C9 Z\u00C1VITY \u2500\u2500</div>' +
        '<div class="thr-help-item"><strong>M hrub\u00E9</strong> \u2013 ISO 261 / DIN 13<br>' +
          '\u00DAhel profilu 60\u00B0. Nejroz\u0161\u00ED\u0159en\u011Bj\u0161\u00ED z\u00E1vit v Evrop\u011B. ' +
          'Ozna\u010Den\u00ED: M12 (pr\u016Fm\u011Br \u00D7 hrub\u00E9 stoup\u00E1n\u00ED). ' +
          'Pou\u017Eit\u00ED: \u0161rouby, matice, v\u0161eobecn\u00E9 stroj\u00EDrenstv\u00ED.</div>' +
        '<div class="thr-help-item"><strong>M jemn\u00E9</strong> \u2013 ISO 261 / DIN 13<br>' +
          '\u00DAhel 60\u00B0, men\u0161\u00ED stoup\u00E1n\u00ED ne\u017E hrub\u00E9. ' +
          'Ozna\u010Den\u00ED: M12\u00D71.25. ' +
          'V\u00FDhody: v\u011Bt\u0161\u00ED p\u0159edp\u011Bt\u00ED, lep\u0161\u00ED t\u011Bsnost, men\u0161\u00ED tendence k samovoln\u00E9mu povolen\u00ED. ' +
          'Pou\u017Eit\u00ED: automobilov\u00FD pr\u016Fmysl, p\u0159esn\u00E9 stav\u011B\u010D\u00ED \u0161rouby, tenkost\u011Bnn\u00E9 d\u00EDly.</div>' +
        '<div class="thr-help-item"><strong>Tr trap\u00E9zov\u00FD</strong> \u2013 ISO 2904 / DIN 103<br>' +
          '\u00DAhel 30\u00B0, lichob\u011B\u017En\u00EDkov\u00FD profil. Ozna\u010Den\u00ED: Tr20\u00D74. ' +
          'Ur\u010Den pro p\u0159enos pohybu a s\u00EDly. ' +
          'Pou\u017Eit\u00ED: vod\u00EDc\u00ED \u0161rouby soustruh\u016F, lisy, sv\u011Br\u00E1ky, stav\u011B\u010D\u00ED mechanismy.</div>' +
      '</div>' +

      '<div class="thr-help-group">' +
        '<div class="thr-help-cat">\u2500\u2500 TRUBKOV\u00C9 Z\u00C1VITY \u2500\u2500</div>' +
        '<div class="thr-help-item"><strong>G (BSP) v\u00E1lcov\u00FD</strong> \u2013 ISO 228 / DIN 259<br>' +
          '\u00DAhel 55\u00B0 (Whitworthov profil). Vn\u011Bj\u0161\u00ED \u00F8 neodpov\u00EDd\u00E1 jmenovit\u00E9 velikosti\u00A0\u2013 ' +
          'nap\u0159. G 1/2 m\u00E1 D\u00A0=\u00A020,955\u00A0mm. ' +
          'Pou\u017Eit\u00ED: t\u011Bsn\u011Bn\u00E9 spoje s O-krou\u017Ekem, hydraulika, pneumatika. ' +
          'T\u011Bsn\u00ED: p\u0159\u00EDtla\u010Dn\u00FD povrch nebo O-krou\u017Eek (ne z\u00E1vitem).</div>' +
        '<div class="thr-help-item"><strong>NPT ku\u017Eelov\u00FD</strong> \u2013 ASME B1.20.1<br>' +
          '\u00DAhel 60\u00B0, ku\u017Eelovitost 1:16 (1\u00B047\u203224"). Am. standard. ' +
          'T\u011Bsn\u00ED se s\u00E1m z\u00E1vitem p\u0159i dota\u017Een\u00ED (+ teflon p\u00E1ska). ' +
          'Pou\u017Eit\u00ED: potrub\u00ED, plynov\u00E9 rozvody, hydraulika (USA). ' +
          '<em>Pozor: nepou\u017E\u00EDvat s G z\u00E1vitem \u2013 nejsou kompatibiln\u00ED!</em></div>' +
      '</div>' +

      '<div class="thr-help-group">' +
        '<div class="thr-help-cat">\u2500\u2500 PALCOV\u00C9 Z\u00C1VITY \u2500\u2500</div>' +
        '<div class="thr-help-item"><strong>UNC (Unified Coarse)</strong> \u2013 ASME B1.1<br>' +
          '\u00DAhel 60\u00B0, hrub\u00E9 stoup\u00E1n\u00ED. Americk\u00FD/kanadsk\u00FD standard. ' +
          'Ozna\u010Den\u00ED: 1/4"-20 UNC (pr\u016Fm\u011Br-TPI). ' +
          'Ekvivalent ISO metrick\u00E9ho hrub\u00E9ho z\u00E1vitu. ' +
          'Pou\u017Eit\u00ED: v\u0161eobecn\u00E9 strojn\u00ED spoje v USA.</div>' +
        '<div class="thr-help-item"><strong>UNF (Unified Fine)</strong> \u2013 ASME B1.1<br>' +
          '\u00DAhel 60\u00B0, jemn\u00E9 stoup\u00E1n\u00ED. ' +
          'Ozna\u010Den\u00ED: 1/4"-28 UNF. ' +
          'V\u011Bt\u0161\u00ED tahov\u00E1 pevnost ne\u017E UNC p\u0159i stejn\u00E9m \u00F8. ' +
          'Pou\u017Eit\u00ED: leteck\u00FD pr\u016Fmysl, automobilov\u00FD pr\u016Fmysl, p\u0159esn\u00E9 spoje.</div>' +
        '<div class="thr-help-item"><strong>BSW (Whitworth)</strong> \u2013 BS 84<br>' +
          '\u00DAhel 55\u00B0, zaoblen\u00FD vrch i \u00FAdol\u00ED profilu. Britsk\u00FD standard (hist.). ' +
          'Ozna\u010Den\u00ED: 1/2" BSW (pr\u016Fm\u011Br). ' +
          'Dnes nahrazen UNC/ISO, ale st\u00E1le se vyskytuje na star\u0161\u00EDch stroj\u00EDch. ' +
          'Pou\u017Eit\u00ED: \u00FAdr\u017Eba star\u00FDch stroj\u016F, GB stroje, n\u011Bkter\u00E9 australsk\u00E9 normy.</div>' +
      '</div>' +

      '<div class="thr-help-group">' +
        '<div class="thr-help-cat">\u2500\u2500 POHYBOV\u00C9 Z\u00C1VITY \u2500\u2500</div>' +
        '<div class="thr-help-item"><strong>Acme (pilov\u00FD)</strong> \u2013 ASME B1.5<br>' +
          '\u00DAhel 29\u00B0, lichob\u011B\u017En\u00EDkov\u00FD profil. Americk\u00FD ekvivalent Tr z\u00E1vitu. ' +
          'Ozna\u010Den\u00ED: 1"-5 Acme. ' +
          'Jednodu\u0161\u0161\u00ED v\u00FDroba ne\u017E \u010Dtvercov\u00FD z\u00E1vit, lep\u0161\u00ED \u00FA\u010Dinnost ne\u017E trojheln\u00EDkov\u00FD. ' +
          'Pou\u017Eit\u00ED: vod\u00EDc\u00ED \u0161rouby, sv\u011Br\u00E1ky, ventily, pohybov\u00E9 mechanismy.</div>' +
      '</div>' +

      '<div class="thr-help-group">' +
        '<div class="thr-help-cat">\u2500\u2500 PRAKTICK\u00C9 TIPY \u2500\u2500</div>' +
        '<div class="thr-help-item">' +
          '\u2022 <strong>Identifikace:</strong> Zm\u011B\u0159te stoup\u00E1n\u00ED (m\u011B\u0159\u00EDtkem nebo z\u00E1vitov\u00FDmi \u0161ablonami) a vn\u011Bj\u0161\u00ED \u00F8 \u2013 ' +
          'z toho ur\u010D\u00EDte typ a velikost.<br>' +
          '\u2022 <strong>60\u00B0 vs 55\u00B0:</strong> Metrick\u00E9 (M) a americk\u00E9 (UN) maj\u00ED 60\u00B0. ' +
          'Whitworth (BSW, G) m\u00E1 55\u00B0. Nen\u00ED zam\u011Bniteln\u00E9!<br>' +
          '\u2022 <strong>TPI \u2192 P:</strong> Stoup\u00E1n\u00ED v mm = 25,4 / TPI.<br>' +
          '\u2022 <strong>P\u0159edvrtan\u00ED:</strong> Pro vnit\u0159n\u00ED z\u00E1vit = D \u2212 P (p\u0159ibli\u017En\u011B).<br>' +
          '\u2022 <strong>Mazivo:</strong> P\u0159i \u0159ez\u00E1n\u00ED z\u00E1vit\u016F pou\u017Eijte \u0159ezn\u00FD olej, ' +
          'u hlin\u00EDku petroleum, u litiny nasu\u010Dno.<br>' +
          '\u2022 <strong>Jisk\u0159iv\u00FD pr\u016Fchod:</strong> V\u017Edy dokon\u010Dete 1\u20132 pr\u016Fchody s ap=0 ' +
          'pro vyhlaze\u0159n\u00ED povrchu z\u00E1vitu.' +
        '</div>' +
      '</div>' +
    '</div>';

  var body =
    '<div class="thr-category-row">' +
      '<div class="thr-cat-label">Metrick\u00E9</div>' +
      '<div class="tol-toggle-row thr-type-row">' +
        '<button class="tol-toggle tol-active" data-thr="mc">M hrub\u00E9</button>' +
        '<button class="tol-toggle" data-thr="mf">M jemn\u00E9</button>' +
        '<button class="tol-toggle" data-thr="tr">Tr trap.</button>' +
      '</div>' +
      '<div class="thr-cat-label">Trubkov\u00E9</div>' +
      '<div class="tol-toggle-row thr-type-row">' +
        '<button class="tol-toggle" data-thr="g">G (BSP)</button>' +
        '<button class="tol-toggle" data-thr="npt">NPT ku\u017E.</button>' +
      '</div>' +
      '<div class="thr-cat-label">Palcov\u00E9 / pohybov\u00E9</div>' +
      '<div class="tol-toggle-row thr-type-row">' +
        '<button class="tol-toggle" data-thr="unc">UNC</button>' +
        '<button class="tol-toggle" data-thr="unf">UNF</button>' +
        '<button class="tol-toggle" data-thr="bsw">BSW</button>' +
        '<button class="tol-toggle" data-thr="acme">Acme</button>' +
      '</div>' +
    '</div>' +
    '<input type="text" class="cnc-filter" placeholder="Filtr..." id="threadFilter">' +
    '<div class="cnc-table-wrap cnc-table-tall">' +
      '<table class="cnc-table" id="threadTable">' +
        '<thead id="thrHead">' + headerM + '</thead>' +
        '<tbody id="thrBody">' + buildMetricRows(mCoarse, 'M') + '</tbody>' +
      '</table>' +
    '</div>' +
    '<div class="thr-detail" id="thrDetail">' +
      '<div class="thr-detail-hint">Klikn\u011Bte na z\u00E1vit pro zobrazen\u00ED detailu\u2026</div>' +
    '</div>' +
    '<div class="cnc-table-label" style="margin-top:10px">Vlastn\u00ED z\u00E1vit</div>' +
    '<div class="cnc-fields">' +
      '<label class="cnc-field"><span>D <small>mm</small></span>' +
        '<input type="number" data-id="tD" step="any" placeholder="Vn\u011Bj\u0161\u00ED \u00F8"></label>' +
      '<label class="cnc-field"><span>P <small>mm</small></span>' +
        '<input type="number" data-id="tP" step="any" placeholder="Stoup\u00E1n\u00ED"></label>' +
    '</div>' +
    '<div class="cnc-actions">' +
      '<button class="cnc-btn cnc-btn-copy" id="thrCopy">\uD83D\uDCCB Kop\u00EDrovat</button>' +
      '<button class="cnc-btn cnc-btn-help" id="thrHelp">\u2753 N\u00E1pov\u011Bda</button>' +
    '</div>' +
    '<div class="thr-help-panel" id="thrHelpPanel" style="display:none">' + helpHTML + '</div>';

  var overlay = makeOverlay("thread", "\uD83D\uDD29 Z\u00E1vity", body);
  if (!overlay) return;

  var filter   = overlay.querySelector("#threadFilter");
  var thead    = overlay.querySelector("#thrHead");
  var tbody    = overlay.querySelector("#thrBody");
  var detail   = overlay.querySelector("#thrDetail");
  var inpD     = overlay.querySelector('[data-id="tD"]');
  var inpP     = overlay.querySelector('[data-id="tP"]');
  var typeBtns = overlay.querySelectorAll('[data-thr]');
  var helpPanel= overlay.querySelector("#thrHelpPanel");
  var lastActiveRow = null;
  var currentType = 'mc';

  // ── Toggle nápověda ──
  overlay.querySelector("#thrHelp").addEventListener("click", function() {
    var vis = helpPanel.style.display !== 'none';
    helpPanel.style.display = vis ? 'none' : 'block';
    this.textContent = vis ? '\u2753 N\u00E1pov\u011Bda' : '\u2716 Zav\u0159\u00EDt n\u00E1pov\u011Bdu';
  });

  // ── Switch thread type ──
  function switchType(type) {
    currentType = type;
    for (var i = 0; i < typeBtns.length; i++) {
      typeBtns[i].classList.toggle('tol-active', typeBtns[i].dataset.thr === type);
    }
    if (lastActiveRow) { lastActiveRow.classList.remove("thr-row-active"); lastActiveRow = null; }
    detail.innerHTML = '<div class="thr-detail-hint">Klikn\u011Bte na z\u00E1vit pro zobrazen\u00ED detailu\u2026</div>';
    filter.value = '';

    if (type === 'mc') {
      thead.innerHTML = headerM;
      tbody.innerHTML = buildMetricRows(mCoarse, 'M');
    } else if (type === 'mf') {
      thead.innerHTML = headerM;
      tbody.innerHTML = buildMetricRows(mFine, 'M');
    } else if (type === 'g') {
      thead.innerHTML = headerTPI;
      tbody.innerHTML = buildGRows();
    } else if (type === 'tr') {
      thead.innerHTML = headerTr;
      tbody.innerHTML = buildTrRows();
    } else if (type === 'unc') {
      thead.innerHTML = headerTPI;
      tbody.innerHTML = buildImperialRows(uncThreads, 'UNC');
    } else if (type === 'unf') {
      thead.innerHTML = headerTPI;
      tbody.innerHTML = buildImperialRows(unfThreads, 'UNF');
    } else if (type === 'bsw') {
      thead.innerHTML = headerTPI;
      tbody.innerHTML = buildImperialRows(bswThreads, 'BSW');
    } else if (type === 'npt') {
      thead.innerHTML = headerTPI;
      tbody.innerHTML = buildImperialRows(nptThreads, 'NPT');
    } else if (type === 'acme') {
      thead.innerHTML = headerTPI;
      tbody.innerHTML = buildImperialRows(acmeThreads, 'Acme');
    }
  }

  for (var bi = 0; bi < typeBtns.length; bi++) {
    typeBtns[bi].addEventListener("click", function() { switchType(this.dataset.thr); });
  }

  // ── Filtr ──
  filter.addEventListener("input", function() {
    var q = filter.value.toLowerCase();
    var trs = tbody.querySelectorAll("tr");
    for (var i = 0; i < trs.length; i++) {
      var tr = trs[i];
      var txt = '';
      for (var c = 0; c < tr.children.length; c++) txt += tr.children[c].textContent.toLowerCase() + ' ';
      tr.style.display = txt.indexOf(q) >= 0 ? "" : "none";
    }
  });

  // ── Klik na řádek → detail ──
  tbody.addEventListener("click", function(e) {
    var tr = e.target.closest("tr");
    if (!tr) return;
    if (lastActiveRow) lastActiveRow.classList.remove("thr-row-active");
    tr.classList.add("thr-row-active");
    lastActiveRow = tr;

    var D = parseFloat(tr.dataset.d);
    var P = parseFloat(tr.dataset.p);
    var type = tr.dataset.type;

    if (type === 'M') {
      var isFine = (currentType === 'mf');
      var lbl = 'M' + D + (isFine ? '\u00D7' + P + ' jemn\u00E9' : ' hrub\u00E9');
      detail.innerHTML = detailMetric(D, P, lbl);
    } else if (type === 'G') {
      var tpi = parseInt(tr.dataset.tpi);
      detail.innerHTML = detailG(D, P, tpi, tr.dataset.n);
    } else if (type === 'Tr') {
      detail.innerHTML = detailTr(D, P, 'Tr' + D + '\u00D7' + P);
    } else if (type === 'UNC') {
      detail.innerHTML = detailUN(D, P, parseInt(tr.dataset.tpi), tr.dataset.n, 'UNC \u2013 ASME B1.1');
    } else if (type === 'UNF') {
      detail.innerHTML = detailUN(D, P, parseInt(tr.dataset.tpi), tr.dataset.n, 'UNF \u2013 ASME B1.1');
    } else if (type === 'BSW') {
      detail.innerHTML = detailBSW(D, P, parseInt(tr.dataset.tpi), tr.dataset.n);
    } else if (type === 'NPT') {
      detail.innerHTML = detailNPT(D, P, parseInt(tr.dataset.tpi), tr.dataset.n);
    } else if (type === 'Acme') {
      detail.innerHTML = detailAcme(D, P, parseInt(tr.dataset.tpi), tr.dataset.n);
    }
  });

  // ── Vlastní závit ──
  function calcCustom() {
    var D = inpD.value !== "" ? parseFloat(inpD.value) : null;
    var P = inpP.value !== "" ? parseFloat(inpP.value) : null;
    if (D !== null && P !== null && P > 0 && D > 0) {
      if (lastActiveRow) { lastActiveRow.classList.remove("thr-row-active"); lastActiveRow = null; }
      if (currentType === 'tr') {
        detail.innerHTML = detailTr(D, P, 'Tr' + D + '\u00D7' + P + ' (vlastn\u00ED)');
      } else if (currentType === 'g') {
        var tpi = Math.round(25.4 / P);
        detail.innerHTML = detailG(D, P, tpi, 'G vlastn\u00ED');
      } else if (currentType === 'unc' || currentType === 'unf') {
        var tpi = Math.round(25.4 / P);
        detail.innerHTML = detailUN(D, P, tpi, 'Vlastn\u00ED ' + currentType.toUpperCase(), currentType.toUpperCase());
      } else if (currentType === 'bsw') {
        var tpi = Math.round(25.4 / P);
        detail.innerHTML = detailBSW(D, P, tpi, 'BSW vlastn\u00ED');
      } else if (currentType === 'npt') {
        var tpi = Math.round(25.4 / P);
        detail.innerHTML = detailNPT(D, P, tpi, 'NPT vlastn\u00ED');
      } else if (currentType === 'acme') {
        var tpi = Math.round(25.4 / P);
        detail.innerHTML = detailAcme(D, P, tpi, 'Acme vlastn\u00ED');
      } else {
        detail.innerHTML = detailMetric(D, P, 'M' + D + '\u00D7' + P + ' (vlastn\u00ED)');
      }
    }
  }
  inpD.addEventListener("input", calcCustom);
  inpP.addEventListener("input", calcCustom);

  // ── Kopírovat detail ──
  overlay.querySelector("#thrCopy").addEventListener("click", function() {
    var txt = detail.textContent;
    if (txt && txt.indexOf("Klikn\u011Bte") < 0) {
      navigator.clipboard.writeText(txt).then(function() { showToast("Zkop\u00EDrov\u00E1no"); });
    }
  });
}

// ══════════════════════════════════════════════════════════════
// ► Převodník
// ══════════════════════════════════════════════════════════════
export function openConvertCalc() {
  // HRC ↔ HB přibližná konverze (ASTM E140, zjednodušeno)
  // Tabulka HRC → HB (Brinell, kulička 10/3000)
  var hrcHbTable = [
    [20,226],[21,231],[22,237],[23,243],[24,247],[25,253],[26,258],[27,264],
    [28,271],[29,279],[30,286],[31,294],[32,301],[33,311],[34,319],[35,328],
    [36,336],[37,344],[38,353],[39,362],[40,371],[41,381],[42,390],[43,400],
    [44,409],[45,421],[46,432],[47,442],[48,453],[49,465],[50,477],[51,488],
    [52,500],[53,513],[54,525],[55,539],[56,553],[57,567],[58,582],[59,597],
    [60,613],[61,627],[62,640],[63,653],[64,667],[65,682],[66,697],[67,712],[68,728]
  ];

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
      '<div class="conv-label">Drsnost <small>(soustružení ~×6, broušení ~×4)</small></div>' +
      '<div class="conv-row">' +
        '<label class="conv-inp"><input type="number" data-conv="ra" step="any" placeholder="0"><small>Ra</small></label>' +
        '<span class="conv-arrow">\u2194</span>' +
        '<label class="conv-inp"><input type="number" data-conv="rz" step="any" placeholder="0"><small>Rz</small></label>' +
      '</div>' +
      '<div class="conv-row" style="margin-top:4px;gap:6px">' +
        '<button class="conv-ratio-btn tol-g-btn tol-g-active" data-ratio="4">×4 brus</button>' +
        '<button class="conv-ratio-btn tol-g-btn" data-ratio="6">×6 soustř.</button>' +
        '<button class="conv-ratio-btn tol-g-btn" data-ratio="5">×5 fréz.</button>' +
      '</div>' +
    '</div>' +
    '<div class="conv-section">' +
      '<div class="conv-label">Závity TPI \u2194 stoupání</div>' +
      '<div class="conv-row">' +
        '<label class="conv-inp"><input type="number" data-conv="tpi" step="any" placeholder="0"><small>TPI</small></label>' +
        '<span class="conv-arrow">\u2194</span>' +
        '<label class="conv-inp"><input type="number" data-conv="pitch" step="any" placeholder="0"><small>mm</small></label>' +
      '</div>' +
    '</div>' +
    '<div class="conv-section">' +
      '<div class="conv-label">Tvrdost <small>(přibližně ASTM E140)</small></div>' +
      '<div class="conv-row">' +
        '<label class="conv-inp"><input type="number" data-conv="hrc" step="any" placeholder="20-68"><small>HRC</small></label>' +
        '<span class="conv-arrow">\u2194</span>' +
        '<label class="conv-inp"><input type="number" data-conv="hb" step="any" placeholder="226-728"><small>HB</small></label>' +
      '</div>' +
      '<div class="conv-row">' +
        '<label class="conv-inp"><input type="number" data-conv="hv" step="any" placeholder="0"><small>HV</small></label>' +
      '</div>' +
    '</div>' +
    '<div class="conv-section">' +
      '<div class="conv-label">Moment / Síla</div>' +
      '<div class="conv-row">' +
        '<label class="conv-inp"><input type="number" data-conv="nm" step="any" placeholder="0"><small>Nm</small></label>' +
        '<span class="conv-arrow">\u2194</span>' +
        '<label class="conv-inp"><input type="number" data-conv="kgm" step="any" placeholder="0"><small>kgm</small></label>' +
      '</div>' +
    '</div>';

  const overlay = makeOverlay("convert", "\uD83D\uDD04 P\u0159evodn\u00EDk", body);
  if (!overlay) return;

  const gc = id => overlay.querySelector('[data-conv="' + id + '"]');

  // Ra/Rz ratio buttons
  var raRzRatio = 4;
  var ratioButtons = overlay.querySelectorAll('.conv-ratio-btn');
  ratioButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      ratioButtons.forEach(function(b) { b.classList.remove('tol-g-active'); });
      btn.classList.add('tol-g-active');
      raRzRatio = parseFloat(btn.dataset.ratio);
      // Re-trigger conversion
      var raInp = gc("ra");
      if (raInp.value !== "") {
        gc("rz").value = parseFloat((parseFloat(raInp.value) * raRzRatio).toFixed(6));
      }
    });
  });

  const pairs = [
    { a: gc("mm"), b: gc("inch"), aToB: v => v / 25.4, bToA: v => v * 25.4 },
    { a: gc("deg"), b: gc("rad"), aToB: v => v * Math.PI / 180, bToA: v => v * 180 / Math.PI },
    { a: gc("tpi"), b: gc("pitch"), aToB: v => 25.4 / v, bToA: v => 25.4 / v },
    { a: gc("nm"), b: gc("kgm"), aToB: v => v / 9.80665, bToA: v => v * 9.80665 },
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

  // Ra/Rz with dynamic ratio
  var raInp = gc("ra"), rzInp = gc("rz");
  raInp.addEventListener("input", () => {
    if (raInp.value === "") { rzInp.value = ""; return; }
    rzInp.value = parseFloat((parseFloat(raInp.value) * raRzRatio).toFixed(6));
  });
  rzInp.addEventListener("input", () => {
    if (rzInp.value === "") { raInp.value = ""; return; }
    raInp.value = parseFloat((parseFloat(rzInp.value) / raRzRatio).toFixed(6));
  });

  // Hardness: HRC ↔ HB (interpolated), HV ≈ HB × 1.05 (approximate)
  var hrcInp = gc("hrc"), hbInp = gc("hb"), hvInp = gc("hv");

  function hrcToHb(hrc) {
    if (hrc < 20) return hrcHbTable[0][1];
    if (hrc > 68) return hrcHbTable[hrcHbTable.length-1][1];
    for (var i = 0; i < hrcHbTable.length - 1; i++) {
      if (hrc >= hrcHbTable[i][0] && hrc <= hrcHbTable[i+1][0]) {
        var t = (hrc - hrcHbTable[i][0]) / (hrcHbTable[i+1][0] - hrcHbTable[i][0]);
        return hrcHbTable[i][1] + t * (hrcHbTable[i+1][1] - hrcHbTable[i][1]);
      }
    }
    return 0;
  }
  function hbToHrc(hb) {
    if (hb < 226) return 20;
    if (hb > 728) return 68;
    for (var i = 0; i < hrcHbTable.length - 1; i++) {
      if (hb >= hrcHbTable[i][1] && hb <= hrcHbTable[i+1][1]) {
        var t = (hb - hrcHbTable[i][1]) / (hrcHbTable[i+1][1] - hrcHbTable[i][1]);
        return hrcHbTable[i][0] + t * (hrcHbTable[i+1][0] - hrcHbTable[i][0]);
      }
    }
    return 0;
  }

  hrcInp.addEventListener("input", () => {
    if (hrcInp.value === "") { hbInp.value = ""; hvInp.value = ""; return; }
    var hrc = parseFloat(hrcInp.value);
    var hb = hrcToHb(hrc);
    hbInp.value = Math.round(hb);
    hvInp.value = Math.round(hb * 1.05);
  });
  hbInp.addEventListener("input", () => {
    if (hbInp.value === "") { hrcInp.value = ""; hvInp.value = ""; return; }
    var hb = parseFloat(hbInp.value);
    hrcInp.value = parseFloat(hbToHrc(hb).toFixed(1));
    hvInp.value = Math.round(hb * 1.05);
  });
  hvInp.addEventListener("input", () => {
    if (hvInp.value === "") { hrcInp.value = ""; hbInp.value = ""; return; }
    var hv = parseFloat(hvInp.value);
    var hb = hv / 1.05;
    hbInp.value = Math.round(hb);
    hrcInp.value = parseFloat(hbToHrc(hb).toFixed(1));
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
          '<option value="hex">\u0160estihran (SW)</option>' +
          '<option value="cone">Komol\u00FD ku\u017Eel</option>' +
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
      '<label class="cnc-field" id="wdField" style="display:none"><span>d <small>mm</small></span><input type="number" data-id="wd" step="any" placeholder="Vnit\u0159n\u00ED / mal\u00FD \u00D8"></label>' +
      '<label class="cnc-field" id="wWField" style="display:none"><span>\u0160 <small>mm</small></span><input type="number" data-id="wW" step="any" placeholder="\u0160\u00ED\u0159ka / SW"></label>' +
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
    // D field: visible for rod, tube, cone
    dField.style.display = (s === "flat" || s === "hex") ? "none" : "";
    // d field: visible for tube and cone (cone = small diameter)
    dFieldInner.style.display = (s === "tube" || s === "cone") ? "" : "none";
    // W field: visible for flat and hex (SW = klíč)
    wField.style.display = (s === "flat" || s === "hex") ? "" : "none";
    // H field: visible for flat only
    hField.style.display = (s === "flat") ? "" : "none";
    // Update labels
    if (s === "hex") {
      inpW.closest('label').querySelector('span').innerHTML = 'SW <small>mm</small>';
      inpW.placeholder = "Klíč (šestihran)";
    } else {
      inpW.closest('label').querySelector('span').innerHTML = 'Š <small>mm</small>';
      inpW.placeholder = "Šířka";
    }
    if (s === "cone") {
      inpd.closest('label').querySelector('span').innerHTML = 'd <small>mm</small>';
      inpd.placeholder = "Malý Ø";
    } else {
      inpd.closest('label').querySelector('span').innerHTML = 'd <small>mm</small>';
      inpd.placeholder = "Vnitřní Ø";
    }
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
    } else if (s === "hex") {
      // Šestihran: plocha = (3√3/2) × (SW/2)² × 2 = (3√3/2) × SW²/4... no:
      // Regular hexagon with flat-to-flat = SW: area = (√3/2) × SW²
      const SW = inpW.value !== "" ? parseFloat(inpW.value) : null;
      if (SW && L) {
        var area = (Math.sqrt(3) / 2) * SW * SW;
        vol = area * L;
      }
    } else if (s === "cone") {
      // Komolý kužel: V = π/12 × L × (D² + D×d + d²)
      const D = inpD.value !== "" ? parseFloat(inpD.value) : null;
      const d = inpd.value !== "" ? parseFloat(inpd.value) : null;
      if (D && d && L) vol = Math.PI / 12 * L * (D * D + D * d + d * d);
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
    '<div class="cnc-table-label" style="margin-top:12px">\uD83D\uDD27 Ulo\u017Een\u00ED (l\u00EDcov\u00E1n\u00ED d\u00EDra + h\u0159\u00EDdel)</div>' +
    '<div class="cnc-fields">' +
      '<label class="cnc-field"><span>D\u00EDra <small>nap\u0159. H7</small></span>' +
        '<input type="text" data-id="fitHole" placeholder="H7" value="H7" style="text-transform:uppercase"></label>' +
      '<label class="cnc-field"><span>H\u0159\u00EDdel <small>nap\u0159. g6</small></span>' +
        '<input type="text" data-id="fitShaft" placeholder="g6" value="g6" style="text-transform:lowercase"></label>' +
    '</div>' +
    '<div class="cnc-result" id="fitResult"></div>' +
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

  // ── Fit (uložení) calculation ──
  var fitHoleInp = overlay.querySelector('[data-id="fitHole"]');
  var fitShaftInp = overlay.querySelector('[data-id="fitShaft"]');
  var fitResult = overlay.querySelector("#fitResult");

  function parseFitSpec(spec, forHole) {
    // Parse e.g. "H7" -> {letter: "H", grade: 7} or "g6" -> {letter: "g", grade: 6}
    var match = spec.trim().match(/^([A-Za-z]{1,2})(\d{1,2})$/);
    if (!match) return null;
    var letter = match[1];
    var grade = parseInt(match[2]);
    if (grade < 1 || grade > 18) return null;
    // Validate letter exists
    var devTable = forHole ? holeDev : shaftDev;
    var key = forHole ? letter.toUpperCase() : letter.toLowerCase();
    if (!devTable[key]) return null;
    return { letter: key, grade: grade };
  }

  function calcDeviation(letter, grade, ri, forHole) {
    var devTable = forHole ? holeDev : shaftDev;
    var dev = devTable[letter];
    if (!dev) return null;
    var fundDev = dev[ri];
    var tol = itTable[ri][grade - 1];
    var upper, lower;
    if (forHole) {
      if (letter === "JS") { lower = -Math.round(tol/2); upper = Math.round(tol/2); }
      else if (letter <= "H") { lower = fundDev; upper = fundDev + tol; }
      else { upper = fundDev; lower = fundDev - tol; }
    } else {
      if (letter === "js") { upper = Math.round(tol/2); lower = -Math.round(tol/2); }
      else if (letter <= "h") { upper = fundDev; lower = fundDev - tol; }
      else { lower = fundDev; upper = fundDev + tol; }
    }
    return { upper: upper, lower: lower, tol: tol };
  }

  function calcFit() {
    var dim = inpDim.value !== "" ? parseFloat(inpDim.value) : null;
    if (dim === null || dim < 1 || dim > 500) {
      fitResult.innerHTML = dim !== null ? "Zadejte rozměr 1–500 mm" : "";
      return;
    }
    var ri = -1;
    for (var i = 0; i < dimRanges.length; i++) {
      if (dim > dimRanges[i][0] && dim <= dimRanges[i][1]) { ri = i; break; }
    }
    if (dim === 1) ri = 0;
    if (ri < 0) { fitResult.innerHTML = "Rozměr mimo rozsah"; return; }

    var holeSpec = parseFitSpec(fitHoleInp.value, true);
    var shaftSpec = parseFitSpec(fitShaftInp.value, false);
    if (!holeSpec || !shaftSpec) {
      fitResult.innerHTML = '<span style="color:#f38ba8">Zadejte platné uložení (např. H7/g6)</span>';
      return;
    }

    var hDev = calcDeviation(holeSpec.letter, holeSpec.grade, ri, true);
    var sDev = calcDeviation(shaftSpec.letter, shaftSpec.grade, ri, false);
    if (!hDev || !sDev) { fitResult.innerHTML = "Chyba výpočtu"; return; }

    var sign = function(v) { return v > 0 ? "+" + v : "" + v; };

    // Clearance = hole_size - shaft_size
    // Max clearance = hole_max - shaft_min = (dim + hDev.upper/1000) - (dim + sDev.lower/1000)
    var maxClearance = hDev.upper - sDev.lower; // µm
    var minClearance = hDev.lower - sDev.upper; // µm

    var fitType, fitColor;
    if (minClearance > 0) {
      fitType = "Uložení s VŮLÍ (volné)";
      fitColor = "#a6e3a1";
    } else if (maxClearance < 0) {
      fitType = "Uložení s PŘESAHEM";
      fitColor = "#f38ba8";
    } else {
      fitType = "PŘECHODNÉ uložení";
      fitColor = "#f9e2af";
    }

    var fitLabel = dim + " " + holeSpec.letter + holeSpec.grade + "/" + shaftSpec.letter + shaftSpec.grade;

    fitResult.innerHTML =
      '<strong style="color:' + fitColor + '">' + fitType + '</strong><br>' +
      '<strong>' + fitLabel + '</strong><br>' +
      '<span style="color:#89b4fa">Díra ' + holeSpec.letter + holeSpec.grade + ':</span> ' +
        sign(hDev.upper) + '/' + sign(hDev.lower) + ' µm → ' +
        (dim + hDev.upper/1000).toFixed(3) + '/' + (dim + hDev.lower/1000).toFixed(3) + ' mm<br>' +
      '<span style="color:#cba6f7">Hřídel ' + shaftSpec.letter + shaftSpec.grade + ':</span> ' +
        sign(sDev.upper) + '/' + sign(sDev.lower) + ' µm → ' +
        (dim + sDev.upper/1000).toFixed(3) + '/' + (dim + sDev.lower/1000).toFixed(3) + ' mm<br>' +
      (minClearance >= 0
        ? 'Vůle: <strong>' + (minClearance/1000).toFixed(3) + '</strong> – <strong>' + (maxClearance/1000).toFixed(3) + '</strong> mm'
        : (maxClearance <= 0
          ? 'Přesah: <strong>' + (Math.abs(maxClearance)/1000).toFixed(3) + '</strong> – <strong>' + (Math.abs(minClearance)/1000).toFixed(3) + '</strong> mm'
          : 'Vůle max: <strong>' + (maxClearance/1000).toFixed(3) + '</strong> mm │ Přesah max: <strong>' + (Math.abs(minClearance)/1000).toFixed(3) + '</strong> mm'));
  }

  fitHoleInp.addEventListener("input", calcFit);
  fitShaftInp.addEventListener("input", calcFit);
  inpDim.addEventListener("input", calcFit);
  // Initial calculation
  calcFit();

  overlay.querySelector(".cnc-btn-copy").addEventListener("click", function() {
    if (resultEl.textContent && resultEl.textContent !== "Zadejte rozm\u011Br\u2026") {
      navigator.clipboard.writeText(resultEl.textContent).then(function() { showToast("Zkop\u00EDrov\u00E1no"); });
    }
  });
}
// ══════════════════════════════════════════════════════════════
// ► Drsnost povrchu – Ra/Rz kalkulátor
// ══════════════════════════════════════════════════════════════
export function openRoughnessCalc() {
  // ── DATA ──────────────────────────────────────────────────
  // Korekční faktor materiálu obrobku k_mat
  var workMaterials = [
    {n:"Ocel 11 523 (S355)",      k:1.0},
    {n:"Ocel 12 050 (C45)",       k:1.0},
    {n:"Ocel 14 220 (16MnCr5)",   k:0.95},
    {n:"Ocel 15 142 (42CrMo4)",   k:0.9},
    {n:"Nerez 17 240 (X5CrNi)",   k:1.6},
    {n:"Nerez 17 346 (X2CrNiMo)", k:1.7},
    {n:"Litina 42 2420 (GG25)",   k:1.1},
    {n:"Hlin\u00EDk (AlCu4Mg)",   k:0.9},
    {n:"Hlin\u00EDk (slitiny Si)", k:1.4},
    {n:"Mosaz (CuZn39Pb3)",       k:0.85},
    {n:"M\u011B\u010F (Cu-ETP)",  k:1.3},
    {n:"Bronz (CuSn8)",           k:1.0},
    {n:"POM (ertacetal)",          k:0.9},
    {n:"PA6 (nylon)",              k:1.2},
  ];

  // Korekční faktor materiálu nástroje k_tool
  var toolMaterials = [
    {n:"SK (karbid)",   k:1.0},
    {n:"HSS",           k:1.3},
    {n:"Keramika",      k:0.85},
    {n:"CBN",           k:0.75},
    {n:"PCD (diamant)", k:0.7},
  ];

  // Třídy drsnosti ISO 1302
  var raClasses = [
    {cls:"N1", ra:0.025}, {cls:"N2", ra:0.05}, {cls:"N3", ra:0.1},
    {cls:"N4", ra:0.2},   {cls:"N5", ra:0.4},  {cls:"N6", ra:0.8},
    {cls:"N7", ra:1.6},   {cls:"N8", ra:3.2},  {cls:"N9", ra:6.3},
    {cls:"N10",ra:12.5},  {cls:"N11",ra:25},   {cls:"N12",ra:50},
  ];

  // Běžné radiusy špičky plátku [mm]
  var commonRadii = [0.2, 0.4, 0.8, 1.2, 1.6, 2.4];

  // k_vc (vliv řezné rychlosti)
  function getKvc(vc) {
    if (vc <= 0) return 1.0;
    if (vc < 30) return 1.6;
    if (vc < 80) return 1.2;
    if (vc < 150) return 1.0;
    if (vc < 300) return 0.95;
    return 0.9;
  }

  // Najdi třídu drsnosti pro danou Ra
  function getRaClass(ra) {
    for (var i = 0; i < raClasses.length; i++) {
      if (ra <= raClasses[i].ra) return raClasses[i].cls;
    }
    return ">N12";
  }

  // ── BUILD HTML ────────────────────────────────────────────
  var matOptions = '';
  for (var i = 0; i < workMaterials.length; i++) {
    matOptions += '<option value="' + i + '">' + workMaterials[i].n + '</option>';
  }
  var toolOptions = '';
  for (var i = 0; i < toolMaterials.length; i++) {
    toolOptions += '<option value="' + i + '">' + toolMaterials[i].n + '</option>';
  }

  // Radiusová tlačítka
  var radiusBtns = '';
  for (var i = 0; i < commonRadii.length; i++) {
    radiusBtns += '<button class="rough-r-btn tol-g-btn" data-r="' + commonRadii[i] + '">' + commonRadii[i] + '</button>';
  }

  // Třída drsnosti bar
  var classBar = '';
  for (var i = 0; i < raClasses.length; i++) {
    classBar += '<div class="rough-class-cell" data-idx="' + i + '">' +
      '<div class="rough-class-lbl">' + raClasses[i].cls + '</div>' +
      '<div class="rough-class-val">' + raClasses[i].ra + '</div>' +
    '</div>';
  }

  var body =
    // Materiál obrobku
    '<div class="cnc-table-label">Materi\u00E1l obrobku</div>' +
    '<select class="cnc-filter" data-id="rMat">' + matOptions + '</select>' +
    // Materiál nástroje
    '<div class="cnc-table-label">Materi\u00E1l n\u00E1stroje</div>' +
    '<select class="cnc-filter" data-id="rTool">' + toolOptions + '</select>' +
    // Vstupní pole
    '<div class="cnc-fields" style="margin-top:10px">' +
      '<label class="cnc-field"><span>f <small>mm/ot</small></span>' +
        '<input type="number" data-id="rF" step="any" placeholder="Posuv"></label>' +
      '<label class="cnc-field"><span>r\u03B5 <small>mm</small></span>' +
        '<input type="number" data-id="rRe" step="any" placeholder="Radius"></label>' +
      '<label class="cnc-field"><span>Vc <small>m/min</small></span>' +
        '<input type="number" data-id="rVc" step="any" placeholder="\u0158ezn\u00E1 rychl."></label>' +
    '</div>' +
    // Radiusy tlačítka
    '<div class="cnc-table-label">B\u011B\u017En\u00E9 radiusy r\u03B5 <small>mm</small></div>' +
    '<div class="rough-radius-row">' + radiusBtns + '</div>' +
    // Korekční faktory info
    '<div class="cnc-mat-hint" id="roughFactors"></div>' +
    // Přepínač Ra / Rz
    '<div class="rough-mode-row">' +
      '<button class="rough-mode-btn rough-mode-active" data-mode="Ra">Ra</button>' +
      '<button class="rough-mode-btn" data-mode="Rz">Rz</button>' +
    '</div>' +
    // Výsledek
    '<div class="rough-result" id="roughResult">' +
      '<div class="rough-result-hint">Zadejte posuv a radius\u2026</div>' +
    '</div>' +
    // Třída drsnosti
    '<div class="cnc-table-label">T\u0159\u00EDda drsnosti <small>ISO 1302 (Ra \u00B5m)</small></div>' +
    '<div class="rough-class-bar" id="roughClassBar">' + classBar + '</div>' +
    // Zpětný výpočet
    '<div class="rough-reverse">' +
      '<div class="cnc-table-label" style="margin-top:10px" id="roughRevLabel">\u2B05 Zp\u011Btn\u00FD v\u00FDpo\u010Det: max posuv pro danou Ra</div>' +
      '<div class="cnc-fields">' +
        '<label class="cnc-field" id="roughRevFieldLbl"><span>Ra c\u00EDl <small>\u00B5m</small></span>' +
          '<input type="number" data-id="rRaTarget" step="any" placeholder="Po\u017Eadovan\u00E1 Ra"></label>' +
        '<label class="cnc-field"><span>f max <small>mm/ot</small></span>' +
          '<input type="number" data-id="rFmax" readonly tabindex="-1" class="computed"></label>' +
      '</div>' +
    '</div>' +
    // Tlačítka
    '<div class="cnc-actions">' +
      '<button class="cnc-btn cnc-btn-clear">\uD83D\uDDD1 Vy\u010Distit</button>' +
      '<button class="cnc-btn cnc-btn-copy">\uD83D\uDCCB Kop\u00EDrovat</button>' +
    '</div>';

  var overlay = makeOverlay("roughness", "\uD83D\uDD2C Drsnost povrchu", body);
  if (!overlay) return;

  var inpF       = overlay.querySelector('[data-id="rF"]');
  var inpRe      = overlay.querySelector('[data-id="rRe"]');
  var inpVc      = overlay.querySelector('[data-id="rVc"]');
  var selMat     = overlay.querySelector('[data-id="rMat"]');
  var selTool    = overlay.querySelector('[data-id="rTool"]');
  var resultEl   = overlay.querySelector('#roughResult');
  var factorsEl  = overlay.querySelector('#roughFactors');
  var classBarEl = overlay.querySelector('#roughClassBar');
  var inpRaTarget= overlay.querySelector('[data-id="rRaTarget"]');
  var inpFmax    = overlay.querySelector('[data-id="rFmax"]');
  var revLabel   = overlay.querySelector('#roughRevLabel');
  var revFieldLbl= overlay.querySelector('#roughRevFieldLbl');
  var roughMode  = 'Ra'; // aktuální režim: 'Ra' nebo 'Rz'

  // ── Přepínač Ra / Rz ──
  var modeBtns = overlay.querySelectorAll('.rough-mode-btn');
  for (var mi = 0; mi < modeBtns.length; mi++) {
    modeBtns[mi].addEventListener('click', function() {
      roughMode = this.dataset.mode;
      for (var mj = 0; mj < modeBtns.length; mj++) modeBtns[mj].classList.remove('rough-mode-active');
      this.classList.add('rough-mode-active');
      // Aktualizace labelu zpětného výpočtu
      if (roughMode === 'Rz') {
        revLabel.textContent = '\u2B05 Zpětný výpočet: max posuv pro danou Rz';
        revFieldLbl.querySelector('span').innerHTML = 'Rz cíl <small>µm</small>';
        inpRaTarget.placeholder = 'Požadovaná Rz';
      } else {
        revLabel.textContent = '\u2B05 Zpětný výpočet: max posuv pro danou Ra';
        revFieldLbl.querySelector('span').innerHTML = 'Ra cíl <small>µm</small>';
        inpRaTarget.placeholder = 'Požadovaná Ra';
      }
      calc();
    });
  }

  // ── Radius tlačítka ──
  var rBtns = overlay.querySelectorAll('.rough-r-btn');
  for (var bi = 0; bi < rBtns.length; bi++) {
    rBtns[bi].addEventListener('click', function() {
      inpRe.value = this.dataset.r;
      // Zvýraznění aktivního
      for (var j = 0; j < rBtns.length; j++) rBtns[j].classList.remove('tol-g-active');
      this.classList.add('tol-g-active');
      calc();
    });
  }

  // ── Hlavní výpočet ──
  function calc() {
    var f  = inpF.value !== '' ? parseFloat(inpF.value) : null;
    var re = inpRe.value !== '' ? parseFloat(inpRe.value) : null;
    var vc = inpVc.value !== '' ? parseFloat(inpVc.value) : null;
    var kMat  = workMaterials[parseInt(selMat.value)].k;
    var kTool = toolMaterials[parseInt(selTool.value)].k;
    var kVc   = vc !== null && vc > 0 ? getKvc(vc) : 1.0;

    // Zobrazit korekční faktory
    factorsEl.innerHTML =
      '<span>k<sub>mat</sub> = ' + kMat.toFixed(2) + '</span>' +
      '<span>k<sub>tool</sub> = ' + kTool.toFixed(2) + '</span>' +
      '<span>k<sub>Vc</sub> = ' + kVc.toFixed(2) + '</span>' +
      '<span>\u03A3k = ' + (kMat * kTool * kVc).toFixed(2) + '</span>';

    // Zvýraznění třídy resetovat
    var cells = classBarEl.querySelectorAll('.rough-class-cell');
    for (var i = 0; i < cells.length; i++) cells[i].classList.remove('rough-class-active');

    if (f === null || re === null || f <= 0 || re <= 0) {
      resultEl.innerHTML = '<div class="rough-result-hint">Zadejte posuv a radius\u2026</div>';
      return;
    }

    // Teoretická drsnost
    var rz_theo = (f * f) / (8 * re) * 1000; // µm
    var ra_theo = rz_theo / 4;

    // Praktická drsnost
    var kTotal = kMat * kTool * kVc;
    var ra_pract = ra_theo * kTotal;
    var rz_pract = rz_theo * kTotal;

    // Třída drsnosti
    var clsTheo  = getRaClass(ra_theo);
    var clsPract = getRaClass(ra_pract);

    var isRz = roughMode === 'Rz';
    resultEl.innerHTML =
      '<table class="rough-result-tbl">' +
        '<tr><td></td><td class="rough-col-h">Ra <small>\u00B5m</small></td>' +
          '<td class="rough-col-h">Rz <small>\u00B5m</small></td>' +
          '<td class="rough-col-h">T\u0159\u00EDda</td></tr>' +
        '<tr class="rough-row-theo"><td>Teoretick\u00E1</td>' +
          '<td>' + (isRz ? '' : '<strong>') + ra_theo.toFixed(3) + (isRz ? '' : '</strong>') + '</td>' +
          '<td>' + (isRz ? '<strong>' : '') + rz_theo.toFixed(3) + (isRz ? '</strong>' : '') + '</td>' +
          '<td>' + clsTheo + '</td></tr>' +
        '<tr class="rough-row-pract"><td>Praktick\u00E1</td>' +
          '<td>' + (isRz ? '' : '<strong>') + ra_pract.toFixed(3) + (isRz ? '' : '</strong>') + '</td>' +
          '<td>' + (isRz ? '<strong>' : '') + rz_pract.toFixed(3) + (isRz ? '</strong>' : '') + '</td>' +
          '<td>' + clsPract + '</td></tr>' +
      '</table>' +
      '<div class="rough-formula">' + (isRz
        ? 'Rz<sub>theo</sub> = f\u00B2 / (8\u00B7r\u03B5) \u00D7 1000 = ' +
          f.toFixed(3) + '\u00B2 / (8\u00B7' + re.toFixed(2) + ') \u00D7 1000 = <strong>' + rz_theo.toFixed(3) + '</strong> \u00B5m'
        : 'Ra<sub>theo</sub> = f\u00B2 / (32\u00B7r\u03B5) \u00D7 1000 = ' +
          f.toFixed(3) + '\u00B2 / (32\u00B7' + re.toFixed(2) + ') \u00D7 1000 = <strong>' + ra_theo.toFixed(3) + '</strong> \u00B5m'
      ) + '</div>';

    // Zvýraznit praktickou třídu v baru
    for (var i = 0; i < raClasses.length; i++) {
      if (raClasses[i].cls === clsPract) {
        cells[i].classList.add('rough-class-active');
        break;
      }
    }

    // Zpětný výpočet aktualizace pokud je cílová Ra zadaná
    calcReverse();
  }

  // ── Zpětný výpočet ──
  function calcReverse() {
    var raTarget = inpRaTarget.value !== '' ? parseFloat(inpRaTarget.value) : null;
    var re       = inpRe.value !== '' ? parseFloat(inpRe.value) : null;
    if (raTarget === null || re === null || raTarget <= 0 || re <= 0) {
      inpFmax.value = '';
      return;
    }
    var kMat  = workMaterials[parseInt(selMat.value)].k;
    var kTool = toolMaterials[parseInt(selTool.value)].k;
    var vc    = inpVc.value !== '' ? parseFloat(inpVc.value) : null;
    var kVc   = vc !== null && vc > 0 ? getKvc(vc) : 1.0;
    var kTotal = kMat * kTool * kVc;

    // Ra: f = √(Ra * 32 * rε / (1000 * k))   Rz: f = √(Rz * 8 * rε / (1000 * k))
    var divisor = roughMode === 'Rz' ? 8 : 32;
    var fMax = Math.sqrt(raTarget * divisor * re / (1000 * kTotal));
    inpFmax.value = fMax.toFixed(4);
  }

  // ── Event listenery ──
  inpF.addEventListener('input', calc);
  inpRe.addEventListener('input', function() {
    // Reset radio tlačítek
    for (var j = 0; j < rBtns.length; j++) {
      rBtns[j].classList.toggle('tol-g-active', rBtns[j].dataset.r === inpRe.value);
    }
    calc();
  });
  inpVc.addEventListener('input', calc);
  selMat.addEventListener('change', calc);
  selTool.addEventListener('change', calc);
  inpRaTarget.addEventListener('input', calcReverse);

  // ── Vyčistit ──
  overlay.querySelector('.cnc-btn-clear').addEventListener('click', function() {
    inpF.value = ''; inpRe.value = ''; inpVc.value = ''; inpRaTarget.value = ''; inpFmax.value = '';
    selMat.selectedIndex = 0; selTool.selectedIndex = 0;
    roughMode = 'Ra';
    for (var mi = 0; mi < modeBtns.length; mi++) modeBtns[mi].classList.toggle('rough-mode-active', modeBtns[mi].dataset.mode === 'Ra');
    revLabel.textContent = '\u2B05 Zpětný výpočet: max posuv pro danou Ra';
    revFieldLbl.querySelector('span').innerHTML = 'Ra cíl <small>µm</small>';
    inpRaTarget.placeholder = 'Požadovaná Ra';
    for (var j = 0; j < rBtns.length; j++) rBtns[j].classList.remove('tol-g-active');
    resultEl.innerHTML = '<div class="rough-result-hint">Zadejte posuv a radius\u2026</div>';
    factorsEl.innerHTML = '';
    var cells = classBarEl.querySelectorAll('.rough-class-cell');
    for (var i = 0; i < cells.length; i++) cells[i].classList.remove('rough-class-active');
  });

  // ── Kopírovat ──
  overlay.querySelector('.cnc-btn-copy').addEventListener('click', function() {
    var txt = resultEl.textContent;
    if (txt && txt.indexOf('Zadejte') < 0) {
      var parts = ['Drsnost povrchu'];
      if (inpF.value) parts.push('f=' + inpF.value + ' mm/ot');
      if (inpRe.value) parts.push('r\u03B5=' + inpRe.value + ' mm');
      if (inpVc.value) parts.push('Vc=' + inpVc.value + ' m/min');
      parts.push(workMaterials[parseInt(selMat.value)].n);
      parts.push(toolMaterials[parseInt(selTool.value)].n);
      parts.push(txt);
      navigator.clipboard.writeText(parts.join(' | ')).then(function() { showToast("Zkop\u00EDrov\u00E1no"); });
    }
  });

  // Počáteční výpočet faktorů
  calc();
}

// ══════════════════════════════════════════════════════════════
// ► VBD & Držáky – dekodér ISO značení obráběcích plátků
// ══════════════════════════════════════════════════════════════

const vbdIsoData = {
  1: { title:'Tvar',options:[
    {v:'C',d:'Kosočtverec 80°',dt:'Dokončovací soustružení',svg:'<polygon points="35,5 53,35 35,65 17,35" fill="#3498db" stroke="#89b4fa" stroke-width="1.5"/>'},
    {v:'D',d:'Kosočtverec 55°',dt:'Kopírovací soustružení',svg:'<polygon points="35,8 55,35 35,62 15,35" fill="#e74c3c" stroke="#89b4fa" stroke-width="1.5"/>'},
    {v:'R',d:'Kruhový',dt:'Kopírovací operace, různorodé kontury',svg:'<circle cx="35" cy="35" r="22" fill="#9b59b6" stroke="#89b4fa" stroke-width="1.5"/>'},
    {v:'S',d:'Čtvercový',dt:'Univerzální soustružení, srážení hran',svg:'<rect x="13" y="13" width="44" height="44" fill="#2ecc71" stroke="#89b4fa" stroke-width="1.5"/>'},
    {v:'T',d:'Trojúhelníkový',dt:'Dokončovací soustružení, malé úběry',svg:'<polygon points="35,10 55,52 15,52" fill="#f1c40f" stroke="#89b4fa" stroke-width="1.5"/>'},
    {v:'V',d:'Kosočtverec 35°',dt:'Přesné kopírovací soustružení',svg:'<polygon points="35,15 52,35 35,55 18,35" fill="#1abc9c" stroke="#89b4fa" stroke-width="1.5"/>'},
    {v:'W',d:'Šestiúhelníkový',dt:'Speciální aplikace',svg:'<polygon points="35,12 52,22 52,46 35,56 18,46 18,22" fill="#e67e22" stroke="#89b4fa" stroke-width="1.5"/>'}
  ]},
  2: { title:'Úhel hřbetu',options:[
    {v:'N',d:'0° – Negativní',dt:'Vysoké řezné rychlosti, přerušované řezy'},
    {v:'B',d:'5° – Pozitivní',dt:'Kompromis negativní/pozitivní'},
    {v:'P',d:'11° – Pozitivní',dt:'Menší řezné síly, lepší odvod třísek'},
    {v:'C',d:'7° – Speciální',dt:'Speciální aplikace'},
    {v:'E',d:'20° – Speciální',dt:'Velmi přesné obrábění'},
    {v:'M',d:'15° – Speciální',dt:'Středně náročné obrábění'},
    {v:'A',d:'25° – Speciální',dt:'Dokončovací, minimální řezné síly'}
  ]},
  3: { title:'Tolerance',options:[
    {v:'A',d:'±0.05/±0.13 mm',dt:'Velmi přesné destičky'},
    {v:'C',d:'±0.08/±0.25 mm',dt:'Střední přesnost'},
    {v:'G',d:'±0.13/±0.25 mm',dt:'Běžné tolerance'},
    {v:'U',d:'±0.13/±0.18 mm',dt:'Speciální tolerance'}
  ]},
  4: { title:'Typ',options:[
    {v:'M',d:'S dírou + závit',dt:'Upínání šroubem'},
    {v:'G',d:'S dírou + utvařeč třísky (horní)',dt:'Lepší kontrola třísky'},
    {v:'N',d:'S dírou, bez utvařeče',dt:'Speciální aplikace'},
    {v:'T',d:'S dírou + utvařeč (obě strany)',dt:'Oboustranně použitelná'}
  ]},
  5: { title:'Velikost (IC)',options:[
    {v:'06',d:'6 mm',dt:'Malá – přesné obrábění'},
    {v:'08',d:'8 mm',dt:'Malá – přesné obrábění'},
    {v:'10',d:'10 mm',dt:'Středně velká'},
    {v:'12',d:'12 mm',dt:'Standardní'},
    {v:'16',d:'16 mm',dt:'Velká – hrubování'},
    {v:'20',d:'20 mm',dt:'Velká – hrubování'},
    {v:'25',d:'25 mm',dt:'Velmi velká – těžké hrubování'}
  ]},
  6: { title:'Tloušťka',options:[
    {v:'02',d:'2 mm',dt:'Velmi tenká'},
    {v:'03',d:'3 mm',dt:'Tenká'},
    {v:'04',d:'4 mm',dt:'Standardní'},
    {v:'05',d:'5 mm',dt:'Silnější'},
    {v:'06',d:'6 mm',dt:'Tlustá – náročné podmínky'}
  ]},
  7: { title:'Rádius špičky',options:[
    {v:'00',d:'0.0 mm',dt:'Ostrá špička'},
    {v:'04',d:'0.4 mm',dt:'Malý – jemné obrábění'},
    {v:'08',d:'0.8 mm',dt:'Standardní'},
    {v:'12',d:'1.2 mm',dt:'Větší – lepší povrch'},
    {v:'16',d:'1.6 mm',dt:'Velký – vysoká kvalita povrchu'},
    {v:'24',d:'2.4 mm',dt:'Extra velký'}
  ]},
  8: { title:'Úprava břitu',options:[
    {v:'F',d:'Jemné obrábění',dt:'Dokončovací operace'},
    {v:'M',d:'Střední obrábění',dt:'Běžné obrábění'},
    {v:'R',d:'Hrubé obrábění',dt:'Hrubovací operace'},
    {v:'P',d:'Pozitivní geometrie',dt:'Nižší řezné síly'}
  ]},
  9: { title:'Směr řezu',options:[
    {v:'R',d:'Pravý',dt:'Pravotočivé nástroje'},
    {v:'L',d:'Levý',dt:'Levotočivé nástroje'},
    {v:'N',d:'Neutrální',dt:'Obousměrné nástroje'}
  ]}
};

const holderIso = {
  1: { title:'Způsob upnutí',options:[
    {v:'C',d:'Upínka shora',dt:'Upnutí upínkou shora'},
    {v:'D',d:'Upínací klín',dt:'Upnutí přes otvor klínem'},
    {v:'M',d:'Upínací šroub',dt:'Upnutí šroubem přes otvor'},
    {v:'P',d:'Páčka',dt:'Upnutí páčkou'},
    {v:'S',d:'Boční šroub',dt:'Upnutí bočním šroubem'}
  ]},
  2: { title:'Tvar destičky',options:[
    {v:'C',d:'Kosočtverec 80°',dt:'Dokončovací soustružení'},
    {v:'D',d:'Kosočtverec 55°',dt:'Kopírovací soustružení'},
    {v:'R',d:'Kruhový',dt:'Kopírovací operace'},
    {v:'S',d:'Čtvercový',dt:'Univerzální soustružení'},
    {v:'T',d:'Trojúhelníkový',dt:'Dokončovací soustružení'},
    {v:'V',d:'Kosočtverec 35°',dt:'Přesné kopírování'},
    {v:'W',d:'Šestiúhelníkový',dt:'Speciální aplikace'}
  ]},
  3: { title:'Orientace',options:[
    {v:'L',d:'Levé provedení',dt:'Levostranné operace'},
    {v:'N',d:'Neutrální',dt:'Standardní operace'},
    {v:'R',d:'Pravé provedení',dt:'Pravostranné operace'}
  ]},
  4: { title:'Provedení',options:[
    {v:'K',d:'Standardní',dt:'Standardní provedení'},
    {v:'M',d:'S vnitřním chlazením',dt:'Kanálky pro chlazení'},
    {v:'S',d:'Speciální',dt:'Speciální provedení'}
  ]},
  5: { title:'Výška',options:[
    {v:'16',d:'16 mm',dt:'Menší – přesné obrábění'},
    {v:'20',d:'20 mm',dt:'Standardní'},
    {v:'25',d:'25 mm',dt:'Středně náročné operace'},
    {v:'32',d:'32 mm',dt:'Náročné operace'},
    {v:'40',d:'40 mm',dt:'Těžké obrábění'}
  ]},
  6: { title:'Šířka',options:[
    {v:'16',d:'16 mm',dt:'Úzký – omezené prostory'},
    {v:'20',d:'20 mm',dt:'Standardní'},
    {v:'25',d:'25 mm',dt:'Širší – lepší stabilita'},
    {v:'32',d:'32 mm',dt:'Max. tuhost'}
  ]}
};

// Doporučení držáku pro plátky (tvar → úhel hřbetu → typ držáku)
const vbdToHolder = {
  C:{N:'CCLNR/L, DCLNR/L',P:'CCPGR/L, DCPGR/L',M:'CCMNR/L, DCMNR/L'},
  D:{N:'DDJNR/L, PDJNR/L',P:'DDPNR/L, PDPNR/L',M:'DDMNR/L, PDMNR/L'},
  S:{N:'SSKNR/L, MSKNR/L',P:'SSPGR/L, MSPGR/L',M:'SSMNR/L, MSMNR/L'},
  T:{N:'TTJNR/L, MTJNR/L',P:'TTPGR/L, MTPGR/L',M:'TTMNR/L, MTMNR/L'},
  R:{N:'RRDNR/L, SRRNR/L',P:'RRPGR/L, SRPGR/L',M:'RRMNR/L, SRMNR/L'},
  V:{N:'SVJNR/L, MVJNR/L',P:'SVPGR/L, MVPGR/L',M:'SVMNR/L, MVMNR/L'},
  W:{N:'WWLNR/L, MWLNR/L',P:'WWPGR/L, MWPGR/L',M:'WWMNR/L, MWMNR/L'}
};

// ISO materiálové skupiny
const isoMatGroups = [
  {code:'P',name:'Oceli',color:'#3b82f6',ex:'C45, S355, 16MnCr5'},
  {code:'M',name:'Korozivzdorné oceli',color:'#eab308',ex:'X5CrNi, X2CrNiMo'},
  {code:'K',name:'Litina',color:'#ef4444',ex:'GG25, GGG40'},
  {code:'N',name:'Neželezné kovy',color:'#22c55e',ex:'AlCu4Mg, CuZn39'},
  {code:'S',name:'Žáruvzdorné slitiny',color:'#a16207',ex:'Inconel, Ti6Al4V'},
  {code:'H',name:'Kalené materiály',color:'#6b7280',ex:'> 45 HRC'}
];

// Řezné podmínky dle materiálu
const vbdCutCond = {
  steel:   {label:'Ocel (nelegovaná)',rough:[180,0.3,4,'CNMG/SNMG'],finish:[250,0.15,1,'CCMT/DCMT']},
  stainless:{label:'Korozivzdorná ocel',rough:[120,0.25,3,'CNMG/TNMG'],finish:[180,0.12,0.8,'CCMT/VBMT']},
  castIron:{label:'Šedá litina',rough:[150,0.35,5,'SNMG/CNMG'],finish:[220,0.18,1.2,'CCMT/DCMT']},
  aluminum:{label:'Hliník a slitiny',rough:[300,0.4,5,'DCGT/CCGT'],finish:[450,0.2,1.5,'VCGT/DCGT']},
  titanium:{label:'Titan a slitiny',rough:[50,0.15,2,'CNMG/SNMG'],finish:[70,0.1,0.5,'CCMT/VCMT']},
  hardened:{label:'Kalené materiály (>45 HRC)',rough:[80,0.15,2,'CNGA/SNGA'],finish:[120,0.08,0.3,'CNGA/VNGA']}
};

// Porovnání materiálů VBD
const vbdMatCompare = [
  {n:'SK nepovlakovaný',hard:3,tough:4,heat:2,use:'Všeobecné, přerušované řezy',vc:'80–150'},
  {n:'SK povlakovaný',hard:3,tough:4,heat:4,use:'Univerzální, vyšší rychlosti',vc:'150–350'},
  {n:'Řezná keramika',hard:4,tough:2,heat:5,use:'Vysokorychlostní, litina, kalená ocel',vc:'400–800'},
  {n:'CBN',hard:5,tough:3,heat:5,use:'Tvrzené >45 HRC, superslitiny',vc:'200–400'},
  {n:'PCD',hard:5,tough:2,heat:2,use:'Neželezné kovy, kompozity',vc:'300–1000'},
  {n:'Cermety',hard:4,tough:3,heat:4,use:'Dokončovací, vysoké Vc',vc:'200–400'}
];

export function openInsertCalc() {
  // ── Tab system ──
  const tabs = [
    {id:'vbdDec',label:'🔍 Dekodér VBD'},
    {id:'holderDec',label:'🔧 Držáky'},
    {id:'vbdMat',label:'📊 Materiály'},
    {id:'vbdCut',label:'⚡ Řez. podmínky'},
    {id:'vbdHelp',label:'❓ Nápověda'}
  ];
  var tabBar = '<div class="vbd-tabs">';
  for (var t = 0; t < tabs.length; t++)
    tabBar += '<button class="vbd-tab' + (t === 0 ? ' vbd-tab-active' : '') + '" data-tab="' + tabs[t].id + '">' + tabs[t].label + '</button>';
  tabBar += '</div>';

  // ── TAB 1: Dekodér VBD ──
  // Auto-dekodér input
  var tab1 = '<div class="vbd-pane" id="pane-vbdDec">';
  tab1 += '<div class="vbd-decode-row"><input type="text" id="vbdAutoInput" class="vbd-auto-input" placeholder="Zadejte kód, např. CNMG120408-PM" maxlength="20" spellcheck="false" autocomplete="off">';
  tab1 += '<button class="vbd-decode-btn" id="vbdAutoBtn">Dekódovat</button></div>';

  // Tvar ilustrace
  tab1 += '<div class="vbd-shapes" id="vbdShapes">';
  var shapes = vbdIsoData[1].options;
  for (var s = 0; s < shapes.length; s++)
    tab1 += '<button class="vbd-shape-btn" data-shape="' + shapes[s].v + '" title="' + shapes[s].v + ' – ' + shapes[s].d + '">' +
      '<svg viewBox="0 0 70 70" width="44" height="44">' + shapes[s].svg + '</svg><span>' + shapes[s].v + '</span></button>';
  tab1 += '</div>';

  // Interaktivní řádek pozic
  tab1 += '<div class="vbd-sel-row" id="vbdSelRow">';
  for (var p = 1; p <= 9; p++)
    tab1 += '<div class="vbd-sel-item" data-pos="' + p + '" title="' + vbdIsoData[p].title + '"><small>' + p + '</small><span>–</span></div>';
  tab1 += '</div>';

  // Popis výsledku
  tab1 += '<div class="vbd-result" id="vbdResult"><div class="vbd-code" id="vbdCode">– – – – – – – – –</div>' +
    '<div class="vbd-desc" id="vbdDesc">Klikněte na pozici nebo zadejte kód výše</div>' +
    '<div class="vbd-holder-rec" id="vbdHolderRec" style="display:none"><strong>Doporučené držáky:</strong> <span id="vbdHolderList"></span></div></div>';
  tab1 += '</div>';

  // ── TAB 2: Dekodér Držáků ──
  var tab2 = '<div class="vbd-pane" id="pane-holderDec" style="display:none">';

  // Reverse lookup: z plátku najdi držák
  tab2 += '<div class="vbd-reverse-section">' +
    '<div class="cnc-table-label">🔍 Najdi držák podle plátku</div>' +
    '<div class="vbd-decode-row">' +
      '<input type="text" id="holderFromVbdInput" class="vbd-auto-input" placeholder="Kód plátku, např. CNMG nebo DNMG120408" maxlength="20" spellcheck="false" autocomplete="off">' +
      '<button class="vbd-decode-btn" id="holderFromVbdBtn">Najdi držák</button>' +
    '</div>' +
    '<div class="vbd-reverse-quick">' +
      '<small>Nebo vyberte tvar a úhel hřbetu:</small>' +
      '<div class="vbd-rev-selects">' +
        '<select id="holderRevShape"><option value="">Tvar…</option>' +
          '<option value="C">C – Kosočtverec 80°</option><option value="D">D – Kosočtverec 55°</option>' +
          '<option value="R">R – Kruhový</option><option value="S">S – Čtvercový</option>' +
          '<option value="T">T – Trojúhelníkový</option><option value="V">V – Kosočtverec 35°</option>' +
          '<option value="W">W – Šestiúhelníkový</option>' +
        '</select>' +
        '<select id="holderRevAngle"><option value="">Úhel…</option>' +
          '<option value="N">N – 0° Negativní</option><option value="B">B – 5° Pozitivní</option>' +
          '<option value="P">P – 11° Pozitivní</option><option value="C">C – 7°</option>' +
          '<option value="E">E – 20°</option><option value="M">M – 15°</option><option value="A">A – 25°</option>' +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div class="vbd-reverse-result" id="holderFromVbdResult" style="display:none"></div>' +
  '</div>';

  // Separator
  tab2 += '<div class="vbd-section-sep"></div>';
  tab2 += '<div class="cnc-table-label">🔧 Dekodér značení držáku</div>';

  tab2 += '<div class="vbd-decode-row"><input type="text" id="holderAutoInput" class="vbd-auto-input" placeholder="Zadejte kód držáku, např. MCLNR2525" maxlength="20" spellcheck="false" autocomplete="off">';
  tab2 += '<button class="vbd-decode-btn" id="holderAutoBtn">Dekódovat</button></div>';

  tab2 += '<div class="vbd-sel-row" id="holderSelRow">';
  for (var h = 1; h <= 6; h++)
    tab2 += '<div class="vbd-sel-item vbd-sel-holder" data-pos="' + h + '" title="' + holderIso[h].title + '"><small>' + h + '</small><span>–</span></div>';
  tab2 += '</div>';

  tab2 += '<div class="vbd-result" id="holderResult"><div class="vbd-code" id="holderCode">– – – – – –</div>' +
    '<div class="vbd-desc" id="holderDesc">Klikněte na pozici nebo zadejte kód</div>' +
    '<div class="vbd-holder-rec" id="holderInsertRec" style="display:none"><strong>Vhodné plátky:</strong> <span id="holderInsertList"></span></div></div>';
  tab2 += '</div>';

  // ── TAB 3: Materiály VBD ──
  var tab3 = '<div class="vbd-pane" id="pane-vbdMat" style="display:none">';

  // ISO barevné skupiny
  tab3 += '<div class="cnc-table-label">ISO skupiny obráběných materiálů</div><div class="vbd-mat-groups">';
  for (var g = 0; g < isoMatGroups.length; g++) {
    var mg = isoMatGroups[g];
    tab3 += '<div class="vbd-mat-group"><div class="vbd-mat-badge" style="background:' + mg.color + '">' + mg.code + '</div>' +
      '<div><strong>' + mg.name + '</strong><br><small>' + mg.ex + '</small></div></div>';
  }
  tab3 += '</div>';

  // Porovnání materiálů VBD
  tab3 += '<div class="cnc-table-label" style="margin-top:14px">Porovnání materiálů VBD</div>';
  tab3 += '<div class="vbd-compare-wrap"><table class="vbd-compare-tbl"><thead><tr><th>Materiál</th><th>Tvrdost</th><th>Houž.</th><th>Teplo</th><th>Vc</th><th>Použití</th></tr></thead><tbody>';
  for (var c = 0; c < vbdMatCompare.length; c++) {
    var mc = vbdMatCompare[c];
    var stars = function(n) { var s = ''; for (var x = 0; x < 5; x++) s += x < n ? '★' : '☆'; return s; };
    tab3 += '<tr><td><strong>' + mc.n + '</strong></td><td class="vbd-stars">' + stars(mc.hard) + '</td><td class="vbd-stars">' + stars(mc.tough) + '</td><td class="vbd-stars">' + stars(mc.heat) + '</td><td>' + mc.vc + '</td><td><small>' + mc.use + '</small></td></tr>';
  }
  tab3 += '</tbody></table></div>';
  tab3 += '</div>';

  // ── TAB 4: Řezné podmínky ──
  var tab4 = '<div class="vbd-pane" id="pane-vbdCut" style="display:none">';
  tab4 += '<div class="cnc-table-label">Doporučené řezné podmínky dle materiálu</div>';
  tab4 += '<div class="cnc-fields"><label class="cnc-field cnc-field-full"><span>Materiál</span><select id="vbdCutMat"><option value="">-- vyberte --</option>';
  for (var mk in vbdCutCond) tab4 += '<option value="' + mk + '">' + vbdCutCond[mk].label + '</option>';
  tab4 += '</select></label></div>';

  tab4 += '<div id="vbdCutResult" style="display:none">';
  tab4 += '<div class="vbd-cut-grid">';
  tab4 += '<div class="vbd-cut-card"><div class="vbd-cut-title">Hrubování</div><table class="vbd-cut-tbl">' +
    '<tr><td>Vc</td><td id="cutRVc">–</td><td>m/min</td></tr>' +
    '<tr><td>f</td><td id="cutRF">–</td><td>mm/ot</td></tr>' +
    '<tr><td>ap</td><td id="cutRAp">–</td><td>mm</td></tr>' +
    '<tr><td>VBD</td><td id="cutRVbd" colspan="2">–</td></tr></table></div>';
  tab4 += '<div class="vbd-cut-card"><div class="vbd-cut-title vbd-cut-finish">Dokončování</div><table class="vbd-cut-tbl">' +
    '<tr><td>Vc</td><td id="cutFVc">–</td><td>m/min</td></tr>' +
    '<tr><td>f</td><td id="cutFF">–</td><td>mm/ot</td></tr>' +
    '<tr><td>ap</td><td id="cutFAp">–</td><td>mm</td></tr>' +
    '<tr><td>VBD</td><td id="cutFVbd" colspan="2">–</td></tr></table></div>';
  tab4 += '</div>';
  tab4 += '<div class="vbd-cut-note">⚠ Orientační hodnoty – závisí na stroji, chlazení a stabilitě upnutí.</div>';
  tab4 += '</div></div>';

  // ── TAB 5: Nápověda ──
  var tab5 = '<div class="vbd-pane" id="pane-vbdHelp" style="display:none">';

  // Úvod
  tab5 += '<div class="vbd-help-section">' +
    '<h4 class="vbd-help-h">📖 Co jsou obráběcí plátky (VBD)?</h4>' +
    '<p class="vbd-help-p">Vyměnitelné břitové destičky (VBD) jsou klíčovou součástí moderních obráběcích nástrojů. ' +
    'Používají se pro soustružení, frézování a vrtání kovových materiálů. Díky vyměnitelnosti umožňují rychlou ' +
    'výměnu opotřebeného břitu bez nutnosti měnit celý nástroj.</p>' +
  '</div>';

  // Schéma značení
  tab5 += '<div class="vbd-help-section">' +
    '<h4 class="vbd-help-h">🏷️ Systém značení ISO (9 pozic)</h4>' +
    '<p class="vbd-help-p">Příklad: <strong class="vbd-help-code">C N M G 12 04 08 - P M</strong></p>' +
    '<table class="vbd-help-tbl">' +
    '<tr><th>Poz.</th><th>Význam</th><th>Příklad</th><th>Popis</th></tr>' +
    '<tr><td>1</td><td>Tvar destičky</td><td>C</td><td>Kosočtverec 80°</td></tr>' +
    '<tr><td>2</td><td>Úhel hřbetu</td><td>N</td><td>0° – negativní geometrie</td></tr>' +
    '<tr><td>3</td><td>Tolerance</td><td>M</td><td>Střední přesnost rozměrů</td></tr>' +
    '<tr><td>4</td><td>Typ destičky</td><td>G</td><td>S dírou + utvařeč třísky</td></tr>' +
    '<tr><td>5</td><td>Velikost (IC)</td><td>12</td><td>12 mm vepsaná kružnice</td></tr>' +
    '<tr><td>6</td><td>Tloušťka</td><td>04</td><td>4 mm</td></tr>' +
    '<tr><td>7</td><td>Rádius špičky</td><td>08</td><td>0.8 mm</td></tr>' +
    '<tr><td>8</td><td>Úprava břitu</td><td>P</td><td>Pozitivní geometrie</td></tr>' +
    '<tr><td>9</td><td>Směr řezu</td><td>M</td><td>Střední obrábění</td></tr>' +
    '</table>' +
  '</div>';

  // Tvary s SVG
  tab5 += '<div class="vbd-help-section">' +
    '<h4 class="vbd-help-h">🔷 Tvary obráběcích plátků</h4>' +
    '<div class="vbd-help-shapes">';
  var helpShapes = [
    {v:'C',d:'Kosočtverec 80°',use:'Dokončovací soustružení. Nejrozšířenější tvar, dobrý kompromis mezi pevností a přístupností.'},
    {v:'D',d:'Kosočtverec 55°',use:'Kopírovací soustružení. Menší úhel špičky umožňuje obrábění složitých kontur.'},
    {v:'S',d:'Čtverec 90°',use:'Univerzální soustružení, srážení hran. 4 břity = ekonomický provoz.'},
    {v:'T',d:'Trojúhelník 60°',use:'Dokončovací soustružení s malým úběrem. 3 břity, dobrá univerzálnost.'},
    {v:'R',d:'Kruhový',use:'Kopírovací operace, zaoblené kontury. Proměnný úhel nastavení.'},
    {v:'V',d:'Kosočtverec 35°',use:'Přesné kopírovací soustružení. Nejostřejší, ale nejkřehčí špička.'},
    {v:'W',d:'Šestiúhelník',use:'Speciální aplikace, 6 břitů pro ekonomický provoz.'}
  ];
  var shapeData = vbdIsoData[1].options;
  for (var hs = 0; hs < helpShapes.length; hs++) {
    var sh = helpShapes[hs];
    var svgMatch = shapeData.find(function(o) { return o.v === sh.v; });
    tab5 += '<div class="vbd-help-shape-card">' +
      '<svg viewBox="0 0 70 70" width="48" height="48">' + (svgMatch ? svgMatch.svg : '') + '</svg>' +
      '<div><strong>' + sh.v + ' – ' + sh.d + '</strong><br><small>' + sh.use + '</small></div></div>';
  }
  tab5 += '</div></div>';

  // Geometrie břitu
  tab5 += '<div class="vbd-help-section">' +
    '<h4 class="vbd-help-h">📐 Geometrie břitu</h4>' +
    '<table class="vbd-help-tbl">' +
    '<tr><th>Typ</th><th>Vlastnosti</th><th>Vhodné pro</th></tr>' +
    '<tr><td><strong>Negativní (N, 0°)</strong></td><td>Vyšší pevnost břitu, oboustranné destičky (2× více břitů)</td><td>Stabilní podmínky, přerušované řezy, hrubování</td></tr>' +
    '<tr><td><strong>Pozitivní (P, 11°)</strong></td><td>Menší řezné síly, lepší odvod třísek, nižší příkon</td><td>Méně výkonné stroje, nestabilní upnutí, dokončování</td></tr>' +
    '<tr><td><strong>Kompromis (B, 5°)</strong></td><td>Mezi negativní a pozitivní</td><td>Univerzální použití</td></tr>' +
    '</table>' +
  '</div>';

  // Tolerance
  tab5 += '<div class="vbd-help-section">' +
    '<h4 class="vbd-help-h">🎯 Třídy tolerance</h4>' +
    '<table class="vbd-help-tbl">' +
    '<tr><th>Kód</th><th>Tloušťka</th><th>IC (vepsaná kružnice)</th><th>Použití</th></tr>' +
    '<tr><td><strong>A</strong></td><td>±0.05 mm</td><td>±0.13 mm</td><td>Přesné obrábění</td></tr>' +
    '<tr><td><strong>C</strong></td><td>±0.08 mm</td><td>±0.25 mm</td><td>Standardní přesnost</td></tr>' +
    '<tr><td><strong>G</strong></td><td>±0.13 mm</td><td>±0.25 mm</td><td>Běžné aplikace</td></tr>' +
    '<tr><td><strong>U</strong></td><td>±0.13 mm</td><td>±0.18 mm</td><td>Speciální</td></tr>' +
    '</table>' +
  '</div>';

  // Upínací systémy držáků
  tab5 += '<div class="vbd-help-section">' +
    '<h4 class="vbd-help-h">🔧 Značení držáků nástrojů (6 pozic)</h4>' +
    '<p class="vbd-help-p">Příklad: <strong class="vbd-help-code">M C L N R 2525</strong></p>' +
    '<table class="vbd-help-tbl">' +
    '<tr><th>Poz.</th><th>Význam</th><th>Příklad</th><th>Popis</th></tr>' +
    '<tr><td>1</td><td>Způsob upnutí</td><td>M</td><td>Upínací šroub přes otvor</td></tr>' +
    '<tr><td>2</td><td>Tvar destičky</td><td>C</td><td>Kosočtverec 80°</td></tr>' +
    '<tr><td>3</td><td>Orientace</td><td>L</td><td>Levé provedení</td></tr>' +
    '<tr><td>4</td><td>Provedení</td><td>N</td><td>Standardní / s chlazením</td></tr>' +
    '<tr><td>5</td><td>Výška</td><td>25</td><td>25 mm</td></tr>' +
    '<tr><td>6</td><td>Šířka</td><td>25</td><td>25 mm</td></tr>' +
    '</table>' +
    '<div class="vbd-help-note">💡 <strong>R/L</strong> = pravý/levý držák – závisí na orientaci soustruhu a způsobu obrábění.</div>' +
  '</div>';

  // Upínací systémy detail
  tab5 += '<div class="vbd-help-section">' +
    '<h4 class="vbd-help-h">🔩 Způsoby upnutí destičky</h4>' +
    '<table class="vbd-help-tbl">' +
    '<tr><th>Kód</th><th>Systém</th><th>Výhody</th><th>Nevýhody</th></tr>' +
    '<tr><td><strong>C</strong></td><td>Upínka shora</td><td>Rychlá výměna, bez otvoru</td><td>Menší přesnost polohování</td></tr>' +
    '<tr><td><strong>M</strong></td><td>Šroub přes otvor</td><td>Nejlepší přesnost, spolehlivost</td><td>Pomalejší výměna</td></tr>' +
    '<tr><td><strong>P</strong></td><td>Páčka</td><td>Rychlá výměna, přitahuje dolů</td><td>Složitější mechanismus</td></tr>' +
    '<tr><td><strong>S</strong></td><td>Boční šroub</td><td>Kompaktní, pro malé prostory</td><td>Omezená síla upnutí</td></tr>' +
    '<tr><td><strong>D</strong></td><td>Klín přes otvor</td><td>Velmi pevné upnutí</td><td>Nejpomalejší výměna</td></tr>' +
    '</table>' +
  '</div>';

  // Rádius špičky
  tab5 += '<div class="vbd-help-section">' +
    '<h4 class="vbd-help-h">⭕ Rádius špičky (rε)</h4>' +
    '<table class="vbd-help-tbl">' +
    '<tr><th>Rádius</th><th>Povrch</th><th>Použití</th></tr>' +
    '<tr><td>0.2–0.4 mm</td><td>Horší</td><td>Zapichování, úzké zápichy, jemné kontury</td></tr>' +
    '<tr><td>0.8 mm</td><td>Dobrý</td><td>Standardní soustružení – nejčastější volba</td></tr>' +
    '<tr><td>1.2 mm</td><td>Velmi dobrý</td><td>Dokončování s požadavkem na kvalitu povrchu</td></tr>' +
    '<tr><td>1.6–2.4 mm</td><td>Vynikající</td><td>Jemné dokončování, velké posuvy při zachování Ra</td></tr>' +
    '</table>' +
    '<div class="vbd-help-note">📏 Větší rádius = lepší povrch, ale vyšší řezné síly a tendence k vibracím.</div>' +
  '</div>';

  // Utvařeče třísek
  tab5 += '<div class="vbd-help-section">' +
    '<h4 class="vbd-help-h">🌀 Typy utvařečů třísky (poz. 8–9)</h4>' +
    '<table class="vbd-help-tbl">' +
    '<tr><th>Kód</th><th>Typ</th><th>Oblasti použití</th></tr>' +
    '<tr><td><strong>F / PF</strong></td><td>Jemné obrábění</td><td>ap 0.3–2 mm, f 0.05–0.2 mm/ot, dokončování</td></tr>' +
    '<tr><td><strong>M / PM</strong></td><td>Střední obrábění</td><td>ap 1–5 mm, f 0.15–0.4 mm/ot, univerzální</td></tr>' +
    '<tr><td><strong>R / PR</strong></td><td>Hrubé obrábění</td><td>ap 3–10 mm, f 0.3–0.8 mm/ot, hrubování</td></tr>' +
    '</table>' +
  '</div>';

  // Životnost a opotřebení
  tab5 += '<div class="vbd-help-section">' +
    '<h4 class="vbd-help-h">⏱️ Životnost a znaky opotřebení</h4>' +
    '<div class="vbd-help-grid">' +
    '<div class="vbd-help-card">' +
      '<strong style="color:#f38ba8">🔴 Kdy vyměnit destičku?</strong>' +
      '<ul class="vbd-help-list">' +
        '<li>Zhoršená kvalita povrchu (vyšší drsnost)</li>' +
        '<li>Změna rozměrů obrobku – nedodržení tolerancí</li>' +
        '<li>Viditelné opotřebení hřbetu (> 0.3 mm)</li>' +
        '<li>Tvorba nárůstku na břitu</li>' +
        '<li>Vyštípnutí nebo lom břitu</li>' +
        '<li>Zvýšený hluk nebo vibrace</li>' +
        '<li>Změna tvaru nebo barvy třísky</li>' +
      '</ul>' +
    '</div>' +
    '<div class="vbd-help-card">' +
      '<strong style="color:#a6e3a1">🟢 Jak prodloužit životnost?</strong>' +
      '<ul class="vbd-help-list">' +
        '<li>Nepřekračujte doporučené řezné rychlosti</li>' +
        '<li>Upravte posuv podle materiálu a stavu stroje</li>' +
        '<li>Používejte dostatečné chlazení správným směrem</li>' +
        '<li>Vyčistěte dosedací plochy před instalací</li>' +
        '<li>Správně dotáhněte upínací prvky</li>' +
        '<li>Pravidelně otáčejte břity (nevynechávejte)</li>' +
        '<li>U přerušovaných řezů snižte Vc o 20–30 %</li>' +
      '</ul>' +
    '</div>' +
    '</div>' +
  '</div>';

  // Vzorové aplikace
  tab5 += '<div class="vbd-help-section">' +
    '<h4 class="vbd-help-h">🏭 Vzorové aplikace</h4>' +
    '<table class="vbd-help-tbl">' +
    '<tr><th>Operace</th><th>VBD</th><th>Vc</th><th>f</th><th>ap</th></tr>' +
    '<tr><td>Hrubování hřídele (ocel)</td><td>CNMG 120408-PM</td><td>180 m/min</td><td>0.3 mm/ot</td><td>3 mm</td></tr>' +
    '<tr><td>Dokončování hřídele (ocel)</td><td>DNMG 110404-PF</td><td>240 m/min</td><td>0.15 mm/ot</td><td>0.8 mm</td></tr>' +
    '<tr><td>Zapichování (ocel)</td><td>MGMN 300-M</td><td>120 m/min</td><td>0.08 mm/ot</td><td>–</td></tr>' +
    '<tr><td>Hrubování (hliník)</td><td>DCGT 070204</td><td>300 m/min</td><td>0.4 mm/ot</td><td>5 mm</td></tr>' +
    '<tr><td>Dokončování (nerez)</td><td>CCMT 060204</td><td>180 m/min</td><td>0.12 mm/ot</td><td>0.8 mm</td></tr>' +
    '<tr><td>Kalená ocel (>45 HRC)</td><td>CNGA 120408</td><td>120 m/min</td><td>0.08 mm/ot</td><td>0.3 mm</td></tr>' +
    '</table>' +
  '</div>';

  // Povlaky
  tab5 += '<div class="vbd-help-section">' +
    '<h4 class="vbd-help-h">🧪 Typy povlaků VBD</h4>' +
    '<table class="vbd-help-tbl">' +
    '<tr><th>Povlak</th><th>Barva</th><th>Vlastnosti</th><th>Použití</th></tr>' +
    '<tr><td><strong>TiN</strong></td><td style="color:#f9e2af">zlatá</td><td>Nízké tření, dobrá viditelnost opotřebení</td><td>Univerzální, oceli</td></tr>' +
    '<tr><td><strong>TiCN</strong></td><td style="color:#a6adc8">šedá/fialová</td><td>Vyšší tvrdost než TiN, odolnost abrazi</td><td>Oceli, litiny</td></tr>' +
    '<tr><td><strong>TiAlN</strong></td><td style="color:#6c7086">tmavá</td><td>Velmi vysoká tepelná odolnost (do 800°C)</td><td>Suché obrábění, vysoké Vc</td></tr>' +
    '<tr><td><strong>Al₂O₃</strong></td><td style="color:#f38ba8">černá</td><td>Chemická odolnost, tepelná bariéra</td><td>Litiny, oceli při vysokých Vc</td></tr>' +
    '<tr><td><strong>Multi-layer</strong></td><td style="color:#89b4fa">různé</td><td>Kombinace výhod více vrstev</td><td>Univerzální, nejvyšší životnost</td></tr>' +
    '</table>' +
  '</div>';

  // FAQ
  tab5 += '<div class="vbd-help-section">' +
    '<h4 class="vbd-help-h">❓ Časté otázky</h4>' +
    '<div class="vbd-faq">' +
    '<div class="vbd-faq-item"><div class="vbd-faq-q">Jak vybrat správný rádius špičky?</div>' +
      '<div class="vbd-faq-a">Menší rádius (0.4 mm) pro malé průměry a kontury, větší (0.8–1.6 mm) pro vnější soustružení. ' +
      'Pravidlo: rádius by neměl být větší než hloubka řezu (ap). Pro optimální drsnost povrchu: Ra ≈ f²/(32·rε)·1000.</div></div>' +
    '<div class="vbd-faq-item"><div class="vbd-faq-q">Negativní nebo pozitivní destička?</div>' +
      '<div class="vbd-faq-a"><strong>Negativní:</strong> Stabilní stroj, hrubování, přerušované řezy – oboustranné použití (2× břitů). ' +
      '<strong>Pozitivní:</strong> Slabší stroj, dokončování, nestabilní upnutí – menší řezné síly.</div></div>' +
    '<div class="vbd-faq-item"><div class="vbd-faq-q">Jaký je rozdíl mezi povlakovanými a nepovlakovanými?</div>' +
      '<div class="vbd-faq-a">Povlakované: vyšší Vc (až 2×), delší životnost, lepší tepelná odolnost, vyšší cena. ' +
      'Nepovlakované: vhodné pro měkké materiály (hliník, měď), nižší cena, ostřejší břit.</div></div>' +
    '<div class="vbd-faq-item"><div class="vbd-faq-q">Jak přečíst kód plátku z krabičky?</div>' +
      '<div class="vbd-faq-a">Použijte tab „Dekodér VBD" – zadejte celý kód (např. CNMG120408-PM) a systém automaticky rozloží ' +
      'každou pozici s detailním popisem. Prvních 4 znaky = písmena, dalších 6 = číslice, za pomlčkou = utvařeč.</div></div>' +
    '</div>' +
  '</div>';

  tab5 += '</div>';

  // ── Quick search ──
  var searchBar = '<div class="vbd-search-row"><input type="text" id="vbdSearch" class="vbd-search-input" placeholder="Hledat v datech (kód, tvar, popis\u2026)" spellcheck="false">' +
    '<div class="vbd-search-results" id="vbdSearchResults" style="display:none"></div></div>';

  // ── Buttons ──
  var btns = '<div class="cnc-btns"><button class="cnc-btn cnc-btn-clear">Vyčistit</button><button class="cnc-btn cnc-btn-copy">📋 Kopírovat</button></div>';

  const body = searchBar + tabBar + tab1 + tab2 + tab3 + tab4 + btns;
  const overlay = makeOverlay('inserts', '🔩 VBD & Držáky – ISO dekodér', body, 'vbd-window');
  if (!overlay) return;

  // ── Selection state ──
  var sel = {1:'-',2:'-',3:'-',4:'-',5:'-',6:'-',7:'-',8:'-',9:'-'};
  var hSel = {1:'-',2:'-',3:'-',4:'-',5:'-',6:'-'};

  // ── DOM refs ──
  var vbdSelRow = overlay.querySelector('#vbdSelRow');
  var vbdCode = overlay.querySelector('#vbdCode');
  var vbdDesc = overlay.querySelector('#vbdDesc');
  var vbdHolderRec = overlay.querySelector('#vbdHolderRec');
  var vbdHolderList = overlay.querySelector('#vbdHolderList');
  var holderSelRow = overlay.querySelector('#holderSelRow');
  var holderCodeEl = overlay.querySelector('#holderCode');
  var holderDescEl = overlay.querySelector('#holderDesc');
  var holderInsertRec = overlay.querySelector('#holderInsertRec');
  var holderInsertList = overlay.querySelector('#holderInsertList');

  // ── Tab switching ──
  overlay.querySelectorAll('.vbd-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      overlay.querySelectorAll('.vbd-tab').forEach(function(t) { t.classList.remove('vbd-tab-active'); });
      overlay.querySelectorAll('.vbd-pane').forEach(function(p) { p.style.display = 'none'; });
      tab.classList.add('vbd-tab-active');
      overlay.querySelector('#pane-' + tab.dataset.tab).style.display = '';
    });
  });

  // ── FAQ accordion ──
  overlay.querySelectorAll('.vbd-faq-q').forEach(function(q) {
    q.addEventListener('click', function() {
      this.parentElement.classList.toggle('vbd-faq-open');
    });
  });

  // ── VBD position click → modal options ──
  function showPosOptions(pos, isoDb, selObj, updateFn) {
    // Build dropdown under the clicked item
    var existing = overlay.querySelector('.vbd-opts-popup');
    if (existing) existing.remove();
    var data = isoDb[pos];
    var popup = document.createElement('div');
    popup.className = 'vbd-opts-popup';
    popup.innerHTML = '<div class="vbd-opts-title">' + pos + '. ' + data.title + '</div>';
    for (var i = 0; i < data.options.length; i++) {
      var opt = data.options[i];
      var btn = document.createElement('button');
      btn.className = 'vbd-opt-btn';
      btn.textContent = opt.v + ' – ' + opt.d;
      btn.dataset.val = opt.v;
      btn.dataset.pos = pos;
      btn.addEventListener('click', function() {
        selObj[this.dataset.pos] = this.dataset.val;
        popup.remove();
        updateFn();
      });
      popup.appendChild(btn);
    }
    // Close
    var closeBtn = document.createElement('button');
    closeBtn.className = 'vbd-opt-close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', function() { popup.remove(); });
    popup.prepend(closeBtn);
    overlay.querySelector('.calc-body').appendChild(popup);

    // Close on outside click
    setTimeout(function() {
      function outsideClick(e) {
        if (!popup.contains(e.target)) { popup.remove(); document.removeEventListener('mousedown', outsideClick); }
      }
      document.addEventListener('mousedown', outsideClick);
    }, 50);
  }

  // ── Update VBD display ──
  function updateVbd() {
    // Update sel row items
    for (var p = 1; p <= 9; p++) {
      var it = vbdSelRow.querySelector('[data-pos="' + p + '"] span');
      it.textContent = sel[p];
      it.parentElement.classList.toggle('vbd-sel-filled', sel[p] !== '-');
    }
    // Code
    vbdCode.textContent = sel[1]+sel[2]+sel[3]+sel[4]+' '+sel[5]+sel[6]+sel[7]+'–'+sel[8]+sel[9];
    // Description
    var desc = []; var validCount = 0;
    for (var i = 1; i <= 9; i++) {
      if (sel[i] !== '-') {
        validCount++;
        var found = vbdIsoData[i].options.find(function(o) { return o.v === sel[i]; });
        if (found) desc.push('<b>' + i + '. ' + vbdIsoData[i].title + ':</b> ' + found.d);
      }
    }
    vbdDesc.innerHTML = validCount > 0 ? desc.join(' · ') : 'Klikněte na pozici nebo zadejte kód výše';
    // Holder recommendations
    if (sel[1] !== '-' && sel[2] !== '-' && vbdToHolder[sel[1]] && vbdToHolder[sel[1]][sel[2]]) {
      vbdHolderRec.style.display = '';
      vbdHolderList.textContent = vbdToHolder[sel[1]][sel[2]];
    } else {
      vbdHolderRec.style.display = 'none';
    }
    // Highlight shape button
    overlay.querySelectorAll('.vbd-shape-btn').forEach(function(b) {
      b.classList.toggle('vbd-shape-active', b.dataset.shape === sel[1]);
    });
  }

  // ── Update Holder display ──
  function updateHolder() {
    for (var p = 1; p <= 6; p++) {
      var it = holderSelRow.querySelector('[data-pos="' + p + '"] span');
      it.textContent = hSel[p];
      it.parentElement.classList.toggle('vbd-sel-filled', hSel[p] !== '-');
    }
    holderCodeEl.textContent = hSel[1]+hSel[2]+hSel[3]+hSel[4]+hSel[5]+hSel[6];
    var desc = []; var cnt = 0;
    for (var i = 1; i <= 6; i++) {
      if (hSel[i] !== '-') {
        cnt++;
        var found = holderIso[i].options.find(function(o) { return o.v === hSel[i]; });
        if (found) desc.push('<b>' + i + '. ' + holderIso[i].title + ':</b> ' + found.d);
      }
    }
    holderDescEl.innerHTML = cnt > 0 ? desc.join(' · ') : 'Klikněte na pozici nebo zadejte kód';
    // Insert recommendation from holder
    if (hSel[2] !== '-' && hSel[1] !== '-') {
      var shape = hSel[2];
      var suitAngles = (hSel[1] === 'M' || hSel[1] === 'S') ? ['N'] : ['P','N'];
      var recs = suitAngles.map(function(a) { return shape + a + 'MG, ' + shape + a + 'MM'; });
      holderInsertRec.style.display = '';
      holderInsertList.textContent = recs.join(' | ');
    } else {
      holderInsertRec.style.display = 'none';
    }
  }

  // ── Position click handlers (VBD) ──
  vbdSelRow.querySelectorAll('.vbd-sel-item').forEach(function(item) {
    item.addEventListener('click', function() {
      showPosOptions(parseInt(this.dataset.pos), vbdIsoData, sel, updateVbd);
    });
  });

  // ── Position click handlers (Holder) ──
  holderSelRow.querySelectorAll('.vbd-sel-item').forEach(function(item) {
    item.addEventListener('click', function() {
      showPosOptions(parseInt(this.dataset.pos), holderIso, hSel, updateHolder);
    });
  });

  // ── Shape buttons ──
  overlay.querySelectorAll('.vbd-shape-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      sel[1] = this.dataset.shape;
      updateVbd();
    });
  });

  // ── Auto-decode VBD ──
  function autoDecodeVbd(code) {
    code = code.replace(/[\s\-]/g, '').toUpperCase();
    if (code.length < 4) return;
    // Positions 1-4 are single chars, 5-7 are 2 digits each, 8-9 are single chars
    sel[1] = code[0] || '-';
    sel[2] = code[1] || '-';
    sel[3] = code[2] || '-';
    sel[4] = code[3] || '-';
    if (code.length >= 6) sel[5] = code.substring(4, 6); else sel[5] = '-';
    if (code.length >= 8) sel[6] = code.substring(6, 8); else sel[6] = '-';
    if (code.length >= 10) sel[7] = code.substring(8, 10); else sel[7] = '-';
    if (code.length >= 11) sel[8] = code[10]; else sel[8] = '-';
    if (code.length >= 12) sel[9] = code[11]; else sel[9] = '-';
    updateVbd();
  }

  overlay.querySelector('#vbdAutoBtn').addEventListener('click', function() {
    autoDecodeVbd(overlay.querySelector('#vbdAutoInput').value);
  });
  overlay.querySelector('#vbdAutoInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') autoDecodeVbd(this.value);
  });

  // ── Auto-decode Holder ──
  function autoDecodeHolder(code) {
    code = code.replace(/[\s\-]/g, '').toUpperCase();
    if (code.length < 4) return;
    hSel[1] = code[0] || '-';
    hSel[2] = code[1] || '-';
    hSel[3] = code[2] || '-';
    hSel[4] = code[3] || '-';
    if (code.length >= 6) hSel[5] = code.substring(4, 6); else hSel[5] = '-';
    if (code.length >= 8) hSel[6] = code.substring(6, 8); else hSel[6] = '-';
    updateHolder();
  }

  overlay.querySelector('#holderAutoBtn').addEventListener('click', function() {
    autoDecodeHolder(overlay.querySelector('#holderAutoInput').value);
  });
  overlay.querySelector('#holderAutoInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') autoDecodeHolder(this.value);
  });

  // ── Reverse lookup: VBD → Holder ──
  var revResultEl = overlay.querySelector('#holderFromVbdResult');
  var revShapeEl = overlay.querySelector('#holderRevShape');
  var revAngleEl = overlay.querySelector('#holderRevAngle');

  function showHolderForVbd(shape, angle) {
    if (!shape) { revResultEl.style.display = 'none'; return; }
    var html = '';
    // Find SVG for shape
    var shapeInfo = vbdIsoData[1].options.find(function(o) { return o.v === shape; });
    var shapeSvg = shapeInfo ? '<svg viewBox="0 0 70 70" width="36" height="36">' + shapeInfo.svg + '</svg>' : '';

    html += '<div class="vbd-rev-header">' + shapeSvg +
      '<div><strong>Plátky tvaru ' + shape + '</strong>' + (shapeInfo ? ' – ' + shapeInfo.d : '') +
      (angle ? '<br><small>Úhel hřbetu: ' + angle + '</small>' : '') + '</div></div>';

    // Specific holders for shape+angle combo
    if (angle && vbdToHolder[shape] && vbdToHolder[shape][angle]) {
      html += '<div class="vbd-rev-match"><div class="vbd-rev-match-label">✅ Přesná shoda – doporučené držáky:</div>' +
        '<div class="vbd-rev-match-val">' + vbdToHolder[shape][angle] + '</div></div>';
    } else if (angle) {
      html += '<div class="vbd-rev-match"><div class="vbd-rev-match-label" style="color:#f9e2af">⚠ Pro kombinaci ' + shape + '+' + angle + ' nemáme specifické doporučení</div></div>';
    }

    // Show ALL holders that fit this shape (all angles)
    if (vbdToHolder[shape]) {
      html += '<div class="vbd-rev-all"><div class="vbd-rev-match-label">Všechny držáky pro tvar ' + shape + ':</div><table class="vbd-rev-tbl">';
      html += '<tr><th>Úhel</th><th>Typ upnutí</th><th>Doporučené držáky</th></tr>';
      for (var ak in vbdToHolder[shape]) {
        var angleDesc = ak === 'N' ? '0° Neg.' : ak === 'P' ? '11° Poz.' : ak === 'M' ? '15°' : ak;
        var isActive = (ak === angle);
        html += '<tr' + (isActive ? ' class="vbd-rev-active"' : '') + '><td><strong>' + ak + '</strong> ' + angleDesc + '</td><td>';
        // Infer clamping from holder prefix
        var holders = vbdToHolder[shape][ak].split(', ');
        var clamps = holders.map(function(h) {
          var c1 = h.charAt(0);
          if (c1 === 'C' || c1 === 'D' || c1 === 'P' || c1 === 'S' || c1 === 'M') return c1;
          return '?';
        });
        html += clamps.filter(function(v,i,a){ return a.indexOf(v)===i; }).join(', ');
        html += '</td><td>' + vbdToHolder[shape][ak] + '</td></tr>';
      }
      html += '</table></div>';
    }

    // Sizing recommendation
    html += '<div class="vbd-rev-tip">💡 <strong>Tip:</strong> Velikost držáku (25×25, 20×20…) volte dle stroje. R/L = pravý/levý.</div>';

    revResultEl.innerHTML = html;
    revResultEl.style.display = '';
  }

  // From text input
  function revFromCode(code) {
    code = code.replace(/[\s\-]/g, '').toUpperCase();
    if (code.length < 1) { revResultEl.style.display = 'none'; return; }
    var shape = code[0];
    var angle = code.length >= 2 ? code[1] : '';
    // Sync selects
    revShapeEl.value = shape;
    revAngleEl.value = angle;
    showHolderForVbd(shape, angle);
  }

  overlay.querySelector('#holderFromVbdBtn').addEventListener('click', function() {
    revFromCode(overlay.querySelector('#holderFromVbdInput').value);
  });
  overlay.querySelector('#holderFromVbdInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') revFromCode(this.value);
  });

  // From selects
  function revFromSelects() {
    showHolderForVbd(revShapeEl.value, revAngleEl.value);
  }
  revShapeEl.addEventListener('change', revFromSelects);
  revAngleEl.addEventListener('change', revFromSelects);

  // ── Cutting conditions select ──
  overlay.querySelector('#vbdCutMat').addEventListener('change', function() {
    var key = this.value;
    var resEl = overlay.querySelector('#vbdCutResult');
    if (!key) { resEl.style.display = 'none'; return; }
    var data = vbdCutCond[key];
    resEl.style.display = '';
    overlay.querySelector('#cutRVc').textContent = data.rough[0];
    overlay.querySelector('#cutRF').textContent = data.rough[1];
    overlay.querySelector('#cutRAp').textContent = data.rough[2];
    overlay.querySelector('#cutRVbd').textContent = data.rough[3];
    overlay.querySelector('#cutFVc').textContent = data.finish[0];
    overlay.querySelector('#cutFF').textContent = data.finish[1];
    overlay.querySelector('#cutFAp').textContent = data.finish[2];
    overlay.querySelector('#cutFVbd').textContent = data.finish[3];
  });

  // ── Search ──
  var searchInput = overlay.querySelector('#vbdSearch');
  var searchResults = overlay.querySelector('#vbdSearchResults');
  searchInput.addEventListener('input', function() {
    var q = this.value.toUpperCase().trim();
    if (q.length < 2) { searchResults.style.display = 'none'; return; }
    var results = [];
    // Search in VBD data
    for (var pk in vbdIsoData) {
      var pos = vbdIsoData[pk];
      for (var i = 0; i < pos.options.length; i++) {
        var opt = pos.options[i];
        if (opt.v.indexOf(q) >= 0 || opt.d.toUpperCase().indexOf(q) >= 0 || opt.dt.toUpperCase().indexOf(q) >= 0)
          results.push('<div class="vbd-sr"><b>' + pos.title + ':</b> ' + opt.v + ' – ' + opt.d + ' <small>(' + opt.dt + ')</small></div>');
      }
    }
    // Search in Holder data
    for (var hk in holderIso) {
      var hpos = holderIso[hk];
      for (var j = 0; j < hpos.options.length; j++) {
        var hopt = hpos.options[j];
        if (hopt.v.indexOf(q) >= 0 || hopt.d.toUpperCase().indexOf(q) >= 0 || hopt.dt.toUpperCase().indexOf(q) >= 0)
          results.push('<div class="vbd-sr"><b>Držák – ' + hpos.title + ':</b> ' + hopt.v + ' – ' + hopt.d + '</div>');
      }
    }
    if (results.length === 0) results.push('<div class="vbd-sr">Žádné shody</div>');
    searchResults.innerHTML = results.slice(0, 20).join('');
    searchResults.style.display = '';
  });
  searchInput.addEventListener('blur', function() { setTimeout(function() { searchResults.style.display = 'none'; }, 200); });

  // ── Clear ──
  overlay.querySelector('.cnc-btn-clear').addEventListener('click', function() {
    for (var i = 1; i <= 9; i++) sel[i] = '-';
    for (var j = 1; j <= 6; j++) hSel[j] = '-';
    updateVbd(); updateHolder();
    overlay.querySelector('#vbdAutoInput').value = '';
    overlay.querySelector('#holderAutoInput').value = '';
    overlay.querySelector('#holderFromVbdInput').value = '';
    revShapeEl.selectedIndex = 0; revAngleEl.selectedIndex = 0;
    revResultEl.style.display = 'none';
    overlay.querySelector('#vbdCutMat').selectedIndex = 0;
    overlay.querySelector('#vbdCutResult').style.display = 'none';
    searchInput.value = '';
    searchResults.style.display = 'none';
  });

  // ── Copy ──
  overlay.querySelector('.cnc-btn-copy').addEventListener('click', function() {
    var parts = [];
    var code1 = vbdCode.textContent.trim();
    if (code1 && code1.indexOf('–') !== 0) parts.push('VBD: ' + code1);
    var code2 = holderCodeEl.textContent.trim();
    if (code2 && code2.indexOf('–') !== 0) parts.push('Držák: ' + code2);
    var descText = vbdDesc.textContent;
    if (descText && descText.indexOf('Klikněte') < 0) parts.push(descText);
    if (parts.length) navigator.clipboard.writeText(parts.join(' | ')).then(function() { showToast('Zkopírováno'); });
  });
}