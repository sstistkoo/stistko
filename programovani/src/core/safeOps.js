/**
 * SafeOps - Bezpečné operace s automatickým error handling
 */

import { state } from './state.js';

export class SafeOps {
  /**
   * Bezpečně spustí operaci s error handling a recovery
   * @param {Function} operation - Operace k provedení
   * @param {Object} options - Nastavení
   * @returns {Promise<{success: boolean, result?: any, error?: Error}>}
   */
  static async execute(operation, options = {}) {
    const {
      name = 'operation',
      fallback = null,
      rollbackOnError = true,
      retries = 0,
      timeout = 30000,
    } = options;

    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retry attempt ${attempt}/${retries} for ${name}`);
          await this.delay(1000 * attempt); // Exponential backoff
        }

        // Timeout protection
        const result = await Promise.race([
          operation(),
          this.timeoutPromise(timeout, name)
        ]);

        console.log(`✅ ${name} completed successfully`);
        return { success: true, result };

      } catch (error) {
        lastError = error;
        console.error(`❌ ${name} failed (attempt ${attempt + 1}):`, error);

        // Rollback při chybě
        if (rollbackOnError && state.rollback) {
          console.log(`🔄 Rolling back state after ${name} failure`);
          state.rollback();
        }
      }
    }

    // Všechny pokusy selhaly
    console.error(`❌ ${name} failed after ${retries + 1} attempts`);

    if (fallback !== null) {
      console.log(`📦 Using fallback for ${name}`);
      return { success: false, result: fallback, error: lastError };
    }

    return { success: false, error: lastError };
  }

  /**
   * Delay helper
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Timeout promise
   */
  static timeoutPromise(ms, operationName) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timeout after ${ms}ms`));
      }, ms);
    });
  }

  /**
   * Bezpečné provedení synchronní operace s error handling
   * @param {Function} fn - Funkce k provedení
   * @param {string} errorMessage - Chybová zpráva při selhání
   * @returns {any|null} - Výsledek operace nebo null při chybě
   */
  static safe(fn, errorMessage = 'Operation failed') {
    try {
      return fn();
    } catch (error) {
      console.error(`❌ ${errorMessage}:`, error);
      return null;
    }
  }

  /**
   * Bezpečné zavolání state.set s validací
   */
  static safeSet(path, value, options = {}) {
    try {
      const success = state.set(path, value, options);
      if (!success) {
        console.error(`❌ safeSet failed for ${path}`);
        return false;
      }
      return true;
    } catch (error) {
      console.error(`❌ safeSet error for ${path}:`, error);
      if (options.rollbackOnError !== false) {
        state.rollback();
      }
      return false;
    }
  }

  /**
   * Bezpečné získání hodnoty s fallbackem
   */
  static safeGet(path, fallback = null) {
    try {
      const value = state.get(path);
      return value !== undefined ? value : fallback;
    } catch (error) {
      console.error(`❌ safeGet error for ${path}:`, error);
      return fallback;
    }
  }

  /**
   * Bezpečná transakce
   */
  static async safeTransaction(callback, name = 'transaction') {
    try {
      const success = await state.transaction(callback);
      if (!success) {
        console.error(`❌ ${name} transaction failed`);
      }
      return success;
    } catch (error) {
      console.error(`❌ ${name} transaction error:`, error);
      return false;
    }
  }

  /**
   * Bezpečný batch
   */
  static async safeBatch(callback, name = 'batch') {
    try {
      await state.batch(callback);
      console.log(`✅ ${name} batch completed`);
      return true;
    } catch (error) {
      console.error(`❌ ${name} batch failed:`, error);
      return false;
    }
  }
}

/**
 * Error Boundary pro moduly
 */
export class ModuleErrorBoundary {
  constructor(moduleName) {
    this.moduleName = moduleName;
    this.errors = [];
    this.maxErrors = 10;
  }

  /**
   * Zabal funkci do error boundary
   */
  wrap(fn, methodName = 'method') {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(error, methodName);
        return null; // Nebo vhodný fallback
      }
    };
  }

  /**
   * Zpracuj chybu
   */
  handleError(error, methodName) {
    const errorInfo = {
      module: this.moduleName,
      method: methodName,
      error: error.message,
      stack: error.stack,
      timestamp: Date.now()
    };

    this.errors.push(errorInfo);

    // Omez historii chyb
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    console.error(`🚨 [${this.moduleName}.${methodName}] Error:`, error);

    // Emit event pro centrální error handling
    if (typeof window !== 'undefined' && window.eventBus) {
      window.eventBus.emit('module:error', errorInfo);
    }
  }

  /**
   * Získej historii chyb
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Vyčisti historii
   */
  clearErrors() {
    this.errors = [];
  }
}

// Export jako singleton pro snadné použití
export const safeOps = SafeOps;
