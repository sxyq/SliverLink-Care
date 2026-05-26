# SilverLink 扫码查看与登记信息详细查看极限并发报告

- 生成时间：2026-05-26T06:35:24.855Z
- 基准主题：scan-view-extreme-concurrency
- 总请求数：1000
- 成功数：1000
- 失败数：0
- 平均耗时：95ms
- P50：62ms
- P95：323ms
- P99：366ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-resolve<br/>/api/scan/resolve | 200 | 200 | 0 | 83ms | 61ms | 164ms | 175ms | 178ms | 596B | 200:200 |
| scan-basic-info<br/>/api/scan/basic-info?elderId=elder-002&sessionId=[REDACTED_SESSION] | 200 | 200 | 0 | 65ms | 60ms | 98ms | 102ms | 107ms | 647B | 200:200 |
| scan-archive<br/>/api/scan/archive?elderId=elder-002&sessionId=[REDACTED_SESSION] | 200 | 200 | 0 | 120ms | 66ms | 350ms | 376ms | 410ms | 298B | 200:200 |
| scan-medications<br/>/api/scan/medications?elderId=elder-002&sessionId=[REDACTED_SESSION] | 200 | 200 | 0 | 142ms | 85ms | 360ms | 391ms | 575ms | 632B | 200:200 |
| scan-scales<br/>/api/scan/scales?elderId=elder-002&sessionId=[REDACTED_SESSION] | 200 | 200 | 0 | 65ms | 60ms | 99ms | 106ms | 108ms | 42B | 200:200 |

