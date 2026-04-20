import re

with open("strong_english_detailed.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()
    content = "".join(lines)

total_lines = len(lines)

# ============================================================
# PART 1: Basic Stats
# ============================================================
g_headers = [l for l in lines if re.match(r"^G\d+", l)]
h_headers = [l for l in lines if re.match(r"^H\d+", l)]

print("=== PART 1: BASIC STATS ===")
print(f"Total lines: {total_lines:,}")
print(f"Greek entries (G): {len(g_headers):,}")
print(f"Hebrew entries (H): {len(h_headers):,}")

# Order check
last_g_idx = None
first_h_idx = None
for i, l in enumerate(lines):
    if re.match(r"^G\d+", l) and "|" in l:
        last_g_idx = i
    if re.match(r"^H\d+", l) and "|" in l:
        if first_h_idx is None:
            first_h_idx = i
print(f"Last G entry at line: {last_g_idx + 1 if last_g_idx else 'N/A'}")
print(f"First H entry at line: {first_h_idx + 1 if first_h_idx else 'N/A'}")
if last_g_idx and first_h_idx and last_g_idx < first_h_idx:
    print("[OK] Order correct")
else:
    print("[ERROR] ORDER ISSUE!")

# ============================================================
# PART 2: GREEK FIELD COVERAGE
# ============================================================
print("\n=== PART 2: GREEK FIELD ANALYSIS ===")

g_beta = sum(1 for l in lines if l.startswith("BETA:"))
g_translit = sum(1 for l in lines if l.startswith("Transliteration:"))
g_pron = sum(1 for l in lines if l.startswith("Pronunciation:"))
g_def = sum(1 for l in lines if l.startswith("Definition:"))
g_kjv = sum(1 for l in lines if l.startswith("KJV Meaning:"))
g_origin = sum(1 for l in lines if l.startswith("Origin:"))
g_see = sum(1 for l in lines if l.startswith("See Also:"))

print(f"BETA:                 {g_beta:,}")
print(f"Transliteration:      {g_translit:,}")
print(f"Pronunciation:        {g_pron:,}")
print(f"Definition:           {g_def:,}")
print(f"KJV Meaning:          {g_kjv:,}")
print(f"Origin:               {g_origin:,}")
print(f"See Also:             {g_see:,}")

# Sample G1–G10 fields
print("\n--- Sample G1–G10 fields (present? Y/N) ---")
for header in g_headers[:10]:
    idx = lines.index(header)
    num = re.match(r"G(\d+)", header).group(1)
    fields = []
    for offset in range(1, 7):
        if idx + offset < len(lines):
            l = lines[idx + offset]
            if l.startswith("BETA:"):
                fields.append("BETA")
            elif l.startswith("Transliteration:"):
                fields.append("TRANS")
            elif l.startswith("Pronunciation:"):
                fields.append("PRON")
            elif l.startswith("Definition:"):
                fields.append("DEF")
            elif l.startswith("KJV Meaning:"):
                fields.append("KJV")
            elif l.startswith("Origin:"):
                fields.append("ORIGIN")
            elif l.startswith("See Also:"):
                fields.append("SEE")
            elif re.match(r"^[GH]\d+", l) or l.strip() == "":
                break
    print(f"  G{num}: {' | '.join(fields) if fields else 'EMPTY'}")

# Sample G5620–G5624
print("\n--- Sample G5620–G5624 ---")
for header in g_headers[-5:]:
    idx = lines.index(header)
    num = re.match(r"G(\d+)", header).group(1)
    fields = []
    for offset in range(1, 7):
        if idx + offset < len(lines):
            l = lines[idx + offset]
            if l.startswith("BETA:"):
                fields.append("BETA")
            elif l.startswith("Transliteration:"):
                fields.append("TRANS")
            elif l.startswith("Pronunciation:"):
                fields.append("PRON")
            elif l.startswith("Definition:"):
                fields.append("DEF")
            elif l.startswith("KJV Meaning:"):
                fields.append("KJV")
            elif l.startswith("Origin:"):
                fields.append("ORIGIN")
            elif l.startswith("See Also:"):
                fields.append("SEE")
            elif re.match(r"^[GH]\d+", l) or l.strip() == "":
                break
    print(f"  G{num}: {' | '.join(fields) if fields else 'EMPTY'}")

# ============================================================
# PART 3: HEBREW FIELD COVERAGE
# ============================================================
print("\n=== PART 3: HEBREW FIELD ANALYSIS ===")

h_twot = sum(1 for l in lines if l.startswith("TWOT:"))
h_morph = sum(1 for l in lines if l.startswith("Morphology:"))
h_pos = sum(1 for l in lines if l.startswith("POS:"))
h_defs = sum(1 for l in lines if l.startswith("Definitions:"))
h_notes = sum(1 for l in lines if l.startswith("Notes:"))
h_grefs = sum(1 for l in lines if l.startswith("Greek Refs:"))

print(f"TWOT:           {h_twot:,}")
print(f"Morphology:     {h_morph:,}")
print(f"POS:            {h_pos:,}")
print(f"Definitions:    {h_defs:,}")
print(f"Notes:          {h_notes:,}")
print(f"Greek Refs:     {h_grefs:,}")

# Inside Notes
h_translation = sum(1 for l in lines if l.startswith("  Translation:"))
h_etymology = sum(1 for l in lines if l.startswith("  Etymology:"))
h_explanation = sum(1 for l in lines if l.startswith("  Explanation:"))
h_note = sum(1 for l in lines if l.startswith("  Note:"))
h_corr = sum(1 for l in lines if l.startswith("  Correction:"))
print(f"\nInside Notes blocks:")
print(f"  Translation: {h_translation:,}")
print(f"  Etymology:   {h_etymology:,}")
print(f"  Explanation: {h_explanation:,}")
print(f"  Note:        {h_note:,}")
print(f"  Correction:  {h_corr:,}")

# Sample H1–H10
print("\n--- Sample H1–H10 ---")
for header in h_headers[:10]:
    idx = lines.index(header)
    num = re.match(r"H(\d+)", header).group(1)
    fields = []
    j = idx + 1
    while j < len(lines) and not (re.match(r"^H\d+", lines[j]) and "|" in lines[j]):
        l = lines[j]
        if l.startswith("Lemma:"):
            fields.append("LEMMA")
        elif l.startswith("TWOT:"):
            fields.append("TWOT")
        elif l.startswith("Transliteration:"):
            fields.append("TRANS")
        elif l.startswith("Morphology:"):
            fields.append("MORPH")
        elif l.startswith("POS:"):
            fields.append("POS")
        elif l.startswith("Definitions:"):
            fields.append("DEFS")
        elif l.startswith("Notes:"):
            fields.append("NOTES")
        elif l.startswith("Greek Refs:"):
            fields.append("GREFS")
        j += 1
    print(f"  H{num}: {' | '.join(fields)}")

# ============================================================
# PART 4: DATA INTEGRITY
# ============================================================
print("\n=== PART 4: DATA INTEGRITY ===")

# G1510 See Also count
g1510_line = next((l for l in g_headers if re.match(r"^G1510", l)), None)
if g1510_line:
    idx = lines.index(g1510_line)
    # find See Also line within next 10
    see_line = next(
        (
            lines[i]
            for i in range(idx, min(idx + 10, len(lines)))
            if lines[i].startswith("See Also:")
        ),
        None,
    )
    if see_line:
        refs = see_line.split(":", 1)[-1].strip().split(",")
        print(f"G1510 See Also refs: {len(refs)} (expected 12)")
    else:
        print("G1510: See Also not found")
else:
    print("G1510 not found")

# H1 check
h1_line = h_headers[0]
idx = lines.index(h1_line)
h1_snippet = "".join(lines[idx : idx + 20])
print(f"H1: TWOT present: {'TWOT:' in h1_snippet}")
print(f"H1: Translation: {'  Translation:' in h1_snippet}")
print(f"H1: Etymology: {'  Etymology:' in h1_snippet}")
print(f"H1: Explanation: {'  Explanation:' in h1_snippet}")
print(f"H1: Greek Refs: {'Greek Refs:' in h1_snippet}")

# Empty Greek definitions?
empty_defs = [l for l in lines if l.startswith("Definition:") and len(l.strip()) <= 12]
print(f"\nEmpty/very short Greek Definitions: {len(empty_defs)}")
if empty_defs:
    for e in empty_defs[:3]:
        print(f"  {repr(e.strip())}")

# Greek Refs colon check
colons_in_grefs = [
    l for l in lines if l.startswith("Greek Refs:") and ":" in l.split(":", 1)[-1]
]
print(f"Greek Refs with 'G:XXX' format (not flattened): {len(colons_in_grefs)}")
if colons_in_grefs:
    print("  Sample:", colons_in_grefs[0].strip())

# ============================================================
# PART 5: FORMAT VALIDATION
# ============================================================
print("\n=== PART 5: FORMAT VALIDATION ===")

# Blank line count between entries
blank_count = sum(
    1
    for i, l in enumerate(lines)
    if l.strip() == ""
    and (
        i == len(lines) - 1
        or lines[i + 1].strip() == ""
        and (re.match(r"^[GH]\d+", lines[i + 1]) if i + 1 < len(lines) else True)
    )
)
# Simpler: count blank lines that separate entries
entry_count = len(g_headers) + len(h_headers)
separator_blanks = sum(1 for l in lines if l.strip() == "")
print(
    f"Blank separator lines: {separator_blanks:,} (should equal entries: {entry_count:,})"
)
if separator_blanks == entry_count:
    print("  [OK]")
else:
    diff = abs(separator_blanks - entry_count)
    print(f"  [WARN] Difference of {diff} lines")

# Field label typos
typos = []
for l in lines:
    stripped = l.strip()
    if re.match(r"^[GH]\d+", stripped) and "|" in stripped:
        continue
    if stripped and ":" in stripped and not l.startswith("  "):
        label = stripped.split(":", 1)[0].strip()
        valid = [
            "BETA",
            "Transliteration",
            "Pronunciation",
            "Definition",
            "KJV Meaning",
            "Origin",
            "See Also",
            "TWOT",
            "Morphology",
            "POS",
            "Definitions",
            "Notes",
            "Greek Refs",
        ]
        if label not in valid:
            typos.append(label)
if typos:
    print(f"Unknown field labels: {set(typos)}")
else:
    print("All field labels correct [OK]")

# Duplicate headers?
dup_headers = set()
seen = set()
for h in g_headers + h_headers:
    key = h.split("|")[0].strip()
    if key in seen:
        dup_headers.add(key)
    seen.add(key)
print(f"Duplicate headers: {len(dup_headers)}")
if dup_headers:
    print(f"  {dup_headers}")

print("\n=== AUDIT COMPLETE ===")
