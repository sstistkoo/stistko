# Analýza potenciálních chyb v AIPanel.js

## ✅ Vytvořená modulární struktura

```
src/modules/ai/
├── AIPanel.js (koordinátor - bude refaktorován)
├── services/
│   ├── ChatService.js ✅ (historie, export, formátování)
│   ├── CodeEditorService.js ✅ (EDIT:LINES, aplikace změn)
│   └── PromptSelector.js ✅ (inteligentní výběr promptů)
├── components/
│   ├── ErrorIndicator.js ✅ (error handling UI)
│   └── TokenCounter.js ✅ (počítání tokenů)
└── utils/
    └── stringUtils.js ✅ (escape, similarity, line numbers)
```

## 🐛 Identifikované potenciální problémy v původním kódu

### 1. **Memory Leaks** - ⚠️ VYSOKÁ PRIORITA

#### Problém:

```javascript
// AIPanel.js - event listeners nejsou čištěny při destroy
setupEventListeners() {
    eventBus.on('ai:show', () => this.show());
    eventBus.on('ai:hide', () => this.hide());
    // ... více listenerů
}
```

**Důsledek**: Při opakovaném vytváření/mazání AIPanel se event listeners hromadí.

**Oprava**: Přidána metoda `cleanup()` v modulárních komponentách.

---

### 2. **Race Conditions** - ⚠️ VYSOKÁ PRIORITA

#### Problém:

```javascript
// Současné volání async funkcí bez synchronizace
async sendMessage(message) {
    // ...
    const response = await window.AI.ask(message, {...});
    // Co když uživatel klikne 2x rychle za sebou?
}
```

**Důsledek**: Více požadavků běží současně, odpovědi se mohou míchat.

**Oprava**: Přidat flag `isProcessing` a debounce:

```javascript
async sendMessage(message) {
    if (this.isProcessing) {
        toast.warn('Čekám na dokončení předchozího požadavku...');
        return;
    }
    this.isProcessing = true;
    try {
        // ... zpracování
    } finally {
        this.isProcessing = false;
    }
}
```

---

### 3. **Duplicate Variable Detection** - ⚠️ STŘEDNÍ PRIORITA

#### Problém:

```javascript
detectDuplicateVariables(code) {
    // Regex nedetekuje všechny případy
    const declarationRegex = /(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
}
```

**Chybí**:

- Detekce duplicit v různých scopech (globální vs. lokální)
- Destructuring: `const {x} = obj; const x = 5;`
- Function parameters: `function fn(x) { const x = 5; }`

**Oprava**: Vylepšený regex + AST parsing.

---

### 4. **Modal Cleanup** - ⚠️ STŘEDNÍ PRIORITA

#### Problém:

```javascript
// Modaly se nevyčištění po zavření
const errorModal = new Modal({...});
errorModal.create();
errorModal.open();
// Po zavření zůstává v DOM?
```

**Důsledek**: DOM elementy se hromadí, zabírají paměť.

**Oprava**: Modal má metodu `destroy()` volanou v `onClose`.

---

### 5. **Error Handling** - ⚠️ NÍZKÁ PRIORITA

#### Problém:

```javascript
try {
    const response = await window.AI.ask(message, {...});
} catch (error) {
    // Obecné error handling
    this.addChatMessage('system', `❌ Chyba: ${error.message}`);
}
```

**Chybí**: Specifické zpracování různých typů chyb (rate limit, network, API key).

**Oprava**: Error kategoriz ace a retry logika.

---

### 6. **Circular Dependencies** - ⚠️ STŘEDNÍ PRIORITA

#### Problém:

Moduly se mohou navzájem importovat a způsobit circular dependency.

**Prevence**:

- Services neimportují componenty
- Components neimportují services (jen events)
- Vše komunikuje přes eventBus

---

### 7. **Timeout Handling** - ⚠️ NÍZKÁ PRIORITA

#### Problém:

```javascript
setTimeout(() => {
  const settingsToggle = this.modal?.element?.querySelector('.ai-settings-toggle');
  // ...
}, 100);
```

**Problém**: Hardcoded delay, není záruka že DOM je ready.

**Oprava**: Použít `requestAnimationFrame` nebo `MutationObserver`.

---

## 🔧 Implementované opravy v modulární struktuře

### ✅ ChatService.js

- Bezpečné exporty (markdown, JSON)
- Správné čištění historie
- Formátování bez XSS vulnerabilities

### ✅ CodeEditorService.js

- Fuzzy matching pro EDIT:LINES (90% similarity)
- Undo/redo integrace
- Validace line ranges
- Error modals s copy-to-clipboard

### ✅ ErrorIndicator.js

- Ignorování chyb
- Bulk selection
- Event listener cleanup

### ✅ TokenCounter.js

- Debounced updates
- Warning při > 2000 tokenů
- Memory efficient

### ✅ StringUtils.js

- Levenshtein distance pro similarity
- Intelligent code truncation
- Safe HTML escaping

### ✅ PromptSelector.js

- Context-aware prompt selection
- Předchází špatným instrukcím pro AI
- Optimalizace pro různé use cases

---

## 📝 Doporučení pro finální refaktoring AIPanel.js

```javascript
import { ChatService } from './services/ChatService.js';
import { CodeEditorService } from './services/CodeEditorService.js';
import { PromptSelector } from './services/PromptSelector.js';
import { ErrorIndicator } from './components/ErrorIndicator.js';
import { TokenCounter } from './components/TokenCounter.js';

export class AIPanel {
  constructor() {
    // Inicializace services
    this.chatService = new ChatService();
    this.codeService = new CodeEditorService();
    this.promptSelector = new PromptSelector();
    this.errorIndicator = new ErrorIndicator(this);
    this.tokenCounter = new TokenCounter();

    // Pouze koordinace
    this.setupEventListeners();
  }

  async sendMessage(message) {
    if (this.isProcessing) return; // Race condition fix
    this.isProcessing = true;

    try {
      // ChatService spravuje historii
      this.chatService.addToHistory('user', message);

      // PromptSelector vybere prompt
      const systemPrompt = this.promptSelector.buildSystemPrompt(
        message,
        state.get('editor.code'),
        this.chatService.buildFilesContext(),
        this.chatService.buildHistoryContext()
      );

      // AI request
      const response = await window.AI.ask(message, {
        system: systemPrompt,
        ...
      });

      // CodeEditorService zpracuje EDIT:LINES
      const edits = this.codeService.parseEditInstructions(response);
      if (edits.length > 0) {
        this.codeService.applyLineEdits(edits);
      }

      this.chatService.addToHistory('assistant', response);
    } catch (error) {
      this.handleError(error); // Centralizované error handling
    } finally {
      this.isProcessing = false;
    }
  }

  cleanup() {
    // Cleanup při destroy
    this.errorIndicator.cleanup?.();
    this.tokenCounter.cleanup?.();
    // Odstranit event listeners
  }
}
```

---

## 🎯 Výhody modulární struktury

1. **Údržba**: Každý modul má jasnou odpovědnost
2. **Testování**: Lze testovat jednotlivé části izolovaně
3. **Výkon**: Lazy loading modulů podle potřeby
4. **Znovupoužitelnost**: Services lze použít v jiných částech aplikace
5. **Debugging**: Snadnější identifikace problémů
6. **Škálovatelnost**: Snadné přidávání nových features

---

## ⚠️ Známé limity

1. **GitHub integrace** nebyla extrahována (velmi rozsáhlá)
2. **Agents systém** zůstává v původním souboru
3. **Templates a Quick Actions** zatím v hlavním souboru
4. **Některé UI metody** (createAIInterface) zůstávají v AIPanel.js

Tyto části lze postupně refaktorovat v dalších iteracích.
