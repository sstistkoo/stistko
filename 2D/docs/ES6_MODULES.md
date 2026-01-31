# ES6 Moduly - Stav migrace

## Aktuální stav: HYBRIDNÍ

Aplikace používá kombinaci:

- **ES6 moduly** s `export` pro moderní použití
- **window.\*** přiřazení pro zpětnou kompatibilitu s HTML onclick atributy

## Struktura modulů

### ✅ AI Moduly (ES6 připravené)

```
src/ai/
├── index.js         # Hlavní vstupní bod, re-exporty
├── ai-config.js     # Konfigurace, MODEL_LIMITS
├── ai-utils.js      # Utility funkce (escapeHtml, parseAIReply, ...)
├── ai-ui.js         # UI management (toggleAiPanel, modály, ...)
├── ai-providers.js  # API providery (Groq, OpenRouter, Mistral)
├── ai-core.js       # Jádro AI (callGemini, callGeminiDirect, ...)
└── ai-test-suite.js # Testovací sada
```

Každý modul exportuje konstantu (např. `AI_CONFIG`, `AI_UTILS`) a zároveň přiřazuje funkce na `window.*`.

### ⏳ Core Moduly (čekají na migraci)

```
src/
├── globals.js       # Globální proměnné
├── utils.js         # Utility funkce
├── drawing.js       # Kreslící funkce
├── canvas.js        # Canvas management
├── ui.js            # UI funkce
├── keyboard.js      # Klávesové zkratky
├── controller.js    # G-kód ovladač
├── polar-line.js    # Polární kreslení
└── app.js           # Hlavní vstupní bod (nový)
```

## Jak používat ES6 importy

### V moderním kódu:

```javascript
import { AI } from "./ai/index.js";

// Použití
AI.callGemini();
AI.toggleAiPanel(true);
```

### V HTML (zpětná kompatibilita):

```html
<button onclick="window.callGemini()">AI</button>
```

## Plán další migrace

1. **Fáze 1** ✅ - AI moduly převedeny na ES6
2. **Fáze 2** ⏳ - Core moduly (utils, drawing, canvas)
3. **Fáze 3** ⏳ - UI a ovladače
4. **Fáze 4** ⏳ - Odstranění window.\* závislostí
5. **Fáze 5** ⏳ - Plně ES6 aplikace

## Testování

Po každé změně:

1. Spusť `python -m http.server 8080`
2. Otevři http://localhost:8080
3. Zkontroluj konzoli pro chyby
4. Otestuj AI funkcionalitu

## Poznámky

- ES6 moduly vyžadují HTTP server (nefungují s `file://`)
- Import map je nakonfigurován pro `@google/genai`
- Starý `ai.js` je zálohován v `zaloha/ai.js.bak`
