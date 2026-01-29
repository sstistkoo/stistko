/**
 * File Operations Service
 * Handles file export, import, zip operations
 */

import { state } from '../../../core/state.js';
import { eventBus } from '../../../core/events.js';

export class FileOperations {
  /**
   * Export project as ZIP
   */
  static async exportAsZip() {
    console.log('Exporting project as ZIP...');
    eventBus.emit('toast:show', {
      message: 'Export funkce bude implementována',
      type: 'info'
    });
  }

  /**
   * Share project
   */
  static shareProject() {
    const htmlCode = state.files[state.activeFile]?.content || '';

    if (!htmlCode) {
      eventBus.emit('toast:show', {
        message: 'Není co sdílet',
        type: 'warning'
      });
      return;
    }

    eventBus.emit('toast:show', {
      message: 'Sdílení bude implementováno',
      type: 'info'
    });
  }

  /**
   * Create .gitignore file
   */
  static createGitignore() {
    const gitignoreContent = `# Dependencies
node_modules/
package-lock.json
yarn.lock

# Build outputs
dist/
build/
*.bundle.js

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*

# Environment
.env
.env.local`;

    eventBus.emit('file:create', {
      name: '.gitignore',
      content: gitignoreContent,
      language: 'plaintext'
    });

    eventBus.emit('toast:show', {
      message: '✅ .gitignore vytvořen',
      type: 'success'
    });
  }
}
