/**
 * Template Manager Service
 * Handles template CRUD operations
 */

import { state } from '../../../core/state.js';
import { Modal } from '../../../ui/components/Modal.js';
import { eventBus } from '../../../core/events.js';

export class TemplateManager {
  /**
   * Get all templates (built-in + custom)
   */
  static getTemplates() {
    const builtInTemplates = {
      blank: {
        name: 'Prázdná stránka',
        description: 'Jednoduchá prázdná HTML stránka',
        code: `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nová stránka</title>
</head>
<body>
    <h1>Ahoj světe!</h1>
</body>
</html>`
      },
      bootstrap: {
        name: 'Bootstrap šablona',
        description: 'Responsive stránka s Bootstrap 5',
        code: `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bootstrap Stránka</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-5">
        <h1>Bootstrap Template</h1>
        <p class="lead">Začněte zde...</p>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`
      },
      landing: {
        name: 'Landing Page',
        description: 'Moderní landing page s hero sekcí',
        code: `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Landing Page</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui; }
        .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 2rem;
        }
        .hero h1 { font-size: 3rem; margin-bottom: 1rem; }
        .hero p { font-size: 1.5rem; margin-bottom: 2rem; }
        .cta-button {
            background: white;
            color: #667eea;
            padding: 1rem 2rem;
            border: none;
            border-radius: 8px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="hero">
        <div>
            <h1>Vaše úžasná nabídka</h1>
            <p>Něco skvělého zde</p>
            <button class="cta-button">Začít nyní</button>
        </div>
    </div>
</body>
</html>`
      }
    };

    const customTemplates = state.customTemplates || {};

    return { builtInTemplates, customTemplates };
  }

  /**
   * Save custom template
   */
  static saveTemplate(id, data) {
    if (!state.customTemplates) {
      state.customTemplates = {};
    }

    state.customTemplates[id] = {
      name: data.name,
      description: data.description || '',
      code: data.code,
      createdAt: data.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    // Save to localStorage
    try {
      localStorage.setItem('customTemplates', JSON.stringify(state.customTemplates));
    } catch (error) {
      console.error('Error saving template:', error);
    }

    return true;
  }

  /**
   * Delete custom template
   */
  static deleteTemplate(id) {
    if (!state.customTemplates || !state.customTemplates[id]) {
      return false;
    }

    delete state.customTemplates[id];

    // Update localStorage
    try {
      localStorage.setItem('customTemplates', JSON.stringify(state.customTemplates));
    } catch (error) {
      console.error('Error deleting template:', error);
    }

    return true;
  }

  /**
   * Load custom templates from localStorage
   */
  static loadCustomTemplates() {
    try {
      const saved = localStorage.getItem('customTemplates');
      if (saved) {
        state.customTemplates = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading custom templates:', error);
    }
  }

  /**
   * Apply template to editor
   */
  static applyTemplate(code) {
    eventBus.emit('editor:set-value', code);
    eventBus.emit('toast:show', {
      message: '✅ Šablona použita',
      type: 'success'
    });
  }
}

// Load custom templates on init
TemplateManager.loadCustomTemplates();
