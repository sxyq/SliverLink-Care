# SilverLink 本地并发设计缺陷探针报告

- 生成时间：2026-05-31T12:51:09.380503Z
- 目标：本机复现并发设计缺陷，不以本机绝对性能作为结论
- 结构化数据：2026-05-31T12-51-09-689Z-local-scan-write-design-probe.json

| 场景 | 请求数 | 并发 | 成功 | 失败 | 耗时 | 线程峰值增量 | 堆增量 | 关键发现 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| scan-verification-start-session-id-collision | 2000 | 256 | 2000 | 0 | 69ms | 64 | 25165824B | 当前会话 ID 生成策略在本地并发探针下未再出现主键冲突。 |
| scan-verification-direct-sms-session-id-collision | 2000 | 256 | 2000 | 0 | 30ms | 0 | 20971520B | 当前会话 ID 生成策略在本地并发探针下未再出现主键冲突。 |
| scan-verification-identity-session-id-collision | 2000 | 256 | 2000 | 0 | 46ms | 0 | -55023672B | 当前会话 ID 生成策略在本地并发探针下未再出现主键冲突。 |
| sms-relay-inbound-session-match-query | 120 | 40 | 120 | 0 | 146ms | 0 | 0B | handleInbound 已缩小到按 receiver_phone + message_body 精准匹配候选会话，不再按全部 PENDING 会话全量扫描。 |

## scan-verification-start-session-id-collision

- 请求数：2000
- 并发：256
- 成功：2000
- 失败：0
- 耗时：69ms
- JVM 指标：
  - 线程峰值增量：64
  - Heap 使用增量：25165824 bytes
  - GC 次数增量：0
  - GC 时间增量：0 ms
- 额外数据：{duplicateKeyFailures=0, otherFailures=0, uniqueSessionIds=2000, totalInsertAttempts=2000, collisionExamples=[]}
- 结论：
  - 当前会话 ID 生成策略在本地并发探针下未再出现主键冲突。

## scan-verification-direct-sms-session-id-collision

- 请求数：2000
- 并发：256
- 成功：2000
- 失败：0
- 耗时：30ms
- JVM 指标：
  - 线程峰值增量：0
  - Heap 使用增量：20971520 bytes
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
- 耗时：46ms
- JVM 指标：
  - 线程峰值增量：0
  - Heap 使用增量：-55023672 bytes
  - GC 次数增量：1
  - GC 时间增量：2 ms
- 额外数据：{duplicateKeyFailures=0, otherFailures=0, uniqueSessionIds=2000, totalInsertAttempts=2000, collisionExamples=[]}
- 结论：
  - 当前会话 ID 生成策略在本地并发探针下未再出现主键冲突。

## sms-relay-inbound-session-match-query

- 请求数：120
- 并发：40
- 成功：120
- 失败：0
- 耗时：146ms
- JVM 指标：
  - 线程峰值增量：0
  - Heap 使用增量：0 bytes
  - GC 次数增量：0
  - GC 时间增量：0 ms
- 额外数据：{perInboundAverageRowsScanned=0, verificationUpdates=7, scannedPendingRows=7, seedPendingSessions=8000, pendingSessionScanQueries=120}
- 结论：
  - handleInbound 已缩小到按 receiver_phone + message_body 精准匹配候选会话，不再按全部 PENDING 会话全量扫描。
  - 本地并发探针下，单次入站平均只访问极少量候选行，说明匹配策略已从 O(n) 全表扫描收敛到近似 O(1) 候选查询。

