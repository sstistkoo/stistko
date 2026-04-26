/**
 * Generuje i18n/prompts.cs.json a i18n/prompts.en.json z aktuálních zdrojů.
 * Spuštění z kořene strong_translate: node scripts/build-prompts-i18n.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

const { default: core } = await import(pathToFileURL(join(root, 'strong_translator_core_new.js')).href);
const { default: prompts } = await import(pathToFileURL(join(root, 'strong_prompts.js')).href);

const { SYSTEM_MESSAGE, DEFAULT_PROMPT } = core;
const { FINAL_PROMPT, PROMPT_LIBRARY_BASE, MODEL_TEST_PROMPT_CATALOG, CATEGORY_LABELS } = prompts;

const out = {};

out['aiPrompts.core.system'] = SYSTEM_MESSAGE;
out['aiPrompts.core.userDefault'] = DEFAULT_PROMPT;

out['aiPrompts.final.name'] = FINAL_PROMPT.name;
out['aiPrompts.final.desc'] = FINAL_PROMPT.desc;
out['aiPrompts.final.text'] = FINAL_PROMPT.text;

for (const k of Object.keys(CATEGORY_LABELS)) {
  out[`aiPrompts.category.${k}`] = CATEGORY_LABELS[k];
}

const lib = PROMPT_LIBRARY_BASE;
const defItem = (lib.default && lib.default[0]) || {};
out['aiPrompts.lib.default.name'] = defItem.name || '';
out['aiPrompts.lib.default.desc'] = defItem.desc || '';
out['aiPrompts.lib.detailed.name'] = lib.detailed[0].name;
out['aiPrompts.lib.detailed.desc'] = lib.detailed[0].desc;
out['aiPrompts.lib.detailed.text'] = lib.detailed[0].text;
out['aiPrompts.lib.concise.name'] = lib.concise[0].name;
out['aiPrompts.lib.concise.desc'] = lib.concise[0].desc;
out['aiPrompts.lib.concise.text'] = lib.concise[0].text;
out['aiPrompts.lib.literal.name'] = lib.literal[0].name;
out['aiPrompts.lib.literal.desc'] = lib.literal[0].desc;
out['aiPrompts.lib.literal.text'] = lib.literal[0].text;
for (let i = 0; i < lib.library.length; i++) {
  const p = `aiPrompts.lib.stack${i}`;
  out[`${p}.name`] = lib.library[i].name;
  out[`${p}.desc`] = lib.library[i].desc;
  out[`${p}.text`] = lib.library[i].text;
}

for (const [id, v] of Object.entries(MODEL_TEST_PROMPT_CATALOG)) {
  out[`aiPrompts.mt.${id}.label`] = v.label;
  out[`aiPrompts.mt.${id}.template`] = v.template;
  if (v.topicLabel != null) {
    out[`aiPrompts.mt.${id}.topicLabel`] = v.topicLabel;
  }
}

const jsonCs = JSON.stringify(out, null, 0);
writeFileSync(join(root, 'i18n', 'prompts.cs.json'), jsonCs + '\n', 'utf8');
writeFileSync(join(root, 'i18n', 'prompts.en.json'), jsonCs + '\n', 'utf8');
console.log('OK:', Object.keys(out).length, 'klíčů → i18n/prompts.cs.json, i18n/prompts.en.json (en zatím = cs, lze přeložit)');
