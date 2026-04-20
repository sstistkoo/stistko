"""
Extraction script for G6000+ entries that need AI translation
Run this to create input file for the translator
"""

import re
import json

# Read the current output file
with open("../strong_updated_detailed_cs.txt", "r", encoding="utf-8") as f:
    content = f.read()

# Parse entries and extract G6000+ without Cz
entries = re.split(r"\n\n+", content)

g6000_entries = []
for entry in entries:
    lines = entry.split("\n")
    if not lines:
        continue
    first = lines[0]
    if not first.startswith("G") or " | " not in first:
        continue

    key = first.split(" | ")[0]  # G6000
    num = int(key.replace("G", ""))

    if num >= 6000:
        has_cz = any(l.startswith("Cz:") for l in lines)
        if not has_cz:
            # Extract needed fields
            greek_word = first.split(" | ")[1] if " | " in first else ""
            prepis = ""
            definice = ""
            en = ""
            en_def = ""

            for line in lines:
                if line.startswith("Prepis:"):
                    prepis = line.replace("Prepis: ", "")
                elif line.startswith("Definice:"):
                    definice = line.replace("Definice: ", "")
                elif line.startswith("En:"):
                    en = line.replace("En: ", "")
                elif line.startswith("En Definition:"):
                    en_def = line.replace("En Definition: ", "")

            g6000_entries.append(
                {
                    "key": key,
                    "greek": greek_word,
                    "transliteration": prepis,
                    "definition": definice,
                    "en": en,
                    "en_def": en_def,
                }
            )

print(f"Found {len(g6000_entries)} G6000+ entries without Cz")

# Save to file
output = open("greek_g6000_for_translate.txt", "w", encoding="utf-8")
output.write("# G6000+ entries needing AI translation\n")
output.write("# Format: Gnumber | Greek | Transliteration | English definition\n")
output.write("# Add translations below after running through AI translator\n\n")

for e in g6000_entries:
    output.write(f"\n###{e['key']}###\n")
    output.write(f"GREEK: {e['greek']}\n")
    output.write(f"TRANSLITERATION: {e['transliteration']}\n")
    output.write(f"DEFINITION: {e['definition']}\n")
    output.write(f"EN: {e['en']}\n")
    output.write(f"EN_DEF: {e['en_def']}\n")
    output.write(f"SK: \n")  # Slovak
    output.write(f"PL: \n")  # Polish
    output.write(f"BG: \n")  # Bulgarian
    output.write(f"CH: \n")  # Chinese
    output.write(f"SP: \n")  # Spanish

output.close()
print(f"Saved to translator_pipeline/greek_g6000_for_translate.txt")
