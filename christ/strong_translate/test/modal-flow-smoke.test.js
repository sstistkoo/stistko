import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { state } from '../js/state.js';
import { createModelTestOutputApi } from '../js/modelTestOutput.js';
import { createSettingsModalsApi } from '../js/ui/settingsModals.js';

function makeLocalStorageMock(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    }
  };
}

test('modelTest modal flow: open blocked during AUTO, otherwise opens and preselects provider', () => {
  const dom = new JSDOM(`
    <select id="provider"><option value="groq" selected>groq</option></select>
    <select id="modelTestProvider"><option value="groq">groq</option></select>
    <textarea id="modelTestOutput"></textarea>
  `);
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevLocalStorage = globalThis.localStorage;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = makeLocalStorageMock();
  const ta = document.getElementById('modelTestOutput');
  ta.scrollIntoView = () => {};

  const snap = {
    autoRunning: state.autoRunning,
    autoStepRunning: state.autoStepRunning
  };

  const toasts = [];
  const opened = [];

  try {
    const api = createModelTestOutputApi({
      MODEL_TEST_RAW_OUTPUT_KEY: 'x',
      showToast: (m) => toasts.push(m),
      log: () => {},
      modelTestStopProviderCountdownTicker: () => {},
      showModelTestModal: (label) => opened.push(label),
      showDetail: () => {}
    });

    state.autoRunning = true;
    state.autoStepRunning = false;
    api.openModelTestModal();
    assert.equal(toasts.length, 1);
    assert.equal(opened.length, 0);

    state.autoRunning = false;
    api.openModelTestModal();
    assert.equal(opened.length, 1);
    assert.equal(document.getElementById('modelTestProvider').value, 'groq');
  } finally {
    state.autoRunning = snap.autoRunning;
    state.autoStepRunning = snap.autoStepRunning;
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    globalThis.localStorage = prevLocalStorage;
  }
});

test('modelTest modal flow: reset is blocked while test is running', () => {
  const dom = new JSDOM(`
    <textarea id="modelTestOutput">abc</textarea>
    <button id="btnRunModelTest">x</button>
    <div id="modelTestCountdown"></div>
    <div id="modelTestStatus"></div>
  `);
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevLocalStorage = globalThis.localStorage;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = makeLocalStorageMock();
  const prevModelTestResetProviderEta = globalThis.modelTestResetProviderEta;
  const prevModelTestSetCountdownLabel = globalThis.modelTestSetCountdownLabel;
  const prevModelTestSetLastStatus = globalThis.modelTestSetLastStatus;
  const prevUpdateModelTestRunButton = globalThis.updateModelTestRunButton;
  globalThis.modelTestResetProviderEta = () => {};
  globalThis.modelTestSetCountdownLabel = () => {};
  globalThis.modelTestSetLastStatus = () => {};
  globalThis.updateModelTestRunButton = () => {};

  const snap = {
    modelTestRunning: state.modelTestRunning,
    modelTestLibraryActive: state.modelTestLibraryActive,
    modelTestOutputBackupBeforeLibrary: state.modelTestOutputBackupBeforeLibrary,
    modelTestParsedExportChunks: state.modelTestParsedExportChunks,
    modelTestLastKeyAuditExportChunks: state.modelTestLastKeyAuditExportChunks,
    modelTestRawResponses: state.modelTestRawResponses,
    modelTestNextRequestEtaSec: state.modelTestNextRequestEtaSec
  };

  try {
    state.modelTestRunning = true;
    state.modelTestLibraryActive = true;
    state.modelTestOutputBackupBeforeLibrary = 'backup';
    state.modelTestParsedExportChunks = ['x'];
    state.modelTestLastKeyAuditExportChunks = ['y'];
    state.modelTestRawResponses = [{ ok: 1 }];
    state.modelTestNextRequestEtaSec = 9;

    const toasts = [];
    const api = createModelTestOutputApi({
      MODEL_TEST_RAW_OUTPUT_KEY: 'x',
      showToast: (m) => toasts.push(m),
      log: () => {},
      modelTestStopProviderCountdownTicker: () => {},
      showModelTestModal: () => {},
      showDetail: () => {}
    });

    api.resetModelTestModal();
    assert.equal(document.getElementById('modelTestOutput').value, 'abc');
    assert.equal(toasts.length, 1);
  } finally {
    state.modelTestRunning = snap.modelTestRunning;
    state.modelTestLibraryActive = snap.modelTestLibraryActive;
    state.modelTestOutputBackupBeforeLibrary = snap.modelTestOutputBackupBeforeLibrary;
    state.modelTestParsedExportChunks = snap.modelTestParsedExportChunks;
    state.modelTestLastKeyAuditExportChunks = snap.modelTestLastKeyAuditExportChunks;
    state.modelTestRawResponses = snap.modelTestRawResponses;
    state.modelTestNextRequestEtaSec = snap.modelTestNextRequestEtaSec;
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    globalThis.localStorage = prevLocalStorage;
    globalThis.modelTestResetProviderEta = prevModelTestResetProviderEta;
    globalThis.modelTestSetCountdownLabel = prevModelTestSetCountdownLabel;
    globalThis.modelTestSetLastStatus = prevModelTestSetLastStatus;
    globalThis.updateModelTestRunButton = prevUpdateModelTestRunButton;
  }
});

test('settings modal flow: show and close synchronizes values and toggles class', () => {
  const dom = new JSDOM(`
    <div id="settingsModal" class=""></div>
    <select id="provider"><option value="groq">groq</option></select>
    <select id="model"><option value="m-main">m-main</option></select>
    <select id="batchSize"><option value="5">5</option><option value="10" selected>10</option></select>
    <select id="interval"><option value="15">15</option><option value="20" selected>20</option></select>
    <select id="batchSizeRunMobile"><option value="5">5</option><option value="10">10</option></select>
    <select id="intervalRunMobile"><option value="15">15</option><option value="20">20</option></select>
    <select id="providerRunMainGroqModel"><option value="m-main" selected>m-main</option></select>
    <select id="providerRunSecondaryGeminiModel"><option value="m-g" selected>m-g</option></select>
    <select id="providerRunSecondaryOpenrouterModel"><option value="m-o" selected>m-o</option></select>
    <input id="providerRunEnableSecondaryGemini" type="checkbox" checked />
    <input id="providerRunEnableSecondaryOpenrouter" type="checkbox" />
    <input id="aiTemperature_groq" value="0.3" />
    <input id="aiTemperature_gemini" value="0.3" />
    <input id="aiTemperature_openrouter" value="0.3" />
    <input id="aiMaxTokens_groq" value="2500" />
    <input id="aiMaxTokens_gemini" value="2500" />
    <input id="aiMaxTokens_openrouter" value="2500" />
    <div id="promptAIModal" style="display:none"></div>
    <button id="btnPromptLang"></button>
  `);

  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevLocalStorage = globalThis.localStorage;
  const prevOnProviderChange = globalThis.onProviderChange;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = makeLocalStorageMock({ strong_ui_lang: 'cs', strong_target_lang: 'cz', strong_source_lang: 'gr' });
  globalThis.onProviderChange = () => {};

  const calls = {
    setModel: [],
    setSecondary: [],
    syncSecondary: [],
    initRun: 0,
    initPipe: 0,
    initPipeModal: 0,
    compact: 0
  };

  try {
    const api = createSettingsModalsApi({
      initRunSelects: () => { calls.initRun += 1; },
      updateSetupCompactSummary: () => { calls.compact += 1; },
      initPipelineModelSelectors: () => { calls.initPipe += 1; },
      initPipelineModelSelectorsInSettingsModal: () => { calls.initPipeModal += 1; },
      showToast: () => {},
      refreshTopicLabels: () => {},
      renderList: () => {},
      saveProgress: () => {},
      refreshLanguageAwarePromptOptionLabels: () => {},
      applySystemPromptForCurrentTask: () => {},
      applyUiLanguage: () => {},
      DEFAULT_UI_LANG: 'cs',
      UI_LANGS: new Set(['cs', 'en', 'sk', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'ru']),
      UI_LANG_KEY: 'strong_ui_lang',
      setPipelineModelForProvider: (prov, model) => calls.setModel.push([prov, model]),
      setPipelineSecondaryEnabled: (prov, on) => calls.setSecondary.push([prov, on]),
      syncSecondaryProviderToggles: (prov, on) => calls.syncSecondary.push([prov, on]),
      updateAutoProviderCountdowns: () => {}
    });

    api.showSettingsModal();
    assert.equal(document.getElementById('settingsModal').classList.contains('show'), true);
    assert.equal(document.getElementById('batchSizeRunMobile').value, '10');
    assert.equal(document.getElementById('intervalRunMobile').value, '20');

    document.getElementById('batchSizeRunMobile').value = '5';
    document.getElementById('intervalRunMobile').value = '15';
    api.closeSettingsModal();

    assert.equal(document.getElementById('settingsModal').classList.contains('show'), false);
    assert.equal(document.getElementById('batchSize').value, '5');
    assert.equal(document.getElementById('interval').value, '15');
    assert.ok(calls.setModel.some(([p, m]) => p === 'groq' && m === 'm-main'));
    assert.ok(calls.setSecondary.some(([p]) => p === 'gemini'));
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    globalThis.localStorage = prevLocalStorage;
    globalThis.onProviderChange = prevOnProviderChange;
  }
});

test('settings persistence: saveAISettings stores values and showPromptAIModal reloads them', () => {
  const dom = new JSDOM(`
    <div id="promptAIModal" style="display:none"></div>
    <input id="aiTemperature_groq" value="0.3" />
    <input id="aiTemperature_gemini" value="0.3" />
    <input id="aiTemperature_openrouter" value="0.3" />
    <input id="aiMaxTokens_groq" value="2500" />
    <input id="aiMaxTokens_gemini" value="2500" />
    <input id="aiMaxTokens_openrouter" value="2500" />
  `);
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevLocalStorage = globalThis.localStorage;
  const prevOnProviderChange = globalThis.onProviderChange;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = makeLocalStorageMock();
  globalThis.onProviderChange = () => {};

  const toasts = [];
  try {
    const api = createSettingsModalsApi({
      initRunSelects: () => {},
      updateSetupCompactSummary: () => {},
      initPipelineModelSelectors: () => {},
      initPipelineModelSelectorsInSettingsModal: () => {},
      showToast: (m) => toasts.push(m),
      refreshTopicLabels: () => {},
      renderList: () => {},
      saveProgress: () => {},
      refreshLanguageAwarePromptOptionLabels: () => {},
      applySystemPromptForCurrentTask: () => {},
      applyUiLanguage: () => {},
      DEFAULT_UI_LANG: 'cs',
      UI_LANGS: new Set(['cs', 'en', 'sk', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'ru']),
      UI_LANG_KEY: 'strong_ui_lang',
      setPipelineModelForProvider: () => {},
      setPipelineSecondaryEnabled: () => {},
      syncSecondaryProviderToggles: () => {},
      updateAutoProviderCountdowns: () => {}
    });

    document.getElementById('aiTemperature_groq').value = '0.2';
    document.getElementById('aiTemperature_gemini').value = '0.4';
    document.getElementById('aiTemperature_openrouter').value = '0.6';
    document.getElementById('aiMaxTokens_groq').value = '1200';
    document.getElementById('aiMaxTokens_gemini').value = '1800';
    document.getElementById('aiMaxTokens_openrouter').value = '2200';
    api.saveAISettings();

    assert.equal(localStorage.getItem('strong_ai_temperature_groq'), '0.2');
    assert.equal(localStorage.getItem('strong_ai_temperature_gemini'), '0.4');
    assert.equal(localStorage.getItem('strong_ai_temperature_openrouter'), '0.6');
    assert.equal(localStorage.getItem('strong_ai_max_tokens_groq'), '1200');
    assert.equal(localStorage.getItem('strong_ai_max_tokens_gemini'), '1800');
    assert.equal(localStorage.getItem('strong_ai_max_tokens_openrouter'), '2200');
    assert.equal(toasts.length, 1);

    document.getElementById('aiTemperature_groq').value = '';
    document.getElementById('aiTemperature_gemini').value = '';
    document.getElementById('aiTemperature_openrouter').value = '';
    document.getElementById('aiMaxTokens_groq').value = '';
    document.getElementById('aiMaxTokens_gemini').value = '';
    document.getElementById('aiMaxTokens_openrouter').value = '';

    api.showPromptAIModal();
    assert.equal(document.getElementById('aiTemperature_groq').value, '0.2');
    assert.equal(document.getElementById('aiTemperature_gemini').value, '0.4');
    assert.equal(document.getElementById('aiTemperature_openrouter').value, '0.6');
    assert.equal(document.getElementById('aiMaxTokens_groq').value, '1200');
    assert.equal(document.getElementById('aiMaxTokens_gemini').value, '1800');
    assert.equal(document.getElementById('aiMaxTokens_openrouter').value, '2200');
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    globalThis.localStorage = prevLocalStorage;
    globalThis.onProviderChange = prevOnProviderChange;
  }
});

test('lang settings: saveLangSettings stores target/source/ui and clears default content tag override', () => {
  const dom = new JSDOM(`
    <div id="promptLangModal" style="display:flex"></div>
    <button id="btnPromptLang"></button>
    <select id="targetLanguage"><option value="cz">cz</option><option value="en">en</option></select>
    <select id="sourceLanguage"><option value="gr">gr</option><option value="he">he</option></select>
    <select id="uiLanguage"><option value="cs">cs</option><option value="en">en</option></select>
  `);
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevLocalStorage = globalThis.localStorage;
  const prevOnProviderChange = globalThis.onProviderChange;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = makeLocalStorageMock({
    strong_target_lang: 'cz',
    strong_source_lang: 'gr',
    strong_ui_lang: 'cs'
  });
  globalThis.onProviderChange = () => {};

  const calls = { refresh: 0, prompt: 0, ui: 0 };
  const toasts = [];
  try {
    const api = createSettingsModalsApi({
      initRunSelects: () => {},
      updateSetupCompactSummary: () => {},
      initPipelineModelSelectors: () => {},
      initPipelineModelSelectorsInSettingsModal: () => {},
      showToast: (m) => toasts.push(m),
      refreshTopicLabels: () => {},
      renderList: () => {},
      saveProgress: () => {},
      refreshLanguageAwarePromptOptionLabels: () => { calls.refresh += 1; },
      applySystemPromptForCurrentTask: () => { calls.prompt += 1; },
      applyUiLanguage: () => { calls.ui += 1; },
      DEFAULT_UI_LANG: 'cs',
      UI_LANGS: new Set(['cs', 'en', 'sk', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'ru']),
      UI_LANG_KEY: 'strong_ui_lang',
      setPipelineModelForProvider: () => {},
      setPipelineSecondaryEnabled: () => {},
      syncSecondaryProviderToggles: () => {},
      refreshLanguageAwarePromptOptionLabels: () => { calls.refresh += 1; },
      applySystemPromptForCurrentTask: () => { calls.prompt += 1; },
      applyUiLanguage: () => { calls.ui += 1; }
    });
    api.showPromptLangModal();
    api.saveLangSettings();
    expect(localStorage.getItem('strong_target_lang')).toBe('cz');
    expect(localStorage.getItem('strong_source_lang')).toBe('gr');
    expect(localStorage.getItem('strong_ui_lang')).toBe('cs');
    expect(localStorage.getItem('strong_content_tag_lang')).toBeNull();
    expect(localStorage.getItem('strong_content_tag_lang_manual')).toBeNull();
     expect(calls.refresh).toBe(1);
     expect(calls.prompt).toBe(1);
     expect(calls.ui).toBe(1);
     expect(toasts).toContainMatch(/jazyků nastaven/);
   } finally {
     globalThis.window = prevWindow;
     globalThis.document = prevDocument;
     globalThis.localStorage = prevLocalStorage;
     globalThis.onProviderChange = prevOnProviderChange;
   }
 });


   const calls = { refresh: 0, prompt: 0, ui: 0 };
   const toasts = [];
   try {
     const api = createSettingsModalsApi({
       initRunSelects: () => {},
       updateSetupCompactSummary: () => {},
       initPipelineModelSelectors: () => {},
       initPipelineModelSelectorsInSettingsModal: () => {},
       showToast: (m) => toasts.push(m),
       refreshTopicLabels: () => {},
       renderList: () => {},
       saveProgress: () => {},
       refreshLanguageAwarePromptOptionLabels: () => { calls.refresh += 1; },
       applySystemPromptForCurrentTask: () => { calls.prompt += 1; },
       applyUiLanguage: () => { calls.ui += 1; },
       DEFAULT_UI_LANG: 'cs',
       UI_LANGS: new Set(['cs', 'en', 'sk', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'ru']),
       UI_LANG_KEY: 'strong_ui_lang',
       setPipelineModelForProvider: () => {},
       setPipelineSecondaryEnabled: () => {},
       syncSecondaryProviderToggles: () => {},
     });
     api.showPromptLangModal();
     // Set values and save
     document.getElementById('targetLanguage').value = 'en';
     document.getElementById('sourceLanguage').value = 'he';
     document.getElementById('uiLanguage').value = 'en';
     api.saveLangSettings();
     assert.equal(localStorage.getItem('strong_target_lang'), 'en');
     assert.equal(localStorage.getItem('strong_source_lang'), 'he');
     assert.equal(localStorage.getItem('strong_ui_lang'), 'en');
     // Content tag should follow UI language (en -> EN)
     assert.equal(localStorage.getItem('strong_content_tag_lang'), null); // Not stored manually
     assert.equal(localStorage.getItem('strong_content_tag_lang_manual'), null); // Not stored manually
     assert.equal(calls.refresh, 1);
     assert.equal(calls.prompt, 1);
     assert.equal(calls.ui, 1);
     // Check if any toast contains the expected text
     let toastFound = false;
     for (const toast of toasts) {
       if (/jazyků nastaven/.test(toast)) {
         toastFound = true;
         break;
       }
     }
      assert.ok(toastFound, 'Expected toast containing "jazyků nastaven" not found');
    } finally {
      globalThis.window = prevWindow;
      globalThis.document = prevDocument;
      globalThis.localStorage = prevLocalStorage;
      globalThis.onProviderChange = prevOnProviderChange;
    }
 });

    document.getElementById('targetLanguage').value = 'en';
    document.getElementById('sourceLanguage').value = 'he';
    document.getElementById('uiLanguage').value = 'en';
    api.saveLangSettings();

    assert.equal(localStorage.getItem('strong_target_lang'), 'en');
    assert.equal(localStorage.getItem('strong_source_lang'), 'he');
    assert.equal(localStorage.getItem('strong_ui_lang'), 'en');
    assert.equal(localStorage.getItem('strong_content_tag_lang'), null);
    assert.equal(localStorage.getItem('strong_content_tag_lang_manual'), null);
    assert.equal(document.getElementById('promptLangModal').style.display, 'none');
    assert.equal(calls.refresh, 1);
    assert.equal(calls.prompt, 1);
    assert.equal(calls.ui, 1);
    assert.equal(toasts.length, 1);
} finally {
     globalThis.window = prevWindow;
     globalThis.document = prevDocument;
     globalThis.localStorage = prevLocalStorage;
     globalThis.onProviderChange = prevOnProviderChange;
   }
 });

  const calls = { refresh: 0, prompt: 0, ui: 0 };
  const toasts = [];
  try {
    const api = createSettingsModalsApi({
      initRunSelects: () => {},
      updateSetupCompactSummary: () => {},
      initPipelineModelSelectors: () => {},
      initPipelineModelSelectorsInSettingsModal: () => {},
      showToast: (m) => toasts.push(m),
      refreshTopicLabels: () => {},
      renderList: () => {},
      saveProgress: () => {},
      refreshLanguageAwarePromptOptionLabels: () => { calls.refresh += 1; },
      applySystemPromptForCurrentTask: () => { calls.prompt += 1; },
      applyUiLanguage: () => { calls.ui += 1; },
      DEFAULT_UI_LANG: 'cs',
      UI_LANGS: new Set(['cs', 'en', 'sk', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'ru']),
      UI_LANG_KEY: 'strong_ui_lang',
      setPipelineModelForProvider: () => {},
      setPipelineSecondaryEnabled: () => {},
      syncSecondaryProviderToggles: () => {},
      refreshLanguageAwarePromptOptionLabels: () => { calls.refresh += 1; },
      applySystemPromptForCurrentTask: () => { calls.prompt += 1; },
      applyUiLanguage: () => { calls.ui += 1; }
    });
    api.showPromptLangModal();
    // Set values and save
    document.getElementById('targetLanguage').value = 'en';
    document.getElementById('sourceLanguage').value = 'he';
    document.getElementById('uiLanguage').value = 'en';
    api.saveLangSettings();
    expect(localStorage.getItem('strong_target_lang')).toBe('en');
    expect(localStorage.getItem('strong_source_lang')).toBe('he');
    expect(localStorage.getItem('strong_ui_lang')).toBe('en');
    // Content tag should follow UI language (en -> EN)
    expect(localStorage.getItem('strong_content_tag_lang')).toBeNull(); // Not stored manually
    expect(localStorage.getItem('strong_content_tag_lang_manual')).toBeNull(); // Not stored manually
    expect(calls.refresh).toBe(1);
    expect(calls.prompt).toBe(1);
    expect(calls.ui).toBe(1);
    expect(toasts).toContainMatch(/jazyků nastaven/);
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    globalThis.localStorage = prevLocalStorage;
    globalThis.onProviderChange = prevOnProviderChange;
  }
});
