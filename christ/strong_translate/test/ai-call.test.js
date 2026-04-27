import test from 'node:test';
import assert from 'node:assert/strict';

import { createCallApi } from '../js/ai/call.js';
import { state } from '../js/state.js';

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

function makeApi(overrides = {}) {
  const logs = [];
  const errors = [];
  const warns = [];
  const toasts = [];
  const api = createCallApi({
    log: (m) => logs.push(m),
    logError: (...a) => errors.push(a),
    logWarn: (...a) => warns.push(a),
    showToast: (m) => toasts.push(m),
    t: (key, params = {}) => {
      if (key === 'ai.error.modelNotFound') return 'MODEL_NOT_FOUND';
      if (key === 'ai.error.geminiUnavailable') return 'GEMINI_UNAVAILABLE';
      if (key === 'ai.error.openrouterNoText') return 'OPENROUTER_NO_TEXT';
      if (key === 'ai.error.requestCanceled') return 'REQUEST_CANCELED';
      if (key === 'ai.error.apiTimeout') return `API_TIMEOUT_${params.seconds ?? ''}`;
      if (key === 'ai.error.unknownProvider') return 'UNKNOWN_PROVIDER';
      return key;
    },
    rateInfoFromErrorMessage: () => ({ retryAfterSec: 1 }),
    parseWithOpenRouterNormalization: overrides.parseWithOpenRouterNormalization || (() => ({ missing: [], normalizedUsed: false })),
    ...overrides
  });
  return { api, logs, errors, warns, toasts };
}

test('getFallbackModels uses openrouter cache, deduplicates and caps to 5', () => {
  globalThis.localStorage = makeLocalStorageMock({
    openrouter_free_models_cache: JSON.stringify({
      models: [
        ['m1'],
        { id: 'm2' },
        { value: 'm3' },
        ['m1'],
        { id: 'm4' },
        { id: 'm5' },
        { id: 'm6' }
      ]
    })
  });
  const { api } = makeApi();
  const out = api.getFallbackModels('openrouter');
  assert.deepEqual(out, ['m1', 'm2', 'm3', 'm4', 'm5']);
});

test('getTranslationEngineLabel formats auto-router and fallback labels', () => {
  const { api } = makeApi();
  const autoRouter = api.getTranslationEngineLabel(
    { providerUsed: 'openrouter', requestedModel: 'openrouter/free', resolvedModel: 'meta-x' },
    'openrouter',
    'openrouter/free'
  );
  const fallback = api.getTranslationEngineLabel(
    { providerUsed: 'groq', requestedModel: 'a', resolvedModel: 'b' },
    'groq',
    'a'
  );
  assert.equal(autoRouter, 'openrouter | auto-router -> meta-x');
  assert.equal(fallback, 'groq | b (fallback from a)');
});

test('callOnce returns parsed groq response', async () => {
  globalThis.localStorage = makeLocalStorageMock();
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => '' },
    json: async () => ({
      choices: [{ message: { content: 'OK' } }],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
      model: 'groq-model'
    })
  });
  try {
    const { api } = makeApi();
    const res = await api.callOnce('groq', ' key ', 'groq-model', [{ role: 'user', content: 'x' }]);
    assert.equal(res.content, 'OK');
    assert.equal(res.resolvedModel, 'groq-model');
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test('callOnce throws gemini unavailable on 503', async () => {
  globalThis.localStorage = makeLocalStorageMock();
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    headers: { get: () => '' },
    json: async () => ({ error: { status: 'UNAVAILABLE' } })
  });
  try {
    const { api } = makeApi();
    await assert.rejects(
      () => api.callOnce('gemini', 'k', 'gemini-x', [{ role: 'user', content: 'x' }]),
      /GEMINI_UNAVAILABLE/
    );
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test('callAIWithRetry maps 404 to model-not-found message', async () => {
  globalThis.localStorage = makeLocalStorageMock();
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
    headers: { get: () => '' },
    json: async () => ({ error: { message: 'not found' } })
  });
  try {
    const { api } = makeApi();
    await assert.rejects(
      () => api.callAIWithRetry('groq', 'k', 'missing-model', [{ role: 'user', content: 'x' }]),
      /MODEL_NOT_FOUND/
    );
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test('parseTranslations logs normalization note when used', () => {
  const snapTranslated = state.translated;
  state.translated = {};
  try {
    const { api, logs } = makeApi({
      parseWithOpenRouterNormalization: () => ({ missing: ['G1'], normalizedUsed: true })
    });
    const out = api.parseTranslations('raw', ['G1']);
    assert.deepEqual(out, ['G1']);
    assert.ok(logs.some((m) => String(m).includes('AUTO_NORMALIZOVANO_Z_OPENROUTER_FORMATU')));
  } finally {
    state.translated = snapTranslated;
  }
});

test('parseTranslations returns all keys when parser throws', () => {
  const snapTranslated = state.translated;
  state.translated = {};
  try {
    const { api, errors } = makeApi({
      parseWithOpenRouterNormalization: () => {
        throw new Error('boom');
      }
    });
    const keys = ['G1', 'G2'];
    const out = api.parseTranslations('raw', keys);
    assert.deepEqual(out, keys);
    assert.equal(errors.length > 0, true);
  } finally {
    state.translated = snapTranslated;
  }
});

test('callAIWithRetry shows timeout retry toast and then succeeds', async () => {
  globalThis.localStorage = makeLocalStorageMock();
  let calls = 0;
  const { api, toasts } = makeApi({
    rateInfoFromErrorMessage: () => ({ retryAfterSec: 0 })
  });
  const prevFetch = globalThis.fetch;
  const prevSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms, ...args) => {
    if (Number(ms) >= 60000) return prevSetTimeout(fn, ms, ...args);
    fn(...args);
    return 1;
  };
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      const err = new Error('Request timeout');
      err.name = 'AbortError';
      throw err;
    }
    return {
      ok: true,
      status: 200,
      headers: { get: () => '' },
      json: async () => ({
        choices: [{ message: { content: 'OK' } }],
        usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
        model: 'm1'
      })
    };
  };
  try {
    const out = await api.callAIWithRetry('groq', 'k', 'm1', [{ role: 'user', content: 'x' }]);
    assert.equal(out.content, 'OK');
    assert.ok(toasts.some((m) => String(m).includes('toast.timeout.retryIn')));
  } finally {
    globalThis.fetch = prevFetch;
    globalThis.setTimeout = prevSetTimeout;
  }
});

test('callAIWithRetry on 503 shows service-unavailable retry toast and fails after retries', async () => {
  globalThis.localStorage = makeLocalStorageMock();
  const { api, toasts } = makeApi();
  const prevFetch = globalThis.fetch;
  const prevSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms, ...args) => {
    if (Number(ms) >= 60000) return prevSetTimeout(fn, ms, ...args);
    fn(...args);
    return 1;
  };
  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    headers: { get: () => '' },
    json: async () => ({ error: { message: 'service unavailable' } })
  });
  try {
    await assert.rejects(
      () => api.callAIWithRetry('groq', 'k', 'm1', [{ role: 'user', content: 'x' }]),
      /service unavailable/i
    );
    assert.ok(toasts.some((m) => String(m).includes('toast.serviceUnavailable.retryIn')));
  } finally {
    globalThis.fetch = prevFetch;
    globalThis.setTimeout = prevSetTimeout;
  }
});

test('callAIWithRetry on 429 shows rate-limit toast and fails after retries', async () => {
  globalThis.localStorage = makeLocalStorageMock();
  const { api, toasts } = makeApi({
    rateInfoFromErrorMessage: () => ({ retryAfterSec: 1 })
  });
  const prevFetch = globalThis.fetch;
  const prevSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms, ...args) => {
    if (Number(ms) >= 60000) return prevSetTimeout(fn, ms, ...args);
    fn(...args);
    return 1;
  };
  globalThis.fetch = async () => ({
    ok: false,
    status: 429,
    headers: { get: () => '1' },
    json: async () => ({ error: { message: '429 rate limit' } })
  });
  try {
    await assert.rejects(
      () => api.callAIWithRetry('groq', 'k', 'm1', [{ role: 'user', content: 'x' }]),
      /rateLimitGroq/i
    );
    assert.ok(toasts.some((m) => String(m).includes('toast.rateLimit.waiting')));
  } finally {
    globalThis.fetch = prevFetch;
    globalThis.setTimeout = prevSetTimeout;
  }
});
