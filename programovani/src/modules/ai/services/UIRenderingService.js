/**
 * UIRenderingService.js
 * Service pro rendering AI Panel UI komponent
 * Zodpovědný za generování HTML, formátování zpráv a syntax highlighting
 */

import { ICONS } from '../constants/Messages.js';
import { DiffService } from './DiffService.js';

export class UIRenderingService {
  constructor(aiPanel) {
    this.aiPanel = aiPanel;
    this.diffService = new DiffService();
    console.log('[UIRenderingService] Initialized with DiffService');
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Create content preview for collapsible sections
   */
  createContentPreview(content) {
    // Try to extract the first heading or first sentence
    const headingMatch = content.match(/^#+ (.+)$/m);
    if (headingMatch) {
      return headingMatch[1];
    }

    // Try to get first sentence
    const firstSentence = content.split(/[.!?]\s/)[0];
    if (firstSentence && firstSentence.length < 100) {
      return firstSentence + '...';
    }

    // Fallback to first 80 chars
    return content.substring(0, 80) + '...';
  }

  /**
   * Format AI message text (bold, code, links)
   */
  formatAIMessage(text) {
    if (!text) return '';

    let formatted = this.escapeHtml(text);

    // **bold**
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 0.9em;">$1</code>');

    // Links [text](url)
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;">$1</a>');

    // Headings
    formatted = formatted.replace(/^### (.+)$/gm, '<h4 style="margin: 16px 0 8px 0; font-size: 1em; font-weight: 600;">$1</h4>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h3 style="margin: 18px 0 10px 0; font-size: 1.1em; font-weight: 600;">$1</h3>');
    formatted = formatted.replace(/^# (.+)$/gm, '<h2 style="margin: 20px 0 12px 0; font-size: 1.2em; font-weight: 600;">$1</h2>');

    // Lists
    formatted = formatted.replace(/^- (.+)$/gm, '<li style="margin-left: 20px;">$1</li>');
    formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<li style="margin-left: 20px;" value="$1">$2</li>');

    // Wrap consecutive list items
    formatted = formatted.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, '<ul style="margin: 8px 0; padding-left: 0;">$&</ul>');

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  }

  /**
   * Syntax highlighting for code blocks
   */
  highlightCode(code, language) {
    const escaped = this.escapeHtml(code);

    // Basic syntax highlighting
    if (language === 'javascript' || language === 'js') {
      return escaped
        .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|async|await|try|catch)\b/g, '<span style="color: #c678dd;">$1</span>')
        .replace(/('.*?'|".*?")/g, '<span style="color: #98c379;">$1</span>')
        .replace(/\b(\d+)\b/g, '<span style="color: #d19a66;">$1</span>');
    } else if (language === 'html') {
      return escaped
        .replace(/(&lt;\/?[a-zA-Z][a-zA-Z0-9]*)/g, '<span style="color: #e06c75;">$1</span>')
        .replace(/([a-zA-Z-]+)=/g, '<span style="color: #9cdcfe;">$1</span>=');
    } else if (language === 'css') {
      return escaped
        .replace(/([.#][a-zA-Z-_][a-zA-Z0-9-_]*)/g, '<span style="color: #d7ba7d;">$1</span>')
        .replace(/([a-zA-Z-]+):/g, '<span style="color: #9cdcfe;">$1</span>:');
    }

    return escaped;
  }

  /**
   * Extract and format thinking block from AI response
   * Supports <thinking>...</thinking> and <think>...</think> tags
   */
  extractThinking(content) {
    // Match <thinking>...</thinking> or <think>...</think> tags
    const thinkingRegex = /<(?:thinking|think)>([\s\S]*?)<\/(?:thinking|think)>/gi;
    const matches = [...content.matchAll(thinkingRegex)];

    if (matches.length === 0) {
      return { thinking: null, cleanContent: content };
    }

    // Extract all thinking blocks
    const thinkingParts = matches.map(m => m[1].trim());
    const thinking = thinkingParts.join('\n\n');

    // Remove thinking blocks from content
    let cleanContent = content;
    matches.forEach(m => {
      cleanContent = cleanContent.replace(m[0], '');
    });

    // Clean up extra whitespace
    cleanContent = cleanContent.replace(/^\s*\n+/, '').trim();

    return { thinking, cleanContent };
  }

  /**
   * Render thinking block as collapsible section
   */
  renderThinkingBlock(thinking) {
    if (!thinking) return '';

    // Format thinking content
    const formattedThinking = this.formatAIMessage(thinking);

    // Count steps/lines for preview
    const steps = thinking.split('\n').filter(line => line.trim()).length;
    const preview = steps > 1 ? `Přemýšlím... (${steps} kroků)` : 'Přemýšlím...';

    return `
      <details class="thinking-block">
        <summary class="thinking-summary">
          <span class="thinking-icon">🧠</span>
          <span class="thinking-label">${preview}</span>
          <span class="toggle-icon">▶</span>
        </summary>
        <div class="thinking-content">
          ${formattedThinking}
        </div>
      </details>
    `;
  }

  /**
   * Add chat message with formatted content
   */
  addChatMessage(role, content, messageId = null) {
    const messagesContainer = this.aiPanel.modal.element.querySelector('#aiChatMessages');
    const msgId = messageId || `msg-${Date.now()}-${Math.random()}`;

    const messageEl = document.createElement('div');
    messageEl.className = `ai-message ${role}`;
    messageEl.id = msgId;
    messageEl.setAttribute('data-message-id', msgId);

    if (role === 'assistant') {
      // Format AI assistant messages with markdown-like formatting
      messageEl.innerHTML = `<div>${this.formatAIMessage(content)}</div>`;
    } else {
      // Simple formatting for user and system messages
      messageEl.innerHTML = `<p>${this.escapeHtml(content).replace(/\n/g, '<br>')}</p>`;
    }

    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Ensure scroll after DOM update
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);

    return msgId;
  }

  /**
   * Add chat message with code blocks
   */
  addChatMessageWithCode(role, content, originalMessage = '', isModification = false, codeStatus = {}) {
    const messagesContainer = this.aiPanel.modal.element.querySelector('#aiChatMessages');
    const messageEl = document.createElement('div');
    messageEl.className = `ai-message ${role}`;

    // Extract thinking block if present
    const { thinking, cleanContent } = this.extractThinking(content);
    let thinkingHtml = '';

    if (thinking) {
      thinkingHtml = this.renderThinkingBlock(thinking);
      console.log('[UIRenderingService] 🧠 Thinking block extracted:', thinking.substring(0, 100) + '...');
    }

    // Use clean content (without thinking) for further processing
    content = cleanContent;

    // Detect code blocks
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let formattedContent = '';
    let codeBlocks = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index).trim();
        if (textBefore) {
          formattedContent += this.formatAIMessage(textBefore);
        }
      }

      const language = match[1] || 'html';
      const code = match[2].trim();
      codeBlocks.push({ language, code });

      // Add code block with collapsible wrapper and actions on top
      formattedContent += `
        <div class="code-block-wrapper">
          <div class="code-block-actions" data-code-index="${codeBlocks.length - 1}"></div>
          <details class="code-block-collapsible">
            <summary class="code-block-header">
              <span class="code-language">${language}</span>
              <span class="toggle-icon">▼</span>
            </summary>
            <pre class="code-block"><code>${this.escapeHtml(code)}</code></pre>
          </details>
        </div>
      `;

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex).trim();
      if (remainingText) {
        formattedContent += this.formatAIMessage(remainingText);
      }
    }

    // Check if content has action bar (undo/keep buttons) or is long
    const hasActionBar = content.includes('code-action-bar');
    const lineCount = content.split('\n').length;
    const isLongContent = lineCount > 10 || content.length > 500;

    // Auto-collapse long content or content with action bar
    if ((isLongContent || hasActionBar) && role === 'assistant') {
      const preview = this.createContentPreview(content);
      const shouldStartCollapsed = hasActionBar || lineCount > 15;

      // If has action bar, move it outside of details so it's always visible
      if (hasActionBar) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = formattedContent;
        const actionBar = tempDiv.querySelector('.code-action-bar');

        if (actionBar) {
          // Remove action bar from details content
          actionBar.remove();
          messageEl.innerHTML = `
            ${thinkingHtml}
            ${actionBar.outerHTML}
            <details class="message-collapsible">
              <summary class="message-summary">
                <span class="summary-text">${preview}</span>
                <span class="toggle-icon">▼</span>
              </summary>
              <div class="message-content">${tempDiv.innerHTML}</div>
            </details>
          `;
        } else {
          // No action bar found, use regular collapsible
          messageEl.innerHTML = `
            ${thinkingHtml}
            <details class="message-collapsible" ${shouldStartCollapsed ? '' : 'open'}>
              <summary class="message-summary">
                <span class="summary-text">${preview}</span>
                <span class="toggle-icon">▼</span>
              </summary>
              <div class="message-content">${formattedContent}</div>
            </details>
          `;
        }
      } else {
        // No action bar, standard long content collapsible
        messageEl.innerHTML = `
          ${thinkingHtml}
          <details class="message-collapsible" ${shouldStartCollapsed ? '' : 'open'}>
            <summary class="message-summary">
              <span class="summary-text">${preview}</span>
              <span class="toggle-icon">▼</span>
            </summary>
            <div class="message-content">${formattedContent}</div>
          </details>
        `;
      }
    } else {
      messageEl.innerHTML = thinkingHtml + formattedContent;
    }

    messagesContainer.appendChild(messageEl);

    // Add action buttons to code blocks
    codeBlocks.forEach((block, index) => {
      const actionsContainer = messageEl.querySelector(`.code-block-actions[data-code-index="${index}"]`);
      if (!actionsContainer) return;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'code-action-btn copy-btn';
      copyBtn.dataset.code = block.code;
      copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Kopírovat`;
      copyBtn.onclick = function() {
        navigator.clipboard.writeText(this.dataset.code);
        this.textContent = `${ICONS.SPARKLES} Zkopírováno!`;
        setTimeout(() => {
          this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Kopírovat`;
        }, 2000);
      };

      const insertBtn = document.createElement('button');
      insertBtn.className = 'code-action-btn insert-btn';
      insertBtn.dataset.code = block.code;
      insertBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><path d="M12 5v14M5 12h14"/></svg> Vložit`;
      insertBtn.onclick = () => {
        this.aiPanel.codeEditorService.insertCodeToEditor(block.code);
        insertBtn.textContent = `${ICONS.SPARKLES} Vloženo!`;
        setTimeout(() => {
          insertBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><path d="M12 5v14M5 12h14"/></svg> Vložit`;
        }, 2000);
      };

      actionsContainer.appendChild(copyBtn);
      actionsContainer.appendChild(insertBtn);

      // 🆕 V režimu "Nový projekt" automaticky vložit první HTML kód do editoru
      const isNewProjectMode = this.aiPanel.workMode === 'new-project';
      const isHtmlCode = block.language === 'html' || block.code.includes('<!DOCTYPE') || block.code.includes('<html');

      // Validace - kód musí být dostatečně dlouhý a vypadat jako validní HTML
      const isValidCode = block.code.length > 50 && (
        block.code.includes('<!DOCTYPE') ||
        block.code.includes('<html') ||
        block.code.includes('<body') ||
        block.code.includes('<div') ||
        block.code.includes('<head')
      );

      if (isNewProjectMode && isHtmlCode && isValidCode && index === 0) {
        console.log('[UIRenderingService] 🆕 Nový projekt - automaticky vkládám kód do editoru');
        this.aiPanel.codeEditorService.insertCodeToEditor(block.code);
        insertBtn.textContent = `${ICONS.SPARKLES} Vloženo!`;
        insertBtn.disabled = true;

        // Přidat vizuální indikaci
        actionsContainer.innerHTML = `
          <span style="color: #7ee787; font-size: 12px; display: flex; align-items: center; gap: 6px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Kód automaticky vložen do editoru
          </span>
        `;
      } else if (isNewProjectMode && isHtmlCode && !isValidCode && index === 0) {
        console.warn('[UIRenderingService] ⚠️ Kód je příliš krátký nebo nevalidní, nevkládám automaticky');
      }
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Ensure scroll after DOM update
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
  }

  /**
   * Add message with Copilot-style diff display
   * Shows visual diff with accept/reject buttons for each change
   * @param {string} originalCode - Code before changes
   * @param {string} newCode - Code after changes
   * @param {Array} appliedEdits - Array of applied SEARCH/REPLACE edits
   * @param {Function} onUndo - Callback for undo action
   */
  addDiffMessage(originalCode, newCode, appliedEdits = [], onUndo = null) {
    const messagesContainer = this.aiPanel.modal.element.querySelector('#aiChatMessages');
    const messageEl = document.createElement('div');
    messageEl.className = 'ai-message assistant diff-message';

    // Generate visual diff
    const diff = this.diffService.generateDiff(originalCode, newCode);

    // Create message content
    const changeCount = appliedEdits.length;
    const stats = diff.stats;

    // Změny se aplikují okamžitě - tlačítko pouze pro vrácení zpět
    messageEl.innerHTML = `
      <div class="diff-message-header">
        <div class="diff-title">
          <span class="diff-icon">✨</span>
          <span class="diff-text">Aplikováno ${changeCount} ${changeCount === 1 ? 'změna' : changeCount < 5 ? 'změny' : 'změn'}</span>
          <span class="diff-stats-badge">
            <span class="added">+${stats.added}</span>
            <span class="removed">-${stats.removed}</span>
          </span>
        </div>
        <div class="diff-actions-inline">
          <button class="btn-undo-all" data-action="undo-all" title="Vrátit všechny změny">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M3 7v6h6"></path>
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
            </svg>
            <span>↩️ Vrátit zpět</span>
          </button>
        </div>
      </div>
      <details class="diff-details" open>
        <summary class="diff-summary">
          <span class="toggle-icon">▼</span>
          <span>Zobrazit diff</span>
        </summary>
        <div class="diff-preview-container">
          ${diff.html}
        </div>
      </details>
    `;

    messagesContainer.appendChild(messageEl);

    // Add event listeners - pouze Undo tlačítko
    const undoBtn = messageEl.querySelector('.btn-undo-all');

    if (undoBtn && onUndo) {
      undoBtn.addEventListener('click', () => {
        onUndo(originalCode);
        messageEl.classList.add('undone');
        undoBtn.disabled = true;
        undoBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>✅ Vráceno</span>
        `;
      });
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageEl;
  }

  /**
   * Add pending changes message with individual accept/reject for each change
   * Similar to VS Code Copilot's approach
   */
  addPendingChangesMessage(changes, currentCode, onApply, onReject) {
    const messagesContainer = this.aiPanel.modal.element.querySelector('#aiChatMessages');
    const messageEl = document.createElement('div');
    messageEl.className = 'ai-message assistant pending-changes-message';
    messageEl.id = `pending-${Date.now()}`;

    // Generate previews for each change
    const previews = this.diffService.generateInlinePreviews(changes, currentCode);

    // Build HTML
    let changesHtml = '';
    for (let i = 0; i < previews.length; i++) {
      const preview = previews[i];
      changesHtml += `
        <div class="change-card" data-index="${i}" data-change-id="${preview.id}">
          <div class="change-card-header">
            <span class="change-location">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              Řádek ${preview.startLine}${preview.startLine !== preview.endLine ? `-${preview.endLine}` : ''}
            </span>
            <span class="change-stats-mini">${preview.diff.stats.summary}</span>
          </div>
          <details class="change-preview-details">
            <summary>Zobrazit změnu</summary>
            <div class="change-diff-preview">${preview.diff.html}</div>
          </details>
          <div class="change-card-buttons">
            <button class="btn-accept btn-sm" data-action="accept" data-index="${i}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Accept
            </button>
            <button class="btn-reject btn-sm" data-action="reject" data-index="${i}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Discard
            </button>
          </div>
        </div>
      `;
    }

    const totalAdded = previews.reduce((sum, p) => sum + p.diff.stats.added, 0);
    const totalRemoved = previews.reduce((sum, p) => sum + p.diff.stats.removed, 0);

    messageEl.innerHTML = `
      <div class="pending-changes-container copilot-style">
        <div class="pending-header">
          <div class="pending-title">
            <span class="pending-icon">🔄</span>
            <span>${changes.length} ${changes.length === 1 ? 'změna čeká' : changes.length < 5 ? 'změny čekají' : 'změn čeká'} na schválení</span>
          </div>
          <div class="pending-stats">+${totalAdded} -${totalRemoved}</div>
        </div>
        <div class="pending-batch-actions">
          <button class="btn-accept-all" data-action="accept-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Accept All
          </button>
          <button class="btn-reject-all" data-action="reject-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Discard All
          </button>
        </div>
        <div class="pending-changes-list">
          ${changesHtml}
        </div>
      </div>
    `;

    messagesContainer.appendChild(messageEl);

    // State tracking
    const changeStates = new Array(changes.length).fill('pending'); // pending, accepted, rejected

    // Add event listeners for individual changes
    messageEl.querySelectorAll('.change-card-buttons button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        const index = parseInt(e.currentTarget.dataset.index, 10);
        const card = messageEl.querySelector(`.change-card[data-index="${index}"]`);

        if (action === 'accept') {
          changeStates[index] = 'accepted';
          card.classList.add('applied');
          card.classList.remove('pending');
          onApply([changes[index]], index);
        } else {
          changeStates[index] = 'rejected';
          card.classList.add('rejected');
          card.classList.remove('pending');
          onReject(index);
        }

        // Update buttons
        card.querySelectorAll('button').forEach(b => b.disabled = true);

        // Check if all changes are processed
        if (!changeStates.includes('pending')) {
          messageEl.classList.add('all-processed');
        }
      });
    });

    // Batch actions
    const acceptAllBtn = messageEl.querySelector('.btn-accept-all');
    const rejectAllBtn = messageEl.querySelector('.btn-reject-all');

    acceptAllBtn.addEventListener('click', () => {
      const pendingChanges = changes.filter((_, i) => changeStates[i] === 'pending');
      const pendingIndices = changeStates.map((s, i) => s === 'pending' ? i : -1).filter(i => i !== -1);

      pendingIndices.forEach(i => {
        changeStates[i] = 'accepted';
        const card = messageEl.querySelector(`.change-card[data-index="${i}"]`);
        if (card) {
          card.classList.add('applied');
          card.querySelectorAll('button').forEach(b => b.disabled = true);
        }
      });

      onApply(pendingChanges, 'all');
      messageEl.classList.add('all-processed');
      acceptAllBtn.disabled = true;
      rejectAllBtn.disabled = true;
    });

    rejectAllBtn.addEventListener('click', () => {
      const pendingIndices = changeStates.map((s, i) => s === 'pending' ? i : -1).filter(i => i !== -1);

      pendingIndices.forEach(i => {
        changeStates[i] = 'rejected';
        const card = messageEl.querySelector(`.change-card[data-index="${i}"]`);
        if (card) {
          card.classList.add('rejected');
          card.querySelectorAll('button').forEach(b => b.disabled = true);
        }
      });

      onReject('all');
      messageEl.classList.add('all-processed');
      acceptAllBtn.disabled = true;
      rejectAllBtn.disabled = true;
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return {
      element: messageEl,
      previews,
      getStates: () => changeStates
    };
  }
}
