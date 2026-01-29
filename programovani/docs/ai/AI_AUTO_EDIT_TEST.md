# 🤖 Automatický systém editace podle čísel řádků

## 📋 Jak to funguje

AI asistent nyní může vracet **strukturované instrukce** místo celého souboru:

### ✅ Formát pro AI

```
```EDIT:LINES:5-7
OLD:
<title>Kalkulačka elixírů</title>
<meta charset="UTF-8">
NEW:
<title>Elixírka</title>
<meta charset="UTF-8">
```

```EDIT:LINES:35-37
OLD:
<h2>Kalkulačka elixírů</h2>
<p>Vítejte</p>
NEW:
<h2>Elixírka</h2>
<p>Vítejte v aplikaci</p>
```
```

### 🔧 Co systém dělá automaticky

1. **Parser** - Detekuje všechny `EDIT:LINES` bloky v odpovědi
2. **Validace** - Ověří, že OLD kód sedí na daných řádcích
3. **Aplikace** - Nahradí OLD za NEW kód
4. **Toast** - Zobrazí počet aplikovaných změn
5. **Zavření** - Automaticky zavře AI modal

### 📊 Výhody

✅ **Přesnost** - AI vidí čísla řádků v promptu (první ~60 řádků)
✅ **Rychlost** - Automatická aplikace bez manuální práce
✅ **Bezpečnost** - Ověřuje OLD kód před změnou
✅ **Spolehlivost** - Aplikuje změny odzadu (žádné posuny čísel)
✅ **Feedback** - Zobrazí co se povedlo/nepovedlo

### 🎯 Testování

1. Otevři editor a vlož nějaký HTML kód (např. kalkulačku)
2. Otevři AI asistenta
3. Požádej: "změň název aplikace z Kalkulačka na Elixy"
4. AI by měla vrátit `EDIT:LINES` blok s OLD/NEW
5. System automaticky aplikuje změnu
6. Toast zobrazí "✅ Automaticky aplikováno 1 změn"

### 📝 Příklad promptu AI

AI vidí kód s čísly řádků:
```
   1| <!DOCTYPE html>
   2| <html>
   3| <head>
   4|   <meta charset="UTF-8">
   5|   <title>Kalkulačka elixírů</title>
   6| </head>
...
```

A vrátí:
```
```EDIT:LINES:5-5
OLD:
<title>Kalkulačka elixírů</title>
NEW:
<title>Elixy</title>
```
```

### ⚠️ Chybové stavy

Pokud OLD kód nesedí:
- ❌ Toast error: "OLD kód nesedí na řádcích X-Y"
- 📋 Zobrazí očekávaný vs skutečný kód
- 🔄 Uživatel může zkusit znovu

Pokud rozsah je mimo soubor:
- ❌ Toast error: "Neplatný rozsah (soubor má X řádků)"

### 🚀 Fallback

Pokud AI nevrátí `EDIT:LINES` formát:
- System použije starý režim (celý soubor s Accept/Reject tlačítky)
- Uživatel musí manuálně potvrdit změny

## � Technické detaily

### Parser
```javascript
parseEditInstructions(response) {
  const pattern = /```EDIT:LINES:(\d+)-(\d+)\s+OLD:\s*([\s\S]*?)\s*NEW:\s*([\s\S]*?)\s*```/g;
  // ...
}
```

### Validace
- Kontrola rozsahu řádků
- Ověření OLD kódu (flexible whitespace)
- Sort odzadu (předchází posunům čísel)

### Aplikace s Undo podporou
```javascript
applyLineEdits(edits) {
  // 1. Uloží současný stav do history.past
  editor.history.past.push(currentEditorCode);

  // 2. Aplikuje změny
  editor.setCode(newCode, true);

  // 3. Nyní Ctrl+Z vrátí změny zpět!
  // 4. Console log: "💾 Undo historie: X kroků"
}
```

### ✅ Opraveno v této verzi
- **Undo/Redo podpora**: Po automatických změnách funguje Ctrl+Z
- **Historie**: Zachovává až 100 kroků zpět
- **Konzole**: Debug log počtu kroků v historii
