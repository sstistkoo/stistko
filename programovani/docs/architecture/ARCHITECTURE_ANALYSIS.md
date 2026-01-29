# 🏗️ Analýza architektury projektu

## 📊 Současný stav

### Struktura projektu

```
programovani/
├── index.html                 # Hlavní HTML soubor
├── src/                       # ✅ Zdrojové soubory (49 souborů)
│   ├── core/                 # ✅ Jádro aplikace
│   │   ├── app.js           # Hlavní aplikace (1200 řádků)
│   │   ├── state.js         # State management
│   │   ├── events.js        # Event bus
│   │   └── config.js        # Konfigurace
│   ├── modules/             # ✅ Funkční moduly
│   │   ├── editor/          # Editor kódu
│   │   ├── preview/         # Náhled
│   │   ├── ai/              # AI asistent (6250 řádků + 6 nových modulů!)
│   │   ├── menu/            # Menu
│   │   ├── search/          # Vyhledávání
│   │   ├── shortcuts/       # Klávesové zkratky
│   │   ├── sidebar/         # Sidebar
│   │   ├── panel/           # Side panel
│   │   └── findreplace/     # Najít a nahradit
│   ├── ui/                  # ✅ UI komponenty
│   │   └── components/      # Modal, Toast
│   ├── styles/              # ✅ CSS styly
│   │   ├── main.css
│   │   ├── base/            # Reset, typography, variables, mobile
│   │   └── components/      # Komponenty CSS
│   └── utils/               # ✅ Pomocné funkce
│       ├── dom.js
│       ├── string.js
│       ├── async.js
│       └── shortcuts.js
├── ai_module.js              # ⚠️ AI modul v root (3171 řádků)
├── ai_agents.js              # ⚠️ AI agenti v root (654 řádků)
├── crewai_connector.js       # ⚠️ CrewAI v root
├── css/                      # ⚠️ Staré CSS v root
├── js/                       # ⚠️ Staré JS v root
├── python/                   # ✅ Python backend
├── tools/                    # ✅ Development tools
└── **17 MD dokumentů**       # ⚠️ Příliš mnoho dokumentace

```

---

## ✅ Co funguje dobře

### 1. **Modulární struktura src/**

- Jasná separace odpovědností
- Core, modules, ui, styles, utils
- Snadná navigace

### 2. **Event-driven architektura**

- EventBus pro komunikaci mezi moduly
- Loose coupling
- Snadné testování

### 3. **State management**

- Centralizovaný state
- Reactive updates
- Jednoduchý API

### 4. **Nová AI modulární struktura** (právě vytvořená!)

- services/, components/, utils/
- Rozdělení odpovědností
- Znovupoužitelnost

---

## ⚠️ Problémy a tech debt

### 1. **Root clutter** - STŘEDNÍ priorita

```
❌ ai_module.js (3171 řádků) - měl by být v src/modules/ai/
❌ ai_agents.js (654 řádků) - měl by být v src/modules/ai/
❌ crewai_connector.js - měl by být v src/modules/ai/
❌ css/ a js/ složky - staré, duplicitní?
❌ 17 MD souborů v root - měly by být v docs/
```

### 2. **AIPanel.js stále příliš velký** - VYSOKÁ priorita

```
⚠️ src/modules/ai/AIPanel.js = 6250 řádků
⚠️ Obsahuje vše: UI, logiku, GitHub, templates, agents...
✅ Máme nové moduly, ale AIPanel je ještě nepoužívá
```

### 3. **Duplicitní struktura** - NÍZKÁ priorita

```
⚠️ css/ vs. src/styles/ - která se používá?
⚠️ js/ vs. src/modules/ - je js/ stále potřeba?
```

### 4. **Dokumentace chaos** - STŘEDNÍ priorita

```
⚠️ 17 MD souborů v root
⚠️ Různé konvence názvů (AI_*, *_DOCS, CHANGELOG_*)
⚠️ Těžko se hledá info
```

---

## 🎯 Doporučení - CO UDĚLAT TEĎ

### **PRIORITA 1: Úklid root složky** ⏱️ 15 minut

```bash
# Vytvořit docs/ složku a přesunout dokumentaci
mkdir docs
mkdir docs/ai
mkdir docs/architecture

# Přesunout dokumenty
move AI_*.md docs/ai/
move *_DOCS.md docs/
move ARCHITEKTURA_NAVRH.md docs/architecture/
move PROJECT_STRUCTURE.md docs/
move README.md docs/ (nebo nechat v root)
```

**Struktura po úklidu:**

```
docs/
├── README.md (hlavní dokumentace)
├── ai/                # Vše o AI
│   ├── AI_AGENTS_DOCS.md
│   ├── AI_IMPROVEMENTS.md
│   ├── AI_PROMPTS_EXAMPLES.md
│   └── ...
├── architecture/      # Architektura
│   ├── ARCHITEKTURA_NAVRH.md
│   ├── PROJECT_STRUCTURE.md
│   └── REFACTORING_ANALYSIS.md
└── guides/           # Návody
    ├── GITHUB_SETUP.md
    ├── MOBILE_OPTIMIZATION.md
    └── TESTING_INTEGRATION.md
```

### **PRIORITA 2: Přesunout AI moduly do src/** ⏱️ 10 minut

```javascript
// Přesunout:
ai_module.js          → src/modules/ai/core/AIModule.js
ai_agents.js          → src/modules/ai/agents/AIAgents.js
crewai_connector.js   → src/modules/ai/integrations/CrewAIConnector.js

// Aktualizovat importy v:
// - index.html
// - src/core/app.js (pokud importuje)
```

### **PRIORITA 3: Vyčistit staré složky** ⏱️ 5 minut

```bash
# Zkontrolovat jestli se css/ a js/ používají
# Pokud NE, smazat nebo přesunout do archive/

mkdir archive
move css archive/
move js archive/
```

---

## 🔄 CO NECHAT NA POZDĚJI

### **FÁZE 2: Postupný refactoring AIPanel.js** ⏱️ 2-4 hodiny

**Integrace nových modulů:**

```javascript
// Postupně nahradit části AIPanel.js
// Už máme připravené:
import { ChatService } from './services/ChatService.js';
import { CodeEditorService } from './services/CodeEditorService.js';
import { PromptSelector } from './services/PromptSelector.js';
import { ErrorIndicator } from './components/ErrorIndicator.js';
import { TokenCounter } from './components/TokenCounter.js';

// Vytvořit nové moduly:
// - GitHubService.js (extrahovat GitHub integraci)
// - AgentsService.js (extrahovat agents logiku)
// - TemplatesService.js (extrahovat templates)
// - ActionsService.js (quick actions)
```

**Cíl:** Snížit AIPanel.js z 6250 na ~1500 řádků (jen koordinace)

### **FÁZE 3: Vylepšení architektury** ⏱️ 4-8 hodin

1. **Dependency Injection** - snadnější testování
2. **Plugin systém** - rozšiřitelnost
3. **Lazy loading** - načítání modulů on-demand
4. **Service Worker** - offline mode
5. **Web Workers** - výkon pro AI operace

---

## 📐 Ideální architektura (cíl)

```
programovani/
├── index.html
├── docs/                     # ✅ Veškerá dokumentace
│   ├── README.md
│   ├── ai/
│   ├── architecture/
│   └── guides/
├── src/
│   ├── core/                 # ✅ Jádro (beze změny)
│   │   ├── app.js
│   │   ├── state.js
│   │   ├── events.js
│   │   └── config.js
│   ├── modules/
│   │   ├── editor/
│   │   ├── preview/
│   │   └── ai/               # ✅ Vše AI na jednom místě
│   │       ├── AIPanel.js    # Koordinátor (~1500 řádků)
│   │       ├── core/
│   │       │   ├── AIModule.js        # Přesunutý ai_module.js
│   │       │   └── AITester.js
│   │       ├── agents/
│   │       │   └── AIAgents.js        # Přesunutý ai_agents.js
│   │       ├── integrations/
│   │       │   └── CrewAIConnector.js # Přesunutý crewai_connector.js
│   │       ├── services/      # ✅ Už máme!
│   │       │   ├── ChatService.js
│   │       │   ├── CodeEditorService.js
│   │       │   ├── PromptSelector.js
│   │       │   ├── GitHubService.js      # TODO
│   │       │   ├── TemplatesService.js   # TODO
│   │       │   └── ActionsService.js     # TODO
│   │       ├── components/    # ✅ Už máme!
│   │       │   ├── ErrorIndicator.js
│   │       │   └── TokenCounter.js
│   │       └── utils/         # ✅ Už máme!
│   │           └── stringUtils.js
│   ├── ui/
│   ├── styles/
│   └── utils/
├── python/                   # Python backend
├── tools/                    # Dev tools
└── vite.config.js
```

---

## 🚀 Akční plán

### **TEĎ (15-30 minut)**

1. ✅ Vytvořit `docs/` strukturu
2. ✅ Přesunout MD soubory
3. ✅ Přesunout AI moduly do `src/modules/ai/`
4. ✅ Aktualizovat importy v `index.html`
5. ✅ Vyčistit staré `css/` a `js/` složky

### **PŘÍŠTĚ (2-4 hodiny)**

6. ⏳ Integrovat nové services do AIPanel.js
7. ⏳ Extrahovat GitHubService.js
8. ⏳ Extrahovat TemplatesService.js
9. ⏳ Snížit AIPanel.js na ~1500 řádků

### **V BUDOUCNU (4-8 hodin)**

10. ⏳ Dependency Injection
11. ⏳ Plugin systém
12. ⏳ Lazy loading
13. ⏳ Unit testy

---

## ✅ Doporučení

**ANO, udělej pořádek TEĎ (30 minut):**

- ✅ Přehlednější struktura
- ✅ Snadnější hledání dokumentace
- ✅ Lepší onboarding pro nové vývojáře
- ✅ Připraveno pro další vylepšování
- ✅ Není to velká změna, ale má velký dopad

**Refactoring AIPanel.js NECHAT NA POZDĚJI:**

- Větší zásah (2-4 hodiny)
- Může způsobit chyby
- Lepší udělat po testování současného stavu

---

## 🎯 Závěr

**Současný stav:** 6/10

- Dobrá základní architektura
- Problém s organizací souborů
- Tech debt v AIPanel.js

**Po úklidu (30 min):** 8/10

- Čistá struktura
- Snadná navigace
- Připraveno na růst

**Po refactoringu (4 hodiny):** 9/10

- Profesionální architektura
- Škálovatelnost
- Snadná údržba

**Doporučení: Začni úklidem TEĎ, refactoring později.**
