/**
 * Prompt Selector Service
 * Intelligent selection of AI prompts based on context and user intent
 */

import { StringUtils } from '../utils/stringUtils.js';

export class PromptSelector {
  constructor() {
    this.criticalFormatRule = `🚨 ABSOLUTNÍ ZÁKAZ VYSVĚTLOVÁNÍ! 🚨

❌ NIKDY NESMÍŠ:
- Psát "Timto změním...", "Tady je úprava..."
- Vysvětlovat co děláš PŘED kódem
- Používat zkratky "// ...", "/* ... */", "..." v OLD blocích

✅ JEDINÁ POVOLENÁ ODPOVĚĎ:
\`\`\`EDIT:LINES:1-5
OLD:
[PŘESNÝ původní kód]
NEW:
[nový kód]
\`\`\``;
  }

  /**
   * Select appropriate prompt based on user message and context
   */
  selectPrompt(userMessage, hasCode, hasHistory, currentCode) {
    const msg = userMessage ? userMessage.toLowerCase() : '';
    const codeLength = currentCode ? currentCode.length : 0;
    const lineCount = currentCode ? currentCode.split('\n').length : 0;

    // Debug/Error fixing
    if (msg.match(/\b(nefunguje|chyba|error|bug|oprav|fix)\b/)) {
      return this.getDebugPrompt(codeLength, lineCount);
    }

    // Styling/Design
    if (msg.match(/\b(barva|color|design|styl|css|vzhled)\b/)) {
      return this.getStylePrompt(codeLength, lineCount);
    }

    // Refactoring
    if (msg.match(/\b(optimalizuj|refactor|vyčisti|zlepši)\b/)) {
      return this.getRefactorPrompt(codeLength, lineCount);
    }

    // Add feature
    if (msg.match(/\b(přidej|add|nový|implementuj)\b/)) {
      return this.getAddFeaturePrompt(codeLength, lineCount);
    }

    // New project
    if (!hasCode || codeLength < 100) {
      return this.getNewProjectPrompt();
    }

    // Default edit mode
    return this.getEditPrompt(codeLength, lineCount);
  }

  getDebugPrompt(codeLength, lineCount) {
    return `${this.criticalFormatRule}

🐛 DEBUG & ERROR FIXING
- Kód: ${codeLength} znaků, ${lineCount} řádků
- Najdi a oprav chyby pomocí EDIT:LINES formátu
- Zkontroluj: syntax errors, duplicate variables, missing event listeners`;
  }

  getStylePrompt(codeLength, lineCount) {
    return `${this.criticalFormatRule}

🎨 DESIGN & STYLING
- ${lineCount} řádků kódu
- Změň CSS/design pomocí EDIT:LINES
- Moderní design, responzivní, accessible`;
  }

  getRefactorPrompt(codeLength, lineCount) {
    return `${this.criticalFormatRule}

♻️ CODE REFACTORING
- ${codeLength} znaků kódu
- Refaktoruj pomocí EDIT:LINES
- DRY, ES6+, lepší názvy, odstranění duplicit`;
  }

  getAddFeaturePrompt(codeLength, lineCount) {
    return `${this.criticalFormatRule}

➕ ADD NEW FEATURE
- Existující kód: ${lineCount} řádků
- Přidej novou funkcionalitu pomocí EDIT:LINES
- Při přidávání zahrň do OLD i následující řádky!`;
  }

  getNewProjectPrompt() {
    return `${this.criticalFormatRule}

🆕 NOVÝ PROJEKT
- Vytvoř kompletní funkční aplikaci
- Zahrň: HTML struktura, CSS styling, JavaScript logiku
- Kompletní od <!DOCTYPE html> po </html>
- Všechny funkce musí fungovat!`;
  }

  getEditPrompt(codeLength, lineCount) {
    return `${this.criticalFormatRule}

📝 ÚPRAVA KÓDU
- ${codeLength} znaků, ${lineCount} řádků
- Uprav kód pomocí EDIT:LINES formátu
- OLD musí přesně odpovídat aktuálnímu kódu`;
  }

  /**
   * Build system prompt with context
   */
  buildSystemPrompt(userMessage, currentCode, filesContext, historyContext) {
    const hasCode = currentCode && currentCode.trim().length > 100;
    const hasHistory = historyContext && historyContext.length > 0;

    const selectedPrompt = this.selectPrompt(userMessage, hasCode, hasHistory, currentCode);

    return `Jsi expert programátor a full-stack vývojář.

📁 KONTEXT PROJEKTU:
${filesContext || ''}

💾 Aktuální kód v editoru:
\`\`\`html
${currentCode ? StringUtils.addLineNumbers(currentCode) : '(prázdný editor)'}
\`\`\`

💬 ${historyContext || ''}

🎯 TVŮJ ÚKOL:
${selectedPrompt}

📋 PRAVIDLA:
✅ Kompletní funkční kód
✅ Moderní ES6+ syntax
✅ Event listenery správně připojené
✅ Validace vstupů
❌ Žádné duplicitní proměnné
❌ Žádný nedokončený kód`;
  }
}
