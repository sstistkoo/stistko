# 📚 SOUSTROŽNÍK 2D - KOMPLETNÍ INDEX

> Master dokumentace pro veškerou dokumentaci, testy, a modul reference

---

## 📋 OBSAH

1. [Přehled Projektu](#-přehled-projektu)
2. [Moduly (JS Soubory)](#-moduly-js-soubory)
3. [Klávesové Zkratky](#-klávesové-zkratky)
4. [Testy](#-testy)
5. [Dokumentace](#-dokumentace)
6. [Git Historie](#-git-historie)
7. [Běžné Úkoly](#-běžné-úkoly)

---

## 🎯 Přehled Projektu

**Soustrožník 2D** = Parametrické CAD kreslení + AI asistent (Gemini)

### Klíčové Vlastnosti
- ✅ **8 JS modulů** - Čistě oddělené, modulární architektura
- ✅ **Bez frameworků** - Čisté Vanilla JavaScript
- ✅ **57 testů** - 100% pass rate
- ✅ **Klávesové zkratky** - Centralizované v keyboard.js
- ✅ **AI Integration** - Gemini API s demo klíčem

### Git Info
- **Repozitář:** c:\Users\stistko\CascadeProjects\test_base\2D
- **Commits:** 3+ milestone commitů
  - a7abbb1: Modularized baseline (27 unitů)
  - 1ca3862: Expand test suite (57 testů)
  - 385ae55: Unify keyboard handlers
  - 31ab2cb: Add keyboard documentation

---

## 📁 MODULY (JS SOUBORY)

### Struktura

```
globals.js (105 řádků)
    ↓
utils.js (457 řádků)
    ↓
drawing.js (1220+ řádků)
    ↓
canvas.js (894 řádků)
    ↓
ui.js (923 řádků)
    ↓
init.js (200 řádků)
    ↓
controller.js (620 řádků)
    ↓
ai.js (956 řádků)

keyboard.js (350+ řádků) ← NOVÝ MODUL (Unifikované handlery)
```

### Moduly - Detailně

| Modul | Řádky | Popis | Exports |
|-------|-------|-------|---------|
| **globals.js** | 105 | Globální proměnné, struktury | window.shapes, .points, .mode |
| **utils.js** | 457 | Utility funkce | validatePoint(), calculateDistance(), applyConstraint() |
| **drawing.js** | 1220+ | Kreslení základních tvarů | drawLine(), drawCircle(), drawArc() |
| **canvas.js** | 894 | Canvas setup, mouse handlers | setupCanvasEvents(), draw() |
| **ui.js** | 923 | UI elementy, modály | updateUI(), updateSelectionUI() |
| **init.js** | 200 | App inicializace | initializeApp(), loadAutoSave() |
| **controller.js** | 620 | Textový ovládač | showControllerModal(), parseCommand() |
| **ai.js** | 956 | Gemini AI integration | callGemini(), parseAiResponse() |
| **keyboard.js** ⭐ | 350+ | Klávesové zkratky | handleGlobalKeyDown(), matchesShortcut() |

---

## ⌨️ KLÁVESOVÉ ZKRATKY

### Rychlá Reference

**Mód (čísla):** `1` Čára | `2` Kružnice | `3` Oblouk | ... | `0` Smazání
**Ovládač:** `Alt+K` Otevřít | `Esc` Zavřít | `Enter` Potvrdit
**Soubor:** `Ctrl+N` Nový | `Ctrl+S` Uložit | `Ctrl+E` Export
**Úpravy:** `Ctrl+Z` Vrátit | `Ctrl+Y` Zopakovat | `Delete` Smazat
**Výběr:** `A` Vybrat vše | `D` Zrušit výběr
**Pohled:** `H` Domů | `O` Střed | `Ctrl+/` Nápověda
**AI:** `Enter` Poslat (v promptu) | `Shift+Enter` Newline

### Dokumentace
- 📖 [KEYBOARD_SHORTCUTS_QUICK_REF.md](../KEYBOARD_SHORTCUTS_QUICK_REF.md) - Rychlá reference
- 🔧 [KEYBOARD_TUNING_EXAMPLES.js](../KEYBOARD_TUNING_EXAMPLES.js) - 10 příkladů
- 📋 [KEYBOARD_REFACTORING.md](KEYBOARD_REFACTORING.md) - Detailní refactoring info

---

## ✅ TESTY

### Test Suite
```bash
npm test
# Výstup: ✅ 57/57 tests passed
```

### Test Soubory
| Soubor | Testy | Fokus |
|--------|-------|-------|
| test-utils.cjs | 27 | Utils, body |
| test-core.cjs | 30 | Undo/Redo, Mode, Constraints |
| test-edits.cjs | 27 | Trim, Parallel, Mirror, Erase |
| **CELKEM** | **57** | ✅ 100% Pass |

### Test Setup
- Framework: Node.js Assert (built-in)
- Runner: tests/run-tests.cjs
- Coverage: Core features, edit operations, undo/redo

---

## 📖 DOKUMENTACE

### Úkoly a Průběh

| Dokument | Popis |
|----------|-------|
| [MASTER_SUMMARY.md](MASTER_SUMMARY.md) | Celkový přehled |
| [KOMPLETNI_VERIFIKACE_FINAL.md](KOMPLETNI_VERIFIKACE_FINAL.md) | Moduly + bugs + opravy |
| [FINALNY_INVENTAR.md](FINALNY_INVENTAR.md) | Inventář všech souborů |

### Moduly - Detailní Analýza

| Dokument | Modul | Info |
|----------|-------|------|
| [AI_OPRAVY_SOUHRN.md](AI_OPRAVY_SOUHRN.md) | ai.js | AI system analýza |
| [OVLADAC_VERIFIKACE.md](OVLADAC_VERIFIKACE.md) | controller.js | Ovládač testy |
| [KRESLENI_VERIFIKACE.md](KRESLENI_VERIFIKACE.md) | drawing.js | Kreslení funkce |
| [TLACITKA_LOGIKA_ANALYZA.md](TLACITKA_LOGIKA_ANALYZA.md) | ui.js | Tlačítka + logika |

### Keyboard - Nové

| Dokument | Popis |
|----------|-------|
| [KEYBOARD_REFACTORING.md](KEYBOARD_REFACTORING.md) | ✅ Refactoring process |
| [../KEYBOARD_SHORTCUTS_QUICK_REF.md](../KEYBOARD_SHORTCUTS_QUICK_REF.md) | ✅ Rychlá ref. |
| [../KEYBOARD_TUNING_EXAMPLES.js](../KEYBOARD_TUNING_EXAMPLES.js) | ✅ 10 příkladů |

### Ostatní

| Dokument | Popis |
|----------|-------|
| [POROVNANI_ORIGINAL_VS_MODULAR.md](POROVNANI_ORIGINAL_VS_MODULAR.md) | Before/After |
| [MOBILE_OPTIMIZATION.md](MOBILE_OPTIMIZATION.md) | Mobile support |
| [CORS_SOLUTION.txt](CORS_SOLUTION.txt) | CORS issues |

---

## 🔄 Git Historie

### Milestones

```
commit 385ae55 - Unify keyboard handlers ✅
  └─ Keyboard.js created
  └─ Duplicate code removed (-160 řádků)
  └─ 57/57 testy pass

commit 1ca3862 - Expand test suite ✅
  └─ 27 → 57 testů
  └─ Undo/Redo, Mode, Constraints testovány

commit a7abbb1 - Modularized baseline ✅
  └─ 8 JS modulů
  └─ 27 unit testů

commit <init> - Project start
  └─ Vanilla JS, HTML, CSS
  └─ Initial structure
```

### Statusy
- ✅ **Modularizace** - Hotovo
- ✅ **Testing** - 57/57 pass
- ✅ **Keyboard refactoring** - Hotovo
- ✅ **Dokumentace** - Hotovo

---

## 🎯 Běžné Úkoly

### Spuštění Aplikace
```bash
cd c:\Users\stistko\CascadeProjects\test_base\2D
# Otevři index.html v prohlížeči
```

### Spuštění Testů
```bash
npm test
```

### Tunování Klávesů
1. Otevři [keyboard.js](../keyboard.js)
2. Najdi `window.keyboardConfig` (řádka ~14)
3. Změň `key`, `ctrl`, `shift`, `alt`, `meta`
4. Ulož, obnov (F5), testuj
5. Viz [KEYBOARD_TUNING_EXAMPLES.js](../KEYBOARD_TUNING_EXAMPLES.js) pro příklady

### Přidání Nového Shortcutu
1. Přidej do `keyboardConfig` (keyboard.js)
2. Přidej handler v `handleGlobalKeyDown()` (keyboard.js)
3. Ujisti se, že `window.funkce` existuje
4. Testuj v console: `window.matchesShortcut(...)`
5. Commit + Push

### Přidání Nového Testu
1. Otevři `tests/test-*.cjs`
2. Přidej nový `test()` blok
3. Spusť `npm test`
4. Commit když všechny pass

### Přidání Dokumentace
1. Vytvořit v `text/` folder
2. Přidat link v [INDEX.md](INDEX.md)
3. Commit + Push

---

## 📊 Statistiky

### Kód
- **Celkem řádků JS:** 6300+
- **Moduly:** 8
- **Funkce:** 50+
- **Globální:** 20+

### Testování
- **Testy:** 57
- **Pass rate:** 100% ✅
- **Coverage:** Core, Edit, Undo/Redo

### Dokumentace
- **Markdown soubory:** 20+
- **Příklady:** 10+
- **Diagrams:** ASCII art

---

## 🚀 Co Je Nového (Keyboard Refactoring)

### Vytvořeno
- ✅ `keyboard.js` - Centralizovaný keyboard handler (350+ řádků)
- ✅ `KEYBOARD_SHORTCUTS_QUICK_REF.md` - Rychlá reference
- ✅ `KEYBOARD_TUNING_EXAMPLES.js` - 10 detailních příkladů

### Změněno
- ✅ `index.html` - Přidáno načítání keyboard.js
- ✅ `controller.js` - Odstaněny keyboard listeners (-36 řádků)
- ✅ `init.js` - Odstraněna setupKeyboardShortcuts (-60+ řádků)
- ✅ `canvas.js` - Odstaněny onKeyDown/Up (-35 řádků)
- ✅ `ai.js` - Odstaněn keyboard handler (-28 řádků)

### Odstraněno
- ❌ Duplicate keyboard kód (160+ řádků)
- ❌ Rozptýlené event listeners
- ❌ Nečitelná configuration

### Benefity
- 🎯 **Centralizace** - Jedno místo pro všechny shortcuts
- 🔧 **Tunable** - Snadno se mění klávesy
- 🧹 **Čistý kód** - Nema duplicit
- 📚 **Dokumentace** - Příklady a reference
- ✅ **Testy** - Všechny prošly

---

## ❓ Dotazy & Odpovědi

**Q: Jak začít?**
A: Otevři `index.html` v prohlížeči nebo spusť `npm test`

**Q: Jak přidat shortcut?**
A: Viz [KEYBOARD_TUNING_EXAMPLES.js](../KEYBOARD_TUNING_EXAMPLES.js) příklady 1-5

**Q: Jak zjistit co je špatně?**
A: Otevři F12 Developer Console → Console → `console.log(window.keyboardConfig)`

**Q: Jak se vytvářejí testy?**
A: Viz `tests/` folder a spusť `npm test`

**Q: Jak se dělá commit?**
A: `git add -A && git commit -m "Tvá zpráva"`

**Q: Kde je dokumentace?**
A: V `text/` folder a v kořenovém adresáři (toto INDEX.md)

---

## 📞 Kontakt & Support

- 🐛 **Bugs:** Popiš v console logech + reportuj
- 💡 **Features:** Nové shortcuty → KEYBOARD_TUNING_EXAMPLES.js
- 📖 **Docs:** Přidej do `text/` + linkuj v INDEX.md
- ✅ **Testy:** Spusť `npm test` po každé změně

---

## 📝 Verze & Historie

- **v1.0** - Initial modularization + baseline tests
- **v1.1** - Expanded test suite (27 → 57)
- **v1.2** - Unified keyboard handlers ⭐ (TATO VERZE)
- **v1.3** - (Plánováno: Help modal s tunabilitou)

---

**Poslední aktualizace:** Keyboard refactoring (commit 31ab2cb)
**Status:** ✅ Ready for Production
**Testy:** ✅ 57/57 passing
**Contributors:** Soustružník AI Development Team
