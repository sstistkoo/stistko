import json
import time
import random
import sys
from pathlib import Path

if sys.platform == "win32":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

INPUT_GREEK = "strongsgreek.json"
OUTPUT_FILE = "strong_bible_cz.json"
MAX_TIME = 600
SAVE_INTERVAL = 50

try:
    from deep_translator import GoogleTranslator

    translator = GoogleTranslator(source="en", target="cs")
except ImportError:
    print("Instalace deep_translator...")
    import subprocess

    subprocess.run(["pip", "install", "deep-translator"], capture_output=True)
    from deep_translator import GoogleTranslator

    translator = GoogleTranslator(source="en", target="cs")


def normalize_greek_id(key):
    num = int(key.lstrip("0") or 0)
    return f"G{num}"


def load_greek():
    with open(INPUT_GREEK, "r", encoding="utf-8") as f:
        data = json.load(f)
    entries = {}
    for key, val in data.get("entries", {}).items():
        normalized = normalize_greek_id(key)
        definition = val.get("definition", "") or ""
        greek_val = val.get("greek") or {}
        entries[normalized] = {
            "definition": definition,
            "greek": greek_val,
            "translit": greek_val.get("translit", "") if greek_val else "",
            "pronunciation": val.get("pronunciation", "") or "",
        }
    return entries


def load_output():
    p = Path(OUTPUT_FILE)
    if p.exists():
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"entries": {}}


def save_output(data):
    tmp = OUTPUT_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    Path(tmp).replace(Path(OUTPUT_FILE))


def translate(text):
    if not text or not text.strip():
        return None
    try:
        result = translator.translate(text[:500])
        return result
    except Exception as e:
        print(f"Chyba překladu: {e}")
        return None


def main():
    print("Načítám řecká data...")
    greek_data = load_greek()
    print(f"Řeckých slov: {len(greek_data)}")

    print("Načítám výstupní soubor...")
    output_data = load_output()
    existing = set(output_data["entries"].keys())

    to_translate = [k for k in greek_data.keys() if k not in existing]
    print(f"Celkem k překladu: {len(to_translate)}")

    start_time = time.time()
    translated = 0
    errors = 0

    for i, key in enumerate(to_translate):
        elapsed = time.time() - start_time
        if elapsed > MAX_TIME:
            print(f"\nČasový limit {MAX_TIME}s reached. Ukládám...")
            break

        if key in existing:
            continue

        entry = greek_data[key]
        definition_en = entry.get("definition", "")

        if definition_en:
            cz = translate(definition_en)
            if cz:
                output_data["entries"][key] = {
                    "definitions_cz": cz,
                    "translit": entry.get("translit", ""),
                    "pronunciation": entry.get("pronunciation", ""),
                    "translated": True,
                }
                translated += 1
            else:
                errors += 1
        else:
            output_data["entries"][key] = {"definitions_cz": "", "translated": False}

        if (i + 1) % SAVE_INTERVAL == 0:
            save_output(output_data)
            print(f"Uloženo {i + 1}/{len(to_translate)}, přeloženo: {translated}")

        time.sleep(random.uniform(1, 3))

    save_output(output_data)
    print(
        f"\nHotovo! Přeloženo: {translated}, Chyb: {errors}, Celkem v souboru: {len(output_data['entries'])}"
    )


if __name__ == "__main__":
    main()
