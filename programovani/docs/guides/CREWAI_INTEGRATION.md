# 🤖 AI Agents - Integrace JavaScript + Python CrewAI

Tento projekt nyní podporuje **dva typy AI agentů**:

1. **⚡ JavaScript Agenti** - Používají online AI (Groq, Gemini, atd.)
2. **🐍 CrewAI Agenti** - Používají lokální Ollama (zdarma, offline)

## 📋 Rychlý start

### 1. Nainstaluj Python závislosti

```bash
pip install -r requirements.txt
```

### 2. Nainstaluj a spusť Ollama

```bash
# Stáhni Ollama z https://ollama.com/download
ollama pull qwen2.5-coder

# Nebo jiný model:
# ollama pull llama3
# ollama pull codellama
```

### 3. Spusť CrewAI API server

```bash
python python/crewai_api.py
```

Server běží na **http://localhost:5005**

### 4. Otevři HTML Studio

Otevři `index.html` v browseru nebo spusť lokální server.

## 🎮 Jak používat

### V AI Panelu

1. Klikni na 🤖 tlačítko (AI asistent)
2. Přejdi na tab **"🤖 Agenti"**
3. Zvol engine:
   - **⚡ JavaScript Agenti** - pro online AI
   - **🐍 CrewAI** - pro lokální Ollama

### JavaScript Agenti (Online)

**Dostupní agenti**:

- 🏗️ Architekt
- 🎨 Frontend Developer
- ⚙️ Backend Developer
- 🚀 Full-Stack Developer
- 🐛 Debugger
- 👁️ Code Reviewer
- 📚 Documentation Writer
- ✅ Test Engineer

**Použití**:

1. Aktivuj agenty kliknutím na "⚪ Aktivovat"
2. Klikni na "💬 Chat" pro chat s agentem
3. Nebo použij "🤝 Společný úkol" pro kolaboraci

### CrewAI Agenti (Lokální)

**Dostupní agenti**:

- 🏗️ UX/UI Architekt
- 💻 Frontend Vývojář
- 🧪 QA Revizor
- 📚 Technický Dokumentarista

**Použití**:

1. Ujisti se, že běží CrewAI server (zelená ✅)
2. Klikni na "🚀 Použít" u agenta
3. Zadej úkol
4. Agent spustí lokální Ollama model

## 🔧 CrewAI API Endpoints

### GET /health

Kontrola, zda server běží

```bash
curl http://localhost:5005/health
```

### GET /agents

Seznam dostupných agentů

```bash
curl http://localhost:5005/agents
```

### POST /crewai

Spustit celý tým

```bash
curl -X POST http://localhost:5005/crewai \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Vytvoř landing page pro kavárnu",
    "agents": ["architect", "coder", "tester", "documenter"]
  }'
```

### POST /agent/task

Spustit jednoho agenta

```bash
curl -X POST http://localhost:5005/agent/task \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "coder",
    "task": "Vytvoř responzivní navbar"
  }'
```

## 🎯 Příklady použití

### Příklad 1: Kompletní Landing Page

**CrewAI (lokální)**:

1. Přepni na 🐍 CrewAI
2. Klikni "🤝 Společný úkol"
3. Zadej: "Vytvoř moderní landing page pro fitness aplikaci"
4. Celý tým (4 agenti) vytvoří:
   - Návrh struktury (Architekt)
   - HTML/CSS kód (Vývojář)
   - Review a opravy (Tester)
   - Dokumentaci (Dokumentarista)

### Příklad 2: Rychlá oprava chyby

**JavaScript (online)**:

1. Přepni na ⚡ JavaScript
2. Aktivuj 🐛 Debugger
3. Chat: "Oprav syntaxi v mém kódu"

### Příklad 3: Code Review

**CrewAI (lokální)**:

1. Použij agenta "🧪 QA Revizor"
2. Zadej: "Zkontroluj tento kód na chyby"

## 🔄 Porovnání

| Feature        | JavaScript           | CrewAI       |
| -------------- | -------------------- | ------------ |
| **Rychlost**   | ⚡ Rychlé            | 🐢 Pomalejší |
| **Cena**       | 💰 Potřebuje API key | 🆓 Zdarma    |
| **Offline**    | ❌ Ne                | ✅ Ano       |
| **Kvalita**    | ⭐⭐⭐⭐⭐           | ⭐⭐⭐⭐     |
| **Agentů**     | 8                    | 4            |
| **Kolaborace** | 3-fázový proces      | Sekvenční    |

## 🛠️ Troubleshooting

### CrewAI server neběží (○)

```bash
# Zkontroluj Ollamu
ollama list

# Stáhni model
ollama pull qwen2.5-coder

# Spusť server
python python/crewai_api.py
```

### Port 5005 už používá někdo jiný

Změň port v `python/crewai_api.py`:

```python
app.run(port=5006, host='0.0.0.0', debug=True)
```

A v `crewai_connector.js`:

```javascript
this.baseUrl = 'http://localhost:5006';
```

### Ollama neběží

```bash
# Spusť Ollama
ollama serve
```

### CORS chyby

Ujisti se, že máš nainstalovaný `flask-cors`:

```bash
pip install flask-cors
```

## 📚 Další informace

- [AI Agents dokumentace](AI_AGENTS_DOCS.md)
- [CrewAI dokumentace](https://docs.crewai.com/)
- [Ollama modely](https://ollama.com/library)

## 🎉 Hotovo!

Teď máš k dispozici **hybridní AI systém**:

- ⚡ JavaScript pro rychlé online AI
- 🐍 CrewAI pro lokální, zdarma offline AI

Enjoy coding! 🚀
