import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getDefaultContentTag,
  getContentLangTag,
  validateUiMessages,
  getUiLang,
  consumeUiLangFallback,
  t,
  UI_LANGS
} from '../js/i18n.js';

function makeLocalStorageMock() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    }
  };
}

test('getDefaultContentTag uses target lang mapping', () => {
  globalThis.localStorage = makeLocalStorageMock();
  globalThis.localStorage.setItem('strong_target_lang', 'pl');
  assert.equal(getDefaultContentTag(), 'PL');
});

test('getDefaultContentTag falls back to EN for unknown target', () => {
  globalThis.localStorage = makeLocalStorageMock();
  globalThis.localStorage.setItem('strong_target_lang', 'xx');
  assert.equal(getDefaultContentTag(), 'EN');
});

test('getContentLangTag follows UI language priority', () => {
  globalThis.localStorage = makeLocalStorageMock();
  globalThis.localStorage.setItem('strong_ui_lang', 'cs');
  globalThis.localStorage.setItem('strong_content_tag_lang', 'DE');
  globalThis.localStorage.setItem('strong_content_tag_lang_manual', '1');
  assert.equal(getContentLangTag(), 'CZ');
});

test('getContentLangTag uses manual stored tag for non-CS/EN/SK/PL UI', () => {
  globalThis.localStorage = makeLocalStorageMock();
  globalThis.localStorage.setItem('strong_ui_lang', 'ru');
  globalThis.localStorage.setItem('strong_content_tag_lang', 'DE');
  globalThis.localStorage.setItem('strong_content_tag_lang_manual', '1');
  assert.equal(getContentLangTag(), 'DE');
});

test('getUiLang falls back to default and reports fallback info', () => {
  globalThis.localStorage = makeLocalStorageMock();
  globalThis.localStorage.setItem('strong_ui_lang', 'xx');
  assert.equal(getUiLang(), 'cs');
  const info = consumeUiLangFallback();
  assert.deepEqual(info, { requested: 'xx', fallback: 'cs' });
});

test('t replaces placeholders', () => {
  globalThis.localStorage = makeLocalStorageMock();
  globalThis.localStorage.setItem('strong_ui_lang', 'en');
  const value = t('toast.error.withMessage', { message: 'boom' });
  assert.equal(value, '✗ Error: boom');
});

test('t enforces (EN) suffix for fixed english keys', () => {
  globalThis.localStorage = makeLocalStorageMock();
  globalThis.localStorage.setItem('strong_ui_lang', 'en');
  const value = t('detail.label.definitionEn');
  assert.match(value, /\(EN\)/);
});

test('validateUiMessages warns when non-default language misses keys', () => {
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args);
  try {
    validateUiMessages({
      cs: { a: 'A', b: 'B' },
      en: { a: 'A' },
      sk: { a: 'A', b: 'B' },
      pl: { a: 'A', b: 'B' },
      de: { a: 'A', b: 'B' },
      fr: { a: 'A', b: 'B' },
      es: { a: 'A', b: 'B' },
      it: { a: 'A', b: 'B' },
      pt: { a: 'A', b: 'B' },
      ru: { a: 'A', b: 'B' }
    });
  } finally {
    console.warn = originalWarn;
  }
  assert.ok(warnings.some(w => String(w[0]).includes('Missing keys in "en"')));
});

test('i18n guard: all UI languages contain all keys from cs.json', async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const i18nDir = path.resolve(here, '../i18n');
  const csPath = path.join(i18nDir, 'cs.json');
  const cs = JSON.parse(await readFile(csPath, 'utf8'));
  const baseKeys = Object.keys(cs);

  const missingByLang = {};
  for (const lang of Array.from(UI_LANGS).filter((x) => x !== 'cs')) {
    const dictPath = path.join(i18nDir, `${lang}.json`);
    const dict = JSON.parse(await readFile(dictPath, 'utf8'));
    const missing = baseKeys.filter((k) => !(k in dict));
    if (missing.length) missingByLang[lang] = missing;
  }

  assert.deepEqual(
    missingByLang,
    {},
    `Missing i18n keys detected: ${JSON.stringify(missingByLang, null, 2)}`
  );
});
