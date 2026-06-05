# 本机嵌入式数据库写链路压测

- 生成时间：2026-05-31T14:33:57.096454Z
- 模式：本机嵌入式数据库（H2 MySQL mode）
- 目标：验证真实 JDBC / 真实主键约束 / 真实写 SQL 下的并发设计缺陷，而不是测宿主机跑分
- JSON 报告：2026-05-31T14-34-05-083Z-local-embeddeddb-write-pressure.json

## embedded-db-scan-start-write-pressure

- 总请求：120000
- 并发：8192
- 成功：120000
- 失败：0
- 成功率：100.0%
- P50：12ms
- P95：136ms
- P99：246ms
- Max：517ms
- 附加指标：
  - sessionRows: 120000
  - harnessWorkerCount: 512

## 总结

- 这轮已经把“本地真实数据库写链路压测”推进到嵌入式真实数据库层，使用了真实 JDBC、真实主键约束和真实 SQL。
- 它仍然不是 MySQL/Testcontainers，因此不能替代最终的 MySQL 专项结论，但已经比 fake-jdbc 探针更接近真实执行路径。
