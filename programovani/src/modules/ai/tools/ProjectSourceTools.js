/**
 * Project Source Tools - AI může analyzovat vlastní zdrojový kód
 * Bezpečná varianta - pouze čtení a analýza, žádné přímé editace
 */

import { state } from '../../../core/state.js';

export const projectSourceTools = {
  /**
   * Přečte zdrojový soubor z projektu (ne z editoru)
   */
  read_project_file: {
    schema: {
      description: 'Read a source file from the project codebase (not from editor). Use this to analyze your own code.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Relative path from project root (e.g., "src/modules/ai/AIPanel.js")',
          },
          startLine: {
            type: 'number',
            description: 'Starting line number (1-based, optional)',
          },
          endLine: {
            type: 'number',
            description: 'Ending line number (1-based, optional)',
          },
        },
        required: ['filePath'],
      },
    },
    handler: async ({ filePath, startLine, endLine }) => {
      try {
        // Fetch soubor z projektu
        const response = await fetch(`/${filePath}`);

        if (!response.ok) {
          return {
            success: false,
            error: `File '${filePath}' not found in project`,
            suggestion: 'Check if the path is correct. Try: src/modules/ai/AIPanel.js',
          };
        }

        let content = await response.text();
        const lines = content.split('\n');

        // Aplikuj line range pokud je specifikovaný
        if (startLine !== undefined || endLine !== undefined) {
          const start = Math.max(0, (startLine || 1) - 1);
          const end = Math.min(lines.length, endLine || lines.length);
          content = lines.slice(start, end).join('\n');

          return {
            success: true,
            filePath,
            lineRange: `${start + 1}-${end}`,
            totalLines: lines.length,
            content,
            note: '⚠️ This is project source code. To edit, use VS Code with the generated prompt.',
          };
        }

        return {
          success: true,
          filePath,
          totalLines: lines.length,
          content,
          note: '⚠️ This is project source code. To edit, use VS Code with the generated prompt.',
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
   * Analyzuje složitost zdrojového souboru projektu
   */
  analyze_project_code: {
    schema: {
      description: 'Analyze complexity and issues in project source code (your own code)',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Relative path from project root',
          },
          checks: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['complexity', 'duplicates', 'long-functions', 'unused', 'all'],
            },
            description: 'What to check for (default: all)',
          },
        },
        required: ['filePath'],
      },
    },
    handler: async ({ filePath, checks = ['all'] }) => {
      try {
        const response = await fetch(`/${filePath}`);
        if (!response.ok) {
          return {
            success: false,
            error: `File '${filePath}' not found`,
          };
        }

        const content = await response.text();
        const lines = content.split('\n');

        const issues = [];

        // Základní metriky
        const totalLines = lines.length;
        const codeLines = lines.filter((l) => l.trim() && !l.trim().startsWith('//')).length;
        const commentLines = lines.filter((l) => l.trim().startsWith('//')).length;
        const functionMatches = content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || [];
        const functionCount = functionMatches.length;

        // Check 1: Celková složitost
        if (checks.includes('all') || checks.includes('complexity')) {
          if (totalLines > 5000) {
            issues.push({
              type: 'complexity',
              severity: 'high',
              message: `File is ${totalLines} lines - consider splitting into smaller modules`,
              suggestion: 'Break into services, components, and utils',
            });
          } else if (totalLines > 2000) {
            issues.push({
              type: 'complexity',
              severity: 'medium',
              message: `File is ${totalLines} lines - getting large`,
            });
          }
        }

        // Check 2: Dlouhé funkce
        if (checks.includes('all') || checks.includes('long-functions')) {
          const functions = [];
          let currentFunction = null;
          let braceCount = 0;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Detect function start
            if (/^\s*(async\s+)?function\s+\w+|^\s*\w+\s*\([^)]*\)\s*{|^\s*const\s+\w+\s*=\s*\(/.test(line)) {
              if (currentFunction) {
                functions.push(currentFunction);
              }
              currentFunction = {
                name: line.match(/\w+/)?.[0] || 'anonymous',
                startLine: i + 1,
                lines: 0,
              };
            }

            if (currentFunction) {
              currentFunction.lines++;
              braceCount += (line.match(/{/g) || []).length;
              braceCount -= (line.match(/}/g) || []).length;

              if (braceCount === 0 && /}/.test(line)) {
                functions.push(currentFunction);
                currentFunction = null;
              }
            }
          }

          const longFunctions = functions.filter((f) => f.lines > 100);
          if (longFunctions.length > 0) {
            issues.push({
              type: 'long-functions',
              severity: 'medium',
              message: `${longFunctions.length} functions longer than 100 lines`,
              details: longFunctions.slice(0, 5).map((f) => `${f.name} (${f.lines} lines, starts at ${f.startLine})`),
            });
          }
        }

        // Check 3: Nevyužité proměnné (jednoduchá heuristika)
        if (checks.includes('all') || checks.includes('unused')) {
          const declaredVars = new Set();
          const usedVars = new Set();

          for (const line of lines) {
            // Deklarace
            const declares = line.match(/(?:const|let|var)\s+(\w+)/g);
            if (declares) {
              declares.forEach((d) => {
                const varName = d.split(/\s+/)[1];
                declaredVars.add(varName);
              });
            }

            // Použití
            const words = line.match(/\b[a-zA-Z_]\w*/g) || [];
            words.forEach((w) => usedVars.add(w));
          }

          // Možné nevyužité (musí být použito více než 1x - jednou je deklarace)
          const possiblyUnused = [];
          for (const varName of declaredVars) {
            const usage = content.match(new RegExp(`\\b${varName}\\b`, 'g'))?.length || 0;
            if (usage === 1) {
              possiblyUnused.push(varName);
            }
          }

          if (possiblyUnused.length > 0) {
            issues.push({
              type: 'unused',
              severity: 'low',
              message: `${possiblyUnused.length} possibly unused variables`,
              details: possiblyUnused.slice(0, 10),
            });
          }
        }

        // Formátovaný výstup
        const formattedOutput =
          `📊 Analýza **${filePath}**:\n\n` +
          `**Metriky:**\n` +
          `  - Celkem řádků: ${totalLines}\n` +
          `  - Kód: ${codeLines}\n` +
          `  - Komentáře: ${commentLines}\n` +
          `  - Funkce: ${functionCount}\n\n` +
          (issues.length > 0
            ? `**Nalezené problémy (${issues.length}):**\n` +
              issues
                .map((issue, idx) => {
                  let text = `${idx + 1}. [${issue.severity}] ${issue.message}\n`;
                  if (issue.details) {
                    text += `   ${Array.isArray(issue.details) ? issue.details.join('\n   ') : issue.details}\n`;
                  }
                  if (issue.suggestion) {
                    text += `   💡 ${issue.suggestion}\n`;
                  }
                  return text;
                })
                .join('\n')
            : '✅ Žádné problémy nenalezeny!');

        return {
          success: true,
          filePath,
          formattedOutput,
          metrics: {
            totalLines,
            codeLines,
            commentLines,
            functionCount,
          },
          issues,
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
   * Najdi duplicitní kód
   */
  find_code_duplicates: {
    schema: {
      description: 'Find duplicate code patterns in a project file',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'File to analyze',
          },
          minLength: {
            type: 'number',
            description: 'Minimum length of duplicate pattern (default: 5 lines)',
          },
        },
        required: ['filePath'],
      },
    },
    handler: async ({ filePath, minLength = 5 }) => {
      try {
        const response = await fetch(`/${filePath}`);
        if (!response.ok) {
          return { success: false, error: `File '${filePath}' not found` };
        }

        const content = await response.text();
        const lines = content.split('\n').map((l) => l.trim());

        const duplicates = [];

        // Hledej duplicity (jednoduchý algoritmus)
        for (let i = 0; i < lines.length - minLength; i++) {
          const pattern = lines.slice(i, i + minLength).join('\n');
          if (pattern.trim().length < 20) continue; // Skip short patterns

          for (let j = i + minLength; j < lines.length - minLength; j++) {
            const candidate = lines.slice(j, j + minLength).join('\n');
            if (pattern === candidate) {
              duplicates.push({
                pattern: pattern.substring(0, 100) + '...',
                location1: `lines ${i + 1}-${i + minLength}`,
                location2: `lines ${j + 1}-${j + minLength}`,
                length: minLength,
              });
              break;
            }
          }
        }

        const formattedOutput =
          duplicates.length > 0
            ? `🔍 Nalezeno ${duplicates.length} duplicitních bloků v **${filePath}**:\n\n` +
              duplicates
                .slice(0, 5)
                .map(
                  (d, idx) =>
                    `${idx + 1}. **${d.location1}** ≈ **${d.location2}**\n` + `   \`${d.pattern}\`\n`
                )
                .join('\n') +
              (duplicates.length > 5 ? `\n... a dalších ${duplicates.length - 5}` : '')
            : `✅ Žádné duplicity nenalezeny v **${filePath}**`;

        return {
          success: true,
          filePath,
          formattedOutput,
          count: duplicates.length,
          duplicates: duplicates.slice(0, 10),
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
   * Vygeneruje VS Code prompt pro aplikaci změn
   */
  generate_vscode_prompt: {
    schema: {
      description: 'Generate a structured prompt for VS Code Copilot to apply code changes. Use after analyzing code.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'File to modify (e.g., "src/modules/ai/AIPanel.js")',
          },
          changes: {
            type: 'array',
            description: 'List of changes to make',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['fix', 'refactor', 'optimize', 'add', 'remove'],
                  description: 'Type of change',
                },
                description: {
                  type: 'string',
                  description: 'What to change',
                },
                location: {
                  type: 'string',
                  description: 'Where in the file (e.g., "line 150-200", "function sendMessage")',
                },
              },
            },
          },
          reasoning: {
            type: 'string',
            description: 'Why these changes are needed',
          },
        },
        required: ['filePath', 'changes', 'reasoning'],
      },
    },
    handler: async ({ filePath, changes, reasoning }) => {
      try {
        // Vygeneruj strukturovaný prompt pro VS Code Copilot
        let prompt = `# Code Modification Request\n\n`;
        prompt += `**File:** \`${filePath}\`\n\n`;
        prompt += `**Reasoning:** ${reasoning}\n\n`;
        prompt += `**Changes to apply:**\n\n`;

        changes.forEach((change, index) => {
          const icon = {
            fix: '🔧',
            refactor: '♻️',
            optimize: '⚡',
            add: '➕',
            remove: '➖',
          }[change.type] || '📝';

          prompt += `${index + 1}. ${icon} **${change.type.toUpperCase()}** (${change.location})\n`;
          prompt += `   ${change.description}\n\n`;
        });

        prompt += `\n---\n`;
        prompt += `**Instructions for VS Code Copilot:**\n`;
        prompt += `Please apply the above changes to \`${filePath}\`. `;
        prompt += `Maintain existing code style, formatting, and structure. `;
        prompt += `Test after changes.\n`;

        const formattedOutput = `📋 **VS Code Copilot Prompt Generated**\n\n` +
          `Copy this prompt and paste it into VS Code Copilot:\n\n` +
          `${'```'}\n${prompt}\n${'```'}\n\n` +
          `💡 **How to use:**\n` +
          `1. Open ${filePath} in VS Code\n` +
          `2. Open Copilot Chat (Ctrl+I or Cmd+I)\n` +
          `3. Paste the prompt above\n` +
          `4. Review and accept Copilot's changes`;

        return {
          success: true,
          prompt,
          formattedOutput,
          filePath,
          changeCount: changes.length,
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
