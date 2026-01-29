# 🏗️ Návrh nové architektury HTML Studio

## 📊 Současný stav

### Statistiky
- **Celkový počet řádků**: ~17,000 řádků v jednom souboru
- **Velikost**: ~540 KB
- **Struktura**: Monolitický HTML soubor s inline CSS + JS
- **Funkce**: 100+ JavaScript funkcí v jednom scope
- **Složitost**: Vysoká, obtížná údržba a debugování

### Hlavní problémy
1. ❌ **Monolitická architektura** - vše v jednom souboru
2. ❌ **Chybějící modularita** - těžko se testuje a rozšiřuje
3. ❌ **Duplicitní kód** - podobná logika na více místech
4. ❌ **Špatná separace** - CSS, JS, HTML promíchané
5. ❌ **Performance** - načítání celého souboru najednou
6. ❌ **Konflikty v global scope** - všechny funkce globální

---

## 🎯 Navrhovaná nová architektura

### Struktura projektu

```
html-studio/
├── index.html                      # Minimální HTML shell
├── manifest.webmanifest            # PWA manifest
│
├── assets/
│   ├── icons/                      # Ikony a obrázky
│   └── fonts/                      # Custom fonty
│
├── src/
│   ├── core/                       # Jádro aplikace
│   │   ├── app.js                  # Hlavní aplikace + init
│   │   ├── state.js                # Centrální state management
│   │   ├── events.js               # Event bus/dispatcher
│   │   └── config.js               # Konfigurace
│   │
│   ├── modules/                    # Funkční moduly
│   │   ├── editor/
│   │   │   ├── Editor.js           # Hlavní editor logika
│   │   │   ├── LineNumbers.js      # Čísla řádků
│   │   │   ├── Syntax.js           # Syntax highlighting
│   │   │   └── Autocomplete.js     # Autocomplete systém
│   │   │
│   │   ├── preview/
│   │   │   ├── Preview.js          # Live preview
│   │   │   └── SplitView.js        # Split screen
│   │   │
│   │   ├── files/
│   │   │   ├── FileManager.js      # Správa souborů
│   │   │   ├── TabManager.js       # Tab system
│   │   │   └── FileTree.js         # File tree UI
│   │   │
│   │   ├── ai/
│   │   │   ├── AICore.js           # AI provider abstrakce
│   │   │   ├── providers/          # Jednotliví provideři
│   │   │   │   ├── Gemini.js
│   │   │   │   ├── Groq.js
│   │   │   │   └── OpenRouter.js
│   │   │   ├── AIActions.js        # Rychlé akce
│   │   │   └── AIChat.js           # Chat interface
│   │   │
│   │   ├── tools/
│   │   │   ├── Validator.js        # HTML validace
│   │   │   ├── Formatter.js        # Beautify
│   │   │   ├── Minifier.js         # Minifikace
│   │   │   └── GitHubSearch.js     # GitHub integrace
│   │   │
│   │   ├── console/
│   │   │   ├── Console.js          # Dev console
│   │   │   └── ErrorTracker.js     # Error handling
│   │   │
│   │   └── settings/
│   │       ├── Settings.js         # Nastavení UI
│   │       ├── ThemeManager.js     # Dark/Light theme
│   │       └── Storage.js          # LocalStorage wrapper
│   │
│   ├── ui/                         # UI komponenty
│   │   ├── components/
│   │   │   ├── Modal.js            # Modal dialog
│   │   │   ├── Dropdown.js         # Dropdown menu
│   │   │   ├── Button.js           # Tlačítka
│   │   │   ├── Toast.js            # Notifikace
│   │   │   └── Toolbar.js          # Toolbar
│   │   └── layouts/
│   │       ├── Header.js           # Hlavička
│   │       └── Sidebar.js          # Boční panel
│   │
│   ├── utils/                      # Utility funkce
│   │   ├── dom.js                  # DOM helpers
│   │   ├── string.js               # String helpers
│   │   ├── async.js                # Promise/async utils
│   │   ├── shortcuts.js            # Keyboard shortcuts
│   │   └── debounce.js             # Debounce/throttle
│   │
│   └── styles/                     # Styly (CSS Modules / SCSS)
│       ├── base/
│       │   ├── reset.css           # Reset/normalize
│       │   ├── variables.css       # CSS proměnné
│       │   └── typography.css      # Typografie
│       │
│       ├── components/             # Component styles
│       │   ├── editor.css
│       │   ├── toolbar.css
│       │   ├── modal.css
│       │   └── ...
│       │
│       ├── themes/
│       │   ├── dark.css            # Dark theme
│       │   └── light.css           # Light theme
│       │
│       └── main.css                # Import všeho
│
├── dist/                           # Build output (generované)
│   ├── bundle.js
│   ├── styles.css
│   └── index.html
│
├── tests/                          # Unit testy
│   ├── editor.test.js
│   ├── ai.test.js
│   └── ...
│
├── docs/                           # Dokumentace
│   ├── API.md
│   ├── CONTRIBUTING.md
│   └── ARCHITECTURE.md
│
├── .github/                        # GitHub Actions
│   └── workflows/
│       ├── test.yml
│       └── deploy.yml
│
├── package.json                    # NPM závislosti
├── vite.config.js                  # Build config (Vite)
├── .gitignore
└── README.md
```

---

## 🔧 Technologie a nástroje

### Build systém
- **Vite** - moderní fast bundler (lepší než Webpack pro rychlost)
- **ESLint + Prettier** - code quality
- **PostCSS** - CSS optimalizace

### Framework (volitelné)
**Varianta A: Vanilla JS + Web Components**
```javascript
class EditorComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }
}
```

**Varianta B: Vue 3 Composition API** (doporučeno)
```javascript
// Editor.vue
<script setup>
import { ref, computed, watch } from 'vue'
import { useEditor } from '@/composables/useEditor'

const { code, updateCode, format } = useEditor()
</script>
```

**Varianta C: React + TypeScript**
```typescript
// Editor.tsx
interface EditorProps {
  code: string;
  onChange: (code: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ code, onChange }) => {
  // ...
}
```

### State management
- **Pinia** (Vue) / **Zustand** (React) / **Custom Event Bus** (Vanilla)

---

## 📐 Architektonické vzory

### 1. **MVC/MVVM Pattern**
```
Model (State) ↔ ViewModel/Controller ↔ View (UI)
```

### 2. **Module Pattern**
```javascript
// editor/Editor.js
export class Editor {
  constructor(container, options) {
    this.container = container;
    this.options = options;
    this.state = new EditorState();
  }

  init() {
    this.setupEventListeners();
    this.render();
  }

  update(code) {
    this.state.code = code;
    this.emit('change', code);
  }
}
```

### 3. **Event-driven Architecture**
```javascript
// core/events.js
export class EventBus {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(cb => cb(data));
    }
  }
}

// Použití
eventBus.on('editor:change', (code) => {
  preview.update(code);
  validator.check(code);
});
```

### 4. **Factory Pattern pro AI providery**
```javascript
// ai/AIFactory.js
export class AIProviderFactory {
  static create(type, config) {
    switch(type) {
      case 'gemini': return new GeminiProvider(config);
      case 'groq': return new GroqProvider(config);
      case 'openrouter': return new OpenRouterProvider(config);
      default: throw new Error('Unknown provider');
    }
  }
}

// Použití
const provider = AIProviderFactory.create('gemini', { apiKey: '...' });
const response = await provider.generate(prompt);
```

---

## 🎨 State Management příklad

```javascript
// core/state.js
export class AppState {
  constructor() {
    this.subscribers = [];
    this.state = {
      editor: {
        code: '',
        language: 'html',
        cursor: { line: 0, col: 0 }
      },
      files: {
        active: null,
        tabs: []
      },
      ui: {
        theme: 'dark',
        splitView: false,
        toolsPanelOpen: false
      },
      ai: {
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        keys: {}
      }
    };
  }

  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.state);
  }

  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const obj = keys.reduce((obj, key) => obj[key], this.state);
    obj[lastKey] = value;
    this.notify(path, value);
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify(path, value) {
    this.subscribers.forEach(cb => cb(path, value));
  }
}

// Použití
const state = new AppState();
state.subscribe((path, value) => {
  console.log(`State changed: ${path} =`, value);
});

state.set('editor.code', '<h1>Hello</h1>');
```

---

## 🚀 Implementační plán

### Fáze 1: Příprava (1 týden)
- [ ] Setup projektu (Vite + package.json)
- [ ] Základní folder struktura
- [ ] Git repository + .gitignore
- [ ] ESLint + Prettier konfigurace

### Fáze 2: Migrace core funkcionality (2-3 týdny)
- [ ] AppState + EventBus
- [ ] Editor modul (základní funkce)
- [ ] FileManager + TabManager
- [ ] Preview modul
- [ ] Základní UI komponenty (Modal, Button, Toolbar)

### Fáze 3: AI modul refactor (1-2 týdny)
- [ ] AICore abstrakce
- [ ] Jednotliví provideři jako třídy
- [ ] AIFactory pattern
- [ ] Rate limiting + error handling
- [ ] AI Chat interface

### Fáze 4: Tools a utilities (1 týden)
- [ ] Validator
- [ ] Formatter/Beautifier
- [ ] Minifier
- [ ] GitHub Search integrace
- [ ] Console + Error tracking

### Fáze 5: UI polish + testing (1-2 týdny)
- [ ] Theme system (dark/light)
- [ ] Responsive design fixes
- [ ] Keyboard shortcuts
- [ ] Unit testy pro kritické části
- [ ] Performance optimalizace

### Fáze 6: Build + deployment (3-5 dní)
- [ ] Vite production build
- [ ] PWA optimalizace
- [ ] GitHub Pages / Netlify setup
- [ ] Dokumentace API

---

## 📦 Příklad migrace jednoho modulu

### Před (současný stav):
```javascript
// Vše v html_studio.html
function formatCode() {
  const code = getCurrentCode();
  const formatted = beautify.html(code, { /* options */ });
  updateEditor(formatted);
}

function minifyCode() {
  const code = getCurrentCode();
  const minified = minifyHtml(code);
  updateEditor(minified);
}
```

### Po (nová architektura):
```javascript
// modules/tools/Formatter.js
export class Formatter {
  constructor(options = {}) {
    this.options = {
      indent: 2,
      wrap: 80,
      ...options
    };
  }

  format(code, language = 'html') {
    switch(language) {
      case 'html': return this.formatHTML(code);
      case 'css': return this.formatCSS(code);
      case 'js': return this.formatJS(code);
      default: return code;
    }
  }

  formatHTML(code) {
    return beautify.html(code, this.options);
  }
}

// modules/tools/Minifier.js
export class Minifier {
  minify(code, language = 'html') {
    switch(language) {
      case 'html': return this.minifyHTML(code);
      case 'css': return this.minifyCSS(code);
      case 'js': return this.minifyJS(code);
      default: return code;
    }
  }

  minifyHTML(code) {
    return minifyHtml(code, {
      collapseWhitespace: true,
      removeComments: true
    });
  }
}

// Použití v aplikaci
import { Formatter } from './modules/tools/Formatter.js';
import { Minifier } from './modules/tools/Minifier.js';

const formatter = new Formatter();
const minifier = new Minifier();

eventBus.on('action:format', () => {
  const code = state.get('editor.code');
  const formatted = formatter.format(code);
  state.set('editor.code', formatted);
});
```

---

## 🎯 Výhody nové architektury

### ✅ Maintainability
- Každý modul má jasnou odpovědnost
- Snadné najít a opravit bugy
- Přehledný kód pro nové vývojáře

### ✅ Scalability
- Snadné přidávání nových funkcí
- Moduly nezávislé na sobě
- Paralelní vývoj více lidí

### ✅ Testability
- Unit testy pro jednotlivé moduly
- Mocking a dependency injection
- CI/CD pipeline

### ✅ Performance
- Code splitting (lazy loading)
- Tree shaking (odstranění nepoužitého kódu)
- Optimalizovaný bundle

### ✅ Developer Experience
- Hot Module Replacement (instant updates)
- TypeScript support (volitelné)
- Better debugging tools

---

## 🔄 Migrace strategie

### Přístup 1: Big Bang (nedoporučeno)
- Přepsat vše najednou
- ❌ Riskantní
- ❌ Dlouhá doba bez fungující verze

### Přístup 2: Incremental Migration (doporučeno)
1. **Vytvoř nový projekt s novou strukturou**
2. **Nejprve migruj core** (State, Events, Config)
3. **Po jednom přidávej moduly**, každý jako samostatný PR
4. **Postupně přesměruj funkce** z old → new
5. **Udržuj obě verze** funkční až do konce
6. **Finální cutover** když je vše hotové

### Přístup 3: Strangler Fig Pattern
```
Old App           New App
  ├── Editor  →   ├── Editor (nový)
  ├── AI      →   ├── AI (nový)
  ├── Files       ├── Files (starý dočasně)
  └── ...         └── ...
```

---

## 📝 Závěr

Současná monolitická architektura je funkční, ale:
- Těžko se udržuje při růstu
- Obtížné debugování
- Pomalé načítání
- Chybí modularita

**Doporučení:** Postupná migrace na modulární architekturu s:
- Vite jako build tool
- Vue 3 nebo Vanilla JS + Web Components
- Centrální state management
- Jasně oddělené moduly

**ROI:**
- Krátkodobě: Více práce na začátku
- Dlouhodobě: Rychlejší vývoj nových funkcí, méně bugů, lepší performance

**Další kroky:**
1. Setup Vite projektu
2. Migrace State + EventBus
3. Postupná migrace modulů
4. Průběžné testování
5. Finální cutover

---

**Autor:** GitHub Copilot
**Datum:** 1. ledna 2026
**Verze:** 1.0
