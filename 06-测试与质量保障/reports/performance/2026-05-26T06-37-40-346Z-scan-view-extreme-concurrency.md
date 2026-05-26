# SilverLink 扫码查看与登记信息详细查看极限并发报告

- 生成时间：2026-05-26T06:37:40.344Z
- 基准主题：scan-view-extreme-concurrency
- 总请求数：1500
- 成功数：1500
- 失败数：0
- 平均耗时：177ms
- P50：116ms
- P95：451ms
- P99：649ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-resolve<br/>/api/scan/resolve | 300 | 300 | 0 | 177ms | 147ms | 402ms | 454ms | 1109ms | 596B | 200:300 |
| scan-basic-info<br/>/api/scan/basic-info?elderId=elder-002&sessionId=[REDACTED_SESSION] | 300 | 300 | 0 | 148ms | 107ms | 416ms | 469ms | 493ms | 647B | 200:300 |
| scan-archive<br/>/api/scan/archive?elderId=elder-002&sessionId=[REDACTED_SESSION] | 300 | 300 | 0 | 187ms | 124ms | 417ms | 464ms | 494ms | 298B | 200:300 |
| scan-medications<br/>/api/scan/medications?elderId=elder-002&sessionId=[REDACTED_SESSION] | 300 | 300 | 0 | 272ms | 204ms | 647ms | 897ms | 1082ms | 632B | 200:300 |
| scan-scales<br/>/api/scan/scales?elderId=elder-002&sessionId=[REDACTED_SESSION] | 300 | 300 | 0 | 102ms | 92ms | 166ms | 369ms | 428ms | 42B | 200:300 |

