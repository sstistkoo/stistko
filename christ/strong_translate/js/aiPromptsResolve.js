/**
 * Překlady AI promptů z i18n (klíče aiPrompts.*) s fallbackem na strong_prompts / core.
 */
import { t } from './i18n.js';
import core from '../strong_translator_core_new.js';
import prompts from '../strong_prompts.js';

const { FINAL_PROMPT, PROMPT_LIBRARY_BASE } = prompts;

function tp(key, fallback) {
  const v = t(key);
  return v !== key ? v : fallback;
}

export function getResolvedSystemMessage() {
  return tp('aiPrompts.core.system', core.SYSTEM_MESSAGE);
}

export function getResolvedDefaultPrompt() {
  return tp('aiPrompts.core.userDefault', core.DEFAULT_PROMPT);
}

export function getResolvedFinalPrompt() {
  return {
    name: tp('aiPrompts.final.name', FINAL_PROMPT.name),
    desc: tp('aiPrompts.final.desc', FINAL_PROMPT.desc),
    text: tp('aiPrompts.final.text', FINAL_PROMPT.text)
  };
}

export function getResolvedPromptLibraryBase() {
  const base = JSON.parse(JSON.stringify(PROMPT_LIBRARY_BASE));
  const defText = getResolvedDefaultPrompt();
  if (base.default?.[0]) {
    const o = base.default[0];
    o.name = tp('aiPrompts.lib.default.name', o.name);
    o.desc = tp('aiPrompts.lib.default.desc', o.desc);
    o.text = defText;
  }
  if (base.detailed?.[0]) {
    const o = base.detailed[0];
    o.name = tp('aiPrompts.lib.detailed.name', o.name);
    o.desc = tp('aiPrompts.lib.detailed.desc', o.desc);
    o.text = tp('aiPrompts.lib.detailed.text', o.text);
  }
  if (base.concise?.[0]) {
    const o = base.concise[0];
    o.name = tp('aiPrompts.lib.concise.name', o.name);
    o.desc = tp('aiPrompts.lib.concise.desc', o.desc);
    o.text = tp('aiPrompts.lib.concise.text', o.text);
  }
  if (base.literal?.[0]) {
    const o = base.literal[0];
    o.name = tp('aiPrompts.lib.literal.name', o.name);
    o.desc = tp('aiPrompts.lib.literal.desc', o.desc);
    o.text = tp('aiPrompts.lib.literal.text', o.text);
  }
  if (Array.isArray(base.library)) {
    for (let i = 0; i < base.library.length; i++) {
      const p = `aiPrompts.lib.stack${i}`;
      const o = base.library[i];
      o.name = tp(`${p}.name`, o.name);
      o.desc = tp(`${p}.desc`, o.desc);
      o.text = tp(`${p}.text`, o.text);
    }
  }
  return base;
}

export function getResolvedModelTestCatalog(fallbackCat) {
  const out = {};
  for (const [id, v] of Object.entries(fallbackCat || {})) {
    const label = tp(`aiPrompts.mt.${id}.label`, v.label);
    const template = tp(`aiPrompts.mt.${id}.template`, v.template);
    const entry = { label, template };
    if (v.topicLabel != null) {
      entry.topicLabel = tp(`aiPrompts.mt.${id}.topicLabel`, v.topicLabel);
    }
    out[id] = entry;
  }
  return out;
}
