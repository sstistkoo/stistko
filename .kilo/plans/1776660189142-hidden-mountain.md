# Plán: Úprava skriptu pro generování vstupního TXT

## Cíl
Upravit `generate_updated_v2.py` (nebo vytvořit nový skript) pro generování `strong_updated_detailed_cs.txt` s:
1. **Novými popisky polí**:
   - `Transliteration:` → `Prepis:`
   - `Morphology:` → `Tvaroslovi:`
2. **Diakritika v `Česky:` ponechána** — aktuální překlady zůstanou nezměněné (jsou pouze názorné, obsahují chyby, nebudeme je řešit).
3. **Formát ostatních polí zachován** ( Definicice:`, `KJV Významy:`, `BETA:` atd.).
4. **Výstupní soubor**: přepsat `strong_updateed_detailed_cs.txt` (neměníme název).

## Poznámky
- České překlady budeme později upravovat ručně přes `strong_translator.html` (UI). TXT je pouze vstup pro UI.
- Skript bude generovat celý soubor v jednom běhu (žádné přírůstkové změny).
- Všechna existující pole zůstanou, pouze se změní kétikét popiska.

## Postup

### Krok 1 — Lokální analyse generate_updated_v2.py
- Najít místa, kde se zapisují:
  - `Transliteration:`
  - `Morphology:`
- Potvrdit, že jiné pole zůstávají beze změny.

### Krok 2 — Úprava skriptu
- Změnit stringy:
  ```python
  output_lines.append(f"Transliteration: {translit}")
  ```
  na
  ```python
  output_lines.append(f"Prepis: {translit}")
  ```
  a
  ```python
  output_lines.append(f"Morphology: {morph}")
  ```
  na
  ```python
  output_lines.append(f"Tvaroslovi: {morph}")
  ```
- V případě Greek i Hebrew částí (obě používají tyto labely).
- Ponechat `Česky:` a další pole.

### Krok 3 — Test
1. Zálohovat původní `strong_updated_detailed_cs.txt` (např. `strong_updated_detailed_cs.txt.bak`).
2. Spustit: `python generate_updated_v2.py`
3. Ověřit výsledek:
   - Hledání `Prepis:` a `Tvaroslovi:` ve výstupu
   - Ověřit, že `Česky:` zůstává
   - Kontrola UKAZNIHO vs: G1, H1 (viz níže)
4. Načíst ve `strong_translator.html` — UI by mělo zobrazit nové labely.

### Krok 4 — Validace
- Očekávaný formát entry (G1):
  ```
  G1 | α
  BETA: A
  Prepis: Alpha
  Tvaroslovi: G:N-LI
  Definice: ...
  KJV Významy: Alpha
  Česky: první písmeno abecedy...
  ```
- Hebrew (H1):
  ```
  H1 | א
  BETA: --
  Prepis: aleph
  Tvaroslovi: H:N-M-P
  Definice: ...
  KJV Významy: Aleph
  Česky: ...
  ```
- Počet řádků: ~181 384 (slechý divergence +/- 100)

## Důležité
- Nepřepisovat `Česky:` — i s chybami (budeme opravovat později v UI).
- Nepřidávat/odebírat pole.
- Zachovat pořadí polí stejné.

## Výstup
- `strong_updated_detailed_cs.txt` je přepsán novou verzí.

## Čas
- 15–30 minut (úprava + test).
