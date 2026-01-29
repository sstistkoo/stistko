/**
 * Keyboard shortcuts manager
 */
import { eventBus } from '../core/events.js';

export class ShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.enabled = true;
    this.init();
  }

  init() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * Registrace shortcutu
   * @param {string} combo - Klávesová kombinace (např. 'Ctrl+S')
   * @param {Function} handler - Handler funkce
   * @param {string} [description] - Popis pro help
   */
  register(combo, handler, description = '') {
    const normalized = this.normalizeCombo(combo);
    this.shortcuts.set(normalized, { handler, description, combo });
  }

  /**
   * Odregistrování shortcutu
   * @param {string} combo - Klávesová kombinace
   */
  unregister(combo) {
    const normalized = this.normalizeCombo(combo);
    this.shortcuts.delete(normalized);
  }

  /**
   * Handle keydown event
   * @private
   */
  handleKeyDown(e) {
    if (!this.enabled) return;

    // Ignoruj shortcuts ve formulářích (kromě některých)
    const target = e.target;
    const isInput = ['INPUT', 'TEXTAREA'].includes(target.tagName);
    const isContentEditable = target.isContentEditable;

    const combo = this.getComboFromEvent(e);
    const shortcut = this.shortcuts.get(combo);

    if (shortcut) {
      // Některé shortcuts fungují i ve formulářích
      const allowedInInputs = ['Ctrl+S', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+F', 'Ctrl+H'];
      if (isInput || isContentEditable) {
        if (!allowedInInputs.includes(combo)) {
          return;
        }
      }

      e.preventDefault();
      e.stopPropagation();

      try {
        shortcut.handler(e);
        eventBus.emit('shortcut:triggered', { combo, event: e });
      } catch (error) {
        console.error(`Error executing shortcut ${combo}:`, error);
      }
    }
  }

  /**
   * Získání combo z eventu
   * @private
   */
  getComboFromEvent(e) {
    const parts = [];

    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    const key = e.key;
    if (key && !['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      parts.push(key === ' ' ? 'Space' : key.toUpperCase());
    }

    return parts.join('+');
  }

  /**
   * Normalizace combo string
   * @private
   */
  normalizeCombo(combo) {
    return combo
      .split('+')
      .map(part => part.trim())
      .map(part => {
        // Normalize special keys
        if (part.toLowerCase() === 'ctrl' || part.toLowerCase() === 'cmd') return 'Ctrl';
        if (part === ' ') return 'Space';
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join('+');
  }

  /**
   * Získání všech registrovaných shortcuts
   * @returns {Array}
   */
  getAll() {
    return Array.from(this.shortcuts.entries()).map(([combo, data]) => ({
      combo,
      ...data,
    }));
  }

  /**
   * Zapnutí/vypnutí shortcuts
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Zjištění zda je shortcut registrován
   * @param {string} combo
   * @returns {boolean}
   */
  has(combo) {
    return this.shortcuts.has(this.normalizeCombo(combo));
  }

  /**
   * Clear všechny shortcuts
   */
  clear() {
    this.shortcuts.clear();
  }
}

// Singleton instance
export const shortcuts = new ShortcutManager();

// Register default shortcuts
export function registerDefaultShortcuts() {
  shortcuts.register('Ctrl+S', () => {
    eventBus.emit('action:save');
  }, 'Uložit');

  shortcuts.register('Ctrl+Shift+C', () => {
    eventBus.emit('action:copyCode');
  }, 'Kopírovat kód');

  shortcuts.register('Ctrl+Shift+F', () => {
    eventBus.emit('action:format');
  }, 'Formátovat kód');

  shortcuts.register('Ctrl+Shift+V', () => {
    eventBus.emit('action:validate');
  }, 'Validovat HTML');

  shortcuts.register('Ctrl+Shift+M', () => {
    eventBus.emit('action:minify');
  }, 'Minifikovat');

  shortcuts.register('Ctrl+P', () => {
    eventBus.emit('action:preview');
  }, 'Přepnout náhled');

  shortcuts.register('Ctrl+`', () => {
    eventBus.emit('action:console');
  }, 'Toggle konzole');

  shortcuts.register('Ctrl+F', () => {
    eventBus.emit('action:search');
  }, 'Hledat');

  shortcuts.register('Ctrl+H', () => {
    eventBus.emit('findreplace:show');
  }, 'Najít a nahradit');

  shortcuts.register('Ctrl+Z', () => {
    eventBus.emit('action:undo');
  }, 'Zpět');

  shortcuts.register('Ctrl+Y', () => {
    eventBus.emit('action:redo');
  }, 'Vpřed');

  shortcuts.register('Ctrl+W', () => {
    eventBus.emit('action:closeTab');
  }, 'Zavřít tab');

  shortcuts.register('Ctrl+T', () => {
    eventBus.emit('action:newTab');
  }, 'Nový tab');
}
