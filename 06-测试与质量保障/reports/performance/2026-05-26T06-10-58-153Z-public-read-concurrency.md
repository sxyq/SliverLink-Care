# SilverLink 公开页面与只读资源并发读取性能报告

- 生成时间：2026-05-26T06:10:58.149Z
- 基准主题：public-read-concurrency
- 总请求数：144
- 成功数：144
- 失败数：0
- 平均耗时：309ms
- P50：50ms
- P95：1956ms
- P99：3093ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-web-home<br/>http://sxyq27.online/silverlink/ | 24 | 24 | 0 | 61ms | 48ms | 105ms | 124ms | 124ms | 552B | 200:24 |
| admin-web-home<br/>http://sxyq27.online/silverlink/admin/ | 24 | 24 | 0 | 47ms | 48ms | 49ms | 50ms | 50ms | 446B | 200:24 |
| volunteer-web-home<br/>http://sxyq27.online/silverlink/volunteer/ | 24 | 24 | 0 | 48ms | 49ms | 50ms | 51ms | 51ms | 454B | 200:24 |
| invitation-preview<br/>http://sxyq27.online/silverlink-api/api/invitations/INVITE001/preview | 24 | 24 | 0 | 56ms | 51ms | 99ms | 99ms | 99ms | 203B | 200:24 |
| nameplate-preview<br/>http://sxyq27.online/silverlink-api/api/nameplates/elder-001/preview?blank=false | 24 | 24 | 0 | 55ms | 54ms | 59ms | 91ms | 91ms | 488B | 200:24 |
| nameplate-pdf<br/>http://sxyq27.online/silverlink-api/api/nameplates/elder-001/pdf | 24 | 24 | 0 | 1583ms | 1077ms | 3093ms | 5230ms | 5230ms | 33149B | 200:24 |

