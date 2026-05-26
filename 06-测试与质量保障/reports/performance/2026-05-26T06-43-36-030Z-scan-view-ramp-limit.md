# SilverLink 扫码查看链路并发极限阶梯测试

- 生成时间：2026-05-26T06:43:36.029Z
- API Base：http://sxyq27.online/silverlink-api
- 成功率阈值：90%
- 最高稳定并发：未测出
- 首个退化并发：200
- 首个成功率低于阈值并发：未出现

| 并发 | 单目标请求数 | 成功 | 失败 | 成功率 | P50 | P95 | P99 | 结果 | 说明 | 报告 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| 200 | 400 | 2000 | 0 | 100% | 178ms | 881ms | 1144ms | degraded | P95=881ms 超过 500ms | 2026-05-26T06-43-06-578Z-scan-view-extreme-concurrency.md |
| 400 | 500 | 2500 | 0 | 100% | 336ms | 1168ms | 1301ms | degraded | P95=1168ms 超过 500ms | 2026-05-26T06-43-14-880Z-scan-view-extreme-concurrency.md |
| 800 | 600 | 3000 | 0 | 100% | 347ms | 1372ms | 2305ms | degraded | P95=1372ms 超过 500ms | 2026-05-26T06-43-25-628Z-scan-view-extreme-concurrency.md |
| 1200 | 600 | 3000 | 0 | 100% | 376ms | 1385ms | 2193ms | degraded | P95=1385ms 超过 500ms | 2026-05-26T06-43-36-002Z-scan-view-extreme-concurrency.md |

