# SilverLink 扫码查看与登记信息详细查看极限并发报告

- 生成时间：2026-05-26T06:46:55.506Z
- 基准主题：scan-view-extreme-concurrency
- 总请求数：10000
- 成功数：9998
- 失败数：2
- 平均耗时：3259ms
- P50：2702ms
- P95：9598ms
- P99：10053ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-resolve<br/>/api/scan/resolve | 2000 | 2000 | 0 | 3861ms | 3422ms | 8697ms | 8917ms | 17112ms | 596B | 200:2000 |
| scan-basic-info<br/>/api/scan/basic-info?elderId=elder-002&sessionId=[REDACTED_SESSION] | 2000 | 1999 | 1 | 4136ms | 3542ms | 9615ms | 10102ms | 18832ms | 647B | 0:1, 200:1999 |
| scan-archive<br/>/api/scan/archive?elderId=elder-002&sessionId=[REDACTED_SESSION] | 2000 | 1999 | 1 | 2507ms | 2371ms | 4801ms | 5476ms | 9173ms | 298B | 0:1, 200:1999 |
| scan-medications<br/>/api/scan/medications?elderId=elder-002&sessionId=[REDACTED_SESSION] | 2000 | 2000 | 0 | 4010ms | 3408ms | 10041ms | 10520ms | 19239ms | 632B | 200:2000 |
| scan-scales<br/>/api/scan/scales?elderId=elder-002&sessionId=[REDACTED_SESSION] | 2000 | 2000 | 0 | 1780ms | 1807ms | 3154ms | 4787ms | 5207ms | 42B | 200:2000 |

