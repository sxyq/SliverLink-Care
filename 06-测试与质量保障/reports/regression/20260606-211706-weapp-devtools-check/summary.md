# 微信小程序 DevTools 复测报告

- 时间：2026-06-06 21:17:07
- 小程序目录：/Users/sunyiyang/Desktop/Project/SilverLink Care/08-微信小程序端
- DevTools CLI：/Applications/wechatwebdevtools.app/Contents/MacOS/cli
- DevTools 端口：9420
- 状态：blocked
- 原因：DevTools open 仍被登录 token 拦截

## 已记录文件

- 命令日志：commands.log
- DevTools condition 矩阵：devtools-conditions.tsv
- 逐页手工验收清单：manual-checklist.md
- 原始命令输出：logs/

## 登录恢复后验收要求

1. DevTools CLI open/auto 不再出现 INVALID_LOGIN、access_token expired、需要重新登录。
2. 按 devtools-conditions.tsv 的 12 条 condition 逐页运行并截图。
3. 真机扫描 CI 预览二维码，覆盖相机权限、扫码落地、短信验证、受保护档案、二维码、名牌 PDF。
