# SilverLink 扫码查看与登记信息详细查看极限并发报告

- 生成时间：2026-07-18T17:21:57.225Z
- 基准主题：scan-view-extreme-concurrency
- 总请求数：100
- 成功数：100
- 失败数：0
- 平均耗时：52ms
- P50：44ms
- P95：119ms
- P99：125ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-resolve<br/>/api/scan/resolve | 20 | 20 | 0 | 73ms | 42ms | 125ms | 192ms | 192ms | 675B | 200:20 |
| scan-basic-info<br/>/api/scan/basic-info?elderId=elder-1784363829015&sessionId=[REDACTED_SESSION] | 20 | 20 | 0 | 54ms | 44ms | 72ms | 73ms | 73ms | 705B | 200:20 |
| scan-archive<br/>/api/scan/archive?elderId=elder-1784363829015&sessionId=[REDACTED_SESSION] | 20 | 20 | 0 | 43ms | 44ms | 47ms | 47ms | 47ms | 42B | 200:20 |
| scan-medications<br/>/api/scan/medications?elderId=elder-1784363829015&sessionId=[REDACTED_SESSION] | 20 | 20 | 0 | 43ms | 42ms | 48ms | 49ms | 49ms | 42B | 200:20 |
| scan-scales<br/>/api/scan/scales?elderId=elder-1784363829015&sessionId=[REDACTED_SESSION] | 20 | 20 | 0 | 45ms | 45ms | 50ms | 55ms | 55ms | 42B | 200:20 |
