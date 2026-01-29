/**
 * ChangeTracker.js
 * Sleduje změny v editoru a zobrazuje je jako ve VS Code Source Control
 */

import { eventBus } from '../../core/events.js';

export class ChangeTracker {
  constructor(editor) {
    this.editor = editor;
    this.originalCode = '';
    this.hasChanges = false;
    this.statusBarElement = null;
    this.init();
  }

  init() {
    // Create status bar UI
    this.createStatusBar();

    // Listen to editor changes
    eventBus.on('editor:change', () => this.updateChanges());
    eventBus.on('editor:setCode', () => this.resetOriginal());

    // Initialize with current code
    this.resetOriginal();
  }

  createStatusBar() {
    // Find or create status bar container
    let statusBar = document.querySelector('.editor-status-bar');

    if (!statusBar) {
      const editorWrapper = document.querySelector('.editor-wrapper');
      if (!editorWrapper) return;

      statusBar = document.createElement('div');
      statusBar.className = 'editor-status-bar';
      editorWrapper.appendChild(statusBar);
    }

    // Create change indicator
    statusBar.innerHTML = `
      <div class="status-bar-left">
        <div class="change-indicator" id="changeIndicator" style="display: none;">
          <span class="change-icon">📝</span>
          <span class="change-text" id="changeText">1 změna</span>
          <button class="status-btn" id="keepChangesBtn" title="Nechat změny">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
            </svg>
            <span>Nechat</span>
          </button>
          <button class="status-btn status-btn-danger" id="discardChangesBtn" title="Vrátit změny zpět">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
            </svg>
            <span>Vrátit zpět</span>
          </button>
        </div>
      </div>
      <div class="status-bar-right">
        <span class="status-info" id="cursorPosition">Ln 1, Col 1</span>
      </div>
    `;

    this.statusBarElement = document.getElementById('changeIndicator');

    // Attach event handlers
    const keepBtn = document.getElementById('keepChangesBtn');
    const discardBtn = document.getElementById('discardChangesBtn');

    if (keepBtn) {
      keepBtn.addEventListener('click', () => this.keepChanges());
    }

    if (discardBtn) {
      discardBtn.addEventListener('click', () => this.discardChanges());
    }
  }

  updateChanges() {
    const currentCode = this.editor.getCode();

    if (currentCode === this.originalCode) {
      this.hasChanges = false;
      this.hideChangeIndicator();
      return;
    }

    this.hasChanges = true;

    // Calculate diff
    const diff = this.calculateDiff(this.originalCode, currentCode);
    this.showChangeIndicator(diff);
  }

  calculateDiff(oldCode, newCode) {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');

    let added = 0;
    let removed = 0;

    // Simple line-based diff
    const maxLen = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';

      if (oldLine !== newLine) {
        if (i >= oldLines.length) {
          added++;
        } else if (i >= newLines.length) {
          removed++;
        } else {
          // Line modified
          if (newLine.trim() && !oldLine.trim()) {
            added++;
          } else if (!newLine.trim() && oldLine.trim()) {
            removed++;
          } else {
            added++;
            removed++;
          }
        }
      }
    }

    return { added, removed };
  }

  showChangeIndicator(diff) {
    if (!this.statusBarElement) return;

    const changeText = document.getElementById('changeText');
    if (!changeText) return;

    const totalChanges = diff.added + diff.removed;
    const text = totalChanges === 1 ? '1 změna' : `${totalChanges} změn`;
    const details = `+${diff.added} -${diff.removed}`;

    changeText.textContent = `${text} (${details})`;
    this.statusBarElement.style.display = 'flex';
  }

  hideChangeIndicator() {
    if (!this.statusBarElement) return;
    this.statusBarElement.style.display = 'none';
  }

  keepChanges() {
    // Commit current code as new original
    this.originalCode = this.editor.getCode();
    this.hasChanges = false;
    this.hideChangeIndicator();

    eventBus.emit('toast:show', {
      message: '✓ Změny potvrzeny',
      type: 'success',
      duration: 1500
    });
  }

  discardChanges() {
    // Restore original code
    this.editor.setCode(this.originalCode);
    this.hasChanges = false;
    this.hideChangeIndicator();

    eventBus.emit('toast:show', {
      message: '↶ Změny vráceny zpět',
      type: 'info',
      duration: 1500
    });
  }

  resetOriginal() {
    // Update original code to current state
    this.originalCode = this.editor.getCode();
    this.hasChanges = false;
    this.hideChangeIndicator();
  }

  destroy() {
    // Cleanup
    if (this.statusBarElement) {
      this.statusBarElement.remove();
    }
  }
}
