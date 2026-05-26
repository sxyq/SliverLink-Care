# SilverLink 扫码查看与登记信息详细查看极限并发报告

- 生成时间：2026-05-26T06:37:45.515Z
- 基准主题：scan-view-extreme-concurrency
- 总请求数：1500
- 成功数：1500
- 失败数：0
- 平均耗时：217ms
- P50：137ms
- P95：700ms
- P99：1151ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-resolve<br/>/api/scan/resolve | 300 | 300 | 0 | 202ms | 166ms | 452ms | 572ms | 926ms | 596B | 200:300 |
| scan-basic-info<br/>/api/scan/basic-info?elderId=elder-002&sessionId=[REDACTED_SESSION] | 300 | 300 | 0 | 171ms | 131ms | 439ms | 547ms | 995ms | 647B | 200:300 |
| scan-archive<br/>/api/scan/archive?elderId=elder-002&sessionId=[REDACTED_SESSION] | 300 | 300 | 0 | 120ms | 113ms | 212ms | 252ms | 265ms | 298B | 200:300 |
| scan-medications<br/>/api/scan/medications?elderId=elder-002&sessionId=[REDACTED_SESSION] | 300 | 300 | 0 | 464ms | 363ms | 1151ms | 1207ms | 2095ms | 632B | 200:300 |
| scan-scales<br/>/api/scan/scales?elderId=elder-002&sessionId=[REDACTED_SESSION] | 300 | 300 | 0 | 130ms | 124ms | 219ms | 273ms | 289ms | 42B | 200:300 |

