# SilverLink 扫码查看与登记信息详细查看极限并发报告

- 生成时间：2026-05-26T06:29:16.073Z
- 基准主题：scan-view-extreme-concurrency
- 总请求数：750
- 成功数：750
- 失败数：0
- 平均耗时：63ms
- P50：57ms
- P95：105ms
- P99：131ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-resolve<br/>/api/scan/resolve | 150 | 150 | 0 | 73ms | 57ms | 131ms | 134ms | 135ms | 596B | 200:150 |
| scan-basic-info<br/>/api/scan/basic-info?elderId=elder-002&sessionId=[REDACTED_SESSION] | 150 | 150 | 0 | 58ms | 55ms | 78ms | 80ms | 82ms | 647B | 200:150 |
| scan-archive<br/>/api/scan/archive?elderId=elder-002&sessionId=[REDACTED_SESSION] | 150 | 150 | 0 | 69ms | 62ms | 97ms | 107ms | 108ms | 298B | 200:150 |
| scan-medications<br/>/api/scan/medications?elderId=elder-002&sessionId=[REDACTED_SESSION] | 150 | 150 | 0 | 60ms | 58ms | 79ms | 83ms | 86ms | 632B | 200:150 |
| scan-scales<br/>/api/scan/scales?elderId=elder-002&sessionId=[REDACTED_SESSION] | 150 | 150 | 0 | 57ms | 54ms | 77ms | 81ms | 83ms | 42B | 200:150 |

