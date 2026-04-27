import test from 'node:test';
import assert from 'node:assert/strict';

import { state } from '../js/state.js';
import {
  hasMeaningfulValue,
  stripDefinitionOriginReferenceTail,
  isDefinitionLikelyEnglish,
  isDefinitionLowQuality,
  isTranslationComplete,
  getTranslationStateForKey,
  fillMissingVyznamFromSource,
  fillMissingKjvFromSource,
  annotateEnglishDefinitionsInTranslated,
  applyFallbacksToParsedMap,
  tryNormalizeNumberedOpenRouterResponse,
  parseWithOpenRouterNormalization,
  getStrongKeyNumber
} from '../js/translation/utils.js';

function snapshotState() {
  return {
    translated: state.translated,
    entryMap: state.entryMap
  };
}

function restoreState(snap) {
  state.translated = snap.translated;
  state.entryMap = snap.entryMap;
}

test('hasMeaningfulValue filters placeholders and blank values', () => {
  assert.equal(hasMeaningfulValue('text'), true);
  assert.equal(hasMeaningfulValue(' — '), false);
  assert.equal(hasMeaningfulValue('(přeskočeno)'), false);
  assert.equal(hasMeaningfulValue('   '), false);
});

test('stripDefinitionOriginReferenceTail removes trailing Originál section', () => {
  const out = stripDefinitionOriginReferenceTail('Dobry text. Originál: with joy');
  assert.equal(out, 'Dobry text.');
});

test('isDefinitionLikelyEnglish detects english markers but ignores empty', () => {
  assert.equal(isDefinitionLikelyEnglish('This is good without context'), true);
  assert.equal(isDefinitionLikelyEnglish(''), false);
});

test('isDefinitionLowQuality marks short and UI-noise text as low quality', () => {
  assert.equal(isDefinitionLowQuality('kratke'), true);
  assert.equal(isDefinitionLowQuality('klik button prompt edit'), true);
});

test('isTranslationComplete requires all key fields and quality definition', () => {
  const complete = {
    definice: 'Toto je dostatečně dlouhá a strukturovaná definice, která projde.',
    pouziti: 'Pouziti text',
    puvod: 'Puvod text',
    kjv: 'KJV text',
    specialista: 'Specialista text'
  };
  assert.equal(isTranslationComplete(complete), true);
  assert.equal(isTranslationComplete({ ...complete, definice: 'short' }), false);
});

test('getTranslationStateForKey returns done, pending and missing_topic states', () => {
  const snap = snapshotState();
  state.translated = {};
  state.entryMap = new Map();
  try {
    state.translated.G1 = {
      definice: 'Toto je dostatečně dlouhá a strukturovaná definice, která projde.',
      pouziti: 'a',
      puvod: 'b',
      kjv: 'c',
      specialista: 'd',
      vyznam: 'e'
    };
    state.translated.G2 = { skipped: true };
    state.translated.G3 = {
      definice: 'Toto je dostatečně dlouhá a strukturovaná definice, která projde.',
      pouziti: 'a',
      puvod: '',
      kjv: 'c',
      specialista: 'd',
      vyznam: 'e'
    };

    assert.equal(getTranslationStateForKey('G1'), 'done');
    assert.equal(getTranslationStateForKey('G2'), 'pending');
    assert.equal(getTranslationStateForKey('G3'), 'missing_topic');
  } finally {
    restoreState(snap);
  }
});

test('fillMissingVyznamFromSource fills empty value from entryMap', () => {
  const snap = snapshotState();
  state.translated = { G1: { vyznam: '' } };
  state.entryMap = new Map([['G1', { vyznamCz: 'fallback vyznam' }]]);
  try {
    fillMissingVyznamFromSource(['G1']);
    assert.equal(state.translated.G1.vyznam, 'fallback vyznam');
  } finally {
    restoreState(snap);
  }
});

test('fillMissingKjvFromSource appends source marker when missing', () => {
  const snap = snapshotState();
  state.translated = { G1: { kjv: '' } };
  state.entryMap = new Map([['G1', { kjv: 'source kjv' }]]);
  try {
    fillMissingKjvFromSource(['G1']);
    assert.match(state.translated.G1.kjv, /source kjv/);
    assert.match(state.translated.G1.kjv, /\[POZN\.: v angličtině ze vstupu\]/);
  } finally {
    restoreState(snap);
  }
});

test('annotateEnglishDefinitionsInTranslated annotates english definitions once', () => {
  const snap = snapshotState();
  state.translated = { G1: { definice: 'without meaning' } };
  state.entryMap = new Map();
  try {
    annotateEnglishDefinitionsInTranslated(['G1']);
    const once = state.translated.G1.definice;
    annotateEnglishDefinitionsInTranslated(['G1']);
    assert.equal(state.translated.G1.definice, once);
    assert.match(once, /\[POZN\.: text je v angličtině - špatný překlad\]/);
  } finally {
    restoreState(snap);
  }
});

test('applyFallbacksToParsedMap fills vyznam/kjv and annotates english definition', () => {
  const snap = snapshotState();
  state.translated = {};
  state.entryMap = new Map([['G1', { vyznamCz: 'vz', kjv: 'kjv-source' }]]);
  const parsed = { G1: { vyznam: '', kjv: '', definice: 'without context' } };
  try {
    applyFallbacksToParsedMap(['G1'], parsed);
    assert.equal(parsed.G1.vyznam, 'vz');
    assert.match(parsed.G1.kjv, /kjv-source/);
    assert.match(parsed.G1.definice, /\[POZN\.: text je v angličtině - špatný překlad\]/);
  } finally {
    restoreState(snap);
  }
});

test('tryNormalizeNumberedOpenRouterResponse normalizes numbered block', () => {
  const raw = '1. G123 | text\nDEF: Something useful\nmore tail';
  const out = tryNormalizeNumberedOpenRouterResponse(raw, ['G123']);
  assert.ok(out);
  assert.match(out, /###G123###/);
  assert.match(out, /DEFINICE:/);
});

test('parseWithOpenRouterNormalization uses normalization when original parse fails', () => {
  const snap = snapshotState();
  state.translated = {};
  state.entryMap = new Map();
  try {
    const raw = '1. G555 | sample\nDEF: Definice text';
    const res = parseWithOpenRouterNormalization(raw, ['G555'], state.translated);
    assert.equal(Array.isArray(res.missing), true);
    assert.equal(typeof res.normalizedUsed, 'boolean');
  } finally {
    restoreState(snap);
  }
});

test('getStrongKeyNumber parses both prefixed and numeric keys', () => {
  assert.equal(getStrongKeyNumber('G123'), 123);
  assert.equal(getStrongKeyNumber('H9'), 9);
  assert.equal(getStrongKeyNumber('456'), 456);
  assert.equal(getStrongKeyNumber('X9'), Number.POSITIVE_INFINITY);
});
