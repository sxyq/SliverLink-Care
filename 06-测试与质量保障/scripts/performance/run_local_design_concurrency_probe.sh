#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/04-统一后端"
REPORT_DIR="$ROOT_DIR/06-测试与质量保障/reports/regression"
TIMESTAMP="$(date -u +%Y%m%d-%H%M)"
OUT_FILE="$REPORT_DIR/${TIMESTAMP}-local-design-concurrency-probe-run.md"

mkdir -p "$REPORT_DIR"

{
  echo "# 本地并发设计探针执行记录"
  echo
  echo "- 时间：$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- 目标：在本机复现 SilverLink 扫码验证写链路的并发设计缺陷，不以本机绝对性能为结论"
  echo "- 执行目录：\`$BACKEND_DIR\`"
  echo "- 执行命令1：\`./mvnw -DskipTests test-compile\`"
  echo "- 执行命令2：\`./mvnw -DargLine= -Dtest=SmsRelayConcurrencyDesignProbeTest surefire:test\`"
  echo
} >"$OUT_FILE"

(
  cd "$BACKEND_DIR"
  ./mvnw -DskipTests test-compile
  ./mvnw -DargLine= -Dtest=SmsRelayConcurrencyDesignProbeTest surefire:test
) >>"$OUT_FILE" 2>&1

echo >>"$OUT_FILE"
echo "- 结果：执行完成，详细结构化报告见 \`06-测试与质量保障/reports/performance/*-local-scan-write-design-probe.{md,json}\`" >>"$OUT_FILE"
