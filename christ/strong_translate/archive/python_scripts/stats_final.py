import re

with open("strong_updated_detailed_cs.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

total = len(lines)
g_headers = [l for l in lines if re.match(r"^G\d+", l)]
h_headers = [l for l in lines if re.match(r"^H\d+", l)]

print("=== UPDATED FILE STATS ===")
print(f"Total lines: {total:,}")
print(f"Greek entries (G): {len(g_headers):,}")
print(f"Hebrew entries (H): {len(h_headers):,}")
print(f"Total entries: {len(g_headers) + len(h_headers):,}")


def count_field(label):
    return sum(1 for l in lines if l.startswith(label))


print("\n=== GREEK FIELDS ===")
print(f"BETA:           {count_field('BETA:'):,}")
print(f"Transliteration: {count_field('Transliteration:'):,}")
print(f"Morphology:     {count_field('Morphology:'):,}")
print(f"Definice:       {count_field('Definice:'):,}")
print(f"KJV Vznamy:     {count_field('KJV Vznamy:'):,}")
print(f"Viz Take:       {count_field('Viz Take:'):,}")
print(f"Czech:          {count_field('Cesky:'):,}")

print("\n=== HEBREW FIELDS ===")
print(f"Transliteration: {count_field('Transliteration:'):,}")
print(f"Morphology:     {count_field('Morphology:'):,}")
print(f"Definice:       {count_field('Definice:'):,}")
print(f"Vyznam:         {count_field('Vyznam:'):,}")
print(f"KJV Vznamy:     {count_field('KJV Vznamy:'):,}")
print(f"TWOT:           {count_field('TWOT:'):,}")
print(f"Poznamky:       {count_field('Poznamky:'):,}")
print(f"Recke refs:     {count_field('Recke refs:'):,}")
print(f"Czech:          {count_field('Cesky:'):,}")

# Order check
last_g = max(
    [i for i, l in enumerate(lines) if re.match(r"^G\d+", l) and "|" in l], default=-1
)
first_h = min(
    [i for i, l in enumerate(lines) if re.match(r"^H\d+", l) and "|" in l], default=-1
)
print(f"\n=== ORDER ===")
print(f"Last G at line: {last_g + 1 if last_g >= 0 else 'N/A'}")
print(f"First H at line: {first_h + 1 if first_h >= 0 else 'N/A'}")
if last_g < first_h:
    print("Correct order: G before H")
else:
    print("Order problem")

# Richness: Bible verse refs [XX.YY:ZZ] in definitions
def_refs = sum(
    1
    for l in lines
    if (l.startswith("Definice:") or l.startswith("Vyznam:"))
    and re.search(r"\[\w+\.\d+:\d+\]", l)
)
print(f"\n=== RICHNESS ===")
print(f"Definitions with Bible verse refs: {def_refs:,}")
has_senses = sum(1 for l in lines if l.startswith("Definice:") and "__" in l)
print(f"Definitions with multi-sense markup: {has_senses:,}")
