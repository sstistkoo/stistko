import sys

sys.stdout = open("compare_sources_out.txt", "w", encoding="utf-8")

import json

# Compare G2030 in our JSON vs STEPBible
with open("strongsgreek.json", "r", encoding="utf-8") as f:
    our_greek = json.load(f)

with open("stepbible_data/data/stepbible-tbesg.json", "r", encoding="utf-8") as f:
    step_greek = json.load(f)

# Our G2030
g2030_our = our_greek["entries"].get("02030") or our_greek["entries"].get("2030")
print("=== OUR G2030 (from JSON) ===")
if g2030_our:
    for k, v in g2030_our.items():
        if v and str(v).strip():
            print(f"{k}: {str(v)[:200]}")

# STEPBible G2030 – they use zero-padded keys
step_key = "G02030" if "G02030" in step_greek else "G2030"
# Try with zero padding: they use GXXXX format
for k in step_greek.keys():
    if k.replace("G", "").lstrip("0") == "2030":
        step_key = k
        break

print(f"\n=== STEPBible G2030 (key={step_key}) ===")
g2030_step = step_greek.get(step_key, {})
if g2030_step:
    for k, v in g2030_step.items():
        if v and str(v).strip():
            val_str = str(v)[:300]
            print(f"{k}: {val_str}")

# Also check H1
with open("stronghebrew.json", "r", encoding="utf-8") as f:
    our_heb = json.load(f)

with open("stepbible_data/data/stepbible-tbesh.json", "r", encoding="utf-8") as f:
    step_heb = json.load(f)

h1_our = our_heb["entries"].get("1")
print("\n\n=== OUR H1 (from JSON) ===")
if h1_our:
    for k, v in h1_our.items():
        if v and str(v).strip():
            print(f"{k}: {str(v)[:200]}")

# STEPBible H1
step_h1 = step_heb.get("H0001", {})
print("\n\n=== STEPBible H0001 ===")
if step_h1:
    for k, v in step_h1.items():
        if v and str(v).strip():
            val_str = str(v)[:300]
            print(f"{k}: {val_str}")
