import xml.etree.ElementTree as ET

tree = ET.parse("strongsgreek.xml")
root = tree.getroot()
entries = root.findall(".//entry", {})

beta_count = 0
for entry in entries:
    greek = entry.find("greek")
    if greek is not None and "BETA" in greek.attrib:
        beta_count += 1

print(f"Entries with BETA attribute: {beta_count} / {len(entries)}")
# Show a sample
for entry in entries[:10]:
    greek = entry.find("greek")
    if greek is not None and "BETA" in greek.attrib:
        print(
            f"G{entry.get('strongs')}: BETA={greek.attrib['BETA']}, unicode={greek.attrib.get('unicode')}, translit={greek.attrib.get('translit')}"
        )
        break
