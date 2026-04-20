import json
import xml.etree.ElementTree as ET
import re


def clean_html(text):
    """Convert HTML-like tags to plain text markers."""
    if not text:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<b>", "", text)
    text = re.sub(r"</b>", "", text)
    text = re.sub(r"<i>", "", text)
    text = re.sub(r"</i>", "", text)
    text = re.sub(r"<ref=[^>]*>([^<]*)</ref>", r"[\1]", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = " ".join(text.split())
    return text


def sort_strongs_keys(keys, prefix):
    """Sort Strong's keys numerically, handling disambiguations like 'H0122a'."""

    def key_func(k):
        num_str = k.replace(prefix, "")
        m = re.match(r"^(\d+)([a-zA-Z]*)$", num_str)
        if m:
            num = int(m.group(1))
            suffix = m.group(2) or ""
            return (num, suffix)
        return (0, "")

    return sorted(keys, key=key_func)


# Load STEPBible data
with open("stepbible_data/data/stepbible-tbesg.json", "r", encoding="utf-8") as f:
    step_greek = json.load(f)
with open("stepbible_data/data/stepbible-tbesh.json", "r", encoding="utf-8") as f:
    step_heb = json.load(f)

# Load our supplementary data
with open("strongsgreek.json", "r", encoding="utf-8") as f:
    our_greek = json.load(f)
with open("stronghebrew.json", "r", encoding="utf-8") as f:
    our_heb = json.load(f)
with open("strong_bible_cz.json", "r", encoding="utf-8") as f:
    cz_data = json.load(f)

# Parse Greek XML for BETA codes
tree_g = ET.parse("strongsgreek.xml")
root_g = tree_g.getroot()
beta_codes = {}
for entry_xml in root_g.findall(".//entry", {}):
    strongs_attr = entry_xml.get("strongs", "")
    if not strongs_attr:
        continue
    key = str(int(strongs_attr)).zfill(4)  # zero-padded to 4 digits
    greek_elem = entry_xml.find("greek")
    if greek_elem is not None:
        beta_val = greek_elem.get("BETA", "")
        if beta_val:
            beta_codes[key] = beta_val

# Parse Hebrew XML for TWOT and extended notes
tree_h = ET.parse("StrongHebrewG.xml")
root_h = tree_h.getroot()
ns = {"osis": "http://www.bibletechnologies.net/2003/OSIS/namespace"}
xml_extra = {}
for entry_xml in root_h.findall('.//osis:div[@type="entry"]', ns):
    w_elem = entry_xml.find(".//osis:w[@ID]", ns)
    if w_elem is None:
        continue
    hebrew_id = w_elem.get("ID", "")
    if not hebrew_id:
        continue
    gloss = w_elem.get("gloss", "")
    # Extract all notes
    note_elems = entry_xml.findall(".//osis:note", ns)
    xml_notes = {}
    for note in note_elems:
        ntype = note.get("type", "")
        if ntype in ("exegesis", "translation", "explanation", "x-typo", "x-corr"):
            parts = []
            if note.text:
                parts.append(note.text)
            for child in note:
                if child.text:
                    parts.append(child.text)
                if child.tail:
                    parts.append(child.tail)
            text = "".join(parts).strip()
            if text:
                xml_notes[ntype] = text
    if gloss or xml_notes:
        xml_extra[hebrew_id] = {"gloss": gloss.strip(), "notes": xml_notes}

output_lines = []

# ============================================================
# GREEK ENTRIES from STEPBible (TBESG)
# ============================================================
print("Processing Greek entries from STEPBible...")
step_greek_keys = sort_strongs_keys(step_greek.keys(), "G")
for step_key in step_greek_keys:
    entry = step_greek[step_key]
    # Numeric part
    num = step_key.replace("G", "").lstrip("0")
    if not num:
        num = "0"

    # Header: G{num} | {lemma word}
    lemma_full = entry.get("lemma", "")
    # Extract just the Greek word (before comma or first part)
    greek_word = (
        lemma_full.split(",")[0].strip() if "," in lemma_full else lemma_full.strip()
    )
    output_lines.append(f"G{num} | {greek_word}")

    # BETA code from our XML
    beta = beta_codes.get(num.zfill(4), "")  # keys are zero-padded 4-digit
    if beta:
        output_lines.append(f"BETA: {beta}")

    # Transliteration (from STEPBible)
    translit = entry.get("transliteration", "")
    if translit:
        output_lines.append(f"Transliteration: {translit}")

    # Morphology (from STEPBible)
    morph = entry.get("morphology", "")
    if morph:
        output_lines.append(f"Morphology: {morph}")

    # Definition (rich from STEPBible, cleaned from HTML)
    definition_raw = entry.get("definition", "")
    definition_clean = clean_html(definition_raw)
    if definition_clean:
        # Split into lines if multi-part
        def_lines = definition_clean.split("\n")
        # First line as main Definition
        main_def = def_lines[0].strip()
        if main_def:
            output_lines.append(f"Definice: {main_def}")
        # Remaining lines as Additional Meanings (if any)
        if len(def_lines) > 1:
            extra = " ".join([l.strip() for l in def_lines[1:] if l.strip()])
            if extra:
                output_lines.append(f"Význam: {extra}")
    else:
        # Fallback to our JSON
        fallback = (
            our_greek["entries"].get(num.zfill(4), {})
            or our_greek["entries"].get(num, {})
        ).get("definition", "")
        if fallback:
            output_lines.append(f"Definice: {fallback}")

    # Gloss (short)
    gloss = entry.get("gloss", "")
    if gloss and gloss != greek_word:
        output_lines.append(f"KJV Významy: {gloss}")

    # See/Cross-refs (STEPBible has refs embedded in definition; we could extract but keep it in definition)
    # Instead add unified ID reference if different
    unified = entry.get("strongsUnified", "")
    if unified and unified != step_key:
        output_lines.append(f"Viz také: {unified}")

    # Czech translation
    cz_entry = cz_data.get("entries", {}).get(f"G{num}", {})
    cz_text = cz_entry.get("definitions_cz", "")
    if cz_text:
        cz_clean = " ".join(cz_text.split())
        output_lines.append(f"Česky: {cz_clean}")

    output_lines.append("")

# ============================================================
# HEBREW ENTRIES from STEPBible (TBESH)
# ============================================================
print("Processing Hebrew entries from STEPBible...")
step_heb_keys = sort_strongs_keys(step_heb.keys(), "H")
for step_key in step_heb_keys:
    entry = step_heb[step_key]
    num = step_key.replace("H", "").lstrip("0")
    if not num:
        num = "0"
    hebrew_id = f"H{num}"

    # Header
    lemma = entry.get("lemma", "")
    output_lines.append(f"{hebrew_id} | {lemma}")

    # Transliteration
    translit = entry.get("transliteration", "")
    if translit:
        output_lines.append(f"Transliteration: {translit}")

    # Morphology
    morph = entry.get("morphology", "")
    if morph:
        output_lines.append(f"Morphology: {morph}")

    # Definition (rich from STEPBible)
    definition_raw = entry.get("definition", "")
    definition_clean = clean_html(definition_raw)
    if definition_clean:
        # Split by <br> which became newlines
        def_lines = definition_clean.split("\n")
        # First line as main gloss
        main_def = def_lines[0].strip()
        if main_def:
            output_lines.append(f"Definice: {main_def}")
        # Rest as numbered meanings
        if len(def_lines) > 1:
            rest = []
            for line in def_lines[1:]:
                line = line.strip()
                if line:
                    # Ensure numbering preserved (already has "1)" etc)
                    rest.append(line)
            if rest:
                defs_text = "\n  ".join(rest)
                output_lines.append(f"Význam:\n  {defs_text}")
    else:
        # Fallback to our JSON definitions array
        fallback_entry = our_heb["entries"].get(num, {})
        fallback_defs = fallback_entry.get("definitions", [])
        if fallback_defs:
            cleaned = [" ".join((d or "").split()) for d in fallback_defs if d]
            defs_text = "\n  ".join(cleaned)
            output_lines.append(f"Definice:\n  {defs_text}")

    # Gloss
    gloss = entry.get("gloss", "")
    if gloss and gloss != lemma:
        output_lines.append(f"KJV Významy: {gloss}")

    # TWOT from XML
    extra = xml_extra.get(hebrew_id, {})
    twot = extra.get("gloss", "")
    if twot:
        output_lines.append(f"TWOT: {twot}")

    # Our Hebrew notes (Translation, Etymology, Explanation)
    notes = {}
    json_notes = our_heb["entries"].get(num, {}).get("notes") or {}
    if json_notes:
        notes.update(json_notes)
    xml_notes = extra.get("notes", {})
    if xml_notes:
        notes.update(xml_notes)
    if notes:
        note_parts = []
        if "translation" in notes:
            trans = " ".join(str(notes["translation"]).split())
            if trans:
                note_parts.append(f"Překlad: {trans}")
        if "exegesis" in notes:
            exeg = " ".join(str(notes["exegesis"]).split())
            if exeg:
                note_parts.append(f"Etymol: {exeg}")
        if "explanation" in notes:
            expl = " ".join(str(notes["explanation"]).split())
            if expl:
                note_parts.append(f"Vysvětlení: {expl}")
        if note_parts:
            output_lines.append(f"Poznámky:\n  {'\n  '.join(note_parts)}")

    # Greek refs from our JSON
    greek_refs = our_heb["entries"].get(num, {}).get("greek_refs") or []
    if greek_refs:
        cleaned = [r.replace(":", "").strip() for r in greek_refs if r]
        if cleaned:
            output_lines.append(f"Řecké refs: {', '.join(cleaned)}")

    # Czech
    cz_entry = cz_data.get("entries", {}).get(hebrew_id, {})
    cz_text = cz_entry.get("definitions_cz", "")
    if cz_text:
        cz_clean = " ".join(cz_text.split())
        output_lines.append(f"Česky: {cz_clean}")

    output_lines.append("")

# Write
with open("strong_updated_detailed_cs.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output_lines))

print(f"\nGenerated strong_updated_detailed_cs.txt")
print(f"  Total lines: {len(output_lines)}")
import re

g_cnt = sum(1 for l in output_lines if re.match(r"^G\d+", l))
h_cnt = sum(1 for l in output_lines if re.match(r"^H\d+", l))
print(f"  Greek entries: {g_cnt}")
print(f"  Hebrew entries: {h_cnt}")
