import xml.etree.ElementTree as ET
import json

# Redirect output to file
import sys

sys.stdout = open("xml_analysis.txt", "w", encoding="utf-8")

# Parse Greek XML
tree_g = ET.parse("strongsgreek.xml")
root_g = tree_g.getroot()

# Find all entries
entries_g = root_g.findall(".//entry", {})
print(f"Total Greek XML entries: {len(entries_g)}")

if entries_g:
    e = entries_g[0]
    print(f"\nFirst Greek entry (strongs={e.get('strongs')}):")
    print("Children:")
    for child in e:
        attrib = dict(child.attrib)
        text = (child.text or "").strip()[:80]
        print(f'  <{child.tag}> attrs={attrib} text="{text}"')

# Parse Hebrew XML
tree_h = ET.parse("StrongHebrewG.xml")
root_h = tree_h.getroot()

# Find first Hebrew entry
ns = {"osis": "http://www.bibletechnologies.net/2003/OSIS/namespace"}
entries_h = root_h.findall('.//osis:div[@type="entry"]', ns)
print(f"\nTotal Hebrew XML entries: {len(entries_h)}")

if entries_h:
    e = entries_h[0]
    print(f"\nFirst Hebrew entry:")
    print("Children:")
    for child in e:
        attrib = dict(child.attrib)
        tag = child.tag.split("}")[-1]  # remove namespace
        text = (child.text or "").strip()[:80]
        print(f'  <{tag}> attrs={attrib} text="{text}"')
        # Check for sub-elements
        for sub in child:
            stag = sub.tag.split("}")[-1]
            sattrib = dict(sub.attrib)
            stext = (sub.text or "").strip()[:80]
            print(f'    <{stag}> attrs={sattrib} text="{stext}"')
