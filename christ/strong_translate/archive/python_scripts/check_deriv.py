import xml.etree.ElementTree as ET

tree = ET.parse("strongsgreek.xml")
root = tree.getroot()
entries = root.findall(".//entry", {})

print("Sample derivations:")
for e in entries[:5]:
    s = e.get("strongs", "")
    deriv = e.find("strongs_derivation")
    sdef = e.find("strongs_def")
    kjv = e.find("kjv_def")
    print(f"G{s}:")
    print(
        f"  derivation: {(deriv.text or '').strip()[:100] if deriv is not None else 'None'}"
    )
    print(
        f"  strongs_def: {(sdef.text or '').strip()[:100] if sdef is not None else 'None'}"
    )
    print(f"  kjv_def: {(kjv.text or '').strip()[:80] if kjv is not None else 'None'}")
    print()
