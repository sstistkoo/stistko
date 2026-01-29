/**
 * Find and Replace Panel - Advanced text search and replace with context
 */
import { state } from '../../core/state.js';
import { eventBus } from '../../core/events.js';
import { Modal } from '../../ui/components/Modal.js';
import { toast } from '../../ui/components/Toast.js';

export class FindReplacePanel {
  constructor() {
    this.modal = null;
    this.searchResults = [];
    this.init();
  }

  init() {
    eventBus.on('findreplace:show', () => this.show());
  }

  show() {
    if (!this.modal) {
      this.createModal();
    }
    this.modal.open();
    // Attach event handlers after modal is opened and DOM is ready
    setTimeout(() => {
      this.attachEventHandlers();
      const searchInput = this.modal.element?.querySelector('#findText');
      if (searchInput) searchInput.focus();
    }, 100);
  }

  hide() {
    if (this.modal) {
      this.modal.close();
    }
  }

  createModal() {
    this.modal = new Modal({
      title: '🔍 Najít a nahradit text',
      content: this.renderContent(),
      size: 'large',
      closeOnOverlay: true,
      isDraggable: true,
      className: 'find-replace-modal'
    });
    // Event handlers are attached after modal.open() is called
  }

  renderContent() {
    return `
      <div class="find-replace-panel">
        <div class="find-replace-inputs">
          <div class="input-group">
            <label for="findText">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              Hledat:
            </label>
            <input type="text" id="findText" placeholder="Zadej text, který chceš najít..." autofocus>
          </div>

          <div class="input-group">
            <label for="replaceText">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Nahradit:
            </label>
            <input type="text" id="replaceText" placeholder="Zadej nový text...">
          </div>

          <div class="find-replace-options">
            <label class="checkbox-label">
              <input type="checkbox" id="caseSensitive">
              <span>Rozlišovat velikost písmen</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="wholeWord">
              <span>Celá slova</span>
            </label>
          </div>

          <div class="find-replace-actions">
            <button class="btn btn-primary" id="findBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              Hledat
            </button>
            <button class="btn btn-visual" id="visualModeBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Vizuální režim
            </button>
            <button class="btn btn-secondary" id="replaceAllBtn" disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
              Nahradit vše
            </button>
          </div>

          <!-- Visual Mode Controls (hidden by default) -->
          <div class="visual-mode-controls" id="visualModeControls" style="display: none;">
            <div class="visual-mode-info">
              <span id="visualModeInfo">Všechny výskyty jsou označeny čísly [1], [2], [3]... v náhledu</span>
            </div>
            <div class="input-group">
              <label for="selectNumber">Zadej číslo výskytu k nahrazení:</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="number" id="selectNumber" min="1" placeholder="Např. 3"
                       style="flex: 1; padding: 10px; border: 2px solid #667eea; border-radius: 6px; font-size: 14px;">
                <button class="btn btn-success" id="applyVisualBtn">✓ Nahradit</button>
                <button class="btn btn-cancel" id="cancelVisualBtn">✕ Zrušit</button>
              </div>
            </div>
          </div>
        </div>

        <div class="find-replace-results" id="searchResults">
          <div class="results-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <p>Zadej text a klikni na "Hledat"</p>
          </div>
        </div>
      </div>

      <style>
        .find-replace-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-height: 400px;
          max-height: 80vh;
        }

        .find-replace-inputs {
          display: flex;
          flex-direction: column;
          gap: 15px;
          padding: 20px;
          background: var(--color-bg-secondary, #f8f9fa);
          border-radius: 8px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: var(--color-text-primary, #1a1a1a);
          font-size: 14px;
        }

        .input-group input[type="text"] {
          padding: 12px 16px;
          border: 2px solid var(--color-border, #e0e0e0);
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .input-group input[type="text"]:focus {
          outline: none;
          border-color: var(--color-primary, #667eea);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .find-replace-options {
          display: flex;
          gap: 20px;
          margin-top: 8px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          color: var(--color-text-secondary, #666);
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .find-replace-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .find-replace-actions .btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: var(--color-primary, #667eea);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--color-primary-dark, #5568d3);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-secondary {
          background: var(--color-success, #48bb78);
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--color-success-dark, #38a169);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
        }

        .btn-visual {
          background: var(--color-info, #4299e1);
          color: white;
        }

        .btn-visual:hover:not(:disabled) {
          background: var(--color-info-dark, #3182ce);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
        }

        .btn-success {
          background: var(--color-success, #48bb78);
          color: white;
          padding: 10px 16px;
        }

        .btn-success:hover {
          background: var(--color-success-dark, #38a169);
        }

        .btn-cancel {
          background: var(--color-danger, #f56565);
          color: white;
          padding: 10px 16px;
        }

        .btn-cancel:hover {
          background: var(--color-danger-dark, #e53e3e);
        }

        .visual-mode-controls {
          padding: 16px;
          background: #e3f2fd;
          border-radius: 8px;
          margin-top: 16px;
          border: 2px solid #2196f3;
        }

        .visual-mode-info {
          padding: 12px;
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          border-radius: 4px;
          margin-bottom: 12px;
          font-size: 14px;
          color: #856404;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .find-replace-results {
          flex: 1;
          min-height: 300px;
          max-height: 500px;
          padding: 20px;
          background: white;
          border: 2px solid var(--color-border, #e0e0e0);
          border-radius: 8px;
          overflow-y: auto;
        }

        .results-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--color-text-secondary, #999);
          text-align: center;
          gap: 16px;
        }

        .results-placeholder svg {
          opacity: 0.3;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid var(--color-border, #e0e0e0);
        }

        .results-count {
          font-weight: 600;
          color: var(--color-primary, #667eea);
        }

        .results-group {
          margin-bottom: 20px;
        }

        .results-group h4 {
          margin: 16px 0 8px;
          color: #667eea;
        }

        .result-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          margin-bottom: 12px;
          background: var(--color-bg-secondary, #f8f9fa);
          border-radius: 6px;
          border-left: 4px solid var(--color-primary, #667eea);
          cursor: pointer;
          transition: all 0.2s;
        }

        .result-number {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
          padding: 0 8px;
          background: var(--color-primary, #667eea);
          color: white;
          font-weight: 700;
          font-size: 13px;
          border-radius: 6px;
          margin-top: 2px;
        }

        .result-content {
          flex: 1;
          min-width: 0;
        }

        .result-item:hover {
          background: var(--color-bg-hover, #e9ecef);
          transform: translateX(4px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .result-location {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--color-text-secondary, #666);
          margin-bottom: 8px;
        }

        .result-location-badge {
          padding: 2px 8px;
          background: var(--color-primary, #667eea);
          color: white;
          border-radius: 12px;
          font-weight: 600;
        }

        .result-context {
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.6;
          color: var(--color-text-primary, #1a1a1a);
          white-space: pre-wrap;
          word-break: break-word;
        }

        .result-context mark {
          background: #ffeb3b;
          padding: 2px 4px;
          border-radius: 3px;
          font-weight: 600;
        }

        .result-line-number {
          color: var(--color-text-tertiary, #999);
          font-size: 11px;
          margin-top: 4px;
        }

        /* Mobile Optimization */
        @media (max-width: 768px) {
          .find-replace-panel {
            gap: 15px;
          }

          .find-replace-inputs {
            padding: 15px;
            gap: 12px;
          }

          .input-group input[type="text"] {
            padding: 10px 14px;
            font-size: 16px; /* Prevents zoom on iOS */
          }

          .find-replace-options {
            flex-direction: column;
            gap: 12px;
          }

          .find-replace-actions {
            flex-direction: column;
            gap: 10px;
          }

          .find-replace-actions .btn {
            width: 100%;
            justify-content: center;
          }

          .result-item {
            flex-direction: column;
            gap: 8px;
            padding: 12px;
          }

          .result-number {
            align-self: flex-start;
          }

          .result-context {
            font-size: 12px;
          }

          .result-location {
            flex-wrap: wrap;
            gap: 6px;
          }

          .visual-mode-controls {
            padding: 12px;
          }

          .visual-mode-controls .btn {
            padding: 8px 16px;
            font-size: 14px;
          }
        }

        /* Small mobile devices */
        @media (max-width: 480px) {
          .find-replace-inputs {
            padding: 12px;
          }

          .result-item {
            padding: 10px;
          }

          .result-number {
            min-width: 28px;
            height: 28px;
            font-size: 12px;
          }

          .result-context {
            font-size: 11px;
          }

          .btn-primary, .btn-secondary, .btn-visual, .btn-success, .btn-cancel {
            padding: 8px 16px;
            font-size: 14px;
          }
        }
      </style>
    `;
  }

  attachEventHandlers() {
    if (!this.modal || !this.modal.element) {
      console.warn('Modal element not ready for event handlers');
      return;
    }

    const findBtn = this.modal.element.querySelector('#findBtn');
    const replaceAllBtn = this.modal.element.querySelector('#replaceAllBtn');
    const visualModeBtn = this.modal.element.querySelector('#visualModeBtn');
    const applyVisualBtn = this.modal.element.querySelector('#applyVisualBtn');
    const cancelVisualBtn = this.modal.element.querySelector('#cancelVisualBtn');
    const findInput = this.modal.element.querySelector('#findText');

    findBtn?.addEventListener('click', () => this.performSearch());
    replaceAllBtn?.addEventListener('click', () => this.replaceAll());
    visualModeBtn?.addEventListener('click', () => this.startVisualMode());
    applyVisualBtn?.addEventListener('click', () => this.applyVisualReplace());
    cancelVisualBtn?.addEventListener('click', () => this.cancelVisualMode());

    // Enter to search
    findInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });
  }

  performSearch() {
    const findText = this.modal.element.querySelector('#findText').value;
    if (!findText.trim()) {
      toast.warning('Zadej text, který chceš najít', 2000);
      return;
    }

    const caseSensitive = this.modal.element.querySelector('#caseSensitive').checked;
    const wholeWord = this.modal.element.querySelector('#wholeWord').checked;

    // Search in current code
    const code = state.get('editor.code') || '';
    this.searchResults = this.searchInCode(code, findText, caseSensitive, wholeWord);

    this.renderResults();
  }

  searchInCode(code, searchText, caseSensitive, wholeWord) {
    const lines = code.split('\n');
    const results = [];

    const searchRegex = wholeWord
      ? new RegExp(`\\b${this.escapeRegex(searchText)}\\b`, caseSensitive ? 'g' : 'gi')
      : new RegExp(this.escapeRegex(searchText), caseSensitive ? 'g' : 'gi');

    lines.forEach((line, index) => {
      const matches = [...line.matchAll(searchRegex)];
      matches.forEach(match => {
        const lineNumber = index + 1;
        const charPosition = match.index;
        const location = this.detectLocation(lineNumber, code);

        // Get context (line with some chars before/after)
        const contextStart = Math.max(0, charPosition - 30);
        const contextEnd = Math.min(line.length, charPosition + searchText.length + 30);
        const context = (contextStart > 0 ? '...' : '') +
                       line.substring(contextStart, contextEnd) +
                       (contextEnd < line.length ? '...' : '');

        results.push({
          lineNumber,
          charPosition,
          location,
          line: line,
          context: context,
          matchStart: Math.max(0, charPosition - contextStart),
          matchLength: searchText.length
        });
      });
    });

    return results;
  }

  detectLocation(lineNumber, code) {
    const lines = code.split('\n');
    const upToLine = lines.slice(0, lineNumber).join('\n').toLowerCase();

    // Detect where in document the line is
    if (upToLine.includes('<head>') && !upToLine.includes('</head>')) {
      return '<head>';
    }
    if (upToLine.includes('<title>')) {
      return '<title>';
    }
    if (upToLine.includes('<h1>')) {
      return '<h1> - Hlavní nadpis';
    }
    if (upToLine.includes('<h2>')) {
      return '<h2> - Podnadpis';
    }
    if (upToLine.includes('<header>') && !upToLine.includes('</header>')) {
      return '<header> - Hlavička';
    }
    if (upToLine.includes('<footer>') && !upToLine.includes('</footer>')) {
      return '<footer> - Patička';
    }
    if (upToLine.includes('<nav>') && !upToLine.includes('</nav>')) {
      return '<nav> - Navigace';
    }
    if (upToLine.includes('class="sidebar"') || upToLine.includes('id="sidebar"')) {
      return 'Boční panel';
    }
    if (upToLine.includes('class="modal"') || upToLine.includes('id="modal"')) {
      return 'Modální okno';
    }
    if (upToLine.includes('<script>') && !upToLine.includes('</script>')) {
      return '<script> - JavaScript';
    }
    if (upToLine.includes('<style>') && !upToLine.includes('</style>')) {
      return '<style> - CSS';
    }

    return '<body> - Hlavní stránka';
  }

  renderResults() {
    const resultsContainer = this.modal.element.querySelector('#searchResults');
    const replaceAllBtn = this.modal.element.querySelector('#replaceAllBtn');

    console.log('🔍 Rendering results:', this.searchResults.length, 'results');

    if (this.searchResults.length === 0) {
      resultsContainer.innerHTML = `
        <div class="results-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>Nenalezeny žádné výsledky</p>
        </div>
      `;
      replaceAllBtn.disabled = true;
      return;
    }

    replaceAllBtn.disabled = false;

    const groupedResults = this.groupByLocation(this.searchResults);
    console.log('📍 Grouped results:', groupedResults);

    let html = `
      <div class="results-header">
        <span class="results-count">Nalezeno: ${this.searchResults.length} výskytů</span>
      </div>
    `;

    Object.entries(groupedResults).forEach(([location, items]) => {
      console.log(`📍 Location: ${location}, Items:`, items.length);
      const escapedLocation = this.escapeHtml(location);
      html += `
        <div class="results-group">
          <h4>📍 ${escapedLocation} (${items.length})</h4>
      `;

      items.forEach((result, index) => {
        const highlightedContext = this.highlightMatch(result.context, result.matchStart, result.matchLength);
        const resultIndex = this.searchResults.indexOf(result);
        const resultNumber = resultIndex + 1; // 1-based numbering

        html += `
          <div class="result-item" data-index="${resultIndex}">
            <span class="result-number">[${resultNumber}]</span>
            <div class="result-content">
              <div class="result-location">
                <span class="result-location-badge">${escapedLocation}</span>
                <span>Řádek ${result.lineNumber}</span>
              </div>
              <div class="result-context">${highlightedContext}</div>
              <div class="result-line-number">Klikni pro zvýraznění v editoru (nebo nahrazení, pokud zadáš nový text)</div>
            </div>
          </div>
        `;
      });

      html += `</div>`;
    });

    console.log('📝 Generated HTML length:', html.length);
    console.log('📝 HTML preview:', html.substring(0, 500));
    resultsContainer.innerHTML = html;
    console.log('✅ HTML rendered, attaching handlers...');
    console.log('📊 Results container children:', resultsContainer.children.length);

    // Attach click handlers to result items
    resultsContainer.querySelectorAll('.result-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.replaceSingle(index);
      });
    });
  }

  groupByLocation(results) {
    const grouped = {};
    results.forEach(result => {
      if (!grouped[result.location]) {
        grouped[result.location] = [];
      }
      grouped[result.location].push(result);
    });
    return grouped;
  }

  highlightMatch(context, matchStart, matchLength) {
    const before = context.substring(0, matchStart);
    const match = context.substring(matchStart, matchStart + matchLength);
    const after = context.substring(matchStart + matchLength);
    return `${this.escapeHtml(before)}<mark>${this.escapeHtml(match)}</mark>${this.escapeHtml(after)}`;
  }

  replaceSingle(index) {
    const result = this.searchResults[index];
    const replaceText = this.modal.element.querySelector('#replaceText').value;

    // If no replace text, just highlight the text in editor
    if (!replaceText || replaceText.trim() === '') {
      this.highlightInEditor(result);
      return;
    }

    const code = state.get('editor.code') || '';
    const lines = code.split('\n');
    const lineIndex = result.lineNumber - 1;

    // Replace only this occurrence
    const line = lines[lineIndex];
    const before = line.substring(0, result.charPosition);
    const after = line.substring(result.charPosition + result.matchLength);
    lines[lineIndex] = before + replaceText + after;

    const newCode = lines.join('\n');

    // Update editor
    eventBus.emit('editor:setCode', { code: newCode });
    state.set('editor.code', newCode);

    toast.success('✅ Text nahrazen', 1500);

    // Highlight the newly replaced text after a short delay to let editor update
    setTimeout(() => {
      this.highlightReplacedText(result.lineNumber, result.charPosition, replaceText.length);
      // Hide modal on mobile to see the highlighted text
      if (window.innerWidth <= 768) {
        this.hide();
      }
    }, 50);

    // Remove this result and re-render
    this.searchResults.splice(index, 1);
    this.renderResults();
  }

  highlightReplacedText(lineNumber, charPosition, newTextLength) {
    const textarea = document.querySelector('#editorContainer textarea');
    if (!textarea) return;

    const code = textarea.value;
    const lines = code.split('\n');

    // Calculate absolute position
    let position = 0;
    for (let i = 0; i < lineNumber - 1; i++) {
      position += lines[i].length + 1;
    }
    position += charPosition;

    // Set selection for the new text
    textarea.setSelectionRange(position, position + newTextLength);
    textarea.focus();

    // Scroll to show the replaced text
    const textBeforeSelection = code.substring(0, position);
    const linesBefore = textBeforeSelection.split('\n').length - 1;
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
    const textareaHeight = textarea.clientHeight;
    const targetScrollTop = (linesBefore * lineHeight) - (textareaHeight / 3);
    textarea.scrollTop = Math.max(0, targetScrollTop);

    console.log('✨ Highlighted replaced text:', {
      lineNumber,
      position,
      length: newTextLength,
      text: code.substring(position, position + newTextLength)
    });
  }

  highlightInEditor(result) {
    // Get editor textarea first
    const textarea = document.querySelector('#editorContainer textarea');
    if (!textarea) {
      console.warn('Textarea not found');
      return;
    }

    const code = textarea.value;
    const lines = code.split('\n');

    // Calculate absolute position in actual textarea value
    let position = 0;
    for (let i = 0; i < result.lineNumber - 1; i++) {
      position += lines[i].length + 1; // +1 for newline character
    }
    position += result.charPosition;

    console.log('🎯 Highlighting:', {
      lineNumber: result.lineNumber,
      charPosition: result.charPosition,
      calculatedPosition: position,
      matchLength: result.matchLength,
      textToHighlight: code.substring(position, position + result.matchLength)
    });

    // Set selection
    textarea.setSelectionRange(position, position + result.matchLength);
    textarea.focus();

    // Hide modal on mobile to see the highlighted text
    if (window.innerWidth <= 768) {
      setTimeout(() => this.hide(), 100);
    }

    // Scroll the textarea to show the selection
    // We need to calculate the line position and scroll there
    const textBeforeSelection = code.substring(0, position);
    const linesBefore = textBeforeSelection.split('\n').length - 1;

    // Get computed line height
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(computedStyle.lineHeight) || 20;

    // Calculate scroll position to center the selection
    const textareaHeight = textarea.clientHeight;
    const targetScrollTop = (linesBefore * lineHeight) - (textareaHeight / 3);

    textarea.scrollTop = Math.max(0, targetScrollTop);

    console.log('📜 Scroll info:', {
      linesBefore,
      lineHeight,
      textareaHeight,
      targetScrollTop,
      actualScrollTop: textarea.scrollTop
    });

    toast.info(`📍 Zvýrazněno na řádku ${result.lineNumber}`, 2000);
  }

  replaceAll() {
    const findText = this.modal.element.querySelector('#findText').value;
    const replaceText = this.modal.element.querySelector('#replaceText').value;

    if (!replaceText && replaceText !== '') {
      toast.warning('Zadej text, kterým chceš nahradit', 2000);
      return;
    }

    const caseSensitive = this.modal.element.querySelector('#caseSensitive').checked;
    const wholeWord = this.modal.element.querySelector('#wholeWord').checked;

    const code = state.get('editor.code') || '';

    const searchRegex = wholeWord
      ? new RegExp(`\\b${this.escapeRegex(findText)}\\b`, caseSensitive ? 'g' : 'gi')
      : new RegExp(this.escapeRegex(findText), caseSensitive ? 'g' : 'gi');

    const newCode = code.replace(searchRegex, replaceText);
    const count = (code.match(searchRegex) || []).length;

    // Update editor
    eventBus.emit('editor:setCode', { code: newCode });
    state.set('editor.code', newCode);

    toast.success(`✅ Nahrazeno ${count} výskytů`, 2000);

    // Clear results
    this.searchResults = [];
    this.renderResults();
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  startVisualMode() {
    const findText = this.modal.element.querySelector('#findText').value;
    if (!findText.trim()) {
      toast.warning('Zadej text, který chceš najít', 2000);
      return;
    }

    const replaceText = this.modal.element.querySelector('#replaceText').value;
    if (!replaceText.trim()) {
      toast.warning('Zadej text, kterým chceš nahradit', 2000);
      return;
    }

    const caseSensitive = this.modal.element.querySelector('#caseSensitive').checked;
    const wholeWord = this.modal.element.querySelector('#wholeWord').checked;

    // Get current code
    const code = state.get('editor.code') || '';

    // Save original to class property
    this.visualModeOriginalCode = code;

    // Find all occurrences
    const searchRegex = wholeWord
      ? new RegExp(`\\b${this.escapeRegex(findText)}\\b`, caseSensitive ? 'g' : 'gi')
      : new RegExp(this.escapeRegex(findText), caseSensitive ? 'g' : 'gi');

    const matches = [...code.matchAll(searchRegex)];

    if (matches.length === 0) {
      toast.warning('Nenalezeny žádné výsledky', 2000);
      return;
    }

    // Save matches for later
    this.visualModeMatches = matches;
    this.visualModeFindText = findText;
    this.visualModeReplaceText = replaceText;

    // Replace each occurrence with numbered marker
    // Skip matches that are inside HTML tags (between < and >)
    let modifiedCode = code;
    let offset = 0;
    const validMatches = [];

    matches.forEach((match, index) => {
      // Check if match is inside an HTML tag
      const beforeMatch = code.substring(0, match.index);
      const lastOpenBracket = beforeMatch.lastIndexOf('<');
      const lastCloseBracket = beforeMatch.lastIndexOf('>');

      // If last < is after last >, we're inside a tag
      if (lastOpenBracket > lastCloseBracket) {
        console.log(`⚠️ Skipping match "${match[0]}" at position ${match.index} - inside HTML tag`);
        return; // Skip this match
      }

      validMatches.push(match);
      const number = validMatches.length; // Use validMatches count for numbering
      const marker = `[${number}]`;
      const startPos = match.index + offset;
      const endPos = startPos + match[0].length;

      modifiedCode = modifiedCode.substring(0, startPos) + marker + modifiedCode.substring(endPos);
      offset += marker.length - match[0].length;
    });

    // Update stored matches to only valid ones
    this.visualModeMatches = validMatches;

    // Update editor with numbered markers
    eventBus.emit('editor:setCode', { code: modifiedCode });
    state.set('editor.code', modifiedCode);

    // Show visual mode controls
    const visualControls = this.modal.element.querySelector('#visualModeControls');
    const selectNumberInput = this.modal.element.querySelector('#selectNumber');
    const visualInfo = this.modal.element.querySelector('#visualModeInfo');

    if (visualControls) {
      visualControls.style.display = 'block';
      visualInfo.textContent = `Nalezeno ${validMatches.length} výskytů (${matches.length - validMatches.length} přeskočeno v HTML tazích), označených jako [1] až [${validMatches.length}] v náhledu`;
      selectNumberInput.max = validMatches.length;
      selectNumberInput.focus();
    }

    if (validMatches.length === 0) {
      toast.warning('⚠️ Všechny výskyty jsou uvnitř HTML tagů - nelze použít vizuální režim', 3000);
      return;
    }

    toast.info(`🔢 Vizuální režim aktivní - uvidíš ${validMatches.length} čísel v náhledu`, 3000);
  }

  applyVisualReplace() {
    // Check if visual mode is active
    if (!this.visualModeMatches || !this.visualModeOriginalCode) {
      toast.error('Vizuální režim není aktivní! Nejdřív klikni na "Vizuální režim"', 3000);
      return;
    }

    const selectedNumber = parseInt(this.modal.element.querySelector('#selectNumber').value);

    if (!selectedNumber || isNaN(selectedNumber)) {
      toast.warning('Zadej číslo výskytu', 2000);
      return;
    }

    if (selectedNumber < 1 || selectedNumber > this.visualModeMatches.length) {
      toast.error(`Neplatné číslo! Zadej 1-${this.visualModeMatches.length}`, 2000);
      return;
    }

    // Start with original code and replace all matches
    let finalCode = this.visualModeOriginalCode;
    let offset = 0;

    // Replace each match - selected one with replace text, others keep original
    this.visualModeMatches.forEach((match, index) => {
      const isSelected = (index === selectedNumber - 1);
      const replacementText = isSelected ? this.visualModeReplaceText : match[0];

      const startPos = match.index + offset;
      const endPos = startPos + match[0].length;

      finalCode = finalCode.substring(0, startPos) + replacementText + finalCode.substring(endPos);
      offset += replacementText.length - match[0].length;
    });

    // Update editor with final result
    eventBus.emit('editor:setCode', { code: finalCode });
    state.set('editor.code', finalCode);

    toast.success(`✅ Nahrazen výskyt #${selectedNumber}`, 2000);

    // Hide visual mode controls and clear state (but don't restore original code)
    this.endVisualMode();
  }

  endVisualMode() {
    // Hide visual mode controls
    const visualControls = this.modal.element.querySelector('#visualModeControls');
    if (visualControls) {
      visualControls.style.display = 'none';
    }

    // Clear state
    this.visualModeOriginalCode = null;
    this.visualModeMatches = null;
    this.visualModeFindText = null;
    this.visualModeReplaceText = null;
  }

  cancelVisualMode() {
    // Restore original code
    if (this.visualModeOriginalCode) {
      eventBus.emit('editor:setCode', { code: this.visualModeOriginalCode });
      state.set('editor.code', this.visualModeOriginalCode);
    }

    // End visual mode (hide controls and clear state)
    this.endVisualMode();

    toast.info('Vizuální režim zrušen', 1500);
  }
}

export default FindReplacePanel;
