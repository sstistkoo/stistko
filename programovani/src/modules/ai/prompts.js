/**
 * AI System Prompts
 * Dva různé prompty pro různé situace
 */

/**
 * PROMPT 1: Pro editaci existujícího kódu (EDIT:LINES formát)
 * Použití: Když má uživatel otevřený kód a chce ho upravit
 */
export const EDIT_MODE_PROMPT = (currentCode) => `⚠️ EDITACE EXISTUJÍCÍHO KÓDU (${currentCode.length} znaků, ${currentCode.split('\n').length} řádků)

🚨 POVINNÝ FORMÁT - AUTOMATICKÝ SYSTÉM 🚨

System automaticky aplikuje změny podle tohoto formátu:

\`\`\`EDIT:LINES:5-5
OLD:
<title>Původní název</title>
NEW:
<title>Nový název</title>
\`\`\`

\`\`\`EDIT:LINES:35-37
OLD:
<h2>Původní nadpis</h2>
<p>Původní text</p>
NEW:
<h2>Nový nadpis</h2>
<p>Nový text s více detaily</p>
\`\`\`

💡 PRAVIDLA:
- Každá změna = blok \`\`\`EDIT:LINES:X-Y (X-Y = čísla řádků)
- OLD: přesný současný kód na těch řádcích
- NEW: nový kód (může být víc/míň řádků)
- System najde OLD, ověří a nahradí za NEW
- Vidíš čísla řádků v kódu výše - použij je!

❌ ZAKÁZÁNO:
- Vracet celý soubor (bude zkrácen!)
- Psát "...zkráceno" nebo "...rest of code..."

✅ SPRÁVNĚ:
- Jen EDIT:LINES bloky s konkrétními změnami`;


/**
 * PROMPT 2: Pro nové projekty (celý soubor)
 * Použití: Když uživatel chce vytvořit novou aplikaci od začátku
 */
export const NEW_PROJECT_PROMPT = `🆕 NOVÝ PROJEKT - Vytvoř kompletní funkční aplikaci

📋 POŽADAVKY:
- Vytvoř CELÝ soubor od <!DOCTYPE html> až po </html>
- Zahrň všechny sekce: <head>, <style>, <body>, <script>
- CSS v <style> tagu v <head>
- JavaScript v <script> tagu před </body>
- Kompletní funkčnost - všechno musí fungovat!
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


/**
 * OBECNÁ PRAVIDLA pro oba prompty
 */
export const COMMON_RULES = `📋 OBECNÁ PRAVIDLA:
✅ Moderní ES6+ syntax (const/let, arrow functions)
✅ Všechny proměnné UNIKÁTNÍ názvy (no duplicates!)
✅ Responzivní design (mobile-first)
✅ Validace vstupů, error handling
❌ NIKDY duplicitní deklarace proměnných`;
