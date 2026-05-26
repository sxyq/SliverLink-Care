# SilverLink 扫码查看与登记信息详细查看极限并发报告

- 生成时间：2026-05-26T06:57:04.467Z
- 基准主题：scan-view-extreme-concurrency
- 总请求数：40000
- 成功数：30531
- 失败数：9469
- 平均耗时：12551ms
- P50：11285ms
- P95：24958ms
- P99：40357ms

| 目标 | 请求数 | 成功 | 失败 | Avg | P50 | P95 | P99 | Max | 平均响应体 | 状态分布 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-resolve<br/>/api/scan/resolve | 8000 | 6669 | 1331 | 15128ms | 14999ms | 26790ms | 39067ms | 68319ms | 596B | 0:1331, 200:6669 |
| scan-basic-info<br/>/api/scan/basic-info?elderId=elder-002&sessionId=[REDACTED_SESSION] | 8000 | 6484 | 1516 | 16128ms | 14748ms | 39898ms | 40910ms | 81812ms | 647B | 0:1511, 200:6484, 500:5 |
| scan-archive<br/>/api/scan/archive?elderId=elder-002&sessionId=[REDACTED_SESSION] | 8000 | 5415 | 2585 | 9605ms | 9294ms | 21829ms | 24463ms | 28129ms | 298B | 0:1969, 200:5415, 500:616 |
| scan-medications<br/>/api/scan/medications?elderId=elder-002&sessionId=[REDACTED_SESSION] | 8000 | 5057 | 2943 | 12527ms | 11187ms | 24616ms | 45588ms | 47643ms | 632B | 0:2839, 200:5057, 500:104 |
| scan-scales<br/>/api/scan/scales?elderId=elder-002&sessionId=[REDACTED_SESSION] | 8000 | 6906 | 1094 | 9029ms | 8897ms | 17220ms | 20356ms | 33725ms | 42B | 0:593, 200:6906, 500:501 |

