/**
 * ModalBuilderService.js
 * Service pro vytváření HTML struktury AI panelu
 * Extrahováno z AIPanel.js - createAIInterface()
 */

export class ModalBuilderService {
  constructor(panel) {
    this.panel = panel;
    console.log('[ModalBuilderService] Initialized');
  }

  /**
   * Create modal title HTML with menu and settings
   */
  createModalTitle() {
    return `
      <div class="modal-title-wrapper">
        <button class="ai-menu-btn" id="aiMenuBtn" title="Hlavní menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
          <span>Menu</span>
        </button>
        <div class="ai-menu-dropdown hidden" id="aiMenuDropdown">
          <button class="ai-menu-item" data-tab="chat">◆ Kód</button>
          <button class="ai-menu-item" data-tab="pokec">💬 Pokec</button>
          <button class="ai-menu-item" data-tab="agents">🤖 Agenti</button>
          <button class="ai-menu-item" data-tab="actions">⚡ Akce</button>
          <button class="ai-menu-item" data-tab="prompts">📝 Prompty</button>
          <button class="ai-menu-item" data-tab="testing">🧪 Testing</button>
          <button class="ai-menu-item" data-tab="github">🔗 GitHub</button>
          <div class="ai-menu-divider"></div>
          <button class="ai-menu-item" data-action="ai-studios">🎨 AI Studia</button>
          <button class="ai-menu-item" data-action="live-server">🌐 Živý server</button>
          <button class="ai-menu-item" data-action="export">📥 Export chatu</button>
          <button class="ai-menu-item" data-action="clear">🗑️ Vymazat historii</button>
        </div>
        ${this.createSettingsHeader()}
      </div>
    `;
  }

  /**
   * Create settings header with provider/model selection
   */
  createSettingsHeader() {
    return `
      <div class="ai-settings-header" id="aiSettingsHeader">
        <button class="ai-settings-toggle" type="button">AI <span class="toggle-arrow">▼</span></button>
        <div class="ai-header-settings hidden">
          <div class="auto-ai-container">
            <label class="auto-ai-label">
              <input type="checkbox" id="autoAI" class="auto-ai-checkbox" checked>
              <span class="auto-ai-text">🤖 Auto AI</span>
            </label>
          </div>
          <div class="ai-provider-selector">
            <label for="aiProvider">Provider:</label>
            <select id="aiProvider" class="ai-select" disabled>
              ${this.panel.providerService?.generateProviderOptions() || this.getDefaultProviderOptions()}
            </select>
          </div>
          <div class="ai-model-selector">
            <label for="aiModel">Model:</label>
            <select id="aiModel" class="ai-select" disabled>
              <option value="">Načítání...</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get default provider options (fallback)
   */
  getDefaultProviderOptions() {
    return `
      <option value="gemini">🔷 Google Gemini (Free)</option>
      <option value="groq">⚡ Groq (Free)</option>
      <option value="openrouter">🌐 OpenRouter</option>
    `;
  }

  /**
   * Create main chat tab content
   */
  createChatTab() {
    return `
      <div class="ai-tab-content active" data-content="chat">
        <div class="ai-chat-panel">
          <div class="ai-chat-messages" id="chatMessages">
            <div class="ai-welcome-message">
              <div class="ai-welcome-icon">🤖</div>
              <h3>AI Asistent</h3>
              <p>Jak vám mohu pomoci s kódem?</p>
              <div class="ai-suggestions">
                <button class="ai-suggestion" data-suggestion="Oprav chyby v kódu">🔧 Opravit chyby</button>
                <button class="ai-suggestion" data-suggestion="Vylepši design">🎨 Vylepšit design</button>
                <button class="ai-suggestion" data-suggestion="Přidej responzivitu">📱 Responzivita</button>
                <button class="ai-suggestion" data-suggestion="Optimalizuj výkon">⚡ Optimalizace</button>
              </div>
            </div>
          </div>
          ${this.createChatInput()}
        </div>
      </div>
    `;
  }

  /**
   * Create chat input area
   */
  createChatInput() {
    return `
      <div class="ai-chat-input-container">
        <div class="ai-chat-input-wrapper">
          <div class="ai-input-row">
            <div id="diskFilesContainer" class="ai-disk-files-container" style="display: none;"></div>
            <textarea
              id="aiChatInput"
              class="ai-chat-input"
              placeholder="Popište co chcete změnit..."
              rows="2"
            ></textarea>
          </div>
          <div class="ai-chat-actions">
            <div class="ai-chat-actions-left">
              ${this.createBottomButtons()}
            </div>
            <div class="ai-chat-actions-right">
              <button class="ai-cancel-btn" id="aiCancelBtn" style="display: none;" title="Zrušit požadavek">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
                Zrušit
              </button>
              <button class="ai-send-btn" id="aiSendBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create bottom action buttons (compact icons only)
   */
  createBottomButtons() {
    return `
      <button class="ai-btn-action compact" id="aiAttachFileBtn" title="Připojit soubor">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
        </svg>
      </button>
      <button class="ai-btn-action ai-error-indicator success" id="aiErrorIndicator" title="Žádné chyby - klikni pro DevTools">
        <span class="error-icon">✓</span>
        <span class="error-count">0 chyb</span>
      </button>
      <button class="ai-btn-action compact" id="aiHistoryBtn" title="Historie změn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
      </button>
      <button class="ai-btn-action compact" id="aiNewChatBtn" title="Nový chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    `;
  }

  /**
   * Create Pokec (general chat) tab
   */
  createPokecTab() {
    return `
      <div class="ai-tab-content" data-content="pokec">
        <div class="ai-chat-panel pokec-panel">
          <div class="pokec-header">
            <h3>💬 Pokec s AI</h3>
            <p class="pokec-description">Ptej se na cokoliv - programování, technologie, obecné dotazy...</p>
          </div>
          <div class="ai-chat-messages pokec-messages" id="pokecMessages">
            <div class="ai-welcome-message">
              <div class="ai-welcome-icon">💬</div>
              <h3>Obecný chat</h3>
              <p>Zeptejte se na cokoliv - nejen o kódu!</p>
            </div>
          </div>
          <div class="pokec-input-container">
            <textarea id="pokecInput" class="ai-chat-input" placeholder="Napiš cokoliv..." rows="2"></textarea>
            <button class="ai-send-btn" id="pokecSendBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create Editor tab
   */
  createEditorTab() {
    return `
      <div class="ai-tab-content" data-content="editor">
        <div class="ai-editor-panel">
          <h3>📝 Editor Mode</h3>
          <div class="editor-mode-options">
            <label class="editor-mode-option">
              <input type="radio" name="editorMode" value="continue" checked>
              <span>Pokračovat v projektu</span>
            </label>
            <label class="editor-mode-option">
              <input type="radio" name="editorMode" value="new-project">
              <span>Nový projekt</span>
            </label>
          </div>
          <div class="editor-info">
            <p>📁 Aktivní soubor: <span id="activeFileName">index.html</span></p>
            <p>📊 Řádků: <span id="lineCount">0</span></p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create Prompts tab
   */
  createPromptsTab() {
    return `
      <div class="ai-tab-content" data-content="prompts">
        <div class="ai-prompts">
          <h3>Uložené prompty</h3>
          <div class="prompts-list" id="promptsList">
            <div class="prompt-item" data-prompt="html-structure">
              <div class="prompt-name">HTML Struktura</div>
              <div class="prompt-text">Vytvoř sémantickou HTML strukturu pro...</div>
            </div>
            <div class="prompt-item" data-prompt="css-layout">
              <div class="prompt-name">CSS Layout</div>
              <div class="prompt-text">Vytvoř responzivní layout pomocí CSS Grid...</div>
            </div>
            <div class="prompt-item" data-prompt="js-function">
              <div class="prompt-name">JS Funkce</div>
              <div class="prompt-text">Napiš funkci v JavaScriptu, která...</div>
            </div>
            <div class="prompt-item" data-prompt="accessibility">
              <div class="prompt-name">Přístupnost</div>
              <div class="prompt-text">Zkontroluj přístupnost a navrhni vylepšení...</div>
            </div>
            <div class="prompt-item" data-prompt="performance">
              <div class="prompt-name">Výkon</div>
              <div class="prompt-text">Analyzuj výkon kódu a navrhni optimalizace...</div>
            </div>
          </div>
          <button class="ai-btn-secondary" id="addPromptBtn">➕ Přidat prompt</button>
        </div>
      </div>
    `;
  }

  /**
   * Create GitHub tab
   */
  createGitHubTab() {
    return `
      <div class="ai-tab-content" data-content="github">
        <div class="ai-github">
          <h3>GitHub integrace</h3>
          <div class="github-actions">
            <button class="github-action-btn" data-action="repos">
              <span class="icon">📁</span>
              <span>Repozitáře</span>
            </button>
            <button class="github-action-btn" data-action="search-repos">
              <span class="icon">🔍</span>
              <span>Hledat repozitáře</span>
            </button>
            <button class="github-action-btn" data-action="clone">
              <span class="icon">📥</span>
              <span>Klonovat repo</span>
            </button>
            <button class="github-action-btn" data-action="create-gist">
              <span class="icon">📄</span>
              <span>Vytvořit Gist</span>
            </button>
            <button class="github-action-btn" data-action="issues">
              <span class="icon">🐛</span>
              <span>Issues</span>
            </button>
            <button class="github-action-btn" data-action="pull-requests">
              <span class="icon">🔀</span>
              <span>Pull Requests</span>
            </button>
            <button class="github-action-btn" data-action="deploy">
              <span class="icon">🚀</span>
              <span>Deploy na GitHub Pages</span>
            </button>
          </div>

          <div class="github-status">
            <h4>Nastavení</h4>
            <div class="github-token-form">
              <label for="githubToken">Personal Access Token</label>
              <input
                type="password"
                id="githubToken"
                class="github-token-input"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value="${this.panel.getStoredToken?.() || ''}"
              />
              <div class="github-auth-buttons">
                <button class="ai-btn-primary" id="saveGithubToken">Uložit token</button>
                <button class="ai-btn-secondary" id="githubOAuthLogin">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                  </svg>
                  Přihlásit přes GitHub
                </button>
              </div>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,gist,delete_repo&description=HTML%20Editor%20Token"
                target="_blank"
                class="github-help-link"
              >
                📖 Jak získat token?
              </a>
            </div>

            <div class="status-item">
              <span class="status-label">Status:</span>
              <span class="status-value" id="githubConnected">❌ Nepřipojeno</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build complete AI interface HTML
   */
  buildInterface() {
    return `
      <div class="ai-container">
        <div class="ai-tabs-container">
          ${this.createChatTab()}
          ${this.createPokecTab()}
          ${this.panel.agentsService?.getAgentsTabHTML() || this.createAgentsTabFallback()}
          ${this.createEditorTab()}
          ${this.panel.actionsService?.getActionsTabHTML() || this.createActionsTabFallback()}
          ${this.createPromptsTab()}
          ${this.panel.testingService?.getTestingTabHTML() || ''}
          ${this.createGitHubTab()}
        </div>
      </div>
    `;
  }

  /**
   * Fallback for agents tab
   */
  createAgentsTabFallback() {
    return `
      <div class="ai-tab-content" data-content="agents">
        <div class="ai-agents-panel">
          <h3>🤖 AI Agenti</h3>
          <p>Načítání...</p>
        </div>
      </div>
    `;
  }

  /**
   * Fallback for actions tab
   */
  createActionsTabFallback() {
    return `
      <div class="ai-tab-content" data-content="actions">
        <div class="ai-actions-panel">
          <h3>⚡ Rychlé akce</h3>
          <p>Načítání...</p>
        </div>
      </div>
    `;
  }
}
