# 🔧 Plán refaktoringu AIPanel.js

## 📊 Současný stav

- **Velikost**: 8 456 řádků, 303 KB
- **Metod**: 100+ metod v jedné třídě
- **Problém**: Velmi těžké na údržbu, dlouhé načítání, nečitelné

## 🎯 Doporučené rozdělení na moduly

### 1. **AIPanel.js** (hlavní třída) - ~500 řádků

**Odpovědnost**: Orchestrace, hlavní rozhraní, modal management

```javascript
-constructor() - show() / hide() - createModal() - setupEventListeners() - cleanup();
```

### 2. **ChatService.js** (už existuje) - rozšířit

**Odpovědnost**: Chat komunikace, zprávy, formátování

```javascript
-sendMessage() -
  addChatMessage() -
  formatAIMessage() -
  highlightCode() -
  clearChatHistory() -
  exportChatHistory();
```

### 3. **CodeEditorService.js** (nový modul) - ~800 řádků

**Odpovědnost**: Editace kódu, aplikace změn

```javascript
-insertCodeToEditor() -
  applyLineEdits() -
  applySearchReplaceEdits() -
  fuzzySearchCode() -
  findSimilarCode() -
  detectEditConflicts() -
  showValidationErrors() -
  addLineNumbers() -
  truncateCodeIntelligently() -
  detectDuplicateVariables();
```

### 4. **ParsingService.js** (nový modul) - ~400 řádků

**Odpovědnost**: Parsování AI odpovědí

```javascript
-parseSearchReplaceInstructions() -
  parseEditInstructions() -
  showChangeConfirmation() -
  acceptChange() -
  rejectChange();
```

### 5. **GitHubService.js** (nový modul) - ~1500 řádků

**Odpovědnost**: Vše kolem GitHub integrace

```javascript
-handleGitHubAction() -
  showGitHubSearchDialog() -
  searchGitHubCode() -
  searchGitHubRepos() -
  loadGitHubRepo() -
  loadGitHubCode() -
  showRepoManager() -
  createRepository() -
  deleteRepository() -
  saveGitHubToken() -
  checkGitHubConnection() -
  initiateGitHubOAuth();
```

### 6. **TemplatesService.js** (nový modul) - ~800 řádků

**Odpovědnost**: HTML templates

```javascript
-getBlankTemplate() -
  getLandingTemplate() -
  getFormTemplate() -
  getDashboardTemplate() -
  getPortfolioTemplate() -
  handleTemplate();
```

### 7. **FileAttachmentService.js** (nový modul) - ~600 řádků

**Odpovědnost**: Přikládání souborů do kontextu

```javascript
-showFileAttachmentModal() -
  renderProjectFiles() -
  setupFileAttachmentHandlers() -
  handleDiskFilesSelected() -
  attachSelectedFiles() -
  getFileContent() -
  updateAttachedFilesDisplay() -
  removeAttachedFile() -
  removeDiskFile();
```

### 8. **ErrorHandlerService.js** (nový modul) - ~400 řádků

**Odpovědnost**: Error handling z console

```javascript
-setupErrorIndicator() -
  updateErrorIndicator() -
  sendAllErrorsToAI() -
  isErrorIgnored() -
  ignoreErrors() -
  showErrorSelectionModal() -
  showIgnoredErrorsModal();
```

### 9. **PromptService.js** (nový modul) - ~600 řádků

**Odpovědność**: Prompty a quick actions

```javascript
-handleQuickAction() -
  usePrompt() -
  addCustomPrompt() -
  getPromptSelectionMetaPrompt() -
  selectPromptByContext();
```

### 10. **ModelService.js** (nový modul) - ~300 řádků

**Odpovědnost**: Provider a model selection

```javascript
-generateProviderOptions() - updateModels() - toggleModelFavorite();
```

### 11. **ProjectService.js** (nový modul) - ~300 řádků

**Odpovědnost**: Projekty a new project workflow

```javascript
-detectNewProject() - createNewFileWithCode() - handleNewProjectStart() - resetToNewProject();
```

### 12. **Utils/** (utility funkce) - ~200 řádků

**Odpovědnost**: Pomocné funkce

```javascript
-escapeHtml() -
  unescapeHtml() -
  calculateSimilarity() -
  levenshteinDistance() -
  formatBytes() -
  formatFileSize() -
  detectLanguage() -
  debounce() -
  clearFormatCache();
```

## 📁 Doporučená struktura složek

```
src/modules/ai/
├── AIPanel.js (hlavní třída, 500 řádků)
├── index.js (export všeho)
├── services/
│   ├── ChatService.js (~600 řádků)
│   ├── CodeEditorService.js (~800 řádků)
│   ├── ParsingService.js (~400 řádků)
│   ├── GitHubService.js (~1500 řádků)
│   ├── TemplatesService.js (~800 řádků)
│   ├── FileAttachmentService.js (~600 řádků)
│   ├── ErrorHandlerService.js (~400 řádků)
│   ├── PromptService.js (~600 řádků)
│   ├── ModelService.js (~300 řádků)
│   └── ProjectService.js (~300 řádků)
├── utils/
│   ├── htmlUtils.js
│   ├── stringUtils.js
│   ├── formatUtils.js
│   └── cacheUtils.js
├── components/ (už existuje)
├── tools/ (už existuje)
└── integrations/ (už existuje)
```

## ✅ Výhody refaktoringu

1. **Čitelnost** - každý modul má jasnou odpovědnost
2. **Testovatelnost** - jednodušší psát unit testy
3. **Výkon** - menší soubory = rychlejší parsing a HMR
4. **Údržba** - lehčí najít a opravit chyby
5. **Škálovatelnost** - snadné přidávat nové funkce
6. **Code splitting** - lazy loading jednotlivých služeb
7. **Týmová práce** - méně merge konfliktů

## 🎯 Priority refaktoringu

### Fáze 1 (High Priority):

1. ✅ **GitHubService** - izolovat velkou GitHub logiku (~1500 řádků)
2. ✅ **CodeEditorService** - kritická editační logika (~800 řádků)
3. ✅ **TemplatesService** - velké statické templates (~800 řádků)

### Fáze 2 (Medium Priority):

4. **FileAttachmentService** - nově přidaná funkcionalita (~600 řádků)
5. **ParsingService** - důležité parsování (~400 řádků)
6. **ErrorHandlerService** - error handling (~400 řádků)

### Fáze 3 (Low Priority):

7. **PromptService** - prompty a actions (~600 řádků)
8. **ModelService** - provider selection (~300 řádků)
9. **ProjectService** - project management (~300 řádků)
10. **Utils** - pomocné funkce (~200 řádků)

## 🔄 Postup migrace

### Krok 1: Vytvoření service třídy

```javascript
// services/GitHubService.js
export class GitHubService {
  constructor(aiPanel) {
    this.panel = aiPanel; // Reference na hlavní panel pro state
  }

  async searchGitHubCode(query, language, page = 1) {
    // Přesunout logiku sem
  }
}
```

### Krok 2: Integrace do AIPanel

```javascript
// AIPanel.js
import { GitHubService } from './services/GitHubService.js';

export class AIPanel {
  constructor() {
    this.githubService = new GitHubService(this);
  }

  handleGitHubAction(action) {
    return this.githubService.handleAction(action);
  }
}
```

### Krok 3: Postupné testování

- Po každém přesunu otestovat funkcionalitu
- Spustit aplikaci a ověřit, že vše funguje
- Commit po každé úspěšné migraci

## ⚠️ Rizika a řešení

**Riziko 1**: Circular dependencies

- **Řešení**: Používat Dependency Injection, event bus

**Riziko 2**: Breaking existing code

- **Řešení**: Postupná migrace, zachování API

**Riziko 3**: Performance overhead

- **Řešení**: Lazy loading, code splitting

## 📝 Příklad refaktoringu (GitHubService)

**Před:**

```javascript
// AIPanel.js - 8456 řádků
class AIPanel {
  async searchGitHubCode(query, language, page = 1) {
    // 30 řádků kódu
  }
  async loadGitHubRepo(fullName, repoName) {
    // 50 řádků kódu
  }
  // ... dalších 1400 řádků GitHub logiky
}
```

**Po:**

```javascript
// services/GitHubService.js - 1500 řádků
export class GitHubService {
  constructor(eventBus, state) {
    this.eventBus = eventBus;
    this.state = state;
  }

  async searchCode(query, language, page = 1) { ... }
  async loadRepo(fullName, repoName) { ... }
}

// AIPanel.js - 500 řádků
import { GitHubService } from './services/GitHubService.js';

class AIPanel {
  constructor() {
    this.github = new GitHubService(eventBus, state);
  }

  handleGitHubAction(action) {
    return this.github.handleAction(action);
  }
}
```

## 🎯 Očekávané výsledky

- **AIPanel.js**: 8456 → ~500 řádků (94% redukce!)
- **10 nových servisních modulů**: průměrně 500 řádků každý
- **Celkový počet souborů**: 1 → 15 modulů
- **Lepší výkon**: lazy loading, menší bundle size
- **Lepší DX**: jednodušší debugging, čitelnější kód

---

**Doporučení**: Začít s **GitHubService**, protože je to největší samostatný celek (1500 řádků) a není moc provázaný se zbytkem. Pak pokračovat **CodeEditorService** a **TemplatesService**.

Chceš, abych začal s refactoringem? Mohu vytvořit první service modul jako příklad.
