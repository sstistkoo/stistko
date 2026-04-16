import xml.etree.ElementTree as ET
import json

tree = ET.parse("strongsgreek.xml")
root = tree.getroot()

entries_node = root.find("entries")
entries = {}

for entry in entries_node.findall("entry"):
    strongs_num = entry.get("strongs")

    strongs_elem = entry.find("strongs")
    strongs = strongs_elem.text if strongs_elem is not None else strongs_num

    greek_elem = entry.find("greek")
    greek = None
    if greek_elem is not None:
        greek = {
            "unicode": greek_elem.get("unicode"),
            "translit": greek_elem.get("translit"),
        }

    pron_elem = entry.find("pronunciation")
    pronunciation = pron_elem.get("strongs") if pron_elem is not None else None

    deriv_elem = entry.find("strongs_derivation")
    derivation = (
        deriv_elem.text.strip() if deriv_elem is not None and deriv_elem.text else None
    )

    def_elem = entry.find("strongs_def")
    definition = ""
    if def_elem is not None:
        for child in def_elem:
            if child.tag == "greek":
                definition += child.get("unicode") or ""
            elif child.tag == "latin":
                definition += child.text or ""
            elif child.tag == "strongsref":
                definition += f"[{child.get('language')}:{child.get('strongs')}]"
            elif child.tag == "pronunciation":
                definition += f"({child.get('strongs')})"
            elif child.text:
                definition += child.text
        if def_elem.text:
            definition = def_elem.text + definition

    kjv_elem = entry.find("kjv_def")
    kjv_def = ""
    if kjv_elem is not None:
        for child in kjv_elem:
            if child.tag == "strongsref":
                kjv_def += f"[{child.get('language')}:{child.get('strongs')}]"
            elif child.text:
                kjv_def += child.text
        if kjv_elem.text:
            kjv_def = kjv_elem.text + kjv_def

    see_elems = entry.findall("see")
    see_refs = []
    for see_elem in see_elems:
        see_refs.append(
            {"language": see_elem.get("language"), "strongs": see_elem.get("strongs")}
        )

    entries[strongs_num] = {
        "strongs": strongs,
        "greek": greek,
        "pronunciation": pronunciation,
        "derivation": derivation,
        "definition": definition.strip(),
        "kjv_def": kjv_def.strip() if kjv_def else None,
        "see": see_refs if see_refs else None,
    }

output = {"entries": entries}

with open("strongsgreek.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"Converted {len(entries)} entries to strongsgreek.json")
