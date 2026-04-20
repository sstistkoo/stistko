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
print(f"Total: {len(g_headers) + len(h_headers):,}")

# Field counts
print("\n=== GREEK FIELDS ===")
print(f"BETA:           {sum(1 for l in lines if l.startswith('BETA:')):,}")
print(f"Transliteration: {sum(1 for l in lines if l.startswith('Transliteration:')):,}")
print(f"Morphology:     {sum(1 for l in lines if l.startswith('Morphology:')):,}")
print(f"Definice:       {sum(1 for l in lines if l.startswith('Definice:')):,}")
print(f"KJV Významy:    {sum(1 for l in lines if l.startswith('KJV Významy:')):,}")
print(f"Viz také:       {sum(1 for l in lines if l.startswith('Viz také:')):,}")
print(f"Česky:          {sum(1 for l in lines if l.startswith('Česky:')):,}")

print("\n=== HEBREW FIELDS ===")
print(f"Transliteration: {sum(1 for l in lines if l.startswith('Transliteration:')):,}")
print(f"Morphology:     {sum(1 for l in lines if l.startswith('Morphology:')):,}")
print(f"Definice:       {sum(1 for l in lines if l.startswith('Definice:')):,}")
print(f"Význam:         {sum(1 for l in lines if l.startswith('Význam:')):,}")
print(f"KJV Významy:    {sum(1 for l in lines if l.startswith('KJV Významy:')):,}")
print(f"TWOT:           {sum(1 for l in lines if l.startswith('TWOT:')):,}")
print(f"Poznámky:       {sum(1 for l in lines if l.startswith('Poznámky:')):,}")
print(f"Řecké refs:     {sum(1 for l in lines if l.startswith('Řecké refs:')):,}")
print(f"Česky:          {sum(1 for l in lines if l.startswith('Česky:')):,}")

# Check order
last_g = max(
    [i for i, l in enumerate(lines) if l.startswith("G") and "|" in l], default=-1
)
first_h = min(
    [i for i, l in enumerate(lines) if l.startswith("H") and "|" in l], default=-1
)
print(f"\n=== ORDER ===")
print(f"Last G at line: {last_g + 1 if last_g >= 0 else 'N/A'}")
print(f"First H at line: {first_h + 1 if first_h >= 0 else 'N/A'}")
if last_g < first_h:
    print("✓ Correct order")
else:
    print("✗ Order issue")

# StepBible richness markers
print("\n=== RICHNESS ===")
# Count bracket refs [X.Y] in definitions
import re

def_refs = 0
for l in lines:
    if l.startswith("Definice:") or l.startswith("Význam:"):
        if re.search(r"\[\w+\.\d+:\d+\]", l):
            def_refs += 1
print(f"Definitions with Bible verse refs: {def_refs:,}")

# Count entries with __ (numbered senses within single Definition)
has_senses = sum(1 for l in lines if l.startswith("Definice:") and "__" in l)
print(f"Definitions with internal numbered senses (__): {has_senses:,}")
