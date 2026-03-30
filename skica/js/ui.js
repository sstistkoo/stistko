// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – UI panely, toolbar, hinty                          ║
// ╚══════════════════════════════════════════════════════════════╝

import { COLORS } from './constants.js';
import { state, showToast, pushUndo, undo, redo, axisLabels, resetDrawingState, displayX, xPrefix, fmtStatusCoords, coordHelpers } from './state.js';
import { typeLabel, toolLabel, bulgeToArc, safeEvalMath, _parseMathExpr } from './utils.js';
import { renderAll, renderAllDebounced } from './render.js';
import { drawCanvas, screenToWorld, snapPt } from './canvas.js';
import { bridge } from './bridge.js';
import { addObject } from './objects.js';
import { openCuttingCalc, openTaperCalc, openThreadCalc, openConvertCalc, openWeightCalc, openToleranceCalc, openRoughnessCalc, openInsertCalc } from './cnc-calcs.js';
import { makeOverlay } from './dialogFactory.js';
import { getMeta, setMeta } from './idb.js';

// ── Bridge registrace (rozbíjí cyklickou závislost geometry ↔ ui) ──
bridge.updateProperties = () => updateProperties();
bridge.updateObjectList = () => updateObjectList();
bridge.updateIntersectionList = () => updateIntersectionList();
bridge.updateLayerList = () => updateLayerList();
bridge.renderAll = () => renderAll();
bridge.resetHint = () => resetHint();

// ── Seznam objektů ──
/** Aktualizuje seznam objektů v panelu. */
export function updateObjectList() {
  const ul = document.getElementById("objectList");
  ul.innerHTML = "";
  const icons = {
    point: "·",
    line: "/",
    constr: "⁄",
    circle: "○",
    arc: "⌒",
    rect: "□",
    polyline: "⛓",
  };
  state.objects.forEach((obj, idx) => {
    const li = document.createElement("li");
    li.className = (idx === state.selected || state.multiSelected.has(idx)) ? "selected" : "";
    const span = document.createElement("span");
    const iconSpan = document.createElement("span");
    iconSpan.className = "obj-icon";
    iconSpan.textContent = icons[obj.type] || "?";
    span.appendChild(iconSpan);
    span.appendChild(document.createTextNode(obj.name || obj.type + " " + obj.id));
    li.appendChild(span);
    const delBtn = document.createElement("button");
    delBtn.className = "del-btn";
    delBtn.title = "Smazat";
    delBtn.textContent = "✕";
    li.appendChild(delBtn);
    span.addEventListener("click", () => {
      if (state.multiSelected.has(idx) || (idx === state.selected && state.multiSelected.size > 0)) {
        state.multiSelected.delete(idx);
        if (idx === state.selected) {
          state.selected = state.multiSelected.size > 0
            ? [...state.multiSelected].pop() : null;
        }
        if (state.multiSelected.size === 1) {
          state.selected = state.multiSelected.values().next().value;
          state.multiSelected.clear();
        }
      } else if (idx === state.selected && state.multiSelected.size === 0) {
        state.selected = null;
      } else if (state.selected !== null) {
        if (state.multiSelected.size === 0) state.multiSelected.add(state.selected);
        state.multiSelected.add(idx);
        state.selected = idx;
      } else {
        state.selected = idx;
      }
      state.selectedSegment = null;
      state._selectedSegmentObjIdx = null;
      updateObjectList();
      updateProperties();
      renderAll();
    });
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      pushUndo();
      if (state.dragging && state.dragObjIdx === idx) {
        state.dragging = false;
        state.dragObjIdx = null;
      } else if (state.dragging && state.dragObjIdx > idx) {
        state.dragObjIdx--;
      }
      state.objects.splice(idx, 1);
      if (state.selected === idx) state.selected = null;
      else if (state.selected > idx) state.selected--;
      const newMulti = new Set();
      for (const mi of state.multiSelected) {
        if (mi < idx) newMulti.add(mi);
        else if (mi > idx) newMulti.add(mi - 1);
      }
      state.multiSelected = newMulti;
      updateObjectList();
      updateProperties();
      if (bridge.calculateAllIntersections) bridge.calculateAllIntersections();
    });
    ul.appendChild(li);

    // ── Rozbalení segmentů kontury ──
    if (obj.type === 'polyline' && (idx === state.selected || state.multiSelected.has(idx))) {
      const n = obj.vertices.length;
      const segCount = obj.closed ? n : n - 1;
      for (let si = 0; si < segCount; si++) {
        const p1 = obj.vertices[si];
        const p2 = obj.vertices[(si + 1) % n];
        const b = obj.bulges[si] || 0;
        const segName = b === 0 ? `Úsečka ${si + 1}` : `Oblouk ${si + 1}`;

        const segLi = document.createElement("li");
        segLi.className = "seg-item" + (state.selectedSegment === si && state._selectedSegmentObjIdx === idx ? " seg-selected" : "");
        const segSpan = document.createElement("span");
        const segIcon = document.createElement("span");
        segIcon.className = "obj-icon";
        segIcon.textContent = b === 0 ? "/" : "⌒";
        segSpan.appendChild(segIcon);
        segSpan.appendChild(document.createTextNode(segName));
        segLi.appendChild(segSpan);

        // Delete segment button
        const segDelBtn = document.createElement("button");
        segDelBtn.className = "del-btn";
        segDelBtn.title = "Smazat segment";
        segDelBtn.textContent = "✕";
        segLi.appendChild(segDelBtn);

        // Click to select segment
        segSpan.addEventListener("click", () => {
          state.selected = idx;
          state.selectedSegment = si;
          state._selectedSegmentObjIdx = idx;
          updateObjectList();
          updateProperties();
          renderAll();
        });

        // Delete segment – split contour if middle
        segDelBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          pushUndo();
          const vn = obj.vertices.length;
          const sc = obj.closed ? vn : vn - 1;
          if (si < 0 || si >= sc) return;

          if (vn <= 2) {
            // Only 1 segment → delete the whole polyline
            state.objects.splice(idx, 1);
            if (state.selected === idx) state.selected = null;
            else if (state.selected > idx) state.selected--;
          } else if (obj.closed) {
            const removeIdx = (si + 1) % vn;
            obj.vertices.splice(removeIdx, 1);
            obj.bulges.splice(si, 1);
            obj.closed = false;
            if (removeIdx > 0 && removeIdx < obj.vertices.length) {
              const newVerts = [...obj.vertices.slice(removeIdx), ...obj.vertices.slice(0, removeIdx)];
              const newBulges = [...obj.bulges.slice(removeIdx), ...obj.bulges.slice(0, removeIdx)];
              obj.vertices = newVerts;
              obj.bulges = newBulges;
            }
          } else if (si === 0) {
            obj.vertices.splice(0, 1);
            obj.bulges.splice(0, 1);
          } else if (si === sc - 1) {
            obj.vertices.splice(vn - 1, 1);
            obj.bulges.splice(si, 1);
          } else {
            // Middle segment → split into two polylines
            const verts1 = obj.vertices.slice(0, si + 1);
            const bulges1 = obj.bulges.slice(0, si);
            const verts2 = obj.vertices.slice(si + 1);
            const bulges2 = obj.bulges.slice(si + 1);
            obj.vertices = verts1;
            obj.bulges = bulges1;
            obj.closed = false;
            if (verts2.length >= 2) {
              const newId = state.nextId++;
              const newObj = {
                type: 'polyline',
                id: newId,
                vertices: verts2,
                bulges: bulges2,
                closed: false,
                name: `Kontura ${newId}`,
                layer: obj.layer,
                color: obj.color,
              };
              state.objects.splice(idx + 1, 0, newObj);
            }
          }
          state.selectedSegment = null;
          state._selectedSegmentObjIdx = null;
          updateObjectList();
          updateProperties();
          if (bridge.calculateAllIntersections) bridge.calculateAllIntersections();
          showToast("Segment smazán ✓");
        });
        ul.appendChild(segLi);
      }
    }
  });
}

// ── Vlastnosti objektu ──
/** Aktualizuje panel vlastností vybraného objektu. */
export function updateProperties() {
  const tbody = document.querySelector("#propTable tbody");
  tbody.innerHTML = "";

  // Multi-select: zobrazit přehled
  if (state.multiSelected.size > 0) {
    const count = state.multiSelected.size;
    const types = {};
    for (const i of state.multiSelected) {
      const obj = state.objects[i];
      if (obj) types[obj.type] = (types[obj.type] || 0) + 1;
    }
    const summary = Object.entries(types).map(([t, c]) => `${t}: ${c}`).join(', ');
    tbody.innerHTML =
      `<tr><td colspan="2" style="color:${COLORS.selected};font-weight:bold">${count} objektů vybráno</td></tr>` +
      `<tr><td colspan="2" style="color:${COLORS.textMuted}">${summary}</td></tr>` +
      `<tr><td colspan="2" style="color:${COLORS.textMuted}">Klik = přidat, znovu = odebrat</td></tr>`;
    return;
  }

  if (state.selected === null) {
    tbody.innerHTML =
      `<tr><td colspan="2" style="color:${COLORS.textMuted}">Není vybrán objekt</td></tr>`;
    return;
  }
  const obj = state.objects[state.selected];

  // Helper: přidá řádek s editovatelným inputem
  function addEditRow(label, value, onChange, step) {
    const tr = document.createElement("tr");
    const tdLabel = document.createElement("td");
    tdLabel.textContent = label;
    const tdVal = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "prop-input";
    input.value = parseFloat(value).toFixed(3);
    input.addEventListener("change", () => {
      const v = safeEvalMath(input.value);
      if (!isNaN(v)) {
        pushUndo();
        onChange(v);
        renderAll();
        refreshComputedProps();
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
      e.stopPropagation();
    });
    tdVal.appendChild(input);
    tr.appendChild(tdLabel);
    tr.appendChild(tdVal);
    tbody.appendChild(tr);
  }

  // Helper: přidá read-only řádek
  function addInfoRow(label, value) {
    const tr = document.createElement("tr");
    const tdLabel = document.createElement("td");
    tdLabel.textContent = label;
    const tdValue = document.createElement("td");
    tdValue.className = "prop-readonly";
    tdValue.textContent = value;
    tr.appendChild(tdLabel);
    tr.appendChild(tdValue);
    tbody.appendChild(tr);
  }

  // Helper: přidá textový input (pro jméno)
  function addTextRow(label, value, onChange) {
    const tr = document.createElement("tr");
    const tdLabel = document.createElement("td");
    tdLabel.textContent = label;
    const tdVal = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "prop-name-input";
    input.value = value;
    input.addEventListener("change", () => {
      onChange(input.value);
      updateObjectList();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
      e.stopPropagation();
    });
    tdVal.appendChild(input);
    tr.appendChild(tdLabel);
    tr.appendChild(tdVal);
    tbody.appendChild(tr);
  }

  // Helper: přidá color picker
  function addColorRow(label, value, onChange) {
    const tr = document.createElement("tr");
    const tdLabel = document.createElement("td");
    tdLabel.textContent = label;
    const tdVal = document.createElement("td");
    const input = document.createElement("input");
    input.type = "color";
    input.className = "prop-color-input";
    input.value = value;
    input.addEventListener("input", () => {
      onChange(input.value);
    });
    tdVal.appendChild(input);
    tr.appendChild(tdLabel);
    tr.appendChild(tdVal);
    tbody.appendChild(tr);
  }

  // Aktualizace computed polí bez rebuild
  function refreshComputedProps() {
    const computed = tbody.querySelectorAll(".prop-readonly");
    if (!computed.length) return;
    const compData = getComputedData(obj);
    computed.forEach((el, i) => {
      if (compData[i] !== undefined) el.textContent = compData[i];
    });
  }

  function getComputedData(o) {
    switch (o.type) {
      case "line":
      case "constr":
        return [
          Math.hypot(o.x2 - o.x1, o.y2 - o.y1).toFixed(3),
          ((Math.atan2(o.y2 - o.y1, o.x2 - o.x1) * 180) / Math.PI).toFixed(2) + "°"
        ];
      case "circle":
        return [
          (o.r * 2).toFixed(3),
          (2 * Math.PI * o.r).toFixed(3)
        ];
      case "rect":
        return [
          Math.abs(o.x2 - o.x1).toFixed(3),
          Math.abs(o.y2 - o.y1).toFixed(3)
        ];
      default:
        return [];
    }
  }

  // Typ (read-only)
  addInfoRow("Typ", typeLabel(obj.type));
  // Název (editovatelný)
  addTextRow("Název", obj.name || "", (v) => { obj.name = v; });
  // Barva (editovatelná)
  addColorRow("Barva", obj.color || COLORS.primary, (v) => { obj.color = v; renderAllDebounced(); });

  // Vrstva (select)
  {
    const tr = document.createElement("tr");
    const tdLabel = document.createElement("td");
    tdLabel.textContent = "Vrstva";
    const tdVal = document.createElement("td");
    const sel = document.createElement("select");
    sel.className = "prop-input";
    state.layers.forEach(l => {
      const opt = document.createElement("option");
      opt.value = l.id;
      opt.textContent = l.name;
      if (l.id === obj.layer) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => {
      pushUndo();
      obj.layer = parseInt(sel.value, 10);
      renderAll();
    });
    sel.addEventListener("keydown", (e) => e.stopPropagation());
    tdVal.appendChild(sel);
    tr.appendChild(tdLabel);
    tr.appendChild(tdVal);
    tbody.appendChild(tr);
  }

  const [H, V] = axisLabels();

  switch (obj.type) {
    case "point":
      addEditRow(H, obj.x, (v) => { obj.x = v; });
      addEditRow(V, obj.y, (v) => { obj.y = v; });
      break;
    case "line":
    case "constr":
      addEditRow(H + "1", obj.x1, (v) => { obj.x1 = v; });
      addEditRow(V + "1", obj.y1, (v) => { obj.y1 = v; });
      addEditRow(H + "2", obj.x2, (v) => { obj.x2 = v; });
      addEditRow(V + "2", obj.y2, (v) => { obj.y2 = v; });
      addInfoRow("Délka", Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1).toFixed(3));
      addInfoRow("Úhel", ((Math.atan2(obj.y2 - obj.y1, obj.x2 - obj.x1) * 180) / Math.PI).toFixed(2) + "°");
      break;
    case "circle":
      addEditRow("Střed " + H, obj.cx, (v) => { obj.cx = v; });
      addEditRow("Střed " + V, obj.cy, (v) => { obj.cy = v; });
      addEditRow("Poloměr", obj.r, (v) => { if (v > 0) obj.r = v; }, "0.01");
      addInfoRow("Průměr", (obj.r * 2).toFixed(3));
      addInfoRow("Obvod", (2 * Math.PI * obj.r).toFixed(3));
      break;
    case "arc":
      addEditRow("Střed " + H, obj.cx, (v) => { obj.cx = v; });
      addEditRow("Střed " + V, obj.cy, (v) => { obj.cy = v; });
      addEditRow("Poloměr", obj.r, (v) => { if (v > 0) obj.r = v; }, "0.01");
      addEditRow("Start°", (obj.startAngle * 180 / Math.PI), (v) => { obj.startAngle = v * Math.PI / 180; }, "1");
      addEditRow("Konec°", (obj.endAngle * 180 / Math.PI), (v) => { obj.endAngle = v * Math.PI / 180; }, "1");
      break;
    case "rect":
      addEditRow(H + "1", obj.x1, (v) => { obj.x1 = v; });
      addEditRow(V + "1", obj.y1, (v) => { obj.y1 = v; });
      addEditRow(H + "2", obj.x2, (v) => { obj.x2 = v; });
      addEditRow(V + "2", obj.y2, (v) => { obj.y2 = v; });
      addInfoRow("Šířka", Math.abs(obj.x2 - obj.x1).toFixed(3));
      addInfoRow("Výška", Math.abs(obj.y2 - obj.y1).toFixed(3));
      break;
    case "polyline": {
      const pn = obj.vertices.length;
      const pSegCnt = obj.closed ? pn : pn - 1;
      const selSeg = state.selectedSegment;
      const hasSelSeg = selSeg !== null && selSeg >= 0 && selSeg < pSegCnt;

      if (hasSelSeg) {
        // ── Segment detail mode ──
        const si = selSeg;
        const p1 = obj.vertices[si];
        const p2 = obj.vertices[(si + 1) % pn];
        const b = obj.bulges[si] || 0;

        addInfoRow("Režim", "Editace segmentu");
        addInfoRow("Segment", `${si + 1} / ${pSegCnt}`);
        addInfoRow("Typ", b === 0 ? "Úsečka" : "Oblouk");

        // Editable start vertex
        addEditRow(`Start ${H}`, p1.x, (val) => { p1.x = val; });
        addEditRow(`Start ${V}`, p1.y, (val) => { p1.y = val; });
        // Editable end vertex
        addEditRow(`Konec ${H}`, p2.x, (val) => { p2.x = val; });
        addEditRow(`Konec ${V}`, p2.y, (val) => { p2.y = val; });

        if (b === 0) {
          // Straight segment info
          const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const segAngle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
          addInfoRow("Délka", segLen.toFixed(3));
          addInfoRow("Úhel", segAngle.toFixed(2) + "°");
        } else {
          // Arc segment info
          const parc = bulgeToArc(p1, p2, b);
          if (parc) {
            const theta = 4 * Math.atan(Math.abs(b));
            addInfoRow("Poloměr", parc.r.toFixed(3));
            addInfoRow("Délka oblouku", (parc.r * theta).toFixed(3));
            addInfoRow("Střed X", parc.cx.toFixed(3));
            addInfoRow("Střed Z", parc.cy.toFixed(3));
          }
        }
        addEditRow("Bulge", b, (val) => { obj.bulges[si] = val; }, "0.01");

        // Button: back to polyline overview
        {
          const tr = document.createElement("tr");
          const td = document.createElement("td");
          td.colSpan = 2;
          td.style.paddingTop = "8px";
          const btn = document.createElement("button");
          btn.textContent = "← Zpět na konturu";
          btn.className = "prop-input";
          btn.style.cssText = `cursor:pointer;background:${COLORS.surfaceHover};color:${COLORS.text};border:1px solid ${COLORS.border};border-radius:4px;padding:4px 8px;width:100%`;
          btn.addEventListener("click", () => {
            state.selectedSegment = null;
            state._selectedSegmentObjIdx = null;
            updateProperties();
            renderAll();
          });
          td.appendChild(btn);
          tr.appendChild(td);
          tbody.appendChild(tr);
        }
      } else {
        // ── Polyline overview mode ──
        addInfoRow("Vrcholů", pn);
        addInfoRow("Uzavřená", obj.closed ? "Ano" : "Ne");
        // Total length
        let polyLen = 0;
        let arcCount = 0;
        for (let i = 0; i < pSegCnt; i++) {
          const pp1 = obj.vertices[i];
          const pp2 = obj.vertices[(i + 1) % pn];
          const pb = obj.bulges[i] || 0;
          if (pb === 0) {
            polyLen += Math.hypot(pp2.x - pp1.x, pp2.y - pp1.y);
          } else {
            arcCount++;
            const parc = bulgeToArc(pp1, pp2, pb);
            if (parc) {
              const theta = 4 * Math.atan(Math.abs(pb));
              polyLen += parc.r * theta;
            }
          }
        }
        addInfoRow("Celková délka", polyLen.toFixed(3));
        addInfoRow("Segmentů", pSegCnt + " (" + arcCount + " oblouků)");

        // Clickable segment list
        for (let i = 0; i < pSegCnt; i++) {
          const sp1 = obj.vertices[i];
          const sp2 = obj.vertices[(i + 1) % pn];
          const sb = obj.bulges[i] || 0;
          const segType = sb === 0 ? "úsečka" : "oblouk";
          const segLen = sb === 0
            ? Math.hypot(sp2.x - sp1.x, sp2.y - sp1.y)
            : (() => { const a = bulgeToArc(sp1, sp2, sb); return a ? a.r * 4 * Math.atan(Math.abs(sb)) : 0; })();

          const tr = document.createElement("tr");
          tr.style.cursor = "pointer";
          tr.title = "Klikněte pro výběr segmentu";
          const tdLabel = document.createElement("td");
          tdLabel.textContent = `S${i + 1}`;
          tdLabel.style.color = COLORS.primary;
          const tdVal = document.createElement("td");
          tdVal.textContent = `${segType}, ${segLen.toFixed(2)} mm`;
          tdVal.className = "prop-readonly";
          tr.appendChild(tdLabel);
          tr.appendChild(tdVal);
          tr.addEventListener("click", () => {
            state.selectedSegment = i;
            state._selectedSegmentObjIdx = state.selected;
            updateProperties();
            renderAll();
          });
          tr.addEventListener("mouseenter", () => { tr.style.background = COLORS.surfaceHover; });
          tr.addEventListener("mouseleave", () => { tr.style.background = ""; });
          tbody.appendChild(tr);
        }

        // Show vertices
        obj.vertices.forEach((v, vi) => {
          addEditRow(`V${vi + 1} X`, v.x, (val) => { v.x = val; });
          addEditRow(`V${vi + 1} Z`, v.y, (val) => { v.y = val; });
        });
      }
      break;
    }
  }
}

// ── Seznam průsečíků ──
/** Aktualizuje seznam průsečíků v panelu. */
export function updateIntersectionList() {
  const ul = document.getElementById("intersectionList");
  if (!ul) return;
  ul.innerHTML = "";
  if (state.intersections.length === 0) {
    ul.innerHTML =
      `<li style="color:${COLORS.textMuted};cursor:default">Žádné průsečíky</li>`;
    return;
  }
  state.intersections.forEach((pt, i) => {
    const li = document.createElement("li");
    const { H: _iH, V: _iV, Hp: _Hp, Vp: _Vp, fH, fV } = coordHelpers();
    const _hv = fH(pt.x);
    const _vv = fV(pt.y);
    li.innerHTML = `P${i + 1}:  ${_Hp}${_iH}=${_hv.toFixed(3)}  ${_Vp}${_iV}=${_vv.toFixed(3)} <span class="copy-hint">klik=kopírovat</span>`;
    li.title = "Klikněte pro zkopírování souřadnic";
    li.addEventListener("click", () => {
      const text = `${_Hp}${_iH}${_hv.toFixed(3)} ${_Vp}${_iV}${_vv.toFixed(3)}`;
      navigator.clipboard
        .writeText(text)
        .then(() => showToast(`Zkopírováno: ${text}`));
    });
    ul.appendChild(li);
  });
}

// ── Panely ──
/** @param {string} id  ID kontejneru panelu */
export function togglePanel(id) {
  const el = document.getElementById(id);
  const opening = el.style.display === "none";
  el.style.display = opening ? "" : "none";
  // Update header arrow
  const header = el.previousElementSibling;
  if (header && header.classList.contains('panel-header')) {
    const textNode = header.childNodes;
    for (const n of textNode) {
      if (n.nodeType === 3) {
        n.textContent = n.textContent.replace(/[▾▸]/, opening ? '▾' : '▸');
        break;
      }
    }
  }
  if (opening && id === 'cncPanel' && bridge.runCncExport) {
    bridge.runCncExport();
  }
  if (opening && id === 'intPanel' && bridge.calculateAllIntersections) {
    bridge.calculateAllIntersections();
  }
}

// ── Vrstvy ──
/** Aktualizuje seznam vrstev v panelu. */
export function updateLayerList() {
  const ul = document.getElementById("layerList");
  if (!ul) return;
  ul.innerHTML = "";
  state.layers.forEach((layer) => {
    const li = document.createElement("li");
    li.className = "layer-row" + (layer.id === state.activeLayer ? " active" : "");

    // Color dot
    const colorDot = document.createElement("input");
    colorDot.type = "color";
    colorDot.className = "layer-color-dot";
    colorDot.value = layer.color;
    colorDot.title = "Změnit barvu vrstvy";
    colorDot.addEventListener("input", () => {
      layer.color = colorDot.value;
      renderAllDebounced();
    });

    // Name (inline editable)
    const nameSpan = document.createElement("span");
    nameSpan.className = "layer-name";
    nameSpan.textContent = layer.name;
    nameSpan.title = "Klikněte pro přejmenování";
    nameSpan.addEventListener("dblclick", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "layer-name-input";
      input.value = layer.name;
      nameSpan.replaceWith(input);
      input.focus();
      input.select();
      const finish = () => {
        const val = input.value.trim();
        if (val) layer.name = val;
        input.replaceWith(nameSpan);
        nameSpan.textContent = layer.name;
      };
      input.addEventListener("blur", finish);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") input.blur();
        if (e.key === "Escape") { input.value = layer.name; input.blur(); }
        e.stopPropagation();
      });
    });

    // Visibility toggle
    const visBtn = document.createElement("button");
    visBtn.className = "layer-icon-btn" + (layer.visible ? "" : " off");
    visBtn.innerHTML = layer.visible ? "👁" : "👁‍🗨";
    visBtn.title = layer.visible ? "Skrýt vrstvu" : "Zobrazit vrstvu";
    visBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      layer.visible = !layer.visible;
      updateLayerList();
      renderAll();
    });

    // Lock toggle
    const lockBtn = document.createElement("button");
    lockBtn.className = "layer-icon-btn" + (layer.locked ? " on" : "");
    lockBtn.innerHTML = layer.locked ? "🔒" : "🔓";
    lockBtn.title = layer.locked ? "Odemknout vrstvu" : "Zamknout vrstvu";
    lockBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      layer.locked = !layer.locked;
      updateLayerList();
    });

    // Active radio
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "activeLayer";
    radio.className = "layer-radio";
    radio.checked = layer.id === state.activeLayer;
    radio.title = "Nastavit jako aktivní vrstvu";
    radio.addEventListener("change", () => {
      state.activeLayer = layer.id;
      updateLayerList();
    });

    li.appendChild(radio);
    li.appendChild(colorDot);
    li.appendChild(nameSpan);
    li.appendChild(visBtn);
    li.appendChild(lockBtn);
    ul.appendChild(li);
  });
}

// Layer panel buttons
document.getElementById("btnAddLayer").addEventListener("click", () => {
  const id = state.nextLayerId++;
  state.layers.push({ id, name: `Vrstva ${id}`, color: COLORS.text, visible: true, locked: false });
  updateLayerList();
  showToast(`Vrstva ${id} přidána`);
});

document.getElementById("btnDelLayer").addEventListener("click", () => {
  if (state.activeLayer === 0) {
    showToast("Nelze smazat vrstvu 0 (Kontura)");
    return;
  }
  const idx = state.layers.findIndex(l => l.id === state.activeLayer);
  if (idx === -1) return;
  const delId = state.activeLayer;
  state.layers.splice(idx, 1);
  // Move objects from deleted layer to layer 0
  state.objects.forEach(obj => { if (obj.layer === delId) obj.layer = 0; });
  state.activeLayer = 0;
  updateLayerList();
  updateObjectList();
  renderAll();
  showToast("Vrstva smazána, objekty přesunuty na vrstvu Kontura");
});

// ── Toolbar ──
document.querySelectorAll("[data-tool]").forEach((btn) => {
  btn.addEventListener("click", () => {
    // Měření: pokud je výběr → okamžitě změřit
    if (btn.dataset.tool === 'measure' && bridge.measureSelection && bridge.measureSelection()) return;
    // Tečna: pokud je výběr → okamžitě provést
    if (btn.dataset.tool === 'tangent' && bridge.tangentFromSelection && bridge.tangentFromSelection()) return;
    // Offset: pokud je výběr → okamžitě provést
    if (btn.dataset.tool === 'offset' && bridge.offsetFromSelection && bridge.offsetFromSelection()) return;
    // Oříznutí: pokud je výběr → okamžitě provést
    if (btn.dataset.tool === 'trim' && bridge.trimFromSelection && bridge.trimFromSelection()) return;
    // Prodloužení: pokud je výběr → okamžitě provést
    if (btn.dataset.tool === 'extend' && bridge.extendFromSelection && bridge.extendFromSelection()) return;
    // Zaoblení: pokud je výběr → okamžitě provést
    if (btn.dataset.tool === 'fillet' && bridge.filletFromSelection && bridge.filletFromSelection()) return;
    // Kolmost: pokud je výběr → okamžitě provést
    if (btn.dataset.tool === 'perp' && bridge.perpFromSelection && bridge.perpFromSelection()) return;
    // Vodorovnost: pokud je výběr → okamžitě provést
    if (btn.dataset.tool === 'horizontal' && bridge.horizontalFromSelection && bridge.horizontalFromSelection()) return;
    // Rovnoběžka: pokud je výběr → okamžitě provést
    if (btn.dataset.tool === 'parallel' && bridge.parallelFromSelection && bridge.parallelFromSelection()) return;
    setTool(btn.dataset.tool);
  });
});

/** @param {import('./types.js').ToolType} tool */
export function setTool(tool) {
  // Auto-uložit rozpracovanou konturu při přepnutí nástroje
  if (state.tool === 'polyline' && state.drawing && state.tempPoints.length >= 2) {
    const bulges = state._polylineBulges || [];
    while (bulges.length < state.tempPoints.length - 1) bulges.push(0);
    pushUndo();
    addObject({
      type: 'polyline',
      vertices: state.tempPoints.slice(),
      bulges: bulges.slice(0, state.tempPoints.length - 1),
      closed: false,
      name: `Kontura ${state.nextId}`,
    });
    showToast(`Kontura uložena (${state.tempPoints.length} bodů)`);
  }
  state.tool = tool;
  resetDrawingState();
  if (state.dragging) {
    const obj = state.objects[state.dragObjIdx];
    if (obj && state.dragObjSnapshot) {
      Object.assign(obj, JSON.parse(state.dragObjSnapshot));
    }
    state.dragging = false;
    state.dragObjIdx = null;
  }
  drawCanvas.style.cursor = tool === "move" ? "move" : "crosshair";
  document
    .querySelectorAll("[data-tool]")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.tool === tool),
    );
  document.getElementById("statusTool").textContent =
    "Nástroj: " + toolLabel(tool);
  // Sync mobile measure button
  const mmBtn = document.getElementById("mobileMeasure");
  if (mmBtn) mmBtn.classList.toggle("active", tool === "measure");
  // Aktualizovat mobilní coord bar s novým nástrojem
  if (bridge.updateMobileCoords) {
    bridge.updateMobileCoords(state.mouse.x, state.mouse.y);
  }
  resetHint();
  renderAll();
}

// ── Hinty ──
/** @param {string} text */
export function setHint(text) {
  document.getElementById("statusHint").textContent = text;
}

/** Obnoví nápovědu pro aktuální nástroj. */
export function resetHint() {
  const hints = {
    select: "Klikněte pro výběr (další klik = přidat, znovu = odebrat)",
    move: "Klikněte na objekt pro přesun",
    point: "Klikněte pro umístění bodu",
    line: "Klikněte na počáteční bod úsečky",
    constr: "Klikněte na počáteční bod konstrukční čáry",
    circle: "Klikněte na střed kružnice",
    arc: "Klikněte na střed oblouku",
    rect: "Klikněte na první roh obdélníku",    polyline: "Klepněte na první bod kontury",    measure: "Klepněte na objekt pro info, nebo na prázdné místo pro měření",
    tangent: "Klepněte na bod nebo na první kružnici",
    offset: "Klepněte na objekt pro offset",
    snapPoint: "Klepněte na koncový bod objektu pro přichycení",
    horizontal: "Klepněte na úsečku/segment – vyrovná se vodorovně",
    perp: "Klepněte na úsečku/segment – vyrovná se svisle (kolmo)",
    parallel: "Klepněte na úsečku kterou chcete otočit → pak na referenční úsečku pro rovnoběžnost",
  };
  setHint(hints[state.tool] || "");
}

// ── Snap k bodům tlačítko ──
/** Aktualizuje stav tlačítka snap k bodům. */
export function updateSnapPtsBtn() {
  const btn = document.getElementById("btnSnapPts");
  if (!btn) return;
  const ind = btn.querySelector(".snap-ind");
  ind.className =
    "snap-ind " + (state.snapToPoints ? "snap-on" : "snap-off");
  // Sync mobile snap button
  const mobileSnap = document.getElementById("mobileSnap");
  if (mobileSnap) mobileSnap.classList.toggle("snap-active", state.snapToPoints);
}

const btnSnapPts = document.getElementById("btnSnapPts");
if (btnSnapPts) {
  btnSnapPts.addEventListener("click", () => {
    state.snapToPoints = !state.snapToPoints;
    updateSnapPtsBtn();
    renderAll();
    showToast(state.snapToPoints ? "Snap k bodům: ON" : "Snap k bodům: OFF");
  });
}

// ── Grid Snap tlačítko ──
/** Aktualizuje stav tlačítka snap k mřížce. */
export function updateSnapGridBtn() {
  document.getElementById("btnSnapGrid").classList.toggle("active", state.snapToGrid);
}

document.getElementById("btnSnapGrid").addEventListener("click", () => {
  state.snapToGrid = !state.snapToGrid;
  updateSnapGridBtn();
  renderAll();
  showToast(state.snapToGrid ? `Snap na mřížku: ON (${state.gridSize})` : "Snap na mřížku: OFF");
});

document.getElementById("btnSnapGrid").addEventListener("contextmenu", (e) => {
  e.preventDefault();
  showGridSizeDialog();
});

// ── Angle Snap tlačítko ──
/** Aktualizuje stav tlačítka úhlového snapu. */
export function updateAngleSnapBtn() {
  document.getElementById("btnAngleSnap").classList.toggle("active", state.angleSnap);
}

document.getElementById("btnAngleSnap").addEventListener("click", () => {
  state.angleSnap = !state.angleSnap;
  updateAngleSnapBtn();
  renderAll();
  showToast(state.angleSnap ? `Úhlový snap: ON (${state.angleSnapStep}°)` : "Úhlový snap: OFF");
});

document.getElementById("btnAngleSnap").addEventListener("contextmenu", (e) => {
  e.preventDefault();
  showAngleSnapDialog();
});

// ── Kóty tlačítko (3 stavy: all → intersections → none) ──
/** Aktualizuje stav tlačítka kót. */
export function updateDimsBtn() {
  const btn = document.getElementById("btnDims");
  btn.textContent = '📐 Kóty';
  btn.classList.remove("active");
  btn.style.background = '';
  btn.style.color = '';
  btn.style.borderColor = '';
  if (state.showDimensions === 'all') {
    btn.classList.add("active");
  } else if (state.showDimensions === 'intersections') {
    btn.style.background = COLORS.dimension;
    btn.style.color = '#1e1e2e';
    btn.style.borderColor = COLORS.dimension;
  }
  // 'none' → výchozí neaktivní vzhled
}

document.getElementById("btnDims").addEventListener("click", () => {
  // Cyklus: all → intersections → none → all
  const cycle = { all: 'intersections', intersections: 'none', none: 'all' };
  state.showDimensions = cycle[state.showDimensions] || 'all';
  const labels = { all: 'Kóty: vše', intersections: 'Kóty: pouze průsečíky', none: 'Kóty: skryté' };
  showToast(labels[state.showDimensions]);
  updateDimsBtn();
  renderAll();
});

// ── Smazat kóty tlačítko ──
document.getElementById("btnDeleteDims").addEventListener("click", () => {
  const dimCount = state.objects.filter(o => o.isDimension || o.isCoordLabel).length;
  if (dimCount === 0) {
    showToast("Žádné kóty ke smazání");
    return;
  }
  pushUndo();
  state.objects = state.objects.filter(o => !o.isDimension && !o.isCoordLabel);
  state.selected = null;
  state.multiSelected.clear();
  state.selectedPoint = null;
  showToast(`Smazáno ${dimCount} kót`);
  if (bridge.updateObjectList) bridge.updateObjectList();
  renderAll();
});

// ── Coord Mode tlačítko (ABS/INC) ──
/** Aktualizuje zobrazení módu souřadnic (ABS/INC). */
export function updateCoordModeBtn() {
  const btn = document.getElementById("btnCoordMode");
  const isInc = state.coordMode === 'inc';
  const label = isInc ? 'INC' : 'ABS';
  btn.textContent = label;
  btn.classList.toggle('active', isInc);
  if (isInc) {
    btn.style.background = COLORS.selected;
    btn.style.color = COLORS.bgDark;
  } else {
    btn.style.background = '';
    btn.style.color = '';
  }
}

/** Přepne mód souřadnic ABS ↔ INC. */
export function toggleCoordMode() {
  state.coordMode = state.coordMode === 'abs' ? 'inc' : 'abs';
  updateCoordModeBtn();
  renderAll();
  showToast(state.coordMode === 'inc' ? 'Inkrementální souřadnice (INC)' : 'Absolutní souřadnice (ABS)');
}

document.getElementById("btnCoordMode").addEventListener("click", toggleCoordMode);

// ── X Display Mode tlačítko (Poloměr/Průměr) ──
/** Aktualizuje zobrazení režimu osy X (R/⌀). */
export function updateXDisplayBtn() {
  const btn = document.getElementById("btnXDisplay");
  const isDiam = state.xDisplayMode === 'diameter';
  btn.textContent = isDiam ? '⌀' : 'R';
  btn.classList.toggle('active', isDiam);
  if (isDiam) {
    btn.style.background = COLORS.delete;
    btn.style.color = COLORS.bgDark;
  } else {
    btn.style.background = '';
    btn.style.color = '';
  }
}

/** Přepne režim osy X: Poloměr ↔ Průměr. */
export function toggleXDisplay() {
  state.xDisplayMode = state.xDisplayMode === 'radius' ? 'diameter' : 'radius';
  updateXDisplayBtn();
  renderAll();
  showToast(state.xDisplayMode === 'diameter' ? 'Osa X: Průměr (⌀)' : 'Osa X: Poloměr (R)');
}

document.getElementById("btnXDisplay").addEventListener("click", toggleXDisplay);

// ── Machine Type tlačítko (Soustruh/Karusel) ──
/** Aktualizuje zobrazení typu stroje. */
export function updateMachineTypeBtn() {
  const btn = document.getElementById("btnMachineType");
  const isKarusel = state.machineType === 'karusel';
  btn.textContent = isKarusel ? '⚙ Karusel' : '⚙ Soustruh';
  btn.classList.toggle('active', isKarusel);
  if (isKarusel) {
    btn.style.background = COLORS.dimension;
    btn.style.color = COLORS.bgDark;
  } else {
    btn.style.background = '';
    btn.style.color = '';
  }
}

/** Přepne typ stroje Soustruh ↔ Karusel (prohodí osy). */
export function toggleMachineType() {
  state.machineType = state.machineType === 'soustruh' ? 'karusel' : 'soustruh';
  updateMachineTypeBtn();
  renderAll();
  showToast(state.machineType === 'karusel'
    ? 'Karusel – X vodorovně, Z svisle'
    : 'Soustruh – Z vodorovně, X svisle');
}

document.getElementById("btnMachineType").addEventListener("click", toggleMachineType);

// ── Ref tlačítko – klik na canvas nastaví referenční bod ──
let _refPickActive = false;
document.getElementById("btnSetRef").addEventListener("click", () => {
  if (_refPickActive) return;
  _refPickActive = true;
  showToast("Klikněte na canvas pro nastavení referenčního bodu...");
  const canvas = document.getElementById("drawCanvas");
  function applyRef(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    let [wx, wy] = screenToWorld(sx, sy);
    if (state.snapToPoints) [wx, wy] = snapPt(wx, wy);
    state.incReference = { x: wx, y: wy };
    if (state.coordMode !== 'inc') {
      state.coordMode = 'inc';
      updateCoordModeBtn();
    }
    renderAll();
    showToast(`Reference: ${fmtStatusCoords(wx, wy)}`);
    canvas.removeEventListener("click", onRefPick);
    canvas.removeEventListener("touchend", onRefTouch);
    _refPickActive = false;
  }
  function onRefPick(e) {
    applyRef(e.clientX, e.clientY);
  }
  function onRefTouch(e) {
    if (e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      applyRef(t.clientX, t.clientY);
      e.preventDefault();
    }
  }
  canvas.addEventListener("click", onRefPick, { once: true });
  canvas.addEventListener("touchend", onRefTouch, { once: true });
});

// ── Undo/Redo tlačítka ──
document.getElementById("btnUndo").addEventListener("click", undo);
document.getElementById("btnRedo").addEventListener("click", redo);

// ── Průsečíky (automaticky při rozbalení panelu) ──
const _btnCalcInt = document.getElementById("btnCalcInt");
if (_btnCalcInt) _btnCalcInt.addEventListener("click", () => { if (bridge.calculateAllIntersections) bridge.calculateAllIntersections(); });

// ── Smazat vše ──
document.getElementById("btnClearAll").addEventListener("click", () => {
  if (confirm("Opravdu smazat všechny objekty?")) {
    pushUndo();
    state.objects = [];
    state.selected = null;
    state.selectedPoint = null;
    state.intersections = [];
    state.nextId = 1;
    updateObjectList();
    updateProperties();
    updateIntersectionList();
    document.getElementById("cncOutput").textContent =
      "Klikněte 📋 CNC Export";
    renderAll();
  }
});

// ── Kalkulačka – popup ──
/** Otevře vestavnou kalkulačku. */
export function openCalculator() {
  const bodyHTML = `
        <div class="calc-history" id="calcHistory"></div>
        <div class="calc-expr" id="calcExpr">&nbsp;</div>
        <input type="text" id="calcDisplay" placeholder="0">
        <div class="calc-buttons">
          <button class="calc-btn" data-val="7">7</button>
          <button class="calc-btn" data-val="8">8</button>
          <button class="calc-btn" data-val="9">9</button>
          <button class="calc-btn calc-op" data-val="/">÷</button>
          <button class="calc-btn" data-val="4">4</button>
          <button class="calc-btn" data-val="5">5</button>
          <button class="calc-btn" data-val="6">6</button>
          <button class="calc-btn calc-op" data-val="*">×</button>
          <button class="calc-btn" data-val="1">1</button>
          <button class="calc-btn" data-val="2">2</button>
          <button class="calc-btn" data-val="3">3</button>
          <button class="calc-btn calc-op" data-val="-">−</button>
          <button class="calc-btn" data-val="0">0</button>
          <button class="calc-btn" data-val=".">.</button>
          <button class="calc-btn calc-eq" data-val="=">=</button>
          <button class="calc-btn calc-op" data-val="+">+</button>
          <button class="calc-btn calc-fn" data-val="sqrt">√</button>
          <button class="calc-btn calc-fn" data-val="sin">sin</button>
          <button class="calc-btn calc-fn" data-val="cos">cos</button>
          <button class="calc-btn calc-fn" data-val="tan">tan</button>
          <button class="calc-btn calc-fn" data-val="pi">π</button>
          <button class="calc-btn calc-fn" data-val="pow">x²</button>
          <button class="calc-btn calc-fn" data-val="ans">ANS</button>
          <button class="calc-btn calc-fn" data-val="%">%</button>
          <button class="calc-btn calc-clear" data-val="C">C</button>
          <button class="calc-btn calc-clear" data-val="CE">←</button>
          <button class="calc-btn calc-copy" data-val="copy">📋</button>
          <button class="calc-btn calc-fn" data-val="atan">atan</button>
          <button class="calc-btn calc-fn" data-val="(">(</button>
          <button class="calc-btn calc-fn" data-val=")">)</button>
          <button class="calc-btn calc-fn" data-val="asin">asin</button>
          <button class="calc-btn calc-fn" data-val="acos">acos</button>
        </div>`;
  const overlay = makeOverlay("calc", "🔢 Kalkulačka", bodyHTML, "calc-window");
  if (!overlay) return;

  const display = overlay.querySelector("#calcDisplay");
  const exprDisplay = overlay.querySelector("#calcExpr");
  const historyEl = overlay.querySelector("#calcHistory");
  let expr = "";
  let lastAnswer = 0;
  let history = [];
  getMeta('calcHistory').then(h => {
    if (Array.isArray(h)) { history = h; renderHistory(); }
  });

  function updateDisplay(text) { display.value = text || "0"; }
  function updateExprDisplay(text) { exprDisplay.textContent = text || "\u00a0"; }

  function saveHistory() {
    setMeta('calcHistory', history);
  }

  function addHistory(expression, result) {
    history.push({ expr: expression, result });
    if (history.length > 50) history.shift();
    saveHistory();
    renderHistory();
  }

  function removeHistoryItem(index) {
    history.splice(index, 1);
    saveHistory();
    renderHistory();
  }

  function renderHistory() {
    historyEl.innerHTML = "";
    history.forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "calc-history-item";
      const fullExpr = document.createElement("span");
      fullExpr.className = "calc-hist-full";
      fullExpr.textContent = item.expr + " = " + item.result;
      row.appendChild(fullExpr);
      const delBtn = document.createElement("button");
      delBtn.className = "calc-hist-del";
      delBtn.textContent = "✕";
      delBtn.title = "Smazat";
      delBtn.addEventListener("click", (e) => { e.stopPropagation(); removeHistoryItem(i); });
      row.appendChild(delBtn);
      row.addEventListener("click", () => {
        expr = String(item.result);
        updateDisplay(expr);
        updateExprDisplay("← " + item.result);
      });
      historyEl.appendChild(row);
    });
    // Auto-scroll dolů k nejnovějšímu
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  // Načíst historii při otevření
  renderHistory();

  function formatExpr(e) {
    return e.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−");
  }

  function safeEval(expression) {
    let e = expression
      .replace(/π/g, String(Math.PI))
      .replace(/×/g, "*").replace(/−/g, "-").replace(/÷/g, "/");
    if (!/^[\d+\-*/().eE\s%]*$/.test(e)) return null;
    // Handle % as /100
    e = e.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
    try {
      const r = _parseMathExpr(e);
      return (typeof r === "number" && isFinite(r)) ? r : null;
    } catch (_) { return null; }
  }

  function handleFn(fn) {
    const cur = safeEval(expr);
    if (cur === null) return;
    let r;
    const fnExpr = fn + "(" + formatExpr(expr) + ")";
    switch (fn) {
      case "sqrt": r = Math.sqrt(cur); break;
      case "sin":  r = Math.sin(cur * Math.PI / 180); break;
      case "cos":  r = Math.cos(cur * Math.PI / 180); break;
      case "tan":  r = Math.tan(cur * Math.PI / 180); break;
      case "atan": r = Math.atan(cur) * 180 / Math.PI; break;
      case "asin": r = (cur >= -1 && cur <= 1) ? Math.asin(cur) * 180 / Math.PI : NaN; break;
      case "acos": r = (cur >= -1 && cur <= 1) ? Math.acos(cur) * 180 / Math.PI : NaN; break;
      case "pow":  r = cur * cur; break;
      default: return;
    }
    if (typeof r !== "number" || !isFinite(r)) { updateDisplay("Chyba"); expr = ""; return; }
    const result = parseFloat(r.toFixed(8));
    addHistory(fnExpr, result);
    updateExprDisplay(fnExpr + " = " + result);
    lastAnswer = result;
    expr = String(result);
    updateDisplay(expr);
  }

  function doEval() {
    const displayExpr = formatExpr(expr);
    const r = safeEval(expr);
    if (r === null) { updateDisplay("Chyba"); return; }
    const result = parseFloat(r.toFixed(8));
    addHistory(displayExpr, result);
    lastAnswer = result;
    // Zobrazit celý zápis: výraz = výsledek
    updateExprDisplay(displayExpr + " = " + result);
    expr = String(result);
    updateDisplay(expr);
  }

  overlay.querySelectorAll(".calc-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const val = btn.dataset.val;
      switch (val) {
        case "C":    expr = ""; updateDisplay("0"); updateExprDisplay(""); break;
        case "CE":   expr = expr.slice(0, -1); updateDisplay(expr); break;
        case "=":    doEval(); break;
        case "copy":  navigator.clipboard.writeText(display.value).then(() => showToast("Zkopírováno: " + display.value)); break;
        case "pi":    expr += String(Math.PI); updateDisplay(expr); break;
        case "ans":   expr += String(lastAnswer); updateDisplay(expr); break;
        case "%":     expr += "%"; updateDisplay(expr); break;
        case "sqrt": case "sin": case "cos": case "tan": case "atan": case "asin": case "acos": case "pow":
          handleFn(val); break;
        default: expr += val; updateDisplay(expr);
      }
    });
  });

  // Keyboard input
  display.removeAttribute("readonly");
  display.addEventListener("input", () => {
    expr = display.value;
  });
  display.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); doEval(); }
    if (e.key === "Escape") { expr = ""; updateDisplay("0"); updateExprDisplay(""); }
    e.stopPropagation();
  });
}

// ── Trigonometrie – popup ──
function openTrigCalc() {
  const bodyHTML = `
        <div class="trig-svg-wrap">
          <svg viewBox="0 0 300 220" xmlns="http://www.w3.org/2000/svg">
            <!-- Triangle -->
            <polygon points="40,190 260,190 260,40" fill="none" stroke="${COLORS.border}" stroke-width="2"/>
            <!-- Right angle marker -->
            <polyline points="240,190 240,170 260,170" fill="none" stroke="${COLORS.textMuted}" stroke-width="1.5"/>
            <!-- Side labels -->
            <text x="150" y="210" text-anchor="middle" fill="${COLORS.dimension}" font-size="16" font-weight="bold" font-family="Consolas">b</text>
            <text x="275" y="120" text-anchor="start" fill="${COLORS.delete}" font-size="16" font-weight="bold" font-family="Consolas">a</text>
            <text x="140" y="105" text-anchor="end" fill="${COLORS.primary}" font-size="16" font-weight="bold" font-family="Consolas">c</text>
            <!-- Angle arcs -->
            <path d="M 70,190 A 30,30 0 0,0 56,170" fill="none" stroke="${COLORS.delete}" stroke-width="1.5"/>
            <text x="78" y="178" fill="${COLORS.delete}" font-size="13" font-family="Consolas">α</text>
            <path d="M 260,65 A 25,25 0 0,0 243,53" fill="none" stroke="${COLORS.dimension}" stroke-width="1.5"/>
            <text x="244" y="75" fill="${COLORS.dimension}" font-size="13" font-family="Consolas">β</text>
            <text x="248" y="195" fill="${COLORS.primary}" font-size="12" font-family="Consolas">90°</text>
          </svg>
        </div>
        <div class="trig-fields">
          <div class="trig-col">
            <h4>Strany</h4>
            <div class="trig-field">
              <label class="label-a">a</label>
              <input type="text" id="trigA" inputmode="text" placeholder="protilehlá">
              <span class="trig-unit">mm</span>
            </div>
            <div class="trig-field">
              <label class="label-b">b</label>
              <input type="text" id="trigB" inputmode="text" placeholder="přilehlá">
              <span class="trig-unit">mm</span>
            </div>
            <div class="trig-field">
              <label class="label-c">c</label>
              <input type="text" id="trigC" inputmode="text" placeholder="přepona">
              <span class="trig-unit">mm</span>
            </div>
          </div>
          <div class="trig-col">
            <h4>Úhly</h4>
            <div class="trig-field">
              <label class="label-alpha">α</label>
              <input type="text" id="trigAlpha" inputmode="text" placeholder="úhel u a">
              <span class="trig-unit">°</span>
            </div>
            <div class="trig-field">
              <label class="label-beta">β</label>
              <input type="text" id="trigBeta" inputmode="text" placeholder="úhel u b">
              <span class="trig-unit">°</span>
            </div>
            <div class="trig-field">
              <label class="label-gamma">γ</label>
              <input type="text" id="trigGamma" value="90" disabled>
              <span class="trig-unit">° ✓</span>
            </div>
          </div>
        </div>
        <div class="trig-actions">
          <button class="trig-btn-solve">✅ Vypočítat</button>
          <button class="trig-btn-clear">🗑 Vymazat</button>
          <button class="trig-btn-copy">📋 Kopírovat</button>
        </div>
        <div class="trig-info">Zadejte 2 hodnoty – výpočet proběhne automaticky<br><small>Funkce: sin, cos, tan, sqrt, abs, log · Příklad: sqrt(2)*50, atan(1)</small></div>
        <div class="trig-history" id="trigHistory"></div>`;
  const overlay = makeOverlay("trig", "📐 Trigonometrie – pravý trojúhelník", bodyHTML, "trig-window");
  if (!overlay) return;

  const inpA = overlay.querySelector("#trigA");
  const inpB = overlay.querySelector("#trigB");
  const inpC = overlay.querySelector("#trigC");
  const inpAlpha = overlay.querySelector("#trigAlpha");
  const inpBeta  = overlay.querySelector("#trigBeta");
  const inputs = [inpA, inpB, inpC, inpAlpha, inpBeta];
  const deg = Math.PI / 180;

  function val(inp) {
    const v = safeEvalMath(inp.value);
    return (isFinite(v) && v > 0) ? v : null;
  }

  function setComputed(inp, v) {
    inp.value = parseFloat(v.toFixed(4));
    inp.classList.add("computed");
  }

  function clearComputed() {
    inputs.forEach(i => i.classList.remove("computed"));
  }

  function solve() {
    clearComputed();
    let a = val(inpA), b = val(inpB), c = val(inpC);
    let alpha = val(inpAlpha), beta = val(inpBeta);

    // Count known values
    const known = [a, b, c, alpha, beta].filter(v => v !== null).length;
    if (known < 2) return;

    // Angles must be < 90 for non-right angle
    if (alpha !== null && alpha >= 90) return;
    if (beta !== null && beta >= 90) return;

    // If both angles known → complement
    if (alpha !== null && beta !== null) {
      // Check consistency
      if (Math.abs(alpha + beta - 90) > 0.01) return;
    }

    // Derive missing angle from one angle
    if (alpha !== null && beta === null) { beta = 90 - alpha; setComputed(inpBeta, beta); }
    if (beta !== null && alpha === null) { alpha = 90 - beta; setComputed(inpAlpha, alpha); }

    // Two sides known → Pythagoras + trig
    if (a !== null && b !== null && c === null) {
      c = Math.sqrt(a * a + b * b);
      setComputed(inpC, c);
    }
    if (a !== null && c !== null && b === null) {
      if (c <= a) return;
      b = Math.sqrt(c * c - a * a);
      setComputed(inpB, b);
    }
    if (b !== null && c !== null && a === null) {
      if (c <= b) return;
      a = Math.sqrt(c * c - b * b);
      setComputed(inpA, a);
    }

    // From sides → angles
    if (a !== null && c !== null && alpha === null) {
      alpha = Math.asin(a / c) / deg;
      setComputed(inpAlpha, alpha);
      if (beta === null) { beta = 90 - alpha; setComputed(inpBeta, beta); }
    }
    if (b !== null && c !== null && beta === null) {
      beta = Math.asin(b / c) / deg;
      setComputed(inpBeta, beta);
      if (alpha === null) { alpha = 90 - beta; setComputed(inpAlpha, alpha); }
    }
    if (a !== null && b !== null && alpha === null) {
      alpha = Math.atan(a / b) / deg;
      setComputed(inpAlpha, alpha);
      if (beta === null) { beta = 90 - alpha; setComputed(inpBeta, beta); }
    }

    // One side + one angle → all sides
    if (alpha !== null && beta !== null) {
      const sinA = Math.sin(alpha * deg);
      const cosA = Math.cos(alpha * deg);
      if (a !== null && b === null) { b = a / Math.tan(alpha * deg); setComputed(inpB, b); }
      if (a !== null && c === null) { c = a / sinA; setComputed(inpC, c); }
      if (b !== null && a === null) { a = b * Math.tan(alpha * deg); setComputed(inpA, a); }
      if (b !== null && c === null) { c = b / cosA; setComputed(inpC, c); }
      if (c !== null && a === null) { a = c * sinA; setComputed(inpA, a); }
      if (c !== null && b === null) { b = c * cosA; setComputed(inpB, b); }
    }
  }

  overlay.querySelector(".trig-btn-solve").addEventListener("click", solve);

  const trigHistoryEl = overlay.querySelector("#trigHistory");
  const trigHistory = [];

  function addTrigHistory() {
    const a = val(inpA), b = val(inpB), c = val(inpC);
    const alpha = val(inpAlpha), beta = val(inpBeta);
    if (!a || !b || !c || !alpha || !beta) return;
    const entry = `a=${inpA.value}  b=${inpB.value}  c=${inpC.value}  α=${inpAlpha.value}°  β=${inpBeta.value}°  γ=90°`;
    trigHistory.unshift(entry);
    if (trigHistory.length > 10) trigHistory.pop();
    trigHistoryEl.innerHTML = "";
    for (const item of trigHistory) {
      const row = document.createElement("div");
      row.className = "calc-history-item";
      row.textContent = item;
      row.addEventListener("click", () => {
        navigator.clipboard.writeText(item).then(() => showToast("Zkopírováno"));
      });
      trigHistoryEl.appendChild(row);
    }
  }

  overlay.querySelector(".trig-btn-clear").addEventListener("click", () => {
    // Save current result to history before clearing
    addTrigHistory();
    inputs.forEach(i => { i.value = ""; i.classList.remove("computed"); });
  });

  overlay.querySelector(".trig-btn-copy").addEventListener("click", () => {
    const parts = [];
    if (val(inpA)) parts.push("a=" + inpA.value);
    if (val(inpB)) parts.push("b=" + inpB.value);
    if (val(inpC)) parts.push("c=" + inpC.value);
    if (val(inpAlpha)) parts.push("α=" + inpAlpha.value + "°");
    if (val(inpBeta)) parts.push("β=" + inpBeta.value + "°");
    parts.push("γ=90°");
    const text = parts.join("  ");
    navigator.clipboard.writeText(text).then(() => showToast("Zkopírováno"));
    addTrigHistory();
  });
}

document.getElementById("btnOpenCalc").addEventListener("click", openCalculator);
document.getElementById("btnOpenTrig").addEventListener("click", openTrigCalc);
document.getElementById("btnOpenCutting").addEventListener("click", openCuttingCalc);
document.getElementById("btnOpenTaper").addEventListener("click", openTaperCalc);
document.getElementById("btnOpenThread").addEventListener("click", openThreadCalc);
document.getElementById("btnOpenConvert").addEventListener("click", openConvertCalc);
document.getElementById("btnOpenWeight").addEventListener("click", openWeightCalc);
document.getElementById("btnOpenTolerance").addEventListener("click", openToleranceCalc);
document.getElementById("btnOpenRoughness").addEventListener("click", openRoughnessCalc);
document.getElementById("btnOpenInserts").addEventListener("click", openInsertCalc);

// ── Dialog: Grid Size ──
/** Otevře dialog pro nastavení velikosti mřížky. */
export function showGridSizeDialog() {
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3># Velikost mřížky</h3>
      <label>Velikost kroku (mm):</label>
      <input type="number" id="dlgGridSize" step="0.1" min="0.1" value="${state.gridSize}" inputmode="decimal" autofocus>
      <div class="btn-row">
        <button class="btn-cancel btn-cancel-overlay">Zrušit</button>
        <button class="btn-ok" id="dlgGridOk">OK</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const inp = overlay.querySelector("#dlgGridSize");
  inp.focus();
  inp.select();
  function confirm() {
    const v = safeEvalMath(inp.value);
    if (!isNaN(v) && v > 0) {
      state.gridSize = v;
      showToast(`Mřížka: ${v} mm`);
    }
    overlay.remove();
  }
  overlay.querySelector("#dlgGridOk").addEventListener("click", confirm);
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirm();
    if (e.key === "Escape") overlay.remove();
    e.stopPropagation();
  });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
}

// ── Dialog: Angle Snap Step ──
/** Otevře dialog pro nastavení kroku úhlového snapu. */
export function showAngleSnapDialog() {
  const overlay = document.createElement("div");
  overlay.className = "input-overlay";
  overlay.innerHTML = `
    <div class="input-dialog">
      <h3>∠ Krok úhlového snapu</h3>
      <div class="btn-row" style="flex-wrap:wrap;gap:6px;margin-bottom:12px;">
        <button class="btn-cancel angle-preset" data-deg="15">15°</button>
        <button class="btn-cancel angle-preset" data-deg="30">30°</button>
        <button class="btn-cancel angle-preset" data-deg="45">45°</button>
        <button class="btn-cancel angle-preset" data-deg="90">90°</button>
      </div>
      <label>Vlastní krok (°):</label>
      <input type="number" id="dlgAngleStep" step="1" min="1" max="180" value="${state.angleSnapStep}" inputmode="decimal" autofocus>
      <label style="margin-top:8px">Tolerance přichycení (°):</label>
      <input type="number" id="dlgAngleTol" step="1" min="1" max="45" value="${state.angleSnapTolerance}" inputmode="decimal">
      <div class="btn-row">
        <button class="btn-cancel btn-cancel-overlay">Zrušit</button>
        <button class="btn-ok" id="dlgAngleOk">OK</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const inp = overlay.querySelector("#dlgAngleStep");
  inp.focus();
  inp.select();

  overlay.querySelectorAll(".angle-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      const deg = parseInt(btn.dataset.deg);
      state.angleSnapStep = deg;
      showToast(`Úhlový snap: ${deg}°`);
      overlay.remove();
    });
  });

  function confirm() {
    const v = safeEvalMath(inp.value);
    const tolInp = overlay.querySelector("#dlgAngleTol");
    const tol = safeEvalMath(tolInp.value);
    if (!isNaN(v) && v > 0 && v <= 180) {
      state.angleSnapStep = v;
    }
    if (!isNaN(tol) && tol > 0 && tol <= 45) {
      state.angleSnapTolerance = tol;
    }
    showToast(`Úhlový snap: ${state.angleSnapStep}° (tolerance ${state.angleSnapTolerance}°)`);
    overlay.remove();
  }
  overlay.querySelector("#dlgAngleOk").addEventListener("click", confirm);
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirm();
    if (e.key === "Escape") overlay.remove();
    e.stopPropagation();
  });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
}


// ╔══════════════════════════════════════════════════════════════╗
// ║  Statusbar – název projektu                                  ║
// ╚══════════════════════════════════════════════════════════════╝

/** Aktualizuje název projektu ve stavovém řádku. */
export function updateStatusProject() {
  const el = document.getElementById('statusProject');
  if (el) el.textContent = 'Projekt: ' + (state.projectName || 'Bez názvu');
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  Help overlay                                                ║
// ╚══════════════════════════════════════════════════════════════╝

/** Zobrazí nápovědu (modal). */
export function showHelp() {
  const overlay = document.getElementById('helpOverlay');
  if (overlay) overlay.classList.add('visible');
}

/** Skryje nápovědu. */
export function hideHelp() {
  const overlay = document.getElementById('helpOverlay');
  if (overlay) overlay.classList.remove('visible');
}

/** Přepne viditelnost nápovědy. */
export function toggleHelp() {
  const overlay = document.getElementById('helpOverlay');
  if (!overlay) return;
  if (overlay.classList.contains('visible')) {
    hideHelp();
  } else {
    showHelp();
  }
}

// Help close button
document.getElementById('helpCloseBtn')?.addEventListener('click', hideHelp);

// Help overlay click on background
document.getElementById('helpOverlay')?.addEventListener('click', (e) => {
  if (e.target.id === 'helpOverlay') hideHelp();
});

// Help toolbar button
document.getElementById('btnHelp')?.addEventListener('click', toggleHelp);

// ── First-run help ──
/** Zkontroluje a zobrazí nápovědu při prvním spuštění. */
export async function checkFirstRunHelp() {
  const shown = await getMeta('helpShown');
  if (!shown) {
    showHelp();
    setMeta('helpShown', '1');
  }
}

