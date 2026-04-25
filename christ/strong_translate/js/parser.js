// js/parser.js — parsování importovaných souborů (CZ TXT, JSON)

export function parseCzTXT(text) {
  const result = {};
  const normalizedText = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  const blocks = normalizedText.split(/\n(?=[GH]\d+\s*\|)/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const header = lines[0];
    const m = header.match(/^([GH]\d+)\s*\|/);
    if (!m) continue;
    const key = m[1];
    const get = (labels) => {
      for (const label of labels) {
        const line = lines.find(l => {
          const trimmed = l.trim();
          return trimmed.startsWith(label + ':') || trimmed.startsWith(label + '：');
        });
        if (line) return line.slice(label.length + 1).trim();
      }
      return '';
    };
    const vyznam = get(['Český význam', 'Vyznam', 'VÝZNAM', 'VYZNAM', 'Význam', 'Cz', 'CZ']);
    const definice = get(['Definice (CZ)', 'Česká definice', 'Definice', 'DEFINICE', 'CZ definice']);
    const pouziti = get(['Biblické užití', 'Biblické užití (KJV)', 'Pouziti', 'POUZITI', 'Použití']);
    const puvod = get(['Původ', 'Puvod', 'PUVOD']);
    const specialista = get(['Specialista', 'VÝKLAD', 'VYKLAD', 'Komentář', 'KOMENTAR', 'Exegeze', 'EXEGEZE']);
    const kjv = get(['KJV překlady (CZ)', 'KJV překlady', 'KJV', 'KJV_PREKLADY', 'KJV Významy']);
    if (vyznam || definice) {
      result[key] = { vyznam, definice, pouziti, puvod, specialista, kjv };
    }
  }
  return result;
}

export function parseImportJSON(text) {
  const parsed = JSON.parse(text);
  const result = {};
  const FIELDS = ['vyznam', 'definice', 'pouziti', 'puvod', 'specialista', 'kjv'];

  const normalizeRecord = (record) => {
    if (!record || typeof record !== 'object') return null;
    const out = {};
    for (const field of FIELDS) {
      const val = record[field];
      out[field] = typeof val === 'string' ? val.trim() : '';
    }
    return out;
  };

  const addRecord = (key, value) => {
    if (!/^G\d+$/.test(key) && !/^H\d+$/.test(key)) return;
    const normalized = normalizeRecord(value);
    if (!normalized) return;
    if (!FIELDS.some(f => normalized[f])) return;
    result[key] = normalized;
  };

  if (Array.isArray(parsed)) {
    for (const row of parsed) {
      const key = row?.key || row?.strong || row?.id;
      if (typeof key !== 'string') continue;
      addRecord(key.trim(), row);
    }
    return result;
  }

  if (parsed && typeof parsed === 'object') {
    // Variant A: přímý map exportu { "G1": {...}, "G2": {...} }
    for (const [key, value] of Object.entries(parsed)) {
      addRecord(String(key).trim(), value);
    }

    // Variant B: obálka s polem state.entries/translations
    const wrapped = parsed.entries || parsed.translations || parsed.data;
    if (Array.isArray(wrapped)) {
      for (const row of wrapped) {
        const key = row?.key || row?.strong || row?.id;
        if (typeof key !== 'string') continue;
        addRecord(key.trim(), row);
      }
    }
  }

  return result;
}
