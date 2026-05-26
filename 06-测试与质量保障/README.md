# 智联名牌测试与质量保障

本目录用于集中管理项目级测试规划、测试脚本和测试报告，避免测试资料散落在各端目录中。

## 目录结构

- `docs/00-总览/`: 总体规划、测试基线、报告规范。
- `docs/01-单元测试/`: 函数级单元测试矩阵和单测策略。
- `docs/02-功能测试/`: 三端页面和业务流程测试。
- `docs/03-集成测试/`: 前后端、数据库、短信中转串联测试。
- `docs/04-性能测试/`: 构建体积、页面加载、接口响应、PDF 生成性能。
- `docs/05-安全与权限测试/`: 权限、签名、隐私、防串档测试。
- `docs/06-回归测试/`: 历史问题和部署前回归。
- `scripts/`: 按测试类型拆分的自动化脚本入口。
- `reports/`: 按测试类型拆分的测试报告输出。

## 当前阶段

当前已经进入“测试框架落地 + 覆盖率门禁 + 首批函数级用例”阶段。严格 100% 门禁已经接入，未达标会保留失败报告，作为继续补齐每个源码函数测试的清单。

1. 基础质量门禁：Git 状态、依赖安装、类型检查、构建检查。
2. 单元测试：按 `reports/unit/current/function-inventory.json` 逐函数补齐。
3. 功能冒烟：扫码端、志愿者/家属端、管理后台核心流程。
4. 集成测试：前后端 API 串联、短信中转、二维码验证、邀请码注册。
5. 性能测试：页面加载、关键接口响应、并发基础压测。
6. 安全测试：缺 token、错 token、缺签名、错签名、过期态、跨角色和防串档。
7. 回归报告：记录通过项、失败项、阻塞项、复测结果。

## 可执行入口

从仓库根目录执行：

```bash
python3 06-测试与质量保障/scripts/common/generate_function_inventory.py
bash 06-测试与质量保障/scripts/unit/run_unit_suite.sh
bash 06-测试与质量保障/scripts/regression/run_all_checks.sh
node 06-测试与质量保障/scripts/functional/live_readonly_smoke.mjs
node 06-测试与质量保障/scripts/security/api_negative_smoke.mjs
node 06-测试与质量保障/scripts/performance/api_latency_check.mjs
```

环境变量：

- `SILVERLINK_WEB_BASE_URL`: 覆盖前端页面根地址，默认 `http://sxyq27.online/silverlink`。
- `SILVERLINK_API_BASE_URL`: 覆盖 API 根地址，默认 `http://sxyq27.online`。
- `SILVERLINK_PERF_ITERATIONS`: 性能采样次数，默认 `20`。
- `SILVERLINK_PERF_CONCURRENCY`: 性能采样并发，默认 `4`。

## 基线提醒

开始正式测试前，应确认工作区是否干净，并明确本轮测试基于哪个 Git commit。报告脱敏脚本会处理 JWT、二维码 token、手机号、身份证号，但新增脚本也应避免写入真实敏感明文。
