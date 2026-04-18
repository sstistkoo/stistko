# Kristova Bible — Project Overview

## Účel projektu
Webová aplikace zobrazující biblický text (Český Křesťanský překlad) s možností prohlížet původní slova (Strongova čísla) a překlady.

## Struktura souborů

### Frontend (HTML/CSS/JS)
- `index.html` — hlavní stránka aplikace, načte `script.js` a `styl.css`
- `script.js` — hlavní logika aplikace (načítání dat, zobrazení knih, kapitol, versů)
- `styl.css` — styly stránky
- `bible.js` — datový soubor s kompletním biblickým textem (CZ Křesťanský překlad)
- `bible/` — složka s přiloženými soubory např. `bible.html` (verze s odkazovým rozhraním)

### Data
- `strong_bible_cz.json` — mapování Strongových čísel na český překlad původních slov
- `stronghebrew.json` — Strongova čísla pro hebrejská slova
- `strongsgreek.json` — Strongova čísla pro řecká slova
- `StrongHebrewG.xml`, `strongsgreek.xml` — původní XML zdroje (použito k vytvoření JSON)

### Skripty (Python) — zpracování a konverze dat
- `convert_strong.py` — konverze Strongových čísel z XML do JSON
- `convert_hebrew.py` — konverze hebrejských slov
- `translate_strong.py` — překlad Strongových čísel do češtiny
- `translate_hebrew.py` — překlad hebrejských slov
- `translate_greek.py` — překlad řeckých slov
- `fix_greek.py` — opravy řeckých slov
- `split_bible.py` — rozdělení biblického textu na části

### Hlavní merge skripty (Node.js)
- `merge_all_books.js` — sloučení všech knih Bible do jednoho souboru

## Klíčové soubory k vyvíjení
- `index.html` — vstupní bod aplikace
- `script.js` — logika načítání a zobrazení
- `bible.js` — textová data
- `strong_bible_cz.json` — data Strongových čísel
- `bible/` — podpůrné soubory

## Stav projektu
Aplikace je funkční, obsahuje kompletní CZ Křesťanský překlad Bible s možností zobrazit původní slova skrze Strongova čísla.
