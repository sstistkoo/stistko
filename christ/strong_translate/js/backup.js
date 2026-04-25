import { state } from './state.js';
import { storeKey, backupKey, undoKey } from './storage.js';

export function createBackupApi({ renderList, updateStats, showToast, t, logError }) {

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

  return { saveProgressImmediate, writeBackup, maybeAutoBackup, hasUndo, restoreFromBackup, clearProgress };
}
