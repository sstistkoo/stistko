#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smazání duplicitního prompt bloku v AIPanel.js
"""

def remove_duplicate_prompt_block():
    file_path = r"c:\Users\stistko\CascadeProjects\test_base\programovani\src\modules\ai\AIPanel.js"

    # Přečti soubor s UTF-8
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Najdi začátek bloku který chceme smazat (řádek s "// Add attached files first")
    start_delete = None
    end_delete = None

    for i, line in enumerate(lines):
        # Hledáme řádek po "activeFileId ="
        if "activeFileId = state.get('files.active');" in line:
            start_delete = i + 1  # Řádek po tomto

        # Hledáme konec - řádek před "// Get provider and model from UI"
        if start_delete and "// Get provider and model from UI" in line:
            end_delete = i
            break

    if start_delete and end_delete:
        # Smaž řádky mezi start_delete a end_delete
        del lines[start_delete:end_delete]
        print(f"✅ Smazáno {end_delete - start_delete} řádků (prompt blok)")
    else:
        print("❌ Nenašel jsem blok ke smazání")
        return

    # Zapiš zpět s UTF-8
    with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
        f.writelines(lines)

    print(f"📝 Nový počet řádků: {len(lines)}")

if __name__ == "__main__":
    remove_duplicate_prompt_block()
