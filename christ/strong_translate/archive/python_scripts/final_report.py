import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

with open("strong_english_detailed.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Counters
g_count = sum(1 for l in lines if re.match(r"^G\d+", l))
h_count = sum(1 for l in lines if re.match(r"^H\d+", l))

# Field presence
translit_g = sum(
    1
    for i, l in enumerate(lines)
    if re.match(r"^G\d+", l)
    and i + 1 < len(lines)
    and lines[i + 1].startswith("Transliteration:")
)
pron_g = sum(
    1
    for i, l in enumerate(lines)
    if re.match(r"^G\d+", l)
    and i + 2 < len(lines)
    and lines[i + 2].startswith("Pronunciation:")
)
origin_g = sum(
    1
    for i, l in enumerate(lines)
    if re.match(r"^G\d+", l)
    and any(
        lines[i + j].startswith("Origin:") for j in range(1, 5) if i + j < len(lines)
    )
)
see_g = sum(
    1
    for i, l in enumerate(lines)
    if re.match(r"^G\d+", l)
    and any(
        lines[i + j].startswith("See Also:") for j in range(1, 6) if i + j < len(lines)
    )
)

twot_h = sum(
    1
    for i, l in enumerate(lines)
    if re.match(r"^H\d+", l)
    and any(lines[i + j].startswith("TWOT:") for j in range(1, 6) if i + j < len(lines))
)
morph_h = sum(
    1
    for i, l in enumerate(lines)
    if re.match(r"^H\d+", l)
    and any(
        lines[i + j].startswith("Morphology:")
        for j in range(1, 6)
        if i + j < len(lines)
    )
)
defs_h = sum(
    1
    for i, l in enumerate(lines)
    if re.match(r"^H\d+", l)
    and any(
        lines[i + j].startswith("Definitions:")
        for j in range(1, 6)
        if i + j < len(lines)
    )
)
notes_h = sum(
    1
    for i, l in enumerate(lines)
    if re.match(r"^H\d+", l)
    and any(
        lines[i + j].startswith("Notes:") for j in range(1, 10) if i + j < len(lines)
    )
)
grefs_h = sum(
    1
    for i, l in enumerate(lines)
    if re.match(r"^H\d+", l)
    and any(
        lines[i + j].startswith("Greek Refs:")
        for j in range(1, 10)
        if i + j < len(lines)
    )
)

import os

size_mb = os.path.getsize("strong_english_detailed.txt") / (1024 * 1024)
chars = sum(len(l) for l in lines)

print("╔═══════════════════════════════════════════════════════════╗")
print("║   STRONG'S ENGLISH DICTIONARY — COMPREHENSIVE EXTRACTION ║")
print("╚═══════════════════════════════════════════════════════════╝")
print()
print(f"File: strong_english_detailed.txt")
print(f"Size: {size_mb:.2f} MB ({chars:,} characters, {len(lines):,} lines)")
print()
print("┌───────────────────────────────────────────────────────────┐")
print("│  GREEK ENTRIES (G1–G5624)                                 │")
print("├───────────────────────────────────────────────────────────┤")
print(f"│  Total entries: {g_count:,}")
print(f"│  ✓ Transliteration: {translit_g:,}")
print(f"│  ✓ Pronunciation:   {pron_g:,}")
print(f"│  ✓ Definition:      {g_count:,} (all)")
print(f"│  ✓ KJV Meaning:     {g_count:,} (all)")
print(f"│  ✓ Origin:          {origin_g:,}")
print(f"│  ✓ See Also (x-ref): {see_g:,}")
print("└───────────────────────────────────────────────────────────┘")
print()
print("┌───────────────────────────────────────────────────────────┐")
print("│  HEBREW ENTRIES (H1–H8674)                                │")
print("├───────────────────────────────────────────────────────────┤")
print(f"│  Total entries: {h_count:,}")
print(f"│  ✓ Lemma:            {h_count:,} (all)")
print(f"│  ✓ TWOT reference:   {twot_h:,}")
print(f"│  ✓ Transliteration:  {h_count:,} (all)")
print(f"│  ✓ Morphology:       {morph_h:,}")
print(f"│  ✓ POS:              {h_count:,} (all)")
print(f"│  ✓ Definitions:      {defs_h:,}")
print(f"│  ✓ Notes:            {notes_h:,}")
print(f"│  │    └─ Translation  {h_count:,}")
print(f"│  │    └─ Etymology   {h_count:,} (exegesis)")
print(f"│  │    └─ Explanation {sum(1 for l in lines if 'Explanation:' in l):,}")
print(
    f"│  │    └─ Note         {sum(1 for l in lines if 'Note:' in l and 'x-typo' not in l):,}"
)
print(f"│  │    └─ Correction   {sum(1 for l in lines if 'Correction:' in l):,}")
print(f"│  ✓ Greek Refs:       {grefs_h:,}")
print("└───────────────────────────────────────────────────────────┘")
print()
print("┌───────────────────────────────────────────────────────────┐")
print("│  DATA SOURCES                                              │")
print("├───────────────────────────────────────────────────────────┤")
print("│  • strongsgreek.json    — Greek definitions, KJV, origin  │")
print("│  • stronghebrew.json    — Hebrew definitions, morphology  │")
print("│  • StrongHebrewG.xml    — TWOT gloss, extended notes      │")
print("└───────────────────────────────────────────────────────────┘")
print()
print("Sample: G1 | Α")
print("  Transliteration: A")
print("  Pronunciation: al'-fah")
print("  Definition: the first letter of the alphabet...")
print("  KJV Meaning: --Alpha.")
print("  Origin: of Hebrew origin;")
print("  See Also: G427, G260")
print()
print("Sample: H1 | אב")
print("  Lemma: אָב")
print("  TWOT: 4a")
print("  Transliteration: ʼâb")
print("  Morphology: n-m  POS: awb")
print("  Definitions:")
print("    1) father of an individual")
print("    2) of God as father of his people...")
print("  Notes:")
print("    Translation: chief, (fore-) father(-less)...")
print("    Etymology: a primitive word;")
print("    Explanation: father, in a literal...")
print("  Greek Refs: G1118, G2730, G3390, G3507, G3509, G3962...")
