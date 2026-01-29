# AI Multi-Prompt Systém - Praktické Příklady

Tato dokumentace obsahuje **reálné příklady** použití každého z 9 AI promptů.

---

## 🤔 AI ANALYSIS MODE (META-PROMPT)

### Kdy použít:
- Komplexní požadavek (15+ slov)
- Vícenásobný záměr
- Nejasná formulace
- Kombinace více úkolů

### Příklady zpráv:
```
✅ "Potřebuju aby formulář fungoval správně a vypadal líp a zároveň byl rychlejší"
✅ "Oprav chyby plus přidej validaci a také to udělej moderní"
✅ "Chci aby aplikace byla funkční a rychlá navíc s pěkným designem"
✅ "Refaktoruj kód a zároveň přidej dark mode plus komentáře"
```

### Co AI udělá:
```
KROK 1 - ANALÝZA:
Uživatel chce:
1. Opravu funkčnosti (DEBUG)
2. Lepší vzhled (STYLE)
3. Optimalizaci rychlosti (PERFORMANCE)
4. Validaci (TESTING)

KROK 2 - VYBRANÝ PROMPT:
Použiji postupně:
🐛 DEBUG → 🧪 TESTING → 🔧 PERFORMANCE → 🎨 STYLE

KROK 3 - DŮVOD:
- Funkčnost musí být nejdřív (DEBUG)
- Pak validace aby to bylo bezpečné (TESTING)
- Pak výkon (PERFORMANCE)
- Nakonec vizuální úpravy (STYLE)

KROK 4 - ŘEŠENÍ:
[Konkrétní EDIT:LINES bloky pro všechny změny v optimálním pořadí]
```

### Výhoda:
AI **sama analyzuje** a určí správný přístup. Nemusíš přemýšlet který prompt použít!

---

## 🐛 DEBUG MODE

### Kdy použít:
- Něco nefunguje
- Vidíš error v konzoli
- Bug v logice

### Příklady zpráv:
```
✅ "Tlačítko submit nefunguje"
✅ "Hází error 'undefined is not a function'"
✅ "Console ukazuje chybu na řádku 45"
✅ "Bug v kalkulačce, špatně počítá"
✅ "Oprav tuhle chybu"
```

### Co AI udělá:
```javascript
// Najde problem:
❌ getElementById('submitBtn')  // Element neexistuje

// Vrátí opravu:
✅ getElementById('submitButton')  // Správné ID
```

---

## 🎨 STYLE MODE

### Kdy použít:
- Chceš změnit vzhled
- Úprava barev, fontů, layoutu
- Responzivní design

### Příklady zpráv:
```
✅ "Změň barvu tlačítek na modrou"
✅ "Udělej to responzivní pro mobil"
✅ "Font změň na Arial"
✅ "Přidej gradient na pozadí"
✅ "Design je moc nudný, oživit"
```

### Co AI udělá:
```css
/* Před: */
.button { background: blue; }

/* Po: */
.button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: transform 0.2s;
}
.button:hover {
  transform: translateY(-2px);
}
```

---

## ♻️ REFACTOR MODE

### Kdy použít:
- Kód je chaotický
- Duplicitní kód
- Chceš lepší čitelnost

### Příklady zpráv:
```
✅ "Refaktoruj tento kód"
✅ "Vyčisti to, je to nepřehledné"
✅ "Optimalizuj tuhle funkci"
✅ "Zjednoduš to"
✅ "Udělej to podle best practices"
```

### Co AI udělá:
```javascript
// Před (duplicitní kód):
if (type === 'add') result = a + b;
if (type === 'subtract') result = a - b;
if (type === 'multiply') result = a * b;
if (type === 'divide') result = a / b;

// Po (DRY principle):
const operations = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => b !== 0 ? a / b : null
};
const result = operations[type]?.(a, b);
```

---

## ➕ ADD FEATURE

### Kdy použít:
- Chceš přidat novou funkci
- Rozšíření aplikace
- Nový prvek

### Příklady zpráv:
```
✅ "Přidej dark mode"
✅ "Implementuj vyhledávání"
✅ "Vytvoř timer"
✅ "Add možnost exportu do CSV"
✅ "Nová funkce: filtrování podle data"
```

### Co AI udělá:
```javascript
// Přidá kompletní feature:

// 1. HTML
<button id="darkModeToggle">🌙 Dark Mode</button>

// 2. CSS
.dark-mode {
  background: #1a1a1a;
  color: #fff;
}

// 3. JavaScript
const darkModeToggle = document.getElementById('darkModeToggle');
darkModeToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode',
    document.body.classList.contains('dark-mode'));
});

// Načtení z localStorage
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
}
```

---

## 📝 DOCUMENTATION MODE

### Kdy použít:
- Chceš komentáře
- Dokumentace funkcí
- Vysvětlit složitý kód

### Příklady zpráv:
```
✅ "Přidej komentáře k funkcím"
✅ "Dokumentuj tenhle kód"
✅ "Vysvětli co dělá tato funkce"
✅ "Add JSDoc"
✅ "Popis parametrů"
```

### Co AI udělá:
```javascript
// Před:
function calc(x, y, op) {
  return ops[op](x, y);
}

// Po:
/**
 * Performs mathematical operation on two numbers
 * @param {number} x - First operand
 * @param {number} y - Second operand
 * @param {string} op - Operation type ('add', 'subtract', 'multiply', 'divide')
 * @returns {number|null} Result of operation or null if invalid
 * @example
 * calc(5, 3, 'add')  // Returns 8
 * calc(10, 2, 'divide')  // Returns 5
 */
function calc(x, y, op) {
  // Execute operation from operations map
  return ops[op](x, y);
}
```

---

## 🧪 TESTING MODE

### Kdy použít:
- Chceš přidat validaci
- Unit testy
- Edge cases

### Příklady zpráv:
```
✅ "Přidaj validaci pro email"
✅ "Testuj edge cases"
✅ "Validace formuláře"
✅ "Check prázdné hodnoty"
✅ "Unit testy pro tuhle funkci"
```

### Co AI udělá:
```javascript
// Před (žádná validace):
submitBtn.addEventListener('click', () => {
  sendEmail(emailInput.value);
});

// Po (s validací):
submitBtn.addEventListener('click', () => {
  const email = emailInput.value.trim();

  // Edge case: prázdný input
  if (!email) {
    showError('Email je povinný');
    return;
  }

  // Regex validace
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError('Neplatný formát emailu');
    return;
  }

  // Max length check
  if (email.length > 254) {
    showError('Email je příliš dlouhý');
    return;
  }

  // Vše OK, odeslat
  sendEmail(email);
});
```

---

## 🔧 PERFORMANCE MODE

### Kdy použít:
- Aplikace je pomalá
- Input lag
- Chceš optimalizovat rychlost

### Příklady zpráv:
```
✅ "Aplikace je pomalá"
✅ "Optimalizuj rychlost"
✅ "Zrychli to"
✅ "Performance je špatný"
✅ "Input má lag"
```

### Co AI udělá:
```javascript
// Před (volá se při každém stisku klávesy):
searchInput.addEventListener('input', (e) => {
  performExpensiveSearch(e.target.value);  // 100ms
});

// Po (debouncing - čeká 300ms):
const debounce = (fn, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

searchInput.addEventListener('input', debounce((e) => {
  performExpensiveSearch(e.target.value);
}, 300));

// Výsledek: 90% méně volání!
```

---

## ⚠️ EDIT MODE (Default)

### Kdy použít:
- Obecné změny
- Žádné klíčové slovo nezapadlo

### Příklady zpráv:
```
✅ "Změň text v nadpisu"
✅ "Přesuň tlačítko dolů"
✅ "Aktualizuj verzi na 2.0"
```

### Co AI udělá:
```
Vrátí EDIT:LINES bloky se změnami
```

---

## 🆕 NEW PROJECT (Default - prázdný editor)

### Kdy použít:
- Nová aplikace od začátku
- Prázdný editor

### Příklady zpráv:
```
✅ "Vytvoř kalkulačku"
✅ "Todo list app"
✅ "Formulář s validací"
```

### Co AI udělá:
```html
Vrátí CELÝ HTML soubor:
<!DOCTYPE html>
<html>
<head>
  <style>...</style>
</head>
<body>
  ...
  <script>...</script>
</body>
</html>
```

---

## 🎯 Kombinace Klíčových Slov

Můžeš kombinovat více klíčových slov pro přesnější výsledky:

```
✅ "Oprav bug a přidej komentáře"
   → DEBUG mode (první detekovaný)

✅ "Refaktoruj a optimalizuj performance"
   → REFACTOR mode (první detekovaný)

✅ "Změň barvy a udělej to responzivní"
   → STYLE mode
```

**Pravidlo:** První nalezené klíčové slovo určuje prompt.

---

## 💡 Tipy pro Nejlepší Výsledky

### ✅ Buď Specifický
```
❌ "Udělej něco"
✅ "Přidej dark mode s toggle tlačítkem"
```

### ✅ Používej Klíčová Slova
```
❌ "To je divné"
✅ "Nefunguje to, hází error"  (→ DEBUG mode)
```

### ✅ Jasný Záměr
```
❌ "Změň to"
✅ "Změň barvu pozadí na gradient"  (→ STYLE mode)
```

### ✅ Kontext
```
❌ "Fix"
✅ "Oprav validaci emailu, vrací false i pro správný email"  (→ DEBUG)
```

---

## 📊 Které Prompty Používat Kdy?

| Situace | Prompt | Příklad |
|---------|--------|---------|
| Aplikace crashuje | 🐛 DEBUG | "Console error na řádku 42" |
| Špatně vypadá | 🎨 STYLE | "Změň na moderní design" |
| Chaotický kód | ♻️ REFACTOR | "Vyčisti ten špagety kód" |
| Chybí funkce | ➕ ADD FEATURE | "Přidej možnost stažení" |
| Nesrozumitelné | 📝 DOCUMENTATION | "Přidej komentáře" |
| Neověřené inputy | 🧪 TESTING | "Validace formuláře" |
| Laguje | 🔧 PERFORMANCE | "Input má 2s delay" |
| Obecné změny | ⚠️ EDIT | "Změň text v title" |
| Nový projekt | 🆕 NEW PROJECT | "Vytvoř timer" |

---

## 🎓 Pokročilé Techniky

### 1. Postupné Vylepšování
```
Krok 1: "Vytvoř kalkulačku"  (🆕 NEW PROJECT)
Krok 2: "Přidej dark mode"   (➕ ADD FEATURE)
Krok 3: "Změň barvy na modrou"  (🎨 STYLE)
Krok 4: "Optimalizuj kód"  (♻️ REFACTOR)
```

### 2. Ladění Promptu
```
První pokus: "Udělej to lepší"  (→ ⚠️ EDIT - nejasné)
Lepší: "Refaktoruj a optimalizuj"  (→ ♻️ REFACTOR - jasné)
```

### 3. Debug Flow
```
"Nefunguje"  (🐛 DEBUG - najde error)
  ↓
"Přidej error handling"  (➕ ADD FEATURE)
  ↓
"Testuj edge cases"  (🧪 TESTING)
```

---

**Tip:** Experimentuj s různými formulacemi a sleduj které prompt se aktivoval!

**Vytvořeno:** 5. ledna 2026
**Verze:** 3.0
**Pro:** AI Multi-Prompt System
