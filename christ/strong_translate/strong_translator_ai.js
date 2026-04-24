export const GEMINI_ROTATION_EXCLUDED_MODELS = new Set([
  'gemini-2.5-pro',
  'gemini-3.1-pro-preview'
]);

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
