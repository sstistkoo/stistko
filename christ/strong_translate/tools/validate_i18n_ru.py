#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
RU_PATH = BASE_DIR / "i18n" / "ru.json"
EN_PATH = BASE_DIR / "i18n" / "en.json"
BAD_TOKEN_RE = re.compile(r"(?:saveRU|slotRU|ПеревестиRU|СохранитьRU|RUé|prRU|ОтменаRU)")
PLACEHOLDER_RE = re.compile(r"\{[a-zA-Z0-9_]+\}")


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def extract_placeholders(text: str) -> set[str]:
    return set(PLACEHOLDER_RE.findall(str(text)))


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="backslashreplace")

    ru = load_json(RU_PATH)
    en = load_json(EN_PATH)

    errors: list[str] = []

    for key, value in ru.items():
        text = str(value)
        if BAD_TOKEN_RE.search(text):
            errors.append(f"[BAD_TOKEN] {key}: {text}")

        if key in en:
            ru_ph = extract_placeholders(text)
            en_ph = extract_placeholders(en[key])
            if ru_ph != en_ph:
                errors.append(
                    f"[PLACEHOLDER_MISMATCH] {key}: ru={sorted(ru_ph)} en={sorted(en_ph)}"
                )

    if errors:
        print("RU i18n validace selhala:")
        for err in errors:
            print(f"- {err}")
        return 1

    print("RU i18n validace OK.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
