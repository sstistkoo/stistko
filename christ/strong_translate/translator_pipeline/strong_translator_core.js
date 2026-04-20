/**
 * Strong Greek→Czech Translator — Core Logic Module
 * Pure functions for parsing, translation, and business logic.
 * No DOM dependencies — fully unit-testable.
 */

// ══ TEXT PARSING ═══════════════════════════════════════════════════

/**
 * Parse Strong Greek detailed TXT file format.
 * @param {string} text - Raw file content
 * @returns {Array<{key: string, greek: string, def: string, kjv: string, orig: string}>}
 */
export function parseTXT(text) {
  const blocks = text.trim().split(/\n(?=G\d+\s*\|)/);
  const result = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const header = lines[0];
    const m = header.match(/^(G\d+)\s*\|\s*(.+)/);
    if (!m) continue;

    const entry = {
      key: m[1],
      greek: m[2].trim(),
      def: '',
      kjv: '',
      orig: ''
    };

    for (const line of lines.slice(1)) {
      if (line.startsWith('Definice:'))    entry.def  = line.slice(9).trim();
      else if (line.startsWith('KJV Významy:')) entry.kjv  = line.slice(12).trim();
      else if (line.startsWith('Původ:'))  entry.orig = line.slice(6).trim();
    }

    result.push(entry);
  }

  return result;
}

/**
 * Parse AI translation response into structured format.
 * Supports both ###GXXX### and plain GXXX | formats.
 * @param {string} raw - Raw AI response text
 * @param {string[]} keys - Expected keys to match
 * @param {Object} [translatedStorage] - Existing translated object to update
 * @returns {string[]} Array of missing keys that weren't parsed
 */
export function parseTranslations(raw, keys, translatedStorage = {}) {
  try {
    let blocks;
    let usePlainFormat = false;

    if (raw.includes('###G')) {
      blocks = raw.split(/(?=###G\d+###)/);
    } else {
      blocks = raw.split(/(?=G\d+\s*\|)/);
      if (blocks.length > 1 && /G\d+\s*\|/.test(blocks[0])) {
        usePlainFormat = true;
      }
    }

    const hasValidBlocks = blocks.some(b => /###G\d+|G\d+\s*\|/.test(b));
    if (!hasValidBlocks) {
      const weirdChars = (raw.match(/[^\x20-\x7E\n\r\těščřžýáíéúůťďňĚŠČŘŽÝÁÍÉÚŮŤĎŇ]/g) || []).length;
      const totalChars = raw.length;
      if (weirdChars > totalChars * 0.3 || totalChars < 50) {
        throw new Error('AI response appears corrupted or rate-limited');
      }
    }

    for (const block of blocks) {
      let key, get;

      const kmHash = block.match(/###(G\d+)###/);
      const kmPlain = block.match(/G(\d+)\s*\|/);

      if (kmHash) {
        key = kmHash[1];
        if (!keys.includes(key)) continue;
        get = (label) => {
          const m = block.match(new RegExp(label + ':\\s*([^\\n]+(?:\\n(?!(?:VYZNAM|DEFINICE|POUZITI|PUVOD|###))[^\\n]+)*)'));
          return m ? m[1].trim() : '';
        };
      } else if (kmPlain) {
        key = 'G' + kmPlain[1];
        if (!keys.includes(key)) continue;
        // Parse plain block into field map by exact label
        const fieldMap = {};
        const lines = block.split('\n');
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const colonIdx = line.indexOf(':');
          if (colonIdx === -1) continue;
          const label = line.slice(0, colonIdx).trim();
          const value = line.slice(colonIdx + 1).trim();
          fieldMap[label] = value;
        }
        get = (label) => fieldMap[label] || '';
      } else {
        continue;
      }

      if (!key || !keys.includes(key)) continue;

      translatedStorage[key] = {
        vyznam:   get('Český význam') || get('VYZNAM') || get('Význam') || get('Překlad'),
        definice: get('DEFINICE') || get('Definice'),
        pouziti:  get('POUZITI') || get('Použití') || get('Biblické užití') || get('KJV'),
        puvod:    get('PUVOD') || get('Původ') || get('Původ/význam'),
        raw:      block
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

export const SYSTEM_MESSAGE = `Jsi biblický lexikograf. Překládáš Strongův řecko-český slovník. Formát: ###GXXX### VYZNAM: [české překlady] DEFINICE: [výklad 2-4 věty] POUZITI: [KJV překlady] PUVOD: [etymologie] Pravidla: více synonym, přirozená čeština, biblická terminologie, vlastní jména transliteruj.`;

export const DEFAULT_PROMPT = `Jsi biblický lexikograf. Překládáš Strongův řecko-český slovník.

Formát:
###GXXX###
VYZNAM: [české překlady]
DEFINICE: [výklad 2-4 věty]
POUZITI: [KJV překlady]
PUVOD: [etymologie]

Pravidla: více synonym, přirozená čeština, biblická terminologie, vlastní jména transliteruj.

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
