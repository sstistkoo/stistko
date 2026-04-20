import re

with open("strong_updated_detailed_cs.txt", "r", encoding="utf-8") as f:
    content = f.read()

entries = re.split(r"\n\n+", content)
for entry in entries:
    lines = entry.split("\n")
    if lines and lines[0].startswith("G21370"):
        out = open("missing_entry.txt", "w", encoding="utf-8")
        out.write("\n".join(lines))
        out.close()
        print("Written to missing_entry.txt")
        break
