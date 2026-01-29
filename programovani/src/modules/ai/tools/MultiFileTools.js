/**
 * Multi-File Tools - Nástroje pro práci s více soubory
 */

import { state } from '../../../core/state.js';
import { eventBus } from '../../../core/events.js';

export const multiFileTools = {
  /**
   * Přečte obsah konkrétního souboru
   */
  read_file: {
    schema: {
      description: 'Read content of a specific file by name or path',
      parameters: {
        type: 'object',
        properties: {
          fileName: {
            type: 'string',
            description: 'Name or path of the file to read (e.g., "style.css", "script.js")',
          },
          lineStart: {
            type: 'number',
            description: 'Optional: start line number (1-indexed)',
          },
          lineEnd: {
            type: 'number',
            description: 'Optional: end line number (1-indexed)',
          },
        },
        required: ['fileName'],
      },
    },
    handler: async ({ fileName, lineStart, lineEnd }) => {
      try {
        const openFiles = state.get('files.tabs') || [];
        const file = openFiles.find(f =>
          f.name === fileName ||
          f.name.endsWith(fileName) ||
          fileName.includes(f.name)
        );

        if (!file) {
          return {
            success: false,
            error: `Soubor '${fileName}' nebyl nalezen`,
            availableFiles: openFiles.map(f => f.name),
          };
        }

        let content = file.content || '';

        // Pokud jsou specifikovány řádky, vyber jen ty
        if (lineStart !== undefined || lineEnd !== undefined) {
          const lines = content.split('\n');
          const start = (lineStart || 1) - 1;
          const end = lineEnd || lines.length;
          content = lines.slice(start, end).join('\n');
        }

        const lineCount = content.split('\n').length;

        return {
          success: true,
          fileName: file.name,
          content,
          lineCount,
          formattedOutput: `📄 **${file.name}** (${lineCount} řádků):\n\`\`\`${file.language || 'html'}\n${content}\n\`\`\``,
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
   * Získá seznam všech otevřených souborů s jejich metadaty
   */
  list_files: {
    schema: {
      description: 'List all open files with their metadata',
      parameters: {
        type: 'object',
        properties: {
          includeContent: {
            type: 'boolean',
            description: 'Include file content preview (default: false)',
          },
        },
      },
    },
    handler: async ({ includeContent = false }) => {
      try {
        const openFiles = state.get('files.tabs') || [];
        const activeFileId = state.get('files.active');

        const fileList = openFiles.map(f => {
          const lines = (f.content || '').split('\n').length;
          const size = (f.content || '').length;

          return {
            id: f.id,
            name: f.name,
            language: f.language || 'html',
            lines,
            size,
            isActive: f.id === activeFileId,
            preview: includeContent ? (f.content || '').substring(0, 200) + '...' : null,
          };
        });

        const formattedOutput = `📁 Otevřené soubory (${openFiles.length}):\n\n` +
          fileList.map(f =>
            `${f.isActive ? '👉 ' : '   '}**${f.name}** (${f.language}, ${f.lines} řádků, ${f.size} znaků)${f.preview ? '\n   ' + f.preview : ''}`
          ).join('\n');

        return {
          success: true,
          count: openFiles.length,
          files: fileList,
          activeFile: fileList.find(f => f.isActive),
          formattedOutput,
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
   * Upraví konkrétní soubor (ne aktivní)
   */
  edit_file: {
    schema: {
      description: 'Edit a specific file (switch to it, apply changes, and optionally switch back)',
      parameters: {
        type: 'object',
        properties: {
          fileName: {
            type: 'string',
            description: 'Name of the file to edit',
          },
          content: {
            type: 'string',
            description: 'New content for the file',
          },
          switchBack: {
            type: 'boolean',
            description: 'Switch back to original file after edit (default: false)',
          },
        },
        required: ['fileName', 'content'],
      },
    },
    handler: async ({ fileName, content, switchBack = false }) => {
      try {
        const openFiles = state.get('files.tabs') || [];
        const currentActiveId = state.get('files.active');

        const file = openFiles.find(f =>
          f.name === fileName ||
          f.name.endsWith(fileName) ||
          fileName.includes(f.name)
        );

        if (!file) {
          return {
            success: false,
            error: `Soubor '${fileName}' nebyl nalezen`,
            availableFiles: openFiles.map(f => f.name),
          };
        }

        // Přepni na soubor
        state.set('files.active', file.id);
        eventBus.emit('file:switch', { fileId: file.id });

        // Počkej na přepnutí
        await new Promise(resolve => setTimeout(resolve, 100));

        // Nastav nový obsah
        state.set('editor.code', content);
        eventBus.emit('editor:change', { code: content });

        // Aktualizuj soubor v tabs
        const updatedTabs = openFiles.map(f =>
          f.id === file.id ? { ...f, content } : f
        );
        state.set('files.tabs', updatedTabs);

        // Pokud je switchBack true, přepni zpět
        if (switchBack && currentActiveId !== file.id) {
          await new Promise(resolve => setTimeout(resolve, 100));
          state.set('files.active', currentActiveId);
          eventBus.emit('file:switch', { fileId: currentActiveId });
        }

        return {
          success: true,
          fileName: file.name,
          linesChanged: content.split('\n').length,
          switchedBack: switchBack,
          formattedOutput: `✅ Soubor **${file.name}** upraven (${content.split('\n').length} řádků)${switchBack ? ', přepnuto zpět' : ''}`,
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
   * Vytvoří nový soubor
   */
  create_file: {
    schema: {
      description: 'Create a new file with specified name and content',
      parameters: {
        type: 'object',
        properties: {
          fileName: {
            type: 'string',
            description: 'Name of the new file (e.g., "styles.css", "app.js")',
          },
          content: {
            type: 'string',
            description: 'Initial content for the file',
          },
          language: {
            type: 'string',
            description: 'Programming language (html, css, javascript, etc.)',
          },
          switchTo: {
            type: 'boolean',
            description: 'Switch to the new file after creation (default: true)',
          },
        },
        required: ['fileName', 'content'],
      },
    },
    handler: async ({ fileName, content, language, switchTo = true }) => {
      try {
        const openFiles = state.get('files.tabs') || [];

        // Zkontroluj jestli soubor již existuje
        const existingFile = openFiles.find(f => f.name === fileName);
        if (existingFile) {
          return {
            success: false,
            error: `Soubor '${fileName}' již existuje`,
          };
        }

        // Detekuj jazyk z přípony pokud není specifikován
        if (!language) {
          if (fileName.endsWith('.css')) language = 'css';
          else if (fileName.endsWith('.js')) language = 'javascript';
          else if (fileName.endsWith('.html')) language = 'html';
          else if (fileName.endsWith('.json')) language = 'json';
          else language = 'html';
        }

        // Vytvoř nový soubor
        const newFile = {
          id: Date.now(),
          name: fileName,
          content,
          language,
        };

        // Přidej do tabs
        const updatedTabs = [...openFiles, newFile];
        state.set('files.tabs', updatedTabs);

        // Přepni na nový soubor pokud switchTo
        if (switchTo) {
          state.set('files.active', newFile.id);
          state.set('editor.code', content);
          eventBus.emit('file:switch', { fileId: newFile.id });
        }

        eventBus.emit('file:created', { file: newFile });

        return {
          success: true,
          fileName: newFile.name,
          fileId: newFile.id,
          lines: content.split('\n').length,
          switchedTo: switchTo,
          formattedOutput: `✅ Vytvořen nový soubor **${fileName}** (${content.split('\n').length} řádků)${switchTo ? ', přepnuto na něj' : ''}`,
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
   * Přepne na jiný soubor
   */
  switch_file: {
    schema: {
      description: 'Switch to a different file',
      parameters: {
        type: 'object',
        properties: {
          fileName: {
            type: 'string',
            description: 'Name of the file to switch to',
          },
        },
        required: ['fileName'],
      },
    },
    handler: async ({ fileName }) => {
      try {
        const openFiles = state.get('files.tabs') || [];
        const file = openFiles.find(f =>
          f.name === fileName ||
          f.name.endsWith(fileName) ||
          fileName.includes(f.name)
        );

        if (!file) {
          return {
            success: false,
            error: `Soubor '${fileName}' nebyl nalezen`,
            availableFiles: openFiles.map(f => f.name),
          };
        }

        // Přepni na soubor
        state.set('files.active', file.id);
        state.set('editor.code', file.content || '');
        eventBus.emit('file:switch', { fileId: file.id });

        return {
          success: true,
          fileName: file.name,
          lines: (file.content || '').split('\n').length,
          formattedOutput: `👉 Přepnuto na **${file.name}** (${(file.content || '').split('\n').length} řádků)`,
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
   * Získá obsah všech souborů najednou
   */
  read_all_files: {
    schema: {
      description: 'Read content of all open files (use carefully with large projects)',
      parameters: {
        type: 'object',
        properties: {
          maxFilesSize: {
            type: 'number',
            description: 'Maximum total size in characters (default: 50000)',
          },
        },
      },
    },
    handler: async ({ maxFilesSize = 50000 }) => {
      try {
        const openFiles = state.get('files.tabs') || [];
        const activeFileId = state.get('files.active');

        let totalSize = 0;
        const filesContent = [];

        for (const file of openFiles) {
          const content = file.content || '';
          totalSize += content.length;

          if (totalSize > maxFilesSize) {
            filesContent.push({
              name: file.name,
              content: '[PŘESKOČENO - překročen limit velikosti]',
              truncated: true,
            });
            continue;
          }

          filesContent.push({
            name: file.name,
            language: file.language || 'html',
            lines: content.split('\n').length,
            size: content.length,
            isActive: file.id === activeFileId,
            content,
          });
        }

        const formattedOutput = filesContent.map(f =>
          `📄 **${f.name}**${f.isActive ? ' (aktivní)' : ''} (${f.lines || 0} řádků):\n\`\`\`${f.language || 'html'}\n${f.content}\n\`\`\``
        ).join('\n\n---\n\n');

        return {
          success: true,
          fileCount: filesContent.length,
          totalSize,
          files: filesContent,
          formattedOutput,
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
