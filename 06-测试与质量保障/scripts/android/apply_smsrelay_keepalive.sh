#!/usr/bin/env bash
set -euo pipefail

ADB_BIN="${ADB_BIN:-$HOME/Library/Android/sdk/platform-tools/adb}"
PKG="${PKG:-com.silverlink.smsrelay}"
SERVICE_COMPONENT="${SERVICE_COMPONENT:-com.silverlink.smsrelay/.service.RelayForegroundService}"
MAIN_ACTIVITY_COMPONENT="${MAIN_ACTIVITY_COMPONENT:-com.silverlink.smsrelay/.MainActivity}"
MEDIA_ACTION="${MEDIA_ACTION:-com.silverlink.smsrelay.action.SET_MEDIA_KEEPALIVE}"
DISABLE_DEVICEIDLE="${DISABLE_DEVICEIDLE:-0}"
ALLOW_ROOT="${ALLOW_ROOT:-1}"

require_adb() {
  if [[ ! -x "$ADB_BIN" ]]; then
    echo "adb not found: $ADB_BIN" >&2
    exit 1
  fi
}

require_device() {
  local devices
  devices="$("$ADB_BIN" devices | awk 'NR>1 && $2=="device" {print $1}')"
  if [[ -z "$devices" ]]; then
    echo "no authorized adb device found" >&2
    exit 1
  fi
}

has_root() {
  "$ADB_BIN" shell 'su -c id >/dev/null 2>&1'
}

run_shell() {
  "$ADB_BIN" shell "$1"
}

run_root() {
  "$ADB_BIN" shell "su -c '$1'"
}

package_uid() {
  "$ADB_BIN" shell "cmd package list packages -U $PKG | sed -n 's/.* uid:\\([0-9][0-9]*\\)$/\\1/p'" | tr -d '\r'
}

service_running() {
  "$ADB_BIN" shell "dumpsys activity services $PKG | grep -q RelayForegroundService"
}

start_app_path() {
  run_shell "am start -n $MAIN_ACTIVITY_COMPONENT >/dev/null 2>&1 || monkey -p $PKG -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true"
  sleep 2
}

main() {
  require_adb
  require_device

  echo "[1/7] wake device and ensure relay service is running"
  run_shell "input keyevent KEYCODE_WAKEUP || true"
  if ! service_running; then
    start_app_path
  fi
  if service_running; then
    echo "relay foreground service is active"
  else
    echo "relay foreground service is not running yet" >&2
  fi

  echo "[2/7] enable in-app media keepalive mode"
  run_shell "am start-foreground-service -n $SERVICE_COMPONENT -a $MEDIA_ACTION --ez extra_media_keepalive_enabled true >/dev/null 2>&1 || true"

  echo "[3/7] apply adb-safe keepalive policies"
  run_shell "cmd appops set $PKG RUN_ANY_IN_BACKGROUND allow || true"
  run_shell "cmd appops set $PKG RUN_IN_BACKGROUND allow || true"
  run_shell "cmd appops set $PKG SCHEDULE_EXACT_ALARM allow || true"
  run_shell "am set-inactive $PKG false || true"

  echo "[4/7] request battery optimization exemption state"
  run_shell "dumpsys deviceidle whitelist | grep $PKG || true"

  if [[ "$ALLOW_ROOT" == "1" ]] && has_root; then
    echo "[5/7] apply root keepalive policies"
    local uid
    uid="$(package_uid || true)"
    run_root "cmd deviceidle whitelist +$PKG || dumpsys deviceidle whitelist +$PKG || true"
    run_root "cmd appops set $PKG RUN_ANY_IN_BACKGROUND allow || true"
    run_root "cmd appops set $PKG RUN_IN_BACKGROUND allow || true"
    run_root "cmd appops set $PKG SCHEDULE_EXACT_ALARM allow || true"
    run_root "am set-inactive $PKG false || true"
    if [[ -n "$uid" ]]; then
      run_root "cmd netpolicy add restrict-background-whitelist $uid || true"
    fi
    if [[ "$DISABLE_DEVICEIDLE" == "1" ]]; then
      run_root "dumpsys deviceidle disable || true"
    fi
  else
    echo "[5/7] root disabled or unavailable, skip root-only policies"
  fi

  echo "[6/7] dump app standby, media session, and deviceidle state"
  run_shell "cmd appops get $PKG RUN_ANY_IN_BACKGROUND RUN_IN_BACKGROUND || true"
  run_shell "dumpsys usagestats appstandby | grep -A 8 $PKG || true"
  run_shell "dumpsys deviceidle whitelist | grep $PKG || true"
  run_shell "dumpsys media_session | grep silverlink-media-keepalive || true"
  run_shell "dumpsys alarm | grep HEARTBEAT_WAKEUP || true"

  echo "[7/7] trigger one immediate heartbeat path"
  if service_running; then
    run_shell "am start -n $MAIN_ACTIVITY_COMPONENT >/dev/null 2>&1 || true"
  fi

  echo "keepalive commands applied"
}

main "$@"
