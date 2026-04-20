import json

f = json.load(open("stepbible_data/data/stepbible-tbesh.json", encoding="utf-8"))
out = open("extended_output.txt", "w", encoding="utf-8")
for n in range(9001, 9050):
    key = f"H{n}"
    e = f.get(key, {})
    lemma = e.get("lemma", "")
    defn = e.get("definition", "")[:100] if e.get("definition") else ""
    out.write(f"H{n}: {repr(lemma)} | {defn}\n")
out.close()
