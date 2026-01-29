/**
 * Pomocné funkce pro práci s DOM
 */

/**
 * Vytvoření elementu s atributy a dětmi
 * @param {string} tag - Tag name
 * @param {Object} attrs - Atributy
 * @param {Array|string} children - Děti nebo text
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);

  // Set attributes
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.substring(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else if (value !== null && value !== undefined) {
      element.setAttribute(key, value);
    }
  });

  // Add children
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  });

  return element;
}

/**
 * Najdi element podle selectoru
 * @param {string} selector - CSS selector
 * @param {Element} [parent=document] - Rodičovský element
 * @returns {Element|null}
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Najdi všechny elementy podle selectoru
 * @param {string} selector - CSS selector
 * @param {Element} [parent=document] - Rodičovský element
 * @returns {Element[]}
 */
export function $$(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

/**
 * Nastavení HTML obsahu s escapováním
 * @param {Element} element - Element
 * @param {string} html - HTML string
 */
export function setHTML(element, html) {
  element.innerHTML = html;
}

/**
 * Nastavení textu (escapuje HTML)
 * @param {Element} element - Element
 * @param {string} text - Text
 */
export function setText(element, text) {
  element.textContent = text;
}

/**
 * Toggle class na elementu
 * @param {Element} element - Element
 * @param {string} className - Class name
 * @param {boolean} [force] - Force add/remove
 */
export function toggleClass(element, className, force) {
  element.classList.toggle(className, force);
}

/**
 * Přidání event listeneru s automatickým clean-upem
 * @param {Element|Window|Document} target - Target element
 * @param {string} event - Event name
 * @param {Function} handler - Handler function
 * @param {Object} [options] - Event listener options
 * @returns {Function} Remove function
 */
export function on(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  return () => target.removeEventListener(event, handler, options);
}

/**
 * Delegovaný event listener
 * @param {Element} parent - Parent element
 * @param {string} event - Event name
 * @param {string} selector - Child selector
 * @param {Function} handler - Handler function
 * @returns {Function} Remove function
 */
export function delegate(parent, event, selector, handler) {
  const wrappedHandler = e => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) {
      handler.call(target, e);
    }
  };
  return on(parent, event, wrappedHandler);
}

/**
 * Čekání na DOMContentLoaded
 * @param {Function} callback - Callback function
 */
export function ready(callback) {
  if (document.readyState !== 'loading') {
    callback();
  } else {
    document.addEventListener('DOMContentLoaded', callback);
  }
}

/**
 * Odstranění všech dětí elementu
 * @param {Element} element - Element
 */
export function empty(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Získání souřadnic elementu
 * @param {Element} element - Element
 * @returns {Object} { top, left, width, height }
 */
export function getRect(element) {
  return element.getBoundingClientRect();
}

/**
 * Scroll element do view
 * @param {Element} element - Element
 * @param {Object} [options] - Scroll options
 */
export function scrollIntoView(element, options = { behavior: 'smooth', block: 'nearest' }) {
  element.scrollIntoView(options);
}

export default {
  createElement,
  $,
  $$,
  setHTML,
  setText,
  toggleClass,
  on,
  delegate,
  ready,
  empty,
  getRect,
  scrollIntoView,
};
