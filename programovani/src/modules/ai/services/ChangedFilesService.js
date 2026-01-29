/**
 * ChangedFilesService.js
 * Správa panelu změněných souborů (VS Code style)
 */

export class ChangedFilesService {
  constructor(aiPanel) {
    this.aiPanel = aiPanel;
    this.changedFiles = new Map(); // fileName -> { added, removed, originalCode }
    console.log('[ChangedFilesService] Initialized');
  }

  /**
   * Zaregistruj změnu souboru
   */
  recordChange(fileName, addedLines, removedLines, originalCode) {
    const existing = this.changedFiles.get(fileName) || { added: 0, removed: 0, originalCode: null };

    this.changedFiles.set(fileName, {
      added: existing.added + addedLines,
      removed: existing.removed + removedLines,
      originalCode: existing.originalCode || originalCode,
      timestamp: Date.now()
    });

    this.updateUI();
  }

  /**
   * Aktualizuj UI panel
   */
  updateUI() {
    const container = document.getElementById('aiChangedFiles');
    const listEl = document.getElementById('changedFilesList');
    const countEl = container?.querySelector('.changed-files-count');

    if (!container || !listEl) return;

    if (this.changedFiles.size === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';

    // Update count
    if (countEl) {
      countEl.textContent = `${this.changedFiles.size} soubor${this.changedFiles.size > 1 ? 'ů' : ''} změněno`;
    }

    // Build file list
    listEl.innerHTML = '';
    this.changedFiles.forEach((data, fileName) => {
      const item = document.createElement('div');
      item.className = 'changed-file-item';
      item.innerHTML = `
        <span class="changed-file-name">
          <span class="changed-file-icon">📄</span>
          ${this.getFileIcon(fileName)} ${fileName}
        </span>
        <span class="changed-file-stats">
          <span class="stat-added">+${data.added}</span>
          <span class="stat-removed">-${data.removed}</span>
        </span>
      `;
      listEl.appendChild(item);
    });

    // Attach event handlers
    this.attachHandlers();
  }

  /**
   * Získej ikonu podle typu souboru
   */
  getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
      js: '🟨',
      ts: '🔷',
      html: '🟧',
      css: '🟦',
      json: '📋',
      md: '📝'
    };
    return icons[ext] || '📄';
  }

  /**
   * Připoj event handlery
   */
  attachHandlers() {
    const container = document.getElementById('aiChangedFiles');
    if (!container) return;

    const keepBtn = container.querySelector('.keep-changes-btn');
    const revertBtn = container.querySelector('.revert-changes-btn');

    if (keepBtn) {
      keepBtn.onclick = () => this.keepAllChanges();
    }

    if (revertBtn) {
      revertBtn.onclick = () => this.revertAllChanges();
    }
  }

  /**
   * Ponech všechny změny (vymaž historii)
   */
  keepAllChanges() {
    this.changedFiles.clear();
    this.updateUI();

    // Zobraz toast
    if (this.aiPanel.uiRenderingService) {
      this.aiPanel.uiRenderingService.addChatMessage('system', '✅ Změny byly potvrzeny.');
    }
  }

  /**
   * Vrať všechny změny zpět
   */
  revertAllChanges() {
    // Pro každý změněný soubor obnov originální kód
    this.changedFiles.forEach((data, fileName) => {
      if (data.originalCode !== null) {
        // Najdi soubor a obnov
        const tabs = state.get('files.tabs') || [];
        const fileTab = tabs.find(t => t.name === fileName);

        if (fileTab) {
          fileTab.content = data.originalCode;
          state.set('files.tabs', tabs);

          // Pokud je aktivní, aktualizuj editor
          if (state.get('files.active') === fileTab.id) {
            eventBus.emit('editor:setContent', data.originalCode);
          }
        }
      }
    });

    this.changedFiles.clear();
    this.updateUI();

    // Zobraz toast
    if (this.aiPanel.uiRenderingService) {
      this.aiPanel.uiRenderingService.addChatMessage('system', '↩️ Všechny změny byly vráceny zpět.');
    }
  }

  /**
   * Zobraz panel se změnami (voláno z tlačítka historie)
   */
  showChangedFilesPanel() {
    const container = document.getElementById('aiChangedFiles');

    if (this.changedFiles.size === 0) {
      // Žádné změny - zobraz info
      if (window.toast) {
        window.toast.info('📋 Historie změn je prázdná', 2000);
      }
      return;
    }

    // Zobraz panel pokud je skrytý
    if (container) {
      container.style.display = 'block';
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Aktualizuj UI
    this.updateUI();

    if (window.toast) {
      window.toast.info(`📋 ${this.changedFiles.size} změněných souborů`, 2000);
    }
  }

  /**
   * Vymaž historii změn
   */
  clear() {
    this.changedFiles.clear();
    this.updateUI();
  }
}

// Import state a eventBus
import { state } from '../../../core/state.js';
import { eventBus } from '../../../core/events.js';
