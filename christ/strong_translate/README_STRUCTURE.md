# Strong Greek/Hebrew → Czech Dictionary Project

## Current Structure (2026-04-20)

```
strong_translate/
│
├── generate_updated_v2.py          ← MAIN generator script (active)
├── strong_updated_detailed_cs.txt  ← PRIMARY output — Czech detailed (8.4 MB)
├── strong_english_detailed.txt     ← English detailed output (4.6 MB)
├── strong_greek_detailed.txt       ← Greek detailed output (0.8 MB)
├── strong_hebrew_detailed.txt      ← Hebrew detailed output (1.4 MB)
├── strong_greek_for_translate.txt  ← Greek subset for translation (0.4 MB)
├── strong_hebrew_for_translate.txt ← Hebrew subset for translation (1.0 MB)
│
├── strong_translator.html          ← Web UI (main application)
├── strong_translator_core.js       ← JavaScript logic for Web UI
│
├── package.json                    ← Jest test configuration
├── jest.config.cjs
│
├── stepbible_data/                 ← SOURCE DATA (33 MB)
│   ├── data/
│   │   ├── stepbible-tbesg.json    ← Greek Short Lexicon (6.9 MB)
│   │   ├── stepbible-tbesh.json    ← Hebrew Short Lexicon (4.0 MB)
│   │   └── stepbible-tflsj.json    ← Full LSJ Greek Lexicon (22.4 MB)
│   ├── src/                        ← TypeScript library source
│   └── scripts/                    ← Import utilities
│
├── final/                          ← Generated JSON outputs
│   ├── stronghebrew.json
│   ├── strongsgreek.json
│   ├── strong_bible_cz.json
│   ├── strong_cz_clean.json
│   ├── strong_translations_final.{txt,json}
│   └── strong_translations_full.json
│
├── archive/
│   ├── python_scripts/             ← 33 legacy/diagnostic Python scripts
│   │   (audit, inspect, check, stats, generate_english, translate, etc.)
│   └── js_utils/                   ← 8 JS utility scripts (one-off)
│
└── backup/
    └── xml_old/                    ← Old XML sources (2021)
        ├── StrongHebrewG.xml       (6.14 MB)
        └── strongsgreek.xml        (2.51 MB)

```

## Key Facts

- **Active generator**: `generate_updated_v2.py` (last modified 19.04. 22:30)
- **Primary output**: `strong_updated_detailed_cs.txt` (181 384 lines, 10 847 G + 8 723 H entries)
- **Pipeline**: STEPBible JSON (`stepbible_data/`) + custom JSON (`strong*.json`) + XML (BETA codes) → `strong_updated_detailed_cs.txt`
- **Web UI**: Opens `strong_translator.html` in browser, loads the TXT file for interactive AI translation

## What You Can Delete (if needed)

- **`archive/`** — old one-time scripts (safe to delete if you don't need to rerun them)
- **`backup/xml_old/`** — obsolete XML sources from 2021 (keep only if you need reference)
- **`final/`** reports: `augmentation_report.txt`, `extraction_report.txt` (already removed)
- Any `*_detailed_ascii.txt`, `*_detailed_cs_headers.txt` — superseded by `strong_updated_detailed_cs.txt`

## Keep Always

- `generate_updated_v2.py` — current generator
- `strong_updated_detailed_cs.txt` — main output
- `strong_translator.html` + `strong_translator_core.js` — Web UI
- `stepbible_data/` — source lexicon data (required for regeneration)
- `final/*.json` — intermediate JSON outputs (used by generator)
