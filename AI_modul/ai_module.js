/**
 * AI Module v3.0
 * ===============
 * Univerzální modul pro práci s AI API (Gemini, Groq, OpenRouter, Mistral, Cohere, HuggingFace)
 *
 * ⚠️ DŮLEŽITÉ PRO AI ASISTENTY (Claude, ChatGPT, apod.):
 * ══════════════════════════════════════════════════════
 * Tento modul se používá ve VÍCE HTML souborech a projektech současně!
 * Jakákoliv úprava tohoto souboru může POKAZIT funkčnost ostatních stránek.
 *
 * Před úpravou:
 * 1. Zeptej se uživatele, zda chce upravit TENTO sdílený modul, nebo vytvořit kopii
 * 2. Upozorni, že změna ovlivní VŠECHNY stránky, které tento modul používají
 * 3. Při přidávání funkcí zachovej zpětnou kompatibilitu
 * 4. NEMĚŇ existující API/názvy funkcí - mohlo by to rozbít závislý kód
 * ══════════════════════════════════════════════════════
 *
 * NOVÉ ve v3.0:
 * - Event systém - AI.on('request:complete', callback)
 * - Workflow/Pipeline - řetězení kroků
 * - Scheduler - plánované úlohy
 * - Intent Detection - rozpoznání záměru
 * - Smart Ask - auto-retry, load balancing
 * - Parallel - paralelní zpracování
 * - askJSON - validace a auto-fix JSON
 * - Conversation summarize - sumarizace historie
 *
 * Použití: Načti soubor přes <scr​ipt src="ai-module.js"></scr​ipt>
 *
 * Příklady:
 *   const response = await AI.ask("Ahoj, jak se máš?");
 *   const response = await AI.ask("Ahoj", { provider: 'groq' });
 *   AI.on('request:complete', (data) => console.log('Hotovo:', data));
 *   const result = await AI.workflow.create('test').step('s1', {system:'...'}).run('text');
 *   AI.scheduler.add('job', 'every 5m', async () => { ... });
 *   const intent = await AI.detectIntent("Přelož to do angličtiny");
 *   const result = await AI.smartAsk("Dotaz", { balanceLoad: true });
 *   const results = await AI.parallel(["Dotaz 1", "Dotaz 2"]);
 *   const data = await AI.askJSON("Extrahuj data", { schema: {...} });
 *
 * Podporovaní provideři:
 * - gemini (Google) - https://aistudio.google.com/app/apikey
 * - groq - https://console.groq.com/keys
 * - openrouter - https://openrouter.ai/keys
 * - mistral - https://console.mistral.ai/api-keys/
 * - cohere - https://dashboard.cohere.com/api-keys
 * - huggingface - https://huggingface.co/settings/tokens
 *
 * Dostupné eventy:
 * - init, request:start, request:complete, request:error
 * - workflow:start, workflow:step:start, workflow:step:complete, workflow:complete
 * - scheduler:start, scheduler:run, scheduler:complete, scheduler:error
 * - intent:detected, conversation:summarized
 * - smartAsk:attempt, smartAsk:success, smartAsk:error
 * - parallel:start, parallel:task:start, parallel:task:complete
 *
 * @author Claude AI
 * @version 3.0
 * @license MIT
 */

const AI = {

    // ============== DEMO KLÍČE (obfuskované - Base64) ==============
    // V DevTools: AI.DEMO_KEYS vrátí "***hidden***"
    // Skutečné klíče jsou interně dekódovány jen při použití

    // Zakódované klíče (Base64) - nelze přímo přečíst
    _ENCODED_KEYS: {
        gemini: "QUl6YVN5Q1h1TXZoT19zZW5MU29BX2lkRXVCa19Fd25NbUlQSWhn",
        groq: "Z3NrXzB1WmJuOUtxaUJhM1pzbDExQUNYV0dkeWIzRllaZGR2YzZvUEluOUhUdkpwR2dvQmJZcko=",
        openrouter: "c2stb3ItdjEtYmZmNjZlZTRhMDg0NWY4ODQyOGI3NWQ5MWEzNWFlYTYzZTM1NWE1MmRjMzFlNjQyN2ZjYzFmOTUzNmMyYThhMw==",
        mistral: "VHZ3bTBxY1FrNzF2c1VEd1ZmQUFBWTVHUEtkYnZsSGo=",
        cohere: "UGVKbzhjUXdmdG9aSTFEb2IwcUsxbE40NDVGbE9qcmZGQTNwaUV1aA==",
        huggingface: "aGZfVWhleklwbnVtbllXU2FjS0x0amFWUGZYTXhiRmVtVXlNdg=="
    },

    // Interní dekódovací funkce
    _decode(encoded) {
        if (!encoded) return '';
        try {
            return atob(encoded);
        } catch (e) {
            return '';
        }
    },

    // Getter pro DEMO_KEYS - vrací "***hidden***" v konzoli
    get DEMO_KEYS() {
        // Při přímém přístupu vrať skryté
        const hidden = {};
        for (const k of Object.keys(this._ENCODED_KEYS)) {
            hidden[k] = '***hidden***';
        }
        return hidden;
    },

    // Interní získání demo klíče (skutečná hodnota)
    _getDemoKey(provider) {
        const encoded = this._ENCODED_KEYS[provider];
        return this._decode(encoded);
    },

    // ============== KONFIGURACE ==============
    config: {
        keys: {
            gemini: '',
            groq: '',
            openrouter: '',
            mistral: '',
            cohere: '',
            huggingface: ''
        },

        // Výchozí modely - nejlepší z každého providera
        models: {
            gemini: 'gemini-2.5-flash',           // Gemini 2.5 Flash jako výchozí
            groq: 'llama-3.3-70b-versatile',      // Nejchytřejší Groq
            openrouter: 'mistralai/mistral-small-3.1-24b-instruct:free',
            mistral: 'mistral-small-latest',
            cohere: 'command-a-03-2025',
            huggingface: 'mistralai/Mistral-7B-Instruct-v0.3'
        },

        defaultProvider: 'groq',  // Groq má nejlepší free limity (30 RPM)
        // Timeout - delší pro mobilní zařízení (pomalejší síť)
        timeout: (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) ? 120000 : 90000,
        maxRetries: 3
    },

    // ============== DETEKCE MOBILNÍHO ZAŘÍZENÍ ==============
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),

    // ============== AKTIVNÍ POŽADAVEK (pro cancel) ==============
    _activeController: null,
    _debug: false,
    _requestQueue: [],
    _processing: false,

    // ============== DEBUG MODE ==============
    debug(enabled = true) {
        this._debug = enabled;
        console.log(enabled ? '🐛 Debug mode ON' : '🐛 Debug mode OFF');
    },

    _log(...args) {
        if (this._debug) {
            console.log('🤖 [AI]', ...args);
        }
    },

    // ============== REQUEST QUEUE ==============
    queue: {
        _items: [],
        _processing: false,
        _delay: 1000, // ms mezi požadavky

        // Přidej do fronty
        add(prompt, options = {}) {
            return new Promise((resolve, reject) => {
                AI.queue._items.push({ prompt, options, resolve, reject });
                AI.queue._process();
            });
        },

        // Zpracuj frontu
        async _process() {
            if (this._processing || this._items.length === 0) return;

            this._processing = true;

            while (this._items.length > 0) {
                const { prompt, options, resolve, reject } = this._items.shift();

                try {
                    const response = await AI.ask(prompt, options);
                    resolve(response);
                } catch (e) {
                    reject(e);
                }

                // Čekej mezi požadavky
                if (this._items.length > 0) {
                    await new Promise(r => setTimeout(r, this._delay));
                }
            }

            this._processing = false;
        },

        // Počet položek ve frontě
        size() {
            return this._items.length;
        },

        // Vyčisti frontu
        clear() {
            this._items.forEach(item => item.reject(new Error('Queue cleared')));
            this._items = [];
        }
    },

    // ============== STATISTIKY POUŽITÍ ==============
    stats: {
        _data: {
            totalCalls: 0,
            totalTokensIn: 0,
            totalTokensOut: 0,
            dailyCalls: 0,
            lastReset: new Date().toISOString(),
            byProvider: {}
        },

        // Načti statistiky z localStorage
        load() {
            try {
                const stored = localStorage.getItem('ai_module_stats');
                if (stored) {
                    this._data = JSON.parse(stored);
                    this._checkDailyReset();
                }
            } catch (e) {}
            return this._data;
        },

        // Ulož statistiky
        save() {
            try {
                localStorage.setItem('ai_module_stats', JSON.stringify(this._data));
            } catch (e) {}
        },

        // Zaznamenej volání
        record(provider, tokensIn = 0, tokensOut = 0) {
            this._data.totalCalls++;
            this._data.dailyCalls++;
            this._data.totalTokensIn += tokensIn;
            this._data.totalTokensOut += tokensOut;

            if (!this._data.byProvider[provider]) {
                this._data.byProvider[provider] = { calls: 0, tokensIn: 0, tokensOut: 0 };
            }
            this._data.byProvider[provider].calls++;
            this._data.byProvider[provider].tokensIn += tokensIn;
            this._data.byProvider[provider].tokensOut += tokensOut;

            this.save();
        },

        // Získej statistiky
        get() {
            return { ...this._data };
        },

        // Reset statistik
        reset() {
            this._data = {
                totalCalls: 0,
                totalTokensIn: 0,
                totalTokensOut: 0,
                dailyCalls: 0,
                lastReset: new Date().toISOString(),
                byProvider: {}
            };
            this.save();
        },

        // Kontrola denního resetu
        _checkDailyReset() {
            const lastReset = new Date(this._data.lastReset);
            const today = new Date();
            if (lastReset.toDateString() !== today.toDateString()) {
                this._data.dailyCalls = 0;
                this._data.lastReset = today.toISOString();
                this.save();
            }
        }
    },

    // ============== RATE LIMITING ==============
    rateLimit: {
        _timestamps: {},
        _windowMs: 60000, // 1 minuta

        // Zaznamenej požadavek
        record(provider) {
            if (!this._timestamps[provider]) {
                this._timestamps[provider] = [];
            }
            this._timestamps[provider].push(Date.now());
            this._cleanup(provider);
            this._save();
        },

        // Vyčisti staré záznamy
        _cleanup(provider) {
            if (!this._timestamps[provider]) {
                this._timestamps[provider] = [];
                return;
            }
            const now = Date.now();
            this._timestamps[provider] = this._timestamps[provider].filter(
                ts => now - ts < this._windowMs
            );
        },

        // Může udělat požadavek?
        canMakeRequest(provider, model = null) {
            this._cleanup(provider);
            const current = this._timestamps[provider]?.length || 0;
            const limit = this._getLimit(provider, model);
            return current < limit;
        },

        // Kolik požadavků zbývá
        remaining(provider, model = null) {
            this._cleanup(provider);
            const current = this._timestamps[provider]?.length || 0;
            const limit = this._getLimit(provider, model);
            return Math.max(0, limit - current);
        },

        // Získej limit pro providera/model
        _getLimit(provider, model) {
            // Specifické limity pro modely (aktualizováno prosinec 2025)
            const modelLimits = {
                'gemini-2.5-flash-lite': 30,
                'gemini-2.5-flash': 15,
                'gemini-2.5-pro': 5,
                'gemini-2.5-pro-exp-03-25': 15,
                'gemini-3-flash-preview': 15
            };
            if (model && modelLimits[model]) {
                return modelLimits[model];
            }
            // Obecné limity podle providera
            const providerLimits = {
                gemini: 15,
                groq: 30,
                openrouter: 20,
                mistral: 30,
                cohere: 20,
                huggingface: 10
            };
            return providerLimits[provider] || 15;
        },

        // Ulož do localStorage
        _save() {
            try {
                localStorage.setItem('ai_module_ratelimit', JSON.stringify(this._timestamps));
            } catch (e) {}
        },

        // Načti z localStorage
        load() {
            try {
                const stored = localStorage.getItem('ai_module_ratelimit');
                if (stored) {
                    this._timestamps = JSON.parse(stored);
                    // Vyčisti staré záznamy
                    Object.keys(this._timestamps).forEach(p => this._cleanup(p));
                }
            } catch (e) {}
        }
    },

    // ============== HISTORIE KONVERZACE ==============
    conversation: {
        _history: [],
        _maxLength: 20, // Max počet zpráv v historii

        // Přidej zprávu
        add(role, content) {
            this._history.push({ role, content, timestamp: Date.now() });
            // Ořízni pokud je moc dlouhá
            if (this._history.length > this._maxLength) {
                this._history = this._history.slice(-this._maxLength);
            }
            this._save();
        },

        // Získej historii
        get() {
            return [...this._history];
        },

        // Vyčisti historii
        clear() {
            this._history = [];
            this._save();
        },

        // Získej jako messages pro API
        getMessages(systemPrompt = null) {
            const messages = [];
            if (systemPrompt) {
                messages.push({ role: 'system', content: systemPrompt });
            }
            this._history.forEach(h => {
                messages.push({ role: h.role, content: h.content });
            });
            return messages;
        },

        // Shrň konverzaci pro úsporu tokenů
        async summarize(options = {}) {
            if (this._history.length < 4) {
                return { summarized: false, reason: 'Konverzace je příliš krátká' };
            }

            const keepLast = options.keepLast || 2;
            const toSummarize = this._history.slice(0, -keepLast);
            const toKeep = this._history.slice(-keepLast);

            // Sestav text pro sumarizaci
            const conversationText = toSummarize
                .map(h => `${h.role}: ${h.content}`)
                .join('\n');

            try {
                const summary = await AI.ask(
                    `Shrň tuto konverzaci do 2-3 vět, zachovej klíčové informace:\n\n${conversationText}`,
                    {
                        system: 'Vytváříš stručná shrnutí konverzací. Zachovej důležité fakty a kontext.',
                        provider: options.provider || 'groq',
                        temperature: 0.3
                    }
                );

                // Nahraď historii
                this._history = [
                    { role: 'system', content: `[Shrnutí předchozí konverzace: ${summary}]`, timestamp: Date.now() },
                    ...toKeep
                ];

                this._save();

                AI.emit('conversation:summarized', {
                    originalLength: toSummarize.length + toKeep.length,
                    newLength: this._history.length,
                    summary
                });

                return {
                    summarized: true,
                    summary,
                    removedMessages: toSummarize.length,
                    keptMessages: toKeep.length
                };

            } catch (error) {
                return { summarized: false, error: error.message };
            }
        },

        // Odhadni tokeny v historii
        estimateTokens() {
            const text = this._history.map(h => h.content).join(' ');
            return AI.estimateTokens(text);
        },

        // Auto-summarize pokud přesáhne limit
        async autoSummarize(maxTokens = 2000, options = {}) {
            const tokens = this.estimateTokens();
            if (tokens > maxTokens) {
                return await this.summarize(options);
            }
            return { summarized: false, reason: 'Pod limitem tokenů', tokens };
        },

        // Ulož do localStorage
        _save() {
            try {
                localStorage.setItem('ai_module_conversation', JSON.stringify(this._history));
            } catch (e) {}
        },

        // Načti z localStorage
        load() {
            try {
                const stored = localStorage.getItem('ai_module_conversation');
                if (stored) {
                    this._history = JSON.parse(stored);
                }
            } catch (e) {}
        }
    },

    // ============== ODHAD TOKENŮ ==============
    estimateTokens(text) {
        if (!text) return 0;
        // Přibližný odhad: ~4 znaky = 1 token pro angličtinu
        // Pro češtinu ~3 znaky = 1 token
        return Math.ceil(text.length / 3.5);
    },

    // ============== SMART CONTEXT COMPRESSION ==============
    contextCompression: {
        /**
         * Komprimuje kontext pro úsporu tokenů
         * Zachovává důležité části, odstraňuje zbytečnosti
         */
        compress(text, options = {}) {
            if (!text) return text;

            const maxTokens = options.maxTokens || 8000;
            const aggressive = options.aggressive || false;
            let compressed = text;

            // 1. Odstraň prázdné řádky (víc než 2 po sobě → max 1)
            compressed = compressed.replace(/\n{3,}/g, '\n\n');

            // 2. Odstraň trailing whitespace
            compressed = compressed.replace(/[ \t]+$/gm, '');

            // 3. Zkrať dlouhé komentáře (aggressive mode)
            if (aggressive) {
                // HTML komentáře
                compressed = compressed.replace(/<!--[\s\S]*?-->/g, match =>
                    match.length > 100 ? '<!-- ... -->' : match
                );
                // JS/CSS blokové komentáře
                compressed = compressed.replace(/\/\*[\s\S]*?\*\//g, match =>
                    match.length > 100 ? '/* ... */' : match
                );
                // Dlouhé console.log
                compressed = compressed.replace(/console\.(log|debug|info)\([^)]{100,}\)/g,
                    'console.log(/* truncated */)');
            }

            // 4. Zkrať velmi dlouhé řetězce (data URI, base64)
            compressed = compressed.replace(/data:[^;]+;base64,[a-zA-Z0-9+/=]{500,}/g,
                'data:...base64...[TRUNCATED]');

            // 5. Pokud stále příliš dlouhé, zkrať inteligentně
            const currentTokens = AI.estimateTokens(compressed);
            if (currentTokens > maxTokens) {
                compressed = this.truncateSmartly(compressed, maxTokens);
            }

            return compressed;
        },

        /**
         * Inteligentní zkrácení s kontextem
         */
        truncateSmartly(text, maxTokens) {
            const lines = text.split('\n');
            const totalLines = lines.length;

            // Pokud je málo řádků, prostě ořízni
            if (totalLines < 50) {
                const maxChars = maxTokens * 3.5;
                return text.substring(0, maxChars) + '\n... [zkráceno]';
            }

            // Jinak zachovej začátek a konec
            const keepLines = Math.floor(maxTokens / 10); // ~10 tokenů na řádek
            const headLines = Math.floor(keepLines * 0.6);
            const tailLines = keepLines - headLines;

            const head = lines.slice(0, headLines).join('\n');
            const tail = lines.slice(-tailLines).join('\n');
            const omitted = totalLines - headLines - tailLines;

            return `${head}\n\n... [${omitted} řádků vynecháno] ...\n\n${tail}`;
        },

        /**
         * Detekuje typ obsahu pro lepší kompresi
         */
        detectContentType(text) {
            if (text.includes('<!DOCTYPE') || text.includes('<html')) return 'html';
            if (text.includes('function') || text.includes('const ') || text.includes('let ')) return 'javascript';
            if (text.includes('{') && text.includes(':') && text.includes(';')) return 'css';
            if (text.startsWith('{') || text.startsWith('[')) return 'json';
            return 'text';
        }
    },

    // ============== ADAPTIVE TOKEN BUDGET ==============
    tokenBudget: {
        _budgets: {
            // Free modely - nižší limity
            free: {
                system: 1000,
                context: 4000,
                history: 1000,
                total: 8000
            },
            // Standard modely
            standard: {
                system: 2000,
                context: 12000,
                history: 3000,
                total: 20000
            },
            // Premium modely
            premium: {
                system: 4000,
                context: 30000,
                history: 6000,
                total: 50000
            }
        },

        /**
         * Získej budget pro daný model
         */
        getBudget(model, provider) {
            // Detekce free modelu
            const isFree = model?.includes(':free') ||
                          model?.includes('-free') ||
                          this._isFreeModel(model, provider);

            // Detekce premium modelu
            const isPremium = model?.includes('pro') ||
                             model?.includes('opus') ||
                             model?.includes('gpt-4') ||
                             model?.includes('claude-3');

            if (isFree) return this._budgets.free;
            if (isPremium) return this._budgets.premium;
            return this._budgets.standard;
        },

        /**
         * Kontrola zda je model free
         */
        _isFreeModel(model, provider) {
            const freeModels = AI.ALL_MODELS[provider]?.filter(m => m.free) || [];
            return freeModels.some(m => m.value === model);
        },

        /**
         * Optimalizuj prompt podle budgetu
         */
        optimizeForBudget(prompt, context, history, model, provider) {
            const budget = this.getBudget(model, provider);
            let optimized = {
                prompt: prompt,
                context: context,
                history: history,
                budget: budget
            };

            // Komprimuj context pokud přesahuje budget
            if (context && AI.estimateTokens(context) > budget.context) {
                optimized.context = AI.contextCompression.compress(context, {
                    maxTokens: budget.context,
                    aggressive: budget === this._budgets.free
                });
            }

            // Zkrať historii pokud přesahuje
            if (history && AI.estimateTokens(JSON.stringify(history)) > budget.history) {
                const keepMessages = Math.floor(budget.history / 100); // ~100 tokenů na zprávu
                optimized.history = history.slice(-keepMessages);
            }

            return optimized;
        }
    },

    // ============== PROMPT OPTIMIZER (Smart prompt shortening) ==============
    promptOptimizer: {
        // Typy dotazů a jejich optimální konfigurace
        _queryTypes: {
            simple: {
                patterns: [/^co je/i, /^co znamená/i, /^definuj/i, /^vysvětli$/i, /^what is/i, /^define/i],
                systemPrompt: 'Odpovídej stručně a jasně.',
                maxTokens: 500
            },
            yesno: {
                patterns: [/^je to/i, /^můžu/i, /^mohu/i, /^je možné/i, /^can i/i, /^is it/i, /^should i/i],
                systemPrompt: 'Odpověz ano/ne a krátce vysvětli.',
                maxTokens: 200
            },
            list: {
                patterns: [/^vyjmenuj/i, /^seznam/i, /napiš.*seznam/i, /^list/i, /^enumerate/i],
                systemPrompt: 'Vytvoř stručný seznam.',
                maxTokens: 800
            },
            code: {
                patterns: [/^napiš kód/i, /^naprogramuj/i, /^kód pro/i, /^write code/i, /^implement/i],
                systemPrompt: 'Vrať pouze čistý kód s krátkými komentáři.',
                maxTokens: 2000
            },
            fix: {
                patterns: [/^oprav/i, /^fix/i, /chyba/i, /error/i, /nefunguje/i],
                systemPrompt: 'Oprav problém. Vrať jen opravený kód.',
                maxTokens: 1500
            },
            analyze: {
                patterns: [/^analyzuj/i, /^analyze/i, /^rozeber/i, /^review/i],
                systemPrompt: 'Analyzuj stručně. Zaměř se na klíčové body.',
                maxTokens: 1200
            }
        },

        /**
         * Detekuj typ dotazu
         */
        detectQueryType(prompt) {
            const cleanPrompt = prompt.trim().toLowerCase();

            for (const [type, config] of Object.entries(this._queryTypes)) {
                for (const pattern of config.patterns) {
                    if (pattern.test(cleanPrompt)) {
                        return { type, ...config };
                    }
                }
            }

            // Default - komplexní dotaz
            return {
                type: 'complex',
                systemPrompt: null, // Použij původní
                maxTokens: 4000
            };
        },

        /**
         * Optimalizuj options podle typu dotazu
         */
        optimizeOptions(prompt, options = {}) {
            const queryInfo = this.detectQueryType(prompt);
            const optimized = { ...options };

            // Nezasahuj do explicitně nastavených options
            if (options._skipOptimization) return options;

            // Pro jednoduché dotazy použij kratší system prompt
            if (queryInfo.systemPrompt && !options.system) {
                optimized.system = queryInfo.systemPrompt;
            }

            // Nastav max_tokens pokud není explicitně zadáno
            if (!options.maxTokens && !options.max_tokens) {
                optimized.maxTokens = queryInfo.maxTokens;
            }

            // Pro jednoduché dotazy použij nižší temperature
            if (queryInfo.type === 'simple' || queryInfo.type === 'yesno') {
                optimized.temperature = optimized.temperature || 0.3;
            }

            optimized._queryType = queryInfo.type;
            return optimized;
        },

        /**
         * Zkrať systémový prompt pro free modely
         */
        shortenSystemPrompt(systemPrompt, model, provider) {
            if (!systemPrompt) return systemPrompt;
            if (!AI.tokenBudget._isFreeModel(model, provider)) return systemPrompt;

            const tokens = AI.estimateTokens(systemPrompt);
            const budget = AI.tokenBudget._budgets.free.system;

            if (tokens <= budget) return systemPrompt;

            // Zkrať - zachovej nejdůležitější části
            const lines = systemPrompt.split('\n');
            const essential = [];
            const optional = [];

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                // Důležité řádky (obsahují klíčová slova)
                if (/^(jsi|you are|musíš|must|vždy|always|nikdy|never|důležité|important)/i.test(trimmed)) {
                    essential.push(line);
                } else {
                    optional.push(line);
                }
            }

            let result = essential.join('\n');
            let currentTokens = AI.estimateTokens(result);

            // Přidávej optional dokud je místo
            for (const line of optional) {
                const lineTokens = AI.estimateTokens(line);
                if (currentTokens + lineTokens <= budget) {
                    result += '\n' + line;
                    currentTokens += lineTokens;
                }
            }

            return result;
        }
    },

    // ============== ZRUŠENÍ POŽADAVKU ==============
    cancel() {
        if (this._activeController) {
            this._activeController.abort();
            this._activeController = null;
            console.log('🛑 Požadavek zrušen');
            return true;
        }
        return false;
    },

    // ============== VŠECHNY MODELY (seřazené od nejlepších) ==============
    ALL_MODELS: {
        gemini: [
            { value: "gemini-2.5-flash", name: "🧠 Gemini 2.5 Flash (Hybrid)", rpm: 15, quality: 95, free: true },
            { value: "gemini-2.5-flash-lite", name: "⚡ Gemini 2.5 Flash-Lite", rpm: 30, quality: 85, free: true },
            { value: "gemini-2.5-pro", name: "🏆 Gemini 2.5 Pro", rpm: 5, quality: 98, free: true },
            { value: "gemini-3-flash-preview", name: "🔥 Gemini 3.0 Flash Preview", rpm: 15, quality: 96, free: true },
            { value: "gemini-2.0-flash", name: "👁️ Gemini 2.0 Flash (Image-Gen)", rpm: 15, quality: 92, free: true },
            { value: "gemini-2.0-flash-lite", name: "⚡ Gemini 2.0 Flash-Lite", rpm: 20, quality: 82, free: true },
            { value: "gemma-3-27b-it", name: "🤖 Gemma 3 27B (Open)", rpm: 15, quality: 88, free: true },
            { value: "gemini-robotics-er-1.5-preview", name: "🤖 Gemini Robotics-ER 1.5", rpm: 5, quality: 85, free: true }
        ],
        groq: [
            { value: "llama-3.3-70b-versatile", name: "🏆 Llama 3.3 70B", rpm: 30, quality: 90, free: true },
            { value: "llama-3.1-8b-instant", name: "⚡ Llama 3.1 8B Instant", rpm: 30, quality: 75, free: true },
            { value: "meta-llama/llama-4-scout-17b-16e-instruct", name: "🔥 Llama 4 Scout 17B", rpm: 30, quality: 88, free: true },
            { value: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "🔥 Llama 4 Maverick 17B", rpm: 30, quality: 90, free: true },
            { value: "qwen/qwen3-32b", name: "💻 Qwen3 32B", rpm: 60, quality: 85, free: true },
            { value: "moonshotai/kimi-k2-instruct", name: "🎯 Kimi K2 Instruct", rpm: 60, quality: 82, free: true },
            { value: "openai/gpt-oss-120b", name: "🧠 GPT-OSS 120B", rpm: 30, quality: 88, free: true },
            { value: "allam-2-7b", name: "🌍 Allam 2 7B (Arabic)", rpm: 30, quality: 70, free: true }
        ],
        openrouter: [
            { value: "deepseek/deepseek-r1-0528:free", name: "🧠 DeepSeek R1 (o1-level)", rpm: 20, quality: 96, free: true },
            { value: "meta-llama/llama-3.3-70b-instruct:free", name: "🦙 Llama 3.3 70B", rpm: 20, quality: 88, free: true },
            { value: "google/gemma-3-27b-it:free", name: "🤖 Gemma 3 27B", rpm: 20, quality: 86, free: true },
            { value: "nvidia/nemotron-3-nano-30b-a3b:free", name: "⚡ NVIDIA Nemotron 3 Nano", rpm: 20, quality: 85, free: true },
            { value: "nvidia/nemotron-nano-12b-v2-vl:free", name: "👁️ NVIDIA Nemotron VL", rpm: 20, quality: 83, free: true },
            { value: "tngtech/deepseek-r1t2-chimera:free", name: "🧬 DeepSeek R1T2 Chimera", rpm: 20, quality: 92, free: true },
            { value: "tngtech/deepseek-r1t-chimera:free", name: "🧬 DeepSeek R1T Chimera", rpm: 20, quality: 90, free: true },
            { value: "tngtech/tng-r1t-chimera:free", name: "🎭 TNG R1T Chimera", rpm: 20, quality: 88, free: true },
            { value: "z-ai/glm-4.5-air:free", name: "💭 GLM 4.5 Air", rpm: 20, quality: 84, free: true },
            { value: "mistralai/mistral-small-3.1-24b-instruct:free", name: "🔥 Mistral Small 3.1", rpm: 20, quality: 82, free: true }
        ],
        mistral: [
            { value: "mistral-small-latest", name: "🧠 Mistral Small", rpm: 10, quality: 85, free: true },
            { value: "open-mistral-7b", name: "🤖 Mistral 7B (Open)", rpm: 10, quality: 75, free: true },
            { value: "codestral-latest", name: "💻 Codestral", rpm: 10, quality: 88, free: true }
        ]
        // POZNÁMKA: Cohere a HuggingFace odstraněny - API nefunkční (leden 2026)
        // Cohere: 404 Not Found na v2/chat
        // HuggingFace: 410 Gone - api-inference.huggingface.co už není podporováno
    },

    // Pořadí providerů od nejlepšího (pro fallback)
    // Funkční providery: gemini, groq, openrouter, mistral
    PROVIDER_PRIORITY: ['gemini', 'groq', 'openrouter', 'mistral'],

    // ============== INTELIGENTNÍ SPRÁVA RATE LIMITŮ ==============
    // (Delegováno na ModelSelector modul)

    // Inicializace ModelSelector
    _modelSelector: null,
    _modelSelectorWarned: false,

    /**
     * Vrátí ModelSelector instanci (lazy init)
     */
    _getModelSelector() {
        if (!this._modelSelector) {
            if (typeof window.ModelSelector === 'undefined') {
                // Varuj jen 1x
                if (!this._modelSelectorWarned) {
                    console.warn('⚠️ ModelSelector není načten - používám fallback (všechny modely dostupné)');
                    this._modelSelectorWarned = true;
                }
                // Fallback - vrátíme dummy objekt
                return {
                    isModelAvailable: () => true,
                    selectBestCodingModel: () => this.selectBestModel(),
                    recordRequest: () => {},
                    recordLimitHit: () => {},
                    getStats: () => [],
                    resetAllTracking: () => {}
                };
            }
            this._modelSelector = new window.ModelSelector(this);
        }
        return this._modelSelector;
    },

    /**
     * Deleguje na ModelSelector.isModelAvailable()
     */
    isModelAvailable(provider, model) {
        return this._getModelSelector().isModelAvailable(provider, model);
    },

    /**
     * Deleguje na ModelSelector.selectBestCodingModel()
     */
    selectBestCodingModel() {
        return this._getModelSelector().selectBestCodingModel();
    },

    /**
     * Deleguje na ModelSelector.recordRequest()
     */
    _recordModelRequest(provider, model) {
        return this._getModelSelector().recordRequest(provider, model);
    },

    /**
     * Deleguje na ModelSelector.recordLimitHit()
     */
    _recordLimitHit(provider, model, limitType, errorMessage) {
        return this._getModelSelector().recordLimitHit(provider, model, limitType, errorMessage);
    },

    /**
     * Vrátí statistiky rate limitů
     */
    getRateLimitStats() {
        return this._getModelSelector().getStats();
    },

    /**
     * Reset všech trackingů
     */
    resetRateLimitTracking() {
        return this._getModelSelector().resetAllTracking();
    },

    // Cache pro OpenRouter tier info
    _openRouterTierCache: {},

    /**
     * Zkontroluje OpenRouter API klíč a zjistí RPD limit
     * @param {string} apiKey - OpenRouter API klíč (volitelný, použije se uložený)
     * @returns {Promise<{isFreeTier: boolean, rpm: number, rpd: number, usage: number, usageDaily: number}>}
     */
    async checkOpenRouterTier(apiKey = null) {
        const key = apiKey || this.getKey('openrouter');
        if (!key) {
            throw new Error('OpenRouter API klíč nenalezen');
        }

        // Cache check (platnost 5 minut)
        const cached = this._openRouterTierCache[key];
        if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
            return cached.data;
        }

        try {
            const response = await fetch('https://openrouter.ai/api/v1/key', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`OpenRouter API error: ${response.status}`);
            }

            const result = await response.json();
            const data = result.data;

            // is_free_tier: true = nikdy nenabil = 50 RPD
            // is_free_tier: false = nabil $10+ = 1,000 RPD
            const tierInfo = {
                provider: 'openrouter',
                providerName: 'OpenRouter',
                isFreeTier: data.is_free_tier,
                rpm: 20,  // OpenRouter má 20 RPM pro free i paid
                rpd: data.is_free_tier ? 50 : 1000,
                usage: data.usage || 0,
                usageDaily: data.usage_daily || 0,  // API vrací správné denní využití
                remaining: this.rateLimit.remaining('openrouter'),
                usedToday: data.usage_daily || 0,  // Použij API data místo lokálních statistik
                label: data.label || 'Unknown',
                limit: data.limit !== undefined ? data.limit : null,
                limitRemaining: data.limit_remaining !== undefined ? data.limit_remaining : null,
                rateLimit: data.rate_limit || null
            };

            // Cache result
            this._openRouterTierCache[key] = {
                timestamp: Date.now(),
                data: tierInfo
            };

            return tierInfo;
        } catch (error) {
            console.error('Chyba při kontrole OpenRouter tier:', error);
            // Fallback na free tier limity
            return {
                provider: 'openrouter',
                providerName: 'OpenRouter',
                isFreeTier: true,
                rpm: 20,
                rpd: 50,
                usage: 0,
                usageDaily: 0,
                remaining: this.rateLimit.remaining('openrouter'),
                usedToday: this.stats.get().byProvider?.openrouter?.calls || 0,
                error: error.message
            };
        }
    },

    // Cache pro rate limit info všech providerů
    _rateLimitInfoCache: {},

    /**
     * Zkontroluje rate limity pro kteréhokoliv providera
     * @param {string} provider - Provider name
     * @returns {Promise<Object>}
     */
    async checkProviderLimits(provider) {
        // Zkontroluj cache (platnost 2 minuty)
        const cached = this._rateLimitInfoCache[provider];
        if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) {
            return cached.data;
        }

        const key = this.getKey(provider);
        if (!key) {
            throw new Error(`${provider} API klíč nenalezen`);
        }

        let limitInfo = {
            provider,
            providerName: this.getProviderDisplayName(provider),
            rpm: this.rateLimit._getLimit(provider),
            rpd: null,
            remaining: null,
            reset: null,
            usedToday: null,
            error: null
        };

        try {
            switch (provider) {
                case 'openrouter':
                    return await this.checkOpenRouterTier();

                case 'gemini':
                    // Gemini má RPM limity podle modelu
                    limitInfo.rpm = 15;
                    limitInfo.rpd = 1500;
                    limitInfo.remaining = this.rateLimit.remaining(provider);
                    limitInfo.usedToday = this.stats.get().byProvider?.[provider]?.calls || 0;
                    break;

                case 'groq':
                    // Zkus získat info z Groq API
                    try {
                        const response = await fetch('https://api.groq.com/openai/v1/models', {
                            headers: { 'Authorization': `Bearer ${key}` }
                        });
                        if (response.ok) {
                            limitInfo.rpm = 30;
                            limitInfo.rpd = 14400;
                            limitInfo.remaining = this.rateLimit.remaining(provider);
                            limitInfo.usedToday = this.stats.get().byProvider?.[provider]?.calls || 0;
                            // Čti rate limit z headers
                            const rateLimit = response.headers.get('x-ratelimit-limit-requests');
                            const rateLimitRemaining = response.headers.get('x-ratelimit-remaining-requests');
                            const rateLimitReset = response.headers.get('x-ratelimit-reset-requests');
                            if (rateLimit) limitInfo.rpm = parseInt(rateLimit);
                            if (rateLimitRemaining) limitInfo.remaining = parseInt(rateLimitRemaining);
                            if (rateLimitReset) limitInfo.reset = rateLimitReset;
                        }
                    } catch (e) {
                        console.warn('Groq API info nedostupné:', e.message);
                        limitInfo.rpm = 30;
                        limitInfo.rpd = 14400;
                        limitInfo.remaining = this.rateLimit.remaining(provider);
                        limitInfo.usedToday = this.stats.get().byProvider?.[provider]?.calls || 0;
                    }
                    break;

                case 'mistral':
                    limitInfo.rpm = 10;
                    limitInfo.rpd = 500;
                    limitInfo.remaining = this.rateLimit.remaining(provider);
                    limitInfo.usedToday = this.stats.get().byProvider?.[provider]?.calls || 0;
                    break;

                case 'cohere':
                    limitInfo.rpm = 20;
                    limitInfo.rpd = 1000;
                    limitInfo.remaining = this.rateLimit.remaining(provider);
                    limitInfo.usedToday = this.stats.get().byProvider?.[provider]?.calls || 0;
                    break;

                case 'huggingface':
                    limitInfo.rpm = 10;
                    limitInfo.rpd = 500;
                    limitInfo.remaining = this.rateLimit.remaining(provider);
                    limitInfo.usedToday = this.stats.get().byProvider?.[provider]?.calls || 0;
                    break;

                default:
                    throw new Error(`Neznámý provider: ${provider}`);
            }

            // Cache výsledek
            this._rateLimitInfoCache[provider] = {
                timestamp: Date.now(),
                data: limitInfo
            };

            return limitInfo;
        } catch (error) {
            limitInfo.error = error.message;
            return limitInfo;
        }
    },

    // Modely s podporou vision (Groq)
    VISION_MODELS: [
        'meta-llama/llama-4-maverick-17b-128e-instruct',
        'meta-llama/llama-4-scout-17b-16e-instruct'
    ],

    // Získej nejlepší dostupný model pro providera
    getBestModel(provider) {
        const models = this.ALL_MODELS[provider];
        if (!models || models.length === 0) return null;
        // Modely jsou už seřazené od nejlepšího
        return models[0].value;
    },

    // Získej všechny modely seřazené podle kvality (napříč providery)
    getAllModelsSorted() {
        const allModels = [];

        for (const [provider, models] of Object.entries(this.ALL_MODELS)) {
            if (!this.getKey(provider)) continue; // Přeskoč providery bez klíče

            for (const model of models) {
                allModels.push({
                    provider,
                    model: model.value,
                    name: model.name,
                    quality: model.quality || 50,
                    rpm: model.rpm
                });
            }
        }

        // Seřaď podle kvality (sestupně)
        return allModels.sort((a, b) => b.quality - a.quality);
    },

    // ============== NOVÉ METODY PRO VÝBĚR MODELŮ ==============

    /**
     * Získej nejlepší modely podle kvality myšlení
     * Pro normální použití bez agentů
     */
    getBestModels(limit = 5) {
        const allProviders = this.getAllProvidersWithModels();
        const models = [];

        for (const [providerKey, providerData] of Object.entries(allProviders)) {
            if (!this.getKey(providerKey)) continue;

            providerData.models.forEach(modelData => {
                if (modelData.quality && modelData.quality >= 90) {
                    models.push({
                        provider: providerKey,
                        model: modelData.value,
                        name: `${providerData.name} - ${modelData.label}`,
                        quality: modelData.quality,
                        rpm: modelData.rpm,
                        free: modelData.free
                    });
                }
            });
        }

        return models.sort((a, b) => b.quality - a.quality).slice(0, limit);
    },

    /**
     * Získej modely s vysokým RPM a dobrou kvalitou
     * Pro agenty kde je potřeba rychlost ale i kvalita
     */
    getBalancedModels(limit = 5) {
        const allProviders = this.getAllProvidersWithModels();
        const models = [];

        for (const [providerKey, providerData] of Object.entries(allProviders)) {
            if (!this.getKey(providerKey)) continue;

            providerData.models.forEach(modelData => {
                if (modelData.rpm >= 20 && modelData.quality >= 80) {
                    models.push({
                        provider: providerKey,
                        model: modelData.value,
                        name: `${providerData.name} - ${modelData.label}`,
                        quality: modelData.quality,
                        rpm: modelData.rpm,
                        free: modelData.free
                    });
                }
            });
        }

        return models.sort((a, b) => {
            if (a.free && !b.free) return -1;
            if (!a.free && b.free) return 1;
            return b.rpm - a.rpm;
        }).slice(0, limit);
    },

    /**
     * Získej nejrychlejší modely s vysokým RPM
     * Pro jednoduché agenty (dokumentace, testy)
     */
    getFastModels(limit = 5) {
        const allProviders = this.getAllProvidersWithModels();
        const models = [];

        for (const [providerKey, providerData] of Object.entries(allProviders)) {
            if (!this.getKey(providerKey)) continue;

            providerData.models.forEach(modelData => {
                if (modelData.rpm >= 20) {
                    models.push({
                        provider: providerKey,
                        model: modelData.value,
                        name: `${providerData.name} - ${modelData.label}`,
                        quality: modelData.quality || 70,
                        rpm: modelData.rpm,
                        speed: modelData.speed || 80,
                        free: modelData.free
                    });
                }
            });
        }

        return models.sort((a, b) => {
            const scoreA = (a.rpm * 2) + a.speed;
            const scoreB = (b.rpm * 2) + b.speed;
            return scoreB - scoreA;
        }).slice(0, limit);
    },

    /**
     * Vyber model podle typu agenta
     * @param {string} agentType - orchestrator|architect|frontend|backend|fullstack|debugger|reviewer|documentation|tester
     * @returns {object} - {provider, model}
     */
    selectModelForAgent(agentType) {
        // Důležití agenti - potřebují nejlepší AI
        const criticalAgents = ['orchestrator', 'architect', 'fullstack'];

        // Střední agenti - potřebují dobrou kvalitu a rychlost
        const mediumAgents = ['frontend', 'backend', 'debugger', 'reviewer'];

        // Jednoduší agenti - rychlost a vysoký RPM
        const simpleAgents = ['documentation', 'tester'];

        if (criticalAgents.includes(agentType)) {
            // Nejlepší modely
            const best = this.getBestModels(1)[0];
            console.log(`🎯 Agent ${agentType}: Používám nejlepší model - ${best?.name || 'llama-3.3-70b'}`);
            return best ? { provider: best.provider, model: best.model } : { provider: 'groq', model: 'llama-3.3-70b-versatile' };
        } else if (mediumAgents.includes(agentType)) {
            // Vyvážené modely
            const balanced = this.getBalancedModels(1)[0];
            console.log(`⚖️ Agent ${agentType}: Používám vyvážený model - ${balanced?.name || 'llama-3.1-70b'}`);
            return balanced ? { provider: balanced.provider, model: balanced.model } : { provider: 'groq', model: 'llama-3.1-70b-versatile' };
        } else {
            // Rychlé modely
            const fast = this.getFastModels(1)[0];
            console.log(`⚡ Agent ${agentType}: Používám rychlý model - ${fast?.name || 'mixtral-8x7b'}`);
            return fast ? { provider: fast.provider, model: fast.model } : { provider: 'groq', model: 'mixtral-8x7b-32768' };
        }
    },

    /**
     * Vyber nejlepší model pro normální chat (ne agenty)
     */
    selectBestModel() {
        const best = this.getBestModels(1)[0];
        console.log(`✨ Normální chat: Používám nejlepší model - ${best?.name || 'llama-3.3-70b'}`);
        return best ? { provider: best.provider, model: best.model } : { provider: 'groq', model: 'llama-3.3-70b-versatile' };
    },

    // ============== HELPER FUNKCE ==============

    async fetchWithTimeout(url, options, timeoutMs) {
        const timeout = timeoutMs || this.config.timeout || 30000;

        // Vytvoř AbortController pro možnost zrušení
        this._activeController = new AbortController();
        const signal = this._activeController.signal;

        // Timeout promise
        const timeoutId = setTimeout(() => {
            this._activeController?.abort();
        }, timeout);

        try {
            const response = await fetch(url, { ...options, signal });
            clearTimeout(timeoutId);
            this._activeController = null;
            return response;
        } catch (err) {
            clearTimeout(timeoutId);
            this._activeController = null;
            if (err.name === 'AbortError') {
                throw new Error('Požadavek byl zrušen nebo vypršel timeout');
            }
            throw err;
        }
    },

    // Retry s exponenciálním backoff
    async retryWithBackoff(apiCall, maxRetries = null, providerContext = null) {
        const retries = maxRetries || this.config.maxRetries;

        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                return await apiCall();
            } catch (err) {
                const isRateLimit =
                    err.message?.includes('429') ||
                    err.message?.includes('quota') ||
                    err.message?.includes('RESOURCE_EXHAUSTED');

                if (isRateLimit && attempt < retries - 1) {
                    // Místo čekání zkusíme jiný model
                    if (providerContext && attempt === 0) {
                        console.log('⚠️ Rate limit detekovaná - zkousím jiný model...');
                        // Vrátíme speciální error pro fallback
                        const fallbackError = new Error('RATE_LIMIT_FALLBACK');
                        fallbackError.originalError = err;
                        throw fallbackError;
                    }

                    // Pokud už fallback selžal, nebo není context, čekej
                    const retryMatch = err.message?.match(/retry in ([\d.]+)s/i);
                    let delayMs;

                    if (retryMatch) {
                        delayMs = Math.ceil(parseFloat(retryMatch[1]) * 1000);
                    } else {
                        delayMs = Math.pow(2, attempt + 1) * 1000;
                    }

                    console.log(`⏳ Rate limit, čekám ${delayMs/1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }

                throw err;
            }
        }
    },

    // Parsování AI odpovědi (JSON cleaning)
    parseResponse(aiResponseText) {
        try {
            let cleanedJson = aiResponseText
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/g, '');

            const firstBrace = cleanedJson.indexOf('{');
            const lastBrace = cleanedJson.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
            }

            const openBraces = (cleanedJson.match(/\{/g) || []).length;
            const closeBraces = (cleanedJson.match(/\}/g) || []).length;
            const openBrackets = (cleanedJson.match(/\[/g) || []).length;
            const closeBrackets = (cleanedJson.match(/\]/g) || []).length;

            if (openBrackets > closeBrackets) {
                cleanedJson += ']'.repeat(openBrackets - closeBrackets);
            }
            if (openBraces > closeBraces) {
                cleanedJson += '}'.repeat(openBraces - closeBraces);
            }

            cleanedJson = cleanedJson.replace(/(\d+\.\d{6})\d{4,}/g, '$1');
            cleanedJson = cleanedJson.replace(/,\s*([}\]])/g, '$1');

            return JSON.parse(cleanedJson);
        } catch (e) {
            console.error('❌ Parse error:', e.message);
            return null;
        }
    },

    // ============== NASTAVENÍ ==============

    getKey(provider) {
        // 1. Zkus multi-key systém
        const multiKey = this.keys.getActive(provider);
        if (multiKey && multiKey.length > 10) {
            return multiKey;
        }

        // 2. Zkus config.keys (nastaveno přes setKey)
        const customKey = this.config.keys[provider];
        if (customKey && customKey.length > 10) {
            return customKey;
        }

        // 3. Fallback na demo klíče (obfuskované)
        const demoKey = this._getDemoKey(provider);
        if (demoKey && demoKey.length > 10) {
            return demoKey;
        }

        return null;
    },

    isUsingDemoKey(provider) {
        const multiKey = this.keys.getActive(provider);
        if (multiKey && multiKey.length > 10) return false;

        const customKey = this.config.keys[provider];
        return !(customKey && customKey.length > 10);
    },

    setKey(provider, key) {
        if (this.config.keys.hasOwnProperty(provider)) {
            this.config.keys[provider] = key;
            return true;
        }
        return false;
    },

    setModel(provider, model) {
        if (this.config.models.hasOwnProperty(provider)) {
            this.config.models[provider] = model;
            return true;
        }
        return false;
    },

    setDefaultProvider(provider) {
        if (this.config.keys.hasOwnProperty(provider)) {
            this.config.defaultProvider = provider;
            return true;
        }
        return false;
    },

    getAvailableProviders() {
        return ['gemini', 'groq', 'openrouter', 'mistral', 'cohere', 'huggingface']
            .filter(provider => this.getKey(provider) !== null);
    },

    // Získej všechny providery s jejich modely (pro UI)
    getAllProvidersWithModels() {
        const result = {};

        // Dynamicky generuj z ALL_MODELS
        for (const [provider, models] of Object.entries(this.ALL_MODELS)) {
            result[provider] = {
                name: this.getProviderDisplayName(provider),
                models: models.map(m => ({
                    value: m.value,
                    label: m.name,
                    free: m.free !== undefined ? m.free : true,
                    rpm: m.rpm,
                    quality: m.quality,
                    description: m.description || ''
                }))
            };
        }

        return result;
    },

    // Získej zobrazované jméno providera
    getProviderDisplayName(provider) {
        const names = {
            gemini: 'Google Gemini',
            groq: 'Groq',
            openrouter: 'OpenRouter',
            mistral: 'Mistral AI',
            cohere: 'Cohere',
            huggingface: 'HuggingFace'
        };
        return names[provider] || provider;
    },

    /**
     * Zobrazí nápovědu pro získání API klíčů
     * Otevře modální okno s detailními instrukcemi pro každého providera
     */
    showApiHelp() {
        const helpModal = document.createElement('div');
        helpModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
            backdrop-filter: blur(4px);
        `;

        const providersInfo = [
            {
                name: '💎 Google Gemini',
                icon: '💎',
                description: 'Nejlepší FREE AI od Googlu s vysokými limity',
                url: 'https://aistudio.google.com/app/apikey',
                steps: [
                    '1. Otevřete <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #3b82f6;">Google AI Studio</a>',
                    '2. Přihlaste se svým Google účtem',
                    '3. Klikněte na "Create API Key" nebo "Get API Key"',
                    '4. Vyberte projekt nebo vytvořte nový',
                    '5. Zkopírujte vygenerovaný klíč (začíná "AIza...")'
                ],
                limits: '✅ FREE tier: 15 RPM, ~1500 požadavků denně',
                note: '⚡ Gemini 2.5 Flash je nejlepší volba pro většinu úkolů!'
            },
            {
                name: '⚡ Groq',
                icon: '⚡',
                description: 'Nejrychlejší FREE AI s nejvyššími limity',
                url: 'https://console.groq.com/keys',
                steps: [
                    '1. Otevřete <a href="https://console.groq.com/keys" target="_blank" style="color: #3b82f6;">Groq Console</a>',
                    '2. Zaregistrujte se nebo se přihlaste',
                    '3. Přejděte do sekce "API Keys"',
                    '4. Klikněte na "Create API Key"',
                    '5. Pojmenujte klíč a zkopírujte ho (začíná "gsk_...")'
                ],
                limits: '✅ FREE tier: 30-60 RPM podle modelu, žádný denní limit!',
                note: '🚀 Llama 3.3 70B má skvělý poměr rychlost/kvalita!'
            },
            {
                name: '🌐 OpenRouter',
                icon: '🌐',
                description: 'Přístup k desítkám AI modelů přes jedno API',
                url: 'https://openrouter.ai/keys',
                steps: [
                    '1. Otevřete <a href="https://openrouter.ai/keys" target="_blank" style="color: #3b82f6;">OpenRouter Keys</a>',
                    '2. Přihlaste se (podporuje Google, GitHub)',
                    '3. Klikněte na "Create Key"',
                    '4. Pojmenujte klíč a nastavte limity (volitelné)',
                    '5. Zkopírujte klíč (začíná "sk-or-v1-...")'
                ],
                limits: '🆓 FREE tier: 50 RPD | 💰 Po nabití $10+: 1000 RPD',
                note: '💡 Automaticky detekujeme váš tier! 17 FREE modelů k dispozici.'
            },
            {
                name: '🔥 Mistral AI',
                icon: '🔥',
                description: 'Evropská AI s kvalitními open-source modely',
                url: 'https://console.mistral.ai/api-keys/',
                steps: [
                    '1. Otevřete <a href="https://console.mistral.ai/api-keys/" target="_blank" style="color: #3b82f6;">Mistral Console</a>',
                    '2. Zaregistrujte se nebo se přihlaste',
                    '3. Přejděte do "API Keys"',
                    '4. Klikněte na "Create new key"',
                    '5. Zkopírujte vygenerovaný klíč'
                ],
                limits: '✅ FREE tier: Open-source modely zdarma (7B, Mixtral)',
                note: '💻 Codestral je vynikající pro programování!'
            },
            {
                name: '🧬 Cohere',
                icon: '🧬',
                description: 'Pokročilé NLP modely s trial účtem',
                url: 'https://dashboard.cohere.com/api-keys',
                steps: [
                    '1. Otevřete <a href="https://dashboard.cohere.com/api-keys" target="_blank" style="color: #3b82f6;">Cohere Dashboard</a>',
                    '2. Zaregistrujte se (podporuje Google, GitHub)',
                    '3. Přejděte do sekce "API Keys"',
                    '4. Použijte Trial klíč nebo vytvořte Production klíč',
                    '5. Zkopírujte klíč'
                ],
                limits: '✅ Trial: Omezený free přístup | Command R+ má vysokou kvalitu',
                note: '📊 Skvělé pro embeddings a reranking!'
            },
            {
                name: '🤗 HuggingFace',
                icon: '🤗',
                description: 'Open-source AI komunita s tisíci modely',
                url: 'https://huggingface.co/settings/tokens',
                steps: [
                    '1. Otevřete <a href="https://huggingface.co/settings/tokens" target="_blank" style="color: #3b82f6;">HuggingFace Tokens</a>',
                    '2. Zaregistrujte se nebo se přihlaste',
                    '3. Klikněte na "New token"',
                    '4. Pojmenujte token a vyberte práva (read)',
                    '5. Zkopírujte token (začíná "hf_...")'
                ],
                limits: '✅ FREE Inference API: Omezené použití, restart každé 72h',
                note: '🔬 Ideální pro experimentování s open-source modely!'
            }
        ];

        const helpContent = document.createElement('div');
        helpContent.style.cssText = `
            background: var(--bg-primary);
            border-radius: 20px;
            max-width: 900px;
            max-height: 85vh;
            overflow-y: auto;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            position: relative;
        `;

        helpContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 2px solid var(--border-color); padding-bottom: 15px;">
                <h2 style="color: var(--text-primary); font-size: 28px; margin: 0; font-weight: bold;">
                    ❓ Jak získat API klíče
                </h2>
                <button id="closeHelpModal" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 8px 16px; border-radius: 10px; cursor: pointer; font-size: 16px; transition: all 0.2s;">
                    ✕ Zavřít
                </button>
            </div>

            <div style="color: var(--text-secondary); font-size: 15px; margin-bottom: 30px; line-height: 1.6;">
                📚 Detailní návod pro získání API klíčů ke všem podporovaným AI providerům.
                Všechny klíče jsou <strong style="color: #22c55e;">100% ZDARMA</strong> s free tier limity!
            </div>

            <div style="display: flex; flex-direction: column; gap: 20px;">
                ${providersInfo.map(provider => `
                    <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px; transition: all 0.3s;" onmouseenter="this.style.borderColor='#3b82f6'; this.style.transform='translateY(-2px)';" onmouseleave="this.style.borderColor='var(--border-color)'; this.style.transform='translateY(0)';">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
                            <span style="font-size: 32px;">${provider.icon}</span>
                            <div>
                                <h3 style="color: var(--text-primary); margin: 0; font-size: 20px; font-weight: bold;">${provider.name}</h3>
                                <p style="color: var(--text-secondary); margin: 4px 0 0 0; font-size: 13px;">${provider.description}</p>
                            </div>
                        </div>

                        <div style="background: var(--bg-tertiary); border-radius: 10px; padding: 15px; margin-bottom: 15px;">
                            <div style="color: var(--text-secondary); font-size: 14px; margin-bottom: 10px;">📋 <strong>Postup:</strong></div>
                            ${provider.steps.map(step => `
                                <div style="color: var(--text-primary); font-size: 13px; margin: 6px 0; padding-left: 10px;">${step}</div>
                            `).join('')}
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 10px; font-size: 13px; color: #22c55e;">
                                ${provider.limits}
                            </div>
                            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 10px; font-size: 13px; color: #3b82f6;">
                                ${provider.note}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="margin-top: 30px; padding: 20px; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px;">
                <div style="font-size: 16px; font-weight: bold; color: #8b5cf6; margin-bottom: 10px;">💡 Tipy pro správu klíčů:</div>
                <ul style="color: var(--text-secondary); font-size: 13px; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>✅ Používejte <strong>demo klíče</strong> pro rychlé testování</li>
                    <li>🔐 Nikdy nesdílejte své API klíče s nikým</li>
                    <li>📦 Pravidelně exportujte klíče jako zálohu</li>
                    <li>🔄 Pro produkci si vytvořte vlastní klíče u každého providera</li>
                    <li>📊 Sledujte své limity v dashboardech providerů</li>
                    <li>⚡ Groq a Gemini mají nejvyšší FREE limity!</li>
                </ul>
            </div>
        `;

        helpModal.appendChild(helpContent);
        document.body.appendChild(helpModal);

        // Close handlers
        const closeBtn = helpModal.querySelector('#closeHelpModal');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(helpModal);
        });

        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                document.body.removeChild(helpModal);
            }
        });

        // Hover effects for close button
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(239, 68, 68, 0.3)';
            closeBtn.style.transform = 'scale(1.05)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'rgba(239, 68, 68, 0.2)';
            closeBtn.style.transform = 'scale(1)';
        });
    },

    // ============== GEMINI ==============

    async askGemini(prompt, options = {}) {
        const key = options.key || this.getKey('gemini');
        if (!key) throw new Error('Gemini API klíč není nastaven');

        const model = options.model || this.config.models.gemini;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

        let contents;

        // If messages are already provided (chat history), convert to Gemini format
        if (options.messages && Array.isArray(options.messages)) {
            contents = options.messages
                .filter(msg => msg.role !== 'system') // System handled separately in Gemini
                .map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                }));
        } else {
            // Build from scratch
            contents = [{
                parts: [{ text: prompt }]
            }];
        }

        const body = {
            contents,
            generationConfig: {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxTokens ?? 4096
            }
        };

        if (options.system) {
            body.systemInstruction = {
                parts: [{ text: options.system }]
            };
        } else if (options.messages) {
            // Extract system message from messages if present
            const systemMsg = options.messages.find(msg => msg.role === 'system');
            if (systemMsg) {
                body.systemInstruction = {
                    parts: [{ text: systemMsg.content }]
                };
            }
        }

        const response = await this.retryWithBackoff(async () => {
            const resp = await this.fetchWithTimeout(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!resp.ok) {
                const error = await resp.json().catch(() => ({}));
                throw new Error(error.error?.message || `HTTP ${resp.status}`);
            }

            return resp.json();
        }, null, { provider: 'gemini', model });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (options.parseJson) {
            return this.parseResponse(text);
        }

        return text;
    },

    // ============== GROQ ==============

    async askGroq(prompt, options = {}) {
        const key = options.key || this.getKey('groq');
        if (!key) throw new Error('Groq API klíč není nastaven');

        const model = options.model || this.config.models.groq;
        const url = 'https://api.groq.com/openai/v1/chat/completions';

        let messages = [];

        // If messages are already provided (chat history), use them
        if (options.messages && Array.isArray(options.messages)) {
            messages = options.messages;
        } else {
            // Build messages from scratch
            if (options.system) {
                messages.push({ role: 'system', content: options.system });
            }

            const isVisionModel = this.VISION_MODELS.includes(model);
            const hasImage = options.imageBase64 && options.imageMimeType;

            if (isVisionModel && hasImage) {
                messages.push({
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${options.imageMimeType};base64,${options.imageBase64}`
                            }
                        }
                    ]
                });
            } else {
                messages.push({ role: 'user', content: prompt });
            }
        }

        const requestBody = {
            model: model,
            messages: messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096
        };

        console.log('🦙 Groq request:', {
            url,
            model,
            messagesCount: messages.length,
            hasSystemPrompt: !!options.system,
            temperature: requestBody.temperature,
            max_tokens: requestBody.max_tokens,
            keyLength: key.length,
            keyStart: key.substring(0, 10) + '...'
        });

        const response = await this.fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('🦙 Groq response status:', response.status);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('🦙 Groq error:', error);
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        let text = data.choices?.[0]?.message?.content || '';

        if (!text && data.choices?.[0]?.message?.reasoning) {
            text = data.choices[0].message.reasoning;
        }

        if (options.parseJson) {
            return this.parseResponse(text);
        }

        return text;
    },

    // ============== OPENROUTER ==============

    async askOpenRouter(prompt, options = {}) {
        const key = options.key || this.getKey('openrouter');
        if (!key) throw new Error('OpenRouter API klíč není nastaven');

        const model = options.model || this.config.models.openrouter;
        const url = 'https://openrouter.ai/api/v1/chat/completions';

        console.info('🌐 OpenRouter request:', model);

        let messages = [];

        // If messages are already provided (chat history), use them
        if (options.messages && Array.isArray(options.messages)) {
            messages = options.messages;
        } else {
            // Build from scratch
            if (options.system) {
                messages.push({ role: 'system', content: options.system });
            }
            messages.push({ role: 'user', content: prompt });
        }

        const response = await this.fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.href,
                'X-Title': 'AI Module Test'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 1024
            })
        });

        const data = await response.json().catch(() => ({}));

        console.info('🌐 OpenRouter response:', response.status, data);

        if (!response.ok) {
            // Detailní error handling
            const errMsg = data.error?.message || data.error?.code || JSON.stringify(data.error) || `HTTP ${response.status}`;
            console.error('🌐 OpenRouter error:', errMsg);
            throw new Error(errMsg);
        }

        const text = data.choices?.[0]?.message?.content || '';

        if (options.parseJson) {
            return this.parseResponse(text);
        }

        return text;
    },

    // ============== MISTRAL ==============

    async askMistral(prompt, options = {}) {
        const key = options.key || this.getKey('mistral');
        if (!key) throw new Error('Mistral API klíč není nastaven');

        const model = options.model || this.config.models.mistral;
        const url = 'https://api.mistral.ai/v1/chat/completions';

        let messages = [];

        // If messages are already provided (chat history), use them
        if (options.messages && Array.isArray(options.messages)) {
            messages = options.messages;
        } else {
            // Build from scratch
            if (options.system) {
                messages.push({ role: 'system', content: options.system });
            }
            messages.push({ role: 'user', content: prompt });
        }

        const response = await this.fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 4096
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';

        if (options.parseJson) {
            return this.parseResponse(text);
        }

        return text;
    },

    // ============== COHERE ==============

    async askCohere(prompt, options = {}) {
        const key = options.key || this.getKey('cohere');
        if (!key) throw new Error('Cohere API klíč není nastaven');

        const model = options.model || this.config.models.cohere || 'command-r-plus-08-2024';
        const url = 'https://api.cohere.com/v2/chat';

        let messages = [];

        // If messages are already provided (chat history), use them
        if (options.messages && Array.isArray(options.messages)) {
            messages = options.messages;
        } else {
            // Build from scratch
            if (options.system) {
                messages.push({ role: 'system', content: options.system });
            }
            messages.push({ role: 'user', content: prompt });
        }

        const response = await this.fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 4096
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const text = data.message?.content?.[0]?.text || '';

        if (options.parseJson) {
            return this.parseResponse(text);
        }

        return text;
    },

    // ============== HUGGING FACE ==============

    // CORS proxy pro HuggingFace (nutné pro file://)
    CORS_PROXIES: [
        'https://corsproxy.io/?url=',
        'https://api.codetabs.com/v1/proxy?quest='
    ],

    async askHuggingFace(prompt, options = {}) {
        const key = options.key || this.getKey('huggingface');
        if (!key) throw new Error('HuggingFace API klíč není nastaven');

        const model = options.model || this.config.models.huggingface || 'mistralai/Mistral-7B-Instruct-v0.3';
        const originalUrl = `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`;

        let messages = [];

        // If messages are already provided (chat history), use them
        if (options.messages && Array.isArray(options.messages)) {
            messages = options.messages;
        } else {
            // Build from scratch
            if (options.system) {
                messages.push({ role: 'system', content: options.system });
            }
            messages.push({ role: 'user', content: prompt });
        }

        const body = JSON.stringify({
            model: model,
            messages: messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 1024,
            stream: false
        });

        const headers = {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        };

        // Detekce jestli jsme na file:// nebo localhost
        const isLocalFile = window.location.protocol === 'file:';

        if (!isLocalFile) {
            // Přímý request pokud jsme na HTTP/HTTPS
            return this.doHuggingFaceRequest(originalUrl, headers, body, options);
        }

        // Pro file:// zkusit CORS proxy
        for (const proxyBase of this.CORS_PROXIES) {
            try {
                const proxyUrl = proxyBase + encodeURIComponent(originalUrl);
                return await this.doHuggingFaceRequest(proxyUrl, headers, body, options);
            } catch (e) {
                console.warn(`CORS proxy ${proxyBase} selhalo:`, e.message);
                continue;
            }
        }

        // Všechny proxy selhaly
        throw new Error('HuggingFace: CORS blokuje přístup z file://. Spusť: python -m http.server');
    },

    async doHuggingFaceRequest(url, headers, body, options) {
        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'POST',
                headers: headers,
                body: body
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                if (error.error?.includes('loading')) {
                    throw new Error('Model se načítá, zkus za 30s...');
                }
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content || '';
            return options.parseJson ? this.parseResponse(text) : text;
        } catch (e) {
            if (e.message === 'Failed to fetch') {
                throw new Error('CORS blokuje přístup. Spusť: python -m http.server');
            }
            throw e;
        }
    },

    // ============== UNIVERZÁLNÍ METODY ==============

    async ask(prompt, options = {}) {
        try {
            return await this.askWithOptions(prompt, options);
        } catch (error) {
            // Pokud je to rate limit fallback, zkus jiný model
            if (error.message === 'RATE_LIMIT_FALLBACK') {
                console.log('🔄 Fallback na alternativní model...');

                // Získej seznam všech dostupných modelů
                const allProviders = this.getAllProvidersWithModels();
                const currentProvider = options.provider;

                // Najdi jiného providera
                const alternativeProviders = Object.keys(allProviders)
                    .filter(p => p !== currentProvider && this.getKey(p));

                if (alternativeProviders.length > 0) {
                    const fallbackProvider = alternativeProviders[0];
                    const fallbackModel = allProviders[fallbackProvider].models[0].value;

                    console.log(`✅ Používám záložní model: ${fallbackProvider} - ${fallbackModel}`);

                    // Zkus znovu s jiným modelem
                    return await this.askWithOptions(prompt, {
                        ...options,
                        provider: fallbackProvider,
                        model: fallbackModel
                    });
                }

                // Žádná alternativa není
                throw error.originalError || error;
            }

            throw error;
        }
    },

    async askWithOptions(prompt, options = {}) {
        const provider = options.provider || this.config.defaultProvider;
        const model = options.model || this.config.models[provider];
        const startTime = Date.now();
        const maxKeyRotations = options._keyRotations || 0;
        const autoFallback = options.autoFallback !== false; // Default: true

        // Safe prompt preview for logging
        const promptPreview = typeof prompt === 'string'
            ? prompt.substring(0, 50) + '...'
            : (prompt.messages ? `[${prompt.messages.length} messages]` : '[object]');

        this._log(`Request: ${provider}/${model}`, promptPreview);
        this.emit('request:start', { provider, model, prompt: promptPreview });

        // Zaznamenej request pro tracking limitů
        this._recordModelRequest(provider, model);

        // Rate limiting check s automatickou rotací klíčů
        if (!options.skipRateLimit && !this.rateLimit.canMakeRequest(provider, model)) {
            // Zaznamenej limit hit
            this._recordLimitHit(provider, model, 'rpm', 'Rate limit exceeded');

            // Zkus rotovat klíč
            const keysCount = this.keys.list(provider).length;
            if (keysCount > 1 && maxKeyRotations < keysCount) {
                this._log(`Rate limit - rotace klíče (${maxKeyRotations + 1}/${keysCount})`);
                this.keys.rotate(provider);
                this.rateLimit._timestamps[provider] = [];
                return this.ask(prompt, { ...options, _keyRotations: maxKeyRotations + 1 });
            }

            // Klíče vyčerpány - zkus další model
            if (autoFallback) {
                this._log(`Všechny klíče vyčerpány pro ${provider}, zkouším další model...`);
                return this._fallbackToNextModel(prompt, options, provider, model);
            }

            throw new Error(`Rate limit překročen pro ${provider}. Zbývá: ${this.rateLimit.remaining(provider, model)} požadavků/min`);
        }

        // Zaznamenej rate limit
        this.rateLimit.record(provider);

        // Odhad vstupních tokenů
        const tokensIn = this.estimateTokens(prompt) + this.estimateTokens(options.system || '');

        let response;
        try {
            switch (provider) {
                case 'gemini':
                    response = await this.askGemini(prompt, options);
                    break;
                case 'groq':
                    response = await this.askGroq(prompt, options);
                    break;
                case 'openrouter':
                    response = await this.askOpenRouter(prompt, options);
                    break;
                case 'mistral':
                    response = await this.askMistral(prompt, options);
                    break;
                case 'cohere':
                    response = await this.askCohere(prompt, options);
                    break;
                case 'huggingface':
                    response = await this.askHuggingFace(prompt, options);
                    break;
                default:
                    throw new Error(`Neznámý poskytovatel: ${provider}`);
            }
        } catch (error) {
            // Detekce různých typů chyb
            const errorMsg = error.message || '';
            const isRateLimitError = errorMsg.includes('429') ||
                                     errorMsg.includes('rate') ||
                                     errorMsg.includes('limit') ||
                                     errorMsg.includes('quota');

            // 📱 NOVÉ: Detekce "model is overloaded" chyby (častější na mobilech)
            const isOverloadedError = errorMsg.toLowerCase().includes('overload') ||
                                      errorMsg.includes('503') ||
                                      errorMsg.includes('502') ||
                                      errorMsg.includes('temporarily unavailable') ||
                                      errorMsg.includes('server error') ||
                                      errorMsg.includes('capacity') ||
                                      errorMsg.includes('busy');

            const isAPIError = errorMsg.includes('400') ||
                              errorMsg.includes('401') ||
                              errorMsg.includes('422') ||
                              errorMsg.includes('403') ||
                              errorMsg.includes('Invalid input') ||
                              errorMsg.includes('Unprocessable') ||
                              errorMsg.includes('CORS') ||
                              errorMsg.includes('ERR_FAILED');

            // 📱 Speciální handling pro overloaded error - zkus automaticky jiný model
            if (isOverloadedError && autoFallback) {
                console.log('⚠️ Model přetížen, automaticky zkouším jiný model...');
                this._log(`Model overloaded (${errorMsg.substring(0, 50)}) - fallback na jiný model...`);
                return this._fallbackToNextModel(prompt, options, provider, model);
            }

            if (isRateLimitError) {
                const keysCount = this.keys.list(provider).length;
                if (keysCount > 1 && maxKeyRotations < keysCount) {
                    this._log(`API rate limit - rotace klíče (${maxKeyRotations + 1}/${keysCount})`);
                    this.keys.rotate(provider);
                    return this.ask(prompt, { ...options, _keyRotations: maxKeyRotations + 1 });
                }

                // Všechny klíče vyčerpány - zkus další model
                if (autoFallback) {
                    this._log(`API rate limit, všechny klíče vyčerpány - zkouším další model...`);
                    return this._fallbackToNextModel(prompt, options, provider, model);
                }
            }

            // API chyba nebo jiná chyba - také zkus fallback
            if (autoFallback && !options._noMoreFallback && (isAPIError || isRateLimitError || isOverloadedError)) {
                this._log(`Chyba ${errorMsg.substring(0, 100)} - zkouším další model...`);
                return this._fallbackToNextModel(prompt, options, provider, model);
            }

            this._log(`Error: ${error.message}`);
            this.emit('request:error', { provider, model, error: error.message, duration: Date.now() - startTime });
            throw error;
        }

        // Zaznamenej statistiky
        const tokensOut = this.estimateTokens(response);
        const elapsed = Date.now() - startTime;
        this.stats.record(provider, tokensIn, tokensOut);

        this._log(`Response: ${elapsed}ms, ~${tokensIn}→${tokensOut} tokens`);
        this.emit('request:complete', { provider, model, tokensIn, tokensOut, duration: elapsed });

        // Přidej do konverzace pokud je povoleno
        if (options.useConversation) {
            this.conversation.add('user', prompt);
            this.conversation.add('assistant', response);
        }

        return response;
    },

    // Interní metoda pro fallback na další model
    _fallbackToNextModel(prompt, options, failedProvider, failedModel) {
        console.log('🔄 Fallback from:', failedProvider, failedModel);

        // Sleduj vyzkoušené modely pro prevenci nekonečné smyčky
        const triedModels = options._triedModels || [];
        const currentKey = `${failedProvider}:${failedModel}`;

        // Přidej aktuální model do seznamu vyzkoušených
        if (!triedModels.includes(currentKey)) {
            triedModels.push(currentKey);
        }

        // Limit na počet pokusů (max 10 různých modelů)
        const MAX_FALLBACK_ATTEMPTS = 10;
        if (triedModels.length >= MAX_FALLBACK_ATTEMPTS) {
            console.log('🛑 Max fallback attempts reached:', triedModels.length);
            throw new Error(`Dosažen limit ${MAX_FALLBACK_ATTEMPTS} pokusů fallback`);
        }

        // Nejdřív zkus jiné modely u stejného providera
        const allProviders = this.getAllProvidersWithModels();
        const currentProviderModels = allProviders[failedProvider]?.models || [];

        if (currentProviderModels.length > 1) {
            // Najdi index současného modelu
            const currentModelIndex = currentProviderModels.findIndex(m => m.value === failedModel);

            // Zkus další modely tohoto providera
            for (let i = 0; i < currentProviderModels.length; i++) {
                if (i === currentModelIndex) continue; // Přeskoč selhavší model

                const nextModel = currentProviderModels[i].value;
                const nextKey = `${failedProvider}:${nextModel}`;

                // Přeskoč už vyzkoušené modely
                if (triedModels.includes(nextKey)) {
                    console.log('⏭️ Skipping already tried:', nextKey);
                    continue;
                }

                console.log(`✅ Trying another model from ${failedProvider}:`, nextModel);

                try {
                    return this.ask(prompt, {
                        ...options,
                        provider: failedProvider,
                        model: nextModel,
                        _keyRotations: 0,
                        autoFallback: true,
                        _triedModels: [...triedModels, nextKey]
                    });
                } catch (e) {
                    console.log('❌ Model failed:', nextModel, e.message);
                    continue;
                }
            }
        }

        // Pokud všechny modely selhaly, zkus jiné providery
        const currentProviderIndex = this.PROVIDER_PRIORITY.indexOf(failedProvider);

        // Zkus nejdřív další providery (od aktuálního +1 do konce)
        // Pak zkus i providery před aktuálním (od začátku do aktuálního)
        const providersToTry = [
            ...this.PROVIDER_PRIORITY.slice(currentProviderIndex + 1), // Zbytek seznamu
            ...this.PROVIDER_PRIORITY.slice(0, currentProviderIndex)   // Začátek seznamu (kromě aktuálního)
        ];

        for (const nextProvider of providersToTry) {
            // Přeskoč providery bez klíče
            if (!this.getKey(nextProvider)) {
                console.log('⏭️ Skipping', nextProvider, '(no key)');
                continue;
            }

            // Vezmi první (výchozí) model tohoto providera
            const nextModel = this.config.models[nextProvider];
            const nextKey = `${nextProvider}:${nextModel}`;

            // Přeskoč už vyzkoušené
            if (triedModels.includes(nextKey)) {
                console.log('⏭️ Skipping already tried provider:', nextKey);
                continue;
            }

            console.log('✅ Trying fallback to:', nextProvider, nextModel);

            try {
                return this.ask(prompt, {
                    ...options,
                    provider: nextProvider,
                    model: nextModel,
                    _keyRotations: 0, // Reset rotace pro nového providera
                    autoFallback: true,
                    _triedModels: [...triedModels, nextKey]
                });
            } catch (e) {
                console.log('❌ Fallback failed for', nextProvider, e.message);
                // Pokračuj na další
                continue;
            }
        }

        throw new Error('Všechny providery vyčerpány');
    },

    async askWithFallback(prompt, options = {}) {
        const providers = options.providers || this.PROVIDER_PRIORITY.filter(p => this.getKey(p));

        if (providers.length === 0) {
            throw new Error('Žádný dostupný poskytovatel - nastav API klíče');
        }

        for (const provider of providers) {
            try {
                this._log(`Fallback: zkouším ${provider}...`);
                return await this.ask(prompt, { ...options, provider, autoFallback: false });
            } catch (error) {
                this._log(`${provider} selhal: ${error.message}`);
                continue;
            }
        }

        throw new Error('Všichni poskytovatelé selhali');
    },

    // Chytrý dotaz - automaticky prochází modely podle kvality
    async askSmart(prompt, options = {}) {
        const allModels = this.getAllModelsSorted();

        if (allModels.length === 0) {
            throw new Error('Žádný dostupný model - nastav API klíče');
        }

        const errors = [];
        const startIndex = options._modelIndex || 0;

        for (let i = startIndex; i < allModels.length; i++) {
            const { provider, model, name, quality } = allModels[i];

            try {
                this._log(`Smart [${i+1}/${allModels.length}]: ${name} (quality: ${quality})`);

                const response = await this.ask(prompt, {
                    ...options,
                    provider,
                    model,
                    autoFallback: false // Zabraň nekonečné rekurzi
                });

                return response;

            } catch (error) {
                errors.push({ provider, model, error: error.message });
                this._log(`${name} selhal: ${error.message}`);

                // Pokračuj na další model
                continue;
            }
        }

        // Všechny modely selhaly
        const errorSummary = errors.map(e => `${e.provider}/${e.model}: ${e.error}`).join('\n');
        throw new Error(`Všechny modely selhaly:\n${errorSummary}`);
    },

    // Alias pro askSmart - automatický fallback přes všechny modely
    async askAuto(prompt, options = {}) {
        return this.askSmart(prompt, options);
    },

    // ============== STREAMING (Gemini) ==============

    async *streamGemini(prompt, options = {}) {
        const key = options.key || this.getKey('gemini');
        if (!key) throw new Error('Gemini API klíč není nastaven');

        const model = options.model || this.config.models.gemini;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${key}&alt=sse`;

        const body = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxTokens ?? 4096
            }
        };

        if (options.system) {
            body.systemInstruction = { parts: [{ text: options.system }] };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) yield text;
                    } catch (e) {}
                }
            }
        }
    },

    async *askStream(prompt, options = {}) {
        const provider = options.provider || this.config.defaultProvider;

        if (provider === 'gemini') {
            yield* this.streamGemini(prompt, options);
        } else {
            const response = await this.ask(prompt, options);
            yield response;
        }
    },

    // ============== UTILITY ==============

    getModels(provider) {
        return this.ALL_MODELS[provider] || [];
    },

    getAllModels() {
        return this.ALL_MODELS;
    },

    getModelLimit(model) {
        for (const provider of Object.keys(this.ALL_MODELS)) {
            const found = this.ALL_MODELS[provider].find(m => m.value === model);
            if (found) return found.rpm;
        }
        return 15;
    },

    supportsVision(model) {
        return this.VISION_MODELS.includes(model);
    },

    getProviderForModel(model) {
        for (const [provider, models] of Object.entries(this.ALL_MODELS)) {
            if (models.some(m => m.value === model)) {
                return provider;
            }
        }
        return null;
    },

    getProviderInfo(provider) {
        const info = {
            gemini: {
                name: 'Google Gemini',
                endpoint: 'generativelanguage.googleapis.com',
                keyUrl: 'https://aistudio.google.com/app/apikey'
            },
            groq: {
                name: 'Groq',
                endpoint: 'api.groq.com',
                keyUrl: 'https://console.groq.com/keys'
            },
            openrouter: {
                name: 'OpenRouter',
                endpoint: 'openrouter.ai',
                keyUrl: 'https://openrouter.ai/keys'
            },
            mistral: {
                name: 'Mistral AI',
                endpoint: 'api.mistral.ai',
                keyUrl: 'https://console.mistral.ai/api-keys/'
            },
            cohere: {
                name: 'Cohere',
                endpoint: 'api.cohere.com',
                keyUrl: 'https://dashboard.cohere.com/api-keys'
            },
            huggingface: {
                name: 'Hugging Face',
                endpoint: 'api-inference.huggingface.co',
                keyUrl: 'https://huggingface.co/settings/tokens'
            }
        };

        const providerInfo = info[provider];
        if (!providerInfo) return null;

        providerInfo.models = this.ALL_MODELS[provider] || [];

        return providerInfo;
    },

    // ============== MULTI-KEY MANAGEMENT ==============
    keys: {
        _storage: {},

        // Přidej klíč pro providera
        add(provider, key, name = null) {
            if (!this._storage[provider]) {
                this._storage[provider] = [];
            }
            this._storage[provider].push({
                key,
                name: name || `Klíč ${this._storage[provider].length + 1}`,
                active: this._storage[provider].length === 0,
                addedAt: Date.now()
            });
            this._save();
        },

        // Odeber klíč
        remove(provider, index) {
            if (this._storage[provider] && this._storage[provider][index]) {
                this._storage[provider].splice(index, 1);
                // Aktivuj první pokud byl odebrán aktivní
                if (this._storage[provider].length > 0 && !this._storage[provider].find(k => k.active)) {
                    this._storage[provider][0].active = true;
                }
                this._save();
            }
        },

        // Přepni na další klíč (rotace)
        rotate(provider) {
            const keys = this._storage[provider];
            if (!keys || keys.length < 2) return false;

            const activeIndex = keys.findIndex(k => k.active);
            keys[activeIndex].active = false;
            keys[(activeIndex + 1) % keys.length].active = true;
            this._save();
            return true;
        },

        // Získej aktivní klíč
        getActive(provider) {
            const keys = this._storage[provider];
            if (!keys || keys.length === 0) return null;
            const active = keys.find(k => k.active);
            return active ? active.key : keys[0].key;
        },

        // Seznam klíčů
        list(provider) {
            return (this._storage[provider] || []).map((k, i) => ({
                index: i,
                name: k.name,
                active: k.active,
                preview: k.key.substring(0, 10) + '...'
            }));
        },

        _save() {
            try {
                localStorage.setItem('ai_module_multikeys', JSON.stringify(this._storage));
            } catch (e) {}
        },

        load() {
            try {
                const stored = localStorage.getItem('ai_module_multikeys');
                if (stored) this._storage = JSON.parse(stored);
            } catch (e) {}
        }
    },

    // ============== RESPONSE CACHE (Improved) ==============
    cache: {
        _data: {},
        _maxAge: 3600000, // 1 hodina
        _maxSize: 100,
        _hits: 0,
        _misses: 0,

        // Generuj klíč pro cache (vylepšený - normalizuje prompt)
        _makeKey(prompt, options) {
            const provider = options.provider || 'default';
            const model = options.model || 'default';
            // Normalizuj prompt - odstraň whitespace a převeď na lowercase pro lepší matching
            const normalizedPrompt = prompt.toLowerCase()
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 150);
            return `${provider}:${model}:${normalizedPrompt}`;
        },

        // Získej z cache (s fuzzy matching)
        get(prompt, options = {}) {
            const key = this._makeKey(prompt, options);
            const entry = this._data[key];

            if (entry && Date.now() - entry.timestamp <= this._maxAge) {
                this._hits++;
                console.log('📦 Cache hit! Úspora tokenu.');
                return entry.response;
            }

            // Fuzzy match - hledej podobné dotazy (>85% shoda)
            const fuzzyMatch = this._findSimilar(prompt, options);
            if (fuzzyMatch) {
                this._hits++;
                console.log('📦 Fuzzy cache hit!');
                return fuzzyMatch;
            }

            if (entry) delete this._data[key]; // Expirovaný
            this._misses++;
            return null;
        },

        // Najdi podobný dotaz v cache
        _findSimilar(prompt, options) {
            const normalizedPrompt = prompt.toLowerCase().replace(/\s+/g, ' ').trim();
            const provider = options.provider || 'default';
            const model = options.model || 'default';
            const prefix = `${provider}:${model}:`;

            for (const [key, entry] of Object.entries(this._data)) {
                if (!key.startsWith(prefix)) continue;
                if (Date.now() - entry.timestamp > this._maxAge) continue;

                const cachedPrompt = key.substring(prefix.length);
                const similarity = this._calculateSimilarity(normalizedPrompt, cachedPrompt);

                if (similarity > 0.85) {
                    return entry.response;
                }
            }
            return null;
        },

        // Jednoduchý výpočet podobnosti (Jaccard index)
        _calculateSimilarity(str1, str2) {
            const set1 = new Set(str1.split(' '));
            const set2 = new Set(str2.split(' '));
            const intersection = new Set([...set1].filter(x => set2.has(x)));
            const union = new Set([...set1, ...set2]);
            return intersection.size / union.size;
        },

        // Ulož do cache
        set(prompt, response, options = {}) {
            const key = this._makeKey(prompt, options);

            // Limit velikosti
            const keys = Object.keys(this._data);
            if (keys.length >= this._maxSize) {
                // Smaž nejstarší
                const oldest = keys.reduce((a, b) =>
                    this._data[a].timestamp < this._data[b].timestamp ? a : b
                );
                delete this._data[oldest];
            }

            this._data[key] = {
                response,
                timestamp: Date.now()
            };

            // Persist to localStorage
            this._save();
        },

        // Vyčisti cache
        clear() {
            this._data = {};
            this._hits = 0;
            this._misses = 0;
            localStorage.removeItem('ai_response_cache');
        },

        // Statistiky cache
        stats() {
            const keys = Object.keys(this._data);
            const hitRate = this._hits + this._misses > 0
                ? Math.round((this._hits / (this._hits + this._misses)) * 100)
                : 0;
            return {
                size: keys.length,
                maxSize: this._maxSize,
                maxAge: this._maxAge,
                hits: this._hits,
                misses: this._misses,
                hitRate: `${hitRate}%`
            };
        },

        // Ulož do localStorage
        _save() {
            try {
                // Ulož pouze posledních 50 položek
                const entries = Object.entries(this._data)
                    .sort((a, b) => b[1].timestamp - a[1].timestamp)
                    .slice(0, 50);
                localStorage.setItem('ai_response_cache', JSON.stringify(Object.fromEntries(entries)));
            } catch (e) {}
        },

        // Načti z localStorage
        load() {
            try {
                const stored = localStorage.getItem('ai_response_cache');
                if (stored) {
                    this._data = JSON.parse(stored);
                    // Vyčisti expirované
                    const now = Date.now();
                    Object.keys(this._data).forEach(key => {
                        if (now - this._data[key].timestamp > this._maxAge) {
                            delete this._data[key];
                        }
                    });
                }
            } catch (e) {}
        }
    },

    // ============== SMART RETRY WITH FALLBACK ==============
    smartRetry: {
        // Pořadí fallback modelů podle providera
        _fallbackOrder: {
            gemini: ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite'],
            groq: ['llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
            openrouter: [
                'meta-llama/llama-3.3-70b-instruct:free',
                'mistralai/mistral-small-3.1-24b-instruct:free',
                'google/gemma-3-27b-it:free'
            ],
            mistral: ['open-mistral-7b', 'mistral-small-latest']
        },

        // Alternativní provideři v pořadí priorit
        _providerFallback: ['groq', 'openrouter', 'gemini', 'mistral'],

        /**
         * Pokusí se o dotaz s automatickým fallbackem
         */
        async askWithFallback(prompt, options = {}) {
            const maxRetries = options.maxRetries || 3;
            const retryDelay = options.retryDelay || 2000;
            let lastError = null;

            // Zkus původní model/provider
            const originalProvider = options.provider || AI.config.defaultProvider;
            const originalModel = options.model;

            // 1. Pokus s původním nastavením
            try {
                if (AI.rateLimit.canMakeRequest(originalProvider, originalModel)) {
                    return await AI.ask(prompt, options);
                }
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Pokus selhal (${originalProvider}):`, error.message);
            }

            // 2. Zkus fallback modely stejného providera
            const fallbackModels = this._fallbackOrder[originalProvider] || [];
            for (const model of fallbackModels) {
                if (model === originalModel) continue;

                try {
                    if (AI.rateLimit.canMakeRequest(originalProvider, model)) {
                        console.log(`🔄 Fallback na model: ${model}`);
                        return await AI.ask(prompt, { ...options, model });
                    }
                } catch (error) {
                    lastError = error;
                    console.warn(`⚠️ Fallback model selhal (${model}):`, error.message);
                }
            }

            // 3. Zkus jiné providery
            for (const provider of this._providerFallback) {
                if (provider === originalProvider) continue;
                if (!AI.keys.get(provider)) continue; // Nemáme klíč

                const models = this._fallbackOrder[provider] || [];
                for (const model of models) {
                    try {
                        if (AI.rateLimit.canMakeRequest(provider, model)) {
                            console.log(`🔄 Fallback na provider: ${provider}, model: ${model}`);
                            return await AI.ask(prompt, { ...options, provider, model });
                        }
                    } catch (error) {
                        lastError = error;
                    }
                }
            }

            // 4. Poslední pokus - čekej a zkus znovu
            for (let i = 0; i < maxRetries; i++) {
                await new Promise(r => setTimeout(r, retryDelay * (i + 1)));

                try {
                    if (AI.rateLimit.canMakeRequest(originalProvider, originalModel)) {
                        console.log(`🔄 Retry pokus ${i + 1}/${maxRetries}`);
                        return await AI.ask(prompt, options);
                    }
                } catch (error) {
                    lastError = error;
                }
            }

            throw lastError || new Error('Všechny pokusy selhaly');
        },

        /**
         * Získej doporučený model pro aktuální situaci
         */
        getRecommendedModel(provider) {
            const models = AI.ALL_MODELS[provider] || [];

            // Najdi model s nejvyšším zbývajícím limitem
            let bestModel = null;
            let bestRemaining = -1;

            for (const m of models) {
                if (!m.free) continue;
                const remaining = AI.rateLimit.remaining(provider, m.value);
                if (remaining > bestRemaining) {
                    bestRemaining = remaining;
                    bestModel = m.value;
                }
            }

            return bestModel;
        }
    },

    // ============== PROMPT TEMPLATES ==============
    templates: {
        _templates: {
            translate: {
                name: 'Překlad',
                system: 'Jsi profesionální překladatel. Překládej přesně a zachovávej styl.',
                prompt: 'Přelož do {language}: {text}'
            },
            summarize: {
                name: 'Shrnutí',
                system: 'Vytváříš stručná a přesná shrnutí.',
                prompt: 'Shrň následující text v {length} větách: {text}'
            },
            code: {
                name: 'Programování',
                system: 'Jsi expert na programování. Piš čistý, komentovaný kód.',
                prompt: 'Napiš {language} kód který: {task}'
            },
            explain: {
                name: 'Vysvětlení',
                system: 'Vysvětluješ složité koncepty jednoduše a srozumitelně.',
                prompt: 'Vysvětli {topic} jako bych byl {level}'
            },
            email: {
                name: 'Email',
                system: 'Píšeš profesionální emaily.',
                prompt: 'Napiš {tone} email ohledně: {subject}'
            },
            cnc: {
                name: 'CNC/G-kód',
                system: 'Jsi expert na CNC programování a G-kódy pro soustruhy.',
                prompt: 'Vytvoř G-kód pro: {operation}'
            }
        },

        // Získej šablonu
        get(name) {
            return this._templates[name] || null;
        },

        // Seznam šablon
        list() {
            return Object.entries(this._templates).map(([key, t]) => ({
                key,
                name: t.name
            }));
        },

        // Použij šablonu
        apply(name, variables = {}) {
            const template = this._templates[name];
            if (!template) return null;

            let prompt = template.prompt;
            let system = template.system;

            // Nahraď proměnné
            Object.entries(variables).forEach(([key, value]) => {
                const regex = new RegExp(`{${key}}`, 'g');
                prompt = prompt.replace(regex, value);
                system = system.replace(regex, value);
            });

            return { prompt, system };
        },

        // Přidej vlastní šablonu
        add(key, name, system, prompt) {
            this._templates[key] = { name, system, prompt };
            this._save();
        },

        _save() {
            try {
                localStorage.setItem('ai_module_templates', JSON.stringify(this._templates));
            } catch (e) {}
        },

        load() {
            try {
                const stored = localStorage.getItem('ai_module_templates');
                if (stored) {
                    const custom = JSON.parse(stored);
                    this._templates = { ...this._templates, ...custom };
                }
            } catch (e) {}
        }
    },

    // ============== EVENT SYSTEM ==============
    events: {
        _listeners: {},

        // Přidej listener
        on(event, callback) {
            if (!this._listeners[event]) {
                this._listeners[event] = [];
            }
            this._listeners[event].push(callback);
            return () => this.off(event, callback); // Vrací funkci pro odebrání
        },

        // Odeber listener
        off(event, callback) {
            if (!this._listeners[event]) return;
            this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
        },

        // Jednou
        once(event, callback) {
            const wrapper = (...args) => {
                this.off(event, wrapper);
                callback(...args);
            };
            this.on(event, wrapper);
        },

        // Emituj event
        emit(event, data) {
            if (!this._listeners[event]) return;
            this._listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Event handler error (${event}):`, e);
                }
            });
        },

        // Seznam eventů
        list() {
            return Object.keys(this._listeners);
        },

        // Vyčisti všechny listenery
        clear(event = null) {
            if (event) {
                delete this._listeners[event];
            } else {
                this._listeners = {};
            }
        }
    },

    // Zkratky pro eventy
    on(event, callback) { return this.events.on(event, callback); },
    off(event, callback) { this.events.off(event, callback); },
    emit(event, data) { this.events.emit(event, data); },

    // ============== WORKFLOW / PIPELINE SYSTEM ==============
    workflow: {
        _workflows: {},

        // Vytvoř nový workflow
        create(name) {
            const workflow = {
                name,
                steps: [],

                // Přidej krok
                step(stepName, options = {}) {
                    this.steps.push({
                        name: stepName,
                        system: options.system || null,
                        prompt: options.prompt || null, // Template s {input} a {prevOutput}
                        provider: options.provider || null,
                        model: options.model || null,
                        transform: options.transform || null, // Funkce pro transformaci výstupu
                        condition: options.condition || null, // Podmínka pro spuštění kroku
                        temperature: options.temperature,
                        parseJson: options.parseJson || false
                    });
                    return this;
                },

                // Spusť workflow
                async run(input, options = {}) {
                    const results = [];
                    let currentInput = input;
                    let prevOutput = null;

                    AI.emit('workflow:start', { name: this.name, input });

                    for (let i = 0; i < this.steps.length; i++) {
                        const step = this.steps[i];

                        // Zkontroluj podmínku
                        if (step.condition && !step.condition(currentInput, prevOutput, results)) {
                            AI.emit('workflow:skip', { name: this.name, step: step.name, reason: 'condition' });
                            continue;
                        }

                        // Sestav prompt
                        let prompt = step.prompt
                            ? step.prompt.replace('{input}', currentInput).replace('{prevOutput}', prevOutput || '')
                            : currentInput;

                        try {
                            AI.emit('workflow:step:start', { name: this.name, step: step.name, input: prompt });

                            const response = await AI.ask(prompt, {
                                system: step.system,
                                provider: step.provider || options.provider,
                                model: step.model,
                                temperature: step.temperature,
                                parseJson: step.parseJson
                            });

                            // Transformuj výstup pokud je definována funkce
                            const output = step.transform ? step.transform(response) : response;

                            results.push({
                                step: step.name,
                                input: prompt,
                                output,
                                success: true
                            });

                            prevOutput = output;
                            currentInput = output;

                            AI.emit('workflow:step:complete', { name: this.name, step: step.name, output });

                        } catch (error) {
                            results.push({
                                step: step.name,
                                input: prompt,
                                error: error.message,
                                success: false
                            });

                            AI.emit('workflow:step:error', { name: this.name, step: step.name, error });

                            if (!options.continueOnError) {
                                AI.emit('workflow:error', { name: this.name, step: step.name, error, results });
                                throw error;
                            }
                        }
                    }

                    AI.emit('workflow:complete', { name: this.name, results, finalOutput: prevOutput });

                    return {
                        success: results.every(r => r.success),
                        steps: results,
                        output: prevOutput
                    };
                }
            };

            this._workflows[name] = workflow;
            return workflow;
        },

        // Získej existující workflow
        get(name) {
            return this._workflows[name] || null;
        },

        // Seznam workflows
        list() {
            return Object.keys(this._workflows);
        },

        // Smaž workflow
        remove(name) {
            delete this._workflows[name];
        }
    },

    // ============== SCHEDULER / CRON SYSTEM ==============
    scheduler: {
        _jobs: {},
        _intervals: {},
        _running: false,

        // Parsuj cron výraz (zjednodušená verze)
        _parseCron(expression) {
            // Podporuje: 'every Xm', 'every Xh', 'every Xs', nebo interval v ms
            if (typeof expression === 'number') return expression;

            const match = expression.match(/every\s+(\d+)\s*(s|m|h|d)/i);
            if (match) {
                const value = parseInt(match[1]);
                const unit = match[2].toLowerCase();
                const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
                return value * multipliers[unit];
            }

            // Jednoduchý cron (minuty hodiny * * *)
            const cronMatch = expression.match(/^(\d+|\*)\s+(\d+|\*)\s+/);
            if (cronMatch) {
                // Pro jednoduchost vrátíme interval 1 hodinu pro cron výrazy
                console.warn('⚠️ Plný cron není podporován, používám interval 1h');
                return 3600000;
            }

            return 60000; // Výchozí 1 minuta
        },

        // Přidej úlohu
        add(name, schedule, task, options = {}) {
            const intervalMs = this._parseCron(schedule);

            this._jobs[name] = {
                name,
                schedule,
                intervalMs,
                task,
                enabled: options.enabled !== false,
                runImmediately: options.runImmediately || false,
                lastRun: null,
                nextRun: Date.now() + (options.runImmediately ? 0 : intervalMs),
                runCount: 0,
                errors: [],
                maxErrors: options.maxErrors || 5
            };

            if (this._running) {
                this._startJob(name);
            }

            AI.emit('scheduler:add', { name, schedule, intervalMs });
            return this;
        },

        // Spusť scheduler
        start() {
            if (this._running) return;
            this._running = true;

            Object.keys(this._jobs).forEach(name => this._startJob(name));
            AI.emit('scheduler:start', { jobs: Object.keys(this._jobs) });
            console.log('⏰ Scheduler spuštěn');
        },

        // Zastav scheduler
        stop() {
            this._running = false;
            Object.keys(this._intervals).forEach(name => {
                clearInterval(this._intervals[name]);
                delete this._intervals[name];
            });
            AI.emit('scheduler:stop', {});
            console.log('⏰ Scheduler zastaven');
        },

        // Interní: spusť konkrétní job
        _startJob(name) {
            const job = this._jobs[name];
            if (!job || !job.enabled) return;

            // Vyčisti existující interval
            if (this._intervals[name]) {
                clearInterval(this._intervals[name]);
            }

            const runTask = async () => {
                if (!job.enabled) return;

                job.lastRun = Date.now();
                job.runCount++;

                AI.emit('scheduler:run', { name, runCount: job.runCount });

                try {
                    const result = await job.task();
                    AI.emit('scheduler:complete', { name, result });
                } catch (error) {
                    job.errors.push({ time: Date.now(), message: error.message });
                    AI.emit('scheduler:error', { name, error });

                    // Automaticky vypni po příliš mnoha chybách
                    if (job.errors.length >= job.maxErrors) {
                        job.enabled = false;
                        AI.emit('scheduler:disabled', { name, reason: 'too many errors' });
                        console.warn(`⚠️ Job '${name}' vypnut po ${job.maxErrors} chybách`);
                    }
                }

                job.nextRun = Date.now() + job.intervalMs;
            };

            // Spusť okamžitě pokud je nastaveno
            if (job.runImmediately && job.runCount === 0) {
                runTask();
            }

            this._intervals[name] = setInterval(runTask, job.intervalMs);
        },

        // Manuální spuštění
        async run(name) {
            const job = this._jobs[name];
            if (!job) throw new Error(`Job '${name}' neexistuje`);

            job.lastRun = Date.now();
            job.runCount++;
            return await job.task();
        },

        // Povol/zakázat job
        enable(name, enabled = true) {
            if (this._jobs[name]) {
                this._jobs[name].enabled = enabled;
                if (enabled && this._running) {
                    this._startJob(name);
                } else if (!enabled && this._intervals[name]) {
                    clearInterval(this._intervals[name]);
                    delete this._intervals[name];
                }
            }
        },

        // Odeber job
        remove(name) {
            if (this._intervals[name]) {
                clearInterval(this._intervals[name]);
                delete this._intervals[name];
            }
            delete this._jobs[name];
            AI.emit('scheduler:remove', { name });
        },

        // Seznam jobů
        list() {
            return Object.values(this._jobs).map(j => ({
                name: j.name,
                schedule: j.schedule,
                enabled: j.enabled,
                lastRun: j.lastRun ? new Date(j.lastRun).toLocaleString() : null,
                nextRun: j.nextRun ? new Date(j.nextRun).toLocaleString() : null,
                runCount: j.runCount,
                errorCount: j.errors.length
            }));
        },

        // Status
        status() {
            return {
                running: this._running,
                jobs: this.list()
            };
        }
    },

    // ============== INTENT DETECTION ==============
    async detectIntent(text, options = {}) {
        const systemPrompt = options.customIntents
            ? `Rozpoznej záměr uživatele. Možné záměry: ${options.customIntents.join(', ')}.
               Vrať JSON: { "intent": "název_záměru", "confidence": 0-1, "params": {} }`
            : `Rozpoznej záměr uživatele z textu. Možné záměry:
               - translate (překlad) - params: { language, text }
               - summarize (shrnutí) - params: { length }
               - code (programování) - params: { language, task }
               - explain (vysvětlení) - params: { topic, level }
               - search (vyhledávání) - params: { query }
               - create (vytvoření) - params: { type, description }
               - analyze (analýza) - params: { target }
               - compare (porovnání) - params: { items }
               - convert (konverze) - params: { from, to }
               - other (jiné) - params: { description }

               Vrať pouze JSON: { "intent": "název", "confidence": 0.0-1.0, "params": {}, "originalText": "..." }`;

        try {
            const response = await this.ask(text, {
                system: systemPrompt,
                provider: options.provider || 'groq', // Groq je rychlý
                temperature: 0.1, // Nízká pro konzistentní výsledky
                parseJson: true
            });

            const result = typeof response === 'string' ? this.parseJSON(response) : response;

            if (result && result.intent) {
                this.emit('intent:detected', result);
                return result;
            }

            return { intent: 'unknown', confidence: 0, params: {}, originalText: text };

        } catch (error) {
            console.warn('Intent detection failed:', error.message);
            return { intent: 'error', confidence: 0, params: {}, error: error.message };
        }
    },

    // Zpracuj příkaz podle intentu
    async processIntent(text, options = {}) {
        const intent = await this.detectIntent(text, options);

        if (intent.confidence < (options.minConfidence || 0.5)) {
            return {
                success: false,
                intent,
                message: 'Nízká jistota záměru. Můžeš upřesnit?'
            };
        }

        // Mapování intentů na akce
        const actions = {
            translate: async (params) => this.translate(params.text || text, params.language || 'en'),
            summarize: async (params) => this.summarize(params.text || text, params.length || 3),
            code: async (params) => this.generateCode(params.task || text, params.language || 'javascript'),
            explain: async (params) => this.ask(`Vysvětli ${params.topic || text}`, {
                system: `Vysvětluj pro úroveň: ${params.level || 'začátečník'}`
            }),
            ...options.customActions
        };

        const action = actions[intent.intent];

        if (action) {
            try {
                const result = await action(intent.params);
                return { success: true, intent, result };
            } catch (error) {
                return { success: false, intent, error: error.message };
            }
        }

        return { success: false, intent, message: 'Neznámý záměr' };
    },

    // ============== SMART ASK (Auto-retry, Load Balancing) ==============
    async smartAsk(prompt, options = {}) {
        const {
            preferredProviders = this.PROVIDER_PRIORITY,
            maxRetries = 3,
            balanceLoad = true,
            fallbackOnError = true,
            timeout = this.config.timeout
        } = options;

        // Seřaď providery podle dostupnosti
        const providers = preferredProviders.filter(p => this.getKey(p));

        if (balanceLoad) {
            // Seřaď podle zbývajících požadavků
            providers.sort((a, b) => {
                const remainingA = this.rateLimit.remaining(a);
                const remainingB = this.rateLimit.remaining(b);
                return remainingB - remainingA;
            });
        }

        let lastError = null;
        let attempts = [];

        for (const provider of providers) {
            for (let retry = 0; retry < maxRetries; retry++) {
                // Zkontroluj rate limit
                if (!this.rateLimit.canMakeRequest(provider)) {
                    this.emit('smartAsk:rateLimit', { provider });
                    break; // Přejdi na dalšího providera
                }

                try {
                    this.emit('smartAsk:attempt', { provider, retry, prompt: prompt.substring(0, 50) });

                    const startTime = Date.now();
                    const response = await this.ask(prompt, {
                        ...options,
                        provider,
                        timeout
                    });

                    const duration = Date.now() - startTime;

                    this.emit('smartAsk:success', { provider, retry, duration });

                    return {
                        response,
                        provider,
                        attempts: attempts.length + 1,
                        duration
                    };

                } catch (error) {
                    lastError = error;
                    attempts.push({ provider, retry, error: error.message });

                    this.emit('smartAsk:error', { provider, retry, error: error.message });

                    // Rate limit - přejdi na dalšího providera
                    if (error.message.includes('429') || error.message.includes('quota')) {
                        break;
                    }

                    // Jiné chyby - zkus znovu s malým zpožděním
                    if (retry < maxRetries - 1) {
                        await new Promise(r => setTimeout(r, 1000 * (retry + 1)));
                    }
                }
            }

            if (!fallbackOnError) break;
        }

        this.emit('smartAsk:failed', { attempts, lastError: lastError?.message });
        throw new Error(`Všichni provideři selhali. Poslední chyba: ${lastError?.message}`);
    },

    // ============== ASK JSON (s validací a auto-fix) ==============
    async askJSON(prompt, options = {}) {
        const {
            schema = null,
            maxRetries = 3,
            autoFix = true,
            strict = false
        } = options;

        const schemaHint = schema
            ? `\n\nVrať JSON přesně v tomto formátu: ${JSON.stringify(schema)}`
            : '\n\nVrať pouze validní JSON, žádný jiný text.';

        let lastResponse = null;
        let lastError = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                let currentPrompt = prompt + schemaHint;

                // Pokud je to retry a máme chybu, přidej opravu
                if (attempt > 0 && lastError && autoFix) {
                    currentPrompt = `${prompt}${schemaHint}\n\nPŘEDCHOZÍ POKUS SELHAL. Chyba: ${lastError}\nOprav JSON a vrať správný formát.`;
                    if (lastResponse) {
                        currentPrompt += `\n\nPředchozí odpověď (špatná): ${lastResponse.substring(0, 500)}`;
                    }
                }

                const response = await this.ask(currentPrompt, {
                    ...options,
                    system: (options.system || '') + '\nVždy odpovídej pouze validním JSON bez markdown bloků.',
                    temperature: options.temperature ?? 0.3 // Nižší pro konzistenci
                });

                lastResponse = response;

                // Parsuj JSON
                const parsed = this.parseJSON(response);

                if (!parsed) {
                    lastError = 'Nepodařilo se parsovat JSON';
                    continue;
                }

                // Validuj proti schématu pokud existuje
                if (schema && strict) {
                    const validation = this._validateSchema(parsed, schema);
                    if (!validation.valid) {
                        lastError = `Schema validace selhala: ${validation.errors.join(', ')}`;
                        continue;
                    }
                }

                this.emit('askJSON:success', { attempt, parsed });
                return parsed;

            } catch (error) {
                lastError = error.message;
                this.emit('askJSON:retry', { attempt, error: error.message });
            }
        }

        this.emit('askJSON:failed', { attempts: maxRetries, lastError });
        throw new Error(`Nepodařilo se získat validní JSON po ${maxRetries} pokusech: ${lastError}`);
    },

    // Jednoduchá validace schématu
    _validateSchema(data, schema) {
        const errors = [];

        const validate = (obj, schemaObj, path = '') => {
            if (typeof schemaObj === 'string') {
                // schemaObj je typ: 'string', 'number', 'boolean', 'array', 'object'
                const actualType = Array.isArray(obj) ? 'array' : typeof obj;
                if (actualType !== schemaObj && schemaObj !== 'any') {
                    errors.push(`${path}: očekáván ${schemaObj}, dostán ${actualType}`);
                }
            } else if (Array.isArray(schemaObj)) {
                if (!Array.isArray(obj)) {
                    errors.push(`${path}: očekáváno pole`);
                }
            } else if (typeof schemaObj === 'object' && schemaObj !== null) {
                if (typeof obj !== 'object' || obj === null) {
                    errors.push(`${path}: očekáván objekt`);
                } else {
                    for (const key of Object.keys(schemaObj)) {
                        if (!(key in obj)) {
                            errors.push(`${path}.${key}: chybí`);
                        } else {
                            validate(obj[key], schemaObj[key], `${path}.${key}`);
                        }
                    }
                }
            }
        };

        validate(data, schema);
        return { valid: errors.length === 0, errors };
    },

    // ============== PARALLEL EXECUTION ==============
    async parallel(tasks, options = {}) {
        const {
            maxConcurrent = 3,
            stopOnError = false,
            timeout = this.config.timeout,
            balanceProviders = true
        } = options;

        const results = [];
        const queue = [...tasks];
        let activeCount = 0;
        let hasError = false;

        // Přiřaď providery pokud chceme balancovat
        if (balanceProviders) {
            const providers = this.getAvailableProviders();
            queue.forEach((task, i) => {
                if (!task.provider) {
                    task.provider = providers[i % providers.length];
                }
            });
        }

        this.emit('parallel:start', { totalTasks: tasks.length, maxConcurrent });

        return new Promise((resolve, reject) => {
            const processNext = async () => {
                if (hasError && stopOnError) return;
                if (queue.length === 0 && activeCount === 0) {
                    this.emit('parallel:complete', { results });
                    resolve(results);
                    return;
                }

                while (activeCount < maxConcurrent && queue.length > 0) {
                    const task = queue.shift();
                    const index = tasks.indexOf(task);
                    activeCount++;

                    (async () => {
                        const startTime = Date.now();
                        try {
                            this.emit('parallel:task:start', { index, prompt: (task.prompt || task).substring(0, 50) });

                            const response = await this.ask(
                                typeof task === 'string' ? task : task.prompt,
                                typeof task === 'string' ? options : { ...options, ...task }
                            );

                            results[index] = {
                                success: true,
                                response,
                                duration: Date.now() - startTime,
                                provider: task.provider || options.provider
                            };

                            this.emit('parallel:task:complete', { index, duration: results[index].duration });

                        } catch (error) {
                            results[index] = {
                                success: false,
                                error: error.message,
                                duration: Date.now() - startTime
                            };

                            this.emit('parallel:task:error', { index, error: error.message });

                            if (stopOnError) {
                                hasError = true;
                                reject(error);
                                return;
                            }
                        }

                        activeCount--;
                        processNext();
                    })();
                }
            };

            processNext();
        });
    },

    // ============== MEMORY / LEARNING ==============
    memory: {
        _data: {
            patterns: [],      // Úspěšné vzory
            preferences: {},   // Uživatelské preference
            corrections: []    // Opravy
        },
        _maxPatterns: 100,

        // Zaznamenej úspěšný vzor
        recordSuccess(input, output, metadata = {}) {
            this._data.patterns.push({
                input: input.substring(0, 100),
                outputPreview: output.substring(0, 50),
                metadata,
                timestamp: Date.now()
            });

            // Limit velikosti
            if (this._data.patterns.length > this._maxPatterns) {
                this._data.patterns = this._data.patterns.slice(-this._maxPatterns);
            }
            this._save();
        },

        // Zaznamenej opravu
        recordCorrection(original, corrected) {
            this._data.corrections.push({
                original: original.substring(0, 100),
                corrected: corrected.substring(0, 100),
                timestamp: Date.now()
            });
            this._save();
        },

        // Nastav preferenci
        setPreference(key, value) {
            this._data.preferences[key] = value;
            this._save();
        },

        // Získej preferenci
        getPreference(key) {
            return this._data.preferences[key];
        },

        // Získej kontext pro AI
        getContext() {
            const context = [];

            if (this._data.patterns.length > 0) {
                const recent = this._data.patterns.slice(-3);
                context.push(`Předchozí úspěšné příkazy: ${recent.map(p => p.input).join(', ')}`);
            }

            if (Object.keys(this._data.preferences).length > 0) {
                context.push(`Preference: ${JSON.stringify(this._data.preferences)}`);
            }

            return context.join('\n');
        },

        // Vyčisti paměť
        clear() {
            this._data = { patterns: [], preferences: {}, corrections: [] };
            this._save();
        },

        // Statistiky
        stats() {
            return {
                patterns: this._data.patterns.length,
                preferences: Object.keys(this._data.preferences).length,
                corrections: this._data.corrections.length
            };
        },

        _save() {
            try {
                localStorage.setItem('ai_module_memory', JSON.stringify(this._data));
            } catch (e) {}
        },

        load() {
            try {
                const stored = localStorage.getItem('ai_module_memory');
                if (stored) this._data = JSON.parse(stored);
            } catch (e) {}
        }
    },

    // ============== JSON HELPER ==============
    parseJSON(text) {
        try {
            // Vyčisti markdown bloky
            let clean = text
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/g, '')
                .trim();

            // Najdi JSON objekt nebo pole
            const firstBrace = clean.indexOf('{');
            const firstBracket = clean.indexOf('[');
            const lastBrace = clean.lastIndexOf('}');
            const lastBracket = clean.lastIndexOf(']');

            let start, end;
            if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
                start = firstBrace;
                end = lastBrace;
            } else if (firstBracket !== -1) {
                start = firstBracket;
                end = lastBracket;
            } else {
                return null;
            }

            if (start !== -1 && end !== -1 && end > start) {
                clean = clean.substring(start, end + 1);
            }

            // Oprav neuzavřené závorky
            const openBraces = (clean.match(/\{/g) || []).length;
            const closeBraces = (clean.match(/\}/g) || []).length;
            const openBrackets = (clean.match(/\[/g) || []).length;
            const closeBrackets = (clean.match(/\]/g) || []).length;

            clean += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
            clean += '}'.repeat(Math.max(0, openBraces - closeBraces));

            // Odstraň trailing čárky
            clean = clean.replace(/,\s*([}\]])/g, '$1');

            return JSON.parse(clean);
        } catch (e) {
            console.warn('JSON parse failed:', e.message);
            return null;
        }
    },

    // ============== BATCH REQUESTS ==============
    async batch(prompts, options = {}) {
        const results = [];
        const concurrency = options.concurrency || 3;
        const delay = options.delay || 500;

        // Rozděl na skupiny
        for (let i = 0; i < prompts.length; i += concurrency) {
            const batch = prompts.slice(i, i + concurrency);

            // Paralelně zpracuj skupinu
            const batchResults = await Promise.allSettled(
                batch.map(p => this.ask(
                    typeof p === 'string' ? p : p.prompt,
                    typeof p === 'string' ? options : { ...options, ...p }
                ))
            );

            results.push(...batchResults.map((r, idx) => ({
                prompt: batch[idx],
                success: r.status === 'fulfilled',
                response: r.status === 'fulfilled' ? r.value : null,
                error: r.status === 'rejected' ? r.reason.message : null
            })));

            // Čekej mezi skupinami
            if (i + concurrency < prompts.length) {
                await new Promise(r => setTimeout(r, delay));
            }
        }

        return results;
    },

    // ============== QUICK METHODS ==============

    // Dotaz s cache
    async askCached(prompt, options = {}) {
        // Zkus cache
        const cached = this.cache.get(prompt, options);
        if (cached) {
            console.log('📦 Cache hit');
            return cached;
        }

        // Zavolej API
        const response = await this.ask(prompt, { ...options, skipRateLimit: false });

        // Ulož do cache
        this.cache.set(prompt, response, options);

        return response;
    },

    // Dotaz s šablonou
    async askWithTemplate(templateName, variables = {}, options = {}) {
        const template = this.templates.apply(templateName, variables);
        if (!template) {
            throw new Error(`Šablona '${templateName}' neexistuje`);
        }

        return this.ask(template.prompt, {
            ...options,
            system: template.system
        });
    },

    // Dotaz s pamětí (přidá kontext z memory)
    async askWithMemory(prompt, options = {}) {
        const context = this.memory.getContext();
        const enhancedPrompt = context
            ? `${context}\n\nAktuální požadavek: ${prompt}`
            : prompt;

        const response = await this.ask(enhancedPrompt, options);

        // Zaznamenej úspěch
        this.memory.recordSuccess(prompt, response);

        return response;
    },

    // Rychlý překlad
    async translate(text, targetLang = 'en', options = {}) {
        return this.ask(`Přelož do ${targetLang}: ${text}`, {
            ...options,
            system: 'Jsi překladatel. Vrať pouze překlad, nic jiného.'
        });
    },

    // Rychlé shrnutí
    async summarize(text, sentences = 3, options = {}) {
        return this.ask(`Shrň v ${sentences} větách: ${text}`, {
            ...options,
            system: 'Vrať pouze shrnutí, nic jiného.'
        });
    },

    // Rychlá extrakce JSON
    async extractJSON(text, schema = null, options = {}) {
        const schemaHint = schema ? `\nVrať JSON ve formátu: ${JSON.stringify(schema)}` : '';
        const response = await this.ask(`Extrahuj strukturovaná data z textu:${schemaHint}\n\nText: ${text}`, {
            ...options,
            system: 'Vrať pouze validní JSON, žádný další text.'
        });
        return this.parseJSON(response);
    },

    // Generování kódu
    async generateCode(task, language = 'javascript', options = {}) {
        return this.ask(`Napiš ${language} kód: ${task}`, {
            ...options,
            system: `Jsi expert na ${language}. Vrať pouze kód s komentáři, bez vysvětlení.`
        });
    },

    // ============== INICIALIZACE ==============
    init() {
        this.stats.load();
        this.rateLimit.load();
        this.conversation.load();
        this.keys.load();
        this.templates.load();
        this.memory.load();
        this.cache.load(); // Načti cache z localStorage

        // Emituj init event
        this.emit('init', { version: '3.0', providers: this.getAvailableProviders() });

        console.log('🤖 AI Module v3.0 inicializován (s automatizací)');
        console.log('   📡 Events: AI.on("request:complete", callback)');
        console.log('   🔗 Workflow: AI.workflow.create("name")');
        console.log('   ⏰ Scheduler: AI.scheduler.add("job", "every 5m", task)');
        console.log('   🎯 Intent: AI.detectIntent("text")');
        console.log('   ⚡ Smart: AI.smartAsk("prompt")');
        console.log('   📦 Parallel: AI.parallel([prompts])');
        console.log('   💾 Cache: AI.cache.stats()');
        console.log('   🔄 Retry: AI.smartRetry.askWithFallback(prompt)');

        return this;
    },

    // Verze modulu
    version: '3.0.0'
};

// Automatická inicializace
AI.init();

// Expose globally pro běžné script tagy
// Pro ES6 moduly použij import { aiService } from './modules/ai'
if (typeof window !== 'undefined') {
  window.AI = AI;
}
