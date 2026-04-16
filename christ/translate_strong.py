#!/usr/bin/env python3
"""
Autonomní překlad Strongova slovníku - idempotentní, bezpečný.
"""

import json
import time
import random
import os
import sys
from pathlib import Path
from datetime import datetime

# Fix Windows encoding
if sys.platform == "win32":
    import codecs

    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer, "strict")
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.buffer, "strict")

try:
    from deep_translator import GoogleTranslator
except ImportError:
    print("INSTALUJI deep_translator...")
    import subprocess

    subprocess.check_call([sys.executable, "-m", "pip", "install", "deep_translator"])
    from deep_translator import GoogleTranslator

# Konfigurace
SOURCE_DIR = Path(__file__).parent
HEBREW_SOURCE = SOURCE_DIR / "stronghebrew.json"
GREEK_SOURCE = SOURCE_DIR / "strongsgreek.json"
TARGET_FILE = SOURCE_DIR / "strong_bible_cz.json"

MAX_RUNTIME_SECONDS = 600  # 10 minut
BATCH_SIZE_BEFORE_COMMIT = 100
PAUSE_MIN = 1
PAUSE_MAX = 3

translator = GoogleTranslator(source="en", target="cs")


def load_json_safe(path: Path) -> dict:
    """Bezpečně načte JSON soubor."""
    if not path.exists():
        return {"entries": {}}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"CHYBA načítání {path}: {e}")
        return {"entries": {}}


def save_json_atomic(data: dict, path: Path):
    """Atomic write - zápis do .tmp a přejmenování."""
    tmp_path = path.with_suffix(".tmp")
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        tmp_path.replace(path)
    except Exception as e:
        print(f"CHYBA zápisu: {e}")
        if tmp_path.exists():
            tmp_path.unlink()
        raise


def normalize_hebrew_id(key: str, entry: dict) -> str | None:
    """Normalizuje hebrejské ID na H1, H2, ..."""
    entry_id = entry.get("ID", "")
    if entry_id.startswith("H"):
        return entry_id
    return None


def normalize_greek_id(key: str, entry: dict) -> str | None:
    """Normalizuje řecké ID na G1, G2, ..."""
    strongs = entry.get("strongs", key)
    if not strongs:
        strongs = key.lstrip("0")
    try:
        num = int(strongs)
        return f"G{num}"
    except (ValueError, TypeError):
        return None


def extract_definitions(entry: dict, is_hebrew: bool) -> str:
    """Extrahuje anglické definice jako jeden text."""
    if is_hebrew:
        defs = entry.get("definitions", [])
        if defs:
            return " | ".join(str(d) for d in defs)
    else:
        defn = entry.get("definition", "")
        if defn:
            return str(defn)
    return ""


def translate_text(text: str) -> str | None:
    """Přeloží text s rate limiting handling."""
    if not text:
        return None
    for attempt in range(3):
        try:
            result = translator.translate(text)
            time.sleep(random.uniform(PAUSE_MIN, PAUSE_MAX))
            return result
        except Exception as e:
            err_str = str(e).lower()
            if "429" in err_str or "rate" in err_str:
                print(f"RATE LIMIT! Ukládám stav a končím...")
                return None
            wait = (attempt + 1) * 5
            print(f"Pokus {attempt + 1} selhal: {e}. Čekám {wait}s...")
            time.sleep(wait)
    return None


def git_commit_push(count: int):
    """Git add, commit, push po batchi."""
    import subprocess

    try:
        subprocess.run(
            ["git", "add", "strong_bible_cz.json"], check=True, capture_output=True
        )
        msg = f"Přidáno {count} překladů do strong_bible_cz.json"
        subprocess.run(["git", "commit", "-m", msg], check=True, capture_output=True)
        subprocess.run(["git", "push"], check=True, capture_output=True)
        print(f"✓ GIT COMMIT: {msg}")
    except subprocess.CalledProcessError as e:
        print(f"GIT CHYBA: {e}")


def main():
    start_time = datetime.now()
    new_translations = 0

    # Načti cílový soubor
    target = load_json_safe(TARGET_FILE)
    if "entries" not in target:
        target["entries"] = {}

    # Zpracuj hebrejské
    print("--- NAČÍTÁM stronghebrew.json ---")
    hebrew_data = load_json_safe(HEBREW_SOURCE)

    for key, entry in hebrew_data.get("entries", {}).items():
        elapsed = (datetime.now() - start_time).total_seconds()
        if elapsed > MAX_RUNTIME_SECONDS:
            break

        # Normalizace ID
        norm_id = normalize_hebrew_id(key, entry)
        if not norm_id:
            continue

        # Skip pokud už existuje
        if norm_id in target["entries"]:
            existing = target["entries"][norm_id]
            if existing.get("translated"):
                continue

        # Překlad
        text = extract_definitions(entry, is_hebrew=True)
        if not text:
            continue

        cz = translate_text(text)
        if cz is None:
            break  # Rate limit

        # Ulož
        if norm_id not in target["entries"]:
            target["entries"][norm_id] = {}
        target["entries"][norm_id]["definitions_cz"] = cz
        target["entries"][norm_id]["translated"] = True
        new_translations += 1

        if new_translations % 20 == 0:
            print(f"Progress: {new_translations} prekladu")
            save_json_atomic(target, TARGET_FILE)

        # Check runtime
        elapsed = (datetime.now() - start_time).total_seconds()
        if elapsed > MAX_RUNTIME_SECONDS:
            print(f"TIME LIMIT {MAX_RUNTIME_SECONDS}s reached")
            break

    # Zpracuj řecké
    print("--- NAČÍTÁM strongsgreek.json ---")
    greek_data = load_json_safe(GREEK_SOURCE)
    print(f"Greek entries: {len(greek_data.get('entries', {}))}")

    for key, entry in greek_data.get("entries", {}).items():
        elapsed = (datetime.now() - start_time).total_seconds()
        if elapsed > MAX_RUNTIME_SECONDS:
            print(f"TIME LIMIT reached")
            break

        norm_id = normalize_greek_id(key, entry)
        if not norm_id:
            continue

        if norm_id in target["entries"]:
            existing = target["entries"][norm_id]
            if existing.get("translated"):
                continue
        else:
            print(f"Processing Greek: {norm_id}")

        text = extract_definitions(entry, is_hebrew=False)
        if not text:
            continue

        cz = translate_text(text)
        if cz is None:
            break

        if norm_id not in target["entries"]:
            target["entries"][norm_id] = {}
        target["entries"][norm_id]["definitions_cz"] = cz
        target["entries"][norm_id]["translated"] = True
        new_translations += 1

        if new_translations % 20 == 0:
            print(f"Progress: {new_translations} prekladu")
            save_json_atomic(target, TARGET_FILE)

    # Finalni ulozeni
    save_json_atomic(target, TARGET_FILE)
    print(f"--- HOTOVO: {new_translations} nových překladů ---")

    if new_translations > 0:
        git_commit_push(new_translations)


if __name__ == "__main__":
    main()
