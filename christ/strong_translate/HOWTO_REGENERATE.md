# How to Regenerate strong_updated_detailed_cs.txt

## Prerequisites
- Python 3.8+
- All source JSON files present in `stepbible_data/data/`
- Local data files: `strongsgreek.json`, `stronghebrew.json`, `strong_bible_cz.json`
- XML files: `strongsgreek.xml`, `StrongHebrewG.xml` (for BETA codes and notes)

## Steps
1. Open terminal in `strong_translate/` directory
2. Run: `python generate_updated_v2.py`
3. Output: `strong_updated_detailed_cs.txt` (approx. 180K lines)

## What the script does
- Loads STEPBible data (TBESG Greek, TBESH Hebrew)
- Merges Hebrew suffix variants into base entries
- Extracts BETA codes from Greek XML
- Extracts TWOT notes + Hebrew grammar from Hebrew XML
- Combines with custom `strongsgreek.json` / `stronghebrew.json` augmentations
- Applies Czech translations from `strong_bible_cz.json`
- Writes unified format: `G/H#### | lemma` + metadata + `Česky: ...`

## Output format
Each entry:
```
G0001 | α
Transliteration: Alpha
Morphology: G:N-LI
Definice: [...]
KJV Významy: [...]
Česky: první písmeno abecedy; pouze obrazně (od jeho použití jako číslovky) první:
```

## Verification
- Check first entries (G1–G10, H1–H10) manually
- Count: `findstr /R "^G" strong_updated_detailed_cs.txt | find /C "G"` (≈10847)
- Count Hebrew: `findstr /R "^H" ... | find /C "H"` (≈8723)
