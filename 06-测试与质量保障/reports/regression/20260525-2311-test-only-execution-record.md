# 2026-05-25 23:11 只测试不改代码执行记录

## 执行原则

- 本轮按要求只继续测试与记录。
- 未修改业务源码。
- 仅新增测试执行记录与脚本自动生成的报告文件。
- 不提交、不部署、不连接服务器执行写操作。

## 已执行命令

| 类型 | 命令 | 结果 |
| --- | --- | --- |
| 本地全量构建与单测回归 | `bash 06-测试与质量保障/scripts/regression/run_all_checks.sh` | 通过 |
| 线上只读功能烟测 | `node 06-测试与质量保障/scripts/functional/live_readonly_smoke.mjs` | 通过 |
| 线上安全负例烟测 | `node 06-测试与质量保障/scripts/security/api_negative_smoke.mjs` | 通过 |
| 线上只读性能采样 | `node 06-测试与质量保障/scripts/performance/api_latency_check.mjs` | 通过 |
| 前端 100% 覆盖率门禁 | 三个前端分别执行 `npm run test:coverage` | 失败，符合预期 |

## 生成报告路径

- 本地全量构建与单测回归：
  - `06-测试与质量保障/reports/regression/20260525-231015-local-full-check`
- 线上只读功能烟测：
  - `06-测试与质量保障/reports/functional/2026-05-25T15-11-00-360Z-live-readonly-smoke.json`
- 线上安全负例烟测：
  - `06-测试与质量保障/reports/security/2026-05-25T15-11-00-437Z-api-negative-smoke.json`
- 线上只读性能采样：
  - `06-测试与质量保障/reports/performance/2026-05-25T15-11-00-516Z-api-latency.json`
- 前端覆盖率门禁：
  - `06-测试与质量保障/reports/unit/coverage-gate-20260525-2311`

## 本地全量回归结果

| 模块 | 结果 |
| --- | --- |
| 扫码端构建 | 通过 |
| 扫码端单测 | 13 个测试文件，52 个测试通过 |
| 志愿者/家属端构建 | 通过 |
| 志愿者/家属端单测 | 12 个测试文件，35 个测试通过 |
| 管理后台构建 | 通过 |
| 管理后台单测 | 8 个测试文件，31 个测试通过 |
| 后端 JUnit + JaCoCo | 通过 |
| Android JVM 单测 | 通过 |

## 线上只读功能烟测

| URL | 状态 | 耗时 |
| --- | ---: | ---: |
| `http://sxyq27.online/silverlink/` | 200 | 123 ms |
| `http://sxyq27.online/silverlink/admin/` | 200 | 47 ms |
| `http://sxyq27.online/silverlink/volunteer/` | 200 | 47 ms |

## 安全负例烟测

| 用例 | 状态 | 结论 |
| --- | ---: | --- |
| 管理后台 dashboard 缺 token | 401 | 通过 |
| 扫码 resolve 错 token | 404 | 通过 |
| 老人档案接口缺签名或 token | 401 | 通过 |

## 性能采样

- 目标：`http://sxyq27.online/silverlink/`
- 迭代次数：20
- 并发：4
- 失败数：0
- P50：45 ms
- P95：94 ms
- P99：110 ms
- Max：110 ms

## 当前覆盖率状态

| 模块 | 函数/方法覆盖率 | 语句/指令覆盖率 |
| --- | ---: | ---: |
| scan-client | 71.84% (125/174) | 66.10% (509/770) |
| volunteer-client | 27.80% (119/428) | 25.14% (316/1257) |
| admin-console | 20.60% (158/767) | 19.03% (405/2128) |
| backend | 55.71% (483/867) | 16.93% (2963/17497) |
| android-relay | XML 聚合待接入 | JVM 测试报告可用 |

## 结论

- 本轮测试执行通过了构建、单测、线上只读功能、安全负例、性能采样。
- 100% 覆盖率门禁继续保持开启，当前失败原因仍是覆盖率尚未达标，而不是测试运行错误。
- 线上只读烟测仅证明当前服务器入口可访问，不代表本地新修复已经部署。
- 之前发现并本地修复的家属端备用手机号发送问题仍未在本轮部署到服务器。
