// js/translation/utils.js — pomocné funkce pro překlad
// Importováno přímo v batch.js, detail.js, list.js, header.js
import { state } from '../state.js';
import core from '../../strong_translator_core_new.js';

const { parseTranslations: parseTranslationsCore } = core;

// Lokální kopie pro getTranslationStateForKey (vyhýbá se circular dep s batch.js)
const _FALLBACK_TOPIC_ORDER = ['definice', 'vyznam', 'kjv', 'pouziti', 'puvod', 'specialista'];
function _countFailedTopics(translationEntry) {
  const e = translationEntry || {};
  let count = 0;
  for (const topicId of _FALLBACK_TOPIC_ORDER) {
    const val = String(e[topicId] || '').trim();
    if (!hasMeaningfulValue(val)) { count++; continue; }
    if (topicId === 'definice' && isDefinitionLowQuality(val)) count++;
  }
  return count;
}

export function hasMeaningfulValue(v) {
  const s = String(v || '').trim();
  return !!s && s !== '—' && s !== '(přeskočeno)';
}

/** Anglická část za „Originál:“ nesmí označit celou definici jako EN (běžné u CZ+AS dvojice). */
export function stripDefinitionOriginReferenceTail(text) {
  const s = String(text || '');
  const m = s.match(/\bOriginál\s*:/iu);
  if (!m || m.index === undefined || m.index <= 0) return s.trim();
  return s.slice(0, m.index).trim();
}

export function isDefinitionLikelyEnglish(text) {
  const s = stripDefinitionOriginReferenceTail(String(text || '').trim());
  if (!s) return false;
  const markers = [
    /\bwithout\b/i,
    /\bwith\b/i,
    /\bnot\b/i,
    /\bgood(?:ness)?\b/i,
    /\bto do\b/i,
    /\bjoy\b/i,
    /\bfrom\b/i,
    /\bmetaphor(?:ically)?\b/i,
    /\bsee word\b/i,
    /\bweight\b/i
  ];
  return markers.some(re => re.test(s));
}

export function isDefinitionLowQuality(text) {
  const s = String(text || '').trim();
  if (!s) return true;
  if (isDefinitionLikelyEnglish(s)) return true;
  // UI artefakty nebo technický šum místo definice.
  if (/(🤖|✎|prompt|upravit|edit|button|klik)/i.test(s)) return true;
  // Definice má být věcná; krátké, ale smysluplné formulace nechceme trestat.
  const words = s.split(/\s+/).filter(Boolean);
  const hasStructure = /[,:;()]/.test(s);
  const hasCzechDiacritics = /[áčďéěíňóřšťúůýž]/i.test(s);
  if (words.length < 4) return true;
  if (s.length < 30 && !hasStructure) return true;
  if (words.length < 6 && s.length < 45 && !hasStructure && !hasCzechDiacritics) return true;
  return false;
}

export function isTranslationComplete(t) {
  if (!t || t.skipped) return false;
  if (isDefinitionLowQuality(t.definice)) return false;
  const required = ['definice', 'pouziti', 'puvod', 'kjv', 'specialista'];
  return required.every(field => hasMeaningfulValue(t[field]));
}

export function hasAnyTranslationContent(t) {
  if (!t || t.skipped) return false;
  const fields = ['vyznam', 'definice', 'pouziti', 'puvod', 'kjv', 'specialista'];
  return fields.some(field => hasMeaningfulValue(t[field]));
}

export function getTranslationStateForKey(key) {
  const t = state.translated[key];
  if (!t || t.skipped) return 'pending';
  if (isTranslationComplete(t)) return 'done';
  if (!hasAnyTranslationContent(t)) return 'failed';
  const failedCount = _countFailedTopics(t);
  if (failedCount > 0 && failedCount <= 2) return 'missing_topic';
  return 'failed_partial';
}

export function fillMissingVyznamFromSource(keys) {
  if (!Array.isArray(keys)) return;
  for (const key of keys) {
    const t = state.translated[key];
    if (!t || hasMeaningfulValue(t.vyznam)) continue;
    const e = state.entryMap.get(key);
    const fallback = String(e?.vyznamCz || e?.cz || '').trim();
    if (fallback) {
      t.vyznam = fallback;
    }
  }
}

export function fillMissingKjvFromSource(keys) {
  if (!Array.isArray(keys)) return;
  for (const key of keys) {
    const t = state.translated[key];
    if (!t || hasMeaningfulValue(t.kjv)) continue;
    const e = state.entryMap.get(key);
    const fallback = String(e?.kjv || '').trim();
    if (fallback) {
      t.kjv = `${fallback} [POZN.: v angličtině ze vstupu]`;
    }
  }
}

export function annotateEnglishDefinitionsInTranslated(keys) {
  if (!Array.isArray(keys)) return;
  for (const key of keys) {
    const t = state.translated[key];
    if (!t) continue;
    if (!isDefinitionLikelyEnglish(t.definice)) continue;
    const original = String(t.definice || '').trim();
    if (!original) continue;
    if (/\[POZN\.: text je v angličtině - špatný překlad\]/.test(original)) continue;
    t.definice = `${original} [POZN.: text je v angličtině - špatný překlad]`;
  }
}

export function applyFallbacksToParsedMap(keys, parsedMap) {
  if (!Array.isArray(keys) || !parsedMap || typeof parsedMap !== 'object') return;
  for (const key of keys) {
    const t = parsedMap[key];
    if (!t) continue;
    const e = state.entryMap.get(key);
    if (!hasMeaningfulValue(t.vyznam)) {
      const vyznamFallback = String(e?.vyznamCz || e?.cz || '').trim();
      if (vyznamFallback) t.vyznam = vyznamFallback;
    }
    if (!hasMeaningfulValue(t.kjv)) {
      const kjvFallback = String(e?.kjv || '').trim();
      if (kjvFallback) t.kjv = `${kjvFallback} [POZN.: v angličtině ze vstupu]`;
    }
    if (isDefinitionLikelyEnglish(t.definice)) {
      t.definice = `${String(t.definice || '').trim()} [POZN.: text je v angličtině - špatný překlad]`.trim();
    }
  }
}

export function tryNormalizeNumberedOpenRouterResponse(raw, keys) {
  const text = String(raw || '').trim();
  if (!text) return null;
  if (/###\s*[GH]?\d+\s*###/i.test(text)) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const headerLine = lines.find(l => /^(?:\d+\.)?\s*[GH]\d+\b/i.test(l));
  if (!headerLine) return null;
  const keyMatch = headerLine.match(/([GH]\d+)/i);
  if (!keyMatch) return null;
  const foundKey = keyMatch[1].toUpperCase();
  if (Array.isArray(keys) && keys.length && !keys.includes(foundKey)) return null;

  const defLine = lines.find(l => /^DEF\s*:/i.test(l) || /^\d+\.\s*.*\|.*$/i.test(l) || /^\d+\.\s*[^\n]+$/i.test(l));
  const specialistaTail = lines.slice(Math.max(0, lines.length - 6)).join(' ');
  const normalized = [
    `###${foundKey}###`,
    `VYZNAM:`,
    `DEFINICE: ${defLine ? defLine.replace(/^\d+\.\s*/, '').replace(/^DEF\s*:/i, '').trim() : text.slice(0, 600)}`,
    `POUZITI:`,
    `PUVOD:`,
    `KJV:`,
    `SPECIALISTA: ${specialistaTail || ''}`
  ].join('\n');
  return normalized;
}

export function parseWithOpenRouterNormalization(raw, keys, targetObj) {
  const missingOriginal = parseTranslationsCore(raw, keys, targetObj);
  if (!Array.isArray(missingOriginal) || missingOriginal.length === 0) {
    return { missing: missingOriginal || [], normalizedUsed: false, normalizedText: '' };
  }
  const normalized = tryNormalizeNumberedOpenRouterResponse(raw, keys);
  if (!normalized) {
    return { missing: missingOriginal, normalizedUsed: false, normalizedText: '' };
  }
  const missingAfterNorm = parseTranslationsCore(normalized, keys, targetObj);
  return {
    missing: Array.isArray(missingAfterNorm) ? missingAfterNorm : missingOriginal,
    normalizedUsed: (missingAfterNorm || []).length < missingOriginal.length,
    normalizedText: normalized
  };
}

export function getStrongKeyNumber(key) {
  const normalized = String(key || '').trim();
  const match = normalized.match(/^(?:[GH])?(\d+)$/i);
  if (!match) return Number.POSITIVE_INFINITY;
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}
