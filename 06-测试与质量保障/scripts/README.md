# 测试脚本目录

本目录用于存放项目级测试脚本。脚本按测试类型拆分，默认从仓库根目录执行，并把报告写入 `06-测试与质量保障/reports`。

## 分类目录

- `common/`: 函数清单、覆盖率汇总、报告脱敏。
- `unit/`: 单元测试聚合入口。
- `functional/`: 功能冒烟和只读页面可用性脚本。
- `integration/`: API 串联和数据库契约脚本。
- `performance/`: 接口耗时、页面性能脚本。
- `security/`: 权限、签名、隐私、防串档脚本。
- `regression/`: 历史问题专项回归脚本。

## 推荐脚本清单

- `common/generate_function_inventory.py`: 生成源码函数清单和覆盖矩阵。
- `common/collect_coverage_summary.py`: 汇总前端 V8/Istanbul、后端 JaCoCo、Android JVM 报告。
- `common/redact_reports.py`: 脱敏测试报告。
- `unit/run_unit_suite.sh`: 执行三端前端单测、后端 JUnit、Android JVM 单测。
- `functional/live_readonly_smoke.mjs`: 对页面入口做只读 GET 冒烟。
- `integration/run_backend_integration.sh`: 执行后端 JUnit/JaCoCo/Testcontainers 层。
- `performance/api_latency_check.mjs`: 轻量 P50/P95/P99 延迟采样。
- `security/api_negative_smoke.mjs`: 缺 token/错 token 等安全负例冒烟。
- `regression/run_all_checks.sh`: 项目级构建和测试回归入口。

## 脚本约定

- 所有脚本从仓库根目录运行。
- 所有输出写入 `06-测试与质量保障/reports/<本轮目录>/`。
- 脚本默认不修改业务代码、不自动提交、不部署服务器。
- 失败时返回非零退出码，并在报告中写明失败命令和日志位置。
- 涉及真实服务器、真实短信或数据库写入的脚本，必须提供显式参数开关。
- 线上默认只做 GET 或负例校验，不做新增、修改、删除。

## 下一步

继续补齐 Playwright E2E 和 Testcontainers 跨模块链路，并把 `function-inventory.json` 中每个函数映射到测试文件或覆盖报告。
