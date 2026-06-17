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

### 通用
- `common/generate_function_inventory.py`: 生成源码函数清单和覆盖矩阵，覆盖 01/02/03/04/05/08 模块。
- `common/collect_coverage_summary.py`: 汇总前端 V8/Istanbul、后端 JaCoCo、Android JVM 报告，并记录微信小程序代码层门禁证据。
- `common/redact_reports.py`: 脱敏测试报告。

### 单元测试
- `unit/run_unit_suite.sh`: 执行三端前端单测、微信小程序代码层单测、后端 JUnit、Android JVM 单测。

### 功能测试
- `functional/live_readonly_smoke.mjs`: 对页面入口做只读 GET 冒烟。

### 集成测试
- `integration/run_backend_integration.sh`: 执行后端 JUnit/JaCoCo/Testcontainers 层。

### 性能测试
- `performance/benchmark_utils.mjs`: 性能测试共享工具函数（请求采样、统计计算、报告输出）。
- `performance/api_latency_check.mjs`: 轻量 P50/P95/P99 延迟采样。
- `performance/public_read_concurrency_check.mjs`: 公开页面与只读资源并发读取。
- `performance/admin_api_latency_check.mjs`: 管理后台只读 API 延迟采样。
- `performance/scan_view_extreme_concurrency_check.mjs`: 扫码查看链路高强度读取。
- `performance/scan_view_ramp_limit_check.mjs`: 扫码查看链路阶梯升压。
- `performance/scan_view_multiprocess_sharded_check.mjs`: 扫码查看多进程分片压测。
- `performance/scan_verify_write_perf_check.mjs`: 扫码验证写链路压力测试。
- `performance/run_local_design_concurrency_probe.sh`: 本地 JVM 级并发设计探针。
- `performance/run_local_design_concurrency_with_metrics.sh`: 本地 JVM 级探针 + 资源采样。
- `performance/run_local_embeddeddb_write_perf.sh`: 本机嵌入式数据库写链路压测。
- `performance/run_local_embeddeddb_write_with_metrics.sh`: 本机嵌入式数据库写压 + 资源采样。
- `performance/prepare_mariadb_compat_libs.sh`: 为本机 MariaDB4j 准备兼容动态库。
- `performance/run_local_mariadb_write_perf.sh`: 本机 MariaDB4j 实库写链路压测。
- `performance/run_local_mariadb_write_with_metrics.sh`: 本机 MariaDB4j 实库写压 + 资源采样。
- `performance/run_local_mariadb_read_perf.sh`: 本机 MariaDB4j 实库读链路优化前后对比。
- `performance/run_nameplate_pdf_perf.sh`: 名牌 PDF 本地并发与长尾基线。
- `performance/run_frontend_build_artifact_metrics.sh`: 三个前端 build / dist / gzip 留档。
- `performance/run_android_local_perf_baseline.sh`: Android 本地解析、签名、上传基线。
- `performance/run_browser_page_load_baseline.sh`: 真实浏览器页面加载基线入口。
- `performance/browser_page_load_baseline.py`: 浏览器页面加载基线 Python 执行脚本。

### 安全测试
- `security/api_negative_smoke.mjs`: 缺 token/错 token 等安全负例冒烟。

### 回归
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
