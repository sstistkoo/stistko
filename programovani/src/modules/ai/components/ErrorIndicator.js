/**
 * Error Indicator Component
 * Displays error count and handles sending errors to AI
 */

import { eventBus } from '../../../core/events.js';
import { toast } from '../../../ui/components/Toast.js';
import { Modal } from '../../../ui/components/Modal.js';
import { StringUtils } from '../utils/stringUtils.js';

export class ErrorIndicator {
  constructor(aiPanel) {
    this.aiPanel = aiPanel;
    this.errorCount = 0;
    this.ignoredErrors = new Set();
    this.element = null;
  }

  /**
   * Setup error indicator button
   */
  setup(element) {
    this.element = element;

    if (!element) return;

    element.addEventListener('click', () => {
      this.sendAllErrorsToAI();
    });

    // Listen to error count changes
    eventBus.on('console:errorCountChanged', (data) => {
      this.updateCount(data.count);
    });
  }

  /**
   * Update error count display
   */
  updateCount(count) {
    this.errorCount = count;

    if (!this.element) return;

    const errorIcon = this.element.querySelector('.error-icon');
    const errorCountSpan = this.element.querySelector('.error-count');

    if (count === 0) {
      this.element.classList.remove('has-errors');
      this.element.title = 'Žádné chyby v konzoli';
      if (errorIcon) errorIcon.textContent = '✓';
      if (errorCountSpan) errorCountSpan.textContent = '0 chyb';
    } else {
      this.element.classList.add('has-errors');
      this.element.title = `Klikněte pro odeslání ${count} chyb AI`;
      if (errorIcon) errorIcon.textContent = '⚠️';
      if (errorCountSpan) errorCountSpan.textContent = `${count} chyb`;
    }
  }

  /**
   * Send all errors to AI for fixing
   */
  async sendAllErrorsToAI() {
    const errorMessages = this.getConsoleErrors();

    if (errorMessages.length === 0) {
      toast.show('✅ Žádné chyby v konzoli', 'success');
      return;
    }

    const nonIgnoredErrors = errorMessages.filter(err => !this.isErrorIgnored(err.text));

    if (nonIgnoredErrors.length === 0) {
      toast.show('ℹ️ Všechny chyby jsou ignorovány', 'info');
      return;
    }

    this.showErrorSelectionModal(nonIgnoredErrors);
  }

  /**
   * Get console errors
   */
  getConsoleErrors() {
    const consoleContent = document.querySelector('.console-content');
    if (!consoleContent) return [];

    const errorElements = consoleContent.querySelectorAll('.console-message.error');
    return Array.from(errorElements).map((el, i) => ({
      id: i,
      text: el.textContent,
      element: el
    }));
  }

  /**
   * Check if error is ignored
   */
  isErrorIgnored(errorText) {
    return this.ignoredErrors.has(errorText);
  }

  /**
   * Add errors to ignore list
   */
  ignoreErrors(errors) {
    errors.forEach(err => this.ignoredErrors.add(err));
  }

  /**
   * Show error selection modal
   */
  showErrorSelectionModal(errorMessages) {
    const errorCheckboxes = errorMessages.map((err, i) => `
      <div class="error-checkbox-item" style="margin: 10px 0; padding: 10px; background: #2a2a2a; border-radius: 4px;">
        <label style="display: flex; align-items: flex-start; cursor: pointer;">
          <input type="checkbox" class="error-checkbox" data-error-id="${i}" checked
                 style="margin-right: 10px; margin-top: 4px; flex-shrink: 0;">
          <span style="flex: 1; word-break: break-word; font-size: 0.9em; color: #fff;">
            ${StringUtils.escapeHtml(err.text)}
          </span>
        </label>
      </div>
    `).join('');

    const modalContent = `
      <div style="max-height: 60vh; overflow-y: auto;">
        <p style="margin-bottom: 15px; color: #999;">
          Vyberte chyby, které chcete odeslat AI k opravě:
        </p>
        <div class="error-selection-list">
          ${errorCheckboxes}
        </div>
        <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
          <button id="selectAllErrors" class="btn-secondary" style="padding: 8px 16px;">
            ✓ Vybrat vše
          </button>
          <button id="deselectAllErrors" class="btn-secondary" style="padding: 8px 16px;">
            ✗ Zrušit výběr
          </button>
          <button id="showIgnoredErrors" class="btn-secondary" style="padding: 8px 16px;">
            👁️ Ignorované (${this.ignoredErrors.size})
          </button>
        </div>
      </div>
    `;

    const modal = new Modal({
      title: '⚠️ Výběr chyb k opravě',
      content: modalContent,
      className: 'error-selection-modal',
      size: 'large',
      actions: [
        {
          label: 'Ignorovat vybrané',
          className: 'btn-secondary',
          onClick: () => {
            const checkboxes = modal.element.querySelectorAll('.error-checkbox:checked');
            const selectedErrors = Array.from(checkboxes).map(cb => {
              const id = parseInt(cb.dataset.errorId);
              return errorMessages[id].text;
            });

            if (selectedErrors.length > 0) {
              this.ignoreErrors(selectedErrors);
              toast.success(`🙈 ${selectedErrors.length} chyb ignorováno`, 2000);
            }
            modal.close();
          }
        },
        {
          label: 'Odeslat AI',
          className: 'btn-primary',
          onClick: () => {
            const checkboxes = modal.element.querySelectorAll('.error-checkbox:checked');
            const selectedErrors = Array.from(checkboxes).map(cb => {
              const id = parseInt(cb.dataset.errorId);
              return errorMessages[id].text;
            });

            if (selectedErrors.length === 0) {
              toast.error('❌ Žádné chyby nebyly vybrány');
              return;
            }

            const errorText = selectedErrors.map((err, i) => `${i + 1}. ${err}`).join('\n');
            const message = `🐛 OPRAVA CHYB - V konzoli se objevily následující chyby:\n\n${errorText}\n\nProsím oprav tyto chyby v mém kódu. Zkontroluj zejména:\n- Duplicitní deklarace proměnných\n- Chybějící event listenery\n- Syntax chyby\n- Neplatné odkazy na elementy`;

            this.aiPanel.sendMessage(message);
            modal.close();
          }
        }
      ]
    });

    modal.create();
    modal.open();

    // Add event listeners
    setTimeout(() => {
      const selectAllBtn = modal.element.querySelector('#selectAllErrors');
      const deselectAllBtn = modal.element.querySelector('#deselectAllErrors');
      const showIgnoredBtn = modal.element.querySelector('#showIgnoredErrors');

      if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
          modal.element.querySelectorAll('.error-checkbox').forEach(cb => cb.checked = true);
        });
      }

      if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
          modal.element.querySelectorAll('.error-checkbox').forEach(cb => cb.checked = false);
        });
      }

      if (showIgnoredBtn) {
        showIgnoredBtn.addEventListener('click', () => {
          this.showIgnoredErrorsModal();
        });
      }
    }, 100);
  }

  /**
   * Show ignored errors modal
   */
  showIgnoredErrorsModal() {
    if (this.ignoredErrors.size === 0) {
      toast.show('ℹ️ Žádné ignorované chyby', 'info');
      return;
    }

    const ignoredList = Array.from(this.ignoredErrors).map((err, i) => `
      <div class="ignored-error-item" style="margin: 10px 0; padding: 10px; background: #2a2a2a; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
        <span style="flex: 1; word-break: break-word; font-size: 0.9em; color: #999;">
          ${StringUtils.escapeHtml(err)}
        </span>
        <button class="unignore-btn" data-error="${StringUtils.escapeHtml(err)}"
                style="margin-left: 10px; padding: 4px 8px; background: #10b981; color: white; border: none; border-radius: 3px; cursor: pointer;">
          ↩️ Obnovit
        </button>
      </div>
    `).join('');

    const modalContent = `
      <div style="max-height: 60vh; overflow-y: auto;">
        <p style="margin-bottom: 15px; color: #999;">
          Chyby, které jste označili k ignorování:
        </p>
        ${ignoredList}
      </div>
    `;

    const modal = new Modal({
      title: '👁️ Ignorované chyby',
      content: modalContent,
      className: 'ignored-errors-modal',
      size: 'medium',
      actions: [
        {
          label: 'Vymazat vše',
          className: 'btn-secondary',
          onClick: () => {
            this.ignoredErrors.clear();
            toast.success('🗑️ Všechny ignorované chyby vymazány', 2000);
            modal.close();
          }
        }
      ]
    });

    modal.create();
    modal.open();

    // Add unignore handlers
    setTimeout(() => {
      modal.element?.querySelectorAll('.unignore-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const errorText = StringUtils.unescapeHtml(e.target.dataset.error);
          this.ignoredErrors.delete(errorText);
          e.target.closest('.ignored-error-item').remove();
          toast.success('↩️ Chyba obnovena', 2000);

          if (this.ignoredErrors.size === 0) {
            modal.close();
            toast.show('ℹ️ Žádné ignorované chyby', 'info');
          }
        });
      });
    }, 100);
  }
}
