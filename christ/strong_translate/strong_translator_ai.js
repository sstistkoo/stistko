export const GEMINI_ROTATION_EXCLUDED_MODELS = new Set([
  'gemini-2.5-pro',
  'gemini-3.1-pro-preview'
]);

export const SECONDARY_PROVIDER_MODEL_RANKING = {
  // Pro speciální topic fallback držíme Gemini omezeně (rychlost + stabilita).
  gemini: ['gemini-2.5-flash-lite', 'gemini-2.5-flash'],
  // OpenRouter smoke/auto TOP pořadí.
  openrouter: ['openrouter/free', 'openai/gpt-oss-20b:free', 'nvidia/nemotron-nano-9b-v2:free']
};

export const STATIC_FALLBACK_MODELS = {
  groq: ['meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite']
};

function isGeminiAutoExcludedModel(model) {
  const id = String(model || '').trim().toLowerCase();
  if (!id) return false;
  if (GEMINI_ROTATION_EXCLUDED_MODELS.has(id)) return true;
  return /(?:^|[-_/])pro(?:$|[-_/])/.test(id);
}

export function getProviderConfiguredModelsForAI(provider, providers) {
  const cfg = providers?.[provider];
  if (!cfg || !Array.isArray(cfg.models)) return [];
  return cfg.models
    .map(item => Array.isArray(item) ? String(item[0] || '').trim() : '')
    .filter(model => !(provider === 'gemini' && isGeminiAutoExcludedModel(model)))
    .filter(Boolean);
}

export function buildSecondaryProviderModelCandidates({
  provider,
  providers,
  selectedModel,
  rankedModels,
  maxNonGemini = 4
}) {
  const selected = String(selectedModel || '').trim();
  const ranked = Array.isArray(rankedModels) ? rankedModels : [];
  const configured = provider === 'gemini'
    ? getProviderConfiguredModelsForAI('gemini', providers)
    : [];
  const queue = [...new Set([selected, ...ranked, ...configured].filter(Boolean))]
    .filter(model => !(provider === 'gemini' && isGeminiAutoExcludedModel(model)));
  if (provider === 'gemini') return queue;
  return queue.slice(0, Math.max(1, Number(maxNonGemini) || 4));
}

export function getRankedModelsForSecondary(provider) {
  return Array.isArray(SECONDARY_PROVIDER_MODEL_RANKING?.[provider])
    ? [...SECONDARY_PROVIDER_MODEL_RANKING[provider]]
    : [];
}

export function getStaticFallbackModels(provider, providers) {
  if (provider === 'gemini') {
    const configured = getProviderConfiguredModelsForAI('gemini', providers);
    if (configured.length) return [...new Set(configured)];
  }
  return Array.isArray(STATIC_FALLBACK_MODELS?.[provider]) ? [...STATIC_FALLBACK_MODELS[provider]] : [];
}
