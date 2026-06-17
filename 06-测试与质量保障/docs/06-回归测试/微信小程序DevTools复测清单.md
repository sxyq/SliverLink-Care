# 微信小程序 DevTools 复测清单

**适用范围**：`08-微信小程序端`

**边界说明**：本清单仅用于后续小程序运行时/UI 专项复测，不属于当前代码层单元、性能、安全测试的完成条件。

**前置条件**：

- 微信开发者工具当前账号对 appid `wxd6f1eb971f5d4bc5` 的 access token 有效。
- `SILVERLINK_RUN_LOCAL_CHECKS=0 bash 06-测试与质量保障/scripts/regression/run_weapp_devtools_checks.sh` 不再返回 `INVALID_LOGIN`、`access_token expired` 或 `需要重新登录`。
- 本地小程序门禁已通过：`bash 06-测试与质量保障/scripts/regression/run_weapp_local_checks.sh`。

## 1. 复测命令

```bash
SILVERLINK_RUN_LOCAL_CHECKS=0 bash 06-测试与质量保障/scripts/regression/run_weapp_devtools_checks.sh
```

如需同时刷新微信 CI 预览二维码：

```bash
SILVERLINK_RUN_LOCAL_CHECKS=0 SILVERLINK_RUN_CI_PREVIEW=1 bash 06-测试与质量保障/scripts/regression/run_weapp_devtools_checks.sh
```

脚本会生成：

- `commands.log`
- `devtools-conditions.tsv`
- `manual-checklist.md`
- `logs/`
- `screenshots/`

## 2. 逐页截图要求

| # | condition | 页面 | 截图文件名 | 核心验收点 |
| --- | --- | --- | --- | --- |
| 1 | scan-landing | `subpackages/scan/landing/index` | `screenshots/01-scan-landing.png` | 识别 `elderId/archiveNo/source`；不误报二维码无法识别；验证/档案入口可见 |
| 2 | scan-verify | `subpackages/scan/verify/index` | `screenshots/02-scan-verify.png` | 访问验证标题；短信验证入口；一键跳转短信按钮；防串档提示 |
| 3 | scan-archive | `subpackages/scan/archive/index` | `screenshots/03-scan-archive.png` | `elderId + sessionId` 受保护档案；缺数据/无权限态明确；无控制台红错 |
| 4 | scan-medications | `subpackages/scan/medications/index` | `screenshots/04-scan-medications.png` | 用药页加载；空态/列表态布局正常；无控制台红错 |
| 5 | scan-scales | `subpackages/scan/scales/index` | `screenshots/05-scan-scales.png` | 量表页加载；分数/日期/空态格式正常；无控制台红错 |
| 6 | scan-nameplate | `subpackages/scan/nameplate/index` | `screenshots/06-scan-nameplate.png` | 名牌正反面；背面扫码提示；PDF/下载入口无报错 |
| 7 | workbench-elder-list | `subpackages/workbench/elder-list/index` | `screenshots/07-workbench-elder-list.png` | 工作台老人列表；登录/空态/列表态明确；无控制台红错 |
| 8 | workbench-elder-detail | `subpackages/workbench/elder-detail/index` | `screenshots/08-workbench-elder-detail.png` | 老人详情；基础信息/联系人/用药/量表入口；无控制台红错 |
| 9 | workbench-basic | `subpackages/workbench/basic/index` | `screenshots/09-workbench-basic.png` | 基础信息格式；家属/志愿者权限态不混淆；无控制台红错 |
| 10 | workbench-medication | `subpackages/workbench/medication/index` | `screenshots/10-workbench-medication.png` | 志愿者 GET/缓存 fallback 页面表现；空态/列表态不溢出；无控制台红错 |
| 11 | workbench-scale | `subpackages/workbench/scale/index` | `screenshots/11-workbench-scale.png` | 量表结果/空态格式；页面不遮挡；无控制台红错 |
| 12 | workbench-qrcode | `subpackages/workbench/qrcode/index` | `screenshots/12-workbench-qrcode.png` | 二维码链接/图片；复制链接；停用二维码；导出名牌 |

## 3. 真机补充

使用报告目录中的 `screenshots/miniprogram-ci-qrcode.png` 真机扫码，至少覆盖：

- 相机权限真实弹窗。
- 扫码落地页。
- 短信验证与“一键跳转短信”保底复制。
- 受保护档案、用药、量表页面。
- 工作台二维码与名牌 PDF 打开。
