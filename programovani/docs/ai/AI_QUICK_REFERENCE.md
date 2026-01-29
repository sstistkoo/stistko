# 🎯 AI Multi-Prompt System - Quick Reference

Rychlý přehled 9 inteligentních AI promptů ve vaší aplikaci.

---

## 📋 Cheat Sheet

| Ikona | Prompt | Klíčová Slova | Použití |
|-------|--------|---------------|---------|
| 🐛 | **DEBUG** | nefunguje, error, bug, oprav, fix | Oprava chyb a bugů |
| 🎨 | **STYLE** | barva, design, css, styl, vzhled | Změny designu a CSS |
| ♻️ | **REFACTOR** | optimalizuj, refactor, vyčisti | Zlepšení kvality kódu |
| ➕ | **ADD FEATURE** | přidej, nový, implementuj | Přidání nové funkce |
| 📝 | **DOCUMENTATION** | komentář, dokumentace, vysvětli | Přidání komentářů |
| 🧪 | **TESTING** | test, validace, unit test | Testy a validace |
| 🔧 | **PERFORMANCE** | performance, rychlost, zrychli | Optimalizace rychlosti |
| 🤔 | **AI ANALYSIS** | *15+ slov, "a zároveň"* | AI určí správný prompt |
| ⚠️ | **EDIT** | *žádná shoda* | Obecné úpravy kódu |
| 🆕 | **NEW PROJECT** | *prázdný editor* | Nová aplikace |

---

## ⚡ Quick Examples

```
"Tlačítko nefunguje"                          → 🐛 DEBUG
"Změň barvu na modrou"                        → 🎨 STYLE
"Refaktoruj tento kód"                        → ♻️ REFACTOR
"Přidej dark mode"                            → ➕ ADD FEATURE
"Přidej komentáře"                            → 📝 DOCUMENTATION
"Validace emailu"                             → 🧪 TESTING
"Aplikace je pomalá"                          → 🔧 PERFORMANCE
"Oprav chyby a zároveň zlepši design"        → 🤔 AI ANALYSIS
"Změň text v nadpisu"                         → ⚠️ EDIT
"Vytvoř kalkulačku" (prázdný ed.)            → 🆕 NEW PROJECT
```

---

## 🆕 Nové: AI Analysis Mode

**Aktivace:** Komplexní nebo nejasný požadavek

**Příklad:**
```
"Potřebuju aby to fungovalo, vypadalo moderně a bylo rychlé"
   ↓
🤔 AI ANALYSIS MODE
   ↓
AI analyzuje → Vybere prompty → Vysvětlí → Provede
```

**Kdy se aktivuje:**
- Požadavek má 15+ slov
- Obsahuje: "a zároveň", "a také", "plus", "navíc"
- Vícenásobný záměr

---

## 🎓 Pro Tips

### ✅ Buď Specifický
```diff
- "Udělej něco"
+ "Přidej dark mode toggle"
```

### ✅ Používej Klíčová Slova
```diff
- "To je divné"
+ "Hází error v konzoli"
```

### ✅ Jasný Záměr
```diff
- "Změň to"
+ "Refaktoruj pro lepší čitelnost"
```

---

## 📖 Dokumentace

**Detailní dokumentace:**
- [AI_MULTI_PROMPT_SYSTEM.md](AI_MULTI_PROMPT_SYSTEM.md) - Kompletní dokumentace
- [AI_PROMPTS_EXAMPLES.md](AI_PROMPTS_EXAMPLES.md) - Praktické příklady
- [AI_PROMPT_FLOW.md](AI_PROMPT_FLOW.md) - Rozhodovací diagram

**Starší dokumenty:**
- [AI_AUTO_EDIT_TEST.md](AI_AUTO_EDIT_TEST.md) - EDIT:LINES systém
- [AI_AUTO_EDIT_PROBLEM.md](AI_AUTO_EDIT_PROBLEM.md) - Historie problémů

---

## 🚀 Začínáme

### 1. Debug Mode
```
Problém: "Console ukazuje: TypeError at line 45"
         ↓
AI: Najde chybu, vrátí EDIT:LINES s opravou
```

### 2. Style Mode
```
Požadavek: "Udělaj moderní gradient design"
           ↓
AI: Upraví CSS s moderními styly
```

### 3. Refactor Mode
```
Kód: Duplicitní if-else větve
     ↓
Zpráva: "Refaktoruj tohle"
        ↓
AI: Použije DRY principle, ES6+
```

### 4. Add Feature
```
"Přidej možnost exportu do PDF"
↓
AI: Přidá tlačítko + JS funkci + styling
```

---

## 💡 Kdy Použít Který Prompt?

### Mám Bug → 🐛 DEBUG
```
"Formulář vrací error při submitu"
```

### Špatně Vypadá → 🎨 STYLE
```
"Změň pozadí na gradient"
```

### Chaotický Kód → ♻️ REFACTOR
```
"Vyčisti tento špagety kód"
```

### Chybí Funkce → ➕ ADD FEATURE
```
"Přidej dark mode"
```

### Nesrozumitelné → 📝 DOCUMENTATION
```
"Přidej JSDoc k funkcím"
```

### Bez Validace → 🧪 TESTING
```
"Validace pro email input"
```

### Komplexní/Nejasné → 🤔 AI ANALYSIS
```
"Oprav to a udělej to hezčí a rychlejší"
```

### Laguje → 🔧 PERFORMANCE
```
"Search má 2s delay"
```

---

## 🎯 Regex Patterns (pro vývojáře)

```javascript
const patterns = {
  DEBUG:        /\b(nefunguje|chyba|error|bug|oprav|fix|debug|console)\b/,
  STYLE:        /\b(barva|color|design|styl|style|css|vzhled|font|layout|responzivní)\b/,
  REFACTOR:     /\b(optimalizuj|refactor|vyčisti|cleanup|zlepši|improve|reorganizuj)\b/,
  ADD_FEATURE:  /\b(přidej|add|nový|new|implementuj|implement|vytvoř|create|feature)\b/,
  DOCUMENTATION:/\b(komentář|comment|dokumentace|doc|vysvětli|explain|popis)\b/,
  TESTING:      /\b(test|testing|unit test|testuj|validace|validation)\b/,
  PERFORMANCE:  /\b(performance|rychlost|speed|optimize|pomalý|slow|zrychli)\b/
};
```

---

## 📊 Výhody

### Pro Uživatele
✅ Přesnější výsledky
✅ Rychlejší odezva
✅ Lepší pochopení záměru
✅ Specializované instrukce

### Pro AI
✅ Jasné instrukce
✅ Menší token consumption
✅ Fokus na konkrétní úkol
✅ Méně chyb

---

## 🔧 Technické Info

### Implementace
- **Soubor:** `src/modules/ai/AIPanel.js`
- **Metoda:** `selectPromptByContext(userMessage, hasCode, hasHistory, currentCode)`
- **Řádek:** ~1686

### Jak To Funguje
```
User Message → toLowerCase() → Regex Match → Select Prompt
```

### Priority
První nalezené klíčové slovo vyhrává!

---

## 🐛 Troubleshooting

### AI vybral špatný prompt
**Fix:** Používej specifičtější klíčová slova

### Změny se neaplikují
**Fix:** Zkontroluj že AI vrátil EDIT:LINES formát

### AI stále zkracuje kód
**Fix:** Použij "oprav" nebo "refaktoruj" pro DEBUG/REFACTOR mode

---

## 📞 Support

**Issues:** GitHub Issues
**Docs:** [AI_MULTI_PROMPT_SYSTEM.md](AI_MULTI_PROMPT_SYSTEM.md)
**Examples:** [AI_PROMPTS_EXAMPLES.md](AI_PROMPTS_EXAMPLES.md)

---

**Verze:** 3.1
**Status:** ✅ Production Ready
**Datum:** 5. ledna 2026
**Nové:** 🤔 AI Analysis Mode pro komplexní požadavky
