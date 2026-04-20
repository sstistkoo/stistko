import re

with open("strong_czech_detailed_ascii.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find H1
for i, l in enumerate(lines):
    if l.startswith("H1 |"):
        print(f"H1 at line {i + 1}")
        for j in range(i, min(i + 25, len(lines))):
            # Write safely
            raw = lines[j].rstrip()
            # Show non-ASCII chars as codes
            escaped = raw.encode("unicode_escape").decode("ascii")
            print(f"  {j + 1}: {escaped}")
        break

# Find G2030
for i, l in enumerate(lines):
    if l.startswith("G2030 |"):
        print(f"\nG2030 at line {i + 1}")
        for j in range(i, min(i + 12, len(lines))):
            raw = lines[j].rstrip()
            escaped = raw.encode("unicode_escape").decode("ascii")
            print(f"  {j + 1}: {escaped}")
        break

# Count non-ASCII in file
non_ascii_total = sum(1 for l in lines if any(ord(c) > 127 for c in l))
print(f"\nLines with non-ASCII chars: {non_ascii_total}")

# Show which lines still have Czech diacritics (before Czech: field)
cz_with_diac = []
for i, l in enumerate(lines):
    if l.startswith("Czech:"):
        text = l.split(":", 1)[-1]
        if any(c in "áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ" for c in text):
            cz_with_diac.append((i + 1, text[:80]))
print(f"Czech lines still with Czech diacritics: {len(cz_with_diac)}")
if cz_with_diac:
    for lineno, txt in cz_with_diac[:5]:
        print(f"  L{lineno}: {txt}")
