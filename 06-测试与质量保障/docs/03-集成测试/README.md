# 集成测试

**最后更新**：2026-06-06

---

## 1. 当前已完成内容

### 1.1 后端单元测试层（JUnit 5 + Mockito）

当前后端已有 ~47 个测试类、603 个测试用例，但这些是**纯单元测试**，使用 Mock 替代了真实数据库和外部服务。

### 1.2 Spring Boot 集成测试已落地

当前已经新增并跑通：

- `SecurityConfigIntegrationTest`
- `InvitationRegistrationIntegrationTest`
- `InputSafetyIntegrationTest`
- `ScanSessionScopeIntegrationTest`
- `InvitationRegistrationMySqlContainerIntegrationTest`

覆盖能力包括：

1. 角色边界拦截
2. 邀请码预览
3. 邀请码注册
4. 家属登录
5. 家属读取本人绑定老人
6. 跨老人读取返回 `403`
7. SQL 注入风格输入不会绕过登录/预览接口
8. 已验证扫码 session 只能读取绑定老人本人数据
9. MySQL Testcontainers 集成链路代码已落地

### 1.3 微信小程序 service 契约集成入口

2026-06-06 已为 `08-微信小程序端` 增加本地 service 契约测试和微信 CI 预览入口：

1. `httpClient` 覆盖 Authorization、Cookie、envelope 解包、401 清 token、GET cache、downloadFile。
2. 扫码 service 覆盖 `/api/scan/resolve`、`/api/scan/verification/start`、`/api/scan/verification/status`、`/api/scan/verification/identity` 的 URL/method/body/query 映射。
3. 受保护读取覆盖 `basic-info/archive/medications/scales` 的 `elderId + sessionId` 查询契约。
4. 工作台 service 覆盖志愿者药品 GET、405 缓存 fallback、家属用药路径、二维码/名牌兼容字段。
5. `npm run test:backend-contract` 覆盖 38 条小程序关键 API method/path，扫描统一后端 94 条 controller route，覆盖 `ScanController`、`VolunteerController`、`FamilyController`、`ElderController`、`InvitationController`、`NameplateController`。
6. `npm run test:backend-contract` 同时锁定 15 条 response shape 合约：登录/注册/个人资料、邀请码预览、老人 DTO、基础信息、联系人、用药、量表、二维码、名牌/PDF 和家属药品 void 响应。
7. `npm run test:route-contract` 覆盖 10 条受保护 query 合约和 12 条导航契约，确认扫码/工作台页面间参数透传不漂移。
8. `npm run test:platform-contract` 覆盖 Taro 方法面、扫码权限、短信剪贴板/H5 分支、电话、PDF、文件系统 fallback 等 9 条平台能力契约。
9. `npm run test:page-privacy-render` 覆盖 15 个页面、14 个组件、8 条页面隐私/危险渲染契约和当前 dist 38 个 JS/WXML 文件。
10. `npm run ci:preview` 已通过微信 CI 服务端编译和上传预览，证明当前包可被微信 CI 接收。

---

## 2. 当前真实跑到的层级

| 层级 | 状态 | 说明 |
|------|------|------|
| JUnit 5 + Mockito 单元测试 | ✅ 已完成 | 603 个用例全部通过 |
| H2 嵌入式数据库（MySQL mode） | ✅ 已完成 | 性能测试中已验证真实 JDBC 路径 |
| Spring Boot 集成测试（@SpringBootTest + MockMvc） | ✅ 已完成 | 已有 4 条真实集成链路本地跑通 |
| Testcontainers + MySQL | ⚠️ 代码已落地，运行未闭环 | `InvitationRegistrationMySqlContainerIntegrationTest` 已存在，但本机缺少可用 Docker 运行时；`/var/run/docker.sock` 指向的 `~/.docker/run/docker.sock` 在当前机器上不存在，当前自动跳过 |
| 微信小程序 service 契约 | ✅ 已完成本地 mock Taro request 层 | 覆盖小程序到后端 API 的 URL/method/body/query/DTO 兼容，但不等同于真机真实网络闭环 |
| 微信小程序路由/导航契约 | ✅ 已完成本地静态对照 | 15 个路由常量、15 个注册页面、49 处源码路由引用、10 条受保护 query 合约和 12 条导航契约均通过 |
| 微信小程序平台能力契约 | ✅ 已完成本地静态/单元对照 | 27 个 Taro 方法、9 条平台能力契约、二维码/名牌文件系统 fallback 和 PDF openDocument 合约均通过 |
| 微信小程序后端路由契约 | ✅ 已完成静态 controller route 对照 | 38 条小程序 API 契约匹配 94 条后端 controller route，并覆盖 15 条 response shape 合约 |
| 微信小程序页面隐私/危险渲染契约 | ✅ 已完成本地静态/产物对照 | 57 个源码文件、15 个页面、14 个组件、8 条隐私契约、危险渲染/console 命中 0 |
| 微信 CI 预览 | ✅ 已完成 | `npm run ci:preview` 通过并生成二维码 |

---

## 3. 当前阻塞条件

### 3.1 Flyway / H2 兼容性仍需单独处理

- 当前新增的集成测试使用了：
  - `spring.flyway.enabled=false`
  - 测试专用 `schema.sql + data.sql`
- 原因：
  - `V5` 与 H2 兼容性和历史 checksum 问题仍不适合直接用在这组集成测试上
- 影响：
  - 不阻塞当前这 2 条集成链路
  - 但仍阻塞“直接复用全量 Flyway 迁移”的更完整集成测试层

### 3.2 本机无可用 Docker 运行时

- **现状**：当前机器没有可用 `docker` CLI，也没有可用的 `colima` / `lima` / `podman`
- **额外证据**：2026-05-31 实测 `./mvnw -Dtest=InvitationRegistrationMySqlContainerIntegrationTest test` 时，Testcontainers 明确报 `NoSuchFileException (/var/run/docker.sock)`；当前 `/var/run/docker.sock` 只是软链接，目标 `~/.docker/run/docker.sock` 实际不存在
- **影响**：无法真正拉起 `MySQLContainer`
- **当前行为**：`InvitationRegistrationMySqlContainerIntegrationTest` 通过 `@Testcontainers(disabledWithoutDocker = true)` 自动跳过，不会误报失败

### 3.3 JaCoCo + Java 24 不兼容

- **现象**：JaCoCo agent 报 `Unsupported class file major version 68`
- **当前状态**：会在日志里持续出现 JDK 类插桩告警，但本轮集成测试最终 `BUILD SUCCESS`
- **影响**：日志可读性变差，但不再阻塞这轮集成测试结论

### 3.4 微信开发者工具 GUI 未登录

- `wechatwebdevtools cli islogin` 返回 `{"login":false}`
- `wechatwebdevtools cli open` 返回 `需要重新登录 (code 10)`
- 影响：仅影响后续小程序运行时/UI 专项；当前代码层集成结论以 service mock、后端路由契约、response shape、route contract、platform contract 和 CI preview 包体证据为准

---

## 4. 哪些集成能力还缺

1. **数据库集成**：真实 MySQL 下的 CRUD、事务、锁、索引验证还没真正执行
2. **安全集成**：JWT 过期、XSS 浏览器渲染层、更多输入安全边界还没纳入 `@SpringBootTest`
3. **跨模块集成**：扫码 → 验证 → 数据读取 → 审计记录的完整链路还没纳入 MockMvc
4. **SMS Relay 集成**：设备注册 → 心跳 → 入站短信匹配 → 会话验证还没做完整集成层
5. **并发集成**：真实数据库下的并发写冲突、主键约束验证仍主要停留在性能测试层
6. **微信小程序运行时网络集成专项**：若后续目标包含 DevTools 或真机扫码，再验证真实 Cookie、合法域名、PDF 下载和文件系统行为；当前代码层集成目标不依赖该证据

---

## 5. 当前保留的关键基线

| 基线 | 路径 |
|------|------|
| 集成测试主文档 | `06-测试与质量保障/docs/03-集成测试/README.md` |
| 测试日志吸收与代码落实总审计 | `06-测试与质量保障/docs/00-总览/03-测试日志吸收与代码落实总审计.md` |
| 输入安全集成测试 | `04-统一后端/src/test/java/com/silverlink/care/security/InputSafetyIntegrationTest.java` |
| 扫码 session 作用域集成测试 | `04-统一后端/src/test/java/com/silverlink/care/module/scan/ScanSessionScopeIntegrationTest.java` |
| MySQL Testcontainers 集成测试代码路径 | `04-统一后端/src/test/java/com/silverlink/care/module/invitation/InvitationRegistrationMySqlContainerIntegrationTest.java` |
| 微信小程序本地综合报告 | `06-测试与质量保障/reports/regression/20260606-190933-weapp-local-comprehensive/summary.md` |
| 微信小程序单测入口 | `08-微信小程序端/scripts/unit/logic.test.ts` |
| 微信小程序 Taro stub | `08-微信小程序端/scripts/unit/taro-stub.ts` |
| 微信小程序路由契约门禁 | `08-微信小程序端/scripts/check-route-contract.mjs` |
| 微信小程序平台能力契约门禁 | `08-微信小程序端/scripts/check-platform-contract.mjs` |
| 微信小程序后端契约门禁 | `08-微信小程序端/scripts/check-backend-contract.mjs` |

---

## 6. 下一步建议

1. 给本机补可用 Docker 运行时，真正执行 `InvitationRegistrationMySqlContainerIntegrationTest`
2. 将短信中转完整链路纳入 `@SpringBootTest`
3. 将更多输入安全与浏览器渲染层 XSS 断言纳入集成测试
4. 再决定是否需要把全量 Flyway 迁移重新纳入测试启动链
5. 若另开小程序运行时集成专项，登录微信开发者工具后补真实网络集成和页面跳转证据
