# Keyboard Handler Refactoring

## Přehled

**Vytvořen:** Jednotný modul `keyboard.js` pro centralizovanou správu všech keyboard shortcutů.

**Problém:** Keyboard handlery byly rozptýleny ve 4 souborech s duplicitním kódem:
- `controller.js` (36 řádků) - Modal-specific shortcuts
- `init.js` (60+ řádků) - Global shortcuts
- `canvas.js` (35 řádků) - Drawing shortcuts
- `ai.js` (28 řádků) - AI prompt handling

**Řešení:** Jednotný `keyboard.js` modul s:
- ✅ Tunabilní konfigurace (snadno se mění klávesy)
- ✅ Eliminace duplicit (ESC, Ctrl+Z, atd.)
- ✅ Podpora obou Controller i AI módů
- ✅ Centrální správa všech shortcutů

## Struktura keyboard.js

### 1. Konfigurace (Tunable)

```javascript
window.keyboardConfig = {
  quickModes: { "1": "line", "2": "circle", ... },  // Number keys
  controller: { open, close, confirm },               // ALT+K, ESC, Enter
  file: { new, export, save },                        // Ctrl+N/E/S
  view: { help, home, centerOrigin },                 // Ctrl+/, H, O
  selection: { selectAll, deselect },                 // A, D
  edit: { undo, redo, delete },                       // Ctrl+Z/Y, Delete
  ai: { send, sendShiftNewline }                      // Enter, Shift+Enter
};
```

### 2. Utility Funkce

```javascript
window.matchesShortcut(event, shortcut)   // Kontrola, zda klávesnice odpovídá
window.getShortcutLabel(shortcut)          // Popis pro UI (např. "Ctrl+Z")
```

### 3. Hlavní Handler

```javascript
window.handleGlobalKeyDown(e)  // Master keyboard down handler
window.handleGlobalKeyUp(e)    // Master keyboard up handler
```

### 4. Setup

```javascript
window.setupUnifiedKeyboard()   // Inicializace (zavolá se automaticky)
window.getAllShortcuts()        // Vrátí všechny shortcuts pro Help UI
```

## Integrace

### Soubor index.html

```html
<!-- GLOBALS + KEYBOARD MUSÍ BÝT PRVNÍ! -->
<script src="globals.js"></script>
<script src="keyboard.js"></script>        <!-- ✅ NOVÝ - Musí být brzy! -->
<script src="utils.js"></script>
...
```

### Odebraný kód

| Soubor | Změna |
|--------|-------|
| `controller.js` | Odebrány řádky 572-607 (36 řádků keyboard eventů) |
| `init.js` | Odebrána funkce `setupKeyboardShortcuts()` + volání |
| `canvas.js` | Odebrány `onKeyDown`, `onKeyUp` + event listeners |
| `ai.js` | Odebrán keyboard handler pro Enter v aiPrompt |

## Jak Tunovat

### Příklad: Změnit Ctrl+N na Ctrl+Alt+N

```javascript
// V keyboard.js, řádek ~32:
window.keyboardConfig.file.new = {
  key: "n",
  ctrl: true,
  alt: true      // ← Přidáno
};
```

### Příklad: Přidat nový shortcut (Ctrl+Shift+L pro Layer)

```javascript
// V keyboard.js, řádek ~55:
window.keyboardConfig.file.layer = {
  key: "l",
  ctrl: true,
  shift: true
};

// V keyboard.js, handleGlobalKeyDown, řádka ~280:
if (window.matchesShortcut(e, config.file.layer)) {
  e.preventDefault();
  if (window.showLayers) window.showLayers();
  return;
}
```

### Příklad: Odebrat shortcut (Zrušit Ctrl+S)

```javascript
// V keyboard.js, řádka ~34:
// window.keyboardConfig.file.save = { key: "s", ctrl: true, meta: true };  // ← Zakomentovat
```

## Klávesové Zkratky

### Režimy (Čísla)
| Klávesa | Funkce |
|---------|--------|
| 1 | Čára |
| 2 | Kružnice |
| 3 | Oblouk |
| 4 | Tečna |
| 5 | Kolmice |
| 6 | Rovnoběžka |
| 7 | Oříznutí |
| 8 | Odsazení |
| 9 | Zrcadlení |
| 0 | Smazání |

### Ovládač
| Klávesa | Funkce |
|---------|--------|
| ALT+K / CMD+K | Otevřít Ovládač |
| ESC | Zavřít Ovládač / Zrušit režim |
| Enter | Potvrdit příkaz v Ovládači |
| Backspace | Smazat token v Ovládači |

### Soubor
| Klávesa | Funkce |
|---------|--------|
| Ctrl+N / Cmd+N | Nový projekt |
| Ctrl+E / Cmd+E | Export PNG |
| Ctrl+S / Cmd+S | Uložit projekt |

### Úpravy
| Klávesa | Funkce |
|---------|--------|
| Ctrl+Z / Cmd+Z | Vrátit |
| Ctrl+Y / Cmd+Y | Zopakovat |
| Shift+Z | Zopakovat (alternativa) |
| Delete / Backspace | Smazat vybrané |

### Výběr
| Klávesa | Funkce |
|---------|--------|
| A | Vybrat vše |
| D | Odebrat výběr |

### Pohled
| Klávesa | Funkce |
|---------|--------|
| H | Domů (celý výkres) |
| O | Střed do počátku |
| Ctrl+/ / Cmd+/ | Nápověda |

### AI Prompt
| Klávesa | Funkce |
|---------|--------|
| Enter | Poslat Gemini |
| Shift+Enter | Nový řádek |

## Jak Funguje

### 1. Inicializace
```
DOMContentLoaded
  ↓
keyboard.js se nabere
  ↓
setupUnifiedKeyboard() se zavolá automaticky
  ↓
handleGlobalKeyDown + handleGlobalKeyUp se registrují
```

### 2. Stisknutí Klávesy
```
Uživatel stiskne klávesu
  ↓
handleGlobalKeyDown se zavolá
  ↓
matchesShortcut() zkontroluje, zda odpovídá nějakému shortcutu
  ↓
Příslušná akce se vykoná (window.showControllerModal(), window.undo(), atd.)
```

### 3. Podpora Controller a AI

- **Controller:** ALT+K otevře Modal, ESC ho zavře, Enter potvrdí
- **AI:** Enter v aiPrompt pošle Gemini (Shift+Enter = nový řádek)

```javascript
// V handleGlobalKeyDown:
if (window.matchesShortcut(e, config.controller.open)) {
  window.showControllerModal();  // ← Controller se spustí
}

if (aiPrompt && document.activeElement === aiPrompt) {
  if (window.matchesShortcut(e, config.ai.send)) {
    window.callGemini();  // ← AI se spustí
  }
}
```

## Změny v Jednotlivých Modulech

### controller.js
- ✅ Odebrány řádky 572-607 (keyboard listeners)
- ✅ Zůstaly: `showControllerModal()`, `closeControllerModal()`, `confirmControllerInput()`, `backspaceControllerToken()`
- ℹ️ Keyboard events nyní volá keyboard.js

### init.js
- ✅ Odebrána funkce `setupKeyboardShortcuts()`
- ✅ Odebráno volání `setupKeyboardShortcuts()` z `initializeApp()`
- ✅ Zůstala: funkce `showHelp()` (se zprávou o shortcutech)
- ℹ️ Keyboard events nyní volá keyboard.js

### canvas.js
- ✅ Odebrány funkce `onKeyDown()` a `onKeyUp()`
- ✅ Odebrány event listenery (`document.addEventListener("keydown", onKeyDown)`)
- ✅ Zůstaly: mouse handlers, drawing logic
- ℹ️ Keyboard events nyní volá keyboard.js

### ai.js
- ✅ Odebrán keyboard handler z aiPrompt event listeneru
- ✅ Zůstaly: button click handlers (`btnSendAi`, `btnClearChat`)
- ℹ️ Enter v aiPrompt nyní spravuje keyboard.js

## Benefity

| Benefit | Popis |
|---------|-------|
| **DRY** | Nema duplicit - všechny shortcuts na jednom místě |
| **Tunable** | Snadno se mění klávesy bez hledání v kódu |
| **Maintainable** | Jedno místo pro správu všech keyboard eventů |
| **Scalable** | Snadné přidání nových shortcutů |
| **Debuggable** | Všechny shortcuts jsou v jednom souboru |
| **Consistentní** | Mac (Cmd) i Windows (Ctrl) se hledají automaticky |

## Testing

Všechny testy prošly:
```
npm test
≡ƒôï 57/57 tests passed ✅
```

## Budoucí Zlepšení

1. **Help Modal** - Zvýšit `getAllShortcuts()` pro dynamické UI help
2. **Keybinding Remapping** - Uložit custom bindings do localStorage
3. **Accessibility** - Přidat ARIA labels pro keyboard shortcuts
4. **Confilct Detection** - Varovat na konfliktní shortcuts
5. **Performance** - Cachovat `matchesShortcut()` výsledky (nemělo by být potřeba)

## Commit

```
git commit -m "Unify keyboard handlers: Create keyboard.js module

- Vytvořen keyboard.js s centralizovanou správou shortcutů
- Odstraněny duplicate handlers z controller.js, init.js, canvas.js, ai.js
- Tunabilní konfigurace - snadná modifikace klávesů
- Podpora obou Controller a AI módů
- 57/57 testy prošly ✅
- Odebrané řádky: 160+ (čistší kód)
"
```

## Součásné Soubory

- ✅ `keyboard.js` - 350+ řádků (nový)
- ✅ `index.html` - aktualizován (přidáno načítání keyboard.js)
- ✅ `controller.js` - 36 řádků méně
- ✅ `init.js` - 60+ řádků méně
- ✅ `canvas.js` - 35 řádků méně
- ✅ `ai.js` - 28 řádků méně
