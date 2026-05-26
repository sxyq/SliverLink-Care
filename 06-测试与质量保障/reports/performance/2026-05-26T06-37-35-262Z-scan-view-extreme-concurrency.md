# SilverLink 扫码查看与登记信息详细查看极限并发报告

- 生成时间：2026-05-26T06:37:35.260Z
- 基准主题：scan-view-extreme-concurrency
- 总请求数：1250
- 成功数：1250
- 失败数：0
- 平均耗时：113ms
- P50：72ms
- P95：354ms
- P99：603ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-resolve<br/>/api/scan/resolve | 250 | 250 | 0 | 90ms | 72ms | 157ms | 169ms | 171ms | 596B | 200:250 |
| scan-basic-info<br/>/api/scan/basic-info?elderId=elder-002&sessionId=[REDACTED_SESSION] | 250 | 250 | 0 | 221ms | 99ms | 603ms | 963ms | 975ms | 647B | 200:250 |
| scan-archive<br/>/api/scan/archive?elderId=elder-002&sessionId=[REDACTED_SESSION] | 250 | 250 | 0 | 72ms | 66ms | 108ms | 118ms | 123ms | 298B | 200:250 |
| scan-medications<br/>/api/scan/medications?elderId=elder-002&sessionId=[REDACTED_SESSION] | 250 | 250 | 0 | 110ms | 78ms | 332ms | 407ms | 452ms | 632B | 200:250 |
| scan-scales<br/>/api/scan/scales?elderId=elder-002&sessionId=[REDACTED_SESSION] | 250 | 250 | 0 | 71ms | 66ms | 103ms | 130ms | 139ms | 42B | 200:250 |

