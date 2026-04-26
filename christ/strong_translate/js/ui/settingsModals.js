import { t, getUiLang, getDefaultContentTag, CONTENT_TAG_LANG_KEY } from '../i18n.js';

export function createSettingsModalsApi({ initRunSelects, updateSetupCompactSummary, initPipelineModelSelectors, initPipelineModelSelectorsInSettingsModal, showToast, refreshTopicLabels, renderList, saveProgress, refreshLanguageAwarePromptOptionLabels, applySystemPromptForCurrentTask, applyUiLanguage, DEFAULT_UI_LANG, UI_LANGS, UI_LANG_KEY, setPipelineModelForProvider, setPipelineSecondaryEnabled, syncSecondaryProviderToggles, updateAutoProviderCountdowns }) {

function showSettingsModal() {
  initPipelineModelSelectorsInSettingsModal();
  document.getElementById('batchSizeRunMobile').value = document.getElementById('batchSize').value;
  document.getElementById('intervalRunMobile').value = document.getElementById('interval').value;
  document.getElementById('settingsModal').classList.add('show');
}

function closeSettingsModal() {
  const mainGroq = document.getElementById('providerRunMainGroqModel')?.value || '';
  const secGemini = document.getElementById('providerRunSecondaryGeminiModel')?.value || '';
  const secOpenRouter = document.getElementById('providerRunSecondaryOpenrouterModel')?.value || '';
  const secGeminiEnabled = !!document.getElementById('providerRunEnableSecondaryGemini')?.checked;
  const secOpenRouterEnabled = !!document.getElementById('providerRunEnableSecondaryOpenrouter')?.checked;
  if (mainGroq) setPipelineModelForProvider('groq', mainGroq);
  if (secGemini) setPipelineModelForProvider('gemini', secGemini);
  if (secOpenRouter) setPipelineModelForProvider('openrouter', secOpenRouter);
  setPipelineSecondaryEnabled('gemini', secGeminiEnabled);
  setPipelineSecondaryEnabled('openrouter', secOpenRouterEnabled);
  syncSecondaryProviderToggles('gemini', secGeminiEnabled);
  syncSecondaryProviderToggles('openrouter', secOpenRouterEnabled);
  updateAutoProviderCountdowns();
  document.getElementById('provider').value = 'groq';
  if (mainGroq) document.getElementById('model').value = mainGroq;
  document.getElementById('batchSize').value = document.getElementById('batchSizeRunMobile').value;
  document.getElementById('interval').value = document.getElementById('intervalRunMobile').value;
  onProviderChange();
  initPipelineModelSelectors();
  initRunSelects();
  updateSetupCompactSummary();
  document.getElementById('settingsModal').classList.remove('show');
}

// â”€â”€ Limits Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function showPromptAIModal() {
  const modal = document.getElementById('promptAIModal');
  ['groq', 'gemini', 'openrouter'].forEach(prov => {
    const savedTemp = localStorage.getItem(`strong_ai_temperature_${prov}`) || localStorage.getItem('strong_ai_temperature') || '0.3';
    const savedMax = localStorage.getItem(`strong_ai_max_tokens_${prov}`) || localStorage.getItem('strong_ai_max_tokens') || '2500';
    const tempEl = document.getElementById(`aiTemperature_${prov}`);
    const maxEl = document.getElementById(`aiMaxTokens_${prov}`);
    if (tempEl) tempEl.value = savedTemp;
    if (maxEl) maxEl.value = savedMax;
  });
  modal.style.display = 'flex';
  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) closePromptAIModal();
  };
}

function closePromptAIModal() {
  document.getElementById('promptAIModal').style.display = 'none';
}

function saveAISettings() {
  ['groq', 'gemini', 'openrouter'].forEach(prov => {
    const temp = document.getElementById(`aiTemperature_${prov}`)?.value || '0.3';
    const max = document.getElementById(`aiMaxTokens_${prov}`)?.value || '2500';
    localStorage.setItem(`strong_ai_temperature_${prov}`, temp);
    localStorage.setItem(`strong_ai_max_tokens_${prov}`, max);
  });
  closePromptAIModal();
  showToast(t('toast.ai.settings.saved'));
}

function showPromptLangModal() {
  const modal = document.getElementById('promptLangModal');
  const savedLang = localStorage.getItem('strong_target_lang') || 'cz';
  const savedSource = localStorage.getItem('strong_source_lang') || 'gr';
  const savedUi = getUiLang();
  document.getElementById('targetLanguage').value = savedLang;
  document.getElementById('sourceLanguage').value = savedSource;
  const uiLanguageEl = document.getElementById('uiLanguage');
  if (uiLanguageEl) uiLanguageEl.value = savedUi;
  const ct = document.getElementById('contentTagLanguage');
  if (ct) {
    const st = String(localStorage.getItem(CONTENT_TAG_LANG_KEY) || '').trim();
    const def = getDefaultContentTag();
    const want = (st && Array.from(ct.options).some(o => o.value === st)) ? st : def;
    if (Array.from(ct.options).some(o => o.value === want)) ct.value = want;
    else if (def && Array.from(ct.options).some(o => o.value === def)) ct.value = def;
  }
  modal.style.display = 'flex';
  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) closePromptLangModal();
  };
}

function closePromptLangModal() {
  document.getElementById('promptLangModal').style.display = 'none';
}

function updatePromptLangButtonLabel() {
  const btn = document.getElementById('btnPromptLang');
  if (!btn) return;
  const ui = getUiLang();
  let target = String(localStorage.getItem('strong_target_lang') || 'cz').toLowerCase();
  if (target === 'cs') target = 'cz';
  btn.title = t('lang.btn.title');
  btn.textContent = t('lang.btn.label', { ui, ai: target });
}

function saveLangSettings() {
  const target = document.getElementById('targetLanguage').value;
  const source = document.getElementById('sourceLanguage').value;
  const uiRaw = String(document.getElementById('uiLanguage')?.value || DEFAULT_UI_LANG).toLowerCase();
  const ui = UI_LANGS.has(uiRaw) ? uiRaw : DEFAULT_UI_LANG;
  localStorage.setItem('strong_target_lang', target);
  localStorage.setItem('strong_source_lang', source);
  localStorage.setItem(UI_LANG_KEY, ui);
  const contentTag = String(document.getElementById('contentTagLanguage')?.value || '').trim();
  if (contentTag) localStorage.setItem(CONTENT_TAG_LANG_KEY, contentTag);
  else localStorage.removeItem(CONTENT_TAG_LANG_KEY);
  refreshLanguageAwarePromptOptionLabels();
  applySystemPromptForCurrentTask();
  applyUiLanguage();
  updatePromptLangButtonLabel();
  closePromptLangModal();
  showToast(t('toast.lang.settings.saved'));
}

  return { showSettingsModal, closeSettingsModal, showPromptAIModal, closePromptAIModal, saveAISettings, showPromptLangModal, closePromptLangModal, updatePromptLangButtonLabel, saveLangSettings };
}
