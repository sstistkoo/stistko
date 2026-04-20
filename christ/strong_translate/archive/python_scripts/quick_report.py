import re

with open("strong_updated_detailed_cs.txt", "r", encoding="utf-8") as f:
    content = f.read()
lines = content.split("\n")

print("TOTAL LINES:", len(lines))
print("G ENTRIES:", len([l for l in lines if re.match(r"^G\d+", l)]))
print("H ENTRIES:", len([l for l in lines if re.match(r"^H\d+", l)]))
print("BETA LINES:", content.count("\nBETA:"))
print("DEFINICE:", content.count("\nDefinice:"))
print("KJV VZNAMY:", content.count("\nKJV Vznamy:"))
print("VIZ TAKÉ:", content.count("\nViz Take:"))
print("CESKY:", content.count("\nCesky:"))
print("TWOT:", content.count("\nTWOT:"))
print("POZNAMKY:", content.count("\nPoznamky:"))
print("RECKÉ REFS:", content.count("\nRecke refs:"))
print("VYZNAM:", content.count("\nVyznam:"))

def_refs = sum(
    1
    for l in lines
    if (l.startswith("Definice:") or l.startswith("Vyznam:")) and "[" in l and ":" in l
)
print("DEFS WITH BIBLE REFS:", def_refs)
print(
    "DEFS WITH __ SENSES:",
    sum(1 for l in lines if l.startswith("Definice:") and "__" in l),
)

# Sample
print("\n--- SAMPLE G1 ---")
for i, l in enumerate(lines):
    if l.startswith("G1 |"):
        print("\n".join(lines[i : i + 8]))
        break
print("--- SAMPLE G2030 ---")
for i, l in enumerate(lines):
    if l.startswith("G2030 |"):
        print("\n".join(lines[i : i + 10]))
        break
print("--- SAMPLE H1 ---")
for i, l in enumerate(lines):
    if l.startswith("H1 |"):
        print("\n".join(lines[i : i + 15]))
        break
