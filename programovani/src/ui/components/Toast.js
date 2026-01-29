/**
 * Toast notification component
 */
import { createElement } from '../../utils/dom.js';

class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.init();
  }

  init() {
    this.container = createElement('div', { className: 'toast-container' });
    document.body.appendChild(this.container);
  }

  show(message, options = {}) {
    const toast = new Toast(message, options);
    this.toasts.push(toast);
    this.container.appendChild(toast.element);
    toast.show();
    return toast;
  }

  success(message, duration) {
    return this.show(message, { type: 'success', duration });
  }

  error(message, duration) {
    return this.show(message, { type: 'error', duration });
  }

  warning(message, duration) {
    return this.show(message, { type: 'warning', duration });
  }

  info(message, duration) {
    return this.show(message, { type: 'info', duration });
  }

  remove(toast) {
    const index = this.toasts.indexOf(toast);
    if (index > -1) {
      this.toasts.splice(index, 1);
    }
  }
}

class Toast {
  constructor(message, options = {}) {
    this.message = message;
    this.options = {
      type: 'info', // info, success, error, warning
      duration: 3000,
      closeable: true,
      ...options,
    };
    this.element = this.create();
    this.timeout = null;
  }

  create() {
    const toast = createElement('div', {
      className: `toast toast-${this.options.type}`,
    });

    const content = createElement('div', { className: 'toast-content' }, this.message);
    toast.appendChild(content);

    if (this.options.closeable) {
      const closeBtn = createElement(
        'button',
        {
          className: 'toast-close',
          onClick: () => this.hide(),
        },
        '×'
      );
      toast.appendChild(closeBtn);
    }

    return toast;
  }

  show() {
    requestAnimationFrame(() => {
      this.element.classList.add('show');
    });

    if (this.options.duration > 0) {
      this.timeout = setTimeout(() => this.hide(), this.options.duration);
    }
  }

  hide() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.element.classList.remove('show');
    setTimeout(() => {
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      toastManager.remove(this);
    }, 300);
  }
}

// Singleton instance
export const toastManager = new ToastManager();

// Export convenience methods
export const toast = {
  show: (msg, opts) => toastManager.show(msg, opts),
  success: (msg, duration) => toastManager.success(msg, duration),
  error: (msg, duration) => toastManager.error(msg, duration),
  warning: (msg, duration) => toastManager.warning(msg, duration),
  info: (msg, duration) => toastManager.info(msg, duration),
};

export default toast;
