import json
import time
import random
import sys
import subprocess
from pathlib import Path

if sys.platform == "win32":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

INPUT_HEBREW = "stronghebrew.json"
OUTPUT_FILE = "strong_bible_cz.json"
MAX_TIME = 600
SAVE_INTERVAL = 50
PUSH_INTERVAL = 100

try:
    from deep_translator import GoogleTranslator

    translator = GoogleTranslator(source="en", target="cs")
except ImportError:
    print("Instalace deep_translator...")
    import subprocess

    subprocess.run(["pip", "install", "deep-translator"], capture_output=True)
    from deep_translator import GoogleTranslator

    translator = GoogleTranslator(source="en", target="cs")


def normalize_hebrew_id(key):
    if isinstance(key, str) and key.isdigit():
        num = int(key)
        return f"H{num}"
    return key


def load_hebrew():
    with open(INPUT_HEBREW, "r", encoding="utf-8") as f:
        data = json.load(f)
    entries = {}
    for key, val in data.get("entries", {}).items():
        normalized = normalize_hebrew_id(key)
        definitions = val.get("definitions", [])
        if definitions:
            definition_text = " | ".join(definitions)
        else:
            definition_text = ""
        entries[normalized] = {
            "definition": definition_text,
            "lemma": val.get("lemma", ""),
            "hebrew": val.get("hebrew", ""),
            "xlit": val.get("xlit", ""),
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


def git_commit_push(start_num, end_num):
    try:
        subprocess.run(["git", "add", OUTPUT_FILE], capture_output=True, check=True)
        subprocess.run(
            ["git", "commit", "-m", f"Translate Hebrew entries {start_num}-{end_num}"],
            capture_output=True,
            check=True,
        )
        subprocess.run(["git", "push"], capture_output=True, check=True)
        print(f"Git push uspesny: {start_num}-{end_num}")
    except Exception as e:
        print(f"Git chyba: {e}")


def translate(text):
    if not text or not text.strip():
        return None
    try:
        result = translator.translate(text[:500])
        return result
    except Exception as e:
        err_str = str(e)
        if "429" in err_str or "rate" in err_str.lower():
            print("Rate limit 429! Ukladam a koncim...")
            return None
        print(f"Chyba prekladu: {e}")
        return None


def main():
    print("Nacti hebrejska data...")
    hebrew_data = load_hebrew()
    print(f"Hebrejskych slov: {len(hebrew_data)}")

    print("Nacti vystupni soubor...")
    output_data = load_output()
    existing = set(output_data["entries"].keys())

    to_translate = [k for k in hebrew_data.keys() if k not in existing]
    print(f"Celkem k prekladu: {len(to_translate)}")

    start_time = time.time()
    translated = 0
    errors = 0
    first_translated = None

    for i, key in enumerate(to_translate):
        elapsed = time.time() - start_time
        if elapsed > MAX_TIME:
            print(f"\nCasovy limit {MAX_TIME}s reached. Ukladam...")
            break

        if key in existing:
            continue

        entry = hebrew_data[key]
        definition_en = entry.get("definition", "")

        if definition_en:
            cz = translate(definition_en)
            if cz is None:
                save_output(output_data)
                if first_translated:
                    git_commit_push(first_translated, translated)
                print("Koncim kvuli rate limitu nebo chybe.")
                return
            if cz:
                output_data["entries"][key] = {
                    "definitions_cz": cz,
                    "lemma": entry.get("lemma", ""),
                    "hebrew": entry.get("hebrew", ""),
                    "xlit": entry.get("xlit", ""),
                    "translated": True,
                }
                if first_translated is None:
                    first_translated = (
                        int(key[1:]) if key.startswith("H") else translated + 1
                    )
                translated += 1
            else:
                errors += 1
        else:
            output_data["entries"][key] = {"definitions_cz": "", "translated": False}

        if (i + 1) % SAVE_INTERVAL == 0:
            save_output(output_data)
            print(f"Ulozeno {i + 1}/{len(to_translate)}, prelozeno: {translated}")

        if translated > 0 and translated % PUSH_INTERVAL == 0:
            save_output(output_data)
            start_num = first_translated
            end_num = (
                int(key[1:]) if key.startswith("H") else start_num + translated - 1
            )
            git_commit_push(start_num, end_num)
            first_translated = None

        time.sleep(random.uniform(1, 3))

    save_output(output_data)
    if translated > 0 and first_translated is not None:
        end_num = (
            int(to_translate[min(len(to_translate) - 1, i)][1:])
            if to_translate
            else first_translated + translated - 1
        )
        git_commit_push(first_translated, end_num)

    print(
        f"\nHotovo! Prelozeno: {translated}, Chyb: {errors}, Celkem v souboru: {len(output_data['entries'])}"
    )


if __name__ == "__main__":
    main()
