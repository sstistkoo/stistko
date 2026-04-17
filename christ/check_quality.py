import json
import sys

# Ensure UTF-8 output
if sys.platform == "win32":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

data = json.load(open("strong_bible_cz.json", "r", encoding="utf-8"))
e = data["entries"]

hebrew = {k: v for k, v in e.items() if k.startswith("H")}

# Check all translated=True
all_translated = all(v.get("translated") == True for v in hebrew.values())
print("All Hebrew marked translated:", all_translated)

# Check definitions length
def_lens = [len(v.get("definitions_cz", "")) for v in hebrew.values()]
print("Min definition length:", min(def_lens))
print("Max definition length:", max(def_lens))
print("Empty definitions:", sum(1 for l in def_lens if l == 0))

# Very short definitions
short = [
    (k, v.get("definitions_cz", ""))
    for k, v in hebrew.items()
    if 0 < len(v.get("definitions_cz", "")) < 10
]
print("Very short definitions (<10 chars):", len(short))
if short:
    for k, d in short[:10]:
        print(f'  {k}: "{d}"')

# Write short ones to file for review
if short:
    with open("short_definitions.txt", "w", encoding="utf-8") as f:
        for k, d in short:
            f.write(f"{k}: {d}\n")
    print("Short definitions written to short_definitions.txt")
