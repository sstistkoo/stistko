import re

with open("strong_updated_detailed_cs.txt", "r", encoding="utf-8") as f:
    content = f.read()

# Extract all Greek entries
greek_nums = []
for line in content.split("\n"):
    if line.startswith("G") and " | " in line:
        key = line.split(" | ")[0].replace("G", "")
        if key.isdigit():
            greek_nums.append(int(key))

greek_nums = sorted(set(greek_nums))
print(f"Total Greek entries: {len(greek_nums)}")
print(f"Range: G{min(greek_nums)} - G{max(greek_nums)}")

# Find gaps
gaps = []
prev = greek_nums[0]
for n in greek_nums[1:]:
    if n != prev + 1:
        gaps.append((prev + 1, n - 1))
    prev = n

print(f"\nGaps (missing numbers): {len(gaps)}")
if gaps:
    print(f"  First gaps: {gaps[:5]}")
    print(f"  Last gaps: {gaps[-5:]}")

# Find continuous ranges without En
entries = re.split(r"\n\n+", content)
en_ranges = []
no_en_ranges = []

current_range = []
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
        if current_range and current_range[0] < 0:
            no_en_ranges.append(current_range)
            current_range = []
        current_range.append(num)
    else:
        if not current_range or current_range[-1] >= 0:
            current_range = [-num]  # negative to mark as no_en
        else:
            current_range.append(-num)

if current_range and current_range[0] < 0:
    no_en_ranges.append(current_range)

print(f"\nEntries WITH En: {len([n for n in current_range if n > 0])}")
print(f"Entries WITHOUT En: {len([abs(n) for n in no_en_ranges[0]])}")

# Show ranges
if no_en_ranges:
    first = abs(no_en_ranges[0][0])
    last = abs(no_en_ranges[0][-1])
    print(f"\nGreek WITHOUT En:")
    print(f"  Range: G{first} - G{last}")
    print(f"  Count: {last - first + 1}")
