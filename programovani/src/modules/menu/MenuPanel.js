/**
 * Menu Panel Module - REFACTORED v2.0
 * Main navigation menu with modular architecture
 *
 * Structure:
 * - MenuPanel.js (this file) - Core panel logic (show/hide, create DOM)
 * - config/MenuConfig.js - Menu structure definition
 * - services/MenuActions.js - Action dispatching
 * - services/MenuModals.js - Modal dialogs
 */

import { eventBus } from '../../core/events.js';
import { MENU_SECTIONS, MENU_FOOTER_TEXT } from './config/MenuConfig.js';
import { MenuActions } from './services/MenuActions.js';
import { MenuModals } from './services/MenuModals.js';

export class MenuPanel {
  constructor() {
    this.menuElement = null;
    this.isOpen = false;
    this.escapeHandler = null;

    // Initialize services
    this.modals = new MenuModals();
    this.actions = new MenuActions(this);

    this.setupEventListeners();
  }

  // ===== Event Listeners =====

  setupEventListeners() {
    eventBus.on('menu:toggle', () => this.toggle());
    eventBus.on('menu:show', () => this.show());
    eventBus.on('menu:hide', () => this.hide());
  }

  // ===== Public Methods =====

  toggle() {
    this.isOpen ? this.hide() : this.show();
  }

  show() {
    if (!this.menuElement) {
      this.createMenu();
    }

    // Close AI panel when opening menu
    eventBus.emit('ai:hide');

    this.menuElement.classList.add('active');
    this.isOpen = true;

    this.addBackdrop();
    this.addEscapeHandler();
  }

  hide() {
    if (this.menuElement) {
      this.menuElement.classList.remove('active');
    }

    this.removeBackdrop();
    this.removeEscapeHandler();

    this.isOpen = false;
  }

  // ===== Private Methods - DOM Creation =====

  createMenu() {
    this.menuElement = document.createElement('div');
    this.menuElement.className = 'side-menu';

    this.menuElement.appendChild(this.createHeader());
    this.menuElement.appendChild(this.createNav());

    document.body.appendChild(this.menuElement);
    this.attachEventHandlers();
  }

  createHeader() {
    const header = document.createElement('div');
    header.className = 'menu-header';

    const title = document.createElement('h2');
    title.textContent = 'Menu';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'menu-close';
    closeBtn.id = 'menuClose';
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>`;

    header.appendChild(title);
    header.appendChild(closeBtn);

    return header;
  }

  createNav() {
    const nav = document.createElement('nav');
    nav.className = 'menu-nav';

    // Create sections from config
    MENU_SECTIONS.forEach(section => {
      nav.appendChild(this.createSection(section.title, section.items));
    });

    // Add footer
    nav.appendChild(this.createFooter());

    return nav;
  }

  createSection(title, items) {
    const section = document.createElement('div');
    section.className = 'menu-section';

    const heading = document.createElement('h3');
    heading.textContent = title;
    section.appendChild(heading);

    items.forEach(item => {
      section.appendChild(this.createMenuItem(item));
    });

    return section;
  }

  createMenuItem(item) {
    const btn = document.createElement('button');
    btn.className = 'menu-item';
    btn.dataset.action = item.action;

    const icon = document.createElement('span');
    icon.className = 'menu-icon';
    icon.textContent = item.icon;

    const label = document.createElement('span');
    label.textContent = item.label;

    btn.appendChild(icon);
    btn.appendChild(label);

    if (item.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.className = 'menu-shortcut';
      shortcut.textContent = item.shortcut;
      btn.appendChild(shortcut);
    }

    return btn;
  }

  createFooter() {
    const footer = document.createElement('div');
    footer.className = 'menu-footer';

    const footerText = document.createElement('small');
    footerText.innerHTML = MENU_FOOTER_TEXT;
    footer.appendChild(footerText);

    return footer;
  }

  // ===== Private Methods - Event Handling =====

  attachEventHandlers() {
    // Close button
    const closeBtn = this.menuElement.querySelector('#menuClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Menu item buttons - delegate to MenuActions
    const menuItems = this.menuElement.querySelectorAll('[data-action]');
    menuItems.forEach(button => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        this.actions.execute(action);
        this.hide();
      });
    });
  }

  addBackdrop() {
    const backdrop = document.createElement('div');
    backdrop.className = 'menu-backdrop';
    backdrop.addEventListener('click', () => this.hide());
    document.body.appendChild(backdrop);
  }

  removeBackdrop() {
    const backdrop = document.querySelector('.menu-backdrop');
    if (backdrop) {
      backdrop.remove();
    }
  }

  addEscapeHandler() {
    this.escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);
  }

  removeEscapeHandler() {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
  }
}
