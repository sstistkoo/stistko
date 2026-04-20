import json
import xml.etree.ElementTree as ET


def remove_diacritics(text):
    """Remove Czech diacritics ( háčky/čárky) and keep ASCII only."""
    mapping = {
        "á": "a",
        "č": "c",
        "ď": "d",
        "é": "e",
        "ě": "e",
        "í": "i",
        "ň": "n",
        "ó": "o",
        "ř": "r",
        "š": "s",
        "ť": "t",
        "ú": "u",
        "ů": "u",
        "ý": "y",
        "ž": "z",
        "Á": "A",
        "Č": "C",
        "Ď": "D",
        "É": "E",
        "Ě": "E",
        "Í": "I",
        "Ň": "N",
        "Ó": "O",
        "Ř": "R",
        "Š": "S",
        "Ť": "T",
        "Ú": "U",
        "Ů": "U",
        "Ý": "Y",
        "Ž": "Z",
    }
    for orig, repl in mapping.items():
        text = text.replace(orig, repl)
    # Also remove any remaining non-ASCII
    text = text.encode("ascii", "ignore").decode("ascii")
    return text


# Load data
with open("strongsgreek.json", "r", encoding="utf-8") as f:
    greek_data = json.load(f)
with open("stronghebrew.json", "r", encoding="utf-8") as f:
    hebrew_data = json.load(f)
with open("strong_bible_cz.json", "r", encoding="utf-8") as f:
    cz_data = json.load(f)

# Parse Greek XML for richer derivation
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
    # Get strongs_derivation text (richer than JSON derivation)
    deriv_elem = entry_xml.find("strongs_derivation")
    if deriv_elem is not None and deriv_elem.text:
        xml_derivations[key] = deriv_elem.text.strip()

print(f"Loaded {len(beta_codes)} BETA codes, {len(xml_derivations)} XML derivations")

output_lines = []

# ============================================================
# GREEK ENTRIES
# ============================================================
for entry_key in sorted(greek_data["entries"].keys(), key=lambda x: int(x)):
    entry = greek_data["entries"][entry_key]
    strong_num = entry.get("strongs", "")

    greek_obj = entry.get("greek") or {}
    greek_word = greek_obj.get("unicode", "")

    # Header: G{num} | {greek_word}
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
        output_lines.append(f"Definition: {definition}")

    # KJV Meaning (English)
    kjv_def = (entry.get("kjv_def") or "").strip()
    if kjv_def:
        kjv_def = " ".join(kjv_def.split())
        output_lines.append(f"KJV Meaning: {kjv_def}")

    # Origin – prefer XML if richer
    derivation_json = (entry.get("derivation") or "").strip()
    derivation_xml = xml_derivations.get(strong_num, "")
    # Use XML if present and non-empty
    derivation = derivation_xml if derivation_xml else derivation_json
    derivation = " ".join(derivation.split())
    if derivation:
        output_lines.append(f"Origin: {derivation}")

    # Czech translation – all on ONE line (no internal newlines)
    cz_entry = cz_data.get("entries", {}).get(f"G{strong_num}", {})
    cz_text = cz_entry.get("definitions_cz", "")
    if cz_text:
        cz_ascii = remove_diacritics(cz_text)
        # Ensure single line — replace internal newlines/spaces
        cz_ascii = " ".join(cz_ascii.split())
        output_lines.append(f"Czech: {cz_ascii}")

    output_lines.append("")

# ============================================================
# HEBREW ENTRIES
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

    # Transliteration
    xlit = entry.get("xlit", "")
    if xlit:
        output_lines.append(f"Transliteration: {xlit}")

    # Morphology + POS on one line (already combined)
    morph = entry.get("morph", "")
    pos = entry.get("POS", "")
    if morph and pos:
        output_lines.append(f"Morphology: {morph}  POS: {pos}")
    elif morph:
        output_lines.append(f"Morphology: {morph}")

    # Definitions (numbered, from JSON)
    definitions = entry.get("definitions") or []
    if definitions:
        cleaned = [" ".join((d or "").split()) for d in definitions if d and d.strip()]
        if cleaned:
            defs_text = "\n  ".join(cleaned)
            output_lines.append(f"Definitions:\n  {defs_text}")

    # Czech translation – all on ONE line
    cz_entry = cz_data.get("entries", {}).get(hebrew_id, {})
    cz_text = cz_entry.get("definitions_cz", "")
    if cz_text:
        cz_ascii = remove_diacritics(cz_text)
        cz_ascii = " ".join(cz_ascii.split())
        output_lines.append(f"Czech: {cz_ascii}")

    output_lines.append("")

# Write
with open("strong_czech_detailed_ascii.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output_lines))

print(f"Generated strong_czech_detailed_ascii.txt")
print(f"  Total lines: {len(output_lines)}")
import re

g_cnt = sum(1 for l in output_lines if re.match(r"^G\d+", l))
h_cnt = sum(1 for l in output_lines if re.match(r"^H\d+", l))
print(f"  Greek entries: {g_cnt}")
print(f"  Hebrew entries: {h_cnt}")
print(
    f"  Czech translations present: G={sum(1 for l in output_lines if l.startswith('Czech:'))}"
)
