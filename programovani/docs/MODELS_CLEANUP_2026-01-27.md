# 🔧 Opravy AI modelů a proxy - 27.1.2026

## ✅ Provedené změny

### 1. 🗑️ Odstranění neplatných FREE modelů

#### **OpenRouter** (6 modelů odstraněno):

- ❌ `xiaomi/mimo-v2-flash:free` - FREE období skončilo
- ❌ `kwaipilot/kat-coder-pro:free` - FREE období skončilo
- ❌ `nex-agi/deepseek-v3.1-nex-n1:free` - FREE období skončilo
- ❌ `allenai/olmo-3.1-32b-think:free` - FREE období skončilo
- ❌ `qwen/qwen3-coder:free` - 402 Provider error
- ❌ `openai/gpt-oss-120b:free` - Privacy policy error

**✅ Zbývá 11 funkčních FREE modelů:**

- mistralai/devstral-2512:free
- deepseek/deepseek-r1-0528:free
- meta-llama/llama-3.3-70b-instruct:free
- google/gemma-3-27b-it:free
- nvidia/nemotron-3-nano-30b-a3b:free
- nvidia/nemotron-nano-12b-v2-vl:free
- tngtech/deepseek-r1t2-chimera:free
- tngtech/deepseek-r1t-chimera:free
- tngtech/tng-r1t-chimera:free
- z-ai/glm-4.5-air:free
- mistralai/mistral-small-3.1-24b-instruct:free

#### **Mistral** (1 model odstraněn):

- ❌ `mistral-embed` - není chat model (embedding model)

#### **Cohere** (3 modely odstraněny):

- ❌ `embed-english-v3.0` - není chat model
- ❌ `embed-multilingual-v3.0` - není chat model
- ❌ `rerank-english-v3.0` - není chat model

#### **HuggingFace** (2 modely odstraněny):

- ❌ `openai/whisper-large-v3` - není chat model (ASR)
- ❌ `sentence-transformers/all-MiniLM-L6-v2` - není chat model

---

### 2. 🚀 HuggingFace Proxy Server

**Problém:** CORS policy blokovala všechny HuggingFace modely
**Řešení:** Lokální proxy server na `http://localhost:5010`

#### Vytvořené soubory:

- `python/huggingface_proxy.py` - Flask proxy server
- `start-huggingface-proxy.bat` - Windows spouštěč
- `start-huggingface-proxy.ps1` - PowerShell spouštěč
- `docs/guides/HUGGINGFACE_PROXY.md` - Dokumentace
- `python/requirements.txt` - Updated (přidán `requests`)

#### Konfigurace:

```javascript
// config.js změna:
huggingface: {
  endpoint: 'http://localhost:5010/models'; // Místo HF API
}
```

#### Spuštění:

```bash
start-huggingface-proxy.bat
# nebo
python python/huggingface_proxy.py
```

---

### 3. ⏱️ Zvýšení penalizací (Rate Limit Protection)

**Problém:** Po 429 chybě se modely zkoušely příliš brzy
**Řešení:** Zvýšené penalizace v `ModelSelector.js`

| Provider               | Původní | Nová       | Změna         |
| ---------------------- | ------- | ---------- | ------------- |
| **Gemini** (2.5-flash) | 60min   | **120min** | +100%         |
| **Gemini** (2.5-pro)   | 120min  | **180min** | +50%          |
| **Mistral**            | 60min   | **90min**  | +50%          |
| **Cohere**             | 60min   | **90min**  | +50%          |
| **OpenRouter**         | 60min   | **90min**  | +50%          |
| **HuggingFace**        | 120min  | **180min** | +50%          |
| **Groq**               | 30min   | **30min**  | ✅ beze změny |

---

## 📊 Statistiky modelů po úpravách

### Celkový počet modelů:

| Provider    | Před   | Po     | Funkční    |
| ----------- | ------ | ------ | ---------- |
| Gemini      | 4      | 4      | ⚠️ 0 (429) |
| Groq        | 9      | 9      | ✅ 7       |
| OpenRouter  | 19     | **11** | ✅ 9       |
| Mistral     | 4      | **3**  | ✅ 3       |
| Cohere      | 6      | **3**  | ⚠️ 0-1     |
| HuggingFace | 7      | **5**  | 🔄 Proxy   |
| **CELKEM**  | **49** | **35** | **~25**    |

---

## 🎯 Doporučení k použití

### ✅ Primární volba (nejvíce spolehlivé):

1. **Groq** - 7/9 modelů funguje, 30 RPM, žádné 429 chyby
   - llama-3.3-70b-versatile (nejlepší)
   - qwen3-32b
   - openai/gpt-oss-120b

2. **OpenRouter FREE** - 9/11 modelů funguje, 20 RPM
   - mistralai/devstral-2512:free (rychlý)
   - deepseek/deepseek-r1-0528:free (vysoká kvalita)
   - meta-llama/llama-3.3-70b-instruct:free

### ⚠️ Sekundární volba (s omezeními):

3. **Mistral** - 3/3 funguje, ale 10 RPM limit
4. **HuggingFace** - vyžaduje spuštěný proxy server

### ❌ Problémové:

5. **Gemini** - 429 Too Many Requests na všech modelech
6. **Cohere** - většina modelů 400/404

---

## 🔧 Potřebné akce uživatele

### 1. Spustit HuggingFace Proxy (pokud chceš použít HF modely):

```bash
start-huggingface-proxy.bat
```

### 2. Počkat na reset Gemini limitů:

- **Gemini RPM:** 15 req/min → reset každou minutu
- **Gemini RPD:** 1500 req/day → reset o půlnoci UTC
- **Penalizace:** 2-3 hodiny po 429 chybě

### 3. Testovat po úpravách:

- Otevři AI Panel
- Zkus Groq modely (měly by fungovat okamžitě)
- Pro HF modely ověř že proxy běží

---

## 📁 Změněné soubory

```
src/
├── core/
│   └── config.js                    ← HF endpoint změna
├── modules/ai/core/
│   ├── AIModule.js                  ← Odstraněny neplatné modely
│   └── ModelSelector.js             ← Zvýšené penalizace
python/
├── huggingface_proxy.py             ← NOVÝ - Proxy server
└── requirements.txt                  ← Přidán requests
docs/guides/
└── HUGGINGFACE_PROXY.md             ← NOVÝ - Dokumentace
├── start-huggingface-proxy.bat      ← NOVÝ - Windows launcher
└── start-huggingface-proxy.ps1      ← NOVÝ - PowerShell launcher
```

---

## ✅ Ověření fungování

```bash
# 1. Test proxy serveru
curl http://localhost:5010/health
# → {"status": "ok", "service": "HuggingFace Proxy"}

# 2. Refresh aplikace (Ctrl+R)

# 3. Otevři AI Panel → Test modely

# 4. Očekávané výsledky:
✅ Groq: Okamžitě funkční
✅ OpenRouter: 9 modelů dostupných
⚠️ Gemini: Čeká na reset (2-3h)
🔄 HuggingFace: Funguje s proxy
```

---

**Vytvořeno:** 27. ledna 2026 10:45
**Status:** ✅ Hotovo
**Další kroky:** Restart aplikace + spustit proxy
