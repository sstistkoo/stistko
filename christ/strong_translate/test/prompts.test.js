import test from 'node:test';
import assert from 'node:assert/strict';

import * as prompts from '../strong_prompts.js';

test('prompts module exports expected constants', () => {
  assert.equal(typeof prompts.SYSTEM_MESSAGE, 'string');
  assert.equal(typeof prompts.DEFAULT_PROMPT, 'string');
  assert.ok(prompts.CATEGORY_LABELS !== null && typeof prompts.CATEGORY_LABELS === 'object');
  assert.ok(prompts.FINAL_PROMPT !== null && typeof prompts.FINAL_PROMPT === 'object');
  assert.ok(prompts.PROMPT_LIBRARY_BASE !== null && typeof prompts.PROMPT_LIBRARY_BASE === 'object');
  assert.ok(prompts.MODEL_TEST_PROMPT_CATALOG !== null && typeof prompts.MODEL_TEST_PROMPT_CATALOG === 'object');
});

test('SYSTEM_MESSAGE has expected content', () => {
  assert.equal(prompts.SYSTEM_MESSAGE, 'You are a biblical lexicon translation assistant.');
});

test('DEFAULT_PROMPT has expected structure', () => {
  assert.ok(prompts.DEFAULT_PROMPT.includes('Translate entries from {SOURCE_LANG} to {TARGET_LANG}'));
  assert.ok(prompts.DEFAULT_PROMPT.includes('###Gx###'));
  assert.ok(prompts.DEFAULT_PROMPT.includes('VYZNAM:'));
  assert.ok(prompts.DEFAULT_PROMPT.includes('DEFINICE:'));
  assert.ok(prompts.DEFAULT_PROMPT.includes('POUZITI:'));
  assert.ok(prompts.DEFAULT_PROMPT.includes('PUVOD:'));
  assert.ok(prompts.DEFAULT_PROMPT.includes('KJV:'));
  assert.ok(prompts.DEFAULT_PROMPT.includes('SPECIALISTA:'));
  assert.ok(prompts.DEFAULT_PROMPT.includes('HESLA:\n{HESLA}'));
});

test('CATEGORY_LABELS has expected categories', () => {
  assert.equal(prompts.CATEGORY_LABELS.default, 'Default');
  assert.equal(prompts.CATEGORY_LABELS.detailed, 'Detailed');
  assert.equal(prompts.CATEGORY_LABELS.concise, 'Concise');
  assert.equal(prompts.CATEGORY_LABELS.literal, 'Literal');
  assert.equal(prompts.CATEGORY_LABELS.test, 'Test');
  assert.equal(prompts.CATEGORY_LABELS.custom, 'Custom');
  assert.equal(prompts.CATEGORY_LABELS.library, 'Library');
  assert.equal(prompts.CATEGORY_LABELS.final, 'Final');
});

test('FINAL_PROMPT has expected structure', () => {
  assert.equal(prompts.FINAL_PROMPT.name, 'Final');
  assert.equal(prompts.FINAL_PROMPT.desc, 'Complete translation with all fields');
  assert.equal(prompts.FINAL_PROMPT.text, prompts.DEFAULT_PROMPT);
});

test('PROMPT_LIBRARY_BASE has expected structure', () => {
  assert.ok(Array.isArray(prompts.PROMPT_LIBRARY_BASE.default));
  assert.ok(Array.isArray(prompts.PROMPT_LIBRARY_BASE.detailed));
  assert.ok(Array.isArray(prompts.PROMPT_LIBRARY_BASE.concise));
  assert.ok(Array.isArray(prompts.PROMPT_LIBRARY_BASE.literal));
  assert.ok(Array.isArray(prompts.PROMPT_LIBRARY_BASE.test));
  assert.ok(Array.isArray(prompts.PROMPT_LIBRARY_BASE.custom));
  assert.ok(Array.isArray(prompts.PROMPT_LIBRARY_BASE.library));
  
  // Check that each category has at least one prompt
  assert.equal(prompts.PROMPT_LIBRARY_BASE.default.length, 1);
  assert.equal(prompts.PROMPT_LIBRARY_BASE.detailed.length, 1);
  assert.equal(prompts.PROMPT_LIBRARY_BASE.concise.length, 1);
  assert.equal(prompts.PROMPT_LIBRARY_BASE.literal.length, 1);
  assert.equal(prompts.PROMPT_LIBRARY_BASE.test.length, 0);
  assert.equal(prompts.PROMPT_LIBRARY_BASE.custom.length, 0);
  assert.equal(prompts.PROMPT_LIBRARY_BASE.library.length, 3);
  
  // Check default prompt content
  assert.equal(prompts.PROMPT_LIBRARY_BASE.default[0].name, 'System');
  assert.equal(prompts.PROMPT_LIBRARY_BASE.default[0].desc, 'System default prompt');
  assert.equal(prompts.PROMPT_LIBRARY_BASE.default[0].text, prompts.DEFAULT_PROMPT);
});

test('MODEL_TEST_PROMPT_CATALOG has expected presets', () => {
  // Check that we have the expected number of presets
  // From the source: preset_v1 through preset_v15, plus topic presets
  const presetKeys = Object.keys(prompts.MODEL_TEST_PROMPT_CATALOG);
  assert.ok(presetKeys.length >= 15); // At least v1-v15
  
  // Check a few specific presets
  assert.ok(prompts.MODEL_TEST_PROMPT_CATALOG.preset_v1);
  assert.ok(prompts.MODEL_TEST_PROMPT_CATALOG.preset_v5);
  assert.ok(prompts.MODEL_TEST_PROMPT_CATALOG.preset_v10);
  assert.ok(prompts.MODEL_TEST_PROMPT_CATALOG.preset_v15);
  
  // Check that they have expected structure
  const presetV1 = prompts.MODEL_TEST_PROMPT_CATALOG.preset_v1;
  assert.equal(presetV1.label, 'Fallback preset_v1');
  assert.equal(presetV1.template, prompts.DEFAULT_PROMPT);
  
  // Check topic presets exist
  assert.ok(prompts.MODEL_TEST_PROMPT_CATALOG.preset_topic_definice);
  assert.ok(prompts.MODEL_TEST_PROMPT_CATALOG.preset_topic_vyznam);
  assert.ok(prompts.MODEL_TEST_PROMPT_CATALOG.preset_topic_kjv);
  assert.ok(prompts.MODEL_TEST_PROMPT_CATALOG.preset_topic_pouziti);
  assert.ok(prompts.MODEL_TEST_PROMPT_CATALOG.preset_topic_puvod);
  assert.ok(prompts.MODEL_TEST_PROMPT_CATALOG.preset_topic_specialista);
  
  // Check topic preset structure
  const topicDefinice = prompts.MODEL_TEST_PROMPT_CATALOG.preset_topic_definice;
  assert.equal(topicDefinice.label, 'Fallback preset_topic_definice');
  assert.equal(topicDefinice.template, prompts.DEFAULT_PROMPT);
  assert.equal(topicDefinice.topicLabel, 'Topic');
});

test('DEFAULT_PROMPT template replacement works correctly', () => {
  const testPrompt = prompts.DEFAULT_PROMPT
    .replace(/{TARGET_LANG}/g, 'češtiny')
    .replace(/{SOURCE_LANG}/g, 'řečtiny/hebrejštiny')
    .replace(/{HESLA}/g, 'G1 | logos\nG2 | agape');
  
  assert.ok(testPrompt.includes('Translate entries from řečtiny/hebrejštiny to češtiny'));
  assert.ok(testPrompt.includes('G1 | logos\nG2 | agape'));
  assert.ok(testPrompt.includes('###Gx###'));
  assert.ok(testPrompt.includes('VYZNAM:'));
  assert.ok(testPrompt.includes('DEFINICE:'));
  assert.ok(testPrompt.includes('POUZITI:'));
  assert.ok(testPrompt.includes('PUVOD:'));
  assert.ok(testPrompt.includes('KJV:'));
  assert.ok(testPrompt.includes('SPECIALISTA:'));
  assert.ok(testPrompt.includes('HESLA:\nG1 | logos\nG2 | agape'));
});

test('template replacement handles multiple replacements', () => {
  const testText = 'Test {SOURCE_LANG} and {TARGET_LANG} and {HESLA}';
  const result = testText
    .replace(/{SOURCE_LANG}/g, 'řečtiny')
    .replace(/{TARGET_LANG}/g, 'češtiny')
    .replace(/{HESLA}/g, 'G1|word');
  
  assert.equal(result, 'Test řečtiny and češtiny and G1|word');
});

test('template replacement works with empty values', () => {
  const testText = 'Test {SOURCE_LANG} and {TARGET_LANG}';
  const result = testText
    .replace(/{SOURCE_LANG}/g, '')
    .replace(/{TARGET_LANG}/g, 'češtiny');
  
  assert.equal(result, 'Test  and češtiny');
});

test('template replacement preserves text when no matches', () => {
  const testText = 'Test text without placeholders';
  const result = testText
    .replace(/{SOURCE_LANG}/g, 'řečtiny')
    .replace(/{TARGET_LANG}/g, 'češtiny');
  
  assert.equal(result, 'Test text without placeholders');
});