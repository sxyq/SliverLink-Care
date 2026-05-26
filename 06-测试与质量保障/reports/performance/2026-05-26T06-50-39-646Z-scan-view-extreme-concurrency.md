# SilverLink 扫码查看与登记信息详细查看极限并发报告

- 生成时间：2026-05-26T06:50:39.642Z
- 基准主题：scan-view-extreme-concurrency
- 总请求数：20000
- 成功数：19961
- 失败数：39
- 平均耗时：7573ms
- P50：6587ms
- P95：19883ms
- P99：20871ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-resolve<br/>/api/scan/resolve | 4000 | 3999 | 1 | 8718ms | 8581ms | 17792ms | 20352ms | 21370ms | 596B | 0:1, 200:3999 |
| scan-basic-info<br/>/api/scan/basic-info?elderId=elder-002&sessionId=[REDACTED_SESSION] | 4000 | 3997 | 3 | 9267ms | 8481ms | 20775ms | 21752ms | 40190ms | 647B | 0:3, 200:3997 |
| scan-archive<br/>/api/scan/archive?elderId=elder-002&sessionId=[REDACTED_SESSION] | 4000 | 4000 | 0 | 7050ms | 6013ms | 19749ms | 20256ms | 20783ms | 298B | 200:4000 |
| scan-medications<br/>/api/scan/medications?elderId=elder-002&sessionId=[REDACTED_SESSION] | 4000 | 3975 | 25 | 8892ms | 8154ms | 19957ms | 22343ms | 38985ms | 632B | 0:25, 200:3975 |
| scan-scales<br/>/api/scan/scales?elderId=elder-002&sessionId=[REDACTED_SESSION] | 4000 | 3990 | 10 | 3942ms | 3461ms | 8015ms | 8100ms | 10621ms | 42B | 0:10, 200:3990 |

