#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
WEAPP_DIR="$ROOT_DIR/08-微信小程序端"
DEVTOOLS_CLI="${WECHAT_DEVTOOLS_CLI:-/Applications/wechatwebdevtools.app/Contents/MacOS/cli}"
PORT="${WECHAT_DEVTOOLS_PORT:-9420}"
REPORT_DIR="${REPORT_DIR:-$ROOT_DIR/06-测试与质量保障/reports/regression/$(date +%Y%m%d-%H%M%S)-weapp-devtools-check}"
RUN_LOCAL_CHECKS="${SILVERLINK_RUN_LOCAL_CHECKS:-1}"
RUN_CI_PREVIEW="${SILVERLINK_RUN_CI_PREVIEW:-0}"

mkdir -p "$REPORT_DIR/logs" "$REPORT_DIR/screenshots"

COMMANDS_LOG="$REPORT_DIR/commands.log"
SUMMARY_FILE="$REPORT_DIR/summary.md"
CONDITIONS_FILE="$REPORT_DIR/devtools-conditions.tsv"
MANUAL_CHECKLIST_FILE="$REPORT_DIR/manual-checklist.md"

overall_status="passed"
blocked_reason=""

record() {
  echo "$*" | tee -a "$COMMANDS_LOG"
}

run_logged() {
  local name="$1"
  shift

  record ""
  record "[$(date '+%F %T')] $name"
  record "command: $*"

  set +e
  "$@" >"$REPORT_DIR/logs/$name.log" 2>&1
  local status=$?
  set -e

  record "exit: $status"
  cat "$REPORT_DIR/logs/$name.log" | tee -a "$COMMANDS_LOG"
  return "$status"
}

mark_blocked() {
  overall_status="blocked"
  blocked_reason="$1"
  record "blocked: $blocked_reason"
}

mark_failed() {
  overall_status="failed"
  blocked_reason="$1"
  record "failed: $blocked_reason"
}

write_conditions() {
  node -e "const fs=require('fs'); const path=require('path'); const root=process.argv[1]; const cfg=JSON.parse(fs.readFileSync(path.join(root,'08-微信小程序端/project.config.json'),'utf8')); const list=cfg.condition?.miniprogram?.list||[]; console.log('name\\tpath\\tquery'); for (const item of list) console.log([item.name||'', item.path||'', item.query||''].join('\\t'));" "$ROOT_DIR" >"$CONDITIONS_FILE"
}

write_manual_checklist() {
  node -e "
const fs = require('fs');
const path = require('path');
const root = process.argv[1];
const output = process.argv[2];
const cfg = JSON.parse(fs.readFileSync(path.join(root, '08-微信小程序端/project.config.json'), 'utf8'));
const checks = {
  'scan-landing': ['页面能识别 elderId/archiveNo/source 参数', '落地态不会直接提示二维码无法识别', '进入验证或档案入口的按钮/提示可见'],
  'scan-verify': ['访问验证标题可见', '短信验证入口和一键跳转短信按钮可见', 'session/elder 防串档提示不被遮挡'],
  'scan-archive': ['携带 elderId + sessionId 后能进入受保护档案页', '缺数据/无权限态有明确文案', '页面无控制台红错'],
  'scan-medications': ['携带 elderId + sessionId 后能进入用药页', '空态/列表态布局不溢出', '页面无控制台红错'],
  'scan-scales': ['携带 elderId + sessionId 后能进入量表页', '分数/日期/空态格式正常', '页面无控制台红错'],
  'scan-nameplate': ['名牌预览正反面内容可见', '背面扫码提示可见', 'PDF/下载相关入口不会报错'],
  'workbench-elder-list': ['工作台老人列表页能加载', '登录/空态/列表态表现明确', '页面无控制台红错'],
  'workbench-elder-detail': ['携带 elderId 后进入老人详情', '基础信息/联系人/用药/量表入口可见', '页面无控制台红错'],
  'workbench-basic': ['老人基础信息页字段格式正常', '家属/志愿者权限态不混淆', '页面无控制台红错'],
  'workbench-medication': ['工作台用药页 GET/缓存 fallback 页面表现正常', '空态/列表态不溢出', '页面无控制台红错'],
  'workbench-scale': ['工作台量表页加载正常', '量表结果/空态格式正常', '页面无控制台红错'],
  'workbench-qrcode': ['二维码访问链接/图片区域可见', '复制链接、停用二维码、导出名牌入口可见', '页面无控制台红错'],
};
const list = cfg.condition?.miniprogram?.list || [];
const lines = [
  '# 微信小程序 DevTools 逐页复测清单',
  '',
  '前置条件：微信开发者工具当前账号 access token 对 appid ' + cfg.appid + ' 有效，且 DevTools CLI open/auto 不再出现 INVALID_LOGIN、access_token expired、需要重新登录。',
  '',
  '截图保存建议：将每个页面截图保存到本报告目录 screenshots/，文件名使用下表给出的 screenshot 列。',
  '',
  '| # | condition | path | query | screenshot | 验收点 |',
  '| --- | --- | --- | --- | --- | --- |',
];
list.forEach((item, index) => {
  const name = item.name || 'condition-' + String(index + 1).padStart(2, '0');
  const screenshot = 'screenshots/' + String(index + 1).padStart(2, '0') + '-' + name + '.png';
  const expected = checks[name] || ['页面可打开', '关键内容不遮挡', '页面无控制台红错'];
  lines.push('| ' + (index + 1) + ' | ' + name + ' | ' + (item.path || '') + ' | ' + (item.query || '') + ' | ' + screenshot + ' | ' + expected.join('<br>') + ' |');
});
lines.push('');
lines.push('真机补充：使用 CI preview 二维码扫码，至少覆盖相机权限弹窗、扫码落地、短信验证、受保护档案、二维码管理、名牌 PDF 打开。');
fs.writeFileSync(output, lines.join('\\n') + '\\n');
" "$ROOT_DIR" "$MANUAL_CHECKLIST_FILE"
}

has_login_error() {
  local log_file="$1"
  grep -Eq 'INVALID_LOGIN|access_token expired|需要重新登录|"login"[[:space:]]*:[[:space:]]*false' "$log_file"
}

write_summary() {
  {
    echo "# 微信小程序 DevTools 复测报告"
    echo
    echo "- 时间：$(date '+%F %T')"
    echo "- 小程序目录：$WEAPP_DIR"
    echo "- DevTools CLI：$DEVTOOLS_CLI"
    echo "- DevTools 端口：$PORT"
    echo "- 状态：$overall_status"
    if [[ -n "$blocked_reason" ]]; then
      echo "- 原因：$blocked_reason"
    fi
    echo
    echo "## 已记录文件"
    echo
    echo "- 命令日志：commands.log"
    echo "- DevTools condition 矩阵：devtools-conditions.tsv"
    echo "- 逐页手工验收清单：manual-checklist.md"
    echo "- 原始命令输出：logs/"
    echo
    echo "## 登录恢复后验收要求"
    echo
    echo "1. DevTools CLI open/auto 不再出现 INVALID_LOGIN、access_token expired、需要重新登录。"
    echo "2. 按 devtools-conditions.tsv 的 12 条 condition 逐页运行并截图。"
    echo "3. 真机扫描 CI 预览二维码，覆盖相机权限、扫码落地、短信验证、受保护档案、二维码、名牌 PDF。"
  } >"$SUMMARY_FILE"
}

if [[ ! -x "$DEVTOOLS_CLI" ]]; then
  mark_failed "WeChat DevTools CLI 不存在或不可执行: $DEVTOOLS_CLI"
  write_conditions
  write_manual_checklist
  write_summary
  echo "$REPORT_DIR"
  exit 2
fi

write_conditions
write_manual_checklist

if [[ "$RUN_LOCAL_CHECKS" == "1" ]]; then
  if ! run_logged weapp-local-checks bash "$ROOT_DIR/06-测试与质量保障/scripts/regression/run_weapp_local_checks.sh"; then
    mark_failed "小程序本地门禁失败，停止 DevTools 复测"
  fi
fi

if [[ "$overall_status" == "passed" ]]; then
  if ! run_logged devtools-islogin "$DEVTOOLS_CLI" islogin --project "$WEAPP_DIR" --port "$PORT" --lang zh; then
    mark_blocked "DevTools islogin 命令失败"
  elif has_login_error "$REPORT_DIR/logs/devtools-islogin.log"; then
    mark_blocked "DevTools 登录态不可用"
  fi
fi

if [[ "$overall_status" == "passed" ]]; then
  if ! run_logged devtools-open "$DEVTOOLS_CLI" open --project "$WEAPP_DIR" --port "$PORT" --lang zh --disable-gpu; then
    mark_blocked "DevTools open 命令失败"
  elif has_login_error "$REPORT_DIR/logs/devtools-open.log"; then
    mark_blocked "DevTools open 仍被登录 token 拦截"
  fi
fi

if [[ "$overall_status" == "passed" ]]; then
  if ! run_logged devtools-auto "$DEVTOOLS_CLI" auto --project "$WEAPP_DIR" --port "$PORT" --trust-project --lang zh; then
    mark_blocked "DevTools auto 命令失败"
  elif has_login_error "$REPORT_DIR/logs/devtools-auto.log"; then
    mark_blocked "DevTools auto 仍被登录 token 拦截"
  fi
fi

if [[ "$RUN_CI_PREVIEW" == "1" ]]; then
  if run_logged weapp-ci-preview bash -lc "cd '$WEAPP_DIR' && npm run ci:preview"; then
    cp "$WEAPP_DIR/miniprogram-ci-qrcode.png" "$REPORT_DIR/screenshots/miniprogram-ci-qrcode.png"
  elif [[ "$overall_status" == "passed" ]]; then
    mark_failed "微信 CI preview 失败"
  fi
fi

write_summary
echo "$REPORT_DIR"

case "$overall_status" in
  passed) exit 0 ;;
  blocked) exit 10 ;;
  *) exit 1 ;;
esac
