# SilverLink 扫码查看与登记信息详细查看极限并发报告

- 生成时间：2026-05-26T06:43:06.574Z
- 基准主题：scan-view-extreme-concurrency
- 总请求数：2000
- 成功数：2000
- 失败数：0
- 平均耗时：279ms
- P50：178ms
- P95：881ms
- P99：1144ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-resolve<br/>/api/scan/resolve | 400 | 400 | 0 | 287ms | 234ms | 671ms | 785ms | 981ms | 596B | 200:400 |
| scan-basic-info<br/>/api/scan/basic-info?elderId=elder-002&sessionId=[REDACTED_SESSION] | 400 | 400 | 0 | 348ms | 221ms | 981ms | 1133ms | 2356ms | 647B | 200:400 |
| scan-archive<br/>/api/scan/archive?elderId=elder-002&sessionId=[REDACTED_SESSION] | 400 | 400 | 0 | 163ms | 150ms | 322ms | 494ms | 619ms | 298B | 200:400 |
| scan-medications<br/>/api/scan/medications?elderId=elder-002&sessionId=[REDACTED_SESSION] | 400 | 400 | 0 | 447ms | 342ms | 1083ms | 1207ms | 2145ms | 632B | 200:400 |
| scan-scales<br/>/api/scan/scales?elderId=elder-002&sessionId=[REDACTED_SESSION] | 400 | 400 | 0 | 149ms | 139ms | 278ms | 324ms | 433ms | 42B | 200:400 |

