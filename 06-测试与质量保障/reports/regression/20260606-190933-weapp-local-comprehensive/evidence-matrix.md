# 微信小程序端测试证据矩阵

生成时间：2026-06-06

测试对象：`08-微信小程序端`

本矩阵按 `06-测试与质量保障/docs/00-总览/01-测试总规划.md` 和各层测试文档的粒度，汇总当前小程序端已取得的代码层证据、证据文件和本轮非目标。

| 测试层级 | 当前状态 | 已证明内容 | 关键证据 | 本轮非目标 |
| --- | --- | --- | --- | --- |
| 单元测试 | 已通过 | 22 条本地逻辑/契约检查通过；覆盖路由参数、启动上下文、权限矩阵、storage、auth/app/elder store、认证态隐私擦除、request queue、扫码入口、HTTP client、扫码 service、受保护读取、工作台用药、家属药品 void 响应、二维码/名牌 helper | `08-微信小程序端/scripts/unit/logic.test.ts`；`08-微信小程序端/scripts/unit/taro-stub.ts`；`08-微信小程序端/scripts/run-unit-tests.mjs`；`commands.log` 中 `test:unit 22/22 passed` | 真实微信平台 API、真机相机权限、真实文件系统行为 |
| 功能测试 | 代码层已通过 | Taro build 产出首页、登录、角色跳转、扫码分包 6 页、工作台分包 6 页；artifact 检查锁定关键页面、文案、二维码/名牌入口和 DevTools 12 条 condition；route contract 检查锁定 15 个路由、12 条导航契约和 0 个 `switchTab` 残留；platform contract 锁定 27 个 Taro 方法和 9 条平台能力契约；page privacy render 锁定 15 个页面和 14 个组件的页面隐私/危险渲染边界 | `08-微信小程序端/scripts/check-build-artifact.mjs`；`08-微信小程序端/scripts/check-route-contract.mjs`；`08-微信小程序端/scripts/check-platform-contract.mjs`；`08-微信小程序端/scripts/check-page-privacy-render.mjs`；`performance.json.checks.artifact`；`performance.json.checks.platformContract`；`performance.json.checks.pagePrivacyRender` | DevTools 模拟器真实页面截图和逐页点击 |
| 集成测试 | 代码层已通过 | 小程序 service 层用 mock Taro request 覆盖后端 URL/method/body/query/DTO 兼容；backend contract 检查确认 38 条小程序 API method/path 能匹配统一后端 94 条 controller route，并锁定 15 条 response shape 合约；route contract 检查确认 10 条受保护 query 合约；platform contract 和单测覆盖下载/PDF/文件系统 fallback 契约；微信 CI preview 完成服务端编译、打包、上传预览 | `logic.test.ts` service 契约用例；`08-微信小程序端/scripts/check-backend-contract.mjs`；`08-微信小程序端/scripts/check-route-contract.mjs`；`08-微信小程序端/scripts/check-platform-contract.mjs`；`08-微信小程序端/scripts/check-page-privacy-render.mjs`；`screenshots/miniprogram-ci-qrcode.png`；`logs/weapp-ci-preview-current.log` | 真机/DevTools 下真实 Cookie、合法域名、PDF 下载和文件系统闭环 |
| 性能测试 | 代码层已通过 | Taro 构建成功，耗时 13703/40000 ms；`dist` 73 个文件，529578 bytes；本地性能预算通过：总包 529578/2097152、扫码分包 55692/512000、工作台分包 78443/716800；微信 CI 包体为 scan 60271、workbench 86689、`__FULL__` 575877 bytes | `08-微信小程序端/scripts/run-build-performance-check.mjs`；`08-微信小程序端/scripts/check-performance-budget.mjs`；`performance.json.checks.buildWeapp`；`performance.json.checks.artifact`；`performance.json.checks.performanceBudget`；`performance.json.checks.wechatCiPreview` | 真机首屏、分包页面可见时间、PDF 打开耗时等运行时指标 |
| 安全与权限测试 | 代码层已通过 | 401 清登录态与认证态缓存、志愿者/家属权限矩阵、防串档 `sessionId + elderId`、跨老人提示、受保护读取 query 均纳入本地测试、route contract 或 artifact 检查；静态审计覆盖发布忽略、CI 私钥边界、HTTPS API fallback、HTTP cookie/401 清理和认证态隐私擦除不变量；page privacy render 覆盖字段分级、危险渲染 API、console、敏感 query/storage sink 和 QR/名牌图片源；dist security 覆盖发布产物泄漏面 | `logic.test.ts` 中 HTTP/权限/service 用例；`check-build-artifact.mjs` 中 session/elder/防串档断言；`08-微信小程序端/scripts/check-route-contract.mjs`；`08-微信小程序端/scripts/check-platform-contract.mjs`；`08-微信小程序端/scripts/check-page-privacy-render.mjs`；`08-微信小程序端/scripts/run-static-audit.mjs`；`08-微信小程序端/scripts/check-dist-security.mjs` | 真机合法域名、Cookie、文件系统、PDF 打开和页面渲染安全证据 |
| 回归测试 | 代码层本地门禁通过 | `run_weapp_local_checks.sh` 串联单测、静态审计、路由契约、平台契约、后端契约、页面隐私渲染、类型检查、构建耗时、dist security、artifact 和 performance budget 检查；`ci:upload` 通过 `preci:upload` 复用本地门禁；`check_weapp_evidence.mjs` 校验报告证据可追溯 | `06-测试与质量保障/scripts/regression/run_weapp_local_checks.sh`；`06-测试与质量保障/scripts/regression/check_weapp_evidence.mjs`；`failures.md` | DevTools/真机/UI 回放 |

## 当前结论

本地自动化、构建产物、service 契约、安全审计、页面隐私渲染审计、包体基线和 CI preview 已形成可复查证据链。本轮目标限定为代码层单元、性能、安全测试，因此 DevTools/真机交互证据不作为完成条件。

## 后续可选运行时项

1. 若未来重新要求运行时/UI 验证，可运行 `SILVERLINK_RUN_LOCAL_CHECKS=0 SILVERLINK_RUN_CI_PREVIEW=1 bash 06-测试与质量保障/scripts/regression/run_weapp_devtools_checks.sh`。
2. 若未来重新要求真机验证，可使用 `screenshots/miniprogram-ci-qrcode.png` 真机扫码补相机权限、扫码落地、短信验证、受保护档案、二维码管理、名牌 PDF 打开证据。
