# Strong's Translator Pipeline

## Struktura

```
translator_pipeline/
├── extract_g6000.py       # Extrakce G6000+ hesel bez Cz
├── greek_g6000_for_translate.txt  # Vstupní soubor pro překladač
├── strong_translator.html # AI překladač (otevři v prohlížeči)
├── strong_translator_core.js  # Core logika překladače
├── tbesg_extended.txt    # Rozšířená řecká definice (záloha)
└── README.md             # Tento soubor
```

## Workflow

### 1. Příprava dat
```bash
python extract_g6000.py
```
Vytvoří soubor `greek_g6000_for_translate.txt` s G6000+ hesly bez českého překladu.

### 2. Překlad
1. Otevři `strong_translator.html` v prohlížeči
2. Nastav:
   - Provider: Groq nebo Gemini
   - Model: llama-3.3-70b nebo gemini-2.0-flash
   - Batch size: 10-20
3. Nahraj `greek_g6000_for_translate.txt` jako vstup
4. Spusť překlad

### 3. Jazyky
Cílové jazyky pro překlad:
- **sk** - Slovak (Slovenština)
- **pl** - Polish (Polština)
- **bg** - Bulgarian (Bulharština)
- **ch** - Chinese (Čínština)
- **sp** - Spanish (Španělština)
- **cz** - Czech (Čeština) - již částečně

### 4. Po překladu
Po dokončení překladu bude výstup obsahovat všechny jazyky.
Sloučíme zpět do hlavního `strong_updated_detailed_cs.txt`.

## Statistiky
- G6000+ celkem: 5,324 hesel
- G1-G5624: 5,523 hesel (již má Cz z strong_bible_cz.json)

## Poznámky
- G21370 nemá En definici (prázdný v TBESG)
- Překlad pomocí AI dává lepší výsledky než strojový překlad
