# SilverLink 扫码验证写链路性能报告

- 生成时间：2026-05-26T09:13:46.727Z
- 基准主题：scan-verify-write-performance
- 总请求数：3000
- 成功数：2134
- 失败数：866
- 平均耗时：850ms
- P50：694ms
- P95：2062ms
- P99：2748ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| verification-start<br/>/api/scan/verification/start | 1000 | 664 | 336 | 1287ms | 1367ms | 2683ms | 2879ms | 3242ms | 285B | 200:664, 500:336 |
| verification-status<br/>/api/scan/verification/status?sessionId=[REDACTED_SESSION] | 1000 | 1000 | 0 | 595ms | 415ms | 1399ms | 1624ms | 2412ms | 179B | 200:1000 |
| verification-identity<br/>/api/scan/verification/identity | 1000 | 470 | 530 | 774ms | 586ms | 1814ms | 2159ms | 2476ms | 220B | 200:470, 500:530 |

