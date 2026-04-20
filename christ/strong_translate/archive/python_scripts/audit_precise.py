import re

with open("strong_english_detailed.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Get H1
i = next(i for i, l in enumerate(lines) if l.startswith("H1 |"))
end = i + 1
while end < len(lines):
    if lines[end].strip() == "" or (lines[end].startswith("H") and "|" in lines[end]):
        break
    end += 1
with open("h1_full.txt", "w", encoding="utf-8") as out:
    out.writelines(lines[i : end + 1])

print("H1 entry written to h1_full.txt")
print(f"Lines {i + 1} to {end}")

# Count entries with each field precisely
print("\n=== PRECISE FIELD COUNTS ===")
g_headers = [i for i, l in enumerate(lines) if re.match(r"^G\d+", l) and "|" in l]
h_headers = [i for i, l in enumerate(lines) if re.match(r"^H\d+", l) and "|" in l]


def has_field(header_idx, field_label, max_scan=10):
    for j in range(header_idx + 1, min(header_idx + 1 + max_scan, len(lines))):
        if lines[j].startswith(field_label):
            return True
        if re.match(r"^[GH]\d+", lines[j]) and "|" in lines[j]:
            break
    return False


g_stats = {
    "BETA:": 0,
    "Transliteration:": 0,
    "Pronunciation:": 0,
    "Definition:": 0,
    "KJV Meaning:": 0,
    "Origin:": 0,
    "See Also:": 0,
}
for idx in g_headers:
    for field in g_stats:
        if has_field(idx, field):
            g_stats[field] += 1

h_stats = {
    "TWOT:": 0,
    "Transliteration:": 0,
    "Morphology:": 0,
    "Definitions:": 0,
    "Notes:": 0,
    "Greek Refs:": 0,
}
for idx in h_headers:
    for field in h_stats:
        if has_field(idx, field):
            h_stats[field] += 1

print("Greek field counts:")
for k, v in g_stats.items():
    print(f"  {k:20s}: {v:,}")

print("\nHebrew field counts:")
for k, v in h_stats.items():
    print(f"  {k:20s}: {v:,}")

# Check if POS appears combined with Morphology
morph_pos_count = sum(1 for l in lines if "Morphology:" in l and "POS:" in l)
print(f"\nMorphology lines containing 'POS:': {morph_pos_count:,}")
print(f"Separate POS: lines: {sum(1 for l in lines if l.startswith('POS:'))}")

# Check blank lines after each entry
separators_correct = 0
for idx, hdr_idx in enumerate(g_headers + h_headers):
    next_idx = hdr_idx + 1
    # skip to first blank
    while next_idx < len(lines) and lines[next_idx].strip() != "":
        next_idx += 1
    # now next_idx is blank or end/eof or next header
    if next_idx < len(lines) and lines[next_idx].strip() == "":
        # Check that after that blank comes next header or more blanks
        separators_correct += 1

print(
    f"\nEntries with blank separator immediately after: {separators_correct:,} of {len(g_headers) + len(h_headers):,}"
)

# Check G1510 See Also count
g1510_idx = next((i for i, l in enumerate(lines) if l.startswith("G1510 |")), None)
if g1510_idx:
    for j in range(g1510_idx, g1510_idx + 10):
        if lines[j].startswith("See Also:"):
            refs = lines[j].split(":", 1)[1].strip().split(",")
            print(f"\nG1510 See Also count: {len(refs)}")
            break
