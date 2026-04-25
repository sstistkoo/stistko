import { state } from './state.js';
import { LEGACY_STORE_KEY, STORE_KEY_PREFIX } from './config.js';

export function computeFileId(parsedEntries) {
  if (!parsedEntries || !parsedEntries.length) return null;
  const first = parsedEntries[0].key;
  const last = parsedEntries[parsedEntries.length - 1].key;
  const n = parsedEntries.length;
  const types = new Set(parsedEntries.slice(0, 50).map(e => e.key[0]));
  const typeTag = types.size === 1 ? [...types][0] : 'X';
  return `${typeTag}_${n}_${first}_${last}`;
}

export function storeKey() {
  return state.currentFileId ? STORE_KEY_PREFIX + state.currentFileId : LEGACY_STORE_KEY;
}

export function backupKey() {
  return storeKey() + '_backup';
}

export function undoKey() {
  return storeKey() + '_undo';
}
