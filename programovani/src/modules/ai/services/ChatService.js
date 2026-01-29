/**
 * Chat Service
 * Manages chat history, message sending, and conversation state
 */

import { state } from '../../../core/state.js';
import { StringUtils } from '../utils/stringUtils.js';

export class ChatService {
  constructor() {
    this.history = state.get('ai.chatHistory') || [];
  }

  /**
   * Get chat history
   */
  getHistory() {
    return this.history;
  }

  /**
   * Add message to history
   */
  addToHistory(role, content) {
    this.history.push({ role, content });
    state.set('ai.chatHistory', this.history);
    return this.history.length - 1;
  }

  /**
   * Clear chat history
   */
  clearHistory() {
    this.history = [];
    state.set('ai.chatHistory', []);
  }

  /**
   * Get last N messages
   */
  getLastMessages(count = 10) {
    return this.history.slice(-count);
  }

  /**
   * Build context from history
   */
  buildHistoryContext() {
    if (this.history.length <= 1) return '';

    const recentHistory = this.history.slice(-10);
    return `\n\nPředchozí konverzace:\n${recentHistory.map(msg =>
      `${msg.role === 'user' ? 'Uživatel' : 'AI'}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`
    ).join('\n')}`;
  }

  /**
   * Build files context
   */
  buildFilesContext() {
    const openFiles = state.get('files.tabs') || [];
    const activeFileId = state.get('files.active');

    if (openFiles.length === 0) return '';

    return `\n\nOtevřené soubory:\n${openFiles.map(f =>
      `- ${f.name}${f.id === activeFileId ? ' (aktivní)' : ''}`
    ).join('\n')}`;
  }

  /**
   * Export chat to markdown
   */
  exportToMarkdown() {
    let markdown = '# AI Konverzace\n\n';
    markdown += `Exportováno: ${new Date().toLocaleString('cs-CZ')}\n\n`;
    markdown += '---\n\n';

    this.history.forEach((msg, i) => {
      const role = msg.role === 'user' ? '👤 Uživatel' :
                   msg.role === 'assistant' ? '🤖 AI Asistent' : '🔧 Systém';
      markdown += `## ${role}\n\n`;
      markdown += `${msg.content}\n\n`;
      markdown += '---\n\n';
    });

    return markdown;
  }

  /**
   * Export chat to JSON
   */
  exportToJSON() {
    return JSON.stringify({
      exported: new Date().toISOString(),
      messageCount: this.history.length,
      messages: this.history
    }, null, 2);
  }

  /**
   * Format message content with markdown
   */
  formatMessage(content) {
    if (typeof marked !== 'undefined') {
      try {
        marked.setOptions({
          breaks: true,
          gfm: true,
          headerIds: false
        });
        return marked.parse(content);
      } catch (error) {
        console.error('Markdown parsing error:', error);
        return `<p>${StringUtils.escapeHtml(content)}</p>`;
      }
    }
    return `<p>${StringUtils.escapeHtml(content)}</p>`;
  }

  /**
   * Update message code status (for accept/reject tracking)
   */
  updateCodeStatus(messageIndex, codeIndex, status) {
    if (messageIndex < 0 || messageIndex >= this.history.length) return;

    const message = this.history[messageIndex];
    if (!message.codeStatus) {
      message.codeStatus = {};
    }
    message.codeStatus[`code-${codeIndex}`] = status;
    state.set('ai.chatHistory', this.history);
  }

  /**
   * Get code status for message
   */
  getCodeStatus(messageIndex, codeIndex) {
    if (messageIndex < 0 || messageIndex >= this.history.length) return null;

    const message = this.history[messageIndex];
    return message.codeStatus?.[`code-${codeIndex}`] || null;
  }
}
