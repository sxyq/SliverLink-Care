# 2026-05-25 23:18 其他测试类型执行记录

## 执行原则

- 本轮继续只测试、只记录。
- 未修改业务源码。
- 未部署服务器。
- 线上测试仅执行只读 GET 或安全负例请求，不执行新增、修改、删除。

## 覆盖的测试类型

| 类型 | 执行情况 | 结论 |
| --- | --- | --- |
| 后端集成 / JaCoCo | 已执行 `scripts/integration/run_backend_integration.sh` | 通过 |
| Android 仪器测试 | 已执行 `bash ./gradlew connectedDebugAndroidTest` | 环境阻塞，无连接设备 |
| E2E / 浏览器只读 | Playwright CLI 因缺少 `npx` 阻塞，执行 fetch fallback 只读检查 | fallback 通过 |
| 功能烟测 | 已执行 `live_readonly_smoke.mjs` | 通过 |
| 安全负例 | 已执行 `api_negative_smoke.mjs` | 通过 |
| 性能采样 | 已执行 `api_latency_check.mjs`，40 次、并发 6 | 通过 |
| 覆盖率汇总 | 已执行 `collect_coverage_summary.py` | 完成 |

## 生成报告路径

- 后端集成：
  - `06-测试与质量保障/reports/integration/20260525-231641-backend/maven-test-jacoco.log`
- E2E 只读 fallback：
  - `06-测试与质量保障/reports/e2e/20260525-2318-browser-smoke/e2e-readonly-smoke.json`
- 功能烟测：
  - `06-测试与质量保障/reports/functional/2026-05-25T15-18-33-010Z-live-readonly-smoke.json`
- 安全负例：
  - `06-测试与质量保障/reports/security/2026-05-25T15-18-33-316Z-api-negative-smoke.json`
- 性能采样：
  - `06-测试与质量保障/reports/performance/2026-05-25T15-18-33-764Z-api-latency.json`

## 后端集成结果

- 命令：`bash 06-测试与质量保障/scripts/integration/run_backend_integration.sh`
- 结果：通过。
- JUnit：214 个测试通过，0 失败，0 错误。
- JaCoCo：报告生成成功。
- 备注：Java 24 下仍有 JaCoCo `Unsupported class file major version 68` 警告，但 Maven 最终 `BUILD SUCCESS`。

## Android 仪器测试结果

- 命令：`bash ./gradlew connectedDebugAndroidTest`
- 结果：失败。
- 原因：`No connected devices!`
- 判断：环境阻塞，不是业务代码或测试用例失败。
- 已完成到的阶段：debug / androidTest APK 构建和打包完成，执行阶段因没有连接设备失败。

## E2E / 浏览器只读结果

- Playwright CLI 前置检查：失败。
- 阻塞原因：当前命令行环境没有 `npx`，不能使用 `~/.codex/skills/playwright/scripts/playwright_cli.sh`。
- fallback：使用 Node fetch 对三个线上入口做只读 E2E 可用性检查。

| URL | 状态 | HTML | Root | 耗时 |
| --- | ---: | --- | --- | ---: |
| `http://sxyq27.online/silverlink/` | 200 | 是 | 否 | 203 ms |
| `http://sxyq27.online/silverlink/admin/` | 200 | 是 | 是 | 50 ms |
| `http://sxyq27.online/silverlink/volunteer/` | 200 | 是 | 是 | 49 ms |

## 功能烟测结果

| URL | 状态 | 耗时 |
| --- | ---: | ---: |
| `http://sxyq27.online/silverlink/` | 200 | 约 100ms 级 |
| `http://sxyq27.online/silverlink/admin/` | 200 | 约 100ms 级 |
| `http://sxyq27.online/silverlink/volunteer/` | 200 | 约 100ms 级 |

## 安全负例结果

| 用例 | 期望状态 | 实际结论 |
| --- | --- | --- |
| 管理后台 dashboard 缺 token | 401 或 403 | 通过 |
| 扫码 resolve 错 token | 400 / 401 / 403 / 404 | 通过 |
| 老人档案接口缺签名或 token | 401 或 403 | 通过 |

## 性能采样结果

- 目标：`http://sxyq27.online/silverlink/`
- 迭代次数：40
- 并发：6
- 失败数：0
- P50：48 ms
- P95：109 ms
- P99：124 ms

## 当前覆盖率

| 模块 | 函数/方法覆盖率 | 语句/指令覆盖率 |
| --- | ---: | ---: |
| scan-client | 71.84% (125/174) | 66.10% (509/770) |
| volunteer-client | 27.80% (119/428) | 25.14% (316/1257) |
| admin-console | 20.60% (158/767) | 19.03% (405/2128) |
| backend | 55.71% (483/867) | 16.93% (2963/17497) |
| android-relay | XML 聚合待接入 | JVM 测试报告可用 |

## 尚未完成或受阻项目

- Playwright CLI 真实浏览器自动化：受阻于命令行缺少 `npx`。
- Android `connectedDebugAndroidTest`：受阻于无连接设备或模拟器。
- Android JaCoCo XML 聚合：待接入。
- Testcontainers MySQL 专项用例：依赖已接入，当前集成脚本仍是后端 JUnit/JaCoCo 聚合层，后续需要补独立容器数据库场景。
- 破坏性功能 E2E：未执行，按原则只能在本地测试库或 Testcontainers 中执行。

## 结论

- 最初规划中的功能、安全、性能、集成、Android 仪器可执行性、E2E 可用性检查已经继续推进。
- 除 Playwright CLI 和 Android 真机/模拟器执行受环境阻塞外，其余本轮执行项均通过。
- 本轮不代表 100% 覆盖率已达成；覆盖率门禁仍然保持严格失败状态。
