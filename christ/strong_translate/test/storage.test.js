import test from 'node:test';
import assert from 'node:assert/strict';

import { state } from '../js/state.js';
import {
  safeSetLocalStorage,
  safeRemoveLocalStorage,
  computeFileId,
  storeKey,
  backupKey,
  undoKey
} from '../js/storage.js';
import { STORE_KEY_PREFIX } from '../js/config.js';

function makeLocalStorageMock({ throwOnSet = false, throwOnRemove = false } = {}) {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      if (throwOnSet) throw new Error('set fail');
      data.set(key, String(value));
    },
    removeItem(key) {
      if (throwOnRemove) throw new Error('remove fail');
      data.delete(key);
    }
  };
}

test('safeSetLocalStorage returns true on success', () => {
  globalThis.localStorage = makeLocalStorageMock();
  const ok = safeSetLocalStorage('a', '1', 'test');
  assert.equal(ok, true);
  assert.equal(globalThis.localStorage.getItem('a'), '1');
});

test('safeSetLocalStorage returns false when set throws', () => {
  globalThis.localStorage = makeLocalStorageMock({ throwOnSet: true });
  const ok = safeSetLocalStorage('a', '1', 'test');
  assert.equal(ok, false);
});

test('safeRemoveLocalStorage removes key on success', () => {
  globalThis.localStorage = makeLocalStorageMock();
  globalThis.localStorage.setItem('x', '42');
  safeRemoveLocalStorage('x', 'test');
  assert.equal(globalThis.localStorage.getItem('x'), null);
});

test('safeRemoveLocalStorage swallows remove errors', () => {
  globalThis.localStorage = makeLocalStorageMock({ throwOnRemove: true });
  assert.doesNotThrow(() => safeRemoveLocalStorage('x', 'test'));
});

test('computeFileId returns null for empty input', () => {
  assert.equal(computeFileId([]), null);
  assert.equal(computeFileId(null), null);
});

test('computeFileId builds expected id for same type keys', () => {
  const id = computeFileId([
    { key: 'G1' },
    { key: 'G2' },
    { key: 'G3' }
  ]);
  assert.equal(id, 'G_3_G1_G3');
});

test('computeFileId uses X when mixed key types are present', () => {
  const id = computeFileId([
    { key: 'G1' },
    { key: 'H2' }
  ]);
  assert.equal(id, 'X_2_G1_H2');
});

test('storeKey/backupKey/undoKey respect currentFileId', () => {
  const prev = state.currentFileId;
  state.currentFileId = 'G_2_G1_G2';
  try {
    assert.equal(storeKey(), `${STORE_KEY_PREFIX}G_2_G1_G2`);
    assert.equal(backupKey(), `${STORE_KEY_PREFIX}G_2_G1_G2_backup`);
    assert.equal(undoKey(), `${STORE_KEY_PREFIX}G_2_G1_G2_undo`);
  } finally {
    state.currentFileId = prev;
  }
});
