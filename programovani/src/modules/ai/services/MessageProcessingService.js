/**
 * MessageProcessingService.js
 * Service pro zpracování AI odpovědí - SEARCH/REPLACE, detekce změn, aplikace kódu
 * Extrahováno z AIPanel.js pro lepší modularitu
 */

import { eventBus } from '../../../core/events.js';
import { state } from '../../../core/state.js';
import { SafeOps } from '../../../core/safeOps.js';
import { toast } from '../../../ui/components/Toast.js';

export class MessageProcessingService {
  constructor(panel) {
    this.panel = panel;
    this.pendingChanges = new Map();
    this.originalCode = null;
    console.log('[MessageProcessingService] Initialized');
  }

  /**
   * Process AI response - detect and apply code changes
   * @param {string} response - AI response text
   * @param {string} originalMessage - Original user message
   * @returns {Object} - Processing result
   */
  async processResponse(response, originalMessage) {
    const result = {
      hasChanges: false,
      changesApplied: false,
      searchReplaceCount: 0,
      error: null
    };

    try {
      // Try SEARCH/REPLACE parsing first (VS Code style - preferred)
      const searchReplaceEdits = this.panel.codeEditorService.parseSearchReplaceInstructions(response);

      if (searchReplaceEdits.length > 0) {
        result.hasChanges = true;
        result.searchReplaceCount = searchReplaceEdits.length;

        console.log(`🔧 Detekováno ${searchReplaceEdits.length} SEARCH/REPLACE instrukcí`);

        // Save original code BEFORE applying changes
        const originalCode = state.get('editor.code') || '';

        // Apply changes directly (VS Code style - no confirmation dialog)
        const applyResult = this.panel.codeEditorService.applySearchReplaceEdits(searchReplaceEdits);

        // Get new code AFTER applying
        const newCode = state.get('editor.code') || '';

        // Add chat message with response
        this.panel.addChatMessage('assistant', response);

        // Add Copilot-style diff message with undo option
        this.panel.uiRenderingService.addDiffMessage(
          originalCode,
          newCode,
          searchReplaceEdits,
          (codeToRestore) => {
            eventBus.emit('editor:setCode', { code: codeToRestore });
            toast.success('↩️ Změny vráceny', 2000);
          }
        );

        if (applyResult.success) {
          toast.success(`✅ Aplikováno ${searchReplaceEdits.length} změn`, 3000);
          result.changesApplied = true;
        } else if (applyResult.syntaxError) {
          // Syntax error - změny nebyly aplikovány
          // Error message už byla zobrazena v CodeEditorService
          this.panel.addRetryButton(null, 'syntax_error');
          result.syntaxError = applyResult.syntaxError;
        } else {
          toast.error('⚠️ Některé změny selhaly - viz konzole', 5000);
        }

        return result;
      }

      // Check if response mentions SEARCH but parsing failed
      if (response.includes('SEARCH') || response.includes('```search')) {
        result.error = this.diagnoseSearchReplaceFailure(response);

        // Show the response anyway for debugging
        this.panel.addChatMessage('assistant', response);

        toast.error(
          `❌ SEARCH/REPLACE bloky se nepodařilo zpracovat\n\n` +
          `${result.error}\n\n` +
          `💡 Tip: Požádej AI znovu s upřesněním:\n` +
          `"Uprav kód pomocí SEARCH/REPLACE - použij PŘESNÝ kód"`,
          8000
        );

        return result;
      }

      // No SEARCH/REPLACE detected - this is a regular response
      return result;

    } catch (error) {
      console.error('[MessageProcessingService] Error:', error);
      result.error = error.message;
      return result;
    }
  }

  /**
   * Diagnose why SEARCH/REPLACE parsing failed
   */
  diagnoseSearchReplaceFailure(response) {
    const hasSearchBlock = /```\s*SEARCH/i.test(response);
    const hasReplaceBlock = /```\s*REPLACE/i.test(response);

    if (!hasSearchBlock) {
      return '❓ Nenalezen ```SEARCH blok';
    } else if (!hasReplaceBlock) {
      return '❓ Nenalezen ```REPLACE blok';
    } else {
      return '⚠️ Bloky nalezeny, ale obsahují neplatný obsah (zkratky, placeholdery)';
    }
  }

  /**
   * Accept a pending code change
   */
  acceptChange(changeId, actionsContainer, isAuto = false, isModification = false) {
    const change = this.pendingChanges.get(changeId);
    if (!change) {
      console.error('[MessageProcessingService] Change not found:', changeId);
      return;
    }

    SafeOps.safeEdit(async () => {
      const { code, fileName } = change;

      // Apply based on modification type
      if (isModification && !change.isNewProject) {
        eventBus.emit('editor:setCode', { code, source: 'ai' });
      } else if (fileName) {
        eventBus.emit('files:create', { name: fileName, content: code, type: 'html' });
      } else {
        eventBus.emit('editor:setCode', { code, source: 'ai' });
      }

      // Track change
      this.panel.changedFilesService.trackChange(state.get('editor.activeFile') || 'index.html', code, this.originalCode || '');

      // Update UI
      if (actionsContainer) {
        actionsContainer.innerHTML = `
          <span style="color: #10b981; display: flex; align-items: center; gap: 6px;">
            ✓ ${isAuto ? 'Automaticky aplikováno' : 'Změny aplikovány'}
          </span>
        `;
      }

      // Cleanup
      this.pendingChanges.delete(changeId);

      if (!isAuto) {
        toast.success('Změny byly aplikovány', 2000);
      }

      eventBus.emit('preview:update');
    }, 'Aplikace změn z AI');
  }

  /**
   * Reject a pending code change
   */
  rejectChange(changeId, actionsContainer) {
    const change = this.pendingChanges.get(changeId);
    if (!change) {
      console.error('[MessageProcessingService] Change not found:', changeId);
      return;
    }

    // Remove the pending change
    this.pendingChanges.delete(changeId);

    // Update UI
    if (actionsContainer) {
      actionsContainer.innerHTML = `
        <span style="color: #ef4444; display: flex; align-items: center; gap: 6px;">
          ✗ Změny odmítnuty
        </span>
      `;
    }

    toast.info('Změny byly odmítnuty', 2000);
  }

  /**
   * Store a pending change for later acceptance/rejection
   */
  storePendingChange(changeId, code, fileName = null, isNewProject = false) {
    this.pendingChanges.set(changeId, {
      code,
      fileName,
      isNewProject,
      timestamp: Date.now()
    });
    return changeId;
  }

  /**
   * Get pending change by ID
   */
  getPendingChange(changeId) {
    return this.pendingChanges.get(changeId);
  }

  /**
   * Clear all pending changes
   */
  clearPendingChanges() {
    this.pendingChanges.clear();
  }

  /**
   * Detect if user wants to create a new project
   */
  detectNewProject(userMessage, currentCode) {
    const newProjectPatterns = [
      /vytvoř\s+(nový|novou|nové)/i,
      /create\s+(new|a)/i,
      /nový\s+projekt/i,
      /new\s+project/i,
      /od\s+začátku/i,
      /from\s+scratch/i,
      /prázdný/i,
      /blank/i
    ];

    const isEmptyEditor = !currentCode || currentCode.trim().length < 50;
    const matchesPattern = newProjectPatterns.some(p => p.test(userMessage));

    return matchesPattern || isEmptyEditor;
  }

  /**
   * Create new file with generated code
   */
  createNewFileWithCode(code, fileName = null) {
    const name = fileName || this.generateFileName(code);

    eventBus.emit('files:create', {
      name,
      content: code,
      type: this.detectFileType(code)
    });

    return name;
  }

  /**
   * Generate file name based on code content
   */
  generateFileName(code) {
    if (code.includes('<html') || code.includes('<!DOCTYPE')) {
      return 'index.html';
    } else if (code.includes('function') || code.includes('const ') || code.includes('class ')) {
      return 'script.js';
    } else if (code.includes('{') && code.includes(':') && code.includes(';')) {
      return 'styles.css';
    }
    return 'new-file.html';
  }

  /**
   * Detect file type from code content
   */
  detectFileType(code) {
    if (code.includes('<html') || code.includes('<!DOCTYPE') || code.includes('<body')) {
      return 'html';
    } else if (code.includes('function') || code.includes('const ') || code.includes('=>')) {
      return 'javascript';
    } else if (code.includes('{') && code.includes(':') && code.includes(';') && !code.includes('function')) {
      return 'css';
    }
    return 'html';
  }

  /**
   * Handle starting a completely new project
   */
  handleNewProjectStart() {
    // Clear editor
    eventBus.emit('editor:setCode', { code: '', source: 'new-project' });

    // Clear chat history
    this.panel.chatService.clearHistory();
    this.panel.chatHistory = [];

    // Update UI
    const chatMessages = this.panel.modal?.element?.querySelector('#chatMessages');
    if (chatMessages) {
      chatMessages.innerHTML = '';
    }

    // Add welcome message
    this.panel.addChatMessage('system', '🆕 Nový projekt. Popište co chcete vytvořit...');

    toast.success('Nový projekt připraven', 2000);
  }

  /**
   * Reset editor to new project state
   */
  resetToNewProject() {
    this.originalCode = null;
    this.clearPendingChanges();
    this.handleNewProjectStart();
  }
}
