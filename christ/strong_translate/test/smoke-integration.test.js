import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { JSDOM } from 'jsdom';

import { parseCzTXT } from '../js/parser.js';
import core from '../strong_translator_core_new.js';
import { state } from '../js/state.js';
import { refreshStaticProviderSelectLabel } from '../js/i18n.js';

function makeLocalStorageMock(seed = {}) {
  const data = new Map(Object.entries(seed));
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

test('HTML smoke: key app elements exist in template', () => {
  const htmlPath = path.resolve('strong_translator.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html);
  const { document } = dom.window;

  const requiredIds = [
    'setup',
    'app',
    'provider',
    'pipelineModelMainGroq',
    'btnAuto',
    'modelTestModal',
    'promptEditor'
  ];

  for (const id of requiredIds) {
    assert.ok(document.getElementById(id), `Missing #${id}`);
  }
});

test('DOM + i18n integration: provider select labels can be refreshed', () => {
  const dom = new JSDOM('<select id="providerSelect"></select>');
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevLocalStorage = globalThis.localStorage;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = makeLocalStorageMock({ strong_ui_lang: 'cs' });

  try {
    refreshStaticProviderSelectLabel('providerSelect', 'groq');
    const select = document.getElementById('providerSelect');
    assert.ok(select.options.length > 0);
    assert.ok(Array.from(select.options).some((o) => String(o.value).includes('llama')));
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    globalThis.localStorage = prevLocalStorage;
  }
});

test('Pipeline smoke: parse TXT -> parse AI response -> translated state', () => {
  const inputTxt = [
    'G1 | logos',
    'Definice: original def',
    '',
    'G2 | agape',
    'Definice: original def 2'
  ].join('\n');

  const parsedEntries = parseCzTXT(inputTxt);
  const keys = Object.keys(parsedEntries);
  assert.deepEqual(keys.sort(), ['G1', 'G2']);

  const aiRaw = [
    '###G1###',
    'VYZNAM: Slovo',
    'DEFINICE: Kvalitní definice s dostatkem obsahu a kontextu.',
    'POUZITI: Použití',
    'PUVOD: Původ',
    'KJV: Word',
    'SPECIALISTA: Komentář',
    '###G2###',
    'VYZNAM: Láska',
    'DEFINICE: Kvalitní definice s dostatkem obsahu a kontextu.',
    'POUZITI: Použití',
    'PUVOD: Původ',
    'KJV: Love',
    'SPECIALISTA: Komentář'
  ].join('\n');

  const translated = {};
  const missing = core.parseTranslations(aiRaw, keys, translated);
  assert.deepEqual(missing, []);
  assert.equal(translated.G1.vyznam, 'Slovo');
  assert.equal(translated.G2.specialista, 'Komentář');
});

test('State smoke: parsed translations can be assigned to shared state', () => {
  const snap = state.translated;
  try {
    state.translated = {};
    core.parseTranslations(
      '###G10###\nVYZNAM: Test\nSPECIALISTA: Ok',
      ['G10'],
      state.translated
    );
    assert.equal(state.translated.G10.vyznam, 'Test');
    assert.equal(state.translated.G10.specialista, 'Ok');
  } finally {
    state.translated = snap;
  }
});
