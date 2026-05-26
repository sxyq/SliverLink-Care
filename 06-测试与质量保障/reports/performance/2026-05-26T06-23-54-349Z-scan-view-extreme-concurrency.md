# SilverLink 扫码查看与登记信息详细查看极限并发报告

- 生成时间：2026-05-26T06:23:54.347Z
- 基准主题：scan-view-extreme-concurrency
- 总请求数：400
- 成功数：400
- 失败数：0
- 平均耗时：61ms
- P50：56ms
- P95：110ms
- P99：127ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-resolve<br/>/api/scan/resolve | 80 | 80 | 0 | 74ms | 56ms | 127ms | 130ms | 130ms | 596B | 200:80 |
| scan-basic-info<br/>/api/scan/basic-info?elderId=elder-002&sessionId=scan-session-1779776633321 | 80 | 80 | 0 | 59ms | 58ms | 71ms | 74ms | 74ms | 647B | 200:80 |
| scan-archive<br/>/api/scan/archive?elderId=elder-002&sessionId=scan-session-1779776633321 | 80 | 80 | 0 | 59ms | 57ms | 75ms | 76ms | 76ms | 298B | 200:80 |
| scan-medications<br/>/api/scan/medications?elderId=elder-002&sessionId=scan-session-1779776633321 | 80 | 80 | 0 | 58ms | 55ms | 72ms | 109ms | 109ms | 632B | 200:80 |
| scan-scales<br/>/api/scan/scales?elderId=elder-002&sessionId=scan-session-1779776633321 | 80 | 80 | 0 | 56ms | 55ms | 67ms | 72ms | 72ms | 42B | 200:80 |

