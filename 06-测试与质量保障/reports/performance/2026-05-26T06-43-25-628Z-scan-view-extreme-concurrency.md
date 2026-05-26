# SilverLink 扫码查看与登记信息详细查看极限并发报告

- 生成时间：2026-05-26T06:43:25.624Z
- 基准主题：scan-view-extreme-concurrency
- 总请求数：3000
- 成功数：3000
- 失败数：0
- 平均耗时：611ms
- P50：347ms
- P95：1372ms
- P99：2305ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-resolve<br/>/api/scan/resolve | 600 | 600 | 0 | 828ms | 796ms | 2294ms | 2421ms | 2657ms | 596B | 200:600 |
| scan-basic-info<br/>/api/scan/basic-info?elderId=elder-002&sessionId=[REDACTED_SESSION] | 600 | 600 | 0 | 501ms | 283ms | 1115ms | 1417ms | 2153ms | 647B | 200:600 |
| scan-archive<br/>/api/scan/archive?elderId=elder-002&sessionId=[REDACTED_SESSION] | 600 | 600 | 0 | 470ms | 287ms | 1149ms | 1164ms | 1478ms | 298B | 200:600 |
| scan-medications<br/>/api/scan/medications?elderId=elder-002&sessionId=[REDACTED_SESSION] | 600 | 600 | 0 | 674ms | 627ms | 1455ms | 2269ms | 2584ms | 632B | 200:600 |
| scan-scales<br/>/api/scan/scales?elderId=elder-002&sessionId=[REDACTED_SESSION] | 600 | 600 | 0 | 584ms | 306ms | 1354ms | 1368ms | 1375ms | 42B | 200:600 |

