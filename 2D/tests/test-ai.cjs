/**
 * Unit Tests for AI Module Functions
 * Tests provider detection, API key validation, error handling
 */

const assert = require('assert');

// ===== MOCK IMPLEMENTATIONS =====

// Provider detection (from ai-config.js)
const AI_PROVIDERS = {
    groq: {
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        keyPattern: /^gsk_[a-zA-Z0-9]{52}$/,
        models: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768']
    },
    openrouter: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        keyPattern: /^sk-or-v1-[a-f0-9]{64}$/,
        models: ['mistralai/mistral-7b-instruct', 'anthropic/claude-3-opus']
    },
    openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        keyPattern: /^sk-[a-zA-Z0-9]{48}$/,
        models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo']
    },
    gemini: {
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        keyPattern: /^AIza[a-zA-Z0-9_-]{35}$/,
        models: ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash']
    }
};

// Detect provider from API key
const detectProvider = function(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') return null;

    for (const [providerId, config] of Object.entries(AI_PROVIDERS)) {
        if (config.keyPattern.test(apiKey)) {
            return providerId;
        }
    }
    return null;
};

// Validate API key format
const validateApiKey = function(apiKey, provider) {
    if (!apiKey || !provider || !AI_PROVIDERS[provider]) {
        return { valid: false, reason: 'Invalid parameters' };
    }

    const config = AI_PROVIDERS[provider];
    if (config.keyPattern.test(apiKey)) {
        return { valid: true, provider: config.name };
    }

    return { valid: false, reason: 'API key format does not match provider' };
};

// Format error message
const formatErrorMessage = function(error) {
    if (!error) return 'Unknown error';

    if (error.status === 401) {
        return 'Authentication failed: Invalid API key';
    }
    if (error.status === 429) {
        return 'Rate limit exceeded: Too many requests';
    }
    if (error.status === 500) {
        return 'Server error: Provider is temporarily unavailable';
    }
    if (error.message) {
        return error.message;
    }

    return 'Unknown error occurred';
};

// Sanitize user input for AI prompts
const sanitizeInput = function(input) {
    if (!input || typeof input !== 'string') return '';

    return input
        .replace(/[<>]/g, '') // Remove HTML-like tags
        .replace(/\\/g, '\\\\') // Escape backslashes
        .trim()
        .slice(0, 10000); // Limit length
};

// Parse AI response for G-code
const extractGCode = function(response) {
    if (!response || typeof response !== 'string') return null;

    // Look for G-code patterns
    const gCodePattern = /G[0-3]\s*[XZ]\d+/gi;
    const matches = response.match(gCodePattern);

    return matches || null;
};

// ============ TESTS ============

describe('Provider Detection', () => {
    it('should detect Groq provider from API key', () => {
        const key = 'gsk_' + 'a'.repeat(52);
        const result = detectProvider(key);
        assert.strictEqual(result, 'groq');
    });

    it('should detect OpenRouter provider from API key', () => {
        const key = 'sk-or-v1-' + 'a'.repeat(64);
        const result = detectProvider(key);
        assert.strictEqual(result, 'openrouter');
    });

    it('should detect Gemini provider from API key', () => {
        const key = 'AIzaSyABC' + 'a'.repeat(30);
        const result = detectProvider(key);
        assert.strictEqual(result, 'gemini');
    });

    it('should return null for unknown key format', () => {
        const result = detectProvider('unknown-key-format');
        assert.strictEqual(result, null);
    });

    it('should return null for empty key', () => {
        assert.strictEqual(detectProvider(''), null);
        assert.strictEqual(detectProvider(null), null);
        assert.strictEqual(detectProvider(undefined), null);
    });
});

describe('API Key Validation', () => {
    it('should validate correct Groq key', () => {
        const key = 'gsk_' + 'a'.repeat(52);
        const result = validateApiKey(key, 'groq');
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.provider, 'Groq');
    });

    it('should reject invalid Groq key format', () => {
        const result = validateApiKey('invalid-key', 'groq');
        assert.strictEqual(result.valid, false);
    });

    it('should reject mismatched provider', () => {
        const groqKey = 'gsk_' + 'a'.repeat(52);
        const result = validateApiKey(groqKey, 'openai');
        assert.strictEqual(result.valid, false);
    });

    it('should handle invalid provider', () => {
        const result = validateApiKey('any-key', 'invalid-provider');
        assert.strictEqual(result.valid, false);
    });

    it('should handle missing parameters', () => {
        assert.strictEqual(validateApiKey(null, 'groq').valid, false);
        assert.strictEqual(validateApiKey('key', null).valid, false);
    });
});

describe('Error Message Formatting', () => {
    it('should format 401 authentication error', () => {
        const result = formatErrorMessage({ status: 401 });
        assert(result.includes('Authentication') || result.includes('Invalid API key'));
    });

    it('should format 429 rate limit error', () => {
        const result = formatErrorMessage({ status: 429 });
        assert(result.includes('Rate limit') || result.includes('Too many'));
    });

    it('should format 500 server error', () => {
        const result = formatErrorMessage({ status: 500 });
        assert(result.includes('Server error') || result.includes('unavailable'));
    });

    it('should use error message if available', () => {
        const result = formatErrorMessage({ message: 'Custom error' });
        assert.strictEqual(result, 'Custom error');
    });

    it('should handle null/undefined error', () => {
        assert.strictEqual(formatErrorMessage(null), 'Unknown error');
        assert.strictEqual(formatErrorMessage(undefined), 'Unknown error');
    });
});

describe('Input Sanitization', () => {
    it('should remove HTML-like tags', () => {
        const result = sanitizeInput('Hello <script>alert(1)</script> World');
        assert(!result.includes('<'));
        assert(!result.includes('>'));
    });

    it('should trim whitespace', () => {
        const result = sanitizeInput('  hello world  ');
        assert.strictEqual(result, 'hello world');
    });

    it('should limit input length', () => {
        const longInput = 'a'.repeat(20000);
        const result = sanitizeInput(longInput);
        assert(result.length <= 10000);
    });

    it('should handle empty input', () => {
        assert.strictEqual(sanitizeInput(''), '');
        assert.strictEqual(sanitizeInput(null), '');
        assert.strictEqual(sanitizeInput(undefined), '');
    });

    it('should escape backslashes', () => {
        const result = sanitizeInput('path\\to\\file');
        assert(result.includes('\\\\'));
    });
});

describe('G-Code Extraction from AI Response', () => {
    it('should extract G-code from response', () => {
        const response = 'Here is the G-code: G0 X50 Z100, then G1 X100';
        const result = extractGCode(response);
        assert(result !== null);
        assert(result.length >= 2);
    });

    it('should handle response without G-code', () => {
        const response = 'This is a regular text without any codes';
        const result = extractGCode(response);
        assert.strictEqual(result, null);
    });

    it('should handle empty response', () => {
        assert.strictEqual(extractGCode(''), null);
        assert.strictEqual(extractGCode(null), null);
    });

    it('should find multiple G-codes', () => {
        const response = 'G0 X10 then G1 Z50 and G2 X100';
        const result = extractGCode(response);
        assert(result.length >= 3);
    });
});

describe('Provider Configuration', () => {
    it('should have all required provider properties', () => {
        for (const [id, config] of Object.entries(AI_PROVIDERS)) {
            assert(config.name, `${id} missing name`);
            assert(config.baseUrl, `${id} missing baseUrl`);
            assert(config.keyPattern, `${id} missing keyPattern`);
            assert(Array.isArray(config.models), `${id} models should be array`);
        }
    });

    it('should have valid base URLs', () => {
        for (const [id, config] of Object.entries(AI_PROVIDERS)) {
            assert(config.baseUrl.startsWith('https://'), `${id} should use HTTPS`);
        }
    });

    it('should have at least one model per provider', () => {
        for (const [id, config] of Object.entries(AI_PROVIDERS)) {
            assert(config.models.length > 0, `${id} should have at least one model`);
        }
    });
});
