/**
 * Editor Module - Hlavní logika code editoru
 */
import { state } from '../../core/state.js';
import { eventBus } from '../../core/events.js';
import { debounce } from '../../utils/async.js';
import { countLines } from '../../utils/string.js';
import { ChangeTracker } from './ChangeTracker.js';

export class Editor {
  constructor(container) {
    this.container = container;
    this.textarea = null;
    this.lineNumbers = null;
    this.wrapper = null;
    this.tabsContainer = null;
    this.changeTracker = null; // Change tracking system
    this.history = {
      past: [],
      future: [],
      maxSize: 100,
    };
    this.isUndoRedoInProgress = false; // Flag to prevent history save during undo/redo

    // Store bound handlers for cleanup
    this.handlers = {
      input: null,
      scroll: null,
      keydown: null,
      selectionchange: null,
    };

    // Debounced save function - ukládá max 1x za 300ms
    this.debouncedSaveToActiveTab = debounce(() => {
      this.saveToActiveTab();
    }, 300);

    this.init();
    this.setupEventListeners();
    this.initTabs();

    // Initialize change tracker after editor is ready
    setTimeout(() => {
      this.changeTracker = new ChangeTracker(this);
    }, 100);
  }

  init() {
    // Create editor structure
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'editor-wrapper';

    // Line numbers
    this.lineNumbers = document.createElement('div');
    this.lineNumbers.className = 'line-numbers';

    // Textarea
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'code-input';
    this.textarea.id = 'codeInput';
    this.textarea.spellcheck = false;
    this.textarea.autocomplete = 'off';
    this.textarea.autocorrect = 'off';
    this.textarea.autocapitalize = 'off';

    // Append elements
    this.wrapper.appendChild(this.lineNumbers);
    this.wrapper.appendChild(this.textarea);
    this.container.appendChild(this.wrapper);

    // Store editor instance on container for external access
    this.container.__editor = this;

    // Load initial code
    const initialCode = state.get('editor.code') || this.getDefaultCode();
    this.setCode(initialCode);
    this.updateLineNumbers();
  }

  setupEventListeners() {
    // Input changes
    this.handlers.input = debounce(() => {
      this.handleInput();
    }, 300);
    this.textarea.addEventListener('input', this.handlers.input);

    // Scroll sync
    this.handlers.scroll = () => {
      this.lineNumbers.scrollTop = this.textarea.scrollTop;
    };
    this.textarea.addEventListener('scroll', this.handlers.scroll);

    // Tab key handling
    this.handlers.keydown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.insertTab();
      }
    };
    this.textarea.addEventListener('keydown', this.handlers.keydown);

    // Cursor position tracking
    this.handlers.selectionchange = () => {
      this.updateCursorPosition();
    };
    this.textarea.addEventListener('selectionchange', this.handlers.selectionchange);

    // State changes
    state.subscribe('editor.code', code => {
      if (code !== this.getCode()) {
        this.setCode(code, true); // Skip state update to prevent loop
      }
    });

    // Actions
    eventBus.on('action:undo', () => this.undo());
    eventBus.on('action:redo', () => this.redo());
    eventBus.on('editor:insertText', ({ text }) => this.insertText(text));
    eventBus.on('editor:replaceAll', ({ code, force }) => {
      this.setCode(code, false, force);
    });
    eventBus.on('editor:replace', ({ search, replace, options }) => this.replace(search, replace, options));
    // Nový event pro nastavení kódu bez window.editor závislosti
    eventBus.on('editor:setCode', ({ code, skipStateUpdate, force }) => {
      this.setCode(code, skipStateUpdate, force);
    });

    // Aliasy pro kompatibilitu s menu moduly
    eventBus.on('editor:insert', (code) => this.insertText(code));
    eventBus.on('editor:set-value', (code) => this.setCode(code));
    eventBus.on('editor:update', (code) => this.setCode(code));
  }

  handleInput() {
    const code = this.getCode();

    // Save to history (skip if undo/redo is in progress)
    if (!this.isUndoRedoInProgress) {
      this.saveToHistory();
    }

    // Update state
    state.set('editor.code', code);

    // DŮLEŽITÉ: Auto-save změn do aktivního tabu (debounced)
    this.debouncedSaveToActiveTab();

    // Update UI
    this.updateLineNumbers();

    // Emit change event
    eventBus.emit('editor:change', { code });

    // Auto-save
    if (state.get('settings.autoSave')) {
      this.autoSave();
    }
  }

  getCode() {
    return this.textarea.value;
  }

  setCode(code, skipStateUpdate = false, force = false) {
    // Prevent infinite loop - don't set if it's the same (unless forced)
    if (!force && this.textarea.value === code) {
      return;
    }
    this.textarea.value = code;
    this.updateLineNumbersFromCode(code);

    // Only update state if not skipped (prevents loops during initialization)
    if (!skipStateUpdate) {
      state.set('editor.code', code);
    }

    // Emit change event to update preview
    eventBus.emit('editor:change', { code });
  }

  insertText(text) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const current = this.getCode();

    const newCode = current.substring(0, start) + text + current.substring(end);
    this.setCode(newCode);

    // Set cursor after inserted text
    const newPosition = start + text.length;
    this.textarea.setSelectionRange(newPosition, newPosition);
    this.textarea.focus();
  }

  insertTab() {
    const tabSize = state.get('settings.tabSize') || 2;
    const tab = ' '.repeat(tabSize);
    this.insertText(tab);
  }

  updateLineNumbers() {
    const code = this.getCode();
    this.updateLineNumbersFromCode(code);
  }

  updateLineNumbersFromCode(code) {
    const lineCount = countLines(code);
    const numbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
    this.lineNumbers.textContent = numbers;
  }

  updateCursorPosition() {
    const position = this.textarea.selectionStart;
    const code = this.getCode();
    const beforeCursor = code.substring(0, position);
    const line = beforeCursor.split('\n').length;
    const col = beforeCursor.split('\n').pop().length;

    state.set('editor.cursor', { line, col });
  }

  saveToHistory() {
    const code = this.getCode();
    const last = this.history.past[this.history.past.length - 1];

    if (code === last) return;

    this.history.past.push(code);
    if (this.history.past.length > this.history.maxSize) {
      this.history.past.shift();
    }
    this.history.future = [];
  }

  undo() {
    console.log('🔙 Undo kliknuto - historie:', this.history.past.length, 'kroků');

    if (this.history.past.length < 1) {
      console.warn('⚠️ Historie je prázdná!');
      eventBus.emit('toast:show', {
        message: '⚠️ Žádná historie pro vrácení zpět',
        type: 'warning',
        duration: 1500
      });
      return;
    }

    this.isUndoRedoInProgress = true; // Set flag to prevent history save

    const current = this.getCode();
    const previous = this.history.past.pop();

    console.log('📝 Vracím z:', current.substring(0, 50) + '...');
    console.log('📝 Vracím na:', previous.substring(0, 50) + '...');

    this.history.future.unshift(current);
    this.setCode(previous);

    this.isUndoRedoInProgress = false; // Reset flag

    eventBus.emit('toast:show', {
      message: '⬅️ Vráceno zpět',
      type: 'success',
      duration: 1000
    });

    console.log('✅ Undo dokončeno - zbývá:', this.history.past.length, 'kroků v historii');
    eventBus.emit('editor:undo', { code: previous });
  }

  redo() {
    if (this.history.future.length === 0) {
      eventBus.emit('toast:show', {
        message: '⚠️ Žádná historie pro obnovu',
        type: 'warning',
        duration: 1500
      });
      return;
    }

    this.isUndoRedoInProgress = true; // Set flag to prevent history save

    const current = this.getCode();
    const next = this.history.future.shift();

    this.history.past.push(current);
    this.setCode(next);

    this.isUndoRedoInProgress = false; // Reset flag

    eventBus.emit('toast:show', {
      message: '➡️ Obnoveno',
      type: 'success',
      duration: 1000
    });

    eventBus.emit('editor:redo', { code: next });
  }

  replace(search, replace, options = {}) {
    const code = this.getCode();
    let newCode;

    if (options.regex) {
      try {
        const flags = options.caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(search, flags);
        newCode = code.replace(regex, replace);
      } catch (error) {
        console.error('Invalid regex:', error);
        eventBus.emit('toast:show', {
          message: '❌ Neplatný regulární výraz',
          type: 'error'
        });
        return;
      }
    } else {
      const searchStr = options.caseSensitive ? search : search.toLowerCase();
      const codeStr = options.caseSensitive ? code : code.toLowerCase();

      if (codeStr.includes(searchStr)) {
        if (options.caseSensitive) {
          newCode = code.split(search).join(replace);
        } else {
          // Case insensitive replace
          const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          newCode = code.replace(regex, replace);
        }
      } else {
        eventBus.emit('toast:show', {
          message: '🔍 Text nenalezen',
          type: 'warning'
        });
        return;
      }
    }

    const count = code.split(search).length - 1;
    this.setCode(newCode);
    this.saveToHistory();

    eventBus.emit('toast:show', {
      message: `✅ Nahrazeno ${count}x`,
      type: 'success',
      duration: 2000
    });
  }

  autoSave() {
    // Save current file
    const activeFile = state.get('files.active');
    if (activeFile) {
      const tabs = state.get('files.tabs');
      const tab = tabs.find(t => t.id === activeFile);
      if (tab) {
        tab.content = this.getCode();
        tab.modified = false;
        state.set('files.tabs', tabs);
      }
    }
  }

  getDefaultCode() {
    return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
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
</html>`;
  }

  focus() {
    this.textarea.focus();
  }

  destroy() {
    // Destroy change tracker
    if (this.changeTracker) {
      this.changeTracker.destroy();
      this.changeTracker = null;
    }

    // Remove event listeners
    if (this.textarea) {
      if (this.handlers.input) {
        this.textarea.removeEventListener('input', this.handlers.input);
      }
      if (this.handlers.scroll) {
        this.textarea.removeEventListener('scroll', this.handlers.scroll);
      }
      if (this.handlers.keydown) {
        this.textarea.removeEventListener('keydown', this.handlers.keydown);
      }
      if (this.handlers.selectionchange) {
        this.textarea.removeEventListener('selectionchange', this.handlers.selectionchange);
      }
    }

    // Clean up DOM
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }

    // Clear references
    this.textarea = null;
    this.lineNumbers = null;
    this.wrapper = null;
    this.tabsContainer = null;
    this.handlers = null;
  }

  /**
   * Bezpečně uloží změny do aktivního tabu bez mutace
   * Volá se při každé změně v editoru
   */
  saveToActiveTab() {
    const activeFileId = state.get('files.active');
    if (!activeFileId) return;

    const tabs = state.get('files.tabs') || [];
    const currentCode = this.getCode();

    // Immutabilní aktualizace - vytvoř nové pole s aktualizovaným tabem
    const updatedTabs = tabs.map(tab =>
      tab.id === activeFileId
        ? { ...tab, content: currentCode, modified: true }
        : tab
    );

    // Pouze pokud se něco změnilo
    const hasChanged = tabs.find(t => t.id === activeFileId)?.content !== currentCode;
    if (hasChanged) {
      state.set('files.tabs', updatedTabs);
    }
  }

  initTabs() {
    this.tabsContainer = document.getElementById('editorTabs');
    if (!this.tabsContainer) return;

    // Listen to state changes for tabs
    state.subscribe('files.tabs', tabs => {
      this.renderTabs(tabs);
    });

    state.subscribe('files.active', activeId => {
      this.updateActiveTab(activeId);
    });

    // Initial render
    const tabs = state.get('files.tabs') || [];
    this.renderTabs(tabs);
  }

  renderTabs(tabs) {
    if (!this.tabsContainer) return;

    // Remove only existing tabs, keep the toggle button
    const existingTabs = this.tabsContainer.querySelectorAll('.editor-tab');
    existingTabs.forEach(tab => tab.remove());

    tabs.forEach(tab => {
      const tabEl = document.createElement('div');
      tabEl.className = 'editor-tab';
      tabEl.dataset.tabId = tab.id;

      if (tab.id === state.get('files.active')) {
        tabEl.classList.add('active');
      }

      const nameSpan = document.createElement('span');
      nameSpan.className = 'editor-tab-name';
      nameSpan.textContent = tab.name;

      tabEl.appendChild(nameSpan);

      // Modified indicator
      if (tab.modified) {
        const modifiedDot = document.createElement('span');
        modifiedDot.className = 'editor-tab-modified';
        tabEl.appendChild(modifiedDot);
      }

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.className = 'editor-tab-close';
      closeBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor">
        <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/>
      </svg>`;

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(tab.id);
      });

      tabEl.appendChild(closeBtn);

      // Tab click
      tabEl.addEventListener('click', () => {
        this.switchTab(tab.id);
      });

      this.tabsContainer.appendChild(tabEl);
    });
  }

  updateActiveTab(activeId) {
    if (!this.tabsContainer) {
      console.warn('⚠️ updateActiveTab: tabsContainer not found');
      return;
    }

    const tabs = this.tabsContainer.querySelectorAll('.editor-tab');

    tabs.forEach(tab => {
      // Porovnání jako string (dataset je vždy string, activeId může být number)
      if (tab.dataset.tabId == activeId) {
        tab.classList.add('active');
        // Scroll into view
        tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        tab.classList.remove('active');
      }
    });
  }

  switchTab(tabId) {
    const tabs = state.get('files.tabs') || [];
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Save current tab IMMUTABLY
    const currentActive = state.get('files.active');
    if (currentActive && currentActive !== tabId) {
      const currentCode = this.getCode();
      const updatedTabs = tabs.map(t =>
        t.id === currentActive
          ? { ...t, content: currentCode, modified: true }
          : t
      );
      state.set('files.tabs', updatedTabs);
    }

    // Switch to new tab - force update to ensure content is loaded
    state.set('files.active', tabId);
    this.setCode(tab.content || '', false, true); // force=true pro zajištění načtení
    eventBus.emit('tab:switched', { tabId });
  }

  closeTab(tabId) {
    const tabs = state.get('files.tabs') || [];
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    const tab = tabs[tabIndex];

    // Confirm if modified
    if (tab.modified) {
      if (!confirm(`Soubor "${tab.name}" má neuložené změny. Opravdu zavřít?`)) {
        return;
      }
    }

    // Remove tab
    tabs.splice(tabIndex, 1);
    state.set('files.tabs', tabs);

    // Switch to adjacent tab
    const activeId = state.get('files.active');
    if (activeId === tabId) {
      if (tabs.length > 0) {
        const newIndex = Math.min(tabIndex, tabs.length - 1);
        this.switchTab(tabs[newIndex].id);
      } else {
        state.set('files.active', null);
        this.setCode(this.getDefaultCode());
      }
    }

    eventBus.emit('tab:closed', { tabId });
  }
}
