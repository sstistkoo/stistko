import re

with open("strong_updated_detailed_cs.txt", "r", encoding="utf-8") as f:
    content = f.read()

# Find all entries (Greek and Hebrew)
entries = re.split(r"\n\n+", content)

missing_en = []
for entry in entries:
    lines = entry.split("\n")
    if not lines:
        continue
    first = lines[0]
    if not first.startswith("G") and not first.startswith("H"):
        continue

    key = first.split(" | ")[0] if " | " in first else first
    has_en = any(l.startswith("En:") for l in lines)
    has_en_def = any(l.startswith("En Definition:") for l in lines)

    if not has_en and not has_en_def:
        missing_en.append(key)

print(f"Entries without En: {len(missing_en)}")
print(f"First 30: {missing_en[:30]}")
print(f"Last 30: {missing_en[-30:]}")
