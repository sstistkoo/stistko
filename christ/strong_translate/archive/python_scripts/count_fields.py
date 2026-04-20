import re

with open("strong_updated_detailed_cs.txt", "r", encoding="utf-8") as f:
    content = f.read()
lines = content.split("\n")

# Use exact unicode labels
labels = {
    "BETA": "BETA:",
    "Translit": "Transliteration:",
    "Morph": "Morphology:",
    "Def": "Definice:",
    "KJV": "KJV Významy:",
    "See": "Viz také:",
    "Czech": "Česky:",
    "TWOT": "TWOT:",
    "Notes": "Poznámky:",
    "GreekRefs": "Řecké refs:",
    "Vyznam": "Význam:",
}

counts = {}
for name, label in labels.items():
    counts[name] = content.count("\n" + label)

g_cnt = len([l for l in lines if re.match(r"^G\d+", l)])
h_cnt = len([l for l in lines if re.match(r"^H\d+", l)])

print(f"TOTAL LINES: {len(lines)}")
print(f"G ENTRIES: {g_cnt}")
print(f"H ENTRIES: {h_cnt}")
for name, cnt in counts.items():
    print(f"{name:12s}: {cnt}")

# Bible verse refs
def_refs = sum(
    1
    for l in lines
    if (l.startswith("Definice:") or l.startswith("Význam:"))
    and "[" in l
    and re.search(r"\[\w+\.\d+:\d+\]", l)
)
print(f"Defs with Bible refs: {def_refs}")

# Multi-sense entries
multi = sum(1 for l in lines if l.startswith("Definice:") and "__" in l)
print(f"Defs with __ senses: {multi}")
