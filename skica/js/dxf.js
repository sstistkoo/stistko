// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – DXF Import / Export                                ║
// ╚══════════════════════════════════════════════════════════════╝

import { COLORS } from './constants.js';
import { getRectCorners } from './utils.js';

const MAX_ENTITIES = 10000;
const DEFAULT_COLOR = COLORS.primary;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// DXF ACI (AutoCAD Color Index) → CSS barvy
const ACI_COLORS = {
  1: '#ff0000',   // červená
  2: '#ffff00',   // žlutá
  3: '#00ff00',   // zelená
  4: '#00ffff',   // cyan
  5: '#0000ff',   // modrá
  6: '#ff00ff',   // magenta
  7: '#ffffff',   // bílá
  8: '#808080',   // tmavě šedá
  9: '#c0c0c0',   // světle šedá
  10: '#ff0000',  // red
  11: '#ff7f7f',  // light red
  20: '#ff7f00',  // orange
  30: '#ff7f00',  // orange
  40: '#ffbf00',  // gold
  50: '#ffff00',  // yellow
  60: '#bfff00',  // yellow-green
  70: '#00ff00',  // green
  80: '#00ff7f',  // spring green
  90: '#00ffbf',  // aquamarine
  100: '#00ffff', // cyan
  110: '#007fff', // azure
  120: '#0000ff', // blue
  130: '#7f00ff', // violet
  140: '#bf00ff', // purple
  150: '#ff00ff', // magenta
  160: '#ff007f', // rose
  170: '#333333', // dark gray
  250: '#333333', // dark gray
  251: '#555555', // gray
  252: '#787878', // medium gray
  253: '#a0a0a0', // lighter gray
  254: '#c8c8c8', // lightest gray
  255: '#ffffff', // white (ByBlock)
};

// CSS barvy → ACI (pro export)
// Základní barvy mají prioritu (nižší ACI index)
const CSS_TO_ACI = {};
for (const [code, hex] of Object.entries(ACI_COLORS)) {
  const key = hex.toLowerCase();
  const aci = parseInt(code, 10);
  // Preferuj nižší ACI kódy (základní barvy 1-9)
  if (!CSS_TO_ACI[key] || aci < CSS_TO_ACI[key]) {
    CSS_TO_ACI[key] = aci;
  }
}

// Rozšířené mapování SKICA barev → ACI
CSS_TO_ACI['#89b4fa'] = 5;   // primary → modrá
CSS_TO_ACI['#6c7086'] = 8;   // construction → šedá
CSS_TO_ACI['#a6e3a1'] = 3;   // dimension → zelená
CSS_TO_ACI['#f5c2e7'] = 6;   // preview → magenta
CSS_TO_ACI['#fab387'] = 30;  // snapPoint → oranžová
CSS_TO_ACI['#cba6f7'] = 130; // snapEdge → fialová
CSS_TO_ACI['#f38ba8'] = 1;   // delete/červená
CSS_TO_ACI['#cdd6f4'] = 7;   // text → bílá

function safeFloat(val) {
  const n = parseFloat(val);
  return isFinite(n) ? n : 0;
}

function aciColor(code) {
  const c = parseInt(code, 10);
  return isNaN(c) ? DEFAULT_COLOR : (ACI_COLORS[c] || DEFAULT_COLOR);
}

function colorToAci(cssColor) {
  if (!cssColor) return 7;
  return CSS_TO_ACI[cssColor.toLowerCase()] || 7;
}

// Rozděl DXF text na páry (group code, value)
function parsePairs(text) {
  const lines = text.split(/\r?\n/);
  const pairs = [];
  let i = 0;
  while (i + 1 < lines.length) {
    const code = parseInt(lines[i].trim(), 10);
    const value = lines[i + 1].trim();
    i += 2;
    if (isNaN(code)) continue;
    pairs.push({ code, value });
  }
  return pairs;
}

// Najdi sekci ENTITIES v DXF párech
function findEntitiesSection(pairs) {
  let start = -1;
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].code === 2 && pairs[i].value === 'ENTITIES') {
      start = i + 1;
    }
    if (start >= 0 && pairs[i].code === 0 && pairs[i].value === 'ENDSEC') {
      return { start, end: i };
    }
  }
  return null;
}

// ── Tessellace ELLIPSE na obloukové/úsečkové segmenty ──
function tessellateEllipse(data, color) {
  const cx = safeFloat(data.find(p => p.code === 10)?.value);
  const cy = safeFloat(data.find(p => p.code === 20)?.value);
  // Koncový bod hlavní osy (relativně k centru)
  const mx = safeFloat(data.find(p => p.code === 11)?.value);
  const my = safeFloat(data.find(p => p.code === 21)?.value);
  const ratio = safeFloat(data.find(p => p.code === 40)?.value) || 1;
  const startParam = safeFloat(data.find(p => p.code === 41)?.value);
  const endParam = safeFloat(data.find(p => p.code === 42)?.value) || (2 * Math.PI);

  const a = Math.sqrt(mx * mx + my * my); // hlavní poloosa
  const b = a * ratio; // vedlejší poloosa
  const rot = Math.atan2(my, mx); // rotace elipsy

  // Pokud je ratio ≈ 1, je to kružnice/oblouk
  if (Math.abs(ratio - 1) < 0.001) {
    const isFullCircle = Math.abs(endParam - startParam - 2 * Math.PI) < 0.01 ||
                         Math.abs(endParam - startParam) < 0.01;
    if (isFullCircle) {
      return [{ type: 'circle', cx, cy, r: a, color }];
    }
    return [{
      type: 'arc', cx, cy, r: a,
      startAngle: startParam + rot,
      endAngle: endParam + rot,
      color
    }];
  }

  // Tessellace na úsečky
  const segments = Math.max(32, Math.round(a * 4));
  const step = (endParam - startParam) / segments;
  const results = [];
  for (let i = 0; i < segments; i++) {
    const t1 = startParam + i * step;
    const t2 = startParam + (i + 1) * step;
    const cos1 = Math.cos(t1), sin1 = Math.sin(t1);
    const cos2 = Math.cos(t2), sin2 = Math.sin(t2);
    const cosR = Math.cos(rot), sinR = Math.sin(rot);
    results.push({
      type: 'line',
      x1: cx + a * cos1 * cosR - b * sin1 * sinR,
      y1: cy + a * cos1 * sinR + b * sin1 * cosR,
      x2: cx + a * cos2 * cosR - b * sin2 * sinR,
      y2: cy + a * cos2 * sinR + b * sin2 * cosR,
      color
    });
  }
  return results;
}

// ── Tessellace SPLINE na úsečky ──
function tessellateSpline(data, color) {
  // Sbírej řídicí body (kód 10/20) a fit body (kód 11/21)
  const controlPts = [];
  const fitPts = [];
  for (const p of data) {
    if (p.code === 10) controlPts.push({ x: safeFloat(p.value), y: 0 });
    else if (p.code === 20 && controlPts.length > 0) controlPts[controlPts.length - 1].y = safeFloat(p.value);
    else if (p.code === 11) fitPts.push({ x: safeFloat(p.value), y: 0 });
    else if (p.code === 21 && fitPts.length > 0) fitPts[fitPts.length - 1].y = safeFloat(p.value);
  }

  // Preferuj fit body (přesnější aproximace), jinak řídicí body
  const pts = fitPts.length >= 2 ? fitPts : controlPts;
  if (pts.length < 2) return [];

  const results = [];
  for (let i = 0; i < pts.length - 1; i++) {
    results.push({
      type: 'line',
      x1: pts[i].x, y1: pts[i].y,
      x2: pts[i + 1].x, y2: pts[i + 1].y,
      color
    });
  }
  return results;
}

// Parsuj jednu DXF entitu → SKICA objekt(y)
function parseEntity(type, data) {
  const colorPair = data.find(p => p.code === 62);
  const color = colorPair ? aciColor(colorPair.value) : DEFAULT_COLOR;

  switch (type) {
    case 'POINT': {
      const x = safeFloat(data.find(p => p.code === 10)?.value);
      const y = safeFloat(data.find(p => p.code === 20)?.value);
      return { type: 'point', x, y, color };
    }

    case 'LINE': {
      const x1 = safeFloat(data.find(p => p.code === 10)?.value);
      const y1 = safeFloat(data.find(p => p.code === 20)?.value);
      const x2 = safeFloat(data.find(p => p.code === 11)?.value);
      const y2 = safeFloat(data.find(p => p.code === 21)?.value);
      return { type: 'line', x1, y1, x2, y2, color };
    }

    case 'CIRCLE': {
      const cx = safeFloat(data.find(p => p.code === 10)?.value);
      const cy = safeFloat(data.find(p => p.code === 20)?.value);
      const r = safeFloat(data.find(p => p.code === 40)?.value);
      return { type: 'circle', cx, cy, r, color };
    }

    case 'ARC': {
      const cx = safeFloat(data.find(p => p.code === 10)?.value);
      const cy = safeFloat(data.find(p => p.code === 20)?.value);
      const r = safeFloat(data.find(p => p.code === 40)?.value);
      const startDeg = safeFloat(data.find(p => p.code === 50)?.value);
      const endDeg = safeFloat(data.find(p => p.code === 51)?.value);
      return {
        type: 'arc', cx, cy, r,
        startAngle: startDeg * DEG2RAD,
        endAngle: endDeg * DEG2RAD,
        color
      };
    }

    case 'LWPOLYLINE': {
      const flags = parseInt(data.find(p => p.code === 70)?.value || '0', 10);
      const closed = !!(flags & 1);

      // Sbírej vertex data do mezivrstvy – toleruje libovolné pořadí kódů
      // DXF spec: kód 10 zahajuje nový vertex, 20/42 patří k poslednímu
      const rawVerts = [];
      for (const p of data) {
        if (p.code === 10) {
          rawVerts.push({ x: safeFloat(p.value), y: 0, bulge: 0 });
        } else if (p.code === 20 && rawVerts.length > 0) {
          rawVerts[rawVerts.length - 1].y = safeFloat(p.value);
        } else if (p.code === 42 && rawVerts.length > 0) {
          rawVerts[rawVerts.length - 1].bulge = safeFloat(p.value);
        }
      }

      const vertices = rawVerts.map(v => ({ x: v.x, y: v.y }));
      const bulges = rawVerts.map(v => v.bulge);

      return { type: 'polyline', vertices, bulges, closed, color };
    }

    case 'TEXT':
    case 'MTEXT': {
      const x = safeFloat(data.find(p => p.code === 10)?.value);
      const y = safeFloat(data.find(p => p.code === 20)?.value);
      let text = data.find(p => p.code === 1)?.value || '';
      // MTEXT continuation text (kód 3) – připoj další části textu
      if (type === 'MTEXT') {
        for (const p of data) {
          if (p.code === 3) text = p.value + text;
        }
      }
      const height = safeFloat(data.find(p => p.code === 40)?.value) || 14;
      const rotation = safeFloat(data.find(p => p.code === 50)?.value) || 0;
      // MTEXT může mít formátovací kódy – odstraň je
      if (type === 'MTEXT') {
        text = text.replace(/\\[pPfFcChHwWaAqQtT][^;]*;/g, '')
                   .replace(/\{|\}/g, '')
                   .replace(/\\P/g, '\n');
      }
      if (!text.trim()) return null;
      return {
        type: 'text', x, y,
        text: text.trim(),
        fontSize: Math.round(height),
        rotation: rotation * DEG2RAD,
        color
      };
    }

    case 'ELLIPSE':
      return { _multi: tessellateEllipse(data, color) };

    case 'SPLINE':
      return { _multi: tessellateSpline(data, color) };

    default:
      return null;
  }
}

/**
 * Parsuje DXF text a vrací entity.
 * Podporuje: POINT, LINE, CIRCLE, ARC, LWPOLYLINE, POLYLINE (heavy),
 *            TEXT, MTEXT, ELLIPSE (tessellace), SPLINE (tessellace)
 * @param {string} text
 * @returns {import('./types.js').DXFParseResult}
 */
export function parseDXF(text) {
  const entities = [];
  const errors = [];

  const pairs = parsePairs(text);
  const section = findEntitiesSection(pairs);

  if (!section) {
    errors.push('Sekce ENTITIES nenalezena v DXF souboru');
    return { entities, errors };
  }

  // ── První průchod: seskup heavy POLYLINE (POLYLINE/VERTEX/SEQEND) ──
  const rawEntities = [];
  let i = section.start;
  while (i < section.end) {
    if (pairs[i].code !== 0) { i++; continue; }

    const entityType = pairs[i].value;
    i++;

    const entityData = [];
    while (i < section.end && pairs[i].code !== 0) {
      entityData.push(pairs[i]);
      i++;
    }

    if (entityType === 'POLYLINE') {
      // Heavy POLYLINE: sbírej VERTEX entity až do SEQEND
      const colorPair = entityData.find(p => p.code === 62);
      const color = colorPair ? aciColor(colorPair.value) : DEFAULT_COLOR;
      const flags = parseInt(entityData.find(p => p.code === 70)?.value || '0', 10);
      const closed = !!(flags & 1);
      const vertices = [];
      const bulges = [];

      while (i < section.end) {
        if (pairs[i].code !== 0) { i++; continue; }
        const vType = pairs[i].value;
        i++;
        if (vType === 'SEQEND') {
          // Přeskoč data SEQEND
          while (i < section.end && pairs[i].code !== 0) i++;
          break;
        }
        if (vType === 'VERTEX') {
          let vx = 0, vy = 0, vb = 0;
          while (i < section.end && pairs[i].code !== 0) {
            if (pairs[i].code === 10) vx = safeFloat(pairs[i].value);
            else if (pairs[i].code === 20) vy = safeFloat(pairs[i].value);
            else if (pairs[i].code === 42) vb = safeFloat(pairs[i].value);
            i++;
          }
          vertices.push({ x: vx, y: vy });
          bulges.push(vb);
        } else {
          // Neznámá sub-entita v POLYLINE
          while (i < section.end && pairs[i].code !== 0) i++;
        }
      }

      if (vertices.length >= 2) {
        rawEntities.push({ entityType: 'LWPOLYLINE', entityData: [] });
        entities.push({ type: 'polyline', vertices, bulges, closed, color });
        if (entities.length >= MAX_ENTITIES) {
          errors.push(`Dosažen limit ${MAX_ENTITIES} entit, zbytek ignorován`);
          break;
        }
      }
      continue;
    }

    rawEntities.push({ entityType, entityData });
  }

  // ── Druhý průchod: parsuj normální entity ──
  for (const { entityType, entityData } of rawEntities) {
    if (entityType === 'LWPOLYLINE' && entityData.length === 0) continue; // heavy polyline already processed

    const obj = parseEntity(entityType, entityData);
    if (obj) {
      if (obj._multi) {
        // Tessellované entity (ELLIPSE, SPLINE) → více objektů
        for (const sub of obj._multi) {
          entities.push(sub);
          if (entities.length >= MAX_ENTITIES) break;
        }
        if (obj._multi.length === 0) {
          errors.push(`${entityType}: nedostatek dat pro tessellaci`);
        }
      } else {
        entities.push(obj);
      }
    } else {
      errors.push(`Neznámá/nepodporovaná entita: ${entityType}`);
    }

    if (entities.length >= MAX_ENTITIES) {
      errors.push(`Dosažen limit ${MAX_ENTITIES} entit, zbytek ignorován`);
      break;
    }
  }

  return { entities, errors };
}

// ═══════════════════════════════════════════════════════════════
// ── DXF EXPORT ──
// ═══════════════════════════════════════════════════════════════

// Group code → řádek bez paddingu (kompatibilní se všemi parsery)
function gc(code, value) {
  return code + '\n' + value;
}

function entityLines(obj, nextHandle) {
  const out = [];
  const layerName = obj.layerName || '0';
  const aci = colorToAci(obj.color);

  // Hlavička entity – formát AC1014 (Fusion 360 kompatibilní)
  function entityHeader(entityType, acDbType) {
    out.push(gc(0, entityType));
    out.push(gc(5, nextHandle()));
    out.push(gc(100, 'AcDbEntity'));
    out.push(gc(8, layerName));
    if (aci !== 7) out.push(gc(62, aci));
    if (acDbType) out.push(gc(100, acDbType));
  }

  switch (obj.type) {
    case 'point':
      entityHeader('POINT', 'AcDbPoint');
      out.push(gc(10, obj.x.toFixed(6)), gc(20, obj.y.toFixed(6)), gc(30, '0'));
      break;

    case 'line':
    case 'constr':
      if (obj.isDimension) break;
      entityHeader('LINE', 'AcDbLine');
      out.push(gc(10, obj.x1.toFixed(6)), gc(20, obj.y1.toFixed(6)), gc(30, '0'));
      out.push(gc(11, obj.x2.toFixed(6)), gc(21, obj.y2.toFixed(6)), gc(31, '0'));
      break;

    case 'circle':
      entityHeader('CIRCLE', 'AcDbCircle');
      out.push(gc(10, obj.cx.toFixed(6)), gc(20, obj.cy.toFixed(6)), gc(30, '0'));
      out.push(gc(40, obj.r.toFixed(6)));
      out.push(gc(210, '0'), gc(220, '0'), gc(230, '1'));
      break;

    case 'arc': {
      entityHeader('ARC', 'AcDbCircle');
      out.push(gc(10, obj.cx.toFixed(6)), gc(20, obj.cy.toFixed(6)), gc(30, '0'));
      out.push(gc(40, obj.r.toFixed(6)));
      out.push(gc(100, 'AcDbArc'));
      // DXF ARC is always CCW; for CW arcs (ccw===false) swap start/end
      const dxfStart = obj.ccw === false ? obj.endAngle : obj.startAngle;
      const dxfEnd = obj.ccw === false ? obj.startAngle : obj.endAngle;
      out.push(gc(50, (dxfStart * RAD2DEG).toFixed(6)));
      out.push(gc(51, (dxfEnd * RAD2DEG).toFixed(6)));
      break;
    }

    case 'rect': {
      const rc = getRectCorners(obj);
      entityHeader('LWPOLYLINE', 'AcDbPolyline');
      out.push(gc(90, 4), gc(70, 1), gc(43, '0.0'));
      for (const c of rc) {
        out.push(gc(10, c.x.toFixed(6)), gc(20, c.y.toFixed(6)));
      }
      break;
    }

    case 'polyline':
      entityHeader('LWPOLYLINE', 'AcDbPolyline');
      out.push(gc(90, obj.vertices.length));
      out.push(gc(70, obj.closed ? 1 : 0));
      out.push(gc(43, '0.0'));
      for (let i = 0; i < obj.vertices.length; i++) {
        out.push(gc(10, obj.vertices[i].x.toFixed(6)));
        out.push(gc(20, obj.vertices[i].y.toFixed(6)));
        if (obj.bulges && obj.bulges[i] && obj.bulges[i] !== 0) {
          out.push(gc(42, obj.bulges[i].toFixed(6)));
        }
      }
      break;

    case 'text':
      entityHeader('TEXT', 'AcDbText');
      out.push(gc(10, obj.x.toFixed(6)), gc(20, obj.y.toFixed(6)), gc(30, '0'));
      out.push(gc(40, (obj.fontSize || 14).toFixed(6)));
      out.push(gc(1, obj.text || ''));
      if (obj.rotation) out.push(gc(50, (obj.rotation * RAD2DEG).toFixed(6)));
      break;

    default:
      return '';
  }
  return out.join('\n');
}

/**
 * Exportuje SKICA objekty do DXF textu (ASCII formát).
 * Formát AC1014 – kopíruje přesnou strukturu DXF souborů z Fusion 360.
 * @param {object[]} objects - pole SKICA objektů
 * @param {object[]} [layers] - volitelné pole vrstev [{id, name}]
 * @returns {string} DXF text
 */
export function exportDXF(objects, layers) {
  const out = [];

  // Připrav mapování layer ID → jméno pro export
  const layerMap = {};
  if (layers && layers.length > 0) {
    for (const l of layers) {
      layerMap[l.id] = l.name || `Vrstva_${l.id}`;
    }
  }

  // Přiřaď layerName ke každému objektu
  const enriched = objects.map(obj => ({
    ...obj,
    layerName: layerMap[obj.layer] || '0',
  }));

  // Sesbírej unikátní jména vrstev
  const layerNames = [...new Set(enriched.map(o => o.layerName))];
  if (!layerNames.includes('0')) layerNames.unshift('0');

  let handleCounter = 0x100;
  function nextHandle() {
    return (handleCounter++).toString(16).toUpperCase();
  }

  // ── Výpočet bounding boxu pro $EXTMIN/$EXTMAX ──
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const obj of objects) {
    switch (obj.type) {
      case 'point':
        minX = Math.min(minX, obj.x); minY = Math.min(minY, obj.y);
        maxX = Math.max(maxX, obj.x); maxY = Math.max(maxY, obj.y);
        break;
      case 'line': case 'constr':
        if (obj.isDimension) break;
        minX = Math.min(minX, obj.x1, obj.x2); minY = Math.min(minY, obj.y1, obj.y2);
        maxX = Math.max(maxX, obj.x1, obj.x2); maxY = Math.max(maxY, obj.y1, obj.y2);
        break;
      case 'circle':
        minX = Math.min(minX, obj.cx - obj.r); minY = Math.min(minY, obj.cy - obj.r);
        maxX = Math.max(maxX, obj.cx + obj.r); maxY = Math.max(maxY, obj.cy + obj.r);
        break;
      case 'arc':
        minX = Math.min(minX, obj.cx - obj.r); minY = Math.min(minY, obj.cy - obj.r);
        maxX = Math.max(maxX, obj.cx + obj.r); maxY = Math.max(maxY, obj.cy + obj.r);
        break;
      case 'rect':
        minX = Math.min(minX, obj.x1, obj.x2); minY = Math.min(minY, obj.y1, obj.y2);
        maxX = Math.max(maxX, obj.x1, obj.x2); maxY = Math.max(maxY, obj.y1, obj.y2);
        break;
      case 'polyline':
        for (const v of obj.vertices) {
          minX = Math.min(minX, v.x); minY = Math.min(minY, v.y);
          maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y);
        }
        break;
      case 'text':
        minX = Math.min(minX, obj.x); minY = Math.min(minY, obj.y);
        maxX = Math.max(maxX, obj.x); maxY = Math.max(maxY, obj.y);
        break;
    }
  }
  // Záchrana pro prázdný/minimální výkres
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100; }

  // ── HEADER (AC1014 – Fusion 360 format) ──
  out.push(gc(0, 'SECTION'), gc(2, 'HEADER'));
  out.push(gc(9, '$INSUNITS'), gc(70, 4));  // 4 = milimetry
  out.push(gc(9, '$ACADVER'), gc(1, 'AC1014'));
  out.push(gc(9, '$HANDSEED'), gc(5, 'FFFF'));
  out.push(gc(0, 'ENDSEC'));

  // ── TABLES ──
  out.push(gc(0, 'SECTION'), gc(2, 'TABLES'));

  // VPORT (prázdná)
  out.push(gc(0, 'TABLE'), gc(2, 'VPORT'), gc(5, '8'), gc(100, 'AcDbSymbolTable'));
  out.push(gc(0, 'ENDTAB'));

  // LTYPE
  out.push(gc(0, 'TABLE'), gc(2, 'LTYPE'), gc(5, '5'), gc(100, 'AcDbSymbolTable'));
  out.push(gc(0, 'LTYPE'), gc(5, '14'));
  out.push(gc(100, 'AcDbSymbolTableRecord'), gc(100, 'AcDbLinetypeTableRecord'));
  out.push(gc(2, 'BYBLOCK'), gc(70, 0));
  out.push(gc(0, 'LTYPE'), gc(5, '15'));
  out.push(gc(100, 'AcDbSymbolTableRecord'), gc(100, 'AcDbLinetypeTableRecord'));
  out.push(gc(2, 'BYLAYER'), gc(70, 0));
  out.push(gc(0, 'LTYPE'), gc(5, '16'));
  out.push(gc(100, 'AcDbSymbolTableRecord'), gc(100, 'AcDbLinetypeTableRecord'));
  out.push(gc(2, 'CONTINUOUS'), gc(70, 0));
  out.push(gc(0, 'ENDTAB'));

  // LAYER
  out.push(gc(0, 'TABLE'), gc(2, 'LAYER'), gc(5, '2'), gc(100, 'AcDbSymbolTable'), gc(70, layerNames.length));
  for (const name of layerNames) {
    out.push(gc(0, 'LAYER'), gc(5, '50'));
    out.push(gc(100, 'AcDbSymbolTableRecord'), gc(100, 'AcDbLayerTableRecord'));
    out.push(gc(2, name), gc(70, 0));
    out.push(gc(62, 7), gc(6, 'CONTINUOUS'));
  }
  out.push(gc(0, 'ENDTAB'));

  // STYLE
  out.push(gc(0, 'TABLE'), gc(2, 'STYLE'), gc(5, '3'), gc(100, 'AcDbSymbolTable'), gc(70, 1));
  out.push(gc(0, 'STYLE'), gc(5, '11'));
  out.push(gc(100, 'AcDbSymbolTableRecord'), gc(100, 'AcDbTextStyleTableRecord'));
  out.push(gc(2, 'STANDARD'), gc(70, 0));
  out.push(gc(0, 'ENDTAB'));

  // VIEW
  out.push(gc(0, 'TABLE'), gc(2, 'VIEW'), gc(5, '6'), gc(100, 'AcDbSymbolTable'), gc(70, 0));
  out.push(gc(0, 'ENDTAB'));

  // UCS
  out.push(gc(0, 'TABLE'), gc(2, 'UCS'), gc(5, '7'), gc(100, 'AcDbSymbolTable'), gc(70, 0));
  out.push(gc(0, 'ENDTAB'));

  // APPID
  out.push(gc(0, 'TABLE'), gc(2, 'APPID'), gc(5, '9'), gc(100, 'AcDbSymbolTable'), gc(70, 2));
  out.push(gc(0, 'APPID'), gc(5, '12'));
  out.push(gc(100, 'AcDbSymbolTableRecord'), gc(100, 'AcDbRegAppTableRecord'));
  out.push(gc(2, 'ACAD'), gc(70, 0));
  out.push(gc(0, 'ENDTAB'));

  // DIMSTYLE
  out.push(gc(0, 'TABLE'), gc(2, 'DIMSTYLE'), gc(5, 'A'), gc(100, 'AcDbSymbolTable'), gc(70, 1));
  out.push(gc(0, 'ENDTAB'));

  // BLOCK_RECORD
  out.push(gc(0, 'TABLE'), gc(2, 'BLOCK_RECORD'), gc(5, '1'), gc(100, 'AcDbSymbolTable'), gc(70, 1));
  out.push(gc(0, 'BLOCK_RECORD'), gc(5, '1F'));
  out.push(gc(100, 'AcDbSymbolTableRecord'), gc(100, 'AcDbBlockTableRecord'));
  out.push(gc(2, '*MODEL_SPACE'));
  out.push(gc(0, 'BLOCK_RECORD'), gc(5, '1B'));
  out.push(gc(100, 'AcDbSymbolTableRecord'), gc(100, 'AcDbBlockTableRecord'));
  out.push(gc(2, '*PAPER_SPACE'));
  out.push(gc(0, 'ENDTAB'));

  out.push(gc(0, 'ENDSEC'));

  // ── BLOCKS ──
  out.push(gc(0, 'SECTION'), gc(2, 'BLOCKS'));

  out.push(gc(0, 'BLOCK'), gc(5, '20'));
  out.push(gc(100, 'AcDbEntity'), gc(100, 'AcDbBlockBegin'));
  out.push(gc(2, '*MODEL_SPACE'));
  out.push(gc(0, 'ENDBLK'), gc(5, '21'));
  out.push(gc(100, 'AcDbEntity'), gc(100, 'AcDbBlockEnd'));

  out.push(gc(0, 'BLOCK'), gc(5, '1C'));
  out.push(gc(100, 'AcDbEntity'), gc(100, 'AcDbBlockBegin'));
  out.push(gc(2, '*PAPER_SPACE'));
  out.push(gc(0, 'ENDBLK'), gc(5, '1D'));
  out.push(gc(100, 'AcDbEntity'), gc(100, 'AcDbBlockEnd'));

  out.push(gc(0, 'ENDSEC'));

  // ── ENTITIES ──
  out.push(gc(0, 'SECTION'), gc(2, 'ENTITIES'));
  for (const obj of enriched) {
    const str = entityLines(obj, nextHandle);
    if (str.length > 0) out.push(str);
  }
  out.push(gc(0, 'ENDSEC'));

  // ── OBJECTS ──
  out.push(gc(0, 'SECTION'), gc(2, 'OBJECTS'));
  out.push(gc(0, 'DICTIONARY'), gc(5, 'C'), gc(100, 'AcDbDictionary'));
  out.push(gc(3, 'ACAD_GROUP'), gc(350, 'D'));
  out.push(gc(3, 'ACAD_MLINESTYLE'), gc(350, '17'));
  out.push(gc(0, 'DICTIONARY'), gc(5, 'D'), gc(100, 'AcDbDictionary'));
  out.push(gc(0, 'DICTIONARY'), gc(5, '1A'), gc(330, 'C'), gc(100, 'AcDbDictionary'));
  out.push(gc(0, 'DICTIONARY'), gc(5, '17'), gc(100, 'AcDbDictionary'));
  out.push(gc(0, 'ENDSEC'));

  out.push(gc(0, 'EOF'));

  return out.join('\n') + '\n';
}
