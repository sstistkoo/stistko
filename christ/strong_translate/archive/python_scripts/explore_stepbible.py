import json

# Examine STEPBible data structure
for filename in [
    "stepbible-tbesg.json",
    "stepbible-tbesh.json",
    "stepbible-tflsj.json",
]:
    path = f"stepbible_data/data/{filename}"
    print(f"\n{'=' * 60}")
    print(f"FILE: {filename}")
    print("=" * 60)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Check top-level structure
    print(f"Top-level keys: {list(data.keys())}")

    # Examine first entry
    if "entries" in data:
        entries = data["entries"]
    elif "lexicon" in data:
        entries = data["lexicon"]
    else:
        # Find first dict with entries
        for k, v in data.items():
            if isinstance(v, dict) and len(v) > 0:
                entries = v
                break

    if entries:
        first_key = list(entries.keys())[0]
        first_entry = entries[first_key]
        print(f"\nFirst entry ID: {first_key}")
        print(f"Fields: {list(first_entry.keys())}")
        print(f"\nFull content (first entry):")
        for k, v in first_entry.items():
            val_str = str(v)[:200]
            print(f"  {k}: {val_str}")
