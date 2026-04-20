import re

with open("strongs_english_source.js", "r", encoding="utf-8") as f:
    content = f.read()

# Extract G numbers from English source
matches = re.findall(r'"G(\d+)"', content)
g_nums = [int(m) for m in matches]
print(f"English Greek entries: {len(g_nums)}")
print(f"Range: G{min(g_nums)} - G{max(g_nums)}")

# Check Hebrew
with open("strongs_english_hebrew_source.js", "r", encoding="utf-8") as f:
    content = f.read()

matches = re.findall(r'"H(\d+)"', content)
h_nums = [int(m) for m in matches]
print(f"\nEnglish Hebrew entries: {len(h_nums)}")
print(f"Range: H{min(h_nums)} - H{max(h_nums)}")
