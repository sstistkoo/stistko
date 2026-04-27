const SYSTEM_MESSAGE = `You are a biblical lexicon translation assistant.`;

const DEFAULT_PROMPT = `Translate entries from {SOURCE_LANG} to {TARGET_LANG} and return parser-safe blocks.\n\n###Gx###\nVYZNAM: ...\nDEFINICE: ...\nPOUZITI: ...\nPUVOD: ...\nKJV: ...\nSPECIALISTA: ...\n\nHESLA:\n{HESLA}`;

const CATEGORY_LABELS = {
  default: 'Default',
  detailed: 'Detailed',
  concise: 'Concise',
  literal: 'Literal',
  test: 'Test',
  custom: 'Custom',
  library: 'Library',
  final: 'Final'
};

const FINAL_PROMPT = {
  name: 'Final',
  desc: 'Complete translation with all fields',
  text: DEFAULT_PROMPT
};

const PROMPT_LIBRARY_BASE = {
  default: [{ name: 'System', desc: 'System default prompt', text: DEFAULT_PROMPT }],
  detailed: [{ name: 'Detailed', desc: 'Detailed translation', text: DEFAULT_PROMPT }],
  concise: [{ name: 'Concise', desc: 'Short translation', text: DEFAULT_PROMPT }],
  literal: [{ name: 'Literal', desc: 'Literal translation', text: DEFAULT_PROMPT }],
  test: [],
  custom: [],
  library: [
    { name: 'Precision', desc: 'High fidelity', text: DEFAULT_PROMPT },
    { name: 'Theological', desc: 'Context emphasis', text: DEFAULT_PROMPT },
    { name: 'Fast', desc: 'Short and fast', text: DEFAULT_PROMPT }
  ]
};

const MODEL_TEST_PROMPT_CATALOG = {
  preset_v1: { label: 'Fallback preset_v1', template: DEFAULT_PROMPT },
  preset_v2: { label: 'Fallback preset_v2', template: DEFAULT_PROMPT },
  preset_v3: { label: 'Fallback preset_v3', template: DEFAULT_PROMPT },
  preset_v4: { label: 'Fallback preset_v4', template: DEFAULT_PROMPT },
  preset_v5: { label: 'Fallback preset_v5', template: DEFAULT_PROMPT },
  preset_v6: { label: 'Fallback preset_v6', template: DEFAULT_PROMPT },
  preset_v7: { label: 'Fallback preset_v7', template: DEFAULT_PROMPT },
  preset_v8: { label: 'Fallback preset_v8', template: DEFAULT_PROMPT },
  preset_v9: { label: 'Fallback preset_v9', template: DEFAULT_PROMPT },
  preset_v10: { label: 'Fallback preset_v10', template: DEFAULT_PROMPT },
  preset_v11: { label: 'Fallback preset_v11', template: DEFAULT_PROMPT },
  preset_v12: { label: 'Fallback preset_v12', template: DEFAULT_PROMPT },
  preset_v13: { label: 'Fallback preset_v13', template: DEFAULT_PROMPT },
  preset_v14: { label: 'Fallback preset_v14', template: DEFAULT_PROMPT },
  preset_v15: { label: 'Fallback preset_v15', template: DEFAULT_PROMPT },
  preset_topic_definice: { label: 'Fallback preset_topic_definice', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_vyznam: { label: 'Fallback preset_topic_vyznam', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_kjv: { label: 'Fallback preset_topic_kjv', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_pouziti: { label: 'Fallback preset_topic_pouziti', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_puvod: { label: 'Fallback preset_topic_puvod', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_specialista: { label: 'Fallback preset_topic_specialista', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_definice_batch: { label: 'Fallback preset_topic_definice_batch', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_vyznam_batch: { label: 'Fallback preset_topic_vyznam_batch', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_kjv_batch: { label: 'Fallback preset_topic_kjv_batch', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_pouziti_batch: { label: 'Fallback preset_topic_pouziti_batch', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_puvod_batch: { label: 'Fallback preset_topic_puvod_batch', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_specialista_batch: { label: 'Fallback preset_topic_specialista_batch', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_vyznam_en: { label: 'Fallback preset_topic_vyznam_en', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_definice_en: { label: 'Fallback preset_topic_definice_en', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_kjv_en: { label: 'Fallback preset_topic_kjv_en', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_pouziti_en: { label: 'Fallback preset_topic_pouziti_en', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_puvod_en: { label: 'Fallback preset_topic_puvod_en', template: DEFAULT_PROMPT, topicLabel: 'Topic' },
  preset_topic_specialista_en: { label: 'Fallback preset_topic_specialista_en', template: DEFAULT_PROMPT, topicLabel: 'Topic' }
};

const strongPrompts = {
  SYSTEM_MESSAGE,
  DEFAULT_PROMPT,
  CATEGORY_LABELS,
  FINAL_PROMPT,
  PROMPT_LIBRARY_BASE,
  MODEL_TEST_PROMPT_CATALOG
};

export {
  SYSTEM_MESSAGE,
  DEFAULT_PROMPT,
  CATEGORY_LABELS,
  FINAL_PROMPT,
  PROMPT_LIBRARY_BASE,
  MODEL_TEST_PROMPT_CATALOG
};

export default strongPrompts;
