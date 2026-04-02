// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – CAM Simulátor (soustružení)                      ║
// ║  Konverze SimDraha.html → vanilla JS ES module            ║
// ╚══════════════════════════════════════════════════════════════╝

import { makeOverlay } from '../dialogFactory.js';

// ── CSS injection ──────────────────────────────────────────────
let cssInjected = false;
function injectCSS() {
  if (cssInjected) return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
.cam-sim-window {
  width: 95vw !important; max-width: 1600px !important;
  height: 90vh !important; max-height: 900px !important;
  display: flex; flex-direction: column;
}
.cam-sim-window .calc-body {
  flex: 1; overflow: hidden; padding: 0 !important;
}
.cam-sim-root {
  display: flex; height: 100%; color: #cdd6f4; font-family: system-ui, sans-serif; font-size: 13px;
}
.cam-sim-canvas-area {
  flex: 1; display: flex; flex-direction: column; position: relative; background: #1e1e2e;
}
.cam-sim-canvas-wrap {
  flex: 1; overflow: hidden; cursor: crosshair; touch-action: none; position: relative;
}
.cam-sim-canvas-wrap canvas { display: block; }
.cam-sim-toolbar {
  position: absolute; top: 8px; right: 8px; z-index: 5;
  display: flex; gap: 6px; flex-wrap: wrap;
}
.cam-sim-toolbar button {
  background: #313244; border: 1px solid #45475a; color: #cdd6f4;
  border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 16px;
  line-height: 1;
}
.cam-sim-toolbar button:hover { background: #45475a; }
.cam-sim-toolbar button.cam-sim-active { background: #89b4fa; color: #1e1e2e; }
.cam-sim-code-area {
  height: 180px; border-top: 1px solid #45475a; display: flex; flex-direction: column;
  background: #11111b;
}
.cam-sim-code-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 2px 8px; border-bottom: 1px solid #45475a; background: #181825;
  font-size: 11px; flex-wrap: wrap; gap: 4px;
}
.cam-sim-code-bar span { color: #6c7086; }
.cam-sim-code-bar .cam-sim-code-btns { display: flex; gap: 4px; }
.cam-sim-code-bar button {
  background: #313244; border: 1px solid #45475a; color: #cdd6f4;
  border-radius: 4px; padding: 2px 8px; cursor: pointer; font-size: 11px;
}
.cam-sim-code-bar button:hover { background: #45475a; }
.cam-sim-code-bar button.cam-sim-active { background: #89b4fa; color: #1e1e2e; }
.cam-sim-code-scroll {
  flex: 1; overflow-y: auto; font-family: monospace; font-size: 11px; padding: 4px;
}
.cam-sim-code-scroll::-webkit-scrollbar { width: 6px; }
.cam-sim-code-scroll::-webkit-scrollbar-thumb { background: #45475a; border-radius: 3px; }
.cam-sim-code-line {
  white-space: pre; padding: 1px 6px; cursor: pointer; color: #a6e3a1;
}
.cam-sim-code-line.cam-sim-code-active {
  background: rgba(137,180,250,0.2); font-weight: bold; border-left: 3px solid #89b4fa;
}
.cam-sim-manual-ta {
  flex: 1; width: 100%; padding: 6px; font-family: monospace; font-size: 11px;
  resize: none; border: none; outline: none;
  background: #11111b; color: #a6e3a1;
}
.cam-sim-sidebar {
  width: 320px; overflow-y: auto; border-left: 1px solid #45475a;
  background: #181825; display: flex; flex-direction: column;
}
.cam-sim-sidebar::-webkit-scrollbar { width: 6px; }
.cam-sim-sidebar::-webkit-scrollbar-thumb { background: #45475a; border-radius: 3px; }
.cam-sim-header {
  padding: 8px 12px; border-bottom: 1px solid #45475a; background: #11111b;
  display: flex; justify-content: space-between; align-items: center;
}
.cam-sim-header h2 { margin: 0; font-size: 14px; color: #89b4fa; }
.cam-sim-header .cam-sim-undo-btns { display: flex; gap: 4px; }
.cam-sim-header button {
  background: none; border: none; color: #6c7086; cursor: pointer; font-size: 16px; padding: 2px;
}
.cam-sim-header button:hover { color: #cdd6f4; }
.cam-sim-header button:disabled { opacity: 0.3; cursor: default; }
.cam-sim-tabs {
  display: flex; border-bottom: 1px solid #45475a;
}
.cam-sim-tabs button {
  flex: 1; padding: 8px 4px; font-size: 12px; font-weight: 600;
  background: none; border: none; color: #6c7086; cursor: pointer;
  border-bottom: 2px solid transparent;
}
.cam-sim-tabs button:hover { color: #cdd6f4; }
.cam-sim-tabs button.cam-sim-active {
  color: #89b4fa; border-bottom-color: #89b4fa;
}
.cam-sim-tab-body { flex: 1; overflow-y: auto; padding: 10px; }
.cam-sim-tab-body::-webkit-scrollbar { width: 6px; }
.cam-sim-tab-body::-webkit-scrollbar-thumb { background: #45475a; border-radius: 3px; }
.cam-sim-section-title {
  font-weight: bold; font-size: 12px; color: #a6adc8;
  border-bottom: 1px solid #45475a; padding-bottom: 4px; margin: 12px 0 6px 0;
}
.cam-sim-section-title:first-child { margin-top: 0; }
.cam-sim-row { display: flex; gap: 6px; margin-bottom: 6px; }
.cam-sim-field { display: flex; flex-direction: column; flex: 1; }
.cam-sim-field label { font-size: 10px; color: #6c7086; margin-bottom: 2px; }
.cam-sim-field input, .cam-sim-field select {
  background: #1e1e2e; border: 1px solid #45475a; color: #cdd6f4;
  border-radius: 4px; padding: 4px 6px; font-size: 12px; width: 100%; box-sizing: border-box;
}
.cam-sim-field input:focus, .cam-sim-field select:focus {
  outline: none; border-color: #89b4fa;
}
.cam-sim-btn {
  display: flex; align-items: center; justify-content: center; gap: 4px;
  padding: 6px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;
  border: none; cursor: pointer; width: 100%; box-sizing: border-box;
}
.cam-sim-btn:hover { filter: brightness(1.15); }
.cam-sim-btn-blue { background: #89b4fa; color: #1e1e2e; }
.cam-sim-btn-green { background: #a6e3a1; color: #1e1e2e; }
.cam-sim-btn-purple { background: #cba6f7; color: #1e1e2e; }
.cam-sim-btn-red { background: #f38ba8; color: #1e1e2e; }
.cam-sim-btn-gray { background: #45475a; color: #cdd6f4; }
.cam-sim-btn-indigo { background: #89b4fa; color: #1e1e2e; }
.cam-sim-btn-half { width: auto; flex: 1; }
.cam-sim-toggle-row {
  display: flex; gap: 4px; margin-bottom: 6px;
}
.cam-sim-toggle-row button {
  flex: 1; padding: 5px 4px; font-size: 11px; font-weight: 600;
  background: #313244; border: 1px solid #45475a; color: #6c7086;
  border-radius: 4px; cursor: pointer;
}
.cam-sim-toggle-row button:hover { color: #cdd6f4; }
.cam-sim-toggle-row button.cam-sim-active {
  background: #89b4fa; color: #1e1e2e; border-color: #89b4fa;
}
.cam-sim-errors {
  background: rgba(243,139,168,0.15); border-left: 3px solid #f38ba8;
  padding: 6px 8px; font-size: 11px; color: #f38ba8;
}
.cam-sim-errors ul { margin: 4px 0 0 16px; padding: 0; }
.cam-sim-point-row {
  display: flex; flex-wrap: wrap; gap: 4px; align-items: center;
  padding: 6px; border-radius: 4px; background: #1e1e2e; border: 1px solid #45475a;
  margin-bottom: 4px; border-left: 3px solid #89b4fa;
}
.cam-sim-point-row.cam-sim-stock { border-left-color: #a6e3a1; }
.cam-sim-point-row .cam-sim-pt-num {
  width: 18px; font-family: monospace; font-size: 11px; color: #6c7086; font-weight: bold;
}
.cam-sim-point-row select {
  width: 48px; background: #11111b; border: 1px solid #45475a; color: #cdd6f4;
  border-radius: 3px; font-size: 11px; padding: 2px;
}
.cam-sim-point-row input {
  width: 56px; background: #11111b; border: 1px solid #45475a; color: #cdd6f4;
  border-radius: 3px; font-size: 11px; padding: 3px 4px; box-sizing: border-box;
}
.cam-sim-point-row input:focus, .cam-sim-point-row select:focus {
  outline: none; border-color: #89b4fa;
}
.cam-sim-point-row .cam-sim-mode-btn {
  width: 32px; height: 22px; font-size: 9px; font-weight: bold;
  background: #313244; border: 1px solid #45475a; color: #6c7086;
  border-radius: 3px; cursor: pointer; text-align: center;
}
.cam-sim-point-row .cam-sim-mode-btn.cam-sim-inc {
  background: rgba(203,166,247,0.2); color: #cba6f7; border-color: #cba6f7;
}
.cam-sim-point-row .cam-sim-pt-actions {
  margin-left: auto; display: flex; gap: 2px;
}
.cam-sim-point-row .cam-sim-pt-actions button {
  background: none; border: none; cursor: pointer; font-size: 13px; padding: 1px 3px;
  color: #6c7086;
}
.cam-sim-point-row .cam-sim-pt-actions button:hover { color: #cdd6f4; }
.cam-sim-point-header {
  display: flex; gap: 2px; padding: 0 6px; font-size: 10px; font-weight: bold;
  color: #6c7086; margin-bottom: 4px;
}
.cam-sim-checkbox-row {
  display: flex; align-items: center; gap: 8px; padding: 6px 0;
  border-top: 1px solid #45475a; margin-top: 8px;
}
.cam-sim-checkbox-row input[type="checkbox"] {
  width: 16px; height: 16px; accent-color: #89b4fa;
}
.cam-sim-checkbox-row span { font-size: 12px; font-weight: 600; }
.cam-sim-checkbox-row small { display: block; font-size: 10px; color: #6c7086; padding-left: 24px; }
.cam-sim-mat-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 6px;
}
.cam-sim-mat-grid button {
  font-size: 10px; padding: 4px 6px; background: #313244; border: 1px solid #45475a;
  color: #a6adc8; border-radius: 3px; cursor: pointer;
}
.cam-sim-mat-grid button:hover { background: #45475a; color: #cdd6f4; }
.cam-sim-import-ta {
  width: 100%; min-height: 120px; padding: 6px; font-family: monospace; font-size: 11px;
  resize: vertical; background: #1e1e2e; border: 1px solid #45475a; color: #cdd6f4;
  border-radius: 4px; box-sizing: border-box;
}
.cam-sim-info-box {
  padding: 6px 8px; background: #1e1e2e; border: 1px solid #45475a; border-radius: 4px;
  font-size: 11px; color: #6c7086; font-style: italic;
}
.cam-sim-tool-shape-row { display: flex; gap: 4px; margin-bottom: 6px; }
.cam-sim-tool-shape-row button {
  flex: 1; padding: 5px; background: #313244; border: 1px solid #45475a;
  color: #6c7086; border-radius: 4px; cursor: pointer; font-size: 14px;
}
.cam-sim-tool-shape-row button.cam-sim-active {
  background: #89b4fa; color: #1e1e2e; border-color: #89b4fa;
}
`;
  document.head.appendChild(style);
}

// ── MATERIALS constant ─────────────────────────────────────────
const MATERIALS = {
  'Ocel 11 373 (S235)':   { speed: 200, feed: 0.25, depth: 2.5, name: "Ocel (Měkká)" },
  'Ocel 14 220 (Cement)': { speed: 160, feed: 0.2,  depth: 1.5, name: "Ocel (Tvrdší)" },
  'Nerez 17 240 (304)':   { speed: 120, feed: 0.15, depth: 1.0, name: "Nerez" },
  'Hliník (AlSi)':        { speed: 400, feed: 0.35, depth: 4.0, name: "Hliník" },
  'Mosaz':                { speed: 300, feed: 0.2,  depth: 2.5, name: "Mosaz" },
  'Plast (POM)':          { speed: 500, feed: 0.4,  depth: 5.0, name: "Plast" }
};

// ── MATH HELPERS ───────────────────────────────────────────────
function dist(p1, p2) {
  if (!p1 || !p2) return 0;
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2));
}
function getNormal(p1, p2) {
  if (!p1 || !p2) return { x: 0, z: 0 };
  const dx = p2.x - p1.x, dz = p2.z - p1.z, l = Math.sqrt(dx * dx + dz * dz);
  if (l === 0 || isNaN(l)) return { x: 0, z: 0 };
  return { x: -dz / l, z: dx / l };
}
function intersectLines(p1, p2, p3, p4) {
  if (!p1 || !p2 || !p3 || !p4) return null;
  if (isNaN(p1.x) || isNaN(p1.z) || isNaN(p2.x) || isNaN(p2.z) ||
      isNaN(p3.x) || isNaN(p3.z) || isNaN(p4.x) || isNaN(p4.z)) return null;
  const d = (p1.x - p2.x) * (p3.z - p4.z) - (p1.z - p2.z) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-9 || isNaN(d)) return null;
  const t = ((p1.x - p3.x) * (p3.z - p4.z) - (p1.z - p3.z) * (p3.x - p4.x)) / d;
  const ix = p1.x + t * (p2.x - p1.x);
  const iz = p1.z + t * (p2.z - p1.z);
  if (isNaN(ix) || isNaN(iz)) return null;
  return { x: ix, z: iz };
}
function intersectLinesInfinite(p1, p2, p3, p4) {
  if (!p1 || !p2 || !p3 || !p4) return null;
  if (isNaN(p1.x) || isNaN(p1.z) || isNaN(p2.x) || isNaN(p2.z) ||
      isNaN(p3.x) || isNaN(p3.z) || isNaN(p4.x) || isNaN(p4.z)) return null;
  const d = (p1.x - p2.x) * (p3.z - p4.z) - (p1.z - p2.z) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-9 || isNaN(d)) return null;
  const t = ((p1.x - p3.x) * (p3.z - p4.z) - (p1.z - p3.z) * (p3.x - p4.x)) / d;
  const px = p1.x + t * (p2.x - p1.x);
  const pz = p1.z + t * (p2.z - p1.z);
  if (isNaN(px) || isNaN(pz)) return null;
  return { x: px, z: pz };
}
function intersectLineCircle(p1, p2, center, r) {
  if (!p1 || !p2 || !center) return null;
  const dx = p2.x - p1.x, dz = p2.z - p1.z;
  const fx = p1.x - center.x, fz = p1.z - center.z;
  const a = dx * dx + dz * dz, b = 2 * (fx * dx + fz * dz), c = (fx * fx + fz * fz) - r * r;
  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  discriminant = Math.sqrt(discriminant);
  const t1 = (-b - discriminant) / (2 * a), t2 = (-b + discriminant) / (2 * a);
  return [
    { x: p1.x + t1 * dx, z: p1.z + t1 * dz },
    { x: p1.x + t2 * dx, z: p1.z + t2 * dz }
  ];
}
function getArcParams(p1, p2, r, type) {
  if (!p1 || !p2) return { error: true, cx: 0, cz: 0, r: 0 };
  const d2 = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2), d = Math.sqrt(d2);
  const isLongArc = r < 0;
  const absR = Math.abs(r);
  let safeR = absR, error = false;
  if (d2 === 0) return { error: true, cx: p1.x, cz: p1.z, r: 0 };
  if (absR < d / 2 - 0.001) { error = true; safeR = d / 2 + 0.001; }
  const mx = (p1.x + p2.x) / 2, mz = (p1.z + p2.z) / 2;
  const h = Math.sqrt(Math.max(0, safeR * safeR - d2 / 4));
  const dx = p2.x - p1.x, dz = p2.z - p1.z;
  const ox = -dz / d, oz = dx / d;
  let sign = (type === 'G3') ? -1 : 1;
  if (isLongArc) sign *= -1;
  const cx = mx + sign * h * ox, cz = mz + sign * h * oz;
  if (isNaN(cx) || isNaN(cz)) return { error: true, cx: 0, cz: 0, r: 0 };
  return { cx, cz, r: safeR, error };
}
function isAngleBetween(target, start, end, isG2) {
  if (isNaN(target) || isNaN(start) || isNaN(end)) return false;
  const pi2 = 2 * Math.PI;
  const t = ((target % pi2) + pi2) % pi2;
  const s = ((start % pi2) + pi2) % pi2;
  const e = ((end % pi2) + pi2) % pi2;
  if (isG2) { if (s >= e) return t <= s && t >= e; return t <= s || t >= e; }
  else { if (e >= s) return t >= s && t <= e; return t >= s || t <= e; }
}
function intersectHorizontalLineSegment(xLine, p1, p2) {
  if (!p1 || !p2) return null;
  const minX = Math.min(p1.x, p2.x), maxX = Math.max(p1.x, p2.x);
  if (xLine < minX || xLine > maxX) return null;
  if (Math.abs(p2.x - p1.x) < 1e-6) return null;
  const t = (xLine - p1.x) / (p2.x - p1.x);
  return p1.z + t * (p2.z - p1.z);
}
function intersectHorizontalLineArc(xLine, center, radius) {
  if (!center) return [];
  const term = radius * radius - Math.pow(xLine - center.x, 2);
  if (term < 0) return [];
  const sqrtTerm = Math.sqrt(term);
  return [center.z - sqrtTerm, center.z + sqrtTerm];
}
function intersectVerticalLineSegment(zLine, p1, p2) {
  if (!p1 || !p2) return null;
  const minZ = Math.min(p1.z, p2.z), maxZ = Math.max(p1.z, p2.z);
  if (zLine < minZ || zLine > maxZ) return null;
  if (Math.abs(p2.z - p1.z) < 1e-6) return null;
  const t = (zLine - p1.z) / (p2.z - p1.z);
  return p1.x + t * (p2.x - p1.x);
}
function intersectVerticalLineArc(zLine, center, radius) {
  if (!center) return [];
  const term = radius * radius - Math.pow(zLine - center.z, 2);
  if (term < 0) return [];
  const sqrtTerm = Math.sqrt(term);
  return [center.x - sqrtTerm, center.x + sqrtTerm];
}

// ── SmartInput helper ──────────────────────────────────────────
function createSmartInput(opts) {
  const inp = document.createElement('input');
  inp.type = opts.type || 'text';
  if (opts.step) inp.step = opts.step;
  if (opts.placeholder) inp.placeholder = opts.placeholder;
  if (opts.className) inp.className = opts.className;
  inp.value = opts.value ?? '';
  let dirty = false;
  let timer = null;
  const commit = () => {
    if (!dirty) return;
    dirty = false;
    if (timer) { clearTimeout(timer); timer = null; }
    if (opts.onChange) opts.onChange(inp.value);
  };
  inp.addEventListener('input', () => {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(commit, 600);
  });
  inp.addEventListener('blur', commit);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { commit(); inp.blur(); }
  });
  inp.setValue = (v) => { inp.value = v; };
  return inp;
}

// ── resolvePointsToAbsolute ────────────────────────────────────
function resolvePointsToAbsolute(pts) {
  let lastX = 0, lastZ = 0;
  return pts.map(p => {
    let valX = parseFloat(p.x); if (isNaN(valX)) valX = 0;
    let valZ = parseFloat(p.z); if (isNaN(valZ)) valZ = 0;
    let absX, absZ;
    if (p.mode === 'INC') { absX = lastX + valX; absZ = lastZ + valZ; }
    else { absX = valX; absZ = valZ; }
    lastX = absX; lastZ = absZ;
    let rVal = parseFloat(p.r); if (isNaN(rVal)) rVal = 0;
    return { ...p, xAbs: absX, zAbs: absZ, rVal };
  });
}

// ── G-code parser (manual code → sim path) ─────────────────────
function parseManualGCodeToPath(code, prms) {
  const lines = code.split('\n');
  const path = [];
  let currentX = parseFloat(prms.safeX) / 2;
  let currentZ = parseFloat(prms.safeZ);
  let lastMoveType = 'G0';
  path.push({ x: currentX, z: currentZ, type: 'G0' });
  lines.forEach((line, idx) => {
    const clean = line.toUpperCase().trim();
    if (!clean || clean.startsWith(';') || clean.startsWith('(') || clean.startsWith('%')) return;
    const gMatch = clean.match(/G([0-3])/);
    const type = gMatch ? 'G' + gMatch[1] : lastMoveType;
    const xMatch = clean.match(/[XU]([-]?\d*\.?\d+)/);
    const zMatch = clean.match(/[ZW]([-]?\d*\.?\d+)/);
    const rMatch = clean.match(/(?:R|CR=)([-]?\d*\.?\d+)/);
    let targetX = currentX, targetZ = currentZ, hasMove = false;
    if (xMatch) { targetX = prms.mode === 'DIAMON' ? parseFloat(xMatch[1]) / 2 : parseFloat(xMatch[1]); hasMove = true; }
    if (zMatch) { targetZ = parseFloat(zMatch[1]); hasMove = true; }
    if (gMatch) lastMoveType = type;
    if (hasMove) {
      if (type === 'G0' || type === 'G1') {
        path.push({ x: targetX, z: targetZ, type, originalLineIdx: idx });
      } else if (type === 'G2' || type === 'G3') {
        if (rMatch) {
          const r = parseFloat(rMatch[1]);
          const p1 = { x: currentX, z: currentZ };
          const p2 = { x: targetX, z: targetZ };
          const arc = getArcParams(p1, p2, r, type);
          if (!arc.error) {
            const steps = 10;
            let sA = Math.atan2(p1.x - arc.cx, p1.z - arc.cz);
            let eA = Math.atan2(p2.x - arc.cx, p2.z - arc.cz);
            if (type === 'G2' && eA > sA) eA -= 2 * Math.PI;
            if (type === 'G3' && eA < sA) eA += 2 * Math.PI;
            for (let j = 1; j <= steps; j++) {
              const a = sA + (eA - sA) * (j / steps);
              path.push({ x: arc.cx + Math.sin(a) * arc.r, z: arc.cz + Math.cos(a) * arc.r, type, originalLineIdx: idx });
            }
          } else {
            path.push({ x: targetX, z: targetZ, type, originalLineIdx: idx });
          }
        } else {
          path.push({ x: targetX, z: targetZ, type, originalLineIdx: idx });
        }
      }
      currentX = targetX; currentZ = targetZ;
    } else if (gMatch) {
      path.push({ x: currentX, z: currentZ, type, originalLineIdx: idx });
    }
  });
  return path;
}

// ── contour G-code parser (for initial import) ─────────────────
function parseContourGCode(text) {
  const lines = text.split('\n');
  const pts = [];
  let currentType = 'G1', idCounter = Date.now(), lastX = 100, lastZ = 0;
  lines.forEach(line => {
    const clean = line.toUpperCase().trim();
    if (!clean || clean.startsWith(';')) return;
    const gMatch = clean.match(/G([0-3])/);
    if (gMatch) currentType = 'G' + gMatch[1];
    const xMatch = clean.match(/X([-]?\d+\.?\d*)/);
    const zMatch = clean.match(/Z([-]?\d+\.?\d*)/);
    const rMatch = clean.match(/(?:R|CR=)([-]?\d+\.?\d*)/);
    if (xMatch || zMatch) {
      const newX = xMatch ? parseFloat(xMatch[1]) : lastX;
      const newZ = zMatch ? parseFloat(zMatch[1]) : lastZ;
      pts.push({ id: idCounter++, type: currentType, x: newX, z: newZ, r: rMatch ? parseFloat(rMatch[1]) : 0, mode: 'ABS' });
      lastX = newX; lastZ = newZ;
    }
  });
  return pts;
}

// ══════════════════════════════════════════════════════════════
// ║  MAIN EXPORT                                              ║
// ══════════════════════════════════════════════════════════════
export function openCamSimulator(initialContour) {
  injectCSS();

  // ── Build HTML ──
  const bodyHTML = `
<div class="cam-sim-root">
  <div class="cam-sim-canvas-area">
    <div class="cam-sim-toolbar">
      <button data-act="play" title="Spustit/Pauza">▶</button>
      <button data-act="stop" title="Zastavit">⏹</button>
      <button data-act="addpt" title="Vložit za bod">➕</button>
      <button data-act="fit" title="Centrovat">🎯</button>
    </div>
    <div class="cam-sim-canvas-wrap"><canvas></canvas></div>
    <div class="cam-sim-code-area">
      <div class="cam-sim-code-bar">
        <span style="font-weight:bold">G-CODE</span>
        <span class="cam-sim-time-info"></span>
        <div class="cam-sim-code-btns">
          <button data-code="auto" class="cam-sim-active">Auto (Generátor)</button>
          <button data-code="manual">✏ Manuál</button>
        </div>
      </div>
      <div class="cam-sim-code-scroll"></div>
      <textarea class="cam-sim-manual-ta" style="display:none" spellcheck="false"
        placeholder="Zde můžete psát vlastní G-kód..."></textarea>
    </div>
  </div>
  <div class="cam-sim-sidebar">
    <div class="cam-sim-header">
      <h2>🔄 CAM Simulátor</h2>
      <div class="cam-sim-undo-btns">
        <button data-act="undo" title="Zpět">↩</button>
        <button data-act="redo" title="Vpřed">↪</button>
      </div>
    </div>
    <div class="cam-sim-errors" style="display:none"></div>
    <div class="cam-sim-tabs">
      <button data-tab="editor" class="cam-sim-active">✏ Editor</button>
      <button data-tab="params">⚙ Parametry</button>
      <button data-tab="import">📥 Import</button>
    </div>
    <div class="cam-sim-tab-body"></div>
  </div>
</div>`;

  const overlay = makeOverlay('cam-simulator', '🔄 CAM Simulátor', bodyHTML, 'cam-sim-window');
  if (!overlay) return;

  // ── STATE ──
  const S = {
    editMode: 'contour',
    contourPoints: [
      { id: 1, type: 'G0', x: 0, z: 0, r: 0, mode: 'ABS' },
      { id: 2, type: 'G1', x: 20, z: 0, r: 0, mode: 'ABS' },
      { id: 3, type: 'G1', x: 20, z: -15, r: 0, mode: 'ABS' },
      { id: 4, type: 'G1', x: 30, z: -15, r: 0, mode: 'ABS' },
      { id: 5, type: 'G1', x: 35, z: -25, r: 0, mode: 'ABS' },
      { id: 6, type: 'G1', x: 35, z: -40, r: 0, mode: 'ABS' },
      { id: 7, type: 'G2', x: 55, z: -50, r: 10, mode: 'ABS' },
      { id: 8, type: 'G1', x: 55, z: -55, r: 0, mode: 'ABS' },
      { id: 81, type: 'G1', x: 45, z: -55, r: 0, mode: 'ABS' },
      { id: 82, type: 'G1', x: 45, z: -60, r: 0, mode: 'ABS' },
      { id: 83, type: 'G1', x: 55, z: -60, r: 0, mode: 'ABS' },
      { id: 9, type: 'G1', x: 55, z: -65, r: 0, mode: 'ABS' },
      { id: 10, type: 'G3', x: 65, z: -75, r: 12, mode: 'ABS' },
      { id: 11, type: 'G1', x: 80, z: -100, r: 0, mode: 'ABS' }
    ],
    stockPoints: [
      { id: 101, type: 'G0', x: 85, z: 2, r: 0, mode: 'ABS' },
      { id: 102, type: 'G1', x: 85, z: -105, r: 0, mode: 'ABS' },
      { id: 103, type: 'G1', x: 0, z: -105, r: 0, mode: 'ABS' }
    ],
    params: {
      machineType: 'LIMS=2000', mode: 'DIAMON', toolName: 'ROUGHER_T1',
      speed: 200, feed: 0.25, depthOfCut: 2.0, retractDistance: 2.0,
      allowanceX: 0.5, allowanceZ: 0.1, toolRadius: 0.8,
      doFinishing: true, roughingStrategy: 'longitudinal',
      stockMode: 'cylinder', stockMargin: 5.0, stockDiameter: 100,
      stockLength: 100, stockFace: 2.0, safeX: 150, safeZ: 5,
      machineStructure: 'lathe', controlSystem: 'sinumerik',
      toolShape: 'round', toolLength: 10, toolAngle: 15, toolTipAngle: 90
    },
    view: { scale: 3, panX: 600, panY: 350 },
    simRunning: false, simProgress: 0,
    useManualCode: false, manualGCode: '',
    generatedCode: [], errors: [],
    past: [], future: [],
    draggedPointId: null, hoverPointId: null,
    isDragging: false, addPointMode: false,
    activeTab: 'editor',
    _animId: null, _lastMouse: { x: 0, y: 0 }, _lastPinch: null,
    _cachedCalc: null
  };

  // Load from localStorage
  const STORAGE_KEY = 'skica-cam-simulator';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const p = JSON.parse(saved);
      if (p.params) Object.assign(S.params, p.params);
      if (p.contourPoints && p.contourPoints.length > 0) S.contourPoints = p.contourPoints;
      if (p.stockPoints && p.stockPoints.length > 0) S.stockPoints = p.stockPoints;
      if (p.manualGCode) S.manualGCode = p.manualGCode;
      if (p.useManualCode !== undefined) S.useManualCode = p.useManualCode;
    }
  } catch (_) { /* ignore */ }

  // Parse initial contour if provided
  if (initialContour && typeof initialContour === 'string' && initialContour.trim()) {
    const parsed = parseContourGCode(initialContour);
    if (parsed.length > 0) S.contourPoints = parsed;
  }

  // ── DOM refs ──
  const root = overlay.querySelector('.cam-sim-root');
  const canvasWrap = root.querySelector('.cam-sim-canvas-wrap');
  const canvas = canvasWrap.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const codeScroll = root.querySelector('.cam-sim-code-scroll');
  const manualTa = root.querySelector('.cam-sim-manual-ta');
  const timeInfo = root.querySelector('.cam-sim-time-info');
  const errorsDiv = root.querySelector('.cam-sim-errors');
  const tabBody = root.querySelector('.cam-sim-tab-body');
  const toolbar = root.querySelector('.cam-sim-toolbar');

  // ── HISTORY ──
  function pushHistory() {
    S.past.push({
      contour: JSON.parse(JSON.stringify(S.contourPoints)),
      stock: JSON.parse(JSON.stringify(S.stockPoints))
    });
    S.future = [];
    updateUndoRedoBtns();
  }
  function undo() {
    if (S.past.length === 0) return;
    const prev = S.past.pop();
    S.future.unshift({
      contour: JSON.parse(JSON.stringify(S.contourPoints)),
      stock: JSON.parse(JSON.stringify(S.stockPoints))
    });
    S.contourPoints = prev.contour;
    S.stockPoints = prev.stock;
    updateUndoRedoBtns();
    fullUpdate();
  }
  function redo() {
    if (S.future.length === 0) return;
    const next = S.future.shift();
    S.past.push({
      contour: JSON.parse(JSON.stringify(S.contourPoints)),
      stock: JSON.parse(JSON.stringify(S.stockPoints))
    });
    S.contourPoints = next.contour;
    S.stockPoints = next.stock;
    updateUndoRedoBtns();
    fullUpdate();
  }
  function updateUndoRedoBtns() {
    const uBtn = root.querySelector('[data-act="undo"]');
    const rBtn = root.querySelector('[data-act="redo"]');
    if (uBtn) uBtn.disabled = S.past.length === 0;
    if (rBtn) rBtn.disabled = S.future.length === 0;
  }

  // ── SAVE ──
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        params: S.params, contourPoints: S.contourPoints,
        stockPoints: S.stockPoints, manualGCode: S.manualGCode,
        useManualCode: S.useManualCode
      }));
    } catch (_) { /* quota */ }
  }

  // ── CALCULATED DATA (memoized) ──
  function calculate() {
    const prms = S.params;
    const absContour = resolvePointsToAbsolute(S.contourPoints);
    const absStock = resolvePointsToAbsolute(S.stockPoints);
    const worldPoints = absContour.map(p => ({ ...p, xReal: prms.mode === 'DIAMON' ? p.xAbs / 2 : p.xAbs, zReal: p.zAbs }));
    const stockWorldPoints = absStock.map(p => ({ ...p, xReal: prms.mode === 'DIAMON' ? p.xAbs / 2 : p.xAbs, zReal: p.zAbs }));

    const tipR = parseFloat(prms.toolRadius) || 0;
    const allowanceX = parseFloat(prms.allowanceX) || 0;
    const allowanceZ = parseFloat(prms.allowanceZ) || 0;
    const totalOffset = tipR + Math.max(allowanceX, allowanceZ);
    const retractDist = parseFloat(prms.retractDistance) || 2.0;

    let contourSegments = [];
    let rawOffsets = [];
    let finishOffsetPath = [];
    let stockPathSegments = [];
    const foundErrors = [];

    for (let i = 0; i < worldPoints.length - 1; i++) {
      const p1 = worldPoints[i], p2 = worldPoints[i + 1], type = p2.type;
      if (type === 'G0' || type === 'G1') {
        contourSegments.push({ type: 'line', p1: { x: p1.xReal, z: p1.zReal }, p2: { x: p2.xReal, z: p2.zReal }, orig: p2 });
      } else if (type === 'G2' || type === 'G3') {
        const arc = getArcParams({ x: p1.xReal, z: p1.zReal }, { x: p2.xReal, z: p2.zReal }, p2.rVal, type);
        if (arc.error) foundErrors.push(`Řádek ${i + 2}: Rádius R${p2.r} je příliš malý.`);
        else if (arc.r < totalOffset) foundErrors.push(`KOLIZE (Řádek ${i + 2}): Rádius kontury menší než nástroj.`);
        contourSegments.push({ type: 'arc', ...arc, p1: { x: p1.xReal, z: p1.zReal }, p2: { x: p2.xReal, z: p2.zReal }, dir: type });
      }
    }
    for (let i = 0; i < stockWorldPoints.length - 1; i++) {
      const p1 = stockWorldPoints[i], p2 = stockWorldPoints[i + 1], type = p2.type;
      if (type === 'G0' || type === 'G1') {
        stockPathSegments.push({ type: 'line', p1: { x: p1.xReal, z: p1.zReal }, p2: { x: p2.xReal, z: p2.zReal } });
      } else if (type === 'G2' || type === 'G3') {
        const arc = getArcParams({ x: p1.xReal, z: p1.zReal }, { x: p2.xReal, z: p2.zReal }, p2.rVal, type);
        const startAngle = Math.atan2(p1.xReal - arc.cx, p1.zReal - arc.cz);
        const endAngle = Math.atan2(p2.xReal - arc.cx, p2.zReal - arc.cz);
        stockPathSegments.push({ type: 'arc', ...arc, dir: type, startAngle, endAngle });
      }
    }

    let incompleteMachiningCount = 0;
    // 1. raw offsets
    for (let i = 0; i < contourSegments.length; i++) {
      const seg = contourSegments[i];
      let offSeg = null;
      if (seg.type === 'line') {
        const n = getNormal(seg.p1, seg.p2);
        offSeg = { type: 'line', p1: { x: seg.p1.x + n.x * totalOffset, z: seg.p1.z + n.z * totalOffset }, p2: { x: seg.p2.x + n.x * totalOffset, z: seg.p2.z + n.z * totalOffset } };
      } else if (seg.type === 'arc') {
        let rNew = (seg.dir === 'G3') ? seg.r + totalOffset : seg.r - totalOffset;
        if (rNew <= 1.5) { incompleteMachiningCount++; offSeg = null; }
        else {
          const startAngle = Math.atan2(seg.p1.x - seg.cx, seg.p1.z - seg.cz);
          const endAngle = Math.atan2(seg.p2.x - seg.cx, seg.p2.z - seg.cz);
          offSeg = { type: 'arc', cx: seg.cx, cz: seg.cz, r: rNew, dir: seg.dir, refP1: seg.p1, refP2: seg.p2, startAngle, endAngle };
        }
      }
      if (offSeg) rawOffsets.push(offSeg);
    }

    // 2. trimming
    let trimmedOffsetPath = [];
    if (rawOffsets.length > 0) {
      trimmedOffsetPath.push(JSON.parse(JSON.stringify(rawOffsets[0])));
      for (let i = 0; i < rawOffsets.length - 1; i++) {
        let prevOff = trimmedOffsetPath[trimmedOffsetPath.length - 1];
        let nextOff = JSON.parse(JSON.stringify(rawOffsets[i + 1]));
        let intersection = null;
        if (prevOff.type === 'line' && nextOff.type === 'line') {
          intersection = intersectLines(prevOff.p1, prevOff.p2, nextOff.p1, nextOff.p2);
        } else if (prevOff.type === 'line' && nextOff.type === 'arc') {
          const ints = intersectLineCircle(prevOff.p1, prevOff.p2, { x: nextOff.cx, z: nextOff.cz }, nextOff.r);
          if (ints && ints.length > 0) {
            const d1 = Math.hypot(ints[0].x - prevOff.p2.x, ints[0].z - prevOff.p2.z);
            const d2 = Math.hypot(ints[1].x - prevOff.p2.x, ints[1].z - prevOff.p2.z);
            intersection = d1 < d2 ? ints[0] : ints[1];
          }
        } else if (prevOff.type === 'arc' && nextOff.type === 'line') {
          const ints = intersectLineCircle(nextOff.p1, nextOff.p2, { x: prevOff.cx, z: prevOff.cz }, prevOff.r);
          if (ints && ints.length > 0) {
            const d1 = Math.hypot(ints[0].x - nextOff.p1.x, ints[0].z - nextOff.p1.z);
            const d2 = Math.hypot(ints[1].x - nextOff.p1.x, ints[1].z - nextOff.p1.z);
            intersection = d1 < d2 ? ints[0] : ints[1];
          }
        }
        if (intersection) {
          if (prevOff.type === 'line') prevOff.p2 = intersection;
          else prevOff.endAngle = Math.atan2(intersection.x - prevOff.cx, intersection.z - prevOff.cz);
          if (nextOff.type === 'line') nextOff.p1 = intersection;
          else nextOff.startAngle = Math.atan2(intersection.x - nextOff.cx, intersection.z - nextOff.cz);
          trimmedOffsetPath.push(nextOff);
        } else {
          let corner = null;
          if (prevOff.type === 'line' && nextOff.type === 'line') {
            corner = intersectLinesInfinite(prevOff.p1, prevOff.p2, nextOff.p1, nextOff.p2);
          }
          if (corner) {
            prevOff.p2 = corner; nextOff.p1 = corner;
          } else {
            const pStart = (prevOff.type === 'line') ? prevOff.p2 : { x: prevOff.cx + Math.sin(prevOff.endAngle) * prevOff.r, z: prevOff.cz + Math.cos(prevOff.endAngle) * prevOff.r };
            const pEnd = (nextOff.type === 'line') ? nextOff.p1 : { x: nextOff.cx + Math.sin(nextOff.startAngle) * nextOff.r, z: nextOff.cz + Math.cos(nextOff.startAngle) * nextOff.r };
            trimmedOffsetPath.push({ type: 'line', p1: pStart, p2: { x: pEnd.x, z: pStart.z } });
            if (Math.abs(pEnd.z - pStart.z) > 0.001)
              trimmedOffsetPath.push({ type: 'line', p1: { x: pEnd.x, z: pStart.z }, p2: pEnd });
          }
          trimmedOffsetPath.push(nextOff);
        }
      }
    }

    // 3. global loop removal
    if (trimmedOffsetPath.length > 2) {
      let loopFound = true, iterations = 0;
      while (loopFound && iterations < 5) {
        loopFound = false; iterations++;
        outerLoop:
        for (let i = 0; i < trimmedOffsetPath.length - 2; i++) {
          for (let j = i + 2; j < trimmedOffsetPath.length; j++) {
            const s1 = trimmedOffsetPath[i], s2 = trimmedOffsetPath[j];
            if (s1.isDegenerate || s2.isDegenerate) continue;
            let intersection = null;
            if (s1.type === 'line' && s2.type === 'line') {
              intersection = intersectLines(s1.p1, s1.p2, s2.p1, s2.p2);
              if (intersection) {
                const tol = 0.5;
                const ok = intersection.x >= Math.min(s1.p1.x, s1.p2.x) - tol && intersection.x <= Math.max(s1.p1.x, s1.p2.x) + tol &&
                  intersection.z >= Math.min(s1.p1.z, s1.p2.z) - tol && intersection.z <= Math.max(s1.p1.z, s1.p2.z) + tol &&
                  intersection.x >= Math.min(s2.p1.x, s2.p2.x) - tol && intersection.x <= Math.max(s2.p1.x, s2.p2.x) + tol &&
                  intersection.z >= Math.min(s2.p1.z, s2.p2.z) - tol && intersection.z <= Math.max(s2.p1.z, s2.p2.z) + tol;
                if (!ok) intersection = null;
              }
            }
            if (intersection) {
              if (s1.type === 'line') s1.p2 = intersection;
              else s1.endAngle = Math.atan2(intersection.x - s1.cx, intersection.z - s1.cz);
              if (s2.type === 'line') s2.p1 = intersection;
              else s2.startAngle = Math.atan2(intersection.x - s2.cx, intersection.z - s2.cz);
              trimmedOffsetPath.splice(i + 1, j - (i + 1));
              loopFound = true;
              break outerLoop;
            }
          }
        }
      }
    }

    const offsetPath = trimmedOffsetPath;

    // finishing offset
    if (prms.doFinishing) {
      let finRaw = [];
      for (let i = 0; i < contourSegments.length; i++) {
        const seg = contourSegments[i];
        if (seg.type === 'line') {
          const n = getNormal(seg.p1, seg.p2);
          finRaw.push({ type: 'line', p1: { x: seg.p1.x + n.x * tipR, z: seg.p1.z + n.z * tipR }, p2: { x: seg.p2.x + n.x * tipR, z: seg.p2.z + n.z * tipR } });
        } else if (seg.type === 'arc') {
          let rNew = (seg.dir === 'G3') ? seg.r + tipR : seg.r - tipR;
          if (rNew > 1.5) {
            const startAngle = Math.atan2(seg.p1.x - seg.cx, seg.p1.z - seg.cz);
            const endAngle = Math.atan2(seg.p2.x - seg.cx, seg.p2.z - seg.cz);
            finRaw.push({ type: 'arc', cx: seg.cx, cz: seg.cz, r: rNew, dir: seg.dir, refP1: seg.p1, refP2: seg.p2, startAngle, endAngle });
          }
        }
      }
      if (finRaw.length > 0) {
        finishOffsetPath.push(JSON.parse(JSON.stringify(finRaw[0])));
        for (let i = 0; i < finRaw.length - 1; i++) {
          let prevOff = finishOffsetPath[finishOffsetPath.length - 1];
          let nextOff = JSON.parse(JSON.stringify(finRaw[i + 1]));
          let intersection = null;
          if (prevOff.type === 'line' && nextOff.type === 'line') {
            intersection = intersectLines(prevOff.p1, prevOff.p2, nextOff.p1, nextOff.p2);
          } else if (prevOff.type === 'line' && nextOff.type === 'arc') {
            const ints = intersectLineCircle(prevOff.p1, prevOff.p2, { x: nextOff.cx, z: nextOff.cz }, nextOff.r);
            if (ints && ints.length > 0) {
              const d1 = Math.hypot(ints[0].x - prevOff.p2.x, ints[0].z - prevOff.p2.z);
              const d2 = Math.hypot(ints[1].x - prevOff.p2.x, ints[1].z - prevOff.p2.z);
              intersection = d1 < d2 ? ints[0] : ints[1];
            }
          } else if (prevOff.type === 'arc' && nextOff.type === 'line') {
            const ints = intersectLineCircle(nextOff.p1, nextOff.p2, { x: prevOff.cx, z: prevOff.cz }, prevOff.r);
            if (ints && ints.length > 0) {
              const d1 = Math.hypot(ints[0].x - nextOff.p1.x, ints[0].z - nextOff.p1.z);
              const d2 = Math.hypot(ints[1].x - nextOff.p1.x, ints[1].z - nextOff.p1.z);
              intersection = d1 < d2 ? ints[0] : ints[1];
            }
          }
          if (intersection) {
            if (prevOff.type === 'line') prevOff.p2 = intersection;
            else prevOff.endAngle = Math.atan2(intersection.x - prevOff.cx, intersection.z - prevOff.cz);
            if (nextOff.type === 'line') nextOff.p1 = intersection;
            else nextOff.startAngle = Math.atan2(intersection.x - nextOff.cx, intersection.z - nextOff.cz);
            finishOffsetPath.push(nextOff);
          } else {
            let corner = null;
            if (prevOff.type === 'line' && nextOff.type === 'line')
              corner = intersectLinesInfinite(prevOff.p1, prevOff.p2, nextOff.p1, nextOff.p2);
            if (corner) { prevOff.p2 = corner; nextOff.p1 = corner; }
            else {
              const pStart = (prevOff.type === 'line') ? prevOff.p2 : { x: prevOff.cx + Math.sin(prevOff.endAngle) * prevOff.r, z: prevOff.cz + Math.cos(prevOff.endAngle) * prevOff.r };
              const pEnd = (nextOff.type === 'line') ? nextOff.p1 : { x: nextOff.cx + Math.sin(nextOff.startAngle) * nextOff.r, z: nextOff.cz + Math.cos(nextOff.startAngle) * nextOff.r };
              finishOffsetPath.push({ type: 'line', p1: pStart, p2: { x: pEnd.x, z: pStart.z } });
              if (Math.abs(pEnd.z - pStart.z) > 0.001)
                finishOffsetPath.push({ type: 'line', p1: { x: pEnd.x, z: pStart.z }, p2: pEnd });
            }
            finishOffsetPath.push(nextOff);
          }
        }
      }
      // loop removal on finish
      if (finishOffsetPath.length > 2) {
        let loopFound = true, iterations = 0;
        while (loopFound && iterations < 5) {
          loopFound = false; iterations++;
          outerLoopFin:
          for (let i = 0; i < finishOffsetPath.length - 2; i++) {
            for (let j = i + 2; j < finishOffsetPath.length; j++) {
              const s1 = finishOffsetPath[i], s2 = finishOffsetPath[j];
              if (s1.isDegenerate || s2.isDegenerate) continue;
              let intersection = null;
              if (s1.type === 'line' && s2.type === 'line') {
                intersection = intersectLines(s1.p1, s1.p2, s2.p1, s2.p2);
                if (intersection) {
                  const tol = 0.5;
                  const ok = intersection.x >= Math.min(s1.p1.x, s1.p2.x) - tol && intersection.x <= Math.max(s1.p1.x, s1.p2.x) + tol &&
                    intersection.z >= Math.min(s1.p1.z, s1.p2.z) - tol && intersection.z <= Math.max(s1.p1.z, s1.p2.z) + tol &&
                    intersection.x >= Math.min(s2.p1.x, s2.p2.x) - tol && intersection.x <= Math.max(s2.p1.x, s2.p2.x) + tol &&
                    intersection.z >= Math.min(s2.p1.z, s2.p2.z) - tol && intersection.z <= Math.max(s2.p1.z, s2.p2.z) + tol;
                  if (!ok) intersection = null;
                }
              }
              if (intersection) {
                if (s1.type === 'line') s1.p2 = intersection;
                else s1.endAngle = Math.atan2(intersection.x - s1.cx, intersection.z - s1.cz);
                if (s2.type === 'line') s2.p1 = intersection;
                else s2.startAngle = Math.atan2(intersection.x - s2.cx, intersection.z - s2.cz);
                finishOffsetPath.splice(i + 1, j - (i + 1));
                loopFound = true;
                break outerLoopFin;
              }
            }
          }
        }
      }
    }

    if (incompleteMachiningCount > 0)
      foundErrors.push({ type: 'warning', msg: `POZNÁMKA: V ${incompleteMachiningCount} místech nedojde ke kompletnímu obrobení.` });

    // Passes
    const passes = [];
    const step = parseFloat(prms.depthOfCut) || 1;
    const sRad = (parseFloat(prms.stockDiameter) || 100) / 2;
    const stockFace = parseFloat(prms.stockFace) || 0;

    if (prms.roughingStrategy === 'face') {
      let currentZ = stockFace;
      const minZPart = -1000;
      let safe = 0;
      while (currentZ > minZPart && safe < 500) {
        currentZ -= step; safe++;
        let xsEnd = [];
        offsetPath.forEach(os => {
          if (os.isDegenerate) return;
          if (os.type === 'line') {
            const x = intersectVerticalLineSegment(currentZ, os.p1, os.p2);
            if (x !== null) xsEnd.push(x);
          } else if (os.type === 'arc') {
            const res = intersectVerticalLineArc(currentZ, { x: os.cx, z: os.cz }, os.r);
            res.forEach(x => {
              const angle = Math.atan2(x - os.cx, currentZ - os.cz);
              if (isAngleBetween(angle, os.startAngle, os.endAngle, os.dir === 'G2')) xsEnd.push(x);
            });
          }
        });
        xsEnd.sort((a, b) => a - b);
        let xTarget = 0;
        if (xsEnd.length > 0) {
          const validXs = xsEnd.filter(x => x < sRad + 1);
          if (validXs.length > 0) xTarget = validXs[validXs.length - 1];
        } else {
          let maxOZ = -9999;
          offsetPath.forEach(p => {
            if (p.isDegenerate) return;
            const z1 = p.type === 'line' ? p.p1.z : p.cz + p.r;
            const z2 = p.type === 'line' ? p.p2.z : p.cz - p.r;
            maxOZ = Math.max(maxOZ, z1, z2);
          });
          if (currentZ > maxOZ) xTarget = -1; else continue;
        }
        if (xTarget >= sRad - 0.01) continue;
        passes.push({ type: 'face', z: currentZ, xStart: sRad + 2, xEnd: xTarget });
        if (currentZ < -200) break;
      }
    } else {
      let currentX = sRad;
      if (prms.stockMode === 'casting' && stockWorldPoints.length > 0) {
        let maxStockX = -9999;
        stockWorldPoints.forEach(p => { if (p.xReal > maxStockX) maxStockX = p.xReal; });
        currentX = maxStockX;
      }
      const cylStockZ = (parseFloat(prms.stockLength) || 100) * -1;
      let safe = 0;
      while (currentX > -50 && safe < 500) {
        currentX -= step; safe++;
        let zsEnd = [];
        offsetPath.forEach(os => {
          if (os.isDegenerate) return;
          if (os.type === 'line') {
            const z = intersectHorizontalLineSegment(currentX, os.p1, os.p2);
            if (z !== null) zsEnd.push(z);
          } else if (os.type === 'arc') {
            const res = intersectHorizontalLineArc(currentX, { x: os.cx, z: os.cz }, os.r);
            res.forEach(z => {
              const angle = Math.atan2(currentX - os.cx, z - os.cz);
              if (isAngleBetween(angle, os.startAngle, os.endAngle, os.dir === 'G2')) zsEnd.push(z);
            });
          }
        });
        zsEnd.sort((a, b) => b - a);
        zsEnd = zsEnd.filter((z, i) => i === 0 || Math.abs(z - zsEnd[i - 1]) > 0.01);

        if (zsEnd.length > 0) {
          let zTarget = zsEnd[0];
          let zStartCut = allowanceZ;
          if (prms.stockMode === 'casting') {
            let zsStart = [];
            stockPathSegments.forEach(ss => {
              if (ss.type === 'line') {
                const z = intersectHorizontalLineSegment(currentX, ss.p1, ss.p2);
                if (z !== null) zsStart.push(z);
              } else if (ss.type === 'arc') {
                const res = intersectHorizontalLineArc(currentX, { x: ss.cx, z: ss.cz }, ss.r);
                res.forEach(z => {
                  const angle = Math.atan2(currentX - ss.cx, z - ss.cz);
                  if (isAngleBetween(angle, ss.startAngle, ss.endAngle, ss.dir === 'G2')) zsStart.push(z);
                });
              }
            });
            zsStart.sort((a, b) => b - a);
            const validStarts = zsStart.filter(z => z > zTarget + 0.01);
            if (validStarts.length > 0) zStartCut = validStarts[0];
            else if (zsStart.length === 0) continue;
          } else {
            if (currentX > sRad) continue;
            if (zTarget < cylStockZ) zTarget = cylStockZ;
            zStartCut = stockFace;
          }
          if (zStartCut > zTarget) {
            passes.push({ type: 'long', x: currentX, zStart: zStartCut, zEnd: zTarget });
          }
        }
        let minPartX = 9999;
        offsetPath.forEach(os => {
          if (os.isDegenerate) return;
          if (os.type === 'line') minPartX = Math.min(minPartX, os.p1.x, os.p2.x);
          else minPartX = Math.min(minPartX, os.cx - os.r);
        });
        if (currentX < minPartX - 1) break;
      }
    }

    // Sim path
    let simPath = [];
    let totalPathLength = 0;
    let estimatedTimeSeconds = 0;
    const addToPath = (x1, z1, x2, z2, type) => {
      const d = Math.hypot(x2 - x1, z2 - z1);
      totalPathLength += d;
      if (type === 'G0') { estimatedTimeSeconds += (d / 5000) * 60; }
      else {
        const feed = parseFloat(prms.feed) || 0.1;
        const speed = parseFloat(prms.speed) || 200;
        let avgX = Math.abs((x1 + x2) / 2);
        if (avgX < 1) avgX = 1;
        let rpm = (speed * 1000) / (Math.PI * avgX * 2);
        if (rpm > 2000) rpm = 2000;
        const mmPerMin = feed * rpm;
        if (mmPerMin > 0) estimatedTimeSeconds += (d / mmPerMin) * 60;
      }
      return { x: x2, z: z2, type };
    };

    if (S.useManualCode) {
      simPath = parseManualGCodeToPath(S.manualGCode, prms);
      for (let i = 0; i < simPath.length - 1; i++)
        addToPath(simPath[i].x, simPath[i].z, simPath[i + 1].x, simPath[i + 1].z, simPath[i + 1].type);
    } else {
      simPath.push({ x: prms.safeX / 2, z: prms.safeZ, type: 'G0' });
      let currentSimX = prms.safeX / 2, currentSimZ = prms.safeZ;
      passes.forEach(pass => {
        const tx = pass.type === 'long' ? pass.x : pass.xStart;
        const tz = pass.type === 'long' ? pass.zStart + 1 : pass.z;
        if (Math.abs(currentSimZ - tz) > 0.001) { simPath.push(addToPath(currentSimX, currentSimZ, currentSimX, tz, 'G0')); currentSimZ = tz; }
        if (Math.abs(currentSimX - tx) > 0.001) { simPath.push(addToPath(currentSimX, currentSimZ, tx, tz, 'G0')); currentSimX = tx; }
        if (pass.type === 'long') {
          const xRetract = pass.x + retractDist;
          simPath.push(addToPath(currentSimX, currentSimZ, pass.x, pass.zEnd, 'G1'));
          simPath.push(addToPath(pass.x, pass.zEnd, xRetract, pass.zEnd + retractDist, 'G1'));
          simPath.push(addToPath(xRetract, pass.zEnd + retractDist, xRetract, pass.zStart + 1, 'G0'));
          currentSimX = xRetract; currentSimZ = pass.zStart + 1;
        } else {
          const zRetract = pass.z + retractDist;
          simPath.push(addToPath(currentSimX, currentSimZ, pass.xEnd, pass.z, 'G1'));
          simPath.push(addToPath(pass.xEnd, pass.z, pass.xEnd, zRetract, 'G1'));
          simPath.push(addToPath(pass.xEnd, zRetract, pass.xStart, zRetract, 'G0'));
          currentSimX = pass.xStart; currentSimZ = zRetract;
        }
      });
      simPath.push(addToPath(currentSimX, currentSimZ, prms.safeX / 2, prms.safeZ, 'G0'));

      if (prms.doFinishing && finishOffsetPath.length > 0) {
        const startSeg = finishOffsetPath[0];
        const startX = startSeg.type === 'line' ? startSeg.p1.x : (startSeg.cx + Math.sin(startSeg.startAngle) * startSeg.r);
        const startZ = startSeg.type === 'line' ? startSeg.p1.z : (startSeg.cz + Math.cos(startSeg.startAngle) * startSeg.r);
        const lastPt = simPath[simPath.length - 1];
        simPath.push(addToPath(lastPt.x, lastPt.z, startX + 2, startZ, 'G0'));
        simPath.push(addToPath(startX + 2, startZ, startX, startZ, 'G1'));
        finishOffsetPath.forEach(seg => {
          if (seg.isDegenerate) return;
          const prev = simPath[simPath.length - 1];
          if (seg.type === 'line') {
            simPath.push(addToPath(prev.x, prev.z, seg.p2.x, seg.p2.z, 'G1'));
          } else {
            const steps = 10;
            let sA = seg.startAngle, eA = seg.endAngle;
            if (seg.dir === 'G2' && eA > sA) eA -= 2 * Math.PI;
            if (seg.dir === 'G3' && eA < sA) eA += 2 * Math.PI;
            let lastArcX = prev.x, lastArcZ = prev.z;
            for (let j = 1; j <= steps; j++) {
              const a = sA + (eA - sA) * (j / steps);
              const nx = seg.cx + Math.sin(a) * seg.r, nz = seg.cz + Math.cos(a) * seg.r;
              addToPath(lastArcX, lastArcZ, nx, nz, seg.dir);
              simPath.push({ x: nx, z: nz, type: seg.dir });
              lastArcX = nx; lastArcZ = nz;
            }
          }
        });
        const finalPt = simPath[simPath.length - 1];
        simPath.push(addToPath(finalPt.x, finalPt.z, finalPt.x + 2, finalPt.z + 2, 'G0'));
        const veryLast = simPath[simPath.length - 1];
        simPath.push(addToPath(veryLast.x, veryLast.z, prms.safeX / 2, prms.safeZ, 'G0'));
      }
    }

    S.errors = foundErrors;
    return { worldPoints, stockWorldPoints, offsetPath, finishOffsetPath, stockPathSegments, passes, simPath, retractDist, totalPathLength, estimatedTimeSeconds };
  }

  // ── G-Code Generator ─────────────────────────────────────────
  function generateGCode(calc) {
    const prms = S.params;
    if (S.useManualCode) {
      return S.manualGCode.split('\n').map((line, idx) => ({ text: line, simIdx: idx }));
    }
    const d = new Date();
    const lines = [];
    const add = (text, simIdx = null) => lines.push({ text, simIdx });
    const cmt = (text) => prms.controlSystem === 'fanuc' ? `( ${text} )` : `; ${text}`;
    const addCmt = (text) => add(cmt(text), null);
    let blockNum = 10;
    const N = () => { const s = `N${blockNum} `; blockNum += 10; return s; };
    const addN = (text, simIdx = null) => add(`${N()}${text}`, simIdx);
    const note = (cmd, text) => ` ${cmd}${cmt(text)}`;
    let arcR = (r) => `CR=${(parseFloat(r) || 0).toFixed(3)}`;

    if (prms.controlSystem === 'sinumerik') {
      addCmt('Vygenerovaný kód SINUMERIK 840D');
      addCmt(`Datum: ${d.toLocaleDateString()}`);
      addN(`G18${note('', 'Rovina ZX')}`); addN(`G90${note('', 'Absolutní programování')}`);
      addN(`G54${note('', 'Posunutí počátku')}`); addN(`G95${note('', 'Posuv na otáčku')}`);
      addN(`G75 Z0${note('', 'Nájezd do ref. bodu')}`); addN('G75 X0');
      addN(`LIMS=2000${note('', 'Limit otáček')}`);
      addN(`G96 S${prms.speed} ${prms.machineType}${note('', 'Konst. řezná rychlost')}`);
      addN(`${prms.mode}${note('', prms.mode === 'DIAMON' ? 'Programování průměru' : 'Programování poloměru')}`);
      addN(`T="${prms.toolName}" D1 M6${note('', 'Výměna nástroje')}`);
      addN(`M3${note('', 'Vřeteno CW')}`); addN(`M8${note('', 'Chlazení ZAP')}`);
      arcR = (r) => `CR=${(parseFloat(r) || 0).toFixed(3)}`;
    } else if (prms.controlSystem === 'fanuc') {
      addCmt('Vygenerovaný kód FANUC'); addCmt(`Datum: ${d.toLocaleDateString()}`);
      addN(`G21${note('', 'Metrický vstup')}`); addN(`G40${note('', 'Zrušení kompenzace')}`);
      addN(`G99${note('', 'Posuv mm/ot')}`); addN(`G18${note('', 'Rovina ZX')}`);
      addN(`G28 U0 W0${note('', 'Referenční bod')}`); addN(`G50 S2000${note('', 'Max otáčky')}`);
      addN(`G96 S${prms.speed} M3${note('', 'Konst. řezná rychlost')}`);
      addN(`T0101${note('', 'Nástroj 1 / Korekce 1')}`); addN(`M8${note('', 'Chlazení ZAP')}`);
      arcR = (r) => `R${(parseFloat(r) || 0).toFixed(3)}`;
    } else if (prms.controlSystem === 'heidenhain') {
      addCmt('Vygenerovaný kód HEIDENHAIN ISO'); addCmt(`Datum: ${d.toLocaleDateString()}`);
      addN(`G18${note('', 'Rovina ZX')}`); addN(`G90${note('', 'Absolutní')}`);
      addN(`G71${note('', 'Metrický systém')}`); addN(`G54${note('', 'Nulový bod')}`);
      addN(`G96 S${prms.speed} M3${note('', 'Řezná rychlost')}`);
      addN(`T1 M6${note('', 'Nástroj')}`); addN('M8');
      arcR = (r) => `R${(parseFloat(r) || 0).toFixed(3)}`;
    }

    let simCounter = 0;
    addN(`G0 X${prms.safeX} Z${prms.safeZ}${note('', 'Rychloposuv')}`, 0);
    const rDist = calc.retractDist || 2.0;

    addCmt(`--- HRUBOVANI (${prms.roughingStrategy === 'face' ? 'CELNI' : 'PODELNE'}) ---`);
    calc.passes.forEach((pass, i) => {
      addCmt(`Průchod ${i + 1}`);
      if (pass.type === 'long') {
        const xVal = prms.mode === 'DIAMON' ? (pass.x * 2).toFixed(3) : pass.x.toFixed(3);
        const xRetract = prms.mode === 'DIAMON' ? ((pass.x + rDist) * 2).toFixed(3) : (pass.x + rDist).toFixed(3);
        simCounter += 1; addN(`G0 X${xRetract} Z${(pass.zStart + 1).toFixed(3)}`, simCounter);
        simCounter += 1; addN(`G1 X${xVal} F${prms.feed}`, simCounter);
        simCounter += 1; addN(`G1 Z${pass.zEnd.toFixed(3)}`, simCounter);
        simCounter += 1; addN(`G1 X${xRetract} Z${(pass.zEnd + rDist).toFixed(3)}`, simCounter);
        simCounter += 1; addN(`G0 Z${(pass.zStart + 1).toFixed(3)}`, simCounter);
      } else {
        const zVal = pass.z.toFixed(3);
        const zRetract = (pass.z + rDist).toFixed(3);
        const xStart = prms.mode === 'DIAMON' ? (pass.xStart * 2).toFixed(3) : pass.xStart.toFixed(3);
        const xEnd = prms.mode === 'DIAMON' ? (pass.xEnd * 2).toFixed(3) : pass.xEnd.toFixed(3);
        const xEndRetract = prms.mode === 'DIAMON' ? ((pass.xEnd + rDist) * 2).toFixed(3) : (pass.xEnd + rDist).toFixed(3);
        simCounter += 1; addN(`G0 X${xStart} Z${zRetract}`, simCounter);
        simCounter += 1; addN(`G1 Z${zVal} F${prms.feed}`, simCounter);
        simCounter += 1; addN(`G1 X${xEnd}`, simCounter);
        simCounter += 1; addN(`G1 X${xEndRetract} Z${zRetract}`, simCounter);
        simCounter += 1; addN(`G0 X${xStart}`, simCounter);
      }
    });

    simCounter += 1;
    addN(`G0 X${prms.safeX} Z${prms.safeZ}`, simCounter);

    if (prms.doFinishing && calc.finishOffsetPath.length > 0) {
      addCmt('--- DOKONCOVANI ---');
      const startSeg = calc.finishOffsetPath[0];
      const sX = startSeg.type === 'line' ? startSeg.p1.x : (startSeg.cx + Math.sin(startSeg.startAngle) * startSeg.r);
      const sZ = startSeg.type === 'line' ? startSeg.p1.z : (startSeg.cz + Math.cos(startSeg.startAngle) * startSeg.r);
      const sX_out = prms.mode === 'DIAMON' ? (sX * 2).toFixed(3) : sX.toFixed(3);
      simCounter += 1; addN(`G0 X${sX_out} Z${sZ.toFixed(3)}`, simCounter);
      simCounter += 1; addN(`G1 X${sX_out} Z${sZ.toFixed(3)}`, simCounter);
      calc.finishOffsetPath.forEach(seg => {
        if (seg.isDegenerate) return;
        if (seg.type === 'line') {
          const eX = prms.mode === 'DIAMON' ? (seg.p2.x * 2).toFixed(3) : seg.p2.x.toFixed(3);
          simCounter += 1; addN(`G1 X${eX} Z${seg.p2.z.toFixed(3)}`, simCounter);
        } else {
          simCounter += 10;
          const eX = prms.mode === 'DIAMON' ? ((seg.cx + Math.sin(seg.endAngle) * seg.r) * 2).toFixed(3) : (seg.cx + Math.sin(seg.endAngle) * seg.r).toFixed(3);
          const eZ = (seg.cz + Math.cos(seg.endAngle) * seg.r).toFixed(3);
          addN(`${seg.dir} X${eX} Z${eZ} ${arcR(seg.r)}`, simCounter);
        }
      });
      simCounter += 2;
      addN(`G0 X${prms.safeX} Z${prms.safeZ}`, simCounter);
    }

    if (prms.controlSystem === 'fanuc') {
      addN('M9'); addN('M5'); addN('G28 U0 W0'); addN(`M30${note('', 'Konec programu')}`);
    } else if (prms.controlSystem === 'heidenhain') {
      addN('M9'); addN('M5'); addN('M30');
    } else {
      addN(`M30${note('', 'Konec programu')}`);
    }
    addCmt('--- KONTURA (Pro referenci) ---');
    S.contourPoints.forEach(p => {
      let line = `${p.type} X${(parseFloat(p.x) || 0)} Z${(parseFloat(p.z) || 0)}`;
      if (p.type === 'G2' || p.type === 'G3') line += ` ${arcR(p.r)}`;
      addCmt(line);
    });
    return lines;
  }

  // ── CANVAS DRAWING ────────────────────────────────────────────
  function draw() {
    const calc = S._cachedCalc;
    if (!calc) return;
    const prms = S.params;
    const w = canvas.width, h = canvas.height;
    if (w <= 0 || h <= 0) return;

    const C = {
      bg: '#1e1e2e', grid: '#313244', axis: '#f38ba8', stock: '#6c7086',
      contour: '#89b4fa', offset: '#cba6f7', pass: '#a6e3a1', finish: '#f5c2e7',
      error: '#f38ba8', text: '#6c7086', tool: '#f9e2af'
    };

    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
    const toScreen = (x, z) => {
      if (isNaN(x) || isNaN(z)) return { x: 0, y: 0 };
      if (prms.machineStructure === 'carousel')
        return { x: S.view.panX + x * S.view.scale, y: S.view.panY - z * S.view.scale };
      return { x: S.view.panX + z * S.view.scale, y: S.view.panY - x * S.view.scale };
    };

    // grid
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = -500; i <= 500; i += 20) {
      const p1 = toScreen(-500, i), p2 = toScreen(500, i);
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      const p3 = toScreen(i, -500), p4 = toScreen(i, 500);
      ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
    }
    ctx.stroke();

    // grid labels
    ctx.fillStyle = '#585b70'; ctx.font = '10px sans-serif';
    for (let i = -500; i <= 500; i += 20) {
      if (i === 0) continue;
      if (prms.machineStructure === 'carousel') {
        const ptX = toScreen(i, 0); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(i.toString(), ptX.x, ptX.y + 2);
        const ptZ = toScreen(0, i); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(i.toString(), ptZ.x - 4, ptZ.y);
      } else {
        const ptZ = toScreen(0, i); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(i.toString(), ptZ.x, ptZ.y + 2);
        const ptX = toScreen(i, 0); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(i.toString(), ptX.x - 4, ptX.y);
      }
    }

    // axes
    const zero = toScreen(0, 0);
    ctx.strokeStyle = C.axis; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(0, zero.y); ctx.lineTo(w, zero.y);
    ctx.moveTo(zero.x, 0); ctx.lineTo(zero.x, h);
    ctx.stroke();
    ctx.fillStyle = C.axis; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (prms.machineStructure === 'carousel') {
      ctx.fillText('X+', w - 20, zero.y + 15); ctx.fillText('Z+', zero.x + 10, 15);
    } else {
      ctx.fillText('Z+', w - 20, zero.y + 15); ctx.fillText('X+', zero.x + 10, 15);
    }
    ctx.fillText('X0 Z0', zero.x + 4, zero.y - 4);

    // stock
    if (prms.stockMode === 'cylinder') {
      const sRad = (parseFloat(prms.stockDiameter) || 0) / 2;
      const sLen = parseFloat(prms.stockLength) || 0;
      const sFace = parseFloat(prms.stockFace) || 0;
      const s1 = toScreen(sRad, sFace), s2 = toScreen(sRad, -sLen), s3 = toScreen(0, -sLen), sStart = toScreen(0, sFace);
      ctx.fillStyle = 'rgba(100,100,100,0.1)';
      ctx.beginPath(); ctx.moveTo(sStart.x, sStart.y); ctx.lineTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.lineTo(s3.x, s3.y); ctx.fill();
      ctx.strokeStyle = C.stock; ctx.setLineDash([5, 5]); ctx.beginPath();
      ctx.moveTo(sStart.x, sStart.y); ctx.lineTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.lineTo(s3.x, s3.y);
      ctx.stroke(); ctx.setLineDash([]);
    } else if (calc.stockPathSegments.length > 0) {
      ctx.beginPath();
      calc.stockPathSegments.forEach((seg, i) => {
        if (seg.type === 'line') {
          const p1 = toScreen(seg.p1.x, seg.p1.z), p2 = toScreen(seg.p2.x, seg.p2.z);
          if (i === 0) ctx.moveTo(p1.x, p1.y); else ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        } else if (seg.type === 'arc') {
          const steps = 15;
          let sA = seg.startAngle, eA = seg.endAngle;
          if (seg.dir === 'G2' && eA > sA) eA -= 2 * Math.PI;
          if (seg.dir === 'G3' && eA < sA) eA += 2 * Math.PI;
          for (let j = 0; j <= steps; j++) {
            const a = sA + (eA - sA) * (j / steps);
            const pt = toScreen(seg.cx + Math.sin(a) * seg.r, seg.cz + Math.cos(a) * seg.r);
            if (j === 0 && i === 0) ctx.moveTo(pt.x, pt.y);
            else if (j === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
        }
      });
      ctx.strokeStyle = C.stock; ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    }

    // contour
    if (calc.worldPoints.length > 0) {
      ctx.beginPath();
      const start = toScreen(calc.worldPoints[0].xReal, calc.worldPoints[0].zReal);
      ctx.moveTo(start.x, start.y);
      for (let i = 0; i < calc.worldPoints.length - 1; i++) {
        const p1 = calc.worldPoints[i], p2 = calc.worldPoints[i + 1];
        const ptEnd = toScreen(p2.xReal, p2.zReal);
        if (p2.type === 'G0' || p2.type === 'G1') {
          ctx.lineTo(ptEnd.x, ptEnd.y);
        } else if (p2.type === 'G2' || p2.type === 'G3') {
          const arc = getArcParams({ x: p1.xReal, z: p1.zReal }, { x: p2.xReal, z: p2.zReal }, p2.rVal, p2.type);
          if (!arc.error) {
            const steps = 20;
            let sA = Math.atan2(p1.xReal - arc.cx, p1.zReal - arc.cz);
            let eA = Math.atan2(p2.xReal - arc.cx, p2.zReal - arc.cz);
            if (p2.type === 'G2' && eA > sA) eA -= 2 * Math.PI;
            if (p2.type === 'G3' && eA < sA) eA += 2 * Math.PI;
            for (let j = 1; j <= steps; j++) {
              const a = sA + (eA - sA) * (j / steps);
              const pt = toScreen(arc.cx + Math.sin(a) * arc.r, arc.cz + Math.cos(a) * arc.r);
              ctx.lineTo(pt.x, pt.y);
            }
          } else ctx.lineTo(ptEnd.x, ptEnd.y);
        }
      }
      ctx.strokeStyle = C.contour; ctx.lineWidth = 3; ctx.stroke();
    }

    // offset path
    if (calc.offsetPath.length > 0) {
      ctx.beginPath();
      calc.offsetPath.forEach((seg, i) => {
        if (seg.isDegenerate) return;
        if (seg.type === 'line') {
          const p1 = toScreen(seg.p1.x, seg.p1.z), p2 = toScreen(seg.p2.x, seg.p2.z);
          if (i === 0) ctx.moveTo(p1.x, p1.y); else ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        } else if (seg.type === 'arc') {
          const steps = 10;
          let sA = seg.startAngle, eA = seg.endAngle;
          if (seg.dir === 'G2' && eA > sA) eA -= 2 * Math.PI;
          if (seg.dir === 'G3' && eA < sA) eA += 2 * Math.PI;
          for (let j = 0; j <= steps; j++) {
            const a = sA + (eA - sA) * (j / steps);
            const pt = toScreen(seg.cx + Math.sin(a) * seg.r, seg.cz + Math.cos(a) * seg.r);
            if (j === 0 && i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
        }
      });
      ctx.strokeStyle = C.offset; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
    }

    // finish path
    if (prms.doFinishing && calc.finishOffsetPath.length > 0) {
      ctx.beginPath();
      calc.finishOffsetPath.forEach((seg, i) => {
        if (seg.isDegenerate) return;
        if (seg.type === 'line') {
          const p1 = toScreen(seg.p1.x, seg.p1.z), p2 = toScreen(seg.p2.x, seg.p2.z);
          if (i === 0) ctx.moveTo(p1.x, p1.y); else ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        } else if (seg.type === 'arc') {
          const steps = 15;
          let sA = seg.startAngle, eA = seg.endAngle;
          if (seg.dir === 'G2' && eA > sA) eA -= 2 * Math.PI;
          if (seg.dir === 'G3' && eA < sA) eA += 2 * Math.PI;
          for (let j = 0; j <= steps; j++) {
            const a = sA + (eA - sA) * (j / steps);
            const pt = toScreen(seg.cx + Math.sin(a) * seg.r, seg.cz + Math.cos(a) * seg.r);
            if (i === 0 && j === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
        }
      });
      ctx.strokeStyle = C.finish; ctx.lineWidth = 2; ctx.stroke();
    }

    // roughing passes
    ctx.beginPath();
    calc.passes.forEach(pass => {
      if (pass.type === 'long') {
        const p1 = toScreen(pass.x, pass.zStart), p2 = toScreen(pass.x, pass.zEnd);
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      } else {
        const p1 = toScreen(pass.xStart, pass.z), p2 = toScreen(pass.xEnd, pass.z);
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      }
    });
    ctx.strokeStyle = C.pass; ctx.lineWidth = 1.5; ctx.stroke();

    // sim path (dashed)
    if (calc.simPath.length > 0) {
      ctx.beginPath();
      for (let i = 0; i < calc.simPath.length - 1; i++) {
        const p1 = calc.simPath[i], p2 = calc.simPath[i + 1];
        const s = toScreen(p1.x, p1.z), e = toScreen(p2.x, p2.z);
        if (Math.abs(s.x - e.x) > 0.1 || Math.abs(s.y - e.y) > 0.1) {
          ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y);
        }
      }
      ctx.strokeStyle = '#f38ba8'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
    }

    // tool position during sim
    if ((S.simRunning || S.simProgress > 0) && calc.simPath.length > 0) {
      const totalPoints = calc.simPath.length;
      const floatIndex = S.simProgress * (totalPoints - 1);
      const idx = Math.floor(floatIndex);
      const t = floatIndex - idx;
      const pCurrent = calc.simPath[idx];
      if (pCurrent) {
        const pNext = calc.simPath[Math.min(idx + 1, totalPoints - 1)] || pCurrent;
        const curX = pCurrent.x + (pNext.x - pCurrent.x) * t;
        const curZ = pCurrent.z + (pNext.z - pCurrent.z) * t;
        const pt = toScreen(curX, curZ);
        const tRad = parseFloat(prms.toolRadius) || 0.8;
        const rPix = tRad * S.view.scale;
        ctx.fillStyle = C.tool; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
        if (prms.toolShape === 'round') {
          ctx.beginPath(); ctx.arc(pt.x, pt.y, rPix, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        } else if (prms.toolShape === 'polygon') {
          const lenPix = (parseFloat(prms.toolLength) || 10) * S.view.scale;
          const rotRad = -(parseFloat(prms.toolAngle) || 0) * (Math.PI / 180);
          const tipAng = (parseFloat(prms.toolTipAngle) || 90) * (Math.PI / 180);
          const a1 = rotRad, a2 = rotRad - tipAng;
          const distToCorner = rPix / Math.sin(tipAng / 2);
          const bisector = (a1 + a2) / 2;
          const cornerX = Math.cos(bisector + Math.PI) * distToCorner;
          const cornerY = Math.sin(bisector + Math.PI) * distToCorner;
          ctx.save(); ctx.translate(pt.x, pt.y);
          ctx.beginPath(); ctx.moveTo(cornerX, cornerY);
          ctx.lineTo(cornerX + Math.cos(a1) * lenPix, cornerY + Math.sin(a1) * lenPix);
          ctx.lineTo(cornerX + Math.cos(a2) * lenPix, cornerY + Math.sin(a2) * lenPix);
          ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
          ctx.beginPath(); ctx.arc(pt.x, pt.y, rPix, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(pt.x, pt.y, 1, 0, Math.PI * 2); ctx.fill();
      }
    }

    // draw points
    if (!S.simRunning) {
      const activePoints = S.editMode === 'contour' ? calc.worldPoints : calc.stockWorldPoints;
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (activePoints) {
        activePoints.forEach((p, i) => {
          if (!p) return;
          const pt = toScreen(p.xReal, p.zReal);
          const isHovered = (i === S.hoverPointId);
          const isDragged = (i === S.draggedPointId);
          const radius = (isHovered || isDragged) ? 8 : 4;
          ctx.fillStyle = (isHovered || isDragged) ? '#f9e2af' : (S.editMode === 'contour' ? C.contour : C.pass);
          ctx.beginPath(); ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2); ctx.fill();
          if (!isHovered && !isDragged) {
            ctx.fillStyle = '#f9e2af';
            ctx.fillText(`${i + 1}`, pt.x + 8, pt.y - 8);
          }
        });
      }
    }
  }

  // ── fitView ──
  function fitView() {
    const points = resolvePointsToAbsolute(S.contourPoints);
    if (points.length === 0) return;
    const prms = S.params;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    points.forEach(p => {
      const x = prms.mode === 'DIAMON' ? p.xAbs / 2 : p.xAbs;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (p.zAbs < minZ) minZ = p.zAbs; if (p.zAbs > maxZ) maxZ = p.zAbs;
    });
    const pad = 20;
    const isCar = prms.machineStructure === 'carousel';
    const visW = isCar ? (maxX - minX) : (maxZ - minZ);
    const visH = isCar ? (maxZ - minZ) : (maxX - minX);
    const ww = visW + pad * 2, hh = visH + pad * 2;
    if (ww <= 0 || hh <= 0) return;
    const cW = canvasWrap.clientWidth, cH = canvasWrap.clientHeight;
    if (cW === 0 || cH === 0) return;
    let ns = Math.min(cW / ww, cH / hh) * 0.8;
    if (ns > 10) ns = 10; if (ns < 0.1) ns = 0.1;
    const midZ = (minZ + maxZ) / 2, midX = (minX + maxX) / 2;
    if (isCar) S.view = { scale: ns, panX: cW / 2 - midX * ns, panY: cH / 2 + midZ * ns };
    else S.view = { scale: ns, panX: cW / 2 - midZ * ns, panY: cH / 2 + midX * ns };
    draw();
  }

  // ── getPointAt (hit testing) ──
  function getPointAt(clientX, clientY) {
    if (S.simRunning) return null;
    const calc = S._cachedCalc; if (!calc) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left, my = clientY - rect.top;
    const pts = S.editMode === 'contour' ? calc.worldPoints : calc.stockWorldPoints;
    if (!pts) return null;
    const prms = S.params;
    const toScreen = (x, z) => {
      if (prms.machineStructure === 'carousel') return { x: S.view.panX + x * S.view.scale, y: S.view.panY - z * S.view.scale };
      return { x: S.view.panX + z * S.view.scale, y: S.view.panY - x * S.view.scale };
    };
    let closest = null, minD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const pt = toScreen(pts[i].xReal, pts[i].zReal);
      const d = Math.hypot(pt.x - mx, pt.y - my);
      if (d < 15 && d < minD) { minD = d; closest = i; }
    }
    return closest;
  }

  // ── SIMULATION ──
  function startSimLoop() {
    if (S._animId) return;
    const animate = () => {
      if (!S.simRunning) { S._animId = null; return; }
      S.simProgress += 0.0015;
      if (S.simProgress >= 1) { S.simProgress = 1; S.simRunning = false; }
      draw();
      updateCodeHighlight();
      if (S.simRunning) S._animId = requestAnimationFrame(animate);
      else S._animId = null;
    };
    S._animId = requestAnimationFrame(animate);
  }

  // ── UI: errors ──
  function showErrors() {
    if (S.errors.length === 0) { errorsDiv.style.display = 'none'; return; }
    errorsDiv.style.display = '';
    errorsDiv.innerHTML = '<b>⚠ Nalezeny problémy:</b><ul>' +
      S.errors.map(e => '<li>' + (e.msg || e) + '</li>').join('') + '</ul>';
  }

  // ── UI: code area ──
  function renderCodeArea() {
    const calc = S._cachedCalc; if (!calc) return;
    // time info
    if (calc.estimatedTimeSeconds > 0)
      timeInfo.textContent = `⏱ ${Math.floor(calc.estimatedTimeSeconds / 60)}m ${Math.round(calc.estimatedTimeSeconds % 60)}s | ${(calc.totalPathLength / 1000).toFixed(2)}m`;
    else timeInfo.textContent = '';

    if (S.useManualCode) {
      codeScroll.style.display = 'none';
      manualTa.style.display = '';
      manualTa.value = S.manualGCode;
    } else {
      codeScroll.style.display = '';
      manualTa.style.display = 'none';
      codeScroll.innerHTML = S.generatedCode.map((line, idx) =>
        `<div class="cam-sim-code-line" data-idx="${idx}" data-simidx="${line.simIdx ?? ''}">${escHTML(line.text)}</div>`
      ).join('');
    }
    updateCodeHighlight();
    updateCodeBtns();
  }
  function updateCodeHighlight() {
    const calc = S._cachedCalc; if (!calc || S.useManualCode || calc.simPath.length < 2) return;
    const currentSimIdx = Math.floor(S.simProgress * (calc.simPath.length - 1));
    const activeIdx = S.generatedCode.findIndex(l => l.simIdx !== null && l.simIdx > currentSimIdx);
    const hlIdx = activeIdx === -1 ? findLastIdx(S.generatedCode, l => l.simIdx !== null) : activeIdx;
    codeScroll.querySelectorAll('.cam-sim-code-line').forEach((el, i) => {
      el.classList.toggle('cam-sim-code-active', i === hlIdx);
    });
    const activeEl = codeScroll.querySelector('.cam-sim-code-active');
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function updateCodeBtns() {
    root.querySelector('[data-code="auto"]').classList.toggle('cam-sim-active', !S.useManualCode);
    root.querySelector('[data-code="manual"]').classList.toggle('cam-sim-active', S.useManualCode);
  }
  function findLastIdx(arr, fn) {
    for (let i = arr.length - 1; i >= 0; i--) if (fn(arr[i])) return i;
    return -1;
  }
  function escHTML(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ── UI: sidebar tabs ──
  function renderTab() {
    const prms = S.params;
    tabBody.innerHTML = '';
    if (S.activeTab === 'editor') renderEditorTab();
    else if (S.activeTab === 'params') renderParamsTab();
    else if (S.activeTab === 'import') renderImportTab();
    root.querySelectorAll('.cam-sim-tabs button').forEach(btn => {
      btn.classList.toggle('cam-sim-active', btn.dataset.tab === S.activeTab);
    });
  }

  // ── editor tab ──
  function renderEditorTab() {
    const pts = S.editMode === 'contour' ? S.contourPoints : S.stockPoints;
    const isStock = S.editMode === 'stock';
    let html = `<div class="cam-sim-toggle-row">
      <button data-edit="contour" class="${!isStock ? 'cam-sim-active' : ''}">✏ Kontura</button>
      <button data-edit="stock" class="${isStock ? 'cam-sim-active' : ''}">📦 Polotovar</button>
    </div>`;
    html += `<div class="cam-sim-point-header"><div style="width:18px">#</div><div style="width:48px">Typ</div><div style="width:32px">Mód</div><div style="width:56px">X/U</div><div style="width:56px">Z/W</div><div style="width:40px">R</div></div>`;
    pts.forEach((p, i) => {
      const cls = isStock ? 'cam-sim-stock' : '';
      html += `<div class="cam-sim-point-row ${cls}" data-ptid="${p.id}">
        <div class="cam-sim-pt-num">${i + 1}</div>
        <select data-field="type" data-id="${p.id}"><option ${p.type === 'G0' ? 'selected' : ''}>G0</option><option ${p.type === 'G1' ? 'selected' : ''}>G1</option><option ${p.type === 'G2' ? 'selected' : ''}>G2</option><option ${p.type === 'G3' ? 'selected' : ''}>G3</option></select>
        <button class="cam-sim-mode-btn ${p.mode === 'INC' ? 'cam-sim-inc' : ''}" data-modeid="${p.id}">${p.mode === 'INC' ? 'INC' : 'ABS'}</button>
        <input type="number" data-field="x" data-id="${p.id}" value="${p.x}" placeholder="${p.mode === 'INC' ? 'U' : 'X'}">
        <input type="number" data-field="z" data-id="${p.id}" value="${p.z}" placeholder="${p.mode === 'INC' ? 'W' : 'Z'}">
        ${(p.type === 'G2' || p.type === 'G3') ? `<input type="number" data-field="r" data-id="${p.id}" value="${p.r}" placeholder="R" style="width:40px">` : ''}
        <div class="cam-sim-pt-actions">
          <button data-insertid="${p.id}" title="Vložit za">➕</button>
          <button data-deleteid="${p.id}" title="Smazat">🗑</button>
        </div>
      </div>`;
    });
    html += `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
      <button class="cam-sim-btn ${isStock ? 'cam-sim-btn-green' : 'cam-sim-btn-blue'}" data-act="addpt-list">➕ Přidat bod</button>
    </div>
    <div style="display:flex;gap:4px;margin-top:6px">
      <button class="cam-sim-btn cam-sim-btn-half cam-sim-btn-gray" data-act="copy-code">📋 Kopírovat</button>
      <button class="cam-sim-btn cam-sim-btn-half cam-sim-btn-purple" data-act="download">📥 Uložit</button>
    </div>
    <div style="margin-top:4px">
      <button class="cam-sim-btn cam-sim-btn-indigo" data-act="export-pdf">📄 Export PDF</button>
    </div>`;
    tabBody.innerHTML = html;
    attachEditorEvents();
  }

  function attachEditorEvents() {
    tabBody.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        S.editMode = btn.dataset.edit;
        if (S.editMode === 'stock' && S.stockPoints.length === 0) generateDefaultStock();
        renderTab(); draw();
      });
    });
    tabBody.querySelectorAll('[data-field]').forEach(el => {
      const id = parseInt(el.dataset.id);
      const field = el.dataset.field;
      el.addEventListener('change', () => {
        pushHistory();
        const list = S.editMode === 'contour' ? S.contourPoints : S.stockPoints;
        const pt = list.find(p => p.id === id);
        if (pt) {
          pt[field] = el.value;
          fullUpdate();
        }
      });
    });
    tabBody.querySelectorAll('[data-modeid]').forEach(btn => {
      btn.addEventListener('click', () => {
        pushHistory();
        const id = parseInt(btn.dataset.modeid);
        const list = S.editMode === 'contour' ? S.contourPoints : S.stockPoints;
        const pt = list.find(p => p.id === id);
        if (pt) { pt.mode = pt.mode === 'ABS' ? 'INC' : 'ABS'; fullUpdate(); }
      });
    });
    tabBody.querySelectorAll('[data-insertid]').forEach(btn => {
      btn.addEventListener('click', () => {
        pushHistory();
        const id = parseInt(btn.dataset.insertid);
        const list = S.editMode === 'contour' ? S.contourPoints : S.stockPoints;
        const idx = list.findIndex(p => p.id === id);
        if (idx >= 0) {
          const prev = list[idx];
          list.splice(idx + 1, 0, { ...prev, id: Date.now(), z: parseFloat(prev.z) - 5 });
          fullUpdate();
        }
      });
    });
    tabBody.querySelectorAll('[data-deleteid]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.deleteid);
        const list = S.editMode === 'contour' ? S.contourPoints : S.stockPoints;
        if (list.length > 1) {
          pushHistory();
          const idx = list.findIndex(p => p.id === id);
          if (idx >= 0) list.splice(idx, 1);
          fullUpdate();
        }
      });
    });
    const addBtn = tabBody.querySelector('[data-act="addpt-list"]');
    if (addBtn) addBtn.addEventListener('click', () => {
      pushHistory();
      const list = S.editMode === 'contour' ? S.contourPoints : S.stockPoints;
      const last = list.length > 0 ? list[list.length - 1] : { x: 100, z: 0 };
      list.push({ id: Date.now(), type: 'G1', x: last.x, z: parseFloat(last.z) - 10, r: 0, mode: 'ABS' });
      fullUpdate();
    });
    const copyBtn = tabBody.querySelector('[data-act="copy-code"]');
    if (copyBtn) copyBtn.addEventListener('click', handleCopyGCode);
    const dlBtn = tabBody.querySelector('[data-act="download"]');
    if (dlBtn) dlBtn.addEventListener('click', handleDownload);
    const pdfBtn = tabBody.querySelector('[data-act="export-pdf"]');
    if (pdfBtn) pdfBtn.addEventListener('click', handleExportPDF);
  }

  // ── params tab ──
  function renderParamsTab() {
    const prms = S.params;
    let html = '';
    html += `<div class="cam-sim-section-title">Struktura stroje</div>
    <div class="cam-sim-toggle-row">
      <button data-struct="lathe" class="${prms.machineStructure === 'lathe' ? 'cam-sim-active' : ''}">Soustruh</button>
      <button data-struct="carousel" class="${prms.machineStructure === 'carousel' ? 'cam-sim-active' : ''}">Karusel</button>
    </div>`;
    html += `<div class="cam-sim-section-title">Řídicí systém</div>
    <div class="cam-sim-toggle-row">
      <button data-ctrl="sinumerik" class="${prms.controlSystem === 'sinumerik' ? 'cam-sim-active' : ''}">Sinumerik</button>
      <button data-ctrl="fanuc" class="${prms.controlSystem === 'fanuc' ? 'cam-sim-active' : ''}">Fanuc</button>
      <button data-ctrl="heidenhain" class="${prms.controlSystem === 'heidenhain' ? 'cam-sim-active' : ''}">Heidenhain</button>
    </div>`;
    html += `<div class="cam-sim-section-title">Polotovar</div>
    <div class="cam-sim-toggle-row">
      <button data-smode="cylinder" class="${prms.stockMode === 'cylinder' ? 'cam-sim-active' : ''}">Válec</button>
      <button data-smode="casting" class="${prms.stockMode === 'casting' ? 'cam-sim-active' : ''}">Vlastní tvar</button>
    </div>`;
    if (prms.stockMode === 'cylinder') {
      html += `<div class="cam-sim-row">
        <div class="cam-sim-field"><label>Průměr (D)</label><input type="number" data-p="stockDiameter" value="${prms.stockDiameter}"></div>
        <div class="cam-sim-field"><label>Délka (Z-)</label><input type="number" data-p="stockLength" value="${prms.stockLength}"></div>
      </div>
      <div class="cam-sim-row">
        <div class="cam-sim-field"><label>Přídavek čelo</label><input type="number" data-p="stockFace" value="${prms.stockFace}"></div>
        <div class="cam-sim-field"><label>Přídavek (Auto)</label><input type="number" data-p="stockMargin" value="${prms.stockMargin}"></div>
      </div>
      <button class="cam-sim-btn cam-sim-btn-indigo" data-act="auto-stock">🎯 Auto-rozměr</button>`;
    } else {
      html += `<div class="cam-sim-info-box">Pro definici tvarového polotovaru přepněte na Editor → Polotovar.</div>`;
    }
    html += `<div class="cam-sim-section-title">Bezpečná poloha</div>
    <div class="cam-sim-row">
      <div class="cam-sim-field"><label>X (Průměr)</label><input type="number" data-p="safeX" value="${prms.safeX}"></div>
      <div class="cam-sim-field"><label>Z</label><input type="number" data-p="safeZ" value="${prms.safeZ}"></div>
    </div>`;
    html += `<div class="cam-sim-section-title">Databáze materiálů</div>
    <div class="cam-sim-mat-grid">${Object.keys(MATERIALS).map(k =>
      `<button data-mat="${k}">${MATERIALS[k].name}</button>`
    ).join('')}</div>`;
    html += `<div class="cam-sim-section-title">Hrubování</div>
    <div class="cam-sim-toggle-row">
      <button data-rough="longitudinal" class="${prms.roughingStrategy === 'longitudinal' ? 'cam-sim-active' : ''}">→ Podélně (Z)</button>
      <button data-rough="face" class="${prms.roughingStrategy === 'face' ? 'cam-sim-active' : ''}">↓ Čelně (X)</button>
    </div>
    <div class="cam-sim-row">
      <div class="cam-sim-field"><label>Hloubka (ap)</label><input type="number" step="0.5" data-p="depthOfCut" value="${prms.depthOfCut}"></div>
      <div class="cam-sim-field"><label>Posuv (F)</label><input type="number" step="0.05" data-p="feed" value="${prms.feed}"></div>
    </div>
    <div class="cam-sim-row">
      <div class="cam-sim-field"><label>Rychlost (Vc)</label><input type="number" step="10" data-p="speed" value="${prms.speed}"></div>
      <div class="cam-sim-field"><label>Odskok</label><input type="number" step="0.5" data-p="retractDistance" value="${prms.retractDistance}"></div>
    </div>`;
    html += `<div class="cam-sim-section-title">Nástroj</div>
    <div class="cam-sim-row">
      <div class="cam-sim-field"><label>Rádius (R)</label><input type="number" step="0.1" data-p="toolRadius" value="${prms.toolRadius}"></div>
      <div class="cam-sim-field"><label>Přídavek X</label><input type="number" step="0.1" data-p="allowanceX" value="${prms.allowanceX}"></div>
      <div class="cam-sim-field"><label>Přídavek Z</label><input type="number" step="0.1" data-p="allowanceZ" value="${prms.allowanceZ}"></div>
    </div>
    <div style="margin-top:4px"><label style="font-size:10px;color:#6c7086">Tvar destičky</label></div>
    <div class="cam-sim-tool-shape-row">
      <button data-tshape="round" class="${prms.toolShape === 'round' ? 'cam-sim-active' : ''}">⬤</button>
      <button data-tshape="polygon" class="${prms.toolShape === 'polygon' ? 'cam-sim-active' : ''}">◼</button>
    </div>`;
    if (prms.toolShape === 'polygon') {
      html += `<div class="cam-sim-row">
        <div class="cam-sim-field"><label>Délka hrany</label><input type="number" data-p="toolLength" value="${prms.toolLength}"></div>
        <div class="cam-sim-field"><label>Natočení (°)</label><input type="number" data-p="toolAngle" value="${prms.toolAngle}"></div>
        <div class="cam-sim-field"><label>Vrch. úhel (ε)</label><input type="number" data-p="toolTipAngle" value="${prms.toolTipAngle}"></div>
      </div>`;
    }
    html += `<div class="cam-sim-checkbox-row">
      <input type="checkbox" id="cam-sim-fin" ${prms.doFinishing ? 'checked' : ''}>
      <span>Dokončovací operace</span>
    </div>
    <small class="cam-sim-info-box" style="display:block;margin-top:2px">Dráha nástroje přesně po kontuře (pouze s korekcí R).</small>`;
    html += `<div style="text-align:center;margin-top:16px">
      <button class="cam-sim-btn cam-sim-btn-red" style="width:auto;display:inline-flex" data-act="reset">🔄 Resetovat vše</button>
    </div>`;
    tabBody.innerHTML = html;
    attachParamsEvents();
  }

  function attachParamsEvents() {
    tabBody.querySelectorAll('[data-struct]').forEach(btn => {
      btn.addEventListener('click', () => { S.params.machineStructure = btn.dataset.struct; fullUpdate(); });
    });
    tabBody.querySelectorAll('[data-ctrl]').forEach(btn => {
      btn.addEventListener('click', () => { S.params.controlSystem = btn.dataset.ctrl; fullUpdate(); });
    });
    tabBody.querySelectorAll('[data-smode]').forEach(btn => {
      btn.addEventListener('click', () => {
        S.params.stockMode = btn.dataset.smode;
        if (btn.dataset.smode === 'casting') { S.activeTab = 'editor'; S.editMode = 'stock'; if (S.stockPoints.length === 0) generateDefaultStock(); }
        fullUpdate();
      });
    });
    tabBody.querySelectorAll('[data-p]').forEach(inp => {
      inp.addEventListener('change', () => {
        const v = inp.value;
        S.params[inp.dataset.p] = inp.type === 'number' ? (parseFloat(v) || 0) : v;
        fullUpdate();
      });
    });
    tabBody.querySelectorAll('[data-mat]').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = MATERIALS[btn.dataset.mat];
        if (m) { S.params.speed = m.speed; S.params.feed = m.feed; S.params.depthOfCut = m.depth; fullUpdate(); }
      });
    });
    tabBody.querySelectorAll('[data-rough]').forEach(btn => {
      btn.addEventListener('click', () => {
        S.params.roughingStrategy = btn.dataset.rough;
        S.params.toolAngle = btn.dataset.rough === 'face' ? -15 : 15;
        fullUpdate();
      });
    });
    tabBody.querySelectorAll('[data-tshape]').forEach(btn => {
      btn.addEventListener('click', () => {
        S.params.toolShape = btn.dataset.tshape;
        if (btn.dataset.tshape === 'polygon') S.params.toolTipAngle = 90;
        fullUpdate();
      });
    });
    const finCb = tabBody.querySelector('#cam-sim-fin');
    if (finCb) finCb.addEventListener('change', () => { S.params.doFinishing = finCb.checked; fullUpdate(); });
    const autoBtn = tabBody.querySelector('[data-act="auto-stock"]');
    if (autoBtn) autoBtn.addEventListener('click', handleAutoStock);
    const resetBtn = tabBody.querySelector('[data-act="reset"]');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      if (confirm('Opravdu chcete vymazat veškerou uloženou práci a resetovat?')) {
        localStorage.removeItem(STORAGE_KEY);
        overlay.remove();
        openCamSimulator();
      }
    });
  }

  // ── import tab ──
  function renderImportTab() {
    tabBody.innerHTML = `
      <div class="cam-sim-section-title">Import G-kódu</div>
      <textarea class="cam-sim-import-ta" placeholder="G1 X... Z..."></textarea>
      <button class="cam-sim-btn cam-sim-btn-green" style="margin-top:6px" data-act="import-gcode">📥 Import</button>`;
    const importBtn = tabBody.querySelector('[data-act="import-gcode"]');
    const ta = tabBody.querySelector('.cam-sim-import-ta');
    if (importBtn) importBtn.addEventListener('click', () => {
      const text = ta.value;
      if (!text.trim()) return;
      const pts = parseContourGCode(text);
      if (pts.length > 0) {
        pushHistory();
        if (S.editMode === 'contour') S.contourPoints = pts;
        else S.stockPoints = pts;
        fullUpdate();
        fitView();
      } else {
        alert('Nepodařilo se rozpoznat žádné body v G-kódu.');
      }
    });
  }

  // ── auto stock ──
  function handleAutoStock() {
    const absPts = resolvePointsToAbsolute(S.contourPoints);
    if (absPts.length === 0) return;
    let minZ = Infinity, maxZ = -Infinity, maxD = 0;
    absPts.forEach(p => {
      const x = S.params.mode === 'DIAMON' ? p.xAbs : p.xAbs * 2;
      if (Math.abs(x) > maxD) maxD = Math.abs(x);
      if (p.zAbs < minZ) minZ = p.zAbs; if (p.zAbs > maxZ) maxZ = p.zAbs;
    });
    const margin = parseFloat(S.params.stockMargin) || 5;
    S.params.stockDiameter = Math.ceil(maxD + margin * 2);
    S.params.stockLength = Math.ceil(Math.abs(minZ) + margin);
    S.params.stockFace = 2.0;
    fullUpdate();
  }

  function generateDefaultStock() {
    const absPts = resolvePointsToAbsolute(S.contourPoints);
    if (absPts.length === 0) return;
    let minZ = Infinity, maxX = 0;
    absPts.forEach(p => {
      const x = S.params.mode === 'DIAMON' ? p.xAbs / 2 : p.xAbs;
      if (Math.abs(x) > maxX) maxX = Math.abs(x);
      if (p.zAbs < minZ) minZ = p.zAbs;
    });
    const sR = maxX + 5, sL = minZ - 5;
    const stockX = S.params.mode === 'DIAMON' ? sR * 2 : sR;
    S.stockPoints = [
      { id: Date.now(), type: 'G0', x: stockX, z: 2, r: 0, mode: 'ABS' },
      { id: Date.now() + 1, type: 'G1', x: stockX, z: sL, r: 0, mode: 'ABS' },
      { id: Date.now() + 2, type: 'G1', x: 0, z: sL, r: 0, mode: 'ABS' }
    ];
  }

  // ── copy / download / PDF ──
  function handleCopyGCode() {
    const text = S.useManualCode ? S.manualGCode : S.generatedCode.map(l => l.text).join('\n');
    navigator.clipboard.writeText(text).catch(() => alert('Nepodařilo se zkopírovat kód do schránky.'));
  }
  function handleDownload() {
    const text = S.useManualCode ? S.manualGCode : S.generatedCode.map(l => l.text).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    let ext = 'mpf';
    if (S.params.controlSystem === 'heidenhain') ext = 'h';
    else if (S.params.controlSystem === 'fanuc') ext = 'nc';
    a.download = `program_${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  async function handleExportPDF() {
    try {
      const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.esm.min.js');
      const doc = new jsPDF();
      const noAccents = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      doc.setFontSize(20); doc.text(noAccents('Technologicky list - CAM'), 15, 20);
      doc.setFontSize(10);
      doc.text(`Datum: ${new Date().toLocaleDateString()}`, 15, 30);
      doc.text(noAccents(`System: ${S.params.controlSystem.toUpperCase()}`), 15, 35);
      doc.setFontSize(12); doc.text(noAccents('Parametry obrabeni:'), 15, 50);
      doc.setFontSize(10);
      let y = 60;
      const addP = (l, v) => { doc.text(noAccents(`${l}: ${v}`), 20, y); y += 6; };
      addP('Stroj', S.params.machineType); addP('Nastroj', S.params.toolName);
      addP('Rezna rychlost', S.params.speed + ' m/min'); addP('Posuv', S.params.feed + ' mm/ot');
      addP('Hloubka trisky', S.params.depthOfCut + ' mm');
      if (canvas) {
        const imgData = canvas.toDataURL('image/png');
        const imgProps = doc.getImageProperties(imgData);
        const pdfW = 100, pdfH = (imgProps.height * pdfW) / imgProps.width;
        doc.text(noAccents('Nahled drahy:'), 100, 50);
        doc.addImage(imgData, 'PNG', 100, 55, pdfW, pdfH);
      }
      y = 120; doc.setFontSize(12); doc.text('G-Code:', 15, y); y += 10;
      doc.setFont('courier', 'normal'); doc.setFontSize(9);
      S.generatedCode.forEach(lineObj => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(noAccents(lineObj.text), 15, y); y += 5;
      });
      doc.save('CAM_Export.pdf');
    } catch (err) {
      alert('Knihovna pro PDF se nepodařila načíst. Zkuste to znovu.');
      console.error(err);
    }
  }

  // ── FULL UPDATE (recalc + redraw + re-render UI) ──
  function fullUpdate() {
    S._cachedCalc = calculate();
    S.generatedCode = generateGCode(S._cachedCalc);
    showErrors();
    renderCodeArea();
    renderTab();
    draw();
    saveState();
    updateUndoRedoBtns();
  }

  // ── EVENT WIRING ──

  // toolbar
  toolbar.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'play') {
      if (S.simRunning) { S.simRunning = false; btn.textContent = '▶'; }
      else { if (S.simProgress >= 1) S.simProgress = 0; S.simRunning = true; btn.textContent = '⏸'; startSimLoop(); }
    } else if (act === 'stop') {
      S.simRunning = false; S.simProgress = 0;
      toolbar.querySelector('[data-act="play"]').textContent = '▶';
      draw(); updateCodeHighlight();
    } else if (act === 'addpt') {
      S.addPointMode = !S.addPointMode;
      btn.classList.toggle('cam-sim-active', S.addPointMode);
      canvas.style.cursor = S.addPointMode ? 'copy' : 'crosshair';
    } else if (act === 'fit') {
      fitView();
    }
  });

  // undo / redo
  root.querySelector('[data-act="undo"]').addEventListener('click', undo);
  root.querySelector('[data-act="redo"]').addEventListener('click', redo);

  // tabs
  root.querySelectorAll('.cam-sim-tabs button').forEach(btn => {
    btn.addEventListener('click', () => { S.activeTab = btn.dataset.tab; renderTab(); });
  });

  // code area buttons
  root.querySelector('[data-code="auto"]').addEventListener('click', () => { S.useManualCode = false; fullUpdate(); });
  root.querySelector('[data-code="manual"]').addEventListener('click', () => {
    S.useManualCode = true;
    if (!S.manualGCode) S.manualGCode = S.generatedCode.map(l => l.text).join('\n');
    fullUpdate();
  });

  // manual textarea
  manualTa.addEventListener('input', () => { S.manualGCode = manualTa.value; S._cachedCalc = calculate(); S.generatedCode = generateGCode(S._cachedCalc); draw(); saveState(); });

  // code line click
  codeScroll.addEventListener('click', e => {
    const lineEl = e.target.closest('.cam-sim-code-line');
    if (!lineEl) return;
    const simIdx = lineEl.dataset.simidx;
    if (simIdx !== '' && S._cachedCalc && S._cachedCalc.simPath.length > 1) {
      S.simProgress = parseInt(simIdx) / (S._cachedCalc.simPath.length - 1);
      draw(); updateCodeHighlight();
    }
  });

  // ── CANVAS INTERACTION ──
  function handleInsertAfter(index) {
    pushHistory();
    const list = S.editMode === 'contour' ? S.contourPoints : S.stockPoints;
    const prev = list[index];
    list.splice(index + 1, 0, { ...prev, id: Date.now(), z: parseFloat(prev.z) - 5 });
    fullUpdate();
  }

  canvasWrap.addEventListener('wheel', e => {
    e.preventDefault();
    S.view.scale = Math.max(0.2, Math.min(S.view.scale * (1 - Math.sign(e.deltaY) * 0.15), 50));
    draw();
  }, { passive: false });

  let lastMousePos = { x: 0, y: 0 };
  let lastPinchDist = null;

  canvasWrap.addEventListener('mousedown', e => {
    const pointIdx = getPointAt(e.clientX, e.clientY);
    if (S.addPointMode) {
      if (pointIdx !== null) { handleInsertAfter(pointIdx); S.addPointMode = false; toolbar.querySelector('[data-act="addpt"]').classList.remove('cam-sim-active'); canvas.style.cursor = 'crosshair'; }
      return;
    }
    if (pointIdx !== null) { pushHistory(); S.draggedPointId = pointIdx; S.isDragging = true; }
    else { S.isDragging = true; }
    lastMousePos = { x: e.clientX, y: e.clientY };
  });

  canvasWrap.addEventListener('mousemove', e => {
    const pointIdx = getPointAt(e.clientX, e.clientY);
    if (S.addPointMode) {
      canvas.style.cursor = pointIdx !== null ? 'pointer' : 'copy';
      if (S.hoverPointId !== pointIdx) { S.hoverPointId = pointIdx; draw(); }
      return;
    }
    if (!S.isDragging) {
      if (S.hoverPointId !== pointIdx) { S.hoverPointId = pointIdx; draw(); }
      canvas.style.cursor = pointIdx !== null ? 'move' : 'crosshair';
      return;
    }
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    lastMousePos = { x: e.clientX, y: e.clientY };
    if (S.draggedPointId !== null) {
      let dX_unit = 0, dZ_unit = 0;
      if (S.params.machineStructure === 'carousel') {
        dX_unit = dx / S.view.scale; dZ_unit = -dy / S.view.scale;
      } else {
        dZ_unit = dx / S.view.scale; dX_unit = -dy / S.view.scale;
      }
      const list = S.editMode === 'contour' ? S.contourPoints : S.stockPoints;
      const pt = list[S.draggedPointId];
      pt.x = parseFloat(pt.x) + dX_unit;
      pt.z = parseFloat(pt.z) + dZ_unit;
      S._cachedCalc = calculate();
      S.generatedCode = generateGCode(S._cachedCalc);
      draw();
    } else {
      S.view.panX += dx; S.view.panY += dy;
      draw();
    }
  });

  const handleMouseUp = () => {
    if (S.isDragging && S.draggedPointId !== null) {
      saveState(); renderCodeArea(); renderTab();
    }
    S.isDragging = false; S.draggedPointId = null;
  };
  canvasWrap.addEventListener('mouseup', handleMouseUp);
  canvasWrap.addEventListener('mouseleave', handleMouseUp);

  // ── TOUCH ──
  canvasWrap.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const pointIdx = getPointAt(t.clientX, t.clientY);
      if (S.addPointMode) {
        if (pointIdx !== null) { handleInsertAfter(pointIdx); S.addPointMode = false; toolbar.querySelector('[data-act="addpt"]').classList.remove('cam-sim-active'); canvas.style.cursor = 'crosshair'; }
        return;
      }
      if (pointIdx !== null) { pushHistory(); S.draggedPointId = pointIdx; S.isDragging = true; }
      else { S.isDragging = true; }
      lastMousePos = { x: t.clientX, y: t.clientY };
    } else if (e.touches.length === 2) {
      lastPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: true });

  canvasWrap.addEventListener('touchmove', e => {
    if (S.addPointMode) return;
    if (S.isDragging && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - lastMousePos.x;
      const dy = t.clientY - lastMousePos.y;
      lastMousePos = { x: t.clientX, y: t.clientY };
      if (S.draggedPointId !== null) {
        let dX_unit = 0, dZ_unit = 0;
        if (S.params.machineStructure === 'carousel') {
          dX_unit = dx / S.view.scale; dZ_unit = -dy / S.view.scale;
        } else {
          dZ_unit = dx / S.view.scale; dX_unit = -dy / S.view.scale;
        }
        const list = S.editMode === 'contour' ? S.contourPoints : S.stockPoints;
        const pt = list[S.draggedPointId];
        pt.x = parseFloat(pt.x) + dX_unit;
        pt.z = parseFloat(pt.z) + dZ_unit;
        S._cachedCalc = calculate();
        S.generatedCode = generateGCode(S._cachedCalc);
        draw();
      } else {
        S.view.panX += dx; S.view.panY += dy;
        draw();
      }
    }
    if (e.touches.length === 2 && lastPinchDist) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const zoomFactor = dist / lastPinchDist;
      S.view.scale = Math.max(0.2, Math.min(S.view.scale * zoomFactor, 50));
      lastPinchDist = dist;
      draw();
    }
  }, { passive: true });

  canvasWrap.addEventListener('touchend', () => {
    if (S.isDragging && S.draggedPointId !== null) {
      saveState(); renderCodeArea(); renderTab();
    }
    S.isDragging = false; S.draggedPointId = null; lastPinchDist = null;
  });

  // ── RESIZE OBSERVER ──
  const resizeObs = new ResizeObserver(() => {
    const cw = canvasWrap.clientWidth, ch = canvasWrap.clientHeight;
    if (cw > 0 && ch > 0 && (canvas.width !== cw || canvas.height !== ch)) {
      canvas.width = cw; canvas.height = ch;
    }
    draw();
  });
  resizeObs.observe(canvasWrap);

  // ── CLEANUP on overlay removal ──
  const cleanupObs = new MutationObserver((_, obs) => {
    if (!document.body.contains(overlay)) {
      resizeObs.disconnect(); obs.disconnect();
      if (S._animId) cancelAnimationFrame(S._animId);
      S.simRunning = false;
    }
  });
  cleanupObs.observe(document.body, { childList: true });

  // ── INITIAL SETUP ──
  canvas.width = canvasWrap.clientWidth;
  canvas.height = canvasWrap.clientHeight;
  fullUpdate();
  requestAnimationFrame(() => fitView());
}
