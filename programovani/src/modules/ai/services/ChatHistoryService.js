import { state } from '../../../core/state.js';
import { toast } from '../../../ui/components/Toast.js';

/**
 * ChatHistoryService - Spravuje historii chatu a její export
 *
 * Funkce:
 * - Mazání historie chatu
 * - Obnova zpráv z historie
 * - Export historie jako JSON
 * - Export historie jako Markdown
 * - Aktualizace informací o historii
 */
export class ChatHistoryService {
  constructor(aiPanel) {
    this.aiPanel = aiPanel;
  }

  /**
   * Vymaže historii chatu
   */
  clearChatHistory() {
    // Rychlé vymazání - vypnout animace a smazat najednou
    const messagesContainer = this.aiPanel.modal?.element?.querySelector('#aiChatMessages');

    if (messagesContainer) {
      // Zakázat CSS animace pro rychlejší mazání
      messagesContainer.style.transition = 'none';

      // Rychle vyčistit všechny zprávy
      while (messagesContainer.firstChild) {
        messagesContainer.removeChild(messagesContainer.firstChild);
      }

      // Přidat info zprávu
      const systemMsg = document.createElement('div');
      systemMsg.className = 'ai-message system';
      systemMsg.innerHTML = '<p>Historie konverzace byla vymazána. Můžeš začít novou konverzaci!</p>';
      messagesContainer.appendChild(systemMsg);

      // Vrátit animace zpět (asynchronně)
      requestAnimationFrame(() => {
        messagesContainer.style.transition = '';
      });
    }

    // Vymazat historii z paměti
    this.aiPanel.chatService.clearHistory();
    this.aiPanel.chatHistory = [];

    // Aktualizovat UI
    this.updateHistoryInfo();
    toast.show('🗑️ Historie konverzace vymazána', 'info');
  }

  /**
   * Obnoví všechny zprávy z historie do UI
   */
  restoreChatMessages() {
    if (!this.aiPanel.modal || !this.aiPanel.chatHistory || this.aiPanel.chatHistory.length === 0) {
      return;
    }

    const messagesContainer = this.aiPanel.modal.element.querySelector('#aiChatMessages');
    if (!messagesContainer) return;

    // Vymazat existující zprávy
    messagesContainer.innerHTML = '';

    // Obnovit všechny zprávy z historie
    this.aiPanel.chatHistory.forEach((msg) => {
      if (msg.role === 'user') {
        this.aiPanel.addChatMessage('user', msg.content);
      } else if (msg.role === 'assistant') {
        // Zkontroluj, jestli obsahuje kód (triple backticks)
        const hasCodeBlock = /```[\s\S]*?```/.test(msg.content);
        if (hasCodeBlock) {
          this.aiPanel.addChatMessageWithCode('assistant', msg.content, '', false, msg.codeStatus || {});
        } else {
          this.aiPanel.addChatMessage('assistant', msg.content);
        }
      }
    });

    // Scrollovat na konec
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Exportuje historii chatu jako JSON soubor
   */
  exportChatHistory() {
    if (this.aiPanel.chatHistory.length === 0) {
      toast.show('⚠️ Žádná konverzace k exportu', 'warning');
      return;
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      messageCount: this.aiPanel.chatHistory.length,
      messages: this.aiPanel.chatHistory.map((msg, idx) => ({
        index: idx + 1,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || new Date().toISOString()
      }))
    };

    // Export as JSON
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-chat-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.show('💾 Konverzace exportována', 'success');
  }

  /**
   * Exportuje historii chatu jako Markdown soubor
   */
  exportChatAsMarkdown() {
    if (this.aiPanel.chatHistory.length === 0) {
      toast.show('⚠️ Žádná konverzace k exportu', 'warning');
      return;
    }

    let markdown = `# AI Chat Export\n\n`;
    markdown += `**Datum:** ${new Date().toLocaleString('cs-CZ')}\n`;
    markdown += `**Počet zpráv:** ${this.aiPanel.chatHistory.length}\n\n`;
    markdown += `---\n\n`;

    this.aiPanel.chatHistory.forEach((msg, idx) => {
      const role = msg.role === 'user' ? '👤 Uživatel' : '🤖 AI';
      markdown += `## ${idx + 1}. ${role}\n\n`;
      markdown += `${msg.content}\n\n`;
      markdown += `---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);

    toast.show('💾 Konverzace exportována jako Markdown', 'success');
  }

  /**
   * Aktualizuje informace o historii (počet zpráv)
   */
  updateHistoryInfo() {
    const historyInfo = this.aiPanel.modal?.element?.querySelector('#chatHistoryInfo');
    if (historyInfo) {
      const messageCount = this.aiPanel.chatHistory.length;
      historyInfo.textContent = `Historie: ${messageCount} ${messageCount === 1 ? 'zpráva' : messageCount < 5 ? 'zprávy' : 'zpráv'}`;
    }
  }
}
