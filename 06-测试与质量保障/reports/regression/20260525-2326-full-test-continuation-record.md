# 2026-05-25 23:26 全量测试继续执行记录

## 执行原则

- 本轮按用户要求继续测试，并覆盖最初规划中的其他测试类别。
- 本轮不修改业务源码，只运行测试、刷新已有覆盖率汇总、生成测试记录。
- 破坏性写操作未对线上执行；线上仅做只读入口、负例和可用性采样。
- CodeGraph 已确认可用：309 个文件、3631 个节点、5793 条边。

## 覆盖率现状

来源：`06-测试与质量保障/reports/unit/current/coverage-summary.md`

| 模块 | 函数/方法覆盖率 | 语句/指令覆盖率 | 状态 |
| --- | ---: | ---: | --- |
| 扫码端 | 71.84% (125/174) | 66.10% (509/770) | 未达 100% |
| 志愿者/家属端 | 27.80% (119/428) | 25.14% (316/1257) | 未达 100% |
| 管理后台 | 20.60% (158/767) | 19.03% (405/2128) | 未达 100% |
| 后端 | 55.71% (483/867) | 16.93% (2963/17497) | 未达 100% |
| Android 短信中转端 | 16.14% methods (41/254) | 8% instructions | 未达 100% |

Android 覆盖率来源：`05-安卓短信中转端/app/build/reports/coverage/test/debug/index.html`，该报告由 `bash ./gradlew createDebugUnitTestCoverageReport` 生成。

## 本轮已执行并通过

### 本地回归

命令：

```bash
bash 06-测试与质量保障/scripts/regression/run_all_checks.sh
```

结果：通过。

报告目录：

```text
06-测试与质量保障/reports/regression/20260525-232154-local-full-check
```

关键结果：

- 扫码端 build 通过。
- 扫码端单测：13 个测试文件，52 个测试通过。
- 志愿者/家属端 build 通过。
- 志愿者/家属端单测：12 个测试文件，35 个测试通过。
- 管理后台 build 通过。
- 管理后台单测：8 个测试文件，31 个测试通过。
- 后端 JUnit：214 个测试通过，0 失败，0 错误。
- Android JVM：`testDebugUnitTest` 通过。

### 后端集成/JUnit/JaCoCo 聚合

命令：

```bash
bash 06-测试与质量保障/scripts/integration/run_backend_integration.sh
```

结果：通过。

报告：

```text
06-测试与质量保障/reports/integration/20260525-232243-backend/maven-test-jacoco.log
```

说明：

- Maven 最终 `BUILD SUCCESS`。
- JaCoCo 在 Java 24 下仍有 `Unsupported class file major version 68` 警告，但未导致构建失败。
- 当前脚本仍是后端 JUnit/JaCoCo 聚合层；Testcontainers MySQL 专项业务场景尚未真正落地执行。

### 功能测试：线上只读烟测

命令：

```bash
node 06-测试与质量保障/scripts/functional/live_readonly_smoke.mjs
```

结果：通过。

报告：

```text
06-测试与质量保障/reports/functional/2026-05-25T15-22-44-029Z-live-readonly-smoke.json
```

覆盖入口：

- `http://sxyq27.online/silverlink/`，HTTP 200
- `http://sxyq27.online/silverlink/admin/`，HTTP 200
- `http://sxyq27.online/silverlink/volunteer/`，HTTP 200

### 安全测试：线上负例只读烟测

命令：

```bash
node 06-测试与质量保障/scripts/security/api_negative_smoke.mjs
```

结果：通过。

报告：

```text
06-测试与质量保障/reports/security/2026-05-25T15-22-44-086Z-api-negative-smoke.json
```

覆盖负例：

- 管理后台 dashboard 缺 token：返回 401，符合预期。
- 扫码 resolve 畸形 token：返回 404，符合预期允许范围。
- 管理后台 elders 缺签名或 token：返回 401，符合预期。

### 性能测试：线上入口延迟采样

命令：

```bash
node 06-测试与质量保障/scripts/performance/api_latency_check.mjs
```

结果：通过。

报告：

```text
06-测试与质量保障/reports/performance/2026-05-25T15-22-56-704Z-api-latency.json
```

结果：

- 迭代数：20
- 并发：4
- 成功：20
- 失败：0
- P50：45ms
- P95：92ms
- P99：115ms
- Max：115ms

### E2E：只读入口替代烟测

真实 Playwright E2E 未执行，原因是当前环境缺少 `npx`，且项目内未发现 Playwright 依赖。

替代执行：使用 Node fetch 对三个入口做只读页面烟测。

报告：

```text
06-测试与质量保障/reports/e2e/20260525T152501Z-readonly-entry-smoke/e2e-readonly-entry-smoke.json
```

结果：通过。

说明：这不是完整浏览器交互 E2E，不能替代按钮点击、表单提交、响应式布局等真实 Playwright 测试。

### Android JVM 覆盖率报告

命令：

```bash
cd 05-安卓短信中转端
bash ./gradlew createDebugUnitTestCoverageReport
```

结果：通过。

报告：

```text
05-安卓短信中转端/app/build/reports/coverage/test/debug/index.html
05-安卓短信中转端/app/build/reports/coverage/test/debug/report.xml
```

当前 Android JVM 覆盖率：

- Instructions：8%
- Branches：2%
- Methods：41/254，约 16.14%
- Classes：10/51，约 19.61%

## 本轮已执行但被环境阻塞

### Android 仪器测试

命令：

```bash
cd 05-安卓短信中转端
bash ./gradlew connectedDebugAndroidTest
```

结果：失败。

失败原因：

```text
Execution failed for task ':app:connectedDebugAndroidTest'.
com.android.builder.testing.api.DeviceException: No connected devices!
```

判断：当前没有连接真机或模拟器，属于环境阻塞，不是业务断言失败。

### Playwright 真浏览器 E2E

阻塞原因：

- `command -v npx` 未返回可用路径。
- 项目内未发现 `@playwright/test` 或 Playwright CLI 依赖。

判断：当前只能执行 Node fetch 入口替代烟测，尚不能执行真实浏览器交互。

### Testcontainers MySQL 专项集成

现状：

- 后端 `pom.xml` 已接入 Testcontainers 依赖。
- 当前未发现 `MySQLContainer` 或独立 Testcontainers 场景用例。
- 当前 shell 中 `docker info` 未返回可用 Docker Server 信息。

判断：本轮未执行真正的 Testcontainers MySQL 场景。要完成最初规划，需要新增专项用例，并保证本机 Docker 可用。

## 严格 100% 门禁结果

分别执行：

```bash
cd 01-扫码用户端 && npm run test:coverage
cd 02-志愿者填写端 && npm run test:coverage
cd 03-管理后台端 && npm run test:coverage
```

结果：三个前端测试用例均通过，但覆盖率门禁均失败。

这是预期结果，因为全局 100% coverage gate 已开启，当前覆盖率还未达到 100%。本轮没有降低门禁。

关键缺口：

- 扫码端：`App.tsx`、`SecurityProvider.tsx`、`HealthArchivePage.tsx`、`ScaleDetailPage.tsx`、`ScaleSummaryPage.tsx` 等。
- 志愿者/家属端：主 `App.tsx`、`AuthProvider.tsx`、家属端多个页面、志愿者端多个表单页面、共享工作台页面。
- 管理后台：几乎所有页面级组件仍未覆盖，尤其 `AuditLogPage`、`DashboardPage`、`VolunteerManagePage`、`QrCodeManagePage`、`RbacPage` 等。
- 后端：大量 controller/service/持久化/权限/审计/二维码/邀请/家属/志愿者业务分支仍未覆盖。
- Android：receiver、worker、repository、service、UI fragment、binding 生成类相关覆盖仍很低。

## 与最初规划的差距

已完成或已有证据：

- 函数清单生成。
- 三个前端 Vitest 基础测试与 100% 门禁。
- 后端 JUnit/JaCoCo 聚合。
- Android JVM 测试与 JVM 覆盖报告。
- 线上只读功能烟测。
- 安全负例烟测。
- 性能入口采样。
- E2E 入口替代烟测。

仍未完成：

- 三个前端函数覆盖率 100%。
- 后端方法覆盖率 100%。
- Android 方法覆盖率 100%。
- 真实 Playwright E2E。
- Android `connectedDebugAndroidTest`。
- Testcontainers MySQL 真实业务场景。
- 更完整的安全链路：nonce 重放、timestamp 过期、跨角色、跨老人 session、敏感字段脱敏。
- 更完整的性能链路：扫码验证链路、后台核心 API、本地测试库写链路。

## 下一步建议

1. 继续只补测试、不改业务逻辑：先补管理后台和志愿者/家属端页面级测试，因为当前覆盖率最低。
2. 准备 E2E 环境：安装 npm/npx 或引入 Playwright 测试依赖，再执行真实浏览器流程。
3. 准备 Android 环境：启动模拟器或连接真机后重跑 `connectedDebugAndroidTest`。
4. 准备 Docker 环境：确认 Docker Server 可用后新增并执行 Testcontainers MySQL 专项测试。
5. 如果允许修改测试代码，优先补 Testcontainers、安全专项和页面 handler 级测试，以最快推进 100% 覆盖目标。
