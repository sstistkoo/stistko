# Quick Input Module - Dokumentace přesunu

## 📅 Datum: 31. ledna 2026

## 🎯 Cíl

Oddělení Quick Input klávesnice z `ai.js` do samostatného modulu `quick-input.js` pro lepší organizaci kódu.

## 🔄 Provedené změny

### 1. Vytvořen nový modul: `src/quick-input.js`

Nový samostatný modul pro kompaktní klávesnici používanou v AI panelu.

**Funkce přesunuté z `ai.js`:**

#### Modal management:

- `window.openQuickInput()` - Otevře Quick Input modal
- `window.closeQuickInput()` - Zavře Quick Input modal
- `window.confirmQuickInput()` - Potvrdí zadání a pošle do AI
- `window.clearQuickInput()` - Vymaže obsah Quick Input

#### Token manipulation:

- `window.insertToken(token)` - Vloží znak/token
- `window.backspaceToken()` - Smaže poslední znak

#### Help management:

- `window.showQuickInputHelp()` - Zobrazí nápovědu (sdílí s Controller)
- `window.closeQuickInputHelp()` - Zavře nápovědu

#### Direction modal:

- `window.showDirectionModal()` - Otevře výběr směru (šipky)
- `window.closeDirectionModal()` - Zavře výběr směru
- `window.insertDirection(angle)` - Vloží polární úhel

#### Length modal:

- `window.openLengthModal()` - Otevře zadání délky
- `window.closeLengthModal()` - Zavře zadání délky
- `window.insertLengthToken(type)` - Nastaví typ (L/RP)
- `window.confirmLength()` - Potvrdí a vloží délku

#### Mode management:

- `window.toggleQiMode()` - Přepne G90/G91
- `window.setQiMode(mode)` - Nastaví specifický režim

### 2. Upraveno: `src/ai.js`

Odstraněny všechny Quick Input funkce (cca 120 řádků kódu).

**Ponechány:**

- `handleSemicolonInInput()` - validace G-code (používá quickInputDisplay)
- `setupCNCInputListeners()` - event listenery pro validaci
- Image handling funkce (patří k AI)

### 3. Upraveno: `index.html`

Přidán odkaz na nový modul:

```html
<script src="src/controller.js"></script>
<script src="src/quick-input.js"></script>
<!-- AI moduly - ES6 kompatibilní -->
```

## 📊 Porovnání modulů

| Modul              | Účel          | Primární použití        | Složitost                        |
| ------------------ | ------------- | ----------------------- | -------------------------------- |
| **controller.js**  | CNC ovladač   | G-code kreslení na mapu | **Vysoká** ⬆️ (bude rozšiřováno) |
| **quick-input.js** | AI klávesnice | Zadávání příkazů pro AI | **Nízká** ✅ (stabilní)          |

## 🔗 Sdílené komponenty

### HTML Modals:

- `#quickInputModal` - Quick Input klávesnice (quick-input.js)
- `#controllerModal` - Controller klávesnice (controller.js)
- `#controllerHelpModal` - **Sdílená nápověda** (oba moduly)
- `#directionModal` - Výběr směru (quick-input.js)
- `#lengthModal` - Zadání délky (quick-input.js)

### Klávesové zkratky:

- **Q** → `window.openQuickInput()` - Quick Input
- **C** → `window.showControllerModal()` - Controller

## ✅ Výhody separace

1. **Lepší organizace kódu**
   - Controller pro pokročilé G-code funkce
   - Quick Input pro jednoduché AI zadávání

2. **Snadnější údržba**
   - Controller může růst bez ovlivnění AI panelu
   - Quick Input zůstává stabilní

3. **Přehlednost**
   - Každý modul má jasně definovaný účel
   - Snazší orientace v kódu

## 🧪 Testování

### Funkce k otestování:

- [ ] Otevření Quick Input (klávesa Q)
- [ ] Vkládání tokenů (čísla, X, Z)
- [ ] Mazání znaků (⌫)
- [ ] Vymazání celého obsahu (C)
- [ ] Potvrzení a odeslání do AI (✓)
- [ ] Výběr směru (🧭)
- [ ] Zadání délky (📏)
- [ ] Přepínání G90/G91
- [ ] Zobrazení nápovědy (?)

### Ověření zpětné kompatibility:

- [ ] AI panel funguje správně
- [ ] Klávesové zkratky fungují
- [ ] Validace G-code funguje
- [ ] Event listenery pro středník fungují

## 📝 Poznámky

- Quick Input **sdílí nápovědu** s Controllerem (controllerHelpModal)
- Validace G-code zůstává v `ai.js` (používá oba moduly)
- Všechny funkce zachovávají zpětnou kompatibilitu (`window.*`)

## 🚀 Další kroky

1. **Controller rozšíření:**
   - Pokročilé G-code funkce
   - Import/export G-code
   - Makra a šablony
   - Historie příkazů

2. **Quick Input stabilizace:**
   - Minimální změny
   - Focus na stabilitu
   - Bug fixing pouze

## 👨‍💻 Autor

Refactoring provedený: 31. ledna 2026
