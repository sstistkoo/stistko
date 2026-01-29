import { toast } from '../../../ui/components/Toast.js';

/**
 * PokecChatService - Spravuje samostatný chat pro obecnou konverzaci
 *
 * Funkce:
 * - Oddělený chat pro volnou konverzaci s AI
 * - Bez tools a code editing funkcí
 * - Vlastní historie zpráv
 * - Formátování markdown odpovědí
 * - Ukládání historie do localStorage
 */
export class PokecChatService {
  constructor(aiPanel) {
    this.aiPanel = aiPanel;
    this.pokecHistory = []; // Separate history for pokec chat
    this.isProcessing = false;
    this.storageKey = 'htmlStudio_pokecHistory';
    this.lastTokenInfo = null; // Store last token usage for display
  }

  /**
   * Initialize - load history from localStorage
   */
  init() {
    this.loadHistory();
  }

  /**
   * Load history from localStorage
   */
  loadHistory() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        this.pokecHistory = data.history || [];

        // Restore messages to UI
        if (this.pokecHistory.length > 0) {
          const messagesContainer = this.aiPanel.modal?.element?.querySelector('#aiPokecMessages');
          if (messagesContainer) {
            // Clear default welcome message
            messagesContainer.innerHTML = '';

            // Add system welcome first
            const welcomeEl = document.createElement('div');
            welcomeEl.className = 'ai-message system';
            welcomeEl.innerHTML = '<p>👋 Historie obnovena! Pokračuj v konverzaci... 😊</p>';
            messagesContainer.appendChild(welcomeEl);

            // Restore last 20 messages to UI (not all to keep it clean)
            const recentMessages = this.pokecHistory.slice(-20);
            recentMessages.forEach(msg => {
              this.addMessage(msg.role, msg.content, false); // false = don't save again
            });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load pokec history:', error);
    }
  }

  /**
   * Save history to localStorage
   */
  saveHistory() {
    try {
      // Keep last 50 messages in storage
      const historyToSave = this.pokecHistory.slice(-50);
      localStorage.setItem(this.storageKey, JSON.stringify({
        history: historyToSave,
        savedAt: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to save pokec history:', error);
    }
  }

  /**
   * Send message in pokec mode
   */
  async sendMessage(message) {
    // Race condition protection
    if (this.isProcessing) {
      toast.warning('⏳ Čekám na dokončení předchozího požadavku...', 2000);
      return;
    }

    this.isProcessing = true;

    // Add user message to pokec chat
    this.addMessage('user', message);

    // Add to history and save
    this.pokecHistory.push({ role: 'user', content: message });
    this.saveHistory();

    try {
      // Build simple system prompt for chat mode
      const systemPrompt = this.aiPanel.promptBuilder.buildChatModePrompt(
        message,
        this.pokecHistory.length > 1
      );

      // Get provider and model from UI
      let provider = this.aiPanel.modal.element.querySelector('#aiProvider')?.value;
      let model = this.aiPanel.modal.element.querySelector('#aiModel')?.value;
      const autoAI = this.aiPanel.modal.element.querySelector('#autoAI')?.checked;

      // If Auto AI is enabled, use intelligent model selection
      if (autoAI) {
        const bestModel = window.AI.selectBestCodingModel();
        provider = bestModel.provider;
        model = bestModel.model;
        console.log(`🤖 Auto AI (pokec): ${provider}/${model} (kvalita: ${bestModel.quality})`);
      } else if (!model || model === 'null' || model === '') {
        // Manual mode but no model selected - use best available
        const bestModel = window.AI.selectBestModel();
        provider = bestModel.provider;
        model = bestModel.model;
      } else {
        // Manual mode with specific model selected
        // Get provider from selected model's data-attribute (in case user selected model from different provider)
        const modelSelect = this.aiPanel.modal.element.querySelector('#aiModel');
        const selectedOption = modelSelect?.options[modelSelect.selectedIndex];
        const modelProvider = selectedOption?.dataset?.provider;
        if (modelProvider) {
          provider = modelProvider;
        }
      }

      // Build messages with history
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // Add last 10 messages from history
      const recentHistory = this.pokecHistory.slice(-10);
      messages.push(...recentHistory);

      // Track start time for duration
      const startTime = Date.now();

      // Make API call
      const response = await window.AI.ask(message, {
        provider,
        model,
        messages
      });

      // Calculate duration
      const duration = Date.now() - startTime;

      // Add AI response to pokec chat
      this.addMessage('assistant', response);

      // Add to history and save
      this.pokecHistory.push({ role: 'assistant', content: response });
      this.saveHistory();

      // Update token info panel (not as chat message)
      if (window.AI.lastTokenUsage) {
        const { tokensIn, tokensOut } = window.AI.lastTokenUsage;
        this.updateTokenInfoPanel(tokensIn, tokensOut, duration, provider, model);
      }

    } catch (error) {
      const errorMsg = error.message || 'Neznámá chyba';
      this.addMessage('system', `❌ Chyba: ${errorMsg}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Update token info panel at bottom
   */
  updateTokenInfoPanel(tokensIn, tokensOut, duration, provider, model) {
    const panel = this.aiPanel.modal?.element?.querySelector('#pokecTokenInfo');
    if (!panel) return;

    const total = tokensIn + tokensOut;
    panel.innerHTML = `
      <span class="token-stat">📊 <strong>${total.toLocaleString()}</strong> tokenů</span>
      <span class="token-detail">(${tokensIn.toLocaleString()}→${tokensOut.toLocaleString()})</span>
      <span class="token-stat">⏱️ ${duration}ms</span>
      <span class="token-stat">🤖 ${model}</span>
    `;
    panel.style.display = 'flex';

    // Store for reference
    this.lastTokenInfo = { tokensIn, tokensOut, duration, provider, model };
  }

  /**
   * Add message to Pokec chat
   * @param {string} role - user, assistant, or system
   * @param {string} content - message content
   * @param {boolean} saveToStorage - whether to save to localStorage (default true)
   */
  addMessage(role, content, saveToStorage = true) {
    const messagesContainer = this.aiPanel.modal?.element?.querySelector('#aiPokecMessages');
    if (!messagesContainer) return;

    const messageEl = document.createElement('div');
    messageEl.className = `ai-message ${role}`;

    // Format content with markdown-like formatting
    const formattedContent = this.formatMessageContent(content);
    messageEl.innerHTML = formattedContent;

    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Ensure scroll after DOM update
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
  }

  /**
   * Format message content with code blocks
   */
  formatMessageContent(content) {
    if (!content || typeof content !== 'string') {
      return '';
    }

    // Escape HTML helper
    const escapeHtml = (text) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    // Process code blocks first (they should not have inner formatting)
    const parts = [];
    let lastIndex = 0;
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      // Add code block
      const language = match[1] || 'code';
      parts.push({ type: 'codeblock', content: match[2].trim(), language });
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    // Process each part
    return parts.map(part => {
      if (part.type === 'codeblock') {
        return `<pre class="code-block"><code class="language-${part.language}">${escapeHtml(part.content)}</code></pre>`;
      }

      // Process text part with markdown
      let text = part.content;

      // Process inline code
      text = text.replace(/`([^`]+)`/g, (m, code) => `<code>${escapeHtml(code)}</code>`);

      // Process links
      text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, linkText, url) =>
        `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkText)}</a>`
      );

      // Process bold (must be before italic)
      text = text.replace(/\*\*(.+?)\*\*/g, (m, boldText) => `<strong>${boldText}</strong>`);

      // Process italic (not preceded or followed by *)
      text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (m, italicText) => `<em>${italicText}</em>`);

      // Escape remaining special HTML chars in plain text segments
      // Split by tags, escape only non-tag parts
      text = text.replace(/([^<>]+)(?=<|$)/g, (segment) => {
        // Don't escape if it's already processed (contains our tags)
        if (/<(strong|em|code|a |pre|br)/.test(segment)) {
          return segment;
        }
        return escapeHtml(segment);
      });

      // Replace line breaks
      text = text.replace(/\n/g, '<br>');

      return text;
    }).join('');
  }

  /**
   * Clear pokec chat history
   */
  clearHistory() {
    this.pokecHistory = [];

    // Clear from localStorage
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Failed to clear pokec history from localStorage:', error);
    }

    const messagesContainer = this.aiPanel.modal?.element?.querySelector('#aiPokecMessages');
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="ai-message system">
          <p>👋 Ahoj! Jsem Pokec AI a můžeme si povídat o čemkoliv - zábava, věda, cestování, filmy, životní rady, nebo prostě jen pokecáme! 😊 Co tě zajímá?</p>
        </div>
      `;
    }

    // Hide token info panel
    const tokenInfo = this.aiPanel.modal?.element?.querySelector('#pokecTokenInfo');
    if (tokenInfo) {
      tokenInfo.style.display = 'none';
    }

    toast.show('🗑️ Historie pokec chatu vymazána', 'info');
  }

  /**
   * Attach event handlers for pokec chat
   */
  attachHandlers() {
    const pokecInput = this.aiPanel.modal.element.querySelector('#aiPokecInput');
    const pokecSendBtn = this.aiPanel.modal.element.querySelector('#aiPokecSendBtn');
    const pokecClearBtn = this.aiPanel.modal.element.querySelector('#aiPokecClearBtn');

    if (pokecInput && pokecSendBtn) {
      const sendMessage = () => {
        const message = pokecInput.value.trim();
        if (message) {
          this.sendMessage(message);
          pokecInput.value = '';
          pokecInput.style.height = 'auto';
        }
      };

      pokecSendBtn.addEventListener('click', sendMessage);

      pokecInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      // Auto-resize textarea
      pokecInput.addEventListener('input', () => {
        pokecInput.style.height = 'auto';
        pokecInput.style.height = pokecInput.scrollHeight + 'px';
      });
    }

    // Clear button handler
    if (pokecClearBtn) {
      pokecClearBtn.addEventListener('click', () => {
        if (confirm('Opravdu chceš vymazat celou historii chatu?')) {
          this.clearHistory();
        }
      });
    }

    // Setup token counter for pokec chat
    this.setupTokenCounter();

    // Setup prompt dropdown
    this.setupPromptDropdown();

    // Load saved history
    this.init();
  }

  /**
   * Setup token counter for pokec input
   */
  setupTokenCounter() {
    const pokecInput = this.aiPanel.modal?.element?.querySelector('#aiPokecInput');
    const tokenCounter = this.aiPanel.modal?.element?.querySelector('#pokecTokenCounter');

    if (!pokecInput || !tokenCounter) return;

    pokecInput.addEventListener('input', () => {
      const text = pokecInput.value;
      const charCount = text.length;
      // Rough estimation: 1 token ≈ 4 characters
      const tokenCount = Math.ceil(charCount / 4);

      // Odhad system promptu pro pokec (menší než pro kód, průměrně ~500-1000 tokenů)
      const systemPromptTokens = 800;

      // Tokeny z historie (pokec chat má vlastní historii)
      const historyTokens = Math.ceil(this.pokecHistory.reduce((sum, msg) => sum + msg.content.length, 0) / 4);

      // Celkový odhad (zpráva + systém + historie)
      const totalTokens = tokenCount + systemPromptTokens + historyTokens;

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

  /**
   * Setup prompt dropdown menu
   */
  setupPromptDropdown() {
    const promptBtn = this.aiPanel.modal?.element?.querySelector('#pokecPromptBtn');
    const promptMenu = this.aiPanel.modal?.element?.querySelector('#pokecPromptMenu');
    const pokecInput = this.aiPanel.modal?.element?.querySelector('#aiPokecInput');

    if (!promptBtn || !promptMenu || !pokecInput) return;

    // Toggle menu on button click
    promptBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = promptMenu.style.display === 'none';
      promptMenu.style.display = isHidden ? 'block' : 'none';
      promptBtn.classList.toggle('active', isHidden);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!promptBtn.contains(e.target) && !promptMenu.contains(e.target)) {
        promptMenu.style.display = 'none';
        promptBtn.classList.remove('active');
      }
    });

    // Handle prompt item clicks
    const promptItems = promptMenu.querySelectorAll('.prompt-item');
    promptItems.forEach(item => {
      item.addEventListener('click', () => {
        const promptType = item.dataset.prompt;
        this.handlePromptSelection(promptType, pokecInput);
        promptMenu.style.display = 'none';
        promptBtn.classList.remove('active');
      });
    });
  }

  /**
   * Handle prompt selection
   */
  handlePromptSelection(promptType, inputElement) {
    let promptText = '';

    switch (promptType) {
      case 'fun-fact':
        promptText = '🌟 Řekni mi nějakou zajímavou věc nebo fakt, o kterém většina lidí neví!';
        break;

      case 'joke':
        promptText = '😄 Řekni mi dobrý vtip nebo něco vtipného!';
        break;

      case 'advice':
        promptText = '💡 Dej mi užitečnou životní radu nebo tip na: ';
        break;

      case 'creative':
        promptText = '✨ Pomoz mi vymyslet kreativní nápad na: ';
        break;

      case 'explain':
        promptText = '🎓 Vysvětli mi jednoduše téma: ';
        break;

      case 'recommend':
        promptText = '🎬 Doporuč mi nějaký dobrý film, seriál nebo knihu. Mám rád: ';
        break;

      default:
        return;
    }

    // Insert prompt into textarea
    inputElement.value = promptText;
    inputElement.focus();

    // Auto-resize textarea
    inputElement.style.height = 'auto';
    inputElement.style.height = inputElement.scrollHeight + 'px';

    // Move cursor to end
    inputElement.setSelectionRange(promptText.length, promptText.length);
  }
}
