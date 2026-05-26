#!/usr/bin/env python3
"""Redact reusable credentials and personal identifiers from test reports."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


PATTERNS = [
    (re.compile(r"demo-key-v1\.[A-Za-z0-9_-]+"), "[REDACTED_QR_TOKEN]"),
    (re.compile(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"), "[REDACTED_JWT]"),
    (re.compile(r"\b1[3-9]\d{9}\b"), "[REDACTED_PHONE]"),
    (re.compile(r"\b\d{17}[\dXx]\b"), "[REDACTED_ID_CARD]"),
]

TEXT_SUFFIXES = {".json", ".md", ".txt", ".log", ".mjs", ".js", ".sh", ".csv", ".xml"}


def redact_file(path: Path) -> bool:
    if path.suffix not in TEXT_SUFFIXES:
        return False
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return False
    updated = text
    for pattern, replacement in PATTERNS:
        updated = pattern.sub(replacement, updated)
    if updated == text:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("path", nargs="?", default="06-测试与质量保障/reports")
    args = parser.parse_args()
    root = Path(args.path)
    changed = 0
    for path in root.rglob("*"):
        if path.is_file() and redact_file(path):
            changed += 1
    print(f"redacted_files={changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
