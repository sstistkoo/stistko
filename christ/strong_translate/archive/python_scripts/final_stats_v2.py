import re

with open("strong_updated_detailed_cs.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

total = len(lines)
g_headers = [l for l in lines if re.match(r"^G\d+", l)]
h_headers = [l for l in lines if re.match(r"^H\d+", l)]

print("=== UPDATED FILE STATS ===")
print(f"Total lines: {total:,}")
print(f"Greek entries: {len(g_headers):,}")
print(f"Hebrew entries: {len(h_headers):,}")
print(f"Total entries: {len(g_headers) + len(h_headers):,}")

# Count by field prefix (using actual unicode labels)
field_counts = {}
for l in lines:
    for label in [
        "BETA:",
        "Transliteration:",
        "Morphology:",
        "Definice:",
        "KJV Významy:",
        "Viz také:",
        "Česky:",
        "TWOT:",
        "Poznámky:",
        "Řecké refs:",
        "Význam:",
    ]:
        if l.startswith(label):
            field_counts[label] = field_counts.get(label, 0) + 1
            break

print("\n=== FIELD COUNTS ===")
print(f"{'Field':<20} {'Count':>8}")
print("-" * 30)
labels_order = [
    "BETA:",
    "Transliteration:",
    "Morphology:",
    "Definice:",
    "KJV Významy:",
    "Viz také:",
    "Česky:",
    "TWOT:",
    "Poznámky:",
    "Řecké refs:",
    "Význam:",
]
for label in labels_order:
    if label in field_counts:
        print(f"{label:<20} {field_counts[label]:>8,}")

# Order check
last_g = max(
    [i for i, l in enumerate(lines) if re.match(r"^G\d+", l) and "|" in l], default=-1
)
first_h = min(
    [i for i, l in enumerate(lines) if re.match(r"^H\d+", l) and "|" in l], default=-1
)
print(f"\nLast G line: {last_g + 1 if last_g >= 0 else 'N/A'}")
print(f"First H line: {first_h + 1 if first_h >= 0 else 'N/A'}")
print("Order: G before H ✓" if last_g < first_h else "Order: PROBLEM ✗")

# Richness
def_refs = sum(
    1
    for l in lines
    if (l.startswith("Definice:") or l.startswith("Význam:")) and "[" in l and ":" in l
)
has_senses = sum(1 for l in lines if l.startswith("Definice:") and "__" in l)
print(f"\nRICHNESS:")
print(f"  Definitions with Bible verse refs [XX.YY:ZZ]: {def_refs:,}")
print(f"  Definitions with numbered sub-senses (__1., __2.): {has_senses:,}")

# Sample entries
print("\n=== SAMPLE ENTRIES ===")
print("\n--- G1 ---")
for i, l in enumerate(lines):
    if l.startswith("G1 |"):
        print("".join(lines[i : i + 8]))
        break

print("--- G2030 ---")
for i, l in enumerate(lines):
    if l.startswith("G2030 |"):
        print("".join(lines[i : i + 10]))
        break

print("--- H1 ---")
for i, l in enumerate(lines):
    if l.startswith("H1 |"):
        print("".join(lines[i : i + 15]))
        break

print("--- H0122a (merged example) ---")
for i, l in enumerate(lines):
    if l.startswith("H122 |"):
        print("".join(lines[i : i + 12]))
        break
