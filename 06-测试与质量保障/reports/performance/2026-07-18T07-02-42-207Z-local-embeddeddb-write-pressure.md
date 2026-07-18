# 本机嵌入式数据库写链路压测

- 生成时间：2026-07-18T07:02:41.144837Z
- 模式：本机嵌入式数据库（H2 MySQL mode）
- 目标：验证真实 JDBC / 真实主键约束 / 真实写 SQL 下的并发设计缺陷，而不是测宿主机跑分
- JSON 报告：2026-07-18T07-02-42-207Z-local-embeddeddb-write-pressure.json

## embedded-db-scan-start-write-pressure

- 总请求：1500
- 并发：192
- 成功：0
- 失败：1500
- 成功率：0.0%
- P50：12ms
- P95：221ms
- P99：279ms
- Max：289ms
- 错误分布：
  - data-access-exception: 1500
- 附加指标：
  - sessionRows: 0
  - harnessWorkerCount: 192

## embedded-db-direct-sms-write-pressure

- 总请求：1500
- 并发：192
- 成功：0
- 失败：1500
- 成功率：0.0%
- P50：0ms
- P95：10ms
- P99：11ms
- Max：20ms
- 错误分布：
  - data-access-exception: 1500
- 附加指标：
  - sessionRows: 0
  - harnessWorkerCount: 192

## embedded-db-identity-write-pressure

- 总请求：1500
- 并发：192
- 成功：0
- 失败：1500
- 成功率：0.0%
- P50：0ms
- P95：16ms
- P99：18ms
- Max：32ms
- 错误分布：
  - data-access-exception: 1500
- 附加指标：
  - sessionRows: 0
  - harnessWorkerCount: 192

## embedded-db-inbound-record-write-pressure

- 总请求：120
- 并发：24
- 成功：0
- 失败：120
- 成功率：0.0%
- P50：1ms
- P95：6ms
- P99：10ms
- Max：11ms
- 错误分布：
  - data-access-exception: 120
- 附加指标：
  - sessionRows: 5000
  - harnessWorkerCount: 24
  - pendingRowsBefore: 5000
  - recordsInserted: 120
  - verifiedCountAfter: 0
- 结论：
  - 修复后，`recordId` 已切到 UUID，本轮高并发入站写入未再出现 `sms_relay_record` 主键冲突。
  - 在 5000 条待验证会话背景下，24 并发 / 120 次入站写入仍可全部成功，说明入站写链路的唯一键瓶颈已解除。
- 说明：
  - 这一段保留高并发，优先观察 `sms_relay_record` 写入和入站链路主键策略。

## embedded-db-inbound-candidate-lookup-latency

- 总请求：30
- 并发：1
- 成功：0
- 失败：30
- 成功率：0.0%
- P50：0ms
- P95：0ms
- P99：1ms
- Max：1ms
- 错误分布：
  - data-access-exception: 30
- 附加指标：
  - sessionRows: 5000
  - harnessWorkerCount: 1
  - pendingRowsBefore: 5000
  - estimatedCandidateRowsUpperBound: 30
  - recordsInserted: 30
  - verifiedCountAfter: 0
- 结论：
  - 修复后，入站链路已切到按 receiver_phone + message_body 的候选查询，不再依赖全部 `PENDING` 会话全量扫描。
- 说明：
  - 这一段刻意把并发降到 1，避免写入主键冲突干扰，专门观察修复后候选查询的真实 JDBC 延迟。
  - 这里记录的是候选查询路径延迟，不是数据库执行计划采样。

## 总结

- 这轮已经把“本地真实数据库写链路压测”推进到嵌入式真实数据库层，使用了真实 JDBC、真实主键约束和真实 SQL。
- 它仍然不是 MySQL/Testcontainers，因此不能替代最终的 MySQL 专项结论，但已经比 fake-jdbc 探针更接近真实执行路径。
