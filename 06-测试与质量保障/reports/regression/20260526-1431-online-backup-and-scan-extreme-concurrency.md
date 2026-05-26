# 2026-05-26 线上备份与扫码查看极限并发记录

## 背景

用户要求：

- 目标必须是线上服务
- 在任何新的极限并发测试之前，先完成线上备份
- 备份完成后，才能继续测试扫码查看与登记信息详细查看链路

说明：

- 本轮先完成 `124.222.153.108` 线上 SilverLink 服务备份
- 再执行“扫码查看 + 详细信息查看”极限并发测试

## 线上部署核对

通过 SSH 核对到的关键事实：

- 主机：`124.222.153.108`
- 前端根路径：
  - `/silverlink/scan/`
  - `/silverlink/volunteer/`
  - `/silverlink/admin/`
- 后端入口：
  - `/silverlink-api/`
- 后端进程：
  - `/usr/bin/java -jar /opt/silverlink-care/backend/silverlink-care-backend.jar --server.port=18081`
- 数据库：
  - Docker 容器 `silverlink-mysql`
  - 宿主机绑定目录：`/opt/silverlink-care/mysql`
- Nginx 当前配置文件：
  - `/etc/nginx/conf.d/sxyq27-non-vulnscan.conf`

## 备份动作

备份目录：

- `/opt/silverlink-care/backups/pre-perf-20260526-142753`

备份内容：

- 当前 Nginx 配置
- 当前 systemd 服务定义
- 当前线上后端 jar
- 当前后端环境变量文件
- 当前 MySQL root password 文件
- 当前前端目录压缩包
- 当前后端源码目录压缩包
- 当前 MySQL 容器 inspect 信息
- 当前 `silverlink_care` 数据库 `mysqldump`
- 全部备份文件的 `SHA256SUMS.txt`

备份清单核验：

- `backend-src.tgz` `68M`
- `frontend.tgz` `366K`
- `silverlink-care-backend.jar` `77M`
- `nginx-sxyq27-non-vulnscan.conf` `7.8K`
- `silverlink-care-backend.service.txt` `510B`
- `silverlink-mysql.inspect.json` `8.8K`
- `silverlink_care.sql` `359K`
- `SHA256SUMS.txt` `1.3K`

## 压测脚本

使用脚本：

- `06-测试与质量保障/scripts/performance/scan_view_extreme_concurrency_check.mjs`

脚本能力：

- 自动登录管理员
- 自动读取当前线上二维码列表
- 自动提取可用扫码 token
- 自动调用 `/api/scan/verification/identity` 创建验证成功会话
- 分别压：
  - `POST /api/scan/resolve`
  - `GET /api/scan/basic-info`
  - `GET /api/scan/archive`
  - `GET /api/scan/medications`
  - `GET /api/scan/scales`
- 报告中自动隐藏 `sessionId`

## 正式极限并发参数

本轮采用“备份后”的正式参数：

- `scan-resolve`
  - 请求数：`150`
  - 并发：`40`
- 详细信息 4 个接口
  - 每接口请求数：`150`
  - 每接口并发：`40`

总请求数：

- `750`

## 测试结果

报告文件：

- `06-测试与质量保障/reports/performance/2026-05-26T06-29-16-075Z-scan-view-extreme-concurrency.json`
- `06-测试与质量保障/reports/performance/2026-05-26T06-29-16-075Z-scan-view-extreme-concurrency.md`

聚合结果：

- 总请求数：`750`
- 成功数：`750`
- 失败数：`0`
- 平均耗时：`63ms`
- `P50 = 57ms`
- `P95 = 105ms`
- `P99 = 131ms`

分目标结果：

- `scan-resolve`
  - `150/150` 成功
  - `P95 131ms`
  - `P99 134ms`
- `scan-basic-info`
  - `150/150` 成功
  - `P95 78ms`
  - `P99 80ms`
- `scan-archive`
  - `150/150` 成功
  - `P95 97ms`
  - `P99 107ms`
- `scan-medications`
  - `150/150` 成功
  - `P95 79ms`
  - `P99 83ms`
- `scan-scales`
  - `150/150` 成功
  - `P95 77ms`
  - `P99 81ms`

## 结论

在本轮“线上已备份”的前提下：

- 扫码查看公开链路稳定
- 验证后详细信息读取链路稳定
- `40` 并发、`750` 总请求量下未出现：
  - 超时
  - `401/403`
  - `404`
  - `5xx`
  - 会话串档

当前这部分线上链路的瓶颈并不在扫码查看与详细信息读取。

## 风险与备注

- 扫码详细信息查看接口会写审计日志，因此虽然属于“读链路”，仍会产生业务审计记录。
- 本轮没有继续向更高强度推进到 `80+` 并发或数千请求，以避免在生产环境上无必要地放大冲击。
- 如果后续继续加压，建议先把：
  - 审计日志接口
  - 名牌 PDF 接口
 作为优先高风险对象，因为前几轮性能测试已经证明它们更容易出现秒级长尾。
