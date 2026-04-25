import { ITEM_HEIGHT, PROVIDERS } from '../config.js';
import { isSideFallbackAborted, sleepMsWithAbort, runProviderFallbackTaskSequential } from '../ai/fallback.js';
import {
  buildSecondaryProviderModelCandidates,
  getRankedModelsForSecondary,
  getProviderConfiguredModelsForAI,
  getStaticFallbackModels
} from '../../strong_translator_ai.js';
import {
  hasMeaningfulValue, isDefinitionLowQuality, isTranslationComplete
} from './utils.js';
import core from '../../strong_translator_core_new.js';

const { buildRetryMessages } = core;

export function createBatchApi(deps) {
  const {
    state, t, escHtml,
    log, logError, logWarn,
    showToast,
    TOPIC_PROMPT_PRESET_MAP,
    parseTranslations,
    parseWithOpenRouterNormalization, applyFallbacksToParsedMap,
    extractTopicValueFromAI,
    shouldReplaceSpecialista,
    fillMissingVyznamFromSource, fillMissingKjvFromSource, annotateEnglishDefinitionsInTranslated,
    buildPromptMessages,
    callOnce, callAIWithRetry,
    getApiKeyForModelTest, getPipelineModelForProvider, getCurrentApiKey,
    getModelTestSelectedModelForProvider,
    resolveMainBatchProvider,
    appendModelTestUsage, buildModelTestMessages,
    isPipelineSecondaryEnabled,
    upsertModelTestStats, pushTestHistory,
    renderList, updateStats, renderDetail,
    startElapsedTimer, stopElapsedTimer, updateFailedCount,
    saveProgress,
    logTokenEntry, logEntry,
    getTranslationEngineLabel,
    isAutoProviderEnabled,
    translateSelected,
  } = deps;
function formatPreviewRawTranslation(rawDef) {
  const text = String(rawDef || '').trim();
  if (!text) return 'â€”';
  const esc = escHtml(text);
  const formatted = esc
    .replace(/(VÃZNAM:|VÃ½znam:)/g, '<br><b>$1</b>')
    .replace(/(DEFINICE:|Definice:)/g, '<br><b>$1</b>')
    .replace(/(POUÅ½IT[ÃI]:|PouÅ¾it[Ã­i]:)/g, '<br><b>$1</b>')
    .replace(/(SPECIALISTA:|Specialista:|VÃKLAD:|VÃ½klad:)/g, '<br><b>$1</b>');
  return formatted.replace(/^<br>/, '');
}

// â•â• PÅ˜EKLAD â€” SINGLE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function translateSingle(key) {
  const btn = document.querySelector('.translate-btn');
  if (btn) { btn.disabled = true; btn.textContent = t('translate.single.translating'); }
  
  const prov = resolveMainBatchProvider(document.getElementById('provider')?.value || '');
  const apiKey = getCurrentApiKey(prov);
  const model = getPipelineModelForProvider(prov) || document.getElementById('model').value;

   if (!apiKey) {
     showToast(t('toast.apiKey.enterForProvider', { provider: prov }));
     if (btn) { btn.disabled = false; btn.textContent = t('translate.single.button'); }
     return;
   }

   const e = state.entryMap.get(key);
  if (!e) {
    if (btn) { btn.disabled = false; btn.textContent = t('translate.single.button'); }
    return;
  }
  
  const messages = buildPromptMessages([e]);
  
  try {
    const raw = await callAIWithRetry(prov, apiKey, model, messages);
    log(`ðŸ¤– PÅ™eklad: ${getTranslationEngineLabel(raw, prov, model)}`);
    if (window.DEBUG_AI) {
      console.groupCollapsed(`AI single ${key}`);
      console.log('response:', raw.content);
      console.groupEnd();
    }
    let missingKeys = parseTranslations(raw.content, [key]);
    
    if (missingKeys.length > 0) {
      const retryContent = `CHYBA: V minulÃ© odpovÄ›di jsi vynechal formÃ¡tovacÃ­ znaÄky ###G. 
ZOPAKUJ PÅ˜EKLAD a u kaÅ¾dÃ©ho hesla MUSÃÅ  zaÄÃ­t Å™Ã¡dkem ###G[ÄÃ­slo]###. 
Bez toho nebude pÅ™eklad zpracovÃ¡n!

PÅ™eloÅ¾ tato hesla:
${key}
DEF: ${e.definice || e.def || ''}
KJV: ${e.kjv || ''}
ORIG: ${e.orig || ''}`;
      
       const raw2 = await callOnce(prov, apiKey, model, buildRetryMessages(retryContent));
       missingKeys = parseTranslations(raw2.content, [key]);
     }

   } catch(e) {
     logError('translateSingle', e, {
       key,
       provider: prov,
       model
     });
     showToast(t('toast.error.withMessage', { message: e.message }));
   }
  
  if (btn) { btn.disabled = false; btn.textContent = t('translate.single.button'); }
  renderDetail();
  updateStats();
  renderList();
}

// â•â• PÅ˜EKLAD â€” ZNOVU â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function retranslateSingle(key) {
  if (!confirm(t('confirm.retranslate', { key }))) return;
  
  // OznaÄ jako nepÅ™eloÅ¾enÃ© pro dalÅ¡Ã­ zpracovÃ¡nÃ­
  delete state.translated[key];
  saveProgress();
  
  // Vyber jen tento klÃ­Ä
  state.selectedKeys.clear();
  state.selectedKeys.add(key);
  renderList();
  
  // Zavolej pÅ™eklad
  await translateSelected();
}

// â•â• PÅ˜EKLAD â€” DÃVKA â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function translateNext() {
  if (state.autoRunning) return;
  const activeProvider = resolveMainBatchProvider(document.getElementById('provider')?.value || '');
  if (!isAutoProviderEnabled(activeProvider)) {
    showToast(t('toast.provider.enableOne'));
    return;
  }
  
  // Retry mode - pouÅ¾ij state.retryKeysList mÃ­sto getNextBatch
  let batch;
  if (state.retryMode && state.retryKeysList.length > 0) {
    batch = state.retryKeysList.slice(0, state.currentBatchSize);
    state.retryKeysList = state.retryKeysList.slice(state.currentBatchSize);
    if (state.retryKeysList.length === 0) {
      state.retryMode = false;
    }
  } else {
    batch = getNextBatch(state.currentBatchSize);
  }
  
  if (!batch.length) { 
    if (state.retryMode) {
      showToast(t('toast.retry.done'));
      state.retryMode = false;
    } else {
      showToast(t('toast.allTranslated')); 
    }
    stopElapsedTimer();
    return; 
  }
  
  // Info o retry mÃ³du
  if (state.retryMode) {
    document.getElementById('btnStep').title = `Retry: zbÃ½vÃ¡ ${state.retryKeysList.length + batch.length} hesel`;
  }
  
  document.getElementById('btnStep').disabled = true;
  document.getElementById('btnStep').textContent = t('btn.step.loading');
  await translateBatch(batch);
  document.getElementById('btnStep').disabled = false;
  document.getElementById('btnStep').textContent = t('btn.step.default');
  updateStats();
  renderList();
  if (state.activeKey && state.translated[state.activeKey]) renderDetail();
}

function jumpToStart() {
  const num = parseInt(document.getElementById('startFrom').value);
  if (!num || num < 1) { showToast(t('toast.jump.enterGNumber')); return; }
  const key = 'G' + num;
  const found = state.entryMap.get(key);
  if (!found) { showToast(t('toast.entry.notFoundInFile', { key: `G${num}` })); return; }

  // OznaÄ vÅ¡echna hesla PÅ˜ED tÃ­mto ÄÃ­slem jako pÅ™eskoÄenÃ¡ (zachovÃ¡me existujÃ­cÃ­ pÅ™eklady)
  for (const e of state.entries) {
    const n = parseInt(e.key.slice(1));
    if (n < num && !state.translated[e.key]) {
      state.translated[e.key] = { vyznam: 'â€”', definice: '(pÅ™eskoÄeno)', pouziti: 'â€”', puvod: 'â€”', skipped: true };
    }
  }
   saveProgress();
   updateStats();
   renderList();
   showToast(t('toast.translation.resumeFrom', { key: `G${num}` }));
   // Scroll na heslo v listu (virtuÃ¡lnÃ­)
   setTimeout(() => {
     const scroll = document.getElementById('listScroll');
     const idx = state.filteredKeys.indexOf(key);
     if (idx !== -1) {
       scroll.scrollTop = idx * ITEM_HEIGHT - (scroll.clientHeight / 2) + (ITEM_HEIGHT / 2);
     }
   }, 0);
 }


function getNextBatch(size) {
  const result = [];
  for (const e of state.entries) {
    if (result.length >= size) break;
    if (!state.translated[e.key] || state.translated[e.key].skipped) {
      result.push(e.key);
    }
  }
  return result;
}

const FALLBACK_TOPIC_ORDER = ['definice', 'vyznam', 'kjv', 'pouziti', 'puvod', 'specialista'];

function getFailedTopicsForFallback(translationEntry) {
  const t = translationEntry || {};
  const failed = [];
  for (const topicId of FALLBACK_TOPIC_ORDER) {
    const val = String(t[topicId] || '').trim();
    if (!hasMeaningfulValue(val)) {
      failed.push(topicId);
      continue;
    }
    if (topicId === 'definice' && isDefinitionLowQuality(val)) {
      failed.push(topicId);
    }
  }
  return failed;
}

function getMissingTopicsForRepair(translationEntry) {
  const allMissing = getFailedTopicsForFallback(translationEntry);
  return allMissing.slice(0, 2);
}

function cloneTranslationTopicFields(entry) {
  const src = entry || {};
  return {
    vyznam: String(src.vyznam || ''),
    definice: String(src.definice || ''),
    kjv: String(src.kjv || ''),
    pouziti: String(src.pouziti || ''),
    puvod: String(src.puvod || ''),
    specialista: String(src.specialista || '')
  };
}

function isBetterGenericTopicValue(prev, next) {
  const prevText = String(prev || '').trim();
  const nextText = String(next || '').trim();
  if (!hasMeaningfulValue(nextText)) return false;
  if (!hasMeaningfulValue(prevText)) return true;
  if (nextText.length >= prevText.length + 40) return true;
  return false;
}

function shouldReplaceTopicValue(topicId, previousValue, candidateValue) {
  const prev = String(previousValue || '').trim();
  const next = String(candidateValue || '').trim();
  if (!hasMeaningfulValue(next)) return false;
  if (!hasMeaningfulValue(prev)) return true;
  if (topicId === 'specialista') return shouldReplaceSpecialista(prev, next);
  if (topicId === 'definice') {
    if (isDefinitionLowQuality(next)) return false;
    if (isDefinitionLowQuality(prev) && !isDefinitionLowQuality(next)) return true;
    return isBetterGenericTopicValue(prev, next);
  }
  return isBetterGenericTopicValue(prev, next);
}

function preserveBetterTopicsAfterBatch(keys, previousMap) {
  const topics = ['vyznam', 'definice', 'kjv', 'pouziti', 'puvod', 'specialista'];
  for (const key of (Array.isArray(keys) ? keys : [])) {
    const current = state.translated[key];
    if (!current) continue;
    const previous = previousMap?.[key] || {};
    for (const topicId of topics) {
      const prevVal = String(previous[topicId] || '').trim();
      const curVal = String(current[topicId] || '').trim();
      const acceptCurrent = shouldReplaceTopicValue(topicId, prevVal, curVal);
      if (!acceptCurrent && hasMeaningfulValue(prevVal)) {
        current[topicId] = prevVal;
      }
    }
  }
}

function getProviderCooldownLeftSec(prov) {
  const until = Number(state.providerCooldownUntil?.[prov] || 0);
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

function setProviderCooldown(prov, seconds, reason = '') {
  const sec = Math.max(0, Number(seconds) || 0);
  if (!Object.prototype.hasOwnProperty.call(state.providerCooldownUntil, prov)) return;
  state.providerCooldownUntil[prov] = sec > 0 ? (Date.now() + sec * 1000) : 0;
}

function getModelCooldownLeftSec(prov, model) {
  const map = state.providerModelCooldownUntil?.[prov];
  if (!map || !model) return 0;
  const until = Number(map[model] || 0);
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

function setModelCooldown(prov, model, seconds) {
  if (!model) return;
  if (!Object.prototype.hasOwnProperty.call(state.providerModelCooldownUntil, prov)) {
    state.providerModelCooldownUntil[prov] = {};
  }
  const sec = Math.max(0, Number(seconds) || 0);
  state.providerModelCooldownUntil[prov][model] = sec > 0 ? (Date.now() + sec * 1000) : 0;
}

async function waitForProviderCooldown(prov, abortVersion = 0) {
  while (getProviderCooldownLeftSec(prov) > 0) {
    if (isSideFallbackAborted(abortVersion)) return false;
    const left = getProviderCooldownLeftSec(prov);
    const tick = Math.floor(left / 10);
    if (state.providerCooldownLogTick[prov] !== tick) {
      state.providerCooldownLogTick[prov] = tick;
      log(`â± ${prov} cooldown: zbÃ½vÃ¡ ${left}s`);
    }
    const ok = await sleepMsWithAbort(Math.min(1500, left * 1000), abortVersion);
    if (!ok) return false;
  }
  state.providerCooldownLogTick[prov] = -1;
  return true;
}

function shouldAcceptTopicFallback(topicId, candidate) {
  if (!hasMeaningfulValue(candidate)) return false;
  if (topicId === 'definice' && isDefinitionLowQuality(candidate)) return false;
  return true;
}

function getSecondaryProviderModelCandidates(prov) {
  return buildSecondaryProviderModelCandidates({
    provider: prov,
    providers: PROVIDERS,
    selectedModel: getPipelineModelForProvider(prov) || getModelTestSelectedModelForProvider(prov) || '',
    rankedModels: getRankedModelsForSecondary(prov),
    maxNonGemini: 4
  });
}

function getSecondaryProviderModelQueue(prov) {
  const uniqueQueue = getSecondaryProviderModelCandidates(prov);
  if (!uniqueQueue.length) return [];
  const idx = Math.max(0, Number(state.providerModelRotationIndex?.[prov] || 0));
  const shift = idx % uniqueQueue.length;
  state.providerModelRotationIndex[prov] = idx + 1;
  return [...uniqueQueue.slice(shift), ...uniqueQueue.slice(0, shift)];
}

function getSecondaryNextOperationState(prov) {
  const queue = getSecondaryProviderModelCandidates(prov);
  if (!queue.length) return { exhausted: false, nextSec: 0 };
  const providerLeft = getProviderCooldownLeftSec(prov);
  let nextSec = Number.POSITIVE_INFINITY;
  let hasReadyNow = false;
  for (const model of queue) {
    const modelLeft = getModelCooldownLeftSec(prov, model);
    const opLeft = Math.max(providerLeft, modelLeft);
    if (opLeft <= 0) {
      hasReadyNow = true;
      break;
    }
    nextSec = Math.min(nextSec, opLeft);
  }
  if (hasReadyNow) return { exhausted: false, nextSec: 0 };
  if (!Number.isFinite(nextSec)) return { exhausted: false, nextSec: 0 };
  return { exhausted: true, nextSec: Math.max(1, Math.ceil(nextSec)) };
}

function getSecondaryRetryDelayMsByError(msgLower) {
  if (/resource_exhausted|too many|rate limit|429|high demand/.test(msgLower)) return 3000;
  if (/503|service unavailable|timeout|api timeout/.test(msgLower)) return 3000;
  if (/400|invalid/.test(msgLower)) return 1500;
  return 2500;
}

function getSecondaryCooldownSecByError(prov, rawMsg) {
  const msg = String(rawMsg || '');
  const low = msg.toLowerCase();
  if (prov === 'gemini' && (/resource_exhausted|429|high demand|limit vyÄerpÃ¡n/.test(low))) {
    // U Gemini drÅ¾Ã­me cooldown hlavnÄ› per-model, ne per-provider.
    return 0;
  }
  if (/503|service unavailable|api timeout/.test(low)) return 5;
  if (/429|rate limit|too many|quota/.test(low)) {
    const parsed = rateInfoFromErrorMessage(msg)?.retryAfterSec || 0;
    return Math.max(3, Math.min(20, parsed || 6));
  }
  return 0;
}

function getSecondaryModelCooldownSecByError(prov, rawMsg) {
  const msg = String(rawMsg || '');
  const low = msg.toLowerCase();
  const retryAfter = rateInfoFromErrorMessage(msg)?.retryAfterSec || 0;
  const minMatch = low.match(/(\d+)\s*min/);
  const fromMinutes = minMatch ? (Number(minMatch[1]) || 0) * 60 : 0;
  if (prov === 'gemini' && (/limit vyÄerpÃ¡n|resource_exhausted/.test(low))) {
    // Prefer explicit Retry-After from API over textual "~20min" hint.
    const preferred = retryAfter || fromMinutes || (20 * 60);
    return Math.max(20, Math.min(25 * 60, preferred));
  }
  if (/high demand|503|service unavailable/.test(low)) {
    return Math.max(20, Math.min(180, retryAfter || 45));
  }
  if (/429|rate limit|too many|quota/.test(low)) {
    return Math.max(20, Math.min(180, retryAfter || 30));
  }
  return 0;
}

async function requestTopicFallbackForProvider(prov, key, topicId, abortVersion) {
  if (isSideFallbackAborted(abortVersion)) return null;
  const apiKey = getApiKeyForModelTest(prov);
  const modelQueue = getSecondaryProviderModelQueue(prov);
  if (!apiKey || !modelQueue.length) return null;
  if (getProviderCooldownLeftSec(prov) > 0) return null;
  const entry = state.entryMap.get(key);
  if (!entry) return null;
  const promptType = TOPIC_PROMPT_PRESET_MAP[topicId];
  if (!promptType) return null;
  const messages = buildModelTestMessages([entry], 'auto-live', promptType, true);

  for (let i = 0; i < modelQueue.length; i++) {
    if (isSideFallbackAborted(abortVersion)) return null;
    const model = modelQueue[i];
    const cooldownOk = await waitForProviderCooldown(prov, abortVersion);
    if (!cooldownOk) return null;
    if (isSideFallbackAborted(abortVersion)) return null;
    const modelCooldownLeft = getModelCooldownLeftSec(prov, model);
    if (modelCooldownLeft > 0) {
      console.warn(`[FALLBACK][${prov}] skip model cooldown: ${model} (${modelCooldownLeft}s)`);
      continue;
    }
    const reqStart = performance.now();
    try {
      const raw = await callOnce(prov, apiKey, model, messages);
      const reqMs = Math.round(performance.now() - reqStart);
      const parsed = {};
      const rawText = String(raw?.content || '');
      parseWithOpenRouterNormalization(rawText, [key], parsed);
      applyFallbacksToParsedMap([key], parsed);
      let candidate = String(parsed?.[key]?.[topicId] || '').trim();
      if (!candidate) {
        // Topic prompty mohou vracet Äistou hodnotu pole bez parser-safe bloku.
        candidate = extractTopicValueFromAI(rawText, topicId, 'strict');
      }
      appendModelTestUsage(() => {}, prov, model, raw);
      if (shouldAcceptTopicFallback(topicId, candidate)) {
        log(`â†³ Fallback ${prov}/${model} ${key}.${topicId} OK (${reqMs}ms)`);
        return { prov, model, value: candidate, reqMs };
      }
      log(`âš  Fallback ${prov}/${model} ${key}.${topicId}: odpovÄ›Ä neproÅ¡la kvalitou, zkouÅ¡Ã­m dalÅ¡Ã­ model.`);
    } catch (e) {
      const msg = String(e?.message || '');
      const msgLower = msg.toLowerCase();
      const isRate = /429|rate limit|too many|quota|resource_exhausted|high demand/.test(msgLower);
      const cooldownSec = getSecondaryCooldownSecByError(prov, msg);
      const modelCooldownSec = getSecondaryModelCooldownSecByError(prov, msg);
      if (modelCooldownSec > 0) setModelCooldown(prov, model, modelCooldownSec);
      if (cooldownSec > 0) setProviderCooldown(prov, cooldownSec, isRate ? 'rate limit' : 'provider error');
      state.providerFailBadgeUntil[prov] = Date.now() + 10000;
      console.warn(`[FALLBACK][${prov}] model failed: ${model}`, {
        key,
        topicId,
        message: msg
      });
      // Pokud provider spadl do delÅ¡Ã­ho cooldownu, fallback hned ukonÄÃ­me,
      // aby neblokoval dalÅ¡Ã­ Groq dÃ¡vky.
      if (cooldownSec >= 45) {
        return null;
      }
      const canTryNext = i < modelQueue.length - 1;
      if (canTryNext) {
        const waitMs = getSecondaryRetryDelayMsByError(msgLower);
        const cooldownMs = getProviderCooldownLeftSec(prov) * 1000;
        const effectiveWaitMs = Math.max(waitMs, cooldownMs);
        // Retry detail nechÃ¡vÃ¡me pouze v konzoli, AUTO Å™Ã¡dek zÅ¯stÃ¡vÃ¡ struÄnÃ½.
        console.warn(`[FALLBACK][${prov}] retry next model in ${Math.max(1, Math.round(effectiveWaitMs / 1000))}s`);
        const keptRunning = await sleepMsWithAbort(effectiveWaitMs, abortVersion);
        if (!keptRunning) return null;
      }
    }
  }
  return null;
}

async function runParallelTopicFallback(keys, abortVersion) {
  if (isSideFallbackAborted(abortVersion)) return;
  const keyList = Array.isArray(keys) ? keys : [];
  if (!keyList.length) return;
  const sideProviders = ['gemini', 'openrouter'].filter(prov => isPipelineSecondaryEnabled(prov));
  if (!sideProviders.length) {
    log('â„¹ SekundÃ¡rnÃ­ fallback vypnutÃ½ (Å¾Ã¡dnÃ½ provider nenÃ­ zaÅ¡krtnut).');
    return;
  }
  await Promise.all(keyList.map(async (key) => {
    if (isSideFallbackAborted(abortVersion)) return;
    const t = state.translated[key] || {};
    const failedTopics = getFailedTopicsForFallback(t);
    if (!failedTopics.length) return;
    for (const topicId of failedTopics) {
      if (isSideFallbackAborted(abortVersion)) return;
      let chosen = null;
      for (const prov of sideProviders) {
        const result = await runProviderFallbackTaskSequential(
          prov,
          () => requestTopicFallbackForProvider(prov, key, topicId, abortVersion)
        ).catch(() => null);
        if (result) {
          chosen = result;
          break;
        }
      }
      if (!chosen) continue;
      if (isSideFallbackAborted(abortVersion)) return;
      state.translated[key] = state.translated[key] || {};
      state.translated[key][topicId] = chosen.value;
      log(`âœ“ Fallback pÅ™evzat ${key}.${topicId} <= ${chosen.prov}/${chosen.model}`);
    }
  }));
}

function enqueueSideFallbackBackground(keys) {
  const keyList = Array.isArray(keys) ? keys.filter(Boolean) : [];
  if (!keyList.length) return;
  const abortVersion = state.sideFallbackAbortVersion;
  state.sideFallbackBackgroundQueue = state.sideFallbackBackgroundQueue
    .catch(() => undefined)
    .then(async () => {
      if (isSideFallbackAborted(abortVersion)) return;
      try {
        await runParallelTopicFallback(keyList, abortVersion);
      } catch (e) {
        console.warn('[FALLBACK] background run failed', e);
      }
    });
}

async function translateBatch(keys, depth = 0) {
  const preferredProvider = document.getElementById('provider')?.value || '';
  const prov   = resolveMainBatchProvider(preferredProvider);
  const model  = getPipelineModelForProvider(prov) || document.getElementById('model').value;
  // KlÃ­Ä vÅ¾dy dle aktuÃ¡lnÃ­ho run providera
  const apiKey = getCurrentApiKey(prov);
  state.currentInterval = parseInt(document.getElementById('intervalRun').value);
  state.currentBatchSize = parseInt(document.getElementById('batchSizeRun').value);

  if (!apiKey) { showToast(t('toast.apiKey.enterForProvider', { provider: prov })); return { ok: false }; }

  // Start timer pÅ™i prvnÃ­m pÅ™ekladu
  if (!state.startTime) {
    state.startTime = Date.now();
    startElapsedTimer();
  }

  const batch = keys.map(k => state.entryMap.get(k)).filter(Boolean);
  const messages = buildPromptMessages(batch);

  const reqStart = performance.now();
  try {
    const previousMap = {};
    for (const key of keys) {
      previousMap[key] = cloneTranslationTopicFields(state.translated[key]);
    }
    const raw = await callAIWithRetry(prov, apiKey, model, messages);
    const reqMs = performance.now() - reqStart;
    const content = raw.content;
    log(`ðŸ¤– PÅ™eklad: ${getTranslationEngineLabel(raw, prov, model)}`);
    // Verbose logy pouze kdyÅ¾ je aktivnÃ­ reÅ¾im pro debug (window.DEBUG_AI = true v konzoli)
    if (window.DEBUG_AI) {
      console.groupCollapsed(`AI batch ${keys[0]}â€“${keys[keys.length-1]}`);
      console.log('prompt:', messages);
      console.log('response:', content);
      console.groupEnd();
    }
    let missingKeys = parseTranslations(content, keys);
    preserveBetterTopicsAfterBatch(keys, previousMap);
    fillMissingVyznamFromSource(keys);
    fillMissingKjvFromSource(keys);
    annotateEnglishDefinitionsInTranslated(keys);
    
    // Log tokenÅ¯
    const usage = raw.usage || raw.usageMetadata;
    if (usage) {
      const inT = usage.prompt_tokens || usage.promptTokenCount || 0;
      const outT = usage.completion_tokens || usage.candidatesTokenCount || 0;
      const total = inT + outT;
      log(`ðŸ“Š ${prov}: ${inT} in / ${outT} out = ${total} celkem`);
      logTokenEntry(prov, inT, outT, total);
    }
    
    // Log do konzoly pro ÃºspÄ›Å¡nÃ©
    for (const key of keys) {
      const t = state.translated[key];
      if (t?.vyznam && t.vyznam !== 'â€”') {
        console.log(`âœ“ ${key}: ${t.vyznam?.slice(0, 60)}...`);
      }
    }
    logEntry(keys, content);
    
    // UloÅ¾ raw odpovÄ›Ä pro kaÅ¾dÃ½ klÃ­Ä (pro pozdÄ›jÅ¡Ã­ zobrazenÃ­ chyb)
    for (const key of keys) {
      if (state.translated[key]) {
        state.translated[key].raw = content;
      }
    }
    
    // Pokud nÄ›co chybÃ­, zkus opravnÃ½ retry
    if (missingKeys.length > 0) {
      console.log(`âš  ${missingKeys.length} hesel bez pÅ™ekladu: ${missingKeys.join(', ')}`);
      log(`âš  Pokus o opravu formÃ¡tu pro ${missingKeys.join(', ')}...`);
      const retryContent = `CHYBA: V minulÃ© odpovÄ›di jsi vynechal formÃ¡tovacÃ­ znaÄky ###G. 
ZOPAKUJ PÅ˜EKLAD a u kaÅ¾dÃ©ho hesla MUSÃÅ  zaÄÃ­t Å™Ã¡dkem ###G[ÄÃ­slo]###. 
Bez toho nebude pÅ™eklad zpracovÃ¡n!

PÅ™eloÅ¾ tato hesla:
${keys.map(k => {
  const e = state.entryMap.get(k);
  return e ? `${e.key} | ${e.greek}\nDEF: ${e.definice || e.def || ''}\nKJV: ${e.kjv || ''}` : '';
}).join('\n\n')}`;
      
      try {
        const raw2 = await callOnce(prov, apiKey, model, buildRetryMessages(retryContent));
        console.log(`ðŸ“¥ Retry odpovÄ›Ä:`, raw2.content);
        missingKeys = parseTranslations(raw2.content, keys);
        preserveBetterTopicsAfterBatch(keys, previousMap);
        fillMissingVyznamFromSource(keys);
        fillMissingKjvFromSource(keys);
        annotateEnglishDefinitionsInTranslated(keys);
        const retryCount = keys.length - missingKeys.length;
        if (retryCount > 0) {
          log(`âœ“ OpravnÃ½ pÅ™eklad: ${retryCount} hesel, chybÃ­: ${missingKeys.length > 0 ? missingKeys.join(', ') : 'nic'}`);
        } else {
          log(`âœ— OpravnÃ½ pÅ™eklad nepomohl, chybÃ­: ${missingKeys.join(', ')}`);
        }
      } catch(e2) {
        log(`âœ— OpravnÃ½ pokus selhal: ${e2.message}`);
      }
    }
    
    // Fallback strategie: pokud po retry chybÃ­ ÄÃ¡st dÃ¡vky, zkus menÅ¡Ã­ dÃ¡vku.
    if (missingKeys.length > 0 && keys.length > 1 && depth < 4) {
      log(`â†˜ Fallback dÃ¡vky: dÄ›lÃ­m ${missingKeys.length} klÃ­ÄÅ¯ na menÅ¡Ã­ bloky (ÃºroveÅˆ ${depth + 1})`);
      const pivot = Math.ceil(missingKeys.length / 2);
      const chunks = [missingKeys.slice(0, pivot), missingKeys.slice(pivot)].filter(ch => ch.length > 0);
      for (const chunk of chunks) {
        if (chunk.length === 1) {
          await translateBatch(chunk, depth + 1);
        } else {
          await translateBatch(chunk, depth + 1);
        }
      }
    }

    // SekundÃ¡rnÃ­ fallback spouÅ¡tÄ›j aÅ¾ po dokonÄenÃ­ vÅ¡ech pokusÅ¯ hlavnÃ­ho providera pro danou dÃ¡vku
    // (tj. pouze v top-level volÃ¡nÃ­). TÃ­m se vyhneme "stÅ™Ã­dÃ¡nÃ­" providerÅ¯ bÄ›hem hlavnÃ­ho pÅ™ekladu.
    if (depth === 0) {
      const keysBeforeSideFallback = keys.filter(k => !isTranslationComplete(state.translated[k]));
      if (keysBeforeSideFallback.length > 0) {
        log(`â†» AnalÃ½za po ${prov}: ${keysBeforeSideFallback.length} hesel mÃ¡ chyby/neÃºplnÃ¡ tÃ©mata; sekundÃ¡rnÃ­ topic fallback bÄ›Å¾Ã­ na pozadÃ­.`);
        enqueueSideFallbackBackground(keysBeforeSideFallback);
      } else {
        log(`âœ“ AnalÃ½za po ${prov}: dÃ¡vka kompletnÃ­, sekundÃ¡rnÃ­ fallback nenÃ­ potÅ™eba.`);
      }
    }

    const translatedCount = keys.filter(k => isTranslationComplete(state.translated[k])).length;
    upsertModelTestStats(prov, model, {
      status: translatedCount === keys.length ? 'OK' : 'PARTIAL',
      okKeys: translatedCount,
      failedKeys: keys.length - translatedCount,
      totalKeys: keys.length,
      latencyMs: reqMs
    });
    pushTestHistory({
      type: 'translate-batch',
      provider: prov,
      model,
      total: keys.length,
      ok: translatedCount,
      missing: keys.length - translatedCount,
      avgLatencyMs: reqMs
    });
    if (translatedCount < keys.length) {
      // OznaÄ chybÄ›jÃ­cÃ­ hesla jako neÃºspÄ›Å¡nÃ¡
      for (const key of keys) {
        if (!isTranslationComplete(state.translated[key])) {
          state.translated[key] = state.translated[key] || {};
          if (!state.translated[key].vyznam || state.translated[key].vyznam === 'â€”') {
            state.translated[key].vyznam = 'â€”';
          }
        }
      }
      log(`âš  Pozor: PÅ™eloÅ¾eno ${translatedCount}/${keys.length} hesel. Zkuste menÅ¡Ã­ dÃ¡vku.`);
      showToast(t('toast.translated.partial', { translated: translatedCount, total: keys.length }));
    }
    
     saveProgress();
     updateFailedCount();
     // logEntry already called above after initial parse
     log(`âœ“ PÅ™eloÅ¾eno ${keys.length} hesel (${keys[0]}â€“${keys[keys.length-1]})`);
     return { ok: true };
} catch(e) {
      const reqMs = performance.now() - reqStart;
      const msg = (e?.message || '').toLowerCase();
      const isRate = msg.includes('429') || msg.includes('rate limit') || msg.includes('quota') || msg.includes('too many');
      upsertModelTestStats(prov, model, {
        status: isRate ? 'RATE_LIMITED' : 'ERROR',
        okKeys: 0,
        failedKeys: keys.length,
        totalKeys: keys.length,
        latencyMs: reqMs
      });
      if (isRate) {
        pushTestHistory({
          type: 'translate-batch',
          provider: prov,
          model,
          total: keys.length,
          ok: 0,
          missing: keys.length,
          avgLatencyMs: reqMs
        });
        const cooldownSeconds = Math.max(state.currentInterval, 60);
        logWarn('translateBatch', `Rate limit dÃ¡vky ${keys[0]}-${keys[keys.length-1]}, odklad ${cooldownSeconds}s`, {
          provider: prov,
          keyRange: `${keys[0]}-${keys[keys.length-1]}`,
          cooldownSeconds,
          error: e.message
        });
        showToast(t('toast.rateLimit.retryIn', { seconds: cooldownSeconds }));
        return { ok: false, rateLimited: true, cooldownSeconds };
      }
      logError('translateBatch', e, {
        keys: keys.slice(0, 5), // first 5 keys only
        keyRange: `${keys[0]}-${keys[keys.length-1]}`,
        provider: prov,
        batchSize: keys.length
      });
      // OznaÄ chybnÃ¡ hesla jako neÃºspÄ›Å¡nÃ¡, aby Å¡la zobrazit v "NeÃºspÄ›Å¡nÃ© pÅ™eklady"
      for (const key of keys) {
        if (!state.translated[key]) {
          state.translated[key] = { vyznam: 'â€”', definice: '', pouziti: '', puvod: '', specialista: '', raw: `CHYBA: ${e.message}` };
        }
      }
      saveProgress();
      pushTestHistory({
        type: 'translate-batch',
        provider: prov,
        model,
        total: keys.length,
        ok: 0,
        missing: keys.length,
        avgLatencyMs: reqMs
      });
      updateFailedCount();
      showToast(t('toast.error.withMessage', { message: e.message }));
      return { ok: false };
   }
}
  return {
    translateSingle,
    retranslateSingle,
    translateNext,
    jumpToStart,
    translateBatch,
    getNextBatch,
    getSecondaryNextOperationState,
    getFailedTopicsForFallback,
    getMissingTopicsForRepair,
    cloneTranslationTopicFields,
    shouldReplaceTopicValue,
    getProviderCooldownLeftSec,
    formatPreviewRawTranslation,
  };
}