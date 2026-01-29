# 📦 Stav modularizace projektu

**Datum:** 8. ledna 2026

## 🎯 Celkové hodnocení: **7/10** ⭐⭐⭐⭐⭐⭐⭐

Projekt má **dobrou základní modularizaci** s ES6 moduly, ale má několik problémů s globálními závislostmi a tight coupling.

---

## ✅ Co funguje dobře

### 1. **ES6 Module System**

- ✅ Všechny soubory používají `import`/`export`
- ✅ Relativní cesty jsou správně nastavené
- ✅ Žádné `require()` (kromě CrewAI pro Node.js)

### 2. **Architektura Core + Modules**

```
src/
├── core/           # Centrální služby ✅
│   ├── state.js    # AppState singleton
│   ├── events.js   # EventBus singleton
│   ├── config.js   # Konfigurace
│   └── app.js      # Main aplikace
├── modules/        # Feature moduly ✅
│   ├── editor/
│   ├── preview/
│   ├── ai/
│   ├── menu/
│   └── ...
├── utils/          # Utility funkce ✅
└── ui/             # UI komponenty ✅
```

### 3. **Singleton Pattern pro sdílené služby**

```javascript
// ✅ SPRÁVNĚ - State
export class AppState { ... }
export const state = new AppState();

// ✅ SPRÁVNĚ - EventBus
export class EventBus { ... }
export const eventBus = new EventBus();
```

### 4. **Loose Coupling přes EventBus**

- ✅ Moduly komunikují přes event bus
- ✅ Žádné přímé reference mezi moduly (většinou)
- ✅ Subscription/notification pattern

### 5. **Submoduly v AI**

```
modules/ai/
├── AIPanel.js          # Hlavní modul
├── tools/              # Tool systém ✅
│   ├── index.js
│   ├── ToolSystem.js
│   ├── FileTools.js
│   └── ...
├── services/           # Služby ✅
│   ├── ChatService.js
│   ├── CodeEditorService.js
│   └── ...
└── components/         # Komponenty ✅
```

---

## ⚠️ Problémy a nedostatky

### 1. **🔴 KRITICKÉ: Globální `window` objekty**

**Nalezeno 100+ použití `window.*`**

#### a) Globální AI instance

```javascript
// ❌ ŠPATNĚ - AIModule.js
window.AI = AI;

// ❌ Všude v kódu
const response = await window.AI.ask(message);
if (!window.AI) { ... }
```

**Dopad:**

- Tight coupling na globální stav
- Nemožnost testování (mocking)
- Riziko konfliktů v prohlížeči

**Řešení:**

```javascript
// ✅ SPRÁVNĚ - Export instance
export const aiService = new AI();

// ✅ Import kde potřeba
import { aiService } from './modules/ai/core/AIModule.js';
const response = await aiService.ask(message);
```

#### b) Globální CrewAI

```javascript
// ❌ ŠPATNĚ
window.CrewAI = new CrewAIConnector();

// ❌ Použití
await window.CrewAI.checkConnection();
```

#### c) Globální AIAgents

```javascript
// ❌ ŠPATNĚ
if (!window.AIAgents) { ... }
const agents = window.AIAgents.getAgents();
```

#### d) Globální editor

```javascript
// ❌ ŠPATNĚ
if (window.editor) {
  window.editor.setCode(...);
}
```

**Nalezeno:**

- `window.AI` - 20+ použití
- `window.CrewAI` - 15+ použití
- `window.AIAgents` - 15+ použití
- `window.editor` - 5+ použití
- `window.app` - 3+ použití

---

### 2. **🟡 STŘEDNÍ: Tight coupling v MenuPanel**

```javascript
// MenuPanel.js
export class MenuPanel {
  constructor(container) {
    this.fileOps = new FileOperations(); // ✅ OK - kompozice
    this.templates = new TemplateManager(); // ✅ OK
    this.github = new GitHubService(); // ✅ OK
    this.components = new ComponentLibrary(); // ✅ OK
    this.imageLib = new ImageLibrary(); // ✅ OK
  }
}
```

**Problém:** Všechny služby jsou hard-coded, nemožnost dependency injection.

**Řešení:**

```javascript
// ✅ LEPŠÍ - Dependency Injection
export class MenuPanel {
  constructor(container, services = {}) {
    this.fileOps = services.fileOps || new FileOperations();
    this.templates = services.templates || new TemplateManager();
    // ...
  }
}
```

---

### 3. **🟡 STŘEDNÍ: Chybějící index.js soubory**

Pouze 1 modul má `index.js`:

- ✅ `modules/ai/tools/index.js`

Chybí:

- ❌ `modules/editor/index.js`
- ❌ `modules/preview/index.js`
- ❌ `modules/menu/index.js`
- ❌ `modules/ai/index.js`

**Dopad:** Nepřehledné importy

```javascript
// ❌ AKTUÁLNĚ
import { Editor } from '../modules/editor/Editor.js';
import { Preview } from '../modules/preview/Preview.js';

// ✅ S INDEX.JS
import { Editor } from '../modules/editor';
import { Preview } from '../modules/preview';
```

---

### 4. **🟡 STŘEDNÍ: Nedůsledné export konvence**

**Mix default + named exports:**

```javascript
// Editor.js
export class Editor { ... }
export default Editor;  // ❌ Proč oba?

// Preview.js
export class Preview { ... }
export default Preview;  // ❌ Proč oba?

// AIPanel.js
export class AIPanel { ... }
// ✅ Pouze named export
```

**Doporučení:** Používat **pouze named exports** pro konzistenci.

---

### 5. **🟢 DROBNÉ: Module re-exports chybí**

V `tools/index.js` je správný pattern:

```javascript
// ✅ SPRÁVNĚ
export { toolSystem } from './ToolSystem.js';
export { fileTools } from './FileTools.js';
export { searchTools } from './SearchTools.js';
```

Ale chybí na úrovni celých modulů:

```javascript
// ❌ CHYBÍ: modules/ai/index.js
export { AIPanel } from './AIPanel.js';
export { AITester } from './AITester.js';
export { toolSystem } from './tools';
```

---

## 📊 Statistiky

### Import vztahy (Top 10)

```
state.js:     imported 30x (core service) ✅
events.js:    imported 28x (core service) ✅
Modal.js:     imported 8x  (UI component) ✅
toast.js:     imported 7x  (UI component) ✅
debounce:     imported 3x  (utility) ✅
StringUtils:  imported 5x  (utility) ✅
```

### Moduly podle velikosti

```
AIPanel.js:           7018 řádků  ⚠️ Příliš velký
app.js:               1280 řádků  ✅ OK
FindReplacePanel.js:  1086 řádků  ⚠️ Velký
Editor.js:            573 řádků   ✅ OK
Preview.js:           446 řádků   ✅ OK
```

### Globální window objekty

```
window.AI:        20+ použití  🔴
window.CrewAI:    15+ použití  🔴
window.AIAgents:  15+ použití  🔴
window.editor:    5+ použití   🔴
window.app:       3+ použití   🔴
```

---

## 🎯 Akční plán pro zlepšení

### Priorita 1 - KRITICKÉ 🔴

#### 1.1 Odstranit globální window.AI

```javascript
// 1. Exportuj instanci místo window
// modules/ai/core/AIModule.js
export const aiService = AI; // místo window.AI = AI

// 2. Vytvoř centrální provider
// modules/ai/index.js
export { aiService } from './core/AIModule.js';

// 3. Aktualizuj všechna použití (20+ míst)
import { aiService } from '../modules/ai';
const response = await aiService.ask(message);
```

**Počet změn:** ~20 souborů
**Čas:** 1-2 hodiny
**Benefit:** Testovatelnost, žádné globální závislosti

#### 1.2 Odstranit window.editor

```javascript
// 1. Přidej do app.js registry
class App {
  getEditor() {
    return this.editor;
  }
}

// 2. Použij eventBus místo přímého volání
eventBus.emit('editor:setCode', { code, force: true });

// 3. Editor poslouchá event
eventBus.on('editor:setCode', ({ code, force }) => {
  this.setCode(code, false, force);
});
```

**Počet změn:** ~5 souborů
**Čas:** 30 minut

#### 1.3 Odstranit window.CrewAI a window.AIAgents

Stejný pattern jako u AI.

---

### Priorita 2 - STŘEDNÍ 🟡

#### 2.1 Rozdělit AIPanel.js (7018 řádků)

```javascript
// Rozdělit na:
modules/ai/
├── AIPanel.js           # 500 řádků - hlavní koordinátor
├── panels/
│   ├── ChatPanel.js     # Chat UI
│   ├── AgentsPanel.js   # Agent management
│   └── SettingsPanel.js # Settings UI
├── services/
│   ├── ChatService.js   # ✅ Už existuje
│   └── AgentService.js  # Nový - agent logika
```

**Čas:** 2-3 hodiny

#### 2.2 Přidat index.js do všech modulů

```javascript
// modules/editor/index.js
export { Editor } from './Editor.js';

// modules/preview/index.js
export { Preview } from './Preview.js';

// modules/ai/index.js
export { AIPanel } from './AIPanel.js';
export { AITester } from './AITester.js';
export { aiService } from './core/AIModule.js';
export { toolSystem } from './tools';
```

**Čas:** 30 minut
**Benefit:** Čistší importy

#### 2.3 Standardizovat exports (jen named)

```javascript
// ❌ Odstranit
export default Editor;
export default Preview;

// ✅ Nechat jen
export class Editor { ... }
export class Preview { ... }
```

**Čas:** 15 minut

---

### Priorita 3 - VYLEPŠENÍ 🟢

#### 3.1 Dependency Injection v MenuPanel

```javascript
export class MenuPanel {
  constructor(container, deps = {}) {
    const {
      fileOps = new FileOperations(),
      templates = new TemplateManager(),
      github = new GitHubService(),
      components = new ComponentLibrary(),
      imageLib = new ImageLibrary(),
    } = deps;

    this.fileOps = fileOps;
    this.templates = templates;
    // ...
  }
}
```

**Čas:** 20 minut
**Benefit:** Testování, mockování

#### 3.2 TypeScript definice (volitelné)

```typescript
// types/index.d.ts
export interface AIService {
  ask(message: string, options?: any): Promise<string>;
  getAllProvidersWithModels(): Provider[];
}

export interface AppState {
  get(path: string): any;
  set(path: string, value: any): void;
  subscribe(path: string, callback: Function): () => void;
}
```

**Čas:** 2-3 hodiny
**Benefit:** Type safety, auto-complete

---

## 📈 Metriky po refaktoringu

| Metrika                 | Před       | Po (cíl)    |
| ----------------------- | ---------- | ----------- |
| Globální window objekty | 5          | 0           |
| Největší soubor         | 7018 řádků | <1000 řádků |
| Moduly s index.js       | 1          | 10+         |
| Export konvence         | Mixed      | Named only  |
| Testovatelnost          | 3/10       | 8/10        |
| Coupling score          | 6/10       | 9/10        |

---

## 🧪 Testovatelnost

### Aktuální stav: **3/10**

- ❌ Globální window závislosti
- ❌ Hard-coded dependencies
- ❌ Žádné unit testy
- ✅ EventBus umožňuje mocking

### Po refaktoringu: **8/10**

```javascript
// ✅ Testovatelný kód
import { Editor } from './Editor';
import { mockState, mockEventBus } from '../test/mocks';

describe('Editor', () => {
  it('should save to active tab', () => {
    const editor = new Editor(container, {
      state: mockState,
      eventBus: mockEventBus,
    });
    // ...
  });
});
```

---

## 🎓 Best Practices checklist

- ✅ ES6 modules
- ✅ Singleton pattern pro services
- ✅ Event-driven architecture
- ✅ Separation of concerns
- ⚠️ Dependency injection (částečně)
- ❌ Žádné globální objekty (kromě core)
- ⚠️ Module re-exports (částečně)
- ⚠️ Konzistentní export style (mixed)
- ❌ Unit tests
- ❌ Type definitions

**Score: 5.5/10**

---

## 💡 Doporučení

### Okamžitě (dnes):

1. Odstranit `window.AI` - největší problém
2. Odstranit `window.editor`
3. Přidat `index.js` do hlavních modulů

### Tento týden:

4. Rozdělit AIPanel.js
5. Standardizovat exports
6. Dependency injection v MenuPanel

### Dlouhodobě:

7. Přidat TypeScript definice
8. Napsat unit testy
9. Continuous refactoring

---

## 🔍 Závěr

Projekt má **solidní základ** s ES6 moduly a dobrou strukturou, ale trpí:

- 🔴 **Přílišným použitím globálních objektů** (`window.*`)
- 🟡 **Některé příliš velké soubory** (AIPanel 7k řádků)
- 🟡 **Chybějící index.js** pro čisté importy

**Priorita:** Odstranit globální závislosti jako první krok.

**Odhadovaný čas na vyčištění:** 5-8 hodin práce
**ROI:** Vysoký - lepší testovatelnost, maintainability, škálovatelnost

---

**Hodnocení:** 7/10 - Dobrá modularizace s potenciálem pro vynikající (9/10) po refaktoringu. 🚀
