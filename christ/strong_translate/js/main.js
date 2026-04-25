  // ══ CORE MODULE IMPORT ═══════════════════════════════════════════
  import core from '../strong_translator_core_new.js';
  import prompts from '../strong_prompts.js';
  import {
    getProviderConfiguredModelsForAI,
    buildSecondaryProviderModelCandidates,
    getRankedModelsForSecondary,
    getStaticFallbackModels
  } from '../strong_translator_ai.js';
  import { state } from './state.js';
  import {
    CONFIG,
    ITEM_HEIGHT,
    BUFFER_ITEMS,
    PROVIDERS,
    GEMINI_SYSTEM_MODEL,
    LEGACY_STORE_KEY,
    AUTO_PROVIDER_ENABLED_KEY,
    AUTO_TOKEN_LIMIT_KEY,
    TEST_HISTORY_KEY,
    MODEL_TEST_OUTPUT_KEY,
    MODEL_TEST_STATS_KEY,
    MODEL_TEST_PROMPT_TYPE_KEY,
    MODEL_TEST_PROMPT_COMPARE_TYPE_KEY,
    MODEL_TEST_PROMPT_COMPARE_ENABLE_KEY,
    MODEL_TEST_CUSTOM_PROMPT_KEY,
    MODEL_TEST_ENABLE_PROMPT_KEY,
    MODEL_TEST_RAW_OUTPUT_KEY,
    MODEL_TEST_MODEL_STORAGE_KEY,
    MODEL_TEST_PINNED_MODELS,
    API_KEY_PROFILES_PREFIX,
    API_KEY_ACTIVE_PROFILE_PREFIX
  } from './config.js';
  import { computeFileId, storeKey, backupKey, undoKey } from './storage.js';
  import {
    UI_LANG_KEY,
    DEFAULT_UI_LANG,
    UI_LANGS,
    loadUiMessages,
    getUiLang,
    t,
    uiLabel,
    refreshStaticProviderSelectLabel
  } from './i18n.js';
  import { sleepMs, sleep, debounce, formatAiResponseTime, escHtml } from './utils.js';
  import { extractOpenRouterText } from './ai/client.js';
  import { isSideFallbackAborted, sleepMsWithAbort, runProviderFallbackTaskSequential } from './ai/fallback.js';
  import { startResize, doResize, stopResize } from './ui/resize.js';
  // Re-export for use in this module
const {
      parseTXT: parseTXTCore,
      parseTranslations: parseTranslationsCore,
      buildPromptMessages: buildPromptMessagesCore,
      buildRetryMessages: buildRetryMessagesCore,
      escHtml: escHtmlCore,
      validateAPIResponse,
      SYSTEM_MESSAGE,
      DEFAULT_PROMPT
    } = core;
const {
      CATEGORY_LABELS,
      FINAL_PROMPT,
      PROMPT_LIBRARY_BASE,
      MODEL_TEST_PROMPT_CATALOG: modelTestPromptCatalog
    } = prompts;

  function applyUiLanguage() {
    refreshTopicLabels();
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    const setAttr = (id, attr, value) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute(attr, value);
    };
    setText('setupTitle', t('setup.title'));
    const providerForLabel = String(document.getElementById('provider')?.value || 'groq');
    setText('keyLabel', t('api.key.label', { provider: PROVIDERS[providerForLabel]?.label || 'Groq' }));
    setText('startBtn', t('setup.start'));
    setText('btnHelp', t('setup.help'));
    setText('btnLimits', t('setup.limits'));
    setText('batchSizeLabel', t('setup.batchSize'));
    setText('intervalLabel', t('setup.interval'));
    setText('pipelineGroupLabel', t('pipeline.group'));
    setText('pipelineMainLabel', t('pipeline.main'));
    setText('pipelineSecondaryGeminiLabel', t('pipeline.secondaryGemini'));
    setText('pipelineSecondaryOpenrouterLabel', t('pipeline.secondaryOpenrouter'));
    setText('pipelineEnableSecondaryGeminiText', t('pipeline.enableFixes'));
    setText('pipelineEnableSecondaryOpenrouterText', t('pipeline.enableFixes'));
    setText('fileLabel', t('setup.file'));
    setText('btnChooseFile', t('setup.chooseFile'));
    setText('btnLoadDefault', t('setup.loadAuto'));
    setAttr('provider', 'aria-label', t('setup.provider.aria'));
    setAttr('apiKey', 'aria-label', t('setup.apiKey.input.aria'));
    setAttr('apiKeyProfile', 'aria-label', t('setup.apiKey.profile.aria'));
    setAttr('model', 'aria-label', t('setup.model.aria'));
    setAttr('batchSize', 'aria-label', t('setup.batchSize.aria'));
    setAttr('fileTXT', 'aria-label', t('setup.file.input.aria'));
    setAttr('pipelineModelMainGroq', 'aria-label', t('pipeline.mainGroq.aria'));
    setAttr('pipelineModelMainGroq', 'title', t('pipeline.mainGroq.aria'));
    setAttr('pipelineModelSecondaryGemini', 'aria-label', t('pipeline.secondaryGemini.aria'));
    setAttr('pipelineModelSecondaryGemini', 'title', t('pipeline.secondaryGemini.aria'));
    setAttr('pipelineModelSecondaryOpenrouter', 'aria-label', t('pipeline.secondaryOpenrouter.aria'));
    setAttr('pipelineModelSecondaryOpenrouter', 'title', t('pipeline.secondaryOpenrouter.aria'));
    setAttr('pipelineEnableSecondaryGemini', 'aria-label', t('pipeline.enableGemini.aria'));
    setAttr('pipelineEnableSecondaryOpenrouter', 'aria-label', t('pipeline.enableOpenrouter.aria'));
    setAttr('providerRunMainGroqModel', 'aria-label', t('pipeline.mainGroq.aria'));
    setAttr('providerRunMainGroqModel', 'title', t('pipeline.mainGroq.aria'));
    setAttr('providerRunSecondaryGeminiModel', 'aria-label', t('pipeline.secondaryGemini.aria'));
    setAttr('providerRunSecondaryGeminiModel', 'title', t('pipeline.secondaryGemini.aria'));
    setAttr('providerRunSecondaryOpenrouterModel', 'aria-label', t('pipeline.secondaryOpenrouter.aria'));
    setAttr('providerRunSecondaryOpenrouterModel', 'title', t('pipeline.secondaryOpenrouter.aria'));
    setAttr('providerRunEnableSecondaryGemini', 'aria-label', t('pipeline.enableGemini.aria'));
    setAttr('providerRunEnableSecondaryOpenrouter', 'aria-label', t('pipeline.enableOpenrouter.aria'));
    setAttr('autoEnable_groq', 'aria-label', t('auto.enableGroq.aria'));
    setAttr('autoEnable_gemini', 'aria-label', t('auto.enableGemini.aria'));
    setAttr('autoEnable_openrouter', 'aria-label', t('auto.enableOpenrouter.aria'));
    setAttr('logScroll', 'aria-label', t('log.scroll.aria'));
    setText('lblDone', t('stats.done'));
    setText('lblRemain', t('stats.remain'));
    setText('lblTotal', t('stats.total'));
    setText('autoTokenLimitLabel', t('stats.tokenLimit'));
    setText('btnImport', t('hdr.import'));
    setText('btnAuto', t('hdr.auto'));
    setText('btnToggleList', t('hdr.list'));
    setText('btnStep', t('hdr.batch'));
    setText('btnTestModels', t('hdr.testModels'));
    setText('btnExportRange', t('hdr.exportRange'));
    setText('btnAISettingsDesktop', t('hdr.aiSettings'));
    const failedBtn = document.getElementById('btnFailedEntries');
    if (failedBtn) {
      const failedCountEl = document.getElementById('failedCount');
      failedBtn.textContent = `${t('hdr.failed')} `;
      if (failedCountEl) failedBtn.appendChild(failedCountEl);
    }
    const btnRestoreBackup = document.getElementById('btnRestoreBackup');
    if (btnRestoreBackup) btnRestoreBackup.textContent = t('hdr.restoreBackup');
    setAttr('btnImport', 'aria-label', t('hdr.import.aria'));
    setAttr('btnAuto', 'aria-label', t('hdr.auto.aria'));
    setAttr('btnToggleList', 'title', t('hdr.list.title'));
    setAttr('btnToggleList', 'aria-label', t('hdr.list.aria'));
    setAttr('btnStep', 'aria-label', t('hdr.batch.aria'));
    setAttr('btnTestModels', 'title', t('hdr.testModels.title'));
    setAttr('btnTestModels', 'aria-label', t('hdr.testModels.aria'));
    setAttr('btnExportRange', 'title', t('hdr.exportRange.title'));
    setAttr('btnExportRange', 'aria-label', t('hdr.exportRange.aria'));
    setAttr('btnFailedEntries', 'title', t('hdr.failed.title'));
    setAttr('btnFailedEntries', 'aria-label', t('hdr.failed.aria'));
    setAttr('btnAISettingsDesktop', 'title', t('hdr.aiSettings.title'));
    setAttr('btnAISettingsDesktop', 'aria-label', t('hdr.aiSettings.aria'));
    setAttr('mobileMenuBtn', 'aria-label', t('hdr.mobileActions.aria'));
    const resetBtn = document.querySelector('.hbtn.red.hdr-close');
    if (resetBtn) {
      resetBtn.setAttribute('title', t('hdr.reset.title'));
      resetBtn.setAttribute('aria-label', t('hdr.reset.aria'));
    }
    setAttr('btnRestoreBackup', 'title', t('hdr.restoreBackup.title'));
    setAttr('btnRestoreBackup', 'aria-label', t('hdr.restoreBackup.aria'));
    setText('autoInfoPrefix', t('auto.info.prefix'));
    setText('autoInfoSettings', t('auto.info.settings'));
    setText('autoInfoSeconds', t('auto.info.seconds'));
    setText('autoInfoInterval', t('auto.info.interval'));
    setText('btnAutoStop', t('auto.stop'));
    setAttr('btnAutoStop', 'aria-label', t('auto.stop.aria'));
    const autoLog = document.getElementById('autoLog');
    const autoLogText = (autoLog?.textContent || '').trim();
    if (autoLog && (autoLogText === 'Čeká na start...' || autoLogText === 'Waiting to start...')) {
      autoLog.textContent = t('auto.log.waiting');
    }
    refreshLanguageAwarePromptOptionLabels();
    setText('modelTestTitle', t('modelTest.title'));
    setText('modelTestProviderLabel', t('modelTest.providerLabel'));
    setText('modelTestModelGroqLabel', t('modelTest.model.groq'));
    setText('modelTestModelGeminiLabel', t('modelTest.model.gemini'));
    setText('modelTestModelOpenrouterLabel', t('modelTest.model.openrouter'));
    setText('modelTestModeLabel', t('modelTest.modeLabel'));
    setText('modelTestPromptsLabel', t('modelTest.promptsLabel'));
    setText('modelTestEnablePromptCompareText', t('modelTest.comparePrompts'));
    setText('modelTestPromptCompareLabel', t('modelTest.promptB'));
    setText('modelTestEnablePromptText', t('modelTest.enablePrompt'));
    setText('modelTestCustomPromptLabel', t('modelTest.customPromptLabel'));
    setAttr('modelTestCustomPromptInput', 'placeholder', t('modelTest.customPromptPlaceholder'));
    setText('modelTestDurationLabel', t('modelTest.duration'));
    setText('modelTestAppendText', t('modelTest.appendResult'));
    setText('modelStatsThProviderModel', t('modelTest.table.providerModel'));
    setText('modelStatsThSuccess', t('modelTest.table.success'));
    setText('modelStatsThOkFail', t('modelTest.table.okFail'));
    setText('modelStatsThEntries', t('modelTest.table.entries'));
    setText('modelStatsThAvgAi', t('modelTest.table.avgAi'));
    setText('modelStatsThCalls', t('modelTest.table.calls'));
    setText('modelStatsThActions', t('modelTest.table.actions'));
    setText('btnModelTestClearOutput', t('modelTest.clearOutput'));
    setAttr('modelTestOutput', 'placeholder', t('modelTest.outputPlaceholder'));
    setText('btnRunModelTestTop', t('modelTest.runProvider'));
    setText('btnRunModelTest', t('modelTest.runProvider'));
    setText('btnModelTestLibrary', t('modelTest.library'));
    setText('btnModelTestSaveRaw', t('modelTest.saveRaw'));
    setText('btnModelTestLoadTxt', t('modelTest.loadTxt'));
    setText('btnModelTestSaveTxt', t('modelTest.saveTxt'));
    setText('btnModelTestReset', t('modelTest.reset'));
    setText('btnCancelModelTest', t('modelTest.cancel'));
    setText('btnCloseModelTestModal', t('modelTest.close'));
    setText('promptAiModalTitle', t('promptAi.title'));
    setText('promptAiGroqTempLabel', t('promptAi.groq.temp'));
    setText('promptAiGroqMaxLabel', t('promptAi.groq.max'));
    setText('promptAiGeminiTempLabel', t('promptAi.gemini.temp'));
    setText('promptAiGeminiMaxLabel', t('promptAi.gemini.max'));
    setText('promptAiOpenrouterTempLabel', t('promptAi.openrouter.temp'));
    setText('promptAiOpenrouterMaxLabel', t('promptAi.openrouter.max'));
    setText('btnPromptAiClose', t('promptAi.close'));
    setText('btnPromptAiSave', t('promptAi.save'));
    const promptAiTempMap = {
      '0.1': t('promptAi.temp.0.1'),
      '0.3': t('promptAi.temp.0.3'),
      '0.5': t('promptAi.temp.0.5'),
      '0.7': t('promptAi.temp.0.7'),
      '1.0': t('promptAi.temp.1.0')
    };
    ['aiTemperature_groq', 'aiTemperature_gemini', 'aiTemperature_openrouter'].forEach(selectId => {
      const select = document.getElementById(selectId);
      if (!select) return;
      select.querySelectorAll('option').forEach(opt => {
        const txt = promptAiTempMap[String(opt.value || '')];
        if (txt) opt.textContent = txt;
      });
    });
    const modelTestModeEl = document.getElementById('modelTestMode');
    if (modelTestModeEl) {
      const modeTextByValue = {
        smoke: t('modelTest.mode.smoke'),
        translate1: t('modelTest.mode.translate1'),
        translate3: t('modelTest.mode.translate3'),
        'auto-live': t('modelTest.mode.autoLive')
      };
      modelTestModeEl.querySelectorAll('option').forEach(opt => {
        const txt = modeTextByValue[String(opt.value || '')];
        if (txt) opt.textContent = txt;
      });
    }
    setText('modelTestPromptPreviewTitle', t('prompt.preview.title'));
    setText('btnCopyPromptPreview', t('prompt.preview.copy'));
    setText('btnClosePromptPreview', t('prompt.preview.close'));
    setText('promptLibraryTitle', t('prompt.library.title'));
    const promptPreview = document.getElementById('promptPreview');
    const promptPreviewText = (promptPreview?.textContent || '').trim();
    if (promptPreview && (promptPreviewText === 'Vyberte prompt z knihovny pro náhled...' || promptPreviewText === 'Select a prompt from the library for preview...')) {
      promptPreview.textContent = t('prompt.library.preview.empty');
    }
    setAttr('promptLibraryEditor', 'placeholder', t('prompt.library.editor.placeholder'));
    setAttr('btnPromptSystem', 'title', t('prompt.library.system.title'));
    setAttr('btnPromptExportTxt', 'title', t('prompt.library.export.title'));
    setAttr('btnPromptLoadTxt', 'title', t('prompt.library.load.title'));
    setText('btnPromptLoadTxt', t('prompt.library.load'));
    setText('btnPromptLibraryClose', t('prompt.library.close'));
    setText('btnPromptLibrarySaveApply', t('prompt.library.saveApply'));
    setText('btnSaveApiKeyProfile', t('apiKey.saveButton'));
    setAttr('btnSaveApiKeyProfile', 'title', t('apiKey.saveButton.title'));
    setText('btnDeleteApiKeyProfile', t('apiKey.deleteButton'));
    setAttr('btnDeleteApiKeyProfile', 'title', t('apiKey.deleteButton.title'));
    setText('btnPromptLibraryOpen', t('prompt.library.openButton'));
    setAttr('btnPromptLibraryOpen', 'title', t('prompt.library.openButton.title'));
    setAttr('promptStatus', 'title', t('prompt.status.title'));
    setAttr('btnPromptAuto', 'title', t('prompt.auto.title'));
    setAttr('fileIdBadge', 'title', t('file.active.title'));
    const currentLegacyProv = String(document.getElementById('provider')?.value || '').trim();
    if (currentLegacyProv === 'groq' || currentLegacyProv === 'gemini') {
      refreshStaticProviderSelectLabel('model', currentLegacyProv);
    }
    refreshStaticProviderSelectLabel('pipelineModelMainGroq', 'groq');
    refreshStaticProviderSelectLabel('pipelineModelSecondaryGemini', 'gemini');
    refreshStaticProviderSelectLabel('providerRunMainGroqModel', 'groq');
    refreshStaticProviderSelectLabel('providerRunSecondaryGeminiModel', 'gemini');
    refreshStaticProviderSelectLabel('modelTestModel_groq', 'groq');
    refreshStaticProviderSelectLabel('modelTestModel_gemini', 'gemini');
    const promptTabsEl = document.getElementById('promptTabs');
    if (promptTabsEl) {
      const tabKeyMap = {
        default: 'prompt.tab.default',
        detailed: 'prompt.tab.detailed',
        concise: 'prompt.tab.concise',
        literal: 'prompt.tab.literal',
        test: 'prompt.tab.test',
        custom: 'prompt.tab.custom'
      };
      promptTabsEl.querySelectorAll('.prompt-tab').forEach(tab => {
        const cat = String(tab.dataset.category || '');
        const key = tabKeyMap[cat];
        if (key) tab.textContent = t(key);
      });
    }
    setAttr('searchInput', 'placeholder', t('list.search.placeholder'));
    setAttr('searchInput', 'aria-label', t('list.search.aria'));
    setText('btnSelectRange', t('list.selectRange'));
    setAttr('btnSelectRange', 'title', t('list.selectRange.title'));
    setAttr('btnSelectRange', 'aria-label', t('list.selectRange.aria'));
    setAttr('filterStatus', 'aria-label', t('list.filterStatus.aria'));
    setAttr('filterSort', 'aria-label', t('list.filterSort.aria'));
    const intervalLabels = {
      '5': t('setup.interval.option.5'),
      '10': t('setup.interval.option.10'),
      '20': t('setup.interval.option.20'),
      '30': t('setup.interval.option.30')
    };
    const intervalEl = document.getElementById('interval');
    if (intervalEl) {
      intervalEl.querySelectorAll('option').forEach(opt => {
        const txt = intervalLabels[String(opt.value || '')];
        if (txt) opt.textContent = txt;
      });
    }
    const filterStatusLabels = {
      all: t('list.filterStatus.all'),
      pending: t('list.filterStatus.pending'),
      missing_topic: t('list.filterStatus.missing_topic'),
      failed: t('list.filterStatus.failed'),
      done: t('list.filterStatus.done'),
      g_all: t('list.filterStatus.g_all'),
      h_all: t('list.filterStatus.h_all'),
      g_pending: t('list.filterStatus.g_pending'),
      h_pending: t('list.filterStatus.h_pending'),
      g_done: t('list.filterStatus.g_done'),
      h_done: t('list.filterStatus.h_done')
    };
    const filterStatusEl = document.getElementById('filterStatus');
    if (filterStatusEl) {
      for (const option of filterStatusEl.options) {
        if (Object.prototype.hasOwnProperty.call(filterStatusLabels, option.value)) {
          option.textContent = filterStatusLabels[option.value];
        }
      }
    }
    const filterSortLabels = {
      original: t('list.filterSort.original'),
      num: t('list.filterSort.num'),
      greek: t('list.filterSort.greek')
    };
    const filterSortEl = document.getElementById('filterSort');
    if (filterSortEl) {
      for (const option of filterSortEl.options) {
        if (Object.prototype.hasOwnProperty.call(filterSortLabels, option.value)) {
          option.textContent = filterSortLabels[option.value];
        }
      }
    }
    setText('btnMissingTopicFilter', t('list.topicFilter'));
    setAttr('btnMissingTopicFilter', 'title', t('list.topicFilter.title'));
    setAttr('btnMissingTopicFilter', 'aria-label', t('list.topicFilter.aria'));
    setAttr('btnSelectAllSmall', 'title', t('list.selectAll.title'));
    setAttr('btnSelectAllSmall', 'aria-label', t('list.selectAll.aria'));
    setAttr('btnSelectNoneSmall', 'title', t('list.selectNone.title'));
    setAttr('btnSelectNoneSmall', 'aria-label', t('list.selectNone.aria'));
    setText('btnSelectAllVisible', t('list.selectAllVisible'));
    setAttr('btnSelectAllVisible', 'aria-label', t('list.selectAllVisible.aria'));
    setText('btnTranslateSelected', t('list.translateSelected'));
    setAttr('btnTranslateSelected', 'aria-label', t('list.translateSelected.aria'));
    setText('btnBackToSetup', t('log.back'));
    setAttr('btnBackToSetup', 'aria-label', t('log.back.aria'));
    setText('btnClearLog', t('log.clear'));
    setAttr('btnClearLog', 'aria-label', t('log.clear.aria'));
    const logPlaceholder = document.getElementById('logPlaceholder');
    if (logPlaceholder) logPlaceholder.textContent = t('log.placeholder');
    setText('detailEmptyText', t('detail.empty'));
    setText('modalTitle', t('customModal.title'));
    setAttr('modalFrom', 'placeholder', t('customModal.from'));
    setAttr('modalTo', 'placeholder', t('customModal.to'));
    setText('btnCustomModalCancel', t('customModal.cancel'));
    setText('btnCustomModalOk', t('customModal.ok'));
    setText('mobileActionsTitle', t('mobile.actions.title'));
    setText('btnMobileImport', t('mobile.import'));
    setAttr('btnMobileImport', 'aria-label', t('mobile.import.aria'));
    setText('btnMobileBatch', t('mobile.batch'));
    setAttr('btnMobileBatch', 'aria-label', t('mobile.batch.aria'));
    setText('btnMobileSelectRange', t('mobile.selectRange'));
    setAttr('btnMobileSelectRange', 'aria-label', t('mobile.selectRange.aria'));
    setText('btnMobileMissingTopic', t('mobile.missingTopic'));
    setAttr('btnMobileMissingTopic', 'aria-label', t('mobile.missingTopic.aria'));
    setText('btnMobileExportTxt', t('mobile.exportTxt'));
    setAttr('btnMobileExportTxt', 'aria-label', t('mobile.exportTxt.aria'));
    setText('btnMobileExportJson', t('mobile.exportJson'));
    setAttr('btnMobileExportJson', 'aria-label', t('mobile.exportJson.aria'));
    setText('btnMobileExportRange', t('mobile.exportRange'));
    setAttr('btnMobileExportRange', 'aria-label', t('mobile.exportRange.aria'));
    setText('btnMobileAiSettings', t('mobile.aiSettings'));
    setAttr('btnMobileAiSettings', 'aria-label', t('mobile.aiSettings.aria'));
    setText('btnMobileClose', t('mobile.close'));
    setAttr('btnMobileClose', 'aria-label', t('mobile.close.aria'));
    setText('settingsModalTitle', t('settings.title'));
    setText('settingsMainModelLabel', t('settings.mainModel'));
    setText('settingsSecondaryGeminiLabel', t('settings.secondaryGemini'));
    setText('settingsSecondaryGeminiToggleText', t('settings.enableFixes'));
    setText('settingsSecondaryOpenrouterLabel', t('settings.secondaryOpenrouter'));
    setText('settingsSecondaryOpenrouterToggleText', t('settings.enableFixes'));
    setText('settingsBatchLabel', t('settings.batch'));
    setText('settingsSpeedLabel', t('settings.speed'));
    setText('btnSettingsSave', t('settings.save'));
    setAttr('btnSettingsSave', 'aria-label', t('settings.save.aria'));
    setText('btnSettingsClose', t('settings.close'));
    setAttr('btnSettingsClose', 'aria-label', t('settings.close.aria'));
    setText('limitsTitle', t('limits.title'));
    setText('limitsLoadingText', t('limits.loading'));
    setText('btnLimitsClose', t('limits.close'));
    setText('helpTitle', t('help.title'));
    setText('helpSectionAboutTitle', t('help.about'));
    setText('helpSectionKeysTitle', t('help.keys'));
    setText('helpSectionLibraryTitle', t('help.library'));
    setText('helpSectionLimitsTitle', t('help.limits'));
    setText('btnHelpClose', t('help.close'));
    setAttr('autoTokenLimit', 'placeholder', t('stats.tokenLimit.placeholder'));
    setAttr('autoTokenLimit', 'title', t('stats.tokenLimit.title'));
    setText('promptLangModalTitle', t('lang.modal.title'));
    setText('uiLanguageLabel', t('lang.modal.ui'));
    setText('targetLanguageLabel', t('lang.modal.target'));
    setText('sourceLanguageLabel', t('lang.modal.source'));
    const uiLanguageEl = document.getElementById('uiLanguage');
    if (uiLanguageEl) {
      const uiLangByValue = { cs: t('lang.option.cs'), en: t('lang.option.en') };
      uiLanguageEl.querySelectorAll('option').forEach(opt => {
        const text = uiLangByValue[String(opt.value || '')];
        if (text) opt.textContent = text;
      });
    }
    const targetLanguageEl = document.getElementById('targetLanguage');
    if (targetLanguageEl) {
      const targetLangByValue = {
        cz: t('lang.option.cs'),
        en: t('lang.option.en'),
        bg: t('lang.option.bg'),
        ch: t('lang.option.ch'),
        sp: t('lang.option.sp'),
        sk: t('lang.option.sk'),
        pl: t('lang.option.pl'),
        gr: t('lang.option.gr'),
        he: t('lang.option.he')
      };
      targetLanguageEl.querySelectorAll('option').forEach(opt => {
        const text = targetLangByValue[String(opt.value || '')];
        if (text) opt.textContent = text;
      });
    }
    const sourceLanguageEl = document.getElementById('sourceLanguage');
    if (sourceLanguageEl) {
      const sourceLangByValue = {
        gr: t('lang.source.gr'),
        he: t('lang.source.he'),
        both: t('lang.source.both')
      };
      sourceLanguageEl.querySelectorAll('option').forEach(opt => {
        const text = sourceLangByValue[String(opt.value || '')];
        if (text) opt.textContent = text;
      });
    }
    setText('btnPromptLangClose', t('lang.modal.close'));
    setText('btnPromptLangSave', t('lang.modal.save'));
    const status = document.getElementById('statusTXT');
    const rawStatus = String(status?.textContent || '').trim();
    if (status && !status.classList.contains('ok') && (rawStatus === '— nevybráno' || rawStatus === '— none selected')) {
      status.textContent = t('setup.file.none');
    }
    refreshTokenStatsDisplay();
    updatePromptLangButtonLabel();
  }
    
   // Use core functions, but override buildPromptMessages to support custom prompts
   // buildPromptMessagesCore is already destructured above
   const buildRetryMessages = buildRetryMessagesCore;
   
  function enforceSpecialistaFormat(promptText) {
    if (!isPromptAutoModeEnabled()) return String(promptText || '');
    const text = String(promptText || '');
    const hasSpecialista = /SPECIALISTA|VYKLAD|EXEGEZE|COMMENTARY/i.test(text);
    if (hasSpecialista) return text;
    return `${text}

POVINNÝ VÝSTUP NAVÍC:
- Přidej řádek SPECIALISTA: [detailní odstavec 3-5 vět jako biblický specialista].
- Odstavec má vysvětlit teologický a biblický význam slova v kontextu.
- Nepiš body ani seznam, jen souvislý odstavec.`;
  }

  // Custom buildPromptMessages that reads from localStorage
    function buildPromptMessages(batch) {
      const items = batch.map(e => {
        const def = e.definice || e.def || '';
        return `${e.key} | ${e.greek}\nDEF: ${def}`;
      }).join('\n\n');
      
      const userPromptTemplate = localStorage.getItem('strong_prompt') || core.DEFAULT_PROMPT;
      
      // Language substitution
      const targetLang = localStorage.getItem('strong_target_lang') || 'cz';
      const sourceLang = localStorage.getItem('strong_source_lang') || 'gr';
      const langNames = {
        cz: 'češtiny',
        en: 'angličtiny',
        bg: 'bulharštiny',
        ch: 'čínštiny',
        sp: 'španělštiny',
        sk: 'slovenštiny',
        pl: 'polštiny',
        gr: 'řečtiny',
        he: 'hebrejštiny',
        both: 'řečtiny i hebrejštiny'
      };
      const targetName = langNames[targetLang] || 'češtiny';
      const sourceName = langNames[sourceLang] || 'řečtiny';
      
      let processedPrompt = userPromptTemplate
        .replace(/{TARGET_LANG}/g, targetName)
        .replace(/{SOURCE_LANG}/g, sourceName);
      processedPrompt = enforceSpecialistaFormat(processedPrompt);
      
      const userContent = processedPrompt.includes('{HESLA}') 
        ? processedPrompt.replace(/{HESLA}/g, items)
        : processedPrompt + '\n\n' + items;
      
      return [
        { role: 'system', content: core.SYSTEM_MESSAGE },
        { role: 'user', content: userContent }
      ];
    }

    function getModelTestPromptType() {
      return localStorage.getItem(MODEL_TEST_PROMPT_TYPE_KEY) || 'preset_v12';
    }
    function getModelTestPromptCompareType() {
      return localStorage.getItem(MODEL_TEST_PROMPT_COMPARE_TYPE_KEY) || 'preset_v12';
    }
    function isModelTestPromptCompareEnabled() {
      return localStorage.getItem(MODEL_TEST_PROMPT_COMPARE_ENABLE_KEY) === '1';
    }

    function isModelTestPromptEnabled() {
      const v = localStorage.getItem(MODEL_TEST_ENABLE_PROMPT_KEY);
      return v === null ? true : v === '1';
    }

    function getModelTestCustomPromptText() {
      return localStorage.getItem(MODEL_TEST_CUSTOM_PROMPT_KEY) || '';
    }

    function getModelTestPromptTemplate(promptType) {
      const topicTemplate = getTopicPromptTemplateByPromptType(promptType);
      if (topicTemplate) return topicTemplate;
      const fromCatalog = modelTestPromptCatalog?.[promptType]?.template;
      if (fromCatalog) return fromCatalog;
      const custom = getModelTestCustomPromptText().trim();
      if (custom) return custom;
      return localStorage.getItem('strong_prompt') || core.DEFAULT_PROMPT;
    }

    const EN_TOPIC_PROMPT_MAP = {
      preset_topic_vyznam_en: 'vyznam',
      preset_topic_definice_en: 'definice',
      preset_topic_kjv_en: 'kjv',
      preset_topic_pouziti_en: 'pouziti',
      preset_topic_puvod_en: 'puvod',
      preset_topic_specialista_en: 'specialista'
    };

    function getCurrentTargetLangCode() {
      let target = String(localStorage.getItem('strong_target_lang') || 'cz').toLowerCase();
      if (target === 'cs') target = 'cz';
      return target.toUpperCase();
    }

    function getTopicLabelNoTag(topicId) {
      const keyMap = {
        vyznam: 'topic.label.vyznam',
        definice: 'topic.label.definice',
        kjv: 'topic.label.kjv',
        pouziti: 'topic.label.pouziti',
        puvod: 'topic.label.puvod',
        specialista: 'topic.label.specialista'
      };
      return t(keyMap[topicId] || topicId);
    }

    function formatEnTopicPromptLabel(topicId) {
      return `${t('prompt.topic.prefix')} ${getTopicLabelNoTag(topicId)} (EN -> ${getCurrentTargetLangCode()})`;
    }

    function isEnTopicPromptType(promptType) {
      return Object.prototype.hasOwnProperty.call(EN_TOPIC_PROMPT_MAP, String(promptType || ''));
    }

    function refreshLanguageAwarePromptOptionLabels() {
      const promptTypeSelect = document.getElementById('modelTestPromptType');
      if (!promptTypeSelect) return;
      const selected = promptTypeSelect.value;
      const topicByPromptType = {
        preset_topic_vyznam: 'vyznam',
        preset_topic_definice: 'definice',
        preset_topic_kjv: 'kjv',
        preset_topic_pouziti: 'pouziti',
        preset_topic_puvod: 'puvod',
        preset_topic_specialista: 'specialista',
        preset_topic_vyznam_batch: 'vyznam',
        preset_topic_definice_batch: 'definice',
        preset_topic_kjv_batch: 'kjv',
        preset_topic_pouziti_batch: 'pouziti',
        preset_topic_puvod_batch: 'puvod',
        preset_topic_specialista_batch: 'specialista'
      };
      Object.entries(topicByPromptType).forEach(([promptType, topicId]) => {
        const option = promptTypeSelect.querySelector(`option[value="${promptType}"]`);
        if (!option) return;
        option.textContent = `${t('prompt.topic.prefix')} ${getTopicLabelNoTag(topicId)} (${t('topic.langTag')})${promptType.endsWith('_batch') ? ` ${t('prompt.topic.batchSuffix')}` : ''}`;
      });
      Object.entries(EN_TOPIC_PROMPT_MAP).forEach(([promptType, topicId]) => {
        const option = promptTypeSelect.querySelector(`option[value="${promptType}"]`);
        if (option) option.textContent = formatEnTopicPromptLabel(topicId);
      });
      const customOption = promptTypeSelect.querySelector('option[value="custom"]');
      if (customOption) customOption.textContent = t('prompt.custom');
      const detailGroup = document.getElementById('promptGroupTopicDetail');
      if (detailGroup) detailGroup.label = t('prompt.topic.group.detail');
      const batchGroup = document.getElementById('promptGroupTopicBatch');
      if (batchGroup) batchGroup.label = t('prompt.topic.group.batch', { lang: t('topic.langTag') });
      const enGroup = document.getElementById('promptGroupTopicEn');
      if (enGroup) enGroup.label = t('prompt.topic.group.en', { lang: getCurrentTargetLangCode() });
      if (selected) promptTypeSelect.value = selected;

      const promptTypeCompareSelect = document.getElementById('modelTestPromptTypeCompare');
      if (promptTypeCompareSelect) {
        const selectedCompare = promptTypeCompareSelect.value;
        promptTypeCompareSelect.innerHTML = promptTypeSelect.innerHTML;
        if (selectedCompare) promptTypeCompareSelect.value = selectedCompare;
      }
    }

    function getModelTestPromptTypeLabel(promptType) {
      if (promptType === 'custom') return t('prompt.custom');
      if (isEnTopicPromptType(promptType)) {
        return formatEnTopicPromptLabel(EN_TOPIC_PROMPT_MAP[promptType]);
      }
      const fromCatalog = modelTestPromptCatalog?.[promptType]?.label;
      return fromCatalog || t('prompt.custom');
    }

function openModelTestPromptPreviewModal() {
  const modal = document.getElementById('modelTestPromptPreviewModal');
  const textEl = document.getElementById('modelTestPromptPreviewText');
  const labelEl = document.getElementById('modelTestPromptPreviewLabel');
  if (!modal || !textEl || !labelEl) return;
  const promptTypeSelect = document.getElementById('modelTestPromptType');
  const promptType = promptTypeSelect?.value || getModelTestPromptType();
  const isCustom = promptType === 'custom';
  const customPrompt = String(document.getElementById('modelTestCustomPromptInput')?.value || '').trim();
  const promptText = isCustom
    ? (customPrompt || localStorage.getItem('strong_prompt') || DEFAULT_PROMPT)
    : getModelTestPromptTemplate(promptType);
  labelEl.textContent = `Prompt: ${getModelTestPromptTypeLabel(promptType)}`;
  textEl.value = String(promptText || '').trim();
  modal.style.display = 'flex';
}

function closeModelTestPromptPreviewModal() {
  const modal = document.getElementById('modelTestPromptPreviewModal');
  if (modal) modal.style.display = 'none';
}

async function copyModelTestPromptPreview() {
  const text = String(document.getElementById('modelTestPromptPreviewText')?.value || '');
  if (!text.trim()) {
    showToast(t('toast.prompt.preview.empty'));
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast(t('toast.prompt.copied'));
  } catch (_) {
    showToast(t('toast.copy.failed'));
  }
}
    function getModelTestPromptTopicLabel(promptType) {
      if (isEnTopicPromptType(promptType)) {
        const base = String(EN_TOPIC_PROMPT_LABEL_BASE[promptType] || '').replace(/^Téma:\s*/i, '');
        return `${base} (EN -> ${getCurrentTargetLangCode()})`;
      }
      return modelTestPromptCatalog?.[promptType]?.topicLabel || '';
    }

    function buildPromptMessagesForModelTest(batch, promptType) {
      const items = batch.map(e => {
        const def = e.definice || e.def || '';
        return `${e.key} | ${e.greek}\nDEF: ${def}`;
      }).join('\n\n');

      const targetLang = localStorage.getItem('strong_target_lang') || 'cz';
      const sourceLang = localStorage.getItem('strong_source_lang') || 'gr';
      const langNames = {
        cz: 'češtiny',
        en: 'angličtiny',
        bg: 'bulharštiny',
        ch: 'čínštiny',
        sp: 'španělštiny',
        sk: 'slovenštiny',
        pl: 'polštiny',
        gr: 'řečtiny',
        he: 'hebrejštiny',
        both: 'řečtiny i hebrejštiny'
      };
      const targetName = langNames[targetLang] || 'češtiny';
      const sourceName = langNames[sourceLang] || 'řečtiny';

      const userPromptTemplate = getModelTestPromptTemplate(promptType);
      let processedPrompt = String(userPromptTemplate || '')
        .replace(/{TARGET_LANG}/g, targetName)
        .replace(/{SOURCE_LANG}/g, sourceName);
      processedPrompt = enforceSpecialistaFormat(processedPrompt);
      const userContent = processedPrompt.includes('{HESLA}')
        ? processedPrompt.replace(/{HESLA}/g, items)
        : `${processedPrompt}\n\n${items}`;

      return [
        { role: 'system', content: core.SYSTEM_MESSAGE },
        { role: 'user', content: userContent }
      ];
    }

    function buildModelTestMessages(batch, testMode, promptType, promptEnabled) {
      if (testMode === 'smoke') {
        return [
          { role: 'system', content: 'Odpovídej stručně a bez komentářů navíc.' },
          { role: 'user', content: 'Napiš dvakrát po sobě slovo "heslo".' }
        ];
      }
      if (promptEnabled) {
        return buildPromptMessagesForModelTest(batch, promptType);
      }
      return buildPromptMessages(batch);
    }

  // ══ ERROR LOGGER ═════════════════════════════════════════════════
  /**
   * Structured error logger with context and stack traces.
   * Logs to both console and UI log panel.
   */
  function logError(context, error, extra = {}) {
    const timestamp = new Date().toISOString();
    const stack = error.stack ? `\nStack: ${error.stack}` : '';
    const contextStr = `[${timestamp}] [${context}]`;

    // Console with full details
    console.error(`${contextStr} ${error.message}`, {
      context,
      error: error.message,
      ...extra
    }, stack);

    // UI log
    logMsg(`✗ ${context}: ${error.message}`, 'err');
  }

  function logWarn(context, message, extra = {}) {
    console.warn(`[${new Date().toISOString()}] [${context}]`, message, extra);
    log(`⚠ ${context}: ${message}`);
  }

  function logInfo(context, message) {
    console.log(`[${new Date().toISOString()}] [${context}]`, message);
    log(`ℹ ${context}: ${message}`);
  }
  function getTestHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(TEST_HISTORY_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function pushTestHistory(entry) {
    const history = getTestHistory();
    history.unshift({ ts: Date.now(), ...entry });
    localStorage.setItem(TEST_HISTORY_KEY, JSON.stringify(history.slice(0, 300)));
  }

function populateOpenRouterModels(selectElement, savedModel, callback) {
  const CACHE_KEY = 'openrouter_free_models_cache';
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in ms

  function restoreModel() {
    // Restore saved model or use first available
    if (savedModel && selectElement.querySelector(`option[value="${savedModel}"]`)) {
      selectElement.value = savedModel;
    } else if (selectElement.options.length > 0 && selectElement.options[0].value) {
      selectElement.value = selectElement.options[0].value;
    }
    // Save the selected model to localStorage
    if (selectElement.value) {
      localStorage.setItem('strong_model', selectElement.value);
    }
    if (callback) callback();
  }

  function normalizeCachedModels(models) {
    if (!Array.isArray(models)) return [];
    return models.map(m => {
      if (Array.isArray(m) && m.length >= 2) {
        return { value: String(m[0] || ''), label: String(m[1] || m[0] || '') };
      }
      if (m && typeof m === 'object') {
        const value = String(m.value || m.id || '');
        const label = String(m.label || m.name || value);
        return { value, label };
      }
      return null;
    }).filter(Boolean).filter(o => o.value);
  }

  // Try cache first (rychlý start), ale vždy následně zkus aktualizaci z API
  let hadFreshCache = false;
  const preferredModel = selectElement.value || savedModel || '';
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { timestamp, models } = JSON.parse(cached);
      const normalized = normalizeCachedModels(models);
      if (Date.now() - timestamp < CACHE_TTL && normalized.length >= 2) {
        // Use cached models
        selectElement.innerHTML = normalized.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
        selectElement.disabled = false;
        restoreModel();
        hadFreshCache = true;
      }
    } catch (e) {
      // Invalid cache, fall through to fetch
    }
  }

  // Loading state only when no cache available
  if (!hadFreshCache) {
    selectElement.disabled = true;
    selectElement.innerHTML = `<option value="">${t('openrouter.loading')}</option>`;
  }

  fetch('https://openrouter.ai/api/v1/models?free=true')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      const modelsRaw = (data.data || []).filter(m => m.id && m.id.endsWith(':free'));
      // Některé položky API mohou být metadata bez reálně routovatelného endpointu
      // (pak při testu vrací 404 "No endpoints found"). Zkusíme je vyřadit.
      const models = modelsRaw.filter(m => {
        if (Array.isArray(m.endpoints) && m.endpoints.length === 0) return false;
        if (m?.top_provider && m.top_provider.is_disabled === true) return false;
        return true;
      });
      const modelMap = new Map(models.map(m => [m.id, m]));

      const topCandidates = [
        { id: 'openrouter/free', fixedLabel: t('provider.top.autoRouter') },
        { id: 'openai/gpt-oss-20b:free', fixedLabel: '★ OpenAI GPT-OSS 20B (free)' },
        { id: 'nvidia/nemotron-nano-9b-v2:free', fixedLabel: '★ NVIDIA Nemotron Nano 9B v2 (free)' }
      ];
      const topOptions = topCandidates
        .filter(c => c.id === 'openrouter/free' || modelMap.has(c.id))
        .map(c => ({ value: c.id, label: c.fixedLabel }));

      const topIds = new Set(topOptions.map(o => o.value));
      const otherOptions = models
        .filter(m => !topIds.has(m.id))
        .map(m => ({
          value: m.id,
          label: (m.name || m.id.replace(/:free$/, ''))
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      const options = [...topOptions, ...otherOptions];

      if (options.length === 0) {
        selectElement.innerHTML = `<option value="">${t('openrouter.none')}</option>`;
        selectElement.disabled = true;
        restoreModel();
        return;
      }

      const optionHtml = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
      selectElement.innerHTML = optionHtml;
      selectElement.disabled = false;
      if (preferredModel && selectElement.querySelector(`option[value="${preferredModel}"]`)) {
        selectElement.value = preferredModel;
      }

      // Cache the results
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          models: options.map(o => ({ value: o.value, label: o.label }))
        }));
      } catch (e) {
        // Storage full, ignore
      }

      if (!hadFreshCache) restoreModel();
    })
    .catch(err => {
      console.error('OpenRouter models fetch failed:', err);
      if (hadFreshCache) return;

      // Fallback na jakoukoli dostupnou cache (i starou), aby app zůstala provozní
      try {
        const fallbackRaw = localStorage.getItem(CACHE_KEY);
        if (fallbackRaw) {
          const fallbackParsed = JSON.parse(fallbackRaw);
          const fallbackModels = normalizeCachedModels(fallbackParsed.models);
          if (fallbackModels.length > 0) {
            selectElement.innerHTML = fallbackModels.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
            selectElement.disabled = false;
            restoreModel();
            showToast(t('toast.openrouter.cache'));
            return;
          }
        }
      } catch (e) {
        // Ignore parse errors and show final error state
      }

      selectElement.innerHTML = `<option value="">${t('openrouter.error')}</option>`;
      selectElement.disabled = true;
      restoreModel();
    });
}

function onProviderChange() {
  const newProv = document.getElementById('provider').value;
  const currentProv = document.getElementById('provider')._lastProvider || newProv;

  // Save current key before switching
  const currentKey = document.getElementById('apiKey').value.trim();
  if (currentKey && currentProv !== newProv) {
    localStorage.setItem('strong_apikey_' + currentProv, currentKey);
  }

  // Load key for new provider
  const newKey = localStorage.getItem('strong_apikey_' + newProv);

  document.getElementById('keyLabel').textContent = t('api.key.label', { provider: PROVIDERS[newProv].label });
  document.getElementById('apiKey').placeholder = PROVIDERS[newProv].ph;
  document.getElementById('apiKey').value = newKey || '';
  setupApiKeySwitcher(newProv);

  const modelSelect = document.getElementById('model');

  if (newProv === 'openrouter') {
    const savedModel = localStorage.getItem('strong_model');
    populateOpenRouterModels(modelSelect, savedModel, () => {
      // Guard: if provider changed while loading, abort
      if (document.getElementById('provider').value !== 'openrouter') return;
    });
  } else {
    modelSelect.innerHTML = PROVIDERS[newProv].models.map(([v,l]) => `<option value="${v}">${uiLabel(l)}</option>`).join('');
    modelSelect.disabled = false;
    if (newProv === 'gemini' && modelSelect.querySelector(`option[value="${GEMINI_SYSTEM_MODEL}"]`)) {
      modelSelect.value = GEMINI_SYSTEM_MODEL;
      localStorage.setItem('strong_model', GEMINI_SYSTEM_MODEL);
    } else {
      // Restore saved model if still available
      const savedModel = localStorage.getItem('strong_model');
      if (savedModel && modelSelect.querySelector(`option[value="${savedModel}"]`)) {
        modelSelect.value = savedModel;
      }
    }
  }

  localStorage.setItem('strong_provider', newProv);
  document.getElementById('provider')._lastProvider = newProv;
}

function initRunSelects() {
  const bs = document.getElementById('batchSizeRun');
  if (bs) bs.value = document.getElementById('batchSize').value;
  const iv = document.getElementById('intervalRun');
  if (iv) iv.value = document.getElementById('interval').value;
  syncAutoPanelSettingsInputs();
}

function syncAutoPanelSettingsInputs() {
  const bs = parseInt(document.getElementById('batchSizeRun')?.value || document.getElementById('batchSize')?.value || '10', 10) || 10;
  const iv = parseInt(document.getElementById('intervalRun')?.value || document.getElementById('interval')?.value || '20', 10) || 20;
  const batchInput = document.getElementById('autoBatchSizeInput');
  const intervalInput = document.getElementById('autoIntervalInput');
  if (batchInput) batchInput.value = String(bs);
  if (intervalInput) intervalInput.value = String(iv);
  const autoIntervalEl = document.getElementById('autoInterval');
  if (autoIntervalEl) autoIntervalEl.textContent = String(iv);
  const autoBatchEl = document.getElementById('autoBatch');
  if (autoBatchEl && !state.autoRunning) autoBatchEl.textContent = t('list.batchCount', { count: bs });
}

function applyAutoPanelSettings() {
  const batchInput = document.getElementById('autoBatchSizeInput');
  const intervalInput = document.getElementById('autoIntervalInput');
  const bs = Math.max(1, Math.min(200, parseInt(String(batchInput?.value || '10'), 10) || 10));
  const iv = Math.max(1, Math.min(600, parseInt(String(intervalInput?.value || '20'), 10) || 20));
  if (batchInput) batchInput.value = String(bs);
  if (intervalInput) intervalInput.value = String(iv);
  const bsRun = document.getElementById('batchSizeRun');
  const ivRun = document.getElementById('intervalRun');
  const bsSetup = document.getElementById('batchSize');
  const ivSetup = document.getElementById('interval');
  if (bsRun) bsRun.value = String(bs);
  if (ivRun) ivRun.value = String(iv);
  if (bsSetup) bsSetup.value = String(bs);
  if (ivSetup) ivSetup.value = String(iv);
  state.currentBatchSize = bs;
  state.currentInterval = iv;
  const autoIntervalEl = document.getElementById('autoInterval');
  if (autoIntervalEl) autoIntervalEl.textContent = String(iv);
  const autoBatchEl = document.getElementById('autoBatch');
  if (autoBatchEl && !state.autoRunning) autoBatchEl.textContent = t('list.batchCount', { count: bs });
  updateETA();
}

// ══ LOAD TXT ═════════════════════════════════════════════════════
const LAST_FILE_KEY = 'strong_last_file';
const DEFAULT_TXT_FILE = 'strong_finalni_verze.txt';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/sstistkoo/stistko/main/christ/strong_translate/';

function loadTXT(input) {
  const file = input.files[0];
  if (!file) return;
  localStorage.setItem(LAST_FILE_KEY, file.name);
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      state.entries = parseTXT(ev.target.result);
      state.currentFileId = computeFileId(state.entries);
      const el = document.getElementById('statusTXT');
      el.textContent = `✓ ${file.name} — ${t('entries.count', { count: state.entries.length })}`;
      el.className = 'file-status ok';
      document.getElementById('fileReady').style.display = 'block';
      document.getElementById('startBtn').disabled = false;
      updateAutoBtn();
      checkResume();
     } catch(e) {
       logError('loadTXT', e, { fileName: file?.name });
       const el = document.getElementById('statusTXT');
       el.textContent = t('toast.parseError', { message: e.message });
     }
  };
  reader.readAsText(file, 'utf-8');
}

function loadDefaultFile() {
  const lastFile = localStorage.getItem(LAST_FILE_KEY) || DEFAULT_TXT_FILE;
  const githubUrl = `${GITHUB_RAW_BASE}${encodeURIComponent(lastFile)}`;
  const fallbacks = [githubUrl, lastFile, 'strong_greek_detailed.txt'];

  const tryFetch = (idx) => {
    if (idx >= fallbacks.length) {
      throw new Error('Soubor nenalezen (GitHub ani lokální fallback)');
    }
    const target = fallbacks[idx];
    return fetch(target)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(text => ({ text, source: target }))
      .catch(() => tryFetch(idx + 1));
  };

  tryFetch(0)
    .then(({ text, source }) => {
      state.entries = parseTXT(text);
      state.currentFileId = computeFileId(state.entries);
      localStorage.setItem(LAST_FILE_KEY, lastFile);
      document.getElementById('statusTXT').textContent = `✓ ${lastFile} — ${t('entries.count', { count: state.entries.length })}`;
      document.getElementById('statusTXT').className = 'file-status ok';
      document.getElementById('fileReady').style.display = 'block';
      document.getElementById('startBtn').disabled = false;
      checkResume();
      if (source === githubUrl) {
        showToast(t('toast.loaded.github'));
      } else {
        showToast(t('toast.loaded.fallback'));
      }
     })
    .catch(e => {
      logError('loadDefaultFile', e, { file: lastFile, githubUrl });
      document.getElementById('statusTXT').textContent = '✗ ' + e.message;
    });
}

function checkDefaultFile() {
  const lastFile = localStorage.getItem(LAST_FILE_KEY);
  if (lastFile) {
    document.getElementById('btnLoadDefault').style.display = 'inline-block';
    return;
  }
  // Neprovádíme testovací fetch, aby se v konzoli neobjevoval zbytečný 404.
  document.getElementById('btnLoadDefault').style.display = 'inline-block';
}

function updateAutoBtn() {
  const lastFile = localStorage.getItem(LAST_FILE_KEY);
  if (lastFile) {
    document.getElementById('btnLoadDefault').style.display = 'inline-block';
  }
}

  // Use core module for parsing
  function parseTXT(text) {
    try {
      return parseTXTCore(text);
    } catch(e) {
      logError('parseTXT', e, { textLength: text?.length });
      throw e;
    }
  }

// ══ RESUME ═══════════════════════════════════════════════════════
function checkResume() {
  try {
    const box = document.getElementById('resumeBox');
    if (box) box.style.display = 'none';
    let saved = localStorage.getItem(storeKey());
    let source = t('resume.source.currentSlot');
    // Pokud nemáme nic pod aktuálním fileId, ale máme legacy data, nabídneme je
    if (!saved && state.currentFileId) {
      const legacy = localStorage.getItem(LEGACY_STORE_KEY);
      if (legacy) { saved = legacy; source = t('resume.source.legacySlot'); }
    }
    if (!saved) return;
    const data = JSON.parse(saved);
    const count = Object.keys(data.translated || {}).filter(k => {
      const t = data.translated[k];
      return t && t.vyznam && t.vyznam !== '—' && !t.skipped;
    }).length;
    if (count > 0 && box) {
      box.style.display = 'block';
      const ts = data.ts ? new Date(data.ts).toLocaleString('cs') : '?';
      box.innerHTML = t('resume.found', { source, count, ts });
    }
   } catch(e) {
     logWarn('checkResume', 'Failed to parse saved progress', { error: e.message });
   }
}

function showSetup() {
  document.getElementById('setup').style.display = 'block';
  document.getElementById('app').style.display = 'none';
}

function toggleListPane() {
  const pane = document.querySelector('.list-pane');
  const btn = document.getElementById('btnToggleList');
  const resizeHandle = document.getElementById('resizeHandle');
  const logPanel = document.querySelector('.log-panel');
  const detailPane = document.querySelector('.detail-pane');
  const isMobile = window.innerWidth <= 600;
  const isHidden = pane.classList.contains('hidden');
  
  if (isHidden) {
    pane.classList.remove('hidden');
    btn.textContent = '≡ Seznam';
    if (isMobile) {
      pane.style.height = '45%';
      logPanel.style.height = '50%';
      logPanel.style.flex = 'none';
      detailPane.style.height = 'auto';
      detailPane.style.flex = '1';
    }
  } else {
    pane.classList.add('hidden');
    btn.textContent = '≡ Seznam';
    if (isMobile) {
      pane.style.height = '0';
      logPanel.style.height = '100%';
      logPanel.style.flex = '1';
      detailPane.style.height = 'auto';
      detailPane.style.flex = '1';
    }
  }
}

// ══ START ════════════════════════════════════════════════════════
function startApp() {
  // Ukaž loading hned
  document.getElementById('setup').style.display = 'none';
  const app = document.getElementById('app');
  app.style.display = 'flex';
  const loadingEl = document.createElement('div');
  loadingEl.id = 'appLoading';
  loadingEl.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:var(--txt3);font-family:JetBrains Mono,monospace;font-size:14px';
  loadingEl.textContent = '⏳ Načítám...';
  app.appendChild(loadingEl);
  
  // Deffered init
  requestAnimationFrame(() => {
    setTimeout(() => {
      initApp(loadingEl);
    }, 10);
  });
}

function initApp(loadingEl) {
  state.currentBatchSize = parseInt(document.getElementById('batchSize').value);
  state.currentInterval  = parseInt(document.getElementById('interval').value);

  // Obnov uložený překlad – pro aktuálně načtený soubor
  try {
    const saved = localStorage.getItem(storeKey());
    if (saved) {
      const data = JSON.parse(saved);
      state.translated = data.translated || {};
      state.sourceEntryEdits = data.sourceEntryEdits || {};
    } else if (state.currentFileId) {
      // Pokus o migraci ze starého (legacy) slotu při prvním použití nového prefixu
      const legacy = localStorage.getItem(LEGACY_STORE_KEY);
      if (legacy) {
        const data = JSON.parse(legacy);
        if (data && data.translated && Object.keys(data.translated).length > 0) {
          state.translated = data.translated;
          state.sourceEntryEdits = data.sourceEntryEdits || {};
          // Ulož pod novým klíčem, legacy zachováme – uživatel může mít víc souborů
          localStorage.setItem(storeKey(), JSON.stringify({ translated: state.translated, sourceEntryEdits: state.sourceEntryEdits, ts: Date.now(), fileId: state.currentFileId, migrated: true }));
          logInfo('migrate', `Migrováno ${Object.keys(state.translated).length} hesel z legacy slotu`);
        }
      }
    }
   } catch(e) {
     logWarn('startApp', 'Failed to load saved progress, starting fresh', { error: e.message });
     state.translated = {};
     state.sourceEntryEdits = {};
   }

  document.getElementById('app').style.display = 'flex';
  
  // Dedup state.entries - pokud jsou duplicitní klíče, bereme jen první výskyt
  const uniqueEntries = [];
  const seenKeys = new Set();
  for (const e of state.entries) {
    if (!seenKeys.has(e.key)) {
      seenKeys.add(e.key);
      uniqueEntries.push(e);
    }
  }
  if (uniqueEntries.length < state.entries.length) {
    console.log('WARNING: Removed', state.entries.length - uniqueEntries.length, 'duplicate state.entries');
  }
  state.entries = uniqueEntries;
  
  state.entryMap = new Map(state.entries.map(e => [e.key, e]));
  applySourceEntryEditsToEntries();
  
  // Vytvoř index pro rychlé řazení podle původního pořadí
  window._entryIndexMap = new Map(state.entries.map((e, i) => [e.key, i]));

  state.filteredKeys = state.entries.map(e => e.key);
  initVirtualScroll();
  renderList();
  
  // Scroll na začátek po načtení a znovu vykresli
  const listScroll = document.getElementById('listScroll');
  if (listScroll) listScroll.scrollTop = 0;
  state.lastRenderRange = { start: -1, end: -1, doneStates: {} };
  renderVisible();
  
  updateStats();
  initRunSelects();
  updateFailedCount();
  updateBackupButtonVisibility();
  updateFileIdBadge();
  
  // Odstraň loading element
  if (loadingEl && loadingEl.parentNode) {
    loadingEl.parentNode.removeChild(loadingEl);
  }
  
  document.getElementById('resizeHandle').addEventListener('mousedown', startResize);
  document.getElementById('resizeHandle').addEventListener('touchstart', startResize, {passive: false});
   
  if (window.innerWidth <= 600) {
    toggleListPane();
  }
}

// ══ LIST ═════════════════════════════════════════════════════════
// Store for selected keys (declared in STATE section above)

function renderList() {
  state.filteredKeys = getFilteredEntries().map(e => e.key);
  
  if (state.virtualInitialized) {
    state.lastRenderRange = { start: -1, end: -1 };
    updatePhantomHeight();
    renderVisible();
  }
  
  updateSelectedBtn();
}

function toggleSelect(key, event) {
  event.stopPropagation();
  if (state.selectedKeys.has(key)) {
    state.selectedKeys.delete(key);
  } else {
    state.selectedKeys.add(key);
  }
  renderList();
}

function selectAll() {
  for (const key of state.filteredKeys) {
    state.selectedKeys.add(key);
  }
  renderList();
}

function selectNone() {
  state.selectedKeys.clear();
  renderList();
}

function updateSelectedBtn() {
  const btn = document.getElementById('btnTranslateSelected');
  const btnSelectAllVisible = document.getElementById('btnSelectAllVisible');
  if (state.selectedKeys.size > 0) {
    if (btnSelectAllVisible) {
      btnSelectAllVisible.style.display = 'inline-block';
      btnSelectAllVisible.textContent = t('list.selectAllVisibleWithCount', { count: state.filteredKeys.length });
    }
    btn.style.display = 'inline-block';
    btn.textContent = t('list.translateSelectedCount', { count: state.selectedKeys.size });
  } else {
    if (btnSelectAllVisible) btnSelectAllVisible.style.display = 'none';
    btn.style.display = 'none';
  }
}

async function translateSelected() {
  const activeProvider = resolveMainBatchProvider(document.getElementById('provider')?.value || '');
  if (!isAutoProviderEnabled(activeProvider)) {
    showToast(t('toast.provider.enableOne'));
    return;
  }
  const keys = Array.from(state.selectedKeys);
  if (!keys.length) return;
  const filterStatus = document.getElementById('filterStatus')?.value || '';
  const shouldRunTopicRepair = filterStatus === 'missing_topic';
  if (shouldRunTopicRepair) {
    startTopicRepairFlow(keys);
    return;
  }
  
  const bs = parseInt(document.getElementById('batchSizeRun')?.value) || 10;
  let processed = 0;
  let allNewTranslations = {};
  
  while (processed < keys.length) {
    const batchKeys = keys.slice(processed, processed + bs);
    document.getElementById('btnTranslateSelected').textContent = `⏳ ${processed + batchKeys.length}/${keys.length}...`;

    try {
      const beforeMap = {};
      for (const key of batchKeys) {
        beforeMap[key] = state.translated[key] ? JSON.stringify(state.translated[key]) : '';
      }
      await translateBatch(batchKeys);
      const newTranslations = {};
      for (const key of batchKeys) {
        const after = state.translated[key] ? JSON.stringify(state.translated[key]) : '';
        if (after && after !== beforeMap[key]) {
          newTranslations[key] = { ...state.translated[key] };
        }
      }
      
      allNewTranslations = { ...allNewTranslations, ...newTranslations };
      saveProgress();
      updateFailedCount();
      renderList();
      
    } catch(e) {
       logError('translateSelected', e, {
         batchKeys,
         batchSize: batchKeys.length,
         provider: activeProvider,
         model: getPipelineModelForProvider(activeProvider)
       });
       showToast(t('toast.error.withMessage', { message: e.message }));
    }
    
    processed += batchKeys.length;
    
    // Interval mezi dávkami (ochrana rate limitu)
    if (processed < keys.length) {
      const interval = parseInt(document.getElementById('intervalRun')?.value) || 
                       parseInt(document.getElementById('interval')?.value) || 20;
      document.getElementById('btnTranslateSelected').textContent = t('list.translateWaiting', { seconds: interval });
      await new Promise(r => setTimeout(r, interval * 1000));
    }
  }
  
  state.selectedKeys.clear();
  renderList();
  updateFailedCount();
  document.getElementById('btnTranslateSelected').textContent = '⚡ Přeložit vybrané';
  
  if (Object.keys(allNewTranslations).length > 0) {
    showPreviewModal(allNewTranslations);
    showToast(t('toast.translated.count', { count: Object.keys(allNewTranslations).length }));
  } else {
    showToast(t('toast.translation.none'));
  }
}

function getTopicSourceTextForPreview(key, topicId) {
  const e = state.entryMap.get(key) || {};
  if (topicId === 'definice') return String(e.definice || e.def || '').trim();
  if (topicId === 'kjv') return String(e.kjv || '').trim();
  if (topicId === 'vyznam') return String(e.vyznamCz || e.cz || '').trim();
  return String(e.orig || e.definice || e.def || '').trim();
}

function closeTopicRepairModalSafe() {
  const modal = document.getElementById('topicRepairModal');
  if (modal) modal.remove();
}

function stopTopicRepairTicker() {
  if (state.topicRepairTicker) {
    clearInterval(state.topicRepairTicker);
    state.topicRepairTicker = null;
  }
}

function updateTopicRepairProviderStatus() {
  const topicRepairState = state.topicRepairState;
  if (!topicRepairState) return;
  const providers = ['groq', 'gemini', 'openrouter'];
  for (const prov of providers) {
    const line = document.getElementById(`topicRepairProvider_${prov}`);
    if (!line) continue;
    const enabled = !!topicRepairState.providerEnabled[prov];
    if (!enabled) {
      const label = prov === 'groq' ? 'Groq' : (prov === 'gemini' ? 'Google' : 'OpenRouter');
      line.textContent = t('provider.status.disabled', { label });
      continue;
    }
    if (topicRepairState.currentTask && topicRepairState.currentTask.provider === prov) {
      const label = prov === 'groq' ? 'Groq' : (prov === 'gemini' ? 'Google' : 'OpenRouter');
      line.textContent = t('provider.status.running', { label });
      continue;
    }
    const left = getProviderCooldownLeftSec(prov);
    const label = prov === 'groq' ? 'Groq' : (prov === 'gemini' ? 'Google' : 'OpenRouter');
    line.textContent = left > 0
      ? t('provider.status.nextIn', { label, seconds: left })
      : t('provider.status.ready', { label });
  }
}

function updateTopicRepairModalUI() {
  const topicRepairState = state.topicRepairState;
  if (!topicRepairState) return;
  const vis = getTopicRepairModalVisibleTasks(state);
  const done = vis.filter(t => t.status === 'done').length;
  const running = vis.filter(t => t.status === 'running').length;
  const waiting = vis.filter(t => t.status === 'waiting').length;
  const failed = vis.filter(t => t.status === 'failed').length;
  const statusEl = document.getElementById('topicRepairStatus');
  const idleHint = (state.repairStrategy === 'sequential' && !state.sequentialEverStarted && waiting > 0)
    ? t('topicRepair.status.waitingToStart')
    : '';
  if (statusEl) statusEl.textContent = `${idleHint}${t('topicRepair.status.summary', { done, running, waiting, failed })}`;
  const applyCount = vis.filter(t => t.checked && hasMeaningfulValue(t.candidateValue)).length;
  const applyBtn = document.getElementById('topicRepairApplyBtn');
  if (applyBtn) applyBtn.textContent = t('topicRepair.applyOverwrite', { count: applyCount });
  const toggleBtn = document.getElementById('topicRepairToggleBtn');
  if (toggleBtn) {
    toggleBtn.textContent = state.paused ? t('topicRepair.resume') : t('topicRepair.pause');
    const showPause = state.repairStrategy === 'sequential' && state.sequentialEverStarted;
    toggleBtn.style.display = showPause ? '' : 'none';
  }
  const startSeqBtn = document.getElementById('topicRepairStartSequentialBtn');
  if (startSeqBtn) {
    const enabledProvCount = ['groq', 'gemini', 'openrouter'].filter(p => topicRepairState.providerEnabled[p]).length;
    const wantStart = state.repairStrategy === 'sequential' && !state.sequentialEverStarted
      && getTopicRepairModalVisibleTasks(state).some(t => t.status === 'waiting');
    const canSeqStart = wantStart && enabledProvCount > 0;
    startSeqBtn.style.display = wantStart ? '' : 'none';
    startSeqBtn.disabled = !canSeqStart;
  }
  const rSeq = document.getElementById('topicRepairStrategySeq');
  const rBulk = document.getElementById('topicRepairStrategyBulk');
  if (rSeq) rSeq.checked = state.repairStrategy === 'sequential';
  if (rBulk) rBulk.checked = state.repairStrategy === 'bulk';
  const bulkHint = document.getElementById('topicRepairBulkStrategyHint');
  if (bulkHint) bulkHint.style.display = state.repairStrategy === 'bulk' ? 'block' : 'none';
  const bulkRunBtn = document.getElementById('topicRepairBulkRunBtn');
  if (bulkRunBtn) {
    bulkRunBtn.disabled = false;
    bulkRunBtn.textContent = state.topicRepairBulkRunning ? '■ Zastavit hromadný překlad' : t('topicRepair.bulk.button');
  }
  const rows = vis.map(task => {
    const idx = topicRepairState.tasks.indexOf(task);
    const extraTopicsForUi = (Array.isArray(task.detectedTopics) ? task.detectedTopics : [])
      .filter(row => row && row.topicId && row.topicId !== 'specialista' && row.topicId !== task.topicId);
    const rhOther = (Array.isArray(task.rawHeaderTopics) ? task.rawHeaderTopics : []).filter(id => id && id !== task.topicId);
    const rawHeadersHint = (task.status === 'done' || task.status === 'failed') && rhOther.length > 0
      ? `<div style="font-size:10px;color:var(--acc2);margin-top:6px">📎 V odpovědi také nadpisy: ${rhOther.map(id => escHtml(TOPIC_LABELS[id] || id)).join(', ')}${extraTopicsForUi.length ? '' : ' — bez tabulky „další témata“ zkontroluj 📎 v logu a F12 → RAW.'}</div>`
      : '';
    const statusColor = task.status === 'done' ? 'var(--acc3)' : (task.status === 'failed' ? 'var(--red)' : (task.status === 'running' ? 'var(--ylw)' : 'var(--txt3)'));
    const statusText = task.status === 'done' ? 'hotovo' : (task.status === 'failed' ? 'chyba' : (task.status === 'running' ? 'běží' : 'čeká'));
    return `
      <div style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;padding:10px;margin:0 0 10px 0">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" ${task.checked ? 'checked' : ''} ${!hasMeaningfulValue(task.candidateValue) ? 'disabled' : ''} onchange="toggleTopicRepairTask(${idx}, this.checked)" style="accent-color:var(--acc)">
            <span style="font-family:'JetBrains Mono',monospace;color:var(--acc)">${task.key}</span>
            <span>${escHtml(TOPIC_LABELS[task.topicId] || task.topicId)}</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--txt3);font-size:11px">
            <input type="checkbox" ${task.includeBulk !== false ? 'checked' : ''} onchange="toggleTopicRepairBulkInclude(${idx}, this.checked)" style="accent-color:var(--acc)">
            ${t('topicRepair.batchLabel')}
          </label>
          <span style="font-size:11px;color:${statusColor}">${statusText}${task.provider ? ` · ${task.provider}` : ''}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="font-size:11px;color:var(--txt2)">
            <div><b>${t('topicRepair.originalTopic')}</b> ${escHtml(task.currentValue || '—')}</div>
            <div style="margin-top:4px"><b>${t('topicRepair.original')}</b> ${escHtml(task.sourceValue || '—')}</div>
          </div>
          <div style="font-size:11px;color:var(--txt)">
            <div><b>${t('topicRepair.newProposal')}</b> ${escHtml(task.candidateValue || '—')}</div>
            ${formatTopicRepairQuickCompare(task.topicId, task.currentValue, task.candidateValue)}
            ${rawHeadersHint}
            <div style="margin-top:4px;color:var(--txt2)">
              <b>${t('topicRepair.specialistInResponse')}</b> ${task.specialistaInRaw ? t('topicRepair.yes') : t('topicRepair.no')}
              ${task.specialistaInRaw ? ` · <b>${t('topicRepair.status')}</b> ${escHtml(task.specialistaDecision || t('topicRepair.unchanged'))}` : ''}
            </div>
            ${task.specialistaInRaw ? `
              <details style="margin-top:6px;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;padding:6px">
                <summary style="cursor:pointer;color:var(--acc)">${t('topicRepair.specialistDetail')}</summary>
                <div style="margin-top:6px;color:var(--txt2)"><b>${t('topicRepair.originalSpecialist')}</b> ${escHtml(task.specialistaPreviousValue || '—')}</div>
                <div style="margin-top:6px;color:var(--txt)"><b>${t('topicRepair.aiSpecialist')}</b> ${escHtml(task.specialistaCandidateValue || '—')}</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
                  <button class="hbtn grn" onclick="setTopicRepairSpecialistaDecision(${idx}, 'accept')">${t('topicRepair.confirmSpecialist')}</button>
                  <button class="hbtn red" onclick="setTopicRepairSpecialistaDecision(${idx}, 'reject')">${t('topicRepair.rejectSpecialist')}</button>
                </div>
              </details>
            ` : ''}
            ${extraTopicsForUi.length > 0 ? `
              <details style="margin-top:6px;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;padding:6px">
                <summary style="cursor:pointer;color:var(--acc2)">${t('topicRepair.extraTopics', { count: extraTopicsForUi.length })}</summary>
                ${extraTopicsForUi.map(row => `
                  <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--brd)">
                    <div style="font-size:11px;color:var(--txt2)"><b>${escHtml(TOPIC_LABELS[row.topicId] || row.topicId)}</b> · ${t('topicRepair.status')} ${escHtml(row.decision || t('topicRepair.unchanged'))}</div>
                    <div style="margin-top:4px;color:var(--txt2)"><b>${t('topicRepair.originalShort')}</b> ${escHtml(row.previousValue || '—')}</div>
                    <div style="margin-top:4px;color:var(--txt)"><b>${t('topicRepair.aiShort')}</b> ${escHtml(row.candidateValue || '—')}</div>
                    ${formatTopicRepairQuickCompare(row.topicId, row.previousValue, row.candidateValue)}
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
                      <button class="hbtn grn" onclick="setTopicRepairDetectedTopicDecision(${idx}, '${row.topicId}', 'accept')">${t('topicRepair.confirm')}</button>
                      <button class="hbtn red" onclick="setTopicRepairDetectedTopicDecision(${idx}, '${row.topicId}', 'reject')">${t('topicRepair.reject')}</button>
                    </div>
                  </div>
                `).join('')}
              </details>
            ` : ''}
            ${task.error ? `<div style="margin-top:4px;color:var(--red)">✗ ${escHtml(task.error)}</div>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
  const listEl = document.getElementById('topicRepairList');
  if (listEl) listEl.innerHTML = rows || `<div style="font-size:12px;color:var(--txt3)">${t('topicRepair.none')}</div>`;
  updateTopicRepairProviderStatus();
  syncTopicRepairMinimizeBusyIndicator();
}

function buildTopicRepairTasks(keys) {
  const tasks = [];
  for (const key of keys) {
    const t = state.translated[key] || {};
    const missing = getMissingTopicsForRepair(t);
    for (const topicId of missing) {
      tasks.push({
        key,
        topicId,
        status: 'waiting',
        checked: true,
        includeBulk: true,
        currentValue: String(t[topicId] || '').trim(),
        sourceValue: getTopicSourceTextForPreview(key, topicId),
        candidateValue: '',
        provider: '',
        error: '',
        specialistaInRaw: false,
        specialistaDecision: '',
        specialistaPreviousValue: String(t.specialista || '').trim(),
        specialistaCandidateValue: '',
        detectedTopics: [],
        rawHeaderTopics: []
      });
    }
  }
  return tasks;
}

function applyTopicRepairProviderCheckboxes() {
  const topicRepairState = state.topicRepairState;
  if (!topicRepairState) return;
  for (const prov of ['groq', 'gemini', 'openrouter']) {
    const el = document.getElementById(`topicRepairEnable_${prov}`);
    if (!el) continue;
    topicRepairState.providerEnabled[prov] = !!el.checked;
  }
  updateTopicRepairProviderStatus();
}

function renderTopicRepairModal() {
  const topicRepairState = state.topicRepairState;
  if (!topicRepairState) return;
  if (!state.bulkListTopicFilter) state.bulkListTopicFilter = defaultBulkListTopicFilter();
  if (!state.bulkTopicId) state.bulkTopicId = 'all';
  closeTopicRepairModalSafe();
  const modal = document.createElement('div');
  modal.id = 'topicRepairModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:10025;overflow-y:auto;padding:16px';
  modal.innerHTML = `
    <div style="max-width:980px;margin:0 auto;background:var(--bg2);border:1px solid var(--brd);border-radius:8px;padding:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <h2 style="color:var(--acc);margin:0">Oprava témat (${topicRepairState.tasks.length})</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="hbtn" id="topicRepairMinimizeBtn" onclick="minimizeTopicRepairModal()">▁ Minimalizovat</button>
          <button class="hbtn" onclick="closeTopicRepairModalOnly()">✕ Zavřít okno</button>
        </div>
      </div>
      <div style="font-size:11px;color:var(--txt2);margin:8px 0 10px 0">Chybějící témata — nic se nespouští automaticky; zvol režim a teprve pak spusť překlad.</div>
      <div style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;padding:10px;margin-bottom:10px">
        <div style="font-size:12px;color:var(--txt);margin-bottom:8px"><b>Režim</b></div>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--txt2)">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="radio" name="topicRepairStrategy" id="topicRepairStrategySeq" value="sequential" ${state.repairStrategy === 'sequential' ? 'checked' : ''} onchange="setTopicRepairStrategy('sequential')" style="accent-color:var(--acc)">
            Po jednom (sekvenčně — vlastní prompt pro každé chybějící téma)
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="radio" name="topicRepairStrategy" id="topicRepairStrategyBulk" value="bulk" ${state.repairStrategy === 'bulk' ? 'checked' : ''} onchange="setTopicRepairStrategy('bulk')" style="accent-color:var(--acc)">
            Hromadně (dávka jednoho tématu — sekce níže, tlačítko „Hromadný překlad“)
          </label>
        </div>
        <div id="topicRepairBulkStrategyHint" style="margin-top:8px;font-size:11px;color:var(--txt3);display:${state.repairStrategy === 'bulk' ? 'block' : 'none'}">Sekvenční fronta se nespustí. Rozbal „Hromadná oprava“, zkontroluj prompt a dej ⚡ Hromadný překlad.</div>
      </div>
      <div style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;padding:10px;margin-bottom:10px">
        <div id="topicRepairStatus" style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--txt3)">—</div>
        <div style="display:grid;gap:2px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--txt2);margin-top:6px">
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="topicRepairEnable_groq" ${topicRepairState.providerEnabled.groq ? 'checked' : ''} onchange="applyTopicRepairProviderCheckboxes()" style="accent-color:var(--acc)">G <span id="topicRepairProvider_groq">Groq: —</span></label>
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="topicRepairEnable_gemini" ${topicRepairState.providerEnabled.gemini ? 'checked' : ''} onchange="applyTopicRepairProviderCheckboxes()" style="accent-color:var(--acc)">Gm <span id="topicRepairProvider_gemini">Google: —</span></label>
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="topicRepairEnable_openrouter" ${topicRepairState.providerEnabled.openrouter ? 'checked' : ''} onchange="applyTopicRepairProviderCheckboxes()" style="accent-color:var(--acc)">OR <span id="topicRepairProvider_openrouter">OpenRouter: —</span></label>
        </div>
      </div>
      <details id="topicRepairBulkDetails" style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;padding:10px;margin-bottom:10px" ${state.repairStrategy === 'bulk' ? 'open' : ''}>
        <summary style="cursor:pointer;color:var(--acc)">Hromadná oprava jednoho tématu (dávka)</summary>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:8px">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--txt3);cursor:pointer">
            <input type="checkbox" id="topicRepairBulkOnlyFailed" checked style="accent-color:var(--acc)">
            jen chyby / prázdné
          </label>
          <button class="hbtn" type="button" onclick="setTopicRepairBulkIncludeAll(true)">☑ Dávka: vše</button>
          <button class="hbtn" type="button" onclick="setTopicRepairBulkIncludeAll(false)">☐ Dávka: nic</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:10px;font-size:12px;color:var(--txt2)">
          <label style="display:flex;align-items:center;gap:6px">Dávka (hesel)
            <input type="number" id="topicRepairBulkBatchInput" min="1" max="100" step="1" style="width:64px;padding:4px 6px;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;color:var(--txt);font-family:'JetBrains Mono',monospace;font-size:12px" title="Synchronizuje skryté batchSizeRun (stejné jako AUTO)" oninput="syncTopicRepairBulkRunInputsToHidden()">
          </label>
          <label style="display:flex;align-items:center;gap:6px">Interval (s)
            <input type="number" id="topicRepairBulkIntervalInput" min="0" max="600" step="1" style="width:64px;padding:4px 6px;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;color:var(--txt);font-family:'JetBrains Mono',monospace;font-size:12px" title="Synchronizuje skryté intervalRun — pauza mezi dávkami" oninput="syncTopicRepairBulkRunInputsToHidden()">
          </label>
          <span id="topicRepairBulkRunSummary" style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--txt3)"></span>
        </div>
        <div style="margin-top:8px">
          <div style="font-size:11px;color:var(--txt2);margin-bottom:6px">Batch prompt (uložený per téma). Placeholder <span style="font-family:'JetBrains Mono',monospace">{HESLA}</span> = vstupní hesla.</div>
          <textarea id="topicRepairBatchPrompt" style="width:100%;min-height:160px;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;color:var(--txt);padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.45"></textarea>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
            <button class="hbtn" type="button" onclick="saveTopicRepairBatchPromptDraft()">💾 Uložit prompt</button>
            <button class="hbtn" type="button" onclick="resetTopicRepairBatchPromptToDefault()">↺ Výchozí z katalogu</button>
            <button class="hbtn grn" id="topicRepairBulkRunBtn" type="button" onclick="runTopicRepairBulkTranslation()">⚡ Hromadný překlad (vybrané)</button>
          </div>
          <div style="font-size:11px;color:var(--txt3);margin-top:8px">
            Tip: pokud běží sekvenční oprava, dej nejdřív Pauza — hromadný běh počká, až doběhne aktuální pokus.
          </div>
        </div>
      </details>
      <div style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;padding:10px;margin-bottom:10px">
        <div style="font-size:12px;color:var(--txt);margin-bottom:6px"><b>Téma v seznamu</b> — podle výběru se zobrazí jen odpovídající řádky (sekvenční i dávka).</div>
        <label style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--txt2);flex-wrap:wrap">
          <span style="white-space:nowrap">Vybrat</span>
          <select id="topicRepairBulkTopicSelect" onchange="refreshTopicRepairBatchPromptEditor()" style="min-width:240px;flex:1;max-width:100%;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;color:var(--txt);padding:6px;font-size:12px">
            <option value="all" ${state.bulkTopicId === 'all' ? 'selected' : ''}>Vše</option>
            <option value="definice" ${state.bulkTopicId === 'definice' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.definice)}</option>
            <option value="vyznam" ${state.bulkTopicId === 'vyznam' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.vyznam)}</option>
            <option value="kjv" ${state.bulkTopicId === 'kjv' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.kjv)}</option>
            <option value="pouziti" ${state.bulkTopicId === 'pouziti' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.pouziti)}</option>
            <option value="puvod" ${state.bulkTopicId === 'puvod' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.puvod)}</option>
            <option value="specialista" ${state.bulkTopicId === 'specialista' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.specialista)}</option>
          </select>
        </label>
        <div id="topicRepairBulkListFilterRow" style="display:${state.bulkTopicId === 'all' ? 'flex' : 'none'};flex-wrap:wrap;gap:10px 14px;align-items:center;width:100%;margin-top:10px;padding-top:10px;border-top:1px solid var(--brd);font-size:11px;color:var(--txt2)">
          <span style="width:100%;margin-bottom:2px">U „Vše“ omez typy témat:</span>
          ${TOPIC_REPAIR_BULK_TOPIC_ORDER.map(tid => {
            const on = (state.bulkListTopicFilter || defaultBulkListTopicFilter())[tid] !== false;
            return `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap"><input type="checkbox" ${on ? 'checked' : ''} onchange="toggleTopicRepairBulkListFilter('${tid}', this.checked)" style="accent-color:var(--acc)">${escHtml(TOPIC_LABELS[tid] || tid)}</label>`;
          }).join('')}
        </div>
        <div style="font-size:10px;color:var(--txt3);margin-top:8px">Batch prompt a ⚡ hromadný překlad zůstávají v sekci „Hromadná oprava“ výše — výběr témat je stejný.</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
        <button class="hbtn grn" id="topicRepairStartSequentialBtn" type="button" onclick="startTopicRepairSequentialWorker()">▶ Spustit sekvenční opravu</button>
        <button class="hbtn grn" id="topicRepairToggleBtn" onclick="toggleTopicRepairRun()">⏸ Pauza</button>
        <button class="hbtn grn" id="topicRepairApplyBtn" onclick="applyTopicRepairSelected()">✓ Potvrdit přepsání (0)</button>
      </div>
      <div id="topicRepairList"></div>
    </div>
  `;
  document.body.appendChild(modal);
  refreshTopicRepairBatchPromptEditor();
  initTopicRepairBulkRunInputs();
  updateTopicRepairModalUI();
}

function startTopicRepairFlow(keys) {
  const tasks = buildTopicRepairTasks(keys);
  if (!tasks.length) {
    showToast(t('toast.topicRepair.noEligible'));
    return;
  }
  state.topicRepairState = {
    tasks,
    paused: true,
    repairStrategy: 'sequential',
    sequentialEverStarted: false,
    closed: false,
    minimized: false,
    bulkTopicId: 'all',
    bulkListTopicFilter: defaultBulkListTopicFilter(),
    currentTask: null,
    providerEnabled: {
      groq: isAutoProviderEnabled('groq'),
      gemini: isAutoProviderEnabled('gemini'),
      openrouter: isAutoProviderEnabled('openrouter')
    }
  };
  renderTopicRepairModal();
  const miniBtn = document.getElementById('btnTopicRepairMini');
  if (miniBtn) miniBtn.style.display = 'none';
  stopTopicRepairTicker();
  state.topicRepairTicker = setInterval(updateTopicRepairProviderStatus, 1000);
}

function setTopicRepairStrategy(strategy) {
  const topicRepairState = state.topicRepairState;
  if (!topicRepairState) return;
  const busy = topicRepairState.tasks.some(t => t.status === 'running') || !!topicRepairState.currentTask || state.topicRepairBulkRunning;
  if (busy) {
    showToast(t('toast.topicRepair.modeLocked'));
    updateTopicRepairModalUI();
    return;
  }
  state.repairStrategy = strategy === 'bulk' ? 'bulk' : 'sequential';
  if (state.repairStrategy === 'bulk') state.paused = true;
  const det = document.getElementById('topicRepairBulkDetails');
  if (det) det.open = state.repairStrategy === 'bulk';
  const bulkHint = document.getElementById('topicRepairBulkStrategyHint');
  if (bulkHint) bulkHint.style.display = state.repairStrategy === 'bulk' ? 'block' : 'none';
  updateTopicRepairModalUI();
}

function startTopicRepairSequentialWorker() {
  const topicRepairState = state.topicRepairState;
  if (!state || state.repairStrategy !== 'sequential') return;
  if (!findNextTopicRepairWaitingTask(state)) {
    showToast(t('toast.topicRepair.queueEmpty'));
    return;
  }
  const enabledProviders = ['groq', 'gemini', 'openrouter'].filter(p => topicRepairState.providerEnabled[p]);
  if (!enabledProviders.length) {
    showToast(t('toast.topicRepair.enableProvider'));
    return;
  }
  state.sequentialEverStarted = true;
  state.paused = false;
  updateTopicRepairModalUI();
  if (!state.topicRepairWorkerRunning) processTopicRepairQueue();
}

async function processTopicRepairQueue() {
  if (!state.topicRepairState || state.topicRepairWorkerRunning) return;
  state.topicRepairWorkerRunning = true;
  try {
    while (state.topicRepairState && !state.topicRepairState.closed) {
      if (state.topicRepairState.repairStrategy !== 'sequential') break;
      if (state.topicRepairState.paused) {
        await sleep(350);
        continue;
      }
      const nextTask = findNextTopicRepairWaitingTask(state.topicRepairState);
      if (!nextTask) break;
      const enabledProviders = ['groq', 'gemini', 'openrouter'].filter(p => state.topicRepairState?.providerEnabled?.[p]);
      if (!enabledProviders.length) {
        showToast(t('toast.topicRepair.enableProvider'));
        state.topicRepairState.paused = true;
        updateTopicRepairModalUI();
        await sleep(500);
        continue;
      }
      nextTask.status = 'running';
      nextTask.error = '';
      updateTopicRepairModalUI();
      let success = false;
      for (const prov of enabledProviders) {
        if (!state.topicRepairState || state.topicRepairState.closed || state.topicRepairState.paused) break;
        const model = getPipelineModelForProvider(prov) || document.getElementById('model')?.value || '';
        const apiKey = getCurrentApiKey(prov);
        if (!apiKey) continue;
        state.topicRepairState.currentTask = { provider: prov };
        updateTopicRepairProviderStatus();
        try {
          nextTask.detectedTopics = [];
          const messages = [
            { role: 'system', content: SYSTEM_MESSAGE },
            { role: 'user', content: buildTopicPrompt(nextTask.key, nextTask.topicId) }
          ];
          const raw = await callAIWithRetry(prov, apiKey, model, messages);
          const rawText = String(raw?.content || '').trim();
          log(`📥 RAW AI oprava ${nextTask.key}.${nextTask.topicId}: vypsáno do konzole`);
          console.groupCollapsed(`🤖 RAW AI oprava ${nextTask.key}.${nextTask.topicId} (${prov}/${model})`);
          console.log(rawText || '(prázdná odpověď)');
          console.groupEnd();

          // Kontrola dalších témat: zobraz jen skutečně označená pole v RAW odpovědi (striktní parser).
          state.translated[nextTask.key] = state.translated[nextTask.key] || {};
          const baselineTopicValues = cloneTranslationTopicFields(state.translated[nextTask.key]);

          const primaryCandidate = String(extractTopicValueFromAI(rawText, nextTask.topicId, 'strict') || '').trim();
          nextTask.rawHeaderTopics = scanRawForTopicHeaderTopicIds(rawText);

          const pushDetectedExtraTopic = (topicId, candidateTopicVal) => {
            if (!hasMeaningfulValue(candidateTopicVal)) return;
            if (primaryCandidate && candidateTopicVal === primaryCandidate) return;
            if (nextTask.detectedTopics.some(d => d.topicId === topicId)) return;
            const previousTopicVal = String(baselineTopicValues?.[topicId] || '').trim();
            const acceptAuto = shouldAutoAcceptDetectedTopic(topicId, previousTopicVal, candidateTopicVal);
            if (acceptAuto) {
              state.translated[nextTask.key][topicId] = candidateTopicVal;
            }
            nextTask.detectedTopics.push({
              topicId,
              previousValue: previousTopicVal,
              candidateValue: candidateTopicVal,
              decision: acceptAuto ? 'přijat (auto)' : 'zamítnut (auto)'
            });
          };

          for (const topicId of FALLBACK_TOPIC_ORDER) {
            if (topicId === 'specialista') continue;
            if (topicId === nextTask.topicId) continue;
            const candidateTopicVal = String(extractTopicValueFromAI(rawText, topicId, 'strict') || '').trim();
            pushDetectedExtraTopic(topicId, candidateTopicVal);
          }

          const headerExtras = (nextTask.rawHeaderTopics || []).filter(
            tid => tid !== nextTask.topicId && tid !== 'specialista'
          );
          for (const topicId of headerExtras) {
            let v = String(extractTopicValueFromAI(rawText, topicId, 'strict') || '').trim();
            if (!hasMeaningfulValue(v)) {
              v = String(extractTopicValueFromAI(rawText, topicId, 'loose') || '').trim();
            }
            pushDetectedExtraTopic(topicId, v);
          }

          const prevSpecialista = String(baselineTopicValues?.specialista || '').trim();
          let candidateSpecialista = String(extractTopicValueFromAI(rawText, 'specialista', 'strict') || '').trim();
          if (!hasMeaningfulValue(candidateSpecialista)) {
            candidateSpecialista = String(extractSpecialistaLooseFallback(rawText) || '').trim();
          }
          if (!hasMeaningfulValue(candidateSpecialista)) {
            candidateSpecialista = String(extractTopicValueFromAI(rawText, 'specialista', 'loose') || '').trim();
          }
          const normStrip = stripLeadingGHeaders(normalizeAiTopicRawText(rawText)).trim();
          const specHeader =
            (nextTask.rawHeaderTopics || []).includes('specialista') ||
            !!matchSpecialistaHeaderBlockStart(normStrip);
          nextTask.specialistaInRaw = hasMeaningfulValue(candidateSpecialista) || specHeader;
          nextTask.specialistaPreviousValue = prevSpecialista;
          nextTask.specialistaCandidateValue = candidateSpecialista;
          if (specHeader && !hasMeaningfulValue(candidateSpecialista)) {
            log(`⚠ ${nextTask.key}: v RAW je nadpis SPECIALISTA, ale tělo se nepodařilo strojově vyčíst — viz konzole RAW.`);
          }
          if (shouldReplaceSpecialista(prevSpecialista, candidateSpecialista)) {
            state.translated[nextTask.key].specialista = String(candidateSpecialista || '').trim();
            nextTask.specialistaDecision = 'přijat (auto)';
            log(`🧠 SPECIALISTA auto-upgrade ${nextTask.key}: použit kvalitnější text z opravy tématu`);
          } else if (nextTask.specialistaInRaw) {
            nextTask.specialistaDecision = 'zamítnut (auto)';
          } else {
            nextTask.specialistaDecision = '';
          }

          const hdrOther = (nextTask.rawHeaderTopics || []).filter(id => id !== nextTask.topicId);
          const hdrLabels = hdrOther.map(id => TOPIC_LABELS[id] || id).join(', ') || '—';
          const dtIds = (nextTask.detectedTopics || []).map(d => TOPIC_LABELS[d.topicId] || d.topicId).join(', ') || '—';
          log(`📎 ${nextTask.key} · „${TOPIC_LABELS[nextTask.topicId] || nextTask.topicId}“: v RAW bloky [${hdrLabels}] → další témata (UI): [${dtIds}] · SPECIALISTA: ${nextTask.specialistaInRaw ? 'ano' : 'ne'}`);

          const candidate = extractTopicValueFromAI(raw?.content || '', nextTask.topicId, 'strict');
          if (!hasMeaningfulValue(candidate)) {
            throw new Error('AI vrátila prázdný výsledek');
          }
          nextTask.provider = prov;
          nextTask.candidateValue = String(candidate || '').trim();
          nextTask.checked = shouldAutoCheckTopicRepairTask(nextTask.topicId, nextTask.currentValue, nextTask.candidateValue);
          nextTask.status = 'done';
          success = true;
          log(`✓ Oprava tématu ${nextTask.key}.${nextTask.topicId} přes ${prov}`);
          break;
        } catch (e) {
          nextTask.error = e.message || 'Neznámá chyba';
        } finally {
          state.topicRepairState.currentTask = null;
          updateTopicRepairProviderStatus();
        }
      }
      if (!success) {
        nextTask.status = 'failed';
      }
      updateTopicRepairModalUI();
      saveProgress();
      await sleep(80);
    }
    updateTopicRepairModalUI();
    if (state.topicRepairState && !state.topicRepairState.closed) {
      const waitingVis = getTopicRepairModalVisibleTasks(state.topicRepairState).filter(t => t.status === 'waiting').length;
      if (waitingVis === 0) showToast(t('toast.topicRepair.visibleDone'));
    }
  } finally {
    state.topicRepairWorkerRunning = false;
  }
}

function toggleTopicRepairTask(index, checked) {
  const topicRepairState = state.topicRepairState;
  if (!state || !topicRepairState.tasks[index]) return;
  topicRepairState.tasks[index].checked = !!checked;
  updateTopicRepairModalUI();
}

function toggleTopicRepairRun() {
  if (!state.topicRepairState) return;
  const topicRepairState = state.topicRepairState;
  if (state.repairStrategy !== 'sequential' || !state.sequentialEverStarted) {
    showToast(state.repairStrategy === 'bulk' ? t('topicRepair.hint.bulkMode') : t('topicRepair.hint.startSequential'));
    return;
  }
  state.paused = !state.paused;
  updateTopicRepairModalUI();
  if (!state.paused && !state.topicRepairWorkerRunning) processTopicRepairQueue();
}

function shouldAutoAcceptDetectedTopic(topicId, previousValue, candidateValue) {
  if (!hasMeaningfulValue(candidateValue)) return false;
  if (topicId === 'definice' && isDefinitionLowQuality(candidateValue)) return false;
  if (topicId === 'specialista') return shouldReplaceSpecialista(previousValue, candidateValue);
  return !hasMeaningfulValue(previousValue);
}

function setTopicRepairSpecialistaDecision(index, decision) {
  const topicRepairState = state.topicRepairState;
  if (!state || !topicRepairState.tasks[index]) return;
  const task = topicRepairState.tasks[index];
  if (!task.specialistaInRaw || !hasMeaningfulValue(task.specialistaCandidateValue)) return;
  state.translated[task.key] = state.translated[task.key] || {};
  if (decision === 'accept') {
    state.translated[task.key].specialista = String(task.specialistaCandidateValue || '').trim();
    task.specialistaDecision = 'přijat ručně';
    showToast(t('toast.specialista.approved', { key: task.key }));
  } else {
    state.translated[task.key].specialista = String(task.specialistaPreviousValue || '').trim();
    task.specialistaDecision = 'zamítnut ručně';
    showToast(t('toast.specialista.rejected', { key: task.key }));
  }
  saveProgress();
  if (state.activeKey === task.key) renderDetail();
  updateTopicRepairModalUI();
}

function setTopicRepairDetectedTopicDecision(taskIndex, topicId, decision) {
  const topicRepairState = state.topicRepairState;
  if (!state || !topicRepairState.tasks[taskIndex]) return;
  const task = topicRepairState.tasks[taskIndex];
  const row = (task.detectedTopics || []).find(x => x.topicId === topicId);
  if (!row || !hasMeaningfulValue(row.candidateValue)) return;
  state.translated[task.key] = state.translated[task.key] || {};
  if (decision === 'accept') {
    state.translated[task.key][topicId] = String(row.candidateValue || '').trim();
    row.decision = 'přijat ručně';
    showToast(t('toast.topic.approved', { topic: TOPIC_LABELS[topicId] || topicId, key: task.key }));
  } else {
    state.translated[task.key][topicId] = String(row.previousValue || '').trim();
    row.decision = 'zamítnut ručně';
    showToast(t('toast.topic.rejected', { topic: TOPIC_LABELS[topicId] || topicId, key: task.key }));
  }
  if (topicId === 'specialista') {
    task.specialistaDecision = row.decision;
  }
  saveProgress();
  if (state.activeKey === task.key) renderDetail();
  updateTopicRepairModalUI();
}

function applyTopicRepairSelected() {
  const topicRepairState = state.topicRepairState;
  if (!topicRepairState) return;
  let applied = 0;
  for (const task of topicRepairState.tasks) {
    if (!task.checked || !hasMeaningfulValue(task.candidateValue)) continue;
    state.translated[task.key] = state.translated[task.key] || {};
    state.translated[task.key][task.topicId] = task.candidateValue;
    applied++;
  }
  if (applied > 0) {
    saveProgress();
    renderList();
    if (state.activeKey) renderDetail();
    updateStats();
    updateFailedCount();
    log(`✓ Potvrzeno přepsání témat v opravě: ${applied} řádků`);
  }
  state.selectedKeys.clear();
  renderList();
  const eligible = topicRepairState.tasks.filter(t => hasMeaningfulValue(t.candidateValue));
  const checkedOk = topicRepairState.tasks.filter(t => t.checked && hasMeaningfulValue(t.candidateValue));
  if (applied === 0) {
    if (eligible.length && !checkedOk.length) {
      showToast(t('toast.topicRepair.checkValidRows'));
    } else if (!eligible.length) {
      showToast(t('toast.topicRepair.noValidProposal'));
    } else {
      showToast(t('toast.topicRepair.nothingMarked'));
    }
  } else {
    const keysInModal = [...new Set(topicRepairState.tasks.map(t => t.key))];
    const allTopicsOk = keysInModal.every(k => getFailedTopicsForFallback(state.translated[k] || {}).length === 0);
    if (allTopicsOk) {
      showToast(t('toast.topic.overwrittenAndClosing', { count: applied }));
      stopTopicRepairTicker();
      state.topicRepairState.closed = true;
      closeTopicRepairModalSafe();
      state.topicRepairState = null;
      const miniBtn = document.getElementById('btnTopicRepairMini');
      if (miniBtn) {
        miniBtn.style.display = 'none';
        miniBtn.classList.remove('topicRepairMiniBusy');
      }
    } else {
      showToast(t('toast.topic.overwritten.count', { count: applied }));
    }
  }
  syncTopicRepairMinimizeBusyIndicator();
}

function closeTopicRepairModalOnly() {
  closeTopicRepairModalSafe();
}

function minimizeTopicRepairModal() {
  if (!state.topicRepairState) return;
  state.topicRepairState.minimized = true;
  closeTopicRepairModalSafe();
  const miniBtn = document.getElementById('btnTopicRepairMini');
  if (miniBtn) miniBtn.style.display = 'inline-block';
  syncTopicRepairMinimizeBusyIndicator();
}

function restoreTopicRepairModal() {
  if (!state.topicRepairState) return;
  state.topicRepairState.minimized = false;
  renderTopicRepairModal();
  const miniBtn = document.getElementById('btnTopicRepairMini');
  if (miniBtn) miniBtn.style.display = 'none';
  syncTopicRepairMinimizeBusyIndicator();
  if (!state.topicRepairWorkerRunning && !state.topicRepairState.paused && state.topicRepairState.sequentialEverStarted && state.topicRepairState.repairStrategy === 'sequential') {
    processTopicRepairQueue();
  }
}

function resolveProviderForInteractiveAction(preferredProv = '') {
  const normalizedPreferred = String(preferredProv || '').trim();
  const order = ['groq', 'gemini', 'openrouter'];
  if (normalizedPreferred && isAutoProviderEnabled(normalizedPreferred)) return normalizedPreferred;
  const firstEnabled = order.find(p => isAutoProviderEnabled(p));
  return firstEnabled || normalizedPreferred || 'groq';
}

function resolveMainBatchProvider(preferredProv = '') {
  const preferred = resolveProviderForInteractiveAction(preferredProv);
  const order = ['groq', 'gemini', 'openrouter'];
  if (isAutoProviderEnabled('groq') && getApiKeyForModelTest('groq')) return 'groq';
  const firstReady = order.find(p => isAutoProviderEnabled(p) && !!getApiKeyForModelTest(p));
  return firstReady || preferred;
}

function filterList() {
  renderList();
  if (state.virtualInitialized) {
    const scroll = document.getElementById('listScroll');
    scroll.scrollTop = 0;
  }
}

// Debounced varianta pro oninput (zabráni překreslení celého listu na každý znak)
const filterListDebounced = debounce(filterList, 180);

function hasMeaningfulValue(v) {
  const s = String(v || '').trim();
  return !!s && s !== '—' && s !== '(přeskočeno)';
}

/** Anglická část za „Originál:“ nesmí označit celou definici jako EN (běžné u CZ+AS dvojice). */
function stripDefinitionOriginReferenceTail(text) {
  const s = String(text || '');
  const m = s.match(/\bOriginál\s*:/iu);
  if (!m || m.index === undefined || m.index <= 0) return s.trim();
  return s.slice(0, m.index).trim();
}

function isDefinitionLikelyEnglish(text) {
  const s = stripDefinitionOriginReferenceTail(String(text || '').trim());
  if (!s) return false;
  const markers = [
    /\bwithout\b/i,
    /\bwith\b/i,
    /\bnot\b/i,
    /\bgood(?:ness)?\b/i,
    /\bto do\b/i,
    /\bjoy\b/i,
    /\bfrom\b/i,
    /\bmetaphor(?:ically)?\b/i,
    /\bsee word\b/i,
    /\bweight\b/i
  ];
  return markers.some(re => re.test(s));
}

function isDefinitionLowQuality(text) {
  const s = String(text || '').trim();
  if (!s) return true;
  if (isDefinitionLikelyEnglish(s)) return true;
  // UI artefakty nebo technický šum místo definice.
  if (/(🤖|✎|prompt|upravit|edit|button|klik)/i.test(s)) return true;
  // Definice má být věcná; krátké, ale smysluplné formulace nechceme trestat.
  const words = s.split(/\s+/).filter(Boolean);
  const hasStructure = /[,:;()]/.test(s);
  const hasCzechDiacritics = /[áčďéěíňóřšťúůýž]/i.test(s);
  if (words.length < 4) return true;
  if (s.length < 30 && !hasStructure) return true;
  if (words.length < 6 && s.length < 45 && !hasStructure && !hasCzechDiacritics) return true;
  return false;
}

function isTranslationComplete(t) {
  if (!t || t.skipped) return false;
  if (isDefinitionLowQuality(t.definice)) return false;
  const required = ['definice', 'pouziti', 'puvod', 'kjv', 'specialista'];
  return required.every(field => hasMeaningfulValue(t[field]));
}

function hasAnyTranslationContent(t) {
  if (!t || t.skipped) return false;
  const fields = ['vyznam', 'definice', 'pouziti', 'puvod', 'kjv', 'specialista'];
  return fields.some(field => hasMeaningfulValue(t[field]));
}

function getTranslationStateForKey(key) {
  const t = state.translated[key];
  if (!t || t.skipped) return 'pending';
  if (isTranslationComplete(t)) return 'done';
  if (!hasAnyTranslationContent(t)) return 'failed';
  const missingTopics = getFailedTopicsForFallback(t);
  if (missingTopics.length > 0 && missingTopics.length <= 2) return 'missing_topic';
  return 'failed_partial';
}

function fillMissingVyznamFromSource(keys) {
  if (!Array.isArray(keys)) return;
  for (const key of keys) {
    const t = state.translated[key];
    if (!t || hasMeaningfulValue(t.vyznam)) continue;
    const e = state.entryMap.get(key);
    const fallback = String(e?.vyznamCz || e?.cz || '').trim();
    if (fallback) {
      t.vyznam = fallback;
    }
  }
}

function fillMissingKjvFromSource(keys) {
  if (!Array.isArray(keys)) return;
  for (const key of keys) {
    const t = state.translated[key];
    if (!t || hasMeaningfulValue(t.kjv)) continue;
    const e = state.entryMap.get(key);
    const fallback = String(e?.kjv || '').trim();
    if (fallback) {
      t.kjv = `${fallback} [POZN.: v angličtině ze vstupu]`;
    }
  }
}

function annotateEnglishDefinitionsInTranslated(keys) {
  if (!Array.isArray(keys)) return;
  for (const key of keys) {
    const t = state.translated[key];
    if (!t) continue;
    if (!isDefinitionLikelyEnglish(t.definice)) continue;
    const original = String(t.definice || '').trim();
    if (!original) continue;
    if (/\[POZN\.: text je v angličtině - špatný překlad\]/.test(original)) continue;
    t.definice = `${original} [POZN.: text je v angličtině - špatný překlad]`;
  }
}

function applyFallbacksToParsedMap(keys, parsedMap) {
  if (!Array.isArray(keys) || !parsedMap || typeof parsedMap !== 'object') return;
  for (const key of keys) {
    const t = parsedMap[key];
    if (!t) continue;
    const e = state.entryMap.get(key);
    if (!hasMeaningfulValue(t.vyznam)) {
      const vyznamFallback = String(e?.vyznamCz || e?.cz || '').trim();
      if (vyznamFallback) t.vyznam = vyznamFallback;
    }
    if (!hasMeaningfulValue(t.kjv)) {
      const kjvFallback = String(e?.kjv || '').trim();
      if (kjvFallback) t.kjv = `${kjvFallback} [POZN.: v angličtině ze vstupu]`;
    }
    if (isDefinitionLikelyEnglish(t.definice)) {
      t.definice = `${String(t.definice || '').trim()} [POZN.: text je v angličtině - špatný překlad]`.trim();
    }
  }
}

function tryNormalizeNumberedOpenRouterResponse(raw, keys) {
  const text = String(raw || '').trim();
  if (!text) return null;
  if (/###\s*[GH]?\d+\s*###/i.test(text)) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const headerLine = lines.find(l => /^(?:\d+\.)?\s*[GH]\d+\b/i.test(l));
  if (!headerLine) return null;
  const keyMatch = headerLine.match(/([GH]\d+)/i);
  if (!keyMatch) return null;
  const foundKey = keyMatch[1].toUpperCase();
  if (Array.isArray(keys) && keys.length && !keys.includes(foundKey)) return null;

  const defLine = lines.find(l => /^DEF\s*:/i.test(l) || /^\d+\.\s*.*\|.*$/i.test(l) || /^\d+\.\s*[^\n]+$/i.test(l));
  const specialistaTail = lines.slice(Math.max(0, lines.length - 6)).join(' ');
  const normalized = [
    `###${foundKey}###`,
    `VYZNAM:`,
    `DEFINICE: ${defLine ? defLine.replace(/^\d+\.\s*/, '').replace(/^DEF\s*:/i, '').trim() : text.slice(0, 600)}`,
    `POUZITI:`,
    `PUVOD:`,
    `KJV:`,
    `SPECIALISTA: ${specialistaTail || ''}`
  ].join('\n');
  return normalized;
}

function parseWithOpenRouterNormalization(raw, keys, targetObj) {
  const missingOriginal = parseTranslationsCore(raw, keys, targetObj);
  if (!Array.isArray(missingOriginal) || missingOriginal.length === 0) {
    return { missing: missingOriginal || [], normalizedUsed: false, normalizedText: '' };
  }
  const normalized = tryNormalizeNumberedOpenRouterResponse(raw, keys);
  if (!normalized) {
    return { missing: missingOriginal, normalizedUsed: false, normalizedText: '' };
  }
  const missingAfterNorm = parseTranslationsCore(normalized, keys, targetObj);
  return {
    missing: Array.isArray(missingAfterNorm) ? missingAfterNorm : missingOriginal,
    normalizedUsed: (missingAfterNorm || []).length < missingOriginal.length,
    normalizedText: normalized
  };
}

function getStrongKeyNumber(key) {
  const normalized = String(key || '').trim();
  const match = normalized.match(/^(?:[GH])?(\d+)$/i);
  if (!match) return Number.POSITIVE_INFINITY;
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function getFilteredEntries() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const statusFilter = document.getElementById('filterStatus')?.value || 'all';
  const sortBy = document.getElementById('filterSort')?.value || 'original';
  
  let lang = 'all';
  let status = 'all';
  
  if (statusFilter.startsWith('g_')) {
    lang = 'G';
    status = statusFilter.slice(2);
  } else if (statusFilter.startsWith('h_')) {
    lang = 'H';
    status = statusFilter.slice(2);
  } else {
    status = statusFilter;
  }
  
  let filtered = state.entries.filter(e => {
    if (state.listRangeFilter) {
      const n = getStrongKeyNumber(e.key);
      if (!Number.isFinite(n) || n < state.listRangeFilter.from || n > state.listRangeFilter.to) return false;
    }
    const matchesSearch = !q || e.key.toLowerCase().includes(q) || 
      e.greek.toLowerCase().includes(q) || (e.definice || e.def || '').toLowerCase().includes(q);
    if (!matchesSearch) return false;
    
    const translationState = getTranslationStateForKey(e.key);
    
    if (lang === 'G' && !e.key.startsWith('G')) return false;
    if (lang === 'H' && !e.key.startsWith('H')) return false;
    
    if (status === 'pending') return translationState === 'pending';
    if (status === 'done') return translationState === 'done';
    if (status === 'failed') return translationState === 'failed' || translationState === 'failed_partial';
    if (status === 'missing_topic') return translationState === 'missing_topic';
    
    return true;
  });
  
  if (sortBy === 'greek') {
    filtered.sort((a, b) => a.greek.localeCompare(b.greek));
  } else if (sortBy === 'original') {
    filtered.sort((a, b) => {
      // Safely get index without findIndex loop
      let idxA, idxB;
      if (window._entryIndexMap?.has(a.key)) {
        idxA = window._entryIndexMap.get(a.key);
        idxB = window._entryIndexMap.get(b.key);
      } else {
        // Fallback: use binary search if map exists, else linear
        idxA = window._entryIndexMap ? state.entries.findIndex(x => x.key === a.key) : state.entries.indexOf(a);
        idxB = window._entryIndexMap ? state.entries.findIndex(x => x.key === b.key) : state.entries.indexOf(b);
      }
      return idxA - idxB;
    });
  } else {
    filtered.sort((a, b) => {
      const numA = getStrongKeyNumber(a.key);
      const numB = getStrongKeyNumber(b.key);
      if (numA !== numB) return numA - numB;
      return a.key.localeCompare(b.key);
    });
  }
  
  return filtered;
}

function filterMissingTopicsList() {
  const filterEl = document.getElementById('filterStatus');
  if (filterEl) filterEl.value = 'missing_topic';
  renderList();
  showToast(t('toast.filter.missingTopic'));
}

function scrollToActive() {
  const el = document.querySelector(`.list-item[data-key="${state.activeKey}"]`);
  if (el) el.scrollIntoView({ block: 'nearest' });
}

// Virtual scrolling infrastructure
function initVirtualScroll() {
  const scroll = document.getElementById('listScroll');
  // Create the structural elements
  state.phantomSpacer = document.createElement('div');
  state.phantomSpacer.className = 'phantom-spacer';
  state.visibleContainer = document.createElement('div');
  state.visibleContainer.className = 'visible-items';
  
  // Reset container and append new structure
  scroll.innerHTML = '';
  scroll.appendChild(state.phantomSpacer);
  scroll.appendChild(state.visibleContainer);
  scroll.style.position = 'relative';
  
  // Attach scroll listener (remove old to avoid duplicates)
  scroll.removeEventListener('scroll', onVirtualScroll);
  scroll.addEventListener('scroll', onVirtualScroll, { passive: true });
  
  state.virtualInitialized = true;
  updatePhantomHeight();
  
  // Add window resize handler (once)
  if (!window._virtualScrollResizeAdded) {
    window.addEventListener('resize', () => {
      if (!state.resizeTicking) {
        requestAnimationFrame(() => {
          renderVisible();
          state.resizeTicking = false;
        });
        state.resizeTicking = true;
      }
    });
    window._virtualScrollResizeAdded = true;
  }
}

function updatePhantomHeight() {
  if (!state.phantomSpacer) return;
  const total = state.filteredKeys.length;
  state.phantomSpacer.style.height = `${total * ITEM_HEIGHT}px`;
}

function renderVisible() {
  if (!state.visibleContainer || !state.virtualInitialized) return;
  
  const scroll = document.getElementById('listScroll');
  const scrollTop = scroll.scrollTop;
  let viewportHeight = scroll.clientHeight;
  const total = state.filteredKeys.length;
  
  if (total === 0) {
    state.visibleContainer.innerHTML = '';
    state.lastRenderRange = { start: -1, end: -1 };
    return;
  }
  
  // Fix: Ensure minimum viewport height on first load
  if (viewportHeight < 100) {
    viewportHeight = 300;
  }
  
  let startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_ITEMS);
  let endIndex = Math.min(total - 1, Math.ceil((scrollTop + viewportHeight) / ITEM_HEIGHT) + BUFFER_ITEMS);
  
  // Force render first time or if range is invalid
  if (state.lastRenderRange.start === -1 || endIndex - startIndex < 5) {
    startIndex = 0;
    endIndex = Math.min(total - 1, Math.ceil(viewportHeight / ITEM_HEIGHT) + BUFFER_ITEMS);
  }
  
  
  if (startIndex === state.lastRenderRange.start && endIndex === state.lastRenderRange.end) {
    // Still need to check if translation status changed
    const needsUpdate = [...Array(endIndex - startIndex + 1)].some((_, idx) => {
      const key = state.filteredKeys[startIndex + idx];
      if (!key) return false;
      const translationState = getTranslationStateForKey(key);
      const prev = state.lastRenderRange.doneStates?.[key];
      return prev !== state;
    });
    if (!needsUpdate) return;
  }
  
  const doneStates = {};
  
  const fragment = document.createDocumentFragment();
  
  for (let i = startIndex; i <= endIndex; i++) {
    const key = state.filteredKeys[i];
    if (!key) continue;
    const e = state.entryMap.get(key);
    if (!e) continue;
    const translationState = getTranslationStateForKey(key);
    const done = state === 'done';
    doneStates[key] = state;
    
    const isSelected = state.selectedKeys.has(key);
    
    const div = document.createElement('div');
    div.className = 'list-item' + (done ? ' done' : '') + (key === state.activeKey ? ' active' : '') + (isSelected ? ' selected' : '');
    div.dataset.key = key;
    div.setAttribute('tabindex', '0');
    div.style.position = 'absolute';
    div.style.left = '0';
    div.style.right = '0';
    div.style.top = `${i * ITEM_HEIGHT}px`;
    div.style.height = `${ITEM_HEIGHT}px`;
    div.onclick = (e) => {
      if (e.target.classList.contains('li-check')) return;
      showDetail(key);
    };
    div.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSelect(key, e);
      }
    };
    div.innerHTML = `
      <input type="checkbox" class="li-check" ${isSelected ? 'checked' : ''} onclick="toggleSelect('${key}', event)" aria-label="${escHtml(t('list.entry.checkbox', { key }))}">
      <div class="li-key">${key}</div>
      <div class="li-greek">${escHtml(e.greek)}</div>
      <div class="li-dot ${state === 'done' ? 'done' : (state === 'pending' ? 'pending' : (state === 'missing_topic' ? 'missing-topic' : 'failed'))}" aria-hidden="true">${state === 'done' ? '✓' : '•'}</div>
    `;
    fragment.appendChild(div);
  }
  
  state.lastRenderRange = { start: startIndex, end: endIndex, doneStates };
  state.visibleContainer.innerHTML = '';
  state.visibleContainer.appendChild(fragment);
}

// Throttled scroll handler
function onVirtualScroll() {
  if (!state.scrollTicking) {
    requestAnimationFrame(() => {
      renderVisible();
      state.scrollTicking = false;
    });
    state.scrollTicking = true;
  }
}

// ══ DETAIL ═══════════════════════════════════════════════════════
function showDetail(key) {
  state.activeKey = key;
  // Update active state v listu (virtuální render) - bez scrollování
   if (state.virtualInitialized) {
     requestAnimationFrame(() => {
       if (state.virtualInitialized) renderVisible();
     });
   } else {
    // Fallback pro ne-inicializovaný virtuální scrolling
    document.querySelectorAll('.list-item').forEach(el => {
      el.classList.toggle('active', el.dataset.key === key);
    });
  }
  renderDetail();
}

function renderDetail() {
  if (!state.activeKey) return;
  const e = state.entryMap.get(state.activeKey);
  if (!e) return;
  const tr = state.translated[state.activeKey];
  const hasTranslation = isTranslationComplete(tr);
  const pane = document.getElementById('detailPane');
  const detailLabel = {
    studyLinks: t('detail.label.studyLinks'),
    transliteration: t('detail.label.transliteration'),
    grammar: t('detail.label.grammar'),
    definitionEn: t('detail.label.definitionEn'),
    englishSource: t('detail.label.englishSource'),
    kjv: t('detail.label.kjv'),
    usageKjv: t('detail.label.usageKjv'),
    vocalization: t('detail.label.vocalization'),
    pronunciation: t('detail.label.pronunciation'),
    etymology: t('detail.label.etymology'),
    occurrence: t('detail.label.occurrence'),
    twot: t('detail.label.twot'),
    notes: t('detail.label.notes'),
    greekRefs: t('detail.label.greekRefs'),
    category: t('detail.label.category'),
    meaningCz: t('detail.label.meaningCz')
  };

  // Detekce typu podle klíče
  const num = parseInt(state.activeKey.slice(1));
  const isGreek = state.activeKey.startsWith('G');
  const isHebrew = state.activeKey.startsWith('H') && num < 9000;
  const isGrammar = state.activeKey.startsWith('H') && num >= 9000;
  const definitionEn = (e.definice || e.def || '').trim();
  const englishSourceRaw = (e.en || e.enDef || '').trim();
  const englishSource = (englishSourceRaw && englishSourceRaw !== definitionEn) ? englishSourceRaw : '';
  const strongNum = state.activeKey.slice(1);
  const bibleHubPath = state.activeKey.startsWith('H') ? 'hebrew' : 'greek';
  const studyLinks = `
    <div class="orig-section">
      <div class="label">${detailLabel.studyLinks}</div>
      <div class="value">
        <a href="https://biblehub.com/${bibleHubPath}/${strongNum}.htm" target="_blank" rel="noopener noreferrer">BibleHub</a> ·
        <a href="https://www.blueletterbible.org/lexicon/${state.activeKey}/kjv/tr/0-1/" target="_blank" rel="noopener noreferrer">Blue Letter Bible</a> ·
        <a href="https://www.stepbible.org/?q=strong=${state.activeKey}" target="_blank" rel="noopener noreferrer">STEP Bible</a>
      </div>
    </div>`;
  const editableSourceSection = (label, field, value) => `
    <div class="orig-section">
      <div class="label">${label}</div>
      <div style="display:flex;gap:6px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div class="value" id="srcval-${state.activeKey}-${field}" style="margin:0;flex:1 1 auto">${escHtml(value || '—')}</div>
        <button class="tbox-btn" type="button" onclick="toggleSourceEntryEdit('${state.activeKey}','${field}')">✎ Upravit</button>
      </div>
      <div class="tbox-edit" id="srcedit-${state.activeKey}-${field}">
        <textarea id="srcinput-${state.activeKey}-${field}" aria-label="${label}">${escHtml(value || '')}</textarea>
        <button class="tbox-save" type="button" onclick="saveSourceEntryField('${state.activeKey}','${field}')">Uložit</button>
      </div>
    </div>`;
  
  // Sestavení sekcí podle typu
  let sections = '';
  
  if (isGreek) {
    sections = `
    ${editableSourceSection('Beta Code', 'beta', e.beta)}
    ${editableSourceSection(detailLabel.transliteration, 'prepis', e.prepis)}
    ${editableSourceSection(detailLabel.grammar, 'tvaroslovi', e.tvaroslovi)}
    ${editableSourceSection(detailLabel.definitionEn, 'definice', e.definice || e.def)}
    ${englishSource ? `
    <div class="orig-section">
      <div class="label">${detailLabel.englishSource}</div>
      <div class="value">${escHtml(englishSource)}</div>
    </div>` : ''}
    ${editableSourceSection(detailLabel.kjv, 'kjv', e.kjv)}
    ${editableSourceSection(detailLabel.usageKjv, 'vyskyt', e.vyskyt)}
    ${studyLinks}`;
  } else if (isHebrew) {
    sections = `
    <div class="orig-section">
      <div class="label">${detailLabel.vocalization}</div>
      <div class="value">${escHtml(e.vokalizace || '—')}</div>
    </div>
    <div class="orig-section">
      <div class="label">${detailLabel.pronunciation}</div>
      <div class="value">${escHtml(e.vyslovnost || '—')}</div>
    </div>
    <div class="orig-section">
      <div class="label">${detailLabel.etymology}</div>
      <div class="value">${escHtml(e.etimol || e.orig || '—')}</div>
    </div>
    ${editableSourceSection(detailLabel.transliteration, 'prepis', e.prepis)}
    ${editableSourceSection(detailLabel.grammar, 'tvaroslovi', e.tvaroslovi)}
    ${editableSourceSection(detailLabel.definitionEn, 'definice', e.definice || e.def)}
    ${englishSource ? `
    <div class="orig-section">
      <div class="label">${detailLabel.englishSource}</div>
      <div class="value">${escHtml(englishSource)}</div>
    </div>` : ''}
    ${editableSourceSection(detailLabel.kjv, 'kjv', e.kjv)}
    ${editableSourceSection(detailLabel.occurrence, 'vyskyt', e.vyskyt)}
    <div class="orig-section">
      <div class="label">${detailLabel.twot}</div>
      <div class="value">${escHtml(e.twot || '—')}</div>
    </div>
    <div class="orig-section">
      <div class="label">${detailLabel.notes}</div>
      <div class="value">${escHtml(e.poznamky || '—')}</div>
    </div>
    <div class="orig-section">
      <div class="label">${detailLabel.greekRefs}</div>
      <div class="value">${escHtml(e.greekRefs || '—')}</div>
    </div>
    ${studyLinks}`;
  } else if (isGrammar) {
    sections = `
    <div class="orig-section">
      <div class="label">${detailLabel.vocalization}</div>
      <div class="value">${escHtml(e.vokalizace || '—')}</div>
    </div>
    <div class="orig-section">
      <div class="label">${detailLabel.category}</div>
      <div class="value">${escHtml(e.kategorie || '—')}</div>
    </div>
    <div class="orig-section">
      <div class="label">${detailLabel.meaningCz}</div>
      <div class="value">${escHtml(e.vyznamCz || '—')}</div>
    </div>
    ${editableSourceSection(detailLabel.transliteration, 'prepis', e.prepis)}
    ${editableSourceSection(detailLabel.grammar, 'tvaroslovi', e.tvaroslovi)}
    ${editableSourceSection(detailLabel.definitionEn, 'definice', e.definice || e.def)}
    ${englishSource ? `
    <div class="orig-section">
      <div class="label">${detailLabel.englishSource}</div>
      <div class="value">${escHtml(englishSource)}</div>
    </div>` : ''}
    ${studyLinks}`;
  } else {
    // Fallback pro starý formát
    sections = `
    ${editableSourceSection(detailLabel.definitionEn, 'definice', e.definice || e.def)}
    ${editableSourceSection(detailLabel.kjv, 'kjv', e.kjv)}
    ${studyLinks}`;
  }

  pane.innerHTML = `
    <div class="entry-header">
      <div class="entry-key">${e.key}</div>
      <div class="entry-greek">${escHtml(e.greek)}</div>
      <div class="entry-status ${hasTranslation ? 'done' : ''}">${hasTranslation ? '✓' : '—'}</div>
      <button class="hbtn" style="margin-left:8px;font-size:10px;padding:3px 8px" onclick="openSystemPromptModal('${e.key}')" title="${escHtml(t('detail.systemPrompt.title'))}">${t('detail.systemPrompt.button')}</button>
    </div>

    ${sections}

    ${!hasTranslation ? `<button class="translate-btn" onclick="translateSingle('${e.key}')">${t('detail.translateThis')}</button>` : ''}

    ${renderTranslation(e.key, tr)}
  `;
}

function renderTranslation(key, tr) {
  refreshTopicLabels();
  const e = state.entryMap.get(key) || {};
  const sourceCzDef = String(e.czDef || '').trim();
  const translatedDef = String(tr?.definice || '').trim();
  const looksEnglish = /(\bin general\b|\bused of\b|\bin itself\b|\bthat which\b|\bopposite to\b|\bwhere it is contrasted\b|\bsee word\b|\bSYN\.:|\bchiefly for\b)/i.test(translatedDef);
  const hasDetailedTranslatedDef = translatedDef.length >= 80 && /(\b1\.\b|\b2\.\b|[a-z]\)|\(|\[)/i.test(translatedDef);
  const shouldPreferSourceDef = hasMeaningfulValue(sourceCzDef) && (looksEnglish || !hasDetailedTranslatedDef);
  const definitionDisplay = shouldPreferSourceDef ? sourceCzDef : translatedDef;
  
  const sections = [
    { 
      id: 'definice', 
      label: TOPIC_LABELS.definice, 
      field: definitionDisplay,
      rawField: null
    },
    { id: 'vyznam', label: TOPIC_LABELS.vyznam, field: tr?.vyznam },
    { id: 'kjv', label: TOPIC_LABELS.kjv, field: tr?.kjv },
    { id: 'pouziti', label: TOPIC_LABELS.pouziti, field: tr?.pouziti },
    { id: 'puvod', label: TOPIC_LABELS.puvod, field: tr?.puvod },
    { id: 'specialista', label: TOPIC_LABELS.specialista, field: tr?.specialista },
  ];

  return sections.map(s => `
    <div class="translation-box" role="group" aria-label="${s.label}">
      <div class="tbox-head">
        <div class="tbox-label">${s.label}</div>
        <div class="tbox-actions">
          <button class="tbox-btn" onclick="openTopicPromptModal('${key}','${s.id}')" aria-label="${escHtml(t('detail.promptButton.aria', { label: s.label }))}">${t('detail.promptButton')}</button>
          ${!hasMeaningfulValue(s.field) ? `<button class="tbox-btn" onclick="refillSingleField('${key}','${s.id}')" aria-label="Doplnit ${s.label} přes AI">✨ Doplnit</button>` : ''}
          <button class="tbox-btn" onclick="toggleEditSection('${key}','${s.id}')" aria-label="${escHtml(t('detail.editButton.aria', { label: s.label }))}">${t('detail.editButton')}</button>
        </div>
      </div>
      ${s.rawField ? `<div class="tbox-body" id="traw-${key}-${s.id}" style="color:var(--txt2);font-size:12px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--brd)">${escHtml(s.rawField)}</div>` : ''}
      <div class="tbox-body" id="tval-${key}-${s.id}" style="${s.rawField ? 'font-weight:bold;color:var(--acc3)' : ''}">${escHtml(s.field || '—')}</div>
      <div class="tbox-edit" id="tedit-${key}-${s.id}">
        <textarea id="tinput-${key}-${s.id}" aria-label="${s.label}">${escHtml(s.field || '')}</textarea>
        <button class="tbox-save" onclick="saveSection('${key}','${s.id}')" aria-label="Uložit ${s.label}">Uložit</button>
      </div>
    </div>
  `).join('');
}

function toggleEditSection(key, id) {
  const el = document.getElementById(`tedit-${key}-${id}`);
  el.classList.toggle('show');
  if (el.classList.contains('show')) {
    document.getElementById(`tinput-${key}-${id}`).focus();
  }
}

function saveSection(key, id) {
  const val = document.getElementById(`tinput-${key}-${id}`).value;
  if (!state.translated[key]) state.translated[key] = {};
  state.translated[key][id] = val;
  saveProgress();
  document.getElementById(`tval-${key}-${id}`).textContent = val || '—';
  document.getElementById(`tedit-${key}-${id}`).classList.remove('show');
}

function toggleSourceEntryEdit(key, field) {
  const el = document.getElementById(`srcedit-${key}-${field}`);
  if (!el) return;
  el.classList.toggle('show');
  if (el.classList.contains('show')) {
    const input = document.getElementById(`srcinput-${key}-${field}`);
    if (input) input.focus();
  }
}

function applySourceEntryEditsToEntries() {
  if (!state.sourceEntryEdits || typeof state.sourceEntryEdits !== 'object') return;
  for (const [key, patch] of Object.entries(state.sourceEntryEdits)) {
    if (!patch || typeof patch !== 'object') continue;
    const entry = state.entryMap.get(key);
    if (!entry) continue;
    for (const [field, value] of Object.entries(patch)) {
      entry[field] = String(value || '');
      if (field === 'definice') entry.def = entry[field];
    }
  }
}

function saveSourceEntryField(key, field) {
  const entry = state.entryMap.get(key);
  if (!entry) return;
  const input = document.getElementById(`srcinput-${key}-${field}`);
  if (!input) return;
  const next = String(input.value || '').trim();
  entry[field] = next;
  if (field === 'definice') entry.def = next;
  state.sourceEntryEdits[key] = state.sourceEntryEdits[key] || {};
  state.sourceEntryEdits[key][field] = next;
  saveProgress();
  updateStats();
  renderList();
  renderDetail();
  showToast('Upravené pole uloženo.');
}

async function refillSingleField(key, topicId) {
  const prov = resolveProviderForInteractiveAction(document.getElementById('provider').value);
  const model = prov === (document.getElementById('provider').value || '') ? document.getElementById('model').value : getPipelineModelForProvider(prov);
  const apiKey = getCurrentApiKey(prov);
  if (!apiKey) {
    showToast(t('toast.apiKey.enter'));
    return;
  }
  const prompt = buildTopicPrompt(key, topicId);
  try {
    const messages = [
      { role: 'system', content: SYSTEM_MESSAGE },
      { role: 'user', content: prompt }
    ];
    const raw = await callAIWithRetry(prov, apiKey, model, messages);
    const val = extractTopicValueFromAI(raw?.content || '', topicId, 'strict');
    if (!state.translated[key]) state.translated[key] = {};
    state.translated[key][topicId] = val || '—';
    saveProgress();
    renderDetail();
    renderList();
    updateStats();
    showToast(t('toast.field.filled', { topic: TOPIC_LABELS[topicId] || topicId }));
  } catch (e) {
    showToast(t('toast.error.withMessage', { message: e.message }));
  }
}

const TOPIC_LABELS = {
  vyznam: '',
  definice: '',
  pouziti: '',
  puvod: '',
  kjv: '',
  specialista: ''
};

function refreshTopicLabels() {
  const langTag = t('topic.langTag');
  TOPIC_LABELS.vyznam = `${t('topic.label.vyznam')} (${langTag})`;
  TOPIC_LABELS.definice = `${t('topic.label.definice')} (${langTag})`;
  TOPIC_LABELS.pouziti = `${t('topic.label.pouziti')} (${langTag})`;
  TOPIC_LABELS.puvod = `${t('topic.label.puvod')} (${langTag})`;
  TOPIC_LABELS.kjv = `${t('topic.label.kjv')} (${langTag})`;
  TOPIC_LABELS.specialista = `${t('topic.label.specialista')} (${langTag})`;
}
refreshTopicLabels();

const TOPIC_PROMPT_PRESET_MAP = {
  vyznam: 'preset_topic_vyznam',
  definice: 'preset_topic_definice',
  kjv: 'preset_topic_kjv',
  pouziti: 'preset_topic_pouziti',
  puvod: 'preset_topic_puvod',
  specialista: 'preset_topic_specialista'
};

const TOPIC_BATCH_PROMPT_PRESET_MAP = {
  vyznam: 'preset_topic_vyznam_batch',
  definice: 'preset_topic_definice_batch',
  kjv: 'preset_topic_kjv_batch',
  pouziti: 'preset_topic_pouziti_batch',
  puvod: 'preset_topic_puvod_batch',
  specialista: 'preset_topic_specialista_batch'
};

/** Pořadí témat při hromadné opravě „Vše“. */
const TOPIC_REPAIR_BULK_TOPIC_ORDER = ['definice', 'vyznam', 'kjv', 'pouziti', 'puvod', 'specialista'];

function defaultBulkListTopicFilter() {
  return { definice: true, vyznam: true, kjv: true, pouziti: true, puvod: true, specialista: true };
}

function getTopicRepairModalVisibleTasks(state) {
  if (!state || !Array.isArray(state.tasks)) return [];
  const bid = state.bulkTopicId || 'all';
  if (bid === 'all') {
    const m = state.bulkListTopicFilter || defaultBulkListTopicFilter();
    return state.tasks.filter(t => m[t.topicId] !== false);
  }
  return state.tasks.filter(t => t.topicId === bid);
}

/** Další čekající úloha v pořadí `topicRepairState.tasks`, ale jen pokud spadá do aktuálního filtru tématu. */
function findNextTopicRepairWaitingTask(state) {
  if (!state || !Array.isArray(state.tasks)) return null;
  const vset = new Set(getTopicRepairModalVisibleTasks(state));
  return state.tasks.find(t => t.status === 'waiting' && vset.has(t)) || null;
}

const TOPIC_REPAIR_BATCH_PROMPT_STORAGE_PREFIX = 'strong_topic_repair_batch_prompt_v1_';

function getTopicRepairBatchPromptStorageKey(topicId) {
  return `${TOPIC_REPAIR_BATCH_PROMPT_STORAGE_PREFIX}${topicId}`;
}

function applyPromptLanguageTokens(promptText) {
  const targetLang = localStorage.getItem('strong_target_lang') || 'cz';
  const sourceLang = localStorage.getItem('strong_source_lang') || 'gr';
  const langNames = {
    cz: 'češtiny',
    en: 'angličtiny',
    bg: 'bulharštiny',
    ch: 'čínštiny',
    sp: 'španělštiny',
    sk: 'slovenštiny',
    pl: 'polštiny',
    gr: 'řečtiny',
    he: 'hebrejštiny',
    both: 'řečtiny i hebrejštiny'
  };
  const targetName = langNames[targetLang] || 'češtiny';
  const sourceName = langNames[sourceLang] || 'řečtiny';
  return String(promptText || '')
    .replace(/{TARGET_LANG}/g, targetName)
    .replace(/{SOURCE_LANG}/g, sourceName);
}

function getDefaultBatchTopicPromptTemplate(topicId) {
  const promptType = TOPIC_BATCH_PROMPT_PRESET_MAP[topicId] || '';
  return String(getTopicPromptTemplateByPromptType(promptType) || '').trim();
}

function getTopicRepairBatchPromptTemplate(topicId) {
  const key = getTopicRepairBatchPromptStorageKey(topicId);
  const saved = String(localStorage.getItem(key) || '').trim();
  if (saved) return saved;
  return getDefaultBatchTopicPromptTemplate(topicId);
}

function saveTopicRepairBatchPromptDraft() {
  const topicRepairState = state.topicRepairState;
  if (!topicRepairState) return;
  const topicId = document.getElementById('topicRepairBulkTopicSelect')?.value || state.bulkTopicId || 'all';
  if (topicId === 'all') {
    showToast(t('toast.prompt.pickSpecificTopicSave'));
    return;
  }
  const ta = document.getElementById('topicRepairBatchPrompt');
  if (!ta) return;
  localStorage.setItem(getTopicRepairBatchPromptStorageKey(topicId), String(ta.value || ''));
  showToast(t('toast.batchPrompt.saved', { topic: TOPIC_LABELS[topicId] || topicId }));
}

function resetTopicRepairBatchPromptToDefault() {
  const topicRepairState = state.topicRepairState;
  if (!topicRepairState) return;
  const topicId = document.getElementById('topicRepairBulkTopicSelect')?.value || state.bulkTopicId || 'all';
  if (topicId === 'all') {
    showToast(t('toast.prompt.pickSpecificTopicReset'));
    return;
  }
  localStorage.removeItem(getTopicRepairBatchPromptStorageKey(topicId));
  const ta = document.getElementById('topicRepairBatchPrompt');
  if (ta) ta.value = applyPromptLanguageTokens(getDefaultBatchTopicPromptTemplate(topicId));
  showToast(t('toast.batchPrompt.reset', { topic: TOPIC_LABELS[topicId] || topicId }));
}

function refreshTopicRepairBatchPromptEditor() {
  const topicRepairState = state.topicRepairState;
  if (!topicRepairState) return;
  const topicId = document.getElementById('topicRepairBulkTopicSelect')?.value || state.bulkTopicId || 'all';
  state.bulkTopicId = topicId;
  const row = document.getElementById('topicRepairBulkListFilterRow');
  if (row) row.style.display = topicId === 'all' ? 'flex' : 'none';
  const ta = document.getElementById('topicRepairBatchPrompt');
  if (!ta) return;
  if (topicId === 'all') {
    ta.readOnly = true;
    ta.value =
      'Režim „Vše“: seznam řádků filtruješ zaškrtávkami výše. Hromadný překlad postupně použije uložený batch prompt (💾 Uložit prompt) pro každé zaškrtnuté téma — jedno téma vyber v seznamu, uprav text a ulož.';
  } else {
    ta.readOnly = false;
    ta.value = applyPromptLanguageTokens(getTopicRepairBatchPromptTemplate(topicId));
  }
  updateTopicRepairModalUI();
}

function toggleTopicRepairBulkListFilter(topicId, checked) {
  const topicRepairState = state.topicRepairState;
  if (!state || state.bulkTopicId !== 'all') return;
  state.bulkListTopicFilter = state.bulkListTopicFilter || defaultBulkListTopicFilter();
  state.bulkListTopicFilter[topicId] = !!checked;
  updateTopicRepairModalUI();
}

function buildTopicRepairBatchHeslaText(keys, topicId) {
  const list = Array.isArray(keys) ? keys : [];
  return list.map(key => {
    const e = state.entryMap.get(key) || {};
    return [
      `${e.key || key} | ${e.greek || ''}`,
      `DEF: ${e.definice || e.def || ''}`,
      e.kjv ? `KJV: ${e.kjv}` : '',
      e.orig ? `ORIG: ${e.orig}` : ''
    ].filter(Boolean).join('\n');
  }).join('\n\n---\n\n');
}

function getTopicBatchAiLabel(topicId) {
  return ({
    vyznam: 'VYZNAM',
    definice: 'DEFINICE',
    kjv: 'KJV',
    pouziti: 'POUZITI',
    puvod: 'PUVOD',
    specialista: 'SPECIALISTA'
  })[topicId] || 'VYZNAM';
}

function parseTopicRepairBatchResponse(rawText, topicId) {
  const text = normalizeAiTopicRawText(rawText).trim();
  if (!text) return {};
  const blocks = text.split(/\n(?=#{1,6}\s*[gGhH]\d+)/i);
  const out = {};
  const headerRe = /^#{2,6}\s*([gGhH])(\d+)\s*(?:#+\s*)?(?=\n|$|\r)/im;
  for (const block of blocks) {
    const b = String(block || '').trim();
    if (!b) continue;
    const header = b.match(headerRe);
    if (!header) continue;
    const key = (String(header[1] || '') + String(header[2] || '')).toUpperCase();
    const rest = b.slice(header.index + header[0].length).trim();
    let val = String(extractTopicValueFromAI(rest, topicId, 'strict') || '').trim();
    if (!hasMeaningfulValue(val)) {
      val = String(extractTopicValueFromAI(rest, topicId, 'loose') || '').trim();
    }
    if (hasMeaningfulValue(val)) out[key] = val;
  }
  return out;
}

/** Výřez bloku jednoho hesla z hromadné RAW odpovědi (pro parsování SPECIALISTA apod.). */
function extractTopicRepairBatchBlockForKey(rawText, key) {
  const text = String(normalizeAiTopicRawText(rawText) || '').trim();
  const upperKey = String(key || '').trim().toUpperCase();
  if (!text || !upperKey) return '';
  const blocks = text.split(/\n(?=#{1,6}\s*[gGhH]\d+)/i);
  const headerRe = /^#{2,6}\s*([gGhH])(\d+)\s*(?:#+\s*)?(?=\n|$|\r)/im;
  for (const block of blocks) {
    const b = String(block || '').trim();
    if (!b) continue;
    const header = b.match(headerRe);
    if (!header) continue;
    const k = (String(header[1] || '') + String(header[2] || '')).toUpperCase();
    if (k === upperKey) return b;
  }
  return '';
}

/** Naplní specialista* u tasku z libovolného RAW (dávka = jen blok ###G12###…). */
function syncTopicRepairTaskSpecialistaFromRaw(task, rawText) {
  if (!task) return;
  const baseline = state.translated[task.key] || {};
  const prevSpecialista = String(baseline.specialista || '').trim();
  let candidateSpecialista = String(extractTopicValueFromAI(rawText, 'specialista', 'strict') || '').trim();
  if (!hasMeaningfulValue(candidateSpecialista)) {
    candidateSpecialista = String(extractSpecialistaLooseFallback(rawText) || '').trim();
  }
  if (!hasMeaningfulValue(candidateSpecialista)) {
    candidateSpecialista = String(extractTopicValueFromAI(rawText, 'specialista', 'loose') || '').trim();
  }
  const normStrip = stripLeadingGHeaders(normalizeAiTopicRawText(rawText)).trim();
  const hdrTopics = scanRawForTopicHeaderTopicIds(rawText);
  const specHeader = hdrTopics.includes('specialista') || !!matchSpecialistaHeaderBlockStart(normStrip);
  task.specialistaInRaw = hasMeaningfulValue(candidateSpecialista) || specHeader;
  task.specialistaPreviousValue = prevSpecialista;
  task.specialistaCandidateValue = candidateSpecialista;
  if (specHeader && !hasMeaningfulValue(candidateSpecialista)) {
    log(`⚠ ${task.key} (dávka): v bloku je nadpis SPECIALISTA/alias, ale tělo se nepodařilo strojově vyčíst — viz konzole RAW.`);
  }
  state.translated[task.key] = state.translated[task.key] || {};
  if (shouldReplaceSpecialista(prevSpecialista, candidateSpecialista)) {
    state.translated[task.key].specialista = String(candidateSpecialista || '').trim();
    task.specialistaDecision = 'přijat (auto)';
  } else if (task.specialistaInRaw) {
    task.specialistaDecision = 'zamítnut (auto)';
  } else {
    task.specialistaDecision = '';
  }
}

async function waitTopicRepairSequentialIdle(maxMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const running = !!state.topicRepairState?.tasks?.some(t => t.status === 'running');
    const current = !!state.topicRepairState?.currentTask;
    if (!running && !current) return true;
    await sleep(120);
  }
  return false;
}

function syncTopicRepairBulkRunInputsToHidden() {
  const bIn = document.getElementById('topicRepairBulkBatchInput');
  const iIn = document.getElementById('topicRepairBulkIntervalInput');
  const hB = document.getElementById('batchSizeRun');
  const hI = document.getElementById('intervalRun');
  if (bIn && hB) {
    const n = Math.min(100, Math.max(1, parseInt(bIn.value, 10) || 10));
    bIn.value = String(n);
    hB.value = String(n);
  }
  if (iIn && hI) {
    const n = Math.min(600, Math.max(0, parseInt(iIn.value, 10) || 20));
    iIn.value = String(n);
    hI.value = String(n);
  }
  updateTopicRepairBulkRunSummarySpan();
}

function updateTopicRepairBulkRunSummarySpan() {
  const el = document.getElementById('topicRepairBulkRunSummary');
  if (!el) return;
  const bs = parseInt(document.getElementById('batchSizeRun')?.value, 10) || 10;
  const iv = parseInt(document.getElementById('intervalRun')?.value, 10) || 20;
  el.textContent = `jako AUTO: dávka ${bs} hesel · interval ${iv}s`;
}

function initTopicRepairBulkRunInputs() {
  const bIn = document.getElementById('topicRepairBulkBatchInput');
  const iIn = document.getElementById('topicRepairBulkIntervalInput');
  const hB = document.getElementById('batchSizeRun');
  const hI = document.getElementById('intervalRun');
  if (bIn && hB) bIn.value = String(Math.min(100, Math.max(1, parseInt(hB.value, 10) || 10)));
  if (iIn && hI) iIn.value = String(Math.min(600, Math.max(0, parseInt(hI.value, 10) || 20)));
  updateTopicRepairBulkRunSummarySpan();
}

/** Jedno téma — vnitřní smyčka dávek (režim „Vše“ i jedno téma z editoru). */
async function runTopicRepairBulkTranslationCore(state, topicId, promptTemplate, onlyFailed, bs) {
  const tasks = state.tasks.filter(t => t && t.topicId === topicId && t.includeBulk !== false);
  const picked = onlyFailed
    ? tasks.filter(t => t.status === 'failed' || !hasMeaningfulValue(t.candidateValue))
    : tasks;
  const keys = picked.map(t => t.key);
  if (!keys.length) return { count: 0 };

  const iv0 = parseInt(document.getElementById('intervalRun')?.value, 10) || 20;
  log(`⚡ Hromadná oprava „${TOPIC_LABELS[topicId] || topicId}“: ${keys.length} úloh, dávka ${bs}, interval ${iv0}s`);

  let processed = 0;
  const abortVersion = Number(state.topicRepairBulkAbortVersion || 0);
  while (processed < keys.length) {
    if (abortVersion !== Number(state.topicRepairBulkAbortVersion || 0)) break;
    const batchKeys = keys.slice(processed, processed + bs);
    const hesla = buildTopicRepairBatchHeslaText(batchKeys, topicId);
    const userContent = promptTemplate.includes('{HESLA}')
      ? promptTemplate.replace(/{HESLA}/g, hesla)
      : `${promptTemplate}\n\n${hesla}`;

    const prov = resolveMainBatchProvider(document.getElementById('provider')?.value || '');
    const model = getPipelineModelForProvider(prov) || document.getElementById('model')?.value;
    const apiKey = getCurrentApiKey(prov);
    if (!apiKey) {
      showToast(t('toast.apiKey.enterForProvider', { provider: prov }));
      throw new Error('missing_api_key');
    }

    const raw = await callAIWithRetry(prov, apiKey, model, [
      { role: 'system', content: SYSTEM_MESSAGE },
      { role: 'user', content: enforceSpecialistaFormat(userContent) }
    ]);
    if (abortVersion !== Number(state.topicRepairBulkAbortVersion || 0)) break;

    const rawText = String(raw?.content || '').trim();
    log(`📥 RAW AI batch oprava ${topicId}: vypsáno do konzole`);
    console.groupCollapsed(`🤖 RAW AI batch oprava ${topicId} (${prov}/${model})`);
    console.log(rawText || '(prázdná odpověď)');
    console.groupEnd();

    const parsedMap = parseTopicRepairBatchResponse(rawText, topicId);
    for (const key of batchKeys) {
      const task = state.tasks.find(t => t.key === key && t.topicId === topicId);
      if (!task) continue;
      const val = String(parsedMap[key] || '').trim();
      if (hasMeaningfulValue(val)) {
        task.candidateValue = val;
        task.provider = prov;
        task.status = 'done';
        task.error = '';
        task.checked = shouldAutoCheckTopicRepairTask(topicId, task.currentValue, val);
        const blockRaw = extractTopicRepairBatchBlockForKey(rawText, key) || rawText;
        syncTopicRepairTaskSpecialistaFromRaw(task, blockRaw);
      } else {
        task.status = 'failed';
        task.error = 'AI nevrátila hodnotu pro toto heslo (zkontroluj formát odpovědi).';
      }
    }

    saveProgress();
    updateTopicRepairModalUI();
    processed += batchKeys.length;

    if (processed < keys.length) {
      const interval = parseInt(document.getElementById('intervalRun')?.value, 10) || parseInt(document.getElementById('interval')?.value, 10) || 20;
      const stopAt = Date.now() + Math.max(0, interval) * 1000;
      while (Date.now() < stopAt) {
        if (abortVersion !== Number(state.topicRepairBulkAbortVersion || 0)) break;
        await sleep(250);
      }
    }
  }
  return { count: processed };
}

async function runTopicRepairBulkTranslation() {
  const topicRepairState = state.topicRepairState;
  if (!topicRepairState) return;
  if (state.topicRepairBulkRunning) {
    state.topicRepairBulkAbortVersion++;
    showToast('⏹ Zastavuji hromadný překlad...');
    return;
  }
  syncTopicRepairBulkRunInputsToHidden();
  const selTopic = document.getElementById('topicRepairBulkTopicSelect')?.value || state.bulkTopicId || 'all';
  state.bulkTopicId = selTopic;
  const onlyFailed = !!document.getElementById('topicRepairBulkOnlyFailed')?.checked;
  const bs = parseInt(document.getElementById('batchSizeRun')?.value, 10) || 10;

  const activeProvider = resolveMainBatchProvider(document.getElementById('provider')?.value || '');
  if (!isAutoProviderEnabled(activeProvider)) {
    showToast(t('toast.provider.enableOne'));
    return;
  }

  state.topicRepairBulkRunning = true;
  state.topicRepairBulkAbortVersion++;
  const bulkBtn = document.getElementById('topicRepairBulkRunBtn');
  if (bulkBtn) {
    bulkBtn.disabled = false;
    bulkBtn.textContent = '■ Zastavit hromadný překlad';
  }

  const wasPaused = !!state.paused;
  state.paused = true;
  const idleOk = await waitTopicRepairSequentialIdle();
  if (!idleOk) {
    showToast(t('toast.topicRepair.sequentialRunning'));
    state.paused = wasPaused;
    state.topicRepairBulkRunning = false;
    if (bulkBtn) {
      bulkBtn.disabled = false;
      bulkBtn.textContent = t('topicRepair.bulk.button');
    }
    return;
  }

  try {
    const iv0 = parseInt(document.getElementById('intervalRun')?.value, 10) || 20;

    if (selTopic === 'all') {
      const mask = state.bulkListTopicFilter || defaultBulkListTopicFilter();
      const topicsToRun = TOPIC_REPAIR_BULK_TOPIC_ORDER.filter(id => mask[id] !== false);
      if (!topicsToRun.length) {
        showToast(t('toast.topicRepair.pickTopicInAllMode'));
        return;
      }
      let ranAny = false;
      for (let ti = 0; ti < topicsToRun.length; ti++) {
        const topicId = topicsToRun[ti];
        const promptTemplate = applyPromptLanguageTokens(String(getTopicRepairBatchPromptTemplate(topicId) || '').trim());
        if (!promptTemplate) {
          log(`⚠ Přeskočeno téma ${topicId} — prázdný uložený batch prompt.`);
          continue;
        }
        const res = await runTopicRepairBulkTranslationCore(state, topicId, promptTemplate, onlyFailed, bs);
        if (res.count > 0) ranAny = true;
        if (ti < topicsToRun.length - 1 && iv0 > 0) await sleep(iv0 * 1000);
      }
      showToast(ranAny ? t('topicRepair.bulkAllDone', { count: topicsToRun.length }) : t('topicRepair.bulkAllNone'));
    } else {
      const promptTemplate = applyPromptLanguageTokens(String(document.getElementById('topicRepairBatchPrompt')?.value || '').trim());
      if (!promptTemplate) {
        showToast(t('toast.batchPrompt.empty'));
        return;
      }
      const res = await runTopicRepairBulkTranslationCore(state, selTopic, promptTemplate, onlyFailed, bs);
      if (res.count === 0) {
        showToast(t('toast.batchRun.nothingSelected'));
        return;
      }
      showToast(t('toast.topic.bulkDone', { topic: TOPIC_LABELS[selTopic] || selTopic, count: res.count }));
    }
  } catch (e) {
    if (e && e.message !== 'missing_api_key' && e.message !== 'topic_repair_bulk_aborted') {
      showToast(t('toast.error.withMessage', { message: (e.message || e) }));
    }
  } finally {
    state.paused = wasPaused;
    state.topicRepairBulkRunning = false;
    if (bulkBtn) {
      bulkBtn.disabled = false;
      bulkBtn.textContent = t('topicRepair.bulk.button');
    }
    updateTopicRepairModalUI();
    if (state.sequentialEverStarted && state.repairStrategy === 'sequential' && !state.paused && !state.topicRepairWorkerRunning) {
      processTopicRepairQueue();
    }
  }
}

function toggleTopicRepairBulkInclude(index, checked) {
  const topicRepairState = state.topicRepairState;
  if (!state || !topicRepairState.tasks[index]) return;
  topicRepairState.tasks[index].includeBulk = !!checked;
}

function setTopicRepairBulkIncludeAll(checked) {
  const topicRepairState = state.topicRepairState;
  if (!topicRepairState) return;
  for (const t of topicRepairState.tasks) t.includeBulk = !!checked;
  updateTopicRepairModalUI();
}

function getTopicPromptTemplateByPromptType(promptType) {
  const topicType = String(promptType || '').trim();
  if (!topicType || !topicType.startsWith('preset_topic_')) return '';
  return String(modelTestPromptCatalog?.[topicType]?.template || '').trim();
}

function getTopicPromptTemplate(topicId) {
  const promptType = TOPIC_PROMPT_PRESET_MAP[topicId] || '';
  const fromTopicPreset = getTopicPromptTemplateByPromptType(promptType);
  if (fromTopicPreset) return fromTopicPreset;
  return String(localStorage.getItem('strong_prompt') || DEFAULT_PROMPT || '').trim();
}

function syncTopicPromptTemplatesReport() {
  const mismatched = Object.entries(TOPIC_PROMPT_PRESET_MAP).filter(([topicId, promptType]) => {
    const fromCatalog = String(modelTestPromptCatalog?.[promptType]?.template || '').trim();
    const fromDetailBase = String(getTopicPromptTemplate(topicId) || '').trim();
    return !fromCatalog || fromCatalog !== fromDetailBase;
  });
  if (mismatched.length > 0) {
    log(`⚠ Topic prompt sync: ${mismatched.map(([topicId]) => topicId).join(', ')}`);
  } else {
    log('✓ Topic prompt sync: testy/detail jsou 1:1');
  }
}

function buildTopicPrompt(key, topicId) {
  const e = state.entryMap.get(key) || {};
  const topicLabel = TOPIC_LABELS[topicId] || topicId;
  const promptTemplate = getTopicPromptTemplate(topicId);
  const sourceText = [
    `${e.key || key} | ${e.greek || ''}`,
    `DEF: ${e.definice || e.def || ''}`,
    e.kjv ? `KJV: ${e.kjv}` : '',
    e.orig ? `ORIG: ${e.orig}` : ''
  ].filter(Boolean).join('\n');

  const specialistaDetailRule = topicId === 'specialista'
    ? `

POŽADAVEK NA STYL:
- Vrať detailní exegetický odstavec (3-5 vět), jako biblický specialista.
- Vysvětli význam slova v širším biblickém a teologickém kontextu.
- Bez odrážek, bez číslování, bez dalších polí.`
    : '';

  return `${enforceSpecialistaFormat(promptTemplate)}

---
TEĎ PŘELOŽ POUZE JEDNO TÉMA.
- Heslo: ${key}
- Pole: ${topicLabel} (${topicId})
- Vrať jen čistý text pro toto jedno pole bez dalších sekcí.

Zdrojová data:
${sourceText}
${specialistaDetailRule}`;
}

function openTopicPromptModal(key, topicId) {
  const topicLabel = TOPIC_LABELS[topicId] || topicId;
  const currentValue = String(state.translated?.[key]?.[topicId] || '').trim();
  state.topicPromptState = {
    key,
    topicId,
    prompt: buildTopicPrompt(key, topicId),
    currentValue
  };

  closeTopicPromptModal();
  const modal = document.createElement('div');
  modal.id = 'topicPromptModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:10020;padding:16px';
  modal.innerHTML = `
    <div style="width:min(980px,95vw);max-height:92vh;overflow:auto;background:var(--bg2);border:1px solid var(--brd);border-radius:8px;padding:16px">
      <h3 style="margin:0 0 10px 0;color:var(--acc)">${escHtml(t('topicPrompt.title', { topic: topicLabel, key }))}</h3>
      <div style="font-size:11px;color:var(--txt2);margin-bottom:8px">${t('topicPrompt.editBeforeSend')}</div>
      <textarea id="topicPromptInput" style="width:100%;min-height:220px;background:var(--bg3);border:1px solid var(--brd);border-radius:4px;color:var(--txt);padding:10px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.5"></textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="hbtn grn" id="topicPromptRunBtn" onclick="runTopicPromptAI()">${t('topicPrompt.send')}</button>
        <button class="hbtn" onclick="closeTopicPromptModal()">${t('topicPrompt.close')}</button>
      </div>
      <div style="margin-top:14px">
        <div style="font-size:11px;color:var(--txt2);margin-bottom:6px">${t('topicPrompt.currentFilled')}</div>
        <textarea id="topicPromptCurrentValue" readonly style="width:100%;min-height:120px;background:var(--bg);border:1px solid var(--brd);border-radius:4px;color:var(--txt2);padding:10px;font-family:inherit;font-size:13px;line-height:1.5"></textarea>
      </div>
      <div style="margin-top:14px">
        <div style="font-size:11px;color:var(--txt2);margin-bottom:6px">${t('topicPrompt.resultEditable')}</div>
        <textarea id="topicPromptResult" style="width:100%;min-height:180px;background:var(--bg3);border:1px solid var(--brd);border-radius:4px;color:var(--txt);padding:10px;font-family:inherit;font-size:13px;line-height:1.5" placeholder="${escHtml(t('topicPrompt.resultPlaceholder'))}"></textarea>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="hbtn grn" onclick="applyTopicPromptResult()">${t('topicPrompt.applyToField')}</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  const promptInput = document.getElementById('topicPromptInput');
  if (promptInput) promptInput.value = state.topicPromptState.prompt;
  const currentInput = document.getElementById('topicPromptCurrentValue');
  if (currentInput) currentInput.value = state.topicPromptState.currentValue || '—';
}

async function runTopicPromptAI() {
  if (!state.topicPromptState) return;
  const prov = resolveProviderForInteractiveAction(document.getElementById('provider').value);
  const model = prov === (document.getElementById('provider').value || '') ? document.getElementById('model').value : getPipelineModelForProvider(prov);
  const apiKey = getCurrentApiKey(prov);
  if (!apiKey) {
    showToast(t('toast.apiKey.enter'));
    return;
  }

  const promptInput = document.getElementById('topicPromptInput');
  const resultInput = document.getElementById('topicPromptResult');
  const runBtn = document.getElementById('topicPromptRunBtn');
  if (!promptInput || !resultInput || !runBtn) return;

  const customPrompt = promptInput.value.trim();
  if (!customPrompt) {
    showToast(t('toast.prompt.empty'));
    return;
  }

  runBtn.disabled = true;
  runBtn.textContent = t('topicPrompt.sending');
  try {
    const messages = [
      { role: 'system', content: SYSTEM_MESSAGE },
      { role: 'user', content: customPrompt }
    ];
    const raw = await callAIWithRetry(prov, apiKey, model, messages);
    const rawText = String(raw?.content || '').trim();
    resultInput.value = rawText;
    log(`🤖 Překlad tématu: ${getTranslationEngineLabel(raw, prov, model)}`);
    log(`📥 RAW AI ${state.topicPromptState.key}.${state.topicPromptState.topicId}: vypsáno do konzole`);
    console.groupCollapsed(`🤖 RAW AI ${state.topicPromptState.key}.${state.topicPromptState.topicId}`);
    console.log(rawText || '(prázdná odpověď)');
    console.groupEnd();
  } catch (e) {
    logError('runTopicPromptAI', e, { key: state.topicPromptState.key, topic: state.topicPromptState.topicId });
    showToast(t('toast.error.withMessage', { message: e.message }));
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = '▶ Odeslat AI';
  }
}

function applyTopicPromptResult() {
  if (!state.topicPromptState) return;
  const { key, topicId } = state.topicPromptState;
  const resultInput = document.getElementById('topicPromptResult');
  if (!resultInput) return;
  const rawAiText = String(resultInput.value || '');
  let val = extractTopicValueFromAI(rawAiText, topicId, 'strict');
  if (!hasMeaningfulValue(val)) {
    val = extractTopicValueFromAI(rawAiText, topicId, 'loose');
  }
  if (!hasMeaningfulValue(val)) {
    // Topic prompt muze vratit jen cisty text bez parser-safe hlavicky.
    val = normalizeAiTopicRawText(rawAiText);
  }
  val = String(val || '').trim();
  if (!hasMeaningfulValue(val)) {
    showToast(t('toast.prompt.empty'));
    return;
  }
  if (!state.translated[key]) state.translated[key] = {};
  const prevValue = String(state.translated[key]?.[topicId] || '').trim();
  if (topicId === 'definice' && isDefinitionLowQuality(val)) {
    showToast('⚠ Definice vypadá nekvalitně, ponechána původní hodnota.');
    return;
  }
  if (hasMeaningfulValue(prevValue) && !shouldReplaceTopicValue(topicId, prevValue, val)) {
    if (topicId === 'specialista') {
      showToast('⚠ Specialista není kvalitnější než aktuální text. Původní hodnota zůstala.');
    } else {
      showToast(`⚠ Pole ${TOPIC_LABELS[topicId] || topicId}: nový návrh není lepší, původní hodnota zůstala.`);
    }
    return;
  }
  const prevSpecialista = String(state.translated[key]?.specialista || '').trim();
  state.translated[key][topicId] = val;
  const candidateSpecialistaStrict = extractTopicValueFromAI(rawAiText, 'specialista', 'strict');
  const candidateSpecialistaLoose = extractTopicValueFromAI(rawAiText, 'specialista', 'loose');
  const candidateSpecialista = hasMeaningfulValue(candidateSpecialistaStrict) ? candidateSpecialistaStrict : candidateSpecialistaLoose;
  if (shouldReplaceSpecialista(prevSpecialista, candidateSpecialista)) {
    state.translated[key].specialista = String(candidateSpecialista || '').trim();
    log(`🧠 SPECIALISTA auto-upgrade ${key}: použit kvalitnější text z AI odpovědi`);
  }

  // Pokud AI vrátí i další témata, zkus je bezpečně sloučit (jen když jsou kvalitnější).
  const topicIds = ['vyznam', 'definice', 'pouziti', 'puvod', 'kjv', 'specialista'];
  for (const extraTopicId of topicIds) {
    if (extraTopicId === topicId) continue;
    const strictVal = extractTopicValueFromAI(rawAiText, extraTopicId, 'strict');
    const looseVal = extractTopicValueFromAI(rawAiText, extraTopicId, 'loose');
    const extraVal = String(hasMeaningfulValue(strictVal) ? strictVal : looseVal).trim();
    if (!hasMeaningfulValue(extraVal)) continue;
    if (extraTopicId === 'definice' && isDefinitionLowQuality(extraVal)) continue;
    const prevExtra = String(state.translated[key]?.[extraTopicId] || '').trim();
    if (hasMeaningfulValue(prevExtra) && !shouldReplaceTopicValue(extraTopicId, prevExtra, extraVal)) continue;
    state.translated[key][extraTopicId] = extraVal;
    log(`✨ DETAIL auto-merge ${key}.${extraTopicId}: aplikováno z jedné AI odpovědi`);
  }
  saveProgress();
  renderDetail();
  renderList();
  updateStats();
  closeTopicPromptModal();
  showToast(t('toast.topic.savedToField', { topic: TOPIC_LABELS[topicId] || topicId }));
}

function getSpecialistaQualityScore(text) {
  const t = String(text || '').trim();
  if (!hasMeaningfulValue(t)) return 0;
  let score = 0;
  const len = t.length;
  if (len >= 180) score += 2;
  if (len >= 300) score += 2;
  if (len >= 500) score += 1;
  const sentenceCount = t.split(/[.!?]+/).map(x => x.trim()).filter(Boolean).length;
  if (sentenceCount >= 2) score += 1;
  if (sentenceCount >= 3) score += 2;
  if (sentenceCount >= 5) score += 1;
  const biblicalHints = (t.match(/\b(Bůh|Kristus|Ježíš|evangelium|hřích|spása|soud|milost|víra|teolog|teologie|biblick|zjevení|žalm|job|přísloví|nový zákon|starý zákon)\b/gi) || []).length;
  score += Math.min(4, biblicalHints);
  const englishNoise = (t.match(/\b(the|and|which|used|only|without|see|word|in|of|to)\b/gi) || []).length;
  score -= Math.min(4, englishNoise);
  return score;
}

function shouldReplaceSpecialista(currentText, candidateText) {
  const next = String(candidateText || '').trim();
  if (!hasMeaningfulValue(next)) return false;
  const current = String(currentText || '').trim();
  if (!hasMeaningfulValue(current)) return true;
  const currentScore = getSpecialistaQualityScore(current);
  const nextScore = getSpecialistaQualityScore(next);
  if (nextScore > currentScore + 1) return true;
  if (nextScore === currentScore && next.length > current.length + 80) return true;
  return false;
}

function countCzDiacritics(text) {
  return (String(text || '').match(/[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g) || []).length;
}

function countEnglishNoiseWords(text) {
  return (String(text || '').match(/\b(the|and|which|used|only|without|see|word|in|of|to)\b/gi) || []).length;
}

function countBracketRefs(text) {
  return (String(text || '').match(/\[[^\]]{2,}\]/g) || []).length;
}

function scoreTopicRepairText(topicId, text) {
  const t = String(text || '').trim();
  if (!hasMeaningfulValue(t)) return { score: 0, notes: ['prázdné'] };
  const notes = [];
  let score = 0;

  if (topicId === 'definice') {
    const len = t.length;
    score += Math.min(6, Math.floor(len / 120));
    score += Math.min(3, countBracketRefs(t));
    score += Math.min(3, Math.floor(countCzDiacritics(t) / 6));
    if (isDefinitionLowQuality(t)) {
      score -= 8;
      notes.push('definice: nízká kvalita / příliš krátké');
    }
    if (isDefinitionLikelyEnglish(t)) {
      score -= 6;
      notes.push('definice: anglický nádech');
    }
    score -= Math.min(4, countEnglishNoiseWords(t));
    return { score, notes };
  }

  if (topicId === 'vyznam') {
    const words = t.split(/\s+/).filter(Boolean).length;
    score += Math.min(4, words);
    score += Math.min(3, Math.floor(countCzDiacritics(t) / 2));
    score -= Math.min(4, countEnglishNoiseWords(t));
    if (words > 14) {
      score -= 2;
      notes.push('význam: hodně dlouhý');
    }
    return { score, notes };
  }

  if (topicId === 'kjv') {
    score += Math.min(5, Math.floor(t.length / 40));
    score += Math.min(3, countBracketRefs(t));
    score += Math.min(3, Math.floor(countCzDiacritics(t) / 4));
    score -= Math.min(5, countEnglishNoiseWords(t));
    return { score, notes };
  }

  if (topicId === 'pouziti') {
    const refs = countBracketRefs(t);
    score += Math.min(6, refs * 2);
    score += Math.min(3, Math.floor(t.length / 80));
    score += Math.min(2, Math.floor(countCzDiacritics(t) / 6));
    score -= Math.min(4, countEnglishNoiseWords(t));
    if (refs === 0) notes.push('užití: málo odkazů []');
    return { score, notes };
  }

  if (topicId === 'puvod') {
    score += Math.min(5, Math.floor(t.length / 60));
    score += Math.min(3, Math.floor(countCzDiacritics(t) / 5));
    score -= Math.min(4, countEnglishNoiseWords(t));
    if (!/(řec|hebr|lat|sém|indoev|kořen|odvoz)/i.test(t)) notes.push('původ: chybí jazykový kontext');
    return { score, notes };
  }

  if (topicId === 'specialista') {
    const s = getSpecialistaQualityScore(t);
    score += s;
    notes.push(`specialista: skóre ${s}`);
    return { score, notes };
  }

  score += Math.min(6, Math.floor(t.length / 80));
  score -= Math.min(4, countEnglishNoiseWords(t));
  return { score, notes };
}

function verdictTopicRepairCompare(prevScore, nextScore) {
  if (!Number.isFinite(prevScore) || !Number.isFinite(nextScore)) return { label: 'nejasné', tone: 'var(--txt3)' };
  const d = nextScore - prevScore;
  if (nextScore <= 0 && prevScore > 0) return { label: 'horší', tone: 'var(--red)' };
  if (d >= 2) return { label: 'lepší', tone: 'var(--acc3)' };
  if (d <= -2) return { label: 'horší', tone: 'var(--red)' };
  return { label: 'podobné', tone: 'var(--txt3)' };
}

function formatTopicRepairQuickCompare(topicId, previousValue, candidateValue) {
  const prev = String(previousValue || '').trim();
  const next = String(candidateValue || '').trim();
  if (!hasMeaningfulValue(next)) {
    return `<div style="margin-top:6px;padding:8px;border:1px dashed var(--brd);border-radius:6px;background:var(--bg2);font-size:11px;color:var(--txt3)"><b>Analýza:</b> nelze porovnat (chybí nový návrh)</div>`;
  }
  const p = scoreTopicRepairText(topicId, prev);
  const n = scoreTopicRepairText(topicId, next);
  const v = verdictTopicRepairCompare(p.score, n.score);
  const notes = [...new Set([...(p.notes || []), ...(n.notes || [])])].slice(0, 3);
  const notesHtml = notes.length ? ` · ${notes.map(x => escHtml(x)).join(' · ')}` : '';
  return `<div style="margin-top:6px;padding:8px;border:1px solid var(--brd);border-radius:6px;background:var(--bg2);font-size:11px;color:var(--txt2)">
    <b>Analýza:</b> <span style="color:${v.tone};font-weight:bold">${escHtml(v.label)}</span>
    <span style="color:var(--txt3)">(skóre ${p.score} → ${n.score})</span>${notesHtml}
  </div>`;
}

function closeTopicPromptModal() {
  const modal = document.getElementById('topicPromptModal');
  if (modal) modal.remove();
}

function openSystemPromptModal(key) {
  const entry = state.entryMap.get(key);
  if (!entry) {
    showToast(t('toast.entry.notFound'));
    return;
  }
  const messages = buildPromptMessages([entry]);
  const systemText = String(messages.find(m => m.role === 'system')?.content || SYSTEM_MESSAGE || '').trim();
  const userText = String(messages.find(m => m.role === 'user')?.content || '').trim();
  state.systemPromptState = { key, systemText, userText };
  closeSystemPromptModal();
  const modal = document.createElement('div');
  modal.id = 'systemPromptModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:10020;padding:16px';
  modal.innerHTML = `
    <div style="width:min(980px,95vw);max-height:92vh;overflow:auto;background:var(--bg2);border:1px solid var(--brd);border-radius:8px;padding:16px">
      <h3 style="margin:0 0 10px 0;color:var(--acc)">${escHtml(t('systemPrompt.title', { key }))}</h3>
      <div style="font-size:11px;color:var(--txt2);margin-bottom:8px">${t('systemPrompt.editBeforeSend')}</div>
      <textarea id="systemPromptInput" style="width:100%;min-height:240px;background:var(--bg3);border:1px solid var(--brd);border-radius:4px;color:var(--txt);padding:10px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.5"></textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="hbtn grn" id="systemPromptRunBtn" onclick="runSystemPromptAI()">${t('systemPrompt.send')}</button>
        <button class="hbtn" onclick="closeSystemPromptModal()">${t('systemPrompt.close')}</button>
      </div>
      <div style="margin-top:14px">
        <div style="font-size:11px;color:var(--txt2);margin-bottom:6px">${t('systemPrompt.result')}</div>
        <textarea id="systemPromptResult" style="width:100%;min-height:180px;background:var(--bg3);border:1px solid var(--brd);border-radius:4px;color:var(--txt);padding:10px;font-family:inherit;font-size:13px;line-height:1.5" placeholder="${escHtml(t('systemPrompt.resultPlaceholder'))}"></textarea>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const inp = document.getElementById('systemPromptInput');
  if (inp) inp.value = userText || '';
}

async function runSystemPromptAI() {
  if (!state.systemPromptState) return;
  const { key, systemText } = state.systemPromptState;
  const prov = resolveProviderForInteractiveAction(document.getElementById('provider').value);
  const model = prov === (document.getElementById('provider').value || '') ? document.getElementById('model').value : getPipelineModelForProvider(prov);
  const apiKey = getCurrentApiKey(prov);
  if (!apiKey) {
    showToast(t('toast.apiKey.enter'));
    return;
  }
  const promptInput = document.getElementById('systemPromptInput');
  const resultInput = document.getElementById('systemPromptResult');
  const runBtn = document.getElementById('systemPromptRunBtn');
  if (!promptInput || !resultInput || !runBtn) return;
  const userPrompt = String(promptInput.value || '').trim();
  if (!userPrompt) {
    showToast(t('toast.prompt.empty'));
    return;
  }
  runBtn.disabled = true;
  runBtn.textContent = t('systemPrompt.sending');
  try {
    const raw = await callAIWithRetry(prov, apiKey, model, [
      { role: 'system', content: systemText || SYSTEM_MESSAGE },
      { role: 'user', content: userPrompt }
    ]);
    const rawText = String(raw?.content || '');
    resultInput.value = rawText.trim();
    const parsed = {};
    parseWithOpenRouterNormalization(rawText, [key], parsed);
    applyFallbacksToParsedMap([key], parsed);
    if (parsed[key]) {
      state.translated[key] = { ...(state.translated[key] || {}), ...parsed[key], raw: rawText };
      fillMissingVyznamFromSource([key]);
      fillMissingKjvFromSource([key]);
      annotateEnglishDefinitionsInTranslated([key]);
      saveProgress();
      renderDetail();
      renderList();
      updateStats();
      showToast(t('toast.translatedSystem.key', { key }));
    } else {
      showToast(t('toast.aiResponse.unmatched'));
    }
  } catch (e) {
    showToast(t('toast.error.withMessage', { message: e.message }));
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = t('systemPrompt.send');
  }
}

function closeSystemPromptModal() {
  const modal = document.getElementById('systemPromptModal');
  if (modal) modal.remove();
}

/** Sjednocení znaků z AI odpovědi (NFKC, ZWSP, plnocelá dvojtečka) kvůli parsování labelů. */
function normalizeAiTopicRawText(s) {
  return String(s || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u0085/g, '\n')
    .replace(/\u2028/g, '\n')
    .replace(/\u2029/g, '\n')
    .replace(/\uFEFF/g, '')
    .replace(/[\u200B-\u200D\u2060]/g, '')
    .replace(/\uFF1A/g, ':')
    .replace(/\uFF1F/g, '?')
    .normalize('NFKC');
}

/** Odstraní opakované hlavičky ###G12### / ### G132 / ##H4 včetně mezer (i bez uzavíracích #). */
function stripLeadingGHeaders(text) {
  let t = String(text || '');
  for (let i = 0; i < 8; i++) {
    const next = t.replace(/^\s*#{2,6}\s*[gGhH]\d+\s*(?:#+\s*)?/i, '').trimStart();
    if (next === t) break;
    t = next;
  }
  return t;
}

function isTopicRepairPipelineBusy() {
  const st = state.topicRepairState;
  if (!st || st.closed) return false;
  if (state.topicRepairWorkerRunning || state.topicRepairBulkRunning) return true;
  if (st.tasks?.some(t => t.status === 'running')) return true;
  if (st.currentTask) return true;
  return false;
}

function syncTopicRepairMinimizeBusyIndicator() {
  const btn = document.getElementById('btnTopicRepairMini');
  if (!btn) return;
  if (!state.topicRepairState) {
    btn.classList.remove('topicRepairMiniBusy');
    return;
  }
  const busy = !!state.topicRepairState.minimized && isTopicRepairPipelineBusy();
  btn.classList.toggle('topicRepairMiniBusy', busy);
}

/** Když strict parser SPECIALISTU nechytí (jiné mezery/znaky), vezmi text od nadpisu do dalšího pole. */
function extractSpecialistaLooseFallback(rawText) {
  let t = stripLeadingGHeaders(normalizeAiTopicRawText(rawText).trim()).trim();
  if (!t) return '';
  const byAnchors = extractTopicSegmentByAnchors(t, 'SPECIALISTA');
  if (hasMeaningfulValue(byAnchors)) return byAnchors.trim();

  const m = matchSpecialistaHeaderBlockStart(t);
  if (!m || m.index === undefined) return '';
  const start = m.index + m[0].length;
  const rest = t.slice(start);
  const nextHdr =
    /(?:^|[\n\u0085\u2028\u2029])[\s\u00A0]*(?:VYZNAM|DEFINICE|POUZITI|PUVOD|POUVOD|POVOD|KJV|SPECIALISTA|VYKLAD|VÝKLAD|KOMENTAR|KOMENTÁŘ|EXEGEZE|COMMENTARY|EXEGESIS|DEFINITION|MEANING|USAGE|ORIGIN|DEF)\s*(?:\([^)\n]{0,240}\))?\s*(?:[:\uFF1A\u2013\u2014=\.\-|]|\n{1,4}\s*)/iu;
  const m2 = rest.search(nextHdr);
  const body = m2 >= 0 ? rest.slice(0, m2) : rest;
  return body.trim();
}

/** Po opravě tématu: nezaškrtávat hromadné přepsání jen při verdiktu „horší“ (jinak šlo omylem odškrtnout definici). */
function shouldAutoCheckTopicRepairTask(topicId, currentValue, candidateValue) {
  const prev = String(currentValue || '').trim();
  const next = String(candidateValue || '').trim();
  if (!hasMeaningfulValue(next)) return false;
  const p = scoreTopicRepairText(topicId, prev);
  const n = scoreTopicRepairText(topicId, next);
  const v = verdictTopicRepairCompare(p.score, n.score);
  return v.label !== 'horší';
}

/** Jednotná normalizace názvů polí z AI (vč. VÝKLAD → SPECIALISTA). */
function normalizeTopicFieldLabel(raw) {
  const u = String(raw || '').trim().toUpperCase();
  if (u === 'DEF' || u === 'DEFINITION') return 'DEFINICE';
  if (u === 'MEANING') return 'VYZNAM';
  if (u === 'USAGE') return 'POUZITI';
  if (u === 'ORIGIN') return 'PUVOD';
  if (u === 'POVOD' || u === 'POUVOD') return 'PUVOD';
  if (u === 'VYKLAD' || u === 'VÝKLAD' || u === 'KOMENTAR' || u === 'KOMENTÁŘ' || u === 'EXEGEZE' || u === 'COMMENTARY' || u === 'EXEGESIS') return 'SPECIALISTA';
  return u;
}

/** Alternace názvů polí v AI odpovědi (jednotný zdroj pro anchor / řádkové parsování). */
const TOPIC_FIELD_LABEL_ALTS_FOR_RE = 'VYZNAM|DEFINICE|POUZITI|PUVOD|POUVOD|POVOD|KJV|SPECIALISTA|VYKLAD|VÝKLAD|KOMENTAR|KOMENTÁŘ|EXEGEZE|DEFINITION|MEANING|USAGE|ORIGIN|COMMENTARY|EXEGESIS|DEF';

/** Po klíčovém slově často následuje „(specialista)“ / poznámka v závorce — bez toho selhával \s*[-:]. */
function makeTopicFieldHeaderScanRegex() {
  return new RegExp(`\\b(${TOPIC_FIELD_LABEL_ALTS_FOR_RE})(?:\\*\\*|__)?\\s*(?:\\([^)\\n]{0,240}\\))?\\s*[-:–—=.|]{0,3}\\s*`, 'giu');
}

/** Stejná pravidla jako u anchor regexu, navíc prefix markdownu / číslování na začátku řádku. */
function makeTopicFieldLineStartRegex() {
  return new RegExp(
    `^(?:(?:\\d+)[.)]\\s+)?(?:(?:[-*+>]|#{1,6})\\s+)?(?:(?:\\*\\*|__)\\s*)?(${TOPIC_FIELD_LABEL_ALTS_FOR_RE})(?:\\*\\*|__)?\\s*(?:\\([^)\\n]{0,240}\\))?\\s*[-:–—=.|]{0,3}\\s*`,
    'iu'
  );
}

/** Hlavička sekce specialisty (aliasy + závorka + dvojtečka nebo nový řádek těla). */
function matchSpecialistaHeaderBlockStart(t) {
  const s = String(t || '');
  if (!s) return null;
  const LINE_START = '(?:^|[\n\u0085\u2028\u2029])[\\s\u00A0]*';
  const ALIAS = '(?:SPECIALISTA|VYKLAD|VÝKLAD|KOMENTAR|KOMENTÁŘ|EXEGEZE|COMMENTARY|EXEGESIS)';
  const PAREN_OPT = '(?:\\([^)\\n]{0,240}\\))?';
  const SEP = '(?:[:\\uFF1A\\u2013\\u2014=\\.\\-|]|\\n{1,4}\\s*)';
  const prefix = '(?:(?:\\d+)[.)]\\s+)?(?:(?:[-*+>]|#{1,6})\\s+)?(?:(?:\\*\\*|__)\\s*)?';
  const re = new RegExp(LINE_START + prefix + ALIAS + '(?:\\*\\*|__)?\\s*' + PAREN_OPT + '\\s*' + SEP + '\\s*', 'iu');
  return s.match(re);
}

/** Výřez bloku podle libovolného výskytu labelu v textu (i více polí na jednom řádku). */
function extractTopicSegmentByAnchors(cleaned, wantLabel) {
  const c = String(cleaned || '');
  if (!c || !wantLabel) return '';
  const re = makeTopicFieldHeaderScanRegex();
  const spans = [];
  let m;
  while ((m = re.exec(c)) !== null) {
    const lab = normalizeTopicFieldLabel(m[1]);
    if (!lab) continue;
    spans.push({ lab, endHeader: m.index + m[0].length, blockStart: m.index });
  }
  if (!spans.length) return '';
  const idx = spans.findIndex(s => s.lab === wantLabel);
  if (idx < 0) return '';
  const endPos = idx + 1 < spans.length ? spans[idx + 1].blockStart : c.length;
  return c.slice(spans[idx].endHeader, endPos).trim();
}

function mapNormalizedLabelToTopicId(norm) {
  const n = String(norm || '').toUpperCase();
  if (n === 'VYZNAM') return 'vyznam';
  if (n === 'DEFINICE') return 'definice';
  if (n === 'POUZITI') return 'pouziti';
  if (n === 'PUVOD') return 'puvod';
  if (n === 'KJV') return 'kjv';
  if (n === 'SPECIALISTA') return 'specialista';
  return null;
}

/** Pořadí témat podle prvního výskytu nadpisu v RAW (pro log a doplnění „dalších“). */
function scanRawForTopicHeaderTopicIds(rawText) {
  const text = normalizeAiTopicRawText(rawText).trim();
  if (!text) return [];
  let cleaned = stripLeadingGHeaders(text).trim();
  const re = makeTopicFieldHeaderScanRegex();
  const out = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(cleaned)) !== null) {
    const norm = normalizeTopicFieldLabel(m[1]);
    const tid = mapNormalizedLabelToTopicId(norm);
    if (!tid || seen.has(tid)) continue;
    seen.add(tid);
    out.push(tid);
  }
  return out;
}

function extractTopicValueFromAI(rawText, topicId, mode = 'loose') {
  const text = normalizeAiTopicRawText(rawText).trim();
  if (!text) return '';

  const keyForTopic = {
    vyznam: 'VYZNAM',
    definice: 'DEFINICE',
    pouziti: 'POUZITI',
    puvod: 'PUVOD',
    kjv: 'KJV',
    specialista: 'SPECIALISTA'
  }[topicId] || '';

  let cleaned = stripLeadingGHeaders(text).trim();

  const lines = cleaned.split('\n');
  const fieldPositions = [];
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimL = rawLine.replace(/^\uFEFF/, '').replace(/^\s*\u200B+/, '').trimStart();
    const lead = rawLine.length - trimL.length;
    const m = trimL.match(makeTopicFieldLineStartRegex());
    if (!m) continue;
    const label = normalizeTopicFieldLabel(m[1]);
    fieldPositions.push({ label, line: i, len: lead + m[0].length });
  }

  if (mode === 'strict' && fieldPositions.length === 0 && keyForTopic) {
    const anchor = extractTopicSegmentByAnchors(cleaned, keyForTopic);
    if (hasMeaningfulValue(anchor)) return anchor.trim();
    return '';
  }

  if (keyForTopic && fieldPositions.some(f => f.label === keyForTopic)) {
    const idx = fieldPositions.findIndex(f => f.label === keyForTopic);
    const cur = fieldPositions[idx];
    const endLine = idx < fieldPositions.length - 1 ? fieldPositions[idx + 1].line : lines.length;
    let out = '';
    for (let i = cur.line; i < endLine; i++) {
      let part = lines[i];
      if (i === cur.line) part = part.slice(cur.len);
      part = part.trim();
      if (part) out += (out ? ' ' : '') + part;
    }
    out = out.trim();
    // Ořízni případ, kdy AI přidá další téma ve stejné větě/řádku.
    const foreignInline = out.match(/\b(VYZNAM|DEFINICE|POUZITI|PUVOD|KJV|SPECIALISTA|VYKLAD|VÝKLAD|KOMENTAR|KOMENTÁŘ|EXEGEZE|DEF|DEFINITION|MEANING|USAGE|ORIGIN|COMMENTARY|EXEGESIS)\s*[-:–—=.]?\s*/iu);
    if (foreignInline && foreignInline.index !== undefined) {
      const nl = normalizeTopicFieldLabel(foreignInline[1]);
      const sameBucket = keyForTopic === 'SPECIALISTA'
        ? nl === 'SPECIALISTA'
        : nl === keyForTopic;
      if (!sameBucket && foreignInline.index > 0) {
        out = out.slice(0, foreignInline.index).trim();
      }
    }
    return out.trim();
  }

  // Když chybí explicitní label cílového tématu, ale AI vrátí další labely
  // (např. SPECIALISTA), ber jen text před prvním cizím labelem.
  if (mode === 'strict' && fieldPositions.length > 0 && keyForTopic && !fieldPositions.some(f => f.label === keyForTopic)) {
    const anchor = extractTopicSegmentByAnchors(cleaned, keyForTopic);
    if (hasMeaningfulValue(anchor)) return anchor.trim();
    return '';
  }
  if (fieldPositions.length > 0 && keyForTopic && !fieldPositions.some(f => f.label === keyForTopic)) {
    const firstOther = fieldPositions[0];
    if (firstOther.line > 0) {
      const before = lines.slice(0, firstOther.line).join(' ').trim();
      if (before) return before;
    }
    return '';
  }

  if (keyForTopic) {
    cleaned = cleaned.replace(new RegExp(`^${keyForTopic}\\s*[-:–—=.]?\\s*`, 'i'), '').trim();
  }
  // Poslední ochrana: u single-topic odpovědi ořízni navazující cizí labely i v rámci jednoho řádku.
  if (keyForTopic) {
    const foreignInlineGlobal = cleaned.match(/\b(VYZNAM|DEFINICE|POUZITI|PUVOD|KJV|SPECIALISTA|VYKLAD|VÝKLAD|KOMENTAR|KOMENTÁŘ|EXEGEZE|DEF|DEFINITION|MEANING|USAGE|ORIGIN|COMMENTARY|EXEGESIS)\s*[-:–—=.]?\s*/iu);
    if (foreignInlineGlobal && foreignInlineGlobal.index !== undefined) {
      const nl = normalizeTopicFieldLabel(foreignInlineGlobal[1]);
      const sameBucket = keyForTopic === 'SPECIALISTA'
        ? nl === 'SPECIALISTA'
        : nl === keyForTopic;
      if (!sameBucket && foreignInlineGlobal.index > 0) {
        cleaned = cleaned.slice(0, foreignInlineGlobal.index).trim();
      }
    }
  }
  return cleaned;
}

function formatPreviewRawTranslation(rawDef) {
  const text = String(rawDef || '').trim();
  if (!text) return '—';
  const esc = escHtml(text);
  const formatted = esc
    .replace(/(VÝZNAM:|Význam:)/g, '<br><b>$1</b>')
    .replace(/(DEFINICE:|Definice:)/g, '<br><b>$1</b>')
    .replace(/(POUŽIT[ÍI]:|Použit[íi]:)/g, '<br><b>$1</b>')
    .replace(/(SPECIALISTA:|Specialista:|VÝKLAD:|Výklad:)/g, '<br><b>$1</b>');
  return formatted.replace(/^<br>/, '');
}

// ══ PŘEKLAD — SINGLE ════════════════════════════════════════════
async function translateSingle(key) {
  const btn = document.querySelector('.translate-btn');
  if (btn) { btn.disabled = true; btn.textContent = t('translate.single.translating'); }
  
  const prov = resolveMainBatchProvider(document.getElementById('provider')?.value || '');
  const apiKey = getCurrentApiKey(prov);
  const model = getPipelineModelForProvider(prov) || document.getElementById('model').value;

   if (!apiKey) {
     showToast(t('toast.apiKey.enterForProvider', { provider: prov }));
     if (btn) { btn.disabled = false; btn.textContent = t('translate.single.button'); }
     return;
   }

   const e = state.entryMap.get(key);
  if (!e) {
    if (btn) { btn.disabled = false; btn.textContent = t('translate.single.button'); }
    return;
  }
  
  const messages = buildPromptMessages([e]);
  
  try {
    const raw = await callAIWithRetry(prov, apiKey, model, messages);
    log(`🤖 Překlad: ${getTranslationEngineLabel(raw, prov, model)}`);
    if (window.DEBUG_AI) {
      console.groupCollapsed(`AI single ${key}`);
      console.log('response:', raw.content);
      console.groupEnd();
    }
    let missingKeys = parseTranslations(raw.content, [key]);
    
    if (missingKeys.length > 0) {
      const retryContent = `CHYBA: V minulé odpovědi jsi vynechal formátovací značky ###G. 
ZOPAKUJ PŘEKLAD a u každého hesla MUSÍŠ začít řádkem ###G[číslo]###. 
Bez toho nebude překlad zpracován!

Přelož tato hesla:
${key}
DEF: ${e.definice || e.def || ''}
KJV: ${e.kjv || ''}
ORIG: ${e.orig || ''}`;
      
       const raw2 = await callOnce(prov, apiKey, model, buildRetryMessages(retryContent));
       missingKeys = parseTranslations(raw2.content, [key]);
     }

   } catch(e) {
     logError('translateSingle', e, {
       key,
       provider: prov,
       model
     });
     showToast(t('toast.error.withMessage', { message: e.message }));
   }
  
  if (btn) { btn.disabled = false; btn.textContent = t('translate.single.button'); }
  renderDetail();
  updateStats();
  renderList();
}

// ══ PŘEKLAD — ZNOVU ════════════════════════════════════════════
async function retranslateSingle(key) {
  if (!confirm(t('confirm.retranslate', { key }))) return;
  
  // Označ jako nepřeložené pro další zpracování
  delete state.translated[key];
  saveProgress();
  
  // Vyber jen tento klíč
  state.selectedKeys.clear();
  state.selectedKeys.add(key);
  renderList();
  
  // Zavolej překlad
  await translateSelected();
}

// ══ PŘEKLAD — DÁVKA ══════════════════════════════════════════════
async function translateNext() {
  if (state.autoRunning) return;
  const activeProvider = resolveMainBatchProvider(document.getElementById('provider')?.value || '');
  if (!isAutoProviderEnabled(activeProvider)) {
    showToast(t('toast.provider.enableOne'));
    return;
  }
  
  // Retry mode - použij state.retryKeysList místo getNextBatch
  let batch;
  if (state.retryMode && state.retryKeysList.length > 0) {
    batch = state.retryKeysList.slice(0, state.currentBatchSize);
    state.retryKeysList = state.retryKeysList.slice(state.currentBatchSize);
    if (state.retryKeysList.length === 0) {
      state.retryMode = false;
    }
  } else {
    batch = getNextBatch(state.currentBatchSize);
  }
  
  if (!batch.length) { 
    if (state.retryMode) {
      showToast(t('toast.retry.done'));
      state.retryMode = false;
    } else {
      showToast(t('toast.allTranslated')); 
    }
    stopElapsedTimer();
    return; 
  }
  
  // Info o retry módu
  if (state.retryMode) {
    document.getElementById('btnStep').title = `Retry: zbývá ${state.retryKeysList.length + batch.length} hesel`;
  }
  
  document.getElementById('btnStep').disabled = true;
  document.getElementById('btnStep').textContent = t('btn.step.loading');
  await translateBatch(batch);
  document.getElementById('btnStep').disabled = false;
  document.getElementById('btnStep').textContent = t('btn.step.default');
  updateStats();
  renderList();
  if (state.activeKey && state.translated[state.activeKey]) renderDetail();
}

function jumpToStart() {
  const num = parseInt(document.getElementById('startFrom').value);
  if (!num || num < 1) { showToast(t('toast.jump.enterGNumber')); return; }
  const key = 'G' + num;
  const found = state.entryMap.get(key);
  if (!found) { showToast(t('toast.entry.notFoundInFile', { key: `G${num}` })); return; }

  // Označ všechna hesla PŘED tímto číslem jako přeskočená (zachováme existující překlady)
  for (const e of state.entries) {
    const n = parseInt(e.key.slice(1));
    if (n < num && !state.translated[e.key]) {
      state.translated[e.key] = { vyznam: '—', definice: '(přeskočeno)', pouziti: '—', puvod: '—', skipped: true };
    }
  }
   saveProgress();
   updateStats();
   renderList();
   showToast(t('toast.translation.resumeFrom', { key: `G${num}` }));
   // Scroll na heslo v listu (virtuální)
   setTimeout(() => {
     const scroll = document.getElementById('listScroll');
     const idx = state.filteredKeys.indexOf(key);
     if (idx !== -1) {
       scroll.scrollTop = idx * ITEM_HEIGHT - (scroll.clientHeight / 2) + (ITEM_HEIGHT / 2);
     }
   }, 0);
 }


function getNextBatch(size) {
  const result = [];
  for (const e of state.entries) {
    if (result.length >= size) break;
    if (!state.translated[e.key] || state.translated[e.key].skipped) {
      result.push(e.key);
    }
  }
  return result;
}

const FALLBACK_TOPIC_ORDER = ['definice', 'vyznam', 'kjv', 'pouziti', 'puvod', 'specialista'];

function getFailedTopicsForFallback(translationEntry) {
  const t = translationEntry || {};
  const failed = [];
  for (const topicId of FALLBACK_TOPIC_ORDER) {
    const val = String(t[topicId] || '').trim();
    if (!hasMeaningfulValue(val)) {
      failed.push(topicId);
      continue;
    }
    if (topicId === 'definice' && isDefinitionLowQuality(val)) {
      failed.push(topicId);
    }
  }
  return failed;
}

function getMissingTopicsForRepair(translationEntry) {
  const allMissing = getFailedTopicsForFallback(translationEntry);
  return allMissing.slice(0, 2);
}

function cloneTranslationTopicFields(entry) {
  const src = entry || {};
  return {
    vyznam: String(src.vyznam || ''),
    definice: String(src.definice || ''),
    kjv: String(src.kjv || ''),
    pouziti: String(src.pouziti || ''),
    puvod: String(src.puvod || ''),
    specialista: String(src.specialista || '')
  };
}

function isBetterGenericTopicValue(prev, next) {
  const prevText = String(prev || '').trim();
  const nextText = String(next || '').trim();
  if (!hasMeaningfulValue(nextText)) return false;
  if (!hasMeaningfulValue(prevText)) return true;
  if (nextText.length >= prevText.length + 40) return true;
  return false;
}

function shouldReplaceTopicValue(topicId, previousValue, candidateValue) {
  const prev = String(previousValue || '').trim();
  const next = String(candidateValue || '').trim();
  if (!hasMeaningfulValue(next)) return false;
  if (!hasMeaningfulValue(prev)) return true;
  if (topicId === 'specialista') return shouldReplaceSpecialista(prev, next);
  if (topicId === 'definice') {
    if (isDefinitionLowQuality(next)) return false;
    if (isDefinitionLowQuality(prev) && !isDefinitionLowQuality(next)) return true;
    return isBetterGenericTopicValue(prev, next);
  }
  return isBetterGenericTopicValue(prev, next);
}

function preserveBetterTopicsAfterBatch(keys, previousMap) {
  const topics = ['vyznam', 'definice', 'kjv', 'pouziti', 'puvod', 'specialista'];
  for (const key of (Array.isArray(keys) ? keys : [])) {
    const current = state.translated[key];
    if (!current) continue;
    const previous = previousMap?.[key] || {};
    for (const topicId of topics) {
      const prevVal = String(previous[topicId] || '').trim();
      const curVal = String(current[topicId] || '').trim();
      const acceptCurrent = shouldReplaceTopicValue(topicId, prevVal, curVal);
      if (!acceptCurrent && hasMeaningfulValue(prevVal)) {
        current[topicId] = prevVal;
      }
    }
  }
}

function getProviderCooldownLeftSec(prov) {
  const until = Number(state.providerCooldownUntil?.[prov] || 0);
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

function setProviderCooldown(prov, seconds, reason = '') {
  const sec = Math.max(0, Number(seconds) || 0);
  if (!Object.prototype.hasOwnProperty.call(state.providerCooldownUntil, prov)) return;
  state.providerCooldownUntil[prov] = sec > 0 ? (Date.now() + sec * 1000) : 0;
}

function getModelCooldownLeftSec(prov, model) {
  const map = state.providerModelCooldownUntil?.[prov];
  if (!map || !model) return 0;
  const until = Number(map[model] || 0);
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

function setModelCooldown(prov, model, seconds) {
  if (!model) return;
  if (!Object.prototype.hasOwnProperty.call(state.providerModelCooldownUntil, prov)) {
    state.providerModelCooldownUntil[prov] = {};
  }
  const sec = Math.max(0, Number(seconds) || 0);
  state.providerModelCooldownUntil[prov][model] = sec > 0 ? (Date.now() + sec * 1000) : 0;
}

async function waitForProviderCooldown(prov, abortVersion = 0) {
  while (getProviderCooldownLeftSec(prov) > 0) {
    if (isSideFallbackAborted(abortVersion)) return false;
    const left = getProviderCooldownLeftSec(prov);
    const tick = Math.floor(left / 10);
    if (state.providerCooldownLogTick[prov] !== tick) {
      state.providerCooldownLogTick[prov] = tick;
      log(`⏱ ${prov} cooldown: zbývá ${left}s`);
    }
    const ok = await sleepMsWithAbort(Math.min(1500, left * 1000), abortVersion);
    if (!ok) return false;
  }
  state.providerCooldownLogTick[prov] = -1;
  return true;
}

function shouldAcceptTopicFallback(topicId, candidate) {
  if (!hasMeaningfulValue(candidate)) return false;
  if (topicId === 'definice' && isDefinitionLowQuality(candidate)) return false;
  return true;
}

function getSecondaryProviderModelCandidates(prov) {
  return buildSecondaryProviderModelCandidates({
    provider: prov,
    providers: PROVIDERS,
    selectedModel: getPipelineModelForProvider(prov) || getModelTestSelectedModelForProvider(prov) || '',
    rankedModels: getRankedModelsForSecondary(prov),
    maxNonGemini: 4
  });
}

function getSecondaryProviderModelQueue(prov) {
  const uniqueQueue = getSecondaryProviderModelCandidates(prov);
  if (!uniqueQueue.length) return [];
  const idx = Math.max(0, Number(state.providerModelRotationIndex?.[prov] || 0));
  const shift = idx % uniqueQueue.length;
  state.providerModelRotationIndex[prov] = idx + 1;
  return [...uniqueQueue.slice(shift), ...uniqueQueue.slice(0, shift)];
}

function getSecondaryNextOperationState(prov) {
  const queue = getSecondaryProviderModelCandidates(prov);
  if (!queue.length) return { exhausted: false, nextSec: 0 };
  const providerLeft = getProviderCooldownLeftSec(prov);
  let nextSec = Number.POSITIVE_INFINITY;
  let hasReadyNow = false;
  for (const model of queue) {
    const modelLeft = getModelCooldownLeftSec(prov, model);
    const opLeft = Math.max(providerLeft, modelLeft);
    if (opLeft <= 0) {
      hasReadyNow = true;
      break;
    }
    nextSec = Math.min(nextSec, opLeft);
  }
  if (hasReadyNow) return { exhausted: false, nextSec: 0 };
  if (!Number.isFinite(nextSec)) return { exhausted: false, nextSec: 0 };
  return { exhausted: true, nextSec: Math.max(1, Math.ceil(nextSec)) };
}

function getSecondaryRetryDelayMsByError(msgLower) {
  if (/resource_exhausted|too many|rate limit|429|high demand/.test(msgLower)) return 3000;
  if (/503|service unavailable|timeout|api timeout/.test(msgLower)) return 3000;
  if (/400|invalid/.test(msgLower)) return 1500;
  return 2500;
}

function getSecondaryCooldownSecByError(prov, rawMsg) {
  const msg = String(rawMsg || '');
  const low = msg.toLowerCase();
  if (prov === 'gemini' && (/resource_exhausted|429|high demand|limit vyčerpán/.test(low))) {
    // U Gemini držíme cooldown hlavně per-model, ne per-provider.
    return 0;
  }
  if (/503|service unavailable|api timeout/.test(low)) return 5;
  if (/429|rate limit|too many|quota/.test(low)) {
    const parsed = rateInfoFromErrorMessage(msg)?.retryAfterSec || 0;
    return Math.max(3, Math.min(20, parsed || 6));
  }
  return 0;
}

function getSecondaryModelCooldownSecByError(prov, rawMsg) {
  const msg = String(rawMsg || '');
  const low = msg.toLowerCase();
  const retryAfter = rateInfoFromErrorMessage(msg)?.retryAfterSec || 0;
  const minMatch = low.match(/(\d+)\s*min/);
  const fromMinutes = minMatch ? (Number(minMatch[1]) || 0) * 60 : 0;
  if (prov === 'gemini' && (/limit vyčerpán|resource_exhausted/.test(low))) {
    // Prefer explicit Retry-After from API over textual "~20min" hint.
    const preferred = retryAfter || fromMinutes || (20 * 60);
    return Math.max(20, Math.min(25 * 60, preferred));
  }
  if (/high demand|503|service unavailable/.test(low)) {
    return Math.max(20, Math.min(180, retryAfter || 45));
  }
  if (/429|rate limit|too many|quota/.test(low)) {
    return Math.max(20, Math.min(180, retryAfter || 30));
  }
  return 0;
}

async function requestTopicFallbackForProvider(prov, key, topicId, abortVersion) {
  if (isSideFallbackAborted(abortVersion)) return null;
  const apiKey = getApiKeyForModelTest(prov);
  const modelQueue = getSecondaryProviderModelQueue(prov);
  if (!apiKey || !modelQueue.length) return null;
  if (getProviderCooldownLeftSec(prov) > 0) return null;
  const entry = state.entryMap.get(key);
  if (!entry) return null;
  const promptType = TOPIC_PROMPT_PRESET_MAP[topicId];
  if (!promptType) return null;
  const messages = buildModelTestMessages([entry], 'auto-live', promptType, true);

  for (let i = 0; i < modelQueue.length; i++) {
    if (isSideFallbackAborted(abortVersion)) return null;
    const model = modelQueue[i];
    const cooldownOk = await waitForProviderCooldown(prov, abortVersion);
    if (!cooldownOk) return null;
    if (isSideFallbackAborted(abortVersion)) return null;
    const modelCooldownLeft = getModelCooldownLeftSec(prov, model);
    if (modelCooldownLeft > 0) {
      console.warn(`[FALLBACK][${prov}] skip model cooldown: ${model} (${modelCooldownLeft}s)`);
      continue;
    }
    const reqStart = performance.now();
    try {
      const raw = await callOnce(prov, apiKey, model, messages);
      const reqMs = Math.round(performance.now() - reqStart);
      const parsed = {};
      const rawText = String(raw?.content || '');
      parseWithOpenRouterNormalization(rawText, [key], parsed);
      applyFallbacksToParsedMap([key], parsed);
      let candidate = String(parsed?.[key]?.[topicId] || '').trim();
      if (!candidate) {
        // Topic prompty mohou vracet čistou hodnotu pole bez parser-safe bloku.
        candidate = extractTopicValueFromAI(rawText, topicId, 'strict');
      }
      appendModelTestUsage(() => {}, prov, model, raw);
      if (shouldAcceptTopicFallback(topicId, candidate)) {
        log(`↳ Fallback ${prov}/${model} ${key}.${topicId} OK (${reqMs}ms)`);
        return { prov, model, value: candidate, reqMs };
      }
      log(`⚠ Fallback ${prov}/${model} ${key}.${topicId}: odpověď neprošla kvalitou, zkouším další model.`);
    } catch (e) {
      const msg = String(e?.message || '');
      const msgLower = msg.toLowerCase();
      const isRate = /429|rate limit|too many|quota|resource_exhausted|high demand/.test(msgLower);
      const cooldownSec = getSecondaryCooldownSecByError(prov, msg);
      const modelCooldownSec = getSecondaryModelCooldownSecByError(prov, msg);
      if (modelCooldownSec > 0) setModelCooldown(prov, model, modelCooldownSec);
      if (cooldownSec > 0) setProviderCooldown(prov, cooldownSec, isRate ? 'rate limit' : 'provider error');
      state.providerFailBadgeUntil[prov] = Date.now() + 10000;
      console.warn(`[FALLBACK][${prov}] model failed: ${model}`, {
        key,
        topicId,
        message: msg
      });
      // Pokud provider spadl do delšího cooldownu, fallback hned ukončíme,
      // aby neblokoval další Groq dávky.
      if (cooldownSec >= 45) {
        return null;
      }
      const canTryNext = i < modelQueue.length - 1;
      if (canTryNext) {
        const waitMs = getSecondaryRetryDelayMsByError(msgLower);
        const cooldownMs = getProviderCooldownLeftSec(prov) * 1000;
        const effectiveWaitMs = Math.max(waitMs, cooldownMs);
        // Retry detail necháváme pouze v konzoli, AUTO řádek zůstává stručný.
        console.warn(`[FALLBACK][${prov}] retry next model in ${Math.max(1, Math.round(effectiveWaitMs / 1000))}s`);
        const keptRunning = await sleepMsWithAbort(effectiveWaitMs, abortVersion);
        if (!keptRunning) return null;
      }
    }
  }
  return null;
}

async function runParallelTopicFallback(keys, abortVersion) {
  if (isSideFallbackAborted(abortVersion)) return;
  const keyList = Array.isArray(keys) ? keys : [];
  if (!keyList.length) return;
  const sideProviders = ['gemini', 'openrouter'].filter(prov => isPipelineSecondaryEnabled(prov));
  if (!sideProviders.length) {
    log('ℹ Sekundární fallback vypnutý (žádný provider není zaškrtnut).');
    return;
  }
  await Promise.all(keyList.map(async (key) => {
    if (isSideFallbackAborted(abortVersion)) return;
    const t = state.translated[key] || {};
    const failedTopics = getFailedTopicsForFallback(t);
    if (!failedTopics.length) return;
    for (const topicId of failedTopics) {
      if (isSideFallbackAborted(abortVersion)) return;
      let chosen = null;
      for (const prov of sideProviders) {
        const result = await runProviderFallbackTaskSequential(
          prov,
          () => requestTopicFallbackForProvider(prov, key, topicId, abortVersion)
        ).catch(() => null);
        if (result) {
          chosen = result;
          break;
        }
      }
      if (!chosen) continue;
      if (isSideFallbackAborted(abortVersion)) return;
      state.translated[key] = state.translated[key] || {};
      state.translated[key][topicId] = chosen.value;
      log(`✓ Fallback převzat ${key}.${topicId} <= ${chosen.prov}/${chosen.model}`);
    }
  }));
}

function enqueueSideFallbackBackground(keys) {
  const keyList = Array.isArray(keys) ? keys.filter(Boolean) : [];
  if (!keyList.length) return;
  const abortVersion = state.sideFallbackAbortVersion;
  state.sideFallbackBackgroundQueue = state.sideFallbackBackgroundQueue
    .catch(() => undefined)
    .then(async () => {
      if (isSideFallbackAborted(abortVersion)) return;
      try {
        await runParallelTopicFallback(keyList, abortVersion);
      } catch (e) {
        console.warn('[FALLBACK] background run failed', e);
      }
    });
}

async function translateBatch(keys, depth = 0) {
  const preferredProvider = document.getElementById('provider')?.value || '';
  const prov   = resolveMainBatchProvider(preferredProvider);
  const model  = getPipelineModelForProvider(prov) || document.getElementById('model').value;
  // Klíč vždy dle aktuálního run providera
  const apiKey = getCurrentApiKey(prov);
  state.currentInterval = parseInt(document.getElementById('intervalRun').value);
  state.currentBatchSize = parseInt(document.getElementById('batchSizeRun').value);

  if (!apiKey) { showToast(t('toast.apiKey.enterForProvider', { provider: prov })); return { ok: false }; }

  // Start timer při prvním překladu
  if (!state.startTime) {
    state.startTime = Date.now();
    startElapsedTimer();
  }

  const batch = keys.map(k => state.entryMap.get(k)).filter(Boolean);
  const messages = buildPromptMessages(batch);

  const reqStart = performance.now();
  try {
    const previousMap = {};
    for (const key of keys) {
      previousMap[key] = cloneTranslationTopicFields(state.translated[key]);
    }
    const raw = await callAIWithRetry(prov, apiKey, model, messages);
    const reqMs = performance.now() - reqStart;
    const content = raw.content;
    log(`🤖 Překlad: ${getTranslationEngineLabel(raw, prov, model)}`);
    // Verbose logy pouze když je aktivní režim pro debug (window.DEBUG_AI = true v konzoli)
    if (window.DEBUG_AI) {
      console.groupCollapsed(`AI batch ${keys[0]}–${keys[keys.length-1]}`);
      console.log('prompt:', messages);
      console.log('response:', content);
      console.groupEnd();
    }
    let missingKeys = parseTranslations(content, keys);
    preserveBetterTopicsAfterBatch(keys, previousMap);
    fillMissingVyznamFromSource(keys);
    fillMissingKjvFromSource(keys);
    annotateEnglishDefinitionsInTranslated(keys);
    
    // Log tokenů
    const usage = raw.usage || raw.usageMetadata;
    if (usage) {
      const inT = usage.prompt_tokens || usage.promptTokenCount || 0;
      const outT = usage.completion_tokens || usage.candidatesTokenCount || 0;
      const total = inT + outT;
      log(`📊 ${prov}: ${inT} in / ${outT} out = ${total} celkem`);
      logTokenEntry(prov, inT, outT, total);
    }
    
    // Log do konzoly pro úspěšné
    for (const key of keys) {
      const t = state.translated[key];
      if (t?.vyznam && t.vyznam !== '—') {
        console.log(`✓ ${key}: ${t.vyznam?.slice(0, 60)}...`);
      }
    }
    logEntry(keys, content);
    
    // Ulož raw odpověď pro každý klíč (pro pozdější zobrazení chyb)
    for (const key of keys) {
      if (state.translated[key]) {
        state.translated[key].raw = content;
      }
    }
    
    // Pokud něco chybí, zkus opravný retry
    if (missingKeys.length > 0) {
      console.log(`⚠ ${missingKeys.length} hesel bez překladu: ${missingKeys.join(', ')}`);
      log(`⚠ Pokus o opravu formátu pro ${missingKeys.join(', ')}...`);
      const retryContent = `CHYBA: V minulé odpovědi jsi vynechal formátovací značky ###G. 
ZOPAKUJ PŘEKLAD a u každého hesla MUSÍŠ začít řádkem ###G[číslo]###. 
Bez toho nebude překlad zpracován!

Přelož tato hesla:
${keys.map(k => {
  const e = state.entryMap.get(k);
  return e ? `${e.key} | ${e.greek}\nDEF: ${e.definice || e.def || ''}\nKJV: ${e.kjv || ''}` : '';
}).join('\n\n')}`;
      
      try {
        const raw2 = await callOnce(prov, apiKey, model, buildRetryMessages(retryContent));
        console.log(`📥 Retry odpověď:`, raw2.content);
        missingKeys = parseTranslations(raw2.content, keys);
        preserveBetterTopicsAfterBatch(keys, previousMap);
        fillMissingVyznamFromSource(keys);
        fillMissingKjvFromSource(keys);
        annotateEnglishDefinitionsInTranslated(keys);
        const retryCount = keys.length - missingKeys.length;
        if (retryCount > 0) {
          log(`✓ Opravný překlad: ${retryCount} hesel, chybí: ${missingKeys.length > 0 ? missingKeys.join(', ') : 'nic'}`);
        } else {
          log(`✗ Opravný překlad nepomohl, chybí: ${missingKeys.join(', ')}`);
        }
      } catch(e2) {
        log(`✗ Opravný pokus selhal: ${e2.message}`);
      }
    }
    
    // Fallback strategie: pokud po retry chybí část dávky, zkus menší dávku.
    if (missingKeys.length > 0 && keys.length > 1 && depth < 4) {
      log(`↘ Fallback dávky: dělím ${missingKeys.length} klíčů na menší bloky (úroveň ${depth + 1})`);
      const pivot = Math.ceil(missingKeys.length / 2);
      const chunks = [missingKeys.slice(0, pivot), missingKeys.slice(pivot)].filter(ch => ch.length > 0);
      for (const chunk of chunks) {
        if (chunk.length === 1) {
          await translateBatch(chunk, depth + 1);
        } else {
          await translateBatch(chunk, depth + 1);
        }
      }
    }

    // Sekundární fallback spouštěj až po dokončení všech pokusů hlavního providera pro danou dávku
    // (tj. pouze v top-level volání). Tím se vyhneme "střídání" providerů během hlavního překladu.
    if (depth === 0) {
      const keysBeforeSideFallback = keys.filter(k => !isTranslationComplete(state.translated[k]));
      if (keysBeforeSideFallback.length > 0) {
        log(`↻ Analýza po ${prov}: ${keysBeforeSideFallback.length} hesel má chyby/neúplná témata; sekundární topic fallback běží na pozadí.`);
        enqueueSideFallbackBackground(keysBeforeSideFallback);
      } else {
        log(`✓ Analýza po ${prov}: dávka kompletní, sekundární fallback není potřeba.`);
      }
    }

    const translatedCount = keys.filter(k => isTranslationComplete(state.translated[k])).length;
    upsertModelTestStats(prov, model, {
      status: translatedCount === keys.length ? 'OK' : 'PARTIAL',
      okKeys: translatedCount,
      failedKeys: keys.length - translatedCount,
      totalKeys: keys.length,
      latencyMs: reqMs
    });
    pushTestHistory({
      type: 'translate-batch',
      provider: prov,
      model,
      total: keys.length,
      ok: translatedCount,
      missing: keys.length - translatedCount,
      avgLatencyMs: reqMs
    });
    if (translatedCount < keys.length) {
      // Označ chybějící hesla jako neúspěšná
      for (const key of keys) {
        if (!isTranslationComplete(state.translated[key])) {
          state.translated[key] = state.translated[key] || {};
          if (!state.translated[key].vyznam || state.translated[key].vyznam === '—') {
            state.translated[key].vyznam = '—';
          }
        }
      }
      log(`⚠ Pozor: Přeloženo ${translatedCount}/${keys.length} hesel. Zkuste menší dávku.`);
      showToast(t('toast.translated.partial', { translated: translatedCount, total: keys.length }));
    }
    
     saveProgress();
     updateFailedCount();
     // logEntry already called above after initial parse
     log(`✓ Přeloženo ${keys.length} hesel (${keys[0]}–${keys[keys.length-1]})`);
     return { ok: true };
} catch(e) {
      const reqMs = performance.now() - reqStart;
      const msg = (e?.message || '').toLowerCase();
      const isRate = msg.includes('429') || msg.includes('rate limit') || msg.includes('quota') || msg.includes('too many');
      upsertModelTestStats(prov, model, {
        status: isRate ? 'RATE_LIMITED' : 'ERROR',
        okKeys: 0,
        failedKeys: keys.length,
        totalKeys: keys.length,
        latencyMs: reqMs
      });
      if (isRate) {
        pushTestHistory({
          type: 'translate-batch',
          provider: prov,
          model,
          total: keys.length,
          ok: 0,
          missing: keys.length,
          avgLatencyMs: reqMs
        });
        const cooldownSeconds = Math.max(state.currentInterval, 60);
        logWarn('translateBatch', `Rate limit dávky ${keys[0]}-${keys[keys.length-1]}, odklad ${cooldownSeconds}s`, {
          provider: prov,
          keyRange: `${keys[0]}-${keys[keys.length-1]}`,
          cooldownSeconds,
          error: e.message
        });
        showToast(t('toast.rateLimit.retryIn', { seconds: cooldownSeconds }));
        return { ok: false, rateLimited: true, cooldownSeconds };
      }
      logError('translateBatch', e, {
        keys: keys.slice(0, 5), // first 5 keys only
        keyRange: `${keys[0]}-${keys[keys.length-1]}`,
        provider: prov,
        batchSize: keys.length
      });
      // Označ chybná hesla jako neúspěšná, aby šla zobrazit v "Neúspěšné překlady"
      for (const key of keys) {
        if (!state.translated[key]) {
          state.translated[key] = { vyznam: '—', definice: '', pouziti: '', puvod: '', specialista: '', raw: `CHYBA: ${e.message}` };
        }
      }
      saveProgress();
      pushTestHistory({
        type: 'translate-batch',
        provider: prov,
        model,
        total: keys.length,
        ok: 0,
        missing: keys.length,
        avgLatencyMs: reqMs
      });
      updateFailedCount();
      showToast(t('toast.error.withMessage', { message: e.message }));
      return { ok: false };
   }
}

// ══ BUILD PROMPT MESSAGES ═══════════════════════════════════════
// Uses buildPromptMessages and buildRetryMessages from core module

function resetPrompt() {
  document.getElementById('promptEditor').value = DEFAULT_PROMPT;
  localStorage.setItem('strong_prompt', DEFAULT_PROMPT);
  updatePromptStatusIndicator();
}


// ══ AI VOLÁNÍ S RETRY A FALLBACK ════════════════════════════════
function getProviderConfiguredModels(provider) {
  return getProviderConfiguredModelsForAI(provider, PROVIDERS);
}

function getFallbackModels(provider) {
  if (provider !== 'openrouter') return getStaticFallbackModels(provider, PROVIDERS);
  if (provider === 'openrouter') {
    try {
      const raw = localStorage.getItem('openrouter_free_models_cache');
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && Array.isArray(cached.models) && cached.models.length) {
          const ids = cached.models.map(m => {
            if (Array.isArray(m)) return m[0];
            if (m && typeof m === 'object') return m.id || m.value;
            return null;
          }).filter(Boolean);
          return [...new Set(ids)].slice(0, 5);
        }
      }
    } catch(e) { /* ignore */ }
    // Minimální fallback, kdyby cache ještě neexistovala
    return ['meta-llama/llama-3.3-70b-instruct:free', 'meta-llama/llama-3.1-8b-instruct:free'];
  }
  return [];
}

async function callAIWithRetry(provider, apiKey, model, messages) {
  const tryModels = (provider === 'gemini' || (provider === 'openrouter' && model === 'openrouter/free'))
    ? [model]
    : [...new Set([model, ...getFallbackModels(provider).filter(m => m !== model)])];
  let lastErr = null;

  for (const m of tryModels) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await callOnce(provider, apiKey, m, messages);
        return {
          ...res,
          providerUsed: provider,
          requestedModel: model,
          attemptedModel: m,
          resolvedModel: res.resolvedModel || m
        };
       } catch(e) {
         lastErr = e;
         const msg = (e.message || '').toLowerCase();
         const isRate = msg.includes('429') || msg.includes('quota') || msg.includes('rate') || msg.includes('too many');
         const isBanned = msg.includes('restricted') || msg.includes('organization');
         const is404 = msg.includes('404') || msg.includes('not found');
         const is503 = msg.includes('503') || msg.includes('service unavailable');
         const isTimeout = e?.name === 'AbortError' || msg.includes('signal is aborted') || msg.includes('timeout');

         if (is404) {
           const errMsg = 'Chyba 404: Model nenalezen, vyberte jiný v nastavení';
           logError('callAIWithRetry', new Error(errMsg), {
             provider, model: m, attempt: attempt + 1,
             statusCode: 404
           });
           throw new Error(errMsg);
         }
         if (isRate) {
           const parsedRetry = rateInfoFromErrorMessage(e?.message || '')?.retryAfterSec || 0;
           const wait = Math.max(2, Math.min(20, parsedRetry || ((attempt + 1) * 10)));
           const shouldSwitchModelImmediately = provider === 'groq';
           logWarn('callAIWithRetry', `Rate limit na ${m}, čekám ${wait}s...`, {
             provider, model: m, attempt: attempt + 1, waitSeconds: wait
           });
           showToast(t('toast.rateLimit.waiting', { seconds: wait, suffix: shouldSwitchModelImmediately ? ', then try another model' : '' }));
           await sleep(wait * 1000);
           if (shouldSwitchModelImmediately) {
             // U Groq je praktičtější při rate limitu rychle přeskočit na další model.
             break;
           }
           continue;
         }
         if (isTimeout) {
           const wait = Math.min(8, (attempt + 1) * 2);
           logWarn('callAIWithRetry', `Timeout/abort na ${m} (pokus ${attempt + 1}), opakuji za ${wait}s...`, {
             provider, model: m, attempt: attempt + 1, waitSeconds: wait, error: e.message
           });
           showToast(t('toast.timeout.retryIn', { seconds: wait }));
           await sleep(wait * 1000);
           continue;
         }
         if (is503) {
           const wait = Math.min(20, Math.max(3, (attempt + 1) * 5));
           logWarn('callAIWithRetry', `503 Service Unavailable na ${m} (pokus ${attempt + 1}), opakuji za ${wait}s...`, {
             provider, model: m, attempt: attempt + 1, waitSeconds: wait, error: e.message
           });
           showToast(t('toast.serviceUnavailable.retryIn', { seconds: wait }));
           await sleep(wait * 1000);
           continue;
         }
         if (isBanned) {
           logError('callAIWithRetry', new Error(`Blokovaný účet: ${m}`), {
             provider, model: m, attempt: attempt + 1
           });
           break;
         }
         // Other errors - log and try next model/attempt
         logWarn('callAIWithRetry', `Chyba při volání ${m} (pokus ${attempt+1}): ${e.message}`, {
           provider, model: m, attempt: attempt + 1, error: e.message
         });
         break;
       }
    }
  }
  throw lastErr || new Error('Všechny modely selhaly');
}

function getTranslationEngineLabel(raw, fallbackProvider, fallbackModel) {
  const provider = raw?.providerUsed || fallbackProvider || '?';
  const resolved = raw?.resolvedModel || raw?.attemptedModel || fallbackModel || '?';
  const requested = raw?.requestedModel || fallbackModel || resolved;
  if (provider === 'openrouter' && requested === 'openrouter/free' && resolved !== requested) {
    return `${provider} | auto-router -> ${resolved}`;
  }
  if (resolved !== requested) {
    return `${provider} | ${resolved} (fallback from ${requested})`;
  }
  return `${provider} | ${resolved}`;
}

async function callOnce(provider, apiKey, model, messages, externalSignal = null) {
  apiKey = apiKey.trim();
  const controller = new AbortController();
  let externalAbortHandler = null;
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalAbortHandler = () => controller.abort();
      externalSignal.addEventListener('abort', externalAbortHandler, { once: true });
    }
  }
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CONFIG.API_TIMEOUT);
  
  // Load AI settings from localStorage (per provider with legacy fallback)
  const temperature = parseFloat(localStorage.getItem(`strong_ai_temperature_${provider}`) || localStorage.getItem('strong_ai_temperature') || '0.3') || 0.3;
  const maxTokens = parseInt(localStorage.getItem(`strong_ai_max_tokens_${provider}`) || localStorage.getItem('strong_ai_max_tokens') || '2500', 10) || 2500;
  
  try {
    if (provider === 'groq') {
    const r = await fetch('https://corsproxy.io/?https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages,
        temperature: temperature, max_tokens: maxTokens }),
      signal: controller.signal
    });
    const d = await r.json();
    const rateInfo = {
      provider: 'groq',
      requestId: r.headers.get('x-request-id') || r.headers.get('request-id') || '',
      retryAfterSec: Number(r.headers.get('retry-after') || 0) || 0,
      remaining: r.headers.get('x-ratelimit-remaining-requests') || r.headers.get('x-ratelimit-remaining-tokens') || '',
      reset: r.headers.get('x-ratelimit-reset-requests') || r.headers.get('x-ratelimit-reset-tokens') || ''
    };
     if (!r.ok) {
       if (r.status === 429) {
         throw new Error(`Rate limit! Zkuste za ${rateInfo.retryAfterSec || 'několik'}s. Info: groq.com/pricing${rateInfo.requestId ? ` [req:${rateInfo.requestId}]` : ''}`);
       }
       throw new Error(d.error?.message || String(r.status));
     }
     // Validate response structure
     validateAPIResponse(d, 'groq');
     if (d.usage) {
       log(`📊 Groq: ${d.usage.prompt_tokens} in / ${d.usage.completion_tokens} out / ${d.usage.total_tokens} total`);
     }
     const content = d.choices[0].message.content;
    // Kontrola na nesmyslnou odpověď
    const weirdChars = (content.match(/[^\x20-\x7E\n\r\těščřžýáíéúůťďňĚŠČŘŽÝÁÍÉÚŮŤĎŇ]/g) || []).length;
    if (content.length > 0 && weirdChars > content.length * 0.5) {
      console.log('═ PODEZŘELÁ ODPOVĚĎ ═');
      console.log(content);
      throw new Error('AI vrátila nesmyslnou odpověď - zkuste delší interval');
    }
    return { content, usage: d.usage, resolvedModel: d.model || model, rateInfo };

   } else if (provider === 'gemini') {
     const userContent = messages.find(m => m.role === 'user')?.content || '';
     const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
     const r = await fetch(url, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ contents: [{ parts: [{ text: userContent }] }],
         systemInstruction: { parts: [{ text: messages.find(m => m.role === 'system')?.content || '' }] },
         generationConfig: { temperature: temperature, maxOutputTokens: maxTokens } }),
       signal: controller.signal
     });
    const d = await r.json();
     if (!r.ok) {
       if (r.status === 503 || d.error?.status === 'UNAVAILABLE') {
         throw new Error('503 Service Unavailable: Gemini je dočasně přetížené, opakuji později.');
       }
       if (d.error?.status === 'RESOURCE_EXHAUSTED') {
         const details = String(d.error?.message || '').trim();
         throw new Error(`Gemini limit vyčerpán! Počkej ~20min nebo přepni na Groq.${details ? ` Detail: ${details}` : ''}`);
       }
       throw new Error(d.error?.message || String(r.status));
     }
     // Validate response structure
     validateAPIResponse(d, 'gemini');
     if (d.usageMetadata) {
       log(`📊 Gemini: ${d.usageMetadata.promptTokenCount} in / ${d.usageMetadata.candidatesTokenCount} out`);
     }
      const content = d.candidates[0].content.parts[0].text;
      return { content, usage: d.usageMetadata, resolvedModel: d.modelVersion || d.model || model, rateInfo: { provider: 'gemini' } };

     } else if (provider === 'openrouter') {
      const r = await fetch('https://corsproxy.io/?https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer ' + apiKey, 
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://strong-bible-gr-cz.local',
          'X-Title': 'Strong GR-CZ Translator'
        },
        body: JSON.stringify({ model, messages,
          temperature: temperature, max_tokens: maxTokens }),
        signal: controller.signal
      });
     const d = await r.json();
     if (!r.ok) {
       const errMsg = d?.error?.message || d?.message || String(r.status);
       const errCode = String(d?.error?.code || '');
       if (r.status === 429 || errCode === '429') {
         throw new Error(`429 Rate limit: ${errMsg}`);
       }
       throw new Error(`OpenRouter ${r.status}: ${errMsg}`);
     }
     validateAPIResponse(d, 'openrouter');
     const content = extractOpenRouterText(d);
     if (!content) throw new Error('OpenRouter nevrátil čitelný text');
    return { content, usage: d.usage, resolvedModel: d.model || model, rateInfo: { provider: 'openrouter' } };
  }
  throw new Error('Neznámý provider');
  } catch (e) {
    if (timedOut && e?.name === 'AbortError') {
      throw new Error(`API timeout po ${Math.round(CONFIG.API_TIMEOUT / 1000)}s`);
    }
    if (externalSignal?.aborted && e?.name === 'AbortError') {
      throw new Error('Požadavek zrušen uživatelem');
    }
    throw e;
  } finally {
    if (externalSignal && externalAbortHandler) {
      externalSignal.removeEventListener('abort', externalAbortHandler);
    }
    clearTimeout(timeout);
  }
}

  // Use core module with error handling
  function parseTranslations(raw, keys) {
    try {
      const parsed = parseWithOpenRouterNormalization(raw, keys, state.translated);
      if (parsed.normalizedUsed) {
        log('ℹ AUTO_NORMALIZOVANO_Z_OPENROUTER_FORMATU');
      }
      return parsed.missing;
    } catch(e) {
      logError('parseTranslations', e, {
        rawLength: raw?.length,
        keysCount: keys?.length,
        keysSample: keys?.slice(0, 5)
      });
      // Return all keys as missing to trigger retry
      return keys;
    }
  }

  // ══ AUTO REŽIM ═══════════════════════════════════════════════════
function toggleAuto() {
  if (state.autoRunning) { stopAuto(); return; }
  startAuto();
}

function startAuto() {
  state.autoRunning = true;
  document.getElementById('btnAuto').classList.add('active');
  document.getElementById('btnAuto').textContent = '■ AUTO';
  document.getElementById('autoPanel').classList.add('show');
  document.getElementById('autoInterval').textContent = state.currentInterval;
  startAutoProviderCountdownTicker();
  if (isAutoTokenLimitReached()) {
    stopAuto();
    showToast(t('toast.auto.notStartedTokenLimit'));
    return;
  }
  runAutoStep();
}

function stopAuto() {
  state.autoRunning = false;
  state.sideFallbackAbortVersion++;
  clearTimeout(state.autoTimer);
  clearInterval(state.autoCountTimer);
  document.getElementById('btnAuto').classList.remove('active');
  document.getElementById('btnAuto').textContent = '▶ AUTO';
  if (window.innerWidth <= 600) {
    document.getElementById('autoPanel').classList.remove('show');
  }
  document.getElementById('countdown').textContent = '—';
  updateAutoProviderCountdowns();
  stopElapsedTimer();
}

function setAutoProviderCountdownLabel(prov, text) {
  const el = document.getElementById(`autoCountdown_${prov}`);
  if (el) el.textContent = text;
}

function isAutoProviderEnabled(prov) {
  if (prov === 'gemini' || prov === 'openrouter') {
    const raw = localStorage.getItem(PIPELINE_SECONDARY_ENABLED_KEY + prov);
    if (raw === null) {
      setPipelineSecondaryEnabled(prov, true);
      return true;
    }
    return raw === '1';
  }
  const raw = localStorage.getItem(AUTO_PROVIDER_ENABLED_KEY + prov);
  if (raw === null) {
    localStorage.setItem(AUTO_PROVIDER_ENABLED_KEY + prov, '1');
    return true;
  }
  return raw === '1';
}

function setAutoProviderEnabled(prov, enabled) {
  const on = !!enabled;
  if (prov === 'gemini' || prov === 'openrouter') {
    setPipelineSecondaryEnabled(prov, on);
    syncSecondaryProviderToggles(prov, on);
    return;
  }
  localStorage.setItem(AUTO_PROVIDER_ENABLED_KEY + prov, on ? '1' : '0');
}

function initAutoProviderToggles() {
  ['groq', 'gemini', 'openrouter'].forEach(prov => {
    const cb = document.getElementById(`autoEnable_${prov}`);
    if (!cb) return;
    cb.checked = isAutoProviderEnabled(prov);
    cb.onchange = () => {
      setAutoProviderEnabled(prov, cb.checked);
      updateAutoProviderCountdowns();
    };
  });
}

function updateAutoProviderCountdowns() {
  const mainLeft = Math.max(0, parseInt(document.getElementById('countdown')?.textContent || '0', 10) || 0);
  const providerLabel = (prov) => String(PROVIDERS[prov]?.label || prov).split(' ')[0];
  const groqLabel = 'Groq';
  if (!isAutoProviderEnabled('groq')) {
    setAutoProviderCountdownLabel('groq', t('provider.status.disabled', { label: groqLabel }));
  } else {
    if (state.autoRunning) {
      setAutoProviderCountdownLabel('groq', mainLeft > 0
        ? t('provider.status.nextIn', { label: groqLabel, seconds: mainLeft })
        : t('provider.status.running', { label: groqLabel }));
    } else {
      setAutoProviderCountdownLabel('groq', t('provider.status.ready', { label: groqLabel }));
    }
  }
  ['gemini', 'openrouter'].forEach(prov => {
    if (Date.now() < Number(state.providerFailBadgeUntil[prov] || 0)) {
      setAutoProviderCountdownLabel(prov, t('provider.status.failed', { label: providerLabel(prov) }));
      return;
    }
    const enabled = isAutoProviderEnabled(prov);
    if (!enabled) {
      setAutoProviderCountdownLabel(prov, t('provider.status.disabled', { label: providerLabel(prov) }));
      return;
    }
    const pending = Math.max(0, Number(state.providerFallbackPendingCount?.[prov] || 0));
    if (pending > 0) {
      setAutoProviderCountdownLabel(prov, `${providerLabel(prov)}: ${getUiLang() === 'en' ? 'processing partial' : 'zpracovává neúplné'} (${pending})`);
      return;
    }
    const nextState = getSecondaryNextOperationState(prov);
    if (nextState.exhausted && nextState.nextSec > 0) {
      setAutoProviderCountdownLabel(prov, `${providerLabel(prov)}: ${getUiLang() === 'en' ? 'waiting' : 'čeká'} ${nextState.nextSec}s ${getUiLang() === 'en' ? 'for next attempt' : 'do dalšího pokusu'}`);
      return;
    }
    setAutoProviderCountdownLabel(prov, t('provider.status.ready', { label: providerLabel(prov) }));
  });
}

function startAutoProviderCountdownTicker() {
  stopAutoProviderCountdownTicker();
  updateAutoProviderCountdowns();
  state.autoProviderCountdownTimer = setInterval(updateAutoProviderCountdowns, 500);
}

function stopAutoProviderCountdownTicker() {
  clearInterval(state.autoProviderCountdownTimer);
  state.autoProviderCountdownTimer = null;
}

async function runAutoStep() {
  if (!state.autoRunning || state.autoStepRunning) return;
  state.autoStepRunning = true;

  try {
    if (!isAutoProviderEnabled('groq')) {
      stopAuto();
      log('🛑 AUTO zastaven: Groq je vypnutý v AUTO panelu');
      const groqHint = t('auto.groqEnableHint');
      const autoLogEl = document.getElementById('autoLog');
      if (autoLogEl) autoLogEl.textContent = groqHint;
      setAutoProviderCountdownLabel('groq', groqHint);
      if (window.innerWidth <= 600) {
        document.getElementById('autoPanel')?.classList.add('show');
      }
      showToast(t('toast.auto.enableGroq'));
      return;
    }
    if (isAutoTokenLimitReached()) {
      stopAuto();
      log('🛑 AUTO zastaven: dosažen limit tokenů');
      showToast(t('toast.auto.stoppedTokenLimit'));
      return;
    }

    const batch = getNextBatch(state.currentBatchSize);
    if (!batch.length) {
      stopAuto();
      showToast(t('toast.translation.done'));
      return;
    }

    document.getElementById('autoBatch').textContent = batch[0] + '–' + batch[batch.length-1];
    log(`⚡ Překládám ${batch[0]}–${batch[batch.length-1]}...`);
    updateETA();

    const result = await translateBatch(batch);
    updateStats();
    renderList();
    if (state.activeKey && state.translated[state.activeKey]) renderDetail();

    if (!state.autoRunning) return;

    // Odpočet do další dávky (u rate limitu delší odklad)
    const delaySeconds = result?.rateLimited ? (result.cooldownSeconds || 60) : state.currentInterval;
    let remaining = delaySeconds;
    document.getElementById('countdown').textContent = remaining;
    clearInterval(state.autoCountTimer);
    state.autoCountTimer = setInterval(() => {
      remaining--;
      document.getElementById('countdown').textContent = remaining;
      if (remaining <= 0) clearInterval(state.autoCountTimer);
    }, 1000);
    updateAutoProviderCountdowns();

    state.autoTimer = setTimeout(runAutoStep, delaySeconds * 1000);
  } finally {
    state.autoStepRunning = false;
  }
}

// ══ STATS & SAVE ════════════════════════════════════════════════
function updateStats() {
  // Počítej jen kompletní překlady se všemi požadovanými poli
  const done = Object.values(state.translated).filter(t => isTranslationComplete(t)).length;
  const total  = state.entries.length;
  const remain = total - done;
  const pct    = total ? (done / total * 100).toFixed(1) : 0;
  document.getElementById('sDone').textContent   = done;
  document.getElementById('sRemain').textContent = remain;
  document.getElementById('sTotal').textContent  = total;
  document.getElementById('pbar').style.width    = pct + '%';
  const pbarContainer = document.getElementById('pbarContainer');
  if (pbarContainer) {
    pbarContainer.setAttribute('aria-valuenow', pct);
    pbarContainer.setAttribute('aria-valuetext', `${done} z ${total} hesel přeloženo (${pct}%)`);
  }
  if (state.autoRunning) updateETA();
}

function saveProgressImmediate() {
   try {
    localStorage.setItem(storeKey(), JSON.stringify({
      translated: state.translated,
      sourceEntryEdits: state.sourceEntryEdits,
       ts: Date.now(),
       fileId: state.currentFileId
     }));
     maybeAutoBackup();
   } catch(e) {
     logError('saveProgress', e, {
       translatedCount: Object.keys(state.translated).length,
       approxSizeKB: JSON.stringify(state.translated).length / 1024
     });
     showToast(t('toast.storage.full'));
   }
}

// Debounced save – shlukne rychlé za sebou jdoucí úpravy (editace, import, atd.)
const saveProgress = debounce(saveProgressImmediate, 500);

// ── Undo + auto-backup infrastruktura ─────────────────────────────
const AUTO_BACKUP_EVERY_N_BATCHES = 10;
function writeBackup(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch(e) {
    logWarn('writeBackup', `Nelze uložit backup (${key})`, { error: e.message });
    return false;
  }
}

function maybeAutoBackup() {
  state.batchesSinceBackup++;
  if (state.batchesSinceBackup < AUTO_BACKUP_EVERY_N_BATCHES) return;
  state.batchesSinceBackup = 0;
  const doneCount = Object.values(state.translated)
    .filter(t => isTranslationComplete(t)).length;
  if (doneCount === 0) return;
  writeBackup(backupKey(), { translated: state.translated, ts: Date.now(), count: doneCount, fileId: state.currentFileId });
  logInfo('autoBackup', `Automatická záloha: ${doneCount} hesel`);
  updateBackupButtonVisibility();
}

function updateFileIdBadge() {
  const badge = document.getElementById('fileIdBadge');
  if (!badge) return;
  if (!state.currentFileId) { badge.style.display = 'none'; return; }
  // Zkrácený identifikátor — typ + počet
  const parts = state.currentFileId.split('_');
  const typeTag = parts[0] || '?';
  const count = parts[1] || '?';
  const typeName = typeTag === 'G' ? 'GR' : typeTag === 'H' ? 'HE' : typeTag;
  badge.textContent = `${typeName}·${count}`;
  badge.style.display = 'inline-block';
  badge.title = `Aktivní soubor: ${state.currentFileId}\nSlot průběhu: ${storeKey()}`;
}

function updateBackupButtonVisibility() {
  const btn = document.getElementById('btnRestoreBackup');
  if (!btn) return;
  const b = hasBackup();
  if (b && b.count > 0) {
    btn.style.display = 'inline-block';
    btn.title = `Obnovit ze zálohy (${b.count} hesel, ${new Date(b.ts).toLocaleString('cs')})`;
  } else {
    btn.style.display = 'none';
  }
}

function hasBackup() {
  const raw = localStorage.getItem(backupKey());
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || !d.translated) return null;
    return d;
  } catch(e) { return null; }
}

function hasUndo() {
  const raw = localStorage.getItem(undoKey());
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || !d.translated) return null;
    // Undo je platné jen pár minut
    if (Date.now() - (d.ts || 0) > 10 * 60 * 1000) {
      localStorage.removeItem(undoKey());
      return null;
    }
    return d;
  } catch(e) { return null; }
}

function restoreFromBackup(source) {
  const d = source === 'undo' ? hasUndo() : hasBackup();
  if (!d) { showToast(t('toast.backup.none')); return; }
  const count = Object.keys(d.translated).length;
  if (!confirm(t('confirm.restoreBackup', { count, ts: new Date(d.ts).toLocaleString(getUiLang() === 'en' ? 'en' : 'cs') }))) return;
  // Ulož aktuální stav jako undo před přepsáním
  writeBackup(undoKey(), { translated: state.translated, ts: Date.now(), fileId: state.currentFileId });
  state.translated = d.translated;
  saveProgressImmediate();
  updateStats();
  renderList();
  updateFailedCount();
  if (source === 'undo') localStorage.removeItem(undoKey());
  showToast(t('toast.restored.count', { count }));
}

function clearProgress() {
  if (!confirm(t('confirm.clearProgress'))) return;
  // Ulož snapshot jako undo
  writeBackup(undoKey(), { translated: state.translated, ts: Date.now(), fileId: state.currentFileId });
  localStorage.removeItem(storeKey());
  state.translated = {};
  updateStats();
  renderList();
  clearLog();
  const pane = document.getElementById('detailPane');
  if (pane) pane.innerHTML = `<div class="detail-empty">${t('detail.empty')}</div>`;
  showToastWithAction(t('toast.progressClearedRestore.message'), t('toast.progressClearedRestore.action'), () => restoreFromBackup('undo'));
}

// ══ EXPORT ═══════════════════════════════════════════════════════
function exportTXT() {
  const done = state.entries.filter(e => {
    const tr = state.translated[e.key];
    return tr && tr.vyznam && tr.vyznam !== '—' && !tr.skipped;
  });
  if (!done.length) { showToast(t('toast.noTranslatedEntry')); return; }

  const lines = done.map(e => {
    const tr = state.translated[e.key];
    const parts = [
      `${e.key} | ${e.greek}`,
      `Gramatika: ${e.tvaroslovi || '—'}`,
      `Český význam: ${tr.vyznam || '—'}`,
      `Definice (EN): ${e.definice || e.def || '—'}`,
      `Česká definice: ${tr.definice || '—'}`,
      `KJV překlady (CZ): ${tr.kjv || e.kjv || '—'}`,
      `Biblické užití: ${tr.pouziti || e.vyskyt || '—'}`,
      `Původ: ${tr.puvod || '—'}`,
      `Specialista: ${tr.specialista || '—'}`,
      ''
    ];
    return parts.join('\n');
  });

  download('strong_gr_cz_v2.txt', lines.join('\n'), 'text/plain');
  showToast(t('toast.exported.count', { count: done.length }));
}

function exportJSON() {
  const out = {};
  for (const e of state.entries) {
    if (!state.translated[e.key]) continue;
    out[e.key] = { greek: e.greek, ...translated[e.key] };
  }
  download('strong_gr_cz_v2.json', JSON.stringify(out, null, 2), 'application/json');
  showToast(t('toast.exported.count', { count: Object.keys(out).length }));
}

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

function saveApiKey() {
  const v = document.getElementById('apiKey').value.trim();
  const prov = document.getElementById('provider').value;
  if (v) {
    localStorage.setItem('strong_apikey_' + prov, v);
    localStorage.setItem('strong_apikey', v);
  } else {
    localStorage.removeItem('strong_apikey_' + prov);
  }
  const selected = document.getElementById('apiKeyProfile')?.value;
  if (selected && selected !== '__manual__') {
    const profiles = getApiKeyProfiles(prov);
    const idx = profiles.findIndex(p => p.id === selected);
    if (idx !== -1) {
      profiles[idx].key = v;
      localStorage.setItem(API_KEY_PROFILES_PREFIX + prov, JSON.stringify(profiles));
    }
  }
}

function getApiKeyProfiles(prov) {
  try {
    const parsed = JSON.parse(localStorage.getItem(API_KEY_PROFILES_PREFIX + prov) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(p => p && p.id && typeof p.key === 'string');
  } catch (e) {
    return [];
  }
}

function setApiKeyProfiles(prov, profiles) {
  localStorage.setItem(API_KEY_PROFILES_PREFIX + prov, JSON.stringify(profiles));
}

function maskApiKey(v) {
  const s = String(v || '').trim();
  if (!s) return 'prázdný';
  if (s.length < 10) return s;
  return `${s.slice(0, 5)}...${s.slice(-4)}`;
}

function setupApiKeySwitcher(prov) {
  const select = document.getElementById('apiKeyProfile');
  if (!select) return;
  const profiles = getApiKeyProfiles(prov);
  const activeId = localStorage.getItem(API_KEY_ACTIVE_PROFILE_PREFIX + prov) || '__manual__';
  const options = ['<option value="__manual__">Ruční klíč (aktuální pole)</option>'];
  for (const p of profiles) {
    options.push(`<option value="${p.id}">${escHtml(p.name || 'Klíč')} · ${maskApiKey(p.key)}</option>`);
  }
  select.innerHTML = options.join('');
  if (activeId !== '__manual__' && select.querySelector(`option[value="${activeId}"]`)) {
    select.value = activeId;
    const active = profiles.find(p => p.id === activeId);
    if (active) document.getElementById('apiKey').value = active.key || '';
  } else {
    select.value = '__manual__';
  }
}

function onApiKeyProfileChange() {
  const prov = document.getElementById('provider').value;
  const select = document.getElementById('apiKeyProfile');
  if (!select) return;
  const selected = select.value;
  if (selected === '__manual__') {
    localStorage.removeItem(API_KEY_ACTIVE_PROFILE_PREFIX + prov);
    saveApiKey();
    return;
  }
  const profiles = getApiKeyProfiles(prov);
  const profile = profiles.find(p => p.id === selected);
  if (!profile) return;
  document.getElementById('apiKey').value = profile.key || '';
  localStorage.setItem(API_KEY_ACTIVE_PROFILE_PREFIX + prov, profile.id);
  saveApiKey();
  showToast(t('toast.apiKey.activeProfile', { name: profile.name || (getUiLang() === 'en' ? 'unnamed' : 'bez názvu') }));
}

function saveCurrentApiKeyAsProfile() {
  const prov = document.getElementById('provider').value;
  const key = document.getElementById('apiKey').value.trim();
  if (!key) {
    showToast(t('toast.apiKey.insertFirst'));
    return;
  }
  const defaultName = `${PROVIDERS[prov]?.label?.split(' ')[0] || prov} ${new Date().toLocaleDateString('cs-CZ')}`;
  const name = (prompt(t('prompt.apiKeyName'), defaultName) || '').trim();
  if (!name) return;
  const profiles = getApiKeyProfiles(prov);
  const existing = profiles.find(p => p.key === key);
  if (existing) {
    existing.name = name;
    setApiKeyProfiles(prov, profiles);
    localStorage.setItem(API_KEY_ACTIVE_PROFILE_PREFIX + prov, existing.id);
  } else {
    const id = `k_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    profiles.push({ id, name, key });
    setApiKeyProfiles(prov, profiles);
    localStorage.setItem(API_KEY_ACTIVE_PROFILE_PREFIX + prov, id);
  }
  setupApiKeySwitcher(prov);
  onApiKeyProfileChange();
}

function deleteApiKeyProfile() {
  const prov = document.getElementById('provider').value;
  const select = document.getElementById('apiKeyProfile');
  if (!select || select.value === '__manual__') {
    showToast(t('toast.apiKey.selectToDelete'));
    return;
  }
  const profiles = getApiKeyProfiles(prov);
  const profile = profiles.find(p => p.id === select.value);
  if (!profile) return;
  if (!confirm(t('confirm.apiKey.delete', { name: profile.name }))) return;
  const filtered = profiles.filter(p => p.id !== select.value);
  setApiKeyProfiles(prov, filtered);
  localStorage.removeItem(API_KEY_ACTIVE_PROFILE_PREFIX + prov);
  setupApiKeySwitcher(prov);
  showToast(t('toast.apiKey.deleted'));
}

function getCurrentApiKey(prov) {
  const requestedProvider = prov || document.getElementById('provider')?.value;
  const activeProvider = document.getElementById('provider')?.value || '';
  if (!prov || requestedProvider === activeProvider) {
    const fromInput = (document.getElementById('apiKey')?.value || '').trim();
    if (fromInput) return fromInput;
  }
  return (localStorage.getItem('strong_apikey_' + requestedProvider) || '').trim();
}

async function loadSavedSettings() {
  await loadUiMessages();
  const prov = localStorage.getItem('strong_provider') || 'groq';
  const providerEl = document.getElementById('provider');
  if (providerEl) {
    providerEl.value = prov;
    providerEl._lastProvider = prov;
  }
  
  const k = localStorage.getItem('strong_apikey_' + prov);
  const apiKeyEl = document.getElementById('apiKey');
  if (apiKeyEl) apiKeyEl.value = k || '';
  setupApiKeySwitcher(prov);
  
  let p = localStorage.getItem('strong_prompt') || '';
  if (!p.trim()) {
    p = getSystemPromptForCurrentTask('batch');
    localStorage.setItem('strong_prompt', p);
    localStorage.setItem('strong_prompt_mode', 'system');
  }
  const promptEditor = document.getElementById('promptEditor');
  if (promptEditor) {
    promptEditor.value = p;
    promptEditor.addEventListener('input', () => {
      localStorage.setItem('strong_prompt', promptEditor.value);
      if (!state.isProgrammaticPromptSet) {
        localStorage.setItem('strong_prompt_mode', 'custom');
      }
    });
  }
  
  const modelSelect = document.getElementById('model');
  if (modelSelect) {
    onProviderChange();
    modelSelect.addEventListener('change', () => {
      localStorage.setItem('strong_model', modelSelect.value);
    });
  }
  initPipelineModelSelectors();
  const mainPipelineModel = getPipelineModelForProvider('groq');
  if (providerEl) providerEl.value = 'groq';
  if (modelSelect && mainPipelineModel) {
    modelSelect.value = mainPipelineModel;
    localStorage.setItem('strong_model', mainPipelineModel);
  }
  
  checkDefaultFile();
  if (localStorage.getItem(LAST_FILE_KEY)) {
    loadDefaultFile();
  }
  updateFailedCount();
  updatePromptStatusIndicator();
  updatePromptAutoButton();
  updatePromptLangButtonLabel();

  // Load language settings
  let targetLang = localStorage.getItem('strong_target_lang') || 'cz';
  if (targetLang === 'cs') targetLang = 'cz'; // Migration from old code
  let sourceLang = localStorage.getItem('strong_source_lang') || 'gr';
  
  const targetEl = document.getElementById('targetLanguage');
  const sourceEl = document.getElementById('sourceLanguage');
  const uiEl = document.getElementById('uiLanguage');
  if (targetEl) targetEl.value = targetLang;
  if (sourceEl) sourceEl.value = sourceLang;
  if (uiEl) uiEl.value = getUiLang();
  applyUiLanguage();

  const tokenLimitEl = document.getElementById('autoTokenLimit');
  if (tokenLimitEl) {
    tokenLimitEl.value = localStorage.getItem(AUTO_TOKEN_LIMIT_KEY) || '';
    tokenLimitEl.oninput = saveAutoTokenLimit;
  }
  const modelTestPromptTypeEl = document.getElementById('modelTestPromptType');
  const modelTestPromptEnableEl = document.getElementById('modelTestEnablePrompt');
  const modelTestPromptCompareEnableEl = document.getElementById('modelTestEnablePromptCompare');
  const modelTestPromptTypeCompareEl = document.getElementById('modelTestPromptTypeCompare');
  const modelTestCustomPromptEl = document.getElementById('modelTestCustomPromptInput');
  if (modelTestPromptEnableEl) {
    modelTestPromptEnableEl.checked = isModelTestPromptEnabled();
    modelTestPromptEnableEl.onchange = () => {
      saveModelTestPromptSettings();
      updateModelTestPromptUi();
    };
  }
  if (modelTestPromptTypeEl) {
    refreshLanguageAwarePromptOptionLabels();
    modelTestPromptTypeEl.value = getModelTestPromptType();
    modelTestPromptTypeEl.onchange = () => {
      saveModelTestPromptSettings();
      updateModelTestPromptUi();
    };
  }
  if (modelTestPromptTypeCompareEl && modelTestPromptTypeEl) {
    modelTestPromptTypeCompareEl.innerHTML = modelTestPromptTypeEl.innerHTML;
    modelTestPromptTypeCompareEl.value = getModelTestPromptCompareType();
    modelTestPromptTypeCompareEl.onchange = () => {
      saveModelTestPromptSettings();
      updateModelTestPromptUi();
    };
  }
  if (modelTestPromptCompareEnableEl) {
    modelTestPromptCompareEnableEl.checked = isModelTestPromptCompareEnabled();
    modelTestPromptCompareEnableEl.onchange = () => {
      saveModelTestPromptSettings();
      updateModelTestPromptUi();
    };
  }
  if (modelTestCustomPromptEl) {
    modelTestCustomPromptEl.value = getModelTestCustomPromptText();
    modelTestCustomPromptEl.oninput = saveModelTestPromptSettings;
  }
  updateModelTestPromptUi();
  syncTopicPromptTemplatesReport();
  refreshTokenStatsDisplay();
  initAutoProviderToggles();
  startAutoProviderCountdownTicker();
  bindSetupCompactSummaryEvents();
  updateSetupCompactSummary();
}

function getCompactSelectedOptionLabel(selectId, fallback = '—') {
  const el = document.getElementById(selectId);
  if (!el) return fallback;
  const txt = String(el.selectedOptions?.[0]?.text || el.value || '').trim();
  return txt || fallback;
}

function getCompactPipelineSecondaryLabel() {
  const geminiEnabled = !!document.getElementById('pipelineEnableSecondaryGemini')?.checked;
  const openrouterEnabled = !!document.getElementById('pipelineEnableSecondaryOpenrouter')?.checked;
  const parts = [];
  if (geminiEnabled) parts.push(getCompactSelectedOptionLabel('pipelineModelSecondaryGemini', 'Gemini'));
  if (openrouterEnabled) parts.push(getCompactSelectedOptionLabel('pipelineModelSecondaryOpenrouter', 'OpenRouter'));
  if (parts.length) return parts.join(' | ');
  return 'auto router off';
}

function updateSetupCompactSummary() {
  const el = document.getElementById('setupCompactSummary');
  if (!el) return;
  const main = getCompactSelectedOptionLabel('pipelineModelMainGroq', '—');
  const secondary = getCompactPipelineSecondaryLabel();
  const batch = String(document.getElementById('batchSize')?.value || '10');
  const interval = String(document.getElementById('interval')?.value || '20');
  const summary = `${main}, ${secondary}, hesel ${batch}, interval ${interval} s`;
  el.textContent = summary;
  el.title = summary;
}

function bindSetupCompactSummaryEvents() {
  ['batchSize', 'interval'].forEach(id => {
    const el = document.getElementById(id);
    if (!el || el.dataset.compactSummaryBound === '1') return;
    el.addEventListener('change', updateSetupCompactSummary);
    el.dataset.compactSummaryBound = '1';
  });
}

// Volej po načtení stránky
window.addEventListener('DOMContentLoaded', () => {
  loadSavedSettings().catch(err => {
    console.error('[i18n] Startup failed:', err);
    showToast(t('toast.error.withMessage', { message: err?.message || String(err) }));
  });
});

function logEntry(keys, rawResponse) {
  const scroll = document.getElementById('logScroll');
  if (!scroll) return;

  const placeholder = scroll.querySelector('.log-placeholder');
  if (placeholder) placeholder.remove();

  for (const key of keys) {
    const e = state.entryMap.get(key);
    const tr = state.translated[key];
    if (!e) continue;

    const div = document.createElement('div');
    div.className = 'log-entry';
    div.style.cursor = 'pointer';
    div.title = t('log.entry.title');
    div.onclick = () => showDetail(key);
    div.innerHTML = `
      <div class="log-key-line">
        <span class="log-key">${key}</span>
        <span class="log-greek">${escHtml(e.greek)}</span>
      </div>
      ${tr && !tr.skipped
        ? `<div class="log-vyznam"><b>${t('log.meaning')}</b> ${escHtml(tr.vyznam || '—')}</div>
           <div class="log-definice">${escHtml((tr.definice || '').slice(0, 120))}${(tr.definice || '').length > 120 ? '…' : ''}</div>
           ${tr.kjv ? `<div class="log-orig"><b>KJV:</b> ${escHtml(tr.kjv.slice(0, 80))}${(tr.kjv || '').length > 80 ? '…' : ''}</div>` : ''}
           <div class="log-orig"><b>${t('log.usage')}</b> ${escHtml((tr.pouziti || '').slice(0, 80))}${(tr.pouziti || '').length > 80 ? '…' : ''}</div>`
        : `<div class="log-err">${t('log.unparsed')}</div>`
      }
    `;
    scroll.appendChild(div);
  }

  scroll.scrollTop = scroll.scrollHeight;

  // Počítadlo
  const cnt = scroll.children.length;
  const countEl = document.getElementById('logCount');
  if (countEl) countEl.textContent = t('log.records', { count: cnt });

  // Limit state.entries in log
  while (scroll.children.length > CONFIG.LOG_MAX_ENTRIES) scroll.removeChild(scroll.firstChild);
}

function clearLog() {
  const s = document.getElementById('logScroll');
  if (s) s.innerHTML = '<div class="log-placeholder" style="padding:20px;font-family:\'JetBrains Mono\',monospace;font-size:11px;color:var(--txt3)">Překlady se budou zobrazovat zde automaticky...</div>';
  const c = document.getElementById('logCount');
  if (c) c.textContent = '';
}

function showModelTestModal(providerLabel, clearOutput = false) {
  const modal = document.getElementById('modelTestModal');
  const info = document.getElementById('modelTestInfo');
  const output = document.getElementById('modelTestOutput');
  const providerSelect = document.getElementById('modelTestProvider');
  const promptEnable = document.getElementById('modelTestEnablePrompt');
  const promptTypeSelect = document.getElementById('modelTestPromptType');
  const promptCompareEnable = document.getElementById('modelTestEnablePromptCompare');
  const promptCompareTypeSelect = document.getElementById('modelTestPromptTypeCompare');
  const customPromptInput = document.getElementById('modelTestCustomPromptInput');
  if (!modal || !info || !output || !providerSelect) return;
  providerSelect.innerHTML = [
    `<option value="parallel-3">3 provideři paralelně</option>`,
    ...Object.keys(PROVIDERS)
    .map(k => `<option value="${k}">${PROVIDERS[k].label}</option>`)
  ].join('');
  const currentProvider = document.getElementById('provider')?.value || 'groq';
  providerSelect.value = currentProvider;
  populateModelTestModelSelect('groq');
  populateModelTestModelSelect('gemini');
  populateModelTestModelSelect('openrouter');
  saveModelTestModelSelections();
  updateModelTestProviderUi();
  info.textContent = `Provider: ${providerLabel || '—'}`;
  if (clearOutput) {
    output.value = '';
    clearModelTestOutputFromStorage();
  } else if (!output.value.trim()) {
    const saved = loadModelTestOutputFromStorage();
    if (saved) output.value = saved;
  }
  if (promptEnable) {
    promptEnable.checked = isModelTestPromptEnabled();
  }
  if (promptTypeSelect) {
    promptTypeSelect.value = getModelTestPromptType();
  }
  if (promptCompareTypeSelect && promptTypeSelect) {
    promptCompareTypeSelect.innerHTML = promptTypeSelect.innerHTML;
    promptCompareTypeSelect.value = getModelTestPromptCompareType();
  }
  if (promptCompareEnable) {
    promptCompareEnable.checked = isModelTestPromptCompareEnabled();
  }
  if (customPromptInput) {
    customPromptInput.value = getModelTestCustomPromptText();
  }
  updateModelTestPromptUi();
  modal.classList.add('show');
  updateModelTestRunButton();
  renderModelStatsTable();
}

function updateModelTestPromptUi() {
  const promptEnable = document.getElementById('modelTestEnablePrompt');
  const promptTypeSelect = document.getElementById('modelTestPromptType');
  const promptCompareEnable = document.getElementById('modelTestEnablePromptCompare');
  const promptCompareTypeSelect = document.getElementById('modelTestPromptTypeCompare');
  const promptCompareRow = document.getElementById('modelTestPromptCompareRow');
  const customPromptRow = document.getElementById('modelTestCustomPromptRow');
  const enabled = !!promptEnable?.checked;
  if (promptTypeSelect) promptTypeSelect.disabled = !enabled;
  if (promptCompareEnable) promptCompareEnable.disabled = !enabled;
  const compareEnabled = enabled && !!promptCompareEnable?.checked;
  if (promptCompareTypeSelect) promptCompareTypeSelect.disabled = !compareEnabled;
  if (promptCompareRow) promptCompareRow.style.display = compareEnabled ? 'block' : 'none';
  const isCustom = enabled && (promptTypeSelect?.value || 'custom') === 'custom';
  if (customPromptRow) customPromptRow.style.display = isCustom ? 'block' : 'none';
}

function saveModelTestPromptSettings() {
  const promptEnable = document.getElementById('modelTestEnablePrompt');
  const promptTypeSelect = document.getElementById('modelTestPromptType');
  const promptCompareEnable = document.getElementById('modelTestEnablePromptCompare');
  const promptCompareTypeSelect = document.getElementById('modelTestPromptTypeCompare');
  const customPromptInput = document.getElementById('modelTestCustomPromptInput');
  if (promptEnable) {
    localStorage.setItem(MODEL_TEST_ENABLE_PROMPT_KEY, promptEnable.checked ? '1' : '0');
  }
  if (promptTypeSelect) {
    localStorage.setItem(MODEL_TEST_PROMPT_TYPE_KEY, promptTypeSelect.value || 'preset_v12');
  }
  if (promptCompareEnable) {
    localStorage.setItem(MODEL_TEST_PROMPT_COMPARE_ENABLE_KEY, promptCompareEnable.checked ? '1' : '0');
  }
  if (promptCompareTypeSelect) {
    localStorage.setItem(MODEL_TEST_PROMPT_COMPARE_TYPE_KEY, promptCompareTypeSelect.value || 'preset_v12');
  }
  if (customPromptInput) {
    localStorage.setItem(MODEL_TEST_CUSTOM_PROMPT_KEY, customPromptInput.value || '');
  }
}

function closeModelTestModal() {
  if (state.modelTestRunning) {
    showToast(t('toast.test.cancelFirst'));
    return;
  }
  const modal = document.getElementById('modelTestModal');
  if (modal) modal.classList.remove('show');
}

function cancelModelTest() {
  if (!state.modelTestRunning) return;
  state.modelTestCancelRequested = true;
  if (state.modelTestAbortController) state.modelTestAbortController.abort();
  updateModelTestRunButton();
  showToast(t('toast.test.canceling'));
}

function modelTestClearCountdownInterval() {
  if (state.modelTestCountdownInterval) {
    clearInterval(state.modelTestCountdownInterval);
    state.modelTestCountdownInterval = null;
  }
}

function modelTestSetCountdownLabel(text) {
  const el = document.getElementById('modelTestCountdown');
  if (el) el.textContent = text || '';
}

function renderModelTestProviderCountdowns() {
  const labels = {
    groq: 'Groq',
    gemini: 'Gemini',
    openrouter: 'OpenRouter'
  };
  Object.keys(labels).forEach(prov => {
    const el = document.getElementById(`modelTestCountdown_${prov}`);
    if (!el) return;
    const sec = Math.max(0, Math.ceil(Number(state.modelTestProviderEta[prov] || 0)));
    el.textContent = `${labels[prov]}: ${sec > 0 ? `další požadavek za ~${sec}s` : 'připraveno'}`;
  });
}

function modelTestSetProviderEta(prov, sec) {
  if (!Object.prototype.hasOwnProperty.call(state.modelTestProviderEta, prov)) return;
  state.modelTestProviderEta[prov] = Math.max(0, Number(sec) || 0);
  renderModelTestProviderCountdowns();
}

function modelTestResetProviderEta() {
  state.modelTestProviderEta = { groq: 0, gemini: 0, openrouter: 0 };
  renderModelTestProviderCountdowns();
}

function modelTestStartProviderCountdownTicker() {
  if (state.modelTestProviderCountdownInterval) clearInterval(state.modelTestProviderCountdownInterval);
  state.modelTestProviderCountdownInterval = setInterval(renderModelTestProviderCountdowns, 500);
}

function modelTestStopProviderCountdownTicker() {
  if (state.modelTestProviderCountdownInterval) {
    clearInterval(state.modelTestProviderCountdownInterval);
    state.modelTestProviderCountdownInterval = null;
  }
}

function updateModelTestRunButton() {
  const buttons = ['btnRunModelTest', 'btnRunModelTestTop']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  if (!buttons.length) return;
  const apply = (text, className) => {
    buttons.forEach(btn => {
      btn.textContent = text;
      btn.className = className;
    });
  };
  if (state.modelTestRunning) {
    if (state.modelTestCancelRequested) {
      apply('⏹ Zastavuji...', 'modal-btn cancel');
      return;
    }
    const sec = Math.max(0, Math.ceil(Number(state.modelTestNextRequestEtaSec || 0)));
    apply(sec > 0 ? `■ Běží (${sec}s)` : '■ Běží', 'modal-btn cancel');
    return;
  }
  apply('▶ Test provideru', 'modal-btn ok');
}

function modelTestSetLastStatus(text, kind = 'idle') {
  const el = document.getElementById('modelTestLastStatus');
  if (!el) return;
  el.textContent = text || '';
  if (kind === 'error') {
    el.style.color = '#d25f5f';
  } else if (kind === 'ok') {
    el.style.color = '#5a9a6c';
  } else if (kind === 'warn') {
    el.style.color = '#d8a85f';
  } else {
    el.style.color = 'var(--txt2)';
  }
}

function saveModelTestOutputToStorage(text) {
  try { localStorage.setItem(MODEL_TEST_OUTPUT_KEY, String(text || '')); } catch (e) {}
}

function loadModelTestOutputFromStorage() {
  try { return localStorage.getItem(MODEL_TEST_OUTPUT_KEY) || ''; } catch (e) { return ''; }
}

function clearModelTestOutputFromStorage() {
  try { localStorage.removeItem(MODEL_TEST_OUTPUT_KEY); } catch (e) {}
}

function getModelTestStatsMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MODEL_TEST_STATS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function saveModelTestStatsMap(map) {
  try { localStorage.setItem(MODEL_TEST_STATS_KEY, JSON.stringify(map || {})); } catch (e) {}
}

function upsertModelTestStats(prov, model, payload) {
  const key = `${prov}::${model}`;
  const map = getModelTestStatsMap();
  const row = map[key] || {
    provider: prov, model,
    calls: 0, okBatches: 0, partialBatches: 0, errorBatches: 0, rateLimited: 0,
    okKeys: 0, failedKeys: 0, totalKeys: 0, latencyMsTotal: 0, latencySamples: 0, lastTs: 0
  };
  row.calls += 1;
  if (payload.status === 'OK') row.okBatches += 1;
  else if (payload.status === 'PARTIAL') row.partialBatches += 1;
  else if (payload.status === 'RATE_LIMITED') row.rateLimited += 1;
  else row.errorBatches += 1;
  row.okKeys += Math.max(0, payload.okKeys || 0);
  row.failedKeys += Math.max(0, payload.failedKeys || 0);
  row.totalKeys += Math.max(0, payload.totalKeys || (payload.okKeys || 0) + (payload.failedKeys || 0));
  if (Number.isFinite(payload.latencyMs) && payload.latencyMs > 0) {
    row.latencyMsTotal += payload.latencyMs;
    row.latencySamples += 1;
  }
  row.lastTs = Date.now();
  map[key] = row;
  saveModelTestStatsMap(map);
  renderModelStatsTable();
}

function deleteModelTestStatsRow(keyEncoded) {
  const key = decodeURIComponent(String(keyEncoded || ''));
  const map = getModelTestStatsMap();
  if (!map[key]) return;
  delete map[key];
  saveModelTestStatsMap(map);
  renderModelStatsTable();
}

function renderModelStatsTable() {
  const body = document.getElementById('modelStatsBody');
  if (!body) return;
  const rows = Object.entries(getModelTestStatsMap()).map(([key, row]) => ({ key, ...row }));
  rows.sort((a, b) => {
    const aTotal = Math.max(1, a.okKeys + a.failedKeys);
    const bTotal = Math.max(1, b.okKeys + b.failedKeys);
    const aRate = a.okKeys / aTotal;
    const bRate = b.okKeys / bTotal;
    if (bRate !== aRate) return bRate - aRate;
    const aLat = a.latencySamples ? a.latencyMsTotal / a.latencySamples : Number.POSITIVE_INFINITY;
    const bLat = b.latencySamples ? b.latencyMsTotal / b.latencySamples : Number.POSITIVE_INFINITY;
    if (aLat !== bLat) return aLat - bLat;
    return (b.calls || 0) - (a.calls || 0);
  });
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="7" style="padding:8px;color:var(--txt3)">Zatím bez dat.</td></tr>`;
    return;
  }
  body.innerHTML = rows.map(r => {
    const total = Math.max(1, (r.okKeys || 0) + (r.failedKeys || 0));
    const rate = ((r.okKeys || 0) / total) * 100;
    const avgMs = r.latencySamples ? (r.latencyMsTotal / r.latencySamples) : 0;
    return `<tr>
      <td style="padding:6px;border-top:1px solid var(--brd)">${escHtml(r.provider)}<br><span style="color:var(--txt3)">${escHtml(r.model)}</span></td>
      <td style="padding:6px;border-top:1px solid var(--brd);text-align:right">${rate.toFixed(1)}%</td>
      <td style="padding:6px;border-top:1px solid var(--brd);text-align:right">${r.okKeys || 0}/${r.failedKeys || 0}</td>
      <td style="padding:6px;border-top:1px solid var(--brd);text-align:right">${r.totalKeys || 0}</td>
      <td style="padding:6px;border-top:1px solid var(--brd);text-align:right">${formatAiResponseTime(avgMs)}</td>
      <td style="padding:6px;border-top:1px solid var(--brd);text-align:right">${r.calls || 0}</td>
      <td style="padding:6px;border-top:1px solid var(--brd);text-align:right"><button class="modal-btn cancel" style="padding:4px 8px;font-size:10px" onclick="deleteModelTestStatsRow('${encodeURIComponent(r.key)}')">Smazat</button></td>
    </tr>`;
  }).join('');
}

async function saveModelTestOutputTxt() {
  const text = document.getElementById('modelTestOutput')?.value || '';
  if (!text.trim()) {
    showToast(t('toast.test.nothingToSave'));
    return;
  }
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: DEFAULT_MODEL_TEST_LOG_FILENAME,
        types: [
          {
            description: 'Text files',
            accept: { 'text/plain': ['.txt'] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      modelTestSetLastStatus(`Uloženo: ${handle.name || DEFAULT_MODEL_TEST_LOG_FILENAME}`, 'ok');
      showToast(t('toast.saved.filename', { name: handle.name || DEFAULT_MODEL_TEST_LOG_FILENAME }));
      return;
    } catch (e) {
      const msg = String(e?.message || '');
      if (/AbortError/i.test(msg)) {
        showToast(t('toast.save.canceled'));
        return;
      }
      showToast(t('toast.saveDialogFailedFallback', { message: msg || (getUiLang() === 'en' ? 'unknown error' : 'neznámá chyba') }));
    }
  }
  download(DEFAULT_MODEL_TEST_LOG_FILENAME, text, 'text/plain');
  modelTestSetLastStatus(`Staženo: ${DEFAULT_MODEL_TEST_LOG_FILENAME}`, 'ok');
  showToast(t('toast.downloaded.filename', { name: DEFAULT_MODEL_TEST_LOG_FILENAME }));
}

function saveModelTestRawOutputToStorage() {
  try { localStorage.setItem(MODEL_TEST_RAW_OUTPUT_KEY, JSON.stringify(state.modelTestRawResponses || [])); } catch (e) {}
}

function clearModelTestRawOutputFromStorage() {
  try { localStorage.removeItem(MODEL_TEST_RAW_OUTPUT_KEY); } catch (e) {}
}

async function saveModelTestRawOutputTxt() {
  const rows = Array.isArray(state.modelTestRawResponses) ? modelTestRawResponses : [];
  if (!rows.length) {
    showToast(t('toast.test.noRawYet'));
    return;
  }
  const body = rows.map((row, idx) => {
    const header = `### ${idx + 1} | provider=${row.prov} | model=${row.model} | režim=${row.mode} | promptTest=${row.promptEnabled ? 'on' : 'off'} | prompt=${row.promptType} | ${new Date(row.ts).toLocaleString('cs-CZ')}`;
    const promptBlock = `--- ODESLANÝ PROMPT ---\n${row.promptSent || '(není dostupný)'}\n--- /ODESLANÝ PROMPT ---`;
    const rawBlock = `--- RAW ODPOVĚĎ AI ---\n${row.raw || ''}\n--- /RAW ODPOVĚĎ AI ---`;
    return `${header}\n${promptBlock}\n${rawBlock}`;
  }).join('\n\n');
  download(`strong_model_test_raw_${Date.now()}.txt`, body, 'text/plain');
  showToast(t('toast.test.rawDownloaded'));
}

function loadModelTestOutputFromFile(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const text = String(ev?.target?.result || '');
    const out = document.getElementById('modelTestOutput');
    if (out) {
      out.value = text;
      out.scrollTop = out.scrollHeight;
    }
    saveModelTestOutputToStorage(text);
    modelTestSetLastStatus(`Načteno: ${file.name}`, 'ok');
    showToast(t('toast.loaded.filename', { name: file.name }));
    if (input) input.value = '';
  };
  reader.onerror = () => {
    showToast(t('toast.file.loadFailed'));
    if (input) input.value = '';
  };
  reader.readAsText(file, 'utf-8');
}

function modelTestWaitWithCountdown(ms, signal) {
  return new Promise(resolve => {
    modelTestClearCountdownInterval();
    if (ms <= 0 || state.modelTestCancelRequested) {
      state.modelTestNextRequestEtaSec = 0;
      modelTestSetCountdownLabel('');
      updateModelTestRunButton();
      resolve();
      return;
    }
    const t0 = Date.now();
    const tick = () => {
      if (state.modelTestCancelRequested || signal?.aborted) {
        modelTestClearCountdownInterval();
        state.modelTestNextRequestEtaSec = 0;
        modelTestSetCountdownLabel('');
        updateModelTestRunButton();
        resolve();
        return;
      }
      const left = ms - (Date.now() - t0);
      if (left <= 0) {
        modelTestClearCountdownInterval();
        state.modelTestNextRequestEtaSec = 0;
        modelTestSetCountdownLabel('');
        updateModelTestRunButton();
        resolve();
        return;
      }
      state.modelTestNextRequestEtaSec = Math.ceil(left / 1000);
      const leftTestSec = state.modelTestRunEndTs > Date.now()
        ? Math.ceil((state.modelTestRunEndTs - Date.now()) / 1000)
        : 0;
      if (leftTestSec > 0) {
        const mm = Math.floor(leftTestSec / 60);
        const ss = leftTestSec % 60;
        modelTestSetCountdownLabel(`Další požadavek za cca ${state.modelTestNextRequestEtaSec} s | Zbývá testu ${mm}:${String(ss).padStart(2, '0')}`);
      } else {
        modelTestSetCountdownLabel(`Další požadavek za cca ${state.modelTestNextRequestEtaSec} s`);
      }
      updateModelTestRunButton();
    };
    tick();
    state.modelTestCountdownInterval = setInterval(tick, 400);
  });
}

function scrollModelTestOutputIntoView() {
  const ta = document.getElementById('modelTestOutput');
  if (ta) {
    ta.focus({ preventScroll: true });
    ta.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function openModelTestModal() {
  if (state.autoRunning || state.autoStepRunning) {
    showToast(t('toast.auto.stopFirst'));
    return;
  }
  const prov = document.getElementById('provider')?.value || 'groq';
  const providerLabel = PROVIDERS[prov]?.label || prov;
  showModelTestModal(providerLabel, false);
  const modalProviderSelect = document.getElementById('modelTestProvider');
  if (modalProviderSelect) modalProviderSelect.value = prov;
  scrollModelTestOutputIntoView();
}

function resetModelTestModal() {
  if (state.modelTestRunning) {
    showToast(t('toast.test.cancelFirstAlt'));
    return;
  }
  const output = document.getElementById('modelTestOutput');
  if (output) output.value = '';
  state.modelTestLibraryActive = false;
  state.modelTestOutputBackupBeforeLibrary = '';
  state.modelTestParsedExportChunks = [];
  state.modelTestLastKeyAuditExportChunks = [];
  state.modelTestRawResponses = [];
  state.modelTestNextRequestEtaSec = 0;
  modelTestResetProviderEta();
  modelTestStopProviderCountdownTicker();
  modelTestSetCountdownLabel('');
  modelTestSetLastStatus('');
  clearModelTestOutputFromStorage();
  clearModelTestRawOutputFromStorage();
  updateModelTestRunButton();
}

function restoreModelTestReportFromBackup() {
  const output = document.getElementById('modelTestOutput');
  if (!output) return;
  if (state.modelTestLibraryActive) {
    output.value = state.modelTestOutputBackupBeforeLibrary;
    state.modelTestLibraryActive = false;
    saveModelTestOutputToStorage(output.value);
  }
  scrollModelTestOutputIntoView();
}

function formatModelTestParsedBlock(key, t, e) {
  if (!e || !t) return '';
  const defEnglish = isDefinitionLikelyEnglish(t.definice);
  const defValue = t.definice || '—';
  const defDisplay = defEnglish && !/\[POZN\.: text je v angličtině - špatný překlad\]/.test(defValue)
    ? `${defValue} [POZN.: text je v angličtině - špatný překlad]`
    : defValue;
  const parts = [
    `${key} | ${e.greek}`,
    `Gramatika: ${e.tvaroslovi || '—'}`,
    `Český význam: ${t.vyznam || '—'}`,
    `Definice (EN): ${e.definice || e.def || '—'}`,
    `Česká definice: ${defDisplay}`,
    `KJV překlady (CZ): ${t.kjv || e.kjv || '—'}`,
    `Biblické užití: ${t.pouziti || '—'}`,
    `Původ: ${t.puvod || '—'}`,
    `Specialista: ${t.specialista || '—'}`,
    ''
  ];
  return parts.join('\n');
}

function appendModelTestExportParsed(keys, parsed) {
  if (!parsed || typeof parsed !== 'object') return;
  for (const key of keys) {
    const t = parsed[key];
    if (!t) continue;
    const e = state.entryMap.get(key);
    if (!e) continue;
    state.modelTestParsedExportChunks.push(formatModelTestParsedBlock(key, t, e));
  }
}

function excerptRawForLastKey(rawContent, lastKey, maxLen = 2200) {
  const raw = String(rawContent || '').trim();
  if (!raw) return '(prázdné)';
  const escapedKey = String(lastKey || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (escapedKey) {
    const markerRe = new RegExp(`###\\s*${escapedKey}\\s*###([\\s\\S]*?)(?=\\n###\\s*G\\d+\\s*###|$)`, 'i');
    const m1 = raw.match(markerRe);
    if (m1) {
      const chunk = `###${lastKey}###${m1[1]}`.trim();
      return chunk.length <= maxLen ? chunk : `${chunk.slice(0, maxLen)}\n… (zkráceno)`;
    }
    const lineRe = new RegExp(`(^|\\n)\\s*${escapedKey}\\s*\\|[^\\n]*([\\s\\S]*?)(?=\\n\\s*G\\d+\\s*\\||$)`, 'i');
    const m2 = raw.match(lineRe);
    if (m2) {
      const chunk = m2[0].trim();
      return chunk.length <= maxLen ? chunk : `${chunk.slice(0, maxLen)}\n… (zkráceno)`;
    }
  }
  if (raw.length <= maxLen) return raw;
  const head = Math.min(1200, Math.floor(maxLen * 0.65));
  const tail = Math.max(500, maxLen - head - 40);
  return `${raw.slice(0, head)}\n… (zkráceno) …\n${raw.slice(-tail)}`;
}

/**
 * Průběžná audit kontrola: všechna hesla v dávce + stav formátu.
 */
function appendModelTestLastBatchKeyAudit(appendReport, batchKeys, parsed, missing, rawContent = '', totals = null) {
  const lastKey = Array.isArray(batchKeys) && batchKeys.length ? batchKeys[batchKeys.length - 1] : '';
  if (!lastKey || typeof appendReport !== 'function') return;
  const missingSet = new Set(Array.isArray(missing) ? missing : []);
  const failedKeys = (Array.isArray(batchKeys) ? batchKeys : []).filter(k => {
    const tk = parsed && parsed[k];
    return missingSet.has(k) || !tk || !isTranslationComplete(tk);
  });
  const firstFailed = failedKeys.length ? failedKeys[0] : '';
  const lastFailed = failedKeys.length ? failedKeys[failedKeys.length - 1] : '';
  const t = parsed && parsed[lastKey];
  const inMissing = missingSet.has(lastKey);
  const complete = !!t && isTranslationComplete(t);
  const englishDefinitionFlag = !!(t && isDefinitionLikelyEnglish(t.definice));
  const badFields = t && !complete
    ? [
        ...['definice', 'pouziti', 'puvod', 'kjv', 'specialista'].filter(f => !hasMeaningfulValue(t[f])),
        ...(englishDefinitionFlag ? ['definice(EN)'] : [])
      ]
    : [];
  const rangeLabel = Array.isArray(batchKeys) && batchKeys.length
    ? `${batchKeys[0]} až ${batchKeys[batchKeys.length - 1]} (${batchKeys.length} hesel)`
    : `${lastKey} až ${lastKey} (1 heslo)`;
  const totalsSuffix = totals ? ` | Σ OK ${totals.okKeys || 0} / NEÚSP ${totals.failedKeys || 0}` : '';

  appendReport(`  ▸ Rozsah dávky: ${rangeLabel}`);
  appendReport('');
  appendReport('  AUDIT: kontrola všech hesel v dávce a jejich parsovatelnosti.');
  appendReport(`  ▸ Poslední heslo (stavový indikátor): ${lastKey}`);
  appendReport(`  ▸ Auditovaný počet hesel: ${batchKeys.length}`);
  appendReport(`  ▸ Neúspěšné v dávce: ${failedKeys.length}`);
  appendReport('');
  if (complete) {
    modelTestSetLastStatus(`OK | ${rangeLabel} | ${lastKey}${totalsSuffix}`, 'ok');
    appendReport('  Stav posledního hesla: OK — nalezeno v odpovědi a všechna povinná pole vyplněna ve správném formátu.');
    appendReport('  Data AI pro všechna hesla v dávce:');
    for (const key of batchKeys) {
      const tk = parsed && parsed[key];
      if (!tk) continue;
      appendReport(`    --- ${key} ---`);
      for (const ln of formatModelTestParsedBlock(key, tk, state.entryMap.get(key)).split('\n')) {
        appendReport(`    ${ln}`);
      }
    }
  } else if (inMissing || !t) {
    modelTestSetLastStatus(`NEÚSPĚCH | ${rangeLabel} | ${lastKey}${totalsSuffix}`, 'error');
    appendReport('  🔴 CHYBA FORMATU / PÁROVÁNÍ');
    appendReport('  Stav posledního hesla: NEÚSPĚCH — heslo v odpovědi nešlo spárovat / chybí blok (špatný formát nebo model vynechal heslo).');
    if (failedKeys.length) {
      appendReport(`  Neúspěšné v dávce: ${failedKeys.length}/${batchKeys.length} | první ${firstFailed} | poslední ${lastFailed}`);
    }
    if (firstFailed && firstFailed !== lastFailed) {
      appendReport(`  RAW odpověď AI pro první neúspěšné ${firstFailed}:`);
      appendReport(excerptRawForLastKey(rawContent, firstFailed, 1200));
      appendReport('  ---');
    }
    appendReport('  RAW odpověď AI pro audit celé dávky:');
    appendReport(rawContent || '(prázdná odpověď)');
    appendReport('  --- /RAW ---');
  } else {
    modelTestSetLastStatus(`NEÚPLNÉ | ${rangeLabel} | ${lastKey}${totalsSuffix}`, 'warn');
    appendReport(`  Stav posledního hesla: NEÚPLNÉ — chybí nebo jsou neplatná pole: ${badFields.join(', ') || '?'}`);
    if (englishDefinitionFlag) {
      appendReport('  POZN.: DEFINICE obsahuje angličtinu, je hodnoceno jako špatný překlad.');
    }
    appendReport('  Data AI pro všechna hesla v dávce (to, co šlo vyparsovat):');
    for (const key of batchKeys) {
      const tk = parsed && parsed[key];
      if (!tk) continue;
      appendReport(`    --- ${key} ---`);
      for (const ln of formatModelTestParsedBlock(key, tk, state.entryMap.get(key)).split('\n')) {
        appendReport(`    ${ln}`);
      }
    }
  }
  appendReport('');

  const exportLines = [
    `Rozsah dávky: ${rangeLabel}`,
    `Audit: všechna hesla v dávce (${batchKeys.length})`,
    `Poslední heslo (stav): ${lastKey}`,
    totals ? `Celkem v běhu: OK ${totals.okKeys || 0} | NEÚSP ${totals.failedKeys || 0}` : '',
    complete
      ? 'Stav: OK'
      : (inMissing || !t)
        ? 'Stav: NEÚSPĚCH'
        : `Stav: NEÚPLNÉ (${badFields.join(', ') || '?'})`
  ].filter(Boolean);
  const parsedKeys = batchKeys.filter(k => parsed && parsed[k]);
  if (parsedKeys.length) {
    exportLines.push('');
    exportLines.push('Data AI pro všechna hesla v dávce:');
    for (const key of parsedKeys) {
      exportLines.push(`--- ${key} ---`);
      exportLines.push(formatModelTestParsedBlock(key, parsed[key], state.entryMap.get(key)));
    }
  } else if (inMissing || !t) {
    if (firstFailed && firstFailed !== lastFailed) {
      exportLines.push('', `RAW odpověď AI pro první neúspěšné ${firstFailed}:`, excerptRawForLastKey(rawContent, firstFailed, 1200));
    }
    exportLines.push('', 'RAW odpověď AI pro audit celé dávky:', rawContent || '(prázdná odpověď)');
  }
  exportLines.push('----------------------------------------', '');
  state.modelTestLastKeyAuditExportChunks.push(exportLines.join('\n'));
}

function exportModelTestTranslationsTxt() {
  const out = document.getElementById('modelTestOutput');
  const reportFallback = (out?.value || '').trim();
  let body = '';
  if (state.modelTestLastKeyAuditExportChunks.length) {
    body = `# Export auditu všech hesel z dávek (test modelů)\n# ${new Date().toLocaleString('cs-CZ')}\n\n${state.modelTestLastKeyAuditExportChunks.join('\n')}`;
  } else if (state.modelTestParsedExportChunks.length) {
    body = `# Export parsovaných překladů z testu modelů\n# ${new Date().toLocaleString('cs-CZ')}\n\n${state.modelTestParsedExportChunks.join('\n')}`;
  } else if (reportFallback) {
    body = `# Žádné nově parsované bloky v paměti — celý aktuální text z okna\n# ${new Date().toLocaleString('cs-CZ')}\n\n${reportFallback}`;
  } else {
    showToast(t('toast.export.nothing'));
    return;
  }
  download(`strong_model_test_export_${Date.now()}.txt`, body, 'text/plain');
  showToast(t('toast.export.txtDownloaded'));
}

function getApiKeyForModelTest(prov) {
  const activeProvider = document.getElementById('provider')?.value || '';
  if (activeProvider === prov) {
    const fromInput = (document.getElementById('apiKey')?.value || '').trim();
    if (fromInput) return fromInput;
  }
  return (localStorage.getItem('strong_apikey_' + prov) || '').trim();
}

function getPinnedModelOptionsForProvider(prov) {
  return MODEL_TEST_PINNED_MODELS
    .filter(item => item.prov === prov)
    .map(item => ({ value: item.value, label: item.label }));
}

function getPinnedModelQueue() {
  return MODEL_TEST_PINNED_MODELS
    .filter(item => !!getApiKeyForModelTest(item.prov))
    .map(item => ({ prov: item.prov, model: item.value, label: item.label }));
}

function getDefaultPinnedModelByProvider(prov) {
  const found = MODEL_TEST_PINNED_MODELS.find(item => item.prov === prov);
  return found ? found.value : '';
}

function getModelTestSelectedModelForProvider(prov) {
  const select = document.getElementById(`modelTestModel_${prov}`);
  const selected = String(select?.value || '').trim();
  if (selected) return selected;
  const saved = String(localStorage.getItem(MODEL_TEST_MODEL_STORAGE_KEY + prov) || '').trim();
  if (saved) return saved;
  return getDefaultPinnedModelByProvider(prov);
}

const PIPELINE_MODEL_STORAGE_KEY = 'strong_pipeline_model_';
const PIPELINE_SECONDARY_ENABLED_KEY = 'strong_pipeline_secondary_enabled_';

function getPipelineModelForProvider(prov) {
  const hasStaticModel = (provider, model) => {
    if (!model) return false;
    if (provider === 'openrouter') return true;
    const providerModels = Array.isArray(PROVIDERS?.[provider]?.models) ? PROVIDERS[provider].models : [];
    return providerModels.some(item => Array.isArray(item) && String(item[0] || '').trim() === model);
  };
  const saved = String(localStorage.getItem(PIPELINE_MODEL_STORAGE_KEY + prov) || '').trim();
  if (saved && hasStaticModel(prov, saved)) return saved;
  if (saved && !hasStaticModel(prov, saved)) {
    localStorage.removeItem(PIPELINE_MODEL_STORAGE_KEY + prov);
  }
  const testSelected = String(getModelTestSelectedModelForProvider(prov) || '').trim();
  if (testSelected && hasStaticModel(prov, testSelected)) return testSelected;
  const fallback = String(getDefaultPinnedModelByProvider(prov) || '').trim();
  if (fallback && hasStaticModel(prov, fallback)) return fallback;
  return '';
}

function setPipelineModelForProvider(prov, model) {
  const val = String(model || '').trim();
  if (!val) return;
  localStorage.setItem(PIPELINE_MODEL_STORAGE_KEY + prov, val);
}

function isPipelineSecondaryEnabled(prov) {
  return localStorage.getItem(PIPELINE_SECONDARY_ENABLED_KEY + prov) === '1';
}

function setPipelineSecondaryEnabled(prov, enabled) {
  localStorage.setItem(PIPELINE_SECONDARY_ENABLED_KEY + prov, enabled ? '1' : '0');
}

function syncSecondaryProviderToggles(prov, enabled) {
  if (prov !== 'gemini' && prov !== 'openrouter') return;
  const on = !!enabled;
  const map = {
    gemini: {
      autoCb: 'autoEnable_gemini',
      setupCb: 'pipelineEnableSecondaryGemini',
      modalCb: 'providerRunEnableSecondaryGemini',
      setupModel: 'pipelineModelSecondaryGemini',
      modalModel: 'providerRunSecondaryGeminiModel'
    },
    openrouter: {
      autoCb: 'autoEnable_openrouter',
      setupCb: 'pipelineEnableSecondaryOpenrouter',
      modalCb: 'providerRunEnableSecondaryOpenrouter',
      setupModel: 'pipelineModelSecondaryOpenrouter',
      modalModel: 'providerRunSecondaryOpenrouterModel'
    }
  };
  const cfg = map[prov];
  if (!cfg) return;
  const autoCb = document.getElementById(cfg.autoCb);
  const setupCb = document.getElementById(cfg.setupCb);
  const modalCb = document.getElementById(cfg.modalCb);
  if (autoCb) autoCb.checked = on;
  if (setupCb) setupCb.checked = on;
  if (modalCb) modalCb.checked = on;
  applyPipelineSecondaryToggleUi(prov, on, cfg.setupModel);
  applyPipelineSecondaryToggleUi(prov, on, cfg.modalModel);
}

function applyPipelineSecondaryToggleUi(prov, checked, selectId) {
  const select = document.getElementById(selectId);
  if (select) select.disabled = !checked;
}

function bindPipelineSecondaryToggle(checkboxId, prov, selectId) {
  const cb = document.getElementById(checkboxId);
  if (!cb) return;
  cb.checked = isPipelineSecondaryEnabled(prov);
  syncSecondaryProviderToggles(prov, cb.checked);
  applyPipelineSecondaryToggleUi(prov, cb.checked, selectId);
  cb.onchange = () => {
    setAutoProviderEnabled(prov, cb.checked);
    updateAutoProviderCountdowns();
    updateSetupCompactSummary();
  };
}

function fillPipelineSelectOptions(prov, selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  if (prov === 'openrouter') {
    const wanted = getPipelineModelForProvider('openrouter');
    populateOpenRouterModels(select, wanted, () => {
      const modelWanted = getPipelineModelForProvider('openrouter');
      if (modelWanted && Array.from(select.options).some(o => o.value === modelWanted)) {
        select.value = modelWanted;
      }
      updateSetupCompactSummary();
    });
    select.onchange = () => {
      setPipelineModelForProvider('openrouter', select.value);
      updateSetupCompactSummary();
    };
    return;
  }
  const options = (PROVIDERS[prov]?.models || []).map(([value, label]) => ({ value, label: uiLabel(label) || value }));
  select.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  const wanted = getPipelineModelForProvider(prov);
  if (wanted && Array.from(select.options).some(o => o.value === wanted)) {
    select.value = wanted;
  } else if (select.options.length) {
    select.selectedIndex = 0;
  }
  setPipelineModelForProvider(prov, select.value);
  select.onchange = () => {
    setPipelineModelForProvider(prov, select.value);
    updateSetupCompactSummary();
  };
}

function initPipelineModelSelectors() {
  fillPipelineSelectOptions('groq', 'pipelineModelMainGroq');
  fillPipelineSelectOptions('gemini', 'pipelineModelSecondaryGemini');
  fillPipelineSelectOptions('openrouter', 'pipelineModelSecondaryOpenrouter');
  bindPipelineSecondaryToggle('pipelineEnableSecondaryGemini', 'gemini', 'pipelineModelSecondaryGemini');
  bindPipelineSecondaryToggle('pipelineEnableSecondaryOpenrouter', 'openrouter', 'pipelineModelSecondaryOpenrouter');
}

function initPipelineModelSelectorsInSettingsModal() {
  fillPipelineSelectOptions('groq', 'providerRunMainGroqModel');
  fillPipelineSelectOptions('gemini', 'providerRunSecondaryGeminiModel');
  fillPipelineSelectOptions('openrouter', 'providerRunSecondaryOpenrouterModel');
  bindPipelineSecondaryToggle('providerRunEnableSecondaryGemini', 'gemini', 'providerRunSecondaryGeminiModel');
  bindPipelineSecondaryToggle('providerRunEnableSecondaryOpenrouter', 'openrouter', 'providerRunSecondaryOpenrouterModel');
}

function saveModelTestModelSelections() {
  ['groq', 'gemini', 'openrouter'].forEach(prov => {
    const val = String(document.getElementById(`modelTestModel_${prov}`)?.value || '').trim();
    if (val) localStorage.setItem(MODEL_TEST_MODEL_STORAGE_KEY + prov, val);
  });
}

function populateModelTestModelSelect(prov) {
  const select = document.getElementById(`modelTestModel_${prov}`);
  if (!select) return;
  if (prov === 'openrouter') {
    const wanted = String(localStorage.getItem(MODEL_TEST_MODEL_STORAGE_KEY + prov) || getDefaultPinnedModelByProvider(prov) || '').trim();
    populateOpenRouterModels(select, wanted, () => {
      const saved = String(localStorage.getItem(MODEL_TEST_MODEL_STORAGE_KEY + prov) || '').trim();
      const preferred = saved || wanted;
      if (preferred && Array.from(select.options).some(o => o.value === preferred)) {
        select.value = preferred;
      } else if (select.options.length) {
        select.selectedIndex = 0;
      }
    });
    return;
  }
  const providerOptions = (PROVIDERS[prov]?.models || []).map(([value, label]) => ({ value, label: uiLabel(label) || value }));
  const pinned = MODEL_TEST_PINNED_MODELS
    .filter(item => item.prov === prov)
    .map(item => ({ value: item.value, label: item.label || item.value }));
  const merged = [...pinned];
  for (const opt of providerOptions) {
    if (!merged.find(x => x.value === opt.value)) merged.push(opt);
  }
  if (!merged.length) merged.push({ value: getDefaultPinnedModelByProvider(prov), label: getDefaultPinnedModelByProvider(prov) || '—' });
  select.innerHTML = merged
    .filter(opt => opt.value)
    .map(opt => `<option value="${opt.value}">${opt.label}</option>`)
    .join('');
  const saved = String(localStorage.getItem(MODEL_TEST_MODEL_STORAGE_KEY + prov) || '').trim();
  const wanted = saved || getDefaultPinnedModelByProvider(prov);
  if (wanted && Array.from(select.options).some(o => o.value === wanted)) {
    select.value = wanted;
  } else if (select.options.length) {
    select.selectedIndex = 0;
  }
}

function updateModelTestProviderUi() {
  const providerMode = document.getElementById('modelTestProvider')?.value || 'parallel-3';
  const isParallel = providerMode === 'parallel-3';
  if (!isParallel && ['groq', 'gemini', 'openrouter'].includes(providerMode)) {
    populateModelTestModelSelect(providerMode);
  }
  ['groq', 'gemini', 'openrouter'].forEach(prov => {
    const row = document.getElementById(`modelRow_${prov}`);
    const select = document.getElementById(`modelTestModel_${prov}`);
    if (!row) return;
    const visible = isParallel || providerMode === prov;
    row.style.display = visible ? 'grid' : 'none';
    row.hidden = !visible;
    if (select) select.disabled = !visible;
  });
  const wrap = document.getElementById('modelTestProviderModels');
  if (wrap) {
    wrap.style.display = isParallel || ['groq', 'gemini', 'openrouter'].includes(providerMode) ? 'block' : 'none';
  }
}

function getProviderModelOptions(prov) {
  if (prov !== 'openrouter') {
    return Promise.resolve((PROVIDERS[prov]?.models || []).map(([value, label]) => ({ value, label: uiLabel(label) })));
  }
  return new Promise(resolve => {
    const tempSelect = document.createElement('select');
    const savedModel = localStorage.getItem('strong_model');
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      const options = Array.from(tempSelect.options)
        .filter(opt => opt.value)
        .map(opt => ({ value: opt.value, label: opt.text }));
      resolve(options);
    };
    populateOpenRouterModels(tempSelect, savedModel, finish);
    setTimeout(finish, 8000);
  });
}

async function runModelTestFromModal() {
  if (state.modelTestRunning) {
    cancelModelTest();
    showToast(t('toast.test.pausing'));
    return;
  }
  restoreModelTestReportFromBackup();
  scrollModelTestOutputIntoView();
  const providerSelect = document.getElementById('modelTestProvider');
  const modeSelect = document.getElementById('modelTestMode');
  const promptEnableEl = document.getElementById('modelTestEnablePrompt');
  const promptTypeSelect = document.getElementById('modelTestPromptType');
  if (!providerSelect) return;
  saveModelTestPromptSettings();
  saveModelTestModelSelections();
  const mode = modeSelect?.value || 'smoke';
  const promptEnabled = !!promptEnableEl?.checked;
  const promptType = promptTypeSelect?.value || getModelTestPromptType();
  const providerMode = providerSelect.value || 'parallel-3';
  const forcedProvider = providerMode === 'parallel-3' ? null : providerMode;
  updateModelTestRunButton();
  await testCurrentProviderModels(forcedProvider, false, mode, promptType, promptEnabled);
}

function showModelTestLibrary() {
  const output = document.getElementById('modelTestOutput');
  if (!output) return;
  if (state.modelTestRunning) {
    showToast(t('toast.test.libraryAfterStop'));
    return;
  }
  if (!state.modelTestLibraryActive) {
    state.modelTestOutputBackupBeforeLibrary = output.value;
  }
  state.modelTestLibraryActive = true;
  const history = getTestHistory();
  if (!history.length) {
    output.value = 'Knihovna testů je zatím prázdná.';
    return;
  }
  const lines = ['# KNIHOVNA TESTŮ A PŘEKLADŮ', `Záznamů: ${history.length}`, ''];
  const statsRows = Object.values(getModelTestStatsMap());
  if (statsRows.length) {
    lines.push('## Souhrn podle provideru/modelu (modely řazeny podle četnosti)');
    const providers = {};
    for (const r of statsRows) {
      if (!providers[r.provider]) providers[r.provider] = [];
      providers[r.provider].push(r);
    }
    for (const providerName of Object.keys(providers).sort((a, b) => a.localeCompare(b, 'cs'))) {
      lines.push(`### ${providerName}`);
      const models = providers[providerName].sort((a, b) => (b.calls || 0) - (a.calls || 0));
      for (const r of models) {
        const total = Math.max(1, (r.okKeys || 0) + (r.failedKeys || 0));
        const rate = (((r.okKeys || 0) / total) * 100).toFixed(1);
        const avgMs = r.latencySamples ? (r.latencyMsTotal / r.latencySamples) : 0;
        lines.push(`- ${r.model} | volání ${r.calls || 0} | hesel ${r.totalKeys || 0} | OK ${r.okKeys || 0} / NEÚSP ${r.failedKeys || 0} | úspěšnost ${rate}% | doba AI ${formatAiResponseTime(avgMs)}`);
      }
      lines.push('');
    }
  }
  lines.push('## Poslední běhy');
  for (const item of history.slice(0, 80)) {
    const when = new Date(item.ts).toLocaleString('cs-CZ');
    if (item.type === 'model-test') {
      lines.push(`[${when}] TEST | ${item.provider} | režim ${item.mode || 'smoke'} | OK ${item.ok}/${item.total} | PART ${item.partial || 0} | RL ${item.rateLimited} | ERR ${item.error} | HESLA ${item.keysOk || 0}/${item.keysFailed || 0} | CYKLY ${item.cycles || 0} | AI ${formatAiResponseTime(item.avgLatencyMs || 0)}`);
      if (Array.isArray(item.topModels) && item.topModels.length) {
        lines.push(`TOP: ${item.topModels.join(', ')}`);
      }
    } else if (item.type === 'translate-batch') {
      lines.push(`[${when}] BATCH | ${item.provider}/${item.model} | ${item.ok}/${item.total} kompletní | missing ${item.missing} | AI ${formatAiResponseTime(item.avgLatencyMs || 0)}`);
    }
  }
  output.value = lines.join('\n');
  saveModelTestOutputToStorage(output.value);
}

async function copyModelTestOutput() {
  const output = document.getElementById('modelTestOutput');
  const btn = document.getElementById('btnCopyModelTestOutput');
  const originalBtnText = btn?.textContent || '📋 Kopírovat';
  if (!output) return;
  const text = output.value || '';
  if (!text.trim()) {
    showToast(t('toast.copy.nothing'));
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast(t('toast.output.copied'));
    if (btn) {
      btn.textContent = t('toast.output.copiedShort');
      setTimeout(() => { btn.textContent = originalBtnText; }, 1200);
    }
  } catch (e) {
    output.focus();
    output.select();
    document.execCommand('copy');
    showToast(t('toast.output.copied'));
    if (btn) {
      btn.textContent = t('toast.output.copiedShort');
      setTimeout(() => { btn.textContent = originalBtnText; }, 1200);
    }
  }
}

function clearModelTestOutput() {
  const output = document.getElementById('modelTestOutput');
  if (!output) return;
  output.value = '';
  state.modelTestOutputBackupBeforeLibrary = '';
  state.modelTestLibraryActive = false;
  clearModelTestOutputFromStorage();
  showToast(t('toast.output.cleared'));
}

function getSampleEntriesForModelTest(count = 3) {
  if (!Array.isArray(state.entries) || state.entries.length === 0) return [];
  const preferred = state.entries.filter(e => e?.key && e.key.startsWith('G')).slice(0, count);
  if (preferred.length >= count) return preferred;
  return state.entries.slice(0, count).filter(Boolean);
}

function pickRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function resetModelTestRateLimitHealth() {
  state.modelTestRateLimitHealth = { hits429: 0, lastRetryAfterSec: 0, lastRequestId: '', lastRemaining: '', lastReset: '' };
}

function updateModelTestRateLimitHealth(rate) {
  if (!rate || typeof rate !== 'object') return;
  if (rate.requestId) state.modelTestRateLimitHealth.lastRequestId = String(rate.requestId);
  if (rate.remaining !== undefined && rate.remaining !== null && rate.remaining !== '') state.modelTestRateLimitHealth.lastRemaining = String(rate.remaining);
  if (rate.reset !== undefined && rate.reset !== null && rate.reset !== '') state.modelTestRateLimitHealth.lastReset = String(rate.reset);
  if (rate.retryAfterSec !== undefined && rate.retryAfterSec !== null && rate.retryAfterSec !== '') state.modelTestRateLimitHealth.lastRetryAfterSec = Number(rate.retryAfterSec) || 0;
  if (rate.is429) state.modelTestRateLimitHealth.hits429 += 1;
}

function appendModelTestRateLimitStatus(appendReport) {
  if (typeof appendReport !== 'function') return;
  const h = state.modelTestRateLimitHealth || {};
  appendReport(`Rate limit stav: 429=${h.hits429 || 0} | retry-after=${h.lastRetryAfterSec || 0}s | remaining=${h.lastRemaining || 'n/a'} | reset=${h.lastReset || 'n/a'}${h.lastRequestId ? ` | req=${h.lastRequestId}` : ''}`);
}

function getUsageTotals(raw) {
  const usage = raw?.usage || raw?.usageMetadata;
  if (!usage || typeof usage !== 'object') return null;
  const inT = Number(usage.prompt_tokens || usage.promptTokenCount || usage.input_tokens || 0) || 0;
  const outT = Number(usage.completion_tokens || usage.candidatesTokenCount || usage.output_tokens || 0) || 0;
  const total = Number(usage.total_tokens || usage.totalTokenCount || usage.total || (inT + outT)) || (inT + outT);
  return { inT, outT, total };
}

function appendModelTestUsage(appendReport, provider, model, raw) {
  if (typeof appendReport !== 'function') return;
  const totals = getUsageTotals(raw);
  if (!totals) {
    appendReport(`Tokeny: ${provider} | ${model} | n/a`);
    return;
  }
  appendReport(`Tokeny: ${provider} | ${model} | ${totals.inT} in / ${totals.outT} out = ${totals.total}`);
  logTokenEntry(provider, totals.inT, totals.outT, totals.total);
}

function rateInfoFromErrorMessage(msg) {
  const text = String(msg || '');
  const retry = text.match(/za\s+(\d+)s/i);
  const req = text.match(/\[req:([^\]]+)\]/i);
  return {
    is429: /rate limit|429|too many/i.test(text),
    retryAfterSec: retry ? Number(retry[1]) : 0,
    requestId: req ? req[1] : ''
  };
}

function appendModelTestFinalOverview(appendReport, testResults, testMode, extra = {}) {
  if (typeof appendReport !== 'function') return;
  const rows = Array.isArray(testResults) ? testResults : [];
  const countBy = (status) => rows.filter(r => r.status === status).length;
  const ok = countBy('OK');
  const okRetry = countBy('OK_RETRY');
  const partial = countBy('PARTIAL');
  const rateLimited = countBy('RATE_LIMITED');
  const error = countBy('ERROR');
  const total = rows.length;
  const done = ok + okRetry + partial;
  const successPct = total > 0 ? Math.round((done / total) * 100) : 0;
  appendReport('');
  appendReport('=== KONEČNÝ PŘEHLED TESTU ===');
  appendReport(`Výsledky modelů: OK ${ok} | OK po retry ${okRetry} | PARTIAL ${partial} | RATE_LIMIT ${rateLimited} | ERROR ${error} | CELKEM ${total}`);
  appendReport(`Úspěšnost modelů: ${successPct}%`);
  if (testMode === 'auto-live') {
    appendReport(`Hesla: OK ${extra.okKeys || 0} | NEÚSP ${extra.failedKeys || 0} | cykly ${extra.cycles || 0}${extra.avgLatencyMs ? ` | prům. AI ${formatAiResponseTime(extra.avgLatencyMs)}` : ''}`);
  }
}

function getModelTestSuccessRatePercent(results) {
  const rows = Array.isArray(results) ? results : [];
  if (!rows.length) return 0;
  const success = rows.filter(r => r.status === 'OK' || r.status === 'OK_RETRY' || r.status === 'PARTIAL').length;
  return Math.round((success / rows.length) * 100);
}

function appendPromptCompareSummary(appendReport, promptA, promptB, statsA, statsB, resultsA, resultsB) {
  const failA = Number(statsA?.failedKeys || 0);
  const failB = Number(statsB?.failedKeys || 0);
  const succA = getModelTestSuccessRatePercent(resultsA);
  const succB = getModelTestSuccessRatePercent(resultsB);
  const latA = Number(statsA?.avgLatencyMs || 0);
  const latB = Number(statsB?.avgLatencyMs || 0);
  let winner = 'REMÍZA';
  if (failA < failB) winner = `A (${getModelTestPromptTypeLabel(promptA)})`;
  else if (failB < failA) winner = `B (${getModelTestPromptTypeLabel(promptB)})`;
  else if (succA > succB) winner = `A (${getModelTestPromptTypeLabel(promptA)})`;
  else if (succB > succA) winner = `B (${getModelTestPromptTypeLabel(promptB)})`;
  else if (latA > 0 && latB > 0 && latA < latB) winner = `A (${getModelTestPromptTypeLabel(promptA)})`;
  else if (latA > 0 && latB > 0 && latB < latA) winner = `B (${getModelTestPromptTypeLabel(promptB)})`;

  appendReport('');
  appendReport('=== A/B POROVNÁNÍ PROMPTŮ ===');
  appendReport(`A: ${getModelTestPromptTypeLabel(promptA)} | hesla OK ${statsA?.okKeys || 0} / NEÚSP ${failA} | model úspěšnost ${succA}% | prům. AI ${formatAiResponseTime(latA)}`);
  appendReport(`B: ${getModelTestPromptTypeLabel(promptB)} | hesla OK ${statsB?.okKeys || 0} / NEÚSP ${failB} | model úspěšnost ${succB}% | prům. AI ${formatAiResponseTime(latB)}`);
  appendReport(`Vítěz: ${winner}`);
}

async function runAutoLiveModelTest(appendReport, waitMs, testResults, abortSignal, fixedProvider = null, promptType = 'custom', promptEnabled = true, fixedCyclesPerWorker = null) {
  const durationInput = document.getElementById('modelTestDurationMin');
  const durationMin = Math.max(1, parseInt(durationInput?.value || '10', 10) || 10);
  const durationMs = durationMin * 60 * 1000;
  const batchSize = parseInt(document.getElementById('batchSizeRun')?.value || '10', 10) || 10;
  const intervalSec = parseInt(document.getElementById('intervalRun')?.value || '20', 10) || 20;
  const startTs = Date.now();
  state.modelTestRunEndTs = startTs + durationMs;
  let cycle = 0;
  let totalOkKeys = 0;
  let totalFailedKeys = 0;
  let latencyMsTotal = 0;
  let latencySamples = 0;
  const sourceEntries = state.entries.filter(e => e && e.key);
  if (sourceEntries.length < batchSize) {
    appendReport('⚠ Auto test: málo načtených hesel pro zvolenou dávku.');
    return { cycles: 0, okKeys: 0, failedKeys: 0 };
  }

  const providerKeys = fixedProvider
    ? [fixedProvider]
    : ['groq', 'gemini', 'openrouter'];
  if (providerKeys.length === 0) {
    appendReport('⚠ Auto test: nejsou dostupné API klíče.');
    return { cycles: 0, okKeys: 0, failedKeys: 0 };
  }
  const modelQueue = providerKeys
    .map(prov => {
      const model = getModelTestSelectedModelForProvider(prov);
      return model ? { prov, model, label: model } : null;
    })
    .filter(Boolean)
    .filter(item => !!getApiKeyForModelTest(item.prov));
  if (!modelQueue.length) {
    appendReport('⚠ Auto test: u zvolených providerů nejsou dostupné modely.');
    return { cycles: 0, okKeys: 0, failedKeys: 0 };
  }
  appendReport(`Auto test délka: ${durationMin} min`);
  if (Number.isFinite(fixedCyclesPerWorker) && fixedCyclesPerWorker > 0) {
    appendReport(`Režim cyklů: pevně ${fixedCyclesPerWorker} cykly na prompt`);
  }
  appendReport(`Dávka/interval: ${batchSize} hesel / ${intervalSec}s`);
  appendReport(`Po každém cyklu: audit všech hesel v dávce (OK / neúplné / neúspěch) + RAW odpověď AI pro celou dávku.${promptEnabled ? ' (test promptu zapnut)' : ' (test promptu vypnut)'}`);
  appendReport(providerKeys.length > 1
    ? 'Paralelní režim: každý provider běží samostatně, se svým vlastním odpočtem a limitem.'
    : 'Režim: vybraný provider běží samostatně.');
  appendReport('');
  modelTestStartProviderCountdownTicker();
  const waitProviderMs = (prov, ms) => new Promise(resolve => {
    if (ms <= 0 || state.modelTestCancelRequested || abortSignal?.aborted) {
      modelTestSetProviderEta(prov, 0);
      resolve();
      return;
    }
    const t0 = Date.now();
    const tick = () => {
      if (state.modelTestCancelRequested || abortSignal?.aborted) {
        modelTestSetProviderEta(prov, 0);
        resolve();
        return;
      }
      const left = ms - (Date.now() - t0);
      if (left <= 0) {
        modelTestSetProviderEta(prov, 0);
        resolve();
        return;
      }
      modelTestSetProviderEta(prov, Math.ceil(left / 1000));
      setTimeout(tick, 300);
    };
    tick();
  });

  const workers = modelQueue.map((current, workerIdx) => (async () => {
    let localCursor = (workerIdx * 17) % sourceEntries.length;
    let localCycle = 0;
    const providerLabel = PROVIDERS[current.prov]?.label || current.prov;
    const apiKey = getApiKeyForModelTest(current.prov);
    if (!apiKey) {
      appendReport(`[#${current.prov}] ${providerLabel} | bez API klíče`);
      return;
    }
    while (!state.modelTestCancelRequested
      && (Date.now() - startTs) < durationMs
      && (!Number.isFinite(fixedCyclesPerWorker) || fixedCyclesPerWorker <= 0 || localCycle < fixedCyclesPerWorker)) {
      localCycle++;
      cycle++;
      const takeSize = Math.max(1, Math.min(batchSize, sourceEntries.length));
      const batch = [];
      for (let i = 0; i < takeSize; i++) {
        const idx = (localCursor + i) % sourceEntries.length;
        batch.push(sourceEntries[idx]);
      }
      localCursor = (localCursor + (takeSize * 2)) % sourceEntries.length;
      const batchKeys = batch.map(b => b.key);
      const messages = buildModelTestMessages(batch, 'auto-live', promptType, promptEnabled);
      const reqStart = performance.now();
      try {
        const raw = await callOnce(current.prov, apiKey, current.model, messages, abortSignal);
        const reqMs = performance.now() - reqStart;
        latencyMsTotal += reqMs;
        latencySamples += 1;
        updateModelTestRateLimitHealth(raw?.rateInfo);
        appendModelTestUsage(appendReport, current.prov, current.model, raw);
        let content = String(raw?.content || '');
        state.modelTestRawResponses.push({
          ts: Date.now(),
          prov: current.prov,
          model: current.model,
          mode: 'auto-live',
          promptType,
          promptEnabled,
          promptSent: String(messages?.[1]?.content || ''),
          raw: content
        });
        saveModelTestRawOutputToStorage();
        let parsed = {};
        const parsedNorm = parseWithOpenRouterNormalization(content, batchKeys, parsed);
        applyFallbacksToParsedMap(batchKeys, parsed);
        let failedInBatch = batchKeys.filter(k => !parsed[k] || !isTranslationComplete(parsed[k]));
        const englishDefinitionKeys = batchKeys.filter(k => {
          const t = parsed && parsed[k];
          return !!(t && isDefinitionLikelyEnglish(t.definice));
        });
        if (englishDefinitionKeys.length > 0 && promptEnabled && promptType !== 'preset_v13') {
          appendReport(`⚠ Quality gate: DEFINICE(EN) u ${englishDefinitionKeys.length}/${batchKeys.length} hesel (${englishDefinitionKeys.slice(0, 3).join(', ')}${englishDefinitionKeys.length > 3 ? ', …' : ''})`);
          appendReport('↻ Auto retry se striktním promptem v13 (anti-EN + anti-truncace)…');
          const strictMessages = buildModelTestMessages(batch, 'auto-live', 'preset_v13', true);
          const rawRetry = await callOnce(current.prov, apiKey, current.model, strictMessages, abortSignal);
          updateModelTestRateLimitHealth(rawRetry?.rateInfo);
          appendModelTestUsage(appendReport, current.prov, current.model, rawRetry);
          const retryContent = String(rawRetry?.content || '');
          state.modelTestRawResponses.push({
            ts: Date.now(),
            prov: current.prov,
            model: current.model,
            mode: 'auto-live',
            promptType: 'preset_v13',
            promptEnabled: true,
            promptSent: String(strictMessages?.[1]?.content || ''),
            raw: retryContent
          });
          saveModelTestRawOutputToStorage();
          const parsedRetry = {};
          parseWithOpenRouterNormalization(retryContent, batchKeys, parsedRetry);
          applyFallbacksToParsedMap(batchKeys, parsedRetry);
          const failedRetry = batchKeys.filter(k => !parsedRetry[k] || !isTranslationComplete(parsedRetry[k]));
          if (failedRetry.length <= failedInBatch.length) {
            content = retryContent;
            parsed = parsedRetry;
            failedInBatch = failedRetry;
            appendReport(`✓ Retry výsledek převzat (${batchKeys.length - failedRetry.length}/${batchKeys.length})`);
          } else {
            appendReport(`ℹ Retry nepomohl (${batchKeys.length - failedRetry.length}/${batchKeys.length}), ponechán původní výsledek.`);
          }
        } else if (englishDefinitionKeys.length > 0 && !promptEnabled) {
          appendReport('⚠ Quality gate: nalezena EN definice, ale test promptu je vypnutý (auto-retry přeskočen).');
        }
        const ok = batchKeys.length - failedInBatch.length;
        const status = ok === batchKeys.length ? 'OK' : 'PARTIAL';
        totalOkKeys += ok;
        totalFailedKeys += failedInBatch.length;
        testResults.push({ model: `${current.prov}:${current.model}`, status });
        upsertModelTestStats(current.prov, current.model, {
          status,
          okKeys: ok,
          failedKeys: failedInBatch.length,
          totalKeys: batchKeys.length,
          latencyMs: reqMs
        });
        console.log(`[AUTO TEST RAW] #${cycle} ${current.prov} | ${current.model} | prompt=${promptType}\n${content}`);
        appendReport(`[#${cycle}] ${providerLabel} | ${current.model} | ${ok}/${batchKeys.length} hesel | klíče ${batchKeys[0]}…${batchKeys[batchKeys.length - 1]} | AI ${formatAiResponseTime(reqMs)}`);
        appendModelTestRateLimitStatus(appendReport);
        if (parsedNorm.normalizedUsed) appendReport('ℹ AUTO_NORMALIZOVANO_Z_OPENROUTER_FORMATU');
        appendReport(`RAW: ${content || '(prázdná odpověď)'}`);
        appendModelTestLastBatchKeyAudit(appendReport, batchKeys, parsed, failedInBatch, content, { okKeys: totalOkKeys, failedKeys: totalFailedKeys });
      } catch (e) {
        const reqMs = performance.now() - reqStart;
        latencyMsTotal += reqMs;
        latencySamples += 1;
        const msg = String(e?.message || '');
        const isRate = /429|rate limit|too many/i.test(msg);
        updateModelTestRateLimitHealth(rateInfoFromErrorMessage(msg));
        totalFailedKeys += batchKeys.length;
        testResults.push({ model: `${current.prov}:${current.model}`, status: isRate ? 'RATE_LIMITED' : 'ERROR' });
        upsertModelTestStats(current.prov, current.model, {
          status: isRate ? 'RATE_LIMITED' : 'ERROR',
          okKeys: 0,
          failedKeys: batchKeys.length,
          totalKeys: batchKeys.length,
          latencyMs: reqMs
        });
        appendReport(`[#${cycle}] ${providerLabel} | ${current.model} | ${isRate ? 'RATE LIMITED' : 'ERROR'} (${msg})${reqMs > 0 ? ` | AI ${formatAiResponseTime(reqMs)}` : ''}`);
        appendModelTestRateLimitStatus(appendReport);
      }
      if (state.modelTestCancelRequested) break;
      await waitProviderMs(current.prov, intervalSec * 1000);
    }
  })());
  await Promise.all(workers);
  modelTestStopProviderCountdownTicker();
  modelTestResetProviderEta();
  return {
    cycles: cycle,
    okKeys: totalOkKeys,
    failedKeys: totalFailedKeys,
    avgLatencyMs: latencySamples ? (latencyMsTotal / latencySamples) : 0
  };
}

async function testCurrentProviderModels(forcedProvider = null, resetReport = true, forcedMode = null, forcedPromptType = null, forcedPromptEnabled = null) {
  if (state.autoRunning || state.autoStepRunning) {
    showToast(t('toast.auto.stopFirst'));
    return;
  }

  const providerSelect = document.getElementById('provider');
  const btn = document.getElementById('btnTestModels');
  if (!providerSelect || !btn) return;

  const modalProviderSelect = document.getElementById('modelTestProvider');
  const appendCheckbox = document.getElementById('modelTestAppend');
  const modeSelect = document.getElementById('modelTestMode');
  const promptEnableEl = document.getElementById('modelTestEnablePrompt');
  const promptTypeSelect = document.getElementById('modelTestPromptType');
  const promptCompareEnableEl = document.getElementById('modelTestEnablePromptCompare');
  const promptTypeCompareSelect = document.getElementById('modelTestPromptTypeCompare');
  const providerMode = forcedProvider || modalProviderSelect?.value || providerSelect.value;
  const fallbackProvider = providerSelect.value || 'groq';
  const prov = providerMode === 'parallel-3' ? fallbackProvider : providerMode;
  const testMode = forcedMode || modeSelect?.value || 'smoke';
  const promptEnabled = typeof forcedPromptEnabled === 'boolean' ? forcedPromptEnabled : !!promptEnableEl?.checked;
  const promptType = forcedPromptType || promptTypeSelect?.value || getModelTestPromptType();
  const compareEnabled = !!promptEnabled && testMode === 'auto-live' && !!promptCompareEnableEl?.checked;
  const comparePromptType = promptTypeCompareSelect?.value || getModelTestPromptCompareType();
  const providerTargets = providerMode === 'parallel-3' ? ['groq', 'gemini', 'openrouter'] : [prov];
  const executionQueue = [];
  if (testMode !== 'auto-live') {
    for (const currentProv of providerTargets) {
      const apiKey = getApiKeyForModelTest(currentProv);
      if (!apiKey) {
        showToast(t('toast.apiKey.missingForProviderLabel', { provider: PROVIDERS[currentProv]?.label || currentProv }));
        continue;
      }
      const selectedModel = getModelTestSelectedModelForProvider(currentProv);
      if (!selectedModel) {
        showToast(t('toast.model.notSelectedForProviderLabel', { provider: PROVIDERS[currentProv]?.label || currentProv }));
        continue;
      }
      executionQueue.push({
        prov: currentProv,
        apiKey,
        opt: { value: selectedModel, label: selectedModel }
      });
    }
    if (!executionQueue.length) return;
  }
  const providerLabel = forcedProvider
    ? (PROVIDERS[prov]?.label || prov)
    : ((modalProviderSelect?.value === 'parallel-3')
      ? '3 provideři paralelně'
      : (PROVIDERS[prov]?.label || prov));
  const outputEl = document.getElementById('modelTestOutput');
  const shouldAppend = appendCheckbox?.checked && !resetReport;
  const snapshotBefore = outputEl ? outputEl.value : '';
  const report = shouldAppend && snapshotBefore ? snapshotBefore.split('\n') : [];
  showModelTestModal(providerLabel, false);
  if (modalProviderSelect) {
    modalProviderSelect.value = providerMode === 'parallel-3' ? 'parallel-3' : prov;
    updateModelTestProviderUi();
  }
  if (!outputEl) {
    showToast(t('toast.test.outputMissing'));
    return;
  }
  outputEl.value = shouldAppend ? snapshotBefore : '';
  const MODEL_TEST_DELAY_MS = 3500;
  const MAX_CONSECUTIVE_RATE_LIMITS = 4;
  let consecutiveRateLimited = 0;
  const testResults = [];
  const autoProviders = forcedProvider ? [forcedProvider] : ['groq', 'gemini', 'openrouter'];
  const autoModelCount = autoProviders
    .map(p => getModelTestSelectedModelForProvider(p))
    .filter(Boolean).length;
  const queueModelCount = executionQueue.length;
  const appendReport = (line = '') => {
    report.push(line);
    const nextText = report.join('\n');
    outputEl.value = nextText;
    outputEl.scrollTop = outputEl.scrollHeight;
    saveModelTestOutputToStorage(nextText);
  };

  const originalText = btn.textContent;
  const cancelBtn = document.getElementById('btnCancelModelTest');
  state.modelTestRunning = true;
  state.modelTestCancelRequested = false;
  state.modelTestRunEndTs = 0;
  state.modelTestParsedExportChunks = [];
  state.modelTestLastKeyAuditExportChunks = [];
  state.modelTestRawResponses = [];
  resetModelTestRateLimitHealth();
  clearModelTestRawOutputFromStorage();
  modelTestSetLastStatus('Běží test modelů…', 'idle');
  state.modelTestAbortController = new AbortController();
  const signal = state.modelTestAbortController.signal;
  const waitMs = (ms) => modelTestWaitWithCountdown(ms, signal);
  state.modelTestNextRequestEtaSec = 0;
  updateModelTestRunButton();
  btn.disabled = true;
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
  appendReport(promptEnabled ? `# TEST PROMPTU MODELU` : `# TEST MODELU`);
  appendReport(`Provider: ${providerLabel}`);
  appendReport(`Režim: ${testMode === 'translate3' ? 'Překlad 3 hesel' : testMode === 'translate1' ? 'Překlad 1 hesla' : testMode === 'auto-live' ? 'Auto test' : 'Smoke test (slovo 2x)'}`);
  appendReport(`Prompt test: ${promptEnabled ? 'zapnutý' : 'vypnutý'}`);
  appendReport(`Prompt režim: ${getModelTestPromptTypeLabel(promptType)}`);
  const promptTopicLabel = getModelTestPromptTopicLabel(promptType);
  if (promptTopicLabel) appendReport(`Testované téma: ${promptTopicLabel}`);
  if (compareEnabled && comparePromptType && comparePromptType !== promptType) {
    appendReport(`A/B porovnání: zapnuto (A=${getModelTestPromptTypeLabel(promptType)} | B=${getModelTestPromptTypeLabel(comparePromptType)})`);
    const compareTopicLabel = getModelTestPromptTopicLabel(comparePromptType);
    if (compareTopicLabel) appendReport(`Testované téma B: ${compareTopicLabel}`);
  }
  appendReport(`Čas: ${new Date().toLocaleString('cs-CZ')}`);
  appendReport(`Modelů: ${testMode === 'auto-live' ? autoModelCount : queueModelCount}`);
  appendReport('');

  try {
    const sampleCount = testMode === 'translate1' ? 1 : testMode === 'translate3' ? 3 : 0;
    const sampleEntries = sampleCount ? getSampleEntriesForModelTest(sampleCount) : [];
    const sampleKeys = sampleEntries.map(e => e.key);
    if (testMode === 'auto-live') {
      if (compareEnabled && comparePromptType && comparePromptType !== promptType) {
        const testResultsA = [];
        const testResultsB = [];
        appendReport('');
        appendReport(`--- BĚH A: ${getModelTestPromptTypeLabel(promptType)} ---`);
        const autoStatsA = await runAutoLiveModelTest(appendReport, waitMs, testResultsA, state.modelTestAbortController.signal, forcedProvider ? prov : null, promptType, true, 3);
        appendModelTestFinalOverview(appendReport, testResultsA, testMode, autoStatsA);
        if (!state.modelTestCancelRequested) {
          appendReport('');
          appendReport(`--- BĚH B: ${getModelTestPromptTypeLabel(comparePromptType)} ---`);
          const autoStatsB = await runAutoLiveModelTest(appendReport, waitMs, testResultsB, state.modelTestAbortController.signal, forcedProvider ? prov : null, comparePromptType, true, 3);
          appendModelTestFinalOverview(appendReport, testResultsB, testMode, autoStatsB);
          appendPromptCompareSummary(appendReport, promptType, comparePromptType, autoStatsA, autoStatsB, testResultsA, testResultsB);
        }
        appendReport(state.modelTestCancelRequested ? 'Ukončeno.' : 'Hotovo.');
        showToast(state.modelTestCancelRequested ? t('toast.modelTest.abCanceled') : t('toast.modelTest.abDone'));
        return;
      }
      const autoStats = await runAutoLiveModelTest(appendReport, waitMs, testResults, state.modelTestAbortController.signal, forcedProvider ? prov : null, promptType, promptEnabled);
      const okModels = testResults.filter(r => r.status === 'OK').map(r => r.model).slice(0, 3);
      appendReport('');
      appendReport(`Souhrn hesel: OK ${autoStats.okKeys} | NEÚSP ${autoStats.failedKeys} | cykly ${autoStats.cycles} | prům. AI ${formatAiResponseTime(autoStats.avgLatencyMs || 0)}`);
      appendReport(`TOP modely z tohoto běhu: ${okModels.length ? okModels.join(', ') : 'žádné plně stabilní'}`);
      appendModelTestFinalOverview(appendReport, testResults, testMode, autoStats);
      appendReport(state.modelTestCancelRequested ? 'Ukončeno.' : 'Hotovo.');
      pushTestHistory({
        type: 'model-test',
        provider: forcedProvider ? providerLabel : 'parallel-3-providers',
        mode: testMode,
        total: testResults.length,
        ok: testResults.filter(r => r.status === 'OK').length,
        rateLimited: testResults.filter(r => r.status === 'RATE_LIMITED').length,
        error: testResults.filter(r => r.status === 'ERROR').length,
        partial: testResults.filter(r => r.status === 'PARTIAL').length,
        cycles: autoStats.cycles,
        keysOk: autoStats.okKeys,
        keysFailed: autoStats.failedKeys,
        avgLatencyMs: autoStats.avgLatencyMs || 0,
        topModels: okModels
      });
      showToast(state.modelTestCancelRequested ? t('toast.modelTest.canceled') : t('toast.modelTest.autoDone'));
      return;
    }

    if (testMode === 'translate3' || testMode === 'translate1') {
      if (sampleEntries.length < sampleCount) {
        appendReport(`⚠ Nelze spustit test překladu ${sampleCount} hesla/hesel (není načtený slovník nebo má málo záznamů).`);
        appendReport('Ukončeno.');
        return;
      }
      appendReport(`Vzorek hesel: ${sampleKeys.join(', ')}`);
      appendReport('');
    }

    for (let i = 0; i < executionQueue.length; i++) {
      if (state.modelTestCancelRequested) {
        appendReport('⏹ Test byl ručně zrušen uživatelem.');
        appendReport('');
        break;
      }
      const current = executionQueue[i];
      const currentProvider = current.prov;
      const currentApiKey = current.apiKey;
      const opt = current.opt;
      const currentProviderLabel = PROVIDERS[currentProvider]?.label || currentProvider;
      btn.textContent = `🧪 ${i + 1}/${executionQueue.length}`;
      appendReport(`## ${i + 1}/${executionQueue.length} ${currentProviderLabel} | ${opt.value}`);

      const messages = buildModelTestMessages(sampleEntries, testMode, promptType, promptEnabled);

      try {
        const first = await callOnce(currentProvider, currentApiKey, opt.value, messages, state.modelTestAbortController.signal);
        updateModelTestRateLimitHealth(first?.rateInfo);
        appendModelTestUsage(appendReport, currentProvider, opt.value, first);
        const firstContent = String(first?.content || '').trim();
        state.modelTestRawResponses.push({
          ts: Date.now(),
          prov: currentProvider,
          model: opt.value,
          mode: testMode,
          promptType,
          promptEnabled,
          promptSent: String(messages?.[1]?.content || ''),
          raw: firstContent
        });
        saveModelTestRawOutputToStorage();
        console.log(`[MODEL TEST RAW] ${currentProvider} | ${opt.value} | mode=${testMode} | prompt=${promptType}\n${firstContent}`);
        console.log(`[MODEL TEST] ${currentProvider} | ${opt.value} | 1: ${firstContent}`);
        appendReport(`MODEL: ${opt.value}`);
        if (testMode === 'translate3' || testMode === 'translate1') {
          const parsed = {};
          const parsedNorm = parseWithOpenRouterNormalization(firstContent || '', sampleKeys, parsed);
          applyFallbacksToParsedMap(sampleKeys, parsed);
          const missingAfterFirst = sampleKeys.filter(k => !parsed[k] || !isTranslationComplete(parsed[k]));
          const okCount = sampleKeys.length - missingAfterFirst.length;
          if (parsedNorm.normalizedUsed) appendReport('ℹ AUTO_NORMALIZOVANO_Z_OPENROUTER_FORMATU');
          appendReport(`RAW: ${firstContent || '(prázdná odpověď)'}`);
          appendModelTestRateLimitStatus(appendReport);
          appendReport(`PARSOVÁNÍ (celá dávka): ${okCount}/${sampleKeys.length} hesel`);
          if (missingAfterFirst.length > 0) appendReport(`CHYBÍ v odpovědi: ${missingAfterFirst.join(', ')}`);
          appendModelTestLastBatchKeyAudit(appendReport, sampleKeys, parsed, missingAfterFirst, firstContent || '');
          appendReport('');
          testResults.push({ model: `${currentProvider}:${opt.value}`, status: okCount === sampleKeys.length ? 'OK' : 'PARTIAL' });
          log(`🧪 ${opt.label || opt.value}: ${okCount}/${sampleKeys.length} hesel`);
          consecutiveRateLimited = 0;
          if (!state.modelTestCancelRequested) await waitMs(MODEL_TEST_DELAY_MS);
          continue;
        }

        appendReport(`1) ${firstContent || '(prázdná odpověď)'}`);
        appendModelTestRateLimitStatus(appendReport);

        if (state.modelTestCancelRequested) {
          appendReport('⏹ Test byl ručně zrušen uživatelem.');
          appendReport('');
          break;
        }
        await waitMs(MODEL_TEST_DELAY_MS);
        const second = await callOnce(currentProvider, currentApiKey, opt.value, messages, state.modelTestAbortController.signal);
        updateModelTestRateLimitHealth(second?.rateInfo);
        appendModelTestUsage(appendReport, currentProvider, opt.value, second);
        const secondContent = String(second?.content || '').trim();
        state.modelTestRawResponses.push({
          ts: Date.now(),
          prov: currentProvider,
          model: opt.value,
          mode: testMode,
          promptType,
          promptEnabled,
          promptSent: String(messages?.[1]?.content || ''),
          raw: secondContent
        });
        saveModelTestRawOutputToStorage();
        console.log(`[MODEL TEST RAW] ${currentProvider} | ${opt.value} | mode=${testMode} | prompt=${promptType}\n${secondContent}`);
        console.log(`[MODEL TEST] ${currentProvider} | ${opt.value} | 2: ${secondContent}`);
        appendReport(`2) ${secondContent || '(prázdná odpověď)'}`);
        appendModelTestRateLimitStatus(appendReport);
        appendReport('Stav: OK');
        appendReport('');
        consecutiveRateLimited = 0;
        testResults.push({ model: `${currentProvider}:${opt.value}`, status: 'OK' });

        log(`🧪 ${opt.label || opt.value}: OK`);
      } catch (e) {
        const msg = String(e?.message || '');
        const isRateLimit = /429|rate limit|too many/i.test(msg);
        updateModelTestRateLimitHealth(rateInfoFromErrorMessage(msg));
        if (isRateLimit) {
          appendReport(`CHYBA: ${msg}`);
          appendModelTestRateLimitStatus(appendReport);
          appendReport(`↻ Opakuji po ${Math.round(MODEL_TEST_DELAY_MS / 1000)}s...`);
          await waitMs(MODEL_TEST_DELAY_MS);
          try {
            const retry = await callOnce(currentProvider, currentApiKey, opt.value, messages, state.modelTestAbortController.signal);
            updateModelTestRateLimitHealth(retry?.rateInfo);
            appendModelTestUsage(appendReport, currentProvider, opt.value, retry);
            const retryContent = String(retry?.content || '').trim();
            state.modelTestRawResponses.push({
              ts: Date.now(),
              prov: currentProvider,
              model: opt.value,
              mode: testMode,
              promptType,
              promptEnabled,
              promptSent: String(messages?.[1]?.content || ''),
              raw: retryContent
            });
            saveModelTestRawOutputToStorage();
            console.log(`[MODEL TEST RAW] ${currentProvider} | ${opt.value} | mode=${testMode} | prompt=${promptType}\n${retryContent}`);
            console.log(`[MODEL TEST] ${currentProvider} | ${opt.value} | RETRY: ${retryContent}`);
            appendReport(`retry) ${retryContent || '(prázdná odpověď)'}`);
            appendModelTestRateLimitStatus(appendReport);
            appendReport('Stav: OK po retry');
            appendReport('');
            consecutiveRateLimited = 0;
            testResults.push({ model: `${currentProvider}:${opt.value}`, status: 'OK_RETRY' });
            log(`🧪 ${opt.label || opt.value}: OK po retry`);
          } catch (eRetry) {
            if (state.modelTestCancelRequested || /zrušen uživatelem/i.test(String(eRetry?.message || ''))) {
              appendReport('⏹ Test byl ručně zrušen uživatelem.');
              appendReport('');
              break;
            }
            console.error(`[MODEL TEST] ${currentProvider} | ${opt.value} | ERROR`, eRetry);
            appendReport(`RETRY CHYBA: ${eRetry.message}`);
            updateModelTestRateLimitHealth(rateInfoFromErrorMessage(eRetry?.message || ''));
            appendModelTestRateLimitStatus(appendReport);
            appendReport('Stav: RATE LIMITED');
            appendReport('');
            consecutiveRateLimited++;
            testResults.push({ model: `${currentProvider}:${opt.value}`, status: 'RATE_LIMITED' });
            log(`🧪 ${opt.label || opt.value}: RATE LIMIT (${eRetry.message})`);
          }
        } else {
          if (state.modelTestCancelRequested || /zrušen uživatelem/i.test(msg)) {
            appendReport('⏹ Test byl ručně zrušen uživatelem.');
            appendReport('');
            break;
          }
          console.error(`[MODEL TEST] ${currentProvider} | ${opt.value} | ERROR`, e);
          appendReport(`CHYBA: ${msg}`);
          appendModelTestRateLimitStatus(appendReport);
          appendReport('Stav: ERROR');
          appendReport('');
          consecutiveRateLimited = 0;
          testResults.push({ model: `${currentProvider}:${opt.value}`, status: 'ERROR' });
          log(`🧪 ${opt.label || opt.value}: CHYBA (${msg})`);
        }
      }

      if (consecutiveRateLimited >= MAX_CONSECUTIVE_RATE_LIMITS) {
        appendReport(`⚠ Test zastaven: ${consecutiveRateLimited}x po sobě RATE LIMITED (globální free limit OpenRouteru).`);
        appendReport('Zbytek modelů je přeskočen, spusť test znovu později.');
        appendReport('');
        for (let j = i + 1; j < executionQueue.length; j++) {
          appendReport(`## ${j + 1}/${executionQueue.length} ${executionQueue[j].prov} | ${executionQueue[j].opt.value}`);
          appendReport('Stav: PŘESKOČENO (global rate limit)');
          appendReport('');
        }
        showToast(t('toast.test.rateLimitAbort'));
        break;
      }
      if (!state.modelTestCancelRequested) {
        await waitMs(MODEL_TEST_DELAY_MS);
      }
    }

    const okModels = testResults
      .filter(r => r.status === 'OK' || ((testMode === 'translate3' || testMode === 'translate1') && r.status === 'PARTIAL'))
      .map(r => r.model)
      .slice(0, 3);
    appendReport('');
    appendReport(`TOP modely z tohoto běhu: ${okModels.length ? okModels.join(', ') : 'žádné plně stabilní'}`);
    appendModelTestFinalOverview(appendReport, testResults, testMode);
    appendReport(state.modelTestCancelRequested ? 'Ukončeno.' : 'Hotovo.');
    pushTestHistory({
      type: 'model-test',
      provider: providerLabel,
      mode: testMode,
      total: executionQueue.length,
      ok: testResults.filter(r => r.status === 'OK' || r.status === 'OK_RETRY').length,
      rateLimited: testResults.filter(r => r.status === 'RATE_LIMITED').length,
      error: testResults.filter(r => r.status === 'ERROR').length,
      partial: testResults.filter(r => r.status === 'PARTIAL').length,
      topModels: okModels
    });
    showToast(state.modelTestCancelRequested ? (getUiLang() === 'en' ? '⏹ Model test canceled' : '⏹ Test modelů zrušen') : t('toast.modelTest.doneWithCount', { count: executionQueue.length }));
  } finally {
    modelTestClearCountdownInterval();
    modelTestStopProviderCountdownTicker();
    modelTestResetProviderEta();
    state.modelTestNextRequestEtaSec = 0;
    state.modelTestRunEndTs = 0;
    modelTestSetCountdownLabel('');
    if (state.modelTestCancelRequested) {
      modelTestSetLastStatus('Test zastaven uživatelem.', 'warn');
    }
    state.modelTestRunning = false;
    state.modelTestCancelRequested = false;
    state.modelTestAbortController = null;
    updateModelTestRunButton();
    btn.disabled = false;
    btn.textContent = originalText;
    if (cancelBtn) cancelBtn.style.display = 'none';
  }
}

function logMsg(msg, type) {
  const scroll = document.getElementById('logScroll');
  if (!scroll) return;
  const placeholder = scroll.querySelector('.log-placeholder');
  if (placeholder) placeholder.remove();
  const div = document.createElement('div');
  div.className = `log-entry`;
  div.style.color = type === 'err' ? '#c05050' : 'var(--txt3)';
  div.style.fontFamily = "'JetBrains Mono', monospace";
  div.style.fontSize = '11px';
  div.style.padding = '8px 14px';
  div.textContent = msg;
  scroll.insertBefore(div, scroll.firstChild);
}



// ── Elapsed time ─────────────────────────────────────────────
function startElapsedTimer() {
  if (state.elapsedTimer) clearInterval(state.elapsedTimer);
  state.elapsedTimer = setInterval(updateElapsedTime, 1000);
}

function stopElapsedTimer() {
  if (state.elapsedTimer) {
    clearInterval(state.elapsedTimer);
    state.elapsedTimer = null;
  }
}

function updateElapsedTime() {
  if (!state.startTime) return;
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const el = document.getElementById('elapsedTime');
  if (el) el.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ── ETA — odhad zbývajícího času ─────────────────────────────
function updateETA() {
  const el = document.getElementById('etaLabel');
  if (!el) return;
  const remain = state.entries.filter(e => !state.translated[e.key] || state.translated[e.key].skipped).length;
  if (!remain) { el.textContent = 'hotovo!'; return; }
  const bs = parseInt(document.getElementById('batchSizeRun').value) || state.currentBatchSize;
  const iv = parseInt(document.getElementById('intervalRun').value) || state.currentInterval;
  const batches = Math.ceil(remain / bs);
  const secs = batches * iv;
  if (secs < 60) el.textContent = `~${secs}s`;
  else if (secs < 3600) el.textContent = `~${Math.ceil(secs/60)} min`;
  else el.textContent = `~${(secs/3600).toFixed(1)} hod`;
}

// ── Označit rozsah hesel k překladu ───────────────────────────────────
function selectRange() {
  document.getElementById('modalTitle').textContent = t('modal.selectRange.title');
  document.getElementById('modalFrom').value = '1';
  document.getElementById('modalTo').value = '100';
  state.modalCallback = function() {
    const from = parseInt(document.getElementById('modalFrom').value) || 1;
    const to   = parseInt(document.getElementById('modalTo').value) || 100;
    if (from > to) return;
    state.listRangeFilter = { from, to };
    state.selectedKeys.clear();
    state.entries.forEach(e => {
      const n = getStrongKeyNumber(e.key);
      if (n >= from && n <= to) state.selectedKeys.add(e.key);
    });
    const filterStatusEl = document.getElementById('filterStatus');
    const filterSortEl = document.getElementById('filterSort');
    if (filterStatusEl) filterStatusEl.value = 'all';
    if (filterSortEl) filterSortEl.value = 'num';
    renderList();
    showToast(t('toast.selected.range', { count: state.selectedKeys.size, from, to }));
  };
  document.getElementById('customModal').classList.add('show');
}

function closeModal() {
  document.getElementById('customModal').classList.remove('show');
}

function confirmModal() {
  if (state.modalCallback) {
    state.modalCallback();
    state.modalCallback = null;
  }
  closeModal();
}

// Mobile Actions Modal
function showMobileActions() {
  document.getElementById('mobileActionsModal').classList.add('show');
}

function closeMobileModal() {
  document.getElementById('mobileActionsModal').classList.remove('show');
}

// Settings Modal
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

// ── Limits Modal ──────────────────────────────────────────────────────
function showLimitsModal() {
  const prov = document.getElementById('provider').value;
  const model = document.getElementById('model').value;
  const modelLabel = document.getElementById('model')?.selectedOptions?.[0]?.text || model;
  
  document.getElementById('limitsProviderInfo').textContent = `Provider: ${PROVIDERS[prov]?.label || prov} | Model: ${modelLabel}`;
  document.getElementById('limitsContent').innerHTML = `<div class="limits-loading">${t('limits.loading')}</div>`;
  document.getElementById('limitsNote').style.display = 'none';
  document.getElementById('limitsModal').classList.add('show');
  
  fetchLimits(prov, model);
}

function showHelpModal() {
  document.getElementById('helpModal').classList.add('show');
}

function closeHelpModal() {
  document.getElementById('helpModal').classList.remove('show');
}

function closeLimitsModal() {
  document.getElementById('limitsModal').classList.remove('show');
}

async function fetchLimits(prov, model) {
  const content = document.getElementById('limitsContent');
  const note = document.getElementById('limitsNote');
  const noteText = document.getElementById('limitsNoteText');
  
  try {
    if (prov === 'groq') {
      const apiKey = getCurrentApiKey(prov);
      if (!apiKey) {
        content.innerHTML = '<div style="color:var(--red);padding:10px">Nejsou nastaveny limity. Zadejte API klíč.</div>';
        return;
      }
      const dynamicLimits = await fetchGroqLimits(apiKey, model);
      const staticLimits = getGroqLimits(model);
      content.innerHTML = renderGroqLimits(dynamicLimits) + '<div style="margin-top:10px;border-top:1px solid var(--brd);padding-top:8px">' + renderLimitsTable(staticLimits) + '</div>';
      note.style.display = 'block';
      noteText.innerHTML = 'Groq: zobrazuji živé rate-limit hlavičky (pokud je API vrátí) + fallback limity modelu.<br>Více info: <a href="https://console.groq.com/docs/rate-limits" target="_blank">console.groq.com/docs/rate-limits</a>';
    } else if (prov === 'openrouter') {
      // OpenRouter - can fetch via API
      const apiKey = getCurrentApiKey(prov);
      if (!apiKey) {
        content.innerHTML = '<div style="color:var(--red);padding:10px">Nejsou nastaveny limity. Zadejte API klíč.</div>';
        return;
      }
      const [keyData, creditsData] = await Promise.all([
        fetchOpenRouterLimits(apiKey),
        fetchOpenRouterCredits(apiKey).catch(() => null)
      ]);
      content.innerHTML = renderOpenRouterLimits(keyData, creditsData);
      // Add rate limit info for OpenRouter
      const rateLimitInfo = getOpenRouterRateLimits(keyData);
      content.innerHTML = renderOpenRouterLimits(keyData, creditsData) + rateLimitInfo;
      note.style.display = 'block';
      noteText.innerHTML = 'OpenRouter: ukazuji usage/credits/limit data z API klíče + orientační rate limity free tieru.<br>Více info: <a href="https://openrouter.ai/docs/api-reference/limits" target="_blank">openrouter.ai/docs</a>';
    } else if (prov === 'gemini') {
      // Gemini - no API for limits, show static info
      const limits = getGeminiLimits(model);
      content.innerHTML = renderLimitsTable(limits);
      note.style.display = 'block';
      noteText.innerHTML = 'Google neposkytuje API pro kontrolu limitů. Zkontrolujte limity manuálně v <a href="https://aistudio.google.com/app" target="_blank">AI Studio</a> nebo Google Cloud Console → Quotas.<br>Limity se resetují o půlnoci Pacific Time.';
    }
  } catch (e) {
    content.innerHTML = `<div style="color:var(--red);padding:10px">${t('limits.error', { message: e.message })}</div>`;
  }
}

function getGroqLimits(model) {
  // Known limits for Groq free tier (April 2026)
  const limits = {
    'meta-llama/llama-4-scout-17b-16e-instruct': { rpm: 30, rpd: 1000, tpm: 30000, tpd: 500000 },
    'llama-3.3-70b-versatile': { rpm: 30, rpd: 1000, tpm: 12000, tpd: 100000 },
    'llama-3.1-8b-instant': { rpm: 30, rpd: 14400, tpm: 6000, tpd: 500000 },
  };
  return limits[model] || { rpm: 30, rpd: 1000, tpm: 6000, tpd: 500000 };
}

function getGeminiLimits(model) {
  // Known limits for Gemini free tier (April 2026)
  const limits = {
    'gemini-2.5-pro': { rpm: 5, rpd: 50, tpm: 1000000, tpd: 0 },
    'gemini-2.5-flash': { rpm: 15, rpd: 1500, tpm: 1000000, tpd: 0 },
    'gemini-2.5-flash-lite': { rpm: 30, rpd: 1500, tpm: 1000000, tpd: 0 },
    // Preview model limits may vary by account and region.
    'gemini-3.1-pro-preview': { rpm: 5, rpd: 100, tpm: 1000000, tpd: 0 },
    'gemini-3.1-flash-lite-preview': { rpm: 15, rpd: 1000, tpm: 1000000, tpd: 0 },
    'gemini-2.5-flash-lite-preview-09-2025': { rpm: 15, rpd: 1000, tpm: 1000000, tpd: 0 },
  };
  return limits[model] || { rpm: 15, rpd: 1500, tpm: 1000000, tpd: 0 };
}

function renderLimitsTable(limits) {
  const rows = [];
  if (limits.rpm) rows.push(`<div class="limits-row"><span class="limits-label">RPM (requests/min)</span><span class="limits-value">${limits.rpm}</span></div>`);
  if (limits.rpd) rows.push(`<div class="limits-row"><span class="limits-label">RPD (requests/den)</span><span class="limits-value">${limits.rpd.toLocaleString()}</span></div>`);
  if (limits.tpm) rows.push(`<div class="limits-row"><span class="limits-label">TPM (tokens/min)</span><span class="limits-value">${limits.tpm.toLocaleString()}</span></div>`);
  if (limits.tpd) rows.push(`<div class="limits-row"><span class="limits-label">TPD (tokens/den)</span><span class="limits-value">${limits.tpd.toLocaleString()}</span></div>`);
  return rows.join('');
}

async function fetchOpenRouterLimits(apiKey) {
  const res = await fetch('https://openrouter.ai/api/v1/key', {
    headers: { 'Authorization': 'Bearer ' + apiKey }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.data;
}

async function fetchOpenRouterCredits(apiKey) {
  const res = await fetch('https://openrouter.ai/api/v1/credits', {
    headers: { 'Authorization': 'Bearer ' + apiKey }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data;
}

async function fetchGroqLimits(apiKey, model) {
  // Try models list endpoint first - it should have headers
  try {
    const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': 'Bearer ' + apiKey }
    });
    
    const headers = {};
    const allHeaders = [];
    modelsRes.headers.forEach((value, name) => {
      allHeaders.push([name, value]);
      if (name.startsWith('x-ratelimit-')) {
        headers[name] = value;
      }
    });
    
    if (Object.keys(headers).length > 0) {
      return { headers, errorMsg: '', status: modelsRes.status };
    }
  } catch (e) { console.log('models err', e); }
  
  // Fallback to chat request
  const defaultModel = model || 'llama-3.1-8b-instant';
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: defaultModel,
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 1
    })
  });
  
  // Even error responses contain rate limit headers
  const headers = {};
  const allHeaders = [];
  res.headers.forEach((value, name) => {
    allHeaders.push([name, value]);
    if (name.startsWith('x-ratelimit-')) {
      headers[name] = value;
    }
  });
  headers._all = allHeaders;
  
  // Also get any error message
  let errorMsg = '';
  if (!res.ok) {
    try {
      const err = await res.json();
      errorMsg = err.error?.message || `HTTP ${res.status}`;
    } catch (e) {
      errorMsg = `HTTP ${res.status}`;
    }
  }
  
  return { headers, errorMsg, status: res.status };
}

function renderGroqLimits(result) {
  const { headers, errorMsg, status } = result;
  const rows = [];
  
  // Debug info
  if (errorMsg && Object.keys(headers).length === 0) {
    return `<div style="color:var(--red);padding:10px">Chyba: ${errorMsg}</div>`;
  }
  
  // Show all rate limit headers for debugging
  const rateLimitHeaders = Object.entries(headers).filter(([k]) => k.startsWith('x-ratelimit-'));
  
  // Requests per minute
  if (headers['x-ratelimit-remaining-requests'] !== undefined) {
    const limit = parseInt(headers['x-ratelimit-limit-requests'] || '30');
    const remaining = parseInt(headers['x-ratelimit-remaining-requests'] || '0');
    const pct = limit > 0 ? Math.round((remaining / limit) * 100) : 0;
    const cls = pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'danger';
    rows.push(`<div class="limits-row"><span class="limits-label">RPM</span><span class="limits-value ${cls}">${remaining} / ${limit}</span></div>`);
  } else if (headers['x-ratelimit-limit-requests']) {
    rows.push(`<div class="limits-row"><span class="limits-label">RPM limit</span><span class="limits-value">${headers['x-ratelimit-limit-requests']}</span></div>`);
  }
  
  // Tokens per minute
  if (headers['x-ratelimit-remaining-tokens'] !== undefined) {
    const limit = parseInt(headers['x-ratelimit-limit-tokens'] || '6000');
    const remaining = parseInt(headers['x-ratelimit-remaining-tokens'] || '0');
    const pct = limit > 0 ? Math.round((remaining / limit) * 100) : 0;
    const cls = pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'danger';
    rows.push(`<div class="limits-row"><span class="limits-label">TPM</span><span class="limits-value ${cls}">${remaining.toLocaleString()} / ${limit.toLocaleString()}</span></div>`);
  } else if (headers['x-ratelimit-limit-tokens']) {
    rows.push(`<div class="limits-row"><span class="limits-label">TPM limit</span><span class="limits-value">${headers['x-ratelimit-limit-tokens']}</span></div>`);
  }
  
  // Reset times
  if (headers['x-ratelimit-reset-requests']) {
    rows.push(`<div class="limits-row"><span class="limits-label">Reset RPM</span><span class="limits-value">${headers['x-ratelimit-reset-requests']}</span></div>`);
  }
  if (headers['x-ratelimit-reset-tokens']) {
    rows.push(`<div class="limits-row"><span class="limits-label">Reset TPM</span><span class="limits-value">${headers['x-ratelimit-reset-tokens']}</span></div>`);
  }
  const knownHeaders = new Set([
    'x-ratelimit-remaining-requests',
    'x-ratelimit-limit-requests',
    'x-ratelimit-remaining-tokens',
    'x-ratelimit-limit-tokens',
    'x-ratelimit-reset-requests',
    'x-ratelimit-reset-tokens'
  ]);
  for (const [k, v] of Object.entries(headers)) {
    if (!k.startsWith('x-ratelimit-') || knownHeaders.has(k)) continue;
    rows.push(`<div class="limits-row"><span class="limits-label">${k.replace('x-ratelimit-', '')}</span><span class="limits-value">${escHtml(String(v))}</span></div>`);
  }
  
  // Debug: show all headers if nothing parsed
  const debugHeaders = headers._all || rateLimitHeaders;
  if ( rows.length === 0 && debugHeaders.length > 0) {
    rows.push(`<div style="color:var(--ylw);font-size:10px;margin-bottom:8px">Debug - všechny hlavičky:</div>`);
    debugHeaders.slice(0, 20).forEach(([k, v]) => {
      rows.push(`<div class="limits-row"><span class="limits-label">${k}</span><span class="limits-value" style="font-size:9px">${String(v).slice(0, 50)}</span></div>`);
    });
    if (debugHeaders.length > 20) {
      rows.push(`<div style="font-size:9px;color:var(--txt3)">...a dalších ${debugHeaders.length - 20}</div>`);
    }
  }
  
  if (rows.length === 0) {
    return `<div style="color:var(--txt3);padding:10px">Žádné hlavičky.<br>Status: ${status}<br>Error: ${errorMsg || 'žádná'}</div>`;
  }
  
  return rows.join('');
}

function renderOpenRouterLimits(keyData, creditsData) {
  if (!keyData) return '<div style="color:var(--red);padding:10px">Nelze načíst limity</div>';
  
  const rows = [];
  
  // Credit info from /credits endpoint (if available)
  if (creditsData) {
    if (creditsData.total_credits !== undefined) {
      rows.push(`<div class="limits-row"><span class="limits-label">Kredity celkem</span><span class="limits-value">$${creditsData.total_credits?.toFixed(2) || '0'}</span></div>`);
    }
    if (creditsData.total_usage !== undefined) {
      rows.push(`<div class="limits-row"><span class="limits-label">Kredity použito</span><span class="limits-value">$${creditsData.total_usage?.toFixed(2) || '0'}</span></div>`);
    }
    if (creditsData.total_credits !== undefined && creditsData.total_usage !== undefined) {
      const remaining = creditsData.total_credits - creditsData.total_usage;
      const cls = remaining > 1 ? 'ok' : remaining > 0.1 ? 'warn' : 'danger';
      rows.push(`<div class="limits-row"><span class="limits-label">Kredity zbývá</span><span class="limits-value ${cls}">$${remaining?.toFixed(2) || '0'}</span></div>`);
    }
  }
  
  // Key usage info from /key endpoint
  if (keyData.usage !== undefined) {
    rows.push(`<div class="limits-row"><span class="limits-label">Použito celkem (USD)</span><span class="limits-value">$${keyData.usage?.toFixed(4) || '0'}</span></div>`);
  }
  if (keyData.usage_daily !== undefined) {
    rows.push(`<div class="limits-row"><span class="limits-label">Použito dnes (USD)</span><span class="limits-value">$${keyData.usage_daily?.toFixed(4) || '0'}</span></div>`);
  }
  if (keyData.usage_weekly !== undefined) {
    rows.push(`<div class="limits-row"><span class="limits-label">Použito týden (USD)</span><span class="limits-value">$${keyData.usage_weekly?.toFixed(4) || '0'}</span></div>`);
  }
  if (keyData.usage_monthly !== undefined) {
    rows.push(`<div class="limits-row"><span class="limits-label">Použito měsíc (USD)</span><span class="limits-value">$${keyData.usage_monthly?.toFixed(4) || '0'}</span></div>`);
  }
  if (keyData.limit !== undefined && keyData.limit > 0) {
    rows.push(`<div class="limits-row"><span class="limits-label">Limit</span><span class="limits-value">$${keyData.limit?.toFixed(2) || '0'}</span></div>`);
  }
  if (keyData.limit_remaining !== null && keyData.limit_remaining !== undefined && keyData.limit > 0) {
    const pct = Math.round((keyData.limit_remaining / keyData.limit) * 100);
    const cls = pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'danger';
    rows.push(`<div class="limits-row"><span class="limits-label">Limit zbývá</span><span class="limits-value ${cls}">$${keyData.limit_remaining?.toFixed(2) || '0'} (${pct}%)</span></div>`);
  }
  if (keyData.is_free_tier !== undefined) {
    rows.push(`<div class="limits-row"><span class="limits-label">Free tier</span><span class="limits-value ${keyData.is_free_tier ? 'ok' : ''}">${keyData.is_free_tier ? '✓' : '—'}</span></div>`);
  }
  if (keyData.label) {
    rows.push(`<div class="limits-row"><span class="limits-label">Klíč</span><span class="limits-value" style="font-size:10px">${keyData.label || '—'}</span></div>`);
  }
  const known = new Set(['usage', 'usage_daily', 'usage_weekly', 'usage_monthly', 'limit', 'limit_remaining', 'is_free_tier', 'label']);
  for (const [k, v] of Object.entries(keyData || {})) {
    if (known.has(k) || v == null || typeof v === 'object') continue;
    rows.push(`<div class="limits-row"><span class="limits-label">${escHtml(k)}</span><span class="limits-value">${escHtml(String(v))}</span></div>`);
  }
  if (rows.length === 0) return '<div style="color:var(--txt3);padding:10px">Žádné limity k zobrazení</div>';
  return rows.join('');
}

function getOpenRouterRateLimits(keyData) {
  // OpenRouter rate limits depend on whether user has credits
  const hasCredits = keyData?.usage !== undefined || keyData?.limit_remaining > 0;
  const hasPurchasedCredits = keyData?.is_free_tier === false || keyData?.limit > 0;
  
  // Free model limits (models ending with :free)
  const freeRpm = 20;
  const freeRpd = hasPurchasedCredits ? 500 : 200;
  
  // Paid models - no strict limits, depends on credits
  const rows = [];
  rows.push(`<div class="limits-row" style="margin-top:10px;border-top:1px solid var(--brd);padding-top:8px"><span class="limits-label" style="color:var(--acc)">Rate Limity</span><span class="limits-value"></span></div>`);
  rows.push(`<div class="limits-row"><span class="limits-label">Free modely (RPM)</span><span class="limits-value">${freeRpm}</span></div>`);
  rows.push(`<div class="limits-row"><span class="limits-label">Free modely (RPD)</span><span class="limits-value">${freeRpd}</span></div>`);
  rows.push(`<div class="limits-row"><span class="limits-label">Placené modely</span><span class="limits-value ok">bez limitu</span></div>`);
  
  return rows.join('');
 }

// ══ PROMPT LIBRARY ═══════════════════════════════════════════════
const PROMPT_LIBRARY_CUSTOM_KEY = 'strong_prompt_library_custom';
const PROMPT_LIBRARY_IMPORTED_KEY = 'strong_prompt_library_imported';

function clonePromptLibraryBase() {
  return JSON.parse(JSON.stringify(PROMPT_LIBRARY_BASE || {}));
}

function getStoredCustomPromptLibrary() {
  try {
    const raw = localStorage.getItem(PROMPT_LIBRARY_CUSTOM_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p.name === 'string' && typeof p.desc === 'string' && typeof p.text === 'string');
  } catch {
    return [];
  }
}

function saveStoredCustomPromptLibrary(customEntries) {
  localStorage.setItem(PROMPT_LIBRARY_CUSTOM_KEY, JSON.stringify(customEntries || []));
}

function getStoredImportedPromptLibrary() {
  try {
    const raw = localStorage.getItem(PROMPT_LIBRARY_IMPORTED_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveStoredImportedPromptLibrary(data) {
  localStorage.setItem(PROMPT_LIBRARY_IMPORTED_KEY, JSON.stringify(data || {}));
}

function rebuildPromptLibrary(currentSavedPrompt = '') {
  state.PROMPT_LIBRARY = clonePromptLibraryBase();
  const importedByCategory = getStoredImportedPromptLibrary();
  for (const [category, prompts] of Object.entries(importedByCategory)) {
    if (!Array.isArray(prompts)) continue;
    if (!state.PROMPT_LIBRARY[category]) state.PROMPT_LIBRARY[category] = [];
    for (const item of prompts) {
      if (!item || typeof item.text !== 'string') continue;
      if (!state.PROMPT_LIBRARY[category].some((p) => p.text === item.text)) {
        state.PROMPT_LIBRARY[category].push({
          name: String(item.name || 'Importovaný'),
          desc: String(item.desc || 'Import ze souboru'),
          text: item.text
        });
      }
    }
  }
  const customSaved = localStorage.getItem('strong_custom_prompt');
  const importedCustom = getStoredCustomPromptLibrary();
  const customEntries = [];

  if (customSaved && customSaved.trim()) {
    customEntries.push({
      name: 'Moje vlastní',
      desc: 'Uložený vlastní prompt',
      text: customSaved
    });
  }

  for (const item of importedCustom) {
    if (item.text !== customSaved) customEntries.push(item);
  }

  customEntries.push(FINAL_PROMPT);

  if (currentSavedPrompt && !customEntries.some((p) => p.text === currentSavedPrompt)) {
    customEntries.unshift({
      name: 'Aktuální',
      desc: 'Aktuálně aktivní prompt',
      text: currentSavedPrompt
    });
  }

  state.PROMPT_LIBRARY.custom = customEntries;
}

function getSystemPromptForCurrentTask(context = 'batch') {
  let prompt = DEFAULT_PROMPT;
  if (context === 'topic') {
    prompt += `

DODATEK PRO JEDNO TÉMA:
- Pokud je požadováno jen jedno pole, vrať pouze hodnotu pro dané pole.
- U pole SPECIALISTA vrať detailní souvislý odstavec 3-5 vět bez odrážek.`;
  }
  return enforceSpecialistaFormat(prompt);
}

function isPromptAutoModeEnabled() {
  const saved = localStorage.getItem('strong_prompt_auto');
  return saved !== 'off';
}

function setMainPrompt(promptText, mode = 'custom') {
  const text = String(promptText || '').trim();
  state.isProgrammaticPromptSet = true;
  localStorage.setItem('strong_prompt', String(promptText || '').trim());
  localStorage.setItem('strong_prompt_mode', mode);
  const mainEditor = document.getElementById('promptEditor');
  if (mainEditor) {
    mainEditor.value = text;
    mainEditor.dispatchEvent(new Event('input'));
  }
  state.isProgrammaticPromptSet = false;
  updatePromptStatusIndicator();
}

function applySystemPromptForCurrentTask() {
  const context = state.topicPromptState ? 'topic' : 'batch';
  const systemPrompt = getSystemPromptForCurrentTask(context);
  setMainPrompt(systemPrompt, 'system');
  const editor = document.getElementById('promptLibraryEditor');
  if (editor) editor.value = systemPrompt;
  showToast(t('toast.systemPrompt.set', { mode: context === 'topic' ? (getUiLang() === 'en' ? 'topic' : 'téma') : (getUiLang() === 'en' ? 'batch' : 'dávka') }));
}

function togglePromptModeQuick() {
  const mode = localStorage.getItem('strong_prompt_mode') || 'custom';
  const customSaved = localStorage.getItem('strong_custom_prompt') || '';
  if (mode === 'custom') {
    setMainPrompt(getSystemPromptForCurrentTask('batch'), 'system');
    showToast(t('toast.prompt.switchedSystem'));
    return;
  }
  if (customSaved.trim()) {
    setMainPrompt(customSaved, 'custom');
    showToast(t('toast.prompt.switchedCustom'));
    return;
  }
  showToast(t('toast.prompt.customNotSaved'));
}

function updatePromptAutoButton() {
  const btn = document.getElementById('btnPromptAuto');
  if (!btn) return;
  const on = isPromptAutoModeEnabled();
  btn.textContent = `⚡ Auto prompt: ${on ? 'ON' : 'OFF'}`;
  btn.style.borderColor = on ? 'var(--grn)' : 'var(--brd)';
  btn.style.color = on ? 'var(--grn)' : 'var(--txt2)';
}

function togglePromptAutoMode() {
  const on = isPromptAutoModeEnabled();
  localStorage.setItem('strong_prompt_auto', on ? 'off' : 'on');
  updatePromptAutoButton();
  showToast(t('toast.autoPrompt.toggled', { state: on ? (getUiLang() === 'en' ? 'off' : 'vypnut') : (getUiLang() === 'en' ? 'on' : 'zapnut') }));
}

rebuildPromptLibrary(localStorage.getItem('strong_prompt') || DEFAULT_PROMPT);

function showPromptLibraryModal() {
  const modal = document.getElementById('promptLibraryModal');
  const tabs = document.getElementById('promptTabs');
  const list = document.getElementById('promptList');
  const editor = document.getElementById('promptLibraryEditor');
  
   // Load current saved prompt
   const savedPrompt = localStorage.getItem('strong_prompt') || DEFAULT_PROMPT;
   
   rebuildPromptLibrary(savedPrompt);
  
  // Reset selection to default
  state.selectedPromptCategory = 'default';
  state.selectedPromptIndex = 0;
  
  const getPromptTabLabel = (cat) => {
    const map = {
      default: 'prompt.tab.default',
      detailed: 'prompt.tab.detailed',
      concise: 'prompt.tab.concise',
      literal: 'prompt.tab.literal',
      test: 'prompt.tab.test',
      custom: 'prompt.tab.custom'
    };
    return t(map[cat] || cat);
  };
  // Populate tabs with localized labels
   tabs.innerHTML = Object.keys(state.PROMPT_LIBRARY).map(cat => 
    `<div class="prompt-tab ${cat === 'default' ? 'active' : ''}" data-category="${cat}">${getPromptTabLabel(cat)}</div>`
   ).join('');
  
  // Add click handlers to tabs
  tabs.querySelectorAll('.prompt-tab').forEach(tab => {
    tab.onclick = () => {
      tabs.querySelectorAll('.prompt-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.selectedPromptCategory = tab.dataset.category;
      state.selectedPromptIndex = 0;
      renderPromptList();
      renderPromptPreview();
    };
  });
  
  // Set editor to current saved prompt
  editor.value = savedPrompt;
  
  // Try to find matching preset to pre-select it
  matchPromptToPreset(savedPrompt);
  
  // Initial render
  renderPromptList();
  renderPromptPreview();
  
  // Show modal
  modal.classList.add('show');
  
  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) closePromptLibraryModal();
  };
}

function matchPromptToPreset(promptText) {
  // Try to find which preset the current saved prompt matches
  let foundMatch = false;
  for (const [category, prompts] of Object.entries(state.PROMPT_LIBRARY)) {
    for (let i = 0; i < prompts.length; i++) {
      if (prompts[i].text === promptText) {
        state.selectedPromptCategory = category;
        state.selectedPromptIndex = i;
        foundMatch = true;
        break;
      }
    }
    if (foundMatch) break;
  }
  // If no match found, switch to custom tab
  if (!foundMatch) {
    state.selectedPromptCategory = 'custom';
    state.selectedPromptIndex = 0;
    rebuildPromptLibrary(promptText);
  }
}

function closePromptLibraryModal() {
  document.getElementById('promptLibraryModal').classList.remove('show');
}

function renderPromptList() {
  const list = document.getElementById('promptList');
  const prompts = state.PROMPT_LIBRARY[state.selectedPromptCategory] || [];
  
  if (prompts.length === 0) {
    list.innerHTML = '<div style="color:var(--txt3);font-size:11px;padding:10px">Žádné prompty v této kategorii</div>';
    return;
  }
  
  list.innerHTML = prompts.map((p, idx) => `
    <div class="prompt-item ${idx === state.selectedPromptIndex ? 'selected' : ''}" data-index="${idx}" onclick="selectPrompt(${idx})">
      <div class="prompt-item-name">${p.name}</div>
      <div class="prompt-item-desc">${p.desc}</div>
    </div>
  `).join('');
}

function renderPromptPreview() {
  const preview = document.getElementById('promptPreview');
  const editor = document.getElementById('promptLibraryEditor');
  const prompts = state.PROMPT_LIBRARY[state.selectedPromptCategory] || [];
  const prompt = prompts[state.selectedPromptIndex];
  
  if (prompt) {
    preview.textContent = prompt.text;
    // Also update editor with selected preset
    if (editor) {
      editor.value = prompt.text;
    }
  } else {
    preview.textContent = 'Vyberte prompt z knihovny...';
  }
}

function selectPrompt(index) {
  state.selectedPromptIndex = index;
  const prompts = state.PROMPT_LIBRARY[state.selectedPromptCategory] || [];
  const prompt = prompts[index];
  
  if (prompt) {
    // Load the selected preset into the editor
    document.getElementById('promptLibraryEditor').value = prompt.text;
  }
  
  renderPromptList();
  renderPromptPreview();
}

function applySelectedPrompt() {
  const editor = document.getElementById('promptLibraryEditor');
  const promptText = editor ? editor.value.trim() : '';
  
  if (!promptText) {
    showToast(t('toast.prompt.empty'));
    return;
  }
  
  // Save to main prompt storage
  setMainPrompt(promptText, 'custom');
  
  // Also save to custom category if we're in custom tab
  if (state.selectedPromptCategory === 'custom') {
    localStorage.setItem('strong_custom_prompt', promptText);
    const imported = getStoredCustomPromptLibrary().filter((item) => item.text !== promptText);
    saveStoredCustomPromptLibrary(imported);
    rebuildPromptLibrary(promptText);
  }
  
  closePromptLibraryModal();
  showToast(t('toast.prompt.savedApplied'));
}

function exportPromptLibraryToTxt() {
  rebuildPromptLibrary(localStorage.getItem('strong_prompt') || '');
  const lines = [
    '# Strong Prompt Library Export v1',
    `# Generated: ${new Date().toISOString()}`
  ];
  for (const [category, prompts] of Object.entries(state.PROMPT_LIBRARY)) {
    lines.push(`## CATEGORY: ${category}`);
    for (const prompt of prompts || []) {
      lines.push(`### PROMPT: ${prompt.name || 'Bez názvu'}`);
      lines.push(`DESC: ${prompt.desc || ''}`);
      lines.push('---BEGIN---');
      lines.push(String(prompt.text || ''));
      lines.push('---END---');
    }
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `strong_prompty_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast(t('toast.prompt.exported'));
}

function importPromptLibraryFromFile(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result || '');
      const regex = /## CATEGORY:\s*([^\n]+)\n### PROMPT:\s*([^\n]+)\nDESC:\s*([^\n]*)\n---BEGIN---\n([\s\S]*?)\n---END---/g;
      const importedCustom = [];
      const importedByCategory = getStoredImportedPromptLibrary();
      let totalImported = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const category = (match[1] || '').trim().toLowerCase();
        const name = (match[2] || '').trim() || 'Importovaný';
        const desc = (match[3] || '').trim() || 'Import ze souboru';
        const body = (match[4] || '').trim();
        if (!body) continue;
        totalImported += 1;
        if (category === 'custom') {
          importedCustom.push({ name, desc, text: body });
          continue;
        }
        if (!importedByCategory[category]) importedByCategory[category] = [];
        if (!importedByCategory[category].some((p) => p.text === body)) {
          importedByCategory[category].push({ name, desc, text: body });
        }
      }

      const existingCustom = getStoredCustomPromptLibrary();
      const merged = [...existingCustom];
      for (const item of importedCustom) {
        if (!merged.some((e) => e.text === item.text)) merged.push(item);
      }
      saveStoredCustomPromptLibrary(merged);
      saveStoredImportedPromptLibrary(importedByCategory);
      rebuildPromptLibrary(localStorage.getItem('strong_prompt') || '');
      renderPromptList();
      renderPromptPreview();
      showToast(t('toast.prompts.loaded.count', { count: totalImported }));
    } catch (err) {
      showToast(t('toast.prompt.importFailed'));
      console.error(err);
    } finally {
      input.value = '';
    }
  };
  reader.readAsText(file, 'utf-8');
}

function updatePromptStatusIndicator() {
  const modeDot = document.getElementById('promptMode');
  const nameEl = document.getElementById('promptName');
  if (!modeDot || !nameEl) return;
  
  const currentPrompt = localStorage.getItem('strong_prompt') || '';
  const mode = localStorage.getItem('strong_prompt_mode') || 'custom';
  const customSaved = localStorage.getItem('strong_custom_prompt') || '';
  
  // Check if current prompt matches any preset
  let matched = false;
  let matchedName = '';
  
  // Try DEFAULT_PROMPT
  if (currentPrompt === DEFAULT_PROMPT) {
    matched = true;
    matchedName = 'Originální';
  }
  
  // Check other presets
  if (!matched) {
    for (const [category, prompts] of Object.entries(state.PROMPT_LIBRARY)) {
      for (const p of prompts) {
        if (p.text === currentPrompt && category !== 'custom') {
          matched = true;
          matchedName = p.name;
          break;
        }
      }
      if (matched) break;
    }
  }
  
  if (mode === 'system' || matched) {
    // Preset mode – automatic/green
    modeDot.style.background = 'var(--grn)';
    modeDot.style.boxShadow = '0 0 6px var(--grn)';
    nameEl.textContent = mode === 'system' ? 'Systémový (auto)' : matchedName;
    nameEl.style.color = 'var(--grn)';
  } else {
    // Custom mode – manual/red
    modeDot.style.background = 'var(--red)';
    modeDot.style.boxShadow = 'none';
    nameEl.textContent = currentPrompt ? 'Vlastní (upravený)' : 'Žádný';
    nameEl.style.color = 'var(--red)';
  }

  if (!isPromptAutoModeEnabled()) {
    nameEl.textContent += ' · auto OFF';
  }
}

// ── AI & Language Modals ───────────────────────────────────────────
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
  refreshLanguageAwarePromptOptionLabels();
  applySystemPromptForCurrentTask();
  applyUiLanguage();
  updatePromptLangButtonLabel();
  closePromptLangModal();
  showToast(t('toast.lang.settings.saved'));
}

// Expose functions to window
window.showPromptLibraryModal = showPromptLibraryModal;
window.closePromptLibraryModal = closePromptLibraryModal;
window.selectPrompt = selectPrompt;
window.applySelectedPrompt = applySelectedPrompt;
window.exportPromptLibraryToTxt = exportPromptLibraryToTxt;
window.importPromptLibraryFromFile = importPromptLibraryFromFile;
window.showPromptAIModal = showPromptAIModal;
window.closePromptAIModal = closePromptAIModal;
window.saveAISettings = saveAISettings;
window.showPromptLangModal = showPromptLangModal;
window.closePromptLangModal = closePromptLangModal;
window.saveLangSettings = saveLangSettings;

// ── Export vybraného rozsahu ───────────────────────────────────
function exportRange() {
  const from = parseInt(prompt(t('prompt.range.from'), '1') || '1');
  const to   = parseInt(prompt(t('prompt.range.to'), '100') || '100');
  if (isNaN(from) || isNaN(to)) return;

  const done = state.entries.filter(e => {
    const n = parseInt(e.key.slice(1));
    const tr = state.translated[e.key];
    return n >= from && n <= to && tr && tr.vyznam && tr.vyznam !== '—' && !tr.skipped;
  });
  if (!done.length) { showToast(t('toast.noTranslatedInRange', { from: `G${from}`, to: `G${to}` })); return; }

  const lines = done.map(e => {
    const tr = state.translated[e.key];
    return [`${e.key} | ${e.greek}`,
      `Český význam: ${tr.vyznam || '—'}`,
      `Definice: ${tr.definice || '—'}`,
      `Biblické užití: ${tr.pouziti || '—'}`,
      `Původ: ${tr.puvod || '—'}`, ''].join('\n');
  });
  download(`strong_gr_cz_G${from}-G${to}.txt`, lines.join('\n'), 'text/plain');
  showToast(t('toast.exported.range', { count: done.length, from: `G${from}`, to: `G${to}` }));
}

// ══ RESIZE PANELS (logika v ./ui/resize.js) ─────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.pointerEvents = 'none';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = '0'; }, CONFIG.TOAST_DURATION);
}

// Toast s akčním tlačítkem (např. Undo). Vydrží 2× déle.
function showToastWithAction(msg, actionLabel, onClick) {
  const t = document.getElementById('toast');
  t.textContent = '';
  const span = document.createElement('span');
  span.textContent = msg + ' ';
  const btn = document.createElement('button');
  btn.textContent = actionLabel;
  btn.style.cssText = 'margin-left:10px;background:var(--acc2);border:1px solid var(--acc);color:var(--acc3);padding:3px 10px;border-radius:3px;cursor:pointer;font-family:inherit;font-size:inherit';
  btn.onclick = () => {
    t.style.opacity = '0';
    try { onClick(); } catch(e) { logError('toastAction', e); }
  };
  t.appendChild(span);
  t.appendChild(btn);
  t.style.opacity = '1';
  t.style.pointerEvents = 'auto';
  clearTimeout(t._t);
  t._t = setTimeout(() => {
    t.style.opacity = '0';
    t.style.pointerEvents = 'none';
  }, CONFIG.TOAST_DURATION * 2);
}

 function log(msg) {
   const el = document.getElementById('autoLog');
   if (el) el.textContent = msg;
   
   // Also log to console
   console.log('[LOG]', msg);
 }

 function logTokenEntry(provider, inT, outT, total) {
  state.totalTokens.in += inT;
  state.totalTokens.out += outT;
  state.totalTokens.total += total;
  refreshTokenStatsDisplay();

  if (state.autoRunning && isAutoTokenLimitReached()) {
    stopAuto();
    log('🛑 AUTO zastaven po dávce: dosažen limit tokenů');
    showToast(t('toast.auto.stoppedTokenLimit'));
  }
}

function saveAutoTokenLimit() {
  const input = document.getElementById('autoTokenLimit');
  if (!input) return;
  const raw = String(input.value || '').trim();
  const value = parseInt(raw, 10);
  if (!raw || Number.isNaN(value) || value <= 0) {
    localStorage.removeItem(AUTO_TOKEN_LIMIT_KEY);
    input.value = '';
  } else {
    input.value = String(value);
    localStorage.setItem(AUTO_TOKEN_LIMIT_KEY, String(value));
  }
  refreshTokenStatsDisplay();
}

function getAutoTokenLimit() {
  const input = document.getElementById('autoTokenLimit');
  const fromInput = parseInt(String(input?.value || '').trim(), 10);
  if (!Number.isNaN(fromInput) && fromInput > 0) return fromInput;
  const fromStorage = parseInt(localStorage.getItem(AUTO_TOKEN_LIMIT_KEY) || '0', 10);
  return Number.isNaN(fromStorage) ? 0 : Math.max(0, fromStorage);
}

function isAutoTokenLimitReached() {
  const limit = getAutoTokenLimit();
  return limit > 0 && state.totalTokens.total >= limit;
}

function refreshTokenStatsDisplay() {
  const el = document.getElementById('tokenStats');
  if (!el) return;
  const limit = getAutoTokenLimit();
  const suffix = limit > 0 ? ` / limit ${limit}` : '';
  el.textContent = t('stats.tokens', {
    input: state.totalTokens.in,
    output: state.totalTokens.out,
    total: state.totalTokens.total,
    suffix
  });
}

// Preview modal pro hromadny preklad
function showPreviewModal(previewData) {
  state.pendingTranslations = previewData;
  
  const modal = document.createElement('div');
  modal.id = 'previewModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;overflow-y:auto;padding:20px';
  
  // Spočítej kolik klíčů v importu už máme přeložené (kolize)
  let conflicts = 0, newOnes = 0;
  for (const k of Object.keys(previewData)) {
    const cur = state.translated[k];
    if (cur && cur.vyznam && cur.vyznam !== '—' && !cur.skipped) conflicts++; else newOnes++;
  }

  let html = `<div style="max-width:900px;margin:0 auto;background:var(--bg2);border:1px solid var(--brd);border-radius:8px;padding:20px">
    <h2 style="color:var(--acc);margin:0 0 10px 0">${t('import.preview.title', { count: Object.keys(previewData).length })}</h2>
    <div style="font-size:11px;color:var(--txt2);margin-bottom:15px">
      ${t('import.preview.summary', { newOnes, conflicts })}
    </div>
    <div style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;padding:10px 12px;margin-bottom:15px">
      <div style="font-size:11px;color:var(--txt2);margin-bottom:8px"><b>${t('import.mode.title')}</b></div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;margin-bottom:4px">
        <input type="radio" name="importMode" value="missing" checked style="accent-color:var(--acc)">
        <span>${t('import.mode.missing', { count: newOnes })}</span>
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;margin-bottom:4px">
        <input type="radio" name="importMode" value="all" style="accent-color:var(--acc)">
        <span>${t('import.mode.all', { count: Object.keys(previewData).length })}</span>
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px">
        <input type="radio" name="importMode" value="fillgaps" style="accent-color:var(--acc)">
        <span>${t('import.mode.fillgaps')}</span>
      </label>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 12px;background:var(--bg3);border:1px solid var(--brd);border-radius:4px">
        <input type="checkbox" id="checkAllPreview" checked onchange="toggleAllPreview(this.checked)" style="width:16px;height:16px;accent-color:var(--acc)">
        <span style="font-size:12px">${t('import.selectAll')}</span>
      </label>
      <button class="hbtn grn" onclick="acceptPreview()">${t('import.saveSelected')}</button>
      <button class="hbtn red" onclick="discardPreview()">${t('import.cancel')}</button>
    </div>`;
  
  for (const [key, data] of Object.entries(previewData)) {
    const e = state.entryMap.get(key);
    const old = state.translated[key];
    const isConflict = old && old.vyznam && old.vyznam !== '—' && !old.skipped;
    const rawDef = data._rawDefinition || data.definice || '';
    const hasRaw = rawDef && rawDef.length > 10;
    html += `
    <div style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;margin:0 0 15px 0;padding:15px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" class="preview-check" data-key="${key}" data-conflict="${isConflict ? '1' : '0'}" checked style="width:18px;height:18px;accent-color:var(--acc)">
          <span style="font-family:'JetBrains Mono';color:var(--acc);font-weight:bold">${key}</span>
          ${isConflict ? `<span style="font-size:9px;padding:1px 6px;background:var(--acc2);color:#000;border-radius:3px">${t('import.badge.conflict')}</span>` : `<span style="font-size:9px;padding:1px 6px;background:var(--acc3);color:#000;border-radius:3px">${t('import.badge.new')}</span>`}
        </label>
        <span style="color:var(--txt2)">${escHtml(e?.greek || '')}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px">
        <div>
          <div style="color:var(--acc);font-size:10px;margin-bottom:5px">${t('import.czTranslationAi')}</div>
          <div style="font-size:12px">
            <div><b>${t('field.meaning')}</b> ${escHtml(data.vyznam || '—')}</div>
            <div style="margin-top:5px"><b>${t('field.definition')}</b> ${escHtml(data.definice || '—')}</div>
            ${hasRaw && rawDef !== data.definice ? `<div style="margin-top:8px;padding:8px;background:var(--bg2);border-radius:4px;border-left:2px solid var(--acc);font-size:11px;color:var(--txt2)"><b>${t('import.fullTranslation')}</b><div style="margin-top:5px;line-height:1.5">${formatPreviewRawTranslation(rawDef)}</div></div>` : ''}
            <div style="margin-top:5px"><b>${t('field.usage')}</b> ${escHtml(data.pouziti || '—')}</div>
            <div style="margin-top:5px"><b>${t('field.origin')}</b> ${escHtml(data.puvod || '—')}</div>
            <div style="margin-top:5px"><b>${t('field.specialist')}</b> ${escHtml(data.specialista || '—')}</div>
          </div>
        </div>
        <div>
          <div style="color:var(--txt3);font-size:10px;margin-bottom:5px">${t('import.enOriginal')}</div>
          <div style="font-size:12px;color:var(--txt2)">
            <div><b>${t('field.definition')}</b> ${escHtml(e?.definice || e?.def || '—')}</div>
          </div>
        </div>
      </div>
    </div>`;
  }
  
  html += `</div>`;
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

function toggleAllPreview(checked) {
  document.querySelectorAll('.preview-check').forEach(cb => cb.checked = checked);
}

function acceptPreview() {
  const mode = (document.querySelector('input[name="importMode"]:checked') || {}).value || 'missing';

  const FIELDS = ['vyznam', 'definice', 'pouziti', 'puvod', 'specialista', 'kjv'];
  const isEmpty = v => !v || v === '—';

  let applied = 0, skippedConflicts = 0, mergedFields = 0;

  document.querySelectorAll('.preview-check:checked').forEach(cb => {
    const key = cb.dataset.key;
    const incoming = state.pendingTranslations[key];
    if (!incoming) return;
    const existing = state.translated[key];
    const hasExisting = existing && existing.vyznam && existing.vyznam !== '—' && !existing.skipped;

    if (mode === 'all') {
      state.translated[key] = incoming;
      applied++;
    } else if (mode === 'missing') {
      if (hasExisting) { skippedConflicts++; return; }
      state.translated[key] = incoming;
      applied++;
    } else if (mode === 'fillgaps') {
      if (!hasExisting) {
        state.translated[key] = incoming;
        applied++;
        return;
      }
      // Doplň jen prázdná pole v existujícím překladu
      let changed = false;
      const merged = { ...existing };
      for (const f of FIELDS) {
        if (isEmpty(merged[f]) && !isEmpty(incoming[f])) {
          merged[f] = incoming[f];
          changed = true;
          mergedFields++;
        }
      }
      if (changed) { state.translated[key] = merged; applied++; }
      else skippedConflicts++;
    }
  });

  saveProgress();
  renderList();
  updateStats();
  updateFailedCount();
  closePreviewModal();
  const extra = mode === 'fillgaps' && mergedFields
    ? ` (${mergedFields} polí doplněno)`
    : skippedConflicts ? ` · ${skippedConflicts} přeskočeno (kolize)` : '';
  showToast(t('toast.saved.entriesWithExtra', { count: applied, extra }));
}

function discardPreview() {
  closePreviewModal();
  showToast(t('toast.translation.canceled'));
}

// ══ IMPORT TXT/JSON ═══════════════════════════════════════════════════
function importFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const text = ev.target.result;
      const lowerName = (file.name || '').toLowerCase();
      let imported = {};
      if (lowerName.endsWith('.json')) {
        imported = parseImportJSON(text);
      } else if (lowerName.endsWith('.txt')) {
        imported = parseCzTXT(text);
      } else {
        // Fallback: zkus JSON, pak TXT
        try {
          imported = parseImportJSON(text);
        } catch (_) {
          imported = parseCzTXT(text);
        }
      }
      const count = Object.keys(imported).length;
      if (!count) { showToast(t('toast.import.noEntries')); return; }
      const previewData = {};
      for (const [key, data] of Object.entries(imported)) {
        previewData[key] = data;
      }
       showPreviewModal(previewData);
       showToast(t('toast.import.found', { count, format: lowerName.endsWith('.json') ? 'JSON' : lowerName.endsWith('.txt') ? 'TXT' : 'auto' }));
     } catch(e) {
       logError('importFile', e, { fileName: file?.name });
       showToast(t('toast.error.withMessage', { message: e.message }));
     }
    input.value = '';
  };
  reader.readAsText(file, 'utf-8');
}

function importTXT(input) {
  // Zachováno kvůli zpětné kompatibilitě (historické volání z UI/externích skriptů)
  return importFile(input);
}

// Parsuje formát: "G12 | ἄβυσσος\nČeský význam: ...\nDefinice (CZ): ..."
function parseCzTXT(text) {
  const result = {};
  const normalizedText = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  const blocks = normalizedText.split(/\n(?=[GH]\d+\s*\|)/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const header = lines[0];
    const m = header.match(/^([GH]\d+)\s*\|/);
    if (!m) continue;
    const key = m[1];
    const get = (labels) => {
      for (const label of labels) {
        const line = lines.find(l => {
          const trimmed = l.trim();
          return trimmed.startsWith(label + ':') || trimmed.startsWith(label + '：');
        });
        if (line) return line.slice(label.length + 1).trim();
      }
      return '';
    };
    const vyznam = get(['Český význam', 'Vyznam', 'VÝZNAM', 'VYZNAM', 'Význam', 'Cz', 'CZ']);
    const definice = get(['Definice (CZ)', 'Česká definice', 'Definice', 'DEFINICE', 'CZ definice']);
    const pouziti = get(['Biblické užití', 'Biblické užití (KJV)', 'Pouziti', 'POUZITI', 'Použití']);
    const puvod = get(['Původ', 'Puvod', 'PUVOD']);
    const specialista = get(['Specialista', 'VÝKLAD', 'VYKLAD', 'Komentář', 'KOMENTAR', 'Exegeze', 'EXEGEZE']);
    const kjv = get(['KJV překlady (CZ)', 'KJV překlady', 'KJV', 'KJV_PREKLADY', 'KJV Významy']);
    if (vyznam || definice) {
      result[key] = { vyznam, definice, pouziti, puvod, specialista, kjv };
    }
  }
  return result;
}

function parseImportJSON(text) {
  const parsed = JSON.parse(text);
  const result = {};
  const FIELDS = ['vyznam', 'definice', 'pouziti', 'puvod', 'specialista', 'kjv'];

  const normalizeRecord = (record) => {
    if (!record || typeof record !== 'object') return null;
    const out = {};
    for (const field of FIELDS) {
      const val = record[field];
      out[field] = typeof val === 'string' ? val.trim() : '';
    }
    return out;
  };

  const addRecord = (key, value) => {
    if (!/^G\d+$/.test(key) && !/^H\d+$/.test(key)) return;
    const normalized = normalizeRecord(value);
    if (!normalized) return;
    if (!FIELDS.some(f => normalized[f])) return;
    result[key] = normalized;
  };

  if (Array.isArray(parsed)) {
    for (const row of parsed) {
      const key = row?.key || row?.strong || row?.id;
      if (typeof key !== 'string') continue;
      addRecord(key.trim(), row);
    }
    return result;
  }

  if (parsed && typeof parsed === 'object') {
    // Variant A: přímý map exportu { "G1": {...}, "G2": {...} }
    for (const [key, value] of Object.entries(parsed)) {
      addRecord(String(key).trim(), value);
    }

    // Variant B: obálka s polem state.entries/translations
    const wrapped = parsed.entries || parsed.translations || parsed.data;
    if (Array.isArray(wrapped)) {
      for (const row of wrapped) {
        const key = row?.key || row?.strong || row?.id;
        if (typeof key !== 'string') continue;
        addRecord(key.trim(), row);
      }
    }
  }

  return result;
}

// ══ NEÚSPĚŠNÉ PŘEKLADY ════════════════════════════════════════════════
function updateFailedCount() {
  let count = 0;
  for (const key of Object.keys(state.translated)) {
    const translationState = getTranslationStateForKey(key);
    if (state === 'failed' || state === 'failed_partial') count++;
  }
  const el = document.getElementById('failedCount');
  if (el) el.textContent = count > 0 ? `(${count})` : '';
}

function showFailedEntries() {
  const failed = [];
  for (const key of Object.keys(state.translated)) {
    const translationState = getTranslationStateForKey(key);
    if (state === 'failed' || state === 'failed_partial') {
      const tr = state.translated[key];
      failed.push({ key, raw: tr.raw, greek: state.entryMap.get(key)?.greek });
    }
  }
  
  if (!failed.length) {
    showToast(t('toast.failed.none'));
    return;
  }
  
  const failedKeys = failed.map(f => f.key);
  
  const modal = document.createElement('div');
  modal.id = 'failedModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.88);z-index:9999;overflow-y:auto;padding:20px';
  
  let cards = '';
  for (const f of failed) {
    const info = state.entryMap.get(f.key);
    const rawText = f.raw || (info ? `${info.greek}\n\nDEF: ${info.definice || info.def || ''}\nKJV: ${info.kjv || ''}` : '(prázdné)');
    cards += `<div style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;margin:0 0 10px 0;padding:12px">
      <div style="font-family:'JetBrains Mono';color:var(--acc);font-weight:bold;margin-bottom:6px">${f.key} | ${escHtml(f.greek || '')}</div>
      <div style="font-size:11px;color:var(--txt2);white-space:pre-wrap;max-height:120px;overflow-y:auto;background:var(--bg1);padding:8px;border-radius:4px">${escHtml(rawText)}</div>
    </div>`;
  }
  
  modal.innerHTML = `
  <div style="max-width:800px;margin:0 auto;background:var(--bg2);border:1px solid var(--brd);border-radius:8px;padding:22px">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;flex-wrap:wrap">
      <h2 style="color:var(--acc);font-family:'JetBrains Mono',monospace;font-size:14px;margin:0">
        ${t('failed.modal.title', { count: failed.length })}
      </h2>
      <button class="hbtn grn" onclick="retryFailed('${failedKeys.join(',')}')">${t('failed.modal.retry')}</button>
      <button class="hbtn red" onclick="closeFailedModalSafe()">${t('failed.modal.close')}</button>
    </div>
    <div style="font-size:12px;color:var(--txt3);margin-bottom:14px">
      ${t('failed.modal.note')}
    </div>
    <div id="failedCards">${cards}</div>
  </div>`;
  
  document.body.appendChild(modal);
  showToast(t('toast.failed.found', { count: failed.length }));
}

function retryFailed(failedKeysStr) {
  const keys = failedKeysStr.split(',');
  state.selectedKeys = new Set(keys);
  renderList();
  closeFailedModalSafe();
  
  // Nastav retry režim - příští translateNext/AUTO vezme tyto klíče
  state.retryMode = true;
  state.retryKeysList = keys;
  
  showToast(t('toast.selectedForBatch', { count: keys.length }));
}

function closePreviewModal() {
  closePreviewModalSafe();
}

// Escape zavře modal
document.addEventListener('keydown', e => {
  // Ctrl+S = uložit progress (Ctrl is either)
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveProgress();
  showToast(t('toast.progress.saved'));
    return;
  }
  // Ctrl+E = export do TXT
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    exportTXT();
    return;
  }
    if (e.key === 'Escape') {
      closePreviewModalSafe();
      closeLimitsModal();
      closePromptLibraryModal();
      closePromptAIModal();
      closePromptLangModal();
      closeTopicPromptModal();
      closeTopicRepairModalSafe();
      closeHelpModal();
    }
  if (document.getElementById('app').style.display === 'none') return;
  // Klávesové zkratky v app
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === ' ') { e.preventDefault(); translateNext(); }
  if (e.key === 'a' || e.key === 'A') toggleAuto();
  if (e.key === 'ArrowDown') {
    const idx = state.filteredKeys.indexOf(state.activeKey);
    if (idx < state.filteredKeys.length - 1) showDetail(state.filteredKeys[idx + 1]);
  }
  if (e.key === 'ArrowUp') {
    const idx = state.filteredKeys.indexOf(state.activeKey);
    if (idx > 0) showDetail(state.filteredKeys[idx - 1]);
  }
});
// Expose functions to global scope for HTML event handlers
window.loadTXT = loadTXT;
window.loadDefaultFile = loadDefaultFile;
window.startApp = startApp;
window.toggleAuto = toggleAuto;
window.onProviderChange = onProviderChange;
window.saveApiKey = saveApiKey;
window.resetPrompt = resetPrompt;
window.jumpToStart = jumpToStart;
window.toggleListPane = toggleListPane;
window.importFile = importFile;
window.importTXT = importTXT;
window.translateNext = translateNext;
window.selectRange = selectRange;
window.exportTXT = exportTXT;
window.exportJSON = exportJSON;
window.exportRange = exportRange;
window.showFailedEntries = showFailedEntries;
window.clearProgress = clearProgress;
window.restoreFromBackup = restoreFromBackup;
window.stopAuto = stopAuto;
window.filterList = filterList;
window.filterListDebounced = filterListDebounced;
window.filterMissingTopicsList = filterMissingTopicsList;
window.selectAll = selectAll;
window.selectNone = selectNone;
window.translateSelected = translateSelected;
window.showSetup = showSetup;
window.clearLog = clearLog;
window.closeModal = closeModal;
window.confirmModal = confirmModal;
window.toggleSelect = toggleSelect;
window.translateSingle = translateSingle;
window.retranslateSingle = retranslateSingle;
window.openSystemPromptModal = openSystemPromptModal;
window.runSystemPromptAI = runSystemPromptAI;
window.closeSystemPromptModal = closeSystemPromptModal;
window.applyAutoPanelSettings = applyAutoPanelSettings;
window.toggleEditSection = toggleEditSection;
window.saveSection = saveSection;
window.toggleAllPreview = toggleAllPreview;
window.acceptPreview = acceptPreview;
window.discardPreview = discardPreview;
window.openTopicPromptModal = openTopicPromptModal;
window.runTopicPromptAI = runTopicPromptAI;
window.applyTopicPromptResult = applyTopicPromptResult;
window.refillSingleField = refillSingleField;
window.closeTopicPromptModal = closeTopicPromptModal;
window.restoreTopicRepairModal = restoreTopicRepairModal;
window.toggleTopicRepairRun = toggleTopicRepairRun;
window.setTopicRepairStrategy = setTopicRepairStrategy;
window.startTopicRepairSequentialWorker = startTopicRepairSequentialWorker;
window.setTopicRepairSpecialistaDecision = setTopicRepairSpecialistaDecision;
window.setTopicRepairDetectedTopicDecision = setTopicRepairDetectedTopicDecision;
window.applyTopicRepairSelected = applyTopicRepairSelected;
window.toggleTopicRepairTask = toggleTopicRepairTask;
window.applyTopicRepairProviderCheckboxes = applyTopicRepairProviderCheckboxes;
window.minimizeTopicRepairModal = minimizeTopicRepairModal;
window.closeTopicRepairModalOnly = closeTopicRepairModalOnly;
window.refreshTopicRepairBatchPromptEditor = refreshTopicRepairBatchPromptEditor;
window.saveTopicRepairBatchPromptDraft = saveTopicRepairBatchPromptDraft;
window.resetTopicRepairBatchPromptToDefault = resetTopicRepairBatchPromptToDefault;
window.runTopicRepairBulkTranslation = runTopicRepairBulkTranslation;
window.syncTopicRepairBulkRunInputsToHidden = syncTopicRepairBulkRunInputsToHidden;
window.toggleTopicRepairBulkInclude = toggleTopicRepairBulkInclude;
window.toggleTopicRepairBulkListFilter = toggleTopicRepairBulkListFilter;
window.setTopicRepairBulkIncludeAll = setTopicRepairBulkIncludeAll;
window.retryFailed = retryFailed;
window.showMobileActions = showMobileActions;
window.closeMobileModal = closeMobileModal;
window.showSettingsModal = showSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.showLimitsModal = showLimitsModal;
window.closeLimitsModal = closeLimitsModal;
window.closeModelTestModal = closeModelTestModal;
window.copyModelTestOutput = copyModelTestOutput;
window.clearModelTestOutput = clearModelTestOutput;
window.cancelModelTest = cancelModelTest;
window.runModelTestFromModal = runModelTestFromModal;
window.openModelTestModal = openModelTestModal;
window.openModelTestPromptPreviewModal = openModelTestPromptPreviewModal;
window.closeModelTestPromptPreviewModal = closeModelTestPromptPreviewModal;
window.copyModelTestPromptPreview = copyModelTestPromptPreview;
window.resetModelTestModal = resetModelTestModal;
window.restoreModelTestReportFromBackup = restoreModelTestReportFromBackup;
window.saveModelTestOutputTxt = saveModelTestOutputTxt;
window.saveModelTestRawOutputTxt = saveModelTestRawOutputTxt;
window.loadModelTestOutputFromFile = loadModelTestOutputFromFile;
window.deleteModelTestStatsRow = deleteModelTestStatsRow;
window.showModelTestLibrary = showModelTestLibrary;
window.showHelpModal = showHelpModal;
window.closeHelpModal = closeHelpModal;
window.onApiKeyProfileChange = onApiKeyProfileChange;
window.saveCurrentApiKeyAsProfile = saveCurrentApiKeyAsProfile;
window.deleteApiKeyProfile = deleteApiKeyProfile;
window.escHtml = escHtml;
window.updateFailedCount = updateFailedCount;
window.parseCzTXT = parseCzTXT;
window.showPromptLibraryModal = showPromptLibraryModal;
window.closePromptLibraryModal = closePromptLibraryModal;
window.applySelectedPrompt = applySelectedPrompt;
window.exportPromptLibraryToTxt = exportPromptLibraryToTxt;
window.importPromptLibraryFromFile = importPromptLibraryFromFile;
window.applySystemPromptForCurrentTask = applySystemPromptForCurrentTask;
window.togglePromptModeQuick = togglePromptModeQuick;
window.togglePromptAutoMode = togglePromptAutoMode;
window.showPromptAIModal = showPromptAIModal;
window.closePromptAIModal = closePromptAIModal;
window.saveAISettings = saveAISettings;
window.showPromptLangModal = showPromptLangModal;
window.closePromptLangModal = closePromptLangModal;
window.saveLangSettings = saveLangSettings;
window.updatePromptStatusIndicator = updatePromptStatusIndicator;
window.testCurrentProviderModels = testCurrentProviderModels;

// Null-safe modal close helpers
function closePreviewModalSafe() {
  const modal = document.getElementById('previewModal');
  if (modal) modal.remove();
  state.pendingTranslations = {};
}

function closeFailedModalSafe() {
  const modal = document.getElementById('failedModal');
  if (modal) modal.remove();
}

window.closePreviewModalSafe = closePreviewModalSafe;
window.closeFailedModalSafe = closeFailedModalSafe;
window.closeTopicRepairModalSafe = closeTopicRepairModalSafe;

// Expose for debugging
window.PROVIDERS = PROVIDERS;
window.populateOpenRouterModels = populateOpenRouterModels;

// Cleanup on page unload - auto-save progress
window.addEventListener('beforeunload', () => {
  if (state.autoTimer) clearTimeout(state.autoTimer);
  if (state.autoCountTimer) clearInterval(state.autoCountTimer);
  if (state.autoProviderCountdownTimer) clearInterval(state.autoProviderCountdownTimer);
  stopTopicRepairTicker();
  if (state.elapsedTimer) clearInterval(state.elapsedTimer);
  stopResize();
  // Debounced save musí být proveden synchronně před zavřením
  saveProgress.flush();
});
// Při skrytí tabu také flushni, aby se nic neztratilo
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveProgress.flush();
});


