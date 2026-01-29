# 🤗 HuggingFace Proxy - Návod k použití

## 📋 Co to řeší?

HuggingFace API má **CORS omezení** - nelze ho volat přímo z browseru. Tento proxy server vyřeší problém a umožní bezproblémové volání HuggingFace modelů z front-endu.

## 🚀 Instalace

```bash
# Nainstaluj závislosti
pip install -r python/requirements.txt
```

**Požadované balíčky:**

- `flask>=3.0.0` - Web framework
- `flask-cors>=4.0.0` - CORS middleware
- `requests>=2.31.0` - HTTP klient

## ▶️ Spuštění

### Windows (CMD/PowerShell):

```bash
# Pomocí BAT souboru
start-huggingface-proxy.bat

# Nebo pomocí PowerShell
.\start-huggingface-proxy.ps1

# Nebo přímo
python python/huggingface_proxy.py
```

### Linux/Mac:

```bash
python3 python/huggingface_proxy.py
```

Server běží na **http://localhost:5010**

## 🔧 Konfigurace

### 1. Frontend (config.js)

```javascript
huggingface: {
  name: 'HuggingFace',
  endpoint: 'http://localhost:5010/models',  // ← Proxy endpoint
  requiresKey: true,
}
```

### 2. Backend (huggingface_proxy.py)

```python
PORT = 5010  # Změň pokud je port obsazený
```

## 📡 API Endpointy

### Health Check

```http
GET http://localhost:5010/health
```

**Odpověď:**

```json
{
  "status": "ok",
  "service": "HuggingFace Proxy"
}
```

### Chat Completions (Proxy)

```http
POST http://localhost:5010/models/{model_path}/v1/chat/completions
Authorization: Bearer hf_your_api_key_here
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 100
}
```

**Příklad:**

```bash
curl -X POST http://localhost:5010/models/mistralai/Mistral-7B-Instruct-v0.3/v1/chat/completions \
  -H "Authorization: Bearer hf_..." \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hi"}]}'
```

## ✅ Podporované modely

- `meta-llama/Llama-3.2-3B-Instruct` - Llama 3.2 3B
- `mistralai/Mistral-7B-Instruct-v0.3` - Mistral 7B
- `microsoft/Phi-3-mini-4k-instruct` - Microsoft Phi-3
- `google/gemma-2-9b-it` - Google Gemma 2
- `Qwen/Qwen2.5-7B-Instruct` - Qwen 2.5 7B

## 🐛 Troubleshooting

### ❌ Port 5010 už je obsazený

```python
# V huggingface_proxy.py změň:
PORT = 5011  # nebo jiný volný port

# A v config.js:
endpoint: 'http://localhost:5011/models'
```

### ❌ Chyba "Module not found"

```bash
# Přeinstaluj závislosti
pip install --upgrade -r python/requirements.txt
```

### ❌ CORS error pořád přetrvává

1. Zkontroluj že proxy běží: `http://localhost:5010/health`
2. Ujisti se že frontend používá `localhost:5010`, ne přímo HuggingFace URL
3. Restart proxy serveru

### ❌ 401 Unauthorized

- Chybí nebo je neplatný HuggingFace API klíč
- Získej klíč zde: https://huggingface.co/settings/tokens

## 🎯 Výhody proxy

✅ **Řeší CORS** - volání z browseru funguje
✅ **Snadná konfigurace** - jen změň endpoint
✅ **Timeout handling** - 90s timeout
✅ **Error handling** - přehledné error zprávy
✅ **Health check** - monitoring stavu

## 📊 Monitoring

### Logy

Proxy loguje všechny požadavky do konzole:

```
127.0.0.1 - - [27/Jan/2026 10:30:45] "POST /models/mistralai/Mistral-7B-Instruct-v0.3/v1/chat/completions HTTP/1.1" 200 -
```

### Status Check

```bash
curl http://localhost:5010/health
```

## 🔒 Bezpečnost

⚠️ **Důležité:** Tento proxy běží lokálně a **není určený pro produkci**!

Pro production:

1. Použij HTTPS
2. Přidej autentizaci
3. Rate limiting
4. Request validation
5. Deploy na server (ne localhost)

## 📦 Struktura projektu

```
programovani/
├── python/
│   ├── huggingface_proxy.py    ← Proxy server
│   └── requirements.txt         ← Závislosti
├── start-huggingface-proxy.bat  ← Windows start
└── start-huggingface-proxy.ps1  ← PowerShell start
```

## 🆘 Podpora

Pokud proxy nefunguje:

1. Zkontroluj že běží: `http://localhost:5010/health`
2. Zkontroluj že máš Flask: `pip show flask`
3. Zkontroluj porty: `netstat -ano | findstr 5010`
4. Restart proxy a aplikace

---

**Vytvořeno:** 27. ledna 2026
**Verze:** 1.0.0
**Status:** ✅ Funkční
