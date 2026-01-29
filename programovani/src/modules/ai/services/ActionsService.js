/**
 * ActionsService.js
 * Service pro Quick Actions - rychlé akce nad kódem
 */

import { state } from '../../../core/state.js';
import { SafeOps } from '../../../core/safeOps.js';

export class ActionsService {
  constructor(panel) {
    this.panel = panel;
    console.log('[ActionsService] Initialized');
  }

  /**
   * Initialize quick action handlers
   */
  attachHandlers() {
    const actionBtns = this.panel.modal.element.querySelectorAll('.quick-action-btn');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.handleQuickAction(action);
      });
    });
  }

  /**
   * Handle quick action button click
   */
  handleQuickAction(action) {
    const code = state.get('editor.content') || '';

    const actionPrompts = {
      explain: `Vysvětli tento kód:\n\n${code}`,
      fix: `Najdi a oprav chyby v tomto kódu:\n\n${code}`,
      optimize: `Optimalizuj tento kód pro lepší výkon:\n\n${code}`,
      document: `Přidej dokumentaci k tomuto kódu:\n\n${code}`,
      test: `Vytvoř unit testy pro tento kód:\n\n${code}`,
      refactor: `Refaktoruj tento kód pro lepší čitelnost:\n\n${code}`,
      review: `Proveď code review tohoto kódu:\n\n${code}`,
      security: `Proveď bezpečnostní analýzu tohoto kódu:\n\n${code}`
    };

    const prompt = actionPrompts[action];
    if (prompt) {
      this.panel.sendMessage(prompt);
    }
  }

  /**
   * Get HTML for actions tab
   */
  getActionsTabHTML() {
    return `
      <!-- Actions Tab -->
      <div class="ai-tab-content" data-content="actions">
        <div class="ai-quick-actions">
          <h3>Rychlé akce</h3>
          <div class="quick-actions-grid">
            <button class="quick-action-btn" data-action="explain">
              <span class="icon">💡</span>
              <span>Vysvětli kód</span>
            </button>
            <button class="quick-action-btn" data-action="fix">
              <span class="icon">🔧</span>
              <span>Oprav chyby</span>
            </button>
            <button class="quick-action-btn" data-action="optimize">
              <span class="icon">⚡</span>
              <span>Optimalizuj</span>
            </button>
            <button class="quick-action-btn" data-action="document">
              <span class="icon">📝</span>
              <span>Dokumentuj</span>
            </button>
            <button class="quick-action-btn" data-action="test">
              <span class="icon">🧪</span>
              <span>Vytvoř testy</span>
            </button>
            <button class="quick-action-btn" data-action="refactor">
              <span class="icon">♻️</span>
              <span>Refaktoruj</span>
            </button>
            <button class="quick-action-btn" data-action="review">
              <span class="icon">👀</span>
              <span>Code review</span>
            </button>
            <button class="quick-action-btn" data-action="security">
              <span class="icon">🔒</span>
              <span>Bezpečnost</span>
            </button>
          </div>
        </div>

        <div class="ai-templates">
          <h3>Šablony</h3>
          <div class="templates-list">
            <button class="template-btn" data-template="blank">Prázdná stránka</button>
            <button class="template-btn" data-template="landing">Landing page</button>
            <button class="template-btn" data-template="form">Formulář</button>
            <button class="template-btn" data-template="dashboard">Dashboard</button>
            <button class="template-btn" data-template="portfolio">Portfolio</button>
            <button class="template-btn" data-template="blog">Blog</button>
          </div>
        </div>
      </div>
    `;
  }
}
