# 2026-05-25 测试体系实施摘要

## 本轮完成

- 三个前端接入 Vitest、Testing Library、jsdom、V8 coverage 和 100% 覆盖率门禁。
- 后端接入 JaCoCo、Testcontainers MySQL 依赖，并新增 DTO/entity/accessor 反射覆盖测试和 JWT 测试。
- Android 接入 Robolectric、MockWebServer、coroutines-test 和 JaCoCo 配置，并新增数据模型单测。
- 新增函数清单、覆盖率汇总、报告脱敏、单元聚合、只读功能烟测、安全负例烟测、性能采样、后端集成入口脚本。
- 新增首批函数级测试，覆盖前端工具函数、扫码端 API、志愿者/家属端 API、管理后台 API、RBAC 权限判断、CSV 导出等。
- 修复扫码端 `httpClient` header 合并顺序问题，避免调用方自定义 header 时丢失默认 `Content-Type`。
- 修复管理后台 `admin-layout.css` 中表格/工具栏样式块破损导致的 Vite CSS 解析告警。

## 已执行并通过

- `01-扫码用户端`: `npm run build`
- `02-志愿者填写端`: `npm run build`
- `03-管理后台端`: `npm run build`
- `bash 06-测试与质量保障/scripts/unit/run_unit_suite.sh`
- `node 06-测试与质量保障/scripts/functional/live_readonly_smoke.mjs`
- `node 06-测试与质量保障/scripts/security/api_negative_smoke.mjs`
- `node 06-测试与质量保障/scripts/performance/api_latency_check.mjs`

## 当前覆盖率

详见 `06-测试与质量保障/reports/unit/current/coverage-summary.md`。

| 模块 | 函数/方法覆盖率 | 说明 |
| --- | ---: | --- |
| scan-client | 17.24% | API 层和工具层已补一批，页面/组件/hook 未完成 |
| volunteer-client | 13.79% | API 层已补一批，页面/组件/store 未完成 |
| admin-console | 10.43% | `adminApi.ts` 自身函数覆盖接近完成，页面/组件未完成 |
| backend | 50.81% | 反射 getter/setter 和 JWT 测试已覆盖一批，service/controller/security/integration 仍需继续 |
| android-relay | pending XML aggregation | JVM 测试通过，Android JaCoCo XML 聚合仍需补脚本 |

## 仍未通过的严格门禁

- 三个前端 `npm run test:coverage` 均按预期失败，因为全项目函数覆盖率尚未达到 100%。
- 失败不是忽略项，而是后续补测清单的依据。

## 下一批优先级

1. 前端页面与组件：扫码端 `SmsVerifyPage`、`NameplatePreviewPage`、`useProtectedArchive`、`verificationStore`；志愿者/家属端登录、邀请码注册、老人列表、用药、量表页面；后台各管理表格和弹窗。
2. 后端核心服务：security signature、scan session、qrcode、family、volunteer、invitation、smsrelay、audit、nameplate。
3. 集成测试：Testcontainers MySQL 跑 Flyway、JWT、签名、二维码生成/解析、跨老人 session 拒绝、邀请码次数/过期。
4. Playwright E2E：三端登录/只读/表格尺寸/按钮点击/错误提示。
5. Android：receiver、worker、repository、service launcher、permission helper、网络失败重试。
