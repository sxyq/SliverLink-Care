# Coverage Gaps

本文件说明“已经执行的测试”和“真正做到所有函数级覆盖”之间的差距。

## Current Coverage Reality

当前项目已有自动化测试可以证明以下部分：

- 后端 Spring 上下文、微信 openid 解析兜底、管理员签名拦截器。
- Android 请求签名、短信解析、配置同步解析。
- 三个 Web 端 TypeScript 构建与 Vite 打包。
- 后端 Maven 测试与 jar 打包。
- Android JVM 单元测试与 debug APK 构建。
- 线上主链路 API 可用性、权限隔离、二维码验证 session 一致性。

当前项目不能证明以下部分已经函数级覆盖：

- 前端组件、hooks、API client、路由状态、表格列控制、弹窗、登录态清理、错误提示。
- 后端所有 controller/service/data service 方法。
- 二维码生成/停用/重新生成的全部异常分支。
- 家属注册、邀请码使用次数、过期、停用、重复注册等边界。
- 志愿者注册与资料修改的全部边界。
- SMS Relay inbound、heartbeat、设备配置、session 过期、短信匹配、签名失败分支。
- Android 后台服务、网络重试、权限缺失、短信读取、通知、前后台生命周期。
- 管理后台 UI 在多尺寸浏览器下的真实视觉回归。

## Why This Matters

用户要求“必须覆盖到所有功能”，这在工程上需要两层：

- 执行现有验证：本次已完成，结果见 `summary.md`。
- 补齐缺失测试资产：当前尚未完成，需要继续新增测试框架、mock 数据、函数级用例和 E2E 脚本。

如果现在直接宣称“所有函数均已覆盖”，是不准确的。正确结论是：当前主链路已通过回归，但函数级全覆盖仍需要继续实现。

## Required Next Work

| Area | Required Work |
| --- | --- |
| 前端单元测试 | 为三个前端引入 Vitest、Testing Library、jsdom，并覆盖 `src/api`、`src/hooks`、关键页面组件 |
| 前端 E2E | 引入 Playwright，覆盖扫码、志愿者、管理后台、家属注册/登录核心流程 |
| 后端单元测试 | 为 controller、service、security、data mapper、异常分支补 JUnit/Mockito 测试 |
| 后端集成测试 | 使用 Testcontainers 或测试库验证 MySQL migration、权限、签名、二维码、审计 |
| Android 单元测试 | 扩展 util/data/network/repository/service/viewmodel 测试 |
| Android 仪器测试 | 在 emulator 上覆盖短信权限、后台服务、通知、设备配置同步 |
| 性能测试 | 把本次轻量延迟采样升级为 k6/JMeter/Gatling 场景，增加并发、持续压测、阈值 |
| 安全测试 | 增加签名重放、过期 timestamp、无权限访问、跨老人 session、敏感字段脱敏自动断言 |
