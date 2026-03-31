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
};

// CSS barvy → ACI (pro export)
const CSS_TO_ACI = {};
for (const [code, hex] of Object.entries(ACI_COLORS)) {
  CSS_TO_ACI[hex.toLowerCase()] = parseInt(code, 10);
}

function safeFloat(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
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

function entityLines(obj) {
  const out = [];
  const layerName = obj.layerName || '0';
  const aci = colorToAci(obj.color);

  switch (obj.type) {
    case 'point':
      out.push(gc(0, 'POINT'), gc(8, layerName));
      if (aci !== 7) out.push(gc(62, aci));
      out.push(gc(10, obj.x.toFixed(6)), gc(20, obj.y.toFixed(6)));
      break;

    case 'line':
    case 'constr':
      if (obj.isDimension) break;
      out.push(gc(0, 'LINE'), gc(8, layerName));
      if (aci !== 7) out.push(gc(62, aci));
      out.push(gc(10, obj.x1.toFixed(6)), gc(20, obj.y1.toFixed(6)));
      out.push(gc(11, obj.x2.toFixed(6)), gc(21, obj.y2.toFixed(6)));
      break;

    case 'circle':
      out.push(gc(0, 'CIRCLE'), gc(8, layerName));
      if (aci !== 7) out.push(gc(62, aci));
      out.push(gc(10, obj.cx.toFixed(6)), gc(20, obj.cy.toFixed(6)));
      out.push(gc(40, obj.r.toFixed(6)));
      break;

    case 'arc':
      out.push(gc(0, 'ARC'), gc(8, layerName));
      if (aci !== 7) out.push(gc(62, aci));
      out.push(gc(10, obj.cx.toFixed(6)), gc(20, obj.cy.toFixed(6)));
      out.push(gc(40, obj.r.toFixed(6)));
      out.push(gc(50, (obj.startAngle * RAD2DEG).toFixed(6)));
      out.push(gc(51, (obj.endAngle * RAD2DEG).toFixed(6)));
      break;

    case 'rect': {
      const rc = getRectCorners(obj);
      out.push(gc(0, 'LWPOLYLINE'), gc(8, layerName));
      if (aci !== 7) out.push(gc(62, aci));
      out.push(gc(90, 4), gc(70, 1));
      for (const c of rc) {
        out.push(gc(10, c.x.toFixed(6)), gc(20, c.y.toFixed(6)));
      }
      break;
    }

    case 'polyline':
      out.push(gc(0, 'LWPOLYLINE'), gc(8, layerName));
      if (aci !== 7) out.push(gc(62, aci));
      out.push(gc(90, obj.vertices.length));
      out.push(gc(70, obj.closed ? 1 : 0));
      for (let i = 0; i < obj.vertices.length; i++) {
        out.push(gc(10, obj.vertices[i].x.toFixed(6)));
        out.push(gc(20, obj.vertices[i].y.toFixed(6)));
        if (obj.bulges && obj.bulges[i] && obj.bulges[i] !== 0) {
          out.push(gc(42, obj.bulges[i].toFixed(6)));
        }
      }
      break;

    case 'text':
      out.push(gc(0, 'TEXT'), gc(8, layerName));
      if (aci !== 7) out.push(gc(62, aci));
      out.push(gc(10, obj.x.toFixed(6)), gc(20, obj.y.toFixed(6)));
      out.push(gc(40, obj.fontSize || 14));
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
 * Formát kompatibilní s Fusion 360, FreeCAD, LibreCAD, AutoCAD atd.
 * Obsahuje $ACADVER AC1015 (AutoCAD 2000) a minimální TABLES sekci.
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

  let handleCounter = 1;
  function nextHandle() {
    return (handleCounter++).toString(16).toUpperCase();
  }

  // ── HEADER – verze AC1015 (AutoCAD 2000) pro podporu LWPOLYLINE ──
  out.push(gc(0, 'SECTION'), gc(2, 'HEADER'));
  out.push(gc(9, '$ACADVER'), gc(1, 'AC1015'));
  out.push(gc(9, '$HANDSEED'), gc(5, 'FFFF'));
  out.push(gc(9, '$INSUNITS'), gc(70, 4));  // 4 = milimetry
  out.push(gc(0, 'ENDSEC'));

  // ── CLASSES (povinná sekce pro AC1015, prázdná) ──
  out.push(gc(0, 'SECTION'), gc(2, 'CLASSES'));
  out.push(gc(0, 'ENDSEC'));

  // ── TABLES – definice typů čar a vrstev ──
  out.push(gc(0, 'SECTION'), gc(2, 'TABLES'));

  // Tabulka VPORT
  const vportH = nextHandle();
  out.push(gc(0, 'TABLE'), gc(2, 'VPORT'), gc(5, vportH), gc(100, 'AcDbSymbolTable'), gc(70, 1));
  const vportEntH = nextHandle();
  out.push(gc(0, 'VPORT'), gc(5, vportEntH), gc(100, 'AcDbSymbolTableRecord'), gc(100, 'AcDbViewportTableRecord'));
  out.push(gc(2, '*ACTIVE'), gc(70, 0));
  out.push(gc(10, '0.0'), gc(20, '0.0'));   // center
  out.push(gc(11, '1.0'), gc(21, '1.0'));   // snap spacing
  out.push(gc(40, '1.0'));                   // view height
  out.push(gc(41, '1.0'));                   // aspect ratio
  out.push(gc(0, 'ENDTAB'));

  // Tabulka LTYPE
  const ltypeH = nextHandle();
  out.push(gc(0, 'TABLE'), gc(2, 'LTYPE'), gc(5, ltypeH), gc(100, 'AcDbSymbolTable'), gc(70, 1));
  const ltypeEntH = nextHandle();
  out.push(gc(0, 'LTYPE'), gc(5, ltypeEntH), gc(100, 'AcDbSymbolTableRecord'), gc(100, 'AcDbLinetypeTableRecord'));
  out.push(gc(2, 'CONTINUOUS'), gc(70, 0));
  out.push(gc(3, 'Solid line'), gc(72, 65), gc(73, 0), gc(40, '0.0'));
  out.push(gc(0, 'ENDTAB'));

  // Tabulka LAYER
  const layerH = nextHandle();
  out.push(gc(0, 'TABLE'), gc(2, 'LAYER'), gc(5, layerH), gc(100, 'AcDbSymbolTable'), gc(70, layerNames.length));
  for (const name of layerNames) {
    const lH = nextHandle();
    out.push(gc(0, 'LAYER'), gc(5, lH), gc(100, 'AcDbSymbolTableRecord'), gc(100, 'AcDbLayerTableRecord'));
    out.push(gc(2, name), gc(70, 0));
    out.push(gc(62, 7), gc(6, 'CONTINUOUS'));
  }
  out.push(gc(0, 'ENDTAB'));

  // Tabulka STYLE
  const styleH = nextHandle();
  out.push(gc(0, 'TABLE'), gc(2, 'STYLE'), gc(5, styleH), gc(100, 'AcDbSymbolTable'), gc(70, 1));
  const styleEntH = nextHandle();
  out.push(gc(0, 'STYLE'), gc(5, styleEntH), gc(100, 'AcDbSymbolTableRecord'), gc(100, 'AcDbTextStyleTableRecord'));
  out.push(gc(2, 'STANDARD'), gc(70, 0), gc(40, '0.0'), gc(41, '1.0'), gc(3, 'txt'));
  out.push(gc(0, 'ENDTAB'));

  // Tabulka APPID
  const appidH = nextHandle();
  out.push(gc(0, 'TABLE'), gc(2, 'APPID'), gc(5, appidH), gc(100, 'AcDbSymbolTable'), gc(70, 1));
  const appidEntH = nextHandle();
  out.push(gc(0, 'APPID'), gc(5, appidEntH), gc(100, 'AcDbSymbolTableRecord'), gc(100, 'AcDbRegAppTableRecord'));
  out.push(gc(2, 'ACAD'), gc(70, 0));
  out.push(gc(0, 'ENDTAB'));

  // Tabulka BLOCK_RECORD
  const brH = nextHandle();
  out.push(gc(0, 'TABLE'), gc(2, 'BLOCK_RECORD'), gc(5, brH), gc(100, 'AcDbSymbolTable'), gc(70, 2));
  const msRecH = nextHandle();
  out.push(gc(0, 'BLOCK_RECORD'), gc(5, msRecH), gc(100, 'AcDbSymbolTableRecord'), gc(100, 'AcDbBlockTableRecord'));
  out.push(gc(2, '*MODEL_SPACE'));
  const psRecH = nextHandle();
  out.push(gc(0, 'BLOCK_RECORD'), gc(5, psRecH), gc(100, 'AcDbSymbolTableRecord'), gc(100, 'AcDbBlockTableRecord'));
  out.push(gc(2, '*PAPER_SPACE'));
  out.push(gc(0, 'ENDTAB'));

  out.push(gc(0, 'ENDSEC'));

  // ── BLOCKS (povinná sekce pro AC1015) ──
  out.push(gc(0, 'SECTION'), gc(2, 'BLOCKS'));

  const msBlkH = nextHandle();
  out.push(gc(0, 'BLOCK'), gc(5, msBlkH), gc(100, 'AcDbEntity'), gc(8, '0'), gc(100, 'AcDbBlockBegin'));
  out.push(gc(2, '*MODEL_SPACE'), gc(70, 0), gc(10, '0.0'), gc(20, '0.0'), gc(30, '0.0'));
  const msEndH = nextHandle();
  out.push(gc(0, 'ENDBLK'), gc(5, msEndH), gc(100, 'AcDbEntity'), gc(8, '0'), gc(100, 'AcDbBlockEnd'));

  const psBlkH = nextHandle();
  out.push(gc(0, 'BLOCK'), gc(5, psBlkH), gc(100, 'AcDbEntity'), gc(8, '0'), gc(100, 'AcDbBlockBegin'));
  out.push(gc(2, '*PAPER_SPACE'), gc(70, 0), gc(10, '0.0'), gc(20, '0.0'), gc(30, '0.0'));
  const psEndH = nextHandle();
  out.push(gc(0, 'ENDBLK'), gc(5, psEndH), gc(100, 'AcDbEntity'), gc(8, '0'), gc(100, 'AcDbBlockEnd'));

  out.push(gc(0, 'ENDSEC'));

  // ── ENTITIES ──
  out.push(gc(0, 'SECTION'), gc(2, 'ENTITIES'));
  for (const obj of enriched) {
    const str = entityLines(obj);
    if (str.length > 0) out.push(str);
  }
  out.push(gc(0, 'ENDSEC'));

  // ── OBJECTS (povinná sekce pro AC1015) ──
  out.push(gc(0, 'SECTION'), gc(2, 'OBJECTS'));
  const dictH = nextHandle();
  out.push(gc(0, 'DICTIONARY'), gc(5, dictH), gc(100, 'AcDbDictionary'));
  out.push(gc(0, 'ENDSEC'));

  out.push(gc(0, 'EOF'));

  return out.join('\n') + '\n';
}
