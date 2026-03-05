// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Dialogy (měření, poloměr, čísla, polární)         ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Měření – dialog výsledku ──
function showMeasureResult(p1, p2, d, angle) {
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>📏 Výsledek měření</h3>
      <table style="width:100%;font-family:Consolas;font-size:13px;">
        <tr><td style="color:#a6adc8">Vzdálenost:</td><td style="color:#f9e2af">${d.toFixed(4)} mm</td></tr>
        <tr><td style="color:#a6adc8">Úhel:</td><td style="color:#f9e2af">${angle.toFixed(2)}°</td></tr>
        <tr><td style="color:#a6adc8">ΔX:</td><td style="color:#f5c2e7">${(p2.x - p1.x).toFixed(4)}</td></tr>
        <tr><td style="color:#a6adc8">ΔZ:</td><td style="color:#f5c2e7">${(p2.y - p1.y).toFixed(4)}</td></tr>
        <tr><td style="color:#a6adc8">Bod 1:</td><td style="color:#89b4fa">X${p1.x.toFixed(4)} Z${p1.y.toFixed(4)}</td></tr>
        <tr><td style="color:#a6adc8">Bod 2:</td><td style="color:#89b4fa">X${p2.x.toFixed(4)} Z${p2.y.toFixed(4)}</td></tr>
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
function showCircleRadiusDialog() {
  const cp = state.tempPoints[0];
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>Kružnice – zadání poloměru</h3>
      <label>Střed: X=${cp.x.toFixed(2)}, Z=${cp.y.toFixed(2)}</label>
      <label>Poloměr (mm):</label>
      <input type="number" id="dlgRadius" step="0.1" min="0.001" value="10" autofocus>
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

function showNumericalInputDialog() {
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog" style="min-width:400px">
      <h3>🔢 Číselné zadání objektu</h3>
      <label>Typ objektu:</label>
      <select id="numType">
        <option value="point">Bod</option>
        <option value="line" selected>Úsečka</option>
        <option value="constr">Konstrukční čára</option>
        <option value="circle">Kružnice</option>
        <option value="arc">Oblouk</option>
        <option value="rect">Obdélník</option>
      </select>
      <div id="numFields"></div>
      <div class="btn-row">
        <button class="btn-cancel" onclick="this.closest('.input-overlay').remove()">Zrušit</button>
        <button class="btn-ok" id="numOk">Vytvořit</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const typeSelect = overlay.querySelector("#numType");
  const fieldsDiv = overlay.querySelector("#numFields");

  function updateFields() {
    const t = typeSelect.value;
    let html = "";
    switch (t) {
      case "point":
        html = `<div class="input-row"><div><label>X:</label><input type="number" id="nx" step="0.1" value="0"></div>
                <div><label>Z:</label><input type="number" id="ny" step="0.1" value="0"></div></div>`;
        break;
      case "line":
      case "constr":
        html = `<div class="input-row"><div><label>X1:</label><input type="number" id="nx1" step="0.1" value="0"></div>
                <div><label>Z1:</label><input type="number" id="ny1" step="0.1" value="0"></div></div>
                <div class="input-row"><div><label>X2:</label><input type="number" id="nx2" step="0.1" value="0"></div>
                <div><label>Z2:</label><input type="number" id="ny2" step="0.1" value="0"></div></div>
                <label style="font-size:11px;color:#6c7086;margin-top:4px">Nebo: Délka + Úhel od bodu 1</label>
                <div class="input-row"><div><label>Délka:</label><input type="number" id="nlen" step="0.1" value=""></div>
                <div><label>Úhel (°):</label><input type="number" id="nang" step="0.1" value=""></div></div>`;
        break;
      case "circle":
        html = `<div class="input-row"><div><label>Střed X:</label><input type="number" id="ncx" step="0.1" value="0"></div>
                <div><label>Střed Z:</label><input type="number" id="ncy" step="0.1" value="0"></div></div>
                <div class="input-row"><div><label>Poloměr:</label><input type="number" id="nr" step="0.1" value="10"></div>
                <div></div></div>`;
        break;
      case "arc":
        html = `<div class="input-row"><div><label>Střed X:</label><input type="number" id="ncx" step="0.1" value="0"></div>
                <div><label>Střed Z:</label><input type="number" id="ncy" step="0.1" value="0"></div></div>
                <div class="input-row"><div><label>Poloměr:</label><input type="number" id="nr" step="0.1" value="10"></div></div>
                <div class="input-row"><div><label>Start (°):</label><input type="number" id="nsa" step="1" value="0"></div>
                <div><label>Konec (°):</label><input type="number" id="nea" step="1" value="90"></div></div>`;
        break;
      case "rect":
        html = `<div class="input-row"><div><label>X1:</label><input type="number" id="nx1" step="0.1" value="0"></div>
                <div><label>Z1:</label><input type="number" id="ny1" step="0.1" value="0"></div></div>
                <div class="input-row"><div><label>X2:</label><input type="number" id="nx2" step="0.1" value="0"></div>
                <div><label>Z2:</label><input type="number" id="ny2" step="0.1" value="0"></div></div>
                <label style="font-size:11px;color:#6c7086;margin-top:4px">Nebo: Šířka × Výška od bodu 1</label>
                <div class="input-row"><div><label>Šířka:</label><input type="number" id="nw" step="0.1" value=""></div>
                <div><label>Výška:</label><input type="number" id="nh" step="0.1" value=""></div></div>`;
        break;
    }
    fieldsDiv.innerHTML = html;
    const first = fieldsDiv.querySelector("input");
    if (first) setTimeout(() => first.focus(), 50);
  }

  typeSelect.addEventListener("change", updateFields);
  updateFields();

  overlay.querySelector("#numOk").addEventListener("click", () => {
    const t = typeSelect.value;
    try {
      switch (t) {
        case "point": {
          const x = parseFloat(overlay.querySelector("#nx").value);
          const y = parseFloat(overlay.querySelector("#ny").value);
          addObject({ type: "point", x, y, name: `Bod ${state.nextId}` });
          break;
        }
        case "line":
        case "constr": {
          const x1 = parseFloat(overlay.querySelector("#nx1").value);
          const y1 = parseFloat(overlay.querySelector("#ny1").value);
          let x2 = parseFloat(overlay.querySelector("#nx2").value);
          let y2 = parseFloat(overlay.querySelector("#ny2").value);
          const len = parseFloat(overlay.querySelector("#nlen").value);
          const ang = parseFloat(overlay.querySelector("#nang").value);
          if (!isNaN(len) && !isNaN(ang) && len > 0) {
            const rad = (ang * Math.PI) / 180;
            x2 = x1 + len * Math.cos(rad);
            y2 = y1 + len * Math.sin(rad);
          }
          addObject({
            type: t,
            x1,
            y1,
            x2,
            y2,
            name: `${t === "constr" ? "Konstr" : "Úsečka"} ${state.nextId}`,
            dashed: t === "constr",
          });
          break;
        }
        case "circle": {
          const cx = parseFloat(overlay.querySelector("#ncx").value);
          const cy = parseFloat(overlay.querySelector("#ncy").value);
          const r = parseFloat(overlay.querySelector("#nr").value);
          addObject({
            type: "circle",
            cx,
            cy,
            r,
            name: `Kružnice ${state.nextId}`,
          });
          break;
        }
        case "arc": {
          const cx = parseFloat(overlay.querySelector("#ncx").value);
          const cy = parseFloat(overlay.querySelector("#ncy").value);
          const r = parseFloat(overlay.querySelector("#nr").value);
          const sa =
            (parseFloat(overlay.querySelector("#nsa").value) * Math.PI) /
            180;
          const ea =
            (parseFloat(overlay.querySelector("#nea").value) * Math.PI) /
            180;
          addObject({
            type: "arc",
            cx,
            cy,
            r,
            startAngle: sa,
            endAngle: ea,
            name: `Oblouk ${state.nextId}`,
          });
          break;
        }
        case "rect": {
          const x1 = parseFloat(overlay.querySelector("#nx1").value);
          const y1 = parseFloat(overlay.querySelector("#ny1").value);
          let x2 = parseFloat(overlay.querySelector("#nx2").value);
          let y2 = parseFloat(overlay.querySelector("#ny2").value);
          const w = parseFloat(overlay.querySelector("#nw").value);
          const h = parseFloat(overlay.querySelector("#nh").value);
          if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
            x2 = x1 + w;
            y2 = y1 + h;
          }
          addObject({
            type: "rect",
            x1,
            y1,
            x2,
            y2,
            name: `Obdélník ${state.nextId}`,
          });
          break;
        }
      }
      overlay.remove();
    } catch (err) {
      showToast("Chyba – zkontrolujte hodnoty");
    }
  });

  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT")
      overlay.querySelector("#numOk").click();
    if (e.key === "Escape") overlay.remove();
  });
}

// ── Polární kreslení z referenčního bodu ──
document
  .getElementById("btnPolar")
  .addEventListener("click", showPolarDrawingDialog);

function showPolarDrawingDialog() {
  let refX = 0,
    refZ = 0;
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
        <div><label>X:</label><input type="number" id="polRefX" step="0.1" value="${refX}"></div>
        <div><label>Z:</label><input type="number" id="polRefZ" step="0.1" value="${refZ}"></div>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:10px">
        <button class="btn-ok" id="polMarkRef" style="font-size:11px;padding:3px 8px">📍 Označit ref. bod</button>
        <button class="btn-ok" id="polFromSelected" style="font-size:11px;padding:3px 8px;background:#a6e3a1;border-color:#a6e3a1">📌 Z vybraného objektu</button>
      </div>
      <hr style="border-color:#45475a;margin:8px 0">
      <label>Segment (polární souřadnice od ref. bodu):</label>
      <div class="input-row">
        <div><label>Délka:</label><input type="number" id="polLen" step="0.1" value="10"></div>
        <div><label>Úhel (°):</label><input type="number" id="polAng" step="0.1" value="0"></div>
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
      polRefX.value = endX.toFixed(4);
      polRefZ.value = endZ.toFixed(4);
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

// ── Měření – info o existujícím objektu ──
function showMeasureObjectInfo(obj, wx, wy) {
  // Detekce, zda jsme kliknuli blízko koncového bodu
  const threshold = 8 / state.zoom;
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
          <tr><td style="color:#a6adc8">X:</td><td style="color:#f9e2af">${nearestPt.x.toFixed(4)}</td></tr>
          <tr><td style="color:#a6adc8">Z:</td><td style="color:#f9e2af">${nearestPt.y.toFixed(4)}</td></tr>
        </table>
        <div class="btn-row">
          <button class="btn-cancel" id="ptCopy">📋 Kopírovat</button>
          <button class="btn-cancel" id="ptAddPoint">📍 Vytvořit bod</button>
          <button class="btn-ok" onclick="this.closest('.input-overlay').remove()">OK</button>
        </div>
      </div>`;
  } else {
    // Klik na tělo objektu – zobrazit info
    html = buildObjectInfoDialog(obj);
  }

  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  if (clickedEndpoint && nearestPt) {
    overlay.querySelector("#ptCopy").addEventListener("click", () => {
      const text = `X${nearestPt.x.toFixed(4)} Z${nearestPt.y.toFixed(4)}`;
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

function buildObjectInfoDialog(obj) {
  let rows = "";
  rows += `<tr><td style="color:#a6adc8">Typ:</td><td style="color:#cdd6f4">${typeLabel(obj.type)}</td></tr>`;
  if (obj.name)
    rows += `<tr><td style="color:#a6adc8">Název:</td><td style="color:#cdd6f4">${obj.name}</td></tr>`;

  switch (obj.type) {
    case "point":
      rows += `<tr><td style="color:#a6adc8">X:</td><td style="color:#f9e2af">${obj.x.toFixed(4)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Z:</td><td style="color:#f9e2af">${obj.y.toFixed(4)}</td></tr>`;
      break;
    case "line":
    case "constr": {
      const len = Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1);
      const angle =
        (Math.atan2(obj.y2 - obj.y1, obj.x2 - obj.x1) * 180) / Math.PI;
      rows += `<tr><td style="color:#a6adc8">Bod 1:</td><td style="color:#89b4fa">X${obj.x1.toFixed(4)} Z${obj.y1.toFixed(4)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Bod 2:</td><td style="color:#89b4fa">X${obj.x2.toFixed(4)} Z${obj.y2.toFixed(4)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Délka:</td><td style="color:#f9e2af">${len.toFixed(4)} mm</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Úhel:</td><td style="color:#f9e2af">${angle.toFixed(2)}°</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">ΔX:</td><td style="color:#f5c2e7">${(obj.x2 - obj.x1).toFixed(4)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">ΔZ:</td><td style="color:#f5c2e7">${(obj.y2 - obj.y1).toFixed(4)}</td></tr>`;
      break;
    }
    case "circle":
      rows += `<tr><td style="color:#a6adc8">Střed:</td><td style="color:#89b4fa">X${obj.cx.toFixed(4)} Z${obj.cy.toFixed(4)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Poloměr:</td><td style="color:#f9e2af">${obj.r.toFixed(4)} mm</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Průměr:</td><td style="color:#f9e2af">${(obj.r * 2).toFixed(4)} mm</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Obvod:</td><td style="color:#f5c2e7">${(2 * Math.PI * obj.r).toFixed(4)} mm</td></tr>`;
      break;
    case "arc":
      rows += `<tr><td style="color:#a6adc8">Střed:</td><td style="color:#89b4fa">X${obj.cx.toFixed(4)} Z${obj.cy.toFixed(4)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Poloměr:</td><td style="color:#f9e2af">${obj.r.toFixed(4)} mm</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Start:</td><td style="color:#f5c2e7">${((obj.startAngle * 180) / Math.PI).toFixed(2)}°</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Konec:</td><td style="color:#f5c2e7">${((obj.endAngle * 180) / Math.PI).toFixed(2)}°</td></tr>`;
      break;
    case "rect": {
      const w = Math.abs(obj.x2 - obj.x1);
      const h = Math.abs(obj.y2 - obj.y1);
      rows += `<tr><td style="color:#a6adc8">Roh 1:</td><td style="color:#89b4fa">X${obj.x1.toFixed(4)} Z${obj.y1.toFixed(4)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Roh 2:</td><td style="color:#89b4fa">X${obj.x2.toFixed(4)} Z${obj.y2.toFixed(4)}</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Šířka:</td><td style="color:#f9e2af">${w.toFixed(4)} mm</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Výška:</td><td style="color:#f9e2af">${h.toFixed(4)} mm</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Obvod:</td><td style="color:#f5c2e7">${(2 * (w + h)).toFixed(4)} mm</td></tr>`;
      rows += `<tr><td style="color:#a6adc8">Plocha:</td><td style="color:#f5c2e7">${(w * h).toFixed(4)} mm²</td></tr>`;
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
  }, 0);

  return html;
}

// ── Přidání kót k objektu ──
function addDimensionForObject(obj) {
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
