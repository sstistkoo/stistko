import json
import os

with open("bible/CzeCSP.json", "r", encoding="utf-8") as f:
    data = json.load(f)

books = data["books"]
print(f"Number of books: {len(books)}")

output_dir = "bible"
os.makedirs(output_dir, exist_ok=True)

for i, book in enumerate(books):
    index = f"{i + 1:02d}"
    filename = f"{index}_{book['name']}.json"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(book, f, ensure_ascii=False, indent=2)

    print(f"Created: {filename}")

print("Done!")
