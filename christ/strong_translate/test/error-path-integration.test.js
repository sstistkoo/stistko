import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { createAutoApi } from '../js/auto.js';
import { state } from '../js/state.js';
import { runProviderFallbackTaskSequential, sleepMsWithAbort } from '../js/ai/fallback.js';

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

function makeT() {
  return (key) => key;
}

test('auto error-path: runAutoStep stops and toasts when groq is disabled', async () => {
  const dom = new JSDOM(`
    <button id="btnAuto"></button>
    <div id="autoPanel"></div>
    <div id="countdown"></div>
    <div id="autoLog"></div>
    <div id="autoCountdown_groq"></div>
    <div id="autoCountdown_gemini"></div>
    <div id="autoCountdown_openrouter"></div>
  `);
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevLocalStorage = globalThis.localStorage;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = makeLocalStorageMock({
    strong_auto_provider_enabled_groq: '0'
  });

  const snap = {
    autoRunning: state.autoRunning,
    autoStepRunning: state.autoStepRunning,
    totalTokens: state.totalTokens
  };
  state.autoRunning = true;
  state.autoStepRunning = false;
  state.totalTokens = { in: 0, out: 0, total: 0 };

  const toasts = [];
  const logs = [];

  try {
    const api = createAutoApi({
      state,
      t: makeT(),
      getUiLang: () => 'cs',
      PROVIDERS: { groq: { label: 'Groq' }, gemini: { label: 'Gemini' }, openrouter: { label: 'OpenRouter' } },
      AUTO_PROVIDER_ENABLED_KEY: 'strong_auto_provider_enabled_',
      AUTO_TOKEN_LIMIT_KEY: 'strong_auto_token_limit',
      PIPELINE_SECONDARY_ENABLED_KEY: 'strong_pipeline_secondary_enabled_',
      setPipelineSecondaryEnabled: () => {},
      syncSecondaryProviderToggles: () => {},
      getSecondaryNextOperationState: () => ({ exhausted: false, nextSec: 0 }),
      stopElapsedTimer: () => {},
      showToast: (m) => toasts.push(m),
      log: (m) => logs.push(m),
      getNextBatch: () => ['G1'],
      updateETA: () => {},
      translateBatch: async () => ({}),
      updateStats: () => {},
      renderList: () => {},
      renderDetail: () => {}
    });
    await api.runAutoStep();
    assert.equal(state.autoRunning, false);
    assert.ok(toasts.includes('toast.auto.enableGroq'));
    assert.ok(logs.includes('auto.log.stoppedGroqDisabled'));
  } finally {
    state.autoRunning = snap.autoRunning;
    state.autoStepRunning = snap.autoStepRunning;
    state.totalTokens = snap.totalTokens;
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    globalThis.localStorage = prevLocalStorage;
  }
});

test('auto error-path: startAuto stops immediately on token limit reached', () => {
  const dom = new JSDOM(`
    <button id="btnAuto"></button>
    <div id="autoPanel"></div>
    <div id="autoInterval"></div>
    <div id="countdown"></div>
    <input id="autoTokenLimit" value="100" />
    <div id="tokenStats"></div>
    <div id="autoCountdown_groq"></div>
    <div id="autoCountdown_gemini"></div>
    <div id="autoCountdown_openrouter"></div>
  `);
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevLocalStorage = globalThis.localStorage;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = makeLocalStorageMock();

  const snap = {
    autoRunning: state.autoRunning,
    autoStepRunning: state.autoStepRunning,
    currentInterval: state.currentInterval,
    totalTokens: state.totalTokens
  };
  state.autoRunning = false;
  state.autoStepRunning = false;
  state.currentInterval = 20;
  state.totalTokens = { in: 0, out: 0, total: 100 };

  const toasts = [];
  let api;
  try {
    api = createAutoApi({
      state,
      t: makeT(),
      getUiLang: () => 'cs',
      PROVIDERS: { groq: { label: 'Groq' }, gemini: { label: 'Gemini' }, openrouter: { label: 'OpenRouter' } },
      AUTO_PROVIDER_ENABLED_KEY: 'strong_auto_provider_enabled_',
      AUTO_TOKEN_LIMIT_KEY: 'strong_auto_token_limit',
      PIPELINE_SECONDARY_ENABLED_KEY: 'strong_pipeline_secondary_enabled_',
      setPipelineSecondaryEnabled: () => {},
      syncSecondaryProviderToggles: () => {},
      getSecondaryNextOperationState: () => ({ exhausted: false, nextSec: 0 }),
      stopElapsedTimer: () => {},
      showToast: (m) => toasts.push(m),
      log: () => {},
      getNextBatch: () => ['G1'],
      updateETA: () => {},
      translateBatch: async () => ({}),
      updateStats: () => {},
      renderList: () => {},
      renderDetail: () => {}
    });
    api.startAuto();
    assert.equal(state.autoRunning, false);
    assert.ok(toasts.includes('toast.auto.notStartedTokenLimit'));
  } finally {
    if (api) api.stopAutoProviderCountdownTicker();
    state.autoRunning = snap.autoRunning;
    state.autoStepRunning = snap.autoStepRunning;
    state.currentInterval = snap.currentInterval;
    state.totalTokens = snap.totalTokens;
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    globalThis.localStorage = prevLocalStorage;
  }
});

test('fallback queue runs provider tasks sequentially in order', async () => {
  const snapQueue = state.providerFallbackQueue;
  const snapPending = state.providerFallbackPendingCount;
  state.providerFallbackQueue = { groq: Promise.resolve() };
  state.providerFallbackPendingCount = { groq: 0 };
  const out = [];
  try {
    const p1 = runProviderFallbackTaskSequential('groq', async () => {
      out.push('a1');
      await new Promise((r) => setTimeout(r, 10));
      out.push('a2');
    });
    const p2 = runProviderFallbackTaskSequential('groq', async () => {
      out.push('b1');
    });
    await Promise.all([p1, p2]);
    assert.deepEqual(out, ['a1', 'a2', 'b1']);
    assert.equal(state.providerFallbackPendingCount.groq, 0);
  } finally {
    state.providerFallbackQueue = snapQueue;
    state.providerFallbackPendingCount = snapPending;
  }
});

test('sleepMsWithAbort returns false when abort version changes', async () => {
  const prev = state.sideFallbackAbortVersion;
  state.sideFallbackAbortVersion = 1;
  const p = sleepMsWithAbort(20, 1);
  state.sideFallbackAbortVersion = 2;
  const ok = await p;
  state.sideFallbackAbortVersion = prev;
  assert.equal(ok, false);
});
