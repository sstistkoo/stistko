  // â•â• CORE MODULE IMPORT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
  import { createAutoApi } from './auto.js';
  import { createModelTestUiApi, createModelTestRunnerApi } from './modelTest.js';
  import { createPromptLibraryApi } from './promptLibrary.js';
  import { startResize, doResize, stopResize } from './ui/resize.js';
  import { createExportApi } from './exportData.js';
  import { createToastApi }  from './ui/toast.js';
  import { createHeaderApi } from './ui/header.js';
  import { createModalsApi } from './ui/modals.js';
  import { createListApi }   from './ui/list.js';
  import { createDetailApi } from './ui/detail.js';
  import { createBatchApi }  from './translation/batch.js';
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
const PIPELINE_SECONDARY_ENABLED_KEY = 'strong_pipeline_secondary_enabled_';

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
    if (autoLog && (autoLogText === 'ÄŒekÃ¡ na start...' || autoLogText === 'Waiting to start...')) {
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
    if (promptPreview && (promptPreviewText === 'Vyberte prompt z knihovny pro nÃ¡hled...' || promptPreviewText === 'Select a prompt from the library for preview...')) {
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
    if (status && !status.classList.contains('ok') && (rawStatus === 'â€” nevybrÃ¡no' || rawStatus === 'â€” none selected')) {
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

POVINNÃ VÃSTUP NAVÃC:
- PÅ™idej Å™Ã¡dek SPECIALISTA: [detailnÃ­ odstavec 3-5 vÄ›t jako biblickÃ½ specialista].
- Odstavec mÃ¡ vysvÄ›tlit teologickÃ½ a biblickÃ½ vÃ½znam slova v kontextu.
- NepiÅ¡ body ani seznam, jen souvislÃ½ odstavec.`;
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
        cz: 'ÄeÅ¡tiny',
        en: 'angliÄtiny',
        bg: 'bulharÅ¡tiny',
        ch: 'ÄÃ­nÅ¡tiny',
        sp: 'Å¡panÄ›lÅ¡tiny',
        sk: 'slovenÅ¡tiny',
        pl: 'polÅ¡tiny',
        gr: 'Å™eÄtiny',
        he: 'hebrejÅ¡tiny',
        both: 'Å™eÄtiny i hebrejÅ¡tiny'
      };
      const targetName = langNames[targetLang] || 'ÄeÅ¡tiny';
      const sourceName = langNames[sourceLang] || 'Å™eÄtiny';
      
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
        const base = String(EN_TOPIC_PROMPT_LABEL_BASE[promptType] || '').replace(/^TÃ©ma:\s*/i, '');
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
        cz: 'ÄeÅ¡tiny',
        en: 'angliÄtiny',
        bg: 'bulharÅ¡tiny',
        ch: 'ÄÃ­nÅ¡tiny',
        sp: 'Å¡panÄ›lÅ¡tiny',
        sk: 'slovenÅ¡tiny',
        pl: 'polÅ¡tiny',
        gr: 'Å™eÄtiny',
        he: 'hebrejÅ¡tiny',
        both: 'Å™eÄtiny i hebrejÅ¡tiny'
      };
      const targetName = langNames[targetLang] || 'ÄeÅ¡tiny';
      const sourceName = langNames[sourceLang] || 'Å™eÄtiny';

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
          { role: 'system', content: 'OdpovÃ­dej struÄnÄ› a bez komentÃ¡Å™Å¯ navÃ­c.' },
          { role: 'user', content: 'NapiÅ¡ dvakrÃ¡t po sobÄ› slovo "heslo".' }
        ];
      }
      if (promptEnabled) {
        return buildPromptMessagesForModelTest(batch, promptType);
      }
      return buildPromptMessages(batch);
    }

  // â•â• ERROR LOGGER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
    logMsg(`âœ— ${context}: ${error.message}`, 'err');
  }

  function logWarn(context, message, extra = {}) {
    console.warn(`[${new Date().toISOString()}] [${context}]`, message, extra);
    log(`âš  ${context}: ${message}`);
  }

  function logInfo(context, message) {
    console.log(`[${new Date().toISOString()}] [${context}]`, message);
    log(`â„¹ ${context}: ${message}`);
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

  // Try cache first (rychlÃ½ start), ale vÅ¾dy nÃ¡slednÄ› zkus aktualizaci z API
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
      // NÄ›kterÃ© poloÅ¾ky API mohou bÃ½t metadata bez reÃ¡lnÄ› routovatelnÃ©ho endpointu
      // (pak pÅ™i testu vracÃ­ 404 "No endpoints found"). ZkusÃ­me je vyÅ™adit.
      const models = modelsRaw.filter(m => {
        if (Array.isArray(m.endpoints) && m.endpoints.length === 0) return false;
        if (m?.top_provider && m.top_provider.is_disabled === true) return false;
        return true;
      });
      const modelMap = new Map(models.map(m => [m.id, m]));

      const topCandidates = [
        { id: 'openrouter/free', fixedLabel: t('provider.top.autoRouter') },
        { id: 'openai/gpt-oss-20b:free', fixedLabel: 'â˜… OpenAI GPT-OSS 20B (free)' },
        { id: 'nvidia/nemotron-nano-9b-v2:free', fixedLabel: 'â˜… NVIDIA Nemotron Nano 9B v2 (free)' }
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

      // Fallback na jakoukoli dostupnou cache (i starou), aby app zÅ¯stala provoznÃ­
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

// â•â• LOAD TXT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
      el.textContent = `âœ“ ${file.name} â€” ${t('entries.count', { count: state.entries.length })}`;
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
      throw new Error('Soubor nenalezen (GitHub ani lokÃ¡lnÃ­ fallback)');
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
      document.getElementById('statusTXT').textContent = `âœ“ ${lastFile} â€” ${t('entries.count', { count: state.entries.length })}`;
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
      document.getElementById('statusTXT').textContent = 'âœ— ' + e.message;
    });
}

function checkDefaultFile() {
  const lastFile = localStorage.getItem(LAST_FILE_KEY);
  if (lastFile) {
    document.getElementById('btnLoadDefault').style.display = 'inline-block';
    return;
  }
  // NeprovÃ¡dÃ­me testovacÃ­ fetch, aby se v konzoli neobjevoval zbyteÄnÃ½ 404.
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

// â•â• RESUME â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function checkResume() {
  try {
    const box = document.getElementById('resumeBox');
    if (box) box.style.display = 'none';
    let saved = localStorage.getItem(storeKey());
    let source = t('resume.source.currentSlot');
    // Pokud nemÃ¡me nic pod aktuÃ¡lnÃ­m fileId, ale mÃ¡me legacy data, nabÃ­dneme je
    if (!saved && state.currentFileId) {
      const legacy = localStorage.getItem(LEGACY_STORE_KEY);
      if (legacy) { saved = legacy; source = t('resume.source.legacySlot'); }
    }
    if (!saved) return;
    const data = JSON.parse(saved);
    const count = Object.keys(data.translated || {}).filter(k => {
      const t = data.translated[k];
      return t && t.vyznam && t.vyznam !== 'â€”' && !t.skipped;
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
    btn.textContent = 'â‰¡ Seznam';
    if (isMobile) {
      pane.style.height = '45%';
      logPanel.style.height = '50%';
      logPanel.style.flex = 'none';
      detailPane.style.height = 'auto';
      detailPane.style.flex = '1';
    }
  } else {
    pane.classList.add('hidden');
    btn.textContent = 'â‰¡ Seznam';
    if (isMobile) {
      pane.style.height = '0';
      logPanel.style.height = '100%';
      logPanel.style.flex = '1';
      detailPane.style.height = 'auto';
      detailPane.style.flex = '1';
    }
  }
}

// â•â• START â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function startApp() {
  // UkaÅ¾ loading hned
  document.getElementById('setup').style.display = 'none';
  const app = document.getElementById('app');
  app.style.display = 'flex';
  const loadingEl = document.createElement('div');
  loadingEl.id = 'appLoading';
  loadingEl.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:var(--txt3);font-family:JetBrains Mono,monospace;font-size:14px';
  loadingEl.textContent = 'â³ NaÄÃ­tÃ¡m...';
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

  // Obnov uloÅ¾enÃ½ pÅ™eklad â€“ pro aktuÃ¡lnÄ› naÄtenÃ½ soubor
  try {
    const saved = localStorage.getItem(storeKey());
    if (saved) {
      const data = JSON.parse(saved);
      state.translated = data.translated || {};
      state.sourceEntryEdits = data.sourceEntryEdits || {};
    } else if (state.currentFileId) {
      // Pokus o migraci ze starÃ©ho (legacy) slotu pÅ™i prvnÃ­m pouÅ¾itÃ­ novÃ©ho prefixu
      const legacy = localStorage.getItem(LEGACY_STORE_KEY);
      if (legacy) {
        const data = JSON.parse(legacy);
        if (data && data.translated && Object.keys(data.translated).length > 0) {
          state.translated = data.translated;
          state.sourceEntryEdits = data.sourceEntryEdits || {};
          // UloÅ¾ pod novÃ½m klÃ­Äem, legacy zachovÃ¡me â€“ uÅ¾ivatel mÅ¯Å¾e mÃ­t vÃ­c souborÅ¯
          localStorage.setItem(storeKey(), JSON.stringify({ translated: state.translated, sourceEntryEdits: state.sourceEntryEdits, ts: Date.now(), fileId: state.currentFileId, migrated: true }));
          logInfo('migrate', `MigrovÃ¡no ${Object.keys(state.translated).length} hesel z legacy slotu`);
        }
      }
    }
   } catch(e) {
     logWarn('startApp', 'Failed to load saved progress, starting fresh', { error: e.message });
     state.translated = {};
     state.sourceEntryEdits = {};
   }

  document.getElementById('app').style.display = 'flex';
  
  // Dedup state.entries - pokud jsou duplicitnÃ­ klÃ­Äe, bereme jen prvnÃ­ vÃ½skyt
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
  
  // VytvoÅ™ index pro rychlÃ© Å™azenÃ­ podle pÅ¯vodnÃ­ho poÅ™adÃ­
  window._entryIndexMap = new Map(state.entries.map((e, i) => [e.key, i]));

  state.filteredKeys = state.entries.map(e => e.key);
  initVirtualScroll();
  renderList();
  
  // Scroll na zaÄÃ¡tek po naÄtenÃ­ a znovu vykresli
  const listScroll = document.getElementById('listScroll');
  if (listScroll) listScroll.scrollTop = 0;
  state.lastRenderRange = { start: -1, end: -1, doneStates: {} };
  renderVisible();
  
  updateStats();
  initRunSelects();
  updateFailedCount();
  updateBackupButtonVisibility();
  updateFileIdBadge();
  
  // OdstraÅˆ loading element
  if (loadingEl && loadingEl.parentNode) {
    loadingEl.parentNode.removeChild(loadingEl);
  }
  
  document.getElementById('resizeHandle').addEventListener('mousedown', startResize);
  document.getElementById('resizeHandle').addEventListener('touchstart', startResize, {passive: false});
   
  if (window.innerWidth <= 600) {
    toggleListPane();
  }
}

// â•â• LIST â€” pÅ™esunuto do js/ui/list.js (viz wiring nÃ­Å¾e) â•â•â•â•â•â•â•â•â•â•


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
    bulkRunBtn.textContent = state.topicRepairBulkRunning ? 'â–  Zastavit hromadnÃ½ pÅ™eklad' : t('topicRepair.bulk.button');
  }
  const rows = vis.map(task => {
    const idx = topicRepairState.tasks.indexOf(task);
    const extraTopicsForUi = (Array.isArray(task.detectedTopics) ? task.detectedTopics : [])
      .filter(row => row && row.topicId && row.topicId !== 'specialista' && row.topicId !== task.topicId);
    const rhOther = (Array.isArray(task.rawHeaderTopics) ? task.rawHeaderTopics : []).filter(id => id && id !== task.topicId);
    const rawHeadersHint = (task.status === 'done' || task.status === 'failed') && rhOther.length > 0
      ? `<div style="font-size:10px;color:var(--acc2);margin-top:6px">ðŸ“Ž V odpovÄ›di takÃ© nadpisy: ${rhOther.map(id => escHtml(TOPIC_LABELS[id] || id)).join(', ')}${extraTopicsForUi.length ? '' : ' â€” bez tabulky â€ždalÅ¡Ã­ tÃ©mataâ€œ zkontroluj ðŸ“Ž v logu a F12 â†’ RAW.'}</div>`
      : '';
    const statusColor = task.status === 'done' ? 'var(--acc3)' : (task.status === 'failed' ? 'var(--red)' : (task.status === 'running' ? 'var(--ylw)' : 'var(--txt3)'));
    const statusText = task.status === 'done' ? 'hotovo' : (task.status === 'failed' ? 'chyba' : (task.status === 'running' ? 'bÄ›Å¾Ã­' : 'ÄekÃ¡'));
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
          <span style="font-size:11px;color:${statusColor}">${statusText}${task.provider ? ` Â· ${task.provider}` : ''}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="font-size:11px;color:var(--txt2)">
            <div><b>${t('topicRepair.originalTopic')}</b> ${escHtml(task.currentValue || 'â€”')}</div>
            <div style="margin-top:4px"><b>${t('topicRepair.original')}</b> ${escHtml(task.sourceValue || 'â€”')}</div>
          </div>
          <div style="font-size:11px;color:var(--txt)">
            <div><b>${t('topicRepair.newProposal')}</b> ${escHtml(task.candidateValue || 'â€”')}</div>
            ${formatTopicRepairQuickCompare(task.topicId, task.currentValue, task.candidateValue)}
            ${rawHeadersHint}
            <div style="margin-top:4px;color:var(--txt2)">
              <b>${t('topicRepair.specialistInResponse')}</b> ${task.specialistaInRaw ? t('topicRepair.yes') : t('topicRepair.no')}
              ${task.specialistaInRaw ? ` Â· <b>${t('topicRepair.status')}</b> ${escHtml(task.specialistaDecision || t('topicRepair.unchanged'))}` : ''}
            </div>
            ${task.specialistaInRaw ? `
              <details style="margin-top:6px;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;padding:6px">
                <summary style="cursor:pointer;color:var(--acc)">${t('topicRepair.specialistDetail')}</summary>
                <div style="margin-top:6px;color:var(--txt2)"><b>${t('topicRepair.originalSpecialist')}</b> ${escHtml(task.specialistaPreviousValue || 'â€”')}</div>
                <div style="margin-top:6px;color:var(--txt)"><b>${t('topicRepair.aiSpecialist')}</b> ${escHtml(task.specialistaCandidateValue || 'â€”')}</div>
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
                    <div style="font-size:11px;color:var(--txt2)"><b>${escHtml(TOPIC_LABELS[row.topicId] || row.topicId)}</b> Â· ${t('topicRepair.status')} ${escHtml(row.decision || t('topicRepair.unchanged'))}</div>
                    <div style="margin-top:4px;color:var(--txt2)"><b>${t('topicRepair.originalShort')}</b> ${escHtml(row.previousValue || 'â€”')}</div>
                    <div style="margin-top:4px;color:var(--txt)"><b>${t('topicRepair.aiShort')}</b> ${escHtml(row.candidateValue || 'â€”')}</div>
                    ${formatTopicRepairQuickCompare(row.topicId, row.previousValue, row.candidateValue)}
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
                      <button class="hbtn grn" onclick="setTopicRepairDetectedTopicDecision(${idx}, '${row.topicId}', 'accept')">${t('topicRepair.confirm')}</button>
                      <button class="hbtn red" onclick="setTopicRepairDetectedTopicDecision(${idx}, '${row.topicId}', 'reject')">${t('topicRepair.reject')}</button>
                    </div>
                  </div>
                `).join('')}
              </details>
            ` : ''}
            ${task.error ? `<div style="margin-top:4px;color:var(--red)">âœ— ${escHtml(task.error)}</div>` : ''}
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
        <h2 style="color:var(--acc);margin:0">Oprava tÃ©mat (${topicRepairState.tasks.length})</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="hbtn" id="topicRepairMinimizeBtn" onclick="minimizeTopicRepairModal()">â– Minimalizovat</button>
          <button class="hbtn" onclick="closeTopicRepairModalOnly()">âœ• ZavÅ™Ã­t okno</button>
        </div>
      </div>
      <div style="font-size:11px;color:var(--txt2);margin:8px 0 10px 0">ChybÄ›jÃ­cÃ­ tÃ©mata â€” nic se nespouÅ¡tÃ­ automaticky; zvol reÅ¾im a teprve pak spusÅ¥ pÅ™eklad.</div>
      <div style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;padding:10px;margin-bottom:10px">
        <div style="font-size:12px;color:var(--txt);margin-bottom:8px"><b>ReÅ¾im</b></div>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--txt2)">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="radio" name="topicRepairStrategy" id="topicRepairStrategySeq" value="sequential" ${state.repairStrategy === 'sequential' ? 'checked' : ''} onchange="setTopicRepairStrategy('sequential')" style="accent-color:var(--acc)">
            Po jednom (sekvenÄnÄ› â€” vlastnÃ­ prompt pro kaÅ¾dÃ© chybÄ›jÃ­cÃ­ tÃ©ma)
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="radio" name="topicRepairStrategy" id="topicRepairStrategyBulk" value="bulk" ${state.repairStrategy === 'bulk' ? 'checked' : ''} onchange="setTopicRepairStrategy('bulk')" style="accent-color:var(--acc)">
            HromadnÄ› (dÃ¡vka jednoho tÃ©matu â€” sekce nÃ­Å¾e, tlaÄÃ­tko â€žHromadnÃ½ pÅ™ekladâ€œ)
          </label>
        </div>
        <div id="topicRepairBulkStrategyHint" style="margin-top:8px;font-size:11px;color:var(--txt3);display:${state.repairStrategy === 'bulk' ? 'block' : 'none'}">SekvenÄnÃ­ fronta se nespustÃ­. Rozbal â€žHromadnÃ¡ opravaâ€œ, zkontroluj prompt a dej âš¡ HromadnÃ½ pÅ™eklad.</div>
      </div>
      <div style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;padding:10px;margin-bottom:10px">
        <div id="topicRepairStatus" style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--txt3)">â€”</div>
        <div style="display:grid;gap:2px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--txt2);margin-top:6px">
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="topicRepairEnable_groq" ${topicRepairState.providerEnabled.groq ? 'checked' : ''} onchange="applyTopicRepairProviderCheckboxes()" style="accent-color:var(--acc)">G <span id="topicRepairProvider_groq">Groq: â€”</span></label>
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="topicRepairEnable_gemini" ${topicRepairState.providerEnabled.gemini ? 'checked' : ''} onchange="applyTopicRepairProviderCheckboxes()" style="accent-color:var(--acc)">Gm <span id="topicRepairProvider_gemini">Google: â€”</span></label>
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="topicRepairEnable_openrouter" ${topicRepairState.providerEnabled.openrouter ? 'checked' : ''} onchange="applyTopicRepairProviderCheckboxes()" style="accent-color:var(--acc)">OR <span id="topicRepairProvider_openrouter">OpenRouter: â€”</span></label>
        </div>
      </div>
      <details id="topicRepairBulkDetails" style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;padding:10px;margin-bottom:10px" ${state.repairStrategy === 'bulk' ? 'open' : ''}>
        <summary style="cursor:pointer;color:var(--acc)">HromadnÃ¡ oprava jednoho tÃ©matu (dÃ¡vka)</summary>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:8px">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--txt3);cursor:pointer">
            <input type="checkbox" id="topicRepairBulkOnlyFailed" checked style="accent-color:var(--acc)">
            jen chyby / prÃ¡zdnÃ©
          </label>
          <button class="hbtn" type="button" onclick="setTopicRepairBulkIncludeAll(true)">â˜‘ DÃ¡vka: vÅ¡e</button>
          <button class="hbtn" type="button" onclick="setTopicRepairBulkIncludeAll(false)">â˜ DÃ¡vka: nic</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:10px;font-size:12px;color:var(--txt2)">
          <label style="display:flex;align-items:center;gap:6px">DÃ¡vka (hesel)
            <input type="number" id="topicRepairBulkBatchInput" min="1" max="100" step="1" style="width:64px;padding:4px 6px;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;color:var(--txt);font-family:'JetBrains Mono',monospace;font-size:12px" title="Synchronizuje skrytÃ© batchSizeRun (stejnÃ© jako AUTO)" oninput="syncTopicRepairBulkRunInputsToHidden()">
          </label>
          <label style="display:flex;align-items:center;gap:6px">Interval (s)
            <input type="number" id="topicRepairBulkIntervalInput" min="0" max="600" step="1" style="width:64px;padding:4px 6px;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;color:var(--txt);font-family:'JetBrains Mono',monospace;font-size:12px" title="Synchronizuje skrytÃ© intervalRun â€” pauza mezi dÃ¡vkami" oninput="syncTopicRepairBulkRunInputsToHidden()">
          </label>
          <span id="topicRepairBulkRunSummary" style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--txt3)"></span>
        </div>
        <div style="margin-top:8px">
          <div style="font-size:11px;color:var(--txt2);margin-bottom:6px">Batch prompt (uloÅ¾enÃ½ per tÃ©ma). Placeholder <span style="font-family:'JetBrains Mono',monospace">{HESLA}</span> = vstupnÃ­ hesla.</div>
          <textarea id="topicRepairBatchPrompt" style="width:100%;min-height:160px;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;color:var(--txt);padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.45"></textarea>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
            <button class="hbtn" type="button" onclick="saveTopicRepairBatchPromptDraft()">ðŸ’¾ UloÅ¾it prompt</button>
            <button class="hbtn" type="button" onclick="resetTopicRepairBatchPromptToDefault()">â†º VÃ½chozÃ­ z katalogu</button>
            <button class="hbtn grn" id="topicRepairBulkRunBtn" type="button" onclick="runTopicRepairBulkTranslation()">âš¡ HromadnÃ½ pÅ™eklad (vybranÃ©)</button>
          </div>
          <div style="font-size:11px;color:var(--txt3);margin-top:8px">
            Tip: pokud bÄ›Å¾Ã­ sekvenÄnÃ­ oprava, dej nejdÅ™Ã­v Pauza â€” hromadnÃ½ bÄ›h poÄkÃ¡, aÅ¾ dobÄ›hne aktuÃ¡lnÃ­ pokus.
          </div>
        </div>
      </details>
      <div style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;padding:10px;margin-bottom:10px">
        <div style="font-size:12px;color:var(--txt);margin-bottom:6px"><b>TÃ©ma v seznamu</b> â€” podle vÃ½bÄ›ru se zobrazÃ­ jen odpovÃ­dajÃ­cÃ­ Å™Ã¡dky (sekvenÄnÃ­ i dÃ¡vka).</div>
        <label style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--txt2);flex-wrap:wrap">
          <span style="white-space:nowrap">Vybrat</span>
          <select id="topicRepairBulkTopicSelect" onchange="refreshTopicRepairBatchPromptEditor()" style="min-width:240px;flex:1;max-width:100%;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;color:var(--txt);padding:6px;font-size:12px">
            <option value="all" ${state.bulkTopicId === 'all' ? 'selected' : ''}>VÅ¡e</option>
            <option value="definice" ${state.bulkTopicId === 'definice' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.definice)}</option>
            <option value="vyznam" ${state.bulkTopicId === 'vyznam' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.vyznam)}</option>
            <option value="kjv" ${state.bulkTopicId === 'kjv' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.kjv)}</option>
            <option value="pouziti" ${state.bulkTopicId === 'pouziti' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.pouziti)}</option>
            <option value="puvod" ${state.bulkTopicId === 'puvod' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.puvod)}</option>
            <option value="specialista" ${state.bulkTopicId === 'specialista' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.specialista)}</option>
          </select>
        </label>
        <div id="topicRepairBulkListFilterRow" style="display:${state.bulkTopicId === 'all' ? 'flex' : 'none'};flex-wrap:wrap;gap:10px 14px;align-items:center;width:100%;margin-top:10px;padding-top:10px;border-top:1px solid var(--brd);font-size:11px;color:var(--txt2)">
          <span style="width:100%;margin-bottom:2px">U â€žVÅ¡eâ€œ omez typy tÃ©mat:</span>
          ${TOPIC_REPAIR_BULK_TOPIC_ORDER.map(tid => {
            const on = (state.bulkListTopicFilter || defaultBulkListTopicFilter())[tid] !== false;
            return `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap"><input type="checkbox" ${on ? 'checked' : ''} onchange="toggleTopicRepairBulkListFilter('${tid}', this.checked)" style="accent-color:var(--acc)">${escHtml(TOPIC_LABELS[tid] || tid)}</label>`;
          }).join('')}
        </div>
        <div style="font-size:10px;color:var(--txt3);margin-top:8px">Batch prompt a âš¡ hromadnÃ½ pÅ™eklad zÅ¯stÃ¡vajÃ­ v sekci â€žHromadnÃ¡ opravaâ€œ vÃ½Å¡e â€” vÃ½bÄ›r tÃ©mat je stejnÃ½.</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
        <button class="hbtn grn" id="topicRepairStartSequentialBtn" type="button" onclick="startTopicRepairSequentialWorker()">â–¶ Spustit sekvenÄnÃ­ opravu</button>
        <button class="hbtn grn" id="topicRepairToggleBtn" onclick="toggleTopicRepairRun()">â¸ Pauza</button>
        <button class="hbtn grn" id="topicRepairApplyBtn" onclick="applyTopicRepairSelected()">âœ“ Potvrdit pÅ™epsÃ¡nÃ­ (0)</button>
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
          log(`ðŸ“¥ RAW AI oprava ${nextTask.key}.${nextTask.topicId}: vypsÃ¡no do konzole`);
          console.groupCollapsed(`ðŸ¤– RAW AI oprava ${nextTask.key}.${nextTask.topicId} (${prov}/${model})`);
          console.log(rawText || '(prÃ¡zdnÃ¡ odpovÄ›Ä)');
          console.groupEnd();

          // Kontrola dalÅ¡Ã­ch tÃ©mat: zobraz jen skuteÄnÄ› oznaÄenÃ¡ pole v RAW odpovÄ›di (striktnÃ­ parser).
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
              decision: acceptAuto ? 'pÅ™ijat (auto)' : 'zamÃ­tnut (auto)'
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
            log(`âš  ${nextTask.key}: v RAW je nadpis SPECIALISTA, ale tÄ›lo se nepodaÅ™ilo strojovÄ› vyÄÃ­st â€” viz konzole RAW.`);
          }
          if (shouldReplaceSpecialista(prevSpecialista, candidateSpecialista)) {
            state.translated[nextTask.key].specialista = String(candidateSpecialista || '').trim();
            nextTask.specialistaDecision = 'pÅ™ijat (auto)';
            log(`ðŸ§  SPECIALISTA auto-upgrade ${nextTask.key}: pouÅ¾it kvalitnÄ›jÅ¡Ã­ text z opravy tÃ©matu`);
          } else if (nextTask.specialistaInRaw) {
            nextTask.specialistaDecision = 'zamÃ­tnut (auto)';
          } else {
            nextTask.specialistaDecision = '';
          }

          const hdrOther = (nextTask.rawHeaderTopics || []).filter(id => id !== nextTask.topicId);
          const hdrLabels = hdrOther.map(id => TOPIC_LABELS[id] || id).join(', ') || 'â€”';
          const dtIds = (nextTask.detectedTopics || []).map(d => TOPIC_LABELS[d.topicId] || d.topicId).join(', ') || 'â€”';
          log(`ðŸ“Ž ${nextTask.key} Â· â€ž${TOPIC_LABELS[nextTask.topicId] || nextTask.topicId}â€œ: v RAW bloky [${hdrLabels}] â†’ dalÅ¡Ã­ tÃ©mata (UI): [${dtIds}] Â· SPECIALISTA: ${nextTask.specialistaInRaw ? 'ano' : 'ne'}`);

          const candidate = extractTopicValueFromAI(raw?.content || '', nextTask.topicId, 'strict');
          if (!hasMeaningfulValue(candidate)) {
            throw new Error('AI vrÃ¡tila prÃ¡zdnÃ½ vÃ½sledek');
          }
          nextTask.provider = prov;
          nextTask.candidateValue = String(candidate || '').trim();
          nextTask.checked = shouldAutoCheckTopicRepairTask(nextTask.topicId, nextTask.currentValue, nextTask.candidateValue);
          nextTask.status = 'done';
          success = true;
          log(`âœ“ Oprava tÃ©matu ${nextTask.key}.${nextTask.topicId} pÅ™es ${prov}`);
          break;
        } catch (e) {
          nextTask.error = e.message || 'NeznÃ¡mÃ¡ chyba';
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
    task.specialistaDecision = 'pÅ™ijat ruÄnÄ›';
    showToast(t('toast.specialista.approved', { key: task.key }));
  } else {
    state.translated[task.key].specialista = String(task.specialistaPreviousValue || '').trim();
    task.specialistaDecision = 'zamÃ­tnut ruÄnÄ›';
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
    row.decision = 'pÅ™ijat ruÄnÄ›';
    showToast(t('toast.topic.approved', { topic: TOPIC_LABELS[topicId] || topicId, key: task.key }));
  } else {
    state.translated[task.key][topicId] = String(row.previousValue || '').trim();
    row.decision = 'zamÃ­tnut ruÄnÄ›';
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
    log(`âœ“ Potvrzeno pÅ™epsÃ¡nÃ­ tÃ©mat v opravÄ›: ${applied} Å™Ã¡dkÅ¯`);
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

// Debounced varianta pro oninput (zabrÃ¡ni pÅ™ekreslenÃ­ celÃ©ho listu na kaÅ¾dÃ½ znak)
const filterListDebounced = debounce(filterList, 180);

function hasMeaningfulValue(v) {
  const s = String(v || '').trim();
  return !!s && s !== 'â€”' && s !== '(pÅ™eskoÄeno)';
}

/** AnglickÃ¡ ÄÃ¡st za â€žOriginÃ¡l:â€œ nesmÃ­ oznaÄit celou definici jako EN (bÄ›Å¾nÃ© u CZ+AS dvojice). */
function stripDefinitionOriginReferenceTail(text) {
  const s = String(text || '');
  const m = s.match(/\bOriginÃ¡l\s*:/iu);
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
  // UI artefakty nebo technickÃ½ Å¡um mÃ­sto definice.
  if (/(ðŸ¤–|âœŽ|prompt|upravit|edit|button|klik)/i.test(s)) return true;
  // Definice mÃ¡ bÃ½t vÄ›cnÃ¡; krÃ¡tkÃ©, ale smysluplnÃ© formulace nechceme trestat.
  const words = s.split(/\s+/).filter(Boolean);
  const hasStructure = /[,:;()]/.test(s);
  const hasCzechDiacritics = /[Ã¡ÄÄÃ©Ä›Ã­ÅˆÃ³Å™Å¡Å¥ÃºÅ¯Ã½Å¾]/i.test(s);
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
      t.kjv = `${fallback} [POZN.: v angliÄtinÄ› ze vstupu]`;
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
    if (/\[POZN\.: text je v angliÄtinÄ› - Å¡patnÃ½ pÅ™eklad\]/.test(original)) continue;
    t.definice = `${original} [POZN.: text je v angliÄtinÄ› - Å¡patnÃ½ pÅ™eklad]`;
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
      if (kjvFallback) t.kjv = `${kjvFallback} [POZN.: v angliÄtinÄ› ze vstupu]`;
    }
    if (isDefinitionLikelyEnglish(t.definice)) {
      t.definice = `${String(t.definice || '').trim()} [POZN.: text je v angliÄtinÄ› - Å¡patnÃ½ pÅ™eklad]`.trim();
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

// â”€â”€ getFilteredEntries, virtual scroll, showDetail, renderDetail â†’ js/ui/list.js + js/ui/detail.js

// renderDetail, renderTranslation, editace polÃ­ â†’ js/ui/detail.js

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

/** PoÅ™adÃ­ tÃ©mat pÅ™i hromadnÃ© opravÄ› â€žVÅ¡eâ€œ. */
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

/** DalÅ¡Ã­ ÄekajÃ­cÃ­ Ãºloha v poÅ™adÃ­ `topicRepairState.tasks`, ale jen pokud spadÃ¡ do aktuÃ¡lnÃ­ho filtru tÃ©matu. */
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
    cz: 'ÄeÅ¡tiny',
    en: 'angliÄtiny',
    bg: 'bulharÅ¡tiny',
    ch: 'ÄÃ­nÅ¡tiny',
    sp: 'Å¡panÄ›lÅ¡tiny',
    sk: 'slovenÅ¡tiny',
    pl: 'polÅ¡tiny',
    gr: 'Å™eÄtiny',
    he: 'hebrejÅ¡tiny',
    both: 'Å™eÄtiny i hebrejÅ¡tiny'
  };
  const targetName = langNames[targetLang] || 'ÄeÅ¡tiny';
  const sourceName = langNames[sourceLang] || 'Å™eÄtiny';
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
      'ReÅ¾im â€žVÅ¡eâ€œ: seznam Å™Ã¡dkÅ¯ filtrujeÅ¡ zaÅ¡krtÃ¡vkami vÃ½Å¡e. HromadnÃ½ pÅ™eklad postupnÄ› pouÅ¾ije uloÅ¾enÃ½ batch prompt (ðŸ’¾ UloÅ¾it prompt) pro kaÅ¾dÃ© zaÅ¡krtnutÃ© tÃ©ma â€” jedno tÃ©ma vyber v seznamu, uprav text a uloÅ¾.';
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

/** VÃ½Å™ez bloku jednoho hesla z hromadnÃ© RAW odpovÄ›di (pro parsovÃ¡nÃ­ SPECIALISTA apod.). */
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

/** NaplnÃ­ specialista* u tasku z libovolnÃ©ho RAW (dÃ¡vka = jen blok ###G12###â€¦). */
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
    log(`âš  ${task.key} (dÃ¡vka): v bloku je nadpis SPECIALISTA/alias, ale tÄ›lo se nepodaÅ™ilo strojovÄ› vyÄÃ­st â€” viz konzole RAW.`);
  }
  state.translated[task.key] = state.translated[task.key] || {};
  if (shouldReplaceSpecialista(prevSpecialista, candidateSpecialista)) {
    state.translated[task.key].specialista = String(candidateSpecialista || '').trim();
    task.specialistaDecision = 'pÅ™ijat (auto)';
  } else if (task.specialistaInRaw) {
    task.specialistaDecision = 'zamÃ­tnut (auto)';
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
  el.textContent = `jako AUTO: dÃ¡vka ${bs} hesel Â· interval ${iv}s`;
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

/** Jedno tÃ©ma â€” vnitÅ™nÃ­ smyÄka dÃ¡vek (reÅ¾im â€žVÅ¡eâ€œ i jedno tÃ©ma z editoru). */
async function runTopicRepairBulkTranslationCore(state, topicId, promptTemplate, onlyFailed, bs) {
  const tasks = state.tasks.filter(t => t && t.topicId === topicId && t.includeBulk !== false);
  const picked = onlyFailed
    ? tasks.filter(t => t.status === 'failed' || !hasMeaningfulValue(t.candidateValue))
    : tasks;
  const keys = picked.map(t => t.key);
  if (!keys.length) return { count: 0 };

  const iv0 = parseInt(document.getElementById('intervalRun')?.value, 10) || 20;
  log(`âš¡ HromadnÃ¡ oprava â€ž${TOPIC_LABELS[topicId] || topicId}â€œ: ${keys.length} Ãºloh, dÃ¡vka ${bs}, interval ${iv0}s`);

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
    log(`ðŸ“¥ RAW AI batch oprava ${topicId}: vypsÃ¡no do konzole`);
    console.groupCollapsed(`ðŸ¤– RAW AI batch oprava ${topicId} (${prov}/${model})`);
    console.log(rawText || '(prÃ¡zdnÃ¡ odpovÄ›Ä)');
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
        task.error = 'AI nevrÃ¡tila hodnotu pro toto heslo (zkontroluj formÃ¡t odpovÄ›di).';
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
    showToast('â¹ Zastavuji hromadnÃ½ pÅ™eklad...');
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
    bulkBtn.textContent = 'â–  Zastavit hromadnÃ½ pÅ™eklad';
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
          log(`âš  PÅ™eskoÄeno tÃ©ma ${topicId} â€” prÃ¡zdnÃ½ uloÅ¾enÃ½ batch prompt.`);
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
    log(`âš  Topic prompt sync: ${mismatched.map(([topicId]) => topicId).join(', ')}`);
  } else {
    log('âœ“ Topic prompt sync: testy/detail jsou 1:1');
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

POÅ½ADAVEK NA STYL:
- VraÅ¥ detailnÃ­ exegetickÃ½ odstavec (3-5 vÄ›t), jako biblickÃ½ specialista.
- VysvÄ›tli vÃ½znam slova v Å¡irÅ¡Ã­m biblickÃ©m a teologickÃ©m kontextu.
- Bez odrÃ¡Å¾ek, bez ÄÃ­slovÃ¡nÃ­, bez dalÅ¡Ã­ch polÃ­.`
    : '';

  return `${enforceSpecialistaFormat(promptTemplate)}

---
TEÄŽ PÅ˜ELOÅ½ POUZE JEDNO TÃ‰MA.
- Heslo: ${key}
- Pole: ${topicLabel} (${topicId})
- VraÅ¥ jen ÄistÃ½ text pro toto jedno pole bez dalÅ¡Ã­ch sekcÃ­.

ZdrojovÃ¡ data:
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
  if (currentInput) currentInput.value = state.topicPromptState.currentValue || 'â€”';
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
    log(`ðŸ¤– PÅ™eklad tÃ©matu: ${getTranslationEngineLabel(raw, prov, model)}`);
    log(`ðŸ“¥ RAW AI ${state.topicPromptState.key}.${state.topicPromptState.topicId}: vypsÃ¡no do konzole`);
    console.groupCollapsed(`ðŸ¤– RAW AI ${state.topicPromptState.key}.${state.topicPromptState.topicId}`);
    console.log(rawText || '(prÃ¡zdnÃ¡ odpovÄ›Ä)');
    console.groupEnd();
  } catch (e) {
    logError('runTopicPromptAI', e, { key: state.topicPromptState.key, topic: state.topicPromptState.topicId });
    showToast(t('toast.error.withMessage', { message: e.message }));
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = 'â–¶ Odeslat AI';
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
    showToast('âš  Definice vypadÃ¡ nekvalitnÄ›, ponechÃ¡na pÅ¯vodnÃ­ hodnota.');
    return;
  }
  if (hasMeaningfulValue(prevValue) && !shouldReplaceTopicValue(topicId, prevValue, val)) {
    if (topicId === 'specialista') {
      showToast('âš  Specialista nenÃ­ kvalitnÄ›jÅ¡Ã­ neÅ¾ aktuÃ¡lnÃ­ text. PÅ¯vodnÃ­ hodnota zÅ¯stala.');
    } else {
      showToast(`âš  Pole ${TOPIC_LABELS[topicId] || topicId}: novÃ½ nÃ¡vrh nenÃ­ lepÅ¡Ã­, pÅ¯vodnÃ­ hodnota zÅ¯stala.`);
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
    log(`ðŸ§  SPECIALISTA auto-upgrade ${key}: pouÅ¾it kvalitnÄ›jÅ¡Ã­ text z AI odpovÄ›di`);
  }

  // Pokud AI vrÃ¡tÃ­ i dalÅ¡Ã­ tÃ©mata, zkus je bezpeÄnÄ› slouÄit (jen kdyÅ¾ jsou kvalitnÄ›jÅ¡Ã­).
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
    log(`âœ¨ DETAIL auto-merge ${key}.${extraTopicId}: aplikovÃ¡no z jednÃ© AI odpovÄ›di`);
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
  const biblicalHints = (t.match(/\b(BÅ¯h|Kristus|JeÅ¾Ã­Å¡|evangelium|hÅ™Ã­ch|spÃ¡sa|soud|milost|vÃ­ra|teolog|teologie|biblick|zjevenÃ­|Å¾alm|job|pÅ™Ã­slovÃ­|novÃ½ zÃ¡kon|starÃ½ zÃ¡kon)\b/gi) || []).length;
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
  return (String(text || '').match(/[Ã¡ÄÄÃ©Ä›Ã­ÅˆÃ³Å™Å¡Å¥ÃºÅ¯Ã½Å¾ÃÄŒÄŽÃ‰ÄšÃÅ‡Ã“Å˜Å Å¤ÃšÅ®ÃÅ½]/g) || []).length;
}

function countEnglishNoiseWords(text) {
  return (String(text || '').match(/\b(the|and|which|used|only|without|see|word|in|of|to)\b/gi) || []).length;
}

function countBracketRefs(text) {
  return (String(text || '').match(/\[[^\]]{2,}\]/g) || []).length;
}

function scoreTopicRepairText(topicId, text) {
  const t = String(text || '').trim();
  if (!hasMeaningfulValue(t)) return { score: 0, notes: ['prÃ¡zdnÃ©'] };
  const notes = [];
  let score = 0;

  if (topicId === 'definice') {
    const len = t.length;
    score += Math.min(6, Math.floor(len / 120));
    score += Math.min(3, countBracketRefs(t));
    score += Math.min(3, Math.floor(countCzDiacritics(t) / 6));
    if (isDefinitionLowQuality(t)) {
      score -= 8;
      notes.push('definice: nÃ­zkÃ¡ kvalita / pÅ™Ã­liÅ¡ krÃ¡tkÃ©');
    }
    if (isDefinitionLikelyEnglish(t)) {
      score -= 6;
      notes.push('definice: anglickÃ½ nÃ¡dech');
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
      notes.push('vÃ½znam: hodnÄ› dlouhÃ½');
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
    if (refs === 0) notes.push('uÅ¾itÃ­: mÃ¡lo odkazÅ¯ []');
    return { score, notes };
  }

  if (topicId === 'puvod') {
    score += Math.min(5, Math.floor(t.length / 60));
    score += Math.min(3, Math.floor(countCzDiacritics(t) / 5));
    score -= Math.min(4, countEnglishNoiseWords(t));
    if (!/(Å™ec|hebr|lat|sÃ©m|indoev|koÅ™en|odvoz)/i.test(t)) notes.push('pÅ¯vod: chybÃ­ jazykovÃ½ kontext');
    return { score, notes };
  }

  if (topicId === 'specialista') {
    const s = getSpecialistaQualityScore(t);
    score += s;
    notes.push(`specialista: skÃ³re ${s}`);
    return { score, notes };
  }

  score += Math.min(6, Math.floor(t.length / 80));
  score -= Math.min(4, countEnglishNoiseWords(t));
  return { score, notes };
}

function verdictTopicRepairCompare(prevScore, nextScore) {
  if (!Number.isFinite(prevScore) || !Number.isFinite(nextScore)) return { label: 'nejasnÃ©', tone: 'var(--txt3)' };
  const d = nextScore - prevScore;
  if (nextScore <= 0 && prevScore > 0) return { label: 'horÅ¡Ã­', tone: 'var(--red)' };
  if (d >= 2) return { label: 'lepÅ¡Ã­', tone: 'var(--acc3)' };
  if (d <= -2) return { label: 'horÅ¡Ã­', tone: 'var(--red)' };
  return { label: 'podobnÃ©', tone: 'var(--txt3)' };
}

function formatTopicRepairQuickCompare(topicId, previousValue, candidateValue) {
  const prev = String(previousValue || '').trim();
  const next = String(candidateValue || '').trim();
  if (!hasMeaningfulValue(next)) {
    return `<div style="margin-top:6px;padding:8px;border:1px dashed var(--brd);border-radius:6px;background:var(--bg2);font-size:11px;color:var(--txt3)"><b>AnalÃ½za:</b> nelze porovnat (chybÃ­ novÃ½ nÃ¡vrh)</div>`;
  }
  const p = scoreTopicRepairText(topicId, prev);
  const n = scoreTopicRepairText(topicId, next);
  const v = verdictTopicRepairCompare(p.score, n.score);
  const notes = [...new Set([...(p.notes || []), ...(n.notes || [])])].slice(0, 3);
  const notesHtml = notes.length ? ` Â· ${notes.map(x => escHtml(x)).join(' Â· ')}` : '';
  return `<div style="margin-top:6px;padding:8px;border:1px solid var(--brd);border-radius:6px;background:var(--bg2);font-size:11px;color:var(--txt2)">
    <b>AnalÃ½za:</b> <span style="color:${v.tone};font-weight:bold">${escHtml(v.label)}</span>
    <span style="color:var(--txt3)">(skÃ³re ${p.score} â†’ ${n.score})</span>${notesHtml}
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

/** SjednocenÃ­ znakÅ¯ z AI odpovÄ›di (NFKC, ZWSP, plnocelÃ¡ dvojteÄka) kvÅ¯li parsovÃ¡nÃ­ labelÅ¯. */
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

/** OdstranÃ­ opakovanÃ© hlaviÄky ###G12### / ### G132 / ##H4 vÄetnÄ› mezer (i bez uzavÃ­racÃ­ch #). */
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

/** KdyÅ¾ strict parser SPECIALISTU nechytÃ­ (jinÃ© mezery/znaky), vezmi text od nadpisu do dalÅ¡Ã­ho pole. */
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
    /(?:^|[\n\u0085\u2028\u2029])[\s\u00A0]*(?:VYZNAM|DEFINICE|POUZITI|PUVOD|POUVOD|POVOD|KJV|SPECIALISTA|VYKLAD|VÃKLAD|KOMENTAR|KOMENTÃÅ˜|EXEGEZE|COMMENTARY|EXEGESIS|DEFINITION|MEANING|USAGE|ORIGIN|DEF)\s*(?:\([^)\n]{0,240}\))?\s*(?:[:\uFF1A\u2013\u2014=\.\-|]|\n{1,4}\s*)/iu;
  const m2 = rest.search(nextHdr);
  const body = m2 >= 0 ? rest.slice(0, m2) : rest;
  return body.trim();
}

/** Po opravÄ› tÃ©matu: nezaÅ¡krtÃ¡vat hromadnÃ© pÅ™epsÃ¡nÃ­ jen pÅ™i verdiktu â€žhorÅ¡Ã­â€œ (jinak Å¡lo omylem odÅ¡krtnout definici). */
function shouldAutoCheckTopicRepairTask(topicId, currentValue, candidateValue) {
  const prev = String(currentValue || '').trim();
  const next = String(candidateValue || '').trim();
  if (!hasMeaningfulValue(next)) return false;
  const p = scoreTopicRepairText(topicId, prev);
  const n = scoreTopicRepairText(topicId, next);
  const v = verdictTopicRepairCompare(p.score, n.score);
  return v.label !== 'horÅ¡Ã­';
}

/** JednotnÃ¡ normalizace nÃ¡zvÅ¯ polÃ­ z AI (vÄ. VÃKLAD â†’ SPECIALISTA). */
function normalizeTopicFieldLabel(raw) {
  const u = String(raw || '').trim().toUpperCase();
  if (u === 'DEF' || u === 'DEFINITION') return 'DEFINICE';
  if (u === 'MEANING') return 'VYZNAM';
  if (u === 'USAGE') return 'POUZITI';
  if (u === 'ORIGIN') return 'PUVOD';
  if (u === 'POVOD' || u === 'POUVOD') return 'PUVOD';
  if (u === 'VYKLAD' || u === 'VÃKLAD' || u === 'KOMENTAR' || u === 'KOMENTÃÅ˜' || u === 'EXEGEZE' || u === 'COMMENTARY' || u === 'EXEGESIS') return 'SPECIALISTA';
  return u;
}

/** Alternace nÃ¡zvÅ¯ polÃ­ v AI odpovÄ›di (jednotnÃ½ zdroj pro anchor / Å™Ã¡dkovÃ© parsovÃ¡nÃ­). */
const TOPIC_FIELD_LABEL_ALTS_FOR_RE = 'VYZNAM|DEFINICE|POUZITI|PUVOD|POUVOD|POVOD|KJV|SPECIALISTA|VYKLAD|VÃKLAD|KOMENTAR|KOMENTÃÅ˜|EXEGEZE|DEFINITION|MEANING|USAGE|ORIGIN|COMMENTARY|EXEGESIS|DEF';

/** Po klÃ­ÄovÃ©m slovÄ› Äasto nÃ¡sleduje â€ž(specialista)â€œ / poznÃ¡mka v zÃ¡vorce â€” bez toho selhÃ¡val \s*[-:]. */
function makeTopicFieldHeaderScanRegex() {
  return new RegExp(`\\b(${TOPIC_FIELD_LABEL_ALTS_FOR_RE})(?:\\*\\*|__)?\\s*(?:\\([^)\\n]{0,240}\\))?\\s*[-:â€“â€”=.|]{0,3}\\s*`, 'giu');
}

/** StejnÃ¡ pravidla jako u anchor regexu, navÃ­c prefix markdownu / ÄÃ­slovÃ¡nÃ­ na zaÄÃ¡tku Å™Ã¡dku. */
function makeTopicFieldLineStartRegex() {
  return new RegExp(
    `^(?:(?:\\d+)[.)]\\s+)?(?:(?:[-*+>]|#{1,6})\\s+)?(?:(?:\\*\\*|__)\\s*)?(${TOPIC_FIELD_LABEL_ALTS_FOR_RE})(?:\\*\\*|__)?\\s*(?:\\([^)\\n]{0,240}\\))?\\s*[-:â€“â€”=.|]{0,3}\\s*`,
    'iu'
  );
}

/** HlaviÄka sekce specialisty (aliasy + zÃ¡vorka + dvojteÄka nebo novÃ½ Å™Ã¡dek tÄ›la). */
function matchSpecialistaHeaderBlockStart(t) {
  const s = String(t || '');
  if (!s) return null;
  const LINE_START = '(?:^|[\n\u0085\u2028\u2029])[\\s\u00A0]*';
  const ALIAS = '(?:SPECIALISTA|VYKLAD|VÃKLAD|KOMENTAR|KOMENTÃÅ˜|EXEGEZE|COMMENTARY|EXEGESIS)';
  const PAREN_OPT = '(?:\\([^)\\n]{0,240}\\))?';
  const SEP = '(?:[:\\uFF1A\\u2013\\u2014=\\.\\-|]|\\n{1,4}\\s*)';
  const prefix = '(?:(?:\\d+)[.)]\\s+)?(?:(?:[-*+>]|#{1,6})\\s+)?(?:(?:\\*\\*|__)\\s*)?';
  const re = new RegExp(LINE_START + prefix + ALIAS + '(?:\\*\\*|__)?\\s*' + PAREN_OPT + '\\s*' + SEP + '\\s*', 'iu');
  return s.match(re);
}

/** VÃ½Å™ez bloku podle libovolnÃ©ho vÃ½skytu labelu v textu (i vÃ­ce polÃ­ na jednom Å™Ã¡dku). */
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

/** PoÅ™adÃ­ tÃ©mat podle prvnÃ­ho vÃ½skytu nadpisu v RAW (pro log a doplnÄ›nÃ­ â€ždalÅ¡Ã­châ€œ). */
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
    // OÅ™Ã­zni pÅ™Ã­pad, kdy AI pÅ™idÃ¡ dalÅ¡Ã­ tÃ©ma ve stejnÃ© vÄ›tÄ›/Å™Ã¡dku.
    const foreignInline = out.match(/\b(VYZNAM|DEFINICE|POUZITI|PUVOD|KJV|SPECIALISTA|VYKLAD|VÃKLAD|KOMENTAR|KOMENTÃÅ˜|EXEGEZE|DEF|DEFINITION|MEANING|USAGE|ORIGIN|COMMENTARY|EXEGESIS)\s*[-:â€“â€”=.]?\s*/iu);
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

  // KdyÅ¾ chybÃ­ explicitnÃ­ label cÃ­lovÃ©ho tÃ©matu, ale AI vrÃ¡tÃ­ dalÅ¡Ã­ labely
  // (napÅ™. SPECIALISTA), ber jen text pÅ™ed prvnÃ­m cizÃ­m labelem.
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
    cleaned = cleaned.replace(new RegExp(`^${keyForTopic}\\s*[-:â€“â€”=.]?\\s*`, 'i'), '').trim();
  }
  // PoslednÃ­ ochrana: u single-topic odpovÄ›di oÅ™Ã­zni navazujÃ­cÃ­ cizÃ­ labely i v rÃ¡mci jednoho Å™Ã¡dku.
  if (keyForTopic) {
    const foreignInlineGlobal = cleaned.match(/\b(VYZNAM|DEFINICE|POUZITI|PUVOD|KJV|SPECIALISTA|VYKLAD|VÃKLAD|KOMENTAR|KOMENTÃÅ˜|EXEGEZE|DEF|DEFINITION|MEANING|USAGE|ORIGIN|COMMENTARY|EXEGESIS)\s*[-:â€“â€”=.]?\s*/iu);
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

// â•â• BUILD PROMPT MESSAGES â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Uses buildPromptMessages and buildRetryMessages from core module

function resetPrompt() {
  document.getElementById('promptEditor').value = DEFAULT_PROMPT;
  localStorage.setItem('strong_prompt', DEFAULT_PROMPT);
  updatePromptStatusIndicator();
}


// â•â• AI VOLÃNÃ S RETRY A FALLBACK â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
    // MinimÃ¡lnÃ­ fallback, kdyby cache jeÅ¡tÄ› neexistovala
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
           const errMsg = 'Chyba 404: Model nenalezen, vyberte jinÃ½ v nastavenÃ­';
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
           logWarn('callAIWithRetry', `Rate limit na ${m}, ÄekÃ¡m ${wait}s...`, {
             provider, model: m, attempt: attempt + 1, waitSeconds: wait
           });
           showToast(t('toast.rateLimit.waiting', { seconds: wait, suffix: shouldSwitchModelImmediately ? ', then try another model' : '' }));
           await sleep(wait * 1000);
           if (shouldSwitchModelImmediately) {
             // U Groq je praktiÄtÄ›jÅ¡Ã­ pÅ™i rate limitu rychle pÅ™eskoÄit na dalÅ¡Ã­ model.
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
           logError('callAIWithRetry', new Error(`BlokovanÃ½ ÃºÄet: ${m}`), {
             provider, model: m, attempt: attempt + 1
           });
           break;
         }
         // Other errors - log and try next model/attempt
         logWarn('callAIWithRetry', `Chyba pÅ™i volÃ¡nÃ­ ${m} (pokus ${attempt+1}): ${e.message}`, {
           provider, model: m, attempt: attempt + 1, error: e.message
         });
         break;
       }
    }
  }
  throw lastErr || new Error('VÅ¡echny modely selhaly');
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
         throw new Error(`Rate limit! Zkuste za ${rateInfo.retryAfterSec || 'nÄ›kolik'}s. Info: groq.com/pricing${rateInfo.requestId ? ` [req:${rateInfo.requestId}]` : ''}`);
       }
       throw new Error(d.error?.message || String(r.status));
     }
     // Validate response structure
     validateAPIResponse(d, 'groq');
     if (d.usage) {
       log(`ðŸ“Š Groq: ${d.usage.prompt_tokens} in / ${d.usage.completion_tokens} out / ${d.usage.total_tokens} total`);
     }
     const content = d.choices[0].message.content;
    // Kontrola na nesmyslnou odpovÄ›Ä
    const weirdChars = (content.match(/[^\x20-\x7E\n\r\tÄ›Å¡ÄÅ™Å¾Ã½Ã¡Ã­Ã©ÃºÅ¯Å¥ÄÅˆÄšÅ ÄŒÅ˜Å½ÃÃÃÃ‰ÃšÅ®Å¤ÄŽÅ‡]/g) || []).length;
    if (content.length > 0 && weirdChars > content.length * 0.5) {
      console.log('â• PODEZÅ˜ELÃ ODPOVÄšÄŽ â•');
      console.log(content);
      throw new Error('AI vrÃ¡tila nesmyslnou odpovÄ›Ä - zkuste delÅ¡Ã­ interval');
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
         throw new Error('503 Service Unavailable: Gemini je doÄasnÄ› pÅ™etÃ­Å¾enÃ©, opakuji pozdÄ›ji.');
       }
       if (d.error?.status === 'RESOURCE_EXHAUSTED') {
         const details = String(d.error?.message || '').trim();
         throw new Error(`Gemini limit vyÄerpÃ¡n! PoÄkej ~20min nebo pÅ™epni na Groq.${details ? ` Detail: ${details}` : ''}`);
       }
       throw new Error(d.error?.message || String(r.status));
     }
     // Validate response structure
     validateAPIResponse(d, 'gemini');
     if (d.usageMetadata) {
       log(`ðŸ“Š Gemini: ${d.usageMetadata.promptTokenCount} in / ${d.usageMetadata.candidatesTokenCount} out`);
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
     if (!content) throw new Error('OpenRouter nevrÃ¡til ÄitelnÃ½ text');
    return { content, usage: d.usage, resolvedModel: d.model || model, rateInfo: { provider: 'openrouter' } };
  }
  throw new Error('NeznÃ¡mÃ½ provider');
  } catch (e) {
    if (timedOut && e?.name === 'AbortError') {
      throw new Error(`API timeout po ${Math.round(CONFIG.API_TIMEOUT / 1000)}s`);
    }
    if (externalSignal?.aborted && e?.name === 'AbortError') {
      throw new Error('PoÅ¾adavek zruÅ¡en uÅ¾ivatelem');
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
        log('â„¹ AUTO_NORMALIZOVANO_Z_OPENROUTER_FORMATU');
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

// ══ UI MODULY ═══════════════════════════════════════════════════
const toastApi = createToastApi({ CONFIG, logError });
const { showToast, showToastWithAction } = toastApi;

const headerApi = createHeaderApi({
  state, t, isTranslationComplete, getTranslationStateForKey, storeKey, backupKey
});
const {
  logMsg, updateStats, updateETA, startElapsedTimer, stopElapsedTimer,
  updateElapsedTime, updateFailedCount, updateFileIdBadge,
  updateBackupButtonVisibility, hasBackup
} = headerApi;

// ══ TRANSLATION BATCH API ══════════════════════════════════════
// Late-binding pro isAutoProviderEnabled (autoApi přijde až po listApi) a translateSelected (listApi přijde za batchApi)
const batchApi = createBatchApi({
  state, t, escHtml,
  log, logError, logWarn,
  showToast,
  TOPIC_PROMPT_PRESET_MAP,
  isTranslationComplete, hasMeaningfulValue, isDefinitionLowQuality,
  parseTranslations,
  parseWithOpenRouterNormalization, applyFallbacksToParsedMap,
  extractTopicValueFromAI,
  shouldReplaceSpecialista,
  fillMissingVyznamFromSource, fillMissingKjvFromSource, annotateEnglishDefinitionsInTranslated,
  buildPromptMessages,
  callOnce, callAIWithRetry,
  getApiKeyForModelTest, getPipelineModelForProvider, getCurrentApiKey,
  getModelTestSelectedModelForProvider: (...a) => getModelTestSelectedModelForProvider(...a),
  resolveMainBatchProvider,
  appendModelTestUsage: (...a) => appendModelTestUsage(...a),
  buildModelTestMessages: (...a) => buildModelTestMessages(...a),
  isPipelineSecondaryEnabled,
  upsertModelTestStats: (...a) => upsertModelTestStats(...a),
  pushTestHistory: (...a) => pushTestHistory(...a),
  renderList: (...a) => renderList(...a),
  updateStats: (...a) => updateStats(...a),
  renderDetail: (...a) => renderDetail(...a),
  startElapsedTimer, stopElapsedTimer, updateFailedCount,
  saveProgress: (...a) => saveProgress(...a),
  logTokenEntry: (...a) => logTokenEntry(...a),
  logEntry: (...a) => logEntry(...a),
  getTranslationEngineLabel: (...a) => getTranslationEngineLabel(...a),
  isAutoProviderEnabled: (...a) => isAutoProviderEnabled(...a),
  translateSelected: (...a) => translateSelected(...a),
});
const {
  translateBatch, translateNext, translateSingle, retranslateSingle, jumpToStart,
  getNextBatch, getSecondaryNextOperationState,
  getFailedTopicsForFallback, getMissingTopicsForRepair,
  cloneTranslationTopicFields, shouldReplaceTopicValue,
  getProviderCooldownLeftSec, formatPreviewRawTranslation,
} = batchApi;

// Cirkularita list ↔ detail: late-binding přes closure
let _detailApi;
const listApi = createListApi({
  state, t, escHtml, ITEM_HEIGHT, BUFFER_ITEMS,
  getTranslationStateForKey, getStrongKeyNumber,
  isAutoProviderEnabled: (...a) => isAutoProviderEnabled(...a),
  resolveMainBatchProvider,
  getPipelineModelForProvider,
  translateBatch,
  startTopicRepairFlow,
  showPreviewModal,
  showToast,
  logError,
  updateFailedCount,
  saveProgress: (...a) => saveProgress(...a),
  updateStats,
  renderDetail: (...a) => _detailApi.renderDetail(...a)
});
const {
  getFilteredEntries, filterMissingTopicsList, scrollToActive,
  initVirtualScroll, updatePhantomHeight, renderVisible, onVirtualScroll,
  renderList, showDetail, toggleSelect, selectAll, selectNone,
  updateSelectedBtn, translateSelected
} = listApi;

_detailApi = createDetailApi({
  state, t, escHtml, hasMeaningfulValue, isTranslationComplete,
  TOPIC_LABELS, refreshTopicLabels,
  saveProgress: (...a) => saveProgress(...a),
  renderList, updateStats, showToast,
  log,
  buildTopicPrompt, openTopicPromptModal,
  callAIWithRetry, extractTopicValueFromAI, translateSingle,
  resolveProviderForInteractiveAction, getPipelineModelForProvider,
  getCurrentApiKey, SYSTEM_MESSAGE
});
const {
  renderDetail, renderTranslation, toggleEditSection, saveSection,
  toggleSourceEntryEdit, saveSourceEntryField, refillSingleField
} = _detailApi;

const modalsApi = createModalsApi({
  state, t, getStrongKeyNumber, renderList, showToast
});
const { selectRange, closeModal, confirmModal, showMobileActions, closeMobileModal } = modalsApi;

const autoApi = createAutoApi({
  state,
  t,
  getUiLang,
  PROVIDERS,
  AUTO_PROVIDER_ENABLED_KEY,
  AUTO_TOKEN_LIMIT_KEY,
  PIPELINE_SECONDARY_ENABLED_KEY,
  setPipelineSecondaryEnabled,
  syncSecondaryProviderToggles,
  getSecondaryNextOperationState,
  stopElapsedTimer,
  showToast,
  log,
  getNextBatch,
  updateETA,
  translateBatch,
  updateStats,
  renderList,
  renderDetail
});

const {
  toggleAuto,
  stopAuto,
  isAutoProviderEnabled,
  setAutoProviderEnabled,
  initAutoProviderToggles,
  updateAutoProviderCountdowns,
  startAutoProviderCountdownTicker,
  saveAutoTokenLimit,
  isAutoTokenLimitReached,
  refreshTokenStatsDisplay
} = autoApi;

const modelTestUiApi = createModelTestUiApi({
  state,
  t,
  PROVIDERS,
  MODEL_TEST_OUTPUT_KEY,
  MODEL_TEST_STATS_KEY,
  MODEL_TEST_PROMPT_TYPE_KEY,
  MODEL_TEST_PROMPT_COMPARE_TYPE_KEY,
  MODEL_TEST_PROMPT_COMPARE_ENABLE_KEY,
  MODEL_TEST_CUSTOM_PROMPT_KEY,
  MODEL_TEST_ENABLE_PROMPT_KEY,
  showToast,
  escHtml,
  formatAiResponseTime,
  populateModelTestModelSelect,
  saveModelTestModelSelections,
  updateModelTestProviderUi,
  isModelTestPromptEnabled,
  isModelTestPromptCompareEnabled,
  getModelTestPromptType,
  getModelTestPromptCompareType,
  getModelTestCustomPromptText
});

const {
  showModelTestModal,
  updateModelTestPromptUi,
  saveModelTestPromptSettings,
  closeModelTestModal,
  cancelModelTest,
  modelTestClearCountdownInterval,
  modelTestSetCountdownLabel,
  modelTestSetProviderEta,
  modelTestResetProviderEta,
  modelTestStartProviderCountdownTicker,
  modelTestStopProviderCountdownTicker,
  updateModelTestRunButton,
  modelTestSetLastStatus,
  saveModelTestOutputToStorage,
  loadModelTestOutputFromStorage,
  clearModelTestOutputFromStorage,
  getModelTestStatsMap,
  saveModelTestStatsMap,
  upsertModelTestStats,
  deleteModelTestStatsRow,
  renderModelStatsTable
} = modelTestUiApi;

const modelTestRunnerApi = createModelTestRunnerApi({
  state,
  t,
  getUiLang,
  PROVIDERS,
  showToast,
  log,
  logTokenEntry,
  formatAiResponseTime,
  getModelTestPromptType,
  getModelTestPromptCompareType,
  getModelTestPromptTypeLabel,
  getModelTestPromptTopicLabel,
  getApiKeyForModelTest,
  getModelTestSelectedModelForProvider,
  modelTestWaitWithCountdown,
  modelTestSetProviderEta,
  modelTestStartProviderCountdownTicker,
  modelTestStopProviderCountdownTicker,
  modelTestResetProviderEta,
  modelTestSetLastStatus,
  updateModelTestRunButton,
  modelTestSetCountdownLabel,
  modelTestClearCountdownInterval,
  saveModelTestOutputToStorage,
  saveModelTestRawOutputToStorage,
  clearModelTestRawOutputFromStorage,
  upsertModelTestStats,
  showModelTestModal,
  updateModelTestProviderUi,
  pushTestHistory,
  appendModelTestLastBatchKeyAudit,
  buildModelTestMessages,
  parseWithOpenRouterNormalization,
  applyFallbacksToParsedMap,
  isTranslationComplete,
  isDefinitionLikelyEnglish,
  callOnce
});

const {
  getSampleEntriesForModelTest,
  resetModelTestRateLimitHealth,
  updateModelTestRateLimitHealth,
  appendModelTestRateLimitStatus,
  getUsageTotals,
  appendModelTestUsage,
  rateInfoFromErrorMessage,
  appendModelTestFinalOverview,
  getModelTestSuccessRatePercent,
  appendPromptCompareSummary,
  runAutoLiveModelTest,
  testCurrentProviderModels
} = modelTestRunnerApi;

const promptLibraryApi = createPromptLibraryApi({
  state,
  t,
  getUiLang,
  DEFAULT_PROMPT,
  FINAL_PROMPT,
  PROMPT_LIBRARY_BASE,
  enforceSpecialistaFormat,
  showToast
});

const {
  initializePromptLibrary,
  getStoredCustomPromptLibrary,
  saveStoredCustomPromptLibrary,
  getStoredImportedPromptLibrary,
  saveStoredImportedPromptLibrary,
  rebuildPromptLibrary,
  getSystemPromptForCurrentTask,
  isPromptAutoModeEnabled,
  setMainPrompt,
  applySystemPromptForCurrentTask,
  togglePromptModeQuick,
  updatePromptAutoButton,
  togglePromptAutoMode,
  showPromptLibraryModal,
  closePromptLibraryModal,
  renderPromptList,
  renderPromptPreview,
  selectPrompt,
  applySelectedPrompt,
  exportPromptLibraryToTxt,
  importPromptLibraryFromFile,
  updatePromptStatusIndicator
} = promptLibraryApi;

// â•â• STATS & SAVE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•


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

// Debounced save â€“ shlukne rychlÃ© za sebou jdoucÃ­ Ãºpravy (editace, import, atd.)
const saveProgress = debounce(saveProgressImmediate, 500);

// â”€â”€ Undo + auto-backup infrastruktura â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AUTO_BACKUP_EVERY_N_BATCHES = 10;
function writeBackup(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch(e) {
    logWarn('writeBackup', `Nelze uloÅ¾it backup (${key})`, { error: e.message });
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
  logInfo('autoBackup', `AutomatickÃ¡ zÃ¡loha: ${doneCount} hesel`);
  updateBackupButtonVisibility();
}


function hasUndo() {
  const raw = localStorage.getItem(undoKey());
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || !d.translated) return null;
    // Undo je platnÃ© jen pÃ¡r minut
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
  // UloÅ¾ aktuÃ¡lnÃ­ stav jako undo pÅ™ed pÅ™epsÃ¡nÃ­m
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
  // UloÅ¾ snapshot jako undo
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
  if (!s) return 'prÃ¡zdnÃ½';
  if (s.length < 10) return s;
  return `${s.slice(0, 5)}...${s.slice(-4)}`;
}

function setupApiKeySwitcher(prov) {
  const select = document.getElementById('apiKeyProfile');
  if (!select) return;
  const profiles = getApiKeyProfiles(prov);
  const activeId = localStorage.getItem(API_KEY_ACTIVE_PROFILE_PREFIX + prov) || '__manual__';
  const options = ['<option value="__manual__">RuÄnÃ­ klÃ­Ä (aktuÃ¡lnÃ­ pole)</option>'];
  for (const p of profiles) {
    options.push(`<option value="${p.id}">${escHtml(p.name || 'KlÃ­Ä')} Â· ${maskApiKey(p.key)}</option>`);
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
  showToast(t('toast.apiKey.activeProfile', { name: profile.name || (getUiLang() === 'en' ? 'unnamed' : 'bez nÃ¡zvu') }));
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

function getCompactSelectedOptionLabel(selectId, fallback = 'â€”') {
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
  const main = getCompactSelectedOptionLabel('pipelineModelMainGroq', 'â€”');
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

// Volej po naÄtenÃ­ strÃ¡nky
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
        ? `<div class="log-vyznam"><b>${t('log.meaning')}</b> ${escHtml(tr.vyznam || 'â€”')}</div>
           <div class="log-definice">${escHtml((tr.definice || '').slice(0, 120))}${(tr.definice || '').length > 120 ? 'â€¦' : ''}</div>
           ${tr.kjv ? `<div class="log-orig"><b>KJV:</b> ${escHtml(tr.kjv.slice(0, 80))}${(tr.kjv || '').length > 80 ? 'â€¦' : ''}</div>` : ''}
           <div class="log-orig"><b>${t('log.usage')}</b> ${escHtml((tr.pouziti || '').slice(0, 80))}${(tr.pouziti || '').length > 80 ? 'â€¦' : ''}</div>`
        : `<div class="log-err">${t('log.unparsed')}</div>`
      }
    `;
    scroll.appendChild(div);
  }

  scroll.scrollTop = scroll.scrollHeight;

  // PoÄÃ­tadlo
  const cnt = scroll.children.length;
  const countEl = document.getElementById('logCount');
  if (countEl) countEl.textContent = t('log.records', { count: cnt });

  // Limit state.entries in log
  while (scroll.children.length > CONFIG.LOG_MAX_ENTRIES) scroll.removeChild(scroll.firstChild);
}

function clearLog() {
  const s = document.getElementById('logScroll');
  if (s) s.innerHTML = '<div class="log-placeholder" style="padding:20px;font-family:\'JetBrains Mono\',monospace;font-size:11px;color:var(--txt3)">PÅ™eklady se budou zobrazovat zde automaticky...</div>';
  const c = document.getElementById('logCount');
  if (c) c.textContent = '';
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
      modelTestSetLastStatus(`UloÅ¾eno: ${handle.name || DEFAULT_MODEL_TEST_LOG_FILENAME}`, 'ok');
      showToast(t('toast.saved.filename', { name: handle.name || DEFAULT_MODEL_TEST_LOG_FILENAME }));
      return;
    } catch (e) {
      const msg = String(e?.message || '');
      if (/AbortError/i.test(msg)) {
        showToast(t('toast.save.canceled'));
        return;
      }
      showToast(t('toast.saveDialogFailedFallback', { message: msg || (getUiLang() === 'en' ? 'unknown error' : 'neznÃ¡mÃ¡ chyba') }));
    }
  }
  download(DEFAULT_MODEL_TEST_LOG_FILENAME, text, 'text/plain');
  modelTestSetLastStatus(`StaÅ¾eno: ${DEFAULT_MODEL_TEST_LOG_FILENAME}`, 'ok');
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
    const header = `### ${idx + 1} | provider=${row.prov} | model=${row.model} | reÅ¾im=${row.mode} | promptTest=${row.promptEnabled ? 'on' : 'off'} | prompt=${row.promptType} | ${new Date(row.ts).toLocaleString('cs-CZ')}`;
    const promptBlock = `--- ODESLANÃ PROMPT ---\n${row.promptSent || '(nenÃ­ dostupnÃ½)'}\n--- /ODESLANÃ PROMPT ---`;
    const rawBlock = `--- RAW ODPOVÄšÄŽ AI ---\n${row.raw || ''}\n--- /RAW ODPOVÄšÄŽ AI ---`;
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
    modelTestSetLastStatus(`NaÄteno: ${file.name}`, 'ok');
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
        modelTestSetCountdownLabel(`DalÅ¡Ã­ poÅ¾adavek za cca ${state.modelTestNextRequestEtaSec} s | ZbÃ½vÃ¡ testu ${mm}:${String(ss).padStart(2, '0')}`);
      } else {
        modelTestSetCountdownLabel(`DalÅ¡Ã­ poÅ¾adavek za cca ${state.modelTestNextRequestEtaSec} s`);
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
  const defValue = t.definice || 'â€”';
  const defDisplay = defEnglish && !/\[POZN\.: text je v angliÄtinÄ› - Å¡patnÃ½ pÅ™eklad\]/.test(defValue)
    ? `${defValue} [POZN.: text je v angliÄtinÄ› - Å¡patnÃ½ pÅ™eklad]`
    : defValue;
  const parts = [
    `${key} | ${e.greek}`,
    `Gramatika: ${e.tvaroslovi || 'â€”'}`,
    `ÄŒeskÃ½ vÃ½znam: ${t.vyznam || 'â€”'}`,
    `Definice (EN): ${e.definice || e.def || 'â€”'}`,
    `ÄŒeskÃ¡ definice: ${defDisplay}`,
    `KJV pÅ™eklady (CZ): ${t.kjv || e.kjv || 'â€”'}`,
    `BiblickÃ© uÅ¾itÃ­: ${t.pouziti || 'â€”'}`,
    `PÅ¯vod: ${t.puvod || 'â€”'}`,
    `Specialista: ${t.specialista || 'â€”'}`,
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
  if (!raw) return '(prÃ¡zdnÃ©)';
  const escapedKey = String(lastKey || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (escapedKey) {
    const markerRe = new RegExp(`###\\s*${escapedKey}\\s*###([\\s\\S]*?)(?=\\n###\\s*G\\d+\\s*###|$)`, 'i');
    const m1 = raw.match(markerRe);
    if (m1) {
      const chunk = `###${lastKey}###${m1[1]}`.trim();
      return chunk.length <= maxLen ? chunk : `${chunk.slice(0, maxLen)}\nâ€¦ (zkrÃ¡ceno)`;
    }
    const lineRe = new RegExp(`(^|\\n)\\s*${escapedKey}\\s*\\|[^\\n]*([\\s\\S]*?)(?=\\n\\s*G\\d+\\s*\\||$)`, 'i');
    const m2 = raw.match(lineRe);
    if (m2) {
      const chunk = m2[0].trim();
      return chunk.length <= maxLen ? chunk : `${chunk.slice(0, maxLen)}\nâ€¦ (zkrÃ¡ceno)`;
    }
  }
  if (raw.length <= maxLen) return raw;
  const head = Math.min(1200, Math.floor(maxLen * 0.65));
  const tail = Math.max(500, maxLen - head - 40);
  return `${raw.slice(0, head)}\nâ€¦ (zkrÃ¡ceno) â€¦\n${raw.slice(-tail)}`;
}

/**
 * PrÅ¯bÄ›Å¾nÃ¡ audit kontrola: vÅ¡echna hesla v dÃ¡vce + stav formÃ¡tu.
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
    ? `${batchKeys[0]} aÅ¾ ${batchKeys[batchKeys.length - 1]} (${batchKeys.length} hesel)`
    : `${lastKey} aÅ¾ ${lastKey} (1 heslo)`;
  const totalsSuffix = totals ? ` | Î£ OK ${totals.okKeys || 0} / NEÃšSP ${totals.failedKeys || 0}` : '';

  appendReport(`  â–¸ Rozsah dÃ¡vky: ${rangeLabel}`);
  appendReport('');
  appendReport('  AUDIT: kontrola vÅ¡ech hesel v dÃ¡vce a jejich parsovatelnosti.');
  appendReport(`  â–¸ PoslednÃ­ heslo (stavovÃ½ indikÃ¡tor): ${lastKey}`);
  appendReport(`  â–¸ AuditovanÃ½ poÄet hesel: ${batchKeys.length}`);
  appendReport(`  â–¸ NeÃºspÄ›Å¡nÃ© v dÃ¡vce: ${failedKeys.length}`);
  appendReport('');
  if (complete) {
    modelTestSetLastStatus(`OK | ${rangeLabel} | ${lastKey}${totalsSuffix}`, 'ok');
    appendReport('  Stav poslednÃ­ho hesla: OK â€” nalezeno v odpovÄ›di a vÅ¡echna povinnÃ¡ pole vyplnÄ›na ve sprÃ¡vnÃ©m formÃ¡tu.');
    appendReport('  Data AI pro vÅ¡echna hesla v dÃ¡vce:');
    for (const key of batchKeys) {
      const tk = parsed && parsed[key];
      if (!tk) continue;
      appendReport(`    --- ${key} ---`);
      for (const ln of formatModelTestParsedBlock(key, tk, state.entryMap.get(key)).split('\n')) {
        appendReport(`    ${ln}`);
      }
    }
  } else if (inMissing || !t) {
    modelTestSetLastStatus(`NEÃšSPÄšCH | ${rangeLabel} | ${lastKey}${totalsSuffix}`, 'error');
    appendReport('  ðŸ”´ CHYBA FORMATU / PÃROVÃNÃ');
    appendReport('  Stav poslednÃ­ho hesla: NEÃšSPÄšCH â€” heslo v odpovÄ›di neÅ¡lo spÃ¡rovat / chybÃ­ blok (Å¡patnÃ½ formÃ¡t nebo model vynechal heslo).');
    if (failedKeys.length) {
      appendReport(`  NeÃºspÄ›Å¡nÃ© v dÃ¡vce: ${failedKeys.length}/${batchKeys.length} | prvnÃ­ ${firstFailed} | poslednÃ­ ${lastFailed}`);
    }
    if (firstFailed && firstFailed !== lastFailed) {
      appendReport(`  RAW odpovÄ›Ä AI pro prvnÃ­ neÃºspÄ›Å¡nÃ© ${firstFailed}:`);
      appendReport(excerptRawForLastKey(rawContent, firstFailed, 1200));
      appendReport('  ---');
    }
    appendReport('  RAW odpovÄ›Ä AI pro audit celÃ© dÃ¡vky:');
    appendReport(rawContent || '(prÃ¡zdnÃ¡ odpovÄ›Ä)');
    appendReport('  --- /RAW ---');
  } else {
    modelTestSetLastStatus(`NEÃšPLNÃ‰ | ${rangeLabel} | ${lastKey}${totalsSuffix}`, 'warn');
    appendReport(`  Stav poslednÃ­ho hesla: NEÃšPLNÃ‰ â€” chybÃ­ nebo jsou neplatnÃ¡ pole: ${badFields.join(', ') || '?'}`);
    if (englishDefinitionFlag) {
      appendReport('  POZN.: DEFINICE obsahuje angliÄtinu, je hodnoceno jako Å¡patnÃ½ pÅ™eklad.');
    }
    appendReport('  Data AI pro vÅ¡echna hesla v dÃ¡vce (to, co Å¡lo vyparsovat):');
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
    `Rozsah dÃ¡vky: ${rangeLabel}`,
    `Audit: vÅ¡echna hesla v dÃ¡vce (${batchKeys.length})`,
    `PoslednÃ­ heslo (stav): ${lastKey}`,
    totals ? `Celkem v bÄ›hu: OK ${totals.okKeys || 0} | NEÃšSP ${totals.failedKeys || 0}` : '',
    complete
      ? 'Stav: OK'
      : (inMissing || !t)
        ? 'Stav: NEÃšSPÄšCH'
        : `Stav: NEÃšPLNÃ‰ (${badFields.join(', ') || '?'})`
  ].filter(Boolean);
  const parsedKeys = batchKeys.filter(k => parsed && parsed[k]);
  if (parsedKeys.length) {
    exportLines.push('');
    exportLines.push('Data AI pro vÅ¡echna hesla v dÃ¡vce:');
    for (const key of parsedKeys) {
      exportLines.push(`--- ${key} ---`);
      exportLines.push(formatModelTestParsedBlock(key, parsed[key], state.entryMap.get(key)));
    }
  } else if (inMissing || !t) {
    if (firstFailed && firstFailed !== lastFailed) {
      exportLines.push('', `RAW odpovÄ›Ä AI pro prvnÃ­ neÃºspÄ›Å¡nÃ© ${firstFailed}:`, excerptRawForLastKey(rawContent, firstFailed, 1200));
    }
    exportLines.push('', 'RAW odpovÄ›Ä AI pro audit celÃ© dÃ¡vky:', rawContent || '(prÃ¡zdnÃ¡ odpovÄ›Ä)');
  }
  exportLines.push('----------------------------------------', '');
  state.modelTestLastKeyAuditExportChunks.push(exportLines.join('\n'));
}

function exportModelTestTranslationsTxt() {
  const out = document.getElementById('modelTestOutput');
  const reportFallback = (out?.value || '').trim();
  let body = '';
  if (state.modelTestLastKeyAuditExportChunks.length) {
    body = `# Export auditu vÅ¡ech hesel z dÃ¡vek (test modelÅ¯)\n# ${new Date().toLocaleString('cs-CZ')}\n\n${state.modelTestLastKeyAuditExportChunks.join('\n')}`;
  } else if (state.modelTestParsedExportChunks.length) {
    body = `# Export parsovanÃ½ch pÅ™ekladÅ¯ z testu modelÅ¯\n# ${new Date().toLocaleString('cs-CZ')}\n\n${state.modelTestParsedExportChunks.join('\n')}`;
  } else if (reportFallback) {
    body = `# Å½Ã¡dnÃ© novÄ› parsovanÃ© bloky v pamÄ›ti â€” celÃ½ aktuÃ¡lnÃ­ text z okna\n# ${new Date().toLocaleString('cs-CZ')}\n\n${reportFallback}`;
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
  if (!merged.length) merged.push({ value: getDefaultPinnedModelByProvider(prov), label: getDefaultPinnedModelByProvider(prov) || 'â€”' });
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
    output.value = 'Knihovna testÅ¯ je zatÃ­m prÃ¡zdnÃ¡.';
    return;
  }
  const lines = ['# KNIHOVNA TESTÅ® A PÅ˜EKLADÅ®', `ZÃ¡znamÅ¯: ${history.length}`, ''];
  const statsRows = Object.values(getModelTestStatsMap());
  if (statsRows.length) {
    lines.push('## Souhrn podle provideru/modelu (modely Å™azeny podle Äetnosti)');
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
        lines.push(`- ${r.model} | volÃ¡nÃ­ ${r.calls || 0} | hesel ${r.totalKeys || 0} | OK ${r.okKeys || 0} / NEÃšSP ${r.failedKeys || 0} | ÃºspÄ›Å¡nost ${rate}% | doba AI ${formatAiResponseTime(avgMs)}`);
      }
      lines.push('');
    }
  }
  lines.push('## PoslednÃ­ bÄ›hy');
  for (const item of history.slice(0, 80)) {
    const when = new Date(item.ts).toLocaleString('cs-CZ');
    if (item.type === 'model-test') {
      lines.push(`[${when}] TEST | ${item.provider} | reÅ¾im ${item.mode || 'smoke'} | OK ${item.ok}/${item.total} | PART ${item.partial || 0} | RL ${item.rateLimited} | ERR ${item.error} | HESLA ${item.keysOk || 0}/${item.keysFailed || 0} | CYKLY ${item.cycles || 0} | AI ${formatAiResponseTime(item.avgLatencyMs || 0)}`);
      if (Array.isArray(item.topModels) && item.topModels.length) {
        lines.push(`TOP: ${item.topModels.join(', ')}`);
      }
    } else if (item.type === 'translate-batch') {
      lines.push(`[${when}] BATCH | ${item.provider}/${item.model} | ${item.ok}/${item.total} kompletnÃ­ | missing ${item.missing} | AI ${formatAiResponseTime(item.avgLatencyMs || 0)}`);
    }
  }
  output.value = lines.join('\n');
  saveModelTestOutputToStorage(output.value);
}

async function copyModelTestOutput() {
  const output = document.getElementById('modelTestOutput');
  const btn = document.getElementById('btnCopyModelTestOutput');
  const originalBtnText = btn?.textContent || 'ðŸ“‹ KopÃ­rovat';
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




// â”€â”€ Elapsed time â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


// â”€â”€ ETA â€” odhad zbÃ½vajÃ­cÃ­ho Äasu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


// â”€â”€ OznaÄit rozsah hesel k pÅ™ekladu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


// Mobile Actions Modal


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

// â”€â”€ Limits Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        content.innerHTML = '<div style="color:var(--red);padding:10px">Nejsou nastaveny limity. Zadejte API klÃ­Ä.</div>';
        return;
      }
      const dynamicLimits = await fetchGroqLimits(apiKey, model);
      const staticLimits = getGroqLimits(model);
      content.innerHTML = renderGroqLimits(dynamicLimits) + '<div style="margin-top:10px;border-top:1px solid var(--brd);padding-top:8px">' + renderLimitsTable(staticLimits) + '</div>';
      note.style.display = 'block';
      noteText.innerHTML = 'Groq: zobrazuji Å¾ivÃ© rate-limit hlaviÄky (pokud je API vrÃ¡tÃ­) + fallback limity modelu.<br>VÃ­ce info: <a href="https://console.groq.com/docs/rate-limits" target="_blank">console.groq.com/docs/rate-limits</a>';
    } else if (prov === 'openrouter') {
      // OpenRouter - can fetch via API
      const apiKey = getCurrentApiKey(prov);
      if (!apiKey) {
        content.innerHTML = '<div style="color:var(--red);padding:10px">Nejsou nastaveny limity. Zadejte API klÃ­Ä.</div>';
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
      noteText.innerHTML = 'OpenRouter: ukazuji usage/credits/limit data z API klÃ­Äe + orientaÄnÃ­ rate limity free tieru.<br>VÃ­ce info: <a href="https://openrouter.ai/docs/api-reference/limits" target="_blank">openrouter.ai/docs</a>';
    } else if (prov === 'gemini') {
      // Gemini - no API for limits, show static info
      const limits = getGeminiLimits(model);
      content.innerHTML = renderLimitsTable(limits);
      note.style.display = 'block';
      noteText.innerHTML = 'Google neposkytuje API pro kontrolu limitÅ¯. Zkontrolujte limity manuÃ¡lnÄ› v <a href="https://aistudio.google.com/app" target="_blank">AI Studio</a> nebo Google Cloud Console â†’ Quotas.<br>Limity se resetujÃ­ o pÅ¯lnoci Pacific Time.';
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
    rows.push(`<div style="color:var(--ylw);font-size:10px;margin-bottom:8px">Debug - vÅ¡echny hlaviÄky:</div>`);
    debugHeaders.slice(0, 20).forEach(([k, v]) => {
      rows.push(`<div class="limits-row"><span class="limits-label">${k}</span><span class="limits-value" style="font-size:9px">${String(v).slice(0, 50)}</span></div>`);
    });
    if (debugHeaders.length > 20) {
      rows.push(`<div style="font-size:9px;color:var(--txt3)">...a dalÅ¡Ã­ch ${debugHeaders.length - 20}</div>`);
    }
  }
  
  if (rows.length === 0) {
    return `<div style="color:var(--txt3);padding:10px">Å½Ã¡dnÃ© hlaviÄky.<br>Status: ${status}<br>Error: ${errorMsg || 'Å¾Ã¡dnÃ¡'}</div>`;
  }
  
  return rows.join('');
}

function renderOpenRouterLimits(keyData, creditsData) {
  if (!keyData) return '<div style="color:var(--red);padding:10px">Nelze naÄÃ­st limity</div>';
  
  const rows = [];
  
  // Credit info from /credits endpoint (if available)
  if (creditsData) {
    if (creditsData.total_credits !== undefined) {
      rows.push(`<div class="limits-row"><span class="limits-label">Kredity celkem</span><span class="limits-value">$${creditsData.total_credits?.toFixed(2) || '0'}</span></div>`);
    }
    if (creditsData.total_usage !== undefined) {
      rows.push(`<div class="limits-row"><span class="limits-label">Kredity pouÅ¾ito</span><span class="limits-value">$${creditsData.total_usage?.toFixed(2) || '0'}</span></div>`);
    }
    if (creditsData.total_credits !== undefined && creditsData.total_usage !== undefined) {
      const remaining = creditsData.total_credits - creditsData.total_usage;
      const cls = remaining > 1 ? 'ok' : remaining > 0.1 ? 'warn' : 'danger';
      rows.push(`<div class="limits-row"><span class="limits-label">Kredity zbÃ½vÃ¡</span><span class="limits-value ${cls}">$${remaining?.toFixed(2) || '0'}</span></div>`);
    }
  }
  
  // Key usage info from /key endpoint
  if (keyData.usage !== undefined) {
    rows.push(`<div class="limits-row"><span class="limits-label">PouÅ¾ito celkem (USD)</span><span class="limits-value">$${keyData.usage?.toFixed(4) || '0'}</span></div>`);
  }
  if (keyData.usage_daily !== undefined) {
    rows.push(`<div class="limits-row"><span class="limits-label">PouÅ¾ito dnes (USD)</span><span class="limits-value">$${keyData.usage_daily?.toFixed(4) || '0'}</span></div>`);
  }
  if (keyData.usage_weekly !== undefined) {
    rows.push(`<div class="limits-row"><span class="limits-label">PouÅ¾ito tÃ½den (USD)</span><span class="limits-value">$${keyData.usage_weekly?.toFixed(4) || '0'}</span></div>`);
  }
  if (keyData.usage_monthly !== undefined) {
    rows.push(`<div class="limits-row"><span class="limits-label">PouÅ¾ito mÄ›sÃ­c (USD)</span><span class="limits-value">$${keyData.usage_monthly?.toFixed(4) || '0'}</span></div>`);
  }
  if (keyData.limit !== undefined && keyData.limit > 0) {
    rows.push(`<div class="limits-row"><span class="limits-label">Limit</span><span class="limits-value">$${keyData.limit?.toFixed(2) || '0'}</span></div>`);
  }
  if (keyData.limit_remaining !== null && keyData.limit_remaining !== undefined && keyData.limit > 0) {
    const pct = Math.round((keyData.limit_remaining / keyData.limit) * 100);
    const cls = pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'danger';
    rows.push(`<div class="limits-row"><span class="limits-label">Limit zbÃ½vÃ¡</span><span class="limits-value ${cls}">$${keyData.limit_remaining?.toFixed(2) || '0'} (${pct}%)</span></div>`);
  }
  if (keyData.is_free_tier !== undefined) {
    rows.push(`<div class="limits-row"><span class="limits-label">Free tier</span><span class="limits-value ${keyData.is_free_tier ? 'ok' : ''}">${keyData.is_free_tier ? 'âœ“' : 'â€”'}</span></div>`);
  }
  if (keyData.label) {
    rows.push(`<div class="limits-row"><span class="limits-label">KlÃ­Ä</span><span class="limits-value" style="font-size:10px">${keyData.label || 'â€”'}</span></div>`);
  }
  const known = new Set(['usage', 'usage_daily', 'usage_weekly', 'usage_monthly', 'limit', 'limit_remaining', 'is_free_tier', 'label']);
  for (const [k, v] of Object.entries(keyData || {})) {
    if (known.has(k) || v == null || typeof v === 'object') continue;
    rows.push(`<div class="limits-row"><span class="limits-label">${escHtml(k)}</span><span class="limits-value">${escHtml(String(v))}</span></div>`);
  }
  if (rows.length === 0) return '<div style="color:var(--txt3);padding:10px">Å½Ã¡dnÃ© limity k zobrazenÃ­</div>';
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
  rows.push(`<div class="limits-row"><span class="limits-label">PlacenÃ© modely</span><span class="limits-value ok">bez limitu</span></div>`);
  
  return rows.join('');
 }

initializePromptLibrary();

// â”€â”€ AI & Language Modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â•â• RESIZE PANELS (logika v ./ui/resize.js) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


// Toast s akÄnÃ­m tlaÄÃ­tkem (napÅ™. Undo). VydrÅ¾Ã­ 2Ã— dÃ©le.


const { download, exportTXT, exportJSON, exportRange } = createExportApi({
  state,
  t,
  showToast
});

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
    log('ðŸ›‘ AUTO zastaven po dÃ¡vce: dosaÅ¾en limit tokenÅ¯');
    showToast(t('toast.auto.stoppedTokenLimit'));
  }
}

// Preview modal pro hromadny preklad
function showPreviewModal(previewData) {
  state.pendingTranslations = previewData;
  
  const modal = document.createElement('div');
  modal.id = 'previewModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;overflow-y:auto;padding:20px';
  
  // SpoÄÃ­tej kolik klÃ­ÄÅ¯ v importu uÅ¾ mÃ¡me pÅ™eloÅ¾enÃ© (kolize)
  let conflicts = 0, newOnes = 0;
  for (const k of Object.keys(previewData)) {
    const cur = state.translated[k];
    if (cur && cur.vyznam && cur.vyznam !== 'â€”' && !cur.skipped) conflicts++; else newOnes++;
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
    const isConflict = old && old.vyznam && old.vyznam !== 'â€”' && !old.skipped;
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
            <div><b>${t('field.meaning')}</b> ${escHtml(data.vyznam || 'â€”')}</div>
            <div style="margin-top:5px"><b>${t('field.definition')}</b> ${escHtml(data.definice || 'â€”')}</div>
            ${hasRaw && rawDef !== data.definice ? `<div style="margin-top:8px;padding:8px;background:var(--bg2);border-radius:4px;border-left:2px solid var(--acc);font-size:11px;color:var(--txt2)"><b>${t('import.fullTranslation')}</b><div style="margin-top:5px;line-height:1.5">${formatPreviewRawTranslation(rawDef)}</div></div>` : ''}
            <div style="margin-top:5px"><b>${t('field.usage')}</b> ${escHtml(data.pouziti || 'â€”')}</div>
            <div style="margin-top:5px"><b>${t('field.origin')}</b> ${escHtml(data.puvod || 'â€”')}</div>
            <div style="margin-top:5px"><b>${t('field.specialist')}</b> ${escHtml(data.specialista || 'â€”')}</div>
          </div>
        </div>
        <div>
          <div style="color:var(--txt3);font-size:10px;margin-bottom:5px">${t('import.enOriginal')}</div>
          <div style="font-size:12px;color:var(--txt2)">
            <div><b>${t('field.definition')}</b> ${escHtml(e?.definice || e?.def || 'â€”')}</div>
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
  const isEmpty = v => !v || v === 'â€”';

  let applied = 0, skippedConflicts = 0, mergedFields = 0;

  document.querySelectorAll('.preview-check:checked').forEach(cb => {
    const key = cb.dataset.key;
    const incoming = state.pendingTranslations[key];
    if (!incoming) return;
    const existing = state.translated[key];
    const hasExisting = existing && existing.vyznam && existing.vyznam !== 'â€”' && !existing.skipped;

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
      // DoplÅˆ jen prÃ¡zdnÃ¡ pole v existujÃ­cÃ­m pÅ™ekladu
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
    ? ` (${mergedFields} polÃ­ doplnÄ›no)`
    : skippedConflicts ? ` Â· ${skippedConflicts} pÅ™eskoÄeno (kolize)` : '';
  showToast(t('toast.saved.entriesWithExtra', { count: applied, extra }));
}

function discardPreview() {
  closePreviewModal();
  showToast(t('toast.translation.canceled'));
}

// â•â• IMPORT TXT/JSON â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
  // ZachovÃ¡no kvÅ¯li zpÄ›tnÃ© kompatibilitÄ› (historickÃ© volÃ¡nÃ­ z UI/externÃ­ch skriptÅ¯)
  return importFile(input);
}

// Parsuje formÃ¡t: "G12 | á¼„Î²Ï…ÏƒÏƒÎ¿Ï‚\nÄŒeskÃ½ vÃ½znam: ...\nDefinice (CZ): ..."
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
          return trimmed.startsWith(label + ':') || trimmed.startsWith(label + 'ï¼š');
        });
        if (line) return line.slice(label.length + 1).trim();
      }
      return '';
    };
    const vyznam = get(['ÄŒeskÃ½ vÃ½znam', 'Vyznam', 'VÃZNAM', 'VYZNAM', 'VÃ½znam', 'Cz', 'CZ']);
    const definice = get(['Definice (CZ)', 'ÄŒeskÃ¡ definice', 'Definice', 'DEFINICE', 'CZ definice']);
    const pouziti = get(['BiblickÃ© uÅ¾itÃ­', 'BiblickÃ© uÅ¾itÃ­ (KJV)', 'Pouziti', 'POUZITI', 'PouÅ¾itÃ­']);
    const puvod = get(['PÅ¯vod', 'Puvod', 'PUVOD']);
    const specialista = get(['Specialista', 'VÃKLAD', 'VYKLAD', 'KomentÃ¡Å™', 'KOMENTAR', 'Exegeze', 'EXEGEZE']);
    const kjv = get(['KJV pÅ™eklady (CZ)', 'KJV pÅ™eklady', 'KJV', 'KJV_PREKLADY', 'KJV VÃ½znamy']);
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
    // Variant A: pÅ™Ã­mÃ½ map exportu { "G1": {...}, "G2": {...} }
    for (const [key, value] of Object.entries(parsed)) {
      addRecord(String(key).trim(), value);
    }

    // Variant B: obÃ¡lka s polem state.entries/translations
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

// â•â• NEÃšSPÄšÅ NÃ‰ PÅ˜EKLADY â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•


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
    const rawText = f.raw || (info ? `${info.greek}\n\nDEF: ${info.definice || info.def || ''}\nKJV: ${info.kjv || ''}` : '(prÃ¡zdnÃ©)');
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
  
  // Nastav retry reÅ¾im - pÅ™Ã­Å¡tÃ­ translateNext/AUTO vezme tyto klÃ­Äe
  state.retryMode = true;
  state.retryKeysList = keys;
  
  showToast(t('toast.selectedForBatch', { count: keys.length }));
}

function closePreviewModal() {
  closePreviewModalSafe();
}

// Escape zavÅ™e modal
document.addEventListener('keydown', e => {
  // Ctrl+S = uloÅ¾it progress (Ctrl is either)
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
  // KlÃ¡vesovÃ© zkratky v app
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
window.toggleSourceEntryEdit = toggleSourceEntryEdit;
window.saveSourceEntryField = saveSourceEntryField;
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
  // Debounced save musÃ­ bÃ½t proveden synchronnÄ› pÅ™ed zavÅ™enÃ­m
  saveProgress.flush();
});
// PÅ™i skrytÃ­ tabu takÃ© flushni, aby se nic neztratilo
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveProgress.flush();
});


