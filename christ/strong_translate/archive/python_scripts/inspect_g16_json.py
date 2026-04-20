import sys

sys.stdout = open("g16_json_out.txt", "w", encoding="utf-8")

import json

with open("strongsgreek.json", "r", encoding="utf-8") as f:
    g = json.load(f)

# Find G16 key
g16_key = None
for k in g["entries"].keys():
    if k.lstrip("0") == "16":
        g16_key = k
        break

if g16_key:
    entry = g["entries"][g16_key]
    print(f"G16 key: {g16_key}")
    for k, v in entry.items():
        print(f"{k}: {repr(v)[:300]}")
else:
    print("G16 not found")
