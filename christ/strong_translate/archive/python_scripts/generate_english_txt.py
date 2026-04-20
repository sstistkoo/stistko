import json

# Load Greek and Hebrew JSON data
with open("strongsgreek.json", "r", encoding="utf-8") as f:
    greek_data = json.load(f)

with open("stronghebrew.json", "r", encoding="utf-8") as f:
    hebrew_data = json.load(f)

output_lines = []

# Process Greek entries (G1, G2, ...)
for entry_key in sorted(greek_data["entries"].keys(), key=lambda x: int(x)):
    entry = greek_data["entries"][entry_key]
    strong_num = entry.get("strongs", "")
    greek_word = (entry.get("greek") or {}).get("unicode", "")

    # Build header: G{num} | {greek_word}
    header = f"G{strong_num} | {greek_word}"
    output_lines.append(header)

    # Definition field (from 'definition')
    definition = (entry.get("definition") or "").strip()
    if definition:
        # Clean up whitespace and newlines
        definition = " ".join(definition.split())
        output_lines.append(f"Definition: {definition}")

    # Meaning field (from 'kjv_def')
    kjv_def = (entry.get("kjv_def") or "").strip()
    if kjv_def:
        kjv_def = " ".join(kjv_def.split())
        output_lines.append(f"Meaning: {kjv_def}")

    # Origin field (from 'derivation')
    derivation = (entry.get("derivation") or "").strip()
    if derivation:
        derivation = " ".join(derivation.split())
        output_lines.append(f"Origin: {derivation}")

    output_lines.append("")

# Process Hebrew entries (H1, H2, ...)
for entry_key in sorted(hebrew_data["entries"].keys(), key=lambda x: int(x)):
    entry = hebrew_data["entries"][entry_key]
    hebrew_id = entry.get("ID", "")
    hebrew_word = entry.get("hebrew", "")

    # Build header: H{num} | {hebrew_word}
    header = f"{hebrew_id} | {hebrew_word}"
    output_lines.append(header)

    # Definition field (from notes.translation - short translation)
    notes = entry.get("notes") or {}
    translation = (notes.get("translation") or "").strip()
    if translation:
        output_lines.append(f"Definition: {translation}")

    # Meaning field (from definitions array - joined)
    definitions = entry.get("definitions") or []
    if definitions:
        # Clean and join definitions
        cleaned_defs = []
        for d in definitions:
            d_clean = " ".join((d or "").strip().split())
            if d_clean:
                cleaned_defs.append(d_clean)
        if cleaned_defs:
            meaning_text = "; ".join(cleaned_defs)
            output_lines.append(f"Meaning: {meaning_text}")

    # Greek references (if any) - add as separate line
    greek_refs = entry.get("greek_refs") or []
    if greek_refs:
        # Clean refs: remove colon, e.g. "G:1118" -> "G1118"
        cleaned_refs = []
        for ref in greek_refs:
            ref_str = str(ref).replace(":", "").strip()
            if ref_str:
                cleaned_refs.append(ref_str)
        if cleaned_refs:
            output_lines.append(f"Greek: {', '.join(cleaned_refs)}")

    output_lines.append("")

# Write output
with open("strong_english_detailed.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output_lines))

print(f"Generated strong_english_detailed.txt with {len(output_lines)} lines")
