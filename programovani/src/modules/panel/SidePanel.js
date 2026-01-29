/**
 * Simple Side Panel - Levý vysouvací panel s GitHub a soubory
 */

import { eventBus } from '../../core/events.js';
import { state } from '../../core/state.js';
import toast from '../../ui/components/Toast.js';

export class SidePanel {
  constructor() {
    this.panel = null;
    this.isVisible = false;
    this.escHandler = null;
  }

  show() {
    if (this.panel) {
      this.panel.classList.add('show');
      document.body.classList.add('sidebar-open');
      this.isVisible = true;
      return;
    }

    this.create();
  }

  hide() {
    if (this.panel) {
      this.panel.classList.remove('show');
      document.body.classList.remove('sidebar-open');
      this.isVisible = false;
    }
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  create() {
    const existing = document.querySelector('.side-panel');
    if (existing) {
      existing.remove();
    }

    this.panel = document.createElement('div');
    this.panel.className = 'side-panel';
    this.panel.innerHTML = `
      <div class="panel-header">
        <h2>🐙 GitHub Manager</h2>
        <button class="panel-close" aria-label="Zavřít">&times;</button>
      </div>
      <div class="panel-body">
        <!-- GitHub Section -->
        <div style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
            </svg>
            GitHub
          </h3>
          <div id="panelGitHubStatus" style="background: var(--bg-secondary); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
            <p style="color: var(--text-secondary); font-size: 14px; margin: 0;">Nepřipojeno</p>
          </div>
          <button class="btn btn-primary" data-action="github-login" style="width: 100%; padding: 12px; border: none; border-radius: 6px; background: var(--primary); color: white; cursor: pointer; font-weight: 500; min-height: 44px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; vertical-align: middle; margin-right: 8px;">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
            </svg>
            Přihlásit se na GitHub
          </button>
        </div>

        <!-- Files Section -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <path d="M13 2v7h7"/>
            </svg>
            Soubory
          </h3>
          <button class="btn btn-secondary" data-action="newFile" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-weight: 500; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Nový soubor
          </button>
          <div id="panelFilesList" style="background: var(--bg-secondary); border-radius: 8px; padding: 8px; max-height: 300px; overflow-y: auto;">
            ${this.renderFilesList()}
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
    document.body.appendChild(this.panel);
    setTimeout(() => {
      this.panel.classList.add('show');
      document.body.classList.add('sidebar-open');
      this.isVisible = true;
    }, 10);

    // Subscribe to file changes
    this.setupFileListeners();
  }

  renderFilesList() {
    const tabs = state.get('files.tabs') || [];
    const activeId = state.get('files.active');

    if (tabs.length === 0) {
      return '<p style="color: var(--text-secondary); font-size: 14px; margin: 0; padding: 4px;">Žádné otevřené soubory</p>';
    }

    return tabs.map(tab => {
      const isActive = tab.id === activeId;
      return `
        <div class="file-item ${isActive ? 'active' : ''}" data-file-id="${tab.id}" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          margin: 4px 0;
          border-radius: 6px;
          cursor: pointer;
          background: ${isActive ? 'var(--primary)' : 'transparent'};
          color: ${isActive ? 'white' : 'var(--text-primary)'};
          transition: background 0.2s;
        " onmouseover="if(!this.classList.contains('active')) this.style.background='var(--bg-tertiary)'" onmouseout="if(!this.classList.contains('active')) this.style.background='transparent'">
          <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; flex-shrink: 0;">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <path d="M13 2v7h7"/>
            </svg>
            <span style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${tab.name}">
              ${tab.name}${tab.modified ? ' •' : ''}
            </span>
          </div>
          <button class="file-delete-btn" data-file-id="${tab.id}" style="
            background: transparent;
            border: none;
            color: ${isActive ? 'white' : 'var(--text-secondary)'};
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            opacity: 0.7;
            transition: opacity 0.2s, background 0.2s;
            flex-shrink: 0;
          " onmouseover="this.style.opacity='1'; this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.opacity='0.7'; this.style.background='transparent'" title="Smazat soubor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      `;
    }).join('');
  }

  updateFilesList() {
    const filesListEl = this.panel?.querySelector('#panelFilesList');
    if (filesListEl) {
      filesListEl.innerHTML = this.renderFilesList();
      this.attachFileItemEvents();
    }
  }

  setupFileListeners() {
    // Listen for file changes
    eventBus.on('files:changed', () => {
      this.updateFilesList();
    });

    // Subscribe to state changes
    state.subscribe('files.tabs', () => {
      this.updateFilesList();
    });

    state.subscribe('files.active', () => {
      this.updateFilesList();
    });

    this.attachFileItemEvents();
  }

  attachFileItemEvents() {
    if (!this.panel) return;

    // File item clicks (switch file)
    this.panel.querySelectorAll('.file-item').forEach(item => {
      const fileId = parseInt(item.dataset.fileId);
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking delete button
        if (e.target.closest('.file-delete-btn')) return;

        eventBus.emit('file:open', { fileId });
      });
    });

    // Delete button clicks
    this.panel.querySelectorAll('.file-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fileId = parseInt(btn.dataset.fileId);
        eventBus.emit('file:delete', { fileId });
      });
    });
  }

  attachEvents() {
    this.panel.querySelector('.panel-close')?.addEventListener('click', () => {
      this.hide();
    });

    this.panel.querySelector('[data-action="newFile"]')?.addEventListener('click', () => {
      eventBus.emit('file:new');
    });

    this.panel.querySelector('[data-action="save"]')?.addEventListener('click', () => {
      toast.info('Ukládání...', 2000);
      eventBus.emit('file:save');
    });

    this.panel.querySelector('[data-action="github-login"]')?.addEventListener('click', async () => {
      try {
        // Použij event místo přímého volání window.app
        eventBus.emit('github:showLoginModal', {
          callback: ({ username, token }) => {
            if (username && token) {
              toast.success(`Přihlášen jako ${username}`, 2000);
              const statusEl = this.panel.querySelector('#panelGitHubStatus');
              if (statusEl) {
                statusEl.innerHTML = `<p style="color: var(--success); font-size: 14px; margin: 0;">✓ Přihlášen jako <strong>${username}</strong></p>`;
              }
            }
          }
        });
      } catch (error) {
        console.error('GitHub login error:', error);
      }
    });

    this.escHandler = (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    };
    document.addEventListener('keydown', this.escHandler);
  }

  destroy() {
    if (this.escHandler) {
      document.removeEventListener('keydown', this.escHandler);
    }
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }
}
