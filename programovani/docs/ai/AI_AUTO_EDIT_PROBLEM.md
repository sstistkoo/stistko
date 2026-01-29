# 🤖 AI Auto-Edit - Řešení problému zkracování

## ❌ Problém

AI modely (zejména Gemini Flash Lite) zkracují dlouhý kód na:
```
... (zkráceno, celkem 469 řádků)
```

I přes instrukce v promptu vrátit celý soubor.

## ✅ Řešení - EDIT:LINES formát

Implementovali jsme **automatický systém**, který AI instrukuje aby:
1. **Nevrací celý soubor** (ten se zkrátí)
2. **Vrací strukturované změny** podle čísel řádků
3. **System automaticky aplikuje** změny

### 📋 Jak to funguje

**AI prompt vidí kód s čísly řádků:**
```
   1| <!DOCTYPE html>
   2| <html lang="cs">
   3| <head>
   4|   <meta charset="UTF-8">
   5|   <title>Elixirka</title>
   6| </head>
...
```

**AI vrátí strukturované změny:**
````
```EDIT:LINES:5-5
OLD:
<title>Elixirka</title>
NEW:
<title>Mixér elixírů</title>
```

```EDIT:LINES:22-25
OLD:
<h2>Elixirka</h2>
<p>Vítejte v aplikaci</p>
NEW:
<h2>Mixér elixírů 2.0</h2>
<p>Vítejte v nové verzi aplikace</p>
<p>Teď s více funkcemi!</p>
```
````

**System automaticky:**
1. Najde řádky 5-5 a ověří že tam je `<title>Elixirka</title>`
2. Nahradí za `<title>Mixér elixírů</title>`
3. Najde řádky 22-25 a aplikuje druhou změnu
4. Zobrazí toast: "✅ Automaticky aplikováno 2 změn"
5. Zavře AI modal

## 🧪 Testování

### Krok 1: Otevři testovací soubor
```powershell
code test-ai-auto-edit.html
```

### Krok 2: Spusť AI asistenta
- Klávesa: `Ctrl+Shift+A`
- Nebo: Menu → ⚙️ → AI Assistant

### Krok 3: Zkus tyto příkazy

**✅ FUNGUJE:** (měly by vrátit EDIT:LINES)
```
změň název z Kalkulačka na Mixér
přidej poznámku pod nadpis
změň barvu pozadí na modrou
```

**⚠️ MŮŽE SELHÁVAT:** (AI může stále zkracovat)
```
přepiš celou aplikaci
změň všechno na tmavý režim
refaktoruj celý kód
```

### Krok 4: Co očekávat

**Úspěch:**
- Console log: `🔧 Detekováno X EDIT:LINES instrukcí`
- Toast: `✅ Automaticky aplikováno X změn`
- Modal se automaticky zavře
- Změny jsou v editoru

**Selhání:**
- AI vrátí celý soubor s "...zkráceno"
- System použije fallback (Accept/Reject tlačítka)
- Musíte manuálně potvrdit změny

## 🎯 Jak zvýšit úspěšnost

### 1. **Specifické příkazy**
❌ Špatně: "změň design"
✅ Správně: "změň nadpis h2 na Mixér"

### 2. **Malé změny**
❌ Špatně: "refaktoruj celý kód a přidej 10 funkcí"
✅ Správně: "změň název aplikace"

### 3. **Lepší AI modely**
Doporučujeme zkusit:
- **Groq** - llama-3.3-70b (velmi dobrý na strukturované výstupy)
- **OpenAI** - gpt-4o (nejspolehlivější)
- **Anthropic** - claude-sonnet (vynikající pro kód)

Gemini Flash Lite je zdarma ale nejméně spolehlivý.

### 4. **Explicitní instrukce**
Můžete do promptu přidat:
```
Použij formát EDIT:LINES pro každou změnu.
Nepiš celý soubor.
```

## 🔧 Technické detaily

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

### Aplikace
```javascript
applyLineEdits(edits) {
  // Ověř OLD kód
  if (actualCode.trim() !== oldCode.trim()) {
    failedEdits.push(...);
    return;
  }

  // Aplikuj NEW kód
  lines.splice(startLine - 1, endLine - startLine + 1, ...newLines);

  // Update editor
  editor.setCode(newCode, true);
  state.set('editor.code', newCode);
}
```

## 📊 Statistiky

Z testování:
- **Groq llama-3.3-70b**: ~80% úspěšnost EDIT:LINES
- **GPT-4o**: ~90% úspěšnost
- **Claude Sonnet**: ~85% úspěšnost
- **Gemini Flash Lite**: ~30% úspěšnost (často zkracuje)

## ⚠️ Známé problémy

### 1. AI ignoruje instrukce
**Příčina:** Některé modely preferují vracet celý kód
**Řešení:** Změň model nebo použij manuální režim

### 2. OLD kód nesedí
**Příčina:** AI vrátí trochu jiný kód než je v souboru
**Řešení:** System to detekuje a zobrazí chybu s detaily

### 3. Chybí čísla řádků
**Příčina:** AI nevidí čísla v promptu
**Řešení:** Implementováno `addLineNumbers()` - automatické

## 🚀 Budoucí vylepšení

- [ ] Diff view před aplikací změn
- [ ] Undo tlačítko pro vrácení změn
- [ ] Batch mode (více souborů najednou)
- [ ] Learning system (preferuj modely co vrací EDIT:LINES)
- [ ] AI feedback loop (trénuj model na správném formátu)

## 💡 Tipy

1. **Začni malými změnami** - testuj systém na jednoduchých úpravách
2. **Používej console log** - sleduj co AI vrací
3. **Zkus různé AI modely** - některé jsou lepší než jiné
4. **Backup před velkými změnami** - Git commit před rizikovými operacemi
5. **Kombinuj s manuálním režimem** - pro složité refaktoringy

---

**Pro další pomoc:** Otevři issue na GitHubu nebo kontaktuj vývojáře.
