#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/04-统一后端"
REPORT_ROOT="$ROOT_DIR/06-测试与质量保障/reports/performance"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
OUT_DIR="$REPORT_ROOT/${TIMESTAMP}-local-mariadb-write-with-metrics"
SAMPLE_SECONDS="${SILVERLINK_LOCAL_METRICS_SAMPLE_SECONDS:-20}"

mkdir -p "$OUT_DIR"
source "$ROOT_DIR/06-测试与质量保障/scripts/performance/prepare_mariadb_compat_libs.sh" >"$OUT_DIR/compat.log" 2>&1

echo "# 本机 MariaDB 写压联合采样" >"$OUT_DIR/summary.md"
echo >>"$OUT_DIR/summary.md"
echo "- 时间：$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$OUT_DIR/summary.md"
echo "- 模式：本机 MariaDB4j + 真实 JDBC 写链路 + 本机资源采样" >>"$OUT_DIR/summary.md"
echo "- 目标：观察修复后写链路在真实 SQL / 唯一约束下的 JVM / 进程 / 内存指标" >>"$OUT_DIR/summary.md"
echo "- 采样秒数上限：$SAMPLE_SECONDS" >>"$OUT_DIR/summary.md"
echo "- 兼容库目录：$COMPAT_ROOT" >>"$OUT_DIR/summary.md"
echo >>"$OUT_DIR/summary.md"

(
  cd "$BACKEND_DIR"
  ./mvnw -DskipTests test-compile
) >"$OUT_DIR/compile.log" 2>&1

(
  cd "$BACKEND_DIR"
  ./mvnw -DargLine= -Dsilverlink.mariadb.compatRoot="$COMPAT_ROOT" -Dtest=SmsRelayMariaDbWritePerfTest surefire:test
) >"$OUT_DIR/test.log" 2>&1 &
MVN_PID=$!
echo "$MVN_PID" >"$OUT_DIR/maven.pid"

capture_vmstat() {
  local ts="$1"
  echo "[$ts]" >>"$OUT_DIR/vm_stat.log"
  vm_stat | head -n 12 >>"$OUT_DIR/vm_stat.log" 2>&1 || true
  echo >>"$OUT_DIR/vm_stat.log"
}

capture_ps() {
  local ts="$1"
  local pid="$2"
  local thread_count=""
  thread_count="$(ps -M -p "$pid" 2>/dev/null | tail -n +2 | wc -l | tr -d ' ' || true)"
  echo "[$ts] pid=$pid" >>"$OUT_DIR/process-samples.log"
  ps -o pid=,%cpu=,rss=,etime=,command= -p "$pid" >>"$OUT_DIR/process-samples.log" 2>&1 || true
  echo "threads=$thread_count" >>"$OUT_DIR/process-samples.log"
  echo >>"$OUT_DIR/process-samples.log"
}

capture_jstat() {
  local ts="$1"
  local pid="$2"
  echo "[$ts] pid=$pid" >>"$OUT_DIR/jstat-gcutil.log"
  jstat -gcutil "$pid" >>"$OUT_DIR/jstat-gcutil.log" 2>&1 || true
  echo >>"$OUT_DIR/jstat-gcutil.log"
}

resolve_test_pid() {
  local pid=""
  pid="$(
    ps -Ao pid=,command= 2>/dev/null \
      | rg 'java .*surefirebooter-.*\.jar' \
      | awk '{print $1}' \
      | head -n 1
  )"
  if [[ -n "$pid" ]]; then
    echo "$pid"
    return
  fi

  pid="$(
    jps -lv 2>/dev/null \
      | rg 'surefirebooter|ForkedBooter' \
      | awk '{print $1}' \
      | head -n 1
  )"
  if [[ -n "$pid" ]]; then
    echo "$pid"
    return
  fi

  pid="$(pgrep -f 'surefirebooter|ForkedBooter' | head -n 1 || true)"
  if [[ -n "$pid" ]]; then
    echo "$pid"
    return
  fi

  local mvn_child=""
  mvn_child="$(pgrep -P "$MVN_PID" java | head -n 1 || true)"
  if [[ -n "$mvn_child" ]]; then
    echo "$mvn_child"
    return
  fi

  local wrapper_child=""
  wrapper_child="$(pgrep -P "$MVN_PID" | head -n 1 || true)"
  if [[ -n "$wrapper_child" ]]; then
    pgrep -P "$wrapper_child" java | head -n 1 || true
  fi
}

for ((i=1; i<=SAMPLE_SECONDS; i++)); do
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  TEST_PID="$(resolve_test_pid || true)"
  TARGET_PID="${TEST_PID:-$MVN_PID}"

  capture_ps "$ts" "$TARGET_PID"
  capture_vmstat "$ts"
  if [[ -n "${TEST_PID:-}" ]]; then
    capture_jstat "$ts" "$TEST_PID"
  fi

  if ! kill -0 "$MVN_PID" 2>/dev/null; then
    break
  fi
  sleep 1
done

set +e
wait "$MVN_PID"
EXIT_CODE=$?
set -e

TEST_PID="$(resolve_test_pid || true)"
if [[ -n "${TEST_PID:-}" ]]; then
  {
    echo "[final] pid=$TEST_PID"
    jcmd "$TEST_PID" GC.heap_info
  } >"$OUT_DIR/jcmd-heap-info.log" 2>&1 || true
fi

LATEST_MD="$(find "$REPORT_ROOT" -maxdepth 1 -type f -name '*local-mariadb-write-pressure.md' | sort | tail -n 1)"
LATEST_JSON="$(find "$REPORT_ROOT" -maxdepth 1 -type f -name '*local-mariadb-write-pressure.json' | sort | tail -n 1)"

{
  echo "- Maven 退出码：$EXIT_CODE"
  echo "- 编译日志：\`compile.log\`"
  echo "- 测试日志：\`test.log\`"
  echo "- 进程采样：\`process-samples.log\`"
  echo "- JVM GC 采样：\`jstat-gcutil.log\`"
  echo "- 系统内存采样：\`vm_stat.log\`"
  echo "- 关联嵌入式数据库报告：\`$(basename "$LATEST_MD")\`"
  echo "- 关联嵌入式数据库 JSON：\`$(basename "$LATEST_JSON")\`"
} >>"$OUT_DIR/summary.md"

echo "$OUT_DIR"
exit "$EXIT_CODE"
