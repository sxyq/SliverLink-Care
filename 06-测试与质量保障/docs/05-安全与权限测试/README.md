# 安全与权限测试

**最后更新**：2026-06-06

---

## 1. 当前已完成内容

### 1.1 线上安全负例冒烟

已执行 5 轮线上 API 安全负例测试，覆盖以下检查点：

| 检查点 | 目标 API | 期望状态 | 最近结果 |
|--------|---------|---------|---------|
| 缺 token 访问管理后台 | `/api/admin/dashboard` | 401/403 | ✅ 401 |
| 错误 token 解析二维码 | `/api/scan/resolve` | 400/401/403/404 | ✅ 404 |
| 缺签名访问老人列表 | `/api/admin/elders` | 401/403 | ✅ 401 |

**最近一次通过时间**：2026-05-26T00:48:56Z

### 1.2 单元测试中的安全覆盖

| 测试类 | 覆盖内容 | 测试数 |
|--------|---------|-------|
| `JwtAuthenticationFilterTest` | 无 Auth header、非 Bearer、空 token、有效/无效 token、异常处理 | 10 |
| `RbacPermissionEvaluatorTest` | hasPermission 各分支、canAccessDataScope 各分支 | 13 |
| `SignatureInterceptorTest` | 签名拦截器 | 已有 |
| `SmsRelayServiceTest` | validateDeviceRequestSignature（缺 header、错 timestamp、过期、重放 nonce、错签名） | 5+ |

### 1.3 功能烟测中的安全验证

- 未登录访问后台数据被 403 拒绝 ✅
- 同一个验证 session 尝试跨老人读取被 403 拒绝 ✅
- 管理后台接口必须携带签名头 ✅

### 1.4 深安全负例测试

已新增一轮更深的安全负例测试，覆盖：

1. 非法 timestamp
2. 过期 timestamp
3. invalid signature
4. nonce replay
5. 志愿者 token 越权访问家属接口
6. 家属 token 越权访问管理员接口
7. 管理员 token 越权访问家属作用域接口

结果分两阶段：

1. 首轮深负例在线上发现真实越权漏洞
2. 修复 `SecurityConfig.java` 后重新部署，并在最新线上复测里全部恢复为预期拒绝

当前最新线上结果：

- 前 4 项：按预期拒绝
- 后 3 项：也已按预期返回 `403`

本地代码修补与验证：

- 已在 `SecurityConfig.java` 中补上角色级路径约束
- 已通过 `SecurityConfigIntegrationTest` 验证修复后的角色边界
- 已通过线上复测验证部署结果

### 1.5 输入安全与防串档专项

本轮继续新增并执行了 3 组安全测试：

1. `api_injection_smoke.mjs`
2. `api_cross_record_smoke.mjs`
3. `api_xss_reversible_smoke.mjs`

当前结论：

- SQL 注入风格输入没有绕过管理员登录、家属登录、邀请码预览或邀请码注册
- 更完整的跨老人读取检查已在线上跑通，错误 `elderId` 会稳定返回 `403`
- API 层可逆 XSS 测试表明：恶意字符串会被原样存储和返回；2026-05-31 已补真实浏览器渲染层验证，确认页面以普通文本显示 payload，没有创建 `img` 节点，也没有执行 `window.__slXss`
- 浏览器层验证使用的是家属端老人详情页联系人字段，验证完成后已把线上测试联系人数据恢复为原始值

### 1.6 微信小程序端本地安全覆盖

2026-06-06 小程序端已补齐以下本地安全与权限断言：

1. `httpClient` 带 Authorization、Cookie，401 时清理 `STORAGE_KEYS.authToken`。
2. 志愿者/家属权限矩阵覆盖基础信息、联系人、用药、量表、二维码、名牌操作。
3. 扫码验证页构建产物保留 `elderId + sessionId` 受保护路由字段。
4. 扫码验证页构建产物保留“验证会话与当前老人不一致，请返回重新扫码”防串档提示。
5. 受保护读取 service 覆盖 `elderId + sessionId` query 编码。
6. 工作台药品 service 覆盖志愿者 GET、405 fallback 和家属路径，避免角色路径串用。
7. 二维码/名牌 service 覆盖 `publicUrl/backQrUrl/backQrPayload/backQrImageBase64` 兼容字段，避免旧/新后端字段不一致导致二维码失效。
8. 路由契约审计覆盖 10 条受保护 query 合约，避免扫码档案/用药/量表和工作台详情/子页丢失 `elderId/sessionId`。
9. 平台契约审计覆盖扫码权限、短信剪贴板/H5 分支、电话、PDF、文件系统 fallback 和唯一 H5 `window.location` 分支。
10. 登出和 401 均会清登录态、当前老人、app session、启动上下文、API GET cache 和志愿者用药缓存。
11. `dist` 发布产物安全审计覆盖 `.map/sourceMappingURL`、私钥/密钥、JWT、硬编码手机号/身份证、本机路径、内网地址、数据库/SQL 文件、DevTools 私有配置、preview metadata、`.local/dist-preview/node_modules`、CI 预览二维码和敏感 DevTools query key。
12. 页面隐私/危险渲染审计覆盖 57 个源码文件、15 个页面、14 个组件、8 条页面隐私契约和当前 dist 38 个 JS/WXML 文件，确认 `RichText/web-view/dangerous HTML/eval/console` 命中为 0，QR/名牌图片源均走安全预览 resolver。
13. 当前 `dist/project.config.json` 仍保留 `uploadWithSourceMap=true`，但物理产物未发现 `.map` 或 `sourceMappingURL`；生产上传前需复核该策略。
14. `ci:upload` 通过 `preci:upload` 绑定本地小程序综合门禁，避免上传绕过安全检查。

---

## 2. 已覆盖的安全类型

| 类型 | 状态 | 说明 |
|------|------|------|
| 缺 token | ✅ 已覆盖 | 线上 + 单元测试 |
| 错 token | ✅ 已覆盖 | 线上 + 单元测试 |
| 缺签名 | ✅ 已覆盖 | 线上 + 单元测试 |
| 错签名 | ✅ 已覆盖 | 单元测试 + 线上深负例 |
| nonce 重放 | ✅ 已覆盖 | 单元测试 + 线上深负例 |
| timestamp 过期 | ✅ 已覆盖 | 单元测试 + 线上深负例 |
| 跨老人 session 拒绝 | ✅ 已覆盖 | 功能烟测 |
| 未验证访问拒绝 | ✅ 已覆盖 | 单元测试（requireVolunteerScope） |
| SQL 注入风格输入 | ✅ 已覆盖 | 新增线上输入安全冒烟 |
| 更完整防串档 | ✅ 已覆盖 | 新增线上真实 session + 错 elderId 读取拒绝 |
| API 层可逆 XSS | ✅ 已覆盖 | 已完成可逆写入/读回/恢复，并完成浏览器渲染层转义验证 |
| 微信小程序 token 清理 | ✅ 已覆盖 | `httpClient` 401 清 `STORAGE_KEYS.authToken` |
| 微信小程序认证态隐私擦除 | ✅ 已覆盖 | 登出/401 清登录态、当前老人、app session、启动上下文、API cache 和用药缓存 |
| 微信小程序角色权限矩阵 | ✅ 已覆盖 | 志愿者/家属 UI 权限函数本地测试 |
| 微信小程序防串档路由字段 | ✅ 已覆盖本地 | `sessionId + elderId` service 契约、route contract 和 artifact 检查 |
| 微信小程序平台能力边界 | ✅ 已覆盖本地 | `npm run test:platform-contract` 覆盖 27 个 Taro 方法和 9 条平台能力契约 |
| 微信小程序页面隐私/危险渲染 | ✅ 已覆盖本地 | `npm run test:page-privacy-render` 覆盖字段分级、危险渲染 API、console、敏感 query/storage sink 和 QR/名牌图片源 |
| 微信小程序发布产物泄漏 | ✅ 已覆盖本地 | `npm run test:dist-security` 扫描 73 个 `dist` 文件 |

---

## 3. 历史发现并已修复的问题

| 问题 | 当前状态 |
|------|---------|
| 志愿者 token 访问家属接口返回 `200` | ✅ 已在目标环境修复并复测为 `403` |
| 家属 token 携带合法签名访问管理员接口返回 `200` | ✅ 已在目标环境修复并复测为 `403` |
| 管理员 token 访问家属作用域接口返回 `200` | ✅ 已在目标环境修复并复测为 `403` |

本地代码已修补：

- `/api/admin/**`、`/api/rbac/**`、`/api/audit-logs/**`、`/api/sms-relay/admin/**` -> `SYSTEM_ADMIN`
- `/api/volunteer/me/**`、`/api/elder/**` -> `VOLUNTEER`
- `/api/family/**` -> `FAMILY`

当前这批问题已经拿到“修复后线上复测”证据。

---

## 4. 当前还没做的深安全项

| 类型 | 说明 | 优先级 |
|------|------|--------|
| 防串档 | 已完成更完整线上校验，但仍缺浏览器联动与更多数据域 | P1 |
| 脱敏断言 | 未验证状态只展示脱敏姓名/电话/档案号（单元测试已部分覆盖 maskPhone/maskName/maskIdCard） | P2 |
| JWT 过期 | 过期 token 应被拒绝 | P2 |
| SQL 注入 | 已做首轮输入安全负例，仍缺更系统的 payload 矩阵 | P2 |
| XSS | 浏览器渲染层已经证明不会执行联系人字段中的 `img/onerror` payload；仍缺更大 payload 矩阵和更多页面联动 | P2 |
| 微信小程序运行时安全专项 | 本地已覆盖 service/stub/artifact/route/platform/backend/page privacy/dist security；真机合法域名、Cookie、文件系统、PDF 打开和页面渲染证据仅在后续运行时安全专项补充 | P1 |

---

## 5. 当前保留的关键基线

| 基线 | 路径 |
|------|------|
| 安全主文档 | `06-测试与质量保障/docs/05-安全与权限测试/README.md` |
| 测试日志吸收与代码落实总审计 | `06-测试与质量保障/docs/00-总览/03-测试日志吸收与代码落实总审计.md` |
| 角色边界配置 | `04-统一后端/src/main/java/com/silverlink/care/config/SecurityConfig.java` |
| 输入安全集成测试 | `04-统一后端/src/test/java/com/silverlink/care/security/InputSafetyIntegrationTest.java` |
| 扫码 session 作用域集成测试 | `04-统一后端/src/test/java/com/silverlink/care/module/scan/ScanSessionScopeIntegrationTest.java` |
| 深安全脚本 | `06-测试与质量保障/scripts/security/` |
| 微信小程序安全/回归报告 | `06-测试与质量保障/reports/regression/20260606-190933-weapp-local-comprehensive/summary.md` |
| 微信小程序发布产物安全审计 | `08-微信小程序端/scripts/check-dist-security.mjs` |

---

## 6. 当前阻塞

- SQL 注入还没形成更大 payload 矩阵或自动化扫描器
- 防串档还缺更多数据域与浏览器联动链路
- 浏览器层 XSS 已验证联系人详情页；仍缺更多页面与 payload 变体
- 微信开发者工具当前 `islogin:true` 但 access token 过期，仅影响后续小程序真机/模拟器运行时安全专项，不阻塞当前代码层安全结论

---

## 7. 下一步建议

1. 扩展 SQL 注入 payload 矩阵，并评估引入 OWASP ZAP
2. 增加更多数据域的防串档脚本与集成测试
3. 把浏览器层 XSS 断言扩展到更多页面和 payload 变体
4. 若另开小程序运行时安全专项，登录微信开发者工具后补合法域名、Cookie、PDF 下载和页面渲染安全证据
