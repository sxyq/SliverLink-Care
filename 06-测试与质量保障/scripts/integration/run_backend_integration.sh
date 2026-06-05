#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
REPORT_DIR="$ROOT_DIR/06-测试与质量保障/reports/integration/$(date +%Y%m%d-%H%M%S)-backend"
mkdir -p "$REPORT_DIR"

cd "$ROOT_DIR/04-统一后端"
./mvnw -Dtest=SecurityConfigIntegrationTest,InvitationRegistrationIntegrationTest,InputSafetyIntegrationTest,ScanSessionScopeIntegrationTest,InvitationRegistrationMySqlContainerIntegrationTest test jacoco:report >"$REPORT_DIR/maven-test-jacoco.log" 2>&1

python3 "$ROOT_DIR/06-测试与质量保障/scripts/common/redact_reports.py" "$REPORT_DIR" >/dev/null
echo "$REPORT_DIR"
