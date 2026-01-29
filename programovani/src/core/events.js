/**
 * EventBus - Centrální systém pro event-driven architekturu
 * Umožňuje loose coupling mezi moduly
 */
export class EventBus {
  constructor() {
    this.events = new Map();
    this.onceEvents = new Map();
  }

  /**
   * Registrace event handleru
   * @param {string} event - Název eventu
   * @param {Function} callback - Handler funkce
   * @param {Object} [options] - Volitelné parametry
   * @returns {Function} Funkce pro odstranění handleru
   */
  on(event, callback, options = {}) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    const handlers = this.events.get(event);

    // OCHRANA: Zkontroluj jestli už není stejný handler zaregistrovaný
    for (const h of handlers) {
      if (h.callback === callback) {
        console.warn(`⚠️ EventBus: Duplicitní handler pro '${event}' byl ignorován`);
        return () => this.off(event, callback);
      }
    }

    const handler = {
      callback,
      priority: options.priority || 0,
      context: options.context,
    };

    handlers.add(handler);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Jednorázový handler (automaticky se odstraní po prvním triggeru)
   * @param {string} event - Název eventu
   * @param {Function} callback - Handler funkce
   * @returns {Function} Funkce pro odstranění handleru
   */
  once(event, callback) {
    if (!this.onceEvents.has(event)) {
      this.onceEvents.set(event, new Set());
    }

    const handler = { callback };
    this.onceEvents.get(event).add(handler);

    return () => {
      const handlers = this.onceEvents.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Odstranění event handleru
   * @param {string} event - Název eventu
   * @param {Function} [callback] - Specifický handler (pokud není, odstraní všechny)
   */
  off(event, callback) {
    if (!callback) {
      // Remove all handlers for this event
      this.events.delete(event);
      this.onceEvents.delete(event);
      return;
    }

    // Remove specific handler
    const handlers = this.events.get(event);
    if (handlers) {
      for (const handler of handlers) {
        if (handler.callback === callback) {
          handlers.delete(handler);
          break;
        }
      }
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }

    // Remove from once handlers too
    const onceHandlers = this.onceEvents.get(event);
    if (onceHandlers) {
      for (const handler of onceHandlers) {
        if (handler.callback === callback) {
          onceHandlers.delete(handler);
          break;
        }
      }
      if (onceHandlers.size === 0) {
        this.onceEvents.delete(event);
      }
    }
  }

  /**
   * Emitování eventu
   * @param {string} event - Název eventu
   * @param {*} data - Data pro handlery
   * @returns {Promise<void>}
   */
  async emit(event, data) {
    // Regular handlers
    if (this.events.has(event)) {
      const handlers = Array.from(this.events.get(event));

      // Sort by priority (higher first)
      handlers.sort((a, b) => b.priority - a.priority);

      for (const handler of handlers) {
        try {
          const context = handler.context || null;
          await handler.callback.call(context, data);
        } catch (error) {
          console.error(`Error in event handler for '${event}':`, error);
        }
      }
    }

    // Once handlers
    if (this.onceEvents.has(event)) {
      const handlers = Array.from(this.onceEvents.get(event));
      this.onceEvents.delete(event); // Remove all once handlers

      for (const handler of handlers) {
        try {
          await handler.callback(data);
        } catch (error) {
          console.error(`Error in once handler for '${event}':`, error);
        }
      }
    }

    // Wildcard handlers (listen to all events)
    if (this.events.has('*')) {
      const handlers = Array.from(this.events.get('*'));
      for (const handler of handlers) {
        try {
          await handler.callback.call(handler.context || null, { event, data });
        } catch (error) {
          console.error(`Error in wildcard handler:`, error);
        }
      }
    }
  }

  /**
   * Synchronní emitování eventu
   * @param {string} event - Název eventu
   * @param {*} data - Data pro handlery
   */
  emitSync(event, data) {
    if (this.events.has(event)) {
      const handlers = Array.from(this.events.get(event));
      handlers.sort((a, b) => b.priority - a.priority);

      for (const handler of handlers) {
        try {
          const context = handler.context || null;
          handler.callback.call(context, data);
        } catch (error) {
          console.error(`Error in event handler for '${event}':`, error);
        }
      }
    }

    if (this.onceEvents.has(event)) {
      const handlers = Array.from(this.onceEvents.get(event));
      this.onceEvents.delete(event);

      for (const handler of handlers) {
        try {
          handler.callback(data);
        } catch (error) {
          console.error(`Error in once handler for '${event}':`, error);
        }
      }
    }
  }

  /**
   * Zjištění zda má event nějaké handlery
   * @param {string} event - Název eventu
   * @returns {boolean}
   */
  hasListeners(event) {
    return (
      (this.events.has(event) && this.events.get(event).size > 0) ||
      (this.onceEvents.has(event) && this.onceEvents.get(event).size > 0)
    );
  }

  /**
   * Počet handlerů pro daný event
   * @param {string} event - Název eventu
   * @returns {number}
   */
  listenerCount(event) {
    let count = 0;
    if (this.events.has(event)) {
      count += this.events.get(event).size;
    }
    if (this.onceEvents.has(event)) {
      count += this.onceEvents.get(event).size;
    }
    return count;
  }

  /**
   * Vyčištění všech handlerů
   */
  clear() {
    this.events.clear();
    this.onceEvents.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();
