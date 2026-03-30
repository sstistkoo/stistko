// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – DXF Import / Export                                ║
// ╚══════════════════════════════════════════════════════════════╝

import { COLORS } from './constants.js';
import { getRectCorners } from './utils.js';

const MAX_ENTITIES = 10000;
const DEFAULT_COLOR = COLORS.primary;
const DEG2RAD = Math.PI / 180;

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

function safeFloat(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function aciColor(code) {
  const c = parseInt(code, 10);
  return isNaN(c) ? DEFAULT_COLOR : (ACI_COLORS[c] || DEFAULT_COLOR);
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

// Parsuj jednu DXF entitu → SKICA objekt
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

    default:
      return null;
  }
}

/**
 * Parsuj DXF text → SKICA objekty
 * @param {string} text - obsah DXF souboru (ASCII)
 * @returns {{ entities: object[], errors: string[] }}
 */
/**
 * Parsuje DXF text a vrací entity.
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

  let i = section.start;
  while (i < section.end) {
    if (pairs[i].code !== 0) { i++; continue; }

    const entityType = pairs[i].value;
    i++;

    // Sesbírej páry entity až do dalšího code 0
    const entityData = [];
    while (i < section.end && pairs[i].code !== 0) {
      entityData.push(pairs[i]);
      i++;
    }

    const obj = parseEntity(entityType, entityData);
    if (obj) {
      entities.push(obj);
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

const RAD2DEG = 180 / Math.PI;

function dxfPair(code, value) {
  return `  ${code}\n${value}`;
}

function entityToString(obj) {
  const lines = [];
  const p = (code, val) => lines.push(dxfPair(code, val));

  switch (obj.type) {
    case 'point':
      p(0, 'POINT');
      p(8, '0');
      p(10, obj.x.toFixed(6));
      p(20, obj.y.toFixed(6));
      p(30, '0.0');
      break;

    case 'line':
    case 'constr':
      if (obj.isDimension) break;
      p(0, 'LINE');
      p(8, '0');
      p(10, obj.x1.toFixed(6));
      p(20, obj.y1.toFixed(6));
      p(30, '0.0');
      p(11, obj.x2.toFixed(6));
      p(21, obj.y2.toFixed(6));
      p(31, '0.0');
      break;

    case 'circle':
      p(0, 'CIRCLE');
      p(8, '0');
      p(10, obj.cx.toFixed(6));
      p(20, obj.cy.toFixed(6));
      p(30, '0.0');
      p(40, obj.r.toFixed(6));
      break;

    case 'arc':
      p(0, 'ARC');
      p(8, '0');
      p(10, obj.cx.toFixed(6));
      p(20, obj.cy.toFixed(6));
      p(30, '0.0');
      p(40, obj.r.toFixed(6));
      p(50, (obj.startAngle * RAD2DEG).toFixed(6));
      p(51, (obj.endAngle * RAD2DEG).toFixed(6));
      break;

    case 'rect': {
      // Exportovat jako LWPOLYLINE (uzavřený obdélník, respektuje rotaci)
      const rc = getRectCorners(obj);
      p(0, 'LWPOLYLINE');
      p(8, '0');
      p(70, '1'); // closed
      p(90, '4'); // vertex count
      for (const c of rc) {
        p(10, c.x.toFixed(6)); p(20, c.y.toFixed(6));
      }
      break;
    }

    case 'polyline':
      p(0, 'LWPOLYLINE');
      p(8, '0');
      p(70, obj.closed ? '1' : '0');
      p(90, String(obj.vertices.length));
      for (let i = 0; i < obj.vertices.length; i++) {
        p(10, obj.vertices[i].x.toFixed(6));
        p(20, obj.vertices[i].y.toFixed(6));
        if (obj.bulges && obj.bulges[i] && obj.bulges[i] !== 0) {
          p(42, obj.bulges[i].toFixed(6));
        }
      }
      break;

    default:
      return '';
  }
  return lines.join('\n');
}

/**
 * Exportuje SKICA objekty do DXF textu (ASCII formát).
 * @param {object[]} objects - pole SKICA objektů
 * @returns {string} DXF text
 */
export function exportDXF(objects) {
  const sections = [];

  // HEADER
  sections.push([
    '  0', 'SECTION',
    '  2', 'HEADER',
    '  9', '$ACADVER', '  1', 'AC1009',
    '  0', 'ENDSEC',
  ].join('\n'));

  // ENTITIES
  const entityStrings = objects
    .map(obj => entityToString(obj))
    .filter(s => s.length > 0);

  sections.push([
    '  0', 'SECTION',
    '  2', 'ENTITIES',
    ...entityStrings,
    '  0', 'ENDSEC',
  ].join('\n'));

  sections.push('  0\nEOF');

  return sections.join('\n');
}
