# 本地整理与全项目安全审查报告

生成时间：2026-06-07 00:41 +08:00
最后更新：2026-06-07 02:58 +08:00

测试对象：`/Users/sunyiyang/Desktop/Project/SilverLink Care`

## 1. 本轮结论

本轮完成了本地临时文件清理、敏感文件移出项目目录、目录体积复扫、前端依赖审计、后端安全配置抽查和一个低风险后端安全硬化。

已处理：

- 清除项目内 `.DS_Store`、Kotlin 错误日志、空 `.kotlin` 缓存、三端 Web `dist/coverage`、后端 `target`、Android `app/build`。
- 将项目根目录下 `.ssh-check/` 中的私钥和部署包移出项目，隔离到 `/Users/sunyiyang/.silverlink-care-local-secure/ssh-check-20260607-003557`，并设置目录/文件为当前用户权限。
- 收紧本地敏感配置权限：`01-扫码用户端/.env.local`、`05-安卓短信中转端/local.properties`、`08-微信小程序端/.local/wechat-ci/config.json` 均为 `0600`。
- 后端默认访问策略硬化：`SecurityConfig` 未归类路径从 `permitAll` 改为 `authenticated`，并显式保留 `/api/qrcodes/image` 公共访问。
- 后端默认 CORS 源去除线上明文 `http://sxyq27.online`，保留 `https://sxyq27.online` 与本地 localhost。
- 适配既有后端测试签名漂移，新增的 `SecurityConfigIntegrationTest` 已实际执行通过。
- 管理后台前端已移除浏览器侧 HMAC 签名 secret 和 `X-Signature` / `X-Timestamp` / `X-Nonce` 请求头，`.env.example` 已删除旧签名配置。
- `08-微信小程序端` 通过 lockfile overrides 修复运行依赖漏洞，`npm audit --omit=dev` 已从 5 个漏洞降为 0。
- `miniprogram-ci` 已从小程序常驻 devDependency 移出，改为上传/预览时按需安装到 `.local/wechat-ci-sdk`；本地 `node_modules` 已 prune，`miniprogram-ci`、`request`、`protobufjs` 不再留在项目树。
- `@tarojs/cli` 已从小程序常驻 devDependency 移出，构建脚本改为按需 `npm exec --package=@tarojs/cli@4.2.0`；本地 `node_modules/@tarojs/cli`、`download-git-repo`、`git-clone` 不再留在项目树。
- 已查询 npm Registry：截至本次验证，`@tarojs/vite-runner@4.2.0` / `@tarojs/plugin-framework-react@4.2.0` 最新版仍要求 `vite:^4`，而 `vite-plugin-static-copy@4.1.1` 要求 `vite:^6 || ^7 || ^8`，因此小程序剩余 6 个 full audit 开发期漏洞不能通过安全小版本升级消除。
- 已完成 Git 历史 secret 扫描：主仓库历史未命中私钥/API key；`08-微信小程序端` 嵌套仓库仅命中 `node_modules` 文档示例私钥文本。
- 已完成 SSH key 轮换：`124.222.153.108` 的 `root` / `ubuntu` 与 `117.72.79.106` 的 `root` 均已替换为新 ED25519 key，旧 key 登录已被拒绝。
- 已完成 Maven/Android Gradle 依赖 OSV 查询：Android `debugRuntimeClasspath` 未命中；后端 Maven runtime 命中 19 个存在已知漏洞的依赖，因后端修改仍受本轮约束，先记录为后端待修复项。

未直接修复但需要跟进：

- 后端账号密码仍存在明文写入/比较路径，字段名虽为 `password_hash`，但当前并未使用 bcrypt/argon2。
- 按本轮约束未继续修改 `04-统一后端`，因此密码哈希、Cookie Secure、Swagger 生产暴露策略、Maven 依赖漏洞升级仍是后端保留风险。
- `08-微信小程序端` full audit 仍有 6 个开发期漏洞，集中在 Taro Vite runner 的 `vite`、`html-minifier`、`vite-plugin-static-copy` 链路；运行依赖 audit 已清零。
- Maven 测试在当前 Java 24 运行时会输出 JaCoCo 0.8.12 不支持 class file major version 68 的 instrumentation warning；本轮目标测试仍通过。

## 2. 清理结果

删除的可再生成产物：

- `01-扫码用户端/dist`
- `01-扫码用户端/coverage`
- `02-志愿者填写端/dist`
- `02-志愿者填写端/coverage`
- `03-管理后台端/dist`
- `03-管理后台端/coverage`
- `04-统一后端/target`
- `05-安卓短信中转端/app/build`
- `05-安卓短信中转端/.kotlin`
- 所有扫描到的 `.DS_Store` 和 Kotlin error log
- `.git` 与 `08-微信小程序端/node_modules` 中复扫到的深层 `.DS_Store` / `.bak` 残留

保留但说明原因：

- `node_modules/`：依赖目录，当前多端开发和依赖审计仍需要。
- `08-微信小程序端/dist`：该目录在 `08-微信小程序端` 嵌套 Git 仓库中存在跟踪状态，未清理，避免产生误删。
- `06-测试与质量保障/reports/regression/20260606-*`：小程序综合测试证据链，未清理。
- `01-扫码用户端/.env.local`：本地固定短信码配置，已确认被 `.gitignore` 忽略并收紧权限。

复扫结果：

- 临时文件复扫：未发现 `.DS_Store`、`*.tmp`、`*.bak`、`*.orig`、包管理 debug log。
- 项目内私钥复扫：未发现 `*.pem`、`id_rsa`、keystore、p12 等私钥文件。
- 目录体积：`01-扫码用户端` 约 186M，`02-志愿者填写端` 约 188M，`03-管理后台端` 约 179M，`04-统一后端` 约 46M，`05-安卓短信中转端` 约 5.6M，`08-微信小程序端` 约 858M；大目录主要剩余为前端依赖与 `08-微信小程序端`。

## 3. 已做安全硬化

### 3.1 默认 API 访问策略

修改文件：

- `04-统一后端/src/main/java/com/silverlink/care/config/SecurityConfig.java`
- `04-统一后端/src/test/java/com/silverlink/care/config/SecurityConfigIntegrationTest.java`
- `04-统一后端/src/test/java/com/silverlink/care/module/invitation/InvitationControllerTest.java`
- `04-统一后端/src/test/java/com/silverlink/care/module/family/FamilyControllerTest.java`
- `04-统一后端/src/test/java/com/silverlink/care/module/family/FamilyServiceTest.java`

变化：

- `/api/qrcodes/image` 显式列为公共接口。
- 未归类路径由默认公开改为默认认证。
- 新增测试意图：公共二维码图片允许访问，未知 API 默认拒绝未认证访问。
- 既有 Family/Invitation 测试已适配 cookie/session 化后的 controller/service 签名，安全集成测试可执行。

风险降低：

- 新增 controller 或新增 API 忘记补安全规则时，不再自动暴露为公开接口。

### 3.2 CORS 默认源

修改文件：

- `04-统一后端/src/main/java/com/silverlink/care/config/SecurityConfig.java`
- `04-统一后端/src/main/java/com/silverlink/care/config/WebMvcConfig.java`

变化：

- 默认允许源移除 `http://sxyq27.online`。
- 保留 `https://sxyq27.online` 与本地开发端口。

风险降低：

- 减少线上明文 HTTP origin 与 `allowCredentials(true)` 组合带来的会话风险。

### 3.3 管理后台浏览器签名逻辑

修改文件：

- `03-管理后台端/src/api/adminApi.ts`
- `03-管理后台端/src/api/adminApi.test.ts`
- `03-管理后台端/src/App.test.tsx`
- `03-管理后台端/.env.example`

变化：

- 删除浏览器端硬编码 `silverlink-admin-console` secret。
- 删除 `X-Signature`、`X-Timestamp`、`X-Nonce` 请求头生成。
- 管理后台测试改为 cookie/session 合同，不再断言 token 或浏览器 HMAC。
- `.env.example` 删除 `VITE_ADMIN_SIGNATURE_SECRET`。

风险降低：

- 浏览器 bundle 不再携带共享签名 secret，也不会继续发送已退役的签名头。

### 3.4 小程序依赖运行面

修改文件：

- `08-微信小程序端/package.json`
- `08-微信小程序端/package-lock.json`
- `08-微信小程序端/scripts/wechat-ci.mjs`

变化：

- 添加 npm overrides：`swiper@12.1.2`、`esbuild@0.25.12`、`glob@10.5.0`、`got@11.8.6`、`http-cache-semantics@4.1.1`、`serialize-javascript@7.0.5`。
- 移除常驻 `miniprogram-ci` devDependency；上传/预览时由 `scripts/wechat-ci.mjs` 按需安装到 `.local/wechat-ci-sdk`。
- 移除常驻 `@tarojs/cli` devDependency；开发/构建脚本改为按需拉取 `@tarojs/cli@4.2.0`。
- 执行 `npm prune` 对齐本地 `node_modules` 与 lockfile，移除旧上传 SDK 及其 extraneous 高危依赖。

风险降低：

- 小程序运行依赖 `npm audit --omit=dev` 已清零。
- full audit 从 90 个漏洞降为 6 个，critical 从 43 个降为 0。
- 本地实际依赖目录已确认 `node_modules/miniprogram-ci`、`node_modules/request`、`node_modules/protobufjs`、`node_modules/@tarojs/cli`、`node_modules/download-git-repo`、`node_modules/git-clone` 不存在。
- 临时副本中尝试移除 `@tarojs/vite-runner` 后，`npm run build:weapp` 会触发 Taro 自动补装 runner，并因缺少 `@tarojs/service/package.json` 构建失败；因此当前不能安全移除此开发期依赖。

## 4. 安全发现

| 优先级 | 类型 | 位置 | 结论 | 建议 |
| --- | --- | --- | --- | --- |
| P0 | 密码存储 | `SilverLinkDataService.login`、`createVolunteer`、`updateVolunteer`、`InvitationService.register` | `password_hash` 字段按明文写入和比较；迁移脚本中也有 `admin/admin`、`Volunteer@123456` 等演示密码 | 做兼容迁移：新增 `PasswordEncoder`，登录时兼容旧明文并成功后升级为 bcrypt；迁移 seed/demo 数据；补登录与改密测试 |
| P0 | 后端依赖漏洞 | `04-统一后端/pom.xml` / Maven runtime | OSV 查询命中 19 个存在已知漏洞的运行期依赖，集中在 Spring Boot 3.1.5 管理的 Spring/Tomcat/Spring Security/Logback/Netty/Jackson/MySQL Connector 等链路 | 后端允许修改后，优先升级 Spring Boot BOM 与受影响直接依赖，再跑后端测试和 OSV 复扫 |
| P0 | 小程序依赖 | `08-微信小程序端/package-lock.json` | 已部分修复：运行依赖 audit 为 0；full audit 剩 6 个开发期漏洞且无 critical | 保留 Taro 4 主线，后续等待 Taro/Vite runner 支持不受影响的 Vite/HTML minifier 链路 |
| P1 | 默认公开接口 | `SecurityConfig` | 已修复：`anyRequest().permitAll()` 改为 `authenticated()` | 继续补 controller-to-security contract，确保新增接口必须归类 |
| P1 | 线上 HTTP CORS | `SecurityConfig`、`WebMvcConfig` | 已修复：默认 CORS 去掉 `http://sxyq27.online` | 检查部署环境 `silverlink.security.allowed-origins` 是否仍覆盖了 HTTP 源 |
| P1 | 浏览器 HMAC 签名漂移 | `03-管理后台端/src/api/adminApi.ts`、`.env.example` | 已修复：前端不再生成签名头，不再携带浏览器共享 secret | 后续如仍需接口签名，应仅在后端/服务端代理侧实现 |
| P1 | 本地私钥 | `.ssh-check/`、服务器 `authorized_keys` | 已移出项目并隔离；Git 历史扫描未发现真实私钥提交；相关服务器账号已完成 SSH key 轮换，旧 key 已失效 | 后续 SSH 材料放 `~/.ssh` 或专门密钥目录，不放项目树 |
| P2 | Cookie Secure | `AuthCookieService` | `secure(request.isSecure())` 依赖请求是否被识别为 HTTPS；反代未正确传递 forwarded headers 时 Secure 可能缺失 | 部署侧确认 `server.forward-headers-strategy` 或反代头；必要时在 prod profile 强制 secure cookie |
| P2 | Swagger | `SecurityConfig` | `/swagger-ui/**` 与 `/v3/api-docs/**` 当前 permitAll | 生产环境建议按 profile 关闭或限制源/IP |

## 5. 依赖审计

已执行：

- `01-扫码用户端`: `npm audit --json`，0 vulnerabilities。
- `02-志愿者填写端`: `npm audit --json`，0 vulnerabilities。
- `03-管理后台端`: `npm audit --json`，0 vulnerabilities。
- `08-微信小程序端`: 修复前 `npm audit --json` 为 90 vulnerabilities，修复后为 6 vulnerabilities；修复前 `npm audit --omit=dev --json` 为 5 vulnerabilities，修复后为 0 vulnerabilities。

小程序修复前 `--omit=dev` 高优先级摘要：

- `@tarojs/components`: critical，direct。
- `@tarojs/taro`: critical，direct。
- `swiper`: critical，transitive。

小程序修复后剩余 full audit 摘要：

- 6 个开发期漏洞，无 critical。
- 主要位于 `@tarojs/plugin-framework-react`、`@tarojs/vite-runner`、`@vitejs/plugin-legacy`、`vite`、`html-minifier`、`vite-plugin-static-copy`。
- 直接升级到 npm audit 建议版本会把 Taro/Vite 主线打散，已保留为开发工具链风险。
- `@tarojs/vite-runner` 在临时副本删除后构建失败，不能像 `@tarojs/cli` 一样安全迁移到按需执行。
- npm Registry 复查显示当前最新 Taro 4.2.0 仍绑定 `vite:^4`，当前安全版 `vite-plugin-static-copy@4.1.1` 又要求 Vite 6+，因此仍需等待 Taro runner 升级或做构建链迁移。

Java / Android Gradle OSV 摘要：

- 已生成 `maven-runtime-dependencies.txt`、`android-debugRuntimeClasspath.txt`、`osv-java-gradle-results.json`、`osv-java-gradle-summary.txt`。
- 查询 Maven ecosystem 依赖 200 个，其中后端 Maven runtime 命中 19 个存在已知漏洞的依赖。
- Android `debugRuntimeClasspath` 本轮未命中 OSV 漏洞。
- 后端命中项集中在 `spring-boot:3.1.5`、`spring-web/webmvc/core:6.0.13`、`spring-security:6.1.5`、`tomcat-embed-core:10.1.15`、`logback:1.4.11`、`netty:4.1.100.Final`、`jackson-core:2.15.3`、`mysql-connector-j:8.0.33` 等。
- 按本轮“后端不能动”约束，未修改 `04-统一后端/pom.xml`。

后端/Android 说明：

- 当前机器未安装 `gitleaks`、`trufflehog`、`osv-scanner`、`semgrep`。
- 已通过 Maven/Gradle 依赖清单 + OSV API 完成 Java/Android 依赖漏洞映射；未使用本机缺失的独立 scanner 二进制。

## 6. 验证记录

通过：

- 项目内临时文件复扫为空。
- 项目内私钥复扫为空。
- `git diff --check` 通过。
- `./mvnw -q -Dmaven.test.skip=true compile` 通过，后端主源码可编译。
- `./mvnw -q -Dtest=SecurityConfigIntegrationTest test` 通过，新增安全规则已执行验证。
- 01/02/03 前端 `npm audit` 均为 0 vulnerabilities。
- `03-管理后台端`: `npm test` 通过，23 个测试文件、172 个用例。
- `03-管理后台端`: `npm run build` 通过。
- `08-微信小程序端`: 临时干净安装后 `npm run test:unit` 通过，22/22。
- `08-微信小程序端`: `npm run test:static` 通过。
- `08-微信小程序端`: 临时干净安装后 `npm run typecheck` 通过。
- `08-微信小程序端`: 临时干净安装后 `npm run build:weapp` 通过。
- `08-微信小程序端`: `npm audit --omit=dev --json` 通过，0 vulnerabilities。
- `08-微信小程序端`: `npm prune` 后本地 `npm run test:unit && npm run test:static && npm run typecheck` 通过。
- `08-微信小程序端`: `npm run build:weapp` 已在按需 `@tarojs/cli@4.2.0` 模式下通过。
- `08-微信小程序端`: `@tarojs/vite-runner` 移除实验失败，失败点为 Taro 构建期补装 runner 后缺少 `@tarojs/service/package.json`。
- 终态 `git diff --check -- 03-管理后台端 06-测试与质量保障 08-微信小程序端` 通过。
- 终态项目内临时文件与私钥复扫为空。
- 终态确认 `08-微信小程序端/node_modules` 中不存在 `@tarojs/cli`、`miniprogram-ci`、`download-git-repo`、`git-clone`、`request`、`protobufjs`。
- Git 历史 secret 扫描完成，结果记录在 `git-history-secret-scan.log`；主仓库无命中，嵌套小程序仓库命中均为 `node_modules` 文档示例。
- SSH key 轮换完成，记录在 `ssh-key-rotation.md`；新 key 登录通过，旧 key 登录失败。
- Maven/Android Gradle OSV 查询完成，结果记录在 `osv-java-gradle-results.json` 与 `osv-java-gradle-summary.txt`。

注意：

- 首次执行 `./mvnw -q -Dtest=SecurityConfigIntegrationTest test` 时被既有 testCompile 漂移阻塞；已修复 `InvitationControllerTest`、`FamilyControllerTest`、`FamilyServiceTest` 后复跑通过。
- 当前 Java 24 + JaCoCo 0.8.12 会输出 instrumentation warning，但 Maven 退出码为 0。
- `08-微信小程序端` 是嵌套 Git 仓库且当前跟踪了 `node_modules` 和 `dist`，本轮 `npm prune` 与 `npm run build:weapp` 后该嵌套仓库存在大量 tracked file 删除/修改；这是依赖树收敛和构建产物刷新造成的工作区状态，需要提交/清理时单独处理。

## 7. 下一步建议

1. 后端允许修改后，先做密码哈希兼容迁移，并同步升级 Maven 依赖漏洞链。
2. 等 Taro/Vite runner 提供兼容 Vite 安全主线后，再处理剩余 6 个小程序开发期 audit 项；或规划一次 Taro 构建链迁移。
3. 根据生产部署确认 Secure Cookie 和 Swagger 暴露策略。
