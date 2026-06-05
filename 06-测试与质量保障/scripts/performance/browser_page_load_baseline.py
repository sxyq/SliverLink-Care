#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import time
import urllib.request
import uuid
from dataclasses import dataclass
from pathlib import Path
from statistics import median


ROOT = Path(__file__).resolve().parents[3]
REPORT_DIR = ROOT / "06-测试与质量保障" / "reports" / "performance"


@dataclass
class Target:
    name: str
    dist_dir: Path
    port: int


TARGETS = [
    Target("scan-client", ROOT / "01-扫码用户端" / "dist", 45173),
    Target("volunteer-client", ROOT / "02-志愿者填写端" / "dist", 45174),
    Target("admin-console", ROOT / "03-管理后台端" / "dist", 45175),
]


def percentile(values, pct):
    if not values:
        return 0
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, int((pct / 100.0) * len(ordered) + 0.999999) - 1))
    return ordered[index]


def http_json(method, url, payload=None):
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def wait_http(url, timeout=15):
    started = time.time()
    while time.time() - started < timeout:
        try:
            with urllib.request.urlopen(url, timeout=2):
                return
        except Exception:
            time.sleep(0.2)
    raise RuntimeError(f"server not ready: {url}")


def create_session():
    response = http_json("POST", "http://127.0.0.1:4444/session", {
        "capabilities": {
            "alwaysMatch": {
                "browserName": "Safari",
                "acceptInsecureCerts": True
            }
        }
    })
    return response["value"]["sessionId"]


def delete_session(session_id):
    try:
        http_json("DELETE", f"http://127.0.0.1:4444/session/{session_id}")
    except Exception:
        pass


def navigate(session_id, url):
    http_json("POST", f"http://127.0.0.1:4444/session/{session_id}/url", {"url": url})


def execute_script(session_id, script):
    response = http_json(
        "POST",
        f"http://127.0.0.1:4444/session/{session_id}/execute/sync",
        {"script": script, "args": []},
    )
    return response["value"]


def wait_complete(session_id, timeout=20):
    started = time.time()
    while time.time() - started < timeout:
        state = execute_script(session_id, "return document.readyState;")
        if state == "complete":
            return
        time.sleep(0.2)
    raise RuntimeError("document.readyState did not become complete")


def collect_metrics(session_id):
    return execute_script(session_id, """
        const nav = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource');
        return {
          domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
          loadEventEndMs: nav ? Math.round(nav.loadEventEnd) : null,
          durationMs: nav ? Math.round(nav.duration) : null,
          transferSize: nav ? nav.transferSize : null,
          decodedBodySize: nav ? nav.decodedBodySize : null,
          resourceCount: resources.length,
          title: document.title
        };
    """)


def run():
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = time.strftime("%Y-%m-%dT%H-%M-%SZ", time.gmtime())
    md_path = REPORT_DIR / f"{timestamp}-browser-page-load-baseline.md"
    json_path = REPORT_DIR / f"{timestamp}-browser-page-load-baseline.json"

    servers = []
    safaridriver = None
    report = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "mode": "local-real-browser-page-load-baseline",
        "browser": "Safari WebDriver",
        "targets": []
    }
    try:
        for target in TARGETS:
            if not target.dist_dir.exists():
                raise RuntimeError(f"dist not found: {target.dist_dir}")
            proc = subprocess.Popen(
                [sys.executable, "-m", "http.server", str(target.port), "--bind", "127.0.0.1"],
                cwd=str(target.dist_dir),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            servers.append(proc)
            wait_http(f"http://127.0.0.1:{target.port}/")

        safaridriver = subprocess.Popen(
            ["safaridriver", "-p", "4444"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        wait_http("http://127.0.0.1:4444/status")

        for target in TARGETS:
            runs = []
            for _ in range(3):
                session_id = create_session()
                try:
                    navigate(session_id, f"http://127.0.0.1:{target.port}/?perf={uuid.uuid4().hex}")
                    wait_complete(session_id)
                    time.sleep(0.5)
                    runs.append(collect_metrics(session_id))
                finally:
                    delete_session(session_id)

            load_values = [item["loadEventEndMs"] or 0 for item in runs]
            dcl_values = [item["domContentLoadedMs"] or 0 for item in runs]
            entry = {
                "name": target.name,
                "url": f"http://127.0.0.1:{target.port}/",
                "runs": runs,
                "summary": {
                    "dclP50Ms": percentile(dcl_values, 50),
                    "dclP95Ms": percentile(dcl_values, 95),
                    "loadP50Ms": percentile(load_values, 50),
                    "loadP95Ms": percentile(load_values, 95),
                    "loadMaxMs": max(load_values) if load_values else 0,
                    "resourceCountMedian": int(median([item["resourceCount"] for item in runs])) if runs else 0,
                    "decodedBodySizeMax": max([(item["decodedBodySize"] or 0) for item in runs]) if runs else 0,
                },
            }
            report["targets"].append(entry)

        with json_path.open("w", encoding="utf-8") as fh:
            json.dump(report, fh, ensure_ascii=False, indent=2)

        lines = [
            "# 三端真实浏览器页面加载基线",
            "",
            f"- 生成时间：{report['generatedAt']}",
            "- 模式：本机 Safari WebDriver + 本地静态产物",
            "- 目标：记录真实浏览器里的首屏加载与资源条目基线，不把当前宿主机绝对耗时当成线上结论",
            f"- JSON 报告：{json_path.name}",
            "",
        ]
        for item in report["targets"]:
            summary = item["summary"]
            lines.extend([
                f"## {item['name']}",
                "",
                f"- URL：{item['url']}",
                f"- DCL P50：{summary['dclP50Ms']}ms",
                f"- DCL P95：{summary['dclP95Ms']}ms",
                f"- Load P50：{summary['loadP50Ms']}ms",
                f"- Load P95：{summary['loadP95Ms']}ms",
                f"- Load Max：{summary['loadMaxMs']}ms",
                f"- 资源条目中位数：{summary['resourceCountMedian']}",
                f"- 最大 decodedBodySize：{summary['decodedBodySizeMax']}",
                "",
            ])
        md_path.write_text("\n".join(lines), encoding="utf-8")
        print(str(md_path))
    finally:
        if safaridriver is not None:
            safaridriver.terminate()
            try:
                safaridriver.wait(timeout=5)
            except Exception:
                safaridriver.kill()
        for proc in servers:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except Exception:
                proc.kill()


if __name__ == "__main__":
    run()
