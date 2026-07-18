# SilverLink 本地并发设计缺陷探针报告

- 生成时间：2026-07-18T05:48:18.720030Z
- 目标：本机复现并发设计缺陷，不以本机绝对性能作为结论
- 结构化数据：2026-07-18T05-48-18-920Z-local-scan-write-design-probe.json

| 场景 | 请求数 | 并发 | 成功 | 失败 | 耗时 | 线程峰值增量 | 堆增量 | 关键发现 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-verification-start-session-id-collision | 2000 | 256 | 2000 | 0 | 58ms | 64 | -45388176B | 当前会话 ID 生成策略在本地并发探针下未再出现主键冲突。 |
| scan-verification-direct-sms-session-id-collision | 2000 | 256 | 2000 | 0 | 19ms | 0 | 10485760B | 当前会话 ID 生成策略在本地并发探针下未再出现主键冲突。 |
| scan-verification-identity-session-id-collision | 2000 | 256 | 2000 | 0 | 27ms | 0 | 25165824B | 当前会话 ID 生成策略在本地并发探针下未再出现主键冲突。 |
| sms-relay-inbound-session-match-query | 120 | 40 | 120 | 0 | 80ms | 0 | 4194304B | handleInbound 已缩小到按 receiver_phone + message_body 精准匹配候选会话，不再按全部 PENDING 会话全量扫描。 |

## scan-verification-start-session-id-collision

- 请求数：2000
- 并发：256
- 成功：2000
- 失败：0
- 耗时：58ms
- JVM 指标：
  - 线程峰值增量：64
  - Heap 使用增量：-45388176 bytes
  - GC 次数增量：1
  - GC 时间增量：2 ms
- 额外数据：{duplicateKeyFailures=0, otherFailures=0, uniqueSessionIds=2000, totalInsertAttempts=2000, collisionExamples=[]}
- 结论：
  - 当前会话 ID 生成策略在本地并发探针下未再出现主键冲突。

## scan-verification-direct-sms-session-id-collision

- 请求数：2000
- 并发：256
- 成功：2000
- 失败：0
- 耗时：19ms
- JVM 指标：
  - 线程峰值增量：0
  - Heap 使用增量：10485760 bytes
  - GC 次数增量：0
  - GC 时间增量：0 ms
- 额外数据：{duplicateKeyFailures=0, otherFailures=0, uniqueSessionIds=2000, totalInsertAttempts=2000, collisionExamples=[]}
- 结论：
  - 当前会话 ID 生成策略在本地并发探针下未再出现主键冲突。

## scan-verification-identity-session-id-collision

- 请求数：2000
- 并发：256
- 成功：2000
- 失败：0
- 耗时：27ms
- JVM 指标：
  - 线程峰值增量：0
  - Heap 使用增量：25165824 bytes
  - GC 次数增量：0
  - GC 时间增量：0 ms
- 额外数据：{duplicateKeyFailures=0, otherFailures=0, uniqueSessionIds=2000, totalInsertAttempts=2000, collisionExamples=[]}
- 结论：
  - 当前会话 ID 生成策略在本地并发探针下未再出现主键冲突。

## sms-relay-inbound-session-match-query

- 请求数：120
- 并发：40
- 成功：120
- 失败：0
- 耗时：80ms
- JVM 指标：
  - 线程峰值增量：0
  - Heap 使用增量：4194304 bytes
  - GC 次数增量：0
  - GC 时间增量：0 ms
- 额外数据：{pendingSessionScanQueries=120, seedPendingSessions=8000, scannedPendingRows=0, verificationUpdates=0, perInboundAverageRowsScanned=0}
- 结论：
  - handleInbound 已缩小到按 receiver_phone + message_body 精准匹配候选会话，不再按全部 PENDING 会话全量扫描。
  - 本地并发探针下，单次入站平均只访问极少量候选行，说明匹配策略已从 O(n) 全表扫描收敛到近似 O(1) 候选查询。

