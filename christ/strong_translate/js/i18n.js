import { PROVIDERS } from './config.js';

export const UI_LANG_KEY = 'strong_ui_lang';
export const DEFAULT_UI_LANG = 'cs';
export const UI_LANGS = new Set(['cs', 'en', 'sk', 'pl']);
export const INLINE_UI_MESSAGES = {
  cs: {
    'toast.error.withMessage': '✗ Chyba: {message}'
  },
  en: {
    'toast.error.withMessage': '✗ Error: {message}'
  },
  sk: {
    'toast.error.withMessage': '✗ Chyba: {message}'
  },
  pl: {
    'toast.error.withMessage': '✗ Błąd: {message}'
  }
};

let UI_MESSAGES = INLINE_UI_MESSAGES;
let uiMessagesLoadPromise = null;

export async function fetchUiDictionary(lang) {
  const url = `./i18n/${lang}.json`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

export function validateUiMessages(messages) {
  const base = messages[DEFAULT_UI_LANG] || {};
  const baseKeys = Object.keys(base);
  for (const lang of UI_LANGS) {
    if (lang === DEFAULT_UI_LANG) continue;
    const dict = messages[lang] || {};
    const missing = baseKeys.filter(key => !(key in dict));
    if (missing.length) {
      console.warn(`[i18n] Missing keys in "${lang}":`, missing);
    }
  }
}

export function loadUiMessages(force = false) {
  if (uiMessagesLoadPromise && !force) return uiMessagesLoadPromise;
  uiMessagesLoadPromise = (async () => {
    const fallback = INLINE_UI_MESSAGES;
    const loaded = { ...fallback };
    try {
      loaded[DEFAULT_UI_LANG] = await fetchUiDictionary(DEFAULT_UI_LANG);
    } catch (err) {
      console.warn('[i18n] Failed loading default UI dictionary, using inline fallback:', err);
      loaded[DEFAULT_UI_LANG] = fallback[DEFAULT_UI_LANG] || {};
    }
    await Promise.all(Array.from(UI_LANGS).filter(lang => lang !== DEFAULT_UI_LANG).map(async lang => {
      try {
        loaded[lang] = await fetchUiDictionary(lang);
      } catch (err) {
        console.warn(`[i18n] Failed loading "${lang}" dictionary, using fallback:`, err);
        loaded[lang] = fallback[lang] || {};
      }
    }));
    UI_MESSAGES = loaded;
    validateUiMessages(UI_MESSAGES);
    return UI_MESSAGES;
  })();
  return uiMessagesLoadPromise;
}

export function getUiLang() {
  const raw = String(localStorage.getItem(UI_LANG_KEY) || DEFAULT_UI_LANG).toLowerCase();
  return UI_LANGS.has(raw) ? raw : DEFAULT_UI_LANG;
}

export function t(key, params = {}) {
  const lang = getUiLang();
  const source = UI_MESSAGES[lang] || UI_MESSAGES[DEFAULT_UI_LANG];
  const fallback = UI_MESSAGES[DEFAULT_UI_LANG];
  let text = source?.[key] ?? fallback?.[key] ?? key;
  for (const [name, value] of Object.entries(params || {})) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

export function uiLabel(labelOrKey) {
  const raw = String(labelOrKey || '').trim();
  if (!raw) return '';
  return raw.startsWith('model.') ? t(raw) : raw;
}

export function refreshStaticProviderSelectLabel(selectId, prov) {
  const select = document.getElementById(selectId);
  if (!select || prov === 'openrouter') return;
  const selected = String(select.value || '').trim();
  const options = (PROVIDERS[prov]?.models || []).map(([value, label]) => ({ value, label: uiLabel(label) || value }));
  select.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  if (selected && Array.from(select.options).some(o => o.value === selected)) {
    select.value = selected;
  }
}
