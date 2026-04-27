import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { createExportApi } from '../js/exportData.js';

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

function setupDom() {
  const dom = new JSDOM('<html><body></body></html>');
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevLocalStorage = globalThis.localStorage;
  const prevURL = globalThis.URL;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = makeLocalStorageMock({ strong_ui_lang: 'en' });

  const captured = { blobs: [], links: [] };
  globalThis.URL = {
    ...prevURL,
    createObjectURL(blob) {
      captured.blobs.push(blob);
      return 'blob:test';
    }
  };

  const originalCreateElement = document.createElement.bind(document);
  document.createElement = (tag) => {
    if (tag.toLowerCase() === 'a') {
      const link = { href: '', download: '', clicked: false, click() { this.clicked = true; } };
      captured.links.push(link);
      return link;
    }
    return originalCreateElement(tag);
  };

  return {
    captured,
    restore() {
      globalThis.window = prevWindow;
      globalThis.document = prevDocument;
      globalThis.localStorage = prevLocalStorage;
      globalThis.URL = prevURL;
    }
  };
}

function makeApi(state, toasts) {
  return createExportApi({
    state,
    showToast: (m) => toasts.push(m),
    t: (key, params = {}) => {
      if (key === 'export.field.grammar') return 'Grammar';
      if (key === 'export.field.meaning') return `Meaning (${params.lang || ''})`;
      if (key === 'export.field.definitionEn') return 'Definition (EN)';
      if (key === 'export.field.definition') return `Definition (${params.lang || ''})`;
      if (key === 'export.field.kjv') return `KJV (${params.lang || ''})`;
      if (key === 'export.field.usage') return 'Usage';
      if (key === 'export.field.origin') return 'Origin';
      if (key === 'export.field.specialist') return 'Specialist';
      if (key === 'toast.noTranslatedEntry') return 'NO_TRANSLATED';
      if (key === 'toast.exported.count') return `EXPORTED_${params.count}`;
      if (key === 'prompt.range.from') return 'FROM';
      if (key === 'prompt.range.to') return 'TO';
      if (key === 'toast.noTranslatedInRange') return `NO_RANGE_${params.from}_${params.to}`;
      if (key === 'toast.exported.range') return `EXPORTED_RANGE_${params.count}`;
      return key;
    }
  });
}

test('exportJSON exports translated entries and shows count toast', async () => {
  const env = setupDom();
  const toasts = [];
  try {
    const state = {
      entries: [{ key: 'G1', greek: 'alpha' }, { key: 'G2', greek: 'beta' }],
      translated: { G1: { vyznam: 'v1' } }
    };
    const api = makeApi(state, toasts);
    api.exportJSON();

    assert.equal(env.captured.links.length, 1);
    assert.equal(env.captured.links[0].download, 'strong_gr_cz_v2.json');
    const text = await env.captured.blobs[0].text();
    const parsed = JSON.parse(text);
    assert.deepEqual(parsed, { G1: { greek: 'alpha', vyznam: 'v1' } });
    assert.ok(toasts.includes('EXPORTED_1'));
  } finally {
    env.restore();
  }
});

test('exportTXT exports only done entries and uses UI language tag', async () => {
  const env = setupDom();
  const toasts = [];
  try {
    const state = {
      entries: [
        { key: 'G1', greek: 'alpha', definice: 'def en', vyskyt: 'use src' },
        { key: 'G2', greek: 'beta', definice: 'def en 2', vyskyt: 'use src 2' }
      ],
      translated: {
        G1: { vyznam: 'meaning 1', definice: 'def 1', pouziti: 'usage 1', puvod: 'origin 1', specialista: 'spec 1', kjv: 'kjv 1' },
        G2: { vyznam: '—', definice: 'def 2' }
      }
    };
    const api = makeApi(state, toasts);
    api.exportTXT();

    assert.equal(env.captured.links.length, 1);
    assert.equal(env.captured.links[0].download, 'strong_gr_cz_v2.txt');
    const text = await env.captured.blobs[0].text();
    assert.match(text, /Meaning \(EN\): meaning 1/);
    assert.doesNotMatch(text, /G2 \| beta/);
    assert.ok(toasts.includes('EXPORTED_1'));
  } finally {
    env.restore();
  }
});

test('exportTXT shows no-data toast when nothing is translated', () => {
  const env = setupDom();
  const toasts = [];
  try {
    const state = { entries: [{ key: 'G1', greek: 'alpha' }], translated: {} };
    const api = makeApi(state, toasts);
    api.exportTXT();
    assert.equal(env.captured.links.length, 0);
    assert.ok(toasts.includes('NO_TRANSLATED'));
  } finally {
    env.restore();
  }
});

test('exportRange filters by prompt range and exports matching entries', async () => {
  const env = setupDom();
  const toasts = [];
  const prevPrompt = globalThis.prompt;
  let promptCalls = 0;
  globalThis.prompt = () => {
    promptCalls += 1;
    return promptCalls === 1 ? '2' : '3';
  };
  try {
    const state = {
      entries: [
        { key: 'G1', greek: 'alpha' },
        { key: 'G2', greek: 'beta' },
        { key: 'G3', greek: 'gamma' }
      ],
      translated: {
        G1: { vyznam: 'm1', definice: 'd1' },
        G2: { vyznam: 'm2', definice: 'd2', pouziti: 'u2', puvod: 'o2' },
        G3: { vyznam: 'm3', definice: 'd3', pouziti: 'u3', puvod: 'o3' }
      }
    };
    const api = makeApi(state, toasts);
    api.exportRange();

    assert.equal(env.captured.links.length, 1);
    assert.equal(env.captured.links[0].download, 'strong_gr_cz_G2-G3.txt');
    const text = await env.captured.blobs[0].text();
    assert.match(text, /G2 \| beta/);
    assert.match(text, /G3 \| gamma/);
    assert.doesNotMatch(text, /G1 \| alpha/);
    assert.ok(toasts.includes('EXPORTED_RANGE_2'));
  } finally {
    globalThis.prompt = prevPrompt;
    env.restore();
  }
});

test('exportRange returns early on invalid numeric prompt input', () => {
  const env = setupDom();
  const toasts = [];
  const prevPrompt = globalThis.prompt;
  globalThis.prompt = () => 'abc';
  try {
    const state = {
      entries: [{ key: 'G1', greek: 'alpha' }],
      translated: { G1: { vyznam: 'm1', definice: 'd1' } }
    };
    const api = makeApi(state, toasts);
    api.exportRange();
    assert.equal(env.captured.links.length, 0);
    assert.equal(toasts.length, 0);
  } finally {
    globalThis.prompt = prevPrompt;
    env.restore();
  }
});

test('exportRange shows no-data toast when no translated items in selected range', () => {
  const env = setupDom();
  const toasts = [];
  const prevPrompt = globalThis.prompt;
  let promptCalls = 0;
  globalThis.prompt = () => {
    promptCalls += 1;
    return promptCalls === 1 ? '10' : '20';
  };
  try {
    const state = {
      entries: [{ key: 'G1', greek: 'alpha' }, { key: 'G2', greek: 'beta' }],
      translated: { G1: { vyznam: 'm1', definice: 'd1' }, G2: { vyznam: 'm2', definice: 'd2' } }
    };
    const api = makeApi(state, toasts);
    api.exportRange();
    assert.equal(env.captured.links.length, 0);
    assert.ok(toasts.includes('NO_RANGE_G10_G20'));
  } finally {
    globalThis.prompt = prevPrompt;
    env.restore();
  }
});
