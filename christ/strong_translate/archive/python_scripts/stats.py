import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

with open("strong_english_detailed.txt", "r", encoding="utf-8") as f:
    content = f.read()

lines = content.split("\n")

# Count G and H headers
g_headers = [l for l in lines if re.match(r"^G\d+", l)]
h_headers = [l for l in lines if re.match(r"^H\d+", l)]

print("=== STATISTICS ===")
print(f"Total lines: {len(lines):,}")
print(f"Greek entries (G): {len(g_headers):,}")
print(f"Hebrew entries (H): {len(h_headers):,}")
print(f"Total entries: {len(g_headers) + len(h_headers):,}")

# Split sections
split_idx = None
for i, l in enumerate(lines):
    if l.startswith("H1 |"):
        split_idx = i
        break

greek_section = lines[:split_idx] if split_idx else lines
hebrew_section = lines[split_idx:] if split_idx else []

print(f"\n=== GREEK ENTRIES (G1–G{len(g_headers)}) ===")


# Count field presence by scanning headers and following lines
def count_with_field(section, header_prefix, field_prefix, max_lookahead=5):
    count = 0
    i = 0
    while i < len(section):
        line = section[i]
        if re.match(f"^{header_prefix}\\d+", line) and "|" in line:
            # look ahead for field
            found = False
            for j in range(i + 1, min(i + 1 + max_lookahead, len(section))):
                if section[j].startswith(field_prefix):
                    found = True
                    break
                if section[j].startswith("G") or section[j].startswith("H"):
                    break
            if found:
                count += 1
            i += 1
        else:
            i += 1
    return count


g_translit = count_with_field(greek_section, "G", "Transliteration:")
g_pron = count_with_field(greek_section, "G", "Pronunciation:")
g_origin = count_with_field(greek_section, "G", "Origin:")
g_see = count_with_field(greek_section, "G", "See Also:")
print(f"  With Transliteration: {g_translit:,}")
print(f"  With Pronunciation: {g_pron:,}")
print(f"  With Origin: {g_origin:,}")
print(f"  With See Also: {g_see:,}")

print(f"\n=== HEBREW ENTRIES (H1–H{len(h_headers)}) ===")
h_twot = count_with_field(hebrew_section, "H", "TWOT:")
h_morph = count_with_field(hebrew_section, "H", "Morphology:")
h_defs = count_with_field(hebrew_section, "H", "Definitions:")
h_notes = count_with_field(hebrew_section, "H", "Notes:")
h_grefs = count_with_field(hebrew_section, "H", "Greek Refs:")
print(f"  With TWOT: {h_twot:,}")
print(f"  With Morphology: {h_morph:,}")
print(f"  With Definitions: {h_defs:,}")
print(f"  With Notes: {h_notes:,}")
print(f"  With Greek Refs: {h_grefs:,}")

print(f"\n=== ORDER CHECK ===")
last_g = g_headers[-1] if g_headers else "N/A"
first_h = h_headers[0] if h_headers else "N/A"
print(f"Last Greek: {last_g.strip()}")
print(f"First Hebrew: {first_h.strip()}")
# Check order by verifying that all G lines come before all H lines
g_last_line_idx = None
h_first_line_idx = None
for i, l in enumerate(lines):
    if re.match(r"^G\d+", l) and "|" in l:
        if g_last_line_idx is None or i > g_last_line_idx:
            g_last_line_idx = i
    if re.match(r"^H\d+", l) and "|" in l:
        if h_first_line_idx is None or i < h_first_line_idx:
            h_first_line_idx = i
if g_last_line_idx is not None and h_first_line_idx is not None:
    if g_last_line_idx < h_first_line_idx:
        print("✓ Correct order: all G entries precede H entries")
    else:
        print("✗ Order problem: some H appear before G")
else:
    print("✗ Could not determine order")

# File size
import os

size_mb = os.path.getsize("strong_english_detailed.txt") / (1024 * 1024)
print(f"\nFile size: {size_mb:.2f} MB ({len(content):,} characters)")
