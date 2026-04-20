import json

with open("stepbible_data/data/stepbible-tbesg.json", "r", encoding="utf-8") as f:
    step = json.load(f)

# Find key
for k, v in step.items():
    if k.replace("G", "").lstrip("0") == "16":
        print(f"Key: {k}")
        for key, val in v.items():
            print(f"{key}: {str(val)[:300]}")
        break
