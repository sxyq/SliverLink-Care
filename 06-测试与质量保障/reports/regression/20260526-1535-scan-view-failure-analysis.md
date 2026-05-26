# 2026-05-26 扫码查看链路极限并发故障环节分析

## 分析范围

- 线上备份后的正式极限并发测试结果
- 重点分析成功率跌破 `90%` 的这一轮
- 目标链路：
  - `POST /api/scan/resolve`
  - `GET /api/scan/basic-info`
  - `GET /api/scan/archive`
  - `GET /api/scan/medications`
  - `GET /api/scan/scales`

## 关键报告

- `06-测试与质量保障/reports/performance/2026-05-26T06-57-04-472Z-scan-view-extreme-concurrency.md`
- `06-测试与质量保障/reports/performance/2026-05-26T06-57-04-531Z-scan-view-ramp-limit.md`
- `06-测试与质量保障/reports/regression/20260526-1500-scan-view-below-90-threshold.md`

## 阈值轮整体结果

- 并发：`8000`
- 每个目标请求数：`8000`
- 总请求数：`40000`
- 成功：`30531`
- 失败：`9469`
- 成功率：`76.33%`
- `P50 = 11285ms`
- `P95 = 24958ms`
- `P99 = 40357ms`

## 分环节表现

### 1. `scan-resolve`

- 请求：`8000`
- 成功：`6669`
- 失败：`1331`
- `500 = 0`
- `0 = 1331`
- 结论：
  - 没有明显业务异常
  - 主要是等待时间过长后，客户端侧拿不到有效 HTTP 响应

### 2. `scan-basic-info`

- 请求：`8000`
- 成功：`6484`
- 失败：`1516`
- `500 = 5`
- `0 = 1511`
- 结论：
  - 仍以排队/超时为主
  - 少量服务端错误，但不是主要故障点

### 3. `scan-archive`

- 请求：`8000`
- 成功：`5415`
- 失败：`2585`
- `500 = 616`
- `0 = 1969`
- 结论：
  - 是最明显的 `500` 热点之一
  - 结合同时间段 Nginx 错误日志，这批 `500` 当前更像是代理层在上游连接耗尽时返回的错误
  - 同时也存在大量连接等待失败

### 4. `scan-medications`

- 请求：`8000`
- 成功：`5057`
- 失败：`2943`
- `500 = 104`
- `0 = 2839`
- 结论：
  - 总失败率最高
  - 但主要还是排队/连接层拿不到响应
  - 中等数量的 `500` 也能与 Nginx 上游连接耗尽错误对上

### 5. `scan-scales`

- 请求：`8000`
- 成功：`6906`
- 失败：`1094`
- `500 = 501`
- `0 = 593`
- 结论：
  - 总失败率不算最高
  - 但 `500` 数量非常高
  - 已明确能在 Nginx 错误日志中对上 `worker_connections` 不足
  - 因此这是一个明确的代理层热点

## 已确认的第一层瓶颈

线上 Nginx 错误日志在压测时持续出现：

- `768 worker_connections are not enough while connecting to upstream`

证据路径：

- `/etc/nginx/nginx.conf`
  - `worker_connections 768`
- `/var/log/nginx/sxyq27-non-vulnscan.error.log`

这说明：

1. 在极限并发下，最先被打满的不是业务 SQL 本身，而是 **Nginx 到上游 Spring Boot 的连接数上限**。
2. 这能直接解释大量客户端侧 `0` 状态。
3. Nginx access log 中还能看到少量 `499`，说明部分请求在客户端等待过久后主动断开。
4. `basic-info / archive / medications / scales` 的一批 `500` 也能在同一时间段与该错误对上，因此当前**不能直接把这些 `500` 归因到 Java 业务异常**。

## 已确认的第二层放大因素

### 每个“查看详情”请求并不是纯读

扫码查看接口在成功返回前后都会同步写审计日志：

- `04-统一后端/src/main/java/com/silverlink/care/module/scan/ScanController.java`
- `04-统一后端/src/main/java/com/silverlink/care/module/audit/AuditLogService.java`
- `04-统一后端/src/main/java/com/silverlink/care/infrastructure/persistence/SilverLinkDataService.java`

实际行为：

- `resolve` 会写 `SCAN_QR`
- `archive` 会写 `VIEW_ARCHIVE`
- `basic-info` 会写 `VIEW_BASIC_INFO`
- `medications` 会写 `VIEW_MEDICATIONS`
- `scales` 会写 `VIEW_SCALES`

对应持久化动作是同步执行的：

- `insert into audit_log (...) values (...)`

这意味着：

- 表面上是“读压测”
- 实际上每个请求都带一次数据库写入
- 并发越高，`audit_log` 写放大越明显

## 已确认的第三层放大因素

### 详细查看前，每次还要查验证会话

所有详细接口都会先执行：

- `SmsRelayService.authorizeVerifiedSession(sessionId, elderId, target)`

这里至少会做：

- `select * from scan_verification_session where session_id=?`

也就是说：

- `basic-info`
- `archive`
- `medications`
- `scales`

每次请求都不是一次查询结束，而是：

1. 先查验证 session
2. 再查业务表
3. 再写 audit_log

## 已确认的第四层放大因素

### 明细查询存在逐行解密/解析开销

热点方法：

- `SilverLinkDataService.medications(String elderId)`
  - `select * from medication where elder_id=? order by updated_at desc`
  - 每条记录都要 `dec(...)`
- `SilverLinkDataService.scales(String elderId)`
  - `select * from scale_record where elder_id=? order by created_at desc`
  - 每条记录都要 `dec(payload_enc)` + `parseScaleAnswers(...)`
- `SilverLinkDataService.health(String elderId)`
  - 查最近健康记录
- `SilverLinkDataService.elderDetail(...)`
  - 包含多字段解密

这会放大上游占用时间，解释为什么：

- `archive` 与 `scales` 更容易进入高延迟区
- `medications` 的总失败率也高
- 在连接数本来就紧张时，更容易把代理层推到上限

## 当前环境侧约束

线上当前确认到的参数：

- Nginx：
  - `worker_connections = 768`
- MySQL：
  - `max_connections = 151`
  - `innodb_buffer_pool_size = 134217728` (`128MB`)
- Spring Boot 配置：
  - 未看到显式的 Tomcat 线程池/Hikari 连接池调优

这说明线上目前更接近“默认配置直跑”，而不是为高并发链路做过专项调优。

## 当前结论

按影响顺序，当前问题环节可以概括为：

1. **Nginx upstream 连接数先被打满**
   - 直接导致大量 `0` 状态
   - 同时也解释了相当一部分 `500`
2. **查看接口并非纯读，审计日志同步写入放大压力**
   - 导致数据库写压力上升
3. **详细接口每次都要做 session 校验查询**
   - 进一步增加数据库读取压力
4. **`archive / scales / medications` 存在较重的查询后处理**
   - 解密、payload 解析、对象组装
5. **应用和数据库参数未做高并发专项调优**
   - 默认容量较容易被极端单点并发打穿

## 性能测试剩余内容

当前仍值得继续做的性能测试：

### 1. 扫码验证写链路性能

还没深压这些接口：

- `POST /api/scan/verification/start`
- `GET /api/scan/verification/status`
- `POST /api/scan/verification/identity`

这部分更接近真实验证链路，而且会直接覆盖写路径。

### 2. 管理后台热点接口极限并发

优先：

- `GET /api/admin/audit-logs`
- `GET /api/admin/qrcodes`
- `GET /api/admin/elders`
- `GET /api/admin/dashboard`

其中 `audit-logs` 已经在轻压下暴露长尾，需要专项重压。

### 3. 名牌 PDF 性能

优先：

- `GET /api/nameplates/{elderId}/preview`
- `GET /api/nameplates/{elderId}/pdf`

这块在前面的采样里已经是秒级长尾热点。

### 4. 本地/测试库写链路压测

不建议在线上继续深压写接口，应在本地测试库或 Testcontainers 跑：

- audit log 高频写入
- verification session 创建/过期/授权
- medication / scale 保存

### 5. 资源关联采样

下一轮性能测试建议同步采：

- Nginx 连接数
- Java 堆与 GC
- MySQL `Threads_running`
- MySQL 慢查询/`processlist`

这样我们能把“失败点”从现象进一步落到资源指标。

## 推荐下一步

1. 先单独压 `audit-logs` 和 `nameplate-pdf`
2. 再在本地测试库压扫码验证写链路
3. 最后做一轮带系统指标采样的联合压测
