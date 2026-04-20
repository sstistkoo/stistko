import re

with open("strong_czech_detailed_ascii.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

total = len(lines)
g_headers = [l for l in lines if re.match(r"^G\d+", l)]
h_headers = [l for l in lines if re.match(r"^H\d+", l)]
czech_lines = [l for l in lines if l.startswith("Czech:")]

print(f"Total lines: {total}")
print(f"G entries: {len(g_headers)}")
print(f"H entries: {len(h_headers)}")
print(f"Czech lines: {len(czech_lines)}")
print(f"Expected Czech lines (one per entry): {len(g_headers) + len(h_headers)}")
print(f"Difference: {len(czech_lines) - (len(g_headers) + len(h_headers))}")

# Show entries that might have more than one Czech line
from collections import Counter

entry_cz_count = {}
for i, l in enumerate(lines):
    if l.startswith("Czech:"):
        # Find the header this belongs to (look backward)
        for j in range(i - 1, -1, -1):
            if re.match(r"^[GH]\d+", lines[j]):
                header = lines[j].split("|")[0].strip()
                entry_cz_count[header] = entry_cz_count.get(header, 0) + 1
                break

multi = {k: v for k, v in entry_cz_count.items() if v > 1}
if multi:
    print(f"\nEntries with >1 Czech line: {len(multi)}")
    print("Sample:", list(multi.items())[:5])
else:
    print("\n[OK] Each entry has exactly 1 Czech line")

# Check for Czech lines that contain newlines within (should be single line now)
multi_line_cz = [l for l in czech_lines if "\n" in l]
print(f"Czech lines with internal newlines: {len(multi_line_cz)}")

# Sample G2030
for i, l in enumerate(lines):
    if l.startswith("G2030 |"):
        print(f"\nG2030 at line {i + 1}:")
        for j in range(i, min(i + 12, len(lines))):
            print(f"  {repr(lines[j].rstrip())}")
        break

# Sample H1
for i, l in enumerate(lines):
    if l.startswith("H1 |"):
        print(f"\nH1 at line {i + 1}:")
        for j in range(i, min(i + 15, len(lines))):
            print(f"  {repr(lines[j].rstrip())}")
        break
