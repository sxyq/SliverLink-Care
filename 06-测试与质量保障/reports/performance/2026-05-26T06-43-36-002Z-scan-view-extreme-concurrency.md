# SilverLink 扫码查看与登记信息详细查看极限并发报告

- 生成时间：2026-05-26T06:43:35.999Z
- 基准主题：scan-view-extreme-concurrency
- 总请求数：3000
- 成功数：3000
- 失败数：0
- 平均耗时：574ms
- P50：376ms
- P95：1385ms
- P99：2193ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-resolve<br/>/api/scan/resolve | 600 | 600 | 0 | 643ms | 482ms | 1384ms | 1708ms | 2773ms | 596B | 200:600 |
| scan-basic-info<br/>/api/scan/basic-info?elderId=elder-002&sessionId=[REDACTED_SESSION] | 600 | 600 | 0 | 686ms | 621ms | 2079ms | 2152ms | 2272ms | 647B | 200:600 |
| scan-archive<br/>/api/scan/archive?elderId=elder-002&sessionId=[REDACTED_SESSION] | 600 | 600 | 0 | 375ms | 277ms | 945ms | 1207ms | 1236ms | 298B | 200:600 |
| scan-medications<br/>/api/scan/medications?elderId=elder-002&sessionId=[REDACTED_SESSION] | 600 | 600 | 0 | 792ms | 717ms | 2188ms | 2311ms | 2447ms | 632B | 200:600 |
| scan-scales<br/>/api/scan/scales?elderId=elder-002&sessionId=[REDACTED_SESSION] | 600 | 600 | 0 | 373ms | 280ms | 1118ms | 1131ms | 1137ms | 42B | 200:600 |

