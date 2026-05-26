# SilverLink 扫码查看与登记信息详细查看极限并发报告

- 生成时间：2026-05-26T06:43:14.878Z
- 基准主题：scan-view-extreme-concurrency
- 总请求数：2500
- 成功数：2500
- 失败数：0
- 平均耗时：487ms
- P50：336ms
- P95：1168ms
- P99：1301ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-resolve<br/>/api/scan/resolve | 500 | 500 | 0 | 546ms | 436ms | 1252ms | 1300ms | 2325ms | 596B | 200:500 |
| scan-basic-info<br/>/api/scan/basic-info?elderId=elder-002&sessionId=[REDACTED_SESSION] | 500 | 500 | 0 | 471ms | 327ms | 1139ms | 1176ms | 1201ms | 647B | 200:500 |
| scan-archive<br/>/api/scan/archive?elderId=elder-002&sessionId=[REDACTED_SESSION] | 500 | 500 | 0 | 574ms | 548ms | 1118ms | 1188ms | 1429ms | 298B | 200:500 |
| scan-medications<br/>/api/scan/medications?elderId=elder-002&sessionId=[REDACTED_SESSION] | 500 | 500 | 0 | 607ms | 579ms | 1285ms | 2194ms | 2441ms | 632B | 200:500 |
| scan-scales<br/>/api/scan/scales?elderId=elder-002&sessionId=[REDACTED_SESSION] | 500 | 500 | 0 | 239ms | 245ms | 382ms | 405ms | 418ms | 42B | 200:500 |

