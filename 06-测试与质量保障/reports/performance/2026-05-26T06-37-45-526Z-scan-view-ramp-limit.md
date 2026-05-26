# SilverLink 扫码查看链路并发极限阶梯测试

- 生成时间：2026-05-26T06:37:45.525Z
- API Base：http://sxyq27.online/silverlink-api
- 最高稳定并发：120
- 首个退化并发：160
- 首个失败并发：未出现

| 并发 | 单目标请求数 | 成功 | 失败 | P50 | P95 | P99 | 结果 | 说明 | 报告 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| 60 | 200 | 1000 | 0 | 65ms | 315ms | 376ms | passed | 未出现失败，且延迟保持在阈值内 | 2026-05-26T06-37-32-109Z-scan-view-extreme-concurrency.md |
| 80 | 250 | 1250 | 0 | 72ms | 354ms | 603ms | passed | 未出现失败，且延迟保持在阈值内 | 2026-05-26T06-37-35-262Z-scan-view-extreme-concurrency.md |
| 120 | 300 | 1500 | 0 | 116ms | 451ms | 649ms | passed | 未出现失败，且延迟保持在阈值内 | 2026-05-26T06-37-40-346Z-scan-view-extreme-concurrency.md |
| 160 | 300 | 1500 | 0 | 137ms | 700ms | 1151ms | degraded | P95=700ms 超过 500ms | 2026-05-26T06-37-45-516Z-scan-view-extreme-concurrency.md |

