/**
 * AppState - Centrální správa stavu aplikace
 * Implementuje observer pattern pro reaktivní updates
 */
export class AppState {
  constructor() {
    this.subscribers = new Map();
    this.state = this.getInitialState();
    this.batchMode = false;
    this.batchUpdates = [];
    this.history = []; // Pro rollback
    this.maxHistorySize = 50;
    this.transactionDepth = 0;
    this.validationEnabled = true;
    this.loadFromStorage();
    this.setupSchema();
  }

  /**
   * Definice schématu pro validaci
   */
  setupSchema() {
    this.schema = {
      'files.active': (val) => typeof val === 'number' && val > 0,
      'files.tabs': (val) => Array.isArray(val),
      'files.nextId': (val) => typeof val === 'number' && val > 0,
      'editor.code': (val) => typeof val === 'string',
      'editor.language': (val) => typeof val === 'string',
      'ui.theme': (val) => ['dark', 'light'].includes(val),
      'ui.view': (val) => ['preview', 'editor', 'split'].includes(val),
      'settings.fontSize': (val) => typeof val === 'number' && val >= 8 && val <= 32,
      'settings.tabSize': (val) => typeof val === 'number' && val >= 2 && val <= 8,
    };
  }

  /**
   * Validace hodnoty proti schématu
   */
  validate(path, value) {
    if (!this.validationEnabled) return true;

    const validator = this.schema[path];
    if (!validator) return true; // Není definována validace

    try {
      const isValid = validator(value);
      if (!isValid) {
        console.error(`❌ State validation failed for '${path}':`, value);
        return false;
      }
      return true;
    } catch (error) {
      console.error(`❌ State validation error for '${path}':`, error);
      return false;
    }
  }

  /**
   * Dodatečná validace pro files.active - tab musí existovat
   */
  validateFileActive(tabId) {
    const tabs = this.get('files.tabs') || [];
    const tabExists = tabs.some(t => t.id === tabId);
    if (!tabExists) {
      console.error(`❌ Tab ${tabId} doesn't exist in tabs:`, tabs.map(t => t.id));
      return false;
    }
    return true;
  }

  /**
   * Snapshot aktuálního stavu pro rollback
   */
  createSnapshot() {
    const snapshot = JSON.parse(JSON.stringify(this.state));
    this.history.push({
      state: snapshot,
      timestamp: Date.now()
    });

    // Omez velikost historie
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Rollback na předchozí stav
   */
  rollback() {
    if (this.history.length === 0) {
      console.warn('⚠️ No history to rollback');
      return false;
    }

    const snapshot = this.history.pop();
    this.state = snapshot.state;
    console.log('🔄 State rolled back to', new Date(snapshot.timestamp));

    // Notifikuj všechny subscribery
    this.notify('*', this.state, null);
    return true;
  }

  getInitialState() {
    return {
      editor: {
        code: `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dokument</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <h1>Hello World!</h1>
  <p>Začni psát svůj kód zde...</p>
</body>
</html>`,
        language: 'html',
        cursor: { line: 0, col: 0 },
        selection: null,
      },
      files: {
        active: 1,
        tabs: [
          {
            id: 1,
            name: 'index.html',
            content: `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dokument</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <h1>Hello World!</h1>
  <p>Začni psát svůj kód zde...</p>
</body>
</html>`,
            modified: false,
            type: 'html'
          }
        ],
        tree: {},
        nextId: 2,
      },
      ui: {
        theme: 'dark',
        view: 'preview',
        splitRatio: 50,
        toolsPanelOpen: false,
        toolsPanelWidth: 300,
        sidebarOpen: false,
        consoleOpen: false,
      },
      ai: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        keys: {},
        chatHistory: [],
      },
      settings: {
        fontSize: 14,
        tabSize: 2,
        autoSave: true,
        livePreview: true,
        wordWrap: true,
        lineNumbers: true,
      },
    };
  }

  /**
   * Získání hodnoty ze stavu pomocí tečkové notace
   * @param {string} path - Cesta ke klíči (např. 'editor.code')
   * @returns {*} Hodnota
   */
  get(path) {
    if (!path) return this.state;
    return path.split('.').reduce((obj, key) => obj?.[key], this.state);
  }

  /**
   * Nastavení hodnoty do stavu s validací
   * @param {string} path - Cesta ke klíči
   * @param {*} value - Nová hodnota
   * @param {Object} options - Volitelné parametry
   */
  set(path, value, options = {}) {
    const { skipValidation = false, skipHistory = false } = options;

    // Validace
    if (!skipValidation) {
      if (!this.validate(path, value)) {
        console.error(`❌ Refused to set invalid value for '${path}'`);
        return false;
      }

      // Speciální validace pro files.active
      if (path === 'files.active' && !this.validateFileActive(value)) {
        console.error(`❌ Refused to set non-existent tab as active: ${value}`);
        return false;
      }
    }

    // Vytvoř snapshot před změnou (pokud nejsme v transakci)
    if (!skipHistory && this.transactionDepth === 0) {
      this.createSnapshot();
    }

    const keys = path.split('.');
    const lastKey = keys.pop();
    const obj = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.state);

    const oldValue = obj[lastKey];

    // IMMUTABILITY: Deep clone pro objekty a pole
    if (value !== null && typeof value === 'object') {
      obj[lastKey] = JSON.parse(JSON.stringify(value));
    } else {
      obj[lastKey] = value;
    }

    this.notify(path, obj[lastKey], oldValue);
    this.saveToStorage();
    return true;
  }

  /**
   * Update objektu (shallow merge)
   * @param {string} path - Cesta k objektu
   * @param {Object} updates - Změny
   */
  update(path, updates) {
    const current = this.get(path);
    this.set(path, { ...current, ...updates });
  }

  /**
   * Přidání položky do pole
   * @param {string} path - Cesta k poli
   * @param {*} item - Nová položka
   */
  push(path, item) {
    const array = this.get(path) || [];
    this.set(path, [...array, item]);
  }

  /**
   * Odebrání položky z pole
   * @param {string} path - Cesta k poli
   * @param {Function|*} predicateOrValue - Predikát nebo hodnota
   */
  remove(path, predicateOrValue) {
    const array = this.get(path) || [];
    const predicate = typeof predicateOrValue === 'function'
      ? predicateOrValue
      : item => item === predicateOrValue;
    this.set(path, array.filter(item => !predicate(item)));
  }

  /**
   * Subscribe na změny
   * @param {string|Function} pathOrCallback - Cesta nebo callback
   * @param {Function} [callback] - Callback funkce
   * @returns {Function} Unsubscribe funkce
   */
  subscribe(pathOrCallback, callback) {
    // subscribe(callback) - globální
    if (typeof pathOrCallback === 'function') {
      callback = pathOrCallback;
      pathOrCallback = '*';
    }

    if (!this.subscribers.has(pathOrCallback)) {
      this.subscribers.set(pathOrCallback, new Set());
    }

    const subs = this.subscribers.get(pathOrCallback);

    // OCHRANA: Zkontroluj jestli už není stejný subscriber zaregistrovaný
    if (subs.has(callback)) {
      console.warn(`⚠️ State: Duplicitní subscriber pro '${pathOrCallback}' byl ignorován`);
      return () => {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(pathOrCallback);
        }
      };
    }

    subs.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(pathOrCallback);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(pathOrCallback);
        }
      }
    };
  }

  /**
   * Notifikace subscriberů o změně
   * @private
   */
  notify(path, value, oldValue) {
    // V batch modu ukládáme notifikace místo okamžitého vyvolání
    if (this.batchMode) {
      this.batchUpdates.push({ path, value, oldValue });
      return;
    }

    this._executeNotify(path, value, oldValue);
  }

  /**
   * Provede notifikaci subscriberů
   * @private
   */
  _executeNotify(path, value, oldValue) {
    // Notify exact path subscribers
    if (this.subscribers.has(path)) {
      this.subscribers.get(path).forEach(cb => {
        cb(value, oldValue, path);
      });
    }

    // Notify parent path subscribers (např. 'editor' když se změní 'editor.code')
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      if (this.subscribers.has(parentPath)) {
        this.subscribers.get(parentPath).forEach(cb => {
          cb(this.get(parentPath), undefined, parentPath);
        });
      }
    }

    // Notify global subscribers
    if (this.subscribers.has('*')) {
      this.subscribers.get('*').forEach(cb => {
        cb(value, oldValue, path);
      });
    }
  }

  /**
   * Spustí batch mód pro hromadné změny
   * @param {Function} callback - Funkce se změnami
   * @returns {Promise<void>}
   */
  async batch(callback) {
    this.batchMode = true;
    this.batchUpdates = [];
    this.createSnapshot(); // Snapshot před batch operací

    try {
      await callback();
    } catch (error) {
      console.error('❌ Batch operation failed, rolling back:', error);
      this.rollback();
      this.batchMode = false;
      this.batchUpdates = [];
      throw error; // Re-throw pro další handling
    } finally {
      this.batchMode = false;

      // Vyvolej všechny notifikace najednou
      const uniquePaths = new Map();
      this.batchUpdates.forEach(update => {
        // Drž jen poslední hodnotu pro každou cestu
        uniquePaths.set(update.path, update);
      });

      uniquePaths.forEach(update => {
        this._executeNotify(update.path, update.value, update.oldValue);
      });

      this.batchUpdates = [];
    }
  }

  /**
   * Transakce - seskupí několik operací s možností rollback
   * @param {Function} callback - Funkce s operacemi
   * @returns {Promise<boolean>} Success
   */
  async transaction(callback) {
    this.transactionDepth++;
    this.createSnapshot(); // Snapshot před transakcí

    try {
      await callback();
      this.transactionDepth--;
      console.log('✅ Transaction committed');
      return true;
    } catch (error) {
      console.error('❌ Transaction failed, rolling back:', error);
      this.rollback();
      this.transactionDepth--;
      return false;
    }
  }

  /**
   * Uložení stavu do localStorage
   */
  saveToStorage() {
    try {
      const toSave = {
        files: this.state.files,
        ui: this.state.ui,
        settings: this.state.settings,
        editor: {
          code: this.state.editor.code,
          language: this.state.editor.language,
        },
        ai: {
          provider: this.state.ai.provider,
          model: this.state.ai.model,
          keys: this.state.ai.keys,
          chatHistory: this.state.ai.chatHistory,
        },
      };
      localStorage.setItem('htmlStudio:state', JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  /**
   * Načtení stavu z localStorage
   */
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('htmlStudio:state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge saved state with initial state
        this.state = {
          ...this.state,
          ...parsed,
          editor: {
            ...this.state.editor,
            ...(parsed.editor || {}),
          },
        };
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  /**
   * Reset stavu na výchozí
   */
  reset() {
    this.state = this.getInitialState();
    localStorage.removeItem('htmlStudio:state');
    this.notify('*', this.state);
  }
}

// Singleton instance
export const state = new AppState();
