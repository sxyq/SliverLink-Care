# SilverLink 公开页面与只读资源并发读取性能报告

- 生成时间：2026-05-26T06:12:04.879Z
- 基准主题：public-read-concurrency
- 总请求数：12
- 成功数：12
- 失败数：0
- 平均耗时：3180ms
- P50：2955ms
- P95：5859ms
- P99：5859ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| nameplate-pdf<br/>http://sxyq27.online/silverlink-api/api/nameplates/elder-001/pdf | 12 | 12 | 0 | 3180ms | 2955ms | 5859ms | 5859ms | 5859ms | 33149B | 200:12 |

