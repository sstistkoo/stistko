/**
 * Advanced Tools - Pokročilé nástroje pro AI
 * run_code, screenshot, fetch_url, insert_at_line, replace_lines,
 * get_preview_html, minify_code, format_code, check_accessibility
 */

import { state } from '../../../core/state.js';
import { eventBus } from '../../../core/events.js';

export const advancedTools = {
  /**
   * Spustí JavaScript kód a vrátí výsledek
   */
  run_code: {
    schema: {
      description: 'Execute JavaScript code and return the result. Useful for testing, calculations, or debugging.',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'JavaScript code to execute',
          },
          timeout: {
            type: 'number',
            description: 'Timeout in milliseconds (default: 5000)',
          },
        },
        required: ['code'],
      },
    },
    handler: async ({ code, timeout = 5000 }) => {
      try {
        // Vytvoř sandbox pro bezpečné spuštění
        const result = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error('Timeout - kód běžel příliš dlouho'));
          }, timeout);

          try {
            // Spusť v iframe náhledu pokud existuje
            const previewFrame = document.querySelector('#previewContainer iframe');
            let execResult;

            if (previewFrame && previewFrame.contentWindow) {
              // Spusť v kontextu náhledu
              execResult = previewFrame.contentWindow.eval(code);
            } else {
              // Spusť v izolovaném kontextu
              const fn = new Function(`
                "use strict";
                try {
                  return (function() { ${code} })();
                } catch(e) {
                  return { error: e.message, stack: e.stack };
                }
              `);
              execResult = fn();
            }

            clearTimeout(timer);
            resolve(execResult);
          } catch (e) {
            clearTimeout(timer);
            reject(e);
          }
        });

        // Formátuj výsledek
        let formattedResult;
        if (result === undefined) {
          formattedResult = 'undefined';
        } else if (result === null) {
          formattedResult = 'null';
        } else if (typeof result === 'object') {
          formattedResult = JSON.stringify(result, null, 2);
        } else {
          formattedResult = String(result);
        }

        return {
          success: true,
          result: formattedResult,
          type: typeof result,
          formattedOutput: `✅ Výsledek:\n\`\`\`\n${formattedResult}\n\`\`\``,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          formattedOutput: `❌ Chyba: ${error.message}`,
        };
      }
    },
  },

  /**
   * Pořídí screenshot náhledu
   */
  screenshot: {
    schema: {
      description: 'Take a screenshot of the preview window. Returns base64 image data.',
      parameters: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'Optional CSS selector to screenshot specific element',
          },
          width: {
            type: 'number',
            description: 'Width of screenshot (default: 800)',
          },
          height: {
            type: 'number',
            description: 'Height of screenshot (default: 600)',
          },
        },
      },
    },
    handler: async ({ selector, width = 800, height = 600 }) => {
      try {
        const previewFrame = document.querySelector('#previewContainer iframe');

        if (!previewFrame || !previewFrame.contentDocument) {
          return {
            success: false,
            error: 'Náhled není k dispozici',
          };
        }

        // Použij html2canvas pokud je dostupný
        if (typeof html2canvas !== 'undefined') {
          const targetElement = selector
            ? previewFrame.contentDocument.querySelector(selector)
            : previewFrame.contentDocument.body;

          if (!targetElement) {
            return {
              success: false,
              error: `Element '${selector}' nenalezen`,
            };
          }

          const canvas = await html2canvas(targetElement, {
            width,
            height,
            useCORS: true,
            logging: false,
          });

          const dataUrl = canvas.toDataURL('image/png');

          return {
            success: true,
            dataUrl,
            width: canvas.width,
            height: canvas.height,
            formattedOutput: `📸 Screenshot pořízen (${canvas.width}x${canvas.height})`,
          };
        }

        // Fallback - vrať HTML strukturu místo obrázku
        const body = previewFrame.contentDocument.body;
        const elements = [];

        const walkDOM = (node, depth = 0) => {
          if (node.nodeType === 1 && depth < 3) {
            const tag = node.tagName.toLowerCase();
            const id = node.id ? `#${node.id}` : '';
            const classes = node.className ? `.${node.className.split(' ').join('.')}` : '';
            const text = node.textContent?.substring(0, 50).trim();
            elements.push(`${'  '.repeat(depth)}<${tag}${id}${classes}>${text ? ` "${text}..."` : ''}`);

            for (const child of node.children) {
              walkDOM(child, depth + 1);
            }
          }
        };

        walkDOM(body);

        return {
          success: true,
          type: 'structure',
          structure: elements.slice(0, 30),
          formattedOutput: `📋 Struktura náhledu:\n\`\`\`\n${elements.slice(0, 30).join('\n')}\n\`\`\``,
          note: 'html2canvas není k dispozici, vrácena struktura DOM',
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
   * Stáhne obsah z URL
   */
  fetch_url: {
    schema: {
      description: 'Fetch content from a URL. Useful for getting API data, examples, or documentation.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL to fetch',
          },
          type: {
            type: 'string',
            enum: ['text', 'json', 'html'],
            description: 'Expected response type (default: text)',
          },
          maxLength: {
            type: 'number',
            description: 'Maximum content length to return (default: 10000)',
          },
        },
        required: ['url'],
      },
    },
    handler: async ({ url, type = 'text', maxLength = 10000 }) => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': type === 'json' ? 'application/json' : 'text/html,text/plain',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let content;
        if (type === 'json') {
          content = await response.json();
          content = JSON.stringify(content, null, 2);
        } else {
          content = await response.text();
        }

        // Ořízni pokud je moc dlouhé
        const truncated = content.length > maxLength;
        if (truncated) {
          content = content.substring(0, maxLength) + '\n... [zkráceno]';
        }

        return {
          success: true,
          url,
          contentType: response.headers.get('content-type'),
          length: content.length,
          truncated,
          content,
          formattedOutput: `📥 Staženo z ${url} (${content.length} znaků):\n\`\`\`${type}\n${content.substring(0, 2000)}${content.length > 2000 ? '\n...' : ''}\n\`\`\``,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          formattedOutput: `❌ Nepodařilo se stáhnout: ${error.message}`,
        };
      }
    },
  },

  /**
   * Vloží kód na konkrétní řádek
   */
  insert_at_line: {
    schema: {
      description: 'Insert code at a specific line number in the current file',
      parameters: {
        type: 'object',
        properties: {
          lineNumber: {
            type: 'number',
            description: 'Line number where to insert (1-indexed)',
          },
          code: {
            type: 'string',
            description: 'Code to insert',
          },
          fileName: {
            type: 'string',
            description: 'Optional: specific file name (default: active file)',
          },
        },
        required: ['lineNumber', 'code'],
      },
    },
    handler: async ({ lineNumber, code, fileName }) => {
      try {
        let content;
        let file;

        if (fileName) {
          const openFiles = state.get('files.tabs') || [];
          file = openFiles.find(f => f.name === fileName || f.name.endsWith(fileName));
          if (!file) {
            return { success: false, error: `Soubor '${fileName}' nenalezen` };
          }
          content = file.content || '';
        } else {
          content = state.get('editor.code') || '';
        }

        const lines = content.split('\n');
        const insertIndex = Math.max(0, Math.min(lineNumber - 1, lines.length));

        // Vlož nové řádky
        const newLines = code.split('\n');
        lines.splice(insertIndex, 0, ...newLines);

        const newContent = lines.join('\n');

        // Aktualizuj
        if (fileName && file) {
          const openFiles = state.get('files.tabs') || [];
          const updatedTabs = openFiles.map(f =>
            f.id === file.id ? { ...f, content: newContent } : f
          );
          state.set('files.tabs', updatedTabs);
          eventBus.emit('editor:change', { code: newContent });
        } else {
          state.set('editor.code', newContent);
          eventBus.emit('editor:change', { code: newContent });
        }

        return {
          success: true,
          insertedAt: lineNumber,
          linesInserted: newLines.length,
          formattedOutput: `✅ Vloženo ${newLines.length} řádků na řádek ${lineNumber}`,
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * Nahradí rozsah řádků
   */
  replace_lines: {
    schema: {
      description: 'Replace a range of lines in the current file',
      parameters: {
        type: 'object',
        properties: {
          startLine: {
            type: 'number',
            description: 'Start line number (1-indexed, inclusive)',
          },
          endLine: {
            type: 'number',
            description: 'End line number (1-indexed, inclusive)',
          },
          newCode: {
            type: 'string',
            description: 'New code to replace the range with',
          },
          fileName: {
            type: 'string',
            description: 'Optional: specific file name',
          },
        },
        required: ['startLine', 'endLine', 'newCode'],
      },
    },
    handler: async ({ startLine, endLine, newCode, fileName }) => {
      try {
        let content;
        let file;

        if (fileName) {
          const openFiles = state.get('files.tabs') || [];
          file = openFiles.find(f => f.name === fileName || f.name.endsWith(fileName));
          if (!file) {
            return { success: false, error: `Soubor '${fileName}' nenalezen` };
          }
          content = file.content || '';
        } else {
          content = state.get('editor.code') || '';
        }

        const lines = content.split('\n');
        const start = Math.max(0, startLine - 1);
        const end = Math.min(lines.length, endLine);
        const removedCount = end - start;

        // Nahraď řádky
        const newLines = newCode.split('\n');
        lines.splice(start, removedCount, ...newLines);

        const newContent = lines.join('\n');

        // Aktualizuj
        if (fileName && file) {
          const openFiles = state.get('files.tabs') || [];
          const updatedTabs = openFiles.map(f =>
            f.id === file.id ? { ...f, content: newContent } : f
          );
          state.set('files.tabs', updatedTabs);
          eventBus.emit('editor:change', { code: newContent });
        } else {
          state.set('editor.code', newContent);
          eventBus.emit('editor:change', { code: newContent });
        }

        return {
          success: true,
          replacedLines: `${startLine}-${endLine}`,
          removedCount,
          insertedCount: newLines.length,
          formattedOutput: `✅ Nahrazeno ${removedCount} řádků (${startLine}-${endLine}) novým kódem (${newLines.length} řádků)`,
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * Získá HTML z náhledu
   */
  get_preview_html: {
    schema: {
      description: 'Get the rendered HTML from the preview window',
      parameters: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'Optional CSS selector to get specific element',
          },
          includeStyles: {
            type: 'boolean',
            description: 'Include computed styles (default: false)',
          },
        },
      },
    },
    handler: async ({ selector, includeStyles = false }) => {
      try {
        const previewFrame = document.querySelector('#previewContainer iframe');

        if (!previewFrame || !previewFrame.contentDocument) {
          return {
            success: false,
            error: 'Náhled není k dispozici',
          };
        }

        const doc = previewFrame.contentDocument;
        const element = selector ? doc.querySelector(selector) : doc.body;

        if (!element) {
          return {
            success: false,
            error: `Element '${selector}' nenalezen`,
          };
        }

        let html = element.outerHTML;
        let styles = null;

        if (includeStyles) {
          const computed = previewFrame.contentWindow.getComputedStyle(element);
          styles = {};
          for (let i = 0; i < computed.length; i++) {
            const prop = computed[i];
            styles[prop] = computed.getPropertyValue(prop);
          }
        }

        // Ořízni pokud je moc dlouhé
        const maxLen = 15000;
        const truncated = html.length > maxLen;
        if (truncated) {
          html = html.substring(0, maxLen) + '\n<!-- ... zkráceno ... -->';
        }

        return {
          success: true,
          selector: selector || 'body',
          html,
          styles,
          length: html.length,
          truncated,
          formattedOutput: `📄 HTML z náhledu${selector ? ` (${selector})` : ''}:\n\`\`\`html\n${html.substring(0, 3000)}${html.length > 3000 ? '\n...' : ''}\n\`\`\``,
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * Minifikuje kód
   */
  minify_code: {
    schema: {
      description: 'Minify CSS or JavaScript code',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Code to minify',
          },
          language: {
            type: 'string',
            enum: ['css', 'javascript'],
            description: 'Language of the code',
          },
        },
        required: ['code', 'language'],
      },
    },
    handler: async ({ code, language }) => {
      try {
        let minified;

        if (language === 'css') {
          // Jednoduchá CSS minifikace
          minified = code
            .replace(/\/\*[\s\S]*?\*\//g, '') // Odstraň komentáře
            .replace(/\s+/g, ' ') // Sjednoť whitespace
            .replace(/\s*([{}:;,>+~])\s*/g, '$1') // Odstraň mezery kolem operátorů
            .replace(/;}/g, '}') // Odstraň poslední středník
            .trim();
        } else if (language === 'javascript') {
          // Jednoduchá JS minifikace (zachová funkčnost)
          minified = code
            .replace(/\/\/.*$/gm, '') // Odstraň jednořádkové komentáře
            .replace(/\/\*[\s\S]*?\*\//g, '') // Odstraň víceřádkové komentáře
            .replace(/\s+/g, ' ') // Sjednoť whitespace
            .replace(/\s*([{}():;,=+\-*/<>!&|])\s*/g, '$1') // Odstraň mezery kolem operátorů
            .trim();
        } else {
          return { success: false, error: 'Nepodporovaný jazyk' };
        }

        const originalSize = code.length;
        const minifiedSize = minified.length;
        const saved = originalSize - minifiedSize;
        const percent = ((saved / originalSize) * 100).toFixed(1);

        return {
          success: true,
          original: code,
          minified,
          originalSize,
          minifiedSize,
          saved,
          percent: `${percent}%`,
          formattedOutput: `📦 Minifikováno: ${originalSize} → ${minifiedSize} bajtů (ušetřeno ${percent}%)\n\`\`\`${language}\n${minified}\n\`\`\``,
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * Zformátuje kód
   */
  format_code: {
    schema: {
      description: 'Format/beautify code with proper indentation',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Code to format',
          },
          language: {
            type: 'string',
            enum: ['html', 'css', 'javascript', 'json'],
            description: 'Language of the code',
          },
          indentSize: {
            type: 'number',
            description: 'Spaces per indent level (default: 2)',
          },
        },
        required: ['code', 'language'],
      },
    },
    handler: async ({ code, language, indentSize = 2 }) => {
      try {
        let formatted;
        const indent = ' '.repeat(indentSize);

        if (language === 'json') {
          // JSON formátování
          const parsed = JSON.parse(code);
          formatted = JSON.stringify(parsed, null, indentSize);
        } else if (language === 'html') {
          // Jednoduchý HTML formátovač
          let level = 0;
          const lines = [];
          const tokens = code.replace(/>\s*</g, '>\n<').split('\n');

          for (let token of tokens) {
            token = token.trim();
            if (!token) continue;

            // Snížit indent pro uzavírací tagy
            if (token.match(/^<\//)) {
              level = Math.max(0, level - 1);
            }

            lines.push(indent.repeat(level) + token);

            // Zvýšit indent pro otevírací tagy (ne self-closing)
            if (token.match(/^<[^/!]/) && !token.match(/\/\s*>$/) && !token.match(/^<(br|hr|img|input|meta|link)/i)) {
              level++;
            }
          }

          formatted = lines.join('\n');
        } else if (language === 'css') {
          // CSS formátování
          formatted = code
            .replace(/\s*{\s*/g, ' {\n')
            .replace(/\s*}\s*/g, '\n}\n\n')
            .replace(/;\s*/g, ';\n')
            .replace(/,\s*/g, ',\n')
            .split('\n')
            .map((line, i, arr) => {
              line = line.trim();
              if (!line) return '';
              // Odsaď pravidla uvnitř selektorů
              const prevLines = arr.slice(0, i).join('');
              const openBraces = (prevLines.match(/{/g) || []).length;
              const closeBraces = (prevLines.match(/}/g) || []).length;
              const level = Math.max(0, openBraces - closeBraces);
              if (line === '}') return indent.repeat(Math.max(0, level - 1)) + line;
              return indent.repeat(level) + line;
            })
            .filter(line => line.trim())
            .join('\n');
        } else if (language === 'javascript') {
          // Základní JS formátování
          let level = 0;
          const lines = [];
          const tokens = code
            .replace(/([{;])\s*/g, '$1\n')
            .replace(/\s*}/g, '\n}')
            .split('\n');

          for (let token of tokens) {
            token = token.trim();
            if (!token) continue;

            if (token.startsWith('}')) {
              level = Math.max(0, level - 1);
            }

            lines.push(indent.repeat(level) + token);

            if (token.endsWith('{')) {
              level++;
            }
          }

          formatted = lines.join('\n');
        } else {
          formatted = code;
        }

        return {
          success: true,
          original: code,
          formatted,
          language,
          formattedOutput: `✨ Zformátováno (${language}):\n\`\`\`${language}\n${formatted}\n\`\`\``,
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * Zkontroluje přístupnost
   */
  check_accessibility: {
    schema: {
      description: 'Check HTML for common accessibility issues (a11y)',
      parameters: {
        type: 'object',
        properties: {
          html: {
            type: 'string',
            description: 'HTML code to check (optional - uses preview if not provided)',
          },
        },
      },
    },
    handler: async ({ html }) => {
      try {
        let content = html;

        // Pokud není HTML, vezmi z náhledu
        if (!content) {
          const previewFrame = document.querySelector('#previewContainer iframe');
          if (previewFrame && previewFrame.contentDocument) {
            content = previewFrame.contentDocument.body.innerHTML;
          } else {
            content = state.get('editor.code') || '';
          }
        }

        const issues = [];
        const warnings = [];
        const passed = [];

        // Kontroly
        const checks = [
          {
            name: 'Images without alt',
            test: () => {
              const matches = content.match(/<img(?![^>]*alt=)[^>]*>/gi) || [];
              return matches.length > 0 ? `${matches.length} obrázků bez alt atributu` : null;
            },
            severity: 'error',
          },
          {
            name: 'Empty alt attributes',
            test: () => {
              const matches = content.match(/<img[^>]*alt=["']\s*["'][^>]*>/gi) || [];
              return matches.length > 0 ? `${matches.length} obrázků s prázdným alt` : null;
            },
            severity: 'warning',
          },
          {
            name: 'Links without text',
            test: () => {
              const matches = content.match(/<a[^>]*>\s*<\/a>/gi) || [];
              return matches.length > 0 ? `${matches.length} prázdných odkazů` : null;
            },
            severity: 'error',
          },
          {
            name: 'Missing form labels',
            test: () => {
              const inputs = (content.match(/<input(?![^>]*type=["'](?:hidden|submit|button|reset)["'])[^>]*>/gi) || []).length;
              const labels = (content.match(/<label/gi) || []).length;
              return inputs > labels ? `${inputs - labels} inputů možná bez label` : null;
            },
            severity: 'warning',
          },
          {
            name: 'Missing lang attribute',
            test: () => {
              return !content.match(/<html[^>]*lang=["'][^"']+["']/i) ? 'Chybí lang atribut na <html>' : null;
            },
            severity: 'warning',
          },
          {
            name: 'Missing heading structure',
            test: () => {
              const h1 = (content.match(/<h1/gi) || []).length;
              return h1 === 0 ? 'Chybí hlavní nadpis <h1>' : null;
            },
            severity: 'warning',
          },
          {
            name: 'Buttons without text',
            test: () => {
              const matches = content.match(/<button[^>]*>\s*<\/button>/gi) || [];
              return matches.length > 0 ? `${matches.length} tlačítek bez textu` : null;
            },
            severity: 'error',
          },
          {
            name: 'Missing viewport meta',
            test: () => {
              return !content.match(/<meta[^>]*viewport/i) ? 'Chybí viewport meta tag' : null;
            },
            severity: 'warning',
          },
          {
            name: 'Inline onclick handlers',
            test: () => {
              const matches = content.match(/\bonclick\s*=/gi) || [];
              return matches.length > 0 ? `${matches.length} inline onclick handlerů (preferuj addEventListener)` : null;
            },
            severity: 'info',
          },
          {
            name: 'ARIA roles present',
            test: () => {
              const matches = content.match(/\brole=["'][^"']+["']/gi) || [];
              return matches.length > 0 ? null : 'pass';
            },
            severity: 'pass',
            passMessage: 'ARIA role atributy nalezeny',
          },
        ];

        for (const check of checks) {
          const result = check.test();
          if (result === null) {
            passed.push(check.name);
          } else if (result === 'pass') {
            passed.push(check.passMessage || check.name);
          } else if (check.severity === 'error') {
            issues.push(`❌ ${check.name}: ${result}`);
          } else if (check.severity === 'warning') {
            warnings.push(`⚠️ ${check.name}: ${result}`);
          } else {
            warnings.push(`ℹ️ ${check.name}: ${result}`);
          }
        }

        const score = Math.round((passed.length / checks.length) * 100);

        return {
          success: true,
          score,
          issues,
          warnings,
          passed,
          total: checks.length,
          formattedOutput: `
♿ **Kontrola přístupnosti** (skóre: ${score}%)

${issues.length > 0 ? '**Chyby:**\n' + issues.join('\n') + '\n' : ''}
${warnings.length > 0 ? '**Varování:**\n' + warnings.join('\n') + '\n' : ''}
${passed.length > 0 ? '**✅ OK:** ${passed.length} kontrol prošlo' : ''}
          `.trim(),
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },
};
