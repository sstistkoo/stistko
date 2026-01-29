/**
 * Token Counter Component
 * Displays token and character count for AI input
 */

import { StringUtils } from '../utils/stringUtils.js';

export class TokenCounter {
  constructor() {
    this.element = null;
    this.input = null;
    this.tokenCountEl = null;
    this.charCountEl = null;
  }

  /**
   * Setup token counter with input element
   */
  setup(counterElement, inputElement) {
    this.element = counterElement;
    this.input = inputElement;

    if (!counterElement || !inputElement) return;

    this.tokenCountEl = counterElement.querySelector('.token-count');
    this.charCountEl = counterElement.querySelector('.char-count');

    // Listen to input changes
    inputElement.addEventListener('input', () => {
      this.update();
    });

    // Initial update
    this.update();
  }

  /**
   * Update token and character count
   */
  update() {
    if (!this.input || !this.tokenCountEl || !this.charCountEl) return;

    const text = this.input.value || '';
    const charCount = text.length;
    const tokenCount = StringUtils.countTokens(text);

    this.tokenCountEl.textContent = tokenCount;
    this.charCountEl.textContent = charCount;

    // Update styling based on count
    if (this.element) {
      if (tokenCount > 2000) {
        this.element.classList.add('warning');
        this.element.title = 'Varování: Velké množství tokenů může způsobit pomalou odpověď';
      } else {
        this.element.classList.remove('warning');
        this.element.title = '';
      }
    }
  }

  /**
   * Get current token count
   */
  getTokenCount() {
    if (!this.input) return 0;
    return StringUtils.countTokens(this.input.value || '');
  }

  /**
   * Get current character count
   */
  getCharCount() {
    if (!this.input) return 0;
    return (this.input.value || '').length;
  }
}
