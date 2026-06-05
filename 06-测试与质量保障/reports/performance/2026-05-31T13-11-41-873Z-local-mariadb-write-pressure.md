# 本机 MariaDB 写链路压测

- 生成时间：2026-05-31T13:11:02.257403Z
- 模式：本机嵌入式 MariaDB4j（真实 MariaDB / 真实 JDBC / 真实 SQL）
- 目标：验证真实 MySQL 系数据库下的写链路并发行为，而不是测宿主机跑分
- JSON 报告：2026-05-31T13-11-41-873Z-local-mariadb-write-pressure.json

## mariadb-scan-start-write-pressure

- 总请求：10000
- 并发：512
- 成功：10000
- 失败：0
- 成功率：100.0%
- P50：52ms
- P95：271ms
- P99：809ms
- Max：1224ms
- 附加指标：
  - sessionRows: 10000
  - hikariMaximumPoolSize: 12
  - hikariMinimumIdle: 8

## mariadb-direct-sms-write-pressure

- 总请求：200
- 并发：64
- 成功：200
- 失败：0
- 成功率：100.0%
- P50：1ms
- P95：11ms
- P99：11ms
- Max：12ms
- 附加指标：
  - sessionRows: 200
  - hikariMaximumPoolSize: 12
  - hikariMinimumIdle: 8

## mariadb-identity-write-pressure

- 总请求：200
- 并发：64
- 成功：200
- 失败：0
- 成功率：100.0%
- P50：2ms
- P95：9ms
- P99：11ms
- Max：13ms
- 附加指标：
  - sessionRows: 200
  - hikariMaximumPoolSize: 12
  - hikariMinimumIdle: 8

## mariadb-inbound-record-write-pressure

- 总请求：120
- 并发：24
- 成功：120
- 失败：0
- 成功率：100.0%
- P50：29ms
- P95：95ms
- P99：129ms
- Max：138ms
- 附加指标：
  - sessionRows: 5000
  - hikariMaximumPoolSize: 12
  - hikariMinimumIdle: 8
  - pendingRowsBefore: 5000
  - recordsInserted: 120
  - verifiedCountAfter: 1
- 结论：
  - MariaDB 实库下，`recordId` 已切到 UUID，本轮高并发入站写入未再出现 `sms_relay_record` 主键冲突。
  - 在高密度待验证会话背景下，入站写链路仍可全部成功，说明唯一键瓶颈已解除。
- 说明：
  - 这一段保留高并发，优先观察 `sms_relay_record` 写入和入站链路主键策略。

## mariadb-inbound-candidate-lookup-latency

- 总请求：30
- 并发：1
- 成功：30
- 失败：0
- 成功率：100.0%
- P50：3ms
- P95：3ms
- P99：3ms
- Max：3ms
- 附加指标：
  - sessionRows: 5000
  - hikariMaximumPoolSize: 12
  - hikariMinimumIdle: 8
  - pendingRowsBefore: 5000
  - estimatedCandidateRowsUpperBound: 30
  - recordsInserted: 30
  - verifiedCountAfter: 1
- 结论：
  - MariaDB 实库下，入站链路已切到按 receiver_phone + message_body 的候选查询，不再依赖全部 `PENDING` 会话全量扫描。
- 说明：
  - 这一段刻意把并发降到 1，避免写入主键冲突干扰，专门观察修复后候选查询的真实 JDBC 延迟。
  - 这里记录的是候选查询路径延迟，不是数据库执行计划采样。

## 总结

- 这轮已经把“本地真实数据库写链路压测”推进到 MariaDB 实库层，使用了真实 JDBC、真实主键约束和真实 SQL。
- 它不是 Docker/Testcontainers，但已经是本机真实 MySQL 系数据库层证据，可用于验证锁、唯一键、候选查询和写路径延迟。
