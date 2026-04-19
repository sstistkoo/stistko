import {
  parseTXT,
  parseTranslations,
  buildPromptMessages,
  buildRetryMessages,
  escHtml,
  validateAPIResponse,
  SYSTEM_MESSAGE,
  DEFAULT_PROMPT
} from './strong_translator_core.js';

describe('Core Module', () => {

  describe('parseTXT', () => {
    const sampleTXT = `G1 | ἄβυσσος
Definice: Bezdna, propast
KJV Významy: deep, abyss
Původ: z negace + βύω (pít)

G2 | ἀγάπη
Definice: Láska, charitativní láska
KJV Významy: charity, love
Původ:`;

    it('should parse valid TXT into correct number of entries', () => {
      const result = parseTXT(sampleTXT);
      expect(result).toHaveLength(2);
    });

    it('should extract key, greek, def, kjv, orig fields', () => {
      const result = parseTXT(sampleTXT);
      expect(result[0]).toEqual({
        key: 'G1',
        greek: 'ἄβυσσος',
        def: 'Bezdna, propast',
        kjv: 'deep, abyss',
        orig: 'z negace + βύω (pít)'
      });
    });

    it('should handle empty lines and extra whitespace', () => {
      const txt = `

G3 | χαρίς
Definice: Milost, přízeň
KJV Významy: grace
Původ: 

`;
      const result = parseTXT(txt);
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('G3');
      expect(result[0].greek).toBe('χαρίς');
    });

    it('should skip malformed blocks without G number', () => {
      const txt = `Invalid line without key
G4 | λόγος
Definice: Slovo, výrok`;
      const result = parseTXT(txt);
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('G4');
    });

    it('should handle missing optional fields gracefully', () => {
      const txt = `G5 | φωνή
Definice: Zvuk, hlas`;
      const result = parseTXT(txt);
      expect(result[0].def).toBe('Zvuk, hlas');
      expect(result[0].kjv).toBe('');
      expect(result[0].orig).toBe('');
    });

    it('should return empty array for completely invalid input', () => {
      const invalidTXT = 'Just some random text without any entries';
      const result = parseTXT(invalidTXT);
      expect(result).toEqual([]);
    });
  });

  describe('parseTranslations', () => {
    const mockTranslated = {};

    const aiResponseHashFormat = `
###G1###
VYZNAM: hluboký, propast
DEFINICE: Bezna, liberální propast v řeckém mytologii
POUZITI: used 5 times in KJV
PUVOD: z negace

###G2###
VYZNAM: láska
DEFINICE: nezištná láska
POUZITI: charity, love
PUVOD: 
`;

     const aiResponsePlainFormat = `
G1 | ἄβυσσος
VYZNAM: hluboký, propast
DEFINICE: Bezna, liberální propast
POUZITI: deep, abyss
PUVOD: z negace + βύω

G2 | ἀγάπη
VYZNAM: láska
DEFINICE: nezištná láska
POUZITI: charity, love
PUVOD: 
`;

     beforeEach(() => {
      mockTranslated['G1'] = { vyznam: '', definice: '', pouziti: '', puvod: '', raw: '' };
      mockTranslated['G2'] = { vyznam: '', definice: '', pouziti: '', puvod: '', raw: '' };
    });

    it('should parse ###G format correctly', () => {
      const keys = ['G1', 'G2'];
      parseTranslations(aiResponseHashFormat, keys, mockTranslated);

      expect(mockTranslated['G1'].vyznam).toContain('hluboký');
      expect(mockTranslated['G1'].definice).toContain('Bezna');
      expect(mockTranslated['G2'].vyznam).toContain('láska');
    });

    it('should parse plain GXXX | format correctly', () => {
      const keys = ['G1', 'G2'];
      parseTranslations(aiResponsePlainFormat, keys, mockTranslated);

      expect(mockTranslated['G1'].vyznam).toContain('hluboký');
      expect(mockTranslated['G2'].vyznam).toBe('láska');
    });

    it('should return missing keys list', () => {
      const keys = ['G1', 'G2'];
      const missing = parseTranslations(aiResponseHashFormat, keys, mockTranslated);
      expect(missing).toEqual([]);
    });

    it('should throw on clearly corrupted or rate-limited response', () => {
      const keys = ['G1', 'G2'];
      const badResponse = 'This is not a valid translation response';
      expect(() => parseTranslations(badResponse, keys, mockTranslated)).toThrow('AI response appears corrupted or rate-limited');
    });

    it('should handle entries with only some fields present', () => {
      const partialResponse = `
###G1###
VYZNAM: jen význam
`;
      const keys = ['G1'];
      const storage = { 'G1': { vyznam: '', definice: '', pouziti: '', puvod: '', raw: '' } };
      parseTranslations(partialResponse, keys, storage);
      expect(storage['G1'].vyznam).toBe('jen význam');
      expect(storage['G1'].definice).toBe('');
    });

    it('should skip keys not in the requested list', () => {
      const response = `
###G1###
VYZNAM: meaning for G1
###G99###
VYZNAM: should be ignored
`;
      const keys = ['G1'];
      const storage = { 'G1': { vyznam: '' } };
      parseTranslations(response, keys, storage);
      expect(storage['G1'].vyznam).toBe('meaning for G1');
      expect(storage['G99']).toBeUndefined();
    });
  });

  describe('buildPromptMessages', () => {
    const batch = [
      { key: 'G1', greek: 'ἄβυσσος', def: 'Bezdna', kjv: 'deep, abyss', orig: 'z negace' },
      { key: 'G2', greek: 'ἀγάπη', def: 'Láska', kjv: 'charity, love', orig: '-' }
    ];

    it('should build correct system and user messages', () => {
      const messages = buildPromptMessages(batch);
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('biblický lexikograf');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toContain('G1 | ἄβυσσος');
      expect(messages[1].content).toContain('DEF: Bezdna');
      expect(messages[1].content).toContain('HESLA:');
    });

    it('should use custom prompt template when provided', () => {
      const customTemplate = 'Translate: {HESLA}';
      // Need to access DOM? The core buildPromptMessages accepts second param.
      const messages = buildPromptMessages(batch, customTemplate);
      expect(messages[1].content).toContain('Translate:');
      expect(messages[1].content).toContain('HESLA:');
    });
  });

  describe('buildRetryMessages', () => {
    it('should build retry message structure', () => {
      const content = 'Retry these keys: G1, G2';
      const messages = buildRetryMessages(content);
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].content).toBe(content);
    });
  });

  describe('escHtml', () => {
    it('should escape &, <, >', () => {
      expect(escHtml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
    });

    it('should handle null/undefined', () => {
      expect(escHtml(null)).toBe('');
      expect(escHtml(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(escHtml('')).toBe('');
    });
  });

  describe('validateAPIResponse', () => {
    it('should throw for Groq when choices missing', () => {
      const resp = {};
      expect(() => validateAPIResponse(resp, 'groq')).toThrow('Invalid Groq response');
    });

    it('should throw for Groq when message content missing', () => {
      const resp = { choices: [{ message: {} }] };
      expect(() => validateAPIResponse(resp, 'groq')).toThrow('Invalid Groq response');
    });

    it('should throw for Gemini when candidates missing', () => {
      const resp = {};
      expect(() => validateAPIResponse(resp, 'gemini')).toThrow('Invalid Gemini response');
    });

    it('should throw for Gemini when text missing', () => {
      const resp = { candidates: [{ content: { parts: [{}] } }] };
      expect(() => validateAPIResponse(resp, 'gemini')).toThrow('Invalid Gemini response');
    });

    it('should throw for OpenRouter when choices missing', () => {
      const resp = {};
      expect(() => validateAPIResponse(resp, 'openrouter')).toThrow('Invalid OpenRouter response');
    });

    it('should throw for unknown provider', () => {
      const resp = { choices: [{ message: { content: 'ok' } }] };
      expect(() => validateAPIResponse(resp, 'unknown')).toThrow('Neznámý provider');
    });

    it('should not throw for valid Groq response', () => {
      const resp = {
        choices: [{ message: { content: 'ok' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
      };
      expect(() => validateAPIResponse(resp, 'groq')).not.toThrow();
    });

    it('should not throw for valid Gemini response', () => {
      const resp = {
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 }
      };
      expect(() => validateAPIResponse(resp, 'gemini')).not.toThrow();
    });

    it('should not throw for valid OpenRouter response', () => {
      const resp = {
        choices: [{ message: { content: 'ok' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20 }
      };
      expect(() => validateAPIResponse(resp, 'openrouter')).not.toThrow();
    });
  });

  describe('Edge cases and integration', () => {
    it('should handle large batch of entries', () => {
      const batch = Array.from({ length: 50 }, (_, i) => ({
        key: `G${i+1}`,
        greek: `word${i+1}`,
        def: `definition ${i+1}`,
        kjv: `kjv ${i+1}`,
        orig: `origin ${i+1}`
      }));
      const messages = buildPromptMessages(batch);
      expect(messages[1].content).toContain('G1');
      expect(messages[1].content).toContain('G50');
    });

    it('should preserve non-ASCII characters in HTML escape', () => {
      const greek = 'ἄβυσσος ἀγάπη';
      expect(escHtml(greek)).toBe(greek);
    });

    it('should handle parseTXT with Windows line endings', () => {
      const txt = `G1 | word\r\nDefinice: def\r\nKJV Významy: kjv\r\nPůvod: orig`;
      const result = parseTXT(txt);
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('G1');
    });

    it('should handle parseTXT with only header line', () => {
      const txt = `G1 | word`;
      const result = parseTXT(txt);
      expect(result[0].def).toBe('');
      expect(result[0].kjv).toBe('');
      expect(result[0].orig).toBe('');
    });

    it('should return empty array for empty string', () => {
      const result = parseTXT('');
      expect(result).toEqual([]);
    });
  });
});
