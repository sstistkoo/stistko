import re

with open("TBESG.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

g6000_plus = {}
for line in lines:
    line = line.strip()
    if (
        not line
        or line.startswith("$")
        or line.startswith("*")
        or line.startswith("=")
        or not line[0:1]
    ):
        continue

    parts = line.split("\t")
    estrong = parts[0] if parts else ""

    if not estrong or not estrong.startswith("G"):
        continue

    num_str = estrong.replace("G", "").split("=")[0]
    if not num_str.isdigit():
        continue

    num = int(num_str)
    if num >= 6000:
        greek = parts[3] if len(parts) > 3 else ""
        translit = parts[4] if len(parts) > 4 else ""
        gloss = parts[6] if len(parts) > 6 else ""
        g6000_plus[num] = {"greek": greek, "translit": translit, "gloss": gloss}

print(f"Total G6000+ entries: {len(g6000_plus)}")

nums = sorted(g6000_plus.keys())
print(f"Range: G{min(nums)} - G{max(nums)}")

# Save to file with repr to avoid encoding issues
out = open("tbesg_extended.txt", "w", encoding="utf-8")
for n in sorted(nums):
    e = g6000_plus[n]
    out.write(f"G{n}|{e['greek']}|{e['translit']}|{e['gloss']}\n")
out.close()

print("Saved to tbesg_extended.txt")
