import sys

sys.stdout = open("audit_final_out.txt", "w", encoding="utf-8")

import re

with open("strong_english_detailed.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()
g_headers = [(i, l) for i, l in enumerate(lines) if re.match(r"^G\d+", l) and "|" in l]
last_g_idx, last_g_line = g_headers[-1]
for j in range(last_g_idx, min(last_g_idx + 12, len(lines))):
    print(repr(lines[j]))

print("\n=== LAST HEBREW ENTRY (H8674) ===")
h_headers = [(i, l) for i, l in enumerate(lines) if re.match(r"^H\d+", l) and "|" in l]
last_h_idx, last_h_line = h_headers[-1]
for j in range(last_h_idx, min(last_h_idx + 25, len(lines))):
    print(repr(lines[j]))

# Check that G5624 has all fields
print("\n=== G5624 FIELD CHECK ===")
fields_found = []
for j in range(last_g_idx + 1, last_g_idx + 10):
    l = lines[j]
    if l.startswith("BETA:"):
        fields_found.append("BETA")
    elif l.startswith("Transliteration:"):
        fields_found.append("TRANS")
    elif l.startswith("Pronunciation:"):
        fields_found.append("PRON")
    elif l.startswith("Definition:"):
        fields_found.append("DEF")
    elif l.startswith("KJV Meaning:"):
        fields_found.append("KJV")
    elif l.startswith("Origin:"):
        fields_found.append("ORIGIN")
    elif l.startswith("See Also:"):
        fields_found.append("SEE")
print("Fields:", fields_found)

# Check that H8674 has all fields
print("\n=== H8674 FIELD CHECK ===")
fields_h = []
j = last_h_idx + 1
while j < len(lines) and not (lines[j].startswith("H") and "|" in lines[j]):
    l = lines[j]
    if l.startswith("Lemma:"):
        fields_h.append("LEMMA")
    elif l.startswith("TWOT:"):
        fields_h.append("TWOT")
    elif l.startswith("Transliteration:"):
        fields_h.append("TRANS")
    elif l.startswith("Morphology:"):
        fields_h.append("MORPH")
    elif l.startswith("Definitions:"):
        fields_h.append("DEFS")
    elif l.startswith("Notes:"):
        fields_h.append("NOTES")
    elif l.startswith("Greek Refs:"):
        fields_h.append("GREFS")
    j += 1
print("Fields:", fields_h)

# Check for any duplicate headers
print("\n=== DUPLICATE CHECK ===")
seen_headers = {}
dup = []
for idx, (i, l) in enumerate(g_headers + h_headers):
    key = l.split("|")[0].strip()
    if key in seen_headers:
        dup.append((key, seen_headers[key], i))
    else:
        seen_headers[key] = i
if dup:
    print("Duplicates found:", dup)
else:
    print("No duplicate headers")

# Count entries missing required fields
print("\n=== GREEK MISSING FIELDS ===")
missing_def = []
missing_kjv = []
missing_origin = []
for idx, line in g_headers:
    # check next few lines
    found_def = found_kjv = found_origin = False
    for j in range(idx + 1, min(idx + 8, len(lines))):
        if lines[j].startswith("Definition:"):
            found_def = True
        elif lines[j].startswith("KJV Meaning:"):
            found_kjv = True
        elif lines[j].startswith("Origin:"):
            found_origin = True
        elif re.match(r"^[GH]\d+", lines[j]) and "|" in lines[j]:
            break
    if not found_def:
        missing_def.append(line.strip())
    if not found_kjv:
        missing_kjv.append(line.strip())
    if not found_origin:
        missing_origin.append(line.strip())
print(f"Missing Definition: {len(missing_def)}")
print(f"Missing KJV Meaning: {len(missing_kjv)}")
print(f"Missing Origin: {len(missing_origin)}")
if missing_def:
    print("  ", missing_def[:5])
if missing_kjv:
    print("  ", missing_kjv[:5])
if missing_origin:
    print("  ", missing_origin[:5])

print("\n=== CHECK COMPLETE ===")
