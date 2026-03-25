// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – DXF Import Parser                                  ║
// ╚══════════════════════════════════════════════════════════════╝

const MAX_ENTITIES = 10000;
const DEFAULT_COLOR = '#89b4fa';
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
      const vertices = [];
      const bulges = [];

      // Zpracování v pořadí: 10→X, 20→Y, [42→bulge], 10→X, 20→Y, ...
      for (const p of data) {
        if (p.code === 10) {
          vertices.push({ x: safeFloat(p.value), y: 0 });
          bulges.push(0);
        } else if (p.code === 20 && vertices.length > 0) {
          vertices[vertices.length - 1].y = safeFloat(p.value);
        } else if (p.code === 42 && bulges.length > 0) {
          bulges[bulges.length - 1] = safeFloat(p.value);
        }
      }

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
