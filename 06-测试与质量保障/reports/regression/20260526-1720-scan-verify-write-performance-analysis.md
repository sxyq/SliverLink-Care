# 2026-05-26 扫码验证写链路性能分析

## 测试目标

在不继续做极限打穿的前提下，对线上扫码验证写链路做一轮受控压测，目标峰值并发约 `1000`，覆盖：

- `POST /api/scan/verification/start`
- `GET /api/scan/verification/status`
- `POST /api/scan/verification/identity`

说明：

- 本轮使用线上服务
- 参考已有备份：
  - `/opt/silverlink-care/backups/pre-perf-20260526-142753`
- 本轮属于“受控写压测”，不是继续追求极限阈值

## 使用脚本

- `06-测试与质量保障/scripts/performance/scan_verify_write_perf_check.mjs`

## 报告

- `06-测试与质量保障/reports/performance/2026-05-26T09-13-46-733Z-scan-verify-write-performance.json`
- `06-测试与质量保障/reports/performance/2026-05-26T09-13-46-733Z-scan-verify-write-performance.md`

## 压测参数

- `verification/start`
  - `1000` 请求
  - 并发 `1000`
- `verification/status`
  - `1000` 请求
  - 并发 `1000`
- `verification/identity`
  - `1000` 请求
  - 并发 `1000`

总请求：

- `3000`

## 总体结果

- 成功：`2134`
- 失败：`866`
- 成功率：`71.13%`
- `P50 = 694ms`
- `P95 = 2062ms`
- `P99 = 2748ms`

## 分接口结果

### 1. `verification/start`

- 成功：`664`
- 失败：`336`
- 成功率：`66.4%`
- `P95 = 2683ms`
- 状态分布：
  - `200 = 664`
  - `500 = 336`

### 2. `verification/status`

- 成功：`1000`
- 失败：`0`
- 成功率：`100%`
- `P95 = 1399ms`
- 状态分布：
  - `200 = 1000`

### 3. `verification/identity`

- 成功：`470`
- 失败：`530`
- 成功率：`47.0%`
- `P95 = 1814ms`
- 状态分布：
  - `200 = 470`
  - `500 = 530`

## 已确认的问题环节

### 1. 这轮的主要问题不再是 Nginx upstream 连接上限

和上一轮“扫码查看详情”不同，这轮访问日志中：

- `verification/start`
  - `665` 个 `200`
  - `336` 个 `500`
- `verification/identity`
  - `470` 个 `200`
  - `530` 个 `500`
- `verification/status`
  - `1000` 个 `200`

同时，本轮未看到与上一轮同量级的：

- `worker_connections are not enough while connecting to upstream`

这说明本轮主要瓶颈已经切换到了**应用/数据库写入路径**。

### 2. 失败样本直接指向 `scan_verification_session` 插入失败

失败样本中，`500` 响应体明确包含：

- `PreparedStatementCallback; SQL [insert into scan_verification_session ...]`

这说明：

- `verification/start` 的失败发生在 `insert into scan_verification_session`
- `verification/identity` 的失败也发生在 `insert into scan_verification_session`

### 3. 高概率根因：`sessionId` 生成方式在高并发下冲突

代码位置：

- `04-统一后端/src/main/java/com/silverlink/care/module/smsrelay/SmsRelayService.java`

当前实现：

- `createScanVerificationSession(...)`
  - `String sessionId = "scan-session-" + System.currentTimeMillis();`
- `createIdentityVerificationSession(...)`
  - `String sessionId = "scan-session-" + System.currentTimeMillis();`

数据库约束：

- `scan_verification_session.session_id` 是主键

证据：

- `show create table scan_verification_session`
  - `PRIMARY KEY (session_id)`

因此在 `1000` 并发下：

- 同一毫秒内多个请求极有可能生成相同 `sessionId`
- 相同主键写入会直接导致插入失败
- 这与本轮大量 `500` 的行为完全一致

### 4. `verification/status` 稳定，说明“查 session”本身不是当前第一问题

`verification/status` 在同样并发下：

- `1000 / 1000` 成功

这说明：

- 当前最脆弱的是“创建验证 session”
- 不是“读取验证 session”

## 当前结论

本轮受控写压测已经能明确给出以下结论：

1. 扫码验证写链路在 `1000` 并发下并不稳定
2. 不稳定的核心点集中在：
   - `verification/start`
   - `verification/identity`
3. 当前主因并不是代理层先扛不住
4. 当前主因是：
   - `scan_verification_session` 插入失败
   - 而最可能的根因是 `sessionId = "scan-session-" + System.currentTimeMillis()` 在高并发下发生主键冲突

## 直接优化建议

### 最高优先级

1. 立即替换 `sessionId` 生成策略
   - 不要再只用 `System.currentTimeMillis()`
   - 改为：
     - `UUID`
     - 或 `毫秒时间戳 + 随机后缀`
     - 或 `雪花 ID`

2. 对 `scan_verification_session.session_id` 冲突做更明确的异常处理
   - 当前直接走 `500`
   - 可以在应用层识别唯一键冲突并快速重试一次新的 sessionId

### 第二优先级

3. 给验证写链路补更细的压测分层
   - 分开测：
     - 单纯插入 session
     - 插入 session + 审计日志
     - 插入 session + 后续状态读取

4. 继续观察审计写入对验证链路的放大效应
   - 本轮主要失败点是 session 插入
   - 但审计写入仍然会增加整体延迟

## 后续还能做的性能测试点

基于当前进展，性能专项还可以继续做：

1. `nameplate pdf` 并发与长尾专项
2. 带系统指标采样的联合压测
   - Nginx
   - JVM
   - MySQL
3. 本地测试库下的验证写链路更高并发测试
   - 避免线上持续污染数据
4. 三个前端构建耗时和产物体积留档
5. Android 本地性能基线
