#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
REPORT_DIR="$ROOT_DIR/06-测试与质量保障/reports/performance"
mkdir -p "$REPORT_DIR"

python3 <<'PY'
import gzip
import json
import os
import pathlib
import shutil
import subprocess
import time

root = pathlib.Path("/Users/sunyiyang/Desktop/Project/SilverLink Care")
report_dir = root / "06-测试与质量保障" / "reports" / "performance"
report_dir.mkdir(parents=True, exist_ok=True)

frontends = [
    {"name": "scan-client", "dir": root / "01-扫码用户端", "dist": "dist"},
    {"name": "volunteer-client", "dir": root / "02-志愿者填写端", "dist": "dist"},
    {"name": "admin-console", "dir": root / "03-管理后台端", "dist": "dist"},
]

npm_path = shutil.which("npm")
if not npm_path:
    raise SystemExit("npm not found in PATH")

def fmt_bytes(num: int) -> str:
    if num < 1024:
        return f"{num} B"
    if num < 1024 * 1024:
        return f"{num / 1024:.2f} KB"
    return f"{num / (1024 * 1024):.2f} MB"

def gzip_size(data: bytes) -> int:
    return len(gzip.compress(data, compresslevel=9))

results = []

for item in frontends:
    log_path = pathlib.Path(f"/tmp/{item['name']}_build_metrics.log")
    started = time.perf_counter()
    proc = subprocess.run(
        [npm_path, "run", "build"],
        cwd=item["dir"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        env=os.environ.copy(),
    )
    duration_ms = round((time.perf_counter() - started) * 1000)
    log_path.write_text(proc.stdout)
    if proc.returncode != 0:
        raise SystemExit(f"{item['name']} build failed, see {log_path}")

    dist_dir = item["dir"] / item["dist"]
    files = []
    for file_path in sorted(dist_dir.rglob("*")):
        if not file_path.is_file():
            continue
        data = file_path.read_bytes()
        files.append({
            "path": str(file_path.relative_to(item["dir"])),
            "rawBytes": len(data),
            "gzipBytes": gzip_size(data),
        })

    totals = {"rawBytes": 0, "gzipBytes": 0, "jsBytes": 0, "cssBytes": 0, "htmlBytes": 0}
    for file in files:
        totals["rawBytes"] += file["rawBytes"]
        totals["gzipBytes"] += file["gzipBytes"]
        if file["path"].endswith(".js"):
            totals["jsBytes"] += file["rawBytes"]
        elif file["path"].endswith(".css"):
            totals["cssBytes"] += file["rawBytes"]
        elif file["path"].endswith(".html"):
            totals["htmlBytes"] += file["rawBytes"]

    files.sort(key=lambda x: x["rawBytes"], reverse=True)
    results.append({
        "name": item["name"],
        "projectDir": str(item["dir"].relative_to(root)),
        "buildDurationMs": duration_ms,
        "logPath": str(log_path),
        "fileCount": len(files),
        "totals": totals,
        "topAssets": files[:8],
    })

generated_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
stamp = generated_at.replace(":", "-").replace(".", "-")
report = {
    "generatedAt": generated_at,
    "topic": "frontend-build-artifact-metrics",
    "environment": {
        "mode": "local-build-artifact-measurement",
        "scope": "build-time-dist-size-gzip",
    },
    "results": results,
}

json_path = report_dir / f"{stamp}-build-artifacts.json"
md_path = report_dir / f"{stamp}-build-artifacts.md"
json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2))

lines = [
    "# 三个前端构建性能留档",
    "",
    f"- 生成时间：{generated_at}",
    "- 模式：本机构建耗时 / dist 体积 / gzip 体积",
    f"- JSON 报告：{json_path.name}",
    "",
]

for item in results:
    lines.extend([
        f"## {item['name']}",
        "",
        f"- 项目：`{item['projectDir']}`",
        f"- build 耗时：{item['buildDurationMs']} ms",
        f"- build 日志：`{item['logPath']}`",
        f"- dist 文件数：{item['fileCount']}",
        f"- dist 总大小：{fmt_bytes(item['totals']['rawBytes'])}",
        f"- gzip 总大小：{fmt_bytes(item['totals']['gzipBytes'])}",
        f"- JS 总大小：{fmt_bytes(item['totals']['jsBytes'])}",
        f"- CSS 总大小：{fmt_bytes(item['totals']['cssBytes'])}",
        f"- HTML 总大小：{fmt_bytes(item['totals']['htmlBytes'])}",
        "- 最大资产：",
    ])
    for asset in item["topAssets"]:
        lines.append(
            f"  - `{asset['path']}` | raw {fmt_bytes(asset['rawBytes'])} | gzip {fmt_bytes(asset['gzipBytes'])}"
        )
    lines.append("")

lines.extend([
    "## 说明",
    "",
    "- 这轮是构建性能 / 交付性能留档，不是运行时页面加载测试。",
    "- gzip 体积按文件内容本地压缩估算，用于对比趋势，不等于生产 CDN 最终传输字节。",
])

md_path.write_text("\n".join(lines) + "\n")
print(json.dumps({"jsonPath": str(json_path), "mdPath": str(md_path)}, ensure_ascii=False))
PY
