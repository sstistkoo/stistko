/**
 * Code Tools - Nástroje pro analýzu a práci s kódem
 */

export const codeTools = {
  /**
   * Získá console errors
   */
  get_console_errors: {
    schema: {
      description: 'Get JavaScript console errors from the preview window',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of errors to return (default: 10)',
          },
        },
      },
    },
    handler: async ({ limit = 10 }) => {
      try {
        // Zkus získat errors z ErrorIndicator pokud existuje
        if (window.aiPanel && window.aiPanel.errorIndicator) {
          const errors = window.aiPanel.errorIndicator.getConsoleErrors();
          const limitedErrors = errors.slice(0, limit);

          // Formátovaný výstup
          const formattedOutput = limitedErrors.length > 0
            ? `❌ Nalezeno ${errors.length} chyb v konzoli (zobrazeno ${limitedErrors.length}):\n\n` +
              limitedErrors.map((err, idx) =>
                `${idx + 1}. **${err.type}**: ${err.message}\n` +
                (err.stack ? `   Stack: ${err.stack.substring(0, 100)}...\n` : '')
              ).join('\n')
            : '✅ Žádné chyby v konzoli';

          return {
            success: true,
            count: errors.length,
            formattedOutput,
            errors: limitedErrors,
          };
        }

        return {
          success: true,
          count: 0,
          formattedOutput: 'ℹ️ Error tracking není inicializován',
          errors: [],
          note: 'Error tracking not initialized',
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
        };
      }
    },
  },

  /**
   * Spočítá tokeny/znaky v textu
   */
  count_tokens: {
    schema: {
      description: 'Count approximate tokens and characters in text',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Text to analyze',
          },
        },
        required: ['text'],
      },
    },
    handler: async ({ text }) => {
      try {
        // Aproximace tokenů (4 znaky ~ 1 token)
        const chars = text.length;
        const tokens = Math.ceil(chars / 4);
        const words = text.split(/\s+/).length;
        const lines = text.split('\n').length;

        return {
          success: true,
          chars,
          tokens,
          words,
          lines,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
        };
      }
    },
  },

  /**
   * Validuje JavaScript/HTML syntax
   */
  validate_syntax: {
    schema: {
      description: 'Validate JavaScript or HTML syntax',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Code to validate',
          },
          language: {
            type: 'string',
            enum: ['javascript', 'html', 'css'],
            description: 'Language to validate',
          },
        },
        required: ['code', 'language'],
      },
    },
    handler: async ({ code, language }) => {
      try {
        const errors = [];

        if (language === 'javascript') {
          // Pokus se parsovat jako JS
          try {
            // eslint-disable-next-line no-new-func
            new Function(code);
          } catch (e) {
            errors.push({
              type: 'SyntaxError',
              message: e.message,
              line: e.lineNumber || 'unknown',
            });
          }
        } else if (language === 'html') {
          // Základní HTML validace
          const parser = new DOMParser();
          const doc = parser.parseFromString(code, 'text/html');
          const parseErrors = doc.getElementsByTagName('parsererror');

          if (parseErrors.length > 0) {
            errors.push({
              type: 'ParseError',
              message: parseErrors[0].textContent,
            });
          }
        }

        return {
          success: true,
          language,
          valid: errors.length === 0,
          errors,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
        };
      }
    },
  },

  /**
   * Analyzuje komplexitu kódu
   */
  analyze_complexity: {
    schema: {
      description: 'Analyze code complexity (lines, functions, nesting)',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to file to analyze',
          },
        },
        required: ['filePath'],
      },
    },
    handler: async ({ filePath }) => {
      try {
        const openFiles = window.state?.get('openFiles') || [];
        const file = openFiles.find((f) => f.path === filePath || f.path.endsWith(filePath));

        if (!file) {
          return {
            success: false,
            error: `File '${filePath}' not found`,
          };
        }

        const content = file.content || '';
        const lines = content.split('\n');

        // Základní metriky
        const metrics = {
          totalLines: lines.length,
          codeLines: lines.filter((l) => l.trim() && !l.trim().startsWith('//')).length,
          commentLines: lines.filter((l) => l.trim().startsWith('//')).length,
          emptyLines: lines.filter((l) => !l.trim()).length,
          functionCount: (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length,
          classCount: (content.match(/class\s+\w+/g) || []).length,
          maxNesting: 0,
        };

        // Výpočet max nesting level
        let currentNesting = 0;
        for (const line of lines) {
          currentNesting += (line.match(/{/g) || []).length;
          currentNesting -= (line.match(/}/g) || []).length;
          metrics.maxNesting = Math.max(metrics.maxNesting, currentNesting);
        }

        const complexity = metrics.functionCount > 20 || metrics.maxNesting > 5 ? 'high' : metrics.functionCount > 10 ? 'medium' : 'low';

        // Formátovaný výstup
        const formattedOutput = `📊 Analýza složitosti **${filePath}**:\n\n` +
          `**Řádky:**\n` +
          `  - Celkem: ${metrics.totalLines}\n` +
          `  - Kód: ${metrics.codeLines}\n` +
          `  - Komentáře: ${metrics.commentLines}\n` +
          `  - Prázdné: ${metrics.emptyLines}\n\n` +
          `**Struktura:**\n` +
          `  - Funkce: ${metrics.functionCount}\n` +
          `  - Třídy: ${metrics.classCount}\n` +
          `  - Max vnořenost: ${metrics.maxNesting}\n\n` +
          `**Hodnocení složitosti:** ${complexity === 'high' ? '🔴 Vysoká' : complexity === 'medium' ? '🟡 Střední' : '🟢 Nízká'}`;

        return {
          success: true,
          filePath,
          formattedOutput,
          metrics,
          complexity,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
        };
      }
    },
  },
};
