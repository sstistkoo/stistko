import json
import xml.etree.ElementTree as ET
import re
from collections import defaultdict


def clean_html(text):
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


def load_english_strongs():
    """Load English Strong's dictionary from GitHub JS file"""
    try:
        with open("strongs_english_source.js", "r", encoding="utf-8") as f:
            content = f.read()
        match = re.search(r"var strongsGreekDictionary = (\{.*\});", content, re.DOTALL)
        if not match:
            return {}
        return json.loads(match.group(1))
    except FileNotFoundError:
        return {}


def load_english_hebrew_strongs():
    """Load English Hebrew Strong's dictionary from GitHub JS file"""
    try:
        with open("strongs_english_hebrew_source.js", "r", encoding="utf-8") as f:
            content = f.read()
        match = re.search(
            r"var strongsHebrewDictionary = (\{.*\});", content, re.DOTALL
        )
        if not match:
            return {}
        return json.loads(match.group(1))
    except FileNotFoundError:
        return {}


def sort_strongs_keys(keys, prefix):
    def key_func(k):
        num_str = k.replace(prefix, "")
        m = re.match(r"^(\d+)([a-zA-Z]*)$", num_str)
        if m:
            return (int(m.group(1)), m.group(2) or "")
        return (0, "")

    return sorted(keys, key=key_func)


def load_extended_hebrew():
    """Load extended Hebrew definitions from zbytek.txt"""
    extended = {}
    try:
        with open("zbytek.txt", "r", encoding="utf-8") as f:
            current_num = None
            for line in f:
                line = line.rstrip("\n")
                if not line:
                    continue
                if line.startswith("H") and " | " in line:
                    parts = line.split(" | ", 1)
                    current_num = parts[0].replace("H", "")
                    extended[current_num] = {
                        "lemma": parts[1] if len(parts) > 1 else ""
                    }
                elif line.startswith("Prepis:") and current_num:
                    extended[current_num]["transliteration"] = line.replace(
                        "Prepis: ", ""
                    )
                elif line.startswith("Tvaroslovi:") and current_num:
                    extended[current_num]["morphology"] = line.replace(
                        "Tvaroslovi: ", ""
                    )
                elif line.startswith("En:") and current_num:
                    extended[current_num]["kjv_def"] = line.replace("En: ", "")
                elif line.startswith("En Definition:") and current_num:
                    extended[current_num]["strongs_def"] = line.replace(
                        "En Definition: ", ""
                    )
                elif line.startswith("Cz:") and current_num:
                    extended[current_num]["definitions_cz"] = line.replace("Cz: ", "")
    except FileNotFoundError:
        pass
    return extended


def load_extended_greek():
    """Load extended Greek definitions from TBESG (STEPBible)"""
    extended = {}
    try:
        with open("tbesg_extended.txt", "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split("|")
                if len(parts) >= 4:
                    num = parts[0].replace("G", "")
                    extended[num] = {
                        "greek": parts[1],
                        "transliteration": parts[2],
                        "kjv_def": parts[3],
                    }
    except FileNotFoundError:
        pass
    return extended


# Načtení dat (předpokládá existenci souborů)
with open("stepbible_data/data/stepbible-tbesg.json", "r", encoding="utf-8") as f:
    step_greek = json.load(f)
with open("stepbible_data/data/stepbible-tbesh.json", "r", encoding="utf-8") as f:
    step_heb_raw = json.load(f)
with open("strongsgreek.json", "r", encoding="utf-8") as f:
    our_greek = json.load(f)
with open("stronghebrew.json", "r", encoding="utf-8") as f:
    our_heb = json.load(f)
with open("strong_bible_cz.json", "r", encoding="utf-8") as f:
    cz_data = json.load(f)

english_strongs = load_english_strongs()
english_hebrew_strongs = load_english_hebrew_strongs()
extended_hebrew = load_extended_hebrew()
extended_greek = load_extended_greek()

# XML Parsing - Greek
tree_g = ET.parse("strongsgreek.xml")
root_g = tree_g.getroot()
beta_codes = {}
for entry_xml in root_g.findall(".//entry", {}):
    strongs_attr = entry_xml.get("strongs", "")
    if strongs_attr:
        key = str(int(strongs_attr)).zfill(4)
        greek_elem = entry_xml.find("greek")
        if greek_elem is not None:
            beta_val = greek_elem.get("BETA", "")
            if beta_val:
                beta_codes[key] = beta_val

# XML Parsing - Hebrew
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
    note_elems = entry_xml.findall(".//osis:note", ns)
    xml_notes = {}
    for note in note_elems:
        ntype = note.get("type", "")
        if ntype in ("exegesis", "translation", "explanation", "x-typo", "x-corr"):
            parts = [note.text] if note.text else []
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

# Hebrew Merging
heb_by_base = defaultdict(list)
for full_key, entry in step_heb_raw.items():
    m = re.match(r"^H0*(\d+)([a-zA-Z]*)$", full_key)
    if not m:
        continue
    heb_by_base[m.group(1)].append((full_key, entry, m.group(2)))

output_lines = []

# --- GREEK PROCESSING ---
for step_key in sort_strongs_keys(step_greek.keys(), "G"):
    entry = step_greek[step_key]
    num = step_key.replace("G", "").lstrip("0") or "0"

    lemma_full = entry.get("lemma", "")
    greek_word = (
        lemma_full.split(",")[0].strip() if "," in lemma_full else lemma_full.strip()
    )
    output_lines.append(f"G{num} | {greek_word}")

    beta = beta_codes.get(num.zfill(4), "")
    if beta:
        output_lines.append(f"BETA: {beta}")

    translit = entry.get("transliteration", "")
    if translit:
        output_lines.append(f"Prepis: {translit}")

    morph = entry.get("morphology", "")
    if morph:
        output_lines.append(f"Tvaroslovi: {morph}")

    definition_clean = clean_html(entry.get("definition", ""))
    if definition_clean:
        lines = definition_clean.split("\n")
        if lines[0].strip():
            output_lines.append(f"Definice: {lines[0].strip()}")
        for line in lines[1:]:
            if line.strip():
                output_lines.append(f"Význam: {line.strip()}")

    # See Also
    our_entry = our_greek["entries"].get(num.zfill(4), {}) or our_greek["entries"].get(
        num, {}
    )
    see_array = our_entry.get("see") or []
    if see_array:
        refs = [
            f"{'G' if r.get('language') == 'GREEK' else 'H'}{str(int(r.get('strongs')))}"
            for r in see_array
            if r.get("strongs")
        ]
        if refs:
            output_lines.append(f"Viz také: {', '.join(refs)}")

    # English (Nyní jako En)
    eng_entry = english_strongs.get(f"G{num.zfill(4)}", {}) or english_strongs.get(
        f"G{num}", {}
    )
    if eng_entry:
        if eng_entry.get("kjv_def"):
            output_lines.append(f"En: {eng_entry.get('kjv_def')}")
        if eng_entry.get("strongs_def"):
            output_lines.append(
                f"En Definition: {eng_entry.get('strongs_def').strip()}"
            )
    else:
        # Extended Greek (TBESG) - fallback for G6000+
        ext_greek = extended_greek.get(num.zfill(4)) or extended_greek.get(num)
        if ext_greek:
            if ext_greek.get("kjv_def"):
                output_lines.append(f"En: {ext_greek.get('kjv_def')}")

    # KJV Gloss
    gloss = entry.get("gloss", "")
    if gloss and gloss.lower() != greek_word.lower():
        output_lines.append(f"KJV Významy: {gloss}")

    # Czech (Nyní Cz a na konci)
    cz_entry = cz_data.get("entries", {}).get(f"G{num}", {})
    cz_text = cz_entry.get("definitions_cz", "")
    if cz_text:
        output_lines.append(f"Cz: {' '.join(cz_text.split())}")

    output_lines.append("")

# --- HEBREW PROCESSING ---
for base_num in sorted(heb_by_base.keys(), key=int):
    variants = heb_by_base[base_num]
    main_entry = next((e for k, e, s in variants if s == ""), variants[0][1])
    hebrew_id = f"H{base_num}"

    lemma = main_entry.get("lemma", "")
    lemma = lemma.lstrip("/").strip()
    output_lines.append(f"{hebrew_id} | {lemma}")
    if main_entry.get("transliteration"):
        output_lines.append(f"Prepis: {main_entry.get('transliteration')}")
    if main_entry.get("morphology"):
        output_lines.append(f"Tvaroslovi: {main_entry.get('morphology')}")

    # Definitions
    all_defs = [
        clean_html(v[1].get("definition", ""))
        for v in variants
        if clean_html(v[1].get("definition", ""))
    ]
    if all_defs:
        lines = "\n\n".join(all_defs).split("\n")
        if lines[0].strip():
            output_lines.append(f"Definice: {lines[0].strip()}")
        remaining = [l.strip() for l in lines[1:] if l.strip()]
        if remaining:
            output_lines.append(f"Význam:\n  {'\n  '.join(remaining)}")

    extra = xml_extra.get(hebrew_id, {})
    if extra.get("gloss"):
        output_lines.append(f"TWOT: {extra.get('gloss')}")

    # Notes
    notes = {
        **our_heb["entries"].get(base_num, {}).get("notes", {}),
        **extra.get("notes", {}),
    }
    parts = []
    if "translation" in notes:
        parts.append(f"Překlad: {' '.join(str(notes['translation']).split())}")
    if "exegesis" in notes:
        parts.append(f"Etymol: {' '.join(str(notes['exegesis']).split())}")
    if "explanation" in notes:
        parts.append(f"Vysvětlení: {' '.join(str(notes['explanation']).split())}")
    if parts:
        output_lines.append(f"Poznámky:\n  {'\n  '.join(parts)}")

    greek_refs = our_heb["entries"].get(base_num, {}).get("greek_refs") or []
    if greek_refs:
        output_lines.append(
            f"Řecké refs: {', '.join([r.replace(':', '').strip() for r in greek_refs if r])}"
        )

    # English (Nyní jako En)
    eng_entry = english_hebrew_strongs.get(
        f"H{base_num.zfill(4)}", {}
    ) or english_hebrew_strongs.get(f"H{base_num}", {})
    if eng_entry:
        if eng_entry.get("kjv_def"):
            output_lines.append(f"En: {eng_entry.get('kjv_def')}")
        if eng_entry.get("strongs_def"):
            output_lines.append(
                f"En Definition: {eng_entry.get('strongs_def').strip()}"
            )

    # Extended Hebrew Data (zbytek.txt) - for H9001+
    ext_entry = extended_hebrew.get(base_num, {})
    if ext_entry:
        if ext_entry.get("kjv_def"):
            output_lines.append(f"En: {ext_entry.get('kjv_def')}")
        if ext_entry.get("strongs_def"):
            output_lines.append(f"En Definition: {ext_entry.get('strongs_def')}")
        if ext_entry.get("definitions_cz"):
            output_lines.append(f"Cz: {ext_entry.get('definitions_cz')}")
        output_lines.append("")
        continue  # Skip Czech section below since we already have it

    # KJV Gloss
    if main_entry.get("gloss") and main_entry.get("gloss") != main_entry.get("lemma"):
        output_lines.append(f"KJV Významy: {main_entry.get('gloss')}")

    # Czech (Nyní Cz a na konci)
    cz_entry = cz_data.get("entries", {}).get(hebrew_id, {})
    cz_text = cz_entry.get("definitions_cz", "")
    if cz_text:
        output_lines.append(f"Cz: {' '.join(cz_text.split())}")

    output_lines.append("")

# Write Output
with open("strong_updated_detailed_cs.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output_lines))
