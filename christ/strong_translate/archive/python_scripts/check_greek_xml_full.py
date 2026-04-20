import xml.etree.ElementTree as ET

tree = ET.parse("strongsgreek.xml")
root = tree.getroot()
entries = root.findall(".//entry", {})

print(f"Total Greek XML entries: {len(entries)}")

# G1
e1 = entries[0]
print("\nG1 - all child elements:")
for child in e1:
    tag = child.tag
    text = (child.text or "").strip()[:200]
    print(f"  <{tag}> {text}")

# G2030
for e in entries:
    if e.get("strongs") == "2030":
        print("\nG2030 - all child elements:")
        for child in e:
            tag = child.tag
            text = (child.text or "").strip()[:300]
            print(f"  <{tag}> {text}")
        break
