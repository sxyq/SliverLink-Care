# 集成测试

**最后更新**：2026-05-31

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

---

## 2. 当前真实跑到的层级

| 层级 | 状态 | 说明 |
|------|------|------|
| JUnit 5 + Mockito 单元测试 | ✅ 已完成 | 603 个用例全部通过 |
| H2 嵌入式数据库（MySQL mode） | ✅ 已完成 | 性能测试中已验证真实 JDBC 路径 |
| Spring Boot 集成测试（@SpringBootTest + MockMvc） | ✅ 已完成 | 已有 4 条真实集成链路本地跑通 |
| Testcontainers + MySQL | ⚠️ 代码已落地，运行未闭环 | `InvitationRegistrationMySqlContainerIntegrationTest` 已存在，但本机缺少可用 Docker 运行时；`/var/run/docker.sock` 指向的 `~/.docker/run/docker.sock` 在当前机器上不存在，当前自动跳过 |

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

---

## 4. 哪些集成能力还缺

1. **数据库集成**：真实 MySQL 下的 CRUD、事务、锁、索引验证还没真正执行
2. **安全集成**：JWT 过期、XSS 浏览器渲染层、更多输入安全边界还没纳入 `@SpringBootTest`
3. **跨模块集成**：扫码 → 验证 → 数据读取 → 审计记录的完整链路还没纳入 MockMvc
4. **SMS Relay 集成**：设备注册 → 心跳 → 入站短信匹配 → 会话验证还没做完整集成层
5. **并发集成**：真实数据库下的并发写冲突、主键约束验证仍主要停留在性能测试层

---

## 5. 当前保留的关键基线

| 基线 | 路径 |
|------|------|
| 集成测试主文档 | `06-测试与质量保障/docs/03-集成测试/README.md` |
| 测试日志吸收与代码落实总审计 | `06-测试与质量保障/docs/00-总览/03-测试日志吸收与代码落实总审计.md` |
| 输入安全集成测试 | `04-统一后端/src/test/java/com/silverlink/care/security/InputSafetyIntegrationTest.java` |
| 扫码 session 作用域集成测试 | `04-统一后端/src/test/java/com/silverlink/care/module/scan/ScanSessionScopeIntegrationTest.java` |
| MySQL Testcontainers 集成测试代码路径 | `04-统一后端/src/test/java/com/silverlink/care/module/invitation/InvitationRegistrationMySqlContainerIntegrationTest.java` |

---

## 6. 下一步建议

1. 给本机补可用 Docker 运行时，真正执行 `InvitationRegistrationMySqlContainerIntegrationTest`
2. 将短信中转完整链路纳入 `@SpringBootTest`
3. 将更多输入安全与浏览器渲染层 XSS 断言纳入集成测试
4. 再决定是否需要把全量 Flyway 迁移重新纳入测试启动链
