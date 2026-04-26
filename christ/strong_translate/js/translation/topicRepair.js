import { PROVIDERS } from '../config.js';
import { isSideFallbackAborted, sleepMsWithAbort } from '../ai/fallback.js';
import { hasMeaningfulValue, isDefinitionLowQuality, isDefinitionLikelyEnglish } from './utils.js';
import { getResolvedSystemMessage, getResolvedDefaultPrompt } from '../aiPromptsResolve.js';

export function createTopicRepairApi(deps) {
  const {
    state, t, escHtml,
    log, logError,
    showToast,
    saveProgress,
    renderList, renderDetail, updateStats,
    TOPIC_LABELS, TOPIC_PROMPT_PRESET_MAP,
    callAIWithRetry,
    getPipelineModelForProvider, getCurrentApiKey,
    enforceSpecialistaFormat,
    parseWithOpenRouterNormalization, applyFallbacksToParsedMap,
    isAutoProviderEnabled,
    resolveProviderForInteractiveAction,
    getFailedTopicsForFallback, getMissingTopicsForRepair,
    cloneTranslationTopicFields, shouldReplaceTopicValue,
    getProviderCooldownLeftSec,
    appendModelTestUsage,
    buildModelTestMessages,
    getModelTestPromptCatalog,
  } = deps;
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
    bulkRunBtn.textContent = state.topicRepairBulkRunning ? t('topicRepair.bulk.stop') : t('topicRepair.bulk.button');
  }
  const rows = vis.map(task => {
    const idx = topicRepairState.tasks.indexOf(task);
    const extraTopicsForUi = (Array.isArray(task.detectedTopics) ? task.detectedTopics : [])
      .filter(row => row && row.topicId && row.topicId !== 'specialista' && row.topicId !== task.topicId);
    const rhOther = (Array.isArray(task.rawHeaderTopics) ? task.rawHeaderTopics : []).filter(id => id && id !== task.topicId);
    const rawHeadersHint = (task.status === 'done' || task.status === 'failed') && rhOther.length > 0
      ? `<div style="font-size:10px;color:var(--acc2);margin-top:6px">📎 ${t('topicRepair.rawHeaders.found', { headers: rhOther.map(id => escHtml(TOPIC_LABELS[id] || id)).join(', ') })}${extraTopicsForUi.length ? '' : ` — ${t('topicRepair.rawHeaders.checkLogHint')}`}</div>`
      : '';
    const statusColor = task.status === 'done' ? 'var(--acc3)' : (task.status === 'failed' ? 'var(--red)' : (task.status === 'running' ? 'var(--ylw)' : 'var(--txt3)'));
    const statusText = task.status === 'done' ? t('topicRepair.taskStatus.done') : (task.status === 'failed' ? t('topicRepair.taskStatus.failed') : (task.status === 'running' ? t('topicRepair.taskStatus.running') : t('topicRepair.taskStatus.waiting')));
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
          <span style="font-size:11px;color:${statusColor}">${statusText}${task.provider ? ` · ${task.provider}` : ''}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="font-size:11px;color:var(--txt2)">
            <div><b>${t('topicRepair.originalTopic')}</b> ${escHtml(task.currentValue || '—')}</div>
            <div style="margin-top:4px"><b>${t('topicRepair.original')}</b> ${escHtml(task.sourceValue || '—')}</div>
          </div>
          <div style="font-size:11px;color:var(--txt)">
            <div><b>${t('topicRepair.newProposal')}</b> ${escHtml(task.candidateValue || '—')}</div>
            ${formatTopicRepairQuickCompare(task.topicId, task.currentValue, task.candidateValue)}
            ${rawHeadersHint}
            <div style="margin-top:4px;color:var(--txt2)">
              <b>${t('topicRepair.specialistInResponse')}</b> ${task.specialistaInRaw ? t('topicRepair.yes') : t('topicRepair.no')}
              ${task.specialistaInRaw ? ` · <b>${t('topicRepair.status')}</b> ${escHtml(task.specialistaDecision || t('topicRepair.unchanged'))}` : ''}
            </div>
            ${task.specialistaInRaw ? `
              <details style="margin-top:6px;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;padding:6px">
                <summary style="cursor:pointer;color:var(--acc)">${t('topicRepair.specialistDetail')}</summary>
                <div style="margin-top:6px;color:var(--txt2)"><b>${t('topicRepair.originalSpecialist')}</b> ${escHtml(task.specialistaPreviousValue || '—')}</div>
                <div style="margin-top:6px;color:var(--txt)"><b>${t('topicRepair.aiSpecialist')}</b> ${escHtml(task.specialistaCandidateValue || '—')}</div>
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
                    <div style="font-size:11px;color:var(--txt2)"><b>${escHtml(TOPIC_LABELS[row.topicId] || row.topicId)}</b> · ${t('topicRepair.status')} ${escHtml(row.decision || t('topicRepair.unchanged'))}</div>
                    <div style="margin-top:4px;color:var(--txt2)"><b>${t('topicRepair.originalShort')}</b> ${escHtml(row.previousValue || '—')}</div>
                    <div style="margin-top:4px;color:var(--txt)"><b>${t('topicRepair.aiShort')}</b> ${escHtml(row.candidateValue || '—')}</div>
                    ${formatTopicRepairQuickCompare(row.topicId, row.previousValue, row.candidateValue)}
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
                      <button class="hbtn grn" onclick="setTopicRepairDetectedTopicDecision(${idx}, '${row.topicId}', 'accept')">${t('topicRepair.confirm')}</button>
                      <button class="hbtn red" onclick="setTopicRepairDetectedTopicDecision(${idx}, '${row.topicId}', 'reject')">${t('topicRepair.reject')}</button>
                    </div>
                  </div>
                `).join('')}
              </details>
            ` : ''}
            ${task.error ? `<div style="margin-top:4px;color:var(--red)">✗ ${escHtml(task.error)}</div>` : ''}
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
        <h2 style="color:var(--acc);margin:0">${t('topicRepair.modal.title', { count: topicRepairState.tasks.length })}</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="hbtn" id="topicRepairMinimizeBtn" onclick="minimizeTopicRepairModal()">${t('topicRepair.modal.minimize')}</button>
          <button class="hbtn" onclick="closeTopicRepairModalOnly()">${t('topicRepair.modal.closeWindow')}</button>
        </div>
      </div>
      <div style="font-size:11px;color:var(--txt2);margin:8px 0 10px 0">${t('topicRepair.modal.missingHint')}</div>
      <div style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;padding:10px;margin-bottom:10px">
        <div style="font-size:12px;color:var(--txt);margin-bottom:8px"><b>${t('topicRepair.modal.modeTitle')}</b></div>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--txt2)">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="radio" name="topicRepairStrategy" id="topicRepairStrategySeq" value="sequential" ${state.repairStrategy === 'sequential' ? 'checked' : ''} onchange="setTopicRepairStrategy('sequential')" style="accent-color:var(--acc)">
            ${t('topicRepair.modal.modeSequential')}
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="radio" name="topicRepairStrategy" id="topicRepairStrategyBulk" value="bulk" ${state.repairStrategy === 'bulk' ? 'checked' : ''} onchange="setTopicRepairStrategy('bulk')" style="accent-color:var(--acc)">
            ${t('topicRepair.modal.modeBulk')}
          </label>
        </div>
        <div id="topicRepairBulkStrategyHint" style="margin-top:8px;font-size:11px;color:var(--txt3);display:${state.repairStrategy === 'bulk' ? 'block' : 'none'}">${t('topicRepair.modal.bulkHint')}</div>
      </div>
      <div style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;padding:10px;margin-bottom:10px">
        <div id="topicRepairStatus" style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--txt3)">—</div>
        <div style="display:grid;gap:2px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--txt2);margin-top:6px">
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="topicRepairEnable_groq" ${topicRepairState.providerEnabled.groq ? 'checked' : ''} onchange="applyTopicRepairProviderCheckboxes()" style="accent-color:var(--acc)">G <span id="topicRepairProvider_groq">Groq: —</span></label>
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="topicRepairEnable_gemini" ${topicRepairState.providerEnabled.gemini ? 'checked' : ''} onchange="applyTopicRepairProviderCheckboxes()" style="accent-color:var(--acc)">Gm <span id="topicRepairProvider_gemini">Google: —</span></label>
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="topicRepairEnable_openrouter" ${topicRepairState.providerEnabled.openrouter ? 'checked' : ''} onchange="applyTopicRepairProviderCheckboxes()" style="accent-color:var(--acc)">OR <span id="topicRepairProvider_openrouter">OpenRouter: —</span></label>
        </div>
      </div>
      <details id="topicRepairBulkDetails" style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;padding:10px;margin-bottom:10px" ${state.repairStrategy === 'bulk' ? 'open' : ''}>
        <summary style="cursor:pointer;color:var(--acc)">${t('topicRepair.modal.bulkSectionTitle')}</summary>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:8px">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--txt3);cursor:pointer">
            <input type="checkbox" id="topicRepairBulkOnlyFailed" checked style="accent-color:var(--acc)">
            ${t('topicRepair.modal.onlyFailed')}
          </label>
          <button class="hbtn" type="button" onclick="setTopicRepairBulkIncludeAll(true)">${t('topicRepair.modal.batchAll')}</button>
          <button class="hbtn" type="button" onclick="setTopicRepairBulkIncludeAll(false)">${t('topicRepair.modal.batchNone')}</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:10px;font-size:12px;color:var(--txt2)">
          <label style="display:flex;align-items:center;gap:6px">${t('topicRepair.modal.batchSize')}
            <input type="number" id="topicRepairBulkBatchInput" min="1" max="100" step="1" style="width:64px;padding:4px 6px;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;color:var(--txt);font-family:'JetBrains Mono',monospace;font-size:12px" title="${escHtml(t('topicRepair.modal.batchSize.title'))}" oninput="syncTopicRepairBulkRunInputsToHidden()">
          </label>
          <label style="display:flex;align-items:center;gap:6px">${t('topicRepair.modal.interval')}
            <input type="number" id="topicRepairBulkIntervalInput" min="0" max="600" step="1" style="width:64px;padding:4px 6px;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;color:var(--txt);font-family:'JetBrains Mono',monospace;font-size:12px" title="${escHtml(t('topicRepair.modal.interval.title'))}" oninput="syncTopicRepairBulkRunInputsToHidden()">
          </label>
          <span id="topicRepairBulkRunSummary" style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--txt3)"></span>
        </div>
        <div style="margin-top:8px">
          <div style="font-size:11px;color:var(--txt2);margin-bottom:6px">${t('topicRepair.modal.batchPromptHelp')}</div>
          <textarea id="topicRepairBatchPrompt" style="width:100%;min-height:160px;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;color:var(--txt);padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.45"></textarea>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
            <button class="hbtn" type="button" onclick="saveTopicRepairBatchPromptDraft()">${t('topicRepair.modal.savePrompt')}</button>
            <button class="hbtn" type="button" onclick="resetTopicRepairBatchPromptToDefault()">${t('topicRepair.modal.defaultFromCatalog')}</button>
            <button class="hbtn grn" id="topicRepairBulkRunBtn" type="button" onclick="runTopicRepairBulkTranslation()">${t('topicRepair.modal.bulkRunSelected')}</button>
          </div>
          <div style="font-size:11px;color:var(--txt3);margin-top:8px">
            ${t('topicRepair.modal.tipPauseFirst')}
          </div>
        </div>
      </details>
      <div style="background:var(--bg3);border:1px solid var(--brd);border-radius:6px;padding:10px;margin-bottom:10px">
        <div style="font-size:12px;color:var(--txt);margin-bottom:6px"><b>${t('topicRepair.modal.topicInListTitle')}</b> — ${t('topicRepair.modal.topicInListHint')}</div>
        <label style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--txt2);flex-wrap:wrap">
          <span style="white-space:nowrap">${t('topicRepair.modal.select')}</span>
          <select id="topicRepairBulkTopicSelect" onchange="refreshTopicRepairBatchPromptEditor()" style="min-width:240px;flex:1;max-width:100%;background:var(--bg2);border:1px solid var(--brd);border-radius:4px;color:var(--txt);padding:6px;font-size:12px">
            <option value="all" ${state.bulkTopicId === 'all' ? 'selected' : ''}>${t('topicRepair.modal.all')}</option>
            <option value="definice" ${state.bulkTopicId === 'definice' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.definice)}</option>
            <option value="vyznam" ${state.bulkTopicId === 'vyznam' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.vyznam)}</option>
            <option value="kjv" ${state.bulkTopicId === 'kjv' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.kjv)}</option>
            <option value="pouziti" ${state.bulkTopicId === 'pouziti' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.pouziti)}</option>
            <option value="puvod" ${state.bulkTopicId === 'puvod' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.puvod)}</option>
            <option value="specialista" ${state.bulkTopicId === 'specialista' ? 'selected' : ''}>${escHtml(TOPIC_LABELS.specialista)}</option>
          </select>
        </label>
        <div id="topicRepairBulkListFilterRow" style="display:${state.bulkTopicId === 'all' ? 'flex' : 'none'};flex-wrap:wrap;gap:10px 14px;align-items:center;width:100%;margin-top:10px;padding-top:10px;border-top:1px solid var(--brd);font-size:11px;color:var(--txt2)">
          <span style="width:100%;margin-bottom:2px">${t('topicRepair.modal.allLimitTypes')}</span>
          ${TOPIC_REPAIR_BULK_TOPIC_ORDER.map(tid => {
            const on = (state.bulkListTopicFilter || defaultBulkListTopicFilter())[tid] !== false;
            return `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap"><input type="checkbox" ${on ? 'checked' : ''} onchange="toggleTopicRepairBulkListFilter('${tid}', this.checked)" style="accent-color:var(--acc)">${escHtml(TOPIC_LABELS[tid] || tid)}</label>`;
          }).join('')}
        </div>
        <div style="font-size:10px;color:var(--txt3);margin-top:8px">${t('topicRepair.modal.batchPromptSectionHint')}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
        <button class="hbtn grn" id="topicRepairStartSequentialBtn" type="button" onclick="startTopicRepairSequentialWorker()">${t('topicRepair.modal.startSequential')}</button>
        <button class="hbtn grn" id="topicRepairToggleBtn" onclick="toggleTopicRepairRun()">${t('topicRepair.pause')}</button>
        <button class="hbtn grn" id="topicRepairApplyBtn" onclick="applyTopicRepairSelected()">${t('topicRepair.applyOverwrite', { count: 0 })}</button>
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
            { role: 'system', content: getResolvedSystemMessage() },
            { role: 'user', content: buildTopicPrompt(nextTask.key, nextTask.topicId) }
          ];
          const raw = await callAIWithRetry(prov, apiKey, model, messages);
          const rawText = String(raw?.content || '').trim();
          log(t('topicRepair.log.rawRepairPrinted', { key: nextTask.key, topic: nextTask.topicId }));
          console.groupCollapsed(`🤖 RAW AI oprava ${nextTask.key}.${nextTask.topicId} (${prov}/${model})`);
          console.log(rawText || t('topicRepair.log.emptyResponse'));
          console.groupEnd();

          // Kontrola dalších témat: zobraz jen skutečně označená pole v RAW odpovědi (striktní parser).
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
              decision: acceptAuto ? t('topicRepair.decision.acceptAuto') : t('topicRepair.decision.rejectAuto')
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
            log(`⚠ ${nextTask.key}: v RAW je nadpis SPECIALISTA, ale tělo se nepodařilo strojově vyčíst — viz konzole RAW.`);
          }
          if (shouldReplaceSpecialista(prevSpecialista, candidateSpecialista)) {
            state.translated[nextTask.key].specialista = String(candidateSpecialista || '').trim();
            nextTask.specialistaDecision = t('topicRepair.decision.acceptAuto');
            log(t('topicRepair.log.specialistAutoUpgradeRepair', { key: nextTask.key }));
          } else if (nextTask.specialistaInRaw) {
            nextTask.specialistaDecision = t('topicRepair.decision.rejectAuto');
          } else {
            nextTask.specialistaDecision = '';
          }

          const hdrOther = (nextTask.rawHeaderTopics || []).filter(id => id !== nextTask.topicId);
          const hdrLabels = hdrOther.map(id => TOPIC_LABELS[id] || id).join(', ') || '—';
          const dtIds = (nextTask.detectedTopics || []).map(d => TOPIC_LABELS[d.topicId] || d.topicId).join(', ') || '—';
          log(`📎 ${nextTask.key} · „${TOPIC_LABELS[nextTask.topicId] || nextTask.topicId}“: v RAW bloky [${hdrLabels}] → další témata (UI): [${dtIds}] · SPECIALISTA: ${nextTask.specialistaInRaw ? 'ano' : 'ne'}`);

          const candidate = extractTopicValueFromAI(raw?.content || '', nextTask.topicId, 'strict');
          if (!hasMeaningfulValue(candidate)) {
            throw new Error(t('topicRepair.error.emptyAiResult'));
          }
          nextTask.provider = prov;
          nextTask.candidateValue = String(candidate || '').trim();
          nextTask.checked = shouldAutoCheckTopicRepairTask(nextTask.topicId, nextTask.currentValue, nextTask.candidateValue);
          nextTask.status = 'done';
          success = true;
          log(t('topicRepair.log.topicRepairedVia', { key: nextTask.key, topic: nextTask.topicId, provider: prov }));
          break;
        } catch (e) {
          nextTask.error = e.message || t('topicRepair.error.unknown');
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
    task.specialistaDecision = t('topicRepair.decision.acceptManual');
    showToast(t('toast.specialista.approved', { key: task.key }));
  } else {
    state.translated[task.key].specialista = String(task.specialistaPreviousValue || '').trim();
    task.specialistaDecision = t('topicRepair.decision.rejectManual');
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
    row.decision = t('topicRepair.decision.acceptManual');
    showToast(t('toast.topic.approved', { topic: TOPIC_LABELS[topicId] || topicId, key: task.key }));
  } else {
    state.translated[task.key][topicId] = String(row.previousValue || '').trim();
    row.decision = t('topicRepair.decision.rejectManual');
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
    log(`✓ Potvrzeno přepsání témat v opravě: ${applied} řádků`);
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


const TOPIC_BATCH_PROMPT_PRESET_MAP = {
  vyznam: 'preset_topic_vyznam_batch',
  definice: 'preset_topic_definice_batch',
  kjv: 'preset_topic_kjv_batch',
  pouziti: 'preset_topic_pouziti_batch',
  puvod: 'preset_topic_puvod_batch',
  specialista: 'preset_topic_specialista_batch'
};

/** Pořadí témat při hromadné opravě „Vše“. */
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

/** Další čekající úloha v pořadí `topicRepairState.tasks`, ale jen pokud spadá do aktuálního filtru tématu. */
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
  const keyMap = {
    cz: 'lang.name.genitive.cz',
    cs: 'lang.name.genitive.cz',
    en: 'lang.name.genitive.en',
    bg: 'lang.name.genitive.bg',
    ch: 'lang.name.genitive.ch',
    sp: 'lang.name.genitive.sp',
    sk: 'lang.name.genitive.sk',
    pl: 'lang.name.genitive.pl',
    gr: 'lang.name.genitive.gr',
    he: 'lang.name.genitive.he',
    both: 'lang.name.genitive.both'
  };
  const targetName = t(keyMap[String(targetLang || '').toLowerCase()] || 'lang.name.genitive.cz');
  const sourceName = t(keyMap[String(sourceLang || '').toLowerCase()] || 'lang.name.genitive.gr');
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
    ta.value = t('topicRepair.bulk.allModeHelp');
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

/** Výřez bloku jednoho hesla z hromadné RAW odpovědi (pro parsování SPECIALISTA apod.). */
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

/** Naplní specialista* u tasku z libovolného RAW (dávka = jen blok ###G12###…). */
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
    log(`⚠ ${task.key} (dávka): v bloku je nadpis SPECIALISTA/alias, ale tělo se nepodařilo strojově vyčíst — viz konzole RAW.`);
  }
  state.translated[task.key] = state.translated[task.key] || {};
  if (shouldReplaceSpecialista(prevSpecialista, candidateSpecialista)) {
    state.translated[task.key].specialista = String(candidateSpecialista || '').trim();
    task.specialistaDecision = t('topicRepair.decision.acceptAuto');
  } else if (task.specialistaInRaw) {
    task.specialistaDecision = t('topicRepair.decision.rejectAuto');
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
  el.textContent = t('topicRepair.bulk.summaryLikeAuto', { batch: bs, seconds: iv });
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

/** Jedno téma — vnitřní smyčka dávek (režim „Vše“ i jedno téma z editoru). */
async function runTopicRepairBulkTranslationCore(state, topicId, promptTemplate, onlyFailed, bs) {
  const tasks = state.tasks.filter(t => t && t.topicId === topicId && t.includeBulk !== false);
  const picked = onlyFailed
    ? tasks.filter(t => t.status === 'failed' || !hasMeaningfulValue(t.candidateValue))
    : tasks;
  const keys = picked.map(t => t.key);
  if (!keys.length) return { count: 0 };

  const iv0 = parseInt(document.getElementById('intervalRun')?.value, 10) || 20;
  log(t('topicRepair.log.bulkRepairStart', { topic: TOPIC_LABELS[topicId] || topicId, count: keys.length, batch: bs, seconds: iv0 }));

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
      { role: 'system', content: getResolvedSystemMessage() },
      { role: 'user', content: enforceSpecialistaFormat(userContent) }
    ]);
    if (abortVersion !== Number(state.topicRepairBulkAbortVersion || 0)) break;

    const rawText = String(raw?.content || '').trim();
    log(t('topicRepair.log.rawBatchPrinted', { topic: topicId }));
    console.groupCollapsed(`🤖 RAW AI batch oprava ${topicId} (${prov}/${model})`);
    console.log(rawText || t('topicRepair.log.emptyResponse'));
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
        task.error = t('topicRepair.error.noValueForEntry');
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
    showToast(t('toast.topicRepair.bulkStopping'));
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
    bulkBtn.textContent = t('topicRepair.bulk.stop');
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
          log(`⚠ Přeskočeno téma ${topicId} — prázdný uložený batch prompt.`);
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
  return String(getModelTestPromptCatalog()?.[topicType]?.template || '').trim();
}

function getTopicPromptTemplate(topicId) {
  const promptType = TOPIC_PROMPT_PRESET_MAP[topicId] || '';
  const fromTopicPreset = getTopicPromptTemplateByPromptType(promptType);
  if (fromTopicPreset) return fromTopicPreset;
  return String(localStorage.getItem('strong_prompt') || getResolvedDefaultPrompt() || '').trim();
}

function syncTopicPromptTemplatesReport() {
  const mismatched = Object.entries(TOPIC_PROMPT_PRESET_MAP).filter(([topicId, promptType]) => {
    const fromCatalog = String(getModelTestPromptCatalog()?.[promptType]?.template || '').trim();
    const fromDetailBase = String(getTopicPromptTemplate(topicId) || '').trim();
    return !fromCatalog || fromCatalog !== fromDetailBase;
  });
  if (mismatched.length > 0) {
    log(`⚠ Topic prompt sync: ${mismatched.map(([topicId]) => topicId).join(', ')}`);
  } else {
    log('✓ Topic prompt sync: testy/detail jsou 1:1');
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

POŽADAVEK NA STYL:
- Vrať detailní exegetický odstavec (3-5 vět), jako biblický specialista.
- Vysvětli význam slova v širším biblickém a teologickém kontextu.
- Bez odrážek, bez číslování, bez dalších polí.`
    : '';

  return `${enforceSpecialistaFormat(promptTemplate)}

---
TEĎ PŘELOŽ POUZE JEDNO TÉMA.
- Heslo: ${key}
- Pole: ${topicLabel} (${topicId})
- Vrať jen čistý text pro toto jedno pole bez dalších sekcí.

Zdrojová data:
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
  if (currentInput) currentInput.value = state.topicPromptState.currentValue || '—';
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
      { role: 'system', content: getResolvedSystemMessage() },
      { role: 'user', content: customPrompt }
    ];
    const raw = await callAIWithRetry(prov, apiKey, model, messages);
    const rawText = String(raw?.content || '').trim();
    resultInput.value = rawText;
    log(t('topicRepair.log.topicTranslationEngine', { engine: getTranslationEngineLabel(raw, prov, model) }));
    log(t('topicRepair.log.rawTopicPrinted', { key: state.topicPromptState.key, topic: state.topicPromptState.topicId }));
    console.groupCollapsed(`🤖 RAW AI ${state.topicPromptState.key}.${state.topicPromptState.topicId}`);
    console.log(rawText || t('topicRepair.log.emptyResponse'));
    console.groupEnd();
  } catch (e) {
    logError('runTopicPromptAI', e, { key: state.topicPromptState.key, topic: state.topicPromptState.topicId });
    showToast(t('toast.error.withMessage', { message: e.message }));
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = t('topicPrompt.send');
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
    showToast(t('toast.topicPrompt.definitionLowQuality'));
    return;
  }
  if (hasMeaningfulValue(prevValue) && !shouldReplaceTopicValue(topicId, prevValue, val)) {
    if (topicId === 'specialista') {
      showToast(t('toast.topicPrompt.specialistNotBetter'));
    } else {
      showToast(t('toast.topicPrompt.fieldNotBetter', { topic: TOPIC_LABELS[topicId] || topicId }));
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
    log(`🧠 SPECIALISTA auto-upgrade ${key}: použit kvalitnější text z AI odpovědi`);
  }

  // Pokud AI vrátí i další témata, zkus je bezpečně sloučit (jen když jsou kvalitnější).
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
    log(`✨ DETAIL auto-merge ${key}.${extraTopicId}: aplikováno z jedné AI odpovědi`);
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
  const biblicalHints = (t.match(/\b(Bůh|Kristus|Ježíš|evangelium|hřích|spása|soud|milost|víra|teolog|teologie|biblick|zjevení|žalm|job|přísloví|nový zákon|starý zákon)\b/gi) || []).length;
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
  return (String(text || '').match(/[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮݎ]/g) || []).length;
}

function countEnglishNoiseWords(text) {
  return (String(text || '').match(/\b(the|and|which|used|only|without|see|word|in|of|to)\b/gi) || []).length;
}

function countBracketRefs(text) {
  return (String(text || '').match(/\[[^\]]{2,}\]/g) || []).length;
}

function scoreTopicRepairText(topicId, text) {
  const t = String(text || '').trim();
  if (!hasMeaningfulValue(t)) return { score: 0, notes: [t('topicRepair.analysis.note.empty')] };
  const notes = [];
  let score = 0;

  if (topicId === 'definice') {
    const len = t.length;
    score += Math.min(6, Math.floor(len / 120));
    score += Math.min(3, countBracketRefs(t));
    score += Math.min(3, Math.floor(countCzDiacritics(t) / 6));
    if (isDefinitionLowQuality(t)) {
      score -= 8;
      notes.push(t('topicRepair.analysis.note.definitionLowQuality'));
    }
    if (isDefinitionLikelyEnglish(t)) {
      score -= 6;
      notes.push(t('topicRepair.analysis.note.definitionEnglishTone'));
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
      notes.push(t('topicRepair.analysis.note.meaningTooLong'));
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
    if (refs === 0) notes.push(t('topicRepair.analysis.note.usageFewRefs'));
    return { score, notes };
  }

  if (topicId === 'puvod') {
    score += Math.min(5, Math.floor(t.length / 60));
    score += Math.min(3, Math.floor(countCzDiacritics(t) / 5));
    score -= Math.min(4, countEnglishNoiseWords(t));
    if (!/(řec|hebr|lat|sém|indoev|kořen|odvoz)/i.test(t)) notes.push(t('topicRepair.analysis.note.originMissingContext'));
    return { score, notes };
  }

  if (topicId === 'specialista') {
    const s = getSpecialistaQualityScore(t);
    score += s;
    notes.push(t('topicRepair.analysis.note.specialistScore', { score: s }));
    return { score, notes };
  }

  score += Math.min(6, Math.floor(t.length / 80));
  score -= Math.min(4, countEnglishNoiseWords(t));
  return { score, notes };
}

function verdictTopicRepairCompare(prevScore, nextScore) {
  if (!Number.isFinite(prevScore) || !Number.isFinite(nextScore)) return { kind: 'unclear', label: t('topicRepair.analysis.verdict.unclear'), tone: 'var(--txt3)' };
  const d = nextScore - prevScore;
  if (nextScore <= 0 && prevScore > 0) return { kind: 'worse', label: t('topicRepair.analysis.verdict.worse'), tone: 'var(--red)' };
  if (d >= 2) return { kind: 'better', label: t('topicRepair.analysis.verdict.better'), tone: 'var(--acc3)' };
  if (d <= -2) return { kind: 'worse', label: t('topicRepair.analysis.verdict.worse'), tone: 'var(--red)' };
  return { kind: 'similar', label: t('topicRepair.analysis.verdict.similar'), tone: 'var(--txt3)' };
}

function formatTopicRepairQuickCompare(topicId, previousValue, candidateValue) {
  const prev = String(previousValue || '').trim();
  const next = String(candidateValue || '').trim();
  if (!hasMeaningfulValue(next)) {
    return `<div style="margin-top:6px;padding:8px;border:1px dashed var(--brd);border-radius:6px;background:var(--bg2);font-size:11px;color:var(--txt3)"><b>${t('topicRepair.analysis.title')}</b> ${t('topicRepair.analysis.cannotCompare')}</div>`;
  }
  const p = scoreTopicRepairText(topicId, prev);
  const n = scoreTopicRepairText(topicId, next);
  const v = verdictTopicRepairCompare(p.score, n.score);
  const notes = [...new Set([...(p.notes || []), ...(n.notes || [])])].slice(0, 3);
  const notesHtml = notes.length ? ` · ${notes.map(x => escHtml(x)).join(' · ')}` : '';
  return `<div style="margin-top:6px;padding:8px;border:1px solid var(--brd);border-radius:6px;background:var(--bg2);font-size:11px;color:var(--txt2)">
    <b>${t('topicRepair.analysis.title')}</b> <span style="color:${v.tone};font-weight:bold">${escHtml(v.label)}</span>
    <span style="color:var(--txt3)">(${t('topicRepair.analysis.score', { from: p.score, to: n.score })})</span>${notesHtml}
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
  const systemText = String(messages.find(m => m.role === 'system')?.content || getResolvedSystemMessage() || '').trim();
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
      { role: 'system', content: systemText || getResolvedSystemMessage() },
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

/** Sjednocení znaků z AI odpovědi (NFKC, ZWSP, plnocelá dvojtečka) kvůli parsování labelů. */
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

/** Odstraní opakované hlavičky ###G12### / ### G132 / ##H4 včetně mezer (i bez uzavíracích #). */
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

/** Když strict parser SPECIALISTU nechytí (jiné mezery/znaky), vezmi text od nadpisu do dalšího pole. */
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
    /(?:^|[\n\u0085\u2028\u2029])[\s\u00A0]*(?:VYZNAM|DEFINICE|POUZITI|PUVOD|POUVOD|POVOD|KJV|SPECIALISTA|VYKLAD|VÝKLAD|KOMENTAR|KOMENTÁŘ|EXEGEZE|COMMENTARY|EXEGESIS|DEFINITION|MEANING|USAGE|ORIGIN|DEF)\s*(?:\([^)\n]{0,240}\))?\s*(?:[:\uFF1A\u2013\u2014=\.\-|]|\n{1,4}\s*)/iu;
  const m2 = rest.search(nextHdr);
  const body = m2 >= 0 ? rest.slice(0, m2) : rest;
  return body.trim();
}

/** Po opravě tématu: nezaškrtávat hromadné přepsání jen při verdiktu „horší“ (jinak šlo omylem odškrtnout definici). */
function shouldAutoCheckTopicRepairTask(topicId, currentValue, candidateValue) {
  const prev = String(currentValue || '').trim();
  const next = String(candidateValue || '').trim();
  if (!hasMeaningfulValue(next)) return false;
  const p = scoreTopicRepairText(topicId, prev);
  const n = scoreTopicRepairText(topicId, next);
  const v = verdictTopicRepairCompare(p.score, n.score);
  return v.kind !== 'worse';
}

/** Jednotná normalizace názvů polí z AI (vč. VÝKLAD → SPECIALISTA). */
function normalizeTopicFieldLabel(raw) {
  const u = String(raw || '').trim().toUpperCase();
  if (u === 'DEF' || u === 'DEFINITION') return 'DEFINICE';
  if (u === 'MEANING') return 'VYZNAM';
  if (u === 'USAGE') return 'POUZITI';
  if (u === 'ORIGIN') return 'PUVOD';
  if (u === 'POVOD' || u === 'POUVOD') return 'PUVOD';
  if (u === 'VYKLAD' || u === 'VÝKLAD' || u === 'KOMENTAR' || u === 'KOMENTÁŘ' || u === 'EXEGEZE' || u === 'COMMENTARY' || u === 'EXEGESIS') return 'SPECIALISTA';
  return u;
}

/** Alternace názvů polí v AI odpovědi (jednotný zdroj pro anchor / řádkové parsování). */
const TOPIC_FIELD_LABEL_ALTS_FOR_RE = 'VYZNAM|DEFINICE|POUZITI|PUVOD|POUVOD|POVOD|KJV|SPECIALISTA|VYKLAD|VÝKLAD|KOMENTAR|KOMENTÁŘ|EXEGEZE|DEFINITION|MEANING|USAGE|ORIGIN|COMMENTARY|EXEGESIS|DEF';

/** Po klíčovém slově často následuje „(specialista)“ / poznámka v závorce — bez toho selhával \s*[-:]. */
function makeTopicFieldHeaderScanRegex() {
  return new RegExp(`\\b(${TOPIC_FIELD_LABEL_ALTS_FOR_RE})(?:\\*\\*|__)?\\s*(?:\\([^)\\n]{0,240}\\))?\\s*[-:–—=.|]{0,3}\\s*`, 'giu');
}

/** Stejná pravidla jako u anchor regexu, navíc prefix markdownu / číslování na začátku řádku. */
function makeTopicFieldLineStartRegex() {
  return new RegExp(
    `^(?:(?:\\d+)[.)]\\s+)?(?:(?:[-*+>]|#{1,6})\\s+)?(?:(?:\\*\\*|__)\\s*)?(${TOPIC_FIELD_LABEL_ALTS_FOR_RE})(?:\\*\\*|__)?\\s*(?:\\([^)\\n]{0,240}\\))?\\s*[-:–—=.|]{0,3}\\s*`,
    'iu'
  );
}

/** Hlavička sekce specialisty (aliasy + závorka + dvojtečka nebo nový řádek těla). */
function matchSpecialistaHeaderBlockStart(t) {
  const s = String(t || '');
  if (!s) return null;
  const LINE_START = '(?:^|[\n\u0085\u2028\u2029])[\\s\u00A0]*';
  const ALIAS = '(?:SPECIALISTA|VYKLAD|VÝKLAD|KOMENTAR|KOMENTÁŘ|EXEGEZE|COMMENTARY|EXEGESIS)';
  const PAREN_OPT = '(?:\\([^)\\n]{0,240}\\))?';
  const SEP = '(?:[:\\uFF1A\\u2013\\u2014=\\.\\-|]|\\n{1,4}\\s*)';
  const prefix = '(?:(?:\\d+)[.)]\\s+)?(?:(?:[-*+>]|#{1,6})\\s+)?(?:(?:\\*\\*|__)\\s*)?';
  const re = new RegExp(LINE_START + prefix + ALIAS + '(?:\\*\\*|__)?\\s*' + PAREN_OPT + '\\s*' + SEP + '\\s*', 'iu');
  return s.match(re);
}

/** Výřez bloku podle libovolného výskytu labelu v textu (i více polí na jednom řádku). */
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

/** Pořadí témat podle prvního výskytu nadpisu v RAW (pro log a doplnění „dalších“). */
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
    // Ořízni případ, kdy AI přidá další téma ve stejné větě/řádku.
    const foreignInline = out.match(/\b(VYZNAM|DEFINICE|POUZITI|PUVOD|KJV|SPECIALISTA|VYKLAD|VÝKLAD|KOMENTAR|KOMENTÁŘ|EXEGEZE|DEF|DEFINITION|MEANING|USAGE|ORIGIN|COMMENTARY|EXEGESIS)\s*[-:–—=.]?\s*/iu);
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

  // Když chybí explicitní label cílového tématu, ale AI vrátí další labely
  // (např. SPECIALISTA), ber jen text před prvním cizím labelem.
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
    cleaned = cleaned.replace(new RegExp(`^${keyForTopic}\\s*[-:–—=.]?\\s*`, 'i'), '').trim();
  }
  // Poslední ochrana: u single-topic odpovědi ořízni navazující cizí labely i v rámci jednoho řádku.
  if (keyForTopic) {
    const foreignInlineGlobal = cleaned.match(/\b(VYZNAM|DEFINICE|POUZITI|PUVOD|KJV|SPECIALISTA|VYKLAD|VÝKLAD|KOMENTAR|KOMENTÁŘ|EXEGEZE|DEF|DEFINITION|MEANING|USAGE|ORIGIN|COMMENTARY|EXEGESIS)\s*[-:–—=.]?\s*/iu);
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
  return {
    closeTopicRepairModalSafe,
    stopTopicRepairTicker,
    applyTopicRepairProviderCheckboxes,
    startTopicRepairFlow,
    setTopicRepairStrategy,
    startTopicRepairSequentialWorker,
    toggleTopicRepairTask,
    toggleTopicRepairRun,
    setTopicRepairSpecialistaDecision,
    setTopicRepairDetectedTopicDecision,
    applyTopicRepairSelected,
    closeTopicRepairModalOnly,
    minimizeTopicRepairModal,
    restoreTopicRepairModal,
    saveTopicRepairBatchPromptDraft,
    resetTopicRepairBatchPromptToDefault,
    refreshTopicRepairBatchPromptEditor,
    toggleTopicRepairBulkListFilter,
    syncTopicRepairBulkRunInputsToHidden,
    runTopicRepairBulkTranslation,
    toggleTopicRepairBulkInclude,
    setTopicRepairBulkIncludeAll,
    getTopicPromptTemplateByPromptType,
    syncTopicPromptTemplatesReport,
    buildTopicPrompt,
    openTopicPromptModal,
    runTopicPromptAI,
    applyTopicPromptResult,
    shouldReplaceSpecialista,
    closeTopicPromptModal,
    openSystemPromptModal,
    runSystemPromptAI,
    closeSystemPromptModal,
    extractTopicValueFromAI,
  };
}