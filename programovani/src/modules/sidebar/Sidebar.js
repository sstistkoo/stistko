/**
 * Sidebar Module - VS Code style sidebar
 * Files explorer and GitHub repository manager
 */

import { eventBus } from '../../core/events.js';
import { state } from '../../core/state.js';
import toast from '../../ui/components/Toast.js';

export class Sidebar {
  constructor() {
    this.isVisible = false;
    this.activeTab = 'files'; // 'files' or 'github'
    this.sidebarElement = null;
    this.escapeHandler = null; // Store handler reference
    this.init();
  }

  init() {
    this.createSidebar();
    this.setupEventListeners();
    // Sidebar is hidden by default - user can show it with Ctrl+B or logo button
  }

  setupEventListeners() {
    eventBus.on('sidebar:toggle', () => this.toggle());
    eventBus.on('sidebar:show', () => this.show());
    eventBus.on('sidebar:hide', () => this.hide());
    eventBus.on('tabs:updated', () => this.updateFilesList());
    eventBus.on('files:changed', () => this.updateFilesListWithFolders());

    // Update when active file changes
    state.subscribe('files.active', () => {
      if (this.isVisible && this.activeTab === 'files') {
        this.updateFilesListWithFolders();
      }
    });
  }

  createSidebar() {
    // Remove existing sidebar if any
    const existing = document.getElementById('appSidebar');
    if (existing) existing.remove();

    // Create sidebar structure
    const sidebar = document.createElement('div');
    sidebar.id = 'appSidebar';
    sidebar.className = 'app-sidebar';
    sidebar.innerHTML = this.createSidebarHTML();

    // Insert into DOM
    document.body.appendChild(sidebar);
    this.sidebarElement = sidebar;

    // Attach event handlers
    this.attachEventHandlers();
  }

  createSidebarHTML() {
    return `
      <!-- Sidebar Header -->
      <div class="sidebar-header">
        <div class="sidebar-tabs">
          <button class="sidebar-tab active" data-tab="files" title="Soubory">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <path d="M13 2v7h7"/>
            </svg>
            <span>Soubory</span>
          </button>
          <button class="sidebar-tab" data-tab="github" title="GitHub">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
            </svg>
            <span>GitHub</span>
          </button>
        </div>
        <button class="sidebar-close" id="sidebarClose" title="Zavřít (Escape)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Sidebar Content -->
      <div class="sidebar-content">
        <!-- Files Tab -->
        <div class="sidebar-panel active" data-panel="files">
          <div class="panel-section">
            <div class="section-header">
              <h3>📂 Otevřené soubory</h3>
              <span class="file-count">0</span>
            </div>
            <div class="files-list" id="openFilesList">
              <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                  <path d="M13 2v7h7"/>
                </svg>
                <p>Žádné otevřené soubory</p>
                <small>Vytvořte nový soubor nebo otevřete existující</small>
              </div>
            </div>
          </div>

          <div class="panel-section">
            <div class="section-header">
              <h3>⚡ Rychlé akce</h3>
            </div>
            <div class="quick-actions">
              <button class="action-btn" data-action="newFile">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6M12 18v-6m-3 3h6"/>
                </svg>
                <span>Nový soubor</span>
              </button>
              <button class="action-btn" data-action="save">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <path d="M17 21v-8H7v8M7 3v5h8"/>
                </svg>
                <span>Uložit</span>
              </button>
              <button class="action-btn" data-action="download">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <path d="M7 10l5 5 5-5M12 15V3"/>
                </svg>
                <span>Stáhnout</span>
              </button>
            </div>
          </div>
        </div>

        <!-- GitHub Tab -->
        <div class="sidebar-panel" data-panel="github">
          <div class="panel-section">
            <div class="github-status" id="githubStatus">
              <div class="status-badge disconnected">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
                <span>Nepřipojeno</span>
              </div>
            </div>
          </div>

          <div class="panel-section">
            <div class="section-header">
              <h3>🔐 Přihlášení</h3>
            </div>
            <button class="github-login-btn" id="githubLoginBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
              </svg>
              <span>Přihlásit se na GitHub</span>
            </button>
          </div>

          <div class="panel-section" id="githubRepoSection" style="display: none;">
            <div class="section-header">
              <h3>📦 Repozitář</h3>
            </div>
            <div class="repo-info" id="repoInfo">
              <!-- Repo info will be populated here -->
            </div>
          </div>

          <div class="panel-section">
            <div class="section-header">
              <h3>📘 GitHub Pages</h3>
            </div>
            <div class="github-pages-info">
              <p class="info-text">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
                Pro použití GitHub Pages se přihlaste a připojte repozitář
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachEventHandlers() {
    // Close button
    const closeBtn = this.sidebarElement.querySelector('#sidebarClose');
    closeBtn?.addEventListener('click', () => this.hide());

    // Tab switching
    const tabs = this.sidebarElement.querySelectorAll('.sidebar-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Quick actions
    const actionBtns = this.sidebarElement.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.handleQuickAction(action);
      });
    });

    // GitHub login
    const loginBtn = this.sidebarElement.querySelector('#githubLoginBtn');
    loginBtn?.addEventListener('click', () => this.showGitHubLoginModal());

    // Close on Escape - store handler to remove later
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }

    this.escapeHandler = (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        // Check if modal is open
        const modalOpen = document.querySelector('.modal-overlay');
        if (!modalOpen) {
          this.hide();
        }
      }
    };
    document.addEventListener('keydown', this.escapeHandler);

    // Close on overlay click - but not if modal is open
    this.sidebarElement.addEventListener('click', (e) => {
      if (e.target === this.sidebarElement) {
        const modalOpen = document.querySelector('.modal-overlay');
        if (!modalOpen) {
          this.hide();
        }
      }
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    // Update tab buttons
    const tabs = this.sidebarElement.querySelectorAll('.sidebar-tab');
    tabs.forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Update panels
    const panels = this.sidebarElement.querySelectorAll('.sidebar-panel');
    panels.forEach(panel => {
      if (panel.dataset.panel === tabName) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Update content if needed
    if (tabName === 'files') {
      this.updateFilesList();
    } else if (tabName === 'github') {
      this.updateGitHubStatus();
    }
  }

  handleQuickAction(action) {
    eventBus.emit(`action:${action}`);

    // Don't auto-close for certain actions
    if (action !== 'newFile') {
      setTimeout(() => this.hide(), 300);
    }
  }

  updateFilesList() {
    const filesList = this.sidebarElement?.querySelector('#openFilesList');
    if (!filesList) return;

    // Get tabs from state
    const tabs = state.get('tabs.list') || [];
    const activeIndex = state.get('tabs.activeIndex') || 0;

    // Update count
    const countElement = this.sidebarElement.querySelector('.file-count');
    if (countElement) {
      countElement.textContent = tabs.length;
    }

    if (tabs.length === 0) {
      filesList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
            <path d="M13 2v7h7"/>
          </svg>
          <p>Žádné otevřené soubory</p>
          <small>Vytvořte nový soubor nebo otevřete existující</small>
        </div>
      `;
      return;
    }

    filesList.innerHTML = tabs.map((tab, index) => {
      const isActive = index === activeIndex;
      const icon = tab.language === 'html' ? '📄' :
                   tab.language === 'css' ? '🎨' :
                   tab.language === 'javascript' ? '⚡' : '📝';

      return `
        <div class="file-item ${isActive ? 'active' : ''}" data-index="${index}">
          <span class="file-icon">${icon}</span>
          <span class="file-name">${tab.name || 'Bez názvu'}</span>
          <button class="file-close" data-index="${index}" title="Zavřít">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `;
    }).join('');

    // Attach file click handlers
    filesList.querySelectorAll('.file-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.file-close')) {
          const index = parseInt(item.dataset.index);
          eventBus.emit('tabs:switch', { index });
          this.hide();
        }
      });
    });

    // Attach close handlers
    filesList.querySelectorAll('.file-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        eventBus.emit('tabs:close', { index });
      });
    });
  }

  updateFilesListWithFolders() {
    const filesList = this.sidebarElement?.querySelector('#openFilesList');
    if (!filesList) {
      console.warn('⚠️ Sidebar: #openFilesList not found');
      return;
    }

    // Get tabs from new state structure
    const tabs = state.get('files.tabs') || [];
    const activeFileId = state.get('files.active');

    console.log('📁 Sidebar: Updating files list', { tabsCount: tabs.length, activeFileId });

    // Update count
    const countElement = this.sidebarElement.querySelector('.file-count');
    if (countElement) {
      countElement.textContent = tabs.length;
    }

    if (tabs.length === 0) {
      filesList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
            <path d="M13 2v7h7"/>
          </svg>
          <p>Žádné otevřené soubory</p>
          <small>Vytvořte nový soubor nebo otevřete existující</small>
        </div>
      `;
      return;
    }

    // Organize files into folder structure
    const fileTree = this.buildFileTree(tabs);

    // Render file tree
    filesList.innerHTML = this.renderFileTree(fileTree, activeFileId);

    // Attach event handlers
    this.attachFileTreeHandlers(filesList, activeFileId);
  }

  buildFileTree(tabs) {
    const tree = {};

    tabs.forEach(tab => {
      const path = tab.path || tab.name;
      const parts = path.split('/');

      if (parts.length === 1) {
        // Root file
        if (!tree._files) tree._files = [];
        tree._files.push(tab);
      } else {
        // File in folder
        let current = tree;
        for (let i = 0; i < parts.length - 1; i++) {
          const folder = parts[i];
          if (!current[folder]) {
            current[folder] = { _files: [] };
          }
          current = current[folder];
        }
        current._files.push(tab);
      }
    });

    return tree;
  }

  renderFileTree(tree, activeFileId, level = 0) {
    let html = '';

    // Render folders first
    Object.keys(tree).forEach(key => {
      if (key === '_files') return;

      const folder = tree[key];
      html += `
        <div class="folder-item" data-folder="${key}" style="padding-left: ${level * 20 + 12}px;">
          <span class="folder-toggle">▼</span>
          <span class="folder-icon">📂</span>
          <span class="folder-name">${key}</span>
        </div>
        <div class="folder-content" data-folder-content="${key}">
          ${this.renderFileTree(folder, activeFileId, level + 1)}
        </div>
      `;
    });

    // Render root files after folders
    if (tree._files) {
      tree._files.forEach(tab => {
        const isActive = tab.id === activeFileId;
        const icon = this.getFileIcon(tab.name);
        const fileName = tab.path ? tab.path.split('/').pop() : tab.name;
        html += `
          <div class="file-item ${isActive ? 'active' : ''}" data-file-id="${tab.id}" style="padding-left: ${level * 20 + 12}px;">
            <span class="file-icon">${icon}</span>
            <span class="file-name">${fileName}</span>
          </div>
        `;
      });
    }

    return html;
  }

  attachFileTreeHandlers(filesList, activeFileId) {
    // File click handlers
    filesList.querySelectorAll('.file-item').forEach(item => {
      // Single click - open file
      item.addEventListener('click', () => {
        const fileId = parseInt(item.dataset.fileId);
        eventBus.emit('file:open', { fileId });
      });

      // Double click - rename file
      item.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const fileId = parseInt(item.dataset.fileId);
        const fileNameSpan = item.querySelector('.file-name');
        const currentName = fileNameSpan.textContent;

        this.startRenameFile(fileId, fileNameSpan, currentName);
      });
    });

    // Folder toggle handlers
    filesList.querySelectorAll('.folder-item').forEach(item => {
      item.addEventListener('click', () => {
        const folderName = item.dataset.folder;
        const content = filesList.querySelector(`[data-folder-content="${folderName}"]`);
        const toggle = item.querySelector('.folder-toggle');

        if (content && toggle) {
          const isOpen = content.style.display !== 'none';
          content.style.display = isOpen ? 'none' : 'block';
          toggle.textContent = isOpen ? '▶' : '▼';

          // Update folder icon
          const folderIcon = item.querySelector('.folder-icon');
          if (folderIcon) {
            folderIcon.textContent = isOpen ? '📁' : '📂';
          }
        }
      });
    });
  }

  getFileIcon(fileName) {
    if (fileName.endsWith('.html') || fileName.endsWith('.htm')) return '📄';
    if (fileName.endsWith('.css')) return '🎨';
    if (fileName.endsWith('.js')) return '⚡';
    if (fileName.endsWith('.json')) return '📋';
    if (fileName.endsWith('.md')) return '📝';
    if (fileName.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) return '🖼️';
    return '📄';
  }

  startRenameFile(fileId, fileNameSpan, currentName) {
    // Create input field for renaming
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'file-rename-input';
    input.style.cssText = `
      width: 100%;
      padding: 2px 4px;
      background: var(--bg-tertiary, #3d3d3d);
      color: var(--text-primary, #fff);
      border: 1px solid var(--accent, #007acc);
      border-radius: 3px;
      font-size: 13px;
      font-family: inherit;
    `;

    // Replace span with input
    const parent = fileNameSpan.parentElement;
    fileNameSpan.style.display = 'none';
    parent.appendChild(input);
    input.focus();
    input.select();

    const finishRename = (save) => {
      if (save) {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
          this.renameFile(fileId, newName);
        }
      }

      // Restore original span
      input.remove();
      fileNameSpan.style.display = '';
    };

    // Save on Enter, cancel on Escape
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishRename(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishRename(false);
      }
    });

    // Save on blur (click outside)
    input.addEventListener('blur', () => {
      finishRename(true);
    });
  }

  renameFile(fileId, newName) {
    const tabs = state.get('files.tabs') || [];
    const tab = tabs.find(t => t.id === fileId);

    if (!tab) {
      toast.error('Soubor nenalezen', 2000);
      return;
    }

    // Update tab name and path
    const oldName = tab.name;
    tab.name = newName;

    // Update path if it exists
    if (tab.path) {
      const pathParts = tab.path.split('/');
      pathParts[pathParts.length - 1] = newName;
      tab.path = pathParts.join('/');
    }

    // Update file type based on new extension
    if (newName.endsWith('.html') || newName.endsWith('.htm')) tab.type = 'html';
    else if (newName.endsWith('.css')) tab.type = 'css';
    else if (newName.endsWith('.js')) tab.type = 'javascript';
    else if (newName.endsWith('.json')) tab.type = 'json';
    else if (newName.endsWith('.md')) tab.type = 'markdown';
    else tab.type = 'text';

    // Save updated tabs
    state.set('files.tabs', tabs);

    // Refresh file list
    this.updateFilesListWithFolders();

    toast.success(`📝 Soubor přejmenován: ${oldName} → ${newName}`, 2000);
  }

  updateGitHubStatus() {
    const username = localStorage.getItem('github_username');
    const statusElement = this.sidebarElement?.querySelector('#githubStatus');
    const repoSection = this.sidebarElement?.querySelector('#githubRepoSection');

    if (!statusElement) return;

    if (username) {
      statusElement.innerHTML = `
        <div class="status-badge connected">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          <span>Připojeno jako @${username}</span>
        </div>
      `;

      if (repoSection) {
        repoSection.style.display = 'block';
      }
    } else {
      statusElement.innerHTML = `
        <div class="status-badge disconnected">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M15 9l-6 6M9 9l6 6"/>
          </svg>
          <span>Nepřipojeno</span>
        </div>
      `;

      if (repoSection) {
        repoSection.style.display = 'none';
      }
    }
  }

  showGitHubLoginModal() {
    // Prevent multiple modals
    const existingModal = document.querySelector('.github-login-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create login modal with same structure as blank modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay github-login-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
            </svg>
            Přihlášení na GitHub
          </h2>
          <button class="modal-close" aria-label="Zavřít">&times;</button>
        </div>
        <div class="modal-body">
          <p class="info-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            V produkční verzi by se zde otevřelo OAuth okno od GitHubu. Pro demo zadejte své GitHub údaje:
          </p>
          <div class="form-group">
            <label for="githubUsername">GitHub uživatelské jméno</label>
            <input
              type="text"
              id="githubUsername"
              name="github-username"
              placeholder="např. octocat"
              class="github-input"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
            />
          </div>
          <div class="form-group">
            <label for="githubToken">Personal Access Token (volitelné)</label>
            <input
              type="password"
              id="githubToken"
              name="github-token"
              placeholder="ghp_..."
              class="github-input"
              autocomplete="new-password"
            />
            <small class="help-text">
              Pro plný přístup k API vytvořte token na
              <a href="https://github.com/settings/tokens" target="_blank">github.com/settings/tokens</a>
            </small>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-action="cancel">Zrušit</button>
          <button class="btn btn-primary" data-action="login">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
            </svg>
            Přihlásit se
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Focus input
    setTimeout(() => {
      modal.querySelector('#githubUsername')?.focus();
    }, 100);

    // Handle modal actions
    const closeModal = () => {
      modal.classList.add('closing');
      setTimeout(() => {
        modal.remove();
        document.removeEventListener('keydown', escapeHandler);
      }, 300);
    };

    // Prevent event bubbling on modal content
    modal.querySelector('.modal-content')?.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    modal.querySelector('.modal-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeModal();
    });

    // Click outside modal to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    modal.querySelector('[data-action="cancel"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeModal();
    });

    const handleLogin = () => {
      const username = modal.querySelector('#githubUsername').value.trim();
      const token = modal.querySelector('#githubToken').value.trim();

      if (!username) {
        toast.error('Zadejte uživatelské jméno');
        return;
      }

      // Store credentials
      localStorage.setItem('github_username', username);
      if (token) {
        localStorage.setItem('github_token', token);
      }

      toast.success(`Připojeno jako @${username}`);
      this.updateGitHubStatus();
      closeModal();
    };

    modal.querySelector('[data-action="login"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handleLogin();
    });

    // Enter to submit
    modal.querySelectorAll('.github-input').forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleLogin();
        }
      });
    });

    // Escape to close
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Show modal
    setTimeout(() => modal.classList.add('show'), 10);
  }

  show() {
    if (this.isVisible) return;

    console.log('👁️ Sidebar: Showing sidebar');
    this.sidebarElement.classList.add('visible');
    this.isVisible = true;

    // Update content
    if (this.activeTab === 'files') {
      this.updateFilesListWithFolders();
    } else if (this.activeTab === 'github') {
      this.updateGitHubStatus();
    }

    // Add body class
    document.body.classList.add('sidebar-open');
  }

  hide() {
    if (!this.isVisible) return;

    this.sidebarElement.classList.remove('visible');
    this.isVisible = false;
    document.body.classList.remove('sidebar-open');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  destroy() {
    // Cleanup event listeners
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }

    // Remove sidebar element
    if (this.sidebarElement) {
      this.sidebarElement.remove();
    }
  }
}
