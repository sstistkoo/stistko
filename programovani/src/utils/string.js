/**
 * String utility funkce
 */

/**
 * Escapování HTML
 * @param {string} str - String k escapování
 * @returns {string}
 */
export function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Unescapování HTML
 * @param {string} str - String k unescapování
 * @returns {string}
 */
export function unescapeHTML(str) {
  const div = document.createElement('div');
  div.innerHTML = str;
  return div.textContent;
}

/**
 * Truncate string
 * @param {string} str - String
 * @param {number} length - Max délka
 * @param {string} ending - Koncovka
 * @returns {string}
 */
export function truncate(str, length = 100, ending = '...') {
  if (str.length <= length) return str;
  return str.substring(0, length - ending.length) + ending;
}

/**
 * Capitalize první písmeno
 * @param {string} str - String
 * @returns {string}
 */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * CamelCase → kebab-case
 * @param {string} str - String
 * @returns {string}
 */
export function camelToKebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * kebab-case → camelCase
 * @param {string} str - String
 * @returns {string}
 */
export function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Generování náhodného ID
 * @param {number} length - Délka
 * @returns {string}
 */
export function generateId(length = 8) {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Formatování velikosti souboru
 * @param {number} bytes - Velikost v bytech
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Počet řádků v textu
 * @param {string} text - Text
 * @returns {number}
 */
export function countLines(text) {
  return text.split('\n').length;
}

/**
 * Odstranění prázdných řádků
 * @param {string} text - Text
 * @returns {string}
 */
export function removeEmptyLines(text) {
  return text.split('\n').filter(line => line.trim()).join('\n');
}

export default {
  escapeHTML,
  unescapeHTML,
  truncate,
  capitalize,
  camelToKebab,
  kebabToCamel,
  generateId,
  formatFileSize,
  countLines,
  removeEmptyLines,
};
