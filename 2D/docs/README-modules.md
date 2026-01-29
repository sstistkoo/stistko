📍 **SOUSTRUŽNÍK - Parametrické kreslení + AI**

Modulární CAD aplikace pro 2D kreslení s AI asistencí.

---

## 🚀 ZAČNI TADY!

### Spuštění
```bash
# Jednoduše otevři:
index.html

# V prohlížeči se aplikace spustí ihned!
```

### Dokumentace
📖 **VŠECHNA dokumentace je v jednom souboru:**

👉 **[DOCS.md](DOCS.md)** ← KLIKNI TADY

Obsahuje:
- ⚡ Quick Start (3 minuty)
- 🎮 Jak používat aplikaci
- 📁 Struktura a moduly
- 🔧 Technické detaily
- 🏗️ Architektura
- 🚀 Nasazení
- ✅ Troubleshooting

---

## 📁 Struktura

```
index.html          Hlavní aplikace
styles.css          Styly
utils.js            Utility + Geometrie
drawing.js          Canvas engine
canvas.js           Event handlery
ui.js               UI logika
ai.js               AI integrace
init.js             Inicializace
DOCS.md             Kompletní dokumentace
```

---

## ⚡ Quick Start

### 1. Nakresli čáru
- Stiskni **[1]** nebo klikni "Čára"
- Klikni 2x na plátno
- **Čára je nakreslena!** ✅

### 2. Nakresli kružnici
- Stiskni **[2]** nebo klikni "Kružnice"
- Klikni na střed, pak na obvod
- **Kružnice je nakreslena!** ✅

### 3. Použij AI
- Klikni **✨ AI** tlačítko
- Napiš: "Nakresli čtverec 50x50"
- Klikni "Poslat"
- **AI ti pomůže!** ✅

---

## 🎮 Klávesové zkratky

```
1-9, 0     Nástroje
H          Domů (fit all)
Ctrl+S     Uložit projekt
Ctrl+Z     Vrátit
Ctrl+/     Nápověda
```

---

## 💡 Tipy

- ✅ **Bez instalace** - Funguje v libovolném prohlížeči
- ✅ **Offline** - Pracuje bez internetu (AI potřebuje internet)
- ✅ **AutoSave** - Automaticky se ukládá do localStorage
- ✅ **Export** - Ulož jako PNG nebo JSON projekt
- ✅ **Touch** - Plná podpora na mobilu a tabletu

---

## 📚 DOKUMENTACE

### Kompletní průvodce je v souboru **[DOCS.md](DOCS.md)**

Najdeš tam vše, co potřebuješ:

1. 🚀 **Quick Start** - Nejrychlejší start
2. 🛠️ **Přehled** - Co je to?
3. 📁 **Struktura** - Jak je to organizované
4. 🎮 **Návod** - Jak to používat
5. 🔧 **Technologie** - Jak to funguje
6. 🏗️ **Architektura** - Design a principy
7. 🔄 **Migrace** - Od monolitu k modulům
8. 🚀 **Nasazení** - Produkce
9. ✅ **Ověření** - Debugging
10. 📊 **Statistika** - Metriky

---

## 🤖 AI Asistent

- 🤖 Google Gemini API
- 💬 Chat interface
- 📐 Kontext-aware (zná tvůj kresbu)
- 💾 Pamatuje si příkazy

### Jak používat:
```
1. Klikni ✨ AI
2. Napiš co chceš (česky)
3. Klikni Poslat
4. AI ti odpoví s návody
```

---

## 💾 Soubory a formáty

### Ukládání projektu
```
Ctrl+S → Stahne se projekt.json
```

### Načtení projektu
```
Ctrl+O → Vyber projekt.json
```

### Export PNG
```
Ctrl+E → Stahne se PNG obrázek
```

---

## 🐛 Máš problém?

Otevři DevTools (F12) a zkontroluj:

```javascript
// V konzoli:
console.log(window.shapes)   // Tvary
console.log(window.points)   // Body
window.resetView()            // Reset pohledu
localStorage.clear()          // Smaž data
```

→ Více v **[DOCS.md](DOCS.md)** → Troubleshooting

---

## 📊 Statistika

```
JavaScript:    ~2,000 řádků (6 modulů)
CSS:           ~1,600 řádků
HTML:          ~1,200 řádků
Celkem:        ~5,000 řádků

vs. Původní:   13,443 řádků (monolith)
Redukce:       ↓ 62% řádků, ↑ 300% čitelnosti
```

---

## 🎯 Verze

**v1.0** - Kompletní modulární verze
- ✅ 8 modulů
- ✅ Kompletní dokumentace
- ✅ AI integrace
- ✅ Export/Import
- ✅ Undo/Redo
- ✅ Touch support

---

## 🙏 Děkuji!

Vychutnej si aplikaci a kreativně se bavit! 🎨

👉 **Teď běž na [DOCS.md](DOCS.md)** a začni kreslit!

---

**Poslední update:** 18. prosince 2025
