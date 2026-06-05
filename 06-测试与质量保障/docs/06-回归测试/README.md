# 回归测试

**最后更新**：2026-05-31

---

## 1. 当前已完成内容

已完成首轮完整回归 + 多轮单元测试补充 + 多轮性能/安全测试回归，并新增非单元测试扩展回归与深写操作回归。

---

## 2. 按类别聚合的问题、修复与当前状态

### 2.1 单元测试问题

| 问题 | 模块 | 文件 | 发现轮次 | 修复轮次 | 当前状态 |
|------|------|------|---------|---------|---------|
| 双定时器竞态 bug | 志愿者端 | `verificationStore.ts` | R24 | R25 | ✅ 已修复 |
| handleSubmit 无 catch | 志愿者端 | `ScaleFormPage.tsx` | R24 | R25 | ✅ 已修复 |
| handleSubmit 无 catch | 志愿者端 | `HealthRecordFormPage.tsx` | R24 | R25 | ✅ 已修复 |
| onSaveBatch 无 catch | 志愿者端 | `MedicationFormPage.tsx` | R24 | R25 | ✅ 已修复 |
| handleSendSms 无 catch | 志愿者端 | `BasicInfoFormPage.tsx` | R24 | R25 | ✅ 已修复 |
| RegisterResultDto 命名不一致 | 后端 | `RegisterResultDto.java` | R24 | R25 | ✅ 已添加 isSuccess() |
| handleSwitchBackup 向旧手机号发送 | 志愿者端 | `SmsVerifyPage.tsx` | R4 | R4 | ✅ 已修复 |

### 2.2 性能问题

| 问题 | 模块 | 发现时间 | 修复状态 | 当前状态 |
|------|------|---------|---------|---------|
| sessionId 并发主键冲突 | 后端 | 2026-05-26 | ✅ 改为 UUID | 修后 100% 成功 |
| recordId 并发主键冲突 | 后端 | 2026-05-26 | ✅ 改为 UUID | 修后 100% 成功 |
| handleInbound 全量 PENDING 扫描 | 后端 | 2026-05-26 | ✅ 改为候选匹配 | 修后 P95 2ms |
| Nginx worker_connections=768 过低 | 运维 | 2026-05-26 | ❌ 未在本文闭环 | 需线上复测 |
| nameplate PDF 长尾 | 后端 | 2026-05-26 | ⚠️ 本地已优化 | 需目标环境复测 |
| audit-logs 长尾 | 后端 | 2026-05-26 | ⚠️ 本地已优化 | 需目标环境复测 |

### 2.3 安全问题

| 问题 | 模块 | 发现时间 | 修复状态 | 当前状态 |
|------|------|---------|---------|---------|
| 缺 token/错 token 可访问 | 后端 | 2026-05-25 | ✅ 已拦截 | 401/403 |
| 缺签名可访问管理接口 | 后端 | 2026-05-25 | ✅ 已拦截 | 401 |
| nonce 重放未验证 | 后端 | 2026-05-30 前 | ✅ 已补线上深负例 | 400 拒绝 |
| timestamp 过期未验证 | 后端 | 2026-05-30 前 | ✅ 已补线上深负例 | 400 拒绝 |
| 跨角色访问未拦截 | 后端 | 2026-05-30 | ✅ 已修复 | 线上复测恢复为 403 |
| SQL 注入风格输入绕过风险 | 后端 | 2026-05-30 | ✅ 首轮未复现 | 线上输入安全冒烟通过 |
| 更完整防串档风险 | 后端 | 2026-05-30 | ✅ 首轮未复现 | 真实 session + 错 elderId 读取全部 403 |
| API 层可逆 XSS 风险 | 后端 | 2026-05-30 | ✅ 已补浏览器层验证 | 联系人详情页渲染为普通文本，`window.__slXss=false`、`imgCount=0` |
| 更深写操作回归缺口 | 功能测试 | 2026-05-30 前 | ✅ 已补临时老人/志愿者/邀请码/二维码/审批整链路 | 2026-05-30 深回归 `7/7` 通过 |

### 2.4 环境阻塞

| 阻塞项 | 影响 | 发现时间 | 当前状态 |
|--------|------|---------|---------|
| 全量 Flyway 迁移不适合当前 H2 集成链路 | 阻塞“直接复用全量迁移”的集成测试 | 2026-05-26 | ⚠️ 通过测试专用 schema/data 绕开 |
| 本机无可用 Docker 运行时 | 无法真正执行 Testcontainers | 2026-05-26 | ❌ `docker` 不存在，`/var/run/docker.sock` 指向的目标文件缺失 |
| JaCoCo + Java 24 不兼容 | 覆盖率日志有噪音 | 2026-05-25 | ⚠️ 本轮仍有告警，但 BUILD SUCCESS |
| Safari WebDriver 未开启 | 无法做 Playwright 级浏览器自动化 | 2026-05-26 | ❌ 未开启 |
| Android 无 MockK | 无法 mock 依赖 | 2026-05-25 | ❌ 未引入 |
| `./gradlew` 无执行权限 | 直接运行返回 126 | 2026-05-25 | ⚠️ 用 `bash ./gradlew` 绕过 |

### 2.5 测试编写陷阱

| 陷阱 | 说明 | 出现次数 |
|------|------|---------|
| mockRejectedValue + 无 catch | 被测组件无 catch 块时产生 unhandled rejection | 4 次 |
| vi.advanceTimersByTime 与多定时器 | 多个 setInterval 同时触发 | 2 次 |
| countdown 从 N 到 0 需要 N+1 次触发 | 初始值 countdown=60 需要 61 次触发 | 1 次 |
| jdbc.update() 参数计数 | SQL ? 占位符数量必须与 any() 数量一致 | 3 次 |
| data.intValue(any()) 默认返回 0 | used_count(0) >= max_uses(0) 为 true | 1 次 |

---

## 3. 修复与复测状态

| 修复 | 修复文件 | 发现轮次 | 复测结果 |
|------|---------|---------|---------|
| verificationStore 竞态 | `verificationStore.ts` | R24 | ✅ R25 复测通过 |
| 4 个表单页 catch 块 | `ScaleFormPage.tsx` 等 4 个文件 | R24 | ✅ R25 复测通过 |
| RegisterResultDto.isSuccess() | `RegisterResultDto.java` | R24 | ✅ R25 复测通过 |
| sessionId → UUID | `SmsRelayService.java` | 性能测试 | ✅ 修后 100% 成功 |
| recordId → UUID | `SmsRelayService.java` | 性能测试 | ✅ 修后 100% 成功 |
| handleInbound 候选匹配 | `SmsRelayService.java` | 性能测试 | ✅ 修后 P95 2ms |
| 角色边界路径约束 | `SecurityConfig.java` | 深安全负例 | ✅ 本地集成 + 线上深负例复测通过 |
| 深写操作回归矩阵 | `live_write_deep_regression.mjs` | 功能/E2E 收尾阶段 | ✅ 临时老人 -> 邀请码 -> 志愿者注册 -> 二维码停用审批 -> 清理回收全链路通过 |

---

## 4. 当前保留的关键基线

| 基线 | 路径 |
|------|------|
| 回归主文档 | `06-测试与质量保障/docs/06-回归测试/README.md` |
| 单元测试问题汇总 | `06-测试与质量保障/docs/01-单元测试/README.md` |
| 测试日志吸收与代码落实总审计 | `06-测试与质量保障/docs/00-总览/03-测试日志吸收与代码落实总审计.md` |
| 安全主文档 | `06-测试与质量保障/docs/05-安全与权限测试/README.md` |
| 集成测试主文档 | `06-测试与质量保障/docs/03-集成测试/README.md` |

---

## 5. 当前未完成部分

1. 真正执行 Testcontainers + MySQL 集成回归
2. 扩大浏览器层 XSS、SQL 注入和防串档的 payload / 页面矩阵
3. 完整家属邀请码注册浏览器闭环
4. Nginx 连接上限调整后需重跑线上并发回归
5. nameplate PDF 缓存优化后需重跑性能回归

---

## 6. 下一步建议

1. 安装可用 Docker 运行时，建立 Testcontainers 集成测试
2. 增加家属邀请码注册 + 浏览器级短信验证闭环
3. 扩大更深安全回归（SQL 注入 / XSS / 防串档）
4. 调整 Nginx worker_connections
5. 对 nameplate PDF 做缓存优化
