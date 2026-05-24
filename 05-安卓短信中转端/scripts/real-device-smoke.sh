#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ADB_BIN="${ADB_BIN:-$HOME/Library/Android/sdk/platform-tools/adb}"
GRADLEW="$PROJECT_DIR/gradlew"
PACKAGE_NAME="com.silverlink.smsrelay"
MAIN_ACTIVITY=".MainActivity"

if [ ! -x "$ADB_BIN" ]; then
  echo "adb not found: $ADB_BIN" >&2
  exit 1
fi

if [ ! -f "$GRADLEW" ]; then
  echo "gradlew not found: $GRADLEW" >&2
  exit 1
fi

DEVICE_SERIAL="$("$ADB_BIN" devices | awk 'NR>1 && $2=="device" {print $1; exit}')"
if [ -z "${DEVICE_SERIAL:-}" ]; then
  echo "No connected Android device in 'device' state." >&2
  exit 1
fi

echo "Using device: $DEVICE_SERIAL"

(
  cd "$PROJECT_DIR"
  bash "$GRADLEW" installDebug
)

"$ADB_BIN" -s "$DEVICE_SERIAL" shell am start -n "$PACKAGE_NAME/$PACKAGE_NAME$MAIN_ACTIVITY"

SCREENSHOT_PATH="${TMPDIR:-/tmp}/silverlink-real-device-smoke.png"
"$ADB_BIN" -s "$DEVICE_SERIAL" exec-out screencap -p > "$SCREENSHOT_PATH"

echo "Smoke validation finished."
echo "Screenshot: $SCREENSHOT_PATH"
