import json
import sys
import time
import random
from pathlib import Path

if sys.platform == "win32":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

INPUT_GREEK = "strongsgreek.json"
OUTPUT_FILE = "strong_bible_cz.json"
MAX_TIME = 600
SAVE_INTERVAL = 20  # Save more frequently since smaller batch

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
        definition = (val.get("definition") or "") or ""
        derivation = (val.get("derivation") or "") or ""
        kjv_def = (val.get("kjv_def") or "") or ""
        greek_val = val.get("greek") or {}
        entries[normalized] = {
            "definition": definition,
            "derivation": derivation,
            "kjv_def": kjv_def,
            "greek": greek_val,
            "translit": greek_val.get("translit", "")
            if isinstance(greek_val, dict)
            else "",
            "pronunciation": (val.get("pronunciation") or "") or "",
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


def build_source_text(entry):
    """Build text to translate, using fallback fields if definition is empty."""
    definition = entry.get("definition", "").strip()
    if definition:
        return definition
    # Fallback: combine derivation and kjv_def
    derivation = entry.get("derivation", "").strip()
    kjv = entry.get("kjv_def", "").strip()
    parts = []
    if derivation:
        parts.append(derivation)
    if kjv:
        parts.append(kjv)
    text = " | ".join(parts)
    return text if text else None


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

    # Find Greek entries that need fixing: either missing translated flag or empty definition
    to_fix = []
    for key in greek_data.keys():
        if key not in existing:
            continue  # shouldn't happen but skip
        entry_out = output_data["entries"].get(key, {})
        # Need fix if not translated or definition is empty/whitespace
        if (
            entry_out.get("translated") != True
            or not entry_out.get("definitions_cz", "").strip()
        ):
            to_fix.append(key)

    print(f"K opravení: {len(to_fix)} Greek entries")
    if to_fix:
        print("Prvních 10:", to_fix[:10])

    start_time = time.time()
    fixed = 0
    errors = 0

    for i, key in enumerate(to_fix):
        elapsed = time.time() - start_time
        if elapsed > MAX_TIME:
            print(f"\nČasový limit {MAX_TIME}s reached. Ukládám...")
            break

        if key not in greek_data:
            print(f"Warning: {key} not in Greek source")
            continue

        g_entry = greek_data[key]
        source_text = build_source_text(g_entry)

        if not source_text:
            # Still nothing to translate - mark as false with empty
            output_data["entries"][key] = {
                "definitions_cz": "",
                "translit": g_entry.get("translit", ""),
                "pronunciation": g_entry.get("pronunciation", ""),
                "translated": False,
            }
        else:
            cz = translate(source_text)
            if cz:
                output_data["entries"][key] = {
                    "definitions_cz": cz,
                    "translit": g_entry.get("translit", ""),
                    "pronunciation": g_entry.get("pronunciation", ""),
                    "translated": True,
                }
                fixed += 1
            else:
                errors += 1
                # Keep existing or set empty? Let's keep existing if any, else empty
                existing_entry = output_data["entries"].get(key, {})
                output_data["entries"][key] = {
                    "definitions_cz": existing_entry.get("definitions_cz", ""),
                    "translit": g_entry.get("translit", ""),
                    "pronunciation": g_entry.get("pronunciation", ""),
                    "translated": False,
                }

        if (i + 1) % SAVE_INTERVAL == 0:
            save_output(output_data)
            print(f"Uloženo {i + 1}/{len(to_fix)}, opraveno: {fixed}")

        time.sleep(random.uniform(1, 3))

    save_output(output_data)
    print(
        f"\nHotovo! Opraveno: {fixed}, Chyb: {errors}, Celkem v souboru: {len(output_data['entries'])}"
    )


if __name__ == "__main__":
    main()
