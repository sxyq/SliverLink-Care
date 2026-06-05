#!/usr/bin/env python3
"""Collect coverage artifacts from all modules into one redacted summary."""

from __future__ import annotations

import argparse
import csv
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any


FRONTEND_COVERAGE = [
    ("scan-client", Path("01-扫码用户端/coverage/coverage-final.json")),
    ("volunteer-client", Path("02-志愿者填写端/coverage/coverage-final.json")),
    ("admin-console", Path("03-管理后台端/coverage/coverage-final.json")),
]
BACKEND_JACOCO_XML = Path("04-统一后端/target/site/jacoco/jacoco.xml")
BACKEND_JACOCO_CSV = Path("04-统一后端/target/site/jacoco/jacoco.csv")
ANDROID_TEST_REPORT = Path("05-安卓短信中转端/app/build/reports/tests/testDebugUnitTest/index.html")
ANDROID_JACOCO_XML = Path(
    "05-安卓短信中转端/app/build/reports/jacoco/jacocoDebugUnitTestReport/jacocoDebugUnitTestReport.xml"
)


def pct(covered: int, total: int) -> float:
    return round((covered / total * 100) if total else 100.0, 2)


def frontend_summary(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"available": False, "reason": f"missing {path}"}
    payload = json.loads(path.read_text(encoding="utf-8"))
    statements_total = statements_covered = 0
    functions_total = functions_covered = 0
    branches_total = branches_covered = 0
    lines: set[str] = set()
    covered_lines: set[str] = set()

    for file_payload in payload.values():
        statement_map = file_payload.get("statementMap", {})
        statement_hits = file_payload.get("s", {})
        for sid, loc in statement_map.items():
            statements_total += 1
            if statement_hits.get(sid, 0) > 0:
                statements_covered += 1
            line = str(loc.get("start", {}).get("line", ""))
            if line:
                lines.add(line)
                if statement_hits.get(sid, 0) > 0:
                    covered_lines.add(line)

        function_hits = file_payload.get("f", {})
        for fid in file_payload.get("fnMap", {}):
            functions_total += 1
            if function_hits.get(fid, 0) > 0:
                functions_covered += 1

        branch_hits = file_payload.get("b", {})
        for bid, hits in branch_hits.items():
            branch_total = len(hits)
            branches_total += branch_total
            branches_covered += sum(1 for hit in hits if hit > 0)

    return {
        "available": True,
        "statements": {"covered": statements_covered, "total": statements_total, "pct": pct(statements_covered, statements_total)},
        "functions": {"covered": functions_covered, "total": functions_total, "pct": pct(functions_covered, functions_total)},
        "branches": {"covered": branches_covered, "total": branches_total, "pct": pct(branches_covered, branches_total)},
        "lines": {"covered": len(covered_lines), "total": len(lines), "pct": pct(len(covered_lines), len(lines))},
    }


def backend_summary(repo: Path) -> dict[str, Any]:
    xml_path = repo / BACKEND_JACOCO_XML
    if xml_path.exists():
        root = ET.parse(xml_path).getroot()
        counters: dict[str, dict[str, int]] = {}
        for counter in root.findall("counter"):
            kind = str(counter.attrib.get("type", "")).lower()
            missed = int(counter.attrib.get("missed", "0"))
            covered = int(counter.attrib.get("covered", "0"))
            counters[kind] = {"covered": covered, "total": missed + covered, "pct": pct(covered, missed + covered)}
        return {"available": True, "source": str(BACKEND_JACOCO_XML), **counters}

    csv_path = repo / BACKEND_JACOCO_CSV
    if not csv_path.exists():
        return {"available": False, "reason": "missing JaCoCo report"}

    method_covered = method_total = 0
    with csv_path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            missed = int(row.get("METHOD_MISSED", "0"))
            covered = int(row.get("METHOD_COVERED", "0"))
            method_covered += covered
            method_total += missed + covered
    return {"available": True, "method": {"covered": method_covered, "total": method_total, "pct": pct(method_covered, method_total)}}


def android_summary(repo: Path) -> dict[str, Any]:
    report_path = repo / ANDROID_TEST_REPORT
    xml_path = repo / ANDROID_JACOCO_XML
    if xml_path.exists():
        root = ET.parse(xml_path).getroot()
        counters: dict[str, dict[str, int]] = {}
        for counter in root.findall("counter"):
            kind = str(counter.attrib.get("type", "")).lower()
            missed = int(counter.attrib.get("missed", "0"))
            covered = int(counter.attrib.get("covered", "0"))
            counters[kind] = {"covered": covered, "total": missed + covered, "pct": pct(covered, missed + covered)}
        return {
            "available": report_path.exists(),
            "source": str(ANDROID_JACOCO_XML),
            "unit_test_report": str(ANDROID_TEST_REPORT),
            **counters,
        }
    return {
        "available": report_path.exists(),
        "unit_test_report": str(ANDROID_TEST_REPORT),
        "coverage_note": "Android JVM test report exists; JaCoCo XML aggregation is pending in a later coverage task.",
    }


def write_markdown(summary: dict[str, Any], output: Path) -> None:
    lines = [
        "# Coverage Summary",
        "",
        "This file is generated from local coverage artifacts. A failed 100% gate is preserved as evidence, not hidden.",
        "",
        "| Module | Function/Method Coverage | Statement/Instruction Coverage | Notes |",
        "| --- | ---: | ---: | --- |",
    ]
    for module in ("scan-client", "volunteer-client", "admin-console"):
        data = summary[module]
        if not data.get("available"):
            lines.append(f"| {module} | - | - | {data.get('reason', 'missing')} |")
            continue
        lines.append(
            f"| {module} | {data['functions']['pct']}% ({data['functions']['covered']}/{data['functions']['total']}) "
            f"| {data['statements']['pct']}% ({data['statements']['covered']}/{data['statements']['total']}) | V8/Istanbul |"
        )

    backend = summary["backend"]
    if backend.get("available"):
        method = backend.get("method", {})
        instruction = backend.get("instruction", {})
        lines.append(
            f"| backend | {method.get('pct', '-')}% ({method.get('covered', '-')}/{method.get('total', '-')}) "
            f"| {instruction.get('pct', '-')}% ({instruction.get('covered', '-')}/{instruction.get('total', '-')}) | JaCoCo |"
        )
    else:
        lines.append(f"| backend | - | - | {backend.get('reason', 'missing')} |")

    android = summary["android"]
    if "method" in android and "instruction" in android:
        lines.append(
            f"| android-relay | {android['method']['pct']}% ({android['method']['covered']}/{android['method']['total']}) "
            f"| {android['instruction']['pct']}% ({android['instruction']['covered']}/{android['instruction']['total']}) | JaCoCo (Android JVM) |"
        )
    else:
        lines.append(
            f"| android-relay | pending XML aggregation | {'available' if android.get('available') else 'missing'} | {android['coverage_note']} |"
        )
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    parser.add_argument("--out-dir", default="06-测试与质量保障/reports/unit/current")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    out_dir = (repo / args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    summary: dict[str, Any] = {}
    for module, relative_path in FRONTEND_COVERAGE:
        summary[module] = frontend_summary(repo / relative_path)
    summary["backend"] = backend_summary(repo)
    summary["android"] = android_summary(repo)

    (out_dir / "coverage-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    write_markdown(summary, out_dir / "coverage-summary.md")
    print(json.dumps({"out_dir": out_dir.as_posix(), "modules": list(summary)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
