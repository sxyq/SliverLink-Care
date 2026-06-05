#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/04-统一后端"
REPORT_DIR="$ROOT_DIR/06-测试与质量保障/reports/regression"
TIMESTAMP="$(date +"%Y%m%d-%H%M")"
OUT_FILE="$REPORT_DIR/${TIMESTAMP}-local-mariadb-read-perf-run.md"

mkdir -p "$REPORT_DIR"

source "$ROOT_DIR/06-测试与质量保障/scripts/performance/prepare_mariadb_compat_libs.sh" >/tmp/silverlink_mariadb_read_compat.log 2>&1

cd "$BACKEND_DIR"

./mvnw -DskipTests test-compile >/tmp/silverlink_mariadb_read_compile.log 2>&1
./mvnw -DargLine= -Dsilverlink.mariadb.compatRoot="$COMPAT_ROOT" -Dtest=ScanReadMariaDbPerfTest surefire:test >/tmp/silverlink_mariadb_read_perf.log 2>&1

LATEST_MD="$(ls -t "$ROOT_DIR"/06-测试与质量保障/reports/performance/*-local-mariadb-scan-read-optimization.md 2>/dev/null | head -n 1 || true)"
LATEST_JSON="$(ls -t "$ROOT_DIR"/06-测试与质量保障/reports/performance/*-local-mariadb-scan-read-optimization.json 2>/dev/null | head -n 1 || true)"

{
  echo "# 本机 MariaDB 读链路优化对比执行记录"
  echo
  echo "- 时间：$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "- 模式：本机嵌入式 MariaDB4j（真实 MariaDB / 真实 JDBC / 真实 SQL / 控制器级读链路）"
  echo "- 目标：验证异步审计、已验证 session 缓存、详情短缓存、审计日志 SQL 下推在本地并发下的收益"
  echo "- 兼容库目录：\`${COMPAT_ROOT}\`"
  echo "- 命令：\`./mvnw -DskipTests test-compile\`"
  echo "- 命令：\`./mvnw -DargLine= -Dsilverlink.mariadb.compatRoot=\"$COMPAT_ROOT\" -Dtest=ScanReadMariaDbPerfTest surefire:test\`"
  echo "- 编译日志：\`/tmp/silverlink_mariadb_read_compile.log\`"
  echo "- 压测日志：\`/tmp/silverlink_mariadb_read_perf.log\`"
  if [[ -n "$LATEST_MD" ]]; then
    echo "- 结构化 Markdown 报告：\`${LATEST_MD#$ROOT_DIR/}\`"
  fi
  if [[ -n "$LATEST_JSON" ]]; then
    echo "- 结构化 JSON 报告：\`${LATEST_JSON#$ROOT_DIR/}\`"
  fi
  echo
  echo "## 说明"
  echo
  echo "- 这轮是扫码读链路的本地 MariaDB 实库优化前后对比，不是假 Jdbc，也不是只测某个纯函数。"
  echo "- 对比的是同一批接口、同一批数据、相同并发档位下，优化开关关闭与开启后的控制器级读路径。"
} >"$OUT_FILE"

echo "$OUT_FILE"
