#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
REPORT_DIR="$ROOT_DIR/06-测试与质量保障/reports/regression/$(date +%Y%m%d-%H%M%S)-local-full-check"
mkdir -p "$REPORT_DIR/logs"

run() {
  local name="$1"
  shift
  echo "[$(date '+%F %T')] $name" | tee -a "$REPORT_DIR/commands.log"
  "$@" >"$REPORT_DIR/logs/$name.log" 2>&1
}

cd "$ROOT_DIR"
run function-inventory python3 "06-测试与质量保障/scripts/common/generate_function_inventory.py"

run scan-build bash -lc "cd '01-扫码用户端' && npm run build"
run scan-test bash -lc "cd '01-扫码用户端' && npm run test"

run volunteer-build bash -lc "cd '02-志愿者填写端' && npm run build"
run volunteer-test bash -lc "cd '02-志愿者填写端' && npm run test"

run admin-build bash -lc "cd '03-管理后台端' && npm run build"
run admin-test bash -lc "cd '03-管理后台端' && npm run test"

run backend-test bash -lc "cd '04-统一后端' && ./mvnw test jacoco:report"
run android-unit bash -lc "cd '05-安卓短信中转端' && bash ./gradlew testDebugUnitTest"

if [[ "${SILVERLINK_RUN_LIVE_NON_UNIT:-0}" == "1" ]]; then
  run functional-readonly node "06-测试与质量保障/scripts/functional/live_readonly_smoke.mjs"
  run functional-write-reversible node "06-测试与质量保障/scripts/functional/live_write_reversible_smoke.mjs"
  run security-deep-negative node "06-测试与质量保障/scripts/security/api_deep_negative_smoke.mjs"
fi

python3 "06-测试与质量保障/scripts/common/redact_reports.py" "$REPORT_DIR"
echo "$REPORT_DIR"
