import { state } from '../../../core/state.js';
import { CodeEditorService } from './CodeEditorService.js';

/**
 * PromptBuilder - Vytváří a spravuje AI prompty
 *
 * Funkce:
 * - Generuje system prompty podle kontextu
 * - Připravuje context (kód, soubory, historie)
 * - Detekuje typ úkolu (nový projekt, úprava, analýza)
 * - Formátuje kód s čísly řádků
 */
export class PromptBuilder {
  constructor(aiPanel) {
    this.aiPanel = aiPanel;
  }

  /**
   * Zkrátí kód inteligentně pro kontext - deleguje na CodeEditorService
   */
  truncateCodeIntelligently(code, maxChars = 3000) {
    return this.aiPanel.codeEditorService.truncateCodeIntelligently(code, maxChars);
  }

  /**
   * Přidá čísla řádků k kódu - deleguje na CodeEditorService
   */
  addLineNumbers(code, metadata = null) {
    return this.aiPanel.codeEditorService.addLineNumbers(code, metadata);
  }

  /**
   * Vytvoří system prompt pro chat režim (obecná konverzace)
   */
  buildChatModePrompt(message, hasHistory) {
    // For pokec chat, we don't need complex history context
    const historyContext = '';

    return `Jsi přátelský AI asistent pro volnou konverzaci. Tvoje jméno je "Pokec AI" a jsi tu, abys pomohl s čímkoliv.

💬 REŽIM: VOLNÁ KONVERZACE

Můžeš mluvit o čemkoliv:
🎯 Vzdělávání - věda, historie, jazyky, matematika
🎨 Kreativita - psaní, nápady, brainstorming
🌍 Svět - cestování, kultury, zajímavosti
💡 Životní rady - motivace, produktivita, tipy
🎮 Zábava - filmy, hry, knihy, hudba
💻 Technologie - když se uživatel zeptá na programování
❓ Cokoliv jiného - prostě pokecáme!

📋 PRAVIDLA:
✅ Odpovídej v češtině, přátelsky a neformálně
✅ Buď vtipný a přirozený, když to sedí
✅ Ptej se na upřesnění, když je otázka nejasná
✅ Sdílej zajímavosti a fakta
✅ Pokud uživatel chce, pomoz s kreativními úkoly
✅ Navazuj na předchozí konverzaci
❌ Nebuď nudný nebo příliš formální
❌ Nekritizuj - buď podporující

${historyContext ? `\n📜 HISTORIE KONVERZACE:\n${historyContext}\n` : ''}

Odpověz přátelsky a užitečně. Pokud je to vhodné, použij emoji pro lepší vyjádření. 😊`;
  }

  /**
   * Vytvoří files context z otevřených souborů
   */
  buildFilesContext(openFiles, activeFileId) {
    if (!openFiles || openFiles.length === 0) {
      return '';
    }

    let filesContext = '';

    // Pokud je více souborů, přidej jejich obsah
    if (openFiles.length > 1) {
      const MAX_TOTAL_SIZE = 30000; // Max 30k znaků pro všechny soubory
      let totalSize = 0;
      const filesWithContent = [];

      for (const f of openFiles) {
        const content = f.content || '';
        if (totalSize + content.length < MAX_TOTAL_SIZE) {
          filesWithContent.push({
            name: f.name,
            language: f.language || 'html',
            lines: content.split('\n').length,
            content,
            isActive: f.id === activeFileId,
          });
          totalSize += content.length;
        } else {
          filesWithContent.push({
            name: f.name,
            truncated: true,
            isActive: f.id === activeFileId,
          });
        }
      }

      filesContext += `\n\nOtevřené soubory (${openFiles.length}):\n\n`;
      filesWithContent.forEach(f => {
        if (f.truncated) {
          filesContext += `📄 **${f.name}**${f.isActive ? ' (aktivní)' : ''} - [obsah vynechán kvůli velikosti]\n\n`;
        } else {
          filesContext += `📄 **${f.name}**${f.isActive ? ' (aktivní)' : ''} (${f.lines} řádků, ${f.language}):\n\`\`\`${f.language}\n${f.content}\n\`\`\`\n\n`;
        }
      });
    } else {
      // Jen jeden soubor - základní info
      const file = openFiles[0];
      filesContext = `\n📄 Pracuješ se souborem: **${file.name}** (${file.language})\n`;
    }

    return filesContext;
  }

  /**
   * Formátuje kód pro context podle typu úpravy
   * 🔴 DŮLEŽITÉ: Pro editaci VŽDY posíláme celý kód, aby AI mohl přesně identifikovat co změnit!
   */
  formatCodeContext(currentCode, message, hasCode) {
    if (!currentCode) {
      return '(prázdný editor)';
    }

    const msg = message ? message.toLowerCase() : '';

    // Detect if AI will likely use EDIT:LINES mode
    // Expanded keywords for better detection of edit requests
    const willEdit = hasCode && (
      msg.match(/změň|change|uprav|edit|oprav|fix|přidej|add|odstraň|odstran|remove|smaž|smaz|delete|vymaž|vymaz|nahraď|nahrad|replace|vyhod|vyhoď|zruš|zrus|skryj|vyřaď|vyrad|zbav\s+se|pryč|pryc|hide|clear|erase|get\s+rid|throw\s+out|ať|vzhled|styl|barv|font|mezera|velikost|pozic|margin|padding/) ||
      msg.includes('celý soubor') ||
      msg.includes('celý kód') ||
      msg.includes('cely soubor') ||
      msg.includes('cely kod') ||
      msg.includes('zobraz vše') ||
      msg.includes('zobraz vse')
    );

    // Detect READ-ONLY requests (description, analysis) - need full code!
    const isReadOnly = hasCode && msg.match(/popiš|popis|vysvětli|vysvětlení|analyzuj|analýza|co je|co dělá|jak funguje|jaký je|ukáž|zobraz|přečti/);

    // 🔴 VŽDY posílej celý kód - AI potřebuje vidět kompletní kontext pro přesné úpravy
    // Limit zvýšen na 50000 znaků (~12500 tokenů) - moderní modely to zvládnou
    const MAX_CODE_LENGTH = 50000;

    if (currentCode.length <= MAX_CODE_LENGTH) {
      // Kód se vejde celý - pošli ho s čísly řádků
      console.log('[PromptBuilder] Sending full code:', currentCode.length, 'chars');
      return this.addLineNumbers(currentCode);
    }

    // Pro velmi velké soubory (>50k) - inteligentní zkrácení
    console.log('[PromptBuilder] Code too large, truncating from', currentCode.length, 'to ~', MAX_CODE_LENGTH);

    // Pokud je to edit request, zkus najít relevantní sekce
    if (willEdit || isReadOnly) {
      // Zkus najít klíčová slova z požadavku v kódu
      const keywords = msg.match(/\.[\w-]+|#[\w-]+|\b\w{4,}\b/g) || [];
      const relevantSections = this.findRelevantSections(currentCode, keywords);

      if (relevantSections) {
        console.log('[PromptBuilder] Found relevant sections for editing');
        return relevantSections;
      }
    }

    // Fallback - truncate intelligently
    const truncated = this.truncateCodeIntelligently(currentCode, MAX_CODE_LENGTH);
    return this.addLineNumbers(
      typeof truncated === 'string' ? truncated : truncated.code,
      typeof truncated === 'object' ? truncated : null
    );
  }

  /**
   * Najde relevantní sekce kódu podle klíčových slov
   */
  findRelevantSections(code, keywords) {
    if (!keywords || keywords.length === 0) return null;

    const lines = code.split('\n');
    const relevantRanges = [];

    // Hledej řádky obsahující klíčová slova
    keywords.forEach(keyword => {
      if (keyword.length < 3) return;
      const cleanKeyword = keyword.replace(/^[.#]/, '').toLowerCase();

      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(cleanKeyword)) {
          // Přidej kontext (5 řádků před a 10 po)
          const start = Math.max(0, index - 5);
          const end = Math.min(lines.length - 1, index + 10);
          relevantRanges.push({ start, end, keyword });
        }
      });
    });

    if (relevantRanges.length === 0) return null;

    // Spoj překrývající se rozsahy
    const merged = this.mergeRanges(relevantRanges);

    // Sestav výstup
    let result = '';
    let lastEnd = -1;

    merged.forEach((range, i) => {
      if (range.start > lastEnd + 1) {
        result += `\n... (řádky ${lastEnd + 2}-${range.start} vynechány) ...\n\n`;
      }

      for (let j = range.start; j <= range.end; j++) {
        result += `${String(j + 1).padStart(4, ' ')} | ${lines[j]}\n`;
      }
      lastEnd = range.end;
    });

    if (lastEnd < lines.length - 1) {
      result += `\n... (řádky ${lastEnd + 2}-${lines.length} vynechány) ...\n`;
    }

    // Přidej info o celkovém souboru
    result = `📄 Soubor má ${lines.length} řádků, zobrazuji relevantní části:\n\n${result}`;

    return result;
  }

  /**
   * Spojí překrývající se rozsahy řádků
   */
  mergeRanges(ranges) {
    if (ranges.length === 0) return [];

    // Seřaď podle začátku
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (current.start <= last.end + 3) {
        // Spoj rozsahy
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Vybere prompt podle kontextu - vylepšená detekce
   */
  selectPromptByContext(userMessage, hasCode, hasHistory, currentCode) {
    const msg = userMessage.toLowerCase();

    // New project detection
    if (!hasCode || currentCode.trim().length < 100) {
      return 'Vytvoř KOMPLETNÍ funkční projekt (HTML + CSS + JavaScript) podle požadavku uživatele.';
    }

    // Delete/Remove operations - highest priority
    if (msg.match(/smaž|vymaž|odstraň|odstran|vyhod|vyhoď|zruš|zbav|pryč|delete|remove|hide|skryj/)) {
      return 'SMAŽ požadované elementy z kódu - použij SEARCH/REPLACE kde REPLACE je prázdný nebo bez daného elementu.';
    }

    // Style/Design changes
    if (msg.match(/barv|color|styl|style|font|velikost|size|margin|padding|border|pozad|background|vzhled|design/)) {
      return 'Uprav STYLY (CSS) podle požadavku - použij SEARCH/REPLACE pro změnu CSS vlastností.';
    }

    // Add functionality
    if (msg.match(/přidej|add|rozšiř|extend|doplň|nový|nové|novou|vytvoř.*funkc/)) {
      return 'PŘIDEJ novou funkcionalitu - použij SEARCH/REPLACE pro vložení nového kódu na správné místo.';
    }

    // Fix bugs
    if (msg.match(/oprav|fix|nefunguje|chyba|error|bug|problém|špatně|spatne/)) {
      return 'OPRAV chybu v kódu - identifikuj problém a použij SEARCH/REPLACE pro opravu.';
    }

    // Modify/Change
    if (msg.match(/změň|change|uprav|edit|modify|přepiš|prepis|nahraď|nahrad/)) {
      return 'UPRAV kód podle požadavku - použij SEARCH/REPLACE pro přesné změny.';
    }

    // Explain/Describe
    if (msg.match(/vysvětli|vysvetli|co dělá|co dela|jak funguje|popiš|popis|analyze|analyz/)) {
      return 'VYSVĚTLI co kód dělá - stručně a jasně v češtině.';
    }

    // Refactor/Improve
    if (msg.match(/refaktor|vylepši|zlepši|optimalizuj|zjednoduš|clean|čist/)) {
      return 'VYLEPŠI strukturu kódu - refaktoruj pomocí SEARCH/REPLACE bloků.';
    }

    // Default - smart detection based on code size
    if (currentCode.length > 5000) {
      return 'Pomoz s požadavkem - pro existující kód VŽDY použij SEARCH/REPLACE formát.';
    }
    return 'Pomoz uživateli - vytvoř nový kód nebo uprav existující pomocí SEARCH/REPLACE.';
  }

  /**
   * Detekce mobilního zařízení (respektuje forced mode)
   */
  isMobileDevice() {
    // Pokud je vynucený režim, použij ho
    const forcedMode = localStorage.getItem('ai_device_mode');
    if (forcedMode === 'mobile') return true;
    if (forcedMode === 'desktop') return false;
    // Jinak detekuj automaticky
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Získá informace o zařízení pro kontext
   */
  getDeviceContext() {
    const forcedMode = localStorage.getItem('ai_device_mode');
    const isMobile = this.isMobileDevice();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const orientation = screenWidth > screenHeight ? 'landscape' : 'portrait';
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    return {
      isMobile,
      forcedMode: forcedMode || 'auto',
      screenWidth,
      screenHeight,
      orientation,
      isTouch,
      deviceType: isMobile ? (screenWidth < 600 ? 'phone' : 'tablet') : 'desktop'
    };
  }

  /**
   * Vytvoří mobile-specific instrukce pro AI
   */
  buildMobileInstructions() {
    const device = this.getDeviceContext();

    if (!device.isMobile) {
      return ''; // Na desktopu nic nepřidávej
    }

    return `
## 📱 MOBILNÍ PROSTŘEDÍ - DŮLEŽITÉ!

**Uživatel pracuje na ${device.deviceType === 'phone' ? 'TELEFONU' : 'TABLETU'}** (${device.screenWidth}x${device.screenHeight}, ${device.orientation})

### 🎯 MOBILE-FIRST PRAVIDLA:

#### CSS - Vždy mobile-first:
- Základní styly pro mobil (bez media query)
- \`@media (min-width: 768px)\` pro tablet
- \`@media (min-width: 1024px)\` pro desktop
- Používej \`clamp()\` pro responzivní typography: \`font-size: clamp(1rem, 4vw, 1.5rem)\`
- Flexbox s \`flex-wrap: wrap\` pro responzivní layouty
- Grid s \`repeat(auto-fit, minmax(280px, 1fr))\`

#### Touch-friendly elementy:
- Minimální velikost tlačítek: **44x44px** (Apple HIG) nebo **48x48px** (Material)
- Dostatečné mezery mezi interaktivními prvky: min **8px**
- Větší padding pro lepší klikatelnost: \`padding: 12px 16px\`
- Touch areas: \`-webkit-tap-highlight-color: transparent\`

#### Viewport a scaling:
\`\`\`html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
\`\`\`

#### Formuláře na mobilu:
- \`font-size: 16px\` pro input (zabrání zoom na iOS)
- \`autocomplete\`, \`inputmode\`, \`enterkeyhint\` atributy
- Label VŽDY nad inputem (ne vedle)

#### Navigace:
- Hamburger menu nebo bottom navigation pro mobil
- Sticky header s menší výškou
- Back-to-top button pro dlouhé stránky

#### Výkon na mobilu:
- \`loading="lazy"\` pro obrázky
- Menší obrázky pro mobil (srcset)
- Minimalizuj JavaScript animace
- Používej \`will-change\` opatrně

### 📐 Breakpointy:
\`\`\`css
/* Mobile first - základní styly */
.container { padding: 16px; }

/* Tablet */
@media (min-width: 768px) {
  .container { padding: 24px; max-width: 720px; }
}

/* Desktop */
@media (min-width: 1024px) {
  .container { padding: 32px; max-width: 960px; }
}
\`\`\`

`;
  }

  /**
   * Vytvoří kompletní system prompt
   */
  /**
   * VS Code Copilot-style system prompt pro HTML/CSS/JS vývoj
   */
  buildCopilotStylePrompt() {
    // Přidej mobile instrukce pokud je uživatel na mobilu
    const mobileInstructions = this.buildMobileInstructions();

    return `# 🤖 HTML Studio AI Assistant (VS Code Copilot Style)
${mobileInstructions}

Jsi expertní AI programátor specializovaný na webový vývoj. Pracuješ jako GitHub Copilot v prostředí HTML Studio.

## 🎯 Tvoje role
- **Code Generation**: Generuj čistý, moderní, funkční kód
- **Code Completion**: Doplňuj kód podle kontextu
- **Bug Fixing**: Identifikuj a oprav chyby
- **Refactoring**: Vylepšuj strukturu a čitelnost kódu
- **Explanations**: Vysvětluj kód jasně a stručně

## 📚 Technické standardy

### HTML5
- Sémantické elementy: \`<header>\`, \`<nav>\`, \`<main>\`, \`<section>\`, \`<article>\`, \`<aside>\`, \`<footer>\`
- Přístupnost (a11y): \`aria-*\` atributy, \`role\`, \`alt\` texty, \`label\` pro formuláře
- Meta tagy: viewport, description, charset UTF-8
- Open Graph pro sdílení na sociálních sítích

### CSS3
- Custom Properties: \`--primary-color\`, \`--spacing-*\`, \`--font-*\`
- Modern Layout: Flexbox a CSS Grid (preferuj před float)
- Responzivní design: Mobile-first, media queries, clamp()
- Animace: \`transition\`, \`@keyframes\`, prefer-reduced-motion
- BEM naming: \`.block__element--modifier\`

### JavaScript (ES6+)
- Modern syntax: \`const\`/\`let\`, arrow functions, template literals
- DOM: \`querySelector\`, \`addEventListener\`, \`classList\`
- Async: \`async/await\`, \`fetch\`, Promises
- Moduly: \`import\`/\`export\` (pokud podporováno)
- Error handling: \`try/catch\`, validace vstupů
- NIKDY inline event handlers (\`onclick="..."\`) - vždy \`addEventListener\`

## 🛡️ Best Practices

### Bezpečnost
- Escapuj user input před vložením do DOM
- Používej \`textContent\` místo \`innerHTML\` kde je to možné
- Content Security Policy headers
- HTTPS pro externí zdroje

### Výkon
- Lazy loading pro obrázky: \`loading="lazy"\`
- Debounce/throttle pro časté eventy
- Minimalizuj DOM manipulace
- CSS containment pro komplexní komponenty

### Přístupnost (WCAG 2.1)
- Kontrastní poměr minimálně 4.5:1
- Keyboard navigation (tabindex, focus states)
- Screen reader friendly (aria-live, sr-only)
- Skip links pro navigaci

## 💡 Coding Style

\`\`\`javascript
// ✅ SPRÁVNĚ - Modern ES6+
const handleClick = (event) => {
  event.preventDefault();
  const { target } = event;
  // ...
};

document.querySelector('.btn').addEventListener('click', handleClick);

// ❌ ŠPATNĚ - Zastaralé
function handleClick(event) {
  event.preventDefault();
  var target = event.target;
}
\`\`\`

\`\`\`css
/* ✅ SPRÁVNĚ - CSS Custom Properties */
:root {
  --primary: #3b82f6;
  --spacing: 1rem;
}

.button {
  background: var(--primary);
  padding: var(--spacing);
}

/* ❌ ŠPATNĚ - Hardcoded values */
.button {
  background: #3b82f6;
  padding: 16px;
}
\`\`\`

## 🔧 Response Format

### Pro nový kód
Vrať kompletní, funkční soubor:
\`\`\`html
<!DOCTYPE html>
<html lang="cs">
<head>...</head>
<body>...</body>
</html>
\`\`\`

### Pro úpravy existujícího kódu
Použij SEARCH/REPLACE formát:
\`\`\`SEARCH
[přesný původní kód]
\`\`\`
\`\`\`REPLACE
[nový kód]
\`\`\`

## 🚫 Zakázáno
- Nekompletní kód nebo "..."
- Inline styles místo CSS tříd (kromě dynamických hodnot)
- \`var\` místo \`const\`/\`let\`
- jQuery (pokud není explicitně požadováno)
- Duplicitní deklarace proměnných
- Zastaralé HTML atributy (\`align\`, \`bgcolor\`, etc.)

## 🌐 Jazyk
- Odpovídej v **češtině**
- Komentáře v kódu mohou být anglicky nebo česky (podle kontextu)
- Buď stručný ale přesný`;
  }

  buildSystemPrompt(message, currentCode, openFiles, activeFileId, conversationMode = 'code') {
    const hasCode = currentCode && currentCode.trim().length > 0;
    const hasHistory = this.aiPanel.chatHistory.length > 1;

    // Pokud je režim "chat" (Pokeč), použij obecný system prompt
    if (conversationMode === 'chat') {
      return this.buildChatModePrompt(message, hasHistory);
    }

    // Získat režim práce z AIPanel
    const workMode = this.aiPanel.workMode || 'continue';

    // Je nový projekt pokud:
    // 1. Je explicitně zapnutý režim "new-project" NEBO
    // 2. Editor je prázdný a není historie
    const isNewOrchestratorProject = workMode === 'new-project' || (currentCode.trim() === '' && this.aiPanel.chatHistory.length <= 1);

    // Build history context
    const historyContext = this.aiPanel.chatService.buildHistoryContext(10, 200);

    // Build files context
    const filesContext = this.buildFilesContext(openFiles, activeFileId);

    // Format current code
    const formattedCode = this.formatCodeContext(currentCode, message, hasCode);

    // Detekce požadavku na popis (musí být před použitím)
    const isDescriptionRequest = message.toLowerCase().match(/popi[šs]|popis|vysv[ěe]tli|co d[ěe]l[áa]|jak funguje/);

    // Build system prompt
    let systemPrompt;

    // Základní Copilot-style prompt
    const copilotBase = this.buildCopilotStylePrompt();

    if (isNewOrchestratorProject) {
      // Extra instrukce pro explicitní režim "Nový projekt"
      const newProjectNote = workMode === 'new-project'
        ? `
## ⚠️ REŽIM: NOVÝ PROJEKT

OKAMŽITĚ vytvoř KOMPLETNÍ fungující kód podle požadavku!
- NEPIŠ analýzy, neplánuj, neptej se na detaily
- ROVNOU vytvoř celý HTML soubor od <!DOCTYPE> do </html>
- Kód MUSÍ být kompletní a funkční
- Na konci rovnou \`\`\`html blok s celým kódem!
- IGNORUJ jakýkoliv existující kód - vytváříš NOVÝ projekt!

`
        : '';

      // V režimu "Nový projekt" NEPOSÍLÁME existující kód, aby AI nebyla zmatená
      const codeSection = workMode === 'new-project'
        ? '📝 **Editor je připraven pro nový projekt** - vytvoř kompletní kód!'
        : `📝 **Aktuální kód:**\n\`\`\`html\n${formattedCode}\n\`\`\``;

      systemPrompt = `${copilotBase}

${newProjectNote}

## 🎯 AKTUÁLNÍ ÚKOL: Nový projekt

🎯 PRAVIDLO #1: Dělej PŘESNĚ to co uživatel napsal. Použij PŘESNĚ názvy které zadal.

${filesContext}

${codeSection}

💬 ${historyContext}

${isDescriptionRequest ? '📋 **DŮLEŽITÉ PRO POPIS:** Na konci odpovědi VŽDY přidej sekci "📊 SHRNUTÍ" s krátkým přehledem hlavních bodů.' : ''}`;
    } else {
      // SPECIÁLNÍ KRÁTKÝ PROMPT PRO POPIS - bez zbytečných pravidel
      if (isDescriptionRequest) {
        // Pro popis zkrátit velké soubory, aby se vešly do API limitů
        let codeForDescription = formattedCode;
        if (currentCode.length > 30000) {
          // Zkrátit na začátek + konec (max ~8000 znaků = ~2000 tokenů)
          const truncated = this.aiPanel.codeEditorService.truncateCodeIntelligently(currentCode, 8000);
          codeForDescription = truncated.code; // Extract string from object
        }

        systemPrompt = `${copilotBase}

## 🎯 AKTUÁLNÍ ÚKOL: Analýza kódu

📝 **Kód k analýze:**
\`\`\`html
${codeForDescription}
\`\`\`

💬 ${historyContext}

📋 **INSTRUKCE PRO POPIS:**
- Popiš co aplikace dělá a jaké má funkce
- Uveď hlavní sekce a jejich účel
- Zmíň použité technologie
- Vysvětli uživatelské rozhraní
- Na konci VŽDY přidej sekci "📊 SHRNUTÍ" s 3-5 hlavními body`;
      } else {
        // Standardní prompt pro úpravy kódu - nyní s Copilot base
        systemPrompt = `${copilotBase}

## 🎯 AKTUÁLNÍ ÚKOL: ${this.selectPromptByContext(message, hasCode, hasHistory, currentCode)}

${filesContext}

📝 **Aktuální kód v editoru:**
\`\`\`html
${formattedCode}
\`\`\`

💬 ${historyContext}

## 🛠️ Dostupné nástroje

### Práce se soubory
- \`read_file(fileName)\` - Přečte obsah souboru
- \`list_files()\` - Seznam otevřených souborů
- \`create_file(fileName, content, language)\` - Vytvoří nový soubor
- \`edit_file(fileName, content)\` - Upraví soubor

### Pokročilé
- \`run_code(code)\` - Spustí JavaScript (debugging)
- \`check_accessibility()\` - Kontrola přístupnosti
- \`format_code(code, language)\` - Formátování kódu`;
      }
    }

    // Add search/replace instructions if editing (ale ne pro popis!)
    if (hasCode && currentCode.trim().length > 100 && !isDescriptionRequest) {
      systemPrompt += `

## 📝 SEARCH/REPLACE Formát (pro úpravy kódu)

Máš k dispozici CELÝ kód souboru výše. Pro úpravy použij:

\`\`\`SEARCH
[přesný kód který chceš nahradit - KOPÍRUJ Z KÓDU VÝŠE]
\`\`\`
\`\`\`REPLACE
[nový kód]
\`\`\`

### ⚠️ KRITICKÁ pravidla (MUSÍŠ dodržet!):
1. **BEZ ČÍSEL ŘÁDKŮ** - kopíruj POUZE kód, NE "235|" prefix!
2. **PŘESNÉ odsazení** - mezery/tabulátory musí být identické
3. **100% SHODA** - SEARCH musí PŘESNĚ odpovídat kódu výše
4. **ŽÁDNÉ "..."** - vždy celý text, nikdy zkratky
5. **MALÉ BLOKY** - měň co nejmenší část kódu (5-15 řádků max)
6. **KONTEXT** - zahrň 1-2 řádky před/po pro jednoznačnost

### ✅ Správný příklad:
\`\`\`SEARCH
    <button class="btn">Klikni</button>
    <span class="info">Text</span>
\`\`\`
\`\`\`REPLACE
    <button class="btn primary" aria-label="Hlavní akce">Klikni</button>
    <span class="info">Text</span>
\`\`\`

### ❌ Špatně (nedělejte):
- \`235| <button>\` - číslo řádku
- \`...zbytek kódu...\` - zkratky
- Blok s 50+ řádky - příliš velké
- Jiné odsazení než originál`;
    }

    return systemPrompt;
  }

  /**
   * Detekuje meta-prompt pro výběr promptu
   */
  getPromptSelectionMetaPrompt(userMessage, codeLength, lineCount) {
    return `Analyzuj tento požadavek a zvol nejlepší přístup:

Požadavek: "${userMessage}"
Aktuální kód: ${codeLength} znaků, ${lineCount} řádků

Možnosti:
1. NEW_PROJECT - Vytvoř nový kompletní projekt
2. MODIFY - Uprav existující kód (SEARCH/REPLACE nebo EDIT:LINES)
3. EXPLAIN - Vysvětli jak kód funguje
4. DEBUG - Najdi a oprav chyby

Odpověz POUZE číslem (1-4).`;
  }
}
