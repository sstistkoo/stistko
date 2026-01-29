/**
 * Shortcuts Panel Module
 * Command palette and shortcuts reference
 */

import { eventBus } from '../../core/events.js';
import { Modal } from '../../ui/components/Modal.js';

export class ShortcutsPanel {
  constructor() {
    this.modal = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    eventBus.on('shortcuts:show', () => this.show());
    eventBus.on('shortcuts:hide', () => this.hide());
  }

  show() {
    if (!this.modal) {
      this.createModal();
    }
    this.modal.open();

    // Focus search input
    setTimeout(() => {
      const searchInput = this.modal.element.querySelector('#shortcutsSearch');
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  }

  hide() {
    if (this.modal) {
      this.modal.close();
    }
  }

  createModal() {
    const content = this.createShortcutsInterface();

    this.modal = new Modal({
      title: '⚡ Rychlé akce',
      content,
      className: 'shortcuts-modal compact-modal',
      size: 'medium',
      onClose: () => this.hide()
    });

    // Create the element first
    this.modal.create();

    // Now attach event handlers
    this.attachEventHandlers();
  }

  createShortcutsInterface() {
    return `
      <div class="shortcuts-panel compact-actions">
        <!-- Actions Grid - Compact -->
        <div class="shortcuts-compact-grid">
          <div class="action-category">
            <h4>Soubor</h4>
            <div class="action-row">
              <button class="action-btn" data-action="newFile" title="Nový soubor (Ctrl+N)">
                <span class="action-icon">📄</span>
                <span class="action-label">Nový</span>
              </button>
              <button class="action-btn" data-action="save" title="Uložit (Ctrl+S)">
                <span class="action-icon">💾</span>
                <span class="action-label">Uložit</span>
              </button>
              <button class="action-btn" data-action="download" title="Stáhnout (Ctrl+D)">
                <span class="action-icon">⬇️</span>
                <span class="action-label">Stáhnout</span>
              </button>
              <button class="action-btn" data-action="downloadAll" title="Stáhnout všechny (nezabalené)">
                <span class="action-icon">📥</span>
                <span class="action-label">Stáhnout vše</span>
              </button>
              <button class="action-btn" data-action="downloadZip" title="Stáhnout jako ZIP">
                <span class="action-icon">📦</span>
                <span class="action-label">ZIP</span>
              </button>
              <button class="action-btn" data-action="closeTab" title="Zavřít (Ctrl+W)">
                <span class="action-icon">❌</span>
                <span class="action-label">Zavřít</span>
              </button>
              <button class="action-btn" data-action="closeOtherTabs" title="Zavřít ostatní taby">
                <span class="action-icon">🗑️</span>
                <span class="action-label">Zavřít ostatní</span>
              </button>
              <button class="action-btn" data-action="closeAllTabs" title="Zavřít všechny taby">
                <span class="action-icon">🧹</span>
                <span class="action-label">Zavřít vše</span>
              </button>
              <button class="action-btn" data-action="saveAllTabs" title="Uložit všechny taby">
                <span class="action-icon">💾✨</span>
                <span class="action-label">Uložit vše</span>
              </button>
            </div>
          </div>

          <div class="action-category">
            <h4>Úpravy</h4>
            <div class="action-row">
              <button class="action-btn" data-action="undo" title="Zpět (Ctrl+Z)">
                <span class="action-icon">↩️</span>
                <span class="action-label">Zpět</span>
              </button>
              <button class="action-btn" data-action="redo" title="Vpřed (Ctrl+Y)">
                <span class="action-icon">↪️</span>
                <span class="action-label">Vpřed</span>
              </button>
              <button class="action-btn" data-action="search" title="Hledat (Ctrl+F)">
                <span class="action-icon">🔍</span>
                <span class="action-label">Hledat</span>
              </button>
              <button class="action-btn" data-action="format" title="Formátovat (Ctrl+Shift+F)">
                <span class="action-icon">✨</span>
                <span class="action-label">Formátovat</span>
              </button>
            </div>
          </div>

          <div class="action-category">
            <h4>Nástroje</h4>
            <div class="action-row">
              <button class="action-btn" data-action="validate" title="Validovat (Ctrl+Shift+V)">
                <span class="action-icon">✅</span>
                <span class="action-label">Validovat</span>
              </button>
              <button class="action-btn" data-action="minify" title="Minifikovat (Ctrl+Shift+M)">
                <span class="action-icon">📦</span>
                <span class="action-label">Minify</span>
              </button>
              <button class="action-btn" data-action="screenshot" title="Screenshot">
                <span class="action-icon">📸</span>
                <span class="action-label">Screenshot</span>
              </button>
              <button class="action-btn" data-action="seo" title="SEO">
                <span class="action-icon">🔧</span>
                <span class="action-label">SEO</span>
              </button>
            </div>
          </div>

          <div class="action-category">
            <h4>Nastavení</h4>
            <div class="action-row">
              <button class="action-btn" data-action="colorScheme" title="Téma">
                <span class="action-icon">🎨</span>
                <span class="action-label">Téma</span>
              </button>
              <button class="action-btn" data-action="devices" title="Zařízení">
                <span class="action-icon">📱</span>
                <span class="action-label">Zařízení</span>
              </button>
              <button class="action-btn" data-action="settings" title="Nastavení (Ctrl+,)">
                <span class="action-icon">⚙️</span>
                <span class="action-label">Nastavení</span>
              </button>
              <button class="action-btn" data-action="publish" title="Publikovat (Ctrl+Shift+P)">
                <span class="action-icon">🚀</span>
                <span class="action-label">Publikovat</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Quick Shortcuts Reference -->
        <div class="shortcuts-footer">
          <small>👉 Tip: Použijte <kbd>Ctrl+K</kbd> pro rychlý přístup odkudkoliv</small>
        </div>
      </div>
    `;
  }

  renderShortcuts() {
    const shortcuts = [
      {
        icon: '💾',
        title: 'Uložit',
        description: 'Uložit aktuální soubor',
        action: 'save',
        shortcut: 'Ctrl+S'
      },
      {
        icon: '⬇️',
        title: 'Stáhnout',
        description: 'Stáhnout jako HTML',
        action: 'download',
        shortcut: 'Ctrl+D'
      },
      {
        icon: '📄',
        title: 'Nový soubor',
        description: 'Vytvořit nový soubor',
        action: 'newFile',
        shortcut: 'Ctrl+N'
      },
      {
        icon: '🔍',
        title: 'Hledat',
        description: 'Hledat v kódu',
        action: 'search',
        shortcut: 'Ctrl+F'
      },
      {
        icon: '✨',
        title: 'Formátovat',
        description: 'Formátovat kód',
        action: 'format',
        shortcut: 'Ctrl+Shift+F'
      },
      {
        icon: '✅',
        title: 'Validovat',
        description: 'Validovat HTML',
        action: 'validate',
        shortcut: 'Ctrl+Shift+V'
      },
      {
        icon: '📦',
        title: 'Minifikovat',
        description: 'Zmenšit kód',
        action: 'minify',
        shortcut: 'Ctrl+Shift+M'
      },

      {
        icon: '↩️',
        title: 'Zpět',
        description: 'Vrátit změnu',
        action: 'undo',
        shortcut: 'Ctrl+Z'
      },
      {
        icon: '↪️',
        title: 'Vpřed',
        description: 'Zopakovat změnu',
        action: 'redo',
        shortcut: 'Ctrl+Y'
      },
      {
        icon: '❌',
        title: 'Zavřít tab',
        description: 'Zavřít aktuální tab',
        action: 'closeTab',
        shortcut: 'Ctrl+W'
      },
      {
        icon: '🎨',
        title: 'Barevné schéma',
        description: 'Přepnout téma',
        action: 'colorScheme',
        shortcut: 'Ctrl+Shift+T'
      },
      {
        icon: '🤖',
        title: 'AI Nastavení',
        description: 'Nastavení AI asistenta',
        action: 'aiSettings',
        shortcut: ''
      }
    ];

    return shortcuts.map(shortcut => `
      <button class="shortcut-card" data-action="${shortcut.action}">
        <div class="shortcut-icon">${shortcut.icon}</div>
        <div class="shortcut-info">
          <div class="shortcut-title">${shortcut.title}</div>
          <div class="shortcut-description">${shortcut.description}</div>
          ${shortcut.shortcut ? `<div class="shortcut-key">${shortcut.shortcut}</div>` : ''}
        </div>
      </button>
    `).join('');
  }

  attachEventHandlers() {
    // Action buttons
    const actionBtns = this.modal.element.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.executeAction(action);
        this.hide();
      });
    });
  }

  executeAction(action) {
    const actionMap = {
      save: 'action:save',
      download: 'action:download',
      downloadAll: 'action:downloadAll',
      downloadZip: 'action:downloadZip',
      newFile: 'action:newTab',
      search: 'action:search',
      format: 'action:format',
      validate: 'action:validate',
      minify: 'action:minify',
      preview: 'preview:refresh',
      console: 'console:toggle',
      undo: 'action:undo',
      redo: 'action:redo',
      closeTab: 'action:closeTab',
      closeOtherTabs: 'action:closeOtherTabs',
      closeAllTabs: 'action:closeAllTabs',
      saveAllTabs: 'action:saveAllTabs',
      colorScheme: 'theme:toggle',
      aiSettings: 'aiSettings:show',
      // Nové akce
      screenshot: 'action:screenshot',
      seo: 'action:seo',
      devices: 'action:devices',
      settings: 'settings:show',
      publish: 'action:publish'
    };

    const event = actionMap[action];
    if (event) {
      eventBus.emit(event);
    }
  }
}
