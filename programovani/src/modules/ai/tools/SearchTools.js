/**
 * Search Tools - Nástroje pro vyhledávání v kódu
 */

import { state } from '../../../core/state.js';

export const searchTools = {
  /**
   * Vyhledá text v otevřených souborech
   */
  grep_search: {
    schema: {
      description: 'Search for a text pattern across open files (case-insensitive)',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The text pattern to search for',
          },
          filePath: {
            type: 'string',
            description: 'Optional: limit search to specific file',
          },
          caseSensitive: {
            type: 'boolean',
            description: 'Make search case-sensitive (default: false)',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return (default: 20)',
          },
        },
        required: ['query'],
      },
    },
    handler: async ({ query, filePath, caseSensitive = false, maxResults = 20 }) => {
      try {
        const openFiles = state.get('openFiles') || [];
        const results = [];

        // Filter files if filePath is specified
        const filesToSearch = filePath
          ? openFiles.filter((f) => f.path === filePath || f.path.endsWith(filePath))
          : openFiles;

        if (filesToSearch.length === 0) {
          return {
            success: false,
            error: filePath ? `File '${filePath}' not found` : 'No open files to search',
          };
        }

        const searchQuery = caseSensitive ? query : query.toLowerCase();

        for (const file of filesToSearch) {
          const content = file.content || '';
          const lines = content.split('\n');

          for (let i = 0; i < lines.length && results.length < maxResults; i++) {
            const line = lines[i];
            const searchLine = caseSensitive ? line : line.toLowerCase();

            if (searchLine.includes(searchQuery)) {
              results.push({
                file: file.path,
                line: i + 1,
                content: line.trim(),
                context: {
                  before: i > 0 ? lines[i - 1].trim() : null,
                  after: i < lines.length - 1 ? lines[i + 1].trim() : null,
                },
              });
            }
          }
        }

        // Vytvoř formátovaný výstup
        const formattedOutput = results.length > 0
          ? `Nalezeno ${results.length} výskytů "${query}" v ${filesToSearch.length} souborech:\n\n` +
            results.map(r =>
              `📄 **${r.file}** (řádek ${r.line}):\n` +
              `   ${r.content}\n`
            ).join('\n')
          : `Nenalezeno žádné výsledky pro "${query}"`;

        return {
          success: true,
          query,
          caseSensitive,
          filesSearched: filesToSearch.length,
          matchCount: results.length,
          formattedOutput,
          matches: results,
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
   * Najde definice funkcí/tříd
   */
  find_definitions: {
    schema: {
      description: 'Find function, class, or variable definitions in open files',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the function, class, or variable to find',
          },
          type: {
            type: 'string',
            enum: ['function', 'class', 'variable', 'any'],
            description: 'Type of definition to search for',
          },
        },
        required: ['name'],
      },
    },
    handler: async ({ name, type = 'any' }) => {
      try {
        const openFiles = state.get('openFiles') || [];
        const results = [];

        // Patterns for different definition types
        const patterns = {
          function: [
            new RegExp(`function\\s+${name}\\s*\\(`),
            new RegExp(`const\\s+${name}\\s*=\\s*\\(`),
            new RegExp(`let\\s+${name}\\s*=\\s*\\(`),
            new RegExp(`${name}\\s*:\\s*function\\s*\\(`),
            new RegExp(`${name}\\(.*\\)\\s*{`),
          ],
          class: [new RegExp(`class\\s+${name}\\s*{`), new RegExp(`class\\s+${name}\\s+extends`)],
          variable: [
            new RegExp(`const\\s+${name}\\s*=`),
            new RegExp(`let\\s+${name}\\s*=`),
            new RegExp(`var\\s+${name}\\s*=`),
          ],
        };

        const searchPatterns = type === 'any' ? [...patterns.function, ...patterns.class, ...patterns.variable] : patterns[type] || [];

        for (const file of openFiles) {
          const content = file.content || '';
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            for (const pattern of searchPatterns) {
              if (pattern.test(line)) {
                results.push({
                  file: file.path,
                  line: i + 1,
                  content: line.trim(),
                  type: type === 'any' ? 'detected' : type,
                });
                break;
              }
            }
          }
        }

        // Formátovaný výstup
        const formattedOutput = results.length > 0
          ? `Nalezeno ${results.length} definic "${name}":\n\n` +
            results.map(r =>
              `📄 **${r.file}** (řádek ${r.line}):\n` +
              `   ${r.content}\n`
            ).join('\n')
          : `Nenalezena definice pro "${name}"`;

        return {
          success: true,
          name,
          type,
          count: results.length,
          formattedOutput,
          definitions: results,
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
   * Získá strukturu souboru (funkce, třídy)
   */
  get_file_structure: {
    schema: {
      description: 'Get a structural overview of a file (functions, classes, imports)',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file to analyze',
          },
        },
        required: ['filePath'],
      },
    },
    handler: async ({ filePath }) => {
      try {
        const openFiles = state.get('openFiles') || [];
        const file = openFiles.find((f) => f.path === filePath || f.path.endsWith(filePath));

        if (!file) {
          return {
            success: false,
            error: `File '${filePath}' not found`,
          };
        }

        const content = file.content || '';
        const lines = content.split('\n');
        const structure = {
          imports: [],
          functions: [],
          classes: [],
          exports: [],
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          // Imports
          if (line.startsWith('import ')) {
            structure.imports.push({ line: i + 1, content: line });
          }

          // Functions
          if (/^(export\s+)?(async\s+)?function\s+\w+/.test(line) || /^(export\s+)?const\s+\w+\s*=\s*(async\s*)?\(/.test(line)) {
            structure.functions.push({ line: i + 1, content: line });
          }

          // Classes
          if (/^(export\s+)?class\s+\w+/.test(line)) {
            structure.classes.push({ line: i + 1, content: line });
          }

          // Exports
          if (line.startsWith('export ') && !line.includes('function') && !line.includes('class')) {
            structure.exports.push({ line: i + 1, content: line });
          }
        }

        // Formátovaný výstup
        let formattedOutput = `📋 Struktura souboru **${filePath}** (${lines.length} řádků):\n\n`;

        if (structure.imports.length > 0) {
          formattedOutput += `**Importy (${structure.imports.length}):**\n`;
          structure.imports.forEach(imp => {
            formattedOutput += `  - Řádek ${imp.line}: ${imp.content}\n`;
          });
          formattedOutput += '\n';
        }

        if (structure.classes.length > 0) {
          formattedOutput += `**Třídy (${structure.classes.length}):**\n`;
          structure.classes.forEach(cls => {
            formattedOutput += `  - Řádek ${cls.line}: ${cls.content}\n`;
          });
          formattedOutput += '\n';
        }

        if (structure.functions.length > 0) {
          formattedOutput += `**Funkce (${structure.functions.length}):**\n`;
          structure.functions.forEach(fn => {
            formattedOutput += `  - Řádek ${fn.line}: ${fn.content}\n`;
          });
          formattedOutput += '\n';
        }

        if (structure.exports.length > 0) {
          formattedOutput += `**Exporty (${structure.exports.length}):**\n`;
          structure.exports.forEach(exp => {
            formattedOutput += `  - Řádek ${exp.line}: ${exp.content}\n`;
          });
        }

        return {
          success: true,
          filePath,
          totalLines: lines.length,
          formattedOutput,
          structure,
          summary: {
            imports: structure.imports.length,
            functions: structure.functions.length,
            classes: structure.classes.length,
            exports: structure.exports.length,
          },
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
