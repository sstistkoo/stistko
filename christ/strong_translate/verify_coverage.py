import re

with open("strong_updated_detailed_cs.txt", "r", encoding="utf-8") as f:
    content = f.read()

entries = re.split(r"\n\n+", content)

greek_with_en = []
greek_without_en = []

for entry in entries:
    lines = entry.split("\n")
    if not lines:
        continue
    first = lines[0]
    if not first.startswith("G") or " | " not in first:
        continue

    key = first.split(" | ")[0]
    num = int(key.replace("G", ""))
    has_en = any(l.startswith("En:") for l in lines)
    has_en_def = any(l.startswith("En Definition:") for l in lines)

    if has_en or has_en_def:
        greek_with_en.append(num)
    else:
        greek_without_en.append(num)

greek_with_en = sorted(greek_with_en)
greek_without_en = sorted(greek_without_en)

print(f"Greek S En: {len(greek_with_en)} entries")
print(f"  Range: G{min(greek_with_en)} - G{max(greek_with_en)}")

print(f"\nGreek BEZ En: {len(greek_without_en)} entries")
if greek_without_en:
    print(f"  Range: G{min(greek_without_en)} - G{max(greek_without_en)}")
