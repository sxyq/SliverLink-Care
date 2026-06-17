# 回归测试

**最后更新**：2026-06-06

---

## 1. 当前已完成内容

已完成首轮完整回归 + 多轮单元测试补充 + 多轮性能/安全测试回归，并新增非单元测试扩展回归与深写操作回归。

2026-06-06 追加微信小程序端本地综合回归：

- `npm run test:unit`：22/22 通过。
- `npm run test:static`：通过，覆盖发布忽略、CI 私钥边界、HTTPS API fallback、HTTP cookie/401 清理和源码敏感材料扫描。
- `npm run test:route-contract`：通过，确认 15 个路由常量、15 个注册页面、49 处源码路由引用、10 条受保护 query 合约、12 条导航契约和 0 个 `switchTab` 残留。
- `npm run test:platform-contract`：通过，确认 27 个 Taro 平台方法、9 条平台能力契约和唯一 H5 `window.location` 分支。
- `npm run test:backend-contract`：通过，确认 38 条小程序关键 API method/path 与统一后端 controller route 匹配，并锁定 15 条 response shape 合约。
- `npm run test:page-privacy-render`：通过，确认 57 个源码文件、15 个页面、14 个组件、8 条隐私契约、危险渲染/console 命中 0、3 个 `<Image src>` 绑定均走安全 resolver。
- `npm run typecheck`：通过。
- `npm run test:build-performance`：通过，内部执行 `npm run build:weapp` 并校验 `< 40s` 构建耗时阈值。
- `npm run test:dist-security`：通过，扫描 73 个 `dist` 文件，覆盖 source map、私钥/密钥、JWT、硬编码手机号/身份证、本机路径、内网地址、数据库/SQL 文件、DevTools 私有配置、CI 临时产物和敏感 DevTools query 泄漏面。
- `npm run test:artifact`：通过。
- `npm run test:performance-budget`：通过，按性能文档阈值确认总包 `< 2MB`、扫码分包 `< 500KB`、工作台分包 `< 700KB`。
- `npm run ci:upload`：已绑定 `preci:upload`，上传前自动运行 `run_weapp_local_checks.sh`。
- `bash 06-测试与质量保障/scripts/regression/run_weapp_local_checks.sh`：通过。
- `SILVERLINK_RUN_WEAPP_DEVTOOLS=1 bash 06-测试与质量保障/scripts/regression/run_all_checks.sh`：可选触发微信开发者工具运行时复测；不属于当前代码层回归门禁。
- `node 06-测试与质量保障/scripts/regression/check_weapp_evidence.mjs`：通过，校验小程序代码层报告、六层矩阵、性能 JSON、命令日志、CI 预览二维码和非目标说明引用一致。
- `npm run ci:preview`：通过并生成预览二维码。

报告路径：`06-测试与质量保障/reports/regression/20260606-190933-weapp-local-comprehensive/summary.md`

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
| 小程序扫码入口缺平台 stub 覆盖 | 微信小程序端 | `scripts/unit/taro-stub.ts` / `logic.test.ts` | 2026-06-06 | 2026-06-06 | ✅ 已补相机权限、扫码取消、无效 QR、成功跳转 |
| 小程序 service 契约缺本地覆盖 | 微信小程序端 | `scripts/unit/logic.test.ts` | 2026-06-06 | 2026-06-06 | ✅ 已补 HTTP、扫码、受保护读取、工作台药品、家属药品 void 响应、二维码/名牌 |

### 2.2 性能问题

| 问题 | 模块 | 发现时间 | 修复状态 | 当前状态 |
|------|------|---------|---------|---------|
| sessionId 并发主键冲突 | 后端 | 2026-05-26 | ✅ 改为 UUID | 修后 100% 成功 |
| recordId 并发主键冲突 | 后端 | 2026-05-26 | ✅ 改为 UUID | 修后 100% 成功 |
| handleInbound 全量 PENDING 扫描 | 后端 | 2026-05-26 | ✅ 改为候选匹配 | 修后 P95 2ms |
| Nginx worker_connections=768 过低 | 运维 | 2026-05-26 | ❌ 未在本文闭环 | 需线上复测 |
| nameplate PDF 长尾 | 后端 | 2026-05-26 | ⚠️ 本地已优化 | 需目标环境复测 |
| audit-logs 长尾 | 后端 | 2026-05-26 | ⚠️ 本地已优化 | 需目标环境复测 |
| 小程序包体基线缺失 | 微信小程序端 | 2026-06-06 | ✅ 已补 CI preview 包体记录 | `__FULL__` 575877 bytes |
| 小程序构建耗时门禁缺失 | 微信小程序端 | 2026-06-06 | ✅ 已补 build performance | 13703/40000 ms，263 modules transformed |
| 小程序本地包体预算缺口 | 微信小程序端 | 2026-06-06 | ✅ 已补 performance budget | 总包 529578/2097152，扫码 55692/512000，工作台 78443/716800 |

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
| 小程序防串档产物回归缺口 | 微信小程序端 | 2026-06-06 | ✅ 已补 artifact 检查 | 验证页保留 `sessionId/elderId` 与跨老人提示 |
| 小程序发布/配置静态审计缺口 | 微信小程序端 | 2026-06-06 | ✅ 已补 static audit | `.local/`、CI 忽略、私钥占位、HTTPS API fallback、cookie/401 清理、源码敏感材料扫描 |
| 小程序发布产物泄漏审计缺口 | 微信小程序端 | 2026-06-06 | ✅ 已补 dist security audit | `dist` 73 个文件无 source map、私钥/密钥、JWT、硬编码手机号/身份证、本机路径、内网地址、数据库/SQL、DevTools 私有配置、CI 临时产物或敏感 query 泄漏 |
| 小程序上传绕过本地门禁 | 微信小程序端 | 2026-06-06 | ✅ 已补 `preci:upload` | `npm run ci:upload` 前自动执行 `run_weapp_local_checks.sh` |
| 小程序 service 与后端路由/字段漂移风险 | 微信小程序端 / 统一后端 | 2026-06-06 | ✅ 已补 backend contract audit | 38 条小程序 API 契约匹配 94 条后端 controller route，15 条 response shape 合约 |
| 小程序路由/导航参数漂移风险 | 微信小程序端 | 2026-06-06 | ✅ 已补 route contract audit | 15 个路由常量、15 个注册页面、49 处路由引用、10 条 query 合约、12 条导航契约 |
| 小程序平台能力调用漂移风险 | 微信小程序端 | 2026-06-06 | ✅ 已补 platform contract audit | 27 个 Taro 方法、9 条平台能力契约、唯一 H5 `window.location` 分支 |
| 小程序认证态本地隐私残留 | 微信小程序端 | 2026-06-06 | ✅ 已补隐私擦除单测/静态审计 | 登出/401 清登录态、当前老人、app session、启动上下文、API cache 和用药缓存 |
| 小程序页面隐私/危险渲染漂移风险 | 微信小程序端 | 2026-06-06 | ✅ 已补 page privacy render audit | 15 个页面、14 个组件、8 条隐私契约，危险渲染/console 命中 0 |

### 2.4 环境阻塞

| 阻塞项 | 影响 | 发现时间 | 当前状态 |
|--------|------|---------|---------|
| 全量 Flyway 迁移不适合当前 H2 集成链路 | 阻塞“直接复用全量迁移”的集成测试 | 2026-05-26 | ⚠️ 通过测试专用 schema/data 绕开 |
| 本机无可用 Docker 运行时 | 无法真正执行 Testcontainers | 2026-05-26 | ❌ `docker` 不存在，`/var/run/docker.sock` 指向的目标文件缺失 |
| JaCoCo + Java 24 不兼容 | 覆盖率日志有噪音 | 2026-05-25 | ⚠️ 本轮仍有告警，但 BUILD SUCCESS |
| Safari WebDriver 未开启 | 无法做 Playwright 级浏览器自动化 | 2026-05-26 | ❌ 未开启 |
| Android 无 MockK | 无法 mock 依赖 | 2026-05-25 | ❌ 未引入 |
| `./gradlew` 无执行权限 | 直接运行返回 126 | 2026-05-25 | ⚠️ 用 `bash ./gradlew` 绕过 |
| 微信开发者工具账号 token 过期 | 仅影响后续小程序 DevTools 模拟器截图与点击验证 | 2026-06-06 | ⚠️ 23:11 复测时 9420 可启动且 `islogin:true`，但 `open` 仍返回 `INVALID_LOGIN, access_token expired [20260606 23:11:29]`；不影响当前代码层回归 |
| `miniprogram-automator` 未安装 | 仅影响后续小程序 UI 自动化回放 | 2026-06-06 | ⚠️ 当前 node_modules 不存在该包；不影响当前代码层回归 |

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
| 小程序本地综合门禁 | `run_weapp_local_checks.sh` | 2026-06-06 | ✅ 单测、静态审计、路由契约、平台契约、后端契约、页面隐私渲染、类型检查、Taro build 耗时、dist security、artifact、performance budget 检查全部通过 |
| 小程序静态安全/配置审计 | `run-static-audit.mjs` | 2026-06-06 | ✅ 12 条 condition、98 个源码/配置/脚本文件审计通过 |
| 小程序路由/导航契约审计 | `check-route-contract.mjs` | 2026-06-06 | ✅ 15 个路由常量、15 个注册页面、10 条受保护 query 合约、12 条导航契约 |
| 小程序平台能力契约审计 | `check-platform-contract.mjs` | 2026-06-06 | ✅ 27 个 Taro 方法、9 条平台能力契约、1 个 H5-only window 分支 |
| 小程序后端契约审计 | `check-backend-contract.mjs` | 2026-06-06 | ✅ 38 条小程序 API 契约匹配统一后端 controller route，15 条 response shape 合约 |
| 小程序页面隐私/危险渲染审计 | `check-page-privacy-render.mjs` | 2026-06-06 | ✅ 15 个页面、14 个组件、8 条隐私契约、危险渲染/console 命中 0 |
| 小程序构建耗时审计 | `run-build-performance-check.mjs` | 2026-06-06 | ✅ `build:weapp` 低于 40s 阈值 |
| 小程序发布产物安全审计 | `check-dist-security.mjs` | 2026-06-06 | ✅ 73 个 dist 文件审计通过，保留 `uploadWithSourceMap=true` 生产策略提示 |
| 小程序本地性能预算审计 | `check-performance-budget.mjs` | 2026-06-06 | ✅ 总包/扫码分包/工作台分包均低于文档阈值，gzip 指标已留基线 |
| 小程序 DevTools 可选复测入口 | `run_weapp_devtools_checks.sh` | 2026-06-06 | ⚠️ 已固化命令与 condition 清单；仅供后续运行时/UI 专项使用 |
| 小程序微信 CI 预览 | `npm run ci:preview` | 2026-06-06 | ✅ 微信 CI 编译、打包、上传预览通过 |
| 小程序报告证据一致性 | `check_weapp_evidence.mjs` | 2026-06-06 | ✅ 6 层矩阵、性能 JSON、命令日志、CI 预览二维码和本轮非目标说明校验通过 |

---

## 4. 当前保留的关键基线

| 基线 | 路径 |
|------|------|
| 回归主文档 | `06-测试与质量保障/docs/06-回归测试/README.md` |
| 单元测试问题汇总 | `06-测试与质量保障/docs/01-单元测试/README.md` |
| 测试日志吸收与代码落实总审计 | `06-测试与质量保障/docs/00-总览/03-测试日志吸收与代码落实总审计.md` |
| 安全主文档 | `06-测试与质量保障/docs/05-安全与权限测试/README.md` |
| 集成测试主文档 | `06-测试与质量保障/docs/03-集成测试/README.md` |
| 微信小程序本地综合报告 | `06-测试与质量保障/reports/regression/20260606-190933-weapp-local-comprehensive/summary.md` |
| 微信小程序预览二维码 | `06-测试与质量保障/reports/regression/20260606-190933-weapp-local-comprehensive/screenshots/miniprogram-ci-qrcode.png` |
| 微信小程序 DevTools 复测清单 | `06-测试与质量保障/docs/06-回归测试/微信小程序DevTools复测清单.md` |

---

## 5. 当前未完成部分

1. 真正执行 Testcontainers + MySQL 集成回归
2. 扩大浏览器层 XSS、SQL 注入和防串档的 payload / 页面矩阵
3. 完整家属邀请码注册浏览器闭环
4. Nginx 连接上限调整后需重跑线上并发回归
5. nameplate PDF 缓存优化后需重跑性能回归
6. 若另开小程序运行时/UI 专项，微信开发者工具登录后补模拟器/真机截图与真实点击链路

---

## 6. 下一步建议

1. 安装可用 Docker 运行时，建立 Testcontainers 集成测试
2. 增加家属邀请码注册 + 浏览器级短信验证闭环
3. 扩大更深安全回归（SQL 注入 / XSS / 防串档）
4. 调整 Nginx worker_connections
5. 对 nameplate PDF 做缓存优化
6. 若另开小程序运行时/UI 专项，登录微信开发者工具并按 `project.config.json` condition 完成逐页回归
