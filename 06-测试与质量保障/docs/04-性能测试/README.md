# 性能测试规划

## 1. 目标

性能测试的目标不是一次性做大规模压测，而是先建立“可重复、可对比、可留证据”的性能基线，重点回答以下问题：

- 三个前端页面是否加载过慢
- 后端关键只读接口是否存在明显慢查询或长尾延迟
- 扫码验证整条链路是否能在可接受时间内完成
- 名牌 PDF 生成是否稳定、是否体积异常
- Android 短信中转端的本地解析、上传、心跳是否存在明显耗时
- 每次修复后，性能是否出现明显回退

## 2. 执行原则

### 环境原则

- 线上环境：
  - 只允许只读性能采样
  - 不对写接口做并发压测
  - 不执行会污染业务数据的批量写入
- 本地环境：
  - 可用于构建耗时、前端加载、接口延迟、PDF 生成、本地脚本压测
- 测试库 / Testcontainers：
  - 用于需要写入数据的链路压测
  - 包括扫码验证、邀请码、会话校验、审计写入

### 指标原则

- 默认记录：
  - `count`
  - `successCount`
  - `failureCount`
  - `avg`
  - `P50`
  - `P95`
  - `P99`
- 对页面类测试，补充：
  - 首屏可交互时间
  - 控制台报错数量
  - 截图证据
- 对构建类测试，补充：
  - 构建耗时
  - 产物体积
  - gzip 体积

## 3. 测试对象拆分

### 3.1 前端构建性能

目标：

- 判断三个前端构建是否过慢
- 判断产物是否异常膨胀

对象：

- `01-扫码用户端`
- `02-志愿者填写端`
- `03-管理后台端`

指标：

- `npm run build` 总耗时
- 产物目录总大小
- 主 bundle 大小
- gzip 后体积

建议阈值：

- 扫码端 build：`< 30s`
- 志愿者端 build：`< 30s`
- 管理后台 build：`< 40s`
- 单个主 JS 文件尽量：
  - 扫码端 `< 1.2 MB`
  - 志愿者端 `< 1.5 MB`
  - 管理后台 `< 2.0 MB`

### 3.2 页面加载性能

目标：

- 判断首屏是否存在明显卡顿或初始化过重
- 判断是否存在加载期报错

对象：

- 扫码端首页
- 管理后台登录页
- 管理后台老人档案页
- 志愿者端登录页
- 志愿者端老人列表页

指标：

- 首次可见时间
- 首次交互可用时间
- 控制台错误数
- 网络失败数
- 页面截图

建议阈值：

- 首页加载完成：`< 2s`
- 已登录列表页首屏：`< 3s`
- 控制台错误：`0`

### 3.3 后端只读接口性能

目标：

- 建立核心只读 API 的响应时间基线
- 为后续修复或部署前做对比

第一批接口：

- `/api/scan/resolve`
- `/api/scan/basic-info`
- `/api/admin/dashboard`
- `/api/admin/elders`
- `/api/admin/qrcodes`
- `/api/nameplates/{elderId}/preview`

指标：

- `avg`
- `P50`
- `P95`
- `P99`
- `failureRate`

建议阈值：

- `dashboard / qrcodes / elders`：
  - `P95 < 300ms`
- `scan resolve / basic-info`：
  - `P95 < 250ms`
- `nameplate preview`：
  - `P95 < 400ms`
- 失败率：
  - `0`

### 3.4 扫码验证整链路性能

目标：

- 判断从二维码解析到进入受保护页面之间是否存在明显延迟

链路拆分：

1. `resolve`
2. 创建验证 session
3. 查询验证状态
4. 身份证/手机号验证
5. 访问 `basic-info`
6. 访问 `archive / medications / scales`

指标：

- 单接口耗时
- 整链路总耗时
- 验证成功后到首个受保护页面可见的时间

建议阈值：

- 纯后端链路总耗时：`P95 < 800ms`
- 带页面跳转与渲染的整链路：`< 3s`

### 3.5 管理后台业务操作性能

目标：

- 判断列表、筛选、弹窗、导出是否存在明显等待

对象：

- 老人档案列表加载
- 二维码列表加载
- 审计日志筛选
- 量表管理加载
- 用药管理加载

指标：

- 列表首次加载时间
- 筛选响应时间
- 导出触发耗时
- 弹窗打开时间

建议阈值：

- 列表加载：`P95 < 500ms`
- 筛选结果更新时间：`< 800ms`
- 弹窗打开：`< 300ms`

### 3.6 名牌 PDF 性能

目标：

- 判断 PDF 生成是否过慢或体积异常

对象：

- `/api/nameplates/{elderId}/pdf`
- 批量 PDF 入口后续如果实装，也纳入

指标：

- 单次 PDF 生成耗时
- 文件大小
- 生成成功率
- 渲染完整性

建议阈值：

- 单次 PDF：`< 1.5s`
- 文件大小：`< 1.5 MB`
- 失败率：`0`

### 3.7 Android 本地性能

目标：

- 建立短信端本地逻辑的轻量性能基线

对象：

- `SmsParser.parse`
- `RelayRequestSigner.sign`
- `SmsRelayRepository.uploadInboundSms`
- `RelayApiService.sendHeartbeat`

指标：

- 单次解析耗时
- 单次签名耗时
- 单次上传耗时
- 心跳调用耗时

建议阈值：

- 短信解析：`< 20ms`
- 签名：`< 10ms`
- 本地上传逻辑（不含真实网络）：`< 50ms`
- 心跳本地封装逻辑：`< 30ms`

## 4. 当前已完成内容

### 已执行脚本

```bash
node 06-测试与质量保障/scripts/performance/api_latency_check.mjs
```

```bash
node 06-测试与质量保障/scripts/performance/public_read_concurrency_check.mjs
node 06-测试与质量保障/scripts/performance/admin_api_latency_check.mjs
node 06-测试与质量保障/scripts/performance/scan_view_extreme_concurrency_check.mjs
node 06-测试与质量保障/scripts/performance/scan_view_ramp_limit_check.mjs
node 06-测试与质量保障/scripts/performance/scan_verify_write_perf_check.mjs
```

### 当前能力

- 已能做轻量只读采样
- 已能做公开页面与公开只读资源并发采样
- 已能做管理后台只读 API 并发采样
- 已能做扫码查看链路极限并发阶梯测试
- 已能在测试前完成线上备份并留档
- 已能输出：
  - `iterations`
  - `concurrency`
  - `successCount`
  - `failureCount`
  - `P50`
  - `P95`
  - `P99`

### 当前结果基线

以已有报告为例：

- `reports/performance/2026-05-26T00-49-01-982Z-api-latency.json`
- 已记录：
  - `iterations: 20`
  - `concurrency: 4`
  - `successCount: 20`
  - `failureCount: 0`
  - `P50: 48ms`
  - `P95: 105ms`
  - `P99: 120ms`

### 当前新增证据

- 公开读取并发：
  - `reports/performance/2026-05-26T06-10-58-153Z-public-read-concurrency.md`
- 后台只读 API 并发：
  - `reports/performance/2026-05-26T06-11-08-771Z-admin-api-latency.md`
- 扫码查看链路正式极限并发：
  - `reports/performance/2026-05-26T06-29-16-075Z-scan-view-extreme-concurrency.md`
- 扫码查看链路阶梯升压：
  - `reports/performance/2026-05-26T06-37-45-526Z-scan-view-ramp-limit.md`
  - `reports/performance/2026-05-26T06-57-04-531Z-scan-view-ramp-limit.md`
- 扫码验证写链路性能：
  - `reports/performance/2026-05-26T09-13-46-733Z-scan-verify-write-performance.md`
- 故障环节分析与优化结论：
  - `reports/regression/20260526-1535-scan-view-failure-analysis.md`
  - `reports/regression/20260526-1720-scan-verify-write-performance-analysis.md`

### 当前最重要的测试结论

#### 扫码查看链路

- 在较高但仍现实的压力下：
  - `120` 并发稳定
  - `160` 并发开始明显退化，但仍 `100%` 成功
- 在极限单点并发下：
  - `8000` 并发时成功率降到 `76.33%`
  - `P95 = 24958ms`
  - `P99 = 40357ms`

#### 已确认的首要瓶颈

- 线上 Nginx `worker_connections = 768`
- 压测期间 Nginx 错误日志持续出现：
  - `worker_connections are not enough while connecting to upstream`

说明：

- 当前这条链路在极限并发下，首先被打满的是 **Nginx 到后端的上游连接数**
- 大量 `0` 状态与一部分 `500` 都能与这个代理层瓶颈对上

#### 已确认的次级放大因素

- 详情接口并不是纯读：
  - 每次请求都会同步写 `audit_log`
- 每次详情查看前都要先查 `scan_verification_session`
- `archive / medications / scales` 还存在解密与 payload 解析开销

说明：

- 真正的详情读取路径是：
  - session 校验查询
  - 业务表查询
  - 数据解密/解析
  - 审计日志写入
- 这会拉长单请求占用时间，从而进一步放大代理层连接压力

#### 扫码验证写链路的新结论

在峰值并发约 `1000` 的受控写压测下：

- `verification/start`
  - 成功 `664`
  - 失败 `336`
- `verification/status`
  - 成功 `1000`
  - 失败 `0`
- `verification/identity`
  - 成功 `470`
  - 失败 `530`

失败样本直接指向：

- `insert into scan_verification_session`

结合当前实现：

- `sessionId = "scan-session-" + System.currentTimeMillis()`

以及表结构：

- `scan_verification_session.session_id` 是主键

当前可确认：

- 写链路的关键问题已经切换成 **验证 session 主键生成方式在高并发下冲突**
- 也就是说，`verification/start` 和 `verification/identity` 的瓶颈已经不是读取或代理层，而是 session 插入阶段的唯一键冲突风险

## 5. 当前缺口

当前性能测试已经不再只是“单 URL 轻量采样”，但仍缺少以下内容：

- 扫码验证写链路专项性能
- 带系统资源采样的联合压测
- 名牌 PDF 更高强度并发测试
- 前端构建产物体积与 build 时间留档
- Android 本地逻辑性能
- 本地测试库写链路压测
- 多轮修复前后对比报告

### 当前优先级调整

基于现有结果，性能专项的优先级应调整为：

1. 扫码链路的上游连接、session、审计、详情读取优化验证
2. `nameplate pdf` 热点专项
3. 扫码验证写链路专项
4. 带资源采样的联合压测
5. 构建产物与 Android 本地性能

说明：

- 管理后台写删改在真实业务下并发通常低于 `50`，短期内不是第一优先级热点
- 管理后台读接口里，仍然值得继续关注的是：
  - `audit-logs`
  - 大列表加载
  - 导出类接口
- 但总体优先级低于扫码链路和 PDF 热点

## 6. 推荐执行顺序

建议后续按下面顺序推进：

1. 继续做扫码验证写链路专项性能测试
2. 修复验证 session ID 生成策略后重新回归该专项
3. 对 `nameplate pdf` 做更高强度并发与长尾测试
4. 增加带资源采样的联合压测
5. 补三个前端的构建耗时和产物体积记录
6. 增加 Android 本地性能基线脚本或测试
7. 在本地测试库压审计写入、session 写入、保存类接口

原因：

- 扫码查看读链路的上限已经测出，扫码验证写链路也已完成第一轮专项
- 但写链路已经明确暴露出 `sessionId` 冲突问题，应先修复后再继续扩大写压
- `nameplate pdf` 已经在轻压中暴露秒级长尾，值得单独专项
- 只有把资源采样加进来，才能把“失败点”进一步落到 Nginx、JVM、MySQL 资源指标
- 构建耗时与 Android 本地性能可以作为第二梯队稳定推进

## 7. 建议脚本拆分

建议后续把性能脚本细化为：

- `api_latency_check.mjs`
  - 保留通用 HTTP 采样能力
- `scan_chain_latency_check.mjs`
  - 专门测扫码链路
- `scan_verify_write_perf_check.mjs`
  - 专门测验证 session 创建、状态轮询、身份证验证
- `scan_chain_with_metrics_check.mjs`
  - 压测时同步抓 Nginx / JVM / MySQL 指标
- `admin_api_latency_check.mjs`
  - 专门测后台只读接口
- `build_artifact_metrics.mjs`
  - 记录 build 时间与 bundle 体积
- `pdf_latency_check.mjs`
  - 记录 PDF 生成耗时与大小
- `pdf_concurrency_check.mjs`
  - 记录 PDF 在并发下的长尾和失败率
- `android_local_perf.md` 或对应测试记录
  - 记录 Android JVM 本地逻辑耗时

## 8. 报告要求

每轮性能测试建议输出到：

```text
06-测试与质量保障/reports/performance/<timestamp>-<topic>.json
06-测试与质量保障/reports/performance/<timestamp>-<topic>.md
```

至少包含：

- 测试环境
- 被测 URL / 接口 / 页面
- 采样次数
- 并发数
- 成功数 / 失败数
- `avg / P50 / P95 / P99`
- 阈值
- 是否达标
- 风险说明

## 9. 风险与边界

- 线上环境只允许只读采样，不能做写接口压测
- 如果需要测验证码、会话、邀请码等写链路的高强度压测，必须切到本地测试库或 Testcontainers
- 如果需要继续在线上做大并发压测，应先完成备份，并优先压只读链路
- Java 24 + JaCoCo 0.8.12 在后端和 Android 侧会出现 JDK 类插桩告警，这不等于性能问题
- 页面性能如果要做真实交互测量，后续应优先接入真实浏览器 E2E，而不是仅靠 fetch

## 10. 下一步最值得落地的两项

1. 扫码验证写链路性能：
   - 已完成第一轮
   - 现阶段下一步不是继续盲目加压，而是：
     - 先修复 `sessionId` 生成冲突
     - 再回归 `start / status / identity`

2. 名牌 PDF 并发与长尾专项：
   - `/api/nameplates/{elderId}/preview`
   - `/api/nameplates/{elderId}/pdf`
   - 目标是确认它在高并发下的失败点和优化收益

## 11. 基于当前测试结论的优化建议

### 11.1 最高优先级

1. 提高 Nginx 上游连接容量
   - 当前 `worker_connections = 768`
   - 建议优先提升到 `4096` 或更高，并同步检查 `nofile` 上限

2. 立即替换验证 session ID 生成策略
   - 不要再只用 `System.currentTimeMillis()`
   - 建议改为：
     - `UUID`
     - 或 `时间戳 + 随机后缀`
     - 或 `雪花 ID`

3. 给已验证 session 做短 TTL 缓存
   - 对 `authorizeVerifiedSession` 增加 `30s ~ 120s` 的缓存
   - 目标是减少：
     - 重复查 `scan_verification_session`
     - 连续点击详情页时的重复查库

4. 把扫码查看类审计日志改为异步
   - `resolve / basic-info / archive / medications / scales`
   - 建议主请求先返回，再异步落库 `audit_log`

### 11.2 第二优先级

5. 精简详情查询
   - 去掉 `select *`
   - 只查当前接口真实需要的列

6. 为高频表补索引
   - `scan_verification_session(session_id)`
   - `health_record(elder_id, created_at)`
   - `medication(elder_id, updated_at)`
   - `scale_record(elder_id, created_at)`

7. 降低 `scales` 的解析成本
   - 列表页不直接返回完整 `answers`
   - 先返回轻量字段，再按需取详情

### 11.3 第三优先级

8. 对详情结果做短 TTL 只读缓存
   - `basic-info / archive / medications / scales`
   - 可以用 `elderId + sessionId + target` 作为缓存维度

9. 再评估 MySQL 与后端线程池参数
   - MySQL 当前：
     - `max_connections = 151`
     - `innodb_buffer_pool_size = 128MB`
   - 后端当前未见显式 Tomcat/Hikari 调优

这些动作的推荐顺序是：

1. Nginx 连接上限
2. 验证 session ID 生成策略
3. session 缓存
4. 审计异步化
5. 索引与 SQL 精简
6. 详情读取缓存与细分接口
