/**
 * Main Application Entry Point
 */
import { state } from './state.js';
import { eventBus } from './events.js';
import config from './config.js';
import { registerDefaultShortcuts } from '../utils/shortcuts.js';
import { ready } from '../utils/dom.js';
import toast from '../ui/components/Toast.js';
import { SafeOps, ModuleErrorBoundary } from './safeOps.js';

// Import modules - použití index.js pro čistší importy
import { Editor } from '../modules/editor/index.js';
import { Preview } from '../modules/preview/index.js';
import { AIPanel } from '../modules/ai/index.js';
import { ShortcutsPanel } from '../modules/shortcuts/index.js';
import { MenuPanel } from '../modules/menu/index.js';
import { SearchPanel } from '../modules/search/SearchPanel.js';
import { SidePanel } from '../modules/panel/SidePanel.js';
import { Sidebar } from '../modules/sidebar/Sidebar.js';
import { FindReplacePanel } from '../modules/findreplace/FindReplacePanel.js';

class App {
  constructor() {
    this.editor = null;
    this.preview = null;
    this.aiPanel = null;
    this.shortcutsPanel = null;
    this.menuPanel = null;
    this.searchPanel = null;
    this.sidePanel = null;
    this.sidebar = null;
    this.findReplacePanel = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    console.log(`🚀 ${config.app.name} v${config.app.version} starting...`);

    // Setup global error handling
    this.setupErrorHandling();

    // Register shortcuts
    registerDefaultShortcuts();

    // Setup console message listener
    this.setupConsoleListener();

    // Initialize modules
    await this.initializeModules();

    // Setup event listeners
    this.setupEventListeners();

    // Apply theme
    this.applyTheme(state.get('ui.theme'));

    // Apply initial view
    const initialView = state.get('ui.view');
    this.switchView(initialView);

    this.initialized = true;
    eventBus.emit('app:initialized');

    toast.success('HTML Studio načten!', 2000);
    console.log('✅ App initialized');
  }

  async initializeModules() {
    // Vytvoř error boundaries pro každý modul
    const boundaries = {
      editor: new ModuleErrorBoundary('Editor'),
      preview: new ModuleErrorBoundary('Preview'),
      ai: new ModuleErrorBoundary('AIPanel'),
      sidebar: new ModuleErrorBoundary('Sidebar'),
      menu: new ModuleErrorBoundary('MenuPanel'),
    };

    // Editor - s error boundary
    const editorContainer = document.getElementById('editorContainer');
    if (editorContainer) {
      const { success, result } = await SafeOps.execute(
        () => new Editor(editorContainer),
        { name: 'Editor initialization', rollbackOnError: false }
      );
      if (success) {
        this.editor = result;
        console.log('✓ Editor initialized');
      } else {
        console.error('❌ Editor initialization failed');
      }
    }

    // Preview - s error boundary
    const previewContainer = document.getElementById('previewContainer');
    if (previewContainer) {
      const { success, result } = await SafeOps.execute(
        () => new Preview(previewContainer),
        { name: 'Preview initialization', rollbackOnError: false }
      );
      if (success) {
        this.preview = result;
        console.log('✓ Preview initialized');
      } else {
        console.error('❌ Preview initialization failed');
      }
    }

    // AI Panel - s error boundary
    const { success: aiSuccess, result: aiResult } = await SafeOps.execute(
      () => new AIPanel(),
      { name: 'AI Panel initialization', rollbackOnError: false }
    );
    if (aiSuccess) {
      this.aiPanel = aiResult;
      // Expose globally for onclick handlers
      window.aiPanel = aiResult;
      console.log('✓ AI Panel initialized');
    } else {
      console.error('❌ AI Panel initialization failed');
    }

    // Ostatní moduly - základní error handling
    try {
      this.shortcutsPanel = new ShortcutsPanel();
      console.log('✓ Shortcuts Panel initialized');
    } catch (error) {
      console.error('❌ Shortcuts Panel failed:', error);
    }

    try {
      this.menuPanel = new MenuPanel();
      console.log('✓ Menu Panel initialized');
    } catch (error) {
      console.error('❌ Menu Panel failed:', error);
    }

    try {
      this.searchPanel = new SearchPanel();
      console.log('✓ Search Panel initialized');
    } catch (error) {
      console.error('❌ Search Panel failed:', error);
    }

    try {
      this.sidebar = new Sidebar();
      console.log('✓ Sidebar initialized');
    } catch (error) {
      console.error('❌ Sidebar failed:', error);
    }

    try {
      this.findReplacePanel = new FindReplacePanel();
      console.log('✓ Find Replace Panel initialized');
    } catch (error) {
      console.error('❌ Find Replace Panel failed:', error);
    }

    // Centrální error handler pro moduly
    eventBus.on('module:error', (errorInfo) => {
      console.error('🚨 Module error:', errorInfo);
      toast.error(`Chyba v modulu ${errorInfo.module}`, 3000);
    });
  }

  setupEventListeners() {
    // View switching
    eventBus.on('view:change', ({ view }) => {
      this.switchView(view);
    });

    // Theme toggle
    eventBus.on('theme:toggle', () => {
      const current = state.get('ui.theme');
      const newTheme = current === 'dark' ? 'light' : 'dark';
      state.set('ui.theme', newTheme);
      this.applyTheme(newTheme);
    });

    // Menu toggle
    eventBus.on('menu:toggle', () => {
      this.menuPanel.toggle();
    });

    // Sidebar toggle - DISABLED (používáme pouze Sidebar vlevo)
    // eventBus.on('sidebar:toggle', () => {
    //   if (this.sidePanel) {
    //     this.sidePanel.toggle();
    //   }
    // });

    // AI panel toggle
    eventBus.on('ai:show', () => {
      if (this.aiPanel) {
        this.aiPanel.show();
      }
    });

    // Shortcuts panel toggle
    eventBus.on('shortcuts:show', () => {
      if (this.shortcutsPanel) {
        this.shortcutsPanel.show();
      }
    });

    // State changes
    state.subscribe('ui.theme', theme => {
      this.applyTheme(theme);
    });

    // Actions
    eventBus.on('action:save', () => this.saveFile());
    eventBus.on('action:copyCode', () => this.copyCode());
    eventBus.on('action:format', () => this.formatCode());
    eventBus.on('action:preview', () => this.togglePreview());
    eventBus.on('action:newTab', () => this.newTab());
    eventBus.on('action:newFile', () => this.newTab()); // Alias pro Sidebar
    eventBus.on('action:download', () => this.downloadFile());
    eventBus.on('action:downloadAll', () => this.downloadAllFiles());
    eventBus.on('action:downloadZip', () => this.exportProjectAsZip());
    eventBus.on('action:validate', () => this.validateCode());
    eventBus.on('action:minify', () => this.minifyCode());
    // Pozn: action:undo/redo handlery jsou v Editor.js
    eventBus.on('action:search', () => this.showSearch());

    // Nové akce - Nástroje a Nastavení
    eventBus.on('action:screenshot', () => this.takeScreenshot());
    eventBus.on('action:seo', () => this.analyzeSEO());
    eventBus.on('action:devices', () => this.showDevicesPanel());
    eventBus.on('settings:show', () => this.showSettingsModal());
    eventBus.on('action:publish', () => this.publishCode());

    // Nové akce pro správu tabů
    eventBus.on('action:closeTab', () => this.closeActiveTab());
    eventBus.on('action:closeOtherTabs', () => this.closeOtherTabs());
    eventBus.on('action:closeAllTabs', () => this.closeAllTabs());
    eventBus.on('action:saveAllTabs', () => this.saveAllTabs());
    eventBus.on('console:toggle', () => this.toggleConsole());
    eventBus.on('console:clear', () => this.clearConsole());
    eventBus.on('console:sendErrorsToAI', () => this.sendAllErrorsToAI());
    eventBus.on('preview:refresh', () => this.refreshPreview());

    // Sidebar tabs management
    eventBus.on('tabs:switch', ({ index }) => this.switchToTabByIndex(index));
    eventBus.on('tabs:close', ({ index }) => this.closeTabByIndex(index));

    // File management
    eventBus.on('file:new', () => this.newTab());
    eventBus.on('file:save', () => this.saveFile());
    eventBus.on('file:open', ({ fileId }) => this.openFile(fileId));
    eventBus.on('file:delete', ({ fileId }) => this.deleteFile(fileId));
    eventBus.on('file:createWithCode', ({ code }) => this.createFileWithCode(code));
    eventBus.on('file:create', ({ name, content }) => this.createFile(name, content));
    eventBus.on('action:exportZip', () => this.exportProjectAsZip());
    eventBus.on('github:project:loaded', ({ name, files }) => this.loadGitHubProject(name, files));

    // Editor actions
    eventBus.on('editor:setCode', ({ code }) => {
      if (this.editor) {
        this.editor.setCode(code);
      }
      if (this.preview) {
        this.preview.update(code);
      }
    });

    // Chybějící handlery - přidáno pro kompatibilitu
    eventBus.on('toast:show', ({ message, type = 'info', duration = 3000 }) => {
      toast[type]?.(message, duration) || toast.info(message, duration);
    });

    eventBus.on('editor:goToLine', ({ line }) => {
      if (this.editor && this.editor.goToLine) {
        this.editor.goToLine(line);
      } else if (this.editor && this.editor.textarea) {
        // Fallback - scroll to line
        const lines = this.editor.getCode().split('\n');
        let position = 0;
        for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
          position += lines[i].length + 1;
        }
        this.editor.textarea.setSelectionRange(position, position);
        this.editor.textarea.focus();
      }
    });

    eventBus.on('action:toggleConsole', () => this.toggleConsole());
  }

  setupConsoleListener() {
    // Listen for console messages from preview
    eventBus.on('console:message', ({ level, message, timestamp }) => {
      this.addConsoleMessage(level, message, timestamp);
    });

    // Listen for postMessage from preview iframe
    window.addEventListener('message', e => {
      if (e.data && e.data.type === 'console') {
        const { level, message, timestamp } = e.data;
        eventBus.emit('console:message', { level, message, timestamp });

        // Log to dev console too
        console[level](`[Preview] ${message}`);
      }
    });
  }

  addConsoleMessage(level, message, timestamp) {
    const consoleContent = document.getElementById('consoleContent');
    if (!consoleContent) return;

    const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    const messageDiv = document.createElement('div');
    messageDiv.className = `console-message console-${level}`;
    messageDiv.innerHTML = `
      <span class="console-timestamp">[${time}]</span>
      <span class="console-text">${this.escapeHTML(message)}</span>
      ${level === 'error' ? `<button class="console-fix-btn" data-error="${this.escapeHTML(message)}" title="Poslat tuto chybu AI k opravě">🤖 Opravit</button>` : ''}
    `;
    consoleContent.appendChild(messageDiv);

    // Add click handler for fix button
    if (level === 'error') {
      const fixBtn = messageDiv.querySelector('.console-fix-btn');
      if (fixBtn) {
        fixBtn.addEventListener('click', () => {
          this.sendErrorToAI(message);
        });
      }
    }

    // Auto-scroll to bottom
    consoleContent.scrollTop = consoleContent.scrollHeight;

    // Update error count for AI indicator - for all errors and warnings
    if (level === 'error' || level === 'warn') {
      this.updateErrorCount();
    }
  }

  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  setupErrorHandling() {
    // Error rate limiting - zabrání spamů stejných chyb
    const errorCache = new Map();
    const ERROR_THROTTLE_TIME = 5000; // 5 sekund

    const shouldShowError = (errorKey) => {
      const now = Date.now();
      const lastShown = errorCache.get(errorKey);

      if (!lastShown || now - lastShown > ERROR_THROTTLE_TIME) {
        errorCache.set(errorKey, now);
        return true;
      }
      return false;
    };

    // Globální chyby
    window.addEventListener('error', e => {
      const errorKey = `${e.message}:${e.filename}:${e.lineno}`;

      if (!shouldShowError(errorKey)) {
        console.warn('⚠️ Duplicitní chyba potlačena:', e.message);
        return;
      }

      console.error('Global error:', e.error);

      // Dev mode - ukáž stack trace
      if (state.get('ui.theme') === 'dark' || window.location.search.includes('debug')) {
        console.error('Stack trace:', e.error?.stack);
      }

      // User-friendly message
      const userMessage = this.getUserFriendlyError(e.error || e.message);
      toast.error(userMessage, 5000);

      // Log to state for error reporting
      this.logError({
        type: 'error',
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', e => {
      const errorKey = `promise:${e.reason}`;

      if (!shouldShowError(errorKey)) {
        console.warn('⚠️ Duplicitní promise rejection potlačena:', e.reason);
        return;
      }

      console.error('Unhandled rejection:', e.reason);

      // Dev mode
      if (state.get('ui.theme') === 'dark' || window.location.search.includes('debug')) {
        console.error('Promise stack:', e.reason?.stack);
      }

      const userMessage = this.getUserFriendlyError(e.reason);
      toast.error(`Promise chyba: ${userMessage}`, 5000);

      // Log to state
      this.logError({
        type: 'promise',
        message: e.reason?.message || String(e.reason),
        stack: e.reason?.stack,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Convert technical errors to user-friendly messages
   * @param {Error|string} error - Error object or message
   * @returns {string} User-friendly message
   */
  getUserFriendlyError(error) {
    const message = error?.message || String(error);

    // Common error patterns
    const patterns = [
      { pattern: /API key/i, message: '🔑 Chybí API klíč - nastavte ho v nastavení' },
      { pattern: /network/i, message: '🌐 Problém se sítí - zkontrolujte připojení' },
      { pattern: /timeout/i, message: '⏱️ Časový limit vypršel - zkuste znovu' },
      { pattern: /not a function/i, message: '🐛 Interní chyba - obnovte stránku' },
      { pattern: /Cannot read propert/i, message: '🐛 Chyba v kódu - zkontrolujte syntax' },
      { pattern: /fetch/i, message: '📡 Chyba při načítání dat' },
      { pattern: /JSON/i, message: '📄 Chyba formátu dat' },
      { pattern: /modal/i, message: '💬 Chyba dialogu - zkuste ho zavřít a otevřít znovu' }
    ];

    for (const { pattern, message: friendlyMsg } of patterns) {
      if (pattern.test(message)) {
        return friendlyMsg;
      }
    }

    // Generic fallback
    if (message.length > 100) {
      return '❌ Nastala chyba - zkuste obnovit stránku';
    }

    return `❌ ${message}`;
  }

  /**
   * Log error for debugging and potential reporting
   * @param {Object} errorInfo - Error information
   */
  logError(errorInfo) {
    // Get current error log
    const errorLog = state.get('debug.errors') || [];

    // Keep max 50 errors
    if (errorLog.length >= 50) {
      errorLog.shift();
    }

    errorLog.push(errorInfo);
    state.set('debug.errors', errorLog);

    // In dev mode, also show in console.table for easy debugging
    if (window.location.search.includes('debug')) {
      console.table([errorInfo]);
    }
  }

  sendErrorToAI(errorMessage) {
    // Get current code
    const code = state.get('editor.code') || '';
    const activeFile = state.get('files.active') || 'untitled.html';

    // Construct AI prompt
    const prompt = `Prosím, oprav následující chybu v mém kódu:

**Chyba:**
${errorMessage}

**Soubor:** ${activeFile}

**Aktuální kód:**
\`\`\`html
${code}
\`\`\`

Přepiš celý kód s opravou a vysvětli, co bylo špatně.`;

    // Open AI panel and send message
    eventBus.emit('ai:show');

    // Wait a bit for AI panel to open, then send message
    setTimeout(() => {
      eventBus.emit('ai:sendMessage', { message: prompt });
      toast.success('Chyba odeslána AI k opravě', 2000);
    }, 300);
  }

  sendAllErrorsToAI() {
    const consoleContent = document.getElementById('consoleContent');
    if (!consoleContent) return;

    // Collect all error messages
    const errorMessages = [];
    const errorElements = consoleContent.querySelectorAll('.console-error .console-text');
    errorElements.forEach(el => {
      errorMessages.push(el.textContent);
    });

    if (errorMessages.length === 0) {
      toast.info('Žádné chyby k odeslání', 2000);
      return;
    }

    // Get current code
    const code = state.get('editor.code') || '';
    const activeFile = state.get('files.active') || 'untitled.html';

    // Construct AI prompt with all errors
    const prompt = `Prosím, oprav následující chyby v mém kódu:

**Nalezené chyby (${errorMessages.length}):**
${errorMessages.map((err, i) => `${i + 1}. ${err}`).join('\n')}

**Soubor:** ${activeFile}

**Aktuální kód:**
\`\`\`html
${code}
\`\`\`

Přepiš celý kód s opravami všech chyb a vysvětli, co bylo špatně.`;

    // Open AI panel and send message
    eventBus.emit('ai:show');

    setTimeout(() => {
      eventBus.emit('ai:sendMessage', { message: prompt });
      toast.success(`${errorMessages.length} chyb odesláno AI k opravě`, 2000);
    }, 300);
  }

  switchView(view) {
    const app = document.querySelector('.app');
    if (!app) return;

    app.className = app.className.replace(/view-\w+/, '');
    app.classList.add(`view-${view}`);
    state.set('ui.view', view);

    eventBus.emit('view:changed', { view });
  }

  applyTheme(theme) {
    document.body.className = theme === 'light' ? 'light-theme' : '';
    localStorage.setItem('theme', theme);
    eventBus.emit('theme:changed', { theme });
  }

  async saveFile() {
    const code = state.get('editor.code');
    const activeFile = state.get('files.active');

    // Get filename
    let filename = 'untitled.html';
    if (activeFile) {
      const tabs = state.get('files.tabs');
      const tab = tabs.find(t => t.id === activeFile);
      if (tab) {
        filename = tab.name;
        // Update file content in memory too
        tab.content = code;
        tab.modified = false;
        state.set('files.tabs', tabs);
      }
    }

    // Try to extract filename from <title> tag in the HTML code
    try {
      const titleMatch = code.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        const pageTitle = titleMatch[1].trim();
        // Convert page title to valid filename (remove special chars, spaces -> dashes)
        const sanitizedTitle = pageTitle
          .toLowerCase()
          .replace(/[^a-z0-9\u00e1\u010d\u010f\u00e9\u011b\u00ed\u0148\u00f3\u0159\u0161\u0165\u00fa\u016f\u00fd\u017e\s-]/gi, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');

        if (sanitizedTitle) {
          filename = sanitizedTitle + '.html';
        }
      }
    } catch (e) {
      console.log('Could not extract title from HTML:', e);
    }

    // Download file
    try {
      const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Soubor ${filename} stažen`, 2000);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Chyba při stahování souboru', 3000);
    }
  }

  async formatCode() {
    const code = state.get('editor.code');
    if (!code) {
      toast.warning('Žádný kód k formátování', 2000);
      return;
    }

    try {
      toast.info('Formátuji kód...', 1500);

      // Simple HTML formatter
      let formatted = code;
      let indent = 0;
      const tab = '  '; // 2 spaces

      // Split by tags but keep content
      const tokens = code.split(/(<[^>]+>)/g).filter(t => t.trim());

      const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
      const inlineTags = ['a', 'span', 'strong', 'em', 'b', 'i', 'u', 'small', 'code', 'kbd', 'sub', 'sup'];
      const preserveWhitespace = ['pre', 'code', 'textarea', 'script', 'style'];

      let inPreserve = false;
      let preserveTag = '';
      let result = [];
      let currentLine = '';

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // Check for preserve whitespace tags
        const preserveStart = token.match(/<(pre|code|textarea|script|style)(\s|>)/i);
        const preserveEnd = token.match(/<\/(pre|code|textarea|script|style)>/i);

        if (preserveStart) {
          inPreserve = true;
          preserveTag = preserveStart[1].toLowerCase();
        }

        if (inPreserve) {
          currentLine += token;
          if (preserveEnd && preserveEnd[1].toLowerCase() === preserveTag) {
            inPreserve = false;
            preserveTag = '';
          }
          continue;
        }

        // Is it a tag?
        if (token.startsWith('<')) {
          const tagMatch = token.match(/<\/?(\w+)/);
          const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
          const isClosing = token.startsWith('</');
          const isSelfClosing = selfClosingTags.includes(tagName) || token.endsWith('/>');
          const isInline = inlineTags.includes(tagName);

          // Flush current line
          if (currentLine.trim()) {
            result.push(tab.repeat(indent) + currentLine.trim());
            currentLine = '';
          }

          if (isClosing) {
            indent = Math.max(0, indent - 1);
          }

          if (isInline && !isClosing) {
            currentLine += token;
          } else {
            result.push(tab.repeat(indent) + token);
          }

          if (!isClosing && !isSelfClosing && !isInline) {
            indent++;
          }
        } else {
          // Text content
          const trimmed = token.trim();
          if (trimmed) {
            if (currentLine) {
              currentLine += ' ' + trimmed;
            } else {
              currentLine = trimmed;
            }
          }
        }
      }

      // Flush remaining
      if (currentLine.trim()) {
        result.push(tab.repeat(indent) + currentLine.trim());
      }

      formatted = result.join('\n');

      // Clean up extra blank lines
      formatted = formatted.replace(/\n{3,}/g, '\n\n');

      // Update editor
      if (this.editor) {
        this.editor.setCode(formatted);
      }
      state.set('editor.code', formatted);

      // Update preview
      if (this.preview) {
        this.preview.update(formatted);
      }

      eventBus.emit('code:format', { code: formatted });
      toast.success('✨ Kód naformátován', 2000);
    } catch (error) {
      console.error('Format error:', error);
      toast.error('Chyba při formátování: ' + error.message, 3000);
    }
  }

  async copyCode() {
    const code = state.get('editor.code');

    try {
      await navigator.clipboard.writeText(code);
      toast.success('Kód zkopírován do schránky', 2000);
    } catch (error) {
      // Fallback pro starší prohlížeče
      try {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast.success('Kód zkopírován do schránky', 2000);
      } catch (fallbackError) {
        console.error('Copy error:', fallbackError);
        toast.error('Chyba při kopírování do schránky', 3000);
      }
    }
  }

  async validateCode() {
    const code = state.get('editor.code');
    if (!code) {
      toast.warning('Žádný kód k validaci', 2000);
      return;
    }

    toast.info('Validace kódu...', 1500);

    const errors = [];
    const warnings = [];

    // Basic HTML structure validation
    const hasDoctype = /<!DOCTYPE\s+html>/i.test(code);
    const hasHtmlTag = /<html[^>]*>/i.test(code);
    const hasHeadTag = /<head[^>]*>/i.test(code);
    const hasBodyTag = /<body[^>]*>/i.test(code);
    const hasTitleTag = /<title[^>]*>/i.test(code);
    const hasMetaCharset = /<meta[^>]*charset[^>]*>/i.test(code);
    const hasMetaViewport = /<meta[^>]*viewport[^>]*>/i.test(code);

    if (!hasDoctype) errors.push('❌ Chybí DOCTYPE deklarace');
    if (!hasHtmlTag) errors.push('❌ Chybí <html> tag');
    if (!hasHeadTag) errors.push('❌ Chybí <head> tag');
    if (!hasBodyTag) errors.push('❌ Chybí <body> tag');
    if (!hasTitleTag) warnings.push('⚠️ Chybí <title> tag');
    if (!hasMetaCharset) warnings.push('⚠️ Chybí meta charset');
    if (!hasMetaViewport) warnings.push('⚠️ Chybí meta viewport');

    // Check for unclosed tags
    const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
    const tagPattern = /<(\w+)[^>]*>/gi;
    const closingTagPattern = /<\/(\w+)>/gi;

    const openTags = {};
    const closedTags = {};

    let match;
    while ((match = tagPattern.exec(code)) !== null) {
      const tag = match[1].toLowerCase();
      if (!selfClosingTags.includes(tag)) {
        openTags[tag] = (openTags[tag] || 0) + 1;
      }
    }
    while ((match = closingTagPattern.exec(code)) !== null) {
      const tag = match[1].toLowerCase();
      closedTags[tag] = (closedTags[tag] || 0) + 1;
    }

    for (const tag in openTags) {
      const opened = openTags[tag] || 0;
      const closed = closedTags[tag] || 0;
      if (opened > closed) {
        warnings.push(`⚠️ Možná neuzavřený tag <${tag}> (${opened} otevřených, ${closed} uzavřených)`);
      }
    }

    // Check for images without alt
    const imgWithoutAlt = /<img(?![^>]*\balt\s*=)[^>]*>/gi;
    if (imgWithoutAlt.test(code)) {
      warnings.push('⚠️ Některé <img> nemají atribut alt (přístupnost)');
    }

    // Check for inline styles (code quality)
    const inlineStyles = code.match(/style\s*=\s*["'][^"']+["']/gi);
    if (inlineStyles && inlineStyles.length > 3) {
      warnings.push(`⚠️ Mnoho inline stylů (${inlineStyles.length}x) - zvažte použití CSS`);
    }

    // Show results
    const totalIssues = errors.length + warnings.length;

    if (totalIssues === 0) {
      toast.success('✅ HTML je validní! Žádné problémy nenalezeny.', 3000);
    } else {
      const allMessages = [...errors, ...warnings];
      const resultHtml = `
        <div style="text-align: left; max-height: 300px; overflow-y: auto;">
          <h3 style="margin: 0 0 12px 0;">${errors.length > 0 ? '❌' : '⚠️'} Výsledek validace</h3>
          <p style="margin: 0 0 12px 0; opacity: 0.7;">Nalezeno ${errors.length} chyb a ${warnings.length} varování</p>
          <div style="font-size: 14px; line-height: 1.6;">
            ${allMessages.map(msg => `<div style="padding: 4px 0;">${msg}</div>`).join('')}
          </div>
        </div>
      `;
      this.showResultModal('Validace HTML', resultHtml);
    }
  }

  async minifyCode() {
    const code = state.get('editor.code');
    if (!code) {
      toast.warning('Žádný kód k minifikaci', 2000);
      return;
    }

    toast.info('Minifikace kódu...', 1500);

    try {
      // Simple HTML minification
      let minified = code
        // Remove HTML comments (but not IE conditionals)
        .replace(/<!--(?!\[)[\s\S]*?(?!])-->/g, '')
        // Remove whitespace between tags
        .replace(/>\s+</g, '><')
        // Remove leading/trailing whitespace on lines
        .replace(/^\s+|\s+$/gm, '')
        // Collapse multiple spaces to single space
        .replace(/\s{2,}/g, ' ')
        // Remove newlines
        .replace(/\n/g, '')
        // Minify inline CSS
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
          const minCss = css
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove CSS comments
            .replace(/\s*{\s*/g, '{')
            .replace(/\s*}\s*/g, '}')
            .replace(/\s*:\s*/g, ':')
            .replace(/\s*;\s*/g, ';')
            .replace(/;\}/g, '}')
            .trim();
          return `<style>${minCss}</style>`;
        })
        // Minify inline JavaScript
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (match, js) => {
          if (match.includes('src=')) return match; // Don't modify external scripts
          const minJs = js
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
            .replace(/\/\/[^\n]*/g, '') // Remove line comments
            .replace(/\s*([=+\-*/%<>!&|,;{}()])\s*/g, '$1')
            .trim();
          return `<script>${minJs}</script>`;
        });

      const originalSize = new Blob([code]).size;
      const minifiedSize = new Blob([minified]).size;
      const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

      // Update editor
      if (this.editor) {
        this.editor.setCode(minified);
      }
      state.set('editor.code', minified);

      // Update preview
      if (this.preview) {
        this.preview.update(minified);
      }

      toast.success(`✅ Minifikováno! Ušetřeno ${savings}% (${originalSize - minifiedSize} bajtů)`, 4000);
    } catch (error) {
      console.error('Minification error:', error);
      toast.error('Chyba při minifikaci: ' + error.message, 3000);
    }
  }

  /**
   * Zobrazí modal s výsledky
   */
  showResultModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'result-modal-overlay';
    modal.innerHTML = `
      <div class="result-modal">
        <div class="result-modal-header">
          <h2>${title}</h2>
          <button class="result-modal-close">×</button>
        </div>
        <div class="result-modal-content">
          ${content}
        </div>
        <div class="result-modal-footer">
          <button class="btn-primary result-modal-ok">OK</button>
        </div>
      </div>
    `;

    // Styles
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6); display: flex; align-items: center;
      justify-content: center; z-index: 10000;
    `;
    const modalBox = modal.querySelector('.result-modal');
    modalBox.style.cssText = `
      background: var(--bg-primary, #1e1e1e); border-radius: 12px;
      padding: 20px; max-width: 500px; width: 90%; color: var(--text-primary, #fff);
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    `;
    modal.querySelector('.result-modal-header').style.cssText = `
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    `;
    modal.querySelector('h2').style.cssText = 'margin: 0; font-size: 18px;';
    modal.querySelector('.result-modal-close').style.cssText = `
      background: none; border: none; font-size: 24px; cursor: pointer; color: inherit; opacity: 0.7;
    `;
    modal.querySelector('.result-modal-footer').style.cssText = `
      margin-top: 20px; text-align: right;
    `;
    modal.querySelector('.btn-primary').style.cssText = `
      background: var(--accent, #007acc); color: white; border: none;
      padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 14px;
    `;

    // Close handlers
    const close = () => modal.remove();
    modal.querySelector('.result-modal-close').onclick = close;
    modal.querySelector('.result-modal-ok').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    document.body.appendChild(modal);
  }

  /**
   * Pořídí screenshot náhledu
   */
  async takeScreenshot() {
    toast.info('Pořizuji screenshot...', 1500);

    const previewFrame = document.querySelector('#previewContainer iframe');
    if (!previewFrame) {
      toast.error('Náhled není k dispozici', 2000);
      return;
    }

    // Zkontroluj, zda je contentDocument přístupný
    let contentDoc;
    try {
      contentDoc = previewFrame.contentDocument || previewFrame.contentWindow?.document;
    } catch (e) {
      // Cross-origin restriction
      contentDoc = null;
    }

    if (!contentDoc || !contentDoc.body) {
      // Fallback - použij aktuální kód z editoru
      const code = state.get('editor.code');
      if (!code) {
        toast.error('Žádný obsah k zachycení', 2000);
        return;
      }

      // Vytvoř data URL a stáhni jako HTML
      const blob = new Blob([code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'preview.html';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('📄 HTML staženo (screenshot není dostupný)', 2000);
      return;
    }

    try {
      // Zkusíme použít html2canvas pokud je k dispozici
      if (typeof html2canvas !== 'undefined') {
        const canvas = await html2canvas(contentDoc.body, {
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        // Stáhnout jako obrázek
        const link = document.createElement('a');
        link.download = 'screenshot.png';
        link.href = canvas.toDataURL('image/png');
        link.click();

        toast.success('📸 Screenshot stažen!', 2000);
      } else {
        // Fallback - zkopírovat HTML do schránky
        const html = contentDoc.documentElement.outerHTML;
        await navigator.clipboard.writeText(html);
        toast.info('📋 HTML zkopírováno (html2canvas není k dispozici)', 3000);
      }
    } catch (error) {
      console.error('Screenshot error:', error);

      // Poslední fallback - stáhni HTML z editoru
      const code = state.get('editor.code');
      if (code) {
        const blob = new Blob([code], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'preview.html';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('📄 HTML staženo jako alternativa', 2000);
      } else {
        toast.error('Chyba při pořizování screenshotu', 2000);
      }
    }
  }

  /**
   * Analyzuje SEO stránky
   */
  analyzeSEO() {
    const code = state.get('editor.code');
    if (!code) {
      toast.warning('Žádný kód k analýze', 2000);
      return;
    }

    const results = [];
    let score = 100;

    // Check title
    const titleMatch = code.match(/<title[^>]*>(.*?)<\/title>/i);
    if (!titleMatch) {
      results.push({ type: 'error', text: '❌ Chybí title tag' });
      score -= 15;
    } else if (titleMatch[1].length < 30) {
      results.push({ type: 'warning', text: '⚠️ Title je příliš krátký (doporučeno 50-60 znaků)' });
      score -= 5;
    } else if (titleMatch[1].length > 60) {
      results.push({ type: 'warning', text: '⚠️ Title je příliš dlouhý (doporučeno 50-60 znaků)' });
      score -= 5;
    } else {
      results.push({ type: 'success', text: '✅ Title je v pořádku' });
    }

    // Check meta description
    const descMatch = code.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    if (!descMatch) {
      results.push({ type: 'error', text: '❌ Chybí meta description' });
      score -= 15;
    } else if (descMatch[1].length < 120) {
      results.push({ type: 'warning', text: '⚠️ Meta description je krátký (doporučeno 150-160 znaků)' });
      score -= 5;
    } else {
      results.push({ type: 'success', text: '✅ Meta description je v pořádku' });
    }

    // Check headings
    const h1Count = (code.match(/<h1[^>]*>/gi) || []).length;
    if (h1Count === 0) {
      results.push({ type: 'error', text: '❌ Chybí H1 nadpis' });
      score -= 10;
    } else if (h1Count > 1) {
      results.push({ type: 'warning', text: `⚠️ Více než jeden H1 nadpis (${h1Count}x)` });
      score -= 5;
    } else {
      results.push({ type: 'success', text: '✅ Jeden H1 nadpis' });
    }

    // Check images alt
    const images = code.match(/<img[^>]*>/gi) || [];
    const imagesWithoutAlt = images.filter(img => !img.includes('alt=')).length;
    if (imagesWithoutAlt > 0) {
      results.push({ type: 'warning', text: `⚠️ ${imagesWithoutAlt} obrázků bez alt textu` });
      score -= imagesWithoutAlt * 3;
    } else if (images.length > 0) {
      results.push({ type: 'success', text: '✅ Všechny obrázky mají alt text' });
    }

    // Check meta viewport
    if (!/<meta[^>]*viewport/i.test(code)) {
      results.push({ type: 'warning', text: '⚠️ Chybí meta viewport (mobilní optimalizace)' });
      score -= 10;
    } else {
      results.push({ type: 'success', text: '✅ Meta viewport je nastaven' });
    }

    // Check canonical
    if (!/<link[^>]*rel=["']canonical["']/i.test(code)) {
      results.push({ type: 'info', text: 'ℹ️ Zvažte přidání canonical URL' });
    }

    // Check Open Graph
    if (!/<meta[^>]*property=["']og:/i.test(code)) {
      results.push({ type: 'info', text: 'ℹ️ Chybí Open Graph tagy (sdílení na sociálních sítích)' });
    }

    score = Math.max(0, score);
    const scoreColor = score >= 80 ? '#4caf50' : score >= 50 ? '#ff9800' : '#f44336';

    const content = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 48px; font-weight: bold; color: ${scoreColor};">${score}</div>
        <div style="opacity: 0.7;">SEO skóre</div>
      </div>
      <div style="text-align: left; max-height: 300px; overflow-y: auto;">
        ${results.map(r => `
          <div style="padding: 8px 0; border-bottom: 1px solid var(--border, #333);">
            ${r.text}
          </div>
        `).join('')}
      </div>
    `;

    this.showResultModal('🔍 SEO Analýza', content);
  }

  /**
   * Zobrazí panel pro výběr zařízení (responsivní náhled)
   */
  showDevicesPanel() {
    const devices = [
      { name: 'iPhone SE', width: 375, height: 667, icon: '📱' },
      { name: 'iPhone 14', width: 390, height: 844, icon: '📱' },
      { name: 'iPhone 14 Pro Max', width: 430, height: 932, icon: '📱' },
      { name: 'iPad Mini', width: 768, height: 1024, icon: '📱' },
      { name: 'iPad Pro', width: 1024, height: 1366, icon: '📱' },
      { name: 'Android Small', width: 360, height: 640, icon: '📱' },
      { name: 'Android Large', width: 412, height: 915, icon: '📱' },
      { name: 'Laptop', width: 1366, height: 768, icon: '💻' },
      { name: 'Desktop', width: 1920, height: 1080, icon: '🖥️' },
      { name: 'Responzivní (100%)', width: 0, height: 0, icon: '🔄' }
    ];

    const content = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;">
        ${devices.map(d => `
          <button class="device-btn" data-width="${d.width}" data-height="${d.height}"
            style="padding: 16px; border: 1px solid var(--border, #333); border-radius: 8px;
            background: var(--bg-secondary, #2d2d2d); cursor: pointer; text-align: center;
            transition: all 0.2s; color: inherit;">
            <div style="font-size: 24px; margin-bottom: 8px;">${d.icon}</div>
            <div style="font-weight: 500;">${d.name}</div>
            ${d.width ? `<div style="font-size: 12px; opacity: 0.6;">${d.width}×${d.height}</div>` : ''}
          </button>
        `).join('')}
      </div>
    `;

    this.showResultModal('📱 Náhled na zařízení', content);

    // Attach event listeners
    setTimeout(() => {
      document.querySelectorAll('.device-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const width = parseInt(btn.dataset.width);
          const height = parseInt(btn.dataset.height);
          this.setPreviewSize(width, height);
          document.querySelector('.result-modal-overlay')?.remove();
        });
        btn.addEventListener('mouseenter', () => {
          btn.style.background = 'var(--accent, #007acc)';
          btn.style.borderColor = 'var(--accent, #007acc)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'var(--bg-secondary, #2d2d2d)';
          btn.style.borderColor = 'var(--border, #333)';
        });
      });
    }, 100);
  }

  /**
   * Nastaví velikost náhledu
   */
  setPreviewSize(width, height) {
    const preview = document.querySelector('#previewContainer');
    const iframe = preview?.querySelector('iframe');

    if (!preview || !iframe) {
      toast.error('Náhled není k dispozici', 2000);
      return;
    }

    if (width === 0) {
      // Responzivní - plná šířka
      preview.style.maxWidth = '';
      preview.style.margin = '';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      toast.success('🔄 Responzivní režim', 2000);
    } else {
      preview.style.maxWidth = width + 'px';
      preview.style.margin = '0 auto';
      iframe.style.width = width + 'px';
      iframe.style.height = height + 'px';
      toast.success(`📱 Náhled: ${width}×${height}px`, 2000);
    }
  }

  /**
   * Zobrazí modal s nastavením aplikace
   */
  showSettingsModal() {
    const currentTheme = state.get('ui.theme') || 'dark';
    const autoSave = localStorage.getItem('autoSave') === 'true';
    const fontSize = localStorage.getItem('editorFontSize') || '14';

    const content = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div class="setting-group">
          <label style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border, #333);">
            <span>🎨 Téma</span>
            <select id="settingTheme" style="padding: 8px 12px; border-radius: 6px; background: var(--bg-secondary); border: 1px solid var(--border); color: inherit;">
              <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Tmavé</option>
              <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Světlé</option>
            </select>
          </label>

          <label style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border, #333);">
            <span>💾 Automatické ukládání</span>
            <input type="checkbox" id="settingAutoSave" ${autoSave ? 'checked' : ''}
              style="width: 20px; height: 20px; cursor: pointer;">
          </label>

          <label style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border, #333);">
            <span>🔤 Velikost písma editoru</span>
            <select id="settingFontSize" style="padding: 8px 12px; border-radius: 6px; background: var(--bg-secondary); border: 1px solid var(--border); color: inherit;">
              <option value="12" ${fontSize === '12' ? 'selected' : ''}>12px</option>
              <option value="14" ${fontSize === '14' ? 'selected' : ''}>14px</option>
              <option value="16" ${fontSize === '16' ? 'selected' : ''}>16px</option>
              <option value="18" ${fontSize === '18' ? 'selected' : ''}>18px</option>
              <option value="20" ${fontSize === '20' ? 'selected' : ''}>20px</option>
            </select>
          </label>

          <label style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0;">
            <span>🗑️ Vymazat lokální data</span>
            <button id="settingClearData" style="padding: 8px 16px; border-radius: 6px; background: #f44336; border: none; color: white; cursor: pointer;">
              Vymazat
            </button>
          </label>
        </div>
      </div>
    `;

    this.showResultModal('⚙️ Nastavení', content);

    // Attach event listeners
    setTimeout(() => {
      document.getElementById('settingTheme')?.addEventListener('change', (e) => {
        const theme = e.target.value;
        state.set('ui.theme', theme);
        this.applyTheme(theme);
        toast.success(`Téma změněno na ${theme === 'dark' ? 'tmavé' : 'světlé'}`, 2000);
      });

      document.getElementById('settingAutoSave')?.addEventListener('change', (e) => {
        localStorage.setItem('autoSave', e.target.checked);
        toast.success(`Automatické ukládání ${e.target.checked ? 'zapnuto' : 'vypnuto'}`, 2000);
      });

      document.getElementById('settingFontSize')?.addEventListener('change', (e) => {
        const size = e.target.value;
        localStorage.setItem('editorFontSize', size);
        document.documentElement.style.setProperty('--editor-font-size', size + 'px');
        if (this.editor && this.editor.cm) {
          // Aktualizovat CodeMirror font size
          this.editor.cm.getWrapperElement().style.fontSize = size + 'px';
          this.editor.cm.refresh();
        }
        toast.success(`Velikost písma: ${size}px`, 2000);
      });

      document.getElementById('settingClearData')?.addEventListener('click', () => {
        if (confirm('Opravdu chcete vymazat všechna lokální data? Tato akce je nevratná!')) {
          localStorage.clear();
          sessionStorage.clear();
          toast.success('Data vymazána. Stránka se obnoví...', 2000);
          setTimeout(() => location.reload(), 2000);
        }
      });
    }, 100);
  }

  /**
   * Publikuje kód (exportuje nebo sdílí)
   */
  publishCode() {
    const code = state.get('editor.code');
    if (!code) {
      toast.warning('Žádný kód k publikaci', 2000);
      return;
    }

    const content = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <button class="publish-option" data-action="download" style="display: flex; align-items: center; gap: 12px; padding: 16px; border: 1px solid var(--border, #333); border-radius: 8px; background: var(--bg-secondary, #2d2d2d); cursor: pointer; text-align: left; color: inherit; transition: all 0.2s;">
          <span style="font-size: 24px;">⬇️</span>
          <div>
            <div style="font-weight: 500;">Stáhnout HTML</div>
            <div style="font-size: 12px; opacity: 0.6;">Uloží jako .html soubor</div>
          </div>
        </button>

        <button class="publish-option" data-action="zip" style="display: flex; align-items: center; gap: 12px; padding: 16px; border: 1px solid var(--border, #333); border-radius: 8px; background: var(--bg-secondary, #2d2d2d); cursor: pointer; text-align: left; color: inherit; transition: all 0.2s;">
          <span style="font-size: 24px;">📦</span>
          <div>
            <div style="font-weight: 500;">Stáhnout jako ZIP</div>
            <div style="font-size: 12px; opacity: 0.6;">Všechny soubory v archivu</div>
          </div>
        </button>

        <button class="publish-option" data-action="copy" style="display: flex; align-items: center; gap: 12px; padding: 16px; border: 1px solid var(--border, #333); border-radius: 8px; background: var(--bg-secondary, #2d2d2d); cursor: pointer; text-align: left; color: inherit; transition: all 0.2s;">
          <span style="font-size: 24px;">📋</span>
          <div>
            <div style="font-weight: 500;">Kopírovat kód</div>
            <div style="font-size: 12px; opacity: 0.6;">Zkopíruje do schránky</div>
          </div>
        </button>

        <button class="publish-option" data-action="dataurl" style="display: flex; align-items: center; gap: 12px; padding: 16px; border: 1px solid var(--border, #333); border-radius: 8px; background: var(--bg-secondary, #2d2d2d); cursor: pointer; text-align: left; color: inherit; transition: all 0.2s;">
          <span style="font-size: 24px;">🔗</span>
          <div>
            <div style="font-weight: 500;">Data URL</div>
            <div style="font-size: 12px; opacity: 0.6;">Vytvoří sdílitelný odkaz</div>
          </div>
        </button>

        <button class="publish-option" data-action="github" style="display: flex; align-items: center; gap: 12px; padding: 16px; border: 1px solid var(--border, #333); border-radius: 8px; background: var(--bg-secondary, #2d2d2d); cursor: pointer; text-align: left; color: inherit; transition: all 0.2s;">
          <span style="font-size: 24px;">🐙</span>
          <div>
            <div style="font-weight: 500;">Nahrát na GitHub</div>
            <div style="font-size: 12px; opacity: 0.6;">Commit do repozitáře</div>
          </div>
        </button>
      </div>
    `;

    this.showResultModal('🚀 Publikovat', content);

    // Attach event listeners
    setTimeout(() => {
      document.querySelectorAll('.publish-option').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
          btn.style.background = 'var(--accent, #007acc)';
          btn.style.borderColor = 'var(--accent, #007acc)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'var(--bg-secondary, #2d2d2d)';
          btn.style.borderColor = 'var(--border, #333)';
        });
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          document.querySelector('.result-modal-overlay')?.remove();

          switch (action) {
            case 'download':
              this.downloadFile();
              break;
            case 'zip':
              this.exportProjectAsZip();
              break;
            case 'copy':
              this.copyCode();
              break;
            case 'dataurl':
              this.createDataUrl();
              break;
            case 'github':
              eventBus.emit('sidebar:toggle');
              toast.info('Otevřete GitHub panel pro nahrání', 2000);
              break;
          }
        });
      });
    }, 100);
  }

  /**
   * Vytvoří data URL pro sdílení
   */
  createDataUrl() {
    const code = state.get('editor.code');
    if (!code) {
      toast.warning('Žádný kód', 2000);
      return;
    }

    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(code);

    // Zkopírovat do schránky
    navigator.clipboard.writeText(dataUrl).then(() => {
      toast.success('📋 Data URL zkopírována do schránky!', 3000);
    }).catch(() => {
      // Fallback - zobrazit v modalu
      this.showResultModal('🔗 Data URL', `
        <p style="margin-bottom: 12px;">Zkopírujte tento odkaz:</p>
        <textarea style="width: 100%; height: 100px; padding: 8px; font-family: monospace; font-size: 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 4px; color: inherit; resize: none;">${dataUrl}</textarea>
      `);
    });
  }

  newTab() {
    const code = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nový dokument</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <h1>Nový dokument</h1>
  <p>Začněte psát zde...</p>
</body>
</html>`;

    // Create new tab
    const tabs = state.get('files.tabs') || [];
    const nextId = state.get('files.nextId') || 1;
    const newTab = {
      id: nextId,
      name: `dokument-${nextId}.html`,
      content: code,
      modified: false,
      type: 'html'
    };

    tabs.push(newTab);
    state.set('files.tabs', tabs);
    state.set('files.nextId', nextId + 1);
    state.set('files.active', nextId);

    // Set new content
    state.set('editor.code', code);
    if (this.editor) {
      this.editor.setCode(code);
      this.editor.focus();
    }

    // Update preview
    if (this.preview) {
      this.preview.update(code);
    }

    // Update file list in sidebar
    eventBus.emit('files:changed');

    toast.success('Nový soubor vytvořen', 2000);
  }

  downloadFile() {
    const code = state.get('editor.code');
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Soubor stažen', 2000);
  }

  openFile(fileId) {
    const tabs = state.get('files.tabs') || [];
    const tab = tabs.find(t => t.id === fileId);

    if (!tab) {
      toast.error('Soubor nenalezen', 2000);
      return;
    }

    // Set as active file
    state.set('files.active', fileId);

    // Zobrazit obrázky v preview
    if (tab.content && tab.content.startsWith('[Image:')) {
      const base64 = tab.content.replace('[Image:', '').replace(']', '');
      if (this.preview) {
        const imageHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 20px; background: #f0f0f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    img { max-width: 100%; max-height: 90vh; box-shadow: 0 4px 20px rgba(0,0,0,0.1); background: white; padding: 10px; }
  </style>
</head>
<body>
  <img src="${base64}" alt="${tab.name}">
</body>
</html>`;
        this.preview.update(imageHtml);
      }

      // Vyčistit editor
      if (this.editor) {
        this.editor.setCode(`// Obrázek: ${tab.name}\n// Zobrazeno v náhledu →`, true);
      }
      return;
    }

    // Zakázat otevírání ostatních binárních souborů
    if (tab.content && tab.content.startsWith('[Binary file:')) {
      toast.warning('Binární soubory nelze editovat', 2000);
      if (this.editor) {
        this.editor.setCode(`// Binární soubor: ${tab.name}\n// Tento typ souboru nelze editovat`, true);
      }
      return;
    }

    // Load content to editor (pouze pokud se změnil)
    const currentCode = state.get('editor.code');
    if (currentCode !== tab.content) {
      if (this.editor) {
        this.editor.setCode(tab.content, true); // Skip state update to prevent loop
      }

      // Then update state
      state.set('editor.code', tab.content);

      // Update preview pouze pro HTML
      if (this.preview && (tab.type === 'html' || tab.name.endsWith('.html'))) {
        this.preview.update(tab.content);
      }
    }

    // Add to recent files
    this.addToRecentFiles(tab.name, fileId);

    toast.success(`Otevřen: ${tab.name}`, 1500);
  }

  deleteFile(fileId) {
    const tabs = state.get('files.tabs') || [];
    const tab = tabs.find(t => t.id === fileId);

    if (!tab) {
      return;
    }

    // Confirm deletion
    if (!confirm(`Opravdu chcete smazat soubor "${tab.name}"?`)) {
      return;
    }

    // Remove from tabs
    const newTabs = tabs.filter(t => t.id !== fileId);
    state.set('files.tabs', newTabs);

    // If deleted file was active, open another
    const activeId = state.get('files.active');
    if (activeId === fileId) {
      if (newTabs.length > 0) {
        // Open the first remaining file
        this.openFile(newTabs[0].id);
      } else {
        // No files left, create new one
        state.set('files.active', null);
        state.set('editor.code', '');
        if (this.editor) {
          this.editor.setCode('');
        }
        if (this.preview) {
          this.preview.clear();
        }
      }
    }

    eventBus.emit('files:changed');
    toast.success(`Soubor smazán: ${tab.name}`, 2000);
  }

  createFileWithCode(code) {
    // Extract title from code if possible
    const titleMatch = code.match(/<title>(.*?)<\/title>/i);
    let fileName = 'novy-soubor.html';

    if (titleMatch && titleMatch[1]) {
      // Convert title to filename
      fileName = titleMatch[1]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + '.html';
    }

    this.createFile(fileName, code);
  }

  createFile(fileName, content) {
    // Create new tab
    const tabs = state.get('files.tabs') || [];
    const nextId = state.get('files.nextId') || 1;
    const newTab = {
      id: nextId,
      name: fileName,
      content: content,
      modified: false,
      type: fileName.endsWith('.html') ? 'html' : 'text'
    };

    tabs.push(newTab);
    state.set('files.tabs', tabs);
    state.set('files.nextId', nextId + 1);
    state.set('files.active', nextId);

    // Set content in editor
    state.set('editor.code', content);
    if (this.editor) {
      this.editor.setCode(content);
      this.editor.focus();
    }

    // Update preview
    if (this.preview) {
      this.preview.update(content);
    }

    // Update file list in sidebar
    eventBus.emit('files:changed');

    toast.success(`Nový soubor vytvořen: ${fileName}`, 2000);
  }

  loadGitHubProject(projectName, files) {
    console.log(`📦 Loading GitHub project: ${projectName}`, files);

    const tabs = [];
    let nextId = state.get('files.nextId') || 1;
    let htmlFileId = null;

    // Vytvořit taby pro všechny soubory
    files.forEach(file => {
      const tab = {
        id: nextId,
        name: file.name,
        content: file.content,
        modified: false,
        type: this.getFileType(file.name),
        path: file.name // Zachovat cestu pro složky
      };

      tabs.push(tab);

      // Najít první HTML soubor (priorita: index.html)
      if (!htmlFileId && file.name.endsWith('.html')) {
        if (file.name === 'index.html' || file.name.endsWith('/index.html')) {
          htmlFileId = nextId;
        } else if (!htmlFileId) {
          htmlFileId = nextId;
        }
      }

      nextId++;
    });

    // Nastavit soubory do state
    state.set('files.tabs', tabs);
    state.set('files.nextId', nextId);
    state.set('files.active', htmlFileId || (tabs.length > 0 ? tabs[0].id : null));

    // Otevřít pouze HTML soubor do editoru
    if (htmlFileId) {
      const activeTab = tabs.find(t => t.id === htmlFileId);
      if (activeTab) {
        // Update editor a preview bez triggeru state změn (zabránění infinite loop)
        if (this.editor) {
          this.editor.setCode(activeTab.content, true); // Skip state update
        }

        // Pak nastavit state
        state.set('editor.code', activeTab.content);

        if (this.preview && activeTab.type === 'html') {
          this.preview.update(activeTab.content);
        }
      }
    }

    // Zobrazit sidebar s projektem
    eventBus.emit('sidebar:show');
    eventBus.emit('files:changed');

    toast.success(`✅ GitHub projekt načten: ${projectName} (${files.length} souborů)`, 3000);
  }

  getFileType(fileName) {
    if (fileName.endsWith('.html') || fileName.endsWith('.htm')) return 'html';
    if (fileName.endsWith('.css')) return 'css';
    if (fileName.endsWith('.js')) return 'javascript';
    if (fileName.endsWith('.json')) return 'json';
    if (fileName.endsWith('.md')) return 'markdown';
    return 'text';
  }

  downloadAllFiles() {
    // Get all open files
    const tabs = state.get('files.tabs') || [];

    if (tabs.length === 0) {
      toast.error('Nejsou žádné otevřené soubory k exportu', 3000);
      return;
    }

    try {
      // If only one file, download it directly
      if (tabs.length === 1) {
        const tab = tabs[0];
        const blob = new Blob([tab.content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = tab.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('✅ Soubor stažen', 2000);
        return;
      }

      // For multiple files, download all files with delay
      const downloadToast = toast.info('📥 Stahování ' + tabs.length + ' souborů...', 0);

      tabs.forEach((tab, index) => {
        setTimeout(() => {
          const blob = new Blob([tab.content], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = tab.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          if (index === tabs.length - 1) {
            if (downloadToast && downloadToast.hide) downloadToast.hide();
            toast.success(`✅ ${tabs.length} souborů staženo`, 1500);
          }
        }, index * 300); // Stagger downloads
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Chyba při exportu souborů', 3000);
    }
  }

  exportProjectAsZip() {
    // Get all open files
    const tabs = state.get('files.tabs') || [];

    if (tabs.length === 0) {
      toast.error('Nejsou žádné otevřené soubory k exportu', 3000);
      return;
    }

    console.log('ZIP Export started, files:', tabs.length);

    try {
      const zipToast = toast.info('📦 Připravuji ZIP archiv...', 0);

      // Create a simple ZIP file using browser APIs
      const zip = this.createZipBlob(tabs);

      console.log('ZIP blob created:', zip ? zip.size + ' bytes' : 'null');

      if (!zip) {
        throw new Error('Failed to create ZIP blob');
      }

      const url = URL.createObjectURL(zip);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project.zip';
      a.style.display = 'none';
      document.body.appendChild(a);

      // Force download with timeout for mobile
      setTimeout(() => {
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      }, 100);

      if (zipToast && zipToast.hide) zipToast.hide();
      toast.success(`✅ ZIP archiv stažen (${tabs.length} souborů)`, 1500);
    } catch (error) {
      console.error('ZIP export error:', error);
      if (zipToast && zipToast.hide) zipToast.hide();
      toast.error('ZIP selhal, stahování souborů...', 2000);
      // Fallback to individual downloads
      this.downloadAllFiles();
    }
  }

  createZipBlob(files) {
    try {
      // Simple ZIP file creation without external library
      // This creates a basic ZIP structure that works with standard unzip tools

      const encoder = new TextEncoder();
      const chunks = [];
      const centralDirectory = [];
      let offset = 0;

      files.forEach(file => {
        const filename = file.name;
        const content = encoder.encode(file.content);
        const crc32 = this.calculateCRC32(content);

      // Local file header
      const localHeader = new Uint8Array(30 + filename.length);
      const view = new DataView(localHeader.buffer);

      // Signature
      view.setUint32(0, 0x04034b50, true);
      // Version needed
      view.setUint16(4, 20, true);
      // Flags
      view.setUint16(6, 0, true);
      // Compression (0 = no compression)
      view.setUint16(8, 0, true);
      // Mod time
      view.setUint16(10, 0, true);
      // Mod date
      view.setUint16(12, 0, true);
      // CRC32
      view.setUint32(14, crc32, true);
      // Compressed size
      view.setUint32(18, content.length, true);
      // Uncompressed size
      view.setUint32(22, content.length, true);
      // Filename length
      view.setUint16(26, filename.length, true);
      // Extra field length
      view.setUint16(28, 0, true);

      // Filename
      const filenameBytes = encoder.encode(filename);
      localHeader.set(filenameBytes, 30);

      chunks.push(localHeader);
      chunks.push(content);

      // Store central directory entry
      centralDirectory.push({
        filename,
        crc32,
        size: content.length,
        offset
      });

      offset += localHeader.length + content.length;
    });

    // Central directory
    const centralDirStart = offset;
    centralDirectory.forEach(entry => {
      const header = new Uint8Array(46 + entry.filename.length);
      const view = new DataView(header.buffer);

      // Signature
      view.setUint32(0, 0x02014b50, true);
      // Version made by
      view.setUint16(4, 20, true);
      // Version needed
      view.setUint16(6, 20, true);
      // Flags
      view.setUint16(8, 0, true);
      // Compression
      view.setUint16(10, 0, true);
      // Mod time
      view.setUint16(12, 0, true);
      // Mod date
      view.setUint16(14, 0, true);
      // CRC32
      view.setUint32(16, entry.crc32, true);
      // Compressed size
      view.setUint32(20, entry.size, true);
      // Uncompressed size
      view.setUint32(24, entry.size, true);
      // Filename length
      view.setUint16(28, entry.filename.length, true);
      // Extra field length
      view.setUint16(30, 0, true);
      // Comment length
      view.setUint16(32, 0, true);
      // Disk number
      view.setUint16(34, 0, true);
      // Internal attributes
      view.setUint16(36, 0, true);
      // External attributes
      view.setUint32(38, 0, true);
      // Offset
      view.setUint32(42, entry.offset, true);

      // Filename
      const filenameBytes = encoder.encode(entry.filename);
      header.set(filenameBytes, 46);

      chunks.push(header);
      offset += header.length;
    });

    // End of central directory
    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);

    // Signature
    endView.setUint32(0, 0x06054b50, true);
    // Disk number
    endView.setUint16(4, 0, true);
    // Disk with central dir
    endView.setUint16(6, 0, true);
    // Number of entries on this disk
    endView.setUint16(8, centralDirectory.length, true);
    // Total entries
    endView.setUint16(10, centralDirectory.length, true);
    // Central directory size
    endView.setUint32(12, offset - centralDirStart, true);
    // Central directory offset
    endView.setUint32(16, centralDirStart, true);
    // Comment length
    endView.setUint16(20, 0, true);

    chunks.push(endRecord);

      return new Blob(chunks, { type: 'application/zip' });
    } catch (error) {
      console.error('ZIP creation error:', error);
      return null;
    }
  }

  calculateCRC32(data) {
    // Simple CRC32 implementation
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }

    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  showSearch() {
    eventBus.emit('search:show');
  }

  toggleConsole() {
    const consolePanel = document.querySelector('.console-panel');
    if (consolePanel) {
      consolePanel.classList.toggle('active');
    }
  }

  clearConsole() {
    const consoleContent = document.getElementById('consoleContent');
    if (consoleContent) {
      consoleContent.innerHTML = '';
      this.updateErrorCount();
    }
  }

  updateErrorCount() {
    const consoleContent = document.getElementById('consoleContent');
    if (!consoleContent) return;

    const ignoredErrors = JSON.parse(localStorage.getItem('ignoredErrors') || '[]');

    // Count only non-ignored errors
    const allErrors = Array.from(consoleContent.querySelectorAll('.console-message.console-error .console-text'));
    const visibleErrorCount = allErrors.filter(el => {
      const errorText = el.textContent;
      return !ignoredErrors.some(ignored => errorText.includes(ignored));
    }).length;

    eventBus.emit('console:errorCountChanged', { count: visibleErrorCount });
  }

  sendErrorToAI(errorMessage) {
    // Get current code
    const code = state.get('editor.code') || '';
    const activeFile = state.get('files.active') || 'untitled.html';

    // Construct AI prompt
    const prompt = `Prosím, oprav následující chybu v mém kódu:

**Chyba:**
${errorMessage}

**Soubor:** ${activeFile}

**Aktuální kód:**
\`\`\`html
${code}
\`\`\`

Přepiš celý kód s opravou a vysvětli, co bylo špatně.`;

    // Open AI panel and send message
    eventBus.emit('ai:show');

    // Wait a bit for AI panel to open, then send message
    setTimeout(() => {
      eventBus.emit('ai:sendMessage', { message: prompt });
      toast.success('Chyba odeslána AI k opravě', 2000);
    }, 300);
  }

  sendAllErrorsToAI() {
    const consoleContent = document.getElementById('consoleContent');
    if (!consoleContent) return;

    // Collect all error messages
    const errorMessages = [];
    const errorElements = consoleContent.querySelectorAll('.console-error .console-text');
    errorElements.forEach(el => {
      errorMessages.push(el.textContent);
    });

    if (errorMessages.length === 0) {
      toast.info('Žádné chyby k odeslání', 2000);
      return;
    }

    // Get current code
    const code = state.get('editor.code') || '';
    const activeFile = state.get('files.active') || 'untitled.html';

    // Construct AI prompt with all errors
    const prompt = `Prosím, oprav následující chyby v mém kódu:

**Nalezené chyby (${errorMessages.length}):**
${errorMessages.map((err, i) => `${i + 1}. ${err}`).join('\n')}

**Soubor:** ${activeFile}

**Aktuální kód:**
\`\`\`html
${code}
\`\`\`

Přepiš celý kód s opravami všech chyb a vysvětli, co bylo špatně.`;

    // Open AI panel and send message
    eventBus.emit('ai:show');

    setTimeout(() => {
      eventBus.emit('ai:sendMessage', { message: prompt });
      toast.success(`${errorMessages.length} ${errorMessages.length === 1 ? 'chyba odeslána' : errorMessages.length < 5 ? 'chyby odeslány' : 'chyb odesláno'} AI k opravě`, 2000);
    }, 300);
  }

  refreshPreview() {
    if (this.preview) {
      this.preview.refresh();
      toast.success('Náhled obnoven', 2000);
    }
  }

  togglePreview() {
    const currentView = state.get('ui.view');
    const newView = currentView === 'split' ? 'editor' : 'split';
    this.switchView(newView);
  }

  addToRecentFiles(fileName, fileId) {
    const recentFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
    const fileEntry = {
      name: fileName,
      id: fileId,
      timestamp: Date.now(),
      date: new Date().toLocaleString('cs-CZ')
    };

    // Remove duplicate if exists
    const filtered = recentFiles.filter(f => f.id !== fileId);

    // Add to beginning and limit to 10 items
    filtered.unshift(fileEntry);
    const limited = filtered.slice(0, 10);

    localStorage.setItem('recentFiles', JSON.stringify(limited));
    eventBus.emit('recentFiles:updated', { files: limited });
  }

  getRecentFiles() {
    return JSON.parse(localStorage.getItem('recentFiles') || '[]');
  }

  /**
   * Zavře aktivní tab
   */
  closeActiveTab() {
    const activeFileId = state.get('files.active');
    if (!activeFileId) {
      toast.info('Žádný aktivní soubor', 2000);
      return;
    }

    const tabs = state.get('files.tabs') || [];
    const activeTab = tabs.find(t => t.id === activeFileId);

    if (!activeTab) return;

    // Zkontroluj neuložené změny
    if (activeTab.modified) {
      if (!confirm(`Soubor "${activeTab.name}" má neuložené změny. Opravdu zavřít?`)) {
        return;
      }
    }

    // Odeber tab
    const newTabs = tabs.filter(t => t.id !== activeFileId);
    state.set('files.tabs', newTabs);

    // Přepni na jiný tab nebo vytvoř nový
    if (newTabs.length > 0) {
      const newActive = newTabs[newTabs.length - 1];
      state.set('files.active', newActive.id);
      state.set('editor.code', newActive.content || '');
      if (this.editor) {
        this.editor.setCode(newActive.content || '');
      }
      if (this.preview) {
        this.preview.update(newActive.content || '');
      }
    } else {
      // Vytvoř nový prázdný tab
      this.newTab();
    }

    eventBus.emit('files:changed');
    toast.success(`Soubor "${activeTab.name}" zavřen`, 2000);
  }

  closeOtherTabs() {
    const activeFileId = state.get('files.active');
    if (!activeFileId) {
      toast.info('Žádný aktivní soubor', 2000);
      return;
    }

    const tabs = state.get('files.tabs') || [];
    const activeTab = tabs.find(t => t.id === activeFileId);

    if (!activeTab) return;

    // Zkontroluj jestli mají ostatní taby neuložené změny
    const modifiedOthers = tabs.filter(t => t.id !== activeFileId && t.modified);

    if (modifiedOthers.length > 0) {
      if (!confirm(`${modifiedOthers.length} ${modifiedOthers.length === 1 ? 'soubor má' : 'soubory mají'} neuložené změny. Opravdu zavřít?`)) {
        return;
      }
    }

    // Nech jen aktivní tab
    state.set('files.tabs', [activeTab]);
    eventBus.emit('files:changed');

    toast.success(`Zavřeno ${tabs.length - 1} ${tabs.length - 1 === 1 ? 'soubor' : 'souborů'}`, 2000);
  }

  closeAllTabs() {
    const tabs = state.get('files.tabs') || [];

    if (tabs.length === 0) {
      toast.info('Žádné otevřené soubory', 2000);
      return;
    }

    const modifiedTabs = tabs.filter(t => t.modified);

    if (modifiedTabs.length > 0) {
      if (!confirm(`${modifiedTabs.length} ${modifiedTabs.length === 1 ? 'soubor má' : 'souborů má'} neuložené změny. Opravdu zavřít všechny?`)) {
        return;
      }
    }

    // Vymaž všechny taby
    state.set('files.tabs', []);
    state.set('files.active', null);

    if (this.editor) {
      this.editor.setCode(this.editor.getDefaultCode());
    }

    eventBus.emit('files:changed');
    toast.success(`Zavřeno ${tabs.length} ${tabs.length === 1 ? 'soubor' : 'souborů'}`, 2000);
  }

  saveAllTabs() {
    const tabs = state.get('files.tabs') || [];
    const modifiedTabs = tabs.filter(t => t.modified);

    if (modifiedTabs.length === 0) {
      toast.info('Všechny soubory jsou uložené', 2000);
      return;
    }

    // Označ všechny jako neuložené = false
    const savedTabs = tabs.map(t => ({ ...t, modified: false }));
    state.set('files.tabs', savedTabs);

    // Trigger re-render tabů
    eventBus.emit('files:changed');

    toast.success(`Uloženo ${modifiedTabs.length} ${modifiedTabs.length === 1 ? 'soubor' : 'souborů'}`, 2000);
  }

  /**
   * Přepne na tab podle indexu (pro Sidebar)
   */
  switchToTabByIndex(index) {
    const tabs = state.get('files.tabs') || [];
    if (index < 0 || index >= tabs.length) return;

    const tab = tabs[index];
    state.set('files.active', tab.id);
    state.set('editor.code', tab.content || '');

    if (this.editor) {
      this.editor.setCode(tab.content || '');
    }
    if (this.preview) {
      this.preview.update(tab.content || '');
    }

    eventBus.emit('files:changed');
  }

  /**
   * Zavře tab podle indexu (pro Sidebar)
   */
  closeTabByIndex(index) {
    const tabs = state.get('files.tabs') || [];
    if (index < 0 || index >= tabs.length) return;

    const tab = tabs[index];

    // Zkontroluj neuložené změny
    if (tab.modified) {
      if (!confirm(`Soubor "${tab.name}" má neuložené změny. Opravdu zavřít?`)) {
        return;
      }
    }

    const activeFileId = state.get('files.active');
    const newTabs = tabs.filter((_, i) => i !== index);
    state.set('files.tabs', newTabs);

    // Pokud zavíráme aktivní tab, přepni na jiný
    if (tab.id === activeFileId) {
      if (newTabs.length > 0) {
        const newIndex = Math.min(index, newTabs.length - 1);
        const newActive = newTabs[newIndex];
        state.set('files.active', newActive.id);
        state.set('editor.code', newActive.content || '');
        if (this.editor) {
          this.editor.setCode(newActive.content || '');
        }
        if (this.preview) {
          this.preview.update(newActive.content || '');
        }
      } else {
        this.newTab();
      }
    }

    eventBus.emit('files:changed');
    toast.success(`Soubor "${tab.name}" zavřen`, 2000);
  }

  destroy() {
    if (this.editor) this.editor.destroy();
    if (this.preview) this.preview.destroy();
    if (this.sidePanel) this.sidePanel.destroy();
    eventBus.clear();
  }
}

// Create and initialize app
const app = new App();

// Start when DOM is ready
ready(() => {
  app.init().catch(error => {
    console.error('Failed to initialize app:', error);
    document.body.innerHTML = `
      <div style="padding: 2rem; color: #ff6b6b; font-family: monospace;">
        <h1>⚠️ Chyba při načítání aplikace</h1>
        <pre>${error.message}</pre>
      </div>
    `;
  });
});

// Export for debugging
window.app = app;
window.state = state;
window.eventBus = eventBus;

export default app;
