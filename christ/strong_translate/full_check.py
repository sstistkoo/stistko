import re

with open("strong_updated_detailed_cs.txt", "r", encoding="utf-8") as f:
    content = f.read()

entries = re.split(r"\n\n+", content)

greek_entries = []
hebrew_entries = []
issues = []

for entry in entries:
    lines = entry.split("\n")
    if not lines:
        continue
    first = lines[0]
    if " | " not in first:
        continue

    key = first.split(" | ")[0]

    if key.startswith("G"):
        num = int(key.replace("G", ""))
        has_lemma = bool(
            [
                l
                for l in lines
                if l
                and not l.startswith(
                    (
                        "BETA",
                        "Prepis",
                        "Tvaroslovi",
                        "Definice",
                        "En",
                        "En Definition",
                        "KJV",
                        "Cz",
                        "Viz",
                        "Poznámky",
                        "  ",
                    )
                )
            ]
        )
        has_en = any(l.startswith("En:") for l in lines)
        has_en_def = any(l.startswith("En Definition:") for l in lines)
        has_cz = any(l.startswith("Cz:") for l in lines)

        greek_entries.append(
            {
                "num": num,
                "has_en": has_en or has_en_def,
                "has_cz": has_cz,
                "lines": len(lines),
            }
        )

    elif key.startswith("H"):
        num = key.replace("H", "")
        has_en = any(l.startswith("En:") for l in lines)
        has_en_def = any(l.startswith("En Definition:") for l in lines)
        has_cz = any(l.startswith("Cz:") for l in lines)

        hebrew_entries.append(
            {
                "num": num,
                "has_en": has_en or has_en_def,
                "has_cz": has_cz,
                "lines": len(lines),
            }
        )

# Greek stats
greek_nums = [e["num"] for e in greek_entries]
greek_en = sum(1 for e in greek_entries if e["has_en"])
greek_cz = sum(1 for e in greek_entries if e["has_cz"])

print("=== GREEK ===")
print(f"Total: {len(greek_entries)}")
print(f"Range: G{min(greek_nums)} - G{max(greek_nums)}")
print(f"S En: {greek_en}")
print(f"S Cz: {greek_cz}")

# Hebrew stats
hebrew_nums = [e["num"] for e in hebrew_entries]
hebrew_en = sum(1 for e in hebrew_entries if e["has_en"])
hebrew_cz = sum(1 for e in hebrew_entries if e["has_cz"])

print("\n=== HEBREW ===")
print(f"Total: {len(hebrew_entries)}")
print(f"S En: {hebrew_en}")
print(f"S Cz: {hebrew_cz}")


# Check gaps
def find_gaps(nums, prefix):
    nums = sorted(set(nums))
    all_nums = set(range(min(nums), max(nums) + 1))
    missing = all_nums - set(nums)
    return sorted(missing)


greek_missing = find_gaps(greek_nums, "G")
print(f"\n=== MISSING NUMBERS ===")
print(f"Greek gaps: {len(greek_missing)}")
if greek_missing[:10]:
    print(f"  First gaps: {greek_missing[:10]}")

# Check entries without En
greek_no_en = [e for e in greek_entries if not e["has_en"]]
print(f"\nGreek bez En: {len(greek_no_en)}")
if greek_no_en:
    print(f"  Numbers: {[e['num'] for e in greek_no_en[:10]]}")
