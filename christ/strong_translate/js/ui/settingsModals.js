import { t, getUiLang, getDefaultContentTag, CONTENT_TAG_LANG_KEY, CONTENT_TAG_LANG_MANUAL_KEY } from '../i18n.js';

export function createSettingsModalsApi({ initRunSelects, updateSetupCompactSummary, initPipelineModelSelectors, initPipelineModelSelectorsInSettingsModal, showToast, refreshTopicLabels, renderList, saveProgress, refreshLanguageAwarePromptOptionLabels, applySystemPromptForCurrentTask, applyUiLanguage, DEFAULT_UI_LANG, UI_LANGS, UI_LANG_KEY, setPipelineModelForProvider, setPipelineSecondaryEnabled, syncSecondaryProviderToggles, updateAutoProviderCountdowns }) {

const UI_LANGUAGE_CATALOG = [
  { code: 'cs', fileCode: 'cs', labelCode: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'en', fileCode: 'en', labelCode: 'en', name: 'Angličtina', flag: '🇬🇧' },
  { code: 'sk', fileCode: 'sk', labelCode: 'sk', name: 'Slovenština', flag: '🇸🇰' },
  { code: 'pl', fileCode: 'pl', labelCode: 'pl', name: 'Polština', flag: '🇵🇱' },
  { code: 'de', fileCode: 'de', labelCode: 'de', name: 'Němčina', flag: '🇩🇪' },
  { code: 'fr', fileCode: 'fr', labelCode: 'fr', name: 'Francouzština', flag: '🇫🇷' },
  { code: 'es', fileCode: 'es', labelCode: 'es', name: 'Španělština', flag: '🇪🇸' },
  { code: 'it', fileCode: 'it', labelCode: 'it', name: 'Italština', flag: '🇮🇹' },
  { code: 'pt', fileCode: 'pt', labelCode: 'pt', name: 'Portugalština', flag: '🇵🇹' },
  { code: 'ru', fileCode: 'ru', labelCode: 'ru', name: 'Ruština', flag: '🇷🇺' },
  { code: 'uk', fileCode: 'uk', labelCode: 'uk', name: 'Ukrajinština', flag: '🇺🇦' },
  { code: 'bg', fileCode: 'bg', labelCode: 'bg', name: 'Bulharština', flag: '🇧🇬' },
  { code: 'ro', fileCode: 'ro', labelCode: 'ro', name: 'Rumunština', flag: '🇷🇴' },
  { code: 'hu', fileCode: 'hu', labelCode: 'hu', name: 'Maďarština', flag: '🇭🇺' },
  { code: 'nl', fileCode: 'nl', labelCode: 'nl', name: 'Holandština', flag: '🇳🇱' },
  { code: 'sv', fileCode: 'sv', labelCode: 'sv', name: 'Švédština', flag: '🇸🇪' },
  { code: 'da', fileCode: 'da', labelCode: 'da', name: 'Dánština', flag: '🇩🇰' },
  { code: 'no', fileCode: 'no', labelCode: 'no', name: 'Norština', flag: '🇳🇴' },
  { code: 'fi', fileCode: 'fi', labelCode: 'fi', name: 'Finština', flag: '🇫🇮' },
  { code: 'el', fileCode: 'el', labelCode: 'el', name: 'Řečtina', flag: '🇬🇷' },
  { code: 'tr', fileCode: 'tr', labelCode: 'tr', name: 'Turečtina', flag: '🇹🇷' },
  { code: 'ar', fileCode: 'ar', labelCode: 'ar', name: 'Arabština', flag: '🇸🇦' },
  { code: 'zh-cn', fileCode: 'zh-CN', labelCode: 'zh-CN', name: 'Čínština', flag: '🇨🇳' },
  { code: 'ja', fileCode: 'ja', labelCode: 'ja', name: 'Japonština', flag: '🇯🇵' },
  { code: 'ko', fileCode: 'ko', labelCode: 'ko', name: 'Korejština', flag: '🇰🇷' },
  { code: 'he', fileCode: 'he', labelCode: 'he', name: 'Hebrejština', flag: '🇮🇱' }
];

let uiLangAvailabilityCache = null;
const I18N_TOOL_PREFILL_LANG_KEY = 'strong_i18n_tool_prefill_lang';

function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn('[settingsModals] localStorage setItem failed:', key, err);
    return false;
  }
}

function safeRemoveLocalStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('[settingsModals] localStorage removeItem failed:', key, err);
  }
}

async function listI18nJsonFilesFromDirectory() {
  try {
    const res = await fetch('./i18n/', { cache: 'no-store' });
    if (!res.ok) return null;
    const html = await res.text();
    const fileSet = new Set();
    const re = /href=["']([^"']+\.json)["']/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const href = String(m[1] || '');
      const filename = href.split('/').pop();
      if (!filename) continue;
      fileSet.add(decodeURIComponent(filename).toLowerCase());
    }
    return fileSet;
  } catch {
    return null;
  }
}

async function detectUiLangAvailability() {
  if (uiLangAvailabilityCache) return uiLangAvailabilityCache;
  const directoryFiles = await listI18nJsonFilesFromDirectory();
  let checks = [];
  if (directoryFiles && directoryFiles.size) {
    checks = UI_LANGUAGE_CATALOG.map((lang) => ({
      ...lang,
      available: directoryFiles.has(`${String(lang.fileCode).toLowerCase()}.json`)
    }));
  } else {
    // On hosts without directory listing (e.g. GitHub Pages), avoid noisy 404 probing.
    const allowedUi = new Set(Array.from(UI_LANGS).map((code) => String(code || '').toLowerCase()));
    checks = UI_LANGUAGE_CATALOG.map((lang) => ({
      ...lang,
      available: allowedUi.has(String(lang.code || '').toLowerCase())
    }));
  }
  uiLangAvailabilityCache = checks;
  return checks;
}

function createUiLangOption(lang) {
  const option = document.createElement('option');
  option.value = lang.code;
  option.dataset.dynamicUiLang = '1';
  option.dataset.available = lang.available ? '1' : '0';
  option.dataset.fileCode = lang.fileCode;
  option.textContent = `${lang.flag} ${lang.name} (${lang.labelCode})`;
  return option;
}

function bindUiLanguageSelectBehavior() {
  const select = document.getElementById('uiLanguage');
  if (!select || select.dataset.i18nBind === '1') return;
  select.dataset.i18nBind = '1';
  select.addEventListener('change', () => {
    const opt = select.options[select.selectedIndex];
    if (!opt) return;
    if (String(opt.dataset.available || '') === '1') return;
    const fileCode = String(opt.dataset.fileCode || '').trim();
    if (!fileCode) return;
    safeSetLocalStorage(I18N_TOOL_PREFILL_LANG_KEY, fileCode);
    closePromptLangModal();
    if (typeof window.showI18nToolModal === 'function') {
      window.showI18nToolModal();
      showToast(t('toast.i18nTool.jsonMissingOpened', { file: `${fileCode}.json` }));
    }
  });
}

async function populateUiLanguageSelect() {
  const select = document.getElementById('uiLanguage');
  if (!select) return;
  const current = String(localStorage.getItem(UI_LANG_KEY) || DEFAULT_UI_LANG).toLowerCase();
  const checked = await detectUiLangAvailability();
  const available = checked.filter((x) => x.available);
  const missing = checked.filter((x) => !x.available);

  available.forEach((lang) => UI_LANGS.add(lang.code));

  const fragment = document.createDocumentFragment();
  available.forEach((lang) => fragment.appendChild(createUiLangOption(lang)));
  if (available.length && missing.length) {
    const separator = document.createElement('option');
    separator.disabled = true;
    separator.textContent = t('uiLanguage.separator');
    fragment.appendChild(separator);
  }
  missing.forEach((lang) => fragment.appendChild(createUiLangOption(lang)));

  select.innerHTML = '';
  select.appendChild(fragment);
  bindUiLanguageSelectBehavior();
  const canKeepCurrent = Array.from(select.options).some((opt) => opt.value === current);
  if (canKeepCurrent) select.value = current;
  else if (available.length) select.value = available[0].code;
  else select.value = DEFAULT_UI_LANG;
}

function getDefaultContentTagForTarget(targetRaw) {
  let target = String(targetRaw || 'cz').toLowerCase();
  if (target === 'cs') target = 'cz';
  const map = {
    cz: 'CZ',
    en: 'EN',
    sk: 'SK',
    pl: 'PL',
    bg: 'BG',
    ch: 'zh-CN',
    sp: 'ES',
    gr: 'EL',
    he: 'HE'
  };
  return map[target] || 'EN';
}

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
    safeSetLocalStorage(`strong_ai_temperature_${prov}`, temp);
    safeSetLocalStorage(`strong_ai_max_tokens_${prov}`, max);
  });
  closePromptAIModal();
  showToast(t('toast.ai.settings.saved'));
}

async function showPromptLangModal() {
  const modal = document.getElementById('promptLangModal');
  const savedLang = localStorage.getItem('strong_target_lang') || 'cz';
  const savedSource = localStorage.getItem('strong_source_lang') || 'gr';
  await populateUiLanguageSelect();
  const savedUi = String(localStorage.getItem(UI_LANG_KEY) || getUiLang()).toLowerCase();
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
  const prevTarget = String(localStorage.getItem('strong_target_lang') || 'cz').toLowerCase();
  const target = document.getElementById('targetLanguage').value;
  const source = document.getElementById('sourceLanguage').value;
  const uiRaw = String(document.getElementById('uiLanguage')?.value || DEFAULT_UI_LANG).toLowerCase();
  const ui = UI_LANGS.has(uiRaw) ? uiRaw : DEFAULT_UI_LANG;
  safeSetLocalStorage('strong_target_lang', target);
  safeSetLocalStorage('strong_source_lang', source);
  safeSetLocalStorage(UI_LANG_KEY, ui);
  const contentTag = String(document.getElementById('contentTagLanguage')?.value || '').trim();
  const prevDefaultTag = getDefaultContentTagForTarget(prevTarget);
  const newDefaultTag = getDefaultContentTagForTarget(target);
  // Pokud uživatel nechal "výchozí" tag (typicky CZ při cíli cz), přepni ho automaticky s cílem.
  if (!contentTag || contentTag === prevDefaultTag || contentTag === newDefaultTag) {
    safeRemoveLocalStorage(CONTENT_TAG_LANG_KEY);
    safeRemoveLocalStorage(CONTENT_TAG_LANG_MANUAL_KEY);
  } else {
    safeSetLocalStorage(CONTENT_TAG_LANG_KEY, contentTag);
    safeSetLocalStorage(CONTENT_TAG_LANG_MANUAL_KEY, '1');
  }
  refreshLanguageAwarePromptOptionLabels();
  applySystemPromptForCurrentTask();
  applyUiLanguage();
  updatePromptLangButtonLabel();
  closePromptLangModal();
  showToast(t('toast.lang.settings.saved'));
}

  return { showSettingsModal, closeSettingsModal, showPromptAIModal, closePromptAIModal, saveAISettings, showPromptLangModal, closePromptLangModal, updatePromptLangButtonLabel, saveLangSettings };
}
