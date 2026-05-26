# Failures And Risks

## Runtime Failures

本次最终回归没有发现阻断性运行失败。

| Category | Failed | Notes |
| --- | ---: | --- |
| 构建 | 0 | 三个前端、后端 jar、Android debug APK 均通过 |
| 现有自动化测试 | 0 | 后端 5 条、Android JVM 6 条，共 11 条通过 |
| 线上功能烟测 | 0 | 第二版 33/33 通过 |
| 轻量性能检查 | 0 | 三端静态页与核心 API 均 200 |

## Non-Blocking Findings

- `./gradlew` 文件当前没有执行权限，直接运行会返回 126；使用 `bash ./gradlew ...` 可以正常执行并通过。
- 管理后台接口必须携带签名头；无签名请求返回 `missing signature headers` 是符合当前后端拦截逻辑的表现。
- 第一版烟测中的 4 个 403 是测试数据不匹配权限导致，不是业务缺陷；第二版已用志愿者本人老人和家属本人老人重跑通过。

## Coverage Risks

- 当前前端三端没有 `test`、`coverage` 或 Playwright/E2E 测试脚本。
- 后端只有 3 个测试类，不能覆盖全部 controller、service、repository、加密、审计、二维码、家属、志愿者、短信中转函数。
- Android 目前只有 3 个 JVM 单元测试类，没有设备/仪器测试覆盖真实短信权限、后台服务、通知和系统限制。
- 本次没有执行 destructive API，例如删除、停用、重新生成、解绑、联系人修改等写操作，避免污染线上数据。
