# SilverLink 公开页面与只读资源并发读取性能报告

- 生成时间：2026-05-26T06:08:40.262Z
- 基准主题：public-read-concurrency
- 总请求数：144
- 成功数：72
- 失败数：72
- 平均耗时：52ms
- P50：49ms
- P95：98ms
- P99：132ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-web-home<br/>http://sxyq27.online/silverlink/ | 24 | 24 | 0 | 61ms | 49ms | 105ms | 132ms | 132ms | 552B | 200:24 |
| admin-web-home<br/>http://sxyq27.online/silverlink/admin/ | 24 | 24 | 0 | 47ms | 47ms | 52ms | 53ms | 53ms | 446B | 200:24 |
| volunteer-web-home<br/>http://sxyq27.online/silverlink/volunteer/ | 24 | 24 | 0 | 47ms | 48ms | 51ms | 52ms | 52ms | 454B | 200:24 |
| invitation-preview<br/>http://sxyq27.online/api/invitations/INVITE001/preview | 24 | 0 | 24 | 0ms | 0ms | 0ms | 0ms | 0ms | 0B | 404:24 |
| nameplate-preview<br/>http://sxyq27.online/api/nameplates/elder-001/preview?blank=false | 24 | 0 | 24 | 0ms | 0ms | 0ms | 0ms | 0ms | 0B | 404:24 |
| nameplate-pdf<br/>http://sxyq27.online/api/nameplates/elder-001/pdf | 24 | 0 | 24 | 0ms | 0ms | 0ms | 0ms | 0ms | 0B | 404:24 |

