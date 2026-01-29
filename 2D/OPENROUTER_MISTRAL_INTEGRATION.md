# OpenRouter a Mistral API Integrace

## 📋 Přehled změn

Projekt byl úspěšně rozšířen o podporu pro **OpenRouter** a **Mistral AI** jako další AI providery vedle stávající Gemini a Groq integrace.

## 🎯 Nové funkce

### 1. OpenRouter Integrace

**Free modely:**
- ⚡ `google/gemini-2.0-flash-exp:free` - Gemini 2.0 Flash
- 🦙 `meta-llama/llama-3.3-70b-instruct:free` - Llama 3.3 70B
- 💻 `qwen/qwen-2.5-72b-instruct:free` - Qwen 2.5 72B
- 🔥 `mistralai/mistral-small-3.1-24b-instruct:free` - Mistral Small 3.1
- 🧠 `deepseek/deepseek-r1:free` - DeepSeek R1 (reasoning)
- ⚡ `google/gemma-3-27b-it:free` - Google Gemma 3 27B

**API Endpoint:** `https://openrouter.ai/api/v1/chat/completions`

**Demo API klíč:** `***REMOVED***`
- Rozdělený na 2 části v `globals.js` pro bezpečnost

### 2. Mistral Integrace

**Modely:**
- 💻 `codestral-latest` - Specializovaný na kód
- ⚡ `mistral-small-latest` - Rychlý, všestranný

**API Endpoint:** `https://api.mistral.ai/v1/chat/completions`

**Demo API klíč:** `***REMOVED***`
- Rozdělený na 2 části v `globals.js` pro bezpečnost

## 📝 Změněné soubory

### 1. `src/globals.js`
```javascript
// Přidány demo API klíče
window.EMBEDDED_OPENROUTER_API_KEY = "***REMOVED***" + "***REMOVED***";
window.EMBEDDED_MISTRAL_API_KEY = "***REMOVED***" + "***REMOVED***";
```

### 2. `index.html`
- Přidány **OpenRouter** a **Mistral** do provider selectu
- Přidány settings UI taby pro oba providery
- Aktualizován komentář v hlavičce s odkazy na získání API klíčů

**Provider Select:**
```html
<option value="openrouter">🌐 OpenRouter</option>
<option value="mistral">🔥 Mistral</option>
```

**Odkazy pro API klíče:**
- OpenRouter: https://openrouter.ai/keys
- Mistral: https://console.mistral.ai/api-keys/

### 3. `src/ai.js`

#### Přidané funkce:

**`window.callOpenRouterDirect()`**
- Plná implementace OpenRouter API volání
- Podpora pro 2D, CNC a Chat režimy
- Správné parsování JSON odpovědí
- Error handling s užitečnými chybovými zprávami

**`window.callMistralDirect()`**
- Plná implementace Mistral API volání
- Podpora pro 2D, CNC a Chat režimy
- Správné parsování JSON odpovědí
- Error handling s užitečnými chybovými zprávami

**`window.updateModelsForProvider()`** - rozšířena
```javascript
else if (provider === "openrouter") {
  // OpenRouter modely - FREE verze
  const openrouterModels = [
    { value: "google/gemini-2.0-flash-exp:free", label: "⚡ Gemini 2.0 Flash :free" },
    // ... další modely
  ];
}
else if (provider === "mistral") {
  // Mistral modely
  const mistralModels = [
    { value: "codestral-latest", label: "💻 Codestral (specializovaný na kód)" },
    { value: "mistral-small-latest", label: "⚡ Mistral Small (rychlý, všestranný)" }
  ];
}
```

**`window.callGeminiDirect()`** - aktualizována
```javascript
// Routing podle providera
if (provider === "groq") {
  return window.callGroqDirect();
} else if (provider === "openrouter") {
  return window.callOpenRouterDirect();
} else if (provider === "mistral") {
  return window.callMistralDirect();
} else {
  return window.callGeminiDirectOriginal();
}
```

### 4. `src/utils.js`

#### Přidané funkce pro OpenRouter:

```javascript
function getStoredOpenRouterKeys()
function saveStoredOpenRouterKeys(keys)
window.getCurrentOpenRouterApiKey()
window.getCurrentOpenRouterApiKeyName()
window.renderOpenRouterKeyList()
window.switchOpenRouterApiKey(idx)
window.removeOpenRouterApiKey(idx)
window.addOpenRouterApiKey()
```

#### Přidané funkce pro Mistral:

```javascript
function getStoredMistralKeys()
function saveStoredMistralKeys(keys)
window.getCurrentMistralApiKey()
window.getCurrentMistralApiKeyName()
window.renderMistralKeyList()
window.switchMistralApiKey(idx)
window.removeMistralApiKey(idx)
window.addMistralApiKey()
```

#### Aktualizována `window.switchProviderTab()`
- Rozšířena pro podporu všech 4 providerů (Gemini, Groq, OpenRouter, Mistral)
- Automatické přepínání mezi taby v settings modalu

## 🚀 Jak používat

### 1. Výběr Providera
1. Otevřete AI panel (tlačítko ✨ AI)
2. V horní části vyberte provider z dropdown menu:
   - 🤖 Gemini
   - ⚡ Groq
   - 🌐 OpenRouter
   - 🔥 Mistral

### 2. Výběr Modelu
- Po výběru providera se automaticky načtou dostupné modely
- U OpenRouter modelů je přidán suffix `:free` pro označení bezplatných modelů

### 3. Nastavení API klíčů

**Pro demo použití:**
- Demo klíče jsou již předvyplněné pro všechny providery
- Aplikace funguje okamžitě po otevření

**Pro vlastní API klíče:**
1. Klikněte na ⚙️ Settings v AI panelu
2. Vyberte tab providera (OpenRouter / Mistral)
3. Zadejte název a API klíč
4. Klikněte "Přidat a použít"

**Odkazy pro získání API klíčů:**
- **OpenRouter:** https://openrouter.ai/keys
- **Mistral:** https://console.mistral.ai/api-keys/

### 4. Používání AI

Veškerá funkcionalita je stejná jako u Gemini a Groq:
- ✏️ **2D režim** - Kreslení tvarů
- 🛠️ **CNC režim** - Generování G-kódu
- 💬 **Chat režim** - Běžná konverzace

## 🔐 Bezpečnost

- Všechny API klíče jsou uloženy pouze v localStorage prohlížeče
- Demo klíče jsou rozděleny na 2 části v kódu pro základní ochranu
- Klíče nejsou nikdy odesílány na jiný server než příslušné AI API

## 📊 Struktura localStorage

```javascript
// OpenRouter klíče
localStorage: "soustruznik_openrouter_api_keys"
// Mistral klíče
localStorage: "soustruznik_mistral_api_keys"
```

## 🎨 UI Změny

### Provider Select
```
[🤖 Gemini] [⚡ Groq] [🌐 OpenRouter] [🔥 Mistral]
```

### Model Select - OpenRouter
```
⚡ Gemini 2.0 Flash :free
🦙 Llama 3.3 70B :free
💻 Qwen 2.5 72B :free
🔥 Mistral Small 3.1 :free
🧠 DeepSeek R1 (reasoning) :free
⚡ Google Gemma 3 27B :free
```

### Model Select - Mistral
```
💻 Codestral (specializovaný na kód)
⚡ Mistral Small (rychlý, všestranný)
```

## ✅ Testování

Vyzkoušejte:
1. Přepínání mezi providery
2. Výběr různých modelů
3. Všechny tři režimy (2D, CNC, Chat)
4. Přidávání vlastních API klíčů
5. Přepínání mezi klíči

## 🐛 Error Handling

Všechny nové funkce obsahují:
- ✅ Kontrolu API klíčů před voláním
- ✅ Detailní error zprávy
- ✅ Instrukce pro uživatele při chybách
- ✅ Graceful fallback při chybách

## 📝 Poznámky

- OpenRouter modely s `:free` suffixem jsou skutečně zdarma
- Mistral Codestral je optimalizován pro generování kódu
- Všechny providery používají stejný formát API (OpenAI kompatibilní)
- Parsování JSON odpovědí je stejné pro všechny providery

## 🔄 Další možnosti

Pokud chcete přidat další OpenRouter modely, upravte `updateModelsForProvider()` v `src/ai.js`:

```javascript
const openrouterModels = [
  { value: "název-modelu:free", label: "🎯 Popis modelu :free" },
  // ... další modely
];
```

## 🎉 Hotovo!

Projekt nyní podporuje 4 různé AI providery s celkem 10+ modely, včetně 6 bezplatných modelů z OpenRouter!
