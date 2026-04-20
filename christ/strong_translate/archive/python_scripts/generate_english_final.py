import json
import xml.etree.ElementTree as ET


def safe_str(value):
    if value is None:
        return ""
    return str(value).strip()


def clean_whitespace(text):
    return " ".join(text.split())


def format_see_refs(see_array):
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


def format_definitions(defs_array):
    if not defs_array:
        return ""
    cleaned = []
    for d in defs_array:
        d_clean = clean_whitespace(str(d or ""))
        if d_clean:
            cleaned.append(d_clean)
    return "\n  ".join(cleaned)


def extract_text_with_tags(element):
    """Extract all text including from child tags like <hi>."""
    if element is None:
        return ""
    text_parts = []
    if element.text:
        text_parts.append(element.text)
    for child in element:
        if child.text:
            text_parts.append(child.text)
        if child.tail:
            text_parts.append(child.tail)
    return "".join(text_parts).strip()


def format_notes(notes_obj):
    """Format notes from JSON notes object."""
    if not notes_obj:
        return ""
    parts = []
    if "translation" in notes_obj:
        trans = clean_whitespace(str(notes_obj["translation"] or ""))
        if trans:
            parts.append(f"Translation: {trans}")
    if "exegesis" in notes_obj:
        exeg = clean_whitespace(str(notes_obj["exegesis"] or ""))
        if exeg:
            parts.append(f"Etymology: {exeg}")
    if "explanation" in notes_obj:
        expl = clean_whitespace(str(notes_obj["explanation"] or ""))
        if expl:
            parts.append(f"Explanation: {expl}")
    if "x-typo" in notes_obj:
        typo = clean_whitespace(str(notes_obj["x-typo"] or ""))
        if typo:
            parts.append(f"Note: {typo}")
    return "\n  ".join(parts)


def extract_notes_from_xml(note_elements):
    """Extract all notes from XML <note> elements."""
    notes = {}
    for note in note_elements:
        ntype = note.get("type", "")
        if ntype in ("exegesis", "translation", "explanation", "x-typo", "x-corr"):
            text_val = extract_text_with_tags(note)
            if text_val:
                if ntype == "exegesis":
                    notes["exegesis"] = text_val
                elif ntype == "translation":
                    notes["translation"] = text_val
                elif ntype == "explanation":
                    notes["explanation"] = text_val
                elif ntype == "x-typo":
                    notes["x_typo"] = text_val
                elif ntype == "x-corr":
                    notes["x_corr"] = text_val
    return notes


# ============================================================
# LOAD JSON DATA
# ============================================================
with open("strongsgreek.json", "r", encoding="utf-8") as f:
    greek_data = json.load(f)

with open("stronghebrew.json", "r", encoding="utf-8") as f:
    hebrew_data = json.load(f)

# ============================================================
# LOAD XML DATA (for Hebrew TWOT gloss & extra notes)
# ============================================================
tree_h = ET.parse("StrongHebrewG.xml")
root_h = tree_h.getroot()
ns = {"osis": "http://www.bibletechnologies.net/2003/OSIS/namespace"}

# Map Hebrew ID -> {gloss: value, notes: {type: text}}
xml_extra_data = {}
entries_h_xml = root_h.findall('.//osis:div[@type="entry"]', ns)
for entry_xml in entries_h_xml:
    # get ID from <w>
    w_elem = entry_xml.find(".//osis:w[@ID]", ns)
    if w_elem is None:
        continue
    hebrew_id = w_elem.get("ID", "")
    if not hebrew_id:
        continue
    # get gloss attribute
    gloss = w_elem.get("gloss", "")
    # extract all notes
    note_elems = entry_xml.findall(".//osis:note", ns)
    xml_notes = extract_notes_from_xml(note_elems)
    if gloss or xml_notes:
        xml_extra_data[hebrew_id] = {"gloss": gloss.strip(), "notes": xml_notes}

print(f"Loaded extra data for {len(xml_extra_data)} Hebrew entries from XML")

# ============================================================
# LOAD GREEK XML DATA (for BETA betacode representation)
# ============================================================
tree_g = ET.parse("strongsgreek.xml")
root_g = tree_g.getroot()
beta_codes = {}
entries_g_xml = root_g.findall(".//entry", {})
for entry_xml in entries_g_xml:
    strongs_attr = entry_xml.get("strongs", "")
    if not strongs_attr:
        continue
    # Normalize key: strip leading zeros to match JSON's strongs (e.g., "00001" -> "1")
    key = (
        str(int(strongs_attr))
        if strongs_attr.isdigit()
        else strongs_attr.lstrip("0") or "0"
    )
    greek_elem = entry_xml.find("greek")
    if greek_elem is not None:
        beta_val = greek_elem.get("BETA", "")
        if beta_val:
            beta_codes[key] = beta_val
print(f"Loaded BETA codes for {len(beta_codes)} Greek entries")

output_lines = []
missing_gloss = []
missing_explanation = []

# ============================================================
# GREEK ENTRIES (G1, G2, ...)
# ============================================================
for entry_key in sorted(greek_data["entries"].keys(), key=lambda x: int(x)):
    entry = greek_data["entries"][entry_key]
    strong_num = safe_str(entry.get("strongs", ""))

    greek_obj = entry.get("greek") or {}
    greek_word = safe_str(greek_obj.get("unicode", ""))
    # BETA from XML (betacode representation)
    greek_beta = beta_codes.get(strong_num, "")
    header = f"G{strong_num} | {greek_word}"
    output_lines.append(header)

    # BETA code representation (original betacode transcription)
    if greek_beta:
        output_lines.append(f"BETA: {greek_beta}")

    translit = safe_str(greek_obj.get("translit", ""))
    if translit:
        output_lines.append(f"Transliteration: {translit}")

    pron = safe_str(entry.get("pronunciation", ""))
    if pron:
        output_lines.append(f"Pronunciation: {pron}")

    definition = clean_whitespace(safe_str(entry.get("definition", "")))
    if definition:
        output_lines.append(f"Definition: {definition}")

    kjv_def = clean_whitespace(safe_str(entry.get("kjv_def", "")))
    if kjv_def:
        output_lines.append(f"KJV Meaning: {kjv_def}")

    derivation = clean_whitespace(safe_str(entry.get("derivation", "")))
    if derivation:
        output_lines.append(f"Origin: {derivation}")

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

    header = f"{hebrew_id} | {hebrew_word}"
    output_lines.append(header)

    # Lemma (with vowels)
    lemma = safe_str(entry.get("lemma", ""))
    if lemma:
        output_lines.append(f"Lemma: {lemma}")

    # TWOT reference from XML gloss (if available)
    extra = xml_extra_data.get(hebrew_id, {})
    gloss = extra.get("gloss", "")
    if gloss:
        output_lines.append(f"TWOT: {gloss}")

    # Transliteration
    xlit = safe_str(entry.get("xlit", ""))
    if xlit:
        output_lines.append(f"Transliteration: {xlit}")

    # Morphology & POS
    morph = safe_str(entry.get("morph", ""))
    pos = safe_str(entry.get("POS", ""))
    if morph and pos:
        output_lines.append(f"Morphology: {morph}  POS: {pos}")
    elif morph:
        output_lines.append(f"Morphology: {morph}")
    elif pos:
        output_lines.append(f"POS: {pos}")

    # Definitions (numbered)
    definitions = entry.get("definitions") or []
    defs_text = format_definitions(definitions)
    if defs_text:
        output_lines.append(f"Definitions:\n  {defs_text}")

    # Notes from JSON + XML (prefer XML explanation if present)
    notes = {}
    json_notes = entry.get("notes") or {}
    if json_notes:
        notes.update(json_notes)
    xml_notes = extra.get("notes", {})
    if xml_notes:
        # XML notes may override/expand JSON notes
        notes.update(xml_notes)

    # Build notes output
    if notes:
        note_parts = []
        if "translation" in notes:
            trans = clean_whitespace(str(notes["translation"] or ""))
            if trans:
                note_parts.append(f"Translation: {trans}")
        if "exegesis" in notes:
            exeg = clean_whitespace(str(notes["exegesis"] or ""))
            if exeg:
                note_parts.append(f"Etymology: {exeg}")
        if "explanation" in notes:
            expl = clean_whitespace(str(notes["explanation"] or ""))
            if expl:
                note_parts.append(f"Explanation: {expl}")
        if "x_typo" in notes:
            typo = clean_whitespace(str(notes["x_typo"] or ""))
            if typo:
                note_parts.append(f"Note: {typo}")
        if "x_corr" in notes:
            corr = clean_whitespace(str(notes["x_corr"] or ""))
            if corr:
                note_parts.append(f"Correction: {corr}")
        if note_parts:
            output_lines.append(f"Notes:\n  {'\n  '.join(note_parts)}")

    # Greek references
    greek_refs = entry.get("greek_refs") or []
    greek_refs_str = ", ".join([r.replace(":", "") for r in greek_refs if r])
    if greek_refs_str:
        output_lines.append(f"Greek Refs: {greek_refs_str}")

    output_lines.append("")

# ============================================================
# WRITE
# ============================================================
with open("strong_english_detailed.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output_lines))

print(f"Generated strong_english_detailed.txt")
print(f"  Total output lines: {len(output_lines)}")
# Count G and H headers
import re

g_headers = [l for l in output_lines if re.match(r"^G\d+", l)]
h_headers = [l for l in output_lines if re.match(r"^H\d+", l)]
print(f"  Greek entries: {len(g_headers)}")
print(f"  Hebrew entries: {len(h_headers)}")

# Stats about TWOT
with_gloss = sum(1 for k, v in xml_extra_data.items() if v.get("gloss"))
print(f"  Hebrew entries with TWOT gloss: {with_gloss}")
with_expl = sum(
    1 for k, v in xml_extra_data.items() if v.get("notes", {}).get("explanation")
)
print(f"  Hebrew entries with XML explanation: {with_expl}")
