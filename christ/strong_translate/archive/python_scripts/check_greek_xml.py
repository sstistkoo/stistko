import xml.etree.ElementTree as ET

tree = ET.parse("strongsgreek.xml")
root = tree.getroot()
entries = root.findall(".//entry", {})

print(f"Total Greek XML entries: {len(entries)}")
print()

# Check for fields
has_latin = 0
has_strongs_def = 0
has_strongs_derivation = 0
has_strongsref = 0
has_see = 0

for entry in entries[:500]:  # sample first 500
    children = {child.tag: child for child in entry}
    if "latin" in children:
        has_latin += 1
    if "strongs_def" in children:
        has_strongs_def += 1
    if "strongs_derivation" in children:
        has_strongs_derivation += 1
    if "strongsref" in children:
        has_strongsref += 1
    if "see" in children:
        has_see += 1

print(f"Sample of 500 Greek XML entries:")
print(f"  Has <latin>: {has_latin}")
print(f"  Has <strongs_def>: {has_strongs_def}")
print(f"  Has <strongs_derivation>: {has_strongs_derivation}")
print(f"  Has <strongsref>: {has_strongsref}")
print(f"  Has <see>: {has_see}")

# Print sample entry with <latin> if any
for entry in entries:
    if "latin" in {c.tag: c for c in entry}:
        latin_elem = entry.find("latin")
        print(f"\nSample entry with <latin>:")
        print(f"  strongs: {entry.get('strongs')}")
        print(f"  latin text: {latin_elem.text if latin_elem is not None else ''}")
        break

# Print sample entry with <strongs_def> that might differ from JSON definition
for entry in entries[:100]:
    children_tags = [c.tag for c in entry]
    if "strongs_def" in children_tags and "definition" in children_tags:
        strongs_def_text = entry.find("strongs_def").text or ""
        def_text = (
            entry.find("definition").text or "" if "definition" in children_tags else ""
        )
        if strongs_def_text.strip() != def_text.strip():
            print(f"\nEntry with different <strongs_def> vs <definition>:")
            print(f"  strongs: {entry.get('strongs')}")
            print(f"  definition: {def_text[:100]}")
            print(f"  strongs_def: {strongs_def_text[:100]}")
            break
