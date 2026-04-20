import json


def safe_str(value):
    """Convert None or non-string to safe string."""
    if value is None:
        return ""
    return str(value).strip()


def clean_whitespace(text):
    """Normalize whitespace: collapse multiple spaces/newlines to single spaces."""
    return " ".join(text.split())


def format_see_refs(see_array):
    """Format cross-references from 'see' array."""
    if not see_array:
        return ""
    refs = []
    for ref in see_array:
        lang = ref.get("language", "")
        strongs = ref.get("strongs", "")
        if lang and strongs:
            prefix = "G" if lang == "GREEK" else "H"
            refs.append(f"{prefix}{strongs}")
    return ", ".join(refs) if refs else ""


def format_greek_refs(refs_array):
    """Format Hebrew's greek_refs array (format: 'G:1118' -> 'G1118')."""
    if not refs_array:
        return ""
    cleaned = []
    for ref in refs_array:
        ref_str = str(ref).replace(":", "").strip()
        if ref_str:
            cleaned.append(ref_str)
    return ", ".join(cleaned)


def format_definitions(defs_array):
    """Join numbered definitions preserving numbering."""
    if not defs_array:
        return ""
    cleaned = []
    for d in defs_array:
        d_clean = clean_whitespace(str(d or ""))
        if d_clean:
            cleaned.append(d_clean)
    return "\n  ".join(cleaned)


def format_notes(notes_obj):
    """Format notes object (exegesis, explanation, translation, x-typo)."""
    if not notes_obj:
        return ""
    parts = []
    # Prefer translation first (short glossary)
    if "translation" in notes_obj:
        trans = clean_whitespace(str(notes_obj["translation"] or ""))
        if trans:
            parts.append(f"Translation: {trans}")
    # exegesis - etymology note
    if "exegesis" in notes_obj:
        exeg = clean_whitespace(str(notes_obj["exegesis"] or ""))
        if exeg:
            parts.append(f"Etymology: {exeg}")
    # explanation - longer explanation
    if "explanation" in notes_obj:
        expl = clean_whitespace(str(notes_obj["explanation"] or ""))
        if expl:
            parts.append(f"Explanation: {expl}")
    # x-typo - typo note
    if "x-typo" in notes_obj:
        typo = clean_whitespace(str(notes_obj["x-typo"] or ""))
        if typo:
            parts.append(f"Note: {typo}")
    return "\n  ".join(parts)


# ============================================================
# LOAD JSON DATA
# ============================================================
with open("strongsgreek.json", "r", encoding="utf-8") as f:
    greek_data = json.load(f)

with open("stronghebrew.json", "r", encoding="utf-8") as f:
    hebrew_data = json.load(f)

output_lines = []

# ============================================================
# GREEK ENTRIES (G1, G2, ...)
# ============================================================
for entry_key in sorted(greek_data["entries"].keys(), key=lambda x: int(x)):
    entry = greek_data["entries"][entry_key]
    strong_num = safe_str(entry.get("strongs", ""))

    # --- HEADER ---
    greek_obj = entry.get("greek") or {}
    greek_word = safe_str(greek_obj.get("unicode", ""))
    header = f"G{strong_num} | {greek_word}"
    output_lines.append(header)

    # --- TRANSLITERATION ---
    translit = safe_str(greek_obj.get("translit", ""))
    if translit:
        output_lines.append(f"Transliteration: {translit}")

    # --- PRONUNCIATION ---
    pron = safe_str(entry.get("pronunciation", ""))
    if pron:
        output_lines.append(f"Pronunciation: {pron}")

    # --- DEFINITION ---
    definition = clean_whitespace(safe_str(entry.get("definition", "")))
    if definition:
        output_lines.append(f"Definition: {definition}")

    # --- KJV MEANING ---
    kjv_def = clean_whitespace(safe_str(entry.get("kjv_def", "")))
    if kjv_def:
        output_lines.append(f"KJV Meaning: {kjv_def}")

    # --- ORIGIN / DERIVATION ---
    derivation = clean_whitespace(safe_str(entry.get("derivation", "")))
    if derivation:
        output_lines.append(f"Origin: {derivation}")

    # --- CROSS-REFERENCES (see) ---
    see_array = entry.get("see") or []
    see_str = format_see_refs(see_array)
    if see_str:
        output_lines.append(f"See Also: {see_str}")

    output_lines.append("")

# ============================================================
# HEBREW ENTRIES (H1, H2, ...)
# ============================================================
for entry_key in sorted(hebrew_data["entries"].keys(), key=lambda x: int(x)):
    entry = hebrew_data["entries"][entry_key]
    hebrew_id = safe_str(entry.get("ID", ""))
    hebrew_word = safe_str(entry.get("hebrew", ""))

    # --- HEADER ---
    header = f"{hebrew_id} | {hebrew_word}"
    output_lines.append(header)

    # --- LEMMA (with vowels) ---
    lemma = safe_str(entry.get("lemma", ""))
    if lemma:
        output_lines.append(f"Lemma: {lemma}")

    # --- TRANSLITERATION ---
    xlit = safe_str(entry.get("xlit", ""))
    if xlit:
        output_lines.append(f"Transliteration: {xlit}")

    # --- MORPHOLOGY & POS ---
    morph = safe_str(entry.get("morph", ""))
    pos = safe_str(entry.get("POS", ""))
    if morph and pos:
        output_lines.append(f"Morphology: {morph}  POS: {pos}")
    elif morph:
        output_lines.append(f"Morphology: {morph}")
    elif pos:
        output_lines.append(f"POS: {pos}")

    # --- DEFINITIONS (numbered, array) ---
    definitions = entry.get("definitions") or []
    defs_text = format_definitions(definitions)
    if defs_text:
        output_lines.append(f"Definitions:\n  {defs_text}")

    # --- NOTES (exegesis, explanation, translation, x-typo) ---
    notes_obj = entry.get("notes")
    if notes_obj:
        notes_text = format_notes(notes_obj)
        if notes_text:
            output_lines.append(f"Notes:\n  {notes_text}")

    # --- GREEK REFERENCES ---
    greek_refs = entry.get("greek_refs") or []
    greek_refs_str = format_greek_refs(greek_refs)
    if greek_refs_str:
        output_lines.append(f"Greek Refs: {greek_refs_str}")

    output_lines.append("")

# ============================================================
# WRITE OUTPUT
# ============================================================
output_path = "strong_english_detailed.txt"
with open(output_path, "w", encoding="utf-8") as f:
    f.write("\n".join(output_lines))

print(f"Generated {output_path}")
print(f"  Total lines: {len(output_lines)}")
print(f"  File size: {len('\\n'.join(output_lines))} chars")

# Count entries
with open(output_path, "r", encoding="utf-8") as f:
    content = f.read()
g_count = content.count("\nG")  # approximate
h_count = content.count("\nH")
g_headers = [
    l
    for l in content.split("\n")
    if l.startswith("G") and "|" in l and not l.startswith("  ")
]
h_headers = [
    l
    for l in content.split("\n")
    if l.startswith("H") and "|" in l and not l.startswith("  ")
]
print(f"  Greek entries: {len(g_headers)}")
print(f"  Hebrew entries: {len(h_headers)}")
