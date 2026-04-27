import test from 'node:test';
import assert from 'node:assert/strict';

import core, {
  parseTXT,
  parseTranslations,
  buildPromptMessages,
  buildRetryMessages,
  escHtml,
  validateAPIResponse
} from '../strong_translator_core_new.js';

test('parseTXT parses basic G entry', () => {
  const input = [
    'G1 | logos',
    'Definice: Slovo [Jn.1:1]',
    'Tvaroslovi: noun',
    'En: word',
    'KJV Významy: Word'
  ].join('\n');
  const out = parseTXT(input);
  assert.equal(out.length, 1);
  assert.equal(out[0].key, 'G1');
  assert.equal(out[0].greek, 'logos');
  assert.equal(out[0].vyskyt, 'Jn.1:1');
});

test('parseTXT detects hebrew and grammar types', () => {
  const input = [
    'H1 | heb',
    'Definice: text',
    '',
    'H9001 | grm',
    'Definice: text2'
  ].join('\n');
  const out = parseTXT(input);
  assert.equal(out[0].type, undefined); // finishEntry omits type; verify by shape fields instead
  assert.ok('vokalizace' in out[0]);
  assert.ok('kategorie' in out[1]);
});

test('parseTranslations parses labeled block and returns missing keys', () => {
  const raw = [
    '###G5###',
    'VYZNAM: Význam',
    'DEFINICE: Definice',
    'POUZITI: Užití',
    'PUVOD: Původ',
    'KJV: KJV text',
    'SPECIALISTA: Komentář'
  ].join('\n');
  const translated = {};
  const missing = parseTranslations(raw, ['G5', 'G6'], translated);
  assert.equal(translated.G5.vyznam, 'Význam');
  assert.equal(translated.G5.specialista, 'Komentář');
  assert.deepEqual(missing, ['G6']);
});

test('parseTranslations maps numeric key between G/H spaces', () => {
  const raw = [
    '###H10###',
    'VYZNAM: A',
    'SPECIALISTA: B'
  ].join('\n');
  const translated = {};
  parseTranslations(raw, ['G10'], translated);
  assert.equal(translated.G10.vyznam, 'A');
  assert.equal(translated.G10.specialista, 'B');
});

test('parseTranslations accepts english labels aliases', () => {
  const raw = [
    '###G7###',
    'MEANING: Meaning text',
    'DEFINITION: Definition text',
    'USAGE: Usage text',
    'ORIGIN: Origin text',
    'KJV: kjv',
    'COMMENTARY: specialist'
  ].join('\n');
  const translated = {};
  parseTranslations(raw, ['G7'], translated);
  assert.equal(translated.G7.vyznam, 'Meaning text');
  assert.equal(translated.G7.definice, 'Definition text');
  assert.equal(translated.G7.specialista, 'specialist');
});

test('buildPromptMessages returns system and user messages', () => {
  const messages = buildPromptMessages([{ key: 'G1', greek: 'logos', definice: 'def' }]);
  assert.equal(Array.isArray(messages), true);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, 'system');
  assert.equal(messages[1].role, 'user');
  assert.match(messages[1].content, /G1 \| logos/);
});

test('buildRetryMessages preserves user content', () => {
  const messages = buildRetryMessages('retry now');
  assert.equal(messages[1].content, 'retry now');
});

test('escHtml escapes ampersand and angle brackets', () => {
  const out = escHtml('<a&b>');
  assert.equal(out, '&lt;a&amp;b&gt;');
});

test('validateAPIResponse validates per provider format', () => {
  assert.equal(validateAPIResponse({ choices: [{ message: { content: 'ok' } }] }, 'groq'), true);
  assert.equal(validateAPIResponse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }, 'gemini'), true);
  assert.equal(validateAPIResponse({ choices: [{ message: { content: 'ok' } }] }, 'openrouter'), true);
});

test('core default export exposes expected functions', () => {
  assert.equal(typeof core.parseTXT, 'function');
  assert.equal(typeof core.parseTranslations, 'function');
  assert.equal(typeof core.validateAPIResponse, 'function');
});
