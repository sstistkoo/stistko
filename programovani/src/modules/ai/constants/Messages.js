/**
 * Messages Constants - Všechny české texty a ikony
 * Tento modul obsahuje všechny zprávy, aby se UTF-8 kódování nekazilo při editacích
 */

export const MESSAGES = {
  // Tool iterations
  MAX_ITERATIONS_REACHED: '\n\n⚠️ Maximum tool iterations reached',

  // Auto-select model
  AUTO_SELECT_MODEL: (provider, model) => `✨ Auto-vybrán nejlepší model: ${provider}/${model}`,

  // Orchestrator
  ORCHESTRATOR_MODE: '🎯 Orchestrator režim: Generuji bez starého kontextu',

  // History
  HISTORY_CLEARED: '🗑️ Historie konverzace vymazána',
  HISTORY_INFO: (count) => `Historie: ${count} ${count === 1 ? 'zpráva' : count < 5 ? 'zprávy' : 'zpráv'}`,

  // Export
  EXPORT_SUCCESS: '💾 Konverzace exportována',
  EXPORT_MARKDOWN_SUCCESS: '💾 Konverzace exportována jako Markdown',
  EXPORT_NO_DATA: '⚠️ Žádná konverzace k exportu',

  // New project
  NEW_PROJECT_CREATED: '✨ Nový projekt vytvořen!',

  // Chat messages
  HISTORY_CLEARED_MESSAGE: 'Historie konverzace byla vymazána. Můžeš začít novou konverzaci!',

  // Context labels
  PREVIOUS_CONVERSATION: 'Předchozí konverzace:',
  USER_LABEL: 'Uživatel',
  AI_LABEL: 'AI',

  // File context
  ATTACHED_FILES: '## 📎 Přiložené soubory pro kontext:',
  OPEN_FILES: (count) => `\n\nOtevřené soubory (${count}):\n\n`,
  FILE_TRUNCATED: (name, isActive) => `📄 **${name}**${isActive ? ' (aktivní)' : ''} - [obsah vynechán kvůli velikosti]\n\n`,
  FILE_WITH_CONTENT: (name, isActive, lines, language) => `📄 **${name}**${isActive ? ' (aktivní)' : ''} (${lines} řádků, ${language})`,
  ACTIVE_FILE: (name) => `Aktivní soubor: ${name}`,
  NO_ACTIVE_FILE: 'Žádný aktivní soubor',

  // VS Code Mode
  VSCODE_MODE_ACTIVE: '🛠️ VS Code Mode: Tool System aktivní',
};

export const ICONS = {
  SPARKLES: '✨',
  WASTEBASKET: '🗑️',
  FLOPPY_DISK: '💾',
  WARNING: '⚠️',
  TARGET: '🎯',
  TOOLS: '🛠️',
  PAPERCLIP: '📎',
  PAGE: '📄',
  FOLDER: '📁',
  MEMO: '📝',
  COMPUTER: '💻',
  ROBOT: '🤖',
  USER: '👤',
};
