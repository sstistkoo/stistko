// js/parser.js — parsování importovaných souborů (TXT, JSON)

const IMPORT_FIELDS = ['vyznam', 'definice', 'pouziti', 'puvod', 'specialista', 'kjv'];

/**
 * Centralizované aliasy pro import TXT.
 * Zahrnuje legacy CZ labely i obecné varianty bez jazykové koncovky.
 */
const TXT_LABEL_ALIASES = {
  vyznam: ['Český význam', 'Vyznam', 'VÝZNAM', 'VYZNAM', 'Význam', 'Cz', 'CZ', 'Meaning'],
  definice: ['Definice (CZ)', 'Česká definice', 'Definice', 'DEFINICE', 'CZ definice', 'Definition'],
  pouziti: ['Biblické užití', 'Biblické užití (KJV)', 'Pouziti', 'POUZITI', 'Použití', 'Usage'],
  puvod: ['Původ', 'Puvod', 'PUVOD', 'Origin'],
  specialista: ['Specialista', 'VÝKLAD', 'VYKLAD', 'Komentář', 'KOMENTAR', 'Exegeze', 'EXEGEZE', 'Specialist'],
  kjv: ['KJV překlady (CZ)', 'KJV překlady', 'KJV', 'KJV_PREKLADY', 'KJV Významy', 'KJV translations']
};

/**
 * Vrátí hodnotu z řádku "Label: text" podle zadaných aliasů.
 * Podporuje i variantu s fullwidth dvojtečkou (：).
 */
function getValueByLabels(lines, labels) {
  for (const label of labels) {
    const line = lines.find((l) => {
      const trimmed = l.trim();
      return trimmed.startsWith(`${label}:`) || trimmed.startsWith(`${label}：`);
    });
    if (line) return line.slice(label.length + 1).trim();
  }
  return '';
}

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
    const vyznam = getValueByLabels(lines, TXT_LABEL_ALIASES.vyznam);
    const definice = getValueByLabels(lines, TXT_LABEL_ALIASES.definice);
    const pouziti = getValueByLabels(lines, TXT_LABEL_ALIASES.pouziti);
    const puvod = getValueByLabels(lines, TXT_LABEL_ALIASES.puvod);
    const specialista = getValueByLabels(lines, TXT_LABEL_ALIASES.specialista);
    const kjv = getValueByLabels(lines, TXT_LABEL_ALIASES.kjv);
    if (vyznam || definice) {
      result[key] = { vyznam, definice, pouziti, puvod, specialista, kjv };
    }
  }
  return result;
}

export function parseImportJSON(text) {
  const parsed = JSON.parse(text);
  const result = {};

  const normalizeRecord = (record) => {
    if (!record || typeof record !== 'object') return null;
    const out = {};
    for (const field of IMPORT_FIELDS) {
      const val = record[field];
      out[field] = typeof val === 'string' ? val.trim() : '';
    }
    return out;
  };

  const addRecord = (key, value) => {
    if (!/^G\d+$/.test(key) && !/^H\d+$/.test(key)) return;
    const normalized = normalizeRecord(value);
    if (!normalized) return;
    if (!IMPORT_FIELDS.some(f => normalized[f])) return;
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
