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
  import { createTopicRepairApi } from './translation/topicRepair.js';
  import { parseCzTXT, parseImportJSON } from './parser.js';
  import { createLimitsApi } from './ui/limits.js';
  import { createPreviewApi } from './ui/preview.js';
  import { createSettingsApi } from './settings.js';
  import { createModelTestOutputApi } from './modelTestOutput.js';
  import { createBackupApi } from './backup.js';
  import { createApiKeysApi } from './apiKeys.js';
  import { createSettingsModalsApi } from './ui/settingsModals.js';
  import { createCallApi } from './ai/call.js';
  import {
    hasMeaningfulValue, isDefinitionLowQuality, isTranslationComplete,
    hasAnyTranslationContent, getStrongKeyNumber,
    stripDefinitionOriginReferenceTail, isDefinitionLikelyEnglish,
    tryNormalizeNumberedOpenRouterResponse,
    getTranslationStateForKey,
    fillMissingVyznamFromSource, fillMissingKjvFromSource, annotateEnglishDefinitionsInTranslated,
    applyFallbacksToParsedMap, parseWithOpenRouterNormalization
  } from './translation/utils.js';
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

// ══ LIST — přesunuto do js/ui/list.js (viz wiring níže) ══════════


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

// ── getFilteredEntries, virtual scroll, showDetail, renderDetail → js/ui/list.js + js/ui/detail.js

// renderDetail, renderTranslation, editace polí → js/ui/detail.js

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




// ══ AI CALL API ═════════════════════════════════════════════════
const callApi = createCallApi({
  log, logError, logWarn, showToast: (...a) => showToast(...a), t,
  rateInfoFromErrorMessage: (...a) => rateInfoFromErrorMessage(...a),
  parseWithOpenRouterNormalization,
});
const { callAIWithRetry, callOnce, getTranslationEngineLabel, getProviderConfiguredModels, getFallbackModels, resetPrompt, parseTranslations } = callApi;

// ══ UI MODULY ═══════════════════════════════════════════════════
const toastApi = createToastApi({ CONFIG, logError });
const { showToast, showToastWithAction } = toastApi;

const headerApi = createHeaderApi({
  state, t, getTranslationStateForKey, storeKey, backupKey
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
  parseTranslations,
  parseWithOpenRouterNormalization, applyFallbacksToParsedMap,
  extractTopicValueFromAI: (...a) => extractTopicValueFromAI(...a),
  shouldReplaceSpecialista: (...a) => shouldReplaceSpecialista(...a),
  fillMissingVyznamFromSource, fillMissingKjvFromSource, annotateEnglishDefinitionsInTranslated,
  buildPromptMessages: (...a) => buildPromptMessages(...a),
  callOnce, callAIWithRetry,
  getApiKeyForModelTest: (...a) => getApiKeyForModelTest(...a),
  getPipelineModelForProvider: (...a) => getPipelineModelForProvider(...a),
  getCurrentApiKey: (...a) => getCurrentApiKey(...a),
  getModelTestSelectedModelForProvider: (...a) => getModelTestSelectedModelForProvider(...a),
  resolveMainBatchProvider: (...a) => resolveMainBatchProvider(...a),
  appendModelTestUsage: (...a) => appendModelTestUsage(...a),
  buildModelTestMessages: (...a) => buildModelTestMessages(...a),
  isPipelineSecondaryEnabled: (...a) => isPipelineSecondaryEnabled(...a),
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
  getFailedTopicsForFallback: (...a) => getFailedTopicsForFallback(...a),
  getMissingTopicsForRepair: (...a) => getMissingTopicsForRepair(...a),
  cloneTranslationTopicFields: (...a) => cloneTranslationTopicFields(...a),
  shouldReplaceTopicValue: (...a) => shouldReplaceTopicValue(...a),
  getProviderCooldownLeftSec: (...a) => getProviderCooldownLeftSec(...a),
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
  getTranslationStateForKey,
  isAutoProviderEnabled: (...a) => isAutoProviderEnabled(...a),
  resolveMainBatchProvider,
  getPipelineModelForProvider: (...a) => getPipelineModelForProvider(...a),
  translateBatch,
  startTopicRepairFlow: (...a) => startTopicRepairFlow(...a),
  showPreviewModal: (...a) => showPreviewModal(...a),
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
  state, t, escHtml,
  TOPIC_LABELS, refreshTopicLabels,
  saveProgress: (...a) => saveProgress(...a),
  renderList, updateStats, showToast,
  log,
  buildTopicPrompt: (...a) => buildTopicPrompt(...a),
  openTopicPromptModal: (...a) => openTopicPromptModal(...a),
  callAIWithRetry, extractTopicValueFromAI: (...a) => extractTopicValueFromAI(...a),
  translateSingle,
  resolveProviderForInteractiveAction, getPipelineModelForProvider: (...a) => getPipelineModelForProvider(...a),
  getCurrentApiKey: (...a) => getCurrentApiKey(...a), SYSTEM_MESSAGE
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
  setPipelineSecondaryEnabled: (...a) => setPipelineSecondaryEnabled(...a),
  syncSecondaryProviderToggles: (...a) => syncSecondaryProviderToggles(...a),
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

// ══ TOPIC REPAIR API ════════════════════════════════════════════
const topicRepairApi = createTopicRepairApi({
  state, t, escHtml,
  log, logError,
  showToast,
  saveProgress: (...a) => saveProgress(...a),
  renderList, renderDetail, updateStats,
  TOPIC_LABELS, TOPIC_PROMPT_PRESET_MAP,
  callAIWithRetry,
  getPipelineModelForProvider: (...a) => getPipelineModelForProvider(...a),
  getCurrentApiKey: (...a) => getCurrentApiKey(...a),
  enforceSpecialistaFormat,
  parseWithOpenRouterNormalization, applyFallbacksToParsedMap,
  isAutoProviderEnabled,
  resolveProviderForInteractiveAction,
  getFailedTopicsForFallback, getMissingTopicsForRepair,
  cloneTranslationTopicFields, shouldReplaceTopicValue,
  getProviderCooldownLeftSec,
  appendModelTestUsage: (...a) => appendModelTestUsage(...a),
  buildModelTestMessages: (...a) => buildModelTestMessages(...a),
  modelTestPromptCatalog,
});
const {
  startTopicRepairFlow, closeTopicRepairModalSafe, stopTopicRepairTicker,
  applyTopicRepairProviderCheckboxes, setTopicRepairStrategy,
  startTopicRepairSequentialWorker, toggleTopicRepairTask, toggleTopicRepairRun,
  setTopicRepairSpecialistaDecision, setTopicRepairDetectedTopicDecision,
  applyTopicRepairSelected, closeTopicRepairModalOnly,
  minimizeTopicRepairModal, restoreTopicRepairModal,
  saveTopicRepairBatchPromptDraft, resetTopicRepairBatchPromptToDefault,
  refreshTopicRepairBatchPromptEditor, toggleTopicRepairBulkListFilter,
  syncTopicRepairBulkRunInputsToHidden, runTopicRepairBulkTranslation,
  toggleTopicRepairBulkInclude, setTopicRepairBulkIncludeAll,
  getTopicPromptTemplateByPromptType, syncTopicPromptTemplatesReport,
  buildTopicPrompt, openTopicPromptModal, runTopicPromptAI,
  applyTopicPromptResult, shouldReplaceSpecialista, closeTopicPromptModal,
  openSystemPromptModal, runSystemPromptAI, closeSystemPromptModal,
  extractTopicValueFromAI,
} = topicRepairApi;

// ══ LIMITS + PREVIEW API ════════════════════════════════════════
const limitsApi = createLimitsApi({
  getCurrentApiKey: (...a) => getCurrentApiKey(...a),
  getModelTestSelectedModelForProvider: (...a) => getModelTestSelectedModelForProvider(...a),
  showToast,
});
const { showLimitsModal, closeLimitsModal, showHelpModal, closeHelpModal, fetchLimits } = limitsApi;

const previewApi = createPreviewApi({
  showToast,
  renderList,
  renderDetail: (...a) => renderDetail(...a),
  saveProgress: (...a) => saveProgress(...a),
  updateStats,
  translateSingle: (...a) => translateSingle(...a),
  retranslateSingle: (...a) => retranslateSingle(...a),
  getStrongKeyNumber,
});
const {
  showPreviewModal, toggleAllPreview, acceptPreview, discardPreview,
  importFile, importTXT, showFailedEntries, retryFailed,
  closePreviewModal, closePreviewModalSafe, closeFailedModalSafe,
} = previewApi;

// ══ SETTINGS + MODEL TEST OUTPUT API ════════════════════════════
const settingsApi = createSettingsApi({
  MODEL_TEST_PINNED_MODELS, MODEL_TEST_MODEL_STORAGE_KEY, PIPELINE_SECONDARY_ENABLED_KEY,
  setAutoProviderEnabled: (...a) => setAutoProviderEnabled(...a),
});
const {
  getApiKeyForModelTest, getPinnedModelOptionsForProvider, getPinnedModelQueue,
  getDefaultPinnedModelByProvider, getModelTestSelectedModelForProvider,
  getPipelineModelForProvider, setPipelineModelForProvider,
  isPipelineSecondaryEnabled, setPipelineSecondaryEnabled,
  syncSecondaryProviderToggles, applyPipelineSecondaryToggleUi, bindPipelineSecondaryToggle,
  fillPipelineSelectOptions, initPipelineModelSelectors, initPipelineModelSelectorsInSettingsModal,
  saveModelTestModelSelections, populateModelTestModelSelect,
  updateModelTestProviderUi, getProviderModelOptions,
} = settingsApi;

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
  modelTestWaitWithCountdown: (...a) => modelTestWaitWithCountdown(...a),
  modelTestSetProviderEta,
  modelTestStartProviderCountdownTicker,
  modelTestStopProviderCountdownTicker,
  modelTestResetProviderEta,
  modelTestSetLastStatus,
  updateModelTestRunButton,
  modelTestSetCountdownLabel,
  modelTestClearCountdownInterval,
  saveModelTestOutputToStorage,
  saveModelTestRawOutputToStorage: (...a) => saveModelTestRawOutputToStorage(...a),
  clearModelTestRawOutputFromStorage: (...a) => clearModelTestRawOutputFromStorage(...a),
  upsertModelTestStats,
  showModelTestModal,
  updateModelTestProviderUi,
  pushTestHistory,
  appendModelTestLastBatchKeyAudit: (...a) => appendModelTestLastBatchKeyAudit(...a),
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

const modelTestOutputApi = createModelTestOutputApi({
  MODEL_TEST_RAW_OUTPUT_KEY,
  showToast,
  log,
  modelTestStopProviderCountdownTicker,
  showModelTestModal: (...a) => showModelTestModal(...a),
  showDetail: (...a) => showDetail(...a),
});
const {
  logEntry, clearLog,
  saveModelTestOutputTxt, saveModelTestRawOutputToStorage, clearModelTestRawOutputFromStorage,
  saveModelTestRawOutputTxt, loadModelTestOutputFromFile,
  modelTestWaitWithCountdown,
  scrollModelTestOutputIntoView, openModelTestModal, resetModelTestModal,
  restoreModelTestReportFromBackup,
  formatModelTestParsedBlock, appendModelTestExportParsed,
  excerptRawForLastKey, appendModelTestLastBatchKeyAudit,
  exportModelTestTranslationsTxt,
} = modelTestOutputApi;

// ══ BACKUP + API KEYS + SETTINGS MODALS ════════════════════════
const backupApi = createBackupApi({
  renderList: (...a) => renderList(...a),
  updateStats: (...a) => updateStats(...a),
  showToast, showToastWithAction, t, logError, logWarn, logInfo,
  isTranslationComplete,
  updateBackupButtonVisibility: (...a) => updateBackupButtonVisibility(...a),
  getUiLang,
  updateFailedCount: (...a) => updateFailedCount(...a),
  clearLog: (...a) => clearLog(...a),
});
const { saveProgress, saveProgressImmediate, writeBackup, maybeAutoBackup, hasUndo, restoreFromBackup, clearProgress } = backupApi;

const apiKeysApi = createApiKeysApi({ t, showToast });
const { saveApiKey, getApiKeyProfiles, setApiKeyProfiles, maskApiKey, setupApiKeySwitcher, onApiKeyProfileChange, saveCurrentApiKeyAsProfile, deleteApiKeyProfile, getCurrentApiKey } = apiKeysApi;

const settingsModalsApi = createSettingsModalsApi({
  initRunSelects,
  updateSetupCompactSummary: (...a) => updateSetupCompactSummary(...a),
  initPipelineModelSelectors,
  initPipelineModelSelectorsInSettingsModal,
  showToast,
  refreshTopicLabels,
  renderList: (...a) => renderList(...a),
  saveProgress: (...a) => saveProgress(...a),
  refreshLanguageAwarePromptOptionLabels,
  applySystemPromptForCurrentTask: (...a) => applySystemPromptForCurrentTask(...a),
  applyUiLanguage,
  DEFAULT_UI_LANG,
  UI_LANGS,
  UI_LANG_KEY,
  setPipelineModelForProvider: (...a) => setPipelineModelForProvider(...a),
  setPipelineSecondaryEnabled: (...a) => setPipelineSecondaryEnabled(...a),
  syncSecondaryProviderToggles: (...a) => syncSecondaryProviderToggles(...a),
  updateAutoProviderCountdowns: (...a) => updateAutoProviderCountdowns(...a),
});
const { showSettingsModal, closeSettingsModal, showPromptAIModal, closePromptAIModal, saveAISettings, showPromptLangModal, closePromptLangModal, updatePromptLangButtonLabel, saveLangSettings } = settingsModalsApi;

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
initializePromptLibrary();

function getCompactSelectedOptionLabel(selectId, fallback = '???') {
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
  const main = getCompactSelectedOptionLabel('pipelineModelMainGroq', '???');
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
// ══ STATS & SAVE ════════════════════════════════════════════════




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
  loadDefaultFile();
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

// ══ RESIZE PANELS (logika v ./ui/resize.js) ─────────────────────


// Toast s akčním tlačítkem (např. Undo). Vydrží 2× déle.


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
    log('🛑 AUTO zastaven po dávce: dosažen limit tokenů');
    showToast(t('toast.auto.stoppedTokenLimit'));
  }
}

// Preview modal pro hromadny preklad

window.closePreviewModalSafe = closePreviewModalSafe;
window.closeFailedModalSafe = closeFailedModalSafe;
window.showLimitsModal = showLimitsModal;
window.closeLimitsModal = closeLimitsModal;
window.showHelpModal = showHelpModal;
window.closeHelpModal = closeHelpModal;
window.toggleAllPreview = toggleAllPreview;
window.acceptPreview = acceptPreview;
window.discardPreview = discardPreview;
window.importFile = importFile;
window.importTXT = importTXT;
window.showFailedEntries = showFailedEntries;
window.retryFailed = retryFailed;
window.closeTopicRepairModalSafe = closeTopicRepairModalSafe;
window.toggleEditSection = toggleEditSection;
window.saveSection = saveSection;
window.toggleSourceEntryEdit = toggleSourceEntryEdit;
window.saveSourceEntryField = saveSourceEntryField;
window.refillSingleField = refillSingleField;
window.openTopicPromptModal = openTopicPromptModal;
window.runTopicPromptAI = runTopicPromptAI;
window.applyTopicPromptResult = applyTopicPromptResult;
window.closeTopicPromptModal = closeTopicPromptModal;

// Settings modals + API keys + backup exposures
window.showSettingsModal = showSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.updatePromptLangButtonLabel = updatePromptLangButtonLabel;
window.saveApiKey = saveApiKey;
window.setupApiKeySwitcher = setupApiKeySwitcher;
window.onApiKeyProfileChange = onApiKeyProfileChange;
window.saveCurrentApiKeyAsProfile = saveCurrentApiKeyAsProfile;
window.deleteApiKeyProfile = deleteApiKeyProfile;
window.clearProgress = clearProgress;
window.restoreFromBackup = restoreFromBackup;
window.resetPrompt = resetPrompt;
window.updateSetupCompactSummary = updateSetupCompactSummary;

function clearModelTestOutput() {
  const output = document.getElementById('modelTestOutput');
  if (!output) return;
  output.value = '';
  state.modelTestOutputBackupBeforeLibrary = '';
  state.modelTestLibraryActive = false;
  clearModelTestOutputFromStorage();
  showToast(t('toast.output.cleared'));
}

async function copyModelTestOutput() {
  const output = document.getElementById('modelTestOutput');
  const btn = document.getElementById('btnCopyModelTestOutput');
  const originalBtnText = btn?.textContent || '';
  if (!output) return;
  const text = output.value || '';
  if (!text.trim()) { showToast(t('toast.copy.nothing')); return; }
  try {
    await navigator.clipboard.writeText(text);
    showToast(t('toast.output.copied'));
    if (btn) { btn.textContent = t('toast.output.copiedShort'); setTimeout(() => { btn.textContent = originalBtnText; }, 1200); }
  } catch (e) {
    output.focus(); output.select(); document.execCommand('copy');
    showToast(t('toast.output.copied'));
    if (btn) { btn.textContent = t('toast.output.copiedShort'); setTimeout(() => { btn.textContent = originalBtnText; }, 1200); }
  }
}

function showModelTestLibrary() {
  const output = document.getElementById('modelTestOutput');
  if (!output) return;
  if (state.modelTestRunning) { showToast(t('toast.test.libraryAfterStop')); return; }
  if (!state.modelTestLibraryActive) state.modelTestOutputBackupBeforeLibrary = output.value;
  state.modelTestLibraryActive = true;
  const history = getTestHistory();
  if (!history.length) { output.value = t('modelTest.library.empty'); return; }
  const lines = [t('modelTest.library.title'), `${t('modelTest.library.count')}: ${history.length}`, ''];
  const statsRows = Object.values(getModelTestStatsMap());
  if (statsRows.length) {
    lines.push(t('modelTest.library.statsHeader'));
    const providers = {};
    for (const r of statsRows) { if (!providers[r.provider]) providers[r.provider] = []; providers[r.provider].push(r); }
    for (const providerName of Object.keys(providers).sort((a, b) => a.localeCompare(b, 'cs'))) {
      lines.push(`### ${providerName}`);
      for (const r of providers[providerName].sort((a, b) => (b.calls||0)-(a.calls||0))) {
        const total = Math.max(1, (r.okKeys||0)+(r.failedKeys||0));
        const rate = (((r.okKeys||0)/total)*100).toFixed(1);
        const avgMs = r.latencySamples ? (r.latencyMsTotal/r.latencySamples) : 0;
        lines.push(`- ${r.model} | ${r.calls||0} volání | ${r.totalKeys||0} hesel | OK ${r.okKeys||0} | ERR ${r.failedKeys||0} | ${rate}% | ${formatAiResponseTime(avgMs)}`);
      }
      lines.push('');
    }
  }
  lines.push(t('modelTest.library.runsHeader'));
  for (const item of history.slice(0, 80)) {
    const when = new Date(item.ts).toLocaleString('cs-CZ');
    if (item.type === 'model-test') {
      lines.push(`[${when}] TEST | ${item.provider} | ${item.mode||'smoke'} | OK ${item.ok}/${item.total} | PART ${item.partial||0} | RL ${item.rateLimited} | ERR ${item.error} | HESLA ${item.keysOk||0}/${item.keysFailed||0} | AI ${formatAiResponseTime(item.avgLatencyMs||0)}`);
      if (Array.isArray(item.topModels)&&item.topModels.length) lines.push(`TOP: ${item.topModels.join(', ')}`);
    } else if (item.type === 'translate-batch') {
      lines.push(`[${when}] BATCH | ${item.provider}/${item.model} | ${item.ok}/${item.total} | missing ${item.missing} | AI ${formatAiResponseTime(item.avgLatencyMs||0)}`);
    }
  }
  output.value = lines.join('\n');
  saveModelTestOutputToStorage(output.value);
}

async function runModelTestFromModal() {
  if (state.modelTestRunning) { cancelModelTest(); showToast(t('toast.test.pausing')); return; }
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


window.openModelTestModal = openModelTestModal;
window.runModelTestFromModal = runModelTestFromModal;
window.showModelTestLibrary = showModelTestLibrary;
window.clearModelTestOutput = clearModelTestOutput;
window.copyModelTestOutput = copyModelTestOutput;
window.saveModelTestOutputTxt = saveModelTestOutputTxt;
window.saveModelTestRawOutputTxt = saveModelTestRawOutputTxt;
window.loadModelTestOutputFromFile = loadModelTestOutputFromFile;
window.exportModelTestTranslationsTxt = exportModelTestTranslationsTxt;
window.clearLog = clearLog;
window.logEntry = logEntry;

// Expose for debugging
window.PROVIDERS = PROVIDERS;
window.populateOpenRouterModels = populateOpenRouterModels;

// Funkce definovane primo v main.js (ES module - musi byt na window)
window.startApp = startApp;
window.loadTXT = loadTXT;
window.loadDefaultFile = loadDefaultFile;
window.filterList = filterList;
window.filterListDebounced = filterListDebounced;
window.applyAutoPanelSettings = applyAutoPanelSettings;
window.onProviderChange = onProviderChange;
window.showSetup = showSetup;
window.toggleListPane = toggleListPane;
window.copyModelTestPromptPreview = copyModelTestPromptPreview;

// Z batchApi
window.translateNext = translateNext;
window.jumpToStart = jumpToStart;

// Z listApi
window.translateSelected = translateSelected;
window.selectAll = selectAll;
window.selectNone = selectNone;
window.filterMissingTopicsList = filterMissingTopicsList;

// Z modalsApi
window.selectRange = selectRange;
window.showMobileActions = showMobileActions;

// Z autoApi
window.toggleAuto = toggleAuto;
window.stopAuto = stopAuto;

// Z topicRepairApi
window.restoreTopicRepairModal = restoreTopicRepairModal;
window.applySystemPromptForCurrentTask = applySystemPromptForCurrentTask;

// Z modelTestUiApi
window.cancelModelTest = cancelModelTest;

// Z modelTestOutputApi
window.resetModelTestModal = resetModelTestModal;

// Z settingsApi
window.saveModelTestModelSelections = saveModelTestModelSelections;
window.updateModelTestProviderUi = updateModelTestProviderUi;

// Z promptLibraryApi
window.togglePromptAutoMode = togglePromptAutoMode;
window.togglePromptModeQuick = togglePromptModeQuick;

// Z exportDataApi
window.exportTXT = exportTXT;
window.exportJSON = exportJSON;
window.exportRange = exportRange;

// Z modalsApi + modelTestUiApi + main.js funkce
window.closeModal = closeModal;
window.confirmModal = confirmModal;
window.closeModelTestModal = closeModelTestModal;
window.openModelTestPromptPreviewModal = openModelTestPromptPreviewModal;
window.closeModelTestPromptPreviewModal = closeModelTestPromptPreviewModal;

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

window.addEventListener('DOMContentLoaded', () => {
  loadSavedSettings().catch(err => {
    console.error('[i18n] Startup failed:', err);
    showToast(t('toast.error.withMessage', { message: err?.message || String(err) }));
  });
});
