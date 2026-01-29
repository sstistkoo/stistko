/**
 * Menu Modals Service
 * Handles all modal dialogs from menu
 */

import { eventBus } from '../../../core/events.js';
import { state } from '../../../core/state.js';
import { Modal } from '../../../ui/components/Modal.js';
import { ComponentLibrary } from './ComponentLibrary.js';
import { TemplateManager } from './TemplateManager.js';
import { ImageLibrary } from './ImageLibrary.js';

export class MenuModals {
  constructor() {
    // No dependencies needed
  }

  // ===== Components Modal =====
  showComponents() {
    const components = ComponentLibrary.getComponents();

    const content = document.createElement('div');
    content.style.padding = '20px';

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;';

    Object.entries(components).forEach(([key, component]) => {
      const card = this.createCard({
        className: 'component-card',
        dataKey: key,
        title: component.name,
        subtitle: component.category
      });
      grid.appendChild(card);
    });

    content.appendChild(grid);

    const modal = new Modal({
      title: '🧩 Knihovna komponent',
      content: content,
      width: '900px'
    });

    modal.open();
    this.attachCardListeners(modal.element, '.component-card', (key) => {
      ComponentLibrary.insertComponent(components[key].code);
      modal.close();
    });
  }

  // ===== Templates Modal =====
  showTemplates() {
    const { builtInTemplates, customTemplates } = TemplateManager.getTemplates();

    const content = document.createElement('div');
    content.style.padding = '20px';

    // Built-in templates section
    content.appendChild(this.createTemplateSection(
      '📋 Vestavěné šablony',
      builtInTemplates,
      'builtin'
    ));

    // Custom templates section
    if (Object.keys(customTemplates).length > 0) {
      content.appendChild(this.createTemplateSection(
        '🎨 Vlastní šablony',
        customTemplates,
        'custom'
      ));
    }

    const modal = new Modal({
      title: '📋 Knihovna šablon',
      content: content,
      width: '900px'
    });

    modal.open();

    // Attach listeners for both template types
    const allTemplates = { ...builtInTemplates, ...customTemplates };
    this.attachCardListeners(modal.element, '.template-card', (key) => {
      const template = allTemplates[key];
      if (template) {
        TemplateManager.applyTemplate(template.code);
        modal.close();
      }
    });
  }

  createTemplateSection(title, templates, type) {
    const section = document.createElement('div');
    section.style.marginBottom = '24px';

    const heading = document.createElement('h4');
    heading.textContent = title;
    section.appendChild(heading);

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; margin-top: 12px;';

    Object.entries(templates).forEach(([key, template]) => {
      const card = this.createCard({
        className: 'template-card',
        dataKey: key,
        dataType: type,
        title: template.name,
        subtitle: template.description || ''
      });
      grid.appendChild(card);
    });

    section.appendChild(grid);
    return section;
  }

  // ===== Images Modal =====
  showImages() {
    const categories = ImageLibrary.getImageCategories();

    const content = document.createElement('div');
    content.style.padding = '20px';

    Object.entries(categories).forEach(([categoryKey, category]) => {
      const section = document.createElement('div');
      section.style.marginBottom = '24px';

      const heading = document.createElement('h4');
      heading.textContent = category.name;
      section.appendChild(heading);

      const grid = document.createElement('div');
      grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-top: 12px;';

      category.images.forEach((image, imageIndex) => {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.dataset.categoryKey = categoryKey;
        card.dataset.imageIndex = imageIndex;
        card.style.cssText = 'border: 1px solid var(--border); border-radius: 8px; padding: 12px; cursor: pointer; text-align: center; background: var(--bg-secondary); transition: all 0.2s;';

        const img = document.createElement('img');
        img.src = image.url;
        img.alt = image.name;
        img.style.cssText = 'width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;';

        const label = document.createElement('div');
        label.textContent = image.name;
        label.style.fontSize = '13px';

        card.appendChild(img);
        card.appendChild(label);
        grid.appendChild(card);
      });

      section.appendChild(grid);
      content.appendChild(section);
    });

    const modal = new Modal({
      title: '🖼️ Knihovna obrázků',
      content: content,
      width: '900px'
    });

    modal.open();

    // Attach image card listeners
    const modalElement = modal.element;
    if (modalElement) {
      modalElement.querySelectorAll('.image-card').forEach(card => {
        const categoryKey = card.dataset.categoryKey;
        const imageIndex = parseInt(card.dataset.imageIndex);
        const image = categories[categoryKey].images[imageIndex];

        this.addHoverEffect(card);

        card.addEventListener('click', () => {
          ImageLibrary.insertImage(image.url, image.width, image.height, image.name);
          modal.close();
        });
      });
    }
  }

  // ===== AI Component Generator =====
  showAIComponentGenerator() {
    const content = `
      <div style="padding: 20px;">
        <p style="margin-bottom: 16px;">Popište komponentu, kterou chcete vytvořit:</p>
        <textarea
          id="aiComponentPrompt"
          placeholder="Např: Vytvořit moderní kontaktní formulář s poli pro jméno, email a zprávu"
          style="width: 100%; min-height: 120px; padding: 12px; border: 1px solid var(--border); border-radius: 6px; font-family: inherit; resize: vertical; background: var(--bg-secondary); color: var(--text-primary);"
        ></textarea>
        <button
          id="aiComponentGenerate"
          style="width: 100%; padding: 12px; margin-top: 12px; background: var(--accent); color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;"
        >
          🚀 Vygenerovat
        </button>
        <div id="aiComponentResult" style="display: none; margin-top: 20px;">
          <h4>Vygenerovaný kód:</h4>
          <pre id="aiComponentCode" style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; overflow-x: auto; max-height: 300px;"></pre>
          <button
            id="aiComponentInsert"
            style="width: 100%; padding: 10px; margin-top: 8px; background: #22c55e; color: white; border: none; border-radius: 6px; cursor: pointer;"
          >
            ✅ Vložit do editoru
          </button>
        </div>
      </div>
    `;

    const modal = new Modal({
      title: '🤖 AI Generátor komponent',
      content,
      width: '600px'
    });

    modal.open();

    const promptTextarea = document.getElementById('aiComponentPrompt');
    const generateBtn = document.getElementById('aiComponentGenerate');
    const resultDiv = document.getElementById('aiComponentResult');
    const codeElement = document.getElementById('aiComponentCode');
    const insertBtn = document.getElementById('aiComponentInsert');
    let generatedCode = '';

    generateBtn?.addEventListener('click', async () => {
      const description = promptTextarea?.value.trim();
      if (!description) return;

      generateBtn.textContent = '⏳ Generuji...';
      generateBtn.disabled = true;

      try {
        const code = await ComponentLibrary.generateAIComponent(description);

        if (code) {
          generatedCode = code;
          codeElement.textContent = code;
          resultDiv.style.display = 'block';
        }
      } catch (error) {
        console.error('AI generation error:', error);
        eventBus.emit('toast:show', {
          message: '❌ Chyba při generování',
          type: 'error'
        });
      }

      generateBtn.textContent = '🚀 Vygenerovat';
      generateBtn.disabled = false;
    });

    insertBtn?.addEventListener('click', () => {
      if (generatedCode) {
        eventBus.emit('editor:insert', generatedCode);
        modal.close();
      }
    });
  }

  // ===== Load from URL Modal =====
  showLoadFromURL() {
    const modal = new Modal({
      title: '🌐 Načíst z URL',
      content: this.getLoadFromURLContent(),
      className: 'load-url-modal',
      closeOnEscape: true,
      closeOnOverlay: true
    });

    modal.create();
    modal.open();

    this.setupLoadFromURLHandlers(modal);
  }

  getLoadFromURLContent() {
    return `
      <div style="padding: 20px;">
        <p style="margin-bottom: 15px; color: var(--text-secondary);">
          Načti obsah HTML, CSS, JS nebo textového souboru z URL adresy.
        </p>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600;">URL adresa:</label>
          <input
            type="url"
            id="urlInput"
            placeholder="https://example.com/file.html"
            style="width: 100%; padding: 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 14px;"
          />
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600;">Akce:</label>
          <select
            id="urlAction"
            style="width: 100%; padding: 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 14px; cursor: pointer;"
          >
            <option value="replace">Nahradit celý editor</option>
            <option value="append">Přidat na konec</option>
            <option value="new-file">Vytvořit nový soubor</option>
          </select>
        </div>

        <div style="padding: 12px; background: rgba(59,130,246,0.1); border-left: 3px solid #3b82f6; border-radius: 4px; margin-bottom: 15px;">
          <strong style="color: #60a5fa;">💡 Tip:</strong>
          <ul style="margin: 8px 0 0 20px; color: var(--text-secondary); font-size: 0.9em;">
            <li>Podporované: HTML, CSS, JS, TXT, MD</li>
            <li>Pro CORS problémy použijeme proxy</li>
            <li>GitHub: Použij "raw" URL</li>
          </ul>
        </div>

        <div style="display: flex; gap: 10px;">
          <button id="loadUrlBtn" style="flex: 1; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
            📥 Načíst
          </button>
          <button id="cancelUrlBtn" style="flex: 1; padding: 12px; background: #6b7280; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
            ❌ Zrušit
          </button>
        </div>

        <div id="urlStatus" style="margin-top: 15px; display: none;"></div>
      </div>
    `;
  }

  setupLoadFromURLHandlers(modal) {
    const urlInput = modal.element.querySelector('#urlInput');
    const urlAction = modal.element.querySelector('#urlAction');
    const loadBtn = modal.element.querySelector('#loadUrlBtn');
    const cancelBtn = modal.element.querySelector('#cancelUrlBtn');
    const statusDiv = modal.element.querySelector('#urlStatus');

    setTimeout(() => urlInput?.focus(), 100);

    cancelBtn?.addEventListener('click', () => modal.close());

    loadBtn?.addEventListener('click', async () => {
      const url = urlInput?.value?.trim();
      const action = urlAction?.value || 'replace';

      if (!url) {
        this.showUrlStatus(statusDiv, 'error', '❌ Zadejte URL adresu');
        return;
      }

      try {
        new URL(url);
      } catch (e) {
        this.showUrlStatus(statusDiv, 'error', '❌ Neplatná URL adresa');
        return;
      }

      loadBtn.disabled = true;
      loadBtn.textContent = '⏳ Načítám...';
      this.showUrlStatus(statusDiv, 'loading', '⏳ Stahuji obsah...');

      try {
        const content = await this.fetchFromURL(url);

        if (!content) {
          throw new Error('Prázdný obsah');
        }

        this.applyURLContent(content, action, url);
        this.showUrlStatus(statusDiv, 'success', `✅ Načteno ${content.length} znaků`);

        setTimeout(() => {
          modal.close();
          eventBus.emit('toast:show', {
            message: '✅ Obsah úspěšně načten',
            type: 'success',
            duration: 3000
          });
        }, 1000);

      } catch (error) {
        console.error('Load from URL error:', error);
        this.showUrlStatus(statusDiv, 'error', `❌ Chyba: ${error.message}`);
        loadBtn.disabled = false;
        loadBtn.textContent = '📥 Načíst';
      }
    });

    urlInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') loadBtn?.click();
    });
  }

  async fetchFromURL(url) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,text/plain,text/css,application/javascript,text/javascript'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (directError) {
      console.warn('Direct fetch failed, trying CORS proxy:', directError.message);

      const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`
      ];

      for (const proxyUrl of proxies) {
        try {
          const response = await fetch(proxyUrl);
          if (response.ok) {
            console.log('✅ Loaded via proxy:', proxyUrl);
            return await response.text();
          }
        } catch (proxyError) {
          console.warn('Proxy failed:', proxyUrl, proxyError.message);
          continue;
        }
      }

      throw new Error('Nepodařilo se načíst obsah (CORS problém).');
    }
  }

  applyURLContent(content, action, url) {
    const currentCode = state.get('editor.code') || '';
    const filename = this.extractFilenameFromURL(url);

    switch (action) {
    case 'replace':
      state.set('editor.code', content);
      eventBus.emit('editor:update', content);
      break;

    case 'append': {
      const newCode = currentCode + '\n\n<!-- Loaded from: ' + url + ' -->\n' + content;
      state.set('editor.code', newCode);
      eventBus.emit('editor:update', newCode);
      break;
    }

    case 'new-file': {
      // Použít správný event file:create, který je implementován v app.js
      eventBus.emit('file:create', { name: filename, content: content });
      break;
    }
    }
  }

  extractFilenameFromURL(url) {
    try {
      const urlObj = new URL(url);
      const filename = urlObj.pathname.split('/').pop() || 'untitled.html';
      return filename.includes('.') ? filename : filename + '.html';
    } catch (e) {
      return 'loaded-from-url.html';
    }
  }

  showUrlStatus(statusDiv, type, message) {
    if (!statusDiv) return;

    const colors = { loading: '#3b82f6', success: '#10b981', error: '#ef4444' };

    statusDiv.style.display = 'block';
    statusDiv.style.padding = '12px';
    statusDiv.style.background = `${colors[type]}20`;
    statusDiv.style.border = `1px solid ${colors[type]}`;
    statusDiv.style.borderRadius = '6px';
    statusDiv.style.color = colors[type];
    statusDiv.textContent = message;
  }

  // ===== Error Log Modal =====
  showErrorLog() {
    const errors = state.get('debug.errors') || [];

    if (errors.length === 0) {
      eventBus.emit('toast:show', {
        message: '✅ Žádné chyby nezaznamenány!',
        type: 'success',
        duration: 2000
      });
      return;
    }

    const errorHtml = errors.map((error, index) => {
      const time = new Date(error.timestamp).toLocaleTimeString('cs-CZ');
      const type = error.type === 'promise' ? '⚠️ Promise' : '❌ Error';

      return `
        <div style="margin-bottom: 15px; padding: 12px; background: ${error.type === 'promise' ? 'rgba(251,191,36,0.1)' : 'rgba(239,68,68,0.1)'}; border-left: 3px solid ${error.type === 'promise' ? '#fbbf24' : '#ef4444'}; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <strong>${type} #${errors.length - index}</strong>
            <span style="color: var(--text-secondary); font-size: 0.9em;">${time}</span>
          </div>
          <div style="font-family: monospace; font-size: 0.9em; color: var(--text-primary); margin-bottom: 8px;">
            ${this.escapeHtml(error.message)}
          </div>
          ${error.filename ? `<div style="font-size: 0.85em; color: var(--text-secondary);">📄 ${error.filename}:${error.lineno}:${error.colno}</div>` : ''}
          ${error.stack ? `
            <details style="margin-top: 8px;">
              <summary style="cursor: pointer; color: #3b82f6; font-size: 0.9em;">🔍 Stack trace</summary>
              <pre style="margin-top: 8px; padding: 8px; background: var(--bg-primary); border-radius: 4px; overflow-x: auto; font-size: 0.8em; color: var(--text-secondary);">${this.escapeHtml(error.stack.substring(0, 500))}</pre>
            </details>
          ` : ''}
        </div>
      `;
    }).reverse().join('');

    const modal = new Modal({
      title: `🐛 Error Log (${errors.length} chyb)`,
      content: `
        <div style="max-height: 500px; overflow-y: auto;">
          <div style="margin-bottom: 15px; padding: 12px; background: rgba(59,130,246,0.1); border-radius: 6px;">
            <strong>ℹ️ O Error Logu:</strong>
            <ul style="margin: 8px 0 0 20px; color: var(--text-secondary);">
              <li>Zobrazuje posledních 50 chyb</li>
              <li>Duplicitní chyby jsou potlačeny (max 1× za 5s)</li>
              <li>Pro detailní debugging použijte <code>?debug</code> v URL</li>
            </ul>
          </div>
          ${errorHtml}
        </div>
        <div style="margin-top: 15px; display: flex; gap: 10px;">
          <button id="copyErrorLogBtn" style="flex: 1; padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
            📋 Kopírovat log
          </button>
          <button id="clearErrorLogBtn" style="flex: 1; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
            🗑️ Vymazat log
          </button>
        </div>
      `,
      className: 'error-log-modal',
      size: 'large'
    });

    modal.create();
    modal.open();

    // Attach button handlers
    const copyBtn = modal.element.querySelector('#copyErrorLogBtn');
    const clearBtn = modal.element.querySelector('#clearErrorLogBtn');

    copyBtn?.addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(errors, null, 2));
      copyBtn.textContent = '✔ Zkopírováno!';
      setTimeout(() => { copyBtn.textContent = '📋 Kopírovat log'; }, 2000);
    });

    clearBtn?.addEventListener('click', () => {
      state.set('debug.errors', []);
      modal.close();
      eventBus.emit('toast:show', {
        message: '🗑️ Error log vymazán',
        type: 'success'
      });
    });
  }

  // ===== Audit Report Modal =====
  async showAuditReport() {
    const audit = this.generateLiveAudit();

    const modal = new Modal({
      title: '📊 Audit projektu - HTML Studio',
      content: `<div style="max-height: 70vh; overflow-y: auto; padding: 20px; line-height: 1.6;">${audit}</div>`,
      width: '90%',
      maxWidth: '1000px'
    });

    modal.open();
  }

  generateLiveAudit() {
    // After cleanup - only remaining issues
    const notImplemented = [
      { name: '✅ Validovat HTML', location: 'Rychlé akce (Ctrl+Shift+V)', status: 'todo' },
      { name: '📦 Minifikovat', location: 'Rychlé akce (Ctrl+Shift+M)', status: 'todo' },
      { name: '📦 Export ZIP', location: 'FileOperations', status: 'toast' }
    ];

    const working = [
      { name: '💾 Uložit', location: 'Ctrl+S, Rychlé akce' },
      { name: '⬇️ Stáhnout', location: 'Ctrl+D, Rychlé akce' },
      { name: '📄 Nový soubor', location: 'Ctrl+N, Rychlé akce' },
      { name: '🔍 Hledat', location: 'Ctrl+F, Menu' },
      { name: '✨ Formátovat', location: 'Ctrl+Shift+F' },
      { name: '↩️ Zpět / ↪️ Vpřed', location: 'Ctrl+Z/Y' },
      { name: '❌ Zavřít tab', location: 'Ctrl+W' },
      { name: '🎨 Přepnout téma', location: 'Menu > Nastavení' },
      { name: '🤖 AI Asistent', location: 'Tlačítko AI' },
      { name: '🤖 AI Nastavení', location: 'Menu, Rychlé akce' },
      { name: '🔄 Nahradit v kódu', location: 'Ctrl+H, Menu' },
      { name: '📄 Vytvořit .gitignore', location: 'Menu > Nástroje' },
      { name: '🐙 GitHub hledání', location: 'Menu > GitHub' },
      { name: '🌐 Načíst z URL', location: 'Menu > GitHub' },
      { name: '🐞 DevTools', location: 'Menu > Vývojářské nástroje' },
      { name: '📋 Error Log', location: 'Menu > Vývojářské nástroje' },
      { name: '📊 Audit projektu', location: 'Menu > Vývojářské nástroje' },
      { name: '🧩 Komponenty', location: 'Menu > Obsah' },
      { name: '📋 Šablony', location: 'Menu > Obsah' },
      { name: '🖼️ Obrázky', location: 'Menu > Obsah' },
      { name: '🤖 AI Generátor', location: 'Menu > Obsah' }
    ];

    const removed = [
      { name: '📐 CSS Grid/Flex editor', reason: 'Jen toast, neimplementováno' },
      { name: '🌐 Živý server', reason: 'Jen toast, neimplementováno' },
      { name: '🔗 Sdílet odkaz', reason: 'Jen toast, neimplementováno' },
      { name: '🚀 Deploy projekt', reason: 'Jen toast, neimplementováno' },
      { name: '🚀 Publikovat', reason: 'Chyběl handler' },
      { name: '🔧 SEO', reason: 'Chyběl handler' },
      { name: '📱 Zařízení', reason: 'Chyběl handler' },
      { name: '📸 Screenshot', reason: 'Chyběl handler' },
      { name: '⚙️ Nastavení', reason: 'Duplicitní (AI Nastavení funguje)' }
    ];

    return `
      <style>
        .audit-section { margin-bottom: 24px; }
        .audit-title { color: var(--accent); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .audit-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; font-weight: 600; }
        .badge-error { background: #ef444433; color: #ef4444; }
        .badge-warning { background: #f59e0b33; color: #f59e0b; }
        .badge-success { background: #10b98133; color: #10b981; }
        .badge-removed { background: #6b728033; color: #6b7280; }
        .audit-table { width: 100%; border-collapse: collapse; }
        .audit-table th, .audit-table td { padding: 10px; text-align: left; border-bottom: 1px solid var(--border); }
        .audit-table th { background: var(--bg-secondary); font-weight: 600; }
        .audit-table tr:hover { background: var(--bg-secondary); }
        .status-tag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; }
        .status-toast { background: #f59e0b33; color: #f59e0b; }
        .status-todo { background: #3b82f633; color: #3b82f6; }
      </style>

      <div class="audit-section">
        <h2 class="audit-title">✅ Funkční funkce <span class="audit-badge badge-success">${working.length}</span></h2>
        <table class="audit-table">
          <thead><tr><th>Funkce</th><th>Umístění</th></tr></thead>
          <tbody>
            ${working.map(item => '<tr><td><strong>' + item.name + '</strong></td><td>' + item.location + '</td></tr>').join('')}
          </tbody>
        </table>
      </div>

      <div class="audit-section">
        <h2 class="audit-title">⚠️ K implementaci <span class="audit-badge badge-warning">${notImplemented.length}</span></h2>
        <p style="color: var(--text-secondary); margin-bottom: 12px;">Tyto funkce jsou v UI, ale mají jen TODO v kódu.</p>
        <table class="audit-table">
          <thead><tr><th>Funkce</th><th>Umístění</th><th>Stav</th></tr></thead>
          <tbody>
            ${notImplemented.map(item => '<tr><td><strong>' + item.name + '</strong></td><td>' + item.location + '</td><td><span class="status-tag status-' + item.status + '">' + (item.status === 'todo' ? '📝 TODO' : '📢 Toast') + '</span></td></tr>').join('')}
          </tbody>
        </table>
      </div>

      <div class="audit-section">
        <h2 class="audit-title">🗑️ Odstraněno <span class="audit-badge badge-removed">${removed.length}</span></h2>
        <p style="color: var(--text-secondary); margin-bottom: 12px;">Tyto tlačítka byla odstraněna z UI.</p>
        <table class="audit-table">
          <thead><tr><th>Tlačítko</th><th>Důvod odstranění</th></tr></thead>
          <tbody>
            ${removed.map(item => '<tr><td><strong>' + item.name + '</strong></td><td>' + item.reason + '</td></tr>').join('')}
          </tbody>
        </table>
      </div>

      <div class="audit-section" style="background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
        <h3>📊 Souhrn</h3>
        <p style="margin-top: 8px;">
          <strong style="color: #10b981;">Funkční:</strong> ${working.length} funkcí ✅<br>
          <strong style="color: #f59e0b;">K implementaci:</strong> ${notImplemented.length} tlačítek ⚠️<br>
          <strong style="color: #6b7280;">Odstraněno:</strong> ${removed.length} nefunkčních tlačítek 🗑️<br>
          <strong style="color: var(--accent);">Pokrytí:</strong> ${Math.round(working.length / (working.length + notImplemented.length) * 100)}%
        </p>
      </div>
    `;
  }

  // ===== Helper Methods =====

  createCard({ className, dataKey, dataType, title, subtitle }) {
    const card = document.createElement('div');
    card.className = className;
    card.dataset.key = dataKey;
    if (dataType) card.dataset.type = dataType;
    card.style.cssText = 'border: 1px solid var(--border); border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s; background: var(--bg-secondary);';

    const titleEl = document.createElement('h4');
    titleEl.textContent = title;
    titleEl.style.marginBottom = '8px';

    const subtitleEl = document.createElement('small');
    subtitleEl.textContent = subtitle;
    subtitleEl.style.color = 'var(--text-secondary)';

    card.appendChild(titleEl);
    card.appendChild(subtitleEl);

    return card;
  }

  attachCardListeners(modalElement, selector, onClick) {
    if (!modalElement) return;

    modalElement.querySelectorAll(selector).forEach(card => {
      const key = card.dataset.key;

      this.addHoverEffect(card);

      card.addEventListener('click', () => onClick(key));
    });
  }

  addHoverEffect(card) {
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = 'var(--accent)';
      card.style.transform = 'translateY(-2px)';
    });

    card.addEventListener('mouseleave', () => {
      card.style.borderColor = 'var(--border)';
      card.style.transform = 'none';
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  markdownToHtml(markdown) {
    let html = markdown
      .replace(/^### (.*$)/gim, '<h3 style="color: var(--accent); margin-top: 24px; margin-bottom: 12px;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="color: var(--accent); margin-top: 32px; margin-bottom: 16px; border-bottom: 2px solid var(--border); padding-bottom: 8px;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="color: var(--accent); margin-bottom: 20px;">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; overflow-x: auto; border: 1px solid var(--border);"><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code style="background: var(--bg-secondary); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>')
      .replace(/^- (.*$)/gim, '<li style="margin-left: 20px;">$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li style="margin-left: 20px;">$2</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: var(--accent); text-decoration: underline;">$1</a>')
      .replace(/^---$/gim, '<hr style="border: none; border-top: 1px solid var(--border); margin: 24px 0;">');

    html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, (match) => `<ul style="margin: 12px 0;">${match}</ul>`);

    html = html.split('\n').map(line => {
      line = line.trim();
      if (!line) return '<br>';
      if (line.startsWith('<')) return line;
      return `<p style="margin-bottom: 12px;">${line}</p>`;
    }).join('\n');

    return html;
  }

  // ===== AI Studios Modal =====
  showAIStudios() {
    const aiStudios = {
      dedicated: {
        title: '✨ Specializované AI Code Editory (Pro laiky)',
        items: [
          { name: 'Cursor', url: 'https://cursor.sh', description: 'AI-first editor postavený na VS Code, seamless AI integrace', type: '💻 Ke stažení', hasAI: true, pricing: 'freemium', registration: 'email', limit: '50 AI requests/měsíc free', level: 'intermediate', video: 'https://youtube.com/results?search_query=cursor+ai+tutorial' },
          { name: 'Windsurf', url: 'https://codeium.com/windsurf', description: 'Nový AI editor od Codeium, podobný Cursoru', type: '💻 Ke stažení', hasAI: true, pricing: 'free', registration: 'optional', limit: 'Neomezené', level: 'beginner', video: 'https://youtube.com/results?search_query=windsurf+codeium+tutorial' },
          { name: 'Bolt.new', url: 'https://bolt.new', description: 'Online editor s AI od StackBlitz, instant deploy - NAPÍŠEŠ CO CHCEŠ A ONO TO VYGENERUJE', type: '🌐 Online', hasAI: true, pricing: 'freemium', registration: 'email', limit: '5 projektů free', level: 'beginner', video: 'https://youtube.com/results?search_query=bolt.new+tutorial' },
          { name: 'v0.dev', url: 'https://v0.dev', description: 'AI generování React/HTML komponent z promptů (Vercel) - IDEÁLNÍ PRO LAIKY', type: '🌐 Online', hasAI: true, pricing: 'freemium', registration: 'github', limit: '200 credits/měsíc', level: 'beginner', video: 'https://youtube.com/results?search_query=v0.dev+tutorial' },
          { name: 'Lovable', url: 'https://lovable.dev', description: 'Komplexní AI app builder (dříve GPT Engineer) - CELÉ APLIKACE BEZ KÓDU', type: '🌐 Online', hasAI: true, pricing: 'paid', registration: 'email', limit: 'Trial 7 dní', level: 'beginner', video: 'https://youtube.com/results?search_query=lovable+gpt+engineer' },
          { name: 'Replit AI', url: 'https://replit.com', description: 'Online IDE s built-in AI asistentem - AI POMÁHÁ PSÁT KÓD', type: '🌐 Online', hasAI: true, pricing: 'freemium', registration: 'email', limit: 'Basic AI free', level: 'intermediate', video: 'https://youtube.com/results?search_query=replit+ai+tutorial' },
          { name: 'GitHub Copilot Workspace', url: 'https://githubnext.com/projects/copilot-workspace', description: 'Experimentální AI-powered dev prostředí', type: '🌐 Online', hasAI: true, pricing: 'beta', registration: 'github', limit: 'Beta přístup', level: 'advanced', video: 'https://youtube.com/results?search_query=github+copilot+workspace' }
        ]
      },
      chatbots: {
        title: '✨ AI Chatboti s Code Support (Generují kód z popisu)',
        items: [
          { name: 'ChatGPT', url: 'https://chat.openai.com', description: 'GPT-4, GPT-4 Turbo, o1 modely (OpenAI) - ŘEKNI CO CHCEŠ A VYGENERUJE KÓD', type: '🌐 Online', hasAI: true, pricing: 'freemium', registration: 'email', limit: 'GPT-4o mini free neomezené', level: 'beginner', video: 'https://youtube.com/results?search_query=chatgpt+coding+tutorial+czech' },
          { name: 'Claude AI', url: 'https://claude.ai', description: 'Claude 3.5 Sonnet, skvělý na coding (Anthropic) - NEJLEPŠÍ PRO SLOŽITĚJŠÍ PROJEKTY', type: '🌐 Online', hasAI: true, pricing: 'freemium', registration: 'email', limit: '~50-100 zpráv/den free', level: 'beginner', video: 'https://youtube.com/results?search_query=claude+ai+coding+tutorial' },
          { name: 'Google AI Studio', url: 'https://aistudio.google.com', description: 'Gemini 1.5 Pro/Flash s dlouhým kontextem - ZPRACUJE I VELKÉ SOUBORY', type: '🌐 Online', hasAI: true, pricing: 'free', registration: 'google', limit: '1500 requests/den', level: 'beginner', video: 'https://youtube.com/results?search_query=google+ai+studio+tutorial' },
          { name: 'Gemini', url: 'https://gemini.google.com', description: 'Google Gemini chatbot', type: '🌐 Online', hasAI: true, pricing: 'freemium', registration: 'google', limit: 'Basic free neomezené', level: 'beginner', video: 'https://youtube.com/results?search_query=google+gemini+tutorial+czech' },
          { name: 'Microsoft Copilot', url: 'https://copilot.microsoft.com', description: 'GPT-4 integrovaný do ekosystému Microsoft', type: '🌐 Online', hasAI: true, pricing: 'freemium', registration: 'microsoft', limit: '30 zpráv/konverzace', level: 'beginner', video: 'https://youtube.com/results?search_query=microsoft+copilot+tutorial' },
          { name: 'Perplexity', url: 'https://perplexity.ai', description: 'AI search s code capabilities', type: '🌐 Online', hasAI: true, pricing: 'freemium', registration: 'optional', limit: '5 Pro searches/den', level: 'beginner', video: 'https://youtube.com/results?search_query=perplexity+ai+tutorial' },
          { name: 'DeepSeek', url: 'https://chat.deepseek.com', description: 'Open-source model, velmi dobrý na coding - ZDARMA', type: '🌐 Online', hasAI: true, pricing: 'free', registration: 'email', limit: 'Neomezené FREE', level: 'beginner', video: 'https://youtube.com/results?search_query=deepseek+ai+tutorial' },
          { name: 'Mistral AI', url: 'https://chat.mistral.ai', description: 'Evropský konkurent, Mistral Large', type: '🌐 Online', hasAI: true, pricing: 'freemium', registration: 'email', limit: 'Basic free', level: 'intermediate', video: 'https://youtube.com/results?search_query=mistral+ai+tutorial' }
        ]
      },
      mobileAI: {
        title: '📱 Mobilní AI Aplikace (Chatboti s kódem)',
        items: [
          { name: 'Poe', url: 'https://play.google.com/store/apps/details?id=com.quora.poe', description: 'Agregátor VŠECH AI (ChatGPT, Claude, Gemini...) v jedné appce - IDEÁLNÍ!', type: '📱 Android', hasAI: true, pricing: 'freemium', registration: 'email', limit: 'Všechny modely v jednom', level: 'beginner', video: 'https://youtube.com/results?search_query=poe+ai+app+tutorial' },
          { name: 'ChatGPT App', url: 'https://play.google.com/store/apps/details?id=com.openai.chatgpt', description: 'Oficiální OpenAI aplikace - GPT-4o mini zdarma', type: '📱 Android', hasAI: true, pricing: 'freemium', registration: 'email', limit: 'GPT-4o mini free', level: 'beginner', video: 'https://youtube.com/results?search_query=chatgpt+mobile+app' },
          { name: 'Gemini App', url: 'https://play.google.com/store/apps/details?id=com.google.android.apps.bard', description: 'Google AI asistent v mobilu - integrace s Google službami', type: '📱 Android', hasAI: true, pricing: 'freemium', registration: 'google', limit: 'Basic zdarma', level: 'beginner', video: 'https://youtube.com/results?search_query=google+gemini+app' },
          { name: 'Perplexity App', url: 'https://play.google.com/store/apps/details?id=ai.perplexity.app.android', description: 'AI search engine - hledání + generování kódu', type: '📱 Android', hasAI: true, pricing: 'freemium', registration: 'optional', limit: '5 Pro/den', level: 'beginner', video: 'https://youtube.com/results?search_query=perplexity+app' },
          { name: 'Microsoft Copilot App', url: 'https://play.google.com/store/apps/details?id=com.microsoft.copilot', description: 'GPT-4 od Microsoftu v mobilu', type: '📱 Android', hasAI: true, pricing: 'freemium', registration: 'microsoft', limit: '30 zpráv/chat', level: 'beginner', video: 'https://youtube.com/results?search_query=microsoft+copilot+app' }
        ]
      },
      czech: {
        title: '🇨🇿 České AI nástroje',
        items: [
          { name: 'SeznamGPT', url: 'https://search.seznam.cz', description: 'Český AI asistent od Seznamu (beta) - odpovídá česky', type: '🌐 Online', hasAI: true, pricing: 'free', registration: 'optional', limit: 'Beta verze', level: 'beginner', video: 'https://youtube.com/results?search_query=seznam+gpt' },
          { name: 'ChatGPT česky', url: 'https://chat.openai.com', description: 'ChatGPT umí perfektně česky - stačí psát česky!', type: '🌐 Online', hasAI: true, pricing: 'freemium', registration: 'email', limit: 'GPT-4o mini free', level: 'beginner', video: 'https://youtube.com/results?search_query=chatgpt+česky+tutorial' },
          { name: 'Claude česky', url: 'https://claude.ai', description: 'Claude AI také skvěle rozumí češtině', type: '🌐 Online', hasAI: true, pricing: 'freemium', registration: 'email', limit: '~50 zpráv/den', level: 'beginner', video: 'https://youtube.com/results?search_query=claude+ai+česky' }
        ]
      },
      playgrounds: {
        title: '🔧 Online Code Playgrounds (Vyžadují znalost kódu)',
        items: [
          { name: 'CodePen', url: 'https://codepen.io', description: 'HTML/CSS/JS editor - MUSÍŠ UMĚT PSÁT KÓD', type: '🌐 Online', hasAI: false, pricing: 'freemium', registration: 'email', limit: 'Neomezené free', level: 'intermediate' },
          { name: 'JSFiddle', url: 'https://jsfiddle.net', description: 'Podobné CodePen - KLASICKÝ EDITOR', type: '🌐 Online', hasAI: false, pricing: 'free', registration: 'optional', limit: 'Zdarma vše', level: 'intermediate' },
          { name: 'CodeSandbox', url: 'https://codesandbox.io', description: 'Full-stack development environment - částečná AI (experimentální)', type: '🌐 Online', hasAI: 'partial', pricing: 'freemium', registration: 'github', limit: '20 sandboxů free', level: 'advanced' },
          { name: 'Glitch', url: 'https://glitch.com', description: 'Social coding - BEZ AI, JEN EDITOR', type: '🌐 Online', hasAI: false, pricing: 'freemium', registration: 'email', limit: 'Unlimited free', level: 'intermediate' },
          { name: 'Observable', url: 'https://observablehq.com', description: 'Data visualization a notebooks - PRO POKROČILÉ', type: '🌐 Online', hasAI: false, pricing: 'freemium', registration: 'email', limit: 'Public free', level: 'advanced' }
        ]
      },
      specialized: {
        title: '🎯 Design-to-Code Tools (Visual builder)',
        items: [
          { name: 'Figma AI', url: 'https://figma.com', description: 'Design → code generování - KRESLÍŠ DESIGN, VYGENERUJE KÓD', type: '💻 Ke stažení', hasAI: 'partial', pricing: 'freemium', registration: 'email', limit: '3 soubory free', level: 'intermediate' },
          { name: 'Framer', url: 'https://framer.com', description: 'Web design tool s AI code exportem - VISUAL BUILDER', type: '🌐 Online / 💻 Desktop', hasAI: 'partial', pricing: 'freemium', registration: 'email', limit: '1 web zdarma', level: 'beginner' },
          { name: 'Webflow', url: 'https://webflow.com', description: 'Visual builder s code exportem - TAŽENÍM MYŠÍ, NE PSANÍM KÓDU', type: '🌐 Online', hasAI: false, pricing: 'freemium', registration: 'email', limit: '2 projekty free', level: 'beginner' },
          { name: 'Anima', url: 'https://animaapp.com', description: 'Design to code (Figma/Sketch → HTML/React)', type: '🌐 Online / 💻 Plugin', hasAI: false, pricing: 'freemium', registration: 'email', limit: '1 projekt free', level: 'intermediate' }
        ]
      },
      extensions: {
        title: '✨ VS Code Extensions (AI asistenti do VS Code)',
        items: [
          { name: 'GitHub Copilot', url: 'https://github.com/features/copilot', description: 'Nejpoužívanější AI asistent - DOPLŇUJE KÓD AUTOMATICKY', type: '🔌 Extension', hasAI: true, pricing: 'paid', registration: 'github', limit: '10 USD/měsíc', level: 'intermediate', video: 'https://youtube.com/results?search_query=github+copilot+tutorial' },
          { name: 'Codeium', url: 'https://codeium.com', description: 'Free alternativa k Copilotu - ZDARMA', type: '🔌 Extension', hasAI: true, pricing: 'free', registration: 'email', limit: 'Neomezené FREE', level: 'beginner', video: 'https://youtube.com/results?search_query=codeium+tutorial' },
          { name: 'TabNine', url: 'https://tabnine.com', description: 'AI code completion', type: '🔌 Extension', hasAI: true, pricing: 'freemium', registration: 'email', limit: 'Basic free', level: 'intermediate' },
          { name: 'AWS CodeWhisperer', url: 'https://aws.amazon.com/codewhisperer', description: 'Amazon AI asistent - ZDARMA', type: '🔌 Extension', hasAI: true, pricing: 'free', registration: 'aws', limit: 'FREE pro jednotlivce', level: 'intermediate', video: 'https://youtube.com/results?search_query=aws+codewhisperer' },
          { name: 'Sourcery', url: 'https://sourcery.ai', description: 'Code review a refactoring', type: '🔌 Extension', hasAI: true, pricing: 'freemium', registration: 'github', limit: 'Basic free', level: 'advanced' }
        ]
      },
      androidApps: {
        title: '🔧 Android Aplikace (Klasické editory - BEZ AI)',
        items: [
          { name: 'Acode', url: 'https://play.google.com/store/apps/details?id=com.foxdebug.acodefree', description: 'Výkonný code editor pro Android - MUSÍŠ UMĚT PROGRAMOVAT', type: '📱 Android', hasAI: false, pricing: 'freemium', registration: 'none', limit: 'Free plná verze', level: 'intermediate' },
          { name: 'Spck Editor', url: 'https://play.google.com/store/apps/details?id=io.spck', description: 'Git client a code editor s live preview - KLASICKÝ EDITOR', type: '📱 Android', hasAI: false, pricing: 'freemium', registration: 'optional', limit: 'Basic free', level: 'intermediate' },
          { name: 'WebCode', url: 'https://play.google.com/store/apps/details?id=com.rhmsoft.code', description: 'IDE pro web development s FTP/SFTP - PRO PROGRAMÁTORY', type: '📱 Android', hasAI: false, pricing: 'freemium', registration: 'none', limit: 'Pro features paid', level: 'advanced' },
          { name: 'DroidEdit', url: 'https://play.google.com/store/apps/details?id=com.aor.droidedit', description: 'Text a source code editor - BEZ AI', type: '📱 Android', hasAI: false, pricing: 'freemium', registration: 'none', limit: 'Free + Pro', level: 'intermediate' },
          { name: 'Dcoder', url: 'https://play.google.com/store/apps/details?id=com.paprbit.dcoder', description: 'Mobilní IDE s kompilátorem - VYŽADUJE ZNALOST KÓDU', type: '📱 Android', hasAI: false, pricing: 'freemium', registration: 'email', limit: 'Basic free', level: 'intermediate' },
          { name: 'Code Editor', url: 'https://play.google.com/store/apps/details?id=com.rhmsoft.edit', description: 'Lightweight HTML/CSS/JS editor - ZÁKLADNÍ EDITOR', type: '📱 Android', hasAI: false, pricing: 'free', registration: 'none', limit: 'FREE vše', level: 'beginner' },
          { name: 'QuickEdit', url: 'https://play.google.com/store/apps/details?id=com.rhmsoft.edit.pro', description: 'Text editor s syntax highlighting - PRO RUČNÍ PSANÍ', type: '📱 Android', hasAI: false, pricing: 'freemium', registration: 'none', limit: 'Free + Pro', level: 'beginner' },
          { name: 'Termux', url: 'https://play.google.com/store/apps/details?id=com.termux', description: 'Terminál emulátor - instalace vim, nano, git - PRO POKROČILÉ', type: '📱 Android', hasAI: false, pricing: 'free', registration: 'none', limit: 'Open source FREE', level: 'advanced' }
        ]
      }
    };

    const content = document.createElement('div');
    content.style.cssText = 'padding: 20px; max-height: 70vh; overflow-y: auto;';

    // Intro text
    const intro = document.createElement('p');
    intro.style.cssText = 'margin-bottom: 24px; color: var(--text-secondary); font-size: 14px; line-height: 1.6;';
    intro.innerHTML = '🎯 <strong>PRO LAIKY:</strong> Hledej nástroje se značkou <span style="background: #4ade80; color: #000; padding: 2px 6px; border-radius: 3px; font-size: 12px; font-weight: 600;">✨ S AI</span> - ty generují kód z popisu, nemusíš umět programovat!<br><br>� <strong>CENY:</strong> <span style="background: #22c55e; color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 12px; font-weight: 600;">💚 FREE</span> = úplně zdarma | <span style="background: #3b82f6; color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 12px; font-weight: 600;">💰 Free+Paid</span> = základní verze zdarma<br><br>�🔧 Nástroje se značkou <span style="background: var(--border); color: var(--text-secondary); padding: 2px 6px; border-radius: 3px; font-size: 12px;">🔧 Bez AI</span> vyžadují znalost programování.';
    content.appendChild(intro);

    // Quick filters section
    const filtersContainer = document.createElement('div');
    filtersContainer.style.cssText = 'margin-bottom: 24px; padding: 12px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border);';

    const filtersLabel = document.createElement('div');
    filtersLabel.textContent = '🔍 Rychlé filtry:';
    filtersLabel.style.cssText = 'font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);';
    filtersContainer.appendChild(filtersLabel);

    const filters = document.createElement('div');
    filters.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';

    const filterButtons = [
      { id: 'all', label: '📋 Vše', active: true },
      { id: 'free', label: '💚 Jen zdarma' },
      { id: 'ai', label: '✨ Jen s AI' },
      { id: 'online', label: '🌐 Jen online' },
      { id: 'mobile', label: '📱 Jen mobil' },
      { id: 'beginner', label: '🌱 Pro začátečníky' }
    ];

    let activeFilter = 'all';

    filterButtons.forEach(btn => {
      const filterBtn = document.createElement('button');
      filterBtn.textContent = btn.label;
      filterBtn.style.cssText = `padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border); background: ${btn.active ? 'var(--accent)' : 'var(--bg-primary)'}; color: ${btn.active ? '#fff' : 'var(--text-primary)'}; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s;`;

      filterBtn.addEventListener('click', () => {
        activeFilter = btn.id;
        filters.querySelectorAll('button').forEach(b => {
          b.style.background = 'var(--bg-primary)';
          b.style.color = 'var(--text-primary)';
        });
        filterBtn.style.background = 'var(--accent)';
        filterBtn.style.color = '#fff';

        // Apply filter
        const allSections = content.querySelectorAll('.category-section');
        allSections.forEach(section => {
          const cards = section.querySelectorAll('.studio-card');
          let visibleCount = 0;

          cards.forEach(card => {
            const item = card.__itemData;
            if (!item) {
              card.style.display = 'none';
              return;
            }
            let shouldShow = true;

            if (btn.id !== 'all') {
              if (btn.id === 'free' && item.pricing !== 'free') shouldShow = false;
              if (btn.id === 'ai' && item.hasAI !== true) shouldShow = false;
              if (btn.id === 'online' && (!item.type || !item.type.includes('🌐'))) shouldShow = false;
              if (btn.id === 'mobile' && (!item.type || !item.type.includes('📱'))) shouldShow = false;
              if (btn.id === 'beginner' && item.level !== 'beginner') shouldShow = false;
            }

            card.style.display = shouldShow ? 'block' : 'none';
            if (shouldShow) visibleCount++;
          });

          section.style.display = visibleCount > 0 ? 'block' : 'none';
        });
      });

      filterBtn.addEventListener('mouseenter', () => {
        if (activeFilter !== btn.id) filterBtn.style.background = 'var(--bg-accent)';
      });

      filterBtn.addEventListener('mouseleave', () => {
        if (activeFilter !== btn.id) filterBtn.style.background = 'var(--bg-primary)';
      });

      filters.appendChild(filterBtn);
    });

    filtersContainer.appendChild(filters);
    content.appendChild(filtersContainer);

    // Render each category
    Object.values(aiStudios).forEach(category => {
      const section = document.createElement('div');
      section.style.marginBottom = '28px';
      section.classList.add('category-section');

      // Category title
      const title = document.createElement('h3');
      title.textContent = category.title;
      title.style.cssText = 'color: var(--accent); margin-bottom: 16px; font-size: 16px; border-bottom: 2px solid var(--border); padding-bottom: 8px;';
      section.appendChild(title);

      // Items grid
      const grid = document.createElement('div');
      grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px;';

      category.items.forEach(item => {
        const card = document.createElement('div');
        card.style.cssText = 'border: 1px solid var(--border); border-radius: 8px; padding: 14px; background: var(--bg-secondary); transition: all 0.2s; cursor: pointer;';
        card.classList.add('studio-card');
        card.__itemData = item; // Store item data for filtering

        // Name as link with type badge
        const headerDiv = document.createElement('div');
        headerDiv.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;';

        const nameLink = document.createElement('a');
        nameLink.href = item.url;
        nameLink.target = '_blank';
        nameLink.rel = 'noopener noreferrer';
        nameLink.textContent = item.name;
        nameLink.style.cssText = 'color: var(--accent); font-weight: 600; font-size: 15px; text-decoration: none; flex: 1;';
        nameLink.addEventListener('mouseenter', () => {
          nameLink.style.textDecoration = 'underline';
        });
        nameLink.addEventListener('mouseleave', () => {
          nameLink.style.textDecoration = 'none';
        });

        // Type badge
        const badgesContainer = document.createElement('div');
        badgesContainer.style.cssText = 'display: flex; gap: 6px; margin-left: 8px; flex-wrap: wrap;';

        const typeBadge = document.createElement('span');
        typeBadge.textContent = item.type;
        typeBadge.style.cssText = 'font-size: 11px; padding: 3px 8px; border-radius: 4px; background: var(--bg-accent); color: var(--text-secondary); white-space: nowrap;';
        badgesContainer.appendChild(typeBadge);

        // AI badge
        if (item.hasAI === true) {
          const aiBadge = document.createElement('span');
          aiBadge.textContent = '✨ S AI';
          aiBadge.style.cssText = 'font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #4ade80; color: #000; font-weight: 600; white-space: nowrap;';
          badgesContainer.appendChild(aiBadge);
        } else if (item.hasAI === 'partial') {
          const aiBadge = document.createElement('span');
          aiBadge.textContent = '⚡ Částečná AI';
          aiBadge.style.cssText = 'font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #fbbf24; color: #000; font-weight: 600; white-space: nowrap;';
          badgesContainer.appendChild(aiBadge);
        } else if (item.hasAI === false) {
          const noAiBadge = document.createElement('span');
          noAiBadge.textContent = '🔧 Bez AI';
          noAiBadge.style.cssText = 'font-size: 11px; padding: 3px 8px; border-radius: 4px; background: var(--border); color: var(--text-secondary); white-space: nowrap;';
          badgesContainer.appendChild(noAiBadge);
        }

        // Pricing badge
        if (item.pricing === 'free') {
          const priceBadge = document.createElement('span');
          priceBadge.textContent = '💚 FREE';
          priceBadge.style.cssText = 'font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #22c55e; color: #fff; font-weight: 600; white-space: nowrap;';
          badgesContainer.appendChild(priceBadge);
        } else if (item.pricing === 'freemium') {
          const priceBadge = document.createElement('span');
          priceBadge.textContent = '💰 Free+Paid';
          priceBadge.style.cssText = 'font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #3b82f6; color: #fff; font-weight: 600; white-space: nowrap;';
          badgesContainer.appendChild(priceBadge);
        } else if (item.pricing === 'paid') {
          const priceBadge = document.createElement('span');
          priceBadge.textContent = '💳 Placené';
          priceBadge.style.cssText = 'font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #ef4444; color: #fff; font-weight: 600; white-space: nowrap;';
          badgesContainer.appendChild(priceBadge);
        } else if (item.pricing === 'beta') {
          const priceBadge = document.createElement('span');
          priceBadge.textContent = '🧪 Beta';
          priceBadge.style.cssText = 'font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #a855f7; color: #fff; font-weight: 600; white-space: nowrap;';
          badgesContainer.appendChild(priceBadge);
        }

        headerDiv.appendChild(nameLink);
        headerDiv.appendChild(badgesContainer);

        // Description
        const desc = document.createElement('div');
        desc.textContent = item.description;
        desc.style.cssText = 'font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px;';

        card.appendChild(headerDiv);
        card.appendChild(desc);

        // Additional info section (level, limit, registration)
        if (item.level || item.limit || item.registration) {
          const infoDiv = document.createElement('div');
          infoDiv.style.cssText = 'font-size: 11px; color: var(--text-secondary); border-top: 1px solid var(--border); padding-top: 8px; margin-top: 8px; line-height: 1.6;';

          const infoParts = [];

          // Level badge
          if (item.level) {
            const levelEmoji = item.level === 'beginner' ? '🌱' : item.level === 'intermediate' ? '🌿' : '🌳';
            const levelText = item.level === 'beginner' ? 'Začátečník' : item.level === 'intermediate' ? 'Pokročilý' : 'Expert';
            infoParts.push(`${levelEmoji} <strong>${levelText}</strong>`);
          }

          // Limit info
          if (item.limit) {
            infoParts.push(`📊 ${item.limit}`);
          }

          // Registration info
          if (item.registration) {
            const regText = item.registration === 'none' ? '🔓 Bez registrace' :
                           item.registration === 'optional' ? '🔓 Nepovinná registrace' :
                           item.registration === 'email' ? '📧 Vyžaduje email' :
                           item.registration === 'phone' ? '📱 Vyžaduje telefon' :
                           item.registration === 'github' ? '🐙 GitHub účet' :
                           item.registration === 'google' ? '🔑 Google účet' :
                           item.registration === 'microsoft' ? '🔑 Microsoft účet' :
                           item.registration === 'aws' ? '☁️ AWS účet' : item.registration;
            infoParts.push(regText);
          }

          infoDiv.innerHTML = infoParts.join(' • ');
          card.appendChild(infoDiv);
        }

        // Video tutorial button
        if (item.video) {
          const videoBtn = document.createElement('a');
          videoBtn.href = item.video;
          videoBtn.target = '_blank';
          videoBtn.rel = 'noopener noreferrer';
          videoBtn.textContent = '📺 Jak na to (video tutoriály)';
          videoBtn.style.cssText = 'display: inline-block; margin-top: 10px; padding: 6px 12px; background: #ff0000; color: #fff; text-decoration: none; border-radius: 5px; font-size: 12px; font-weight: 600; transition: all 0.2s;';
          videoBtn.addEventListener('mouseenter', () => {
            videoBtn.style.background = '#cc0000';
            videoBtn.style.transform = 'scale(1.05)';
          });
          videoBtn.addEventListener('mouseleave', () => {
            videoBtn.style.background = '#ff0000';
            videoBtn.style.transform = 'scale(1)';
          });
          videoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
          });
          card.appendChild(videoBtn);
        }

        // Hover effect
        card.addEventListener('mouseenter', () => {
          card.style.borderColor = 'var(--accent)';
          card.style.transform = 'translateY(-2px)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.borderColor = 'var(--border)';
          card.style.transform = 'none';
        });

        // Click on card also opens link
        card.addEventListener('click', (e) => {
          if (e.target !== nameLink && !e.target.closest('a')) {
            window.open(item.url, '_blank', 'noopener,noreferrer');
          }
        });

        grid.appendChild(card);
      });

      section.appendChild(grid);
      content.appendChild(section);
    });

    // Best choices section
    const bestChoices = document.createElement('div');
    bestChoices.style.cssText = 'margin-top: 32px; padding: 16px; background: var(--bg-accent); border-left: 4px solid var(--accent); border-radius: 8px;';

    const bestTitle = document.createElement('h4');
    bestTitle.textContent = '🌟 TOP 5 pro laiky (BEZ znalosti programování):';
    bestTitle.style.cssText = 'color: var(--accent); margin-bottom: 12px;';
    bestChoices.appendChild(bestTitle);

    const bestList = document.createElement('ul');
    bestList.style.cssText = 'margin: 0; padding-left: 24px; font-size: 14px; line-height: 2;';
    bestList.innerHTML = `
      <li><strong>Bolt.new</strong> ✨💰 - Napíšeš co chceš, ono to vytvoří (základní verze free)</li>
      <li><strong>v0.dev</strong> ✨💰 - Popíšeš UI, vygeneruje komponentu (omezený free)</li>
      <li><strong>Claude AI</strong> ✨💰 - Nejlepší AI chat pro generování kódu (free verze je dobrá)</li>
      <li><strong>ChatGPT</strong> ✨💰 - Populární AI chat, skvělý pro začátečníky (free GPT-4o mini)</li>
      <li><strong>Google AI Studio</strong> ✨💚 - Gemini API s dlouhým kontextem (ZDARMA!)</li>
    `;
    bestChoices.appendChild(bestList);

    const note = document.createElement('p');
    note.style.cssText = 'margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 13px; color: var(--text-secondary); line-height: 1.6;';
    note.innerHTML = '<strong>💡 Jak to funguje pro laiky?</strong><br>1. Otevřeš nástroj s ✨ S AI<br>2. Napíšeš co chceš: "Vytvořit kontaktní formulář s emailem"<br>3. AI vygeneruje hotový kód<br>4. Zkopíruješ do HTML Studia<br><br><strong>💚 TIP PRO ZAČÁTEK (ZDARMA):</strong><br>• <strong>DeepSeek</strong> - zcela zdarma bez limitů<br>• <strong>Google AI Studio</strong> - zdarma s velkým limitem (1500/den)<br>• <strong>Windsurf</strong> - free AI editor ke stažení (neomezené)<br>• <strong>Poe App</strong> 📱 - všechny AI modely v jedné mobilní appce<br><br><strong>🇨🇿 České možnosti:</strong><br>• ChatGPT, Claude, Gemini - všechny mluví česky!<br>• SeznamGPT - český AI asistent (beta)<br><br><strong>🎯 Tvoje HTML Studio</strong> má podobné funkce jako Bolt.new, ale s focus na mobilní použití!<br><br><strong>📖 Legenda:</strong><br>✨ = S AI (pro laiky) | 🔧 = Bez AI (vyžaduje kódování)<br>💚 = FREE (zdarma) | 💰 = Free+Paid (základní zdarma) | 💳 = Placené<br>🌱 = Začátečník | 🌿 = Pokročilý | 🌳 = Expert<br>📧 = Email registrace | 🐙 = GitHub | 🔑 = Google/Microsoft | 🔓 = Bez registrace<br>📺 = Video tutoriály dostupné<br>🌐 = Online | 💻 = Ke stažení | 📱 = Android | 🔌 = Extension';
    bestChoices.appendChild(note);

    content.appendChild(bestChoices);

    const modal = new Modal({
      title: '🎨 AI Studia pro HTML',
      content: content,
      width: '1000px'
    });

    modal.open();

    // Cleanup event listeners when modal closes
    const cleanup = () => {
      filters.querySelectorAll('button').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
      });
    };

    // Add cleanup on modal close if Modal supports it
    if (modal.element) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && !document.body.contains(modal.element)) {
            cleanup();
            observer.disconnect();
          }
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
}
