import re

with open("strong_updated_detailed_cs.txt", "r", encoding="utf-8") as f:
    content = f.read()

greek_without_en = []
entries = re.split(r"\n\n+", content)
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

    if not (has_en or has_en_def):
        greek_without_en.append(num)

greek_without_en = sorted(set(greek_without_en))

# Find continuous ranges
ranges = []
start = greek_without_en[0]
end = greek_without_en[0]

for i in range(1, len(greek_without_en)):
    if greek_without_en[i] == end + 1:
        end = greek_without_en[i]
    else:
        ranges.append((start, end))
        start = greek_without_en[i]
        end = greek_without_en[i]

ranges.append((start, end))

print(f"Greek bez En: {len(greek_without_en)} entries v {len(ranges)} rozsazich:\n")
for i, (s, e) in enumerate(ranges, 1):
    print(f"  {i}. G{s} - G{e} ({e - s + 1} entries)")
