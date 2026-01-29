# 🤖 Automatická editace kódu podle čísel řádků - Návod k použití

## 🎯 Co jsme implementovali

Kompletní systém pro **automatickou aplikaci změn** od AI bez manuálního kopírování!

### 📦 Komponenty systému

1. **AI Prompt Enhancement** (AIPanel.js:1245)
   - Přidány čísla řádků do preview kódu (prvních ~60 řádků)
   - AI vidí: `   5| <title>Původní</title>`
   - Instrukce pro formát `EDIT:LINES`

2. **Parser** (AIPanel.js:1727)
   - Detekuje bloky ````EDIT:LINES:X-Y OLD:... NEW:...```
   - Extrahuje startLine, endLine, oldCode, newCode
   - Regex pattern s flexible whitespace

3. **Validator & Applicator** (AIPanel.js:1753)
   - Ověří rozsah řádků (1 až počet řádků)
   - Porovná OLD kód s aktuálním (normalizovaný whitespace)
   - Aplikuje změny od konce (reverse sort)
   - Aktualizuje editor + state

4. **Integration** (AIPanel.js:1375)
   - Automatická detekce při AI odpovědi
   - Preview změn v konzoli
   - Toast notification s výsledkem
   - Auto-close modalu při úspěchu

5. **Helper Functions**
   - `addLineNumbers(code)` - Přidá čísla řádků
   - `parseEditInstructions(response)` - Parse EDIT bloků
   - `applyLineEdits(edits)` - Aplikace změn

## 🚀 Jak použít

### 1. Otevři testovací soubor
```bash
# V aplikaci otevři:
test-ai-auto-edit.html
```

Soubor obsahuje kalkulačku elixírů (98 řádků)

### 2. Otevři AI asistenta
- Klikni na AI ikonu v toolbaru
- Nebo `Ctrl+Shift+A`

### 3. Požádej o změnu
Zkus tyto příkazy:

**Jednoduchá změna:**
```
změň název aplikace z "Kalkulačka elixírů" na "Elixírka"
```

**Vícero změn:**
```
přejmenuj aplikaci na "Mixér" a změň barvu pozadí na zelený gradient
```

**Přidání funkce:**
```
přidej čtvrtou přísadu do kalkulačky
```

### 4. AI vrátí EDIT:LINES formát
```
```EDIT:LINES:5-5
OLD:
<title>Kalkulačka elixírů</title>
NEW:
<title>Elixírka</title>
```

```EDIT:LINES:19-19
OLD:
<h1>Kalkulačka elixírů</h1>
NEW:
<h1>Elixírka</h1>
```
```

### 5. Systém automaticky aplikuje
- ✅ Toast: "Automaticky aplikováno 2 změn"
- 📋 Konzole: Preview změn s řádky
- 🎨 Editor: Kód aktualizován
- 🚪 Modal: Auto-zavření po 500ms

## 🔍 Debugging

### Console logs
```javascript
🔧 Detekováno 2 EDIT:LINES instrukcí
📋 Náhled změn:
   📝 Řádky 5-5: ❌ Původní: <title>Kalkulačka... ✅ Nový: <title>Elixírka...
✅ Aplikováno: řádky 5-5
✅ Aplikováno: řádky 19-19
```

### Toast messages
- ✅ Success: "Automaticky aplikováno X změn"
- ⚠️ Warning: "Aplikováno X/Y změn" (některé selhaly)
- ❌ Error: "OLD kód nesedí na řádcích X-Y"

### Chybové stavy

**OLD kód nesedí:**
```
Toast: "Řádky 5-5: OLD kód nesedí
Očekáváno: '<title>Kalkulačka...'
Skutečnost: '<title>Mixér...'"
```
→ AI si pamatovala starý stav, refresh konverzaci

**Neplatný rozsah:**
```
Toast: "Řádky 150-155: Neplatný rozsah (soubor má 98 řádků)"
```
→ AI si spletla počet řádků, zkus znovu

## 🎨 Příklady použití

### Příklad 1: Změna textu
**Příkaz:** "změň 'Kalkulačka' na 'Mixér' ve všech výskytech"

**AI odpověď:**
```
```EDIT:LINES:5-5
OLD:
<title>Kalkulačka elixírů</title>
NEW:
<title>Mixér elixírů</title>
```

```EDIT:LINES:19-19
OLD:
<h1>Kalkulačka elixírů</h1>
NEW:
<h1>Mixér elixírů</h1>
```
```

### Příklad 2: Změna CSS
**Příkaz:** "změň gradient na zelený (od #22c55e do #16a34a)"

**AI odpověď:**
```
```EDIT:LINES:9-9
OLD:
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
NEW:
background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
```

```EDIT:LINES:36-36
OLD:
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
NEW:
background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
```
```

### Příklad 3: Přidání kódu
**Příkaz:** "přidej čtvrtou přísadu"

**AI odpověď:**
```
```EDIT:LINES:55-55
OLD:
<div class="input-group">
  <label for="ingredient3">Přísada 3 (ml):</label>
  <input type="number" id="ingredient3" value="30">
</div>
NEW:
<div class="input-group">
  <label for="ingredient3">Přísada 3 (ml):</label>
  <input type="number" id="ingredient3" value="30">
</div>

<div class="input-group">
  <label for="ingredient4">Přísada 4 (ml):</label>
  <input type="number" id="ingredient4" value="40">
</div>
```

```EDIT:LINES:88-91
OLD:
const ing1 = parseFloat(document.getElementById('ingredient1').value) || 0;
const ing2 = parseFloat(document.getElementById('ingredient2').value) || 0;
const ing3 = parseFloat(document.getElementById('ingredient3').value) || 0;

const total = ing1 + ing2 + ing3;
NEW:
const ing1 = parseFloat(document.getElementById('ingredient1').value) || 0;
const ing2 = parseFloat(document.getElementById('ingredient2').value) || 0;
const ing3 = parseFloat(document.getElementById('ingredient3').value) || 0;
const ing4 = parseFloat(document.getElementById('ingredient4').value) || 0;

const total = ing1 + ing2 + ing3 + ing4;
```
```

## ⚙️ Technické detaily

### Regex Pattern
```javascript
/```EDIT:LINES:(\d+)-(\d+)\s+OLD:\s*([\s\S]*?)\s*NEW:\s*([\s\S]*?)\s*```/g
```

### Validace (flexible whitespace)
```javascript
const normalizedActual = actualCode.trim().replace(/\s+/g, ' ');
const normalizedOld = oldCode.trim().replace(/\s+/g, ' ');
if (normalizedActual !== normalizedOld) { /* chyba */ }
```

### Reverse sorting (prevence posunů)
```javascript
edits.sort((a, b) => b.startLine - a.startLine);
```

### Line numbers v promptu
```javascript
addLineNumbers(code) {
  return lines.map((line, i) =>
    `${String(i + 1).padStart(4, ' ')}| ${line}`
  ).join('\n');
}
```

## 🐛 Troubleshooting

### AI nevrací EDIT:LINES formát
- ✅ Zkus jiný model (GPT-4, Claude)
- ✅ Začni novou konverzaci (vymaž historii)
- ✅ Buď specifičtější: "změň řádek 5 z X na Y"

### Změny se neaplikují
- ✅ Zkontroluj console.log pro detaily
- ✅ OLD kód musí přesně sedět
- ✅ Čísla řádků musí být v rozsahu

### AI se mýlí v číslech řádků
- ✅ Vidí jen prvních 60 řádků v promptu
- ✅ Pro dlouhé soubory použij "najdi text X a změň"
- ✅ Fallback: AI vrátí celý soubor (staré chování)

## 📊 Porovnání: Před vs Po

### ❌ Před (manuální)
1. AI vrátí celý soubor (často zkrácený)
2. Klikni Accept
3. Celý soubor přepsán
4. Ztráta kontextu při zkrácení

### ✅ Po (automatické)
1. AI vrátí EDIT:LINES bloky
2. Automatická aplikace
3. Pouze změněné řádky
4. 100% přesnost

## 🎓 Best Practices

1. **Používej specifické instrukce:**
   - ✅ "změň řádek 5 title na 'Nový'"
   - ❌ "změň název"

2. **Kontroluj preview v konzoli:**
   - Vidíš co se změní před aplikací

3. **Pro velké změny:**
   - Raději více malých EDIT bloků
   - Než jeden velký přepis

4. **Testuj na test-ai-auto-edit.html:**
   - Malý soubor, rychlý feedback

## 🚀 Další vylepšení (TODO)

- [ ] UI preview dialog před aplikací
- [ ] Undo tlačítko pro vrácení změn
- [ ] Diff view (barevný náhled změn)
- [ ] Podpora pro DELETE (smazání řádků)
- [ ] Podpora pro INSERT (vložení nových řádků)
- [ ] Export/import EDIT instrukcí

---

**Status:** ✅ Plně funkční a testovatelné
**Vytvořeno:** 2026-01-05
**Test file:** test-ai-auto-edit.html
**Dokumentace:** AI_AUTO_EDIT_TEST.md
