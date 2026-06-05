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

## 4. 当前基线总览

| 测试项 | 环境 | 关键指标 | 状态 |
|--------|------|---------|------|
| 通用接口延迟 | 线上 | P50 48ms / P95 105ms / P99 120ms | ✅ 达标 |
| 公开读取并发 | 线上 | 聚合 P50 50ms / P95 1956ms | ⚠️ nameplate-pdf 长尾 |
| 管理后台只读 API | 线上 | 聚合 P50 50ms / P95 2164ms | ⚠️ audit-logs 长尾 |
| 扫码查看极限并发 | 线上 | 150次/接口/40并发 100%成功 P95 105ms | ✅ 达标 |
| 扫码查看阶梯升压 | 线上 | 120并发稳定 / 160并发退化 / 8000并发 76.33% | ✅ 已建立边界 |
| 扫码验证写链路（修前） | 线上 | verification/start 66.4% / identity 47% | ❌ sessionId 冲突 |
| 扫码验证写链路（修后） | 本地 JVM | 2000请求/256并发 100%成功 | ✅ 已修复 |
| 嵌入式数据库写压（修前） | 本地 H2 | createScan 17.27% / handleInbound 8.33% | ❌ 主键冲突 |
| 嵌入式数据库写压（修后） | 本地 H2 | 全链路 100% / P95 44~124ms | ✅ 已修复 |
| MariaDB 实库写压 | 本地 MariaDB4j | 全链路 100% / P95 0~80ms | ✅ 已完成 |
| MariaDB 实库写压联合采样 | 本地 MariaDB4j | CPU峰值 114.4% / RSS峰值 232MB / 线程峰值 155 / YGC 3次 | ✅ 已完成 |
| MariaDB 实库读链路优化 | 本地 MariaDB4j | resolve P95 24ms→2ms / protected P95 30ms→3ms / audit P95 10ms→12ms | ✅ 读链路显著优化 |
| MariaDB 连接池调优 | 本地 MariaDB4j | pool10 P95 47ms/P99 83ms → pool64 P95 45ms/P99 70ms | ⚠️ 收益不稳定 |
| 扫码查看多进程分片压测 | 本地发压 / 线上验证 | 4 shard / 总并发 8000 / 总请求 5000：P95 641ms / 成功率 99.98% | ✅ 已验证方案 C |
| 前端构建 | 本地 | scan 3.4s/338KB / volunteer 2.4s/368KB / admin 3.3s/490KB | ✅ 达标 |
| Android 本地基线 | 本地 | parse 0.29us / sign 9.06us / upload 0.53ms | ✅ 很轻 |
| nameplate PDF 优化对比 | 本地 | baseline P95 640ms→optimized P95 72ms / high-tier(240x24) P95 0ms | ✅ 已优化并复测 |
| 浏览器页面加载 | 本地 | Safari WebDriver 未开启 | ❌ 环境阻塞 |

---

## 5. 当前已完成内容

### 已执行脚本

```bash
node 06-测试与质量保障/scripts/performance/api_latency_check.mjs
node 06-测试与质量保障/scripts/performance/public_read_concurrency_check.mjs
node 06-测试与质量保障/scripts/performance/admin_api_latency_check.mjs
node 06-测试与质量保障/scripts/performance/scan_view_extreme_concurrency_check.mjs
node 06-测试与质量保障/scripts/performance/scan_view_ramp_limit_check.mjs
node 06-测试与质量保障/scripts/performance/scan_verify_write_perf_check.mjs
```

```bash
bash 06-测试与质量保障/scripts/performance/run_local_design_concurrency_probe.sh
bash 06-测试与质量保障/scripts/performance/run_local_design_concurrency_with_metrics.sh
bash 06-测试与质量保障/scripts/performance/run_local_embeddeddb_write_perf.sh
bash 06-测试与质量保障/scripts/performance/run_local_embeddeddb_write_with_metrics.sh
bash 06-测试与质量保障/scripts/performance/run_local_mariadb_write_perf.sh
bash 06-测试与质量保障/scripts/performance/run_local_mariadb_write_with_metrics.sh
bash 06-测试与质量保障/scripts/performance/run_local_mariadb_read_perf.sh
```

```bash
bash 06-测试与质量保障/scripts/performance/run_frontend_build_artifact_metrics.sh
bash 06-测试与质量保障/scripts/performance/run_android_local_perf_baseline.sh
bash 06-测试与质量保障/scripts/performance/run_nameplate_pdf_perf.sh
bash 06-测试与质量保障/scripts/performance/run_browser_page_load_baseline.sh
```

### 当前能力

- 已能做轻量只读采样
- 已能做公开页面与公开只读资源并发采样
- 已能做管理后台只读 API 并发采样
- 已能做扫码查看链路极限并发和阶梯升压
- 已能做扫码验证写链路专项
- 已能做本机 JVM 级并发设计探针
- 已能做本机 JVM 级探针 + 资源采样
- 已能做本机嵌入式真实数据库写压
- 已能做本机嵌入式真实数据库写压 + 资源采样
- 已能做本机 MariaDB4j 实库写压
- 已能做本机 MariaDB4j 实库写压 + 资源采样
- 已能做本机 MariaDB4j 实库控制器级读链路优化前后对比
- 已能做本机 MariaDB4j 实库 Hikari 连接池冷缓存对比
- 已能做扫码查看链路的多进程分片压测（方案 C）
- 已能做 `nameplate pdf` 本地并发与长尾基线
- 已能做 `nameplate pdf` 更高分档并发验证
- 已能做三个前端 build 耗时 / dist / gzip 留档
- 已能做 Android 本地性能基线
- 已能尝试真实浏览器页面加载证据，并明确当前机器的浏览器自动化阻塞点

### 当前结果总览

#### A. 轻量接口与只读并发基线

- 通用接口轻量基线：
  - `P50 48ms`
  - `P95 105ms`
  - `P99 120ms`
- 公开读取并发：
  - 聚合 `P50 50ms`
  - 聚合 `P95 1956ms`
  - `nameplate pdf` 是明显长尾热点
- 管理后台只读 API：
  - 聚合 `P50 50ms`
  - 聚合 `P95 2164ms`
  - `audit-logs` 是明显长尾热点

对应保留基线：

- `reports/performance/2026-05-25T15-18-33-764Z-api-latency.json`
- `reports/performance/2026-05-26T06-10-58-153Z-public-read-concurrency.md`
- `reports/performance/2026-05-26T06-11-08-771Z-admin-api-latency.md`

#### B. 扫码查看链路

- 正式极限并发：
  - `150` 次 / 接口
  - `40` 并发
  - 总请求 `750`
  - 成功率 `100%`
  - `P95 105ms`
- 阶梯升压：
  - `120` 并发稳定
  - `160` 并发明显退化但仍 `100%` 成功
- 极限阈值：
  - `8000` 并发时成功率降到 `76.33%`
  - `P95 24958ms`
  - `P99 40357ms`

#### B.1 Nginx 调优后的短样本回归

- 已落地：
  - `worker_connections 768 -> 8192`
  - `worker_rlimit_nofile 65535`
  - `multi_accept on`
  - `silverlink_backend keepalive 16 -> 256`
- 单进程短样本回归：
  - `4000 x 1000`
    - 成功率 `99.86%`
    - `P95 3171ms`
  - `6000 x 1000`
    - 成功率 `99.96%`
    - `P95 2614ms`
  - `8000 x 1000`
    - 成功率 `99.98%`
    - `P95 3303ms`

#### B.2 多进程分片压测（方案 C）

- 目标：
  - 降低单个 Node 发压进程的内存和虚拟内存压力
  - 保持总并发与总请求规模不变
- 已新增脚本：
  - `scripts/performance/scan_view_multiprocess_sharded_check.mjs`
- 本轮验证：
  - `4` 个 shard
  - 总并发 `8000`
  - 单目标总请求 `1000`
  - 总请求 `5000`
- 分片方案：
  - 每个 shard：`2000` 并发 / `250` 次每目标请求
- 聚合结果：
  - 成功率 `99.98%`
  - `P50 428ms`
  - `P95 641ms`
  - `P99 641ms`
  - `Max 8206ms`
- 与单进程同口径对比：
  - 单进程 `8000 x 1000`：`P95 3303ms`
  - 方案 C 聚合：`P95 641ms`
- 当前结论：
  - 方案 C 明显降低了单机发压器本身的压力
  - 在相同总并发和总请求规模下，尾延迟明显优于单进程发压
  - 更适合继续做 `10w` 级总请求量压测

#### B.3 方案 C 提高并发、减少批次

- 第二档：
  - `4` 个 shard
  - 总并发 `12000`
  - 单目标总请求 `4000`
  - 总请求 `20000`
  - 分片：每 shard `3000` 并发 / `1000` 次每目标
  - 聚合结果：
    - 成功率 `99.95%`
    - `P50 2316ms`
    - `P95 2406ms`
    - `P99 2406ms`
  - 结论：
    - 成功率仍然很高
    - 单批请求量已经明显增加
    - 但尾延迟已进入秒级排队区

- 第三档：
  - `4` 个 shard
  - 总并发 `16000`
  - 单目标总请求 `8000`
  - 总请求 `40000`
  - 分片：每 shard `4000` 并发 / `2000` 次每目标
  - 聚合结果：
    - 成功率 `78.7%`
    - `P50 3556ms`
    - `P95 7019ms`
    - `P99 7019ms`
  - 结论：
    - 当前已经低于 `90%` 成功率阈值
    - 说明在现阶段优化条件下，`16000 / 40000` 这一档已超过可接受边界

- 当前分界判断：
  - 方案 C 下，`12000 / 20000` 仍可运行，但已明显退化
  - 方案 C 下，`16000 / 40000` 已跌破成功率阈值
- 如果目标是累计做到 `10w` 级总请求量，更推荐：
    - 用 `12000 / 20000` 这档作为单批模板
    - 通过 `5` 批累计到 `10w`

#### B.4 Redis 双层缓存上线后的复测

- 目标环境新增：
  - 发布前备份：`/opt/silverlink-care/backups/pre-redis-deploy-20260528-030024`
  - 新增独立容器：`silverlink-redis`
  - Redis 端口：`127.0.0.1:6380`
  - 后端新增：
    - `SILVERLINK_CACHE_REDIS_ENABLED=true`
    - `SPRING_DATA_REDIS_HOST=127.0.0.1`
    - `SPRING_DATA_REDIS_PORT=6380`
    - `SERVER_TOMCAT_THREADS_MAX=1200`
    - `SERVER_TOMCAT_ACCEPT_COUNT=20000`
    - `SERVER_TOMCAT_MAX_CONNECTIONS=30000`
    - `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=96`
    - `SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=24`
  - MySQL 运行时参数：
    - `max_connections=500`
    - `innodb_buffer_pool_size=512MB`

- 长时段压力验证：
  - `4` 个 shard
  - 总并发 `12000`
  - 单目标总请求 `20000`
  - 总请求 `100000`
  - 聚合结果：
    - 成功率 `76.16%`
    - `P50 11791ms`
    - `P95 16240ms`
    - `P99 16240ms`
  - 结论：
    - 在 `10w` 级总请求量的长时段口径下，当前单机后端仍会被长尾排队拖垮
    - Redis 双层缓存没有把这条链路推进到“`12000` 并发可长期稳定”的状态

- 同口径短样本回归：
  - `14000 / 20000`
    - 成功率 `99.95%`
    - `P50 1881ms`
    - `P95 3413ms`
    - `P99 3413ms`
  - `16000 / 20000`
    - 成功率 `98.52%`
    - `P50 5728ms`
    - `P95 7323ms`
    - `P99 7323ms`
  - 结论：
    - 短样本下，系统已经可以顶住 `1.4w` 和 `1.6w` 档位而不大量掉请求
    - 但延迟成本非常高，尤其 `1.6w` 已经进入严重排队区

- 运行期侧信号：
  - Redis 复测期间累计：
    - `keyspace_hits=35`
    - `keyspace_misses=506`
  - MySQL 复测期间：
    - `Max_used_connections=49`
  - 当前判断：
    - Redis 已经生效，但对单机单实例模型来说，更多是在多请求重入时兜住热点
    - 真正限制更高单次并发的，仍然是单实例线程调度、队列排队和长连接长尾，而不是单纯“没有缓存”

#### B.5 聚合快照缓存上线后的 `1.2w` 复测

- 本轮新增程序优化：
  - `ScanService` 老人详情聚合快照缓存
  - 将 `archive / basic-info / medications / scales` 四条扫码详情读取路径合并为共享 `scan:bundle:<elderId>` 快照
- 目标环境动作：
  - 发布前备份：`/opt/silverlink-care/backups/pre-bundle-cache-deploy-20260528-131011`
  - 上传新后端包并重启服务
- 同口径复测：
  - `4` 个 shard
  - 总并发 `12000`
  - 单目标总请求 `4000`
  - 总请求 `20000`
  - 聚合结果：
    - 成功率 `99.94%`
    - `P50 4122ms`
    - `P95 4159ms`
    - `P99 4159ms`
- 与旧基线对比：
  - 旧结果（无聚合快照缓存）：
    - 成功率 `99.95%`
    - `P95 2406ms`
  - 新结果（有聚合快照缓存）：
    - 成功率 `99.94%`
    - `P95 4159ms`
- 当前判断：
  - 这轮聚合快照缓存**没有在目标环境上继续压低 `1.2w` 同口径短样本的 P95**。
  - 说明这条线上链路在当前单机单实例部署下，主要瓶颈已经不在“这 4 条详情查询各自重复组装”的层面。
  - Redis 本轮运行期有命中和 miss，但由于仍是单实例，更多请求已经在本地内存层命中，Redis 不是当前主要收益来源。
  - 下一阶段更值钱的程序优化，应转向：
    - `scales` 轻列表 / 重详情拆分
    - 审计写入进一步批量化
    - 更激进地削减每个请求附带的非核心工作，而不是继续堆相邻缓存层

对应保留基线：

- `reports/performance/2026-05-26T06-57-04-472Z-scan-view-extreme-concurrency.md`
- `reports/performance/2026-05-26T06-57-04-531Z-scan-view-ramp-limit.md`

#### C. 扫码验证写链路

修前线上受控写压已经确认：

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

结合修前实现：

- `sessionId = "scan-session-" + System.currentTimeMillis()`

修后本地回归已经完成：

- JVM 设计探针：
  - 三条会话创建链路在 `2000` 请求 / `256` 并发下全部 `2000/2000` 成功
  - 不再出现 `session_id` 冲突
- 嵌入式真实数据库：
  - 三条会话创建链路在 `1500` 请求 / `192` 并发下全部 `100%` 成功
  - `handleInbound` 在 `120` 请求 / `24` 并发下全部 `100%` 成功

对应保留基线：

- 修前：
  - `reports/performance/2026-05-26T09-13-46-733Z-scan-verify-write-performance.md`
- 修后：
  - `reports/performance/2026-05-26T16-44-30-708Z-local-scan-write-design-probe.md`
  - `reports/performance/2026-05-26T16-52-48-898Z-local-embeddeddb-write-pressure.md`

#### D. 本机联合资源采样

已完成两类联合采样：

- JVM 设计探针联合采样
- 嵌入式真实数据库写压联合采样

当前能确认：

- 设计探针能和 `vm_stat`、进程样本一起留档
- 嵌入式真实数据库写压联合采样里，Java 进程资源峰值已经采到：
  - `RSS` 约从 `60 MB` 增长到 `147 MB`
  - `CPU` 峰值约 `198%`
  - 年轻代 GC 至少 `1` 次

对应保留基线：

- `reports/performance/2026-05-26T10-34-11Z-local-design-concurrency-with-metrics/summary.md`
- `reports/performance/2026-05-26T16-52-40Z-local-embeddeddb-write-with-metrics/summary.md`

#### E. 本机嵌入式真实数据库写链路压测

修前：

- `createScanVerificationSession`
  - `1500` 请求 / `192` 并发
  - 成功 `259`
  - 失败 `1241`
- `createDirectSmsVerificationSession`
  - 成功 `62`
  - 失败 `1438`
- `createIdentityVerificationSession`
  - 成功 `127`
  - 失败 `1373`
- `handleInbound`
  - `120` 请求 / `24` 并发
  - 成功 `10`
  - 失败 `110`
- `handleInbound` 候选查询段：
  - `30` 请求 / `1` 并发
  - `P95 170ms`

修后：

- `createScanVerificationSession`
  - 成功率 `100%`
  - `P95 95ms`
- `createDirectSmsVerificationSession`
  - 成功率 `100%`
  - `P95 44ms`
- `createIdentityVerificationSession`
  - 成功率 `100%`
  - `P95 124ms`
- `handleInbound`
  - 成功率 `100%`
  - `P95 104ms`
- `handleInbound` 候选查询段：
  - `P95 2ms`

修后已确认：

- `sessionId` 改成 UUID 后，本机高并发下不再撞 `scan_verification_session.session_id`
- `recordId` 改成 UUID 后，入站写链路不再撞 `sms_relay_record.id`
- `handleInbound` 改成 `receiver_phone + message_body` 候选匹配后，不再依赖全部 `PENDING` 会话全量扫描

#### F. 本机 MariaDB 实库写链路压测

- 环境：
  - 本机 MariaDB4j
  - 真实 JDBC
  - 真实 SQL
  - 真实主键约束
  - `utf8mb4` 字符集对齐
  - Hikari 连接池复用，避免测试本身因 socket 频繁创建干扰结果
- 会话创建链路：
  - `createScanVerificationSession`
    - `1500` 请求 / `192` 并发
    - 成功率 `100%`
    - `P95 80ms`
    - `P99 112ms`
  - `createDirectSmsVerificationSession`
    - `1500` 请求 / `192` 并发
    - 成功率 `100%`
    - `P95 48ms`
    - `P99 80ms`
  - `createIdentityVerificationSession`
    - `1500` 请求 / `192` 并发
    - 成功率 `100%`
    - `P95 33ms`
    - `P99 51ms`
- 入站写链路：
  - `handleInbound`
    - `120` 请求 / `24` 并发
    - 成功率 `100%`
    - `P95 22ms`
    - `P99 27ms`
- 候选查询延迟段：
  - `30` 请求 / `1` 并发
  - 成功率 `100%`
  - `P95 0ms`
  - `P99 1ms`

结论：

- 这轮已经把“本地真实数据库最终层”的写链路压测推进到 MariaDB 实库层，不再只是 H2 MySQL mode。
- `sessionId -> UUID`、`recordId -> UUID`、`handleInbound -> receiver_phone + message_body` 候选匹配，在 MariaDB 实库下都拿到了 `100%` 成功率证据。
- 虽然这不是 Docker/Testcontainers 变体，但它已经是本机 MySQL 系真实数据库层证据，足以验证真实 SQL、字符集、唯一键、连接复用和写路径延迟。

对应保留基线：

- `reports/performance/2026-05-27T11-56-02-846Z-local-mariadb-write-pressure.md`
- `reports/performance/2026-05-27T12-07-07-838Z-local-mariadb-write-pressure.md`

#### G. 本机 MariaDB 实库写压联合采样

- 联合采样目录：
  - `reports/performance/2026-05-27T12-06-30Z-local-mariadb-write-with-metrics/`
- 关键资源峰值：
  - Java 进程 CPU 峰值约 `114.4%`
  - RSS 峰值约 `232336 KB`
  - 线程峰值约 `155`
  - 年轻代 GC 次数 `3`
  - 年轻代 GC 总时间约 `0.005s`
- 当前可确认：
  - 在 MariaDB 实库 + 真实写链路条件下，修复后的写压测试已经可以稳定完成，并留下 JVM / 进程 / 系统内存采样证据。
  - 当前瓶颈不再是主键冲突，也不再是 `DriverManagerDataSource` 频繁建连；测试已切到连接池复用。

对应保留基线：

- `reports/performance/2026-05-27T12-06-30Z-local-mariadb-write-with-metrics/summary.md`

#### H. 本机 MariaDB 实库读链路优化对比

- 模式：
  - 控制器级读链路
  - 真实 MariaDB4j / 真实 JDBC / 真实 SQL
  - 对比同一批接口在“优化关闭”和“优化开启”下的并发表现
- 已本地落地的优化中间层：
  - `AuditLogService` 异步执行器
  - `SmsRelayService.authorizeVerifiedSession` 短 TTL 缓存
  - `ScanService.resolve` 短 TTL 缓存
  - `ScanService` 老人详情聚合快照缓存（`archive / basic-info / medications / scales` 共享一次预组装结果）
  - `SimpleTtlCache` 并发 miss 合并，避免同 key 高并发重复击穿
  - `scale_record.payload_enc` 解析结果短缓存，降低重复 JSON 解析成本
  - `SilverLinkDataService.auditLogs` SQL 过滤下推
  - `health / medications / scales` 去掉 `select *`
  - MariaDB 读链路对照夹具已对齐 `V13` 复合索引方案
- `resolve-controller`
  - baseline：`600` 请求 / `48` 并发 / `P95 24ms` / `P99 48ms`
  - optimized：`600` 请求 / `48` 并发 / `P95 2ms` / `P99 4ms`
- `protected-read-mix`
  - baseline：`800` 请求 / `64` 并发 / `P95 30ms` / `P99 47ms`
  - optimized：`800` 请求 / `64` 并发 / `P95 3ms` / `P99 5ms`
- `protected-read-mix-high-tier`
  - baseline：`3200` 请求 / `256` 并发 / `P95 56ms` / `P99 115ms`
  - optimized：`3200` 请求 / `256` 并发 / `P95 4ms` / `P99 4ms`
- `audit-log-filter`
  - baseline：`120` 请求 / `16` 并发 / `P95 10ms` / `P99 15ms`
  - optimized：`120` 请求 / `16` 并发 / `P95 12ms` / `P99 15ms`
- 当前可确认：
  - 本地代码级性能优化不是“理论建议”，已经在 MariaDB 实库下拿到优化前后对比证据。
  - 对重复扫码解析、同访客连续查看四个详情页两类核心扫码读链路，都有明确的延迟下降。
  - 更高分档 `1600 / 128` 并发下，优化前后都保持 `100%` 成功，但优化后尾延迟仍明显更低。
  - 本地并发下成功率保持 `100%`，说明新增缓存和异步审计没有引入新的读链路失败。
  - `audit-log-filter` 在当前这轮本机 MariaDB 对比里收益不再稳定，说明后续更该把精力放在扫码读链路和目标环境索引/网关层，而不是继续在本机微调这个接口。

对应保留基线：

- `reports/performance/2026-05-27T16-37-46-248Z-local-mariadb-scan-read-optimization.md`
- `reports/performance/2026-05-27T16-37-46-248Z-local-mariadb-scan-read-optimization.json`

#### H.1 本机 MariaDB4j 连接池调优对比

- 本轮新落地的应用并行参数默认值：
  - `server.tomcat.threads.max=800`
  - `server.tomcat.accept-count=10000`
  - `server.tomcat.max-connections=20000`
  - `spring.datasource.hikari.maximum-pool-size=64`
  - `spring.datasource.hikari.minimum-idle=16`
  - `spring.datasource.hikari.connection-timeout=1500ms`
- 说明：
  - 当前本机读链路压测仍然是控制器直调，不经过真实 HTTP/Tomcat 入口。
  - 所以这轮**实际测到的是 Hikari 连接池大小收益**，Tomcat 参数本轮属于已补配置、待真实 HTTP 压测验证。
- 场景：
  - 保留已验证 session 缓存、SQL 优化、异步审计
  - 显式关闭详情短缓存，模拟冷缓存详情读取
- `optimized-protected-read-pool10-cold-cache`
  - `6400` 请求 / `256` 并发
  - `P95 47ms`
  - `P99 83ms`
  - Hikari `maximumPoolSize=10`
- `optimized-protected-read-pool64-cold-cache`
  - `6400` 请求 / `256` 并发
  - `P95 45ms`
  - `P99 70ms`
  - Hikari `maximumPoolSize=64`
- 当前判断：
  - 在这轮更高负载下，连接池放大收益不稳定，说明它不是当前扫码读链路的决定性优化点。
  - 它更像继续抬高单次并发上限的“第二梯队优化”，不是当前扫码读链路的第一主因优化。
  - 这和线上看到的 `Max_used_connections≈11` 一致，说明线上仍然值得把 Hikari 池和 MySQL 连接上限放开。

对应保留基线：

- `reports/performance/2026-05-27T18-42-29-676Z-local-mariadb-scan-read-optimization.md`
- `reports/performance/2026-05-27T18-42-29-676Z-local-mariadb-scan-read-optimization.json`

#### I. 三个前端构建性能

- `scan-client`
  - build `3407ms`
  - dist `338.28 KB`
  - gzip `106.54 KB`
- `volunteer-client`
  - build `2428ms`
  - dist `368.34 KB`
  - gzip `112.06 KB`
- `admin-console`
  - build `3322ms`
  - dist `490.10 KB`
  - gzip `141.83 KB`

结论：

- 管理后台交付体积最大
- 志愿者端构建最快

对应保留基线：

- `reports/performance/2026-05-26T14-42-08Z-build-artifacts.md`

#### J. Android 本地性能基线

- `SmsParser.parse`
  - 平均 `0.29us`
  - `P95 1us`
- `RelayRequestSigner.sign`
  - 平均 `9.06us`
  - `P95 20us`
- `RelayApiService.uploadInboundSms`
  - 平均 `0.53ms`
  - `P95 1ms`
- `RelayApiService.sendHeartbeat`
  - 平均 `0.16ms`
  - `P95 1ms`
- `SmsRelayRepository.uploadInboundSms`
  - 平均 `3.30ms`
  - `P95 5ms`

结论：

- Android 本地逻辑整体很轻
- 后续更可能的真实瓶颈仍是网络、设备环境和后端链路

对应保留基线：

- `reports/performance/2026-05-26T14-37-27-132Z-android-local-performance-baseline.md`

#### K. `nameplate pdf` 本地并发与长尾

- `preview`
  - 基线：`300` 请求 / `24` 并发
  - `P95 3ms`
- `preview`
  - 高分档：`600` 请求 / `48` 并发
  - `P95 4ms`
- `pdf`
  - 基线：`96` 请求 / `12` 并发
  - 成功率 `100%`
  - `P50 289ms`
  - `P95 1525ms`
  - `P99 1531ms`
  - 单份 PDF 大小约 `31 KB`
- `pdf`
  - 高分档：`240` 请求 / `24` 并发
  - 成功率 `100%`
  - `P50 182ms`
  - `P95 411ms`
  - `P99 465ms`

#### K.1 `nameplate pdf` 本地优化前后对比

- 本地已落地的优化：
  - `preview` 短 TTL 缓存
  - `pdf` 结果短 TTL 缓存
  - 二维码位图缓存
  - 字体资源复用
- `preview`
  - baseline：`300` 请求 / `24` 并发 / `P95 1ms` / `P99 2ms`
  - optimized：`300` 请求 / `24` 并发 / `P95 0ms` / `P99 1ms`
- `pdf`
  - baseline：`96` 请求 / `12` 并发 / `P50 190ms` / `P95 640ms` / `P99 644ms`
  - optimized：`96` 请求 / `12` 并发 / `P50 0ms` / `P95 72ms` / `P99 76ms`
- `pdf optimized high-tier`
  - `240` 请求 / `24` 并发
  - 成功率 `100%`
  - `P50 0ms`
  - `P95 0ms`
  - `P99 0ms`
- 当前可确认：
  - 这轮优化已经把 `nameplate pdf` 从“本地明显长尾热点”压到了“重复请求可被缓存命中，尾延迟显著下降”的状态。
  - 在相同本机压测口径下，`pdf` 的 `P95` 从 `640ms` 降到 `72ms`，`P99` 从 `644ms` 降到 `76ms`。
  - 高分档 `240 / 24` 并发下，本地专项没有出现失败，且几乎全部命中缓存。

结论：

- `nameplate pdf` 当前已经在本地专项里出现明显长尾
- 即使成功率 `100%`，也已经值得做缓存、模板复用和资源复用优化
- 更高分档并发已补跑完成，本地没有出现失败点，但仍能看出 PDF 生成路径尾延迟明显高于普通 JSON 读接口

对应保留基线：

- `reports/performance/2026-05-26T16-50-07-520Z-nameplate-pdf-performance.md`
- `reports/performance/2026-05-27T09-33-43-985Z-nameplate-pdf-performance.md`
- `reports/performance/2026-05-27T15-55-21-340Z-nameplate-pdf-performance.md`

#### L. 真实浏览器页面加载证据

本机已经实际尝试执行：

- `bash 06-测试与质量保障/scripts/performance/run_browser_page_load_baseline.sh`

当前明确阻塞：

- Safari WebDriver 无法创建 session
- 本机报错：
  - `You must enable 'Allow remote automation' in the Developer section of Safari Settings to control Safari via WebDriver.`
- 当前直接创建 session 返回：
  - `HTTP 500 session not created`
  - 响应体明确指出仍需开启 Safari `Allow remote automation`
- 已确认 Safari 设置路径可达：
  - `设置 -> 高级 -> 显示网页开发者功能`
  - `设置 -> 开发者 -> 允许远程自动化`
- 当前最终阻塞点：
  - 勾选 `允许远程自动化` 时，macOS 会弹出系统授权框
  - 该步骤需要本机登录密码，当前未完成授权，所以浏览器基线仍不能闭环

说明：

- 真实浏览器加载基线不是没规划，而是已经尝试过
- 当前阻塞在本机 Safari 设置层，不是脚本逻辑错误

## 5. 当前缺口

当前真正还没有闭环的性能项只剩这些：

1. 页面真实浏览器加载性能证据

### 当前优先级调整

1. 页面真实浏览器加载性能证据
2. 把本地已验证的读写链路优化同步到目标环境并做联动回归
3. 扫码链路的上游连接与浏览器层体验验证
4. 如果后续一定要补容器化变体，再补 Docker/Testcontainers 版本的等价实库压测

说明：

- 管理后台写删改在真实业务下并发通常低于 `50`
- 当前最值得继续投入的不是再生成更多重复日志，而是补齐真实浏览器层证据，并把现有数据库层结论用于后续优化回归

## 6. 推荐执行顺序

1. 在 Safari 开启 `Allow Remote Automation` 或切到可自动化浏览器
2. 补真实浏览器页面加载证据
3. 把本机 MariaDB 实库结果作为数据库层基线，用于后续修复前后对比
4. 如果未来要补容器化等价验证，再补 Docker / Testcontainers 变体

原因：

- 写链路的设计问题已经在本地 JVM、H2 和 MariaDB 实库三层回归过了
- 现在最缺的是“真实浏览器层证据”

## 7. 当前保留脚本与用途

- `api_latency_check.mjs`
  - 通用轻量接口延迟采样
- `public_read_concurrency_check.mjs`
  - 公开页面与公开只读资源并发读取
- `admin_api_latency_check.mjs`
  - 管理后台只读接口基线
- `scan_view_extreme_concurrency_check.mjs`
  - 扫码查看链路高强度读取
- `scan_view_ramp_limit_check.mjs`
  - 扫码查看链路阶梯升压与阈值确认
- `scan_verify_write_perf_check.mjs`
  - 扫码验证写链路压力测试
- `run_local_design_concurrency_probe.sh`
  - 本地 JVM 级并发设计探针
- `run_local_design_concurrency_with_metrics.sh`
  - 本地 JVM 级探针 + 资源采样
- `run_local_embeddeddb_write_perf.sh`
  - 本机嵌入式真实数据库写链路压测
- `run_local_embeddeddb_write_with_metrics.sh`
  - 本机嵌入式真实数据库写压 + 资源采样
- `prepare_mariadb_compat_libs.sh`
  - 为本机 MariaDB4j 准备用户态兼容动态库
- `run_local_mariadb_write_perf.sh`
  - 本机 MariaDB4j 实库写链路压测
- `run_local_mariadb_write_with_metrics.sh`
  - 本机 MariaDB4j 实库写压 + 资源采样
- `run_local_mariadb_read_perf.sh`
  - 本机 MariaDB4j 实库控制器级读链路优化前后对比
- `run_nameplate_pdf_perf.sh`
  - 名牌 PDF 本地并发与长尾基线
- `run_frontend_build_artifact_metrics.sh`
  - 三个前端 build / dist / gzip 留档
- `run_android_local_perf_baseline.sh`
  - Android 本地解析、签名、上传基线
- `run_browser_page_load_baseline.sh`
  - 真实浏览器页面加载基线入口

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
- 本机已经完成 MariaDB4j 实库版的真实数据库层写压与联合采样
- 如果未来一定要补 Docker/Testcontainers 变体，当前这台机器仍然缺：
  - Docker / Colima / Lima / nerdctl
- 当前 Safari WebDriver 还没有开启 `Allow Remote Automation`
- Java 24 + JaCoCo 0.8.12 在后端和 Android 侧会出现 JDK 类插桩告警，这不等于性能问题

## 10. 当前最值得落地的两项

1. 真实浏览器页面加载性能证据
   - 构建性能和接口性能都已经有基线
   - 现在缺的是浏览器首屏、首次交互、控制台和网络层证据

2. 把本机 MariaDB 实库基线用于目标环境回归
   - 当前数据库层已经有真实 MariaDB 读写证据
   - 下一步更有价值的是把这些本地已验证优化同步到目标环境，再做联动回归

## 11. 基于当前测试结论的优化建议

### 11.1 最高优先级

1. 提高 Nginx 上游连接容量
   - 当前 `worker_connections = 768`
   - 建议优先提升到 `4096` 或更高，并同步检查 `nofile` 上限

2. 把本地已完成的读写链路优化同步到目标环境
   - `sessionId -> UUID`
   - `recordId -> UUID`
   - `handleInbound -> receiver_phone + message_body` 候选匹配
   - `AuditLogService` 异步化
   - `authorizeVerifiedSession` 短 TTL 缓存
   - `ScanService` 详情短缓存
   - `auditLogs` SQL 过滤下推

3. 继续验证目标环境上的已验证 session 短 TTL 缓存
   - 对 `authorizeVerifiedSession` 增加 `30s ~ 120s` 的缓存

4. 继续验证目标环境上的扫码查看类审计日志异步化
   - `resolve / basic-info / archive / medications / scales`
   - 建议主请求先返回，再异步落库 `audit_log`

### 11.2 第二优先级

5. 为 `handleInbound` 的候选查询补索引并看 MySQL 执行计划
6. 精简详情查询，避免 `select *`
7. 降低 `scales` 的解析成本
   - 本地已完成“轻列表 / 重详情”拆分：`/api/scan/scales` 只返回摘要，逐题 `answers` 改为按量表详情单独读取
   - 本地 MariaDB 实库回归结果：
     - `protected-read-mix`：`P95 36ms -> 4ms`
     - `protected-read-mix-high-tier`：`P95 44ms -> 10ms`
   - 下一步价值在于同步到目标环境并复测 `1.2w+` 并发
8. 给详情结果做短 TTL 只读缓存
9. 审计写入进一步批量化
   - 本地已完成“异步逐条写 -> 异步批量刷写”
   - 适合继续用于削减扫码读链路附带写压力，尤其是 `VIEW_ARCHIVE / VIEW_BASIC_INFO / VIEW_MEDICATIONS / VIEW_SCALES / VIEW_SCALE_DETAIL`

### 11.3 第三优先级

9. 对 `nameplate pdf` 做短 TTL 缓存或预生成
   - 本地代码层已完成短 TTL 缓存验证，下一步重点是同步到目标环境并做联动回归
10. 复用字体、二维码、模板资源，避免每次完整生成
   - 本地代码层已完成字体与二维码资源复用验证，重复请求长尾已显著下降
11. 再评估 MySQL 与后端线程池参数

当前推荐顺序：

1. Nginx 连接上限
2. 同步写链路修复到目标环境
3. session 缓存
4. 审计异步化
5. `handleInbound` 索引与执行计划验证
6. 详情读取缓存与细分接口
7. `scales` 轻列表 / 重详情拆分同步到目标环境
8. 审计批量写入同步到目标环境
9. `nameplate pdf` 优化同步到目标环境并验证真实链路收益
