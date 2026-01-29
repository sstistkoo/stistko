/**
 * AI Panel Module
 * Provides AI assistant interface with chat, templates, and quick actions
 */

import { eventBus } from '../../core/events.js';
import { state } from '../../core/state.js';
// SafeOps is used indirectly by services
import { Modal } from '../../ui/components/Modal.js';
import { toast } from '../../ui/components/Toast.js';
import { AITester } from './AITester.js';
import { toolSystem } from './tools/ToolSystem.js';
import { initializeTools } from './tools/index.js';
import { GitHubService } from './services/GitHubService.js';
import { CodeEditorService } from './services/CodeEditorService.js';
import { TemplatesService } from './services/TemplatesService.js';
import { FileAttachmentService } from './services/FileAttachmentService.js';
import { AgentsService } from './services/AgentsService.js';
import { ChatHistoryService } from './services/ChatHistoryService.js';
import { ChatService } from './services/ChatService.js';
import { PromptBuilder } from './services/PromptBuilder.js';
import { MESSAGES } from './constants/Messages.js';
import { UIRenderingService } from './services/UIRenderingService.js';
import { ActionsService } from './services/ActionsService.js';
import { TestingService } from './services/TestingService.js';
import { PokecChatService } from './services/PokecChatService.js';
import { ChangedFilesService } from './services/ChangedFilesService.js';
// NEW: Refactored services for modular architecture
import { ProviderService } from './services/ProviderService.js';
import { ErrorHandlingService } from './services/ErrorHandlingService.js';
import { ModalBuilderService } from './services/ModalBuilderService.js';
import { MessageProcessingService } from './services/MessageProcessingService.js';
// Advanced AI Settings Modal
import { getAISettingsModal } from './components/AISettingsModal.js';

export class AIPanel {
  constructor() {
    this.modal = null;
    this.chatService = new ChatService();
    this.promptBuilder = new PromptBuilder(this);
    this.chatHistory = this.chatService.getHistory();
    this.pendingChanges = new Map(); // Store pending changes for accept/reject
    this.originalCode = null; // Store original code before changes
    this.aiTester = new AITester();
    this.isProcessing = false; // Race condition protection
    this.eventListeners = []; // Track event listeners for cleanup
    this.toolSystem = toolSystem; // Tool System pro VS Code Mode
    this.formatCache = new Map(); // Cache for formatted messages
    this.githubService = new GitHubService(this); // GitHub integration service
    this.codeEditorService = new CodeEditorService(this); // Code editing service
    this.templatesService = new TemplatesService(this); // Templates and prompts service
    this.fileAttachmentService = new FileAttachmentService(this); // File attachment service
    this.agentsService = new AgentsService(this); // AI agents and orchestration service
    this.chatHistoryService = new ChatHistoryService(this); // Chat history management service
    this.uiRenderingService = new UIRenderingService(this); // UI rendering service
    this.actionsService = new ActionsService(this); // Quick actions service
    this.testingService = new TestingService(this); // Testing service
    this.pokecChatService = new PokecChatService(this); // Pokec chat service
    this.changedFilesService = new ChangedFilesService(this); // Changed files tracking
    this.lastTokenUsage = null; // Store last request token usage

    // NEW: Initialize refactored services
    this.providerService = new ProviderService(this);
    this.errorHandlingService = new ErrorHandlingService(this);
    this.modalBuilderService = new ModalBuilderService(this);
    this.messageProcessingService = new MessageProcessingService(this);

    // Režim práce (continue = pokračovat, new-project = nový projekt)
    this.workMode = 'continue';

    // Režim konverzace (code = práce s kódem, chat = obecný pokeč)
    this.conversationMode = 'code';

    // Inicializuj tools
    initializeTools();

    // Poslouchej AI request:complete pro zobrazení token usage
    if (window.AI) {
      window.AI.on('request:complete', (data) => {
        this.lastTokenUsage = data;
        console.log('📊 Token usage:', `${data.tokensIn}→${data.tokensOut} (${data.duration}ms)`);
      });
    }

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Track listeners for cleanup
    const listeners = [
      { event: 'ai:show', handler: () => this.show() },
      { event: 'ai:hide', handler: () => this.hide() },
      { event: 'ai:sendMessage', handler: (data) => this.sendMessage(data.message) },
      { event: 'aiSettings:show', handler: () => this.showSettings() },
      { event: 'aiSettings:showAdvanced', handler: () => getAISettingsModal().show() },
      { event: 'console:errorCountChanged', handler: (data) => this.updateErrorIndicator(data.count) },
      { event: 'ai:github-search', handler: () => this.githubService.showGitHubSearchDialog() },
      {
        event: 'github:showLoginModal',
        handler: async ({ callback }) => {
          try {
            const result = await this.githubService.showGitHubLoginModal();
            if (result && callback) {
              callback(result);
            }
          } catch (error) {
            console.error('GitHub login modal error:', error);
          }
        }
      }
    ];

    listeners.forEach(({ event, handler }) => {
      eventBus.on(event, handler);
      this.eventListeners.push({ event, handler });
    });
  }

  cleanup() {
    // Remove all event listeners to prevent memory leaks
    this.eventListeners.forEach(({ event, handler }) => {
      eventBus.off(event, handler);
    });
    this.eventListeners = [];

    // Cleanup modal
    if (this.modal) {
      this.modal.close();
      this.modal = null;
    }

    // Clear pending changes
    this.pendingChanges.clear();
  }

  showSettings() {
    // Open AI modal and automatically expand settings
    this.show();

    // Wait for modal to be fully rendered, then expand settings
    setTimeout(() => {
      const settingsToggle = this.modal?.element?.querySelector('.ai-settings-toggle');
      const settingsContent = this.modal?.element?.querySelector('.ai-header-settings');

      if (settingsToggle && settingsContent) {
        // Always expand settings when called from menu
        if (settingsContent.classList.contains('hidden')) {
          settingsContent.classList.remove('hidden');
          const toggleArrow = settingsToggle.querySelector('.toggle-arrow');
          if (toggleArrow) {
            toggleArrow.textContent = '▲';
          }
        }
        // Scroll to settings area
        settingsToggle.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }

  show() {
    if (!this.modal) {
      this.createModal();
    }
    this.modal.open();
    this.chatHistoryService.restoreChatMessages();
  }

  hide() {
    if (this.modal) {
      this.modal.close();
    }
  }

  createModal() {
    const content = this.createAIInterface();

    this.modal = new Modal({
      title: `<div class="modal-title-wrapper">
        <button class="ai-menu-btn" id="aiMenuBtn" title="Hlavní menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
          <span id="aiMenuText">◆ Kód</span>
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
                ${this.generateProviderOptions()}
              </select>
            </div>
            <div class="ai-model-selector">
              <label for="aiModel">Model:</label>
              <select id="aiModel" class="ai-select" disabled>
                <option value="">Načítání...</option>
              </select>
            </div>
            <button class="ai-advanced-settings-btn" type="button">⚙️ Pokročilé nastavení</button>
          </div>
        </div>
      </div>`,
      content,
      className: 'ai-modal',
      size: 'large',
      onClose: () => this.hide()
    });

    // Create the element first
    this.modal.create();

    // Now attach event handlers
    this.attachEventHandlers();
    this.setupErrorIndicator();
    this.setupTokenCounter();

    // Initialize Auto AI state
    const autoAICheckbox = this.modal.element.querySelector('#autoAI');
    const savedAutoAI = localStorage.getItem('autoAI');
    if (savedAutoAI !== null) {
      autoAICheckbox.checked = savedAutoAI === 'true';
    }

    // Initialize provider/model after DOM is ready
    const providerSelect = this.modal.element.querySelector('#aiProvider');
    if (providerSelect) {
      this.updateModels(providerSelect.value);
    }

    // Update provider/model enabled state based on Auto AI
    this.updateAutoAIState();

    // Add toggle functionality for settings dropdown
    const settingsToggle = this.modal.element.querySelector('.ai-settings-toggle');
    const settingsContent = this.modal.element.querySelector('.ai-header-settings');
    const toggleArrow = this.modal.element.querySelector('.toggle-arrow');

    console.log('Settings toggle found:', settingsToggle);
    console.log('Settings content found:', settingsContent);
    console.log('Toggle arrow found:', toggleArrow);

    if (settingsToggle && settingsContent) {
      console.log('Adding click listener to settings toggle');
      settingsToggle.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Settings toggle clicked!');
        console.log('Before toggle - hidden class:', settingsContent.classList.contains('hidden'));
        settingsContent.classList.toggle('hidden');
        const isOpen = !settingsContent.classList.contains('hidden');
        console.log('After toggle - is open:', isOpen);

        // Dynamicky napozicovat dropdown - vycentrovat v AI panelu
        if (isOpen) {
          const rect = settingsToggle.getBoundingClientRect();
          const modalEl = this.modal?.element;
          if (modalEl) {
            const modalRect = modalEl.getBoundingClientRect();
            const dropdownWidth = 320; // Odhadovaná šířka dropdownu
            const centerX = modalRect.left + (modalRect.width / 2) - (dropdownWidth / 2);
            settingsContent.style.top = `${rect.bottom + 8}px`;
            settingsContent.style.left = `${Math.max(16, centerX)}px`;
            settingsContent.style.right = 'auto';
          } else {
            settingsContent.style.top = `${rect.bottom + 8}px`;
            settingsContent.style.right = `${window.innerWidth - rect.right}px`;
          }
        }

        if (toggleArrow) {
          toggleArrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      });
    } else {
      console.error('Settings toggle or content not found!');
    }

    // Add click listener for advanced settings button
    const advancedSettingsBtn = this.modal.element.querySelector('.ai-advanced-settings-btn');
    if (advancedSettingsBtn) {
      advancedSettingsBtn.addEventListener('click', () => {
        // Close the dropdown
        if (settingsContent) {
          settingsContent.classList.add('hidden');
          if (toggleArrow) {
            toggleArrow.style.transform = 'rotate(0deg)';
          }
        }
        // Open advanced settings modal
        eventBus.emit('aiSettings:showAdvanced');
      });
    }
  }

  /**
   * Detekce mobilního zařízení
   */
  isMobileDevice() {
    // Pokud je vynucený režim, použij ho
    const forcedMode = localStorage.getItem('ai_device_mode');
    if (forcedMode === 'mobile') return true;
    if (forcedMode === 'desktop') return false;
    // Jinak detekuj automaticky
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Získá aktuální režim zařízení (mobile/desktop/auto)
   */
  getDeviceMode() {
    return localStorage.getItem('ai_device_mode') || 'auto';
  }

  /**
   * Nastaví režim zařízení
   */
  setDeviceMode(mode) {
    if (mode === 'auto') {
      localStorage.removeItem('ai_device_mode');
    } else {
      localStorage.setItem('ai_device_mode', mode);
    }
    // Aktualizuj UI
    this.updateDeviceModeUI();
    toast.show(`📱 Režim: ${mode === 'mobile' ? 'Mobile-first' : mode === 'desktop' ? 'Desktop' : 'Auto'}`, 'info');
  }

  /**
   * Aktualizuje UI podle režimu zařízení
   * Nyní zobrazuje pouze jedno tlačítko bez extra indikátoru
   */
  updateDeviceModeUI() {
    const btn = this.modal?.element?.querySelector('#aiDeviceModeBtn');
    const mode = this.getDeviceMode();

    if (btn) {
      const icons = { mobile: '📱', desktop: '🖥️', auto: '🔄' };
      const labels = { mobile: 'Mobile', desktop: 'Desktop', auto: 'Auto' };
      btn.innerHTML = `${icons[mode]} ${labels[mode]}`;
      btn.title = `Režim: ${labels[mode]} (klikni pro změnu)`;
    }
  }

  createAIInterface() {
    // Detekce mobilního zařízení pro personalizovanou uvítací zprávu
    const isMobile = this.isMobileDevice();
    const mode = this.getDeviceMode();
    const modeIcons = { mobile: '📱', desktop: '🖥️', auto: '🔄' };
    const modeLabels = { mobile: 'Mobile', desktop: 'Desktop', auto: 'Auto' };

    // Pouze jedno tlačítko pro režim - bez extra indikátoru
    const deviceModeBtn = `<button class="ai-device-mode-btn" id="aiDeviceModeBtn" title="Přepnout režim generování kódu (Mobile/Desktop/Auto)">${modeIcons[mode]} ${modeLabels[mode]}</button>`;

    const welcomeMessage = isMobile
      ? `Ahoj! 📱 Vidím, že jsi na <strong>mobilním zařízení</strong>. Automaticky generuji <strong>mobile-first</strong> kód optimalizovaný pro dotykové ovládání a menší obrazovky. Co potřebuješ?`
      : `Ahoj! Jsem tvůj AI asistent. Můžu ti pomoct s kódem, vysvětlit koncepty, nebo vytvořit šablony. Co potřebuješ?`;

    return `
      <div class="ai-panel">
        <!-- Chat Tab -->
        <div class="ai-tab-content active" data-content="chat">
          <!-- Chat Interface -->
          <div class="ai-chat">
            <div class="ai-chat-header">
              <span class="chat-history-info" id="chatHistoryInfo">Historie: 0 zpráv</span>
              ${deviceModeBtn}
              <button class="ai-mode-toggle" id="aiModeToggle" title="Přepnout režim práce">
                <span class="mode-icon">📝</span>
                <span class="mode-text">Pokračovat</span>
              </button>
            </div>
            <div class="ai-chat-messages" id="aiChatMessages">
              <div class="ai-message system">
                <p>${welcomeMessage}</p>
              </div>
            </div>
            <!-- Fixní spodní část - vždy viditelná -->
            <div class="ai-chat-footer">
              <!-- Panel změněných souborů (VS Code style) -->
              <div class="ai-changed-files" id="aiChangedFiles" style="display: none;">
                <div class="changed-files-header">
                  <span class="changed-files-count">0 souborů změněno</span>
                  <div class="changed-files-actions">
                    <button class="revert-changes-btn" title="Vrátit všechny změny zpět">↩️ Vrátit zpět</button>
                  </div>
                </div>
                <div class="changed-files-list" id="changedFilesList"></div>
              </div>
              <!-- Input oblast -->
              <div class="ai-chat-input">
              <div class="token-counter" id="tokenCounter">
                <span class="token-count">0</span> tokenů zpráva / <span class="total-token-count">~0</span> celkem (se systémem)
              </div>
              <div class="ai-attached-files" id="aiAttachedFiles" style="display: none; margin-bottom: 10px;"></div>
              <textarea
                id="aiChatInput"
                placeholder="Napiš zprávu... (Shift+Enter pro nový řádek)"
                rows="3"
              ></textarea>
              <div class="ai-chat-buttons">
                <button class="ai-error-indicator success" id="aiErrorIndicator" title="Žádné chyby - klikni pro DevTools">
                  <span class="error-icon">✓</span>
                  <span class="error-count">0 chyb</span>
                </button>
                <button class="ai-attach-btn compact" id="aiAttachBtn" title="Přidat soubor">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                  </svg>
                </button>
                <button class="ai-send-btn" id="aiSendBtn" title="Odeslat zprávu">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                  <span>Odeslat</span>
                </button>
                <button class="ai-cancel-btn-original compact" style="display: none;" title="Zrušit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
                <button class="ai-orchestrator-btn" id="aiOrchestratorBtn" title="Orchestrator">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                  <span>Tým</span>
                </button>
              </div>
            </div>
            </div> <!-- /ai-chat-footer -->
          </div>
        </div>

        <!-- Pokec Tab Content (separate chat for general conversation) -->
        <div class="ai-tab-content" data-content="pokec">
          <div class="ai-chat-container">
            <div class="ai-chat-header">
              <h3>💬 Pokec AI</h3>
              <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 0 0;">Volná konverzace - ptej se na cokoliv! 🌟</p>
            </div>
            <div class="ai-chat-messages" id="aiPokecMessages">
              <div class="ai-message system">
                <p>👋 Ahoj! Jsem Pokec AI a můžeme si povídat o čemkoliv - zábava, věda, cestování, filmy, životní rady, nebo prostě jen pokecáme! 😊 Co tě zajímá?</p>
              </div>
            </div>
            <div class="ai-chat-input">
              <div class="token-counter" id="pokecTokenCounter">
                <span class="token-count">0</span> tokenů zpráva / <span class="total-token-count">~0</span> celkem
              </div>
              <textarea
                id="aiPokecInput"
                placeholder="Zeptej se na cokoliv... (Shift+Enter pro nový řádek)"
                rows="3"
              ></textarea>
              <div class="ai-chat-buttons">
                <div class="pokec-prompt-dropdown">
                  <button class="pokec-prompt-btn" id="pokecPromptBtn" title="Rychlé prompty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    <span>Prompty</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; margin-left: 4px;">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>
                  <div class="pokec-prompt-menu" id="pokecPromptMenu" style="display: none;">
                    <div class="prompt-item" data-prompt="fun-fact">
                      🌟 Zajímavost dne
                    </div>
                    <div class="prompt-item" data-prompt="joke">
                      😄 Řekni vtip
                    </div>
                    <div class="prompt-item" data-prompt="advice">
                      💡 Životní rada
                    </div>
                    <div class="prompt-item" data-prompt="creative">
                      ✨ Kreativní nápad
                    </div>
                    <div class="prompt-item" data-prompt="explain">
                      🎓 Vysvětli téma
                    </div>
                    <div class="prompt-item" data-prompt="recommend">
                      🎬 Doporuč film/knihu
                    </div>
                  </div>
                </div>
                <button class="ai-send-btn" id="aiPokecSendBtn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                  <span>Odeslat</span>
                </button>
                <button class="ai-clear-btn" id="aiPokecClearBtn" title="Vymazat historii">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/>
                  </svg>
                </button>
              </div>
              <div class="pokec-token-info" id="pokecTokenInfo" style="display: none;">
                <!-- Token info will be displayed here after each message -->
              </div>
            </div>
          </div>
        </div>

        <!-- AI Agents Tab -->
        <div class="ai-tab-content" data-content="agents">
          <div class="agents-panel">
            <h3>🤖 AI Programovací Agenti</h3>
            <p class="agents-description">Aktivuj agenty podle typu úkolu. Můžeš použít více agentů najednou pro kolaborativní práci.</p>

            <!-- Engine Selector -->
            <div class="agent-engine-selector">
              <label>
                <input type="radio" name="agentEngine" value="javascript" checked>
                <span>⚡ JavaScript Agenti (Online AI)</span>
              </label>
              <label>
                <input type="radio" name="agentEngine" value="crewai">
                <span>🐍 CrewAI (Ollama lokálně)</span>
                <span class="engine-status" id="crewaiStatus">○</span>
              </label>
            </div>

            <div class="agents-grid" id="agentsGrid">
              <!-- Agents will be dynamically loaded here -->
            </div>

            <div class="active-agents-section" id="activeAgentsSection" style="display: none;">
              <h4>Aktivní agenti</h4>
              <div class="active-agents-list" id="activeAgentsList"></div>

              <div class="collaborative-actions">
                <button class="btn-orchestrated" id="orchestratedTaskBtn">
                  <span class="icon">🎯</span>
                  <span>Orchestrovaný úkol</span>
                </button>
                <button class="btn-collaborative" id="collaborativeTaskBtn">
                  <span class="icon">🤝</span>
                  <span>Společný úkol</span>
                </button>
                <button class="btn-clear-agents" id="clearAgentsBtn">
                  <span class="icon">🗑️</span>
                  <span>Vymazat historii</span>
                </button>
              </div>
            </div>

            <!-- Agent Chat -->
            <div class="agent-chat-section" id="agentChatSection" style="display: none;">
              <h4>Chat s agentem: <span id="currentAgentName"></span></h4>
              <div class="agent-chat-messages" id="agentChatMessages"></div>
              <div class="agent-chat-input">
                <textarea
                  id="agentChatInput"
                  placeholder="Napiš zprávu agentovi..."
                  rows="3"
                ></textarea>
                <button id="sendToAgentBtn" class="btn-primary">
                  Odeslat
                </button>
              </div>
            </div>
          </div>
        </div>

        ${this.actionsService.getActionsTabHTML()}

        <!-- Prompts Tab -->
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

        ${this.testingService.getTestingTabHTML()}

        <!-- GitHub Tab -->
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
                  value="${this.githubService.getStoredToken() || ''}"
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
      </div>
    `;
  }

  setupErrorIndicator() {
    // Delegováno na ErrorHandlingService
    this.errorHandlingService.setupErrorIndicator();
  }

  updateErrorIndicator(errorCount) {
    // Delegováno na ErrorHandlingService
    this.errorHandlingService.updateErrorIndicator(errorCount);
  }

  sendAllErrorsToAI() {
    // Delegováno na ErrorHandlingService
    this.errorHandlingService.sendAllErrorsToAI();
  }

  isErrorIgnored(errorText) {
    return this.errorHandlingService.isErrorIgnored(errorText);
  }

  ignoreErrors(errors) {
    this.errorHandlingService.ignoreErrors(errors);
  }

  showErrorSelectionModal(errorMessages) {
    this.errorHandlingService.showErrorSelectionModal(errorMessages);
  }

  showIgnoredErrorsModal() {
    this.errorHandlingService.showIgnoredErrorsModal();
  }

  escapeHTML(text) {
    // Deprecated: Use escapeHtml instead
    return this.escapeHtml(text);
  }

  setupTokenCounter() {
    const chatInput = this.modal?.element?.querySelector('#aiChatInput');
    const tokenCounter = this.modal?.element?.querySelector('#tokenCounter');

    if (!chatInput || !tokenCounter) return;

    chatInput.addEventListener('input', () => {
      const text = chatInput.value;
      const charCount = text.length;
      // Rough estimation: 1 token ≈ 4 characters
      const tokenCount = Math.ceil(charCount / 4);

      // Spočítej celkový počet tokenů včetně system promptu a přiložených souborů
      const currentCode = state.get('editor.code') || '';
      const attachedFiles = this.fileAttachmentService.getAttachedFiles();

      // Odhad system promptu (průměrně ~2000-3000 tokenů)
      let systemPromptTokens = 2000;
      const isDescriptionRequest = text.toLowerCase().match(/popi[šs]|popis|vysv[ěe]tli|co d[ěe]l[áa]|jak funguje/);
      if (isDescriptionRequest) {
        systemPromptTokens = 500; // Krátký prompt pro popis
      }

      // Tokeny z kódu v editoru
      const codeTokens = Math.ceil(currentCode.length / 4);

      // Tokeny z přiložených souborů
      let attachedFilesTokens = 0;
      if (attachedFiles && attachedFiles.length > 0) {
        attachedFiles.forEach(file => {
          attachedFilesTokens += Math.ceil(file.content.length / 4);
        });
      }

      // Celkový odhad
      const totalTokens = tokenCount + systemPromptTokens + codeTokens + attachedFilesTokens;

      tokenCounter.querySelector('.token-count').textContent = tokenCount;
      const totalCountSpan = tokenCounter.querySelector('.total-token-count');
      if (totalCountSpan) {
        totalCountSpan.textContent = `~${totalTokens.toLocaleString()}`;
      }

      // Color coding na základě celkového počtu
      if (totalTokens > 100000) {
        tokenCounter.style.color = '#ef4444';
      } else if (totalTokens > 50000) {
        tokenCounter.style.color = '#f59e0b';
      } else {
        tokenCounter.style.color = 'var(--text-secondary)';
      }
    });
  }

  attachEventHandlers() {
    // Menu Button and Dropdown
    const menuBtn = this.modal.element.querySelector('#aiMenuBtn');
    const menuDropdown = this.modal.element.querySelector('#aiMenuDropdown');
    const tabContents = this.modal.element.querySelectorAll('.ai-tab-content');

    if (menuBtn && menuDropdown) {
      // Toggle dropdown on click
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle('hidden');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
          menuDropdown.classList.add('hidden');
        }
      });

      // Handle menu item clicks
      menuDropdown.querySelectorAll('.ai-menu-item').forEach(item => {
        item.addEventListener('click', () => {
          const tabName = item.dataset.tab;
          const action = item.dataset.action;
          menuDropdown.classList.add('hidden');

          if (action === 'export') {
            this.showExportDialog();
            return;
          }
          if (action === 'ai-studios') {
            // Import MenuModals and show AI Studios
            import('../menu/services/MenuModals.js').then(module => {
              const menuModals = new module.MenuModals();
              menuModals.showAIStudios();
            }).catch(err => {
              console.error('[AIPanel] Failed to load AI Studios:', err);
              toast.show('❌ Nelze načíst AI Studia', 'error');
            });
            return;
          }
          if (action === 'live-server') {
            this.showLiveServerModal();
            return;
          }
          if (action === 'clear') {
            if (this.conversationMode === 'chat') {
              if (confirm('Opravdu chceš vymazat historii pokec chatu?')) {
                this.pokecChatService.clearHistory();
                toast.show('🗑️ Historie pokec chatu vymazána', 'success');
              }
            } else {
              this.chatHistoryService.clearChatHistory();
            }
            return;
          }

          // Aktualizovat text menu tlačítka podle vybrané záložky
          const menuText = this.modal.element.querySelector('#aiMenuText');
          if (menuText && tabName) {
            const tabLabels = {
              'chat': '◆ Kód',
              'pokec': '💬 Pokec',
              'agents': '🤖 Agenti',
              'actions': '⚡ Akce',
              'prompts': '📝 Prompty',
              'testing': '🧪 Testing',
              'github': '🔗 GitHub'
            };
            menuText.textContent = tabLabels[tabName] || tabName;
          }

          // Handle conversation mode switch
          if (tabName === 'chat') {
            this.conversationMode = 'code';
            toast.show('💻 Režim: Práce s kódem', 'info');
            tabContents.forEach(c => c.classList.remove('active'));
            const chatContent = this.modal.element.querySelector('[data-content="chat"]');
            if (chatContent) chatContent.classList.add('active');
            return;
          }
          if (tabName === 'pokec') {
            this.conversationMode = 'chat';
            toast.show('💬 Režim: Obecná konverzace', 'info');
            tabContents.forEach(c => c.classList.remove('active'));
            const pokecContent = this.modal.element.querySelector('[data-content="pokec"]');
            if (pokecContent) pokecContent.classList.add('active');
            const pokecInput = this.modal.element.querySelector('#aiPokecInput');
            if (pokecInput) setTimeout(() => pokecInput.focus(), 100);
            return;
          }

          // Special handling for editor tab
          if (tabName === 'editor') {
            this.modal.close();
            const editorTextarea = document.querySelector('#editor');
            if (editorTextarea) editorTextarea.focus();
            toast.show('📝 Přepnuto na editor', 'info');
            return;
          }

          // Remove active class from all contents
          tabContents.forEach(c => c.classList.remove('active'));
          // Add active class to corresponding content
          const content = this.modal.element.querySelector(`[data-content="${tabName}"]`);
          if (content) content.classList.add('active');
        });
      });
    }

    // Chat Input & Send
    const chatInput = this.modal.element.querySelector('#aiChatInput');
    const sendBtn = this.modal.element.querySelector('#aiSendBtn');
    const attachBtn = this.modal.element.querySelector('#aiAttachBtn');

    // File attachment button
    if (attachBtn) {
      attachBtn.addEventListener('click', () => this.fileAttachmentService.showFileAttachmentModal());
    }

    if (chatInput && sendBtn) {
      const sendMessage = () => {
        const message = chatInput.value.trim();
        if (message) {
          this.sendMessage(message);
          chatInput.value = '';
          chatInput.style.height = 'auto';
          // Clear attached files after sending
          this.fileAttachmentService.clearAttachedFiles();
        }
      };

      sendBtn.addEventListener('click', sendMessage);

      // Orchestrator button
      const orchestratorBtn = this.modal.element.querySelector('#aiOrchestratorBtn');
      if (orchestratorBtn) {
        orchestratorBtn.addEventListener('click', () => {
          const message = chatInput.value.trim();
          if (message) {
            this.sendToOrchestrator(message);
            chatInput.value = '';
            chatInput.style.height = 'auto';
          }
        });
      }

      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      // Auto-resize textarea
      chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = chatInput.scrollHeight + 'px';
      });
    }

    // Pokec chat handlers - delegated to PokecChatService
    this.pokecChatService.attachHandlers();

    // AI Mode Toggle Button
    const modeToggleBtn = this.modal.element.querySelector('#aiModeToggle');
    if (modeToggleBtn) {
      modeToggleBtn.addEventListener('click', () => {
        // Simple toggle - no dialog here
        // Dialog will show when AI sends code to insert
        if (this.workMode === 'continue') {
          this.workMode = 'new-project';
          modeToggleBtn.querySelector('.mode-icon').textContent = '🆕';
          modeToggleBtn.querySelector('.mode-text').textContent = 'Nový projekt';
          modeToggleBtn.classList.add('new-project-mode');
          modeToggleBtn.title = 'Začít nový projekt (smaže současný kód)';
          console.log('[AIPanel] Režim změněn na: Nový projekt');
        } else {
          this.workMode = 'continue';
          modeToggleBtn.querySelector('.mode-icon').textContent = '📝';
          modeToggleBtn.querySelector('.mode-text').textContent = 'Pokračovat';
          modeToggleBtn.classList.remove('new-project-mode');
          modeToggleBtn.title = 'Přidávat kód k existujícímu projektu';
          console.log('[AIPanel] Režim změněn na: Pokračovat');
        }
      });
    }

    // Device Mode Toggle Button (Mobile/Desktop/Auto)
    const deviceModeBtn = this.modal.element.querySelector('#aiDeviceModeBtn');
    if (deviceModeBtn) {
      deviceModeBtn.addEventListener('click', () => {
        const currentMode = this.getDeviceMode();
        const modes = ['auto', 'mobile', 'desktop'];
        const currentIndex = modes.indexOf(currentMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        this.setDeviceMode(nextMode);
      });
    }

    // Update history info
    this.chatHistoryService.updateHistoryInfo();

    // Quick actions - delegated to ActionsService
    this.actionsService.attachHandlers();

    // Templates
    const templateBtns = this.modal.element.querySelectorAll('.template-btn');
    templateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const template = btn.dataset.template;
        this.handleTemplate(template);
      });
    });

    // Prompts
    const promptItems = this.modal.element.querySelectorAll('.prompt-item');
    promptItems.forEach(item => {
      item.addEventListener('click', () => {
        const promptId = item.dataset.prompt;
        this.templatesService.usePrompt(promptId);
      });
    });

    const addPromptBtn = this.modal.element.querySelector('#addPromptBtn');
    if (addPromptBtn) {
      addPromptBtn.addEventListener('click', () => this.templatesService.addCustomPrompt());
    }

    // GitHub actions
    const githubActionBtns = this.modal.element.querySelectorAll('.github-action-btn');
    githubActionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.githubService.handleGitHubAction(action);
      });
    });

    // GitHub token save button
    const saveGithubToken = this.modal.element.querySelector('#saveGithubToken');
    if (saveGithubToken) {
      saveGithubToken.addEventListener('click', () => this.githubService.saveGitHubToken(this.modal));
    }

    // GitHub OAuth login
    const githubOAuthLogin = this.modal.element.querySelector('#githubOAuthLogin');
    if (githubOAuthLogin) {
      githubOAuthLogin.addEventListener('click', () => this.githubService.initiateGitHubOAuth());
    }

    // Check token on load
    this.githubService.checkGitHubConnection(this.modal);

    // History button - show changed files
    const historyBtn = this.modal.element.querySelector('#aiHistoryBtn');
    if (historyBtn) {
      historyBtn.addEventListener('click', () => {
        if (this.changedFilesService) {
          this.changedFilesService.showChangedFilesPanel();
        } else {
          toast.info('Historie změn je prázdná', 2000);
        }
      });
    }

    // New chat button - clear chat and start fresh
    const newChatBtn = this.modal.element.querySelector('#aiNewChatBtn');
    if (newChatBtn) {
      newChatBtn.addEventListener('click', () => {
        if (confirm('Opravdu chceš začít nový chat? Historie bude vymazána.')) {
          this.chatHistoryService.clearChatHistory();
          toast.success('🗑️ Chat vymazán, můžeš začít novou konverzaci', 2000);
        }
      });
    }

    // AI Agents handlers
    this.agentsService.attachAgentsHandlers();

    // Provider change
    const providerSelect = this.modal.element.querySelector('#aiProvider');
    if (providerSelect) {
      providerSelect.addEventListener('change', (e) => {
        this.updateModels(e.target.value);
      });

      // Initialize models for default provider
      this.updateModels(providerSelect.value);
    }

    // Auto AI checkbox handler
    const autoAICheckbox = this.modal.element.querySelector('#autoAI');
    if (autoAICheckbox) {
      autoAICheckbox.addEventListener('change', () => {
        localStorage.setItem('autoAI', autoAICheckbox.checked);
        this.updateAutoAIState();

        if (autoAICheckbox.checked) {
          toast.success('🤖 Auto AI zapnuto - automatický výběr nejlepšího modelu', 2000);
        } else {
          toast.info('👤 Manuální režim - vyberte si providera a model', 2000);
        }
      });
    }

    // Model change - auto-update provider if model from different provider is selected
    const modelSelect = this.modal.element.querySelector('#aiModel');
    if (modelSelect && providerSelect) {
      modelSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const modelProvider = selectedOption?.dataset?.provider;

        // If selected model is from different provider, update provider select
        if (modelProvider && modelProvider !== providerSelect.value) {
          providerSelect.value = modelProvider;
          // No need to update models - they're already loaded
        }
      });
    }

    // Tool System je vždy aktivní (VS Code style)
    this.toolSystem.setEnabled(true);
    console.log('🛠️ Tool System: Vždy aktivní (VS Code style)');

    // Testing tab handlers - delegated to TestingService
    this.testingService.attachHandlers();
  }

  handleTemplate(template) {
    const templates = {
      blank: this.templatesService.getBlankTemplate(),
      landing: this.templatesService.getLandingTemplate(),
      form: this.templatesService.getFormTemplate(),
      dashboard: this.templatesService.getDashboardTemplate(),
      portfolio: this.templatesService.getPortfolioTemplate()
    };

    const templateCode = templates[template];
    if (templateCode) {
      eventBus.emit('editor:setContent', { content: templateCode });
      this.hide();
      eventBus.emit('toast:show', {
        message: `Šablona "${template}" byla vložena`,
        type: 'success'
      });
    }
  }

  async sendMessage(message, isAutoRetry = false) {
    // Race condition protection
    if (this.isProcessing) {
      toast.warning('⏳ Čekám na dokončení předchozího požadavku...', 2000);
      return;
    }

    this.isProcessing = true;

    // Reset retry flag only for user-initiated messages (not auto-retry)
    if (!isAutoRetry) {
      this._retryAttempted = false;
    }

    // Show cancel button
    const cancelBtn = this.modal.element.querySelector('.ai-cancel-btn');
    if (cancelBtn) {
      cancelBtn.style.display = 'flex';
      cancelBtn.onclick = () => {
        this.cancelRequest();
      };
    }

    // Add user message to chat (with attached files indicator)
    let displayMessage = message;
    const attachedFiles = this.fileAttachmentService.getAttachedFiles();
    if (attachedFiles && attachedFiles.length > 0) {
      displayMessage += `\n\n📎 Přiložené soubory (${attachedFiles.length}): ${attachedFiles.map(f => f.name).join(', ')}`;
    }
    this.addChatMessage('user', displayMessage);

    // Get current code for loading text detection
    const currentCode = state.get('editor.code') || '';

    // Detekuj typ požadavku pro správný loading text
    const loadingText = this.getLoadingTextForRequest(message, currentCode);

    // Přidat loading animaci
    const loadingId = 'ai-loading-' + Date.now();
    const messagesContainer = this.modal.element.querySelector('#aiChatMessages');
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'ai-message assistant loading';
    loadingMsg.id = loadingId;
    loadingMsg.innerHTML = `
      <div class="ai-thinking" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="thinking-dots">
            <span></span><span></span><span></span>
          </div>
          <p style="margin: 0;">${loadingText}</p>
        </div>
        <button class="ai-cancel-btn" style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          <span>Zrušit</span>
        </button>
      </div>
    `;
    messagesContainer.appendChild(loadingMsg);

    // Přidat event listener na nové tlačítko v loading zprávě
    const loadingCancelBtn = loadingMsg.querySelector('.ai-cancel-btn');
    if (loadingCancelBtn) {
      loadingCancelBtn.onclick = () => {
        this.cancelRequest();
      };
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Add to history
    this.chatService.addToHistory('user', message);
    this.chatHistory = this.chatService.getHistory();
    this.chatHistoryService.updateHistoryInfo();

    try {
      // Get current provider and model from UI or use auto-selection
      // Check if AI module is available
      if (typeof window.AI === 'undefined') {
        throw new Error('AI modul není načten');
      }

      // Get current code for context
      const currentCode = state.get('editor.code') || '';
      const openFiles = state.get('files.tabs') || [];
      const activeFileId = state.get('files.active');

      // Build system prompt using PromptBuilder with conversation mode
      let systemPrompt = this.promptBuilder.buildSystemPrompt(
        message,
        currentCode,
        openFiles,
        activeFileId,
        this.conversationMode // Pass conversation mode to PromptBuilder
      );

      // Get provider and model from UI
      let provider = this.modal.element.querySelector('#aiProvider')?.value;
      let model = this.modal.element.querySelector('#aiModel')?.value;
      const autoAI = this.modal.element.querySelector('#autoAI')?.checked;

      // If Auto AI is enabled, use intelligent model selection
      if (autoAI) {
        const bestModel = window.AI.selectBestCodingModel();
        provider = bestModel.provider;
        model = bestModel.model;
        console.log(`🤖 Auto AI: ${provider}/${model} (kvalita: ${bestModel.quality})`);
      } else if (!model || model === 'null' || model === '') {
        // Manual mode but no model selected - use best available
        const bestModel = window.AI.selectBestModel();
        provider = bestModel.provider;
        model = bestModel.model;
        console.log(MESSAGES.AUTO_SELECT_MODEL(provider, model));
      } else {
        // Manual mode with specific model selected
        // Get provider from selected model's data-attribute (in case user selected model from different provider)
        const modelSelect = this.modal.element.querySelector('#aiModel');
        const selectedOption = modelSelect?.options[modelSelect.selectedIndex];
        const modelProvider = selectedOption?.dataset?.provider;
        if (modelProvider) {
          provider = modelProvider;
        }
      }

      // 🚨 PŘIDEJ KRITICKÁ PRAVIDLA - ALE JEN PRO REŽIM POKRAČOVÁNÍ (ne pro nový projekt!)
      // V režimu "Nový projekt" nechceme SEARCH/REPLACE, ale kompletní nový kód
      const isNewProjectMode = this.workMode === 'new-project';

      if (!isNewProjectMode && currentCode && currentCode.trim().length > 100) {
        const CRITICAL_EDIT_RULES = `

═══════════════════════════════════════════════════════════
🚨🚨🚨 PREFEROVANÝ FORMÁT: SEARCH/REPLACE (VS Code style) 🚨🚨🚨
═══════════════════════════════════════════════════════════

KDYŽ MĚNÍŠ KÓD, POUŽIJ **SEARCH/REPLACE FORMÁT** (spolehlivější):

\`\`\`SEARCH
[přesný kód který chceš najít a nahradit]
\`\`\`
\`\`\`REPLACE
[nový kód]
\`\`\`

✅ VÝHODY SEARCH/REPLACE:
✅ Nemusíš znát čísla řádků
✅ Automaticky najde správné místo v kódu
✅ Funguje i když se kód změnil
✅ Stejný princip jako VS Code (najdi a nahraď)

💡 PŘÍKLAD:
\`\`\`SEARCH
.button {
  background: blue;
  color: white;
}
\`\`\`
\`\`\`REPLACE
.button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transition: transform 0.3s;
}
\`\`\`

⚠️ DŮLEŽITÉ PRO SEARCH BLOK:
• Zkopíruj PŘESNĚ kód který vidíš v editoru
• Včetně všech whitespace a odsazení
• Nesmí obsahovat "..." nebo jiné zkratky
• Měl by být dostatečně unikátní (ne moc krátký)

🔄 Můžeš použít více SEARCH/REPLACE bloků najednou:
\`\`\`SEARCH
const x = 1;
\`\`\`
\`\`\`REPLACE
const x = 2;
\`\`\`
\`\`\`SEARCH
const y = 3;
\`\`\`
\`\`\`REPLACE
const y = 4;
\`\`\`

💡 TIP: Raději použij více menších SEARCH/REPLACE bloků než jeden velký!

═══════════════════════════════════════════════════════════
`;
        systemPrompt = CRITICAL_EDIT_RULES + systemPrompt;
      } else if (isNewProjectMode) {
        // 🆕 PRO NOVÝ PROJEKT - jasné instrukce na vytvoření kompletního kódu
        const NEW_PROJECT_HEADER = `
╔═══════════════════════════════════════════════════════════╗
║  🚨🚨🚨 KRITICKÝ REŽIM: NOVÝ PROJEKT 🚨🚨🚨              ║
╚═══════════════════════════════════════════════════════════╝

⚠️⚠️⚠️ ABSOLUTNĚ ZAKÁZÁNO POUŽÍVAT SEARCH/REPLACE! ⚠️⚠️⚠️

Editor je PRÁZDNÝ. Neexistuje žádný kód k úpravě.
SEARCH/REPLACE NEBUDE FUNGOVAT - editor je prázdný!

✅ MUSÍŠ UDĚLAT PŘESNĚ TOTO:
1. Okamžitě vytvoř KOMPLETNÍ HTML soubor
2. Začni: <!DOCTYPE html>
3. Skonči: </html>
4. Vše v JEDNOM \`\`\`html bloku
5. Kód MUSÍ být 100% funkční a kompletní

❌ ZAKÁZANÉ FORMÁTY (NEBUDOU FUNGOVAT!):
- \`\`\`SEARCH ... \`\`\`REPLACE - ZAKÁZÁNO!
- Jakékoliv diff/patch formáty - ZAKÁZÁNO!
- Částečný kód - ZAKÁZÁNO!

📝 SPRÁVNÝ FORMÁT ODPOVĚDI:
\`\`\`html
<!DOCTYPE html>
<html lang="cs">
<head>...</head>
<body>...</body>
</html>
\`\`\`

VYTVOŘ KOMPLETNÍ KÓD NYNÍ!
═══════════════════════════════════════════════════════════
`;
        systemPrompt = NEW_PROJECT_HEADER + systemPrompt;
        console.log('[AIPanel] 🆕 Režim NOVÝ PROJEKT - přidána hlavička');
      }

      // Přidej Tool System prompt (vždy aktivní - VS Code style)
      systemPrompt += this.toolSystem.getToolSystemPrompt();
      console.log('🛠️ Tool System aktivní (VS Code style)');

      let response = await window.AI.ask(message, {
        provider: provider,
        model: model,
        system: systemPrompt,
        temperature: 0.7,
        autoFallback: true,  // Auto-switch on rate limit
        history: this.chatHistory.slice(-10) // Send last 10 messages as context
      });

      // Zpracuj tool calls (Tool System je vždy aktivní)
      let toolCallIteration = 0;
      const maxIterations = 5;

      while (toolCallIteration < maxIterations) {
        const toolProcessing = await this.toolSystem.processResponse(response);

        if (!toolProcessing.hasToolCalls) {
          // Žádné tool calls - pokračuj normálně
          response = toolProcessing.cleanedContent;
          break;
        }

        // Zobraz tool calls info
        console.log(`🔧 Tool call ${toolCallIteration + 1}:`, toolProcessing.toolResults);

        // Přidej info o tool calls do chatu
        const toolInfo = toolProcessing.toolResults.map(tr =>
          `🔧 **${tr.tool}**: ${tr.result.success ? '✅ Úspěch' : '❌ Chyba'}`
        ).join('\n');

        this.addChatMessage('system', `Tool System:\n${toolInfo}`);

        // Pošli výsledky zpět AI pro další response
        const toolResultsText = this.toolSystem.formatToolResults(toolProcessing.toolResults);

        response = await window.AI.ask(
          `${toolProcessing.cleanedContent}\n\n${toolResultsText}\n\nNa základě těchto výsledků odpověz uživateli.`,
          {
            provider: provider,
            model: model,
            system: systemPrompt,
            temperature: 0.7,
            history: this.chatHistory.slice(-10)
          }
        );

        toolCallIteration++;
      }

      if (toolCallIteration >= maxIterations) {
        response += '\n\n⚠️ Maximum tool iterations reached';
      }

      // Add to history
      this.chatService.addToHistory('assistant', response);
      this.chatHistory = this.chatService.getHistory();
      this.chatHistoryService.updateHistoryInfo();

      // Odstranit loading animaci
      const loadingElement = document.getElementById(loadingId);
      if (loadingElement) loadingElement.remove();

      // Try SEARCH/REPLACE (VS Code style - preferred and only supported format)
      // 🆕 ALE POUZE pokud NEJSME v režimu nového projektu!
      const searchReplaceEdits = this.parseSearchReplaceInstructions(response);

      // V režimu nového projektu ignorujeme SEARCH/REPLACE a extrahujeme kompletní kód
      if (isNewProjectMode && searchReplaceEdits.length > 0) {
        console.log('[AIPanel] 🆕 Režim nový projekt - ignoruji SEARCH/REPLACE, hledám kompletní kód');
        // Zkusíme extrahovat kompletní HTML kód z odpovědi
        const htmlMatch = response.match(/```html\n([\s\S]*?)```/);
        if (htmlMatch && htmlMatch[1]) {
          const completeCode = htmlMatch[1].trim();
          console.log('[AIPanel] ✅ Nalezen kompletní HTML kód v odpovědi');
          this.addChatMessage('assistant', response);
          this.insertCodeToEditor(completeCode, false);
          toast.success('✅ Nový projekt vytvořen!', 3000);
          return;
        }
        // Pokud není ```html blok, zkusíme najít jakýkoliv kód
        const anyCodeMatch = response.match(/```(?:html|javascript|js)?\n([\s\S]*?)```/);
        if (anyCodeMatch && anyCodeMatch[1] && anyCodeMatch[1].includes('<!DOCTYPE')) {
          const completeCode = anyCodeMatch[1].trim();
          console.log('[AIPanel] ✅ Nalezen kompletní kód (alternativní match)');
          this.addChatMessage('assistant', response);
          this.insertCodeToEditor(completeCode, false);
          toast.success('✅ Nový projekt vytvořen!', 3000);
          return;
        }
        console.warn('[AIPanel] ⚠️ AI vrátila SEARCH/REPLACE v režimu nového projektu, ale nenalezen kompletní kód');
        // Pokračuj normálně - zobraz odpověď
      }

      if (searchReplaceEdits.length > 0 && !isNewProjectMode) {
        console.log(`🔧 Detekované ${searchReplaceEdits.length} SEARCH/REPLACE instrukcí`);

        // Uložit původní kód PŘED aplikací změn
        const originalCode = state.get('editor.code') || '';

        // Aplikovat změny ROVNOU (bez confirmation dialogu - VS Code style)
        const result = this.codeEditorService.applySearchReplaceEdits(searchReplaceEdits);

        // Získat nový kód PO aplikaci
        const newCode = state.get('editor.code') || '';

        // 🎨 Copilot-style: Zobrazit vizuální diff místo prostého textu
        this.addChatMessage('assistant', response);

        if (result.success) {
          // Přidat Copilot-style diff zprávu s undo možností
          this.uiRenderingService.addDiffMessage(
            originalCode,
            newCode,
            searchReplaceEdits,
            (codeToRestore) => {
              // Undo callback - vrátit původní kód
              eventBus.emit('editor:setCode', { code: codeToRestore });
              toast.success('↩️ Změny vráceny', 2000);
            }
          );

          // Analyzuj kvalitu změn a poskytni feedback
          const qualityInfo = this.analyzeEditQuality(searchReplaceEdits, result);
          if (qualityInfo.warning) {
            toast.warning(qualityInfo.message, 4000);
          } else {
            toast.success(`✅ Aplikováno ${searchReplaceEdits.length} změn${qualityInfo.fuzzyCount > 0 ? ' (některé fuzzy)' : ''}`, 3000);
          }
        } else if (result.syntaxError) {
          // Syntax error - změny nebyly aplikovány
          // Error message už byla přidána v CodeEditorService
          // Přidej tlačítko pro retry s jiným přístupem
          this.addRetryButton(message, 'syntax_error');
        } else {
          toast.error('⚠️ Některé změny selhaly - viz konzole', 5000);
        }
        return; // Exit after handling changes
      } else if (response.includes('SEARCH') || response.includes('```search')) {
        // SEARCH bloky byly detekovány ale neparsovány správně

        // Zobraz AI response v chatu, aby uživatel viděl co AI poslala
        this.addChatMessage('assistant', response);

        // Zkus zjistit důvod - debug info
        const hasSearchBlock = /```\s*SEARCH/i.test(response);
        const hasReplaceBlock = /```\s*REPLACE/i.test(response);

        // Detailnější diagnostika
        const searchBlocks = (response.match(/```\s*SEARCH/gi) || []).length;
        const replaceBlocks = (response.match(/```\s*REPLACE/gi) || []).length;
        const closingBackticks = (response.match(/```/g) || []).length;

        let errorDetail = '';
        let errorType = 'unknown';

        if (!hasSearchBlock) {
          errorDetail = '❓ Nenalezen ```SEARCH blok';
          errorType = 'no_search';
        } else if (!hasReplaceBlock) {
          errorDetail = '❓ Nenalezen ```REPLACE blok';
          errorType = 'no_replace';
        } else if (closingBackticks % 2 !== 0) {
          errorDetail = '⚠️ AI odpověď je NEÚPLNÁ (chybí uzavírající ```)';
          errorType = 'incomplete';
        } else if (searchBlocks !== replaceBlocks) {
          errorDetail = `⚠️ Nesouhlasí počet bloků: ${searchBlocks} SEARCH vs ${replaceBlocks} REPLACE`;
          errorType = 'mismatched';
        } else if (searchReplaceEdits.parseError) {
          errorDetail = `⚠️ ${searchReplaceEdits.parseErrorDetail || 'Neplatný formát'}`;
          errorType = searchReplaceEdits.parseError;
        } else {
          errorDetail = '⚠️ Bloky nalezeny, ale obsahují neplatný obsah (zkratky, placeholdery)';
          errorType = 'invalid_content';
        }

        console.error('❌ SEARCH/REPLACE parsing failed:', errorDetail);
        console.error('Response preview:', response.substring(0, 500));

        // Konkrétní tipy podle typu chyby
        let tip = '';
        if (errorType === 'incomplete') {
          tip = '💡 AI odpověď byla přerušena. Zkus:\n"Pokračuj v úpravě a dokonči SEARCH/REPLACE blok"';
        } else if (errorType === 'mismatched') {
          tip = '💡 AI vrátila neúplné bloky. Zkus znovu s jasným požadavkem.';
        } else {
          tip = '💡 Tip: Požádej AI znovu:\n"Oprav kód pomocí SEARCH/REPLACE - použij PŘESNÝ kód z editoru"';
        }

        // Zobraz error toast s konkrétním důvodem
        toast.error(
          '❌ SEARCH/REPLACE bloky se nepodařilo zpracovat\n\n' +
          errorDetail + '\n\n' + tip,
          8000
        );
        console.error('❌ SEARCH bloky ignorovány - viz konzole pro detaily');
        console.error('📄 Zobrazuji AI response v chatu pro debugging...');

        // Zobraz token usage i při chybě parsování
        if (this.lastTokenUsage) {
          const { tokensIn, tokensOut, duration, provider, model } = this.lastTokenUsage;
          const total = tokensIn + tokensOut;
          this.addChatMessage('system',
            `📊 Použito ${total.toLocaleString()} tokenů (${tokensIn.toLocaleString()}→${tokensOut.toLocaleString()}) • ${duration}ms • ${provider}/${model}`
          );
          this.lastTokenUsage = null;
        }

        // Auto-retry s jiným modelem (max 1x)
        if (!this._retryAttempted && errorType === 'incomplete') {
          this._retryAttempted = true;
          this.addChatMessage('system', '🔄 Automaticky zkouším s jiným modelem...');

          // Mark current model as temporarily unavailable
          const currentProvider = this.providerService?.currentProvider || 'gemini';
          const currentModel = (this.providerService?.currentModel || 'gemini-2.5-flash').split('/').pop();

          if (window.AI && window.AI._modelSelector) {
            window.AI._modelSelector.recordLimitHit(currentProvider, currentModel, 'incomplete', 'Auto-retry');
          }

          // Retry with next best model
          setTimeout(() => {
            const retryMessage = 'Dokonči předchozí odpověď. Vrať kompletní SEARCH/REPLACE blok s uzavírajícími ```.';
            this.sendMessage(retryMessage, true); // isAutoRetry = true
          }, 500);
          return;
        }

        // Reset retry flag
        this._retryAttempted = false;

        // Přidej tlačítko "Zkusit znovu" do chatu
        this.addRetryButton(message, errorType);

        return;
      }

      // Check if this is modification of existing code (has history and code)
      const isModification = this.chatHistory.length > 3 && currentCode.trim().length > 100;

      // Add assistant message with formatted code (fallback for full code)
      this.addChatMessageWithCode('assistant', response, message, isModification);

      // Zobraz token usage pokud je k dispozici
      if (this.lastTokenUsage) {
        const { tokensIn, tokensOut, duration, provider, model } = this.lastTokenUsage;
        const total = tokensIn + tokensOut;
        this.addChatMessage('system',
          `📊 Použito ${total.toLocaleString()} tokenů (${tokensIn.toLocaleString()}→${tokensOut.toLocaleString()}) • ${duration}ms • ${provider}/${model}`
        );
        this.lastTokenUsage = null; // Reset
      }
    } catch (error) {
      // Odstranit loading animaci při chybě
      const loadingElement = document.getElementById(loadingId);
      if (loadingElement) loadingElement.remove();
      let errorMsg = error.message;
      let showRetry = false;

      // 📱 Lepší chybové zprávy pro mobilní zařízení
      if (error.message.includes('API key')) {
        errorMsg = 'Chybí API klíč. Nastavte klíč v ai_module.js nebo použijte demo klíče.';
      } else if (error.message.toLowerCase().includes('overload') ||
                 error.message.includes('503') ||
                 error.message.includes('502')) {
        errorMsg = '⚡ AI server je momentálně přetížen. Zkuste to prosím za chvíli nebo použijte jiný model.';
        showRetry = true;
      } else if (error.message.includes('timeout') ||
                 error.message.includes('Timeout') ||
                 error.message.includes('zrušen')) {
        errorMsg = '⏱️ Požadavek vypršel. Zkontrolujte připojení k internetu a zkuste znovu.';
        showRetry = true;
      } else if (error.message.includes('network') ||
                 error.message.includes('Network') ||
                 error.message.includes('Failed to fetch')) {
        errorMsg = '📡 Problém s připojením. Zkontrolujte internet a zkuste znovu.';
        showRetry = true;
      } else if (error.message.includes('Všechny providery vyčerpány') ||
                 error.message.includes('Všichni poskytovatelé')) {
        errorMsg = '😔 Všechny AI modely jsou momentálně nedostupné. Zkuste to za pár minut.';
        showRetry = true;
      }

      this.addChatMessage('system', `❌ Chyba: ${errorMsg}`);

      // Přidat tlačítko Zkusit znovu pro mobilní uživatele
      if (showRetry) {
        this.addRetryButton(message, 'server_error');
      }

      console.error('AI Error:', error);
    } finally {
      this.isProcessing = false; // Always reset processing flag

      // Hide cancel button
      const cancelBtn = this.modal.element.querySelector('.ai-cancel-btn');
      if (cancelBtn) {
        cancelBtn.style.display = 'none';
      }
    }
  }

  /**
   * Cancel current AI request
   */
  cancelRequest() {
    console.log('❌ Uživatel zrušil AI request');

    // Reset processing flag
    this.isProcessing = false;

    // Hide cancel button
    const cancelBtn = this.modal.element.querySelector('.ai-cancel-btn');
    if (cancelBtn) {
      cancelBtn.style.display = 'none';
    }

    // Remove loading animations
    const loadingElements = this.modal.element.querySelectorAll('.ai-message.loading');
    loadingElements.forEach(el => el.remove());

    // Add cancellation message
    this.addChatMessage('system', '❌ Operace zrušena uživatelem');

    toast.warning('Operace zrušena', 2000);
  }

  /**
   * Detects request type and returns appropriate loading text
   * @param {string} message - User's request
   * @param {string} currentCode - Current editor code
   * @returns {string} Context-aware loading message
   */
  getLoadingTextForRequest(message, currentCode = '') {
    const msg = message.toLowerCase();
    const hasCode = currentCode && currentCode.trim().length > 100;

    // Popis / vysvětlení
    if (msg.match(/popi[šs]|popis|vysv[ěe]tli|co d[ěe]l[áa]|jak funguje/)) {
      return 'AI analyzuje a popisuje stránku...';
    }

    // Analýza
    if (msg.match(/analyzuj|analýza|zkontroluj|review/)) {
      return 'AI analyzuje kód a hledá problémy...';
    }

    // Optimalizace
    if (msg.match(/optimalizuj|zrychli|zlepši|optimiz/)) {
      return 'AI hledá možnosti optimalizace...';
    }

    // Oprava chyb
    if (msg.match(/oprav|fix|bug|chyba|nefunguje/)) {
      return 'AI hledá a opravuje chyby...';
    }

    // Přidání funkce
    if (msg.match(/přidej|přidat|vytvoř|vytvořit|add/) && hasCode) {
      return 'AI přemýšlí a rozšiřuje kód...';
    }

    // Nový projekt/stránka
    if (msg.match(/nový|nová|vytvoř|create|new/) && !hasCode) {
      return 'AI přemýšlí a vytváří projekt...';
    }

    // Úprava existujícího
    if (msg.match(/uprav|změň|modify|update/) && hasCode) {
      return 'AI přemýšlí a upravuje kód...';
    }

    // Refaktoring
    if (msg.match(/refaktor|přepiš|rewrite|reorganizuj/)) {
      return 'AI refaktoruje kód...';
    }

    // Dokumentace
    if (msg.match(/dokumentuj|komentář|comment|doc/)) {
      return 'AI generuje dokumentaci...';
    }

    // Testy
    if (msg.match(/test|otestuj/)) {
      return 'AI vytváří testy...';
    }

    // Default podle kontextu
    if (hasCode) {
      return 'AI přemýšlí a upravuje kód...';
    } else {
      return 'AI přemýšlí a generuje kód...';
    }
  }

  /**
   * Analyzuj kvalitu aplikovaných změn
   */
  analyzeEditQuality(edits, result) {
    let fuzzyCount = 0;
    let semiCount = 0;
    let exactCount = 0;

    // Parsuj výsledek pro info o match typech
    if (result.message) {
      const fuzzyMatches = result.message.match(/fuzzy/gi);
      const semiMatches = result.message.match(/normalized|semi/gi);

      fuzzyCount = fuzzyMatches ? fuzzyMatches.length : 0;
      semiCount = semiMatches ? semiMatches.length : 0;
      exactCount = edits.length - fuzzyCount - semiCount;
    }

    // Varování pokud je příliš mnoho fuzzy
    if (fuzzyCount > edits.length / 2) {
      return {
        warning: true,
        message: `⚠️ ${fuzzyCount}/${edits.length} změn použilo FUZZY matching - zkontroluj výsledek!`,
        fuzzyCount,
        semiCount,
        exactCount
      };
    }

    // Info pokud některé použily semi-strict
    if (semiCount > 0 && fuzzyCount === 0) {
      return {
        warning: false,
        message: `✅ Aplikováno ${edits.length} změn (odsazení normalizováno)`,
        fuzzyCount,
        semiCount,
        exactCount
      };
    }

    return {
      warning: false,
      message: `✅ Aplikováno ${edits.length} změn`,
      fuzzyCount,
      semiCount,
      exactCount
    };
  }

  addChatMessage(role, content, messageId = null) {
    return this.uiRenderingService.addChatMessage(role, content, messageId);
  }

  /**
   * Add retry button to chat after failed SEARCH/REPLACE parsing
   */
  addRetryButton(originalMessage, errorType) {
    const retryContainer = document.createElement('div');
    retryContainer.className = 'chat-retry-container';
    retryContainer.style.cssText = 'display: flex; gap: 8px; margin: 8px 0; flex-wrap: wrap;';

    // Retry with same model
    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn-retry';
    retryBtn.style.cssText = 'padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px;';
    retryBtn.innerHTML = '🔄 Zkusit znovu';
    retryBtn.onclick = () => {
      retryContainer.remove();
      // Different message based on error type
      let retryMessage;
      if (errorType === 'incomplete') {
        retryMessage = 'Dokonči předchozí odpověď. Vrať kompletní SEARCH/REPLACE blok s uzavírajícími ```.';
      } else if (errorType === 'syntax_error') {
        retryMessage = 'Předchozí oprava vytvořila syntaktickou chybu. Zkus to jinak - oprav POUZE problematický řádek, nic víc.';
      } else {
        retryMessage = `${originalMessage}\n\n⚠️ DŮLEŽITÉ: Použij PŘESNÝ kód z editoru, žádné zkratky!`;
      }
      this.sendMessage(retryMessage);
    };

    // Retry with different model - use ModelSelector to find next best
    const retryOtherBtn = document.createElement('button');
    retryOtherBtn.className = 'btn-retry-other';
    retryOtherBtn.style.cssText = 'padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px;';
    retryOtherBtn.innerHTML = '🔀 Zkusit jiný model';
    retryOtherBtn.onclick = async () => {
      retryContainer.remove();

      // Get current model to skip it
      const currentModel = this.providerService?.currentModel || '';
      const currentProvider = this.providerService?.currentProvider || '';

      // Find next best model using ModelSelector
      let nextModel = null;
      if (window.AI && window.AI._modelSelector) {
        const selector = window.AI._modelSelector;
        // Mark current model as temporarily unavailable
        if (currentProvider && currentModel) {
          selector.recordLimitHit(currentProvider, currentModel.split('/').pop(), 'retry', 'User requested different model');
        }
        // Get next best
        nextModel = selector.selectBestCodingModel();
      }

      if (nextModel) {
        // Temporarily force the new model
        const originalAutoAI = this.autoAIEnabled;
        this.autoAIEnabled = false;
        const originalModel = this.providerService?.currentModel;
        const originalProvider = this.providerService?.currentProvider;

        if (this.providerService) {
          this.providerService.currentModel = `${nextModel.provider}/${nextModel.model}`;
          this.providerService.currentProvider = nextModel.provider;
        }

        toast.info(`🔀 Zkouším s ${nextModel.provider}/${nextModel.model}`, 2000);

        try {
          const retryMessage = `${originalMessage}\n\n⚠️ DŮLEŽITÉ: Použij PŘESNÝ kód z editoru včetně odsazení!`;
          await this.sendMessage(retryMessage);
        } finally {
          // Restore original settings
          this.autoAIEnabled = originalAutoAI;
          if (this.providerService) {
            if (originalModel) this.providerService.currentModel = originalModel;
            if (originalProvider) this.providerService.currentProvider = originalProvider;
          }
        }
      } else {
        toast.error('❌ Žádný jiný model není dostupný', 3000);
      }
    };

    retryContainer.appendChild(retryBtn);
    retryContainer.appendChild(retryOtherBtn);

    // Add to chat
    const chatBody = this.modal?.element?.querySelector('.ai-chat-body');
    if (chatBody) {
      chatBody.appendChild(retryContainer);
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }

  /**
   * Create a preview of content for collapsible summary
   */
  createContentPreview(content) {
    return this.uiRenderingService.createContentPreview(content);
  }

  addChatMessageWithCode(role, content, originalMessage = '', isModification = false, codeStatus = {}) {
    return this.uiRenderingService.addChatMessageWithCode(role, content, originalMessage, isModification, codeStatus);
  }

  acceptChange(changeId, actionsContainer) {
    const change = this.pendingChanges.get(changeId);
    if (!change) return;

    // Clear countdown if exists
    if (change.countdownInterval) {
      clearInterval(change.countdownInterval);
    }

    // Always update current editor (don't create new files)
    this.insertCodeToEditor(change.code, change.fullResponse || '');

    // Update UI
    actionsContainer.innerHTML = `
      <span class="change-status accepted">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
        </svg>
        Změna potvrzena
      </span>
    `;
    actionsContainer.dataset.accepted = 'true';

    // Mark code block as accepted in chatHistory (use index as key)
    const codeIndex = actionsContainer.dataset.codeIndex;
    const lastMsg = this.chatHistory[this.chatHistory.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      if (!lastMsg.codeStatus) lastMsg.codeStatus = {};
      lastMsg.codeStatus[`code-${codeIndex}`] = 'accepted';
    }

    // Remove from pending
    this.pendingChanges.delete(changeId);
  }

  rejectChange(changeId, actionsContainer) {
    const change = this.pendingChanges.get(changeId);
    if (!change) return;

    // Clear countdown
    if (change.countdownInterval) {
      clearInterval(change.countdownInterval);
    }

    // Restore original code if it was modified
    if (this.originalCode) {
      state.set('editor.code', this.originalCode);
      eventBus.emit('editor:setCode', { code: this.originalCode });
    }

    // Update UI
    actionsContainer.innerHTML = `
      <span class="change-status rejected">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
        </svg>
        Změna zamítnuta
      </span>
    `;
    actionsContainer.dataset.rejected = 'true';

    // Mark code block as rejected in chatHistory (use index as key)
    const codeIndex = actionsContainer.dataset.codeIndex;
    const lastMsg = this.chatHistory[this.chatHistory.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      if (!lastMsg.codeStatus) lastMsg.codeStatus = {};
      lastMsg.codeStatus[`code-${codeIndex}`] = 'rejected';
    }

    // Remove from pending
    this.pendingChanges.delete(changeId);
  }

  detectNewProject(userMessage, code) {
    // Keywords that indicate user wants a new project
    const newProjectKeywords = ['udělej', 'vytvoř', 'vygeneruj', 'nový', 'kalkulačk', 'formulář', 'stránk', 'web', 'app'];
    const messageLower = userMessage.toLowerCase();

    // Check if message contains new project keywords
    const hasKeyword = newProjectKeywords.some(kw => messageLower.includes(kw));

    // Check if code is a complete HTML document
    const isCompleteDoc = code.includes('<!DOCTYPE') && code.includes('<html') && code.includes('</html>');

    return hasKeyword && isCompleteDoc;
  }

  createNewFileWithCode(code) {
    // Create new file via event
    eventBus.emit('file:createWithCode', { code });
  }

  /**
   * Meta-prompt for AI to determine which prompt(s) to use
   * Used when user request is ambiguous or complex
   *
   * @param {string} userMessage - User's request
   * @param {number} codeLength - Current code length
   * @param {number} lineCount - Current code line count
   * @returns {string} Meta-prompt text
   */
  getPromptSelectionMetaPrompt(userMessage, codeLength, lineCount) {
    return this.templatesService.getPromptSelectionMetaPrompt(userMessage, codeLength, lineCount);
  }

  /**
   * Intelligent prompt selection based on context and user intent
   * Analyzes user message and code state to select optimal prompt
   *
   * @param {string} userMessage - User's request
   * @param {boolean} hasCode - Whether editor has code
   * @param {boolean} hasHistory - Whether editor has change history
   * @param {string} currentCode - Current editor code
   * @returns {string} Selected prompt text
   */
  selectPromptByContext(userMessage, hasCode, hasHistory, currentCode) {
    return this.templatesService.selectPromptByContext(userMessage, hasCode, hasHistory, currentCode);
  }

  /**
   * Parse SEARCH/REPLACE instructions from AI response (VS Code style - PREFERRED)
   * More reliable than line numbers - finds code by content
   *
   * Format:
   * ```SEARCH
   * <exact code to find>
   * ```
   * ```REPLACE
   * <new code to replace with>
   * ```
   *
   * @param {string} response - AI response text
   * @returns {Array} Array of {searchCode, replaceCode, type: 'search-replace'} objects
   */
  parseSearchReplaceInstructions(response) {
    return this.codeEditorService.parseSearchReplaceInstructions(response);
  }

  /**
   * Apply line-based edits to current editor code
   * Validates OLD code matches before applying NEW code
   * Sorts edits in reverse order to prevent line number shifts
   *
   * @param {Array} edits - Array of {startLine, endLine, oldCode, newCode}
   * @returns {boolean} True if at least one edit was applied
   */

  /**
   * Show confirmation dialog for code changes
   */
  async showChangeConfirmation(editInstructions) {
    console.log(`💬 Zobrazuji confirmation dialog pro ${editInstructions.length} změn`);

    const messagesContainer = this.modal.element.querySelector('#aiChatMessages');

    // Remove any existing confirmation dialogs first (from previous attempts)
    const existingConfirmations = messagesContainer.querySelectorAll('.ai-confirmation-dialog');
    existingConfirmations.forEach(el => el.remove());
    console.log(`🧹 Odstraněno ${existingConfirmations.length} starých confirmation dialogů`);

    // Create confirmation UI
    const confirmationEl = document.createElement('div');
    confirmationEl.className = 'ai-message assistant ai-confirmation-dialog'; // Added class for cleanup
    confirmationEl.innerHTML = `
      <strong>🔍 Náhled navrhovaných změn (${editInstructions.length})</strong>
      <div style="margin-top: 10px; max-height: 400px; overflow-y: auto;">
        ${editInstructions.map((e, i) => {
          if (e.type === 'search-replace') {
            return `
              <div style="margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                <div style="font-weight: bold; margin-bottom: 5px;">
                  ${i + 1}. SEARCH/REPLACE (VS Code style)
                </div>
                <div style="margin: 5px 0; color: #3b82f6;">
                  <strong>🔍 Hledám:</strong>
                  <pre style="background: rgba(59,130,246,0.1); padding: 8px; border-radius: 4px; margin: 5px 0; overflow-x: auto; font-size: 0.85em;">${this.escapeHtml(e.searchCode.substring(0, 200))}${e.searchCode.length > 200 ? '...' : ''}</pre>
                </div>
                <div style="margin: 5px 0; color: #10b981;">
                  <strong>✅ Nahradím:</strong>
                  <pre style="background: rgba(16,185,129,0.1); padding: 8px; border-radius: 4px; margin: 5px 0; overflow-x: auto; font-size: 0.85em;">${this.escapeHtml(e.replaceCode.substring(0, 200))}${e.replaceCode.length > 200 ? '...' : ''}</pre>
                </div>
              </div>
            `;
          }
          return `
            <div style="margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px;">
              <div style="font-weight: bold; margin-bottom: 5px;">
                ${i + 1}. Řádky ${e.startLine}-${e.endLine}
              </div>
              <div style="margin: 5px 0; color: #ef4444;">
                <strong>❌ Původní:</strong>
                <pre style="background: rgba(239,68,68,0.1); padding: 8px; border-radius: 4px; margin: 5px 0; overflow-x: auto; font-size: 0.85em;">${this.escapeHtml(e.oldCode.substring(0, 200))}${e.oldCode.length > 200 ? '...' : ''}</pre>
              </div>
              <div style="margin: 5px 0; color: #10b981;">
                <strong>✅ Nový:</strong>
                <pre style="background: rgba(16,185,129,0.1); padding: 8px; border-radius: 4px; margin: 5px 0; overflow-x: auto; font-size: 0.85em;">${this.escapeHtml(e.newCode.substring(0, 200))}${e.newCode.length > 200 ? '...' : ''}</pre>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="margin-top: 15px; display: flex; gap: 10px;">
        <button class="confirm-changes-btn" style="flex: 1; padding: 14px; background: #10b981; color: white; border: 2px solid #059669; border-radius: 8px; cursor: pointer; font-size: 1.1em; font-weight: 700; box-shadow: 0 4px 6px rgba(16,185,129,0.4); transition: all 0.2s;">
          ✅ Potvrdit a aplikovat
        </button>
        <button class="reject-changes-btn" style="flex: 1; padding: 14px; background: #ef4444; color: white; border: 2px solid #dc2626; border-radius: 8px; cursor: pointer; font-size: 1.1em; font-weight: 700; box-shadow: 0 4px 6px rgba(239,68,68,0.4); transition: all 0.2s;">
          ❌ Zamítnout
        </button>
      </div>
    `;

    messagesContainer.appendChild(confirmationEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Wait for user decision
    return new Promise((resolve) => {
      const confirmBtn = confirmationEl.querySelector('.confirm-changes-btn');
      const rejectBtn = confirmationEl.querySelector('.reject-changes-btn');

      confirmBtn.addEventListener('click', async () => {
        console.log('✅ Uživatel potvrdil změny');
        confirmationEl.remove();

        // Apply changes - detect format type
        let applied;
        if (editInstructions.length > 0 && editInstructions[0].type === 'search-replace') {
          // SEARCH/REPLACE format (VS Code style)
          applied = this.applySearchReplaceEdits(editInstructions);
        } else {
          // EDIT:LINES format (legacy)
          applied = this.applyLineEdits(editInstructions);
        }

        if (applied) {
          const summary = editInstructions.map((e, i) => {
            if (e.type === 'search-replace') {
              return `${i + 1}. SEARCH/REPLACE: ✅`;
            } else {
              return `${i + 1}. Řádky ${e.startLine}-${e.endLine}: ✅`;
            }
          }).join('\n');

          this.addChatMessage('assistant', `✅ Změny aplikovány (${editInstructions.length}x):\n\n${summary}`);
          toast.success(`✅ Aplikováno ${editInstructions.length} změn`, 3000);
        } else {
          toast.error('⚠️ Některé změny selhaly - viz konzole', 5000);
        }
        resolve();
      });

      rejectBtn.addEventListener('click', () => {
        console.log('❌ Uživatel zamítl změny');
        confirmationEl.remove();
        this.addChatMessage('assistant', '❌ Změny zamítnuty uživatelem.\n\nMůžete zadat nový požadavek.');
        resolve();
      });
    });
  }

  applyLineEdits(edits) {
    return this.codeEditorService.applyLineEdits(edits);
  }

  /**
   * Apply SEARCH/REPLACE edits (VS Code style)
   * @param {Array} edits - Array of {searchCode, replaceCode, type: 'search-replace'}
   * @returns {boolean} - True if all edits applied successfully
   */
  applySearchReplaceEdits(edits) {
    return this.codeEditorService.applySearchReplaceEdits(edits);
  }

  // Note: fuzzySearchCode, findSimilarCode, countOccurrences, detectEditConflicts
  // are used internally by CodeEditorService - no need for wrappers here

  insertCodeToEditor(code, fullResponse = '') {
    return this.codeEditorService.insertCodeToEditor(code, fullResponse);
  }

  removeChatMessage(messageId) {
    const message = this.modal.element.querySelector(`#${messageId}`);
    if (message) {
      message.remove();
    }
  }

  escapeHtml(text) {
    return this.uiRenderingService.escapeHtml(text);
  }

  unescapeHtml(text) {
    const div = document.createElement('div');
    div.innerHTML = text;
    return div.textContent;
  }

  /**
   * Create action bar HTML with undo/redo buttons
   * @param {string} originalCode - Original code before changes
   * @param {string} newCode - New code after changes
   * @returns {string} - HTML string for action bar
   */
  createActionBarHTML(originalCode, newCode) {
    // Escape HTML pro bezpečné vložení do data atributů
    const originalCodeEncoded = encodeURIComponent(originalCode);
    const newCodeEncoded = encodeURIComponent(newCode);

    return `
<div class="code-action-bar" data-original="${originalCodeEncoded}" data-new="${newCodeEncoded}">
  <div class="action-bar-content">
    <span class="action-bar-label">Změny aplikovány</span>
    <div class="action-bar-buttons">
      <button class="action-btn undo-btn" onclick="window.aiPanel.undoCodeChange(this)">
        <span class="btn-icon">↶</span>
        <span class="btn-text">Vrátit zpět</span>
      </button>
      <button class="action-btn keep-btn" onclick="window.aiPanel.keepCodeChange(this)">
        <span class="btn-icon">✓</span>
        <span class="btn-text">Zachovat</span>
      </button>
    </div>
  </div>
</div>`;
  }

  /**
   * Undo code change from action bar button
   */
  undoCodeChange(button) {
    const actionBar = button.closest('.code-action-bar');
    const originalCode = decodeURIComponent(actionBar.dataset.original);

    eventBus.emit('editor:setCode', { code: originalCode });
    actionBar.innerHTML = '<div class="action-bar-result undo">↶ Změny vráceny zpět</div>';
    toast.show('↶ Změny vráceny zpět', 'info');
  }

  /**
   * Keep code change from action bar button
   */
  keepCodeChange(button) {
    const actionBar = button.closest('.code-action-bar');
    actionBar.innerHTML = '<div class="action-bar-result keep">✓ Změny zachovány</div>';
    toast.show('✓ Změny zachovány', 'success');

    // Zavřít AI panel po potvrzení
    setTimeout(() => {
      const aiPanel = document.getElementById('aiPanel');
      if (aiPanel && aiPanel.classList.contains('active')) {
        aiPanel.classList.remove('active');
      }
    }, 800);
  }

  /**
   * Calculate similarity between two strings (0-1)
   * Uses Levenshtein distance ratio
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  generateProviderOptions() {
    // Delegováno na ProviderService
    return this.providerService.generateProviderOptions();
  }

  updateModels(provider) {
    // Delegováno na ProviderService
    this.providerService.updateModels(provider);
  }

  toggleModelFavorite(provider, modelValue) {
    // Delegováno na ProviderService
    this.providerService.toggleModelFavorite(provider, modelValue);
  }

  /**
   * Update Auto AI state - enable/disable provider and model selects
   */
  updateAutoAIState() {
    // Delegováno na ProviderService
    this.providerService.updateAutoAIState();
  }

  // ================================================================
  // NOTE: Template and GitHub wrapper methods have been removed.
  // Access services directly:
  // - Templates: this.templatesService.getBlankTemplate(), etc.
  // - GitHub: this.githubService.handleGitHubAction(), etc.
  // - Agents: this.agentsService.toggleAgent(), etc.
  // ================================================================

  async sendToOrchestrator(message) {
    // Race condition protection (same as sendMessage)
    if (this.isProcessing) {
      toast.warning('⏳ Čekám na dokončení předchozího požadavku...', 2000);
      return;
    }

    this.isProcessing = true;

    // Zobraz uživateli v jakém režimu tým pracuje
    const isNewProjectMode = this.workMode === 'new-project';
    const modeLabel = isNewProjectMode
      ? '🆕 [Tým - Nový projekt]'
      : '🔧 [Tým - Úprava]';

    // Add user message to chat
    this.addChatMessage('user', `🎭 ${modeLabel} ${message}`);

    // Add to history
    this.chatService.addToHistory('user', message);
    this.chatHistory = this.chatService.getHistory();

    // Show loading animation
    const loadingId = 'orchestrator-loading-' + Date.now();
    const messagesContainer = this.modal.element.querySelector('#aiChatMessages');
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'ai-message assistant loading';
    loadingMsg.id = loadingId;
    loadingMsg.innerHTML = `
      <div class="ai-thinking" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="thinking-dots">
            <span></span><span></span><span></span>
          </div>
          <p id="orchestrator-status" style="margin: 0;">🎭 Orchestrator koordinuje tým...</p>
        </div>
        <button class="ai-cancel-btn" style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          <span>Zrušit</span>
        </button>
      </div>
    `;
    messagesContainer.appendChild(loadingMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Add cancel handler
    const loadingCancelBtn = loadingMsg.querySelector('.ai-cancel-btn');
    if (loadingCancelBtn) {
      loadingCancelBtn.onclick = () => {
        this.cancelRequest();
      };
    }

    // Status update function
    const updateStatus = (text) => {
      const statusEl = document.getElementById('orchestrator-status');
      if (statusEl) statusEl.textContent = text;
    };

    try {
      // Check if user wants NEW project
      const isNewProjectMode = this.workMode === 'new-project';
      const newProjectPatterns = [
        /vytvoř\s+(nový|novou|nové|mi)/i,
        /create\s+(new|a)/i,
        /nový\s+projekt/i,
        /new\s+project/i,
        /od\s+začátku/i,
        /from\s+scratch/i,
        /udělej\s+mi/i,
        /make\s+me/i,
        /build\s+me/i,
        /nakóduj/i,
        /naprogramuj/i,
        /kalkulačk/i,
        /calculator/i,
        /stránk/i,
        /page/i,
        /web/i,
        /app/i
      ];
      const messageRequestsNewProject = newProjectPatterns.some(p => p.test(message));
      const shouldTreatAsNewProject = isNewProjectMode || messageRequestsNewProject;

      // Zobraz uživateli v jakém režimu orchestrator pracuje
      const modeInfo = shouldTreatAsNewProject
        ? '🆕 Tým vytváří NOVÝ projekt od začátku...'
        : '🔧 Tým upravuje existující kód...';
      updateStatus(modeInfo);

      console.log(`[AIPanel] Orchestrator - workMode: ${this.workMode}, shouldTreatAsNewProject: ${shouldTreatAsNewProject}`);

      // Získej seznam modelů seřazených podle kvality (pro fallback)
      const sortedModels = window.AI.getAllModelsSorted ? window.AI.getAllModelsSorted() : [];
      let modelIndex = 0;

      // Get initial provider and model
      let provider = this.modal.element.querySelector('#aiProvider')?.value;
      let model = this.modal.element.querySelector('#aiModel')?.value;
      const autoAI = this.modal.element.querySelector('#autoAI')?.checked;

      if (autoAI || !model || model === 'null' || model === '') {
        // Auto mode - použij nejlepší model
        if (sortedModels.length > 0) {
          provider = sortedModels[0].provider;
          model = sortedModels[0].model;
        } else {
          const bestModel = window.AI.selectBestModel();
          provider = bestModel.provider;
          model = bestModel.model;
        }
      } else {
        const modelSelect = this.modal.element.querySelector('#aiModel');
        const selectedOption = modelSelect?.options[modelSelect.selectedIndex];
        const modelProvider = selectedOption?.dataset?.provider;
        if (modelProvider) provider = modelProvider;
      }

      console.log(`🎭 [Tým] Model: ${provider}/${model}`);

      let finalCode = '';
      let lastError = null;
      // Max 5 pokusů, ale minimálně 1 (i když sortedModels je prázdné)
      const maxRetries = Math.max(1, Math.min(sortedModels.length, 5));

      // Pomocná funkce pro volání AI s retry logikou
      const callAIWithFallback = async (prompt, options = {}) => {
        let currentProvider = provider;
        let currentModel = model;
        let attempts = 0;

        // Pokud nemáme provider/model, selži hned
        if (!currentProvider || !currentModel) {
          throw new Error('Není vybrán žádný AI model. Zkontrolujte nastavení API klíčů.');
        }

        while (attempts < maxRetries) {
          try {
            updateStatus(`🤖 ${currentProvider}/${currentModel}...`);
            console.log(`🎭 [Tým] Pokus ${attempts + 1}: ${currentProvider}/${currentModel}`);

            const response = await window.AI.ask(prompt, {
              provider: currentProvider,
              model: currentModel,
              ...options
            });

            // Kontrola, že odpověď obsahuje kód
            if (response && response.length > 100) {
              return { response, provider: currentProvider, model: currentModel };
            }

            throw new Error('Prázdná nebo příliš krátká odpověď');

          } catch (error) {
            console.warn(`🎭 [Tým] Model ${currentProvider}/${currentModel} selhal:`, error.message);
            lastError = error;
            attempts++;

            // Zkus další model v pořadí
            if (attempts < maxRetries && sortedModels.length > attempts) {
              const nextModel = sortedModels[attempts];
              currentProvider = nextModel.provider;
              currentModel = nextModel.model;
              updateStatus(`🔄 Zkouším ${currentProvider}/${currentModel}...`);

              // Krátká pauza před dalším pokusem
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }

        throw lastError || new Error('Všechny modely selhaly');
      };

      if (shouldTreatAsNewProject) {
        // ===== MULTI-AGENT WORKFLOW PRO NOVÝ PROJEKT =====
        // Každý agent má specializaci a výsledky se kombinují

        // ───────────────────────────────────────────────────
        // FÁZE 1: ARCHITEKT - Plánuje strukturu a komponenty
        // ───────────────────────────────────────────────────
        updateStatus('🏗️ Architekt plánuje strukturu...');

        const architectPrompt = `Jsi SOFTWAROVÝ ARCHITEKT. Naplánuj strukturu aplikace.

ZADÁNÍ: ${message}

Vytvoř detailní specifikaci:

1. KOMPONENTY UI:
   - Jaké HTML elementy jsou potřeba
   - Jejich hierarchie a vztahy
   - ID a class názvy

2. DATOVÝ MODEL:
   - Jaké proměnné budou potřeba
   - Jejich typy a účel
   - Stav aplikace

3. FUNKCE:
   - Seznam všech funkcí
   - Co každá dělá
   - Jak spolu komunikují

4. EVENTS:
   - Jaké události zachytávat
   - Na jakých elementech

Odpověz POUZE strukturovaným plánem, žádný kód.`;

        const architectResult = await callAIWithFallback(architectPrompt, {
          temperature: 0.3, maxTokens: 2048
        });
        const architectPlan = architectResult.response;
        console.log('🏗️ Architekt hotov:', architectPlan.substring(0, 200));

        // ───────────────────────────────────────────────────
        // FÁZE 2: DESIGNER - Vytváří CSS design
        // ───────────────────────────────────────────────────
        updateStatus('🎨 Designer tvoří vzhled...');

        const designerPrompt = `Jsi UI/UX DESIGNER. Vytvoř KOMPLETNÍ CSS pro aplikaci.

ZADÁNÍ: ${message}
PLÁN ARCHITEKTA:
${architectPlan}

═══════════════════════════════════════════════════════════
POKUD JE TO KALKULAČKA - POUŽIJ TOTO CSS:
═══════════════════════════════════════════════════════════

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}
.calculator {
    background: #1f1f1f;
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    width: 320px;
}
.display {
    background: #2d2d2d;
    color: #fff;
    font-size: 2.5rem;
    text-align: right;
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 20px;
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    overflow: hidden;
    word-break: break-all;
}
.buttons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
}
.btn {
    padding: 20px;
    font-size: 1.5rem;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
}
.btn.number {
    background: #3d3d3d;
    color: #fff;
}
.btn.number:hover { background: #4d4d4d; }
.btn.operator {
    background: #ff9500;
    color: #fff;
}
.btn.operator:hover { background: #ffaa33; }
.btn.clear {
    background: #ff3b30;
    color: #fff;
}
.btn.clear:hover { background: #ff5c54; }
.btn.equals {
    background: #34c759;
    color: #fff;
    grid-column: span 2;
}
.btn.equals:hover { background: #4cd964; }
.btn.zero { grid-column: span 1; }
.btn:active { transform: scale(0.95); }

═══════════════════════════════════════════════════════════
PRO JINÉ APLIKACE - VYTVOŘ VLASTNÍ CSS S:
═══════════════════════════════════════════════════════════

- Reset: * { box-sizing: border-box; margin: 0; padding: 0; }
- Moderní design: gradienty, stíny, zaoblení
- Flexbox/Grid layout
- Responzivní design
- Hover efekty
- Animace/transitions

POUZE CSS kód:
\`\`\`css
/* Kompletní CSS */
\`\`\``;

        const designerResult = await callAIWithFallback(designerPrompt, {
          temperature: 0.4, maxTokens: 4096
        });
        const designerResponse = designerResult.response;

        // Extrahuj CSS
        let cssCode = '';
        const cssMatch = designerResponse.match(/```css\n?([\s\S]*?)```/);
        if (cssMatch) {
          cssCode = cssMatch[1].trim();
        } else {
          // Fallback - zkus najít <style> obsah
          const styleMatch = designerResponse.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
          if (styleMatch) cssCode = styleMatch[1].trim();
        }
        console.log('🎨 Designer hotov, CSS:', cssCode.length, 'znaků');

        // ───────────────────────────────────────────────────
        // FÁZE 3: DEVELOPER - Píše HTML a JavaScript
        // ───────────────────────────────────────────────────
        updateStatus('💻 Developer píše kód...');

        const developerPrompt = `Jsi SENIOR FULL-STACK DEVELOPER. Napiš KOMPLETNÍ HTML a JavaScript.

ZADÁNÍ: ${message}

PLÁN ARCHITEKTA:
${architectPlan}

CSS JE JIŽ HOTOVÉ (nepiš CSS, jen použij třídy):
${cssCode.substring(0, 1500)}...

═══════════════════════════════════════════════════════════
POKUD JE ZADÁNÍ KALKULAČKA - POUŽIJ PŘESNĚ TOTO:
═══════════════════════════════════════════════════════════

HTML STRUKTURA (přesně takto):
<div class="calculator">
    <div class="display" id="display">0</div>
    <div class="buttons">
        <button class="btn clear" data-action="clear">C</button>
        <button class="btn operator" data-action="backspace">⌫</button>
        <button class="btn operator" data-operator="%">%</button>
        <button class="btn operator" data-operator="/">÷</button>

        <button class="btn number" data-number="7">7</button>
        <button class="btn number" data-number="8">8</button>
        <button class="btn number" data-number="9">9</button>
        <button class="btn operator" data-operator="*">×</button>

        <button class="btn number" data-number="4">4</button>
        <button class="btn number" data-number="5">5</button>
        <button class="btn number" data-number="6">6</button>
        <button class="btn operator" data-operator="-">−</button>

        <button class="btn number" data-number="1">1</button>
        <button class="btn number" data-number="2">2</button>
        <button class="btn number" data-number="3">3</button>
        <button class="btn operator" data-operator="+">+</button>

        <button class="btn number zero" data-number="0">0</button>
        <button class="btn number" data-number=".">.</button>
        <button class="btn equals" data-action="equals">=</button>
    </div>
</div>

JAVASCRIPT (přesně takto):
'use strict';
const display = document.getElementById('display');
let currentValue = '0';
let previousValue = '';
let operator = null;
let shouldResetDisplay = false;

function updateDisplay() {
    display.textContent = currentValue;
}

function appendNumber(num) {
    if (shouldResetDisplay) {
        currentValue = num;
        shouldResetDisplay = false;
    } else {
        if (num === '.' && currentValue.includes('.')) return;
        currentValue = currentValue === '0' && num !== '.' ? num : currentValue + num;
    }
    updateDisplay();
}

function setOperator(op) {
    if (operator !== null) calculate();
    previousValue = currentValue;
    operator = op;
    shouldResetDisplay = true;
}

function calculate() {
    if (operator === null || shouldResetDisplay) return;
    const prev = parseFloat(previousValue);
    const curr = parseFloat(currentValue);
    let result;
    switch (operator) {
        case '+': result = prev + curr; break;
        case '-': result = prev - curr; break;
        case '*': result = prev * curr; break;
        case '/': result = curr !== 0 ? prev / curr : 'Error'; break;
        case '%': result = prev % curr; break;
    }
    currentValue = String(result);
    operator = null;
    shouldResetDisplay = true;
    updateDisplay();
}

function clearDisplay() {
    currentValue = '0';
    previousValue = '';
    operator = null;
    shouldResetDisplay = false;
    updateDisplay();
}

function backspace() {
    currentValue = currentValue.length > 1 ? currentValue.slice(0, -1) : '0';
    updateDisplay();
}

// Event listeners
document.querySelectorAll('[data-number]').forEach(btn => {
    btn.addEventListener('click', () => appendNumber(btn.dataset.number));
});
document.querySelectorAll('[data-operator]').forEach(btn => {
    btn.addEventListener('click', () => setOperator(btn.dataset.operator));
});
document.querySelector('[data-action="clear"]').addEventListener('click', clearDisplay);
document.querySelector('[data-action="backspace"]').addEventListener('click', backspace);
document.querySelector('[data-action="equals"]').addEventListener('click', calculate);

═══════════════════════════════════════════════════════════
PRO JINÉ APLIKACE - OBECNÁ PRAVIDLA:
═══════════════════════════════════════════════════════════

1. 'use strict'; na začátku scriptu
2. KAŽDÁ proměnná POUZE JEDNOU
3. addEventListener MÍSTO onclick atributů
4. KOMPLETNÍ implementace VŠECH funkcí
5. Žádné TODO, placeholder, nebo prázdné funkce

═══════════════════════════════════════════════════════════

Vrať POUZE HTML strukturu a JavaScript:

\`\`\`html
<body>
    <!-- HTML struktura s class názvy z CSS -->

    <script>
        'use strict';

        // Kompletní JavaScript
    </script>
</body>
\`\`\``;

        const developerResult = await callAIWithFallback(developerPrompt, {
          temperature: 0.2, maxTokens: 8192
        });
        const developerResponse = developerResult.response;

        // Extrahuj HTML/JS
        let htmlBody = '';
        const htmlMatch = developerResponse.match(/```html\n?([\s\S]*?)```/);
        if (htmlMatch) {
          htmlBody = htmlMatch[1].trim();
        }
        console.log('💻 Developer hotov, HTML/JS:', htmlBody.length, 'znaků');

        // ───────────────────────────────────────────────────
        // FÁZE 4: INTEGRÁTOR - Sestaví finální kód
        // ───────────────────────────────────────────────────
        updateStatus('🔧 Integrátor sestavuje projekt...');

        // Extrahuj <body> obsah a <script> zvlášť
        let bodyContent = '';
        let scriptContent = '';

        const bodyMatch = htmlBody.match(/<body[^>]*>([\s\S]*?)<script/i);
        if (bodyMatch) {
          bodyContent = bodyMatch[1].trim();
        } else {
          // Zkus najít obsah před <script>
          const beforeScript = htmlBody.split(/<script/i)[0];
          bodyContent = beforeScript.replace(/<\/?body[^>]*>/gi, '').trim();
        }

        const scriptMatch = htmlBody.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        if (scriptMatch) {
          scriptContent = scriptMatch[1].trim();
        }

        // Pokud nemáme body content, použij celý htmlBody
        if (!bodyContent && htmlBody) {
          bodyContent = htmlBody.replace(/<script[\s\S]*<\/script>/gi, '').replace(/<\/?body[^>]*>/gi, '').trim();
        }

        // Sestav finální kód
        finalCode = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${message.substring(0, 50)}</title>
    <style>
${cssCode || `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; min-height: 100vh; display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }`}
    </style>
</head>
<body>
    ${bodyContent || '<div class="container"><p>Chyba při generování</p></div>'}

    <script>
        'use strict';
        ${scriptContent || '// Chyba při generování JavaScriptu'}
    </script>
</body>
</html>`;

        // ───────────────────────────────────────────────────
        // FÁZE 5: REVIEWER - Kontroluje a opravuje chyby
        // ───────────────────────────────────────────────────
        updateStatus('🔍 Reviewer kontroluje kód...');

        // Nejprve lokální opravy
        finalCode = this.fixDuplicateVariables(finalCode);

        // Kontrola základních chyb
        const hasClosingHtml = finalCode.includes('</html>');
        const hasScript = finalCode.includes('<script>') && finalCode.includes('</script>');
        const hasEventListeners = finalCode.includes('addEventListener');

        if (!hasClosingHtml || !hasScript || !hasEventListeners) {
          console.warn('🔍 Reviewer detekoval problémy, opravuji...');

          const reviewerPrompt = `Jsi CODE REVIEWER. Oprav tento kód:

\`\`\`html
${finalCode}
\`\`\`

PROBLÉMY K OPRAVĚ:
${!hasClosingHtml ? '- Chybí </html>' : ''}
${!hasScript ? '- Chybí nebo špatný <script> blok' : ''}
${!hasEventListeners ? '- NEPOUŽÍVÁ addEventListener - OPRAV!' : ''}

Vrať KOMPLETNÍ opravený kód:
\`\`\`html
<!DOCTYPE html>
...kompletní opravený kód...
</html>
\`\`\``;

          try {
            const reviewerResult = await callAIWithFallback(reviewerPrompt, {
              temperature: 0.1, maxTokens: 8192
            });
            const fixedMatch = reviewerResult.response.match(/```html\n?([\s\S]*?)```/);
            if (fixedMatch && fixedMatch[1].includes('</html>')) {
              finalCode = fixedMatch[1].trim();
              finalCode = this.fixDuplicateVariables(finalCode);
            }
          } catch (e) {
            console.warn('Reviewer selhal, použiji původní kód');
          }
        }

        console.log('✅ Multi-agent workflow dokončen');

      } else {
        // ===== ÚPRAVA EXISTUJÍCÍHO KÓDU =====
        let currentCode = state.get('editor.code') || '';
        if (currentCode.length > 15000) {
          currentCode = currentCode.substring(0, 15000) + '\n... (zkráceno) ...';
        }

        updateStatus('🔧 Analyzuji a upravuji kód...');

        const editPrompt = `Uprav existující kód podle požadavku: "${message}"

AKTUÁLNÍ KÓD:
\`\`\`html
${currentCode}
\`\`\`

Použij SEARCH/REPLACE bloky pro úpravy:
\`\`\`SEARCH
[přesná kopie části kódu k nahrazení]
\`\`\`
\`\`\`REPLACE
[nový kód]
\`\`\``;

        const editResult = await callAIWithFallback(editPrompt, {
          temperature: 0.3, maxTokens: 8192
        });
        const response = editResult.response;

        // Zkontroluj SEARCH/REPLACE
        const searchReplaceEdits = this.parseSearchReplaceInstructions(response);

        if (searchReplaceEdits.length > 0) {
          const loadingEl = document.getElementById(loadingId);
          if (loadingEl) loadingEl.remove();

          const descMatch = response.match(/([\s\S]*?)```\s*SEARCH/);
          const description = descMatch ? descMatch[1].trim() : '✅ Změny připraveny.';

          this.addChatMessage('ai', description);
          this.chatService.addToHistory('assistant', description);
          this.chatHistory = this.chatService.getHistory();
          this.chatHistoryService.updateHistoryInfo();

          await this.showChangeConfirmation(searchReplaceEdits);
          this.isProcessing = false;
          return;
        }

        // Fallback - zkus najít kompletní kód
        const codeMatch = response.match(/```(?:html)?\n?([\s\S]*?)```/);
        if (codeMatch) {
          finalCode = codeMatch[1].trim();
        } else {
          const loadingEl = document.getElementById(loadingId);
          if (loadingEl) loadingEl.remove();
          this.addChatMessage('ai', response);
          this.chatService.addToHistory('assistant', response);
          this.chatHistory = this.chatService.getHistory();
          this.chatHistoryService.updateHistoryInfo();
          this.isProcessing = false;
          return;
        }
      }

      // Remove loading
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) loadingEl.remove();

      // Validace a vložení kódu
      if (finalCode && finalCode.length > 100) {
        this.addChatMessage('ai', '✅ Tým dokončil práci! Kód vložen do editoru.');
        this.chatService.addToHistory('assistant', '✅ Projekt vytvořen týmem agentů.');
        this.chatHistory = this.chatService.getHistory();

        this.insertCodeToEditor(finalCode, false);

        eventBus.emit('toast:show', {
          message: '✅ Tým vytvořil projekt!',
          type: 'success',
          duration: 3000
        });
      } else {
        this.addChatMessage('ai', '❌ Nepodařilo se vygenerovat kód. Zkuste to znovu nebo použijte jiný model.');
      }

      this.chatHistoryService.updateHistoryInfo();

    } catch (error) {
      console.error('Orchestrator error:', error);
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) loadingEl.remove();
      this.addChatMessage('ai', `❌ Chyba: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Opraví duplicitní deklarace proměnných v JavaScript kódu
   */
  fixDuplicateVariables(code) {
    try {
      // Najdi <script> sekci
      const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      if (!scriptMatch) return code;

      let jsCode = scriptMatch[1];
      const declaredVars = new Map(); // varName -> count

      // Najdi všechny deklarace let/const
      const varPattern = /\b(let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
      let match;

      while ((match = varPattern.exec(jsCode)) !== null) {
        const varName = match[2];
        declaredVars.set(varName, (declaredVars.get(varName) || 0) + 1);
      }

      // Oprav duplicity - druhý a další výskyt změň na přiřazení (bez let/const)
      for (const [varName, count] of declaredVars) {
        if (count > 1) {
          console.log(`[AIPanel] Opravuji duplicitní proměnnou: ${varName} (${count}x)`);
          let occurrences = 0;
          // Escape speciálních znaků v názvu proměnné pro regex
          const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          jsCode = jsCode.replace(
            new RegExp(`\\b(let|const)\\s+${escapedVarName}\\s*=`, 'g'),
            (match) => {
              occurrences++;
              // První výskyt necháme, další změníme na přiřazení
              return occurrences === 1 ? match : `${varName} =`;
            }
          );
        }
      }

      // Nahraď opravenou JS sekci v kódu
      return code.replace(/<script[^>]*>[\s\S]*?<\/script>/i,
        `<script>${jsCode}</script>`);

    } catch (e) {
      console.error('[AIPanel] Chyba při opravě duplicitních proměnných:', e);
      return code;
    }
  }

  async sendToCurrentAgent(message) {
    if (!this.currentAgent) return;

    const agent = window.AIAgents.getAgent(this.currentAgent);
    const messagesContainer = this.modal.element.querySelector('#agentChatMessages');

    // Add user message to UI
    const userMsg = document.createElement('div');
    userMsg.className = 'agent-message user';
    userMsg.innerHTML = `<strong>Ty:</strong><p>${message}</p>`;
    messagesContainer.appendChild(userMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Show loading
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'agent-message assistant loading';
    loadingMsg.innerHTML = `<strong>${agent.name}:</strong><p>⏳ Pracuji na úkolu...</p>`;
    messagesContainer.appendChild(loadingMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      // Get current code context
      const code = state.get('editor.code') || '';
      const context = { code };

      // Send to agent
      const response = await window.AIAgents.sendToAgent(this.currentAgent, message, context);

      // Remove loading message
      loadingMsg.remove();

      // Add agent response
      const agentMsg = document.createElement('div');
      agentMsg.className = 'agent-message assistant';
      agentMsg.innerHTML = `<strong>${agent.name}:</strong><p>${response.response}</p>`;
      messagesContainer.appendChild(agentMsg);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

    } catch (error) {
      loadingMsg.remove();

      const errorMsg = document.createElement('div');
      errorMsg.className = 'agent-message error';
      errorMsg.innerHTML = `<strong>Chyba:</strong><p>${error.message}</p>`;
      messagesContainer.appendChild(errorMsg);
    }
  }

  async startOrchestratedTask() {
    // Check if orchestrator is active
    const orchestratorAgent = window.AIAgents.getAgent('orchestrator');
    if (!orchestratorAgent || !orchestratorAgent.active) {
      toast.error('Aktivuj Orchestrator agenta pro orchestrovaný režim', 3000);
      return;
    }

    const task = prompt('Zadej úkol pro Orchestrátora (rozdělí ho mezi agenty):');
    if (!task) return;

    const messagesContainer = this.modal.element.querySelector('#agentChatMessages');
    const chatSection = this.modal.element.querySelector('#agentChatSection');

    if (chatSection) {
      chatSection.style.display = 'block';
      const agentName = this.modal.element.querySelector('#currentAgentName');
      if (agentName) agentName.textContent = '🎯 Orchestrovaná session';
    }

    if (messagesContainer) {
      messagesContainer.innerHTML = '<div class="agent-message system">🎯 Orchestrator analyzuje a rozděluje úkol...</div>';
    }

    try {
      const code = state.get('editor.code') || '';
      const context = { code };

      const results = await window.AIAgents.orchestratedSession(task, context);

      // Display results phase by phase
      results.forEach(phaseResult => {
        if (phaseResult.phase === 'orchestration') {
          const msg = document.createElement('div');
          msg.className = 'agent-message orchestrator';
          msg.innerHTML = `<strong>🎯 Orchestrator - Plán:</strong><p>${phaseResult.response.response}</p>`;
          messagesContainer.appendChild(msg);
        } else if (phaseResult.phase === 'execution') {
          // Show plan first
          if (phaseResult.plan) {
            const planMsg = document.createElement('div');
            planMsg.className = 'agent-message system';
            planMsg.innerHTML = `<strong>📋 Rozdělení úkolů:</strong><ul>${
              (phaseResult.plan.agents || []).map(a =>
                `<li><strong>${a.agent}</strong>: ${a.task}</li>`
              ).join('')
            }</ul>`;
            messagesContainer.appendChild(planMsg);
          }

          // Show agent responses
          phaseResult.responses.forEach(response => {
            const msg = document.createElement('div');
            msg.className = 'agent-message assistant';
            msg.innerHTML = `<strong>${response.agent}:</strong><p>${response.response}</p>`;
            messagesContainer.appendChild(msg);
          });
        } else if (phaseResult.phase === 'synthesis') {
          const msg = document.createElement('div');
          msg.className = 'agent-message synthesis';
          msg.innerHTML = `<strong>✨ Finální řešení od Orchestrátora:</strong><p>${phaseResult.response.response}</p>`;
          messagesContainer.appendChild(msg);
        }
      });

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      toast.success('Orchestrovaná session dokončena', 3000);

    } catch (error) {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'agent-message error';
      errorMsg.innerHTML = `<strong>Chyba:</strong><p>${error.message}</p>`;
      messagesContainer.appendChild(errorMsg);
      toast.error('Chyba při orchestrované session', 3000);
    }
  }

  async startCollaborativeTask() {
    if (this.currentAgentEngine === 'crewai') {
      return this.startCrewAICollaborativeTask();
    }

    const activeAgents = window.AIAgents.getActiveAgents();

    if (activeAgents.length < 2) {
      toast.error('Aktivuj alespoň 2 agenty pro kolaborativní práci', 3000);
      return;
    }

    const task = prompt('Zadej úkol pro agenty:');
    if (!task) return;

    const messagesContainer = this.modal.element.querySelector('#agentChatMessages');
    const chatSection = this.modal.element.querySelector('#agentChatSection');

    if (chatSection) {
      chatSection.style.display = 'block';
      const agentName = this.modal.element.querySelector('#currentAgentName');
      if (agentName) agentName.textContent = 'Kolaborativní session';
    }

    if (messagesContainer) {
      messagesContainer.innerHTML = '<div class="agent-message system">🤝 Spouštím kolaborativní session...</div>';
    }

    try {
      const code = state.get('editor.code') || '';
      const context = { code };

      const agentIds = activeAgents.map(a => a.id);
      const results = await window.AIAgents.collaborativeSession(agentIds, task, context);

      // Display results
      results.forEach(phaseResult => {
        if (phaseResult.phase === 'analysis' || phaseResult.phase === 'review') {
          phaseResult.responses.forEach(response => {
            const msg = document.createElement('div');
            msg.className = 'agent-message assistant';
            msg.innerHTML = `<strong>${response.agent} (${phaseResult.phase}):</strong><p>${response.response}</p>`;
            messagesContainer.appendChild(msg);
          });
        } else if (phaseResult.phase === 'synthesis') {
          const msg = document.createElement('div');
          msg.className = 'agent-message synthesis';
          msg.innerHTML = `<strong>📋 Finální řešení:</strong><p>${phaseResult.response.response}</p>`;
          messagesContainer.appendChild(msg);
        }
      });

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      toast.success('Kolaborativní session dokončena', 3000);

    } catch (error) {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'agent-message error';
      errorMsg.innerHTML = `<strong>Chyba:</strong><p>${error.message}</p>`;
      messagesContainer.appendChild(errorMsg);
      toast.error('Chyba při kolaborativní session', 3000);
    }
  }

  async startCrewAICollaborativeTask() {
    const task = prompt('Zadej úkol pro CrewAI tým (Architekt, Vývojář, Tester, Dokumentarista):');
    if (!task) return;

    const messagesContainer = this.modal.element.querySelector('#agentChatMessages');
    const chatSection = this.modal.element.querySelector('#agentChatSection');

    if (chatSection) {
      chatSection.style.display = 'block';
      const agentName = this.modal.element.querySelector('#currentAgentName');
      if (agentName) agentName.textContent = 'CrewAI - Celý tým';
    }

    let loadingMsg = null;

    if (messagesContainer) {
      messagesContainer.innerHTML = '<div class="agent-message system">🐍 Spouštím CrewAI tým...</div>';

      loadingMsg = document.createElement('div');
      loadingMsg.className = 'agent-message assistant loading';
      loadingMsg.innerHTML = '<strong>CrewAI:</strong><p>Agenti pracují na úkolu (může trvat několik minut)...</p>';
      messagesContainer.appendChild(loadingMsg);
    }

    try {
      const result = await window.CrewAI.runCrew(task);

      if (messagesContainer && loadingMsg) {
        loadingMsg.remove();

        const responseMsg = document.createElement('div');
        responseMsg.className = 'agent-message synthesis';
        responseMsg.innerHTML = `<strong>📋 Výsledek CrewAI týmu:</strong><p>${result.result}</p>`;
        messagesContainer.appendChild(responseMsg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }

      toast.success('CrewAI tým dokončil úkol', 3000);

    } catch (error) {
      if (messagesContainer && loadingMsg) {
        loadingMsg.remove();

        const errorMsg = document.createElement('div');
        errorMsg.className = 'agent-message error';
        errorMsg.innerHTML = `<strong>Chyba:</strong><p>${error.message}</p>`;
        messagesContainer.appendChild(errorMsg);
      }

      toast.error('Chyba při spouštění CrewAI týmu', 3000);
    }
  }

  clearAgentsHistory() {
    return this.agentsService.clearAgentsHistory();
  }

  prefillPromptForAgent(agentId) {
    return this.agentsService.prefillPromptForAgent(agentId);
  }

  // ========================================
  // ORCHESTRATOR METHODS - Delegated to AgentsService
  // ========================================

  openOrchestratorPromptBuilder() {
    return this.agentsService.openOrchestratorPromptBuilder();
  }

  createOrchestratorBuilderContent() {
    return this.agentsService.createOrchestratorBuilderContent();
  }

  attachOrchestratorBuilderHandlers(modal) {
    return this.agentsService.attachOrchestratorBuilderHandlers(modal);
  }

  addOrchestratorMessage(role, content) {
    return this.agentsService.addOrchestratorMessage?.(role, content);
  }

  async analyzeProjectAndSuggestTeam(projectDescription) {
    return this.agentsService.analyzeProjectAndSuggestTeam(projectDescription, this.selectedComplexity || 1);
  }

  displayTeamPreview(teamSuggestion) {
    return this.agentsService.displayTeamPreview(teamSuggestion);
  }

  async activateOrchestratedTeam(teamSuggestion, projectDescription, forceNew = false) {
    return this.agentsService.activateOrchestratedTeam(teamSuggestion, projectDescription, forceNew);
  }

  /**
   * Show loading overlay with animation
   */
  showLoadingOverlay(message, subtitle = '') {
    // Remove existing overlay if any
    this.hideLoadingOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'github-loading-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
    `;

    overlay.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 40px 60px;
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        max-width: 500px;
      ">
        <div style="
          width: 60px;
          height: 60px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          margin: 0 auto 20px;
          animation: spin 1s linear infinite;
        "></div>
        <h2 style="color: white; margin: 0 0 10px; font-size: 24px;">${message}</h2>
        ${subtitle ? `<p style="color: rgba(255, 255, 255, 0.8); margin: 0; font-size: 16px;">${subtitle}</p>` : ''}
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    document.body.appendChild(overlay);
  }

  /**
   * Hide loading overlay
   */
  hideLoadingOverlay() {
    const overlay = document.getElementById('github-loading-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * Debounce utility for performance optimization
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Clear formatting cache to free memory
   */
  clearFormatCache() {
    if (this.formatCache.size > 50) {
      // Keep only last 20 entries
      const entries = Array.from(this.formatCache.entries());
      this.formatCache.clear();
      entries.slice(-20).forEach(([key, value]) => {
        this.formatCache.set(key, value);
      });
    }
  }

  /**
   * Zobrazí dialog pro export chatu s lepší čitelností
   */
  showExportDialog() {
    if (this.chatHistory.length === 0) {
      toast.show('⚠️ Žádná konverzace k exportu', 'warning');
      return;
    }

    const messageCount = this.chatHistory.length;
    const modal = document.createElement('div');
    modal.className = 'export-dialog-overlay';
    modal.innerHTML = `
      <div class="export-dialog-content">
        <div class="export-dialog-header">
          <h3>Export konverzace</h3>
          <button class="export-dialog-close" aria-label="Zavřít">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="export-dialog-body">
          <p class="export-info">Historie obsahuje <strong>${messageCount}</strong> ${messageCount === 1 ? 'zprávu' : messageCount < 5 ? 'zprávy' : 'zpráv'}.</p>
          <p class="export-question">Vyberte formát pro export:</p>
          <div class="export-options">
            <button class="export-option-btn json-export" data-format="json">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M10 12h4"></path>
                <path d="M10 16h4"></path>
              </svg>
              <span>JSON</span>
              <small>Strukturovaný datový formát</small>
            </button>
            <button class="export-option-btn md-export" data-format="markdown">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>Markdown</span>
              <small>Čitelný textový formát</small>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    const closeDialog = () => {
      modal.classList.add('closing');
      setTimeout(() => modal.remove(), 200);
    };

    modal.querySelector('.export-dialog-close').addEventListener('click', closeDialog);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeDialog();
    });

    // Export handlers
    modal.querySelector('.json-export').addEventListener('click', () => {
      this.chatHistoryService.exportChatHistory();
      closeDialog();
    });

    modal.querySelector('.md-export').addEventListener('click', () => {
      this.chatHistoryService.exportChatAsMarkdown();
      closeDialog();
    });

    // Animate in
    requestAnimationFrame(() => modal.classList.add('show'));
  }

  /**
   * Zobrazí dialog pro Živý server
   */
  showLiveServerModal() {
    // Kontrola zda server již běží
    const isRunning = this.liveServerRunning || false;
    const serverPort = this.liveServerPort || 5500;
    const serverUrl = `http://localhost:${serverPort}`;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.85) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 999999 !important; opacity: 1 !important;');
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 550px; background: #0d1117; border: 1px solid #30363d; border-radius: 12px; width: 90%;">
        <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: #fff; font-size: 18px; display: flex; align-items: center; gap: 10px;">🌐 Živý server</h3>
          <button class="modal-close" style="background: #21262d; border: none; color: #fff; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 18px;">×</button>
        </div>
        <div class="modal-body" style="padding: 25px;">
          <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 12px; color: #58a6ff; font-size: 14px;">🌐 Co je Živý server:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #8b949e; font-size: 13px; line-height: 1.8;">
              <li>Spustí lokální HTTP server pro váš projekt</li>
              <li>Automaticky obnovuje stránku při změnách</li>
              <li>Simuluje reálné webové prostředí</li>
              <li>Podporuje CORS a moduly ES6</li>
            </ul>
          </div>

          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #c9d1d9;">Port serveru:</label>
            <input type="number" id="liveServerPort" value="${serverPort}" min="1000" max="65535"
              style="width: 100%; padding: 12px; border: 1px solid #30363d; border-radius: 8px; background: #0d1117; color: #c9d1d9; font-size: 14px;">
          </div>

          <div id="serverStatus" style="padding: 16px; background: ${isRunning ? '#0d2818' : '#161b22'}; border: 1px solid ${isRunning ? '#238636' : '#30363d'}; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <span style="width: 12px; height: 12px; border-radius: 50%; background: ${isRunning ? '#3fb950' : '#6e7681'}; animation: ${isRunning ? 'pulse 2s infinite' : 'none'};"></span>
              <span style="color: ${isRunning ? '#3fb950' : '#8b949e'}; font-weight: 600;">
                ${isRunning ? '● Server běží' : '○ Server vypnutý'}
              </span>
            </div>
            ${isRunning ? `
              <p style="margin: 0; color: #8b949e; font-size: 13px;">
                URL: <a href="${serverUrl}" target="_blank" style="color: #58a6ff;">${serverUrl}</a>
              </p>
            ` : `
              <p style="margin: 0; color: #8b949e; font-size: 13px;">
                Klikněte na "Spustit server" pro zahájení
              </p>
            `}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <button id="startServerBtn" style="padding: 14px; background: ${isRunning ? '#21262d' : '#238636'}; color: ${isRunning ? '#8b949e' : '#fff'}; border: 1px solid ${isRunning ? '#30363d' : '#238636'}; border-radius: 8px; cursor: ${isRunning ? 'not-allowed' : 'pointer'}; font-weight: 600; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;" ${isRunning ? 'disabled' : ''}>
              ▶️ Spustit server
            </button>
            <button id="stopServerBtn" style="padding: 14px; background: ${isRunning ? '#da3633' : '#21262d'}; color: ${isRunning ? '#fff' : '#8b949e'}; border: 1px solid ${isRunning ? '#da3633' : '#30363d'}; border-radius: 8px; cursor: ${isRunning ? 'pointer' : 'not-allowed'}; font-weight: 600; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;" ${!isRunning ? 'disabled' : ''}>
              ⏹️ Zastavit server
            </button>
          </div>

          <div style="margin-top: 16px;">
            <button id="openInBrowserBtn" style="width: 100%; padding: 14px; background: #21262d; color: #c9d1d9; border: 1px solid #30363d; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;" ${!isRunning ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
              🔗 Otevřít v prohlížeči
            </button>
          </div>

          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #30363d;">
            <p style="margin: 0; color: #8b949e; font-size: 12px; text-align: center;">
              💡 Tip: Živý server automaticky obnoví náhled při každé změně kódu
            </p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Styly pro pulse animaci
    if (!document.getElementById('live-server-styles')) {
      const style = document.createElement('style');
      style.id = 'live-server-styles';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `;
      document.head.appendChild(style);
    }

    // Close handlers
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Server control handlers
    const startBtn = modal.querySelector('#startServerBtn');
    const stopBtn = modal.querySelector('#stopServerBtn');
    const openBtn = modal.querySelector('#openInBrowserBtn');
    const portInput = modal.querySelector('#liveServerPort');
    const statusDiv = modal.querySelector('#serverStatus');

    const updateUI = (running) => {
      this.liveServerRunning = running;
      const url = `http://localhost:${this.liveServerPort}`;

      statusDiv.style.background = running ? '#0d2818' : '#161b22';
      statusDiv.style.borderColor = running ? '#238636' : '#30363d';
      statusDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
          <span style="width: 12px; height: 12px; border-radius: 50%; background: ${running ? '#3fb950' : '#6e7681'}; animation: ${running ? 'pulse 2s infinite' : 'none'};"></span>
          <span style="color: ${running ? '#3fb950' : '#8b949e'}; font-weight: 600;">
            ${running ? '● Server běží' : '○ Server vypnutý'}
          </span>
        </div>
        ${running ? `
          <p style="margin: 0; color: #8b949e; font-size: 13px;">
            URL: <a href="${url}" target="_blank" style="color: #58a6ff;">${url}</a>
          </p>
        ` : `
          <p style="margin: 0; color: #8b949e; font-size: 13px;">
            Klikněte na "Spustit server" pro zahájení
          </p>
        `}
      `;

      startBtn.disabled = running;
      startBtn.style.background = running ? '#21262d' : '#238636';
      startBtn.style.color = running ? '#8b949e' : '#fff';
      startBtn.style.cursor = running ? 'not-allowed' : 'pointer';
      startBtn.style.borderColor = running ? '#30363d' : '#238636';

      stopBtn.disabled = !running;
      stopBtn.style.background = running ? '#da3633' : '#21262d';
      stopBtn.style.color = running ? '#fff' : '#8b949e';
      stopBtn.style.cursor = running ? 'pointer' : 'not-allowed';
      stopBtn.style.borderColor = running ? '#da3633' : '#30363d';

      openBtn.disabled = !running;
      openBtn.style.opacity = running ? '1' : '0.5';
      openBtn.style.cursor = running ? 'pointer' : 'not-allowed';
    };

    startBtn.addEventListener('click', () => {
      if (this.liveServerRunning) return;

      this.liveServerPort = parseInt(portInput.value) || 5500;
      this.startLiveServer();
      updateUI(true);
      toast.show(`🌐 Server spuštěn na portu ${this.liveServerPort}`, 'success');
    });

    stopBtn.addEventListener('click', () => {
      if (!this.liveServerRunning) return;

      this.stopLiveServer();
      updateUI(false);
      toast.show('⏹️ Server zastaven', 'info');
    });

    openBtn.addEventListener('click', () => {
      if (!this.liveServerRunning) return;
      window.open(`http://localhost:${this.liveServerPort}`, '_blank');
    });
  }

  /**
   * Spustí živý server pomocí Web API
   */
  startLiveServer() {
    // Získej aktuální kód z editoru
    const code = state.get('editor.code') || '';
    const tabs = state.get('files.tabs') || [];

    // Vytvořit blob URL pro obsloužení přes iframe
    this.liveServerBlob = new Blob([code], { type: 'text/html' });
    this.liveServerUrl = URL.createObjectURL(this.liveServerBlob);

    // Otevřít v novém okně s live reload simulací
    const liveWindow = window.open('', '_blank', `width=1024,height=768,left=100,top=100`);
    if (liveWindow) {
      liveWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>🌐 Živý server - HTML Studio</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: system-ui, sans-serif; background: #0d1117; }
            .toolbar {
              position: fixed; top: 0; left: 0; right: 0; height: 40px;
              background: #161b22; border-bottom: 1px solid #30363d;
              display: flex; align-items: center; padding: 0 16px; gap: 12px;
              z-index: 1000;
            }
            .toolbar span { color: #8b949e; font-size: 13px; }
            .toolbar .url { color: #58a6ff; }
            .toolbar .status {
              display: flex; align-items: center; gap: 6px;
              margin-left: auto;
            }
            .toolbar .dot {
              width: 8px; height: 8px; border-radius: 50%;
              background: #3fb950; animation: pulse 2s infinite;
            }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            iframe {
              position: fixed; top: 40px; left: 0; right: 0; bottom: 0;
              width: 100%; height: calc(100% - 40px); border: none;
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <span>🌐</span>
            <span class="url">localhost:${this.liveServerPort}</span>
            <div class="status">
              <span class="dot"></span>
              <span>Živý server</span>
            </div>
          </div>
          <iframe id="preview" srcdoc="${code.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}"></iframe>
          <script>
            // Listen for updates from parent
            window.addEventListener('message', (e) => {
              if (e.data.type === 'live-update') {
                document.getElementById('preview').srcdoc = e.data.code;
              }
            });
          </script>
        </body>
        </html>
      `);
      liveWindow.document.close();
      this.liveServerWindow = liveWindow;

      // Naslouchat změnám v editoru
      this.liveServerListener = () => {
        if (this.liveServerWindow && !this.liveServerWindow.closed) {
          const newCode = state.get('editor.code') || '';
          this.liveServerWindow.postMessage({ type: 'live-update', code: newCode }, '*');
        }
      };

      eventBus.on('editor:change', this.liveServerListener);
      eventBus.on('preview:update', this.liveServerListener);
    }

    this.liveServerRunning = true;
  }

  /**
   * Zastaví živý server
   */
  stopLiveServer() {
    if (this.liveServerBlob) {
      URL.revokeObjectURL(this.liveServerUrl);
      this.liveServerBlob = null;
      this.liveServerUrl = null;
    }

    if (this.liveServerWindow && !this.liveServerWindow.closed) {
      this.liveServerWindow.close();
      this.liveServerWindow = null;
    }

    if (this.liveServerListener) {
      eventBus.off('editor:change', this.liveServerListener);
      eventBus.off('preview:update', this.liveServerListener);
      this.liveServerListener = null;
    }

    this.liveServerRunning = false;
  }
}
