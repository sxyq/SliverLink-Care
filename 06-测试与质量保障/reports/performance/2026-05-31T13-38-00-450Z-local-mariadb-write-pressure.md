# 本机 MariaDB 写链路压测

- 生成时间：2026-05-31T13:37:22.058539Z
- 模式：本机嵌入式 MariaDB4j（真实 MariaDB / 真实 JDBC / 真实 SQL）
- 目标：验证真实 MySQL 系数据库下的写链路并发行为，而不是测宿主机跑分
- JSON 报告：2026-05-31T13-38-00-450Z-local-mariadb-write-pressure.json

## mariadb-scan-start-write-pressure

- 总请求：20000
- 并发：1024
- 成功：20000
- 失败：0
- 成功率：100.0%
- P50：41ms
- P95：283ms
- P99：466ms
- Max：671ms
- 附加指标：
  - sessionRows: 20000
  - hikariMaximumPoolSize: 64
  - hikariMinimumIdle: 8

## mariadb-direct-sms-write-pressure

- 总请求：2000
- 并发：128
- 成功：2000
- 失败：0
- 成功率：100.0%
- P50：0ms
- P95：35ms
- P99：62ms
- Max：65ms
- 附加指标：
  - sessionRows: 2000
  - hikariMaximumPoolSize: 64
  - hikariMinimumIdle: 8

## mariadb-identity-write-pressure

- 总请求：2000
- 并发：128
- 成功：2000
- 失败：0
- 成功率：100.0%
- P50：0ms
- P95：23ms
- P99：35ms
- Max：62ms
- 附加指标：
  - sessionRows: 2000
  - hikariMaximumPoolSize: 64
  - hikariMinimumIdle: 8

## mariadb-inbound-record-write-pressure

- 总请求：30
- 并发：8
- 成功：30
- 失败：0
- 成功率：100.0%
- P50：14ms
- P95：17ms
- P99：24ms
- Max：24ms
- 附加指标：
  - sessionRows: 5000
  - hikariMaximumPoolSize: 64
  - hikariMinimumIdle: 8
  - pendingRowsBefore: 5000
  - recordsInserted: 30
  - verifiedCountAfter: 1
- 结论：
  - MariaDB 实库下，`recordId` 已切到 UUID，本轮高并发入站写入未再出现 `sms_relay_record` 主键冲突。
  - 在高密度待验证会话背景下，入站写链路仍可全部成功，说明唯一键瓶颈已解除。
- 说明：
  - 这一段保留高并发，优先观察 `sms_relay_record` 写入和入站链路主键策略。

## mariadb-inbound-candidate-lookup-latency

- 总请求：10
- 并发：1
- 成功：10
- 失败：0
- 成功率：100.0%
- P50：5ms
- P95：10ms
- P99：10ms
- Max：10ms
- 附加指标：
  - sessionRows: 5000
  - hikariMaximumPoolSize: 64
  - hikariMinimumIdle: 8
  - pendingRowsBefore: 5000
  - estimatedCandidateRowsUpperBound: 10
  - recordsInserted: 10
  - verifiedCountAfter: 1
- 结论：
  - MariaDB 实库下，入站链路已切到按 receiver_phone + message_body 的候选查询，不再依赖全部 `PENDING` 会话全量扫描。
- 说明：
  - 这一段刻意把并发降到 1，避免写入主键冲突干扰，专门观察修复后候选查询的真实 JDBC 延迟。
  - 这里记录的是候选查询路径延迟，不是数据库执行计划采样。

## 总结

- 这轮已经把“本地真实数据库写链路压测”推进到 MariaDB 实库层，使用了真实 JDBC、真实主键约束和真实 SQL。
- 它不是 Docker/Testcontainers，但已经是本机真实 MySQL 系数据库层证据，可用于验证锁、唯一键、候选查询和写路径延迟。
