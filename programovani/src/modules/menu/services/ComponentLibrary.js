/**
 * Component Library Service
 * Handles component snippets and AI component generation
 */

import { Modal } from '../../../ui/components/Modal.js';
import { eventBus } from '../../../core/events.js';
import { createElement } from '../../../utils/dom.js';

export class ComponentLibrary {
  /**
   * Get component library
   */
  static getComponents() {
    return {
      button: {
        name: 'Tlačítko',
        category: 'Základní',
        code: '<button class="btn btn-primary">Klikni na mě</button>'
      },
      card: {
        name: 'Card',
        category: 'Layout',
        code: `<div class="card" style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; max-width: 300px;">
  <h3>Nadpis karty</h3>
  <p>Obsah karty zde...</p>
  <button>Akce</button>
</div>`
      },
      navbar: {
        name: 'Navigace',
        category: 'Layout',
        code: `<nav style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; background: #333; color: white;">
  <div class="logo">Logo</div>
  <ul style="display: flex; gap: 2rem; list-style: none; margin: 0;">
    <li><a href="#" style="color: white; text-decoration: none;">Domů</a></li>
    <li><a href="#" style="color: white; text-decoration: none;">O nás</a></li>
    <li><a href="#" style="color: white; text-decoration: none;">Kontakt</a></li>
  </ul>
</nav>`
      },
      form: {
        name: 'Formulář',
        category: 'Formuláře',
        code: `<form style="max-width: 400px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
  <div style="margin-bottom: 16px;">
    <label style="display: block; margin-bottom: 8px;">Jméno:</label>
    <input type="text" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
  </div>
  <div style="margin-bottom: 16px;">
    <label style="display: block; margin-bottom: 8px;">Email:</label>
    <input type="email" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
  </div>
  <button type="submit" style="width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
    Odeslat
  </button>
</form>`
      },
      grid: {
        name: 'Grid Layout',
        category: 'Layout',
        code: `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; padding: 20px;">
  <div style="background: #f0f0f0; padding: 20px; border-radius: 8px;">Item 1</div>
  <div style="background: #f0f0f0; padding: 20px; border-radius: 8px;">Item 2</div>
  <div style="background: #f0f0f0; padding: 20px; border-radius: 8px;">Item 3</div>
</div>`
      },
      modal: {
        name: 'Modal Dialog',
        category: 'UI Komponenty',
        code: `<!-- Modal -->
<div id="myModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000;">
  <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%;">
    <h2>Modal Title</h2>
    <p>Modal content goes here...</p>
    <button onclick="document.getElementById('myModal').style.display='none'">Close</button>
  </div>
</div>

<!-- Trigger Button -->
<button onclick="document.getElementById('myModal').style.display='block'">Open Modal</button>`
      },
      tabs: {
        name: 'Tabs',
        category: 'UI Komponenty',
        code: `<div class="tabs">
  <div class="tab-buttons" style="display: flex; gap: 0; border-bottom: 2px solid #ddd;">
    <button class="tab-btn active" onclick="openTab(event, 'tab1')" style="padding: 12px 24px; border: none; background: none; cursor: pointer; border-bottom: 2px solid #007bff;">Tab 1</button>
    <button class="tab-btn" onclick="openTab(event, 'tab2')" style="padding: 12px 24px; border: none; background: none; cursor: pointer;">Tab 2</button>
    <button class="tab-btn" onclick="openTab(event, 'tab3')" style="padding: 12px 24px; border: none; background: none; cursor: pointer;">Tab 3</button>
  </div>
  <div id="tab1" class="tab-content" style="padding: 20px;">Content 1</div>
  <div id="tab2" class="tab-content" style="display: none; padding: 20px;">Content 2</div>
  <div id="tab3" class="tab-content" style="display: none; padding: 20px;">Content 3</div>
</div>

<script>
function openTab(evt, tabName) {
  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(c => c.style.display = 'none');

  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(b => b.style.borderBottom = 'none');

  document.getElementById(tabName).style.display = 'block';
  evt.currentTarget.style.borderBottom = '2px solid #007bff';
}
</script>`
      }
    };
  }

  /**
   * Insert component into editor
   */
  static insertComponent(code) {
    eventBus.emit('editor:insert', code);
    eventBus.emit('toast:show', {
      message: '✅ Komponenta vložena',
      type: 'success'
    });
  }

  /**
   * Generate component using AI
   */
  static async generateAIComponent(description) {
    if (!window.AI || typeof window.AI.ask !== 'function') {
      eventBus.emit('toast:show', {
        message: 'AI modul není dostupný',
        type: 'error'
      });
      return null;
    }

    try {
      const prompt = `Vygeneruj HTML komponentu podle tohoto popisu: "${description}".

Požadavky:
- Použij inline CSS styly
- Komponenta musí být responzivní
- Použij moderní CSS (flexbox/grid)
- Přidej komentáře
- Vrať POUZE HTML kód, bez vysvětlení

HTML kód:`;

      const response = await window.AI.ask(prompt);

      // Extract code from response
      let code = response;

      // Try to extract code from markdown blocks
      const codeMatch = code.match(/```(?:html)?\n?([\s\S]*?)```/);
      if (codeMatch) {
        code = codeMatch[1].trim();
      }

      return code;
    } catch (error) {
      console.error('AI generation error:', error);
      eventBus.emit('toast:show', {
        message: 'Chyba při generování komponenty',
        type: 'error'
      });
      return null;
    }
  }

  /**
   * Escape HTML
   */
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
