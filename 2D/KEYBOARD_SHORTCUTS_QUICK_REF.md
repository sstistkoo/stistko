# ⌨️ KEYBOARD SHORTCUTS - QUICK REFERENCE

## 🔢 REŽIMY (Number Keys)

| Key | Mód |
|-----|-----|
| `1` | Čára |
| `2` | Kružnice |
| `3` | Oblouk |
| `4` | Tečna |
| `5` | Kolmice |
| `6` | Rovnoběžka |
| `7` | Oříznutí |
| `8` | Odsazení |
| `9` | Zrcadlení |
| `0` | Smazání |

## 🎮 OVLÁDAČ

| Shortcut | Akce |
|----------|------|
| `Alt+K` / `Cmd+K` | Otevřít Ovládač |
| `Esc` | Zavřít Ovládač |
| `Enter` | Potvrdit příkaz |
| `Backspace` | Smazat token |

## 💾 SOUBOR

| Shortcut | Akce |
|----------|------|
| `Ctrl+N` / `Cmd+N` | Nový projekt |
| `Ctrl+S` / `Cmd+S` | Uložit projekt |
| `Ctrl+E` / `Cmd+E` | Export PNG |

## 🔧 ÚPRAVY

| Shortcut | Akce |
|----------|------|
| `Ctrl+Z` / `Cmd+Z` | Vrátit |
| `Ctrl+Y` / `Cmd+Y` | Zopakovat |
| `Shift+Z` | Zopakovat (alternativa) |
| `Delete` / `Backspace` | Smazat vybrané |

## ✨ VÝBĚR

| Shortcut | Akce |
|----------|------|
| `A` | Vybrat vše |
| `D` | Odebrat výběr |

## 🌍 POHLED

| Shortcut | Akce |
|----------|------|
| `H` | Domů (celý výkres) |
| `O` | Střed do počátku |
| `Ctrl+/` / `Cmd+/` | Nápověda |

## 🤖 AI

| Shortcut | Akce |
|----------|------|
| `Enter` | Poslat Gemini (v AI promptu) |
| `Shift+Enter` | Nový řádek (v AI promptu) |

## ⚙️ VYBRAT ZKRATKU NA ÚPRAVU

1. Otevři [keyboard.js](keyboard.js)
2. Najdi `window.keyboardConfig` (řádka ~14)
3. Najdi kategorii (file, view, edit, atd.)
4. Změň `key`, `ctrl`, `shift`, `alt`, `meta`
5. Ulož, obnov (F5), testuj

## 📖 PŘÍKLADY TUNINGU

Viz [KEYBOARD_TUNING_EXAMPLES.js](KEYBOARD_TUNING_EXAMPLES.js):
- ✅ Příklad 1: Změnit Ctrl+N na Ctrl+Alt+N
- ✅ Příklad 2: Vypnout Ctrl+E
- ✅ Příklad 3: Přidat nový shortcut
- ✅ Příklad 4-10: Pokročilé případy

## 🔍 KONTROLA V DEVELOPER CONSOLE (F12)

```javascript
// Vidět všechny zkratky
console.log(window.keyboardConfig)

// Zkontrolovat jednu zkratku
console.log(window.keyboardConfig.file.new)

// Testovat shortcut
const e = new KeyboardEvent('keydown', { key: 'n', ctrlKey: true });
console.log(window.matchesShortcut(e, window.keyboardConfig.file.new))  // true ✅
```

## ⚠️ BĚŽNÉ CHYBY

| Chyba | Řešení |
|-------|--------|
| Shortcut nefunguje | Zkontroluj v console: `window.keyboardConfig.xxx` |
| Konflikt (2 stejné) | Grep pro existující: `grep -r "key: 'x'" keyboard.js` |
| Mac vs Windows | Nastav `meta: true` + `ctrl: true` |
| Nový shortcut nefunguje | Přidej handler v `handleGlobalKeyDown()` |

## 📝 STRUKTURA SHORTCUTU

```javascript
{
  key: "n",           // Klávesa (string)
  ctrl: true,         // Vyžadovat Ctrl/Cmd
  shift: false,       // Vyžadovat Shift? (true/false/undefined)
  alt: false,         // Vyžadovat Alt? (true/false/undefined)
  meta: true          // Vyžadovat Cmd? (true/false/undefined)
}
```

## 🚀 COMMIT PO ÚPRAVĚ

```bash
git add keyboard.js
git commit -m "Tune keyboard: [Popis zmeny]"
git push
```

## ❓ POMOC

- Dokumentace: [KEYBOARD_REFACTORING.md](text/KEYBOARD_REFACTORING.md)
- Příklady: [KEYBOARD_TUNING_EXAMPLES.js](KEYBOARD_TUNING_EXAMPLES.js)
- Kód: [keyboard.js](keyboard.js) (řádka ~14 pro config)
- Testy: `npm test` (57 testů)

---

**Vytvořeno:** Unifikace keyboard handlerů z 4 modulů do jednoho
**Status:** ✅ Aktivní, 57/57 testy prošly
**Poslední aktualizace:** Refactoring commit 385ae55
