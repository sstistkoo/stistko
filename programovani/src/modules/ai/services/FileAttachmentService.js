/**
 * File Attachment Service
 * Handles file attachment for AI context (project files and disk uploads)
 */

import { state } from '../../../core/state.js';
import { Modal } from '../../../ui/components/Modal.js';
import { toast } from '../../../ui/components/Toast.js';

export class FileAttachmentService {
  constructor(aiPanel) {
    this.aiPanel = aiPanel;
    this.attachedFiles = [];
    this.diskFiles = [];
  }

  /**
   * Show file attachment modal
   */
  showFileAttachmentModal() {
    const modal = new Modal({
      title: '📎 Přidat soubory do kontextu',
      content: `
        <div class="file-attachment-modal">
          <p class="file-attachment-description">
            Vyberte soubory z projektu nebo nahrajte z disku.
            <strong>Tip:</strong> Menší soubory = rychlejší odpovědi AI.
          </p>

          <!-- Tab Switcher -->
          <div class="file-source-tabs" style="display: flex; gap: 10px; margin-bottom: 16px; border-bottom: 2px solid var(--border);">
            <button class="file-source-tab active" data-source="project" style="padding: 10px 20px; background: none; border: none; border-bottom: 3px solid var(--accent); color: var(--accent); cursor: pointer; font-weight: 600;">
              📁 Soubory projektu
            </button>
            <button class="file-source-tab" data-source="disk" style="padding: 10px 20px; background: none; border: none; border-bottom: 3px solid transparent; color: var(--text-secondary); cursor: pointer; font-weight: 600;">
              💾 Nahrát z disku
            </button>
          </div>

          <!-- Project Files Tab -->
          <div class="file-source-content" data-content="project">
            <div class="file-filter">
              <input type="text" id="fileFilterInput" placeholder="🔍 Filtrovat soubory..." class="file-filter-input">
              <div class="file-filter-tips" style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
                💡 <strong>Tip:</strong> Ctrl+Click pro výběr více souborů najednou
              </div>
            </div>

            <div class="file-list-container" id="fileListContainer">
              <div class="file-list" id="attachFileList">
                ${this.renderProjectFiles()}
              </div>
            </div>
          </div>

          <!-- Disk Upload Tab -->
          <div class="file-source-content" data-content="disk" style="display: none;">
            <div class="disk-upload-area" style="padding: 40px; border: 2px dashed var(--border); border-radius: 8px; text-align: center; background: var(--bg-secondary);">
              <div style="font-size: 48px; margin-bottom: 16px;">📤</div>
              <p style="margin-bottom: 16px; color: var(--text-primary); font-size: 16px;">
                <strong>Klikněte pro výběr souborů</strong> nebo je přetáhněte sem
              </p>
              <input type="file" id="diskFileInput" multiple accept=".txt,.js,.jsx,.ts,.tsx,.html,.css,.json,.md,.py,.java,.cpp,.c,.php,.rb,.go,.rs,.xml,.yaml,.yml" style="display: none;">
              <button type="button" id="selectDiskFilesBtn" style="padding: 12px 24px; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">
                📂 Vybrat soubory
              </button>
              <p style="margin-top: 12px; font-size: 12px; color: var(--text-secondary);">
                Podporované: .txt, .js, .html, .css, .json, .md, .py a další
              </p>
            </div>
            <div id="selectedDiskFiles" style="margin-top: 16px;"></div>
          </div>

          <div class="attachment-summary" id="attachmentSummary">
            <strong>Vybráno:</strong> <span id="selectedCount">0</span> souborů
            (<span id="selectedSize">0</span> znaků) -
            <span id="sizeWarning" style="color: #f59e0b; display: none;">⚠️ Velké soubory mohou zpomalit AI</span>
          </div>
        </div>
      `,
      width: '600px',
      buttons: [
        {
          text: '✅ OK - Přidat vybrané',
          variant: 'primary',
          onClick: () => {
            this.attachSelectedFiles();
            modal.close();
          }
        },
        {
          text: 'Zrušit',
          variant: 'secondary',
          onClick: () => modal.close()
        }
      ]
    });

    modal.open();
    this.setupFileAttachmentHandlers(modal);
  }

  /**
   * Render project files for selection
   */
  renderProjectFiles() {
    const files = [
      {
        name: state.get('file.name') || 'index.html',
        content: state.get('editor.content') || '',
        path: state.get('file.name') || 'index.html',
        size: (state.get('editor.content') || '').length
      }
    ];

    const savedFiles = state.get('project.files') || {};
    Object.entries(savedFiles).forEach(([path, content]) => {
      if (path !== files[0].path) {
        files.push({
          name: path.split('/').pop(),
          content: content,
          path: path,
          size: content.length
        });
      }
    });

    if (files.length === 0) {
      return '<p class="no-files">Žádné soubory k dispozici</p>';
    }

    return files.map((file, index) => `
      <div class="file-item" data-file-index="${index}" data-file-path="${file.path}">
        <input type="checkbox" id="file-${index}" class="file-checkbox">
        <label for="file-${index}" class="file-label">
          <span class="file-icon">📄</span>
          <span class="file-name">${this.escapeHtml(file.name)}</span>
          <span class="file-size">${this.formatFileSize(file.size)}</span>
        </label>
      </div>
    `).join('');
  }

  /**
   * Setup handlers for file attachment modal
   */
  setupFileAttachmentHandlers(modal) {
    const filterInput = modal.element.querySelector('#fileFilterInput');
    const fileList = modal.element.querySelector('#attachFileList');
    const checkboxes = modal.element.querySelectorAll('.file-checkbox');
    const sizeWarning = modal.element.querySelector('#sizeWarning');

    // Tab switching
    const tabs = modal.element.querySelectorAll('.file-source-tab');
    const contents = modal.element.querySelectorAll('.file-source-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const source = tab.dataset.source;

        tabs.forEach(t => {
          t.classList.remove('active');
          t.style.borderBottomColor = 'transparent';
          t.style.color = 'var(--text-secondary)';
        });
        tab.classList.add('active');
        tab.style.borderBottomColor = 'var(--accent)';
        tab.style.color = 'var(--accent)';

        contents.forEach(c => {
          c.style.display = c.dataset.content === source ? 'block' : 'none';
        });
      });
    });

    // Disk file upload handlers
    const diskFileInput = modal.element.querySelector('#diskFileInput');
    const selectBtn = modal.element.querySelector('#selectDiskFilesBtn');
    const diskUploadArea = modal.element.querySelector('.disk-upload-area');

    if (selectBtn && diskFileInput) {
      selectBtn.addEventListener('click', () => diskFileInput.click());
      diskFileInput.addEventListener('change', (e) => {
        this.handleDiskFilesSelected(e.target.files, modal);
      });

      // Drag and drop
      diskUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        diskUploadArea.style.borderColor = 'var(--accent)';
        diskUploadArea.style.background = 'rgba(59, 130, 246, 0.1)';
      });

      diskUploadArea.addEventListener('dragleave', () => {
        diskUploadArea.style.borderColor = 'var(--border)';
        diskUploadArea.style.background = 'var(--bg-secondary)';
      });

      diskUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        diskUploadArea.style.borderColor = 'var(--border)';
        diskUploadArea.style.background = 'var(--bg-secondary)';
        this.handleDiskFilesSelected(e.dataTransfer.files, modal);
      });
    }

    // Filter files
    if (filterInput) {
      filterInput.addEventListener('input', (e) => {
        const filter = e.target.value.toLowerCase();
        const items = fileList.querySelectorAll('.file-item');
        items.forEach(item => {
          const name = item.querySelector('.file-name').textContent.toLowerCase();
          item.style.display = name.includes(filter) ? 'flex' : 'none';
        });
      });
      filterInput.focus();
    }

    // Update summary
    const updateSummary = () => {
      const checked = Array.from(checkboxes).filter(cb => cb.checked);
      const totalSize = checked.reduce((sum, cb) => {
        const fileItem = cb.closest('.file-item');
        const path = fileItem.dataset.filePath;
        const content = this.getFileContent(path);
        return sum + (content?.length || 0);
      }, 0);

      modal.element.querySelector('#selectedCount').textContent = checked.length;
      modal.element.querySelector('#selectedSize').textContent = totalSize.toLocaleString();

      if (sizeWarning) {
        sizeWarning.style.display = totalSize > 50000 ? 'inline' : 'none';
      }
    };

    checkboxes.forEach(cb => {
      cb.addEventListener('change', updateSummary);
      cb.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        }
      });
    });
  }

  /**
   * Get file content by path
   */
  getFileContent(path) {
    const currentFile = state.get('file.name') || 'index.html';
    if (path === currentFile) {
      return state.get('editor.content') || '';
    }
    const savedFiles = state.get('project.files') || {};
    return savedFiles[path] || '';
  }

  /**
   * Handle files selected from disk
   */
  async handleDiskFilesSelected(files, modal) {
    const selectedContainer = modal.element.querySelector('#selectedDiskFiles');
    const MAX_FILE_SIZE = 500000; // 500KB per file

    if (!files || files.length === 0) return;

    const filePromises = Array.from(files).map(file => {
      return new Promise((resolve) => {
        if (file.size > MAX_FILE_SIZE) {
          toast.warning(`⚠️ Soubor ${file.name} je příliš velký (max 500KB)`, 3000);
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            name: file.name,
            path: `disk:/${file.name}`,
            content: e.target.result,
            size: file.size,
            source: 'disk'
          });
        };
        reader.onerror = () => {
          toast.error(`❌ Chyba při čtení ${file.name}`, 3000);
          resolve(null);
        };
        reader.readAsText(file);
      });
    });

    try {
      const loadedFiles = (await Promise.all(filePromises)).filter(f => f !== null);

      if (loadedFiles.length === 0) return;

      this.diskFiles = [...this.diskFiles, ...loadedFiles];

      selectedContainer.innerHTML = `
        <div style="padding: 12px; background: var(--bg-secondary); border-radius: 6px; margin-top: 12px;">
          <strong style="color: var(--text-primary);">Načtené soubory (${this.diskFiles.length}):</strong>
          <div style="margin-top: 8px;">
            ${this.diskFiles.map((file, index) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px; background: var(--bg-primary); border-radius: 4px; margin-top: 4px;">
                <span style="color: var(--text-primary);">📄 ${this.escapeHtml(file.name)} (${this.formatFileSize(file.size)})</span>
                <button onclick="window.aiPanel.fileAttachmentService.removeDiskFile(${index})" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 11px;">✕</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      toast.show(`📎 Načteno ${loadedFiles.length} souborů z disku`, 'success');
    } catch (error) {
      console.error('Error loading disk files:', error);
      toast.error('❌ Chyba při načítání souborů', 3000);
    }
  }

  /**
   * Remove disk file
   */
  removeDiskFile(index) {
    if (!this.diskFiles) return;

    this.diskFiles.splice(index, 1);

    const selectedContainer = document.querySelector('#selectedDiskFiles');
    if (selectedContainer && this.diskFiles.length > 0) {
      selectedContainer.innerHTML = `
        <div style="padding: 12px; background: var(--bg-secondary); border-radius: 6px; margin-top: 12px;">
          <strong style="color: var(--text-primary);">Načtené soubory (${this.diskFiles.length}):</strong>
          <div style="margin-top: 8px;">
            ${this.diskFiles.map((file, idx) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px; background: var(--bg-primary); border-radius: 4px; margin-top: 4px;">
                <span style="color: var(--text-primary);">📄 ${this.escapeHtml(file.name)} (${this.formatFileSize(file.size)})</span>
                <button onclick="window.aiPanel.fileAttachmentService.removeDiskFile(${idx})" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 11px;">✕</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (selectedContainer) {
      selectedContainer.innerHTML = '';
    }

    toast.show('🗑️ Soubor odebrán', 'info');
  }

  /**
   * Attach selected files
   */
  attachSelectedFiles() {
    try {
      const checkboxes = document.querySelectorAll('.file-checkbox:checked');
      const files = [];
      let totalSize = 0;
      const MAX_TOTAL_SIZE = 100000; // 100KB limit

      checkboxes.forEach(cb => {
        const fileItem = cb.closest('.file-item');
        if (!fileItem) return;

        const path = fileItem.dataset.filePath;
        const nameElement = fileItem.querySelector('.file-name');
        if (!nameElement) return;

        const name = nameElement.textContent;
        const content = this.getFileContent(path);

        if (!content) {
          console.warn(`Soubor ${name} nemá žádný obsah`);
          return;
        }

        totalSize += content.length;
        if (totalSize > MAX_TOTAL_SIZE) {
          toast.warning(`⚠️ Celková velikost souborů překračuje ${(MAX_TOTAL_SIZE / 1024).toFixed(0)}KB limit. Některé soubory nebyly přidány.`, 4000);
          return;
        }

        files.push({ name, path, content });
      });

      if (files.length === 0) {
        toast.warning('❌ Žádné soubory k připojení', 2000);
        return;
      }

      // Include disk files
      if (this.diskFiles && this.diskFiles.length > 0) {
        files.push(...this.diskFiles);
        totalSize += this.diskFiles.reduce((sum, f) => sum + f.size, 0);
      }

      this.attachedFiles = files;
      this.updateAttachedFilesDisplay();

      // Clear disk files
      this.diskFiles = [];

      toast.show(`📎 Přidáno ${files.length} souborů (${(totalSize / 1024).toFixed(1)}KB)`, 'success');
    } catch (error) {
      console.error('Error attaching files:', error);
      toast.error('❌ Chyba při připojování souborů', 3000);
    }
  }

  /**
   * Update attached files display - VS Code style chips
   */
  updateAttachedFilesDisplay() {
    const container = this.aiPanel.modal?.element?.querySelector('#aiAttachedFiles');
    if (!container) return;

    if (this.attachedFiles.length === 0) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    container.style.display = 'block';
    container.style.marginBottom = '10px';
    container.style.padding = '8px';
    container.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1))';
    container.style.border = '1px solid rgba(139, 92, 246, 0.3)';
    container.style.borderRadius = '8px';

    const totalSize = this.attachedFiles.reduce((sum, f) => sum + (f.size || 0), 0);

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">
          📎 Připojené soubory (${this.attachedFiles.length}) - ${this.formatFileSize(totalSize)}
        </span>
        <button onclick="window.aiPanel.fileAttachmentService.clearAttachedFiles()"
                style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 4px; padding: 2px 8px; font-size: 11px; color: #ef4444; cursor: pointer;"
                title="Odebrat všechny">
          Vymazat vše
        </button>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${this.attachedFiles.map((file, index) => `
          <div class="attached-file-chip" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; font-size: 12px;">
            <span style="color: #8b5cf6;">📄</span>
            <span style="color: var(--text-primary); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(file.name)}">${this.escapeHtml(file.name)}</span>
            <span style="color: var(--text-secondary); font-size: 10px;">${this.formatFileSize(file.size || 0)}</span>
            <button onclick="window.aiPanel.fileAttachmentService.removeAttachedFile(${index})"
                    style="background: none; border: none; cursor: pointer; padding: 0; display: flex; color: var(--text-secondary);"
                    title="Odebrat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Remove attached file
   */
  removeAttachedFile(index) {
    this.attachedFiles.splice(index, 1);
    this.updateAttachedFilesDisplay();
    toast.show('🗑️ Soubor odebrán z kontextu', 'info');
  }

  /**
   * Clear all attached files
   */
  clearAttachedFiles() {
    this.attachedFiles = [];
    this.updateAttachedFilesDisplay();
  }

  /**
   * Get attached files
   */
  getAttachedFiles() {
    return this.attachedFiles;
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Detect language from file extension
   */
  detectLanguage(ext) {
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'rb': 'ruby',
      'php': 'php',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'sh': 'bash',
      'sql': 'sql'
    };

    return languageMap[ext.toLowerCase()] || 'plaintext';
  }

  /**
   * Escape HTML for safe display
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }
}
