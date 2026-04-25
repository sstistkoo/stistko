import { CONFIG, PROVIDERS } from '../config.js';
import { sleep } from '../utils.js';
import { extractOpenRouterText } from './client.js';
import { getProviderConfiguredModelsForAI, getStaticFallbackModels } from '../../strong_translator_ai.js';
import core from '../../strong_translator_core_new.js';

const { validateAPIResponse, DEFAULT_PROMPT } = core;

export function createCallApi({ log, logError, logWarn, showToast, t, rateInfoFromErrorMessage }) {
function resetPrompt() {
  document.getElementById('promptEditor').value = DEFAULT_PROMPT;
  localStorage.setItem('strong_prompt', DEFAULT_PROMPT);
  updatePromptStatusIndicator();
}


// â•â• AI VOLÃNÃ S RETRY A FALLBACK â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function getProviderConfiguredModels(provider) {
  return getProviderConfiguredModelsForAI(provider, PROVIDERS);
}

function getFallbackModels(provider) {
  if (provider !== 'openrouter') return getStaticFallbackModels(provider, PROVIDERS);
  if (provider === 'openrouter') {
    try {
      const raw = localStorage.getItem('openrouter_free_models_cache');
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && Array.isArray(cached.models) && cached.models.length) {
          const ids = cached.models.map(m => {
            if (Array.isArray(m)) return m[0];
            if (m && typeof m === 'object') return m.id || m.value;
            return null;
          }).filter(Boolean);
          return [...new Set(ids)].slice(0, 5);
        }
      }
    } catch(e) { /* ignore */ }
    // MinimÃ¡lnÃ­ fallback, kdyby cache jeÅ¡tÄ› neexistovala
    return ['meta-llama/llama-3.3-70b-instruct:free', 'meta-llama/llama-3.1-8b-instruct:free'];
  }
  return [];
}

async function callAIWithRetry(provider, apiKey, model, messages) {
  const tryModels = (provider === 'gemini' || (provider === 'openrouter' && model === 'openrouter/free'))
    ? [model]
    : [...new Set([model, ...getFallbackModels(provider).filter(m => m !== model)])];
  let lastErr = null;

  for (const m of tryModels) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await callOnce(provider, apiKey, m, messages);
        return {
          ...res,
          providerUsed: provider,
          requestedModel: model,
          attemptedModel: m,
          resolvedModel: res.resolvedModel || m
        };
       } catch(e) {
         lastErr = e;
         const msg = (e.message || '').toLowerCase();
         const isRate = msg.includes('429') || msg.includes('quota') || msg.includes('rate') || msg.includes('too many');
         const isBanned = msg.includes('restricted') || msg.includes('organization');
         const is404 = msg.includes('404') || msg.includes('not found');
         const is503 = msg.includes('503') || msg.includes('service unavailable');
         const isTimeout = e?.name === 'AbortError' || msg.includes('signal is aborted') || msg.includes('timeout');

         if (is404) {
           const errMsg = 'Chyba 404: Model nenalezen, vyberte jinÃ½ v nastavenÃ­';
           logError('callAIWithRetry', new Error(errMsg), {
             provider, model: m, attempt: attempt + 1,
             statusCode: 404
           });
           throw new Error(errMsg);
         }
         if (isRate) {
           const parsedRetry = rateInfoFromErrorMessage(e?.message || '')?.retryAfterSec || 0;
           const wait = Math.max(2, Math.min(20, parsedRetry || ((attempt + 1) * 10)));
           const shouldSwitchModelImmediately = provider === 'groq';
           logWarn('callAIWithRetry', `Rate limit na ${m}, ÄekÃ¡m ${wait}s...`, {
             provider, model: m, attempt: attempt + 1, waitSeconds: wait
           });
           showToast(t('toast.rateLimit.waiting', { seconds: wait, suffix: shouldSwitchModelImmediately ? ', then try another model' : '' }));
           await sleep(wait * 1000);
           if (shouldSwitchModelImmediately) {
             // U Groq je praktiÄtÄ›jÅ¡Ã­ pÅ™i rate limitu rychle pÅ™eskoÄit na dalÅ¡Ã­ model.
             break;
           }
           continue;
         }
         if (isTimeout) {
           const wait = Math.min(8, (attempt + 1) * 2);
           logWarn('callAIWithRetry', `Timeout/abort na ${m} (pokus ${attempt + 1}), opakuji za ${wait}s...`, {
             provider, model: m, attempt: attempt + 1, waitSeconds: wait, error: e.message
           });
           showToast(t('toast.timeout.retryIn', { seconds: wait }));
           await sleep(wait * 1000);
           continue;
         }
         if (is503) {
           const wait = Math.min(20, Math.max(3, (attempt + 1) * 5));
           logWarn('callAIWithRetry', `503 Service Unavailable na ${m} (pokus ${attempt + 1}), opakuji za ${wait}s...`, {
             provider, model: m, attempt: attempt + 1, waitSeconds: wait, error: e.message
           });
           showToast(t('toast.serviceUnavailable.retryIn', { seconds: wait }));
           await sleep(wait * 1000);
           continue;
         }
         if (isBanned) {
           logError('callAIWithRetry', new Error(`BlokovanÃ½ ÃºÄet: ${m}`), {
             provider, model: m, attempt: attempt + 1
           });
           break;
         }
         // Other errors - log and try next model/attempt
         logWarn('callAIWithRetry', `Chyba pÅ™i volÃ¡nÃ­ ${m} (pokus ${attempt+1}): ${e.message}`, {
           provider, model: m, attempt: attempt + 1, error: e.message
         });
         break;
       }
    }
  }
  throw lastErr || new Error('VÅ¡echny modely selhaly');
}

function getTranslationEngineLabel(raw, fallbackProvider, fallbackModel) {
  const provider = raw?.providerUsed || fallbackProvider || '?';
  const resolved = raw?.resolvedModel || raw?.attemptedModel || fallbackModel || '?';
  const requested = raw?.requestedModel || fallbackModel || resolved;
  if (provider === 'openrouter' && requested === 'openrouter/free' && resolved !== requested) {
    return `${provider} | auto-router -> ${resolved}`;
  }
  if (resolved !== requested) {
    return `${provider} | ${resolved} (fallback from ${requested})`;
  }
  return `${provider} | ${resolved}`;
}

async function callOnce(provider, apiKey, model, messages, externalSignal = null) {
  apiKey = apiKey.trim();
  const controller = new AbortController();
  let externalAbortHandler = null;
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalAbortHandler = () => controller.abort();
      externalSignal.addEventListener('abort', externalAbortHandler, { once: true });
    }
  }
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CONFIG.API_TIMEOUT);
  
  // Load AI settings from localStorage (per provider with legacy fallback)
  const temperature = parseFloat(localStorage.getItem(`strong_ai_temperature_${provider}`) || localStorage.getItem('strong_ai_temperature') || '0.3') || 0.3;
  const maxTokens = parseInt(localStorage.getItem(`strong_ai_max_tokens_${provider}`) || localStorage.getItem('strong_ai_max_tokens') || '2500', 10) || 2500;
  
  try {
    if (provider === 'groq') {
    const r = await fetch('https://corsproxy.io/?https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages,
        temperature: temperature, max_tokens: maxTokens }),
      signal: controller.signal
    });
    const d = await r.json();
    const rateInfo = {
      provider: 'groq',
      requestId: r.headers.get('x-request-id') || r.headers.get('request-id') || '',
      retryAfterSec: Number(r.headers.get('retry-after') || 0) || 0,
      remaining: r.headers.get('x-ratelimit-remaining-requests') || r.headers.get('x-ratelimit-remaining-tokens') || '',
      reset: r.headers.get('x-ratelimit-reset-requests') || r.headers.get('x-ratelimit-reset-tokens') || ''
    };
     if (!r.ok) {
       if (r.status === 429) {
         throw new Error(`Rate limit! Zkuste za ${rateInfo.retryAfterSec || 'nÄ›kolik'}s. Info: groq.com/pricing${rateInfo.requestId ? ` [req:${rateInfo.requestId}]` : ''}`);
       }
       throw new Error(d.error?.message || String(r.status));
     }
     // Validate response structure
     validateAPIResponse(d, 'groq');
     if (d.usage) {
       log(`ðŸ“Š Groq: ${d.usage.prompt_tokens} in / ${d.usage.completion_tokens} out / ${d.usage.total_tokens} total`);
     }
     const content = d.choices[0].message.content;
    // Kontrola na nesmyslnou odpovÄ›Ä
    const weirdChars = (content.match(/[^\x20-\x7E\n\r\tÄ›Å¡ÄÅ™Å¾Ã½Ã¡Ã­Ã©ÃºÅ¯Å¥ÄÅˆÄšÅ ÄŒÅ˜Å½ÃÃÃÃ‰ÃšÅ®Å¤ÄŽÅ‡]/g) || []).length;
    if (content.length > 0 && weirdChars > content.length * 0.5) {
      console.log('â• PODEZÅ˜ELÃ ODPOVÄšÄŽ â•');
      console.log(content);
      throw new Error('AI vrÃ¡tila nesmyslnou odpovÄ›Ä - zkuste delÅ¡Ã­ interval');
    }
    return { content, usage: d.usage, resolvedModel: d.model || model, rateInfo };

   } else if (provider === 'gemini') {
     const userContent = messages.find(m => m.role === 'user')?.content || '';
     const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
     const r = await fetch(url, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ contents: [{ parts: [{ text: userContent }] }],
         systemInstruction: { parts: [{ text: messages.find(m => m.role === 'system')?.content || '' }] },
         generationConfig: { temperature: temperature, maxOutputTokens: maxTokens } }),
       signal: controller.signal
     });
    const d = await r.json();
     if (!r.ok) {
       if (r.status === 503 || d.error?.status === 'UNAVAILABLE') {
         throw new Error('503 Service Unavailable: Gemini je doÄasnÄ› pÅ™etÃ­Å¾enÃ©, opakuji pozdÄ›ji.');
       }
       if (d.error?.status === 'RESOURCE_EXHAUSTED') {
         const details = String(d.error?.message || '').trim();
         throw new Error(`Gemini limit vyÄerpÃ¡n! PoÄkej ~20min nebo pÅ™epni na Groq.${details ? ` Detail: ${details}` : ''}`);
       }
       throw new Error(d.error?.message || String(r.status));
     }
     // Validate response structure
     validateAPIResponse(d, 'gemini');
     if (d.usageMetadata) {
       log(`ðŸ“Š Gemini: ${d.usageMetadata.promptTokenCount} in / ${d.usageMetadata.candidatesTokenCount} out`);
     }
      const content = d.candidates[0].content.parts[0].text;
      return { content, usage: d.usageMetadata, resolvedModel: d.modelVersion || d.model || model, rateInfo: { provider: 'gemini' } };

     } else if (provider === 'openrouter') {
      const r = await fetch('https://corsproxy.io/?https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer ' + apiKey, 
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://strong-bible-gr-cz.local',
          'X-Title': 'Strong GR-CZ Translator'
        },
        body: JSON.stringify({ model, messages,
          temperature: temperature, max_tokens: maxTokens }),
        signal: controller.signal
      });
     const d = await r.json();
     if (!r.ok) {
       const errMsg = d?.error?.message || d?.message || String(r.status);
       const errCode = String(d?.error?.code || '');
       if (r.status === 429 || errCode === '429') {
         throw new Error(`429 Rate limit: ${errMsg}`);
       }
       throw new Error(`OpenRouter ${r.status}: ${errMsg}`);
     }
     validateAPIResponse(d, 'openrouter');
     const content = extractOpenRouterText(d);
     if (!content) throw new Error('OpenRouter nevrÃ¡til ÄitelnÃ½ text');
    return { content, usage: d.usage, resolvedModel: d.model || model, rateInfo: { provider: 'openrouter' } };
  }
  throw new Error('NeznÃ¡mÃ½ provider');
  } catch (e) {
    if (timedOut && e?.name === 'AbortError') {
      throw new Error(`API timeout po ${Math.round(CONFIG.API_TIMEOUT / 1000)}s`);
    }
    if (externalSignal?.aborted && e?.name === 'AbortError') {
      throw new Error('PoÅ¾adavek zruÅ¡en uÅ¾ivatelem');
    }
    throw e;
  } finally {
    if (externalSignal && externalAbortHandler) {
      externalSignal.removeEventListener('abort', externalAbortHandler);
    }
    clearTimeout(timeout);
  }
}

  // Use core module with error handling
  function parseTranslations(raw, keys) {
    try {
      const parsed = parseWithOpenRouterNormalization(raw, keys, state.translated);
      if (parsed.normalizedUsed) {
        log('â„¹ AUTO_NORMALIZOVANO_Z_OPENROUTER_FORMATU');
      }
      return parsed.missing;
    } catch(e) {
      logError('parseTranslations', e, {
        rawLength: raw?.length,
        keysCount: keys?.length,
        keysSample: keys?.slice(0, 5)
      });
      // Return all keys as missing to trigger retry
      return keys;
    }
  }

  return { callAIWithRetry, callOnce, getTranslationEngineLabel, getProviderConfiguredModels, getFallbackModels, resetPrompt };
}