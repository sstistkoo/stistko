/**
 * Templates Service
 * Handles HTML templates and prompt management
 */

import { eventBus } from '../../../core/events.js';

export class TemplatesService {
  constructor(aiPanel) {
    this.panel = aiPanel; // Reference to AIPanel for shared functionality
    console.log('[TemplatesService] Initialized');
  }

  /**
   * Handle template selection
   * @param {string} template - Template name (blank, landing, form, dashboard, portfolio)
   */
  handleTemplate(template) {
    const templates = {
      blank: this.getBlankTemplate(),
      landing: this.getLandingTemplate(),
      form: this.getFormTemplate(),
      dashboard: this.getDashboardTemplate(),
      portfolio: this.getPortfolioTemplate()
    };

    const templateCode = templates[template];
    if (templateCode) {
      eventBus.emit('editor:setContent', { content: templateCode });
      this.panel.hide();
      eventBus.emit('toast:show', {
        message: `Šablona "${template}" byla vložena`,
        type: 'success'
      });
    }
  }

  /**
   * Get blank HTML template
   * @returns {string} HTML code
   */
  getBlankTemplate() {
    return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nová stránka</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      padding: 20px;
    }
  </style>
</head>
<body>
  <h1>Nová stránka</h1>
  <p>Začněte psát váš obsah zde...</p>
</body>
</html>`;
  }

  /**
   * Get landing page template
   * @returns {string} HTML code
   */
  getLandingTemplate() {
    return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing Page</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
    }
    .hero {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1.25rem;
      margin-bottom: 2rem;
      opacity: 0.9;
    }
    .cta-button {
      padding: 15px 40px;
      font-size: 1.1rem;
      background: white;
      color: #667eea;
      border: none;
      border-radius: 50px;
      cursor: pointer;
      font-weight: bold;
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: scale(1.05);
    }
  </style>
</head>
<body>
  <section class="hero">
    <h1>Váš úžasný produkt</h1>
    <p>Řešení, které změní váš život</p>
    <button class="cta-button">Začít zdarma</button>
  </section>
</body>
</html>`;
  }

  /**
   * Get form template
   * @returns {string} HTML code
   */
  getFormTemplate() {
    return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kontaktní formulář</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .form-container {
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      max-width: 500px;
      width: 100%;
    }
    h2 {
      margin-bottom: 20px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
    }
    input, textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 5px;
      font-family: inherit;
    }
    button {
      width: 100%;
      padding: 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 1rem;
      cursor: pointer;
    }
    button:hover {
      background: #5568d3;
    }
  </style>
</head>
<body>
  <div class="form-container">
    <h2>Kontaktujte nás</h2>
    <form>
      <div class="form-group">
        <label for="name">Jméno</label>
        <input type="text" id="name" required>
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" required>
      </div>
      <div class="form-group">
        <label for="message">Zpráva</label>
        <textarea id="message" rows="5" required></textarea>
      </div>
      <button type="submit">Odeslat</button>
    </form>
  </div>
</body>
</html>`;
  }

  /**
   * Get dashboard template
   * @returns {string} HTML code
   */
  getDashboardTemplate() {
    return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f5;
    }
    .dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      padding: 20px;
    }
    .card {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .card h3 {
      margin-bottom: 10px;
      color: #333;
    }
    .card .value {
      font-size: 2rem;
      font-weight: bold;
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <div class="card">
      <h3>Celkem uživatelů</h3>
      <div class="value">1,234</div>
    </div>
    <div class="card">
      <h3>Aktivní dnes</h3>
      <div class="value">567</div>
    </div>
    <div class="card">
      <h3>Nové registrace</h3>
      <div class="value">89</div>
    </div>
    <div class="card">
      <h3>Úspěšnost</h3>
      <div class="value">94%</div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Get portfolio template
   * @returns {string} HTML code
   */
  getPortfolioTemplate() {
    return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
    }
    header {
      text-align: center;
      padding: 60px 20px;
      background: #667eea;
      color: white;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
    }
    .projects {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      padding: 60px 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .project {
      border: 1px solid #ddd;
      border-radius: 10px;
      overflow: hidden;
      transition: transform 0.2s;
    }
    .project:hover {
      transform: translateY(-5px);
      box-shadow: 0 5px 20px rgba(0,0,0,0.1);
    }
    .project-image {
      height: 200px;
      background: #667eea;
    }
    .project-content {
      padding: 20px;
    }
  </style>
</head>
<body>
  <header>
    <h1>Jan Novák</h1>
    <p>Web Developer & Designer</p>
  </header>
  <div class="projects">
    <div class="project">
      <div class="project-image"></div>
      <div class="project-content">
        <h3>Projekt 1</h3>
        <p>Popis projektu zde...</p>
      </div>
    </div>
    <div class="project">
      <div class="project-image"></div>
      <div class="project-content">
        <h3>Projekt 2</h3>
        <p>Popis projektu zde...</p>
      </div>
    </div>
    <div class="project">
      <div class="project-image"></div>
      <div class="project-content">
        <h3>Projekt 3</h3>
        <p>Popis projektu zde...</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Use predefined prompt
   * @param {string} promptId - Prompt identifier
   */
  usePrompt(promptId) {
    const prompts = {
      'html-structure': 'Vytvoř sémantickou HTML strukturu pro moderní webovou stránku s hlavičkou, navigací, hlavním obsahem a patičkou.',
      'css-layout': 'Vytvoř responzivní layout pomocí CSS Grid, který bude mít sidebar a hlavní obsah. Na mobilech se sidebar zobrazí pod obsahem.',
      'js-function': 'Napiš JavaScriptovou funkci, která validuje emailovou adresu a vrací true/false.',
      'accessibility': 'Zkontroluj tento kód z hlediska přístupnosti (ARIA, sémantika, klávesnice) a navrhni konkrétní vylepšení.',
      'performance': 'Analyzuj výkon tohoto kódu a navrhni optimalizace (lazy loading, minifikace, caching).'
    };

    const promptText = prompts[promptId];
    if (promptText) {
      // Switch to chat tab
      const chatTab = this.panel.modal.element.querySelector('[data-tab="chat"]');
      if (chatTab) {
        chatTab.click();
      }

      // Fill input and focus
      const chatInput = this.panel.modal.element.querySelector('#aiChatInput');
      if (chatInput) {
        chatInput.value = promptText;
        chatInput.focus();
      }
    }
  }

  /**
   * Add custom prompt (interactive)
   */
  addCustomPrompt() {
    // Show prompt for custom prompt name
    const name = prompt('Název promptu:');
    if (!name) return;

    // Show prompt for text
    const text = prompt('Text promptu:');
    if (!text) return;

    // Add to list (this would normally save to localStorage)
    const promptsList = this.panel.modal.element.querySelector('#promptsList');
    if (promptsList) {
      const promptItem = document.createElement('div');
      promptItem.className = 'prompt-item';
      promptItem.dataset.prompt = name.toLowerCase().replace(/\s+/g, '-');
      promptItem.innerHTML = `
        <div class="prompt-name">${name}</div>
        <div class="prompt-text">${text.substring(0, 50)}...</div>
      `;
      promptsList.appendChild(promptItem);

      // Attach click handler
      promptItem.addEventListener('click', () => {
        const chatInput = this.panel.modal.element.querySelector('#aiChatInput');
        if (chatInput) {
          chatInput.value = text;
          const chatTab = this.panel.modal.element.querySelector('[data-tab="chat"]');
          if (chatTab) chatTab.click();
        }
      });

      eventBus.emit('toast:show', {
        message: 'Prompt byl přidán',
        type: 'success'
      });
    }
  }

  /**
   * Get prompt selection meta-prompt for AI to decide which format to use
   */
  getPromptSelectionMetaPrompt(userMessage, codeLength, lineCount) {
    return `Jsi AI asistent který analyzuje požadavky uživatele a rozhoduje o formátu odpovědi.

📝 ZADÁNÍ UŽIVATELE: "${userMessage}"
📊 AKTUÁLNÍ STAV:
- Kód v editoru: ${codeLength} znaků, ${lineCount} řádků
- Editor: ${codeLength > 0 ? 'obsahuje kód' : 'prázdný'}

🎯 ANALÝZA POŽADAVKU:

1. **Detekce typu požadavku:**
   ${this.detectRequestType(userMessage)}

2. **Doporučený formát odpovědi:**
   ${this.recommendResponseFormat(userMessage, codeLength)}

📋 INSTRUKCE:
- Pokud uživatel žádá NOVÝ projekt → vrať kompletní HTML od <!DOCTYPE> po </html>
- Pokud uživatel žádá ÚPRAVU → použij EDIT:LINES nebo SEARCH/REPLACE formát
- Pokud uživatel žádá DEBUG → analyzuj problém a navrhni řešení pomocí EDIT:LINES

Odpověz podle typu požadavku a použij správný formát.`;
  }

  /**
   * Detect type of user request
   */
  detectRequestType(userMessage) {
    const lower = userMessage.toLowerCase();

    // READ-ONLY requests - user wants description, not editing
    if (lower.match(/popiš|popis|vysvětli|vysvětlení|analyzuj|analýza|co je|co dělá|jak funguje|jaký je|ukáž|zobraz|přečti/)) {
      return '📖 POPIS - uživatel chce vysvětlení/analýzu kódu, NE editaci';
    }
    if (lower.match(/vytvoř|udělej|naprogramuj|nový|nová|nové/)) {
      return '🆕 NOVÝ PROJEKT - uživatel chce vytvořit něco od začátku';
    }
    if (lower.match(/uprav|změň|oprav|přidej|odeber|vymaž/)) {
      return '✏️ ÚPRAVA - uživatel chce upravit existující kód';
    }
    if (lower.match(/debug|chyba|nefunguje|problém|error/)) {
      return '🐛 DEBUG - uživatel řeší problém v kódu';
    }
    if (lower.match(/optimalizuj|zlepši|refaktoruj/)) {
      return '⚡ OPTIMALIZACE - uživatel chce vylepšit kód';
    }

    return '❓ NEJASNÝ - potřeba další kontext';
  }

  /**
   * Recommend response format
   */
  recommendResponseFormat(userMessage, codeLength) {
    const lower = userMessage.toLowerCase();

    if (codeLength === 0 || lower.match(/vytvoř|nový|naprogramuj/)) {
      return '✅ KOMPLETNÍ HTML - vrať celý soubor od začátku do konce';
    }
    if (lower.match(/uprav|změň/) && codeLength > 0) {
      return '✅ EDIT:LINES - uprav konkrétní řádky pomocí OLD/NEW bloků';
    }
    if (lower.match(/přidej/) && codeLength > 0) {
      return '✅ EDIT:LINES - přidej nový kód na konkrétní místo';
    }

    return '✅ SEARCH/REPLACE - najdi a nahraď konkrétní části kódu';
  }

  /**
   * Select appropriate prompt based on context
   */
  selectPromptByContext(userMessage, hasCode, hasHistory, currentCode) {
    const codeLength = currentCode?.length || 0;
    const lineCount = currentCode?.split('\n').length || 0;
    const lower = userMessage.toLowerCase();

    // READ-ONLY mode - user wants description/analysis, not editing
    if (hasCode && lower.match(/popiš|popis|vysvětli|vysvětlení|analyzuj|analýza|co je|co dělá|jak funguje|jaký je|ukáž|zobraz|přečti/)) {
      return `📖 POPIS KÓDU - Jen vysvětli, NE editace!

🎯 ÚKOL: Popsat/vysvětlit existující kód

📊 KONTEXT:
- Kód má ${codeLength} znaků, ${lineCount} řádků
- Uživatel chce POPIS/ANALÝZU, ne změny!

✅ CO DĚLAT:
- Přečti a analyzuj kód
- Vysvětli co kód dělá
- Popiš strukturu a funkce
- Vysvětli jak jednotlivé části fungují
- Můžeš doporučit vylepšení (ale neimplementuj je!)

❌ CO NEDĚLAT:
- NEPIŠ žádné EDIT:LINES bloky!
- NEMĚŇ kód!
- NEVRACEJ upravený kód!
- Jen ODPOVÍDEJ TEXTEM!

� POVINNÁ STRUKTURA ODPOVĚDI:

# Popis stránky

## 🎯 Účel a hlavní funkce
(Stručný přehled - 2-3 věty)

## 📋 Struktura dokumentu

### HTML hlavička
Co obsahuje <head> sekce - meta tagy, title, styly.

### Obsah stránky
Hlavní sekce v <body> - navigace, hlavní obsah, formuláře.

### Skripty
Jaké JS funkce jsou použity a kdy se spouštějí.

## 🎨 Styling a design

- **CSS přístup**: Inline, external, CSS proměnné
- **Barevné schéma**: Jaké barvy jsou použity
- **Responzivita**: Jak se stránka přizpůsobuje
- **Vizuální prvky**: Tlačítka, karty, grafika

## ⚙️ Funkčnost a interaktivita

### JavaScript funkce
Seznam hlavních funkcí s popisem co dělají.

### Události a interakce
Co se děje při kliknutí, načtení, změnách.

### Automatické procesy
Co se spouští samo (výpočty, aktualizace).

## 💡 Klíčové prvky

1. **První důležitý prvek**: Popis a účel
2. **Druhý důležitý prvek**: Popis a účel
3. **Třetí důležitý prvek**: Popis a účel

## 🔍 Technické detaily

- **Technologie**: HTML5, CSS3, Vanilla JS
- **Knihovny**: Pokud nějaké jsou
- **API**: Pokud se používají
- **Zvláštnosti**: Zajímavé implementace

## ✨ Shrnutí

Závěrečné zhodnocení - co stránka dělá celkově a jak dobře je implementovaná.

---

⚠️ KRITICKÉ:
- KAŽDÁ SEKCE ZAČÍNÁ ## NA NOVÉM ŘÁDKU
- MEZI SEKCEMI JE PRÁZDNÝ ŘÁDEK
- POUŽÍVEJ MARKDOWN (##, ###, -, **, číslování)
- NE JEDEN DLOUHÝ ODSTAVEC!
- STRUKTURUJ TEXT DO SEKCÍ!`;
    }

    // If no code or user asks for new project
    if (!hasCode || lower.match(/vytvoř|udělej|naprogramuj|nový/)) {
      return `🆕 NOVÝ PROJEKT - Vytvoř kompletní funkční aplikaci

📋 POŽADAVKY:
- Vytvoř CELÝ soubor od <!DOCTYPE html> až po </html>
- Zahrň všechny sekce: <head>, <style>, <body>, <script>
- Moderní, responzivní design
- Interaktivní prvky (formuláře, tlačítka, atd.)

✅ MUSÍ OBSAHOVAT:
- Úplnou HTML strukturu
- Styling pro všechny prvky
- JavaScript pro interaktivitu
- Event listenery správně připojené
- Validaci vstupů
- Error handling

❌ NEPIŠ:
- "...zkráceno" - vrať všechno!
- Částečný kód
- Jen HTML bez funkčnosti

💡 TIP: Kód může být i 1000+ řádků, token limit to zvládne!`;
    }

    // If has code, use edit mode
    return `📝 ÚPRAVA KÓDU (${codeLength} znaků, ${lineCount} řádků)

🚨 POVINNÝ FORMÁT - AUTOMATICKÝ SYSTÉM 🚨

System automaticky aplikuje změny podle tohoto formátu:

\\\`\\\`\\\`EDIT:LINES:5-5
OLD:
<title>Původní název</title>
NEW:
<title>Nový název</title>
\\\`\\\`\\\`

📋 PRAVIDLA:
✅ Každá změna = jeden EDIT:LINES blok
✅ OLD musí přesně odpovídat aktuálnímu kódu
✅ Můžeš použít více bloků najednou
❌ NIKDY nepiš "...", "// ...", "zkráceno" v OLD bloku
❌ NIKDY nepřeskakuj řádky

💡 TIP: Pro větší změny použij více EDIT:LINES bloků`;
  }
}

