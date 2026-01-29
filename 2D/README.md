# 🎨 Soustružník - Parametrické CAD kreslení + AI

> **Moderní webová CAD aplikace s AI asistencí pro parametrické 2D kreslení**

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Web-orange.svg)

---

## ✨ Hlavní Funkce

✅ **Parametrické kreslení** - Čáry, kružnice, oblouky, tečny, kolmice
✅ **AI asistentka** - Google Gemini API pro návody a konstrukční tipy
✅ **Kóty a rozměry** - ProfesionálníAnnotace s barevnými nastaveními
✅ **Export & Uložení** - PNG export, JSON persistence
✅ **Plná mobilní podpora** - Desktop, tablet, smartphone
✅ **Historie akcí** - Undo/Redo s klávesovými zkratkami
✅ **Geometrické operace** - Tečny, kolmice, průsečíky, atd.

---

## 🚀 Rychlý Start

### 1️⃣ Otevři aplikaci
```bash
# Nejrychlejší - přímé otevření
index.html

# Nebo s Live Serverem (VS Code)
Right-click na index.html → Open with Live Server
```

### 2️⃣ První krok
```
1. Klikni [1] nebo "Čára"
2. Klikni 2x na plátno → Čára je nakreslena! ✨
```

### 3️⃣ Použij AI
```
Klikni "✨ AI" → Napiš: "Nakresli čtverec 50x50" → Enter ✅
```

---

## 📁 Struktura Projektu

```
2D/
├── 📄 index.html              ← Vstupní bod aplikace
├── 🎨 styles.css              ← Styling (desktop/mobile)
├── 📦 package.json            ← Dependency management
│
├── 📂 src/                    ← JavaScript moduly (8 souborů)
│   ├── globals.js             ← Globální proměnné & konstant
│   ├── keyboard.js            ← Klávesové zkratky
│   ├── utils.js               ← Utility & Geometrické výpočty
│   ├── drawing.js             ← Canvas rendering engine
│   ├── canvas.js              ← Event handling & input
│   ├── ui.js                  ← UI logika & Modals
│   ├── controller.js          ← Logika aplikace
│   └── ai.js                  ← Gemini AI integrace
│
├── 📂 lib/                    ← Inicializace
│   └── init.js                ← Setup & startup
│
├── 📂 docs/                   ← Dokumentace (5 souborů)
│   ├── README-modules.md      ← Přehled modulů
│   ├── DOCS.md                ← Kompletní dokumentace
│   ├── INDEX.md               ← Mapování modulů
│   ├── KEYBOARD_REFACTORING.md ← Klávesové zkratky
│   └── SUMMARY.txt            ← Souhrn projektu
│
├── 📂 tests/                  ← Unit testy
│   ├── run-tests.cjs
│   ├── test-core.cjs
│   ├── test-drawing.cjs
│   ├── test-edits.cjs
│   └── test-utils.cjs
│
├── 📂 zaloha/                 ← Backup (legacy)
│   └── full.html              ← Originální monolitická verze
│
└── 📂 .gitignore              ← Git konfigurace
```

---

## 🎮 Klávesové Zkratky

| Klávesa | Funkce |
|---------|--------|
| **1-8** | Režimy kreslení (Čára, Kružnice, Oblouk, atd.) |
| **T** | Tečna |
| **P** | Kolmice |
| **D** | Rozměr/Kóta |
| **Delete** | Smazat vybraný objekt |
| **Ctrl+Z** | Zpět (Undo) |
| **Ctrl+Y** | Vpřed (Redo) |
| **Ctrl+S** | Uložit do JSON |
| **Ctrl+E** | Export PNG |
| **Shift** | Chytit mode (Pan plátno) |

📖 Více zkratek najdeš v `docs/KEYBOARD_REFACTORING.md`

---

## 🔧 Technologie

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Canvas:** 2D Context s transformacemi a viewport managementem
- **AI:** Google Gemini API (v1.33.0)
- **Storage:** localStorage pro persistence
- **Build:** Node.js + npm (testy)

---

## 📚 Dokumentace

| Soubor | Popis |
|--------|-------|
| **[docs/README-modules.md](docs/README-modules.md)** | Detailní přehled každého modulu |
| **[docs/DOCS.md](docs/DOCS.md)** | Kompletní dokumentace (834 řádků) |
| **[docs/INDEX.md](docs/INDEX.md)** | Mapování struktur a funkcí |
| **[docs/KEYBOARD_REFACTORING.md](docs/KEYBOARD_REFACTORING.md)** | Architektura klávesnic |
| **[docs/SUMMARY.txt](docs/SUMMARY.txt)** | Souhrn projektu |

---

## 🏗️ Architektura

### Modularní Design
Projekt je rozdělen na 8 logických modulů s jasnou separací zodpovědnosti:

```
User Input (canvas.js)
    ↓
Controller (controller.js)
    ↓
Drawing Engine (drawing.js)
    ├→ Canvas API (canvas.js)
    ├→ Utils (utils.js)
    └→ Globals (globals.js)
    ↓
UI & AI (ui.js, ai.js)
    ↓
Keyboard (keyboard.js)
    ↓
Storage (localStorage)
```

### Globální State
```javascript
window.shapes = [];           // Všechny objekty na plátně
window.selectedIndex = -1;    // Vybraný objekt
window.mode = "line";         // Aktuální režim kreslení
window.history = [];          // Undo/Redo stack
window.dimensionLineColor = "#ffa500";    // Barva kót
window.dimensionTextColor = "#ffff99";    // Barva textu kót
```

---

## ✅ Ověření Funkčnosti

### Testování
```bash
# Spustit testy
npm test

# Spustit testy v watch režimu
npm test:watch
```

### Manuální testování
1. ✅ Nakreslit všechny typy prvků (čáry, kružnice, oblouky)
2. ✅ Přidat kóty a změnit jejich barvu
3. ✅ Testovat AI s různými pokyny
4. ✅ Vyzkoušet Undo/Redo
5. ✅ Export PNG
6. ✅ Uložit a znovu načíst projekt

---

## 🚀 Nasazení

### Produkční nasazení
```bash
# 1. Optimalizuj kód
npm run build

# 2. Nahraj na server
# (FTP, GitHub Pages, Vercel, atd.)

# 3. Nebo použij Python server pro lokální demo
npm start
# Pak: http://localhost:8000
```

### GitHub Pages
```bash
# 1. Pushuj do gh-pages větve
git checkout -b gh-pages
git push origin gh-pages

# 2. Aktivuj v Settings → Pages
# 3. Dostupné na: https://username.github.io/soustruznik-2d
```

---

## 🤝 Spoluprácovat

Příspěvky jsou vítány!

1. Fork projekt
2. Vytvoř feature branch (`git checkout -b feature/cool-feature`)
3. Commit změny (`git commit -m "Add cool feature"`)
4. Push do branche (`git push origin feature/cool-feature`)
5. Otevři Pull Request

---

## 📝 Licence

MIT License - viz soubor [LICENSE](LICENSE)

---

## 🎓 Výukové Příklady

### Příklad 1: Nakreslit obdélník
```
1. Stiskni [1] - Čára
2. Nakresli 4 čáry do tvaru obdélníku
3. Stiskni [D] - Kóta
4. Přidej rozměry na každou stranu
```

### Příklad 2: Tečna k bodu a kružnici
```
1. Stiskni [2] - Kružnice, nakresli kružnici
2. Stiskni [1] - Čára, vytvoř bod mimo kružnici
3. Stiskni [T] - Tečna
4. Klikni na bod a blízko kružnice
✅ AI ti vysvětlí postup!
```

### Příklad 3: Použít AI pro nápovědu
```
1. Klikni "✨ AI"
2. Napiš: "Jak nakreslit pravidelný šestiúhelník?"
3. AI vrátí návod s kroky
4. Následuj pokyny a nakresli!
```

---

## 🐛 Hlášení Bugů

Pokud najdeš bug:
1. Zkontroluj [Issues](../../issues) - možná je již hlášen
2. Vytvoř nový Issue s popisem problému
3. Přidej screenshot/video pokud možno

---

## 💡 Budoucí Vylepsení

- [ ] 3D kreslení
- [ ] Objekty (Rectangle, Polygon, atd.)
- [ ] Vrstvení (Layers)
- [ ] Spolupráce v reálném čase
- [ ] Vlastní prvky (Custom Shapes)
- [ ] Offline režim
- [ ] Dark/Light theme volby

---

## 📞 Kontakt

📧 Email: [tvůj-email@example.com]
🐦 Twitter: [@your-twitter]
💻 Web: [tvůj-web.com]

---

**Vytvořeno s ❤️ pro CAD nadšence**

*Poslední aktualizace: 22. prosince 2025*
