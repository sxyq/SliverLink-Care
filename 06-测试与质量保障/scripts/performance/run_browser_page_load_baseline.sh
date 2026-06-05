#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
python3 "$ROOT_DIR/06-测试与质量保障/scripts/performance/browser_page_load_baseline.py"
