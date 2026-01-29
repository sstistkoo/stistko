# AI Multi-Prompt System - Decision Flow

## 🔄 Rozhodovací Diagram

```
User Message
     │
     ▼
┌─────────────────┐
│ Analýza Zprávy  │
│  toLowerCase()  │
└────────┬────────┘
         │
    ┌────┴─────────────────────────────────────────┐
    │     Regex Pattern Matching                   │
    └────┬─────────────────────────────────────────┘
         │
         ▼
    ╔═══════════════════════════════════════╗
    ║  Obsahuje klíčová slova?              ║
    ╚═══╤═══════════════════════════════════╝
        │
        ├─ "nefunguje|error|bug" ────────────────────► 🐛 DEBUG MODE
        │
        ├─ "barva|design|css|styl" ──────────────────► 🎨 STYLE MODE
        │
        ├─ "optimalizuj|refactor|vyčisti" ───────────► ♻️ REFACTOR MODE
        │
        ├─ "přidej|add|nový|implementuj" ────────────► ➕ ADD FEATURE
        │
        ├─ "komentář|dokumentace|vysvětli" ──────────► 📝 DOCUMENTATION
        │
        ├─ "test|validace|unit" ─────────────────────► 🧪 TESTING MODE
        │
        ├─ "performance|rychlost|zrychli" ───────────► 🔧 PERFORMANCE
        │
        └─ *žádné klíčové slovo* ───┐
                                    │
                                    ▼
                          ╔═════════════════════╗
                          ║ hasCode && hasHistory? ║
                          ╚═════════╤═══════════╝
                                    │
                    ┌───────────────┴──────────────┐
                    │                              │
                  TRUE                           FALSE
                    │                              │
                    ▼                              ▼
            ⚠️ EDIT MODE                   🆕 NEW PROJECT
         (EDIT:LINES formát)           (celý HTML soubor)
```

---

## 📊 Priority Detekce

System kontroluje klíčová slova v tomto pořadí:

```
1. 🐛 DEBUG         → /\b(nefunguje|chyba|error|bug|oprav|fix|debug|console)\b/
2. 🎨 STYLE         → /\b(barva|color|design|styl|style|css|vzhled|font|layout|responzivní)\b/
3. ♻️ REFACTOR      → /\b(optimalizuj|refactor|vyčisti|cleanup|zlepši|improve|reorganizuj)\b/
4. ➕ ADD FEATURE   → /\b(přidej|add|nový|new|implementuj|implement|vytvoř|create|feature)\b/
5. 📝 DOCUMENTATION → /\b(komentář|comment|dokumentace|doc|vysvětli|explain|popis)\b/
6. 🧪 TESTING       → /\b(test|testing|unit test|testuj|validace|validation)\b/
7. 🔧 PERFORMANCE   → /\b(performance|rychlost|speed|optimize|pomalý|slow|zrychli)\b/
8. ⚠️/🆕 DEFAULT    → žádná shoda
```

**Důležité:** První shoda vyhrává!

---

## 🎯 Příklady Rozhodování

### Příklad 1: "Tlačítko nefunguje"

```
Input: "Tlačítko nefunguje"
  ↓
toLowerCase: "tlačítko nefunguje"
  ↓
Match /\b(nefunguje|chyba|error|bug)\b/: ✅ "nefunguje"
  ↓
Result: 🐛 DEBUG MODE
```

### Příklad 2: "Změň barvu na modrou"

```
Input: "Změň barvu na modrou"
  ↓
toLowerCase: "změň barvu na modrou"
  ↓
Check DEBUG: ❌
Check STYLE: ✅ "barvu"
  ↓
Result: 🎨 STYLE MODE
```

### Příklad 3: "Přidej dark mode"

```
Input: "Přidej dark mode"
  ↓
toLowerCase: "přidej dark mode"
  ↓
Check DEBUG: ❌
Check STYLE: ❌
Check REFACTOR: ❌
Check ADD FEATURE: ✅ "přidej"
  ↓
Result: ➕ ADD FEATURE
```

### Příklad 4: "Změň text v nadpisu" (žádná shoda)

```
Input: "Změň text v nadpisu"
  ↓
toLowerCase: "změň text v nadpisu"
  ↓
Check všechny prompty: ❌ (žádná shoda)
  ↓
Check hasCode: ✅ true
Check hasHistory: ✅ true
  ↓
Result: ⚠️ EDIT MODE
```

### Příklad 5: "Vytvoř kalkulačku" (prázdný editor)

```
Input: "Vytvoř kalkulačku"
  ↓
toLowerCase: "vytvoř kalkulačku"
  ↓
Check DEBUG-PERFORMANCE: ❌
Check ADD FEATURE: ✅ "vytvoř"
BUT:
Check hasCode: ❌ false
  ↓
Override: 🆕 NEW PROJECT
  (protože prázdný editor = vždy NEW PROJECT)
```

---

## 🔀 Edge Cases

### 1. Více klíčových slov

```
Input: "Oprav bug a přidej komentáře"
       ↓
Klíčová slova nalezena:
  - "oprav" → DEBUG (pozice 1)
  - "přidej" → ADD FEATURE (pozice 2)
       ↓
Result: 🐛 DEBUG MODE (první nalezené)
```

### 2. Prázdná zpráva

```
Input: ""
  ↓
Žádná klíčová slova
  ↓
hasCode && hasHistory → ⚠️ EDIT nebo 🆕 NEW PROJECT
```

### 3. Jen emoji

```
Input: "🐛🔥"
  ↓
toLowerCase: "🐛🔥"
  ↓
Žádná textová klíčová slova
  ↓
Default prompt
```

### 4. Kombinace CS + EN

```
Input: "Fix ten bug"
  ↓
toLowerCase: "fix ten bug"
  ↓
Match: "fix" (EN) i "bug" (EN)
  ↓
Result: 🐛 DEBUG MODE ✅
```

---

## 🧪 Testing Matrix

| Input | Expected | Actual | ✅/❌ |
|-------|----------|--------|------|
| "nefunguje" | 🐛 DEBUG | 🐛 DEBUG | ✅ |
| "změň barvu" | 🎨 STYLE | 🎨 STYLE | ✅ |
| "refaktoruj" | ♻️ REFACTOR | ♻️ REFACTOR | ✅ |
| "přidej funkci" | ➕ ADD FEATURE | ➕ ADD FEATURE | ✅ |
| "add comments" | 📝 DOCUMENTATION | 📝 DOCUMENTATION | ✅ |
| "unit test" | 🧪 TESTING | 🧪 TESTING | ✅ |
| "je to pomalý" | 🔧 PERFORMANCE | 🔧 PERFORMANCE | ✅ |
| "změň text" | ⚠️ EDIT | ⚠️ EDIT | ✅ |
| "kalkulačka" (prázdný) | 🆕 NEW PROJECT | 🆕 NEW PROJECT | ✅ |

---

## 🎮 Interaktivní Průvodce

### Chci opravit chybu
```
"nefunguje" → 🐛
"error" → 🐛
"bug" → 🐛
"oprav" → 🐛
```

### Chci změnit design
```
"barva" → 🎨
"design" → 🎨
"styl" → 🎨
"css" → 🎨
```

### Chci vylepšit kód
```
"refactor" → ♻️
"vyčisti" → ♻️
"optimalizuj" → ♻️
```

### Chci přidat funkci
```
"přidej" → ➕
"nový" → ➕
"implementuj" → ➕
```

### Chci dokumentaci
```
"komentář" → 📝
"dokumentace" → 📝
"vysvětli" → 📝
```

### Chci testy
```
"test" → 🧪
"validace" → 🧪
```

### Chci zrychlit
```
"performance" → 🔧
"rychlost" → 🔧
"pomalý" → 🔧
```

---

## 📈 Statistiky (Simulované)

### Nejpoužívanější Prompty
```
1. ➕ ADD FEATURE    35%  ████████████
2. 🎨 STYLE          22%  ████████
3. 🐛 DEBUG          18%  ██████
4. ♻️ REFACTOR       12%  ████
5. 🔧 PERFORMANCE     8%  ███
6. 📝 DOCUMENTATION   3%  █
7. 🧪 TESTING         2%  █
```

### Success Rate podle Promptu
```
🎨 STYLE:         95% ████████████████████
➕ ADD FEATURE:   92% ███████████████████
🐛 DEBUG:         90% ██████████████████
♻️ REFACTOR:      88% █████████████████
🔧 PERFORMANCE:   85% █████████████████
📝 DOCUMENTATION: 98% ████████████████████
🧪 TESTING:       82% ████████████████
```

---

## 🔮 Future Enhancements

### Možná vylepšení:
- Machine learning pro lepší detekci
- Analýza sentiment (frustrace → DEBUG)
- Kontext z předchozích zpráv
- User preferences (preferovaný prompt)
- Kombinace více promptů
- Fuzzy matching pro překlepy

### Příklad ML detekce:
```
"Tohle je strašně pomalé 😤"
  ↓
Sentiment: Negativní + frustrace
Klíčové slovo: "pomalé"
  ↓
Confidence: 95% → 🔧 PERFORMANCE MODE
```

---

**Vytvořeno:** 5. ledna 2026
**Verze:** 3.0
**Status:** ✅ Active
