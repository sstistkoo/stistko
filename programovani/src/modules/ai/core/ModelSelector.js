/**
 * Model Selector & Rate Limit Manager
 * ====================================
 * Inteligentní výběr AI modelů s ochranou před rate limity
 *
 * @version 1.0
 * @author Claude AI
 */

(function(global) {
    'use strict';

    class ModelSelector {
        constructor(aiModule) {
            this.ai = aiModule;

        // Modely seřazené podle kvality pro kódování (od nejlepšího)
        this.CODING_MODELS_PRIORITY = [
            // Tier 1: Nejlepší pro kódování (90-100 kvalita)
            { provider: 'gemini', model: 'gemini-2.5-flash', rpm: 15, quality: 95, penaltyMinutes: 120 },
            { provider: 'gemini', model: 'gemini-2.5-pro', rpm: 5, quality: 98, penaltyMinutes: 180 },
            { provider: 'groq', model: 'llama-3.3-70b-versatile', rpm: 30, quality: 92, penaltyMinutes: 30 },

            // Tier 2: Velmi dobré (80-90 kvalita)
            { provider: 'groq', model: 'mixtral-8x7b-32768', rpm: 30, quality: 88, penaltyMinutes: 30 },
            { provider: 'mistral', model: 'codestral-latest', rpm: 10, quality: 90, penaltyMinutes: 90 },
            { provider: 'mistral', model: 'mistral-small-latest', rpm: 30, quality: 85, penaltyMinutes: 90 },
            { provider: 'cohere', model: 'command-r-plus', rpm: 20, quality: 87, penaltyMinutes: 90 },

            // Tier 3: Dobré (70-80 kvalita)
            { provider: 'groq', model: 'gemma-2-9b-it', rpm: 30, quality: 78, penaltyMinutes: 30 },
            { provider: 'cohere', model: 'command-r', rpm: 20, quality: 82, penaltyMinutes: 90 },
            { provider: 'openrouter', model: 'deepseek/deepseek-r1-0528:free', rpm: 20, quality: 96, penaltyMinutes: 90 },
            { provider: 'openrouter', model: 'mistralai/devstral-2512:free', rpm: 20, quality: 93, penaltyMinutes: 90 },
            { provider: 'huggingface', model: 'Qwen/Qwen2.5-7B-Instruct', rpm: 10, quality: 76, penaltyMinutes: 180 },

            // Tier 4: Základní (60-70 kvalita)
            { provider: 'huggingface', model: 'meta-llama/Llama-3.2-3B-Instruct', rpm: 10, quality: 70, penaltyMinutes: 180 },
            { provider: 'openrouter', model: 'mistralai/mistral-small-3.1-24b-instruct:free', rpm: 20, quality: 75, penaltyMinutes: 90 }
        ];

        // Tracking rate limitů pro každý model
        this.modelTracking = {};
    }

    /**
     * Inicializuje tracking pro model
     */
    _initTracking(provider, model) {
        const key = `${provider}:${model}`;
        if (!this.modelTracking[key]) {
            this.modelTracking[key] = {
                requests: [], // Časová razítka požadavků
                limitHit: null, // Kdy byl hit limit
                limitType: null, // 'rpm', 'daily', 'quota'
                resetAt: null, // Kdy se limit resetuje
                penaltyUntil: null // Penalty za překročení
            };
        }
        return this.modelTracking[key];
    }

    /**
     * Zkontroluje zda je model dostupný (respektuje rate limity)
     */
    isModelAvailable(provider, model) {
        const key = `${provider}:${model}`;
        const tracking = this.modelTracking[key];

        if (!tracking) return true; // První požadavek

        const now = Date.now();

        // Zkontroluj penalty
        if (tracking.penaltyUntil && now < tracking.penaltyUntil) {
            const waitMinutes = Math.ceil((tracking.penaltyUntil - now) / 60000);
            console.log(`⏸️ ${key} v penalty (čeká ${waitMinutes}min)`);
            return false;
        }

        // Zkontroluj reset time pro jiné limity
        if (tracking.resetAt && now < tracking.resetAt) {
            const waitMinutes = Math.ceil((tracking.resetAt - now) / 60000);
            console.log(`⏸️ ${key} čeká na reset ${tracking.limitType} (${waitMinutes}min)`);
            return false;
        }

        // Zkontroluj RPM limit
        const modelInfo = this.CODING_MODELS_PRIORITY.find(m => m.provider === provider && m.model === model);
        if (modelInfo) {
            // Vyčisti staré requesty (starší než 1 minuta)
            const oneMinuteAgo = now - 60000;
            tracking.requests = tracking.requests.filter(t => t > oneMinuteAgo);

            // Zkontroluj zda máme místo
            if (tracking.requests.length >= modelInfo.rpm) {
                const oldestRequest = tracking.requests[0];
                const waitMs = 60000 - (now - oldestRequest);
                const waitSeconds = Math.ceil(waitMs / 1000);
                console.log(`⏸️ ${key} RPM limit (čeká ${waitSeconds}s)`);
                return false;
            }
        }

        return true;
    }

    /**
     * Zaznamenává request pro model
     */
    recordRequest(provider, model) {
        const tracking = this._initTracking(provider, model);
        tracking.requests.push(Date.now());
    }

    /**
     * Zaznamenává hit limitu
     */
    recordLimitHit(provider, model, limitType, errorMessage) {
        const tracking = this._initTracking(provider, model);
        const now = Date.now();
        const modelInfo = this.CODING_MODELS_PRIORITY.find(m => m.provider === provider && m.model === model);

        tracking.limitHit = now;
        tracking.limitType = limitType;

        if (limitType === 'rpm') {
            // RPM limit - čekej 1 minutu + penalty
            tracking.resetAt = now + 60000;
            if (modelInfo) {
                tracking.penaltyUntil = now + (modelInfo.penaltyMinutes * 60000);
                console.log(`🚫 ${provider}:${model} RPM limit - penalty ${modelInfo.penaltyMinutes}min`);
            }
        } else if (limitType === 'daily' || limitType === 'quota') {
            // Daily/quota limit - čekej do půlnoci nebo 24h
            const tomorrow = new Date();
            tomorrow.setHours(24, 0, 0, 0);
            tracking.resetAt = tomorrow.getTime();
            console.log(`🚫 ${provider}:${model} ${limitType} limit - reset zítra`);
        } else {
            // Neznámý limit - čekej 1h
            tracking.resetAt = now + 3600000;
            console.log(`🚫 ${provider}:${model} ${limitType} limit - čeká 1h`);
        }
    }

    /**
     * Najde nejlepší dostupný model pro kódování
     */
    selectBestCodingModel() {
        // Projdi modely podle priority
        for (const modelInfo of this.CODING_MODELS_PRIORITY) {
            // Zkontroluj zda má API klíč
            if (!this.ai.getKey(modelInfo.provider)) {
                continue;
            }

            // Zkontroluj zda je dostupný (respektuje limity)
            if (this.isModelAvailable(modelInfo.provider, modelInfo.model)) {
                console.log(`✅ Vybrán nejlepší model: ${modelInfo.provider}/${modelInfo.model} (kvalita: ${modelInfo.quality})`);
                return {
                    provider: modelInfo.provider,
                    model: modelInfo.model,
                    quality: modelInfo.quality
                };
            }
        }

        // Žádný model není dostupný - použij fallback na původní selectBestModel
        console.warn('⚠️ Žádný prioritní model dostupný, používám fallback');
        return this.ai.selectBestModel();
    }

    /**
     * Vrátí statistiky všech modelů
     */
    getStats() {
        const stats = [];
        for (const [key, tracking] of Object.entries(this.modelTracking)) {
            const [provider, model] = key.split(':');
            const modelInfo = this.CODING_MODELS_PRIORITY.find(m => m.provider === provider && m.model === model);
            const available = this.isModelAvailable(provider, model);

            stats.push({
                key,
                provider,
                model,
                quality: modelInfo?.quality || 'N/A',
                rpm: modelInfo?.rpm || 'N/A',
                available,
                requestCount: tracking.requests.length,
                limitType: tracking.limitType,
                resetAt: tracking.resetAt ? new Date(tracking.resetAt).toLocaleString() : null,
                penaltyUntil: tracking.penaltyUntil ? new Date(tracking.penaltyUntil).toLocaleString() : null
            });
        }
        return stats;
    }

    /**
     * Reset všech trackingů (pro debugging)
     */
    resetAllTracking() {
        this.modelTracking = {};
        console.log('🔄 Všechny rate limit trackingy resetovány');
    }
}

    // Export do globálního objektu
    global.ModelSelector = ModelSelector;

})(window);
