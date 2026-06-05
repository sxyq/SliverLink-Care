#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
ANDROID_DIR="$ROOT_DIR/05-安卓短信中转端"
REPORT_DIR="$ROOT_DIR/06-测试与质量保障/reports/regression"
TIMESTAMP="$(date +"%Y%m%d-%H%M")"
OUT_FILE="$REPORT_DIR/${TIMESTAMP}-android-local-perf-baseline-run.md"

mkdir -p "$REPORT_DIR"

cd "$ANDROID_DIR"
bash ./gradlew testDebugUnitTest --tests "com.silverlink.smsrelay.performance.AndroidLocalPerfBaselineTest" >/tmp/silverlink_android_perf.log 2>&1

LATEST_MD="$(ls -t "$ROOT_DIR"/06-测试与质量保障/reports/performance/*-android-local-performance-baseline.md 2>/dev/null | head -n 1 || true)"
LATEST_JSON="$(ls -t "$ROOT_DIR"/06-测试与质量保障/reports/performance/*-android-local-performance-baseline.json 2>/dev/null | head -n 1 || true)"

{
  echo "# Android 本地性能基线执行记录"
  echo
  echo "- 时间：$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo '- 命令：`bash ./gradlew testDebugUnitTest --tests "com.silverlink.smsrelay.performance.AndroidLocalPerfBaselineTest"`'
  echo "- 日志：\`/tmp/silverlink_android_perf.log\`"
  if [[ -n "$LATEST_MD" ]]; then
    echo "- 结构化 Markdown 报告：\`${LATEST_MD#$ROOT_DIR/}\`"
  fi
  if [[ -n "$LATEST_JSON" ]]; then
    echo "- 结构化 JSON 报告：\`${LATEST_JSON#$ROOT_DIR/}\`"
  fi
  echo
  echo "## 说明"
  echo
  echo "- 这轮是 Android 本地 JVM / Robolectric 基线。"
  echo "- 网络相关路径通过 MockWebServer 回环，重点是代码路径相对开销，不是公网时延。"
} >"$OUT_FILE"

echo "$OUT_FILE"
