# SilverLink 扫码查看与登记信息详细查看极限并发报告

- 生成时间：2026-05-26T06:37:32.106Z
- 基准主题：scan-view-extreme-concurrency
- 总请求数：1000
- 成功数：1000
- 失败数：0
- 平均耗时：90ms
- P50：65ms
- P95：315ms
- P99：376ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-resolve<br/>/api/scan/resolve | 200 | 200 | 0 | 81ms | 62ms | 147ms | 152ms | 153ms | 596B | 200:200 |
| scan-basic-info<br/>/api/scan/basic-info?elderId=elder-002&sessionId=[REDACTED_SESSION] | 200 | 200 | 0 | 106ms | 72ms | 359ms | 412ms | 431ms | 647B | 200:200 |
| scan-archive<br/>/api/scan/archive?elderId=elder-002&sessionId=[REDACTED_SESSION] | 200 | 200 | 0 | 64ms | 60ms | 91ms | 99ms | 104ms | 298B | 200:200 |
| scan-medications<br/>/api/scan/medications?elderId=elder-002&sessionId=[REDACTED_SESSION] | 200 | 200 | 0 | 137ms | 83ms | 363ms | 391ms | 440ms | 632B | 200:200 |
| scan-scales<br/>/api/scan/scales?elderId=elder-002&sessionId=[REDACTED_SESSION] | 200 | 200 | 0 | 63ms | 60ms | 86ms | 91ms | 93ms | 42B | 200:200 |

