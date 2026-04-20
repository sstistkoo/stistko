import json
import re
from collections import Counter

with open("stepbible_data/data/stepbible-tbesg.json", "r", encoding="utf-8") as f:
    sg = json.load(f)
with open("stepbible_data/data/stepbible-tbesh.json", "r", encoding="utf-8") as f:
    sh = json.load(f)

# Show Greek keys with non-digit suffixes
g_with_suffix = [k for k in sg.keys() if re.search(r"[a-zA-Z]$", k.replace("G", ""))]
print(f"Greek keys with letter suffix: {len(g_with_suffix)}")
print("Sample:", g_with_suffix[:10])

# Show Hebrew keys with suffix
h_with_suffix = [k for k in sh.keys() if re.search(r"[a-zA-Z]$", k.replace("H", ""))]
print(f"\nHebrew keys with letter suffix: {len(h_with_suffix)}")
print("Sample:", h_with_suffix[:20])

# For suffix keys, what's the pattern?
print("\nGreek suffix breakdown:")
from collections import Counter

suffixes = Counter()
for k in g_with_suffix:
    m = re.match(r"^G\d+([a-zA-Z])$", k)
    if m:
        suffixes[m.group(1)] += 1
print(suffixes.most_common(10))

print("\nHebrew suffix breakdown:")
suffixes_h = Counter()
for k in h_with_suffix:
    m = re.match(r"^H\d+([a-zA-Z])$", k)
    if m:
        suffixes_h[m.group(1)] += 1
print(suffixes_h.most_common(10))
