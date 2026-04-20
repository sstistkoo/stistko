import json
import xml.etree.ElementTree as ET

# Load data
with open("strongsgreek.json", "r", encoding="utf-8") as f:
    greek_data = json.load(f)
with open("stronghebrew.json", "r", encoding="utf-8") as f:
    hebrew_data = json.load(f)
with open("strong_bible_cz.json", "r", encoding="utf-8") as f:
    cz_data = json.load(f)

# Parse Greek XML for BETA and richer derivation
tree_g = ET.parse("strongsgreek.xml")
root_g = tree_g.getroot()
beta_codes = {}
xml_derivations = {}
entries_g_xml = root_g.findall(".//entry", {})
for entry_xml in entries_g_xml:
    strongs_attr = entry_xml.get("strongs", "")
    if not strongs_attr:
        continue
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
    deriv_elem = entry_xml.find("strongs_derivation")
    if deriv_elem is not None and deriv_elem.text:
        xml_derivations[key] = deriv_elem.text.strip()

# Parse Hebrew XML for TWOT and notes
tree_h = ET.parse("StrongHebrewG.xml")
root_h = tree_h.getroot()
ns = {"osis": "http://www.bibletechnologies.net/2003/OSIS/namespace"}
xml_extra_data = {}
entries_h_xml = root_h.findall('.//osis:div[@type="entry"]', ns)
for entry_xml in entries_h_xml:
    w_elem = entry_xml.find(".//osis:w[@ID]", ns)
    if w_elem is None:
        continue
    hebrew_id = w_elem.get("ID", "")
    if not hebrew_id:
        continue
    gloss = w_elem.get("gloss", "")
    note_elems = entry_xml.findall(".//osis:note", ns)
    xml_notes = {}
    for note in note_elems:
        ntype = note.get("type", "")
        if ntype in ("exegesis", "translation", "explanation", "x-typo", "x-corr"):
            text_parts = []
            if note.text:
                text_parts.append(note.text)
            for child in note:
                if child.text:
                    text_parts.append(child.text)
                if child.tail:
                    text_parts.append(child.tail)
            text_val = "".join(text_parts).strip()
            if text_val:
                if ntype == "exegesis":
                    xml_notes["exegesis"] = text_val
                elif ntype == "translation":
                    xml_notes["translation"] = text_val
                elif ntype == "explanation":
                    xml_notes["explanation"] = text_val
                elif ntype == "x-typo":
                    xml_notes["x_typo"] = text_val
                elif ntype == "x-corr":
                    xml_notes["x_corr"] = text_val
    if gloss or xml_notes:
        xml_extra_data[hebrew_id] = {"gloss": gloss.strip(), "notes": xml_notes}

output_lines = []

# ============================================================
# GREEK ENTRIES — with CZECH field names
# ============================================================
for entry_key in sorted(greek_data["entries"].keys(), key=lambda x: int(x)):
    entry = greek_data["entries"][entry_key]
    strong_num = entry.get("strongs", "")
    greek_obj = entry.get("greek") or {}
    greek_word = greek_obj.get("unicode", "")

    # Header
    output_lines.append(f"G{strong_num} | {greek_word}")

    # BETA
    beta = beta_codes.get(strong_num, "")
    if beta:
        output_lines.append(f"BETA: {beta}")

    # Transliteration
    translit = greek_obj.get("translit", "")
    if translit:
        output_lines.append(f"Transliteration: {translit}")

    # Pronunciation
    pron = entry.get("pronunciation", "")
    if pron:
        output_lines.append(f"Pronunciation: {pron}")

    # Definition (English)
    definition = (entry.get("definition") or "").strip()
    if definition:
        definition = " ".join(definition.split())
        output_lines.append(f"Definice: {definition}")

    # KJV Meaning (English)
    kjv_def = (entry.get("kjv_def") or "").strip()
    if kjv_def:
        kjv_def = " ".join(kjv_def.split())
        output_lines.append(f"KJV Významy: {kjv_def}")

    # Origin
    derivation_json = (entry.get("derivation") or "").strip()
    derivation_xml = xml_derivations.get(strong_num, "")
    derivation = derivation_xml if derivation_xml else derivation_json
    derivation = " ".join(derivation.split())
    if derivation:
        output_lines.append(f"Původ: {derivation}")

    # See Also
    see_array = entry.get("see") or []
    if see_array:
        refs = []
        for ref in see_array:
            lang = ref.get("language", "")
            strongs_val = ref.get("strongs", "")
            if lang and strongs_val:
                prefix = "G" if lang == "GREEK" else "H"
                refs.append(f"{prefix}{strongs_val}")
        if refs:
            output_lines.append(f"Viz také: {', '.join(refs)}")

    # Czech translation
    cz_entry = cz_data.get("entries", {}).get(f"G{strong_num}", {})
    cz_text = cz_entry.get("definitions_cz", "")
    if cz_text:
        cz_one_line = " ".join(cz_text.split())
        output_lines.append(f"Česky: {cz_one_line}")

    output_lines.append("")

# ============================================================
# HEBREW ENTRIES — with CZECH field names
# ============================================================
for entry_key in sorted(hebrew_data["entries"].keys(), key=lambda x: int(x)):
    entry = hebrew_data["entries"][entry_key]
    hebrew_id = entry.get("ID", "")
    hebrew_word = entry.get("hebrew", "")

    output_lines.append(f"{hebrew_id} | {hebrew_word}")

    # Lemma
    lemma = entry.get("lemma", "")
    if lemma:
        output_lines.append(f"Lemma: {lemma}")

    # TWOT
    extra = xml_extra_data.get(hebrew_id, {})
    gloss = extra.get("gloss", "")
    if gloss:
        output_lines.append(f"TWOT: {gloss}")

    # Transliteration
    xlit = entry.get("xlit", "")
    if xlit:
        output_lines.append(f"Transliteration: {xlit}")

    # Morphology + POS
    morph = entry.get("morph", "")
    pos = entry.get("POS", "")
    if morph and pos:
        output_lines.append(f"Morphology: {morph}  POS: {pos}")
    elif morph:
        output_lines.append(f"Morphology: {morph}")

    # Definitions (numbered)
    definitions = entry.get("definitions") or []
    if definitions:
        cleaned = [" ".join((d or "").split()) for d in definitions if d and d.strip()]
        if cleaned:
            defs_text = "\n  ".join(cleaned)
            output_lines.append(f"Definice:\n  {defs_text}")

    # Notes (from JSON + XML combined)
    notes = {}
    json_notes = entry.get("notes") or {}
    if json_notes:
        notes.update(json_notes)
    xml_notes = extra.get("notes", {})
    if xml_notes:
        notes.update(xml_notes)
    if notes:
        note_parts = []
        if "translation" in notes:
            trans = " ".join(str(notes["translation"] or "").split())
            if trans:
                note_parts.append(f"Překlad: {trans}")
        if "exegesis" in notes:
            exeg = " ".join(str(notes["exegesis"] or "").split())
            if exeg:
                note_parts.append(f"Etymol: {exeg}")
        if "explanation" in notes:
            expl = " ".join(str(notes["explanation"] or "").split())
            if expl:
                note_parts.append(f"Vysvětlení: {expl}")
        if "x_typo" in notes:
            typo = " ".join(str(notes["x_typo"] or "").split())
            if typo:
                note_parts.append(f"Poznámka: {typo}")
        if "x_corr" in notes:
            corr = " ".join(str(notes["x_corr"] or "").split())
            if corr:
                note_parts.append(f"Oprava: {corr}")
        if note_parts:
            output_lines.append(f"Poznámky:\n  {'\n  '.join(note_parts)}")

    # Greek Refs
    greek_refs = entry.get("greek_refs") or []
    if greek_refs:
        cleaned_refs = [r.replace(":", "").strip() for r in greek_refs if r]
        if cleaned_refs:
            output_lines.append(f"Řecké refs: {', '.join(cleaned_refs)}")

    # Czech translation
    cz_entry = cz_data.get("entries", {}).get(hebrew_id, {})
    cz_text = cz_entry.get("definitions_cz", "")
    if cz_text:
        cz_one_line = " ".join(cz_text.split())
        output_lines.append(f"Česky: {cz_one_line}")

    output_lines.append("")

# Write
with open("strong_czech_detailed_cs_headers.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output_lines))

print(f"Generated strong_czech_detailed_cs_headers.txt")
print(f"  Total lines: {len(output_lines)}")
import re

g_cnt = sum(1 for l in output_lines if re.match(r"^G\d+", l))
h_cnt = sum(1 for l in output_lines if re.match(r"^H\d+", l))
print(f"  Greek entries: {g_cnt}")
print(f"  Hebrew entries: {h_cnt}")
