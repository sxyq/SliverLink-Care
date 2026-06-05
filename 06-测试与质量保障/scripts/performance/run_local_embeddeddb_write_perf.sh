#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/04-统一后端"
REPORT_DIR="$ROOT_DIR/06-测试与质量保障/reports/regression"
TIMESTAMP="$(date +"%Y%m%d-%H%M")"
OUT_FILE="$REPORT_DIR/${TIMESTAMP}-local-embeddeddb-write-perf-run.md"

mkdir -p "$REPORT_DIR"

cd "$BACKEND_DIR"

./mvnw -DskipTests test-compile >/tmp/silverlink_embeddeddb_compile.log 2>&1
./mvnw -DargLine= -Dtest=SmsRelayEmbeddedDbWritePerfTest surefire:test >/tmp/silverlink_embeddeddb_perf.log 2>&1

LATEST_MD="$(ls -t "$ROOT_DIR"/06-测试与质量保障/reports/performance/*-local-embeddeddb-write-pressure.md 2>/dev/null | head -n 1 || true)"
LATEST_JSON="$(ls -t "$ROOT_DIR"/06-测试与质量保障/reports/performance/*-local-embeddeddb-write-pressure.json 2>/dev/null | head -n 1 || true)"

{
  echo "# 本机嵌入式数据库写链路压测执行记录"
  echo
  echo "- 时间：$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "- 模式：本机 H2 嵌入式数据库（真实 JDBC / 真实 SQL / 真实主键约束）"
  echo "- 命令：\`./mvnw -DskipTests test-compile\`"
  echo "- 命令：\`./mvnw -DargLine= -Dtest=SmsRelayEmbeddedDbWritePerfTest surefire:test\`"
  echo "- 编译日志：\`/tmp/silverlink_embeddeddb_compile.log\`"
  echo "- 压测日志：\`/tmp/silverlink_embeddeddb_perf.log\`"
  if [[ -n "$LATEST_MD" ]]; then
    echo "- 结构化 Markdown 报告：\`${LATEST_MD#$ROOT_DIR/}\`"
  fi
  if [[ -n "$LATEST_JSON" ]]; then
    echo "- 结构化 JSON 报告：\`${LATEST_JSON#$ROOT_DIR/}\`"
  fi
  echo
  echo "## 说明"
  echo
  echo "- 这轮补的是“本地真实数据库写链路压测”的嵌入式版本，不是假 Jdbc。"
  echo "- 它仍然不是 MySQL / Testcontainers，因此不能替代最终的 MySQL 专项结论。"
  echo '- 但它已经可以验证真实 SQL、真实唯一约束、真实 `select/update/insert` 路径下的并发缺陷。'
} >"$OUT_FILE"

echo "$OUT_FILE"
