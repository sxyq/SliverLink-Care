# SilverLink 扫码验证写链路性能报告

- 生成时间：2026-05-31T07:13:06.834Z
- 基准主题：scan-verify-write-performance
- 总请求数：60
- 成功数：60
- 失败数：0
- 平均耗时：52ms
- P50：48ms
- P95：89ms
- P99：101ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| verification-start<br/>/api/scan/verification/start | 20 | 20 | 0 | 58ms | 49ms | 97ms | 101ms | 101ms | 318B | 200:20 |
| verification-status<br/>/api/scan/verification/status?sessionId=[REDACTED_SESSION] | 20 | 20 | 0 | 48ms | 43ms | 85ms | 89ms | 89ms | 212B | 200:20 |
| verification-identity<br/>/api/scan/verification/identity | 20 | 20 | 0 | 51ms | 51ms | 55ms | 55ms | 55ms | 253B | 200:20 |

