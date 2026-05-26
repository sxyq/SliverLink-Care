# SilverLink Full Test Run

- run_id: 20260525-194352-full-regression
- started_at: 2026-05-25 19:43:53 CST
- completed_at: 2026-05-25 20:02:16 CST
- commit: 808c014
- cwd: /Users/sunyiyang/Desktop/Project/SilverLink Care

## Verdict

当前代码与线上服务完成了一轮端到端回归执行，构建、现有自动化测试、线上主链路烟测和轻量性能检查均通过。

重要说明：这次是“执行现有测试 + 补充线上功能烟测”。项目当前还没有足够的前端单元测试、后端函数级测试和 Android 仪器测试，因此不能声称已经做到“每一个函数都有自动化单元测试覆盖”。对应缺口已记录在 `coverage-gaps.md`。

## Initial Git Status
 M 04-统一后端/src/main/java/com/silverlink/care/module/nameplate/NameplateService.java
 D UI改动记录.md
 D ui_overview_images/01_scan_user_overview.png
 D ui_overview_images/01_scan_user_overview_gpt2_revised.png
 D ui_overview_images/02_volunteer_entry_overview.png
 D ui_overview_images/android_sms_relay_google_style.png
 D ui_overview_images/gpt2_01_scan_user_overview_edit.png
 D ui_overview_images/new_01_scan_user_overview.png
 D ui_overview_images/new_02_volunteer_entry_overview.png
 D ui_overview_images/new_03_admin_security_overview.png
 D ui_overview_images/new_04_full_flow_overview.png
 D ui_overview_images/new_05_blank_nameplate_mockup.png
 D ui_overview_images/prompt_01_scan_user_overview.txt
 D ui_overview_images/prompt_02_volunteer_entry_overview.txt
 D ui_overview_images/prompt_03_admin_security_overview.txt
 D ui_overview_images/prompt_04_full_flow_overview.txt
 D ui_overview_images/prompt_05_blank_nameplate_mockup.txt
 D ui_overview_images/wechat_scan_mysql_qr.svg
 D ui_overview_images/wechat_scan_real_qr.png
 D ui_overview_images/wechat_scan_real_qr_url.txt
 D 智联名牌部署版全功能测试报告.md
?? 03-管理后台端/dist-admin-20260525.tar.gz
?? 06-测试与质量保障/

## Build And Automated Test Results

| Area | Command | Result | Evidence |
| --- | --- | --- | --- |
| 扫码用户端 | `npm run build` | PASS | `logs/01-scan-build.log` |
| 志愿者填写端 | `npm run build` | PASS | `logs/02-volunteer-build.log` |
| 管理后台端 | `npm run build` | PASS | `logs/03-admin-build.log` |
| 统一后端 | `./mvnw test` | PASS | `logs/04-backend-mvn-test.log` |
| 统一后端 | `./mvnw -DskipTests package` | PASS | `logs/05-backend-package.log` |
| 安卓短信中转端 | `bash ./gradlew testDebugUnitTest` | PASS | `logs/06-android-unit-rerun.log` |
| 安卓短信中转端 | `bash ./gradlew assembleDebug` | PASS | `logs/07-android-assemble-debug-rerun.log` |

Android 直接执行 `./gradlew` 时因为文件没有执行权限返回 126，已改用 `bash ./gradlew ...` 重跑并通过。

## Existing Unit Test Count

| Module | Test Suites | Test Cases | Result |
| --- | ---: | ---: | --- |
| 统一后端 | 3 | 5 | PASS |
| 安卓短信中转端 JVM 单元测试 | 3 | 6 | PASS |
| 前端三端 | 0 | 0 | 未配置单元测试脚本 |
| 合计 | 6 | 11 | PASS |

现有测试类：

- `WeChatAuthServiceTest`
- `SilverLinkCareApplicationTests`
- `SignatureInterceptorTest`
- `RelayRequestSignerTest`
- `SmsParserTest`
- `RelayConfigSyncResolverTest`

## Live Functional Smoke Results

线上功能烟测第二版共 33 条，33 通过，0 失败。

覆盖范围：

- 管理员签名登录。
- 未登录访问后台数据被 403 拒绝。
- 管理后台首页数据、老人档案、志愿者、家属绑定、邀请码、审计日志、审核请求、短信中转记录/设备/session。
- RBAC 角色与权限读取。
- 二维码列表读取、二维码 token 解析。
- 扫码身份验证、验证后基础信息/健康档案/用药/量表读取。
- 二维码解析老人、身份验证 session、验证后基础信息三者一致性断言。
- 同一个验证 session 尝试跨老人读取，被 403 拒绝。
- 志愿者登录、个人资料、本人负责老人、本人老人二维码管理。
- 家属登录、本人绑定老人、老人详情、用药、二维码。
- 邀请码预览。

关键结果：

| Check | Result |
| --- | --- |
| live smoke total | 33 |
| live smoke passed | 33 |
| live smoke failed | 0 |
| QR resolved elder | `elder-002` |
| verified session | `scan-session-1779710424666` |
| volunteer own elder | `elder-1779595988004` |
| family own elder | `elder-001` |

证据文件：

- `functional/live-smoke-results-v2.json`
- `logs/20-live-functional-smoke-v2-output.json`

敏感值处理：报告目录中的 JWT、二维码 token、访问人手机号和身份证号已脱敏。

## Live Availability And Performance

静态页面 5 次采样：

| URL | HTTP | Avg | P95 |
| --- | ---: | ---: | ---: |
| `http://sxyq27.online/silverlink/scan/` | 200 | 61 ms | 124 ms |
| `http://sxyq27.online/silverlink/volunteer/` | 200 | 46 ms | 48 ms |
| `http://sxyq27.online/silverlink/admin/` | 200 | 45 ms | 45 ms |

核心 API 10 次采样：

| API | HTTP | Avg | P95 |
| --- | ---: | ---: | ---: |
| `admin-dashboard` | 200 | 56 ms | 92 ms |
| `admin-elders` | 200 | 50 ms | 52 ms |
| `admin-qrcodes` | 200 | 57 ms | 106 ms |
| `invitation-preview` | 200 | 47 ms | 50 ms |

证据文件：

- `performance/live-latency-summary.json`

## Artifact Sizes

| Artifact | Size |
| --- | ---: |
| 扫码用户端 dist | 348 KB |
| 志愿者填写端 dist | 376 KB |
| 管理后台端 dist | 572 KB |
| 后端 jar | 78,436 KB |
| Android debug APK | 8,312 KB |

证据文件：

- `performance/build-artifacts.json`

## Notes

- 管理员接口需要前端同款签名头：`X-Timestamp`、`X-Nonce`、`X-Signature`。未签名调用 `/api/admin/login` 会返回 `missing signature headers`，签名后通过。
- 第一版线上烟测里志愿者/家属接口出现 403，是因为测试数据用了非本人负责/绑定老人。第二版改用各自账号实际老人后全部通过。
- 线上二维码验证链路已额外断言“扫码解析老人”和“验证后读取老人”一致，且跨老人 session 被拒绝。
- 本次没有执行破坏性操作，例如删除老人、删除志愿者、停用二维码、重新生成二维码、修改家属联系人。
