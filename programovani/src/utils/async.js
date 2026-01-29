/**
 * Debounce funkce - zavolá funkci až po X ms od posledního volání
 * @param {Function} func - Funkce k debounce
 * @param {number} wait - Čekací doba v ms
 * @returns {Function}
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle funkce - omezí volání na max 1x za X ms
 * @param {Function} func - Funkce k throttle
 * @param {number} limit - Časový limit v ms
 * @returns {Function}
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Retry funkce s exponenciálním backoffem
 * @param {Function} fn - Async funkce k retry
 * @param {number} maxRetries - Max počet pokusů
 * @param {number} delay - Počáteční delay v ms
 * @returns {Promise}
 */
export async function retry(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay * Math.pow(2, i));
    }
  }
}

/**
 * Sleep funkce
 * @param {number} ms - Doba čekání v ms
 * @returns {Promise}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Timeout wrapper pro Promise
 * @param {Promise} promise - Promise
 * @param {number} ms - Timeout v ms
 * @returns {Promise}
 */
export function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}

export default {
  debounce,
  throttle,
  retry,
  sleep,
  withTimeout,
};
