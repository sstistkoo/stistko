import json

# Final comprehensive validation
data = json.load(open("strong_bible_cz.json", "r", encoding="utf-8"))
src = json.load(open("stronghebrew.json", "r", encoding="utf-8"))

target_entries = data.get("entries", {})
source_entries = src.get("entries", {})

# 1. Count Hebrew entries
hebrew_target = {k: v for k, v in target_entries.items() if k.startswith("H")}
hebrew_source_ids = set()
for v in source_entries.values():
    sid = v.get("ID", "")
    if sid.startswith("H"):
        hebrew_source_ids.add(sid)

print(f"Source Hebrew count: {len(hebrew_source_ids)}")
print(f"Target Hebrew count: {len(hebrew_target)}")
print(f"Missing in target: {hebrew_source_ids - set(hebrew_target.keys())}")

# 2. Check all translated=True
untranslated = [k for k, v in hebrew_target.items() if v.get("translated") != True]
print(f"\nUntranslated Hebrew: {len(untranslated)}")

# 3. Check for empty definitions
empty = [k for k, v in hebrew_target.items() if not v.get("definitions_cz", "").strip()]
print(f"Empty definitions: {len(empty)}")

# 4. Check for error messages
error_patterns = ["??", "No translation", "not found", "rate limit", "Error:", "failed"]
errors = []
for k, v in hebrew_target.items():
    d = v.get("definitions_cz", "")
    for pattern in error_patterns:
        if pattern.lower() in d.lower():
            errors.append((k, pattern))
            break
print(f"Entries with error messages: {len(errors)}")
if errors:
    for k, p in errors[:10]:
        print(f"  {k}: contains '{p}'")

# 5. Check structure
bad_struct = [
    k
    for k, v in hebrew_target.items()
    if "definitions_cz" not in v or "translated" not in v
]
print(f"\nBad structure: {len(bad_struct)}")

# 6. Summary
print(f"\n=== HEBREW VALIDATION SUMMARY ===")
print(f"Total Hebrew entries: {len(hebrew_target)}")
print(f"All translated: {len(untranslated) == 0}")
print(f"All have definitions: {len(empty) == 0}")
print(f"No error messages: {len(errors) == 0}")
print(f"Structure valid: {len(bad_struct) == 0}")
print(f"IDs match source: {set(hebrew_target.keys()) == hebrew_source_ids}")
