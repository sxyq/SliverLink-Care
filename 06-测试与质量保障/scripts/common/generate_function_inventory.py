#!/usr/bin/env python3
"""Generate a source-function inventory and a coverage work matrix.

The scanner intentionally uses lightweight regexes instead of language servers
so it can run on every machine before dependencies are installed. It is a
planning and gatekeeping aid, not a compiler replacement.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable


ROOTS = [
    ("scan-client", Path("01-扫码用户端/src"), ("ts", "tsx")),
    ("volunteer-client", Path("02-志愿者填写端/src"), ("ts", "tsx")),
    ("admin-console", Path("03-管理后台端/src"), ("ts", "tsx")),
    ("backend", Path("04-统一后端/src/main/java"), ("java",)),
    ("android-relay", Path("05-安卓短信中转端/app/src/main/java"), ("kt",)),
    ("weapp-miniapp", Path("08-微信小程序端/src"), ("ts", "tsx")),
]

EXCLUDED_DIR_PARTS = {
    "node_modules",
    "dist",
    "build",
    "target",
    "coverage",
    ".gradle",
}

TS_FUNCTION = re.compile(r"\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(")
TS_ARROW = re.compile(
    r"\b(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>"
)
TS_COMPONENT = re.compile(r"\b(?:export\s+)?(?:const|let)\s+([A-Z][A-Za-z0-9_$]*)\s*:\s*React\.FC\b")
JAVA_METHOD = re.compile(
    r"\b(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?[A-Za-z0-9_<>, ?\[\].]+\s+([A-Za-z_$][\w$]*)\s*\([^;{}]*\)\s*(?:throws [^{]+)?\{"
)
JAVA_CTOR = re.compile(r"\b(?:public|private|protected)\s+([A-Z][A-Za-z0-9_$]*)\s*\([^;{}]*\)\s*(?:throws [^{]+)?\{")
KT_FUN = re.compile(
    r"\b(?:override\s+)?(?:private\s+|public\s+|internal\s+|protected\s+)?(?:suspend\s+)?fun\s+([A-Za-z_$][\w$]*)\s*\("
)


@dataclass
class FunctionItem:
    module: str
    language: str
    file: str
    name: str
    kind: str
    line: int
    test_status: str
    evidence: str


def should_skip(path: Path) -> bool:
    if path.suffix == ".d.ts":
        return True
    return any(part in EXCLUDED_DIR_PARTS for part in path.parts)


def line_for(text: str, start: int) -> int:
    return text.count("\n", 0, start) + 1


def matches(pattern: re.Pattern[str], text: str) -> Iterable[tuple[str, int]]:
    for match in pattern.finditer(text):
        yield match.group(1), line_for(text, match.start())


def classify_ts_name(name: str) -> str:
    return "component" if name[:1].isupper() else "function"


def scan_file(module: str, root: Path, path: Path) -> list[FunctionItem]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    rel = path.as_posix()
    suffix = path.suffix.lstrip(".")
    items: list[FunctionItem] = []

    if suffix in {"ts", "tsx"}:
        seen: set[tuple[str, int]] = set()
        for regex in (TS_FUNCTION, TS_ARROW, TS_COMPONENT):
            for name, line in matches(regex, text):
                key = (name, line)
                if key in seen:
                    continue
                seen.add(key)
                items.append(
                    FunctionItem(module, suffix, rel, name, classify_ts_name(name), line, "TODO", "")
                )
    elif suffix == "java":
        for name, line in list(matches(JAVA_METHOD, text)) + list(matches(JAVA_CTOR, text)):
            items.append(FunctionItem(module, suffix, rel, name, "method", line, "TODO", ""))
    elif suffix == "kt":
        for name, line in matches(KT_FUN, text):
            items.append(FunctionItem(module, suffix, rel, name, "function", line, "TODO", ""))

    return items


def discover(repo: Path) -> list[FunctionItem]:
    result: list[FunctionItem] = []
    for module, root, suffixes in ROOTS:
        base = repo / root
        if not base.exists():
            continue
        for path in sorted(base.rglob("*")):
            if not path.is_file() or should_skip(path):
                continue
            if path.suffix.lstrip(".") not in suffixes:
                continue
            result.extend(scan_file(module, base, path))
    return result


def write_markdown(items: list[FunctionItem], output: Path) -> None:
    counts: dict[str, int] = {}
    for item in items:
        counts[item.module] = counts.get(item.module, 0) + 1

    lines = [
        "# Function Coverage Matrix",
        "",
        "Generated from current source. `TODO` means a test must be added or linked.",
        "",
        "## Summary",
        "",
        "| Module | Functions |",
        "| --- | ---: |",
    ]
    for module, count in sorted(counts.items()):
        lines.append(f"| {module} | {count} |")
    lines.extend(["", "## Inventory", "", "| Module | File | Line | Function | Kind | Status | Evidence |", "| --- | --- | ---: | --- | --- | --- | --- |"])
    for item in items:
        lines.append(
            f"| {item.module} | `{item.file}` | {item.line} | `{item.name}` | {item.kind} | {item.test_status} | {item.evidence} |"
        )
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".", help="Repository root")
    parser.add_argument("--out-dir", default="06-测试与质量保障/reports/unit/current")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    out_dir = (repo / args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    items = discover(repo)
    payload = {
        "repo": repo.as_posix(),
        "total": len(items),
        "items": [asdict(item) for item in items],
    }
    (out_dir / "function-inventory.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    write_markdown(items, out_dir / "function-coverage-matrix.md")
    print(json.dumps({"total": len(items), "out_dir": out_dir.as_posix()}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
