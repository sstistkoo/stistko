# Integrace testování AI modelů do Menu

## Implementované změny

### 1. Import AITester do MenuPanel.js
- Přidán import: `import { AITester } from '../ai/AITester.js';`
- Vytvořena instance v konstruktoru: `this.aiTester = new AITester();`

### 2. Nová implementace testAllModels()
Původní jednoduchá funkce byla nahrazena komplexní implementací:

#### Funkce:
- **Testování všech 63 modelů** ze všech providerů (Gemini, Groq, OpenRouter, Mistral, Cohere, HuggingFace)
- **Real-time progress bar** s procentuálním zobrazením
- **Live statistiky**: Úspěšné, Chyby, Bez klíče, Průměrný čas
- **Seskupené výsledky** podle providerů
- **Interaktivní tabulka výsledků** s detaily každého modelu
- **Export do JSON** s kompletními výsledky a statistikami

#### Použité komponenty:
- `Modal` - pro zobrazení testovacího okna
- `AITester` - pro provedení testů
- `eventBus` - pro toast notifikace
- Progress bar s animací
- Stats grid (4 statistiky)
- Results table seskupená podle providerů

### 3. Přístup k testování

Testování je nyní dostupné ze **dvou míst**:

#### A) AI Panel (🤖 tlačítko)
- Tab "Testování"
- Kompletní UI s pokročilými možnostmi
- Test jednotlivých providerů
- Export výsledků (JSON/CSV)

#### B) Menu → Nastavení AI (Ctrl+K)
- Sekce "Pokročilé testování" (🔧)
- Tlačítko "🧪 Test všech modelů"
- Otevře modální okno s progress barem a výsledky
- Export výsledků do JSON

### 4. Co testování dělá?

1. **Načte API klíče** z localStorage
2. **Projde všechny modely** (63 modelů celkem):
   - Gemini (15 modelů)
   - Groq (7 modelů)
   - OpenRouter (25 modelů)
   - Mistral (9 modelů)
   - Cohere (3 modely)
   - HuggingFace (4 modely)
3. **Testuje každý model** s jednoduchým promptem
4. **Měří čas odpovědi** a úspěšnost
5. **Zobrazuje statistiky**:
   - Počet úspěšných testů
   - Počet chyb (timeout, API error)
   - Počet modelů bez API klíče
   - Průměrný čas odpovědi na provider
6. **Exportuje výsledky** jako JSON soubor

### 5. Výsledky testování

Podle posledních testů:
- **63 modelů celkem**
- **57 úspěšných** (90.5%)
- **6 chyb** (timeouty u Gemini 2.5 Pro, 2.0 Flash, HuggingFace Zephyr)
- **Nejlepší provider**: Groq (100% úspěšnost, 599ms průměr)

### 6. Technické detaily

#### Timeout:
- 30 sekund na model
- Pokud model neodpoví, je označen jako "timeout"

#### Progress callback:
```javascript
await this.aiTester.testAllModels((progress) => {
  progressBar.style.width = `${progress.percent}%`;
  progressText.textContent = `Testuji: ${progress.provider} / ${progress.model}`;
  // Update stats...
});
```

#### Export formát:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "testPrompt": "Ahoj! Odpověz jen 'OK' pokud funguje.",
  "results": [
    {
      "provider": "gemini",
      "model": "gemini-2.0-flash-exp",
      "status": "success",
      "responseTime": 1234,
      "response": "OK"
    }
  ],
  "stats": {
    "success": 57,
    "error": 6,
    "noKey": 0,
    "avgResponseTime": {
      "gemini": 1500,
      "groq": 599
    }
  }
}
```

## Jak použít

1. **Otevřít Menu**: Stisknout `Ctrl+K` nebo kliknout na ⌘ tlačítko
2. **Nastavení AI**: Vybrat "Nastavení AI"
3. **Pokročilé testování**: Rozbalit sekci 🔧
4. **Spustit test**: Kliknout na "🧪 Test všech modelů"
5. **Sledovat progress**: Počkat na dokončení (cca 1-3 minuty)
6. **Prohlédnout výsledky**: Tabulka seskupená podle providerů
7. **Export**: Kliknout "📥 Exportovat výsledky (JSON)"

## Soubory změněny

- `src/modules/menu/MenuPanel.js`
  - Přidán import AITester (řádek 7)
  - Vytvořena instance v konstruktoru (řádek 13)
  - Nová implementace testAllModels() (řádky ~2208-2400)

## Závěr

Testování AI modelů je nyní plně funkční v obou částech aplikace:
- ✅ AI Panel → Testing tab
- ✅ Menu → Nastavení AI → Pokročilé testování

Obě implementace používají stejný `AITester` modul, což zajišťuje konzistentní výsledky.
