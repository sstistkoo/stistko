import json
import sys

if sys.platform == "win32":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

data = json.load(open("strong_bible_cz.json", "r", encoding="utf-8"))
e = data["entries"]

# Preview longest entry
print("H2148 (longest, 1834 chars):", e["H2148"].get("definitions_cz", "")[:300])
print()
# Preview a few random mid-range entries
for hid in ["H1000", "H3000", "H5000", "H7000"]:
    if hid in e:
        d = e[hid].get("definitions_cz", "")
        print(f"{hid} ({len(d)} chars): {d[:150]}")
print()
# Check for any entries with "??" pattern
suspicious = [
    (k, v.get("definitions_cz", "")[:100])
    for k, v in e.items()
    if "??" in v.get("definitions_cz", "")
]
print('Entries with "??":', len(suspicious))
if suspicious:
    for k, d in suspicious[:5]:
        print(f"  {k}: {d}")
# Check for "No translation" pattern
not_found = [
    (k, v.get("definitions_cz", "")[:100])
    for k, v in e.items()
    if "No translation" in v.get("definitions_cz", "")
    or "not found" in v.get("definitions_cz", "").lower()
]
print('Entries with "not found":', len(not_found))
if not_found:
    for k, d in not_found[:5]:
        print(f"  {k}: {d}")
