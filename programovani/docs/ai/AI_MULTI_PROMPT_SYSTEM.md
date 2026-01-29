# AI Multi-Prompt Systém (9 Specializovaných Promptů)

## Přehled

Aplikace obsahuje **inteligentní systém s 9 různými AI prompty** podle kontextu a záměru uživatele.

### 🧠 Automatická Detekce Záměru

System analyzuje uživatelovu zprávu a automaticky vybere nejvhodnější prompt:

| Klíčová slova | Prompt | Ikona |
|---------------|--------|-------|
| nefunguje, chyba, error, bug, oprav, fix | **Debug Mode** | 🐛 |
| barva, design, styl, css, vzhled, font | **Style Mode** | 🎨 |
| optimalizuj, refactor, vyčisti, cleanup | **Refactor Mode** | ♻️ |
| přidej, add, nový, implementuj, feature | **Add Feature** | ➕ |
| komentář, dokumentace, vysvětli | **Documentation** | 📝 |
| test, testing, validace, validation | **Testing Mode** | 🧪 |
| performance, rychlost, optimize, zrychli | **Performance** | 🔧 |
| *komplexní/nejasný požadavek* | **AI Analysis** | 🤔 |
| *jiné* | **Edit/New Project** | ⚠️/🆕 |

---

## 🆕 Speciální: AI Analysis Mode

### 🤔 META-PROMPT - AI Určí Správný Prompt

**Aktivace:**
- Komplexní požadavek (15+ slov)
- Vícenásobný záměr ("a zároveň", "a také", "plus")
- Nejasná formulace

**Co dělá:**
1. AI nejdřív **analyzuje** požadavek
2. **Vybere** nejvhodnější prompt(y)
3. **Vysvětlí** proč
4. **Provede** úkol podle vybraného promptu

**Příklad použití:**
```
User: "Potřebuju aby formulář fungoval správně a vypadal líp
       a zároveň byl rychlejší a měl validaci"

System: Detekuje komplexnost → 🤔 AI ANALYSIS MODE

AI Odpověď:
  KROK 1 - ANALÝZA:
  Požadavek kombinuje debug (fungoval), style (vypadal líp),
  performance (rychlejší) a testing (validaci).

  KROK 2 - VYBRANÝ PROMPT:
  Použiji postupně: 🐛 DEBUG → 🧪 TESTING → 🔧 PERFORMANCE → 🎨 STYLE

  KROK 3 - DŮVOD:
  Funkčnost (DEBUG) musí být nejdřív, pak validace (TESTING),
  pak optimalizace (PERFORMANCE), nakonec vzhled (STYLE).

  KROK 4 - ŘEŠENÍ:
  [Konkrétní EDIT:LINES bloky pro všechny změny]
```

**Výhody:**
✅ Zvládne komplexní požadavky
✅ AI sama určí správný přístup
✅ Vysvětlí svoje rozhodnutí
✅ Kombinuje více promptů

---

## 📋 Detailní Popis Promptů

### 1. 🐛 DEBUG MODE - Oprava Chyb

**Aktivace:** `"nefunguje", "chyba", "error", "bug", "oprav", "fix", "debug"`

**Co dělá:**
- Hledá syntax errors, runtime errors, logic bugs
- Identifikuje příčinu problému
- Vrací opravenou verzi pomocí EDIT:LINES

**Příklad použití:**
```
User: "Tlačítko nefunguje, hází error"
AI: Použije 🐛 DEBUG MODE
```

**Zaměření:**
- Syntax chyby (chybějící závorky, středníky)
- Reference errors (undefined proměnné)
- Type errors (nesprávné typy)
- Logic errors (špatná podmínka)
- Event listener problémy
- Scope issues

---

### 2. 🎨 STYLE MODE - Design & CSS

**Aktivace:** `"barva", "design", "styl", "css", "vzhled", "font", "layout", "responzivní"`

**Co dělá:**
- Mění jen CSS/styling
- Žádné strukturální změny
- Moderní CSS best practices

**Příklad použití:**
```
User: "Změň barvu tlačítek na modrou"
AI: Použije 🎨 STYLE MODE
```

**Best Practices:**
- Moderní CSS (flexbox, grid, custom properties)
- Responzivní design (media queries)
- Accessibility (kontrast, focus states)
- Smooth transitions
- Mobile-first approach

---

### 3. ♻️ REFACTOR MODE - Optimalizace Kódu

**Aktivace:** `"optimalizuj", "refactor", "vyčisti", "cleanup", "zlepši", "reorganizuj"`

**Co dělá:**
- Zlepšuje čitelnost kódu
- Aplikuje DRY (Don't Repeat Yourself)
- Modern ES6+ syntax
- Performance improvements

**Příklad použití:**
```
User: "Refaktoruj tento kód"
AI: Použije ♻️ REFACTOR MODE
```

**Zaměření:**
- Jednodušší funkce (max 20 řádků)
- Výstižné názvy proměnných
- Odstranění dead code
- Arrow functions, destructuring
- Better error handling

---

### 4. ➕ ADD FEATURE - Nová Funkčnost

**Aktivace:** `"přidej", "add", "nový", "implementuj", "vytvoř", "feature"`

**Co dělá:**
- Přidává nové funkce k existujícímu kódu
- Zachovává stávající funkčnost
- Kompletní implementace (HTML + CSS + JS)

**Příklad použití:**
```
User: "Přidej dark mode"
AI: Použije ➕ ADD FEATURE MODE
```

**Best Practices:**
- Nesmaž existující funkce
- Nové ID/classes musí být unikátní
- Event listeners správně připojené
- Error handling
- Accessibility (ARIA labels)

---

### 5. 📝 DOCUMENTATION MODE - Komentáře

**Aktivace:** `"komentář", "dokumentace", "vysvětli", "popis"`

**Co dělá:**
- Přidává JSDoc komentáře
- Vysvětluje složitou logiku
- TODO/FIXME/NOTE značky

**Příklad použití:**
```
User: "Přidej komentáře k funkcím"
AI: Použije 📝 DOCUMENTATION MODE
```

**Co přidá:**
- JSDoc pro funkce
- Inline komentáře pro složitou logiku
- Vysvětlení algoritmů
- Popis parametrů a return values

---

### 6. 🧪 TESTING MODE - Testy & Validace

**Aktivace:** `"test", "testing", "unit test", "testuj", "validace"`

**Co dělá:**
- Přidává validaci formulářů
- Unit testy
- Edge case handling

**Příklad použití:**
```
User: "Přidej validaci pro email"
AI: Použije 🧪 TESTING MODE
```

**Co testuje:**
- Input validace
- Edge cases (prázdné hodnoty, null, undefined)
- Boundary conditions
- Error scenarios
- Happy path scenarios

---

### 7. 🔧 PERFORMANCE MODE - Rychlost

**Aktivace:** `"performance", "rychlost", "speed", "pomalý", "zrychli"`

**Co dělá:**
- Optimalizuje rychlost aplikace
- Debouncing/Throttling
- Lazy loading
- Caching

**Příklad použití:**
```
User: "Aplikace je pomalá, zrychli to"
AI: Použije 🔧 PERFORMANCE MODE
```

**Techniky:**
- Debouncing/Throttling
- Event delegation
- Caching výsledků
- Reduce DOM manipulations
- Async operations
- Memory leaks prevention

---

### 8. 🤔 AI ANALYSIS MODE (Meta-Prompt)

**Aktivace:**
- Požadavek má 15+ slov
- Obsahuje: "a zároveň", "a také", "plus", "navíc", "ještě"
- Nejasný nebo vícenásobný záměr

**Co dělá:**
Meta-prompt který nechá AI určit nejlepší přístup.

**Příklad použití:**
```
User: "Udělej to aby formulář fungoval a vypadal moderně a byl rychlý"
AI: Použije 🤔 AI ANALYSIS MODE
```

**Postup:**
1. **ANALÝZA** - AI rozebere požadavek
2. **VÝBĚR** - Určí který prompt(y) použít
3. **DŮVOD** - Vysvětlí rozhodnutí
4. **ŘEŠENÍ** - Provede úkol

**Meta-Prompt obsahuje:**
- Seznam všech 9 dostupných promptů
- Příklady kdy použít který
- Instrukce jak analyzovat požadavek
- Požadavek provést úkol ihned po analýze

---

### 9. ⚠️ EDIT MODE / 🆕 NEW PROJECT (Default)

**Aktivace:** Žádná klíčová slova nezapadla do předchozích kategorií

**Chování:**
- **Pokud `hasCode && hasHistory`** → ⚠️ EDIT MODE (EDIT:LINES formát)
- **Pokud prázdný editor** → 🆕 NEW PROJECT (celý HTML soubor)

---

## 🎯 Jak To Funguje

### Implementace v Kódu

```javascript
selectPromptByContext(userMessage, hasCode, hasHistory, currentCode) {
  const msg = userMessage.toLowerCase();

  // 1. Check for DEBUG keywords
  if (msg.match(/\b(nefunguje|chyba|error|bug|oprav|fix)\b/)) {
    return DEBUG_PROMPT;
  }

  // 2. Check for STYLE keywords
  if (msg.match(/\b(barva|design|styl|css|vzhled)\b/)) {
    return STYLE_PROMPT;
  }

  // ... další prompty ...

  // 8. Check for COMPLEX/AMBIGUOUS request
  const wordCount = userMessage.split(/\s+/).length;
  const hasMultipleIntents = userMessage.match(/a zároveň|a také|plus|navíc|ještě/);

  if (wordCount > 15 || hasMultipleIntents) {
    return this.getPromptSelectionMetaPrompt(userMessage, codeLength, lineCount);
  }

  // 9. Default: EDIT nebo NEW PROJECT
  return hasCode && hasHistory ? EDIT_PROMPT : NEW_PROJECT_PROMPT;
}
```

  // ... další prompty ...

  // 8. Default: EDIT nebo NEW PROJECT
  return hasCode && hasHistory ? EDIT_PROMPT : NEW_PROJECT_PROMPT;
}
```

### Tok Rozhodování

```
User Message
    ↓
Keyword Analysis
    ↓
    ├─ "nefunguje" → 🐛 DEBUG MODE
    ├─ "barva"     → 🎨 STYLE MODE
    ├─ "refactor"  → ♻️ REFACTOR MODE
    ├─ "přidej"    → ➕ ADD FEATURE
    ├─ "komentář"  → 📝 DOCUMENTATION
    ├─ "test"      → 🧪 TESTING MODE
    ├─ "rychlost"  → 🔧 PERFORMANCE
    ├─ 15+ slov OR "a zároveň" → 🤔 AI ANALYSIS MODE
    └─ *other*     → ⚠️ EDIT / 🆕 NEW PROJECT
```

---

## 💡 Příklady Použití

### Scénář 1: Debug
```
User: "Formulář nefunguje, vrací error"
System: Detekuje "nefunguje", "error"
AI: Použije 🐛 DEBUG MODE
Result: Najde chybu v event listeneru, vrátí opravu
```

### Scénář 2: Styling
```
User: "Změň barvu pozadí na tmavě modrou"
System: Detekuje "barva"
AI: Použije 🎨 STYLE MODE
Result: Změní jen CSS, žádné JS změny
```

### Scénář 3: Nová Funkce
```
User: "Přidej možnost exportu do PDF"
System: Detekuje "přidej"
AI: Použije ➕ ADD FEATURE MODE
Result: Přidá tlačítko + JS funkci pro export
```

### Scénář 4: Refactoring
```
User: "Vyčisti tento kód, je moc složitý"
System: Detekuje "vyčisti"
AI: Použije ♻️ REFACTOR MODE
Result: Zjednodušení, lepší názvy, DRY principle
```

---

## ⚙️ Technické Detaily

### Soubory
- **AIPanel.js** (řádek ~1686): `selectPromptByContext()` metoda
- **AIPanel.js** (řádek ~1252): Volání `this.selectPromptByContext()`

### Klíčové Funkce

#### selectPromptByContext(userMessage, hasCode, hasHistory, currentCode)
```javascript
/**
 * Intelligent prompt selection based on context and user intent
 * @param {string} userMessage - User's request
 * @param {boolean} hasCode - Whether editor has code
 * @param {boolean} hasHistory - Whether editor has change history
 * @param {string} currentCode - Current editor code
 * @returns {string} Selected prompt text
 */
```

### Regex Patterns pro Detekci

```javascript
DEBUG:        /\b(nefunguje|chyba|error|bug|oprav|fix|debug|console)\b/
STYLE:        /\b(barva|color|design|styl|style|css|vzhled|font|layout)\b/
REFACTOR:     /\b(optimalizuj|refactor|vyčisti|cleanup|zlepši|improve)\b/
ADD_FEATURE:  /\b(přidej|add|nový|new|implementuj|implement|vytvoř)\b/
DOCUMENTATION:/\b(komentář|comment|dokumentace|doc|vysvětli|explain)\b/
TESTING:      /\b(test|testing|unit test|testuj|validace|validation)\b/
PERFORMANCE:  /\b(performance|rychlost|speed|optimize|pomalý|zrychli)\b/
```

---

## 🎓 Best Practices

### Pro Uživatele

**✅ Dobrá Zpráva:**
```
"Tlačítko nefunguje po kliknutí"
→ Jasný záměr, AI použije DEBUG mode
```

**❌ Špatná Zpráva:**
```
"Udělej něco"
→ Nejasný záměr, AI použije default EDIT mode
```

**💡 Tip:** Používej klíčová slova z tabulky výše pro lepší výsledky!

---

## 📊 Výhody Multi-Prompt Systému

### ✅ Pro Uživatele
- Přesnější výsledky podle záměru
- Rychlejší odezva AI (menší prompty)
- Lepší pochopení kontextu
- Specializované instrukce pro každou situaci

### ✅ Pro AI
- Jasné instrukce co dělat
- Menší token consumption
- Fokus na konkrétní úkol
- Méně chyb

### ✅ Pro Vývojáře
- Modulární struktura
- Snadno rozšiřitelné (přidání nových promptů)
- Lepší maintainability
- Debugging friendly

---

## 🔮 Možná Rozšíření

### Budoucí Prompty
- 🔒 **SECURITY MODE** - Security audit, XSS/CSRF protection
- 🌐 **I18N MODE** - Internacionalizace, překlady
- 📱 **MOBILE MODE** - Mobile-specific optimizations
- ♿ **A11Y MODE** - Accessibility improvements
- 🗄️ **DATABASE MODE** - Database queries, CRUD operations

### Vylepšení
- Machine learning pro lepší detekci záměru
- Kombinace více promptů (např. STYLE + PERFORMANCE)
- User feedback pro fine-tuning
- Analytics which prompts are most used

---

## 🐛 Řešení Problémů

### ❌ AI vybral špatný prompt
**Příčina:** Nejasná zpráva nebo chybějící klíčová slova
**Řešení:** Použij specifičtější klíčová slova

### ❌ AI stále zkracuje kód
**Příčina:** Možná prompt není správně aktivován
**Řešení:** Zkontroluj console.log které prompt byl vybrán

### ❌ Změny se neaplikují automaticky
**Příčina:** AI nepoužil EDIT:LINES formát
**Řešení:** Prompt možná není správně nastaven

---

## 📝 Changelog

### v3.0 - Multi-Prompt System
- ✨ 8 specializovaných promptů podle záměru
- 🧠 Automatická detekce pomocí regex patterns
- 📊 Inteligentní volba promptu podle kontextu
- 🎯 Přesnější výsledky pro každou situaci

### v2.0 - Dual Prompt System
- ✨ Rozdělení na EDIT a NEW PROJECT
- 🔧 Automatické přepínání podle hasCode && hasHistory

### v1.0 - EDIT:LINES System
- ✨ Parser a aplikace EDIT:LINES formátu
- 🔧 Undo/redo podpora

---

**Vytvořeno:** 5. ledna 2026
**Verze:** 3.0
**Status:** ✅ Production Ready

### 1. 🆕 PROMPT PRO NOVÝ PROJEKT
**Kdy se použije:** Prázdný editor NEBO žádná historie změn

**Co dělá:**
- AI vrací **celý HTML soubor** od `<!DOCTYPE>` až po `</html>`
- Obsahuje kompletní strukturu: `<head>`, `<style>`, `<body>`, `<script>`
- Vše musí být funkční a ready-to-use

**Použití:**
- Tvorba nových single-page aplikací
- První verze projektu
- Když chcete celý kód od začátku

---

### 2. ⚠️ PROMPT PRO EDITACI EXISTUJÍCÍHO KÓDU
**Kdy se použije:** Editor obsahuje kód A existuje historie změn

**Co dělá:**
- AI vrací změny v **EDIT:LINES formátu**
- System automaticky aplikuje změny do kódu
- Funguje undo/redo (Ctrl+Z / Ctrl+Y)

**Formát EDIT:LINES:**
```
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
```

---

## Technické detaily

### Podmínka přepínání promptu

```javascript
${hasCode && hasHistory ? EDIT_MODE_PROMPT : NEW_PROJECT_PROMPT}
```

**Proměnné:**
- `hasCode` = `currentCode && currentCode.trim().length > 0`
- `hasHistory` = `editor.history.past.length > 0`

### Kdy se použije který prompt?

| Stav editoru | hasCode | hasHistory | Použitý prompt |
|--------------|---------|------------|----------------|
| Prázdný editor | false | false | 🆕 NOVÝ PROJEKT |
| Kód bez historie | true | false | 🆕 NOVÝ PROJEKT |
| Kód s historií | true | true | ⚠️ EDIT MODE |

---

## Příklady použití

### ✅ Scénář 1: Nová aplikace
```
1. Otevři prázdný editor
2. Klikni na AI asistenta
3. Napiš: "Vytvoř kalkulačku"
4. AI vrátí CELÝ HTML soubor
5. Kód se automaticky načte do editoru
```

### ✅ Scénář 2: Úprava existujícího kódu
```
1. Editor obsahuje kód z předchozího kroku
2. Klikni na AI asistenta
3. Napiš: "Změň barvu tlačítek na modrou"
4. AI vrátí EDIT:LINES bloky
5. System automaticky aplikuje změny
6. Funguje Ctrl+Z pro vrácení zpět
```

---

## Výhody tohoto systému

### Pro nové projekty:
✅ Kompletní kód najednou
✅ Vše připraveno k použití
✅ Rychlý start

### Pro editaci:
✅ Žádné zkrácené soubory "...zkráceno"
✅ Jen konkrétní změny
✅ Rychlejší odezva AI
✅ Funguje undo/redo
✅ Historie změn zachována

---

## Řešení problémů

### ❌ AI stále zkracuje kód při editaci
**Příčina:** Prompt se nepřepnul na EDIT mode
**Řešení:** Zkontroluj že `editor.history.past.length > 0`

### ❌ AI vrací EDIT:LINES místo celého souboru
**Příčina:** Editor obsahuje historii z předchozích změn
**Řešení:** Smaž kód nebo restart aplikace

### ❌ Automatické aplikování nefunguje
**Příčina:** AI nepoužilo správný formát
**Řešení:** Zkontroluj že AI vrací přesně `\`\`\`EDIT:LINES:X-Y`

---

## Implementace

### Soubory
- **AIPanel.js** (řádek ~1254): Dual-prompt ternární operátor
- **AIPanel.js** (řádek ~1719): `parseEditInstructions()` parser
- **AIPanel.js** (řádek ~1747): `applyLineEdits()` aplikace změn
- **Editor.js** (řádek ~190): `saveToHistory()` pro undo/redo

### Klíčové funkce

#### parseEditInstructions(text)
```javascript
const regex = /```EDIT:LINES:(\d+)-(\d+)\s+OLD:\s*([\s\S]*?)\s*NEW:\s*([\s\S]*?)\s*```/g;
```
Parsuje EDIT:LINES bloky z AI odpovědi.

#### applyLineEdits(editInstructions)
```javascript
// Uloží současný stav do undo historie
const currentEditorCode = editor.getCode();
editor.history.past.push(currentEditorCode);

// Aplikuje změny
// ...

// Aktualizuje editor
state.set('editor.code', newCode);
```

---

## Changelog

### v2.0 - Dual Prompt System
- ✨ Rozdělení na dva prompty podle kontextu
- 🔧 Automatické přepínání podle `hasCode && hasHistory`
- 📝 Čistší a stručnější prompty
- 🧹 Odstranění redundantních instrukcí

### v1.0 - EDIT:LINES System
- ✨ Parser a aplikace EDIT:LINES formátu
- 🔧 Undo/redo podpora
- 📝 Automatické aplikování změn

---

## Další možnosti

### Volitelné: prompts.js modul
Můžeš vytvořit samostatný soubor s prompty:

```javascript
// src/modules/ai/prompts.js
export const EDIT_MODE_PROMPT = (currentCode) => `...`;
export const NEW_PROJECT_PROMPT = `...`;
export const COMMON_RULES = `...`;
```

A importovat v AIPanel.js:
```javascript
import { EDIT_MODE_PROMPT, NEW_PROJECT_PROMPT } from './prompts.js';
```

**Výhoda:** Lepší organizace kódu
**Nevýhoda:** Další soubor k udržování
