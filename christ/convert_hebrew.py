import xml.etree.ElementTree as ET
import json

tree = ET.parse("StrongHebrewG.xml")
root = tree.getroot()

ns = {"osis": "http://www.bibletechnologies.net/2003/OSIS/namespace"}

entries_div = root.find('.//osis:div[@type="glossary"]', ns)
if entries_div is None:
    entries_div = root.find('.//div[@type="glossary"]')

entries = {}

for entry_div in entries_div.findall('osis:div[@type="entry"]', ns):
    if entry_div is None:
        continue
    entry_div = entry_div

entry_divs = root.findall(
    './/{http://www.bibletechnologies.net/2003/OSIS/namespace}div[@type="entry"]'
)
if not entry_divs:
    entry_divs = root.findall('.//div[@type="entry"]')

for entry_div in entry_divs:
    entry_num = entry_div.get("n")

    w_elem = entry_div.find(
        ".//{http://www.bibletechnologies.net/2003/OSIS/namespace}w[@lemma]"
    )
    if w_elem is None:
        w_elem = entry_div.find(".//w[@lemma]")

    if w_elem is None:
        continue

    entry_data = {
        "lemma": w_elem.get("lemma"),
        "xlit": w_elem.get("xlit"),
        "morph": w_elem.get("morph"),
        "POS": w_elem.get("POS"),
        "ID": w_elem.get("ID"),
    }

    if w_elem.text:
        entry_data["hebrew"] = w_elem.text

    foreign_elems = entry_div.findall(
        ".//{http://www.bibletechnologies.net/2003/OSIS/namespace}foreign", ns
    )
    if not foreign_elems:
        foreign_elems = entry_div.findall(".//foreign")

    greek_refs = []
    for foreign in foreign_elems:
        for w in foreign.findall(
            ".//{http://www.bibletechnologies.net/2003/OSIS/namespace}w", ns
        ):
            gloss = w.get("gloss")
            if gloss:
                greek_refs.append(gloss)
        if not greek_refs:
            for w in foreign.findall(".//w"):
                gloss = w.get("gloss")
                if gloss:
                    greek_refs.append(gloss)

    if greek_refs:
        entry_data["greek_refs"] = greek_refs

    list_elem = entry_div.find(
        ".//{http://www.bibletechnologies.net/2003/OSIS/namespace}list", ns
    )
    if list_elem is None:
        list_elem = entry_div.find(".//list")

    definitions = []
    if list_elem is not None:
        for item in list_elem.findall(
            ".//{http://www.bibletechnologies.net/2003/OSIS/namespace}item", ns
        ):
            if item.text:
                definitions.append(item.text)
        if not definitions:
            for item in list_elem.findall(".//item"):
                if item.text:
                    definitions.append(item.text)

    if definitions:
        entry_data["definitions"] = definitions

    note_elems = entry_div.findall(
        ".//{http://www.bibletechnologies.net/2003/OSIS/namespace}note", ns
    )
    if not note_elems:
        note_elems = entry_div.findall(".//note")

    notes = {}
    for note in note_elems:
        note_type = note.get("type")
        if note_type and note.text:
            notes[note_type] = note.text

    if notes:
        entry_data["notes"] = notes

    entries[entry_num] = entry_data

output = {"entries": entries}

with open("stronghebrew.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"Converted {len(entries)} entries to stronghebrew.json")
