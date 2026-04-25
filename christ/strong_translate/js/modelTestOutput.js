import { state } from './state.js';
import { escHtml } from './utils.js';
import { t } from './i18n.js';
import { CONFIG, PROVIDERS } from './config.js';

export function createModelTestOutputApi({ MODEL_TEST_RAW_OUTPUT_KEY, showToast, log, modelTestStopProviderCountdownTicker }) {
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

  return {
    logEntry,
    clearLog,
    saveModelTestOutputTxt,
    saveModelTestRawOutputToStorage,
    clearModelTestRawOutputFromStorage,
    saveModelTestRawOutputTxt,
    loadModelTestOutputFromFile,
    modelTestWaitWithCountdown,
    scrollModelTestOutputIntoView,
    openModelTestModal,
    resetModelTestModal,
    restoreModelTestReportFromBackup,
    formatModelTestParsedBlock,
    appendModelTestExportParsed,
    excerptRawForLastKey,
    appendModelTestLastBatchKeyAudit,
    exportModelTestTranslationsTxt,
  };
}