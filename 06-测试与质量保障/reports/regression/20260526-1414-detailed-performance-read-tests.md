# 2026-05-26 详细性能测试记录

## 本轮目标

- 对线上环境执行更细的只读性能测试。
- 补足“并发读取”维度的数据，而不做破坏性写压测。
- 分离公开页面/公开资源 与 管理后台已登录只读 API 两类性能基线。
- 对慢点做二次定点加压，确认是否存在稳定长尾。

## 实际执行内容

### 新增脚本

- `06-测试与质量保障/scripts/performance/benchmark_utils.mjs`
- `06-测试与质量保障/scripts/performance/public_read_concurrency_check.mjs`
- `06-测试与质量保障/scripts/performance/admin_api_latency_check.mjs`

### 脚本能力

- 输出 JSON 和 Markdown 两份性能报告。
- 记录：
  - 请求数
  - 成功数/失败数
  - 平均耗时
  - P50 / P95 / P99
  - 最大耗时
  - 平均响应体大小
  - HTTP 状态分布
- 支持按目标名过滤，只压指定接口/页面。

## 环境校正

本轮先发现一个真实部署差异：

- 前端入口在 `http://sxyq27.online/silverlink/...`
- 后端 API 实际前缀是 `http://sxyq27.online/silverlink-api/api/...`

因此新脚本默认 API Base 已校正为：

- `http://sxyq27.online/silverlink-api`

## 执行命令

### 公开页面与公开资源并发读取

```bash
node "06-测试与质量保障/scripts/performance/public_read_concurrency_check.mjs"
```

### 管理后台只读 API 并发读取

```bash
node "06-测试与质量保障/scripts/performance/admin_api_latency_check.mjs"
```

### 慢点定点加压

```bash
SILVERLINK_PERF_TARGETS='nameplate-pdf' SILVERLINK_PERF_ITERATIONS=12 SILVERLINK_PERF_CONCURRENCY=8 \
node "06-测试与质量保障/scripts/performance/public_read_concurrency_check.mjs"
```

```bash
SILVERLINK_ADMIN_PERF_TARGETS='admin-audit-logs' SILVERLINK_ADMIN_PERF_ITERATIONS=12 SILVERLINK_ADMIN_PERF_CONCURRENCY=6 \
node "06-测试与质量保障/scripts/performance/admin_api_latency_check.mjs"
```

## 主要产物

### 首轮公开只读并发

- `06-测试与质量保障/reports/performance/2026-05-26T06-10-58-153Z-public-read-concurrency.json`
- `06-测试与质量保障/reports/performance/2026-05-26T06-10-58-153Z-public-read-concurrency.md`

### 首轮后台只读 API 并发

- `06-测试与质量保障/reports/performance/2026-05-26T06-11-08-771Z-admin-api-latency.json`
- `06-测试与质量保障/reports/performance/2026-05-26T06-11-08-771Z-admin-api-latency.md`

### 二次定点加压

- `06-测试与质量保障/reports/performance/2026-05-26T06-12-04-882Z-public-read-concurrency.json`
- `06-测试与质量保障/reports/performance/2026-05-26T06-12-04-882Z-public-read-concurrency.md`
- `06-测试与质量保障/reports/performance/2026-05-26T06-12-07-890Z-admin-api-latency.json`
- `06-测试与质量保障/reports/performance/2026-05-26T06-12-07-890Z-admin-api-latency.md`

## 结果摘要

### 公开页面与公开资源

首轮配置：

- 每目标 `24` 次请求
- 并发 `6`

聚合结果：

- 总请求数：`144`
- 成功数：`144`
- 失败数：`0`
- 平均耗时：`309ms`
- `P50 = 50ms`
- `P95 = 1956ms`
- `P99 = 3093ms`

关键拆分：

- 扫码端首页：`P95 105ms`
- 管理后台首页：`P95 49ms`
- 志愿者端首页：`P95 50ms`
- 邀请码预览：`P95 99ms`
- 名牌预览：`P95 59ms`
- 名牌 PDF：`P95 3093ms`

结论：

- 公开 HTML 与轻量 JSON 接口整体很快，基本在 `50~100ms` 级别。
- 公开链路的长尾几乎完全由 `nameplate-pdf` 拉高。

### 管理后台只读 API

首轮配置：

- 每目标 `18` 次请求
- 并发 `4`

聚合结果：

- 总请求数：`216`
- 成功数：`216`
- 失败数：`0`
- 平均耗时：`315ms`
- `P50 = 50ms`
- `P95 = 2164ms`
- `P99 = 4845ms`

关键拆分：

- `admin-dashboard`：`P95 100ms`
- `admin-elders`：`P95 53ms`
- `admin-volunteers`：`P95 58ms`
- `admin-qrcodes`：`P95 68ms`
- `admin-audit-logs`：`P95 7649ms`
- `admin-family-bindings`：`P95 356ms`
- `admin-invitations`：`P95 384ms`
- `admin-smsrelay-sessions`：`P95 193ms`

结论：

- 后台大多数读接口表现正常。
- `admin-audit-logs` 明显是当前后台最大性能热点。

### 慢点定点加压

#### 名牌 PDF

配置：

- 目标：`nameplate-pdf`
- 请求数：`12`
- 并发：`8`

结果：

- 平均耗时：`3180ms`
- `P50 = 2955ms`
- `P95 = 5859ms`
- 成功率：`100%`

#### 审计日志

配置：

- 目标：`admin-audit-logs`
- 请求数：`12`
- 并发：`6`

结果：

- 平均耗时：`3822ms`
- `P50 = 3065ms`
- `P95 = 5936ms`
- 成功率：`100%`

结论：

- 这两个慢点不是偶发抖动，而是稳定偏慢。
- 在并发提升后，二者都出现了 `3~6s` 级别的稳定长尾。

## 结合代码的性能判断

### 1. 审计日志接口慢是可解释的

对应实现：

- `04-统一后端/src/main/java/com/silverlink/care/infrastructure/persistence/SilverLinkDataService.java`

已确认问题点：

- `auditLogs()` 直接 `select * from audit_log order by time desc limit 500`
- 查询后在 Java 侧做过滤，而不是 SQL 侧过滤
- 每行都会做访客姓名、手机号、身份证解密与脱敏处理

这意味着：

- 一次请求会先把最多 `500` 行全量捞出来
- 再逐条做解密和字段映射
- 返回体也很大，本轮平均响应体约 `199 KB`

### 2. 名牌 PDF 慢是可解释的

对应实现：

- `04-统一后端/src/main/java/com/silverlink/care/module/nameplate/NameplateService.java`

已确认问题点：

- `generateDemoPdf()` 每次请求都会：
  - 查老人档案
  - 解析/构造二维码访问地址
  - 现场生成二维码位图
  - 加载中文字体
  - 生成整页 PDF
  - 内存保存并返回字节数组

这是一条“计算 + 图像 + PDF 序列化”都在请求线程内完成的链路，所以在并发上升后出现秒级长尾是符合实现现状的。

## 当前性能结论

### 表现正常

- 三个前端入口页
- 邀请码预览
- 名牌预览
- 管理后台 dashboard / elders / volunteers / qrcodes
- 短信中转后台只读接口

### 当前热点

1. `GET /api/nameplates/{elderId}/pdf`
2. `GET /api/admin/audit-logs`

### 次级关注

1. `GET /api/admin/family-bindings`
2. `GET /api/admin/invitations`
3. `GET /api/sms-relay/admin/sessions`

## 建议的下一步优化顺序

1. 优化审计日志接口
   - SQL 侧筛选
   - 不再固定全量取 `500`
   - 加分页
   - 只查必要列
   - 减少逐条解密成本
2. 优化名牌 PDF
   - 字体与模板资源复用
   - 对二维码图像或 PDF 结果做短 TTL 缓存
   - 避免每次请求都完整生成
3. 再补一轮本地/测试库压测
   - 针对扫码验证链路
   - 针对后台读接口
   - 区分纯接口耗时与数据库耗时

## 说明

- 本轮只做了线上只读性能测试。
- 没有执行会污染业务数据的批量写入压测。
- 管理后台登录使用的是线上当前可用的管理员账号登录流程，脚本未把 JWT 明文写入报告。
