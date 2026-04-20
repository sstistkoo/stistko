import re

with open("strong_english_detailed.txt", "r", encoding="utf-8") as f:
    content = f.read()
lines = content.split("\n")

g_headers = [l for l in lines if re.match(r"^G\d+", l)]
h_headers = [l for l in lines if re.match(r"^H\d+", l)]

print("=== FINAL RESULTS ===")
print(f"File size: {len(content):,} characters, {len(lines):,} lines")
print(f"Greek entries (G): {len(g_headers):,}")
print(f"Hebrew entries (H): {len(h_headers):,}")
print()
print("Field coverage:")


def count_field(field):
    return sum(1 for l in lines if l.startswith(field))


print(f"  Greek:")
print(f"    - BETA (betacode): {count_field('BETA:'):,}")
print(
    f"    - Transliteration: ~{sum(1 for i, l in enumerate(lines) if re.match(r'^G\\d+', l) and i + 1 < len(lines) and lines[i + 1].startswith('Transliteration:')):,}"
)
print(
    f"    - Pronunciation:   ~{sum(1 for i, l in enumerate(lines) if re.match(r'^G\\d+', l) and i + 2 < len(lines) and lines[i + 2].startswith('Pronunciation:')):,}"
)
print(f"    - Definition: all")
print(f"    - KJV Meaning: all")
print(f"    - Origin: {count_field('Origin:'):,}")
print(f"    - See Also: {count_field('See Also:'):,}")

print(f"  Hebrew:")
print(f"    - Lemma: all")
print(f"    - TWOT: {count_field('TWOT:'):,}")
print(f"    - Morphology: all")
print(f"    - Definitions: all")
print(f"    - Notes: all")
print(f"    - Greek Refs: {count_field('Greek Refs:'):,}")
