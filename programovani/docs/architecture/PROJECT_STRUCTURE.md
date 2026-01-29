# 📂 Struktura projektu

## 🎯 Hlavní soubory

### JavaScript/Frontend

- **index.html** - Hlavní vstupní bod aplikace
- **ai_module.js** - AI modul s podporou 6 providerů
- **ai_agents.js** - Systém AI agentů (9 agentů)
- **crewai_connector.js** - Most mezi JS a Python CrewAI
- **vite.config.js** - Konfigurace build systému

### Dokumentace

- **README.md** - Hlavní dokumentace projektu
- **AI_AGENTS_DOCS.md** - Dokumentace AI agentů
- **CREWAI_INTEGRATION.md** - Průvodce integrací CrewAI
- **ORCHESTRATOR_GUIDE.md** - Průvodce Orchestrator agentem
- **ARCHITEKTURA_NAVRH.md** - Architektura aplikace

## 📁 Složky

### `/src` - Zdrojové kódy

```
src/
├── core/           # Jádro aplikace
│   ├── app.js      # Hlavní aplikace
│   ├── state.js    # State management
│   ├── events.js   # Event bus
│   └── config.js   # Konfigurace
│
├── modules/        # Funkční moduly
│   ├── ai/         # AI panel a integrace
│   ├── editor/     # CodeMirror editor
│   ├── preview/    # Live preview
│   ├── menu/       # Menu panel
│   ├── search/     # Vyhledávání
│   └── shortcuts/  # Klávesové zkratky
│
├── ui/             # UI komponenty
│   └── components/ # Modal, Toast
│
├── utils/          # Utility funkce
│   ├── dom.js
│   ├── string.js
│   ├── async.js
│   └── shortcuts.js
│
└── styles/         # CSS styly
    ├── main.css
    ├── base/       # Reset, variables
    └── components/ # Komponenty
```

### `/python` - Python skripty

- **crewai_api.py** - Flask API pro CrewAI systém
- **requirements.txt** - Python závislosti

### `/archive` - Záložní/testovací soubory

- Staré verze HTML
- Zálohy souborů
- Testovací HTML soubory

⚠️ **Tato složka je ignorována v git**

### `/tools` - Utility skripty

- Python skripty pro konverzi a úpravy

### `/css` & `/js` - Legacy složky

Staré soubory pro zpětnou kompatibilitu

## 🚀 Jak začít

### Development

```bash
npm install
npm run dev
```

### Python CrewAI (volitelné)

```bash
cd python
pip install -r requirements.txt
python crewai_api.py
```

### Build

```bash
npm run build
npm run preview
```

## 📝 Konfigurace

- **package.json** - NPM závislosti a skripty
- **vite.config.js** - Vite konfigurace
- **.eslintrc.json** - ESLint pravidla
- **.prettierrc.json** - Prettier formátování
- **.gitignore** - Git ignore pravidla

## 🔧 Klíčové moduly

### AI Systém

1. **ai_module.js** - Centrální AI modul
   - 6 providerů (Groq, Gemini, OpenRouter, Mistral, Cohere, HuggingFace)
   - Workflow, Scheduler, Intent Detection
   - Smart Ask, Parallel processing

2. **ai_agents.js** - AI agenti
   - 9 specializovaných agentů
   - Orchestrator, Architect, Frontend, Backend, atd.
   - Collaborative & Orchestrated sessions

3. **AIPanel.js** - UI pro AI
   - Chat interface
   - Agent management
   - GitHub integrace

### Editor

- **Editor.js** - CodeMirror wrapper
- **Preview.js** - Live preview iframe
- **state.js** - Centrální state management

## 🎯 Správa kódu

### Kde upravovat?

- **AI modely** → `ai_module.js` (getAllProvidersWithModels)
- **UI styly** → `src/styles/`
- **Nový modul** → `src/modules/novyModul/`
- **Utility funkce** → `src/utils/`
- **Python API** → `python/crewai_api.py`

### Před commitem

```bash
npm run lint        # Kontrola kódu
npm run format      # Formátování
npm run build       # Test buildu
```

## 📚 Další dokumentace

- [AI Agents Docs](AI_AGENTS_DOCS.md)
- [CrewAI Integration](CREWAI_INTEGRATION.md)
- [Orchestrator Guide](ORCHESTRATOR_GUIDE.md)
- [Architecture](ARCHITEKTURA_NAVRH.md)
