/**
 * Strong Greek→Czech Translator — Core Logic Module
 * Pure functions for parsing, translation, and business logic.
 * Supports three formats: Greek (G), Hebrew (H), Grammatical codes (H9000+)
 */

// ══ TEXT PARSING ═══════════════════════════════════════════════════

/**
 * Parse Strong detailed TXT file format (strong_finalni_verze.txt).
 * Supports: Greek (G1-G5624), Hebrew (H1-H8674), Grammatical codes (H9001-H9048)
 * @param {string} text - Raw file content
 * @returns {Array<{key: string, greek: string, def: string, kjv: string, orig: string, ...}>}
 */
export function parseTXT(text) {
  const lines = text.split('\n');
  const entries = [];
  let current = null;
  let lineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTrim = line.trim();
    
    // Empty line = end of current entry
    if (!lineTrim) {
      if (current && current.key) {
        entries.push(finishEntry(current));
        current = null;
      }
      continue;
    }
    
    // Detection: start of new entry (G or H prefix with number)
    const newEntryMatch = lineTrim.match(/^([GH]\d+)\s*\|\s*(.*)$/);
    if (newEntryMatch) {
      // Save previous entry
      if (current && current.key) {
        entries.push(finishEntry(current));
      }
      
      const entryType = newEntryMatch[1];
      const word = newEntryMatch[2].trim();
      
      // Initialize new entry based on type
      if (entryType.startsWith('H') && parseInt(entryType.slice(1)) >= 9000) {
        // Grammatical code (H9001+)
        current = {
          key: entryType,
          greek: word,
          beta: '',
          prepis: '',
          tvaroslovi: '',
          definice: '',
          en: '',
          enDef: '',
          kjv: '',
          cz: '',
          vokalizace: '',
          kategorie: '',
          vyznamCz: '',
          type: 'grammar'
        };
      } else if (entryType.startsWith('H')) {
        // Hebrew word (H1-H8674)
        current = {
          key: entryType,
          greek: word,
          beta: '',
          prepis: '',
          tvaroslovi: '',
          definice: '',
          en: '',
          enDef: '',
          kjv: '',
          cz: '',
          vokalizace: '',
          vyslovnost: '',
          etymol: '',
          type: 'hebrew'
        };
      } else {
        // Greek word (G1-G5624)
        current = {
          key: entryType,
          greek: word,
          beta: '',
          prepis: '',
          tvaroslovi: '',
          definice: '',
          en: '',
          enDef: '',
          kjv: '',
          cz: '',
          type: 'greek'
        };
      }
      continue;
    }

    if (!current) continue;

    // Parse fields based on current entry type
    // Use regex that handles field names with spaces like "En Definition"
    const fieldMatch = lineTrim.match(/^([^:]+):\s*(.*)$/);
    if (!fieldMatch) continue;
    
    const fieldName = fieldMatch[1].trim(); // Normalize field name
    const fieldValue = fieldMatch[2].trim();

    switch (fieldName) {
      case 'BETA':
        current.beta = fieldValue;
        break;
      case 'Prepis':
        current.prepis = fieldValue;
        break;
      case 'Tvaroslovi':
        current.tvaroslovi = fieldValue;
        break;
      case 'Definice':
        current.definice = fieldValue;
        break;
      case 'En':
        current.en = fieldValue;
        break;
      case 'En Definition':
        current.enDef = fieldValue;
        break;
      case 'KJV Významy':
        current.kjv = fieldValue;
        break;
      case 'Cz':
        current.cz = fieldValue;
        break;
      case 'Vokalizace':
        current.vokalizace = fieldValue;
        break;
      case 'Vyslovnost':
        current.vyslovnost = fieldValue;
        break;
      case 'Etymol':
        current.etimol = fieldValue;
        break;
      case 'Kategorie':
        current.kategorie = fieldValue;
        break;
      case 'Vyznam_Cz':
        current.vyznamCz = fieldValue;
        break;
    }
  }

  // Debug after parsing first entry - check raw lines
  if (i < 15) {
    console.log('Line ' + i + ': [' + lineTrim.slice(0, 40) + '] field=' + fieldName);
  }
}

  // Save last entry
  if (current && current.key) {
    entries.push(finishEntry(current));
  }

  // Debug output
  console.log('PARSE: Nacteno ' + entries.length + ' hesel');
  if (entries.length > 0) {
    console.log('Prvni 3 hesla:', entries.slice(0, 3).map(e => e.key + ': ' + e.greek));
  }

  return entries;
}

function finishEntry(e) {
  // Debug: log first entry fields
  if (!finishEntry._logged && e.key === 'G1') {
    finishEntry._logged = true;
    console.log('DEBUG finishEntry G1:', JSON.stringify({
      key: e.key,
      greek: e.greek,
      beta: e.beta,
      prepis: e.prepis,
      definice: e.definice?.slice(0, 40),
      en: e.en,
      enDef: e.enDef,
      kjv: e.kjv,
      cz: e.cz
    }, null, 2));
  }

  // Map to display format based on type
  if (e.type === 'grammar') {
    return {
      key: e.key,
      greek: e.greek,
      orig: e.tvaroslovi || '',
      definice: e.definice || '',
      en: e.en || '',
      enDef: e.enDef || '',
      kjv: e.cz || e.vyznamCz || e.kjv || '',
      prepis: e.prepis || '',
      vokalizace: e.vokalizace || '',
      kategorie: e.kategorie || '',
      vyznamCz: e.vyznamCz || ''
    };
  } else if (e.type === 'hebrew') {
    return {
      key: e.key,
      greek: e.greek,
      orig: e.etimol || e.tvaroslovi || '',
      definice: e.definice || '',
      en: e.en || '',
      enDef: e.enDef || '',
      kjv: e.cz || e.kjv || '',
      prepis: e.prepis || '',
      vokalizace: e.vokalizace || '',
      vyslovnost: e.vyslovnost || '',
      etymol: e.etimol || '',
      tvaroslovi: e.tvaroslovi || ''
    };
  } else {
    // Greek - use cz for kjv, and kjv field if cz is empty
    return {
      key: e.key,
      greek: e.greek,
      orig: e.tvaroslovi || '',
      definice: e.definice || '',
      en: e.en || '',
      enDef: e.enDef || '',
      kjv: e.cz || e.kjv || '',  // Use Cz first, fallback to KJV
      beta: e.beta || '',
      prepis: e.prepis || '',
      tvaroslovi: e.tvaroslovi || ''
    };
  }
}

/**
 * Parse AI translation response into structured format.
 * Supports ###GXXX###, ###HXXX### and plain formats.
 * @param {string} raw - Raw AI response text
 * @param {string[]} keys - Expected keys to match
 * @param {Object} [translatedStorage] - Existing translated object to update
 * @returns {string[]} Array of missing keys that weren't parsed
 */
export function parseTranslations(raw, keys, translatedStorage = {}) {
  try {
    // Normalize line endings
    const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Split blocks: support both ###G and ###H formats
    const blocks = normalized.split(/(?=###[GH]\d+###)/);
    
    const hasValidBlocks = blocks.some(b => /###[GH]\d+###/.test(b));
    if (!hasValidBlocks) {
      // Try fallback to plain format
      const plainBlocks = normalized.split(/(?=[GH]\d+\s*\|)/);
      const hasPlain = plainBlocks.some(b => /[GH]\d+\s*\|/.test(b));
      if (hasPlain) {
        return parsePlainFormat(normalized, keys, translatedStorage);
      }
      
      const weirdChars = (raw.match(/[^\x20-\x7E\n\r\těščřžýáíéúůťďňĚŠČŘŽÝÁÍÉÚŮŤĎŇ]/g) || []).length;
      const totalChars = raw.length;
      if (weirdChars > totalChars * 0.3 || totalChars < 50) {
        throw new Error('AI response appears corrupted or rate-limited');
      }
    }

    for (const block of blocks) {
      // Match ###G123### or ###H123###
      const keyMatch = block.match(/###([GH]\d+)###/);
      if (!keyMatch) continue;
      
      const key = keyMatch[1];
      if (!keys.includes(key)) continue;

      // Extract content after ###KEY###
      const contentStart = block.indexOf('###');
      const content = block.slice(contentStart + key.length + 4).trim();
      
      const fieldMap = {};
      const contentLines = content.split('\n');
      for (const line of contentLines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;
        let label = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        
        // Normalize label
        label = label.toUpperCase().replace(/Č/g, 'C').replace(/Š/g, 'S').replace(/Ž/g, 'Z');
        if (label === 'VYZNAM') label = 'VYZNAM';
        if (label === 'DEFINICE') label = 'DEFINICE';
        if (label === 'POUZITI') label = 'POUZITI';
        if (label === 'PUVOD') label = 'PUVOD';
        
        fieldMap[label] = value;
      }

      translatedStorage[key] = {
        vyznam: fieldMap['VYZNAM'] || fieldMap['VÝZNAM'] || '',
        definice: fieldMap['DEFINICE'] || '',
        pouziti: fieldMap['POUZITI'] || fieldMap['POUŽITÍ'] || '',
        puvod: fieldMap['PUVOD'] || '',
        raw: content
      };
    }

    const missingKeys = [];
    for (const key of keys) {
      if (!translatedStorage[key] || !translatedStorage[key].vyznam) {
        missingKeys.push(key);
      }
    }
    return missingKeys;
  } catch (e) {
    console.error('Chyba parsování překladu:', e);
    throw e;
  }
}

function parsePlainFormat(raw, keys, translatedStorage) {
  // Fallback parser for plain format (G1 | word \n DEFINICE: ...)
  const lines = raw.split('\n');
  let currentKey = null;
  const fieldMap = {};

  for (const line of lines) {
    const keyMatch = line.match(/^([GH]\d+)\s*\|/);
    if (keyMatch) {
      // Save previous
      if (currentKey && keys.includes(currentKey) && fieldMap['VYZNAM']) {
        translatedStorage[currentKey] = {
          vyznam: fieldMap['VYZNAM'] || fieldMap['VÝZNAM'] || '',
          definice: fieldMap['DEFINICE'] || '',
          pouziti: fieldMap['POUZITI'] || fieldMap['POUŽITÍ'] || '',
          puvod: fieldMap['PUVOD'] || ''
        };
      }
      
      currentKey = keyMatch[1];
      Object.assign(fieldMap, {});
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1 || !currentKey) continue;
    
    let label = line.slice(0, colonIdx).trim().toUpperCase();
    const value = line.slice(colonIdx + 1).trim();
    
    // Normalize
    label = label.replace(/Č/g, 'C').replace(/Š/g, 'S').replace(/Ž/g, 'Z');
    if (label === 'VYZNAM') label = 'VYZNAM';
    fieldMap[label] = value;
  }

  // Save last
  if (currentKey && keys.includes(currentKey) && fieldMap['VYZNAM']) {
    translatedStorage[currentKey] = {
      vyznam: fieldMap['VYZNAM'] || '',
      definice: fieldMap['DEFINICE'] || '',
      pouziti: fieldMap['POUZITI'] || '',
      puvod: fieldMap['PUVOD'] || ''
    };
  }

  const missingKeys = [];
  for (const key of keys) {
    if (!translatedStorage[key]?.vyznam) {
      missingKeys.push(key);
    }
  }
  return missingKeys;
}

/**
 * Build AI prompt messages for a batch of entries.
 * @param {Array} batch - Array of entry objects {key, greek, def, kjv, orig}
 * @param {string} [promptTemplate] - Custom prompt template with {HESLA} placeholder
 * @returns {Array<{role: string, content: string}>}
 */
export function buildPromptMessages(batch, promptTemplate = DEFAULT_PROMPT) {
  const items = batch.map(e =>
    `${e.key} | ${e.greek}\nDEF: ${e.def}\nKJV: ${e.kjv}\nORIG: ${e.orig}`
  ).join('\n\n');

  const userContent = promptTemplate.replace('{HESLA}', 'HESLA:\n' + items);

  return [
    { role: 'system', content: SYSTEM_MESSAGE },
    { role: 'user', content: userContent }
  ];
}

/**
 * Build retry messages with error context.
 * @param {string} userContent - User message content
 * @returns {Array<{role: string, content: string}>}
 */
export function buildRetryMessages(userContent) {
  return [
    { role: 'system', content: SYSTEM_MESSAGE },
    { role: 'user', content: userContent }
  ];
}

/**
 * Get next batch of keys to translate.
 * @param {string[]} allKeys - All available entry keys in order
 * @param {Object} translated - Current translations object
 * @param {number} size - Batch size
 * @returns {string[]} Array of keys for next batch
 */
export function getNextBatch(allKeys, translated, size) {
  const result = [];
  for (const key of allKeys) {
    if (result.length >= size) break;
    if (!translated[key] || translated[key].skipped) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Filter entries by status and search query.
 * @param {Array} entries - All entries
 * @param {Object} translated - Translations object
 * @param {string} searchQuery - Search text
 * @param {string} filterStatus - 'all', 'pending', 'done', 'failed'
 * @param {string} sortBy - 'num' or 'greek'
 * @returns {Array} Filtered and sorted entries
 */
export function filterEntries(entries, translated, searchQuery = '', filterStatus = 'all', sortBy = 'num') {
  let filtered = entries.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      e.key.toLowerCase().includes(q) ||
      e.greek.toLowerCase().includes(q) ||
      (e.def && e.def.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    const t = translated[e.key];
    const hasTranslation = t && t.vyznam && t.vyznam.trim().length > 0;
    const isFailed = t && (!t.vyznam || t.vyznam === '—');

    if (filterStatus === 'pending') return !hasTranslation;
    if (filterStatus === 'done') return hasTranslation && !isFailed;
    if (filterStatus === 'failed') return isFailed;
    return true;
  });

  if (sortBy === 'greek') {
    filtered.sort((a, b) => a.greek.localeCompare(b.greek));
  } else {
    filtered.sort((a, b) => parseInt(a.key.slice(1)) - parseInt(b.key.slice(1)));
  }

  return filtered;
}

/**
 * Calculate translation statistics.
 * @param {Object} translated - Translations object
 * @param {number} totalEntries - Total number of entries
 * @returns {{done: number, remaining: number, total: number, percentage: number}}
 */
export function calcStats(translated, totalEntries) {
  const done = Object.values(translated).filter(t =>
    t && t.vyznam && t.vyznam.trim().length > 0
  ).length;
  const total = totalEntries;
  const remaining = total - done;
  const percentage = total ? (done / total * 100).toFixed(1) : 0;

  return { done, remaining, total, percentage: parseFloat(percentage) };
}

/**
 * Escape HTML special characters.
 * @param {string} s - Input string
 * @returns {string}
 */
export function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Validate API response structure.
 * @param {Object} response - API response object
 * @param {string} provider - 'groq', 'gemini', or 'openrouter'
 * @returns {boolean}
 */
export function validateAPIResponse(response, provider) {
  if (!response) {
    throw new Error('Empty response from API');
  }

   if (provider === 'groq') {
     if (!response.choices?.[0]?.message?.content) {
       throw new Error('Invalid Groq response: missing choices[0].message.content');
     }
   } else if (provider === 'gemini') {
     if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
       throw new Error('Invalid Gemini response: missing candidates[0].content.parts[0].text');
     }
   } else if (provider === 'openrouter') {
     if (!response.choices?.[0]?.message?.content) {
       throw new Error('Invalid OpenRouter response: missing choices[0].message.content');
     }
   } else {
     throw new Error('Neznámý provider: ' + provider);
   }

   return true;
}

// ══ CONSTANTS ═════════════════════════════════════════════════════

export const SYSTEM_MESSAGE = `Jsi biblický lexikograf. Překládáš Strongův biblický slovník do češtiny.

PODPOROVANÉ TYPY:
- Řecká slova (G1-G5624): řecká slova z Nového zákona
- Hebrejská slova (H1-H8674): hebrejská slova ze Starého zákona  
- Gramatické kódy (H9001-H9048): hebrejské předložky, spojky, předpony

FORMÁT PRO VŠECHNY TYPY:
###G[číslo]### nebo ###H[číslo]###
VYZNAM: [český překlad/přesný význam]
DEFINICE: [stručná česká definice 1-2 věty]
POUZITI: [nejdůležitější biblická užití]
PUVOD: [původ slova, etymologie]

PRAVIDLA:
- Používej více synonym
- Používej přirozenou češtinu
- Dodržuj biblickou terminologii
- Vlastní jména transliteruj
- Pro gramatické kódy uveď český popis funkce s příklady`;

export const DEFAULT_PROMPT = `Jsi biblický lexikograf. Překládáš Strongův biblický slovník do češtiny.

PODPOROVANÉ TYPY:
- Řecká slova (G): řecká slova z Nového zákona
- Hebrejská slova (H): hebrejská slova ze Starého zákona  
- Gramatické kódy (H9000+): předložky, spojky, předpony

FORMÁT:
###G123### nebo ###H123###
VYZNAM: [český překlad]
DEFINICE: [stručná definice]
POUZITI: [biblická užití]
PUVOD: [původ, etymologie]

Pravidla:
- Více synonym
- Přirozená čeština
- Biblická terminologie
- Vlastní jména transliteruj

{HESLA}`;

// ══ EXPORT ALL ════════════════════════════════════════════════════
export default {
  parseTXT,
  parseTranslations,
  buildPromptMessages,
  buildRetryMessages,
  getNextBatch,
  filterEntries,
  calcStats,
  escHtml,
  validateAPIResponse,
  SYSTEM_MESSAGE,
  DEFAULT_PROMPT
};
