/**
 * Unit Tests for Error Handler Module
 * Tests error logging, safe async execution, user error display
 */

const assert = require('assert');

// ===== MOCK IMPLEMENTATIONS =====

// Mock error log storage
const errorLog = [];

// logError implementation (from error-handler.js)
const logError = function(context, error, additionalInfo = {}) {
    const errorEntry = {
        timestamp: new Date().toISOString(),
        context,
        message: error?.message || String(error),
        stack: error?.stack || null,
        ...additionalInfo
    };

    errorLog.push(errorEntry);

    return errorEntry;
};

// safeAsync implementation
const safeAsync = function(asyncFn, context = 'async') {
    return async function(...args) {
        try {
            return await asyncFn(...args);
        } catch (error) {
            logError(context, error, { args: args.map(a => typeof a) });
            return null;
        }
    };
};

// safeSync implementation
const safeSync = function(fn, context = 'sync', fallback = null) {
    return function(...args) {
        try {
            return fn(...args);
        } catch (error) {
            logError(context, error);
            return fallback;
        }
    };
};

// validateInput implementation
const validateInput = function(value, type, options = {}) {
    const { min, max, required = false, pattern } = options;

    if (required && (value === null || value === undefined || value === '')) {
        return { valid: false, error: 'Value is required' };
    }

    if (value === null || value === undefined) {
        return { valid: true, value: null };
    }

    switch (type) {
        case 'number':
            const num = parseFloat(value);
            if (isNaN(num)) {
                return { valid: false, error: 'Invalid number' };
            }
            if (min !== undefined && num < min) {
                return { valid: false, error: `Value must be at least ${min}` };
            }
            if (max !== undefined && num > max) {
                return { valid: false, error: `Value must be at most ${max}` };
            }
            return { valid: true, value: num };

        case 'string':
            const str = String(value);
            if (pattern && !pattern.test(str)) {
                return { valid: false, error: 'Invalid format' };
            }
            return { valid: true, value: str };

        case 'boolean':
            return { valid: true, value: Boolean(value) };

        default:
            return { valid: false, error: 'Unknown type' };
    }
};

// formatUserError implementation
const formatUserError = function(error, context = '') {
    const errorMessages = {
        'NetworkError': 'Chyba připojení. Zkontrolujte internet.',
        'TypeError': 'Neplatná operace. Zkuste to znovu.',
        'RangeError': 'Hodnota je mimo povolený rozsah.',
        'SyntaxError': 'Chyba v zadání. Zkontrolujte formát.',
        'ValidationError': 'Neplatný vstup. Zkontrolujte hodnoty.'
    };

    const errorType = error?.name || 'Error';
    const baseMessage = errorMessages[errorType] || 'Nastala neočekávaná chyba.';

    return context ? `${context}: ${baseMessage}` : baseMessage;
};

// Clear error log helper
const clearErrorLog = () => {
    errorLog.length = 0;
};

// ============ TESTS ============

describe('Error Logging', () => {
    beforeEach(() => {
        clearErrorLog();
    });

    it('should log error with context', () => {
        const error = new Error('Test error');
        const entry = logError('test-context', error);

        assert.strictEqual(entry.context, 'test-context');
        assert.strictEqual(entry.message, 'Test error');
        assert(errorLog.length === 1);
    });

    it('should include timestamp', () => {
        logError('test', new Error('Test'));

        assert(errorLog[0].timestamp);
        assert(errorLog[0].timestamp.includes('T')); // ISO format
    });

    it('should include stack trace if available', () => {
        const error = new Error('Test');
        logError('test', error);

        assert(errorLog[0].stack !== null);
    });

    it('should handle string errors', () => {
        const entry = logError('test', 'Simple string error');

        assert.strictEqual(entry.message, 'Simple string error');
    });

    it('should include additional info', () => {
        const entry = logError('test', new Error('Test'), { userId: 123, action: 'save' });

        assert.strictEqual(entry.userId, 123);
        assert.strictEqual(entry.action, 'save');
    });

    it('should accumulate multiple errors', () => {
        const startCount = errorLog.length;
        logError('test1', new Error('Error 1'));
        logError('test2', new Error('Error 2'));
        logError('test3', new Error('Error 3'));

        assert.strictEqual(errorLog.length - startCount, 3);
    });
});

describe('Safe Async Wrapper', () => {
    beforeEach(() => {
        clearErrorLog();
    });

    it('should return result on success', async () => {
        const asyncFn = async (x) => x * 2;
        const safeFn = safeAsync(asyncFn, 'test');

        const result = await safeFn(5);
        assert.strictEqual(result, 10);
    });

    it('should return null on error', async () => {
        const asyncFn = async () => {
            throw new Error('Async error');
        };
        const safeFn = safeAsync(asyncFn, 'test');

        const result = await safeFn();
        assert.strictEqual(result, null);
    });

    it('should log error on failure', async () => {
        const asyncFn = async () => {
            throw new Error('Logged error');
        };
        const safeFn = safeAsync(asyncFn, 'async-context');

        await safeFn();

        assert.strictEqual(errorLog.length, 1);
        assert.strictEqual(errorLog[0].context, 'async-context');
    });
});

describe('Safe Sync Wrapper', () => {
    beforeEach(() => {
        clearErrorLog();
    });

    it('should return result on success', () => {
        const fn = (x) => x * 3;
        const safeFn = safeSync(fn, 'test');

        assert.strictEqual(safeFn(4), 12);
    });

    it('should return fallback on error', () => {
        const fn = () => {
            throw new Error('Sync error');
        };
        const safeFn = safeSync(fn, 'test', 'fallback-value');

        assert.strictEqual(safeFn(), 'fallback-value');
    });

    it('should use null as default fallback', () => {
        const fn = () => {
            throw new Error('Error');
        };
        const safeFn = safeSync(fn, 'test');

        assert.strictEqual(safeFn(), null);
    });

    it('should log error on failure', () => {
        const fn = () => {
            throw new Error('Sync logged');
        };
        const safeFn = safeSync(fn, 'sync-context');

        const startCount = errorLog.length;
        safeFn();

        // Check that at least one new error was logged
        assert(errorLog.length > startCount);
        // Check the last logged error has correct context
        const lastError = errorLog[errorLog.length - 1];
        assert.strictEqual(lastError.context, 'sync-context');
    });
});

describe('Input Validation', () => {
    it('should validate required fields', () => {
        const result = validateInput('', 'string', { required: true });
        assert.strictEqual(result.valid, false);
        assert(result.error.includes('required'));
    });

    it('should pass non-required empty values', () => {
        const result = validateInput(null, 'string', { required: false });
        assert.strictEqual(result.valid, true);
    });

    it('should validate numbers', () => {
        const result = validateInput('42', 'number');
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.value, 42);
    });

    it('should reject invalid numbers', () => {
        const result = validateInput('not-a-number', 'number');
        assert.strictEqual(result.valid, false);
    });

    it('should validate number range (min)', () => {
        const result = validateInput('5', 'number', { min: 10 });
        assert.strictEqual(result.valid, false);
        assert(result.error.includes('at least'));
    });

    it('should validate number range (max)', () => {
        const result = validateInput('100', 'number', { max: 50 });
        assert.strictEqual(result.valid, false);
        assert(result.error.includes('at most'));
    });

    it('should validate string patterns', () => {
        const result = validateInput('abc123', 'string', { pattern: /^[a-z]+$/ });
        assert.strictEqual(result.valid, false);
    });

    it('should validate booleans', () => {
        const result = validateInput(1, 'boolean');
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.value, true);
    });

    it('should reject unknown types', () => {
        const result = validateInput('test', 'unknown-type');
        assert.strictEqual(result.valid, false);
    });
});

describe('User Error Formatting', () => {
    it('should format NetworkError', () => {
        const error = new Error('Failed to fetch');
        error.name = 'NetworkError';

        const result = formatUserError(error);
        assert(result.includes('připojení') || result.includes('internet'));
    });

    it('should format TypeError', () => {
        const error = new TypeError('Cannot read property');

        const result = formatUserError(error);
        assert(result.includes('operace') || result.includes('znovu'));
    });

    it('should format RangeError', () => {
        const error = new RangeError('Out of range');

        const result = formatUserError(error);
        assert(result.includes('rozsah'));
    });

    it('should include context in message', () => {
        const error = new Error('Generic');

        const result = formatUserError(error, 'Ukládání');
        assert(result.includes('Ukládání'));
    });

    it('should provide default message for unknown errors', () => {
        const error = { name: 'CustomError', message: 'Custom' };

        const result = formatUserError(error);
        assert(result.includes('neočekávaná') || result.includes('chyba'));
    });
});

describe('Error Recovery Scenarios', () => {
    beforeEach(() => {
        clearErrorLog();
    });

    it('should handle null error gracefully', () => {
        const entry = logError('test', null);
        assert(entry.message);
    });

    it('should handle undefined error gracefully', () => {
        const entry = logError('test', undefined);
        assert(entry.message);
    });

    it('should handle error with only message', () => {
        const entry = logError('test', { message: 'Just message' });
        assert.strictEqual(entry.message, 'Just message');
    });

    it('should handle circular reference in error', () => {
        const error = new Error('Circular');
        error.circular = error; // Create circular reference

        // Should not throw
        const entry = logError('test', error);
        assert(entry.message);
    });
});
