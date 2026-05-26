# 2026-05-26 其他测试执行记录

## 执行目标

在继续补单元测试之外，补跑最初规划中的其他测试类别，包括：

- 后端集成测试入口
- 线上只读功能烟测
- 安全负例烟测
- 性能采样
- 项目级全量回归
- Android 仪器测试尝试
- E2E 入口级只读烟测

本轮不修改业务实现，不部署服务器。

## 已执行项目

### 1. 后端集成测试入口

命令：

```bash
bash "06-测试与质量保障/scripts/integration/run_backend_integration.sh"
```

结果：

- 通过
- 报告目录：
  - `06-测试与质量保障/reports/integration/20260526-084830-backend`
- `maven-test-jacoco.log` 结果：
  - `Tests run: 214, Failures: 0, Errors: 0, Skipped: 0`
  - `BUILD SUCCESS`

说明：

- 当前这个“集成测试脚本”本质上还是后端 `./mvnw test jacoco:report` 聚合入口。
- 仓库当前 `04-统一后端/src/test` 中未检索到 `MySQLContainer`、`@Testcontainers`、`@Container` 等用例标记，因此本轮没有真正执行到 Testcontainers MySQL 链路。
- JaCoCo 仍有 Java 24 的 `Unsupported class file major version 68` 警告，但 Maven 最终成功。

### 2. 线上只读功能烟测

命令：

```bash
node "06-测试与质量保障/scripts/functional/live_readonly_smoke.mjs"
```

结果：

- 通过
- 报告：
  - `06-测试与质量保障/reports/functional/2026-05-26T00-48-46-946Z-live-readonly-smoke.json`

本轮检测到：

- `http://sxyq27.online/silverlink/` -> `200`
- `http://sxyq27.online/silverlink/admin/` -> `200`
- `http://sxyq27.online/silverlink/volunteer/` -> `200`

### 3. 安全负例烟测

命令：

```bash
node "06-测试与质量保障/scripts/security/api_negative_smoke.mjs"
```

结果：

- 通过
- 报告：
  - `06-测试与质量保障/reports/security/2026-05-26T00-48-56-149Z-api-negative-smoke.json`

已验证负例：

- 缺失管理员 token 访问 dashboard -> `401`
- 畸形扫码 token 解析 -> `404`
- 缺签名或缺 token 访问老人列表 -> `401`

### 4. 性能采样

命令：

```bash
node "06-测试与质量保障/scripts/performance/api_latency_check.mjs"
```

结果：

- 通过
- 报告：
  - `06-测试与质量保障/reports/performance/2026-05-26T00-49-01-982Z-api-latency.json`

指标：

- `iterations`: `20`
- `concurrency`: `4`
- `successCount`: `20`
- `failureCount`: `0`
- `P50`: `48ms`
- `P95`: `105ms`
- `P99`: `120ms`

### 5. 项目级全量回归

命令：

```bash
bash "06-测试与质量保障/scripts/regression/run_all_checks.sh"
```

结果：

- 通过
- 报告目录：
  - `06-测试与质量保障/reports/regression/20260526-084908-local-full-check`

本轮包含：

- 函数清单生成
- 扫码端 build/test
- 志愿者/家属端 build/test
- 管理后台 build/test
- 后端 `mvnw test jacoco:report`
- Android `testDebugUnitTest`

### 6. Android 仪器测试

命令：

```bash
cd "05-安卓短信中转端" && bash ./gradlew connectedDebugAndroidTest
```

结果：

- 未通过
- 失败原因：
  - `No connected devices!`

补充检查：

- `adb devices` 无法执行，当前环境提示：
  - `command not found: adb`

结论：

- 当前失败属于设备/工具链环境阻塞，不是测试断言失败。

### 7. E2E 入口只读烟测

命令：

```bash
node <只读 fetch 入口烟测脚本>
```

结果：

- 通过
- 报告：
  - `06-测试与质量保障/reports/e2e/2026-05-26T00-50-16-762Z-readonly-entry-smoke/e2e-readonly-entry-smoke.json`

说明：

- 当前是 `readonly-entry-smoke-node-fetch`。
- 本机 `npx` 不存在，`npx --version` 返回 `command not found: npx`。
- 因此仍然无法执行真实 Playwright CLI 浏览器交互流，这一项只能算入口可达性烟测，不能算完整 UI E2E。

## 本轮结论

本轮除 Android 仪器测试和真实 Playwright E2E 受环境阻塞外，其余“原规划里已具备脚本入口”的测试都已实际执行并留档：

- 后端集成入口：通过
- 功能烟测：通过
- 安全负例：通过
- 性能采样：通过
- 全量回归：通过
- E2E 入口只读烟测：通过
- Android connected instrumentation：环境阻塞

## 仍未真正覆盖到的原规划项

- 基于 Playwright 的真实浏览器交互 E2E
- Android 真机/模拟器上的 `connectedDebugAndroidTest`
- Testcontainers MySQL 真实数据库集成场景
- 更深入的安全专项：
  - nonce 重放
  - timestamp 过期
  - 跨角色访问
  - 跨老人 session 防串档
  - 敏感字段脱敏断言
