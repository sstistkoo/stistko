import sys

sys.stdout = open("audit_details.txt", "w", encoding="utf-8")

with open("strong_english_detailed.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find H1
for i, l in enumerate(lines):
    if l.startswith("H1 |"):
        print(f"H1 at line {i + 1}")
        for j in range(i, min(i + 20, len(lines))):
            print(f"  {j + 1}: {repr(lines[j])}")
        break

# Find G1510
for i, l in enumerate(lines):
    if l.startswith("G1510 |"):
        print(f"\nG1510 at line {i + 1}")
        for j in range(i, min(i + 12, len(lines))):
            print(f"  {j + 1}: {repr(lines[j])}")
        break

# Hebrew without Greek Refs
print("\n\nSearching for Hebrew entries without Greek Refs (first 10)...")
import re

h_idxs = [i for i, l in enumerate(lines) if re.match(r"^H\d+", l) and "|" in l]
missing = []
for idx in h_idxs:
    # look ahead a few lines for Greek Refs
    found = False
    for j in range(idx + 1, min(idx + 10, len(lines))):
        if lines[j].startswith("Greek Refs:"):
            found = True
            break
        if re.match(r"^H\d+", lines[j]) and "|" in lines[j]:
            break
    if not found:
        missing.append(lines[idx].strip())
        if len(missing) >= 10:
            break
print(f"First 10 Hebrew entries without Greek Refs: {missing}")

# Check Lemma field presence
print(f"\nLemma lines count: {sum(1 for l in lines if l.startswith('Lemma:'))}")
print(f"Sample Lemma lines:")
for l in lines:
    if l.startswith("Lemma:"):
        print(f"  {repr(l.strip())}")
        break

# Check POS field
pos_lines = [l for l in lines if l.startswith("POS:")]
print(f"\nPOS lines count: {len(pos_lines)}")
if pos_lines:
    print("Sample POS lines (first 3):")
    for p in pos_lines[:3]:
        print(f"  {repr(p.strip())}")

# Check blank line separators - count after each entry
import re

all_headers = [
    (i, l) for i, l in enumerate(lines) if re.match(r"^[GH]\d+", l) and "|" in l
]
separator_count = 0
for idx, (line_idx, _) in enumerate(all_headers[:-1]):
    next_idx = all_headers[idx + 1][0]
    # Is there a blank line between these entries?
    for j in range(line_idx + 1, next_idx):
        if lines[j].strip() == "":
            separator_count += 1
            break
# Check last entry's trailing blank
last_idx = all_headers[-1][0]
if last_idx + 1 < len(lines) and lines[last_idx + 1].strip() == "":
    separator_count += 1
print(f"\nBlank separator count: {separator_count}")
print(f"Total entries: {len(all_headers)}")

print("\n=== INSPECTION COMPLETE ===")
