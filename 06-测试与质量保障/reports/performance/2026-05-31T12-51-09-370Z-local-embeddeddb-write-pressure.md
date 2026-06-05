# 本机嵌入式数据库写链路压测

- 生成时间：2026-05-31T12:51:07.696114Z
- 模式：本机嵌入式数据库（H2 MySQL mode）
- 目标：验证真实 JDBC / 真实主键约束 / 真实写 SQL 下的并发设计缺陷，而不是测宿主机跑分
- JSON 报告：2026-05-31T12-51-09-370Z-local-embeddeddb-write-pressure.json

## embedded-db-scan-start-write-pressure

- 总请求：1500
- 并发：192
- 成功：1500
- 失败：0
- 成功率：100.0%
- P50：14ms
- P95：325ms
- P99：399ms
- Max：408ms
- 附加指标：
  - sessionRows: 1500

## embedded-db-direct-sms-write-pressure

- 总请求：1500
- 并发：192
- 成功：1500
- 失败：0
- 成功率：100.0%
- P50：0ms
- P95：6ms
- P99：21ms
- Max：44ms
- 附加指标：
  - sessionRows: 1500

## embedded-db-identity-write-pressure

- 总请求：1500
- 并发：192
- 成功：1500
- 失败：0
- 成功率：100.0%
- P50：0ms
- P95：39ms
- P99：62ms
- Max：107ms
- 附加指标：
  - sessionRows: 1500

## embedded-db-inbound-record-write-pressure

- 总请求：120
- 并发：24
- 成功：120
- 失败：0
- 成功率：100.0%
- P50：32ms
- P95：77ms
- P99：99ms
- Max：107ms
- 附加指标：
  - sessionRows: 5000
  - pendingRowsBefore: 5000
  - recordsInserted: 120
  - verifiedCountAfter: 1
- 结论：
  - 修复后，`recordId` 已切到 UUID，本轮高并发入站写入未再出现 `sms_relay_record` 主键冲突。
  - 在 5000 条待验证会话背景下，24 并发 / 120 次入站写入仍可全部成功，说明入站写链路的唯一键瓶颈已解除。
- 说明：
  - 这一段保留高并发，优先观察 `sms_relay_record` 写入和入站链路主键策略。

## embedded-db-inbound-candidate-lookup-latency

- 总请求：30
- 并发：1
- 成功：30
- 失败：0
- 成功率：100.0%
- P50：2ms
- P95：2ms
- P99：3ms
- Max：3ms
- 附加指标：
  - sessionRows: 5000
  - pendingRowsBefore: 5000
  - estimatedCandidateRowsUpperBound: 30
  - recordsInserted: 30
  - verifiedCountAfter: 1
- 结论：
  - 修复后，入站链路已切到按 receiver_phone + message_body 的候选查询，不再依赖全部 `PENDING` 会话全量扫描。
- 说明：
  - 这一段刻意把并发降到 1，避免写入主键冲突干扰，专门观察修复后候选查询的真实 JDBC 延迟。
  - 这里记录的是候选查询路径延迟，不是数据库执行计划采样。

## 总结

- 这轮已经把“本地真实数据库写链路压测”推进到嵌入式真实数据库层，使用了真实 JDBC、真实主键约束和真实 SQL。
- 它仍然不是 MySQL/Testcontainers，因此不能替代最终的 MySQL 专项结论，但已经比 fake-jdbc 探针更接近真实执行路径。
