#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
REPORT_DIR="$ROOT_DIR/06-测试与质量保障/reports/unit/$(date +%Y%m%d-%H%M%S)-unit-suite"
mkdir -p "$REPORT_DIR/logs"

run() {
  local name="$1"
  shift
  echo "[$(date '+%F %T')] $name" | tee -a "$REPORT_DIR/commands.log"
  "$@" >"$REPORT_DIR/logs/$name.log" 2>&1
}

cd "$ROOT_DIR"
run function-inventory python3 "06-测试与质量保障/scripts/common/generate_function_inventory.py"
run scan-unit bash -lc "cd '01-扫码用户端' && npm run test"
run volunteer-unit bash -lc "cd '02-志愿者填写端' && npm run test"
run admin-unit bash -lc "cd '03-管理后台端' && npm run test"
run backend-unit bash -lc "cd '04-统一后端' && ./mvnw test jacoco:report"
run android-unit bash -lc "cd '05-安卓短信中转端' && bash ./gradlew testDebugUnitTest"
run coverage-summary python3 "06-测试与质量保障/scripts/common/collect_coverage_summary.py"

python3 "06-测试与质量保障/scripts/common/redact_reports.py" "$REPORT_DIR" >/dev/null
echo "$REPORT_DIR"
