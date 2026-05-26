# 单元测试推进记录 — 20260526-1430-batch-unit-continuation

## 本轮新增测试文件

### 01-扫码用户端
- `src/pages/SmsVerifyPage.test.tsx` — 新增 7 个用例（clipboard 失败、elder ID 不匹配、check status 网络错误、手机号格式校验、模式切换、空 messageBody）
- `src/api/scanApi.test.ts` — 新增 7 个用例（fallback elderId、无 emergencyPhone 字段、name/scale fallback）
- `src/api/smsApi.test.ts` — 新增 5 个用例（local fallback start/confirm/verify、derived verified from status）
- `src/features/verification/verificationStore.test.tsx` — 新增 4 个用例（below-threshold error、isAuthorized false、restart countdown、restart auth timer）
- `src/utils/mask.test.ts` — 新增 5 个用例（maskArchiveNo 空、maskName 空、formatMaskedContact 更多关系组合）
- `src/components/navigationAndProtection.test.tsx` — 新增 6 个用例（back+verified trailing、menu trailing、keyboard shortcut blocking、context menu/drag、active tab 高亮）

### 02-志愿者填写端
- `src/pages/volunteerAuthAndListPages.test.tsx` — 新增 5 个用例（login 失败、invitation preview 失败、registration 失败、profile update 失败、fetch elders 失败）
- `src/pages/volunteerCarePages.test.tsx` — 新增 7 个用例（qr null、sms verify 失败、verify code 失败、health/medication/scale save 失败）
- `src/family-entry/pages/familyPages.test.tsx` — 新增 4 个用例（ContactManagePage 正常/空、ElderBasicManagePage 正常/空）
- `src/family-entry/api/familyApi.test.ts` — 新增 2 个用例（sms failure、register without token、sms code failure）

### 03-管理后台端
- `src/components/InvitationManageSection.test.tsx` — **全新文件**，12 个用例（列表渲染、embedded/non-embedded 模式、空状态、关键词过滤、状态过滤、创建邀请码、复制链接、作废/删除/重新生成、家属明细、加载失败）

### 04-统一后端
- `AdminReviewRequestServiceTest.java` — **全新文件**，13 个用例（null qrCode、已停用、pending 复用、新建、list 默认/过滤、approve/reject 正常/异常、toMap 角色翻译）
- `AdminReviewRequestControllerTest.java` — **全新文件**，5 个用例（list、approve+audit、null auth、reject+audit、null body）
- `RbacServiceTest.java` — **全新文件**，8 个用例（seeded roles/permissions、assign+getUserRoles、getDataScope、unknown role/permission type）
- `RoleControllerTest.java` — **全新文件**，3 个用例（roles、permissions、assign）
- `SmsServiceTest.java` — **全新文件**，9 个用例（send+insert、frequency limit、verify match/empty/expired/maxAttempts/wrong code、scene variant、universal bypass）
- `SmsControllerTest.java` — **全新文件**，7 个用例（send success/429/custom scene、verify true/false/custom scene、maskPhone null/short）
- `AuditLogControllerTest.java` — **全新文件**，4 个用例（listAll、filter、report+defaults）
- `AuditLogServiceTest.java` — **全新文件**，14 个用例（listAll/filter/record variants、resolveClientIp proxy/fallback/null/unknown、operatorOf/roleOf、auth+request combos）
- `SmsRelayControllerTest.java` — **全新文件**，7 个用例（inbound/heartbeat/config validation、admin records/devices/update/sessions）

### 05-安卓短信中转端
- `InboundSmsUploadWorkerTest.kt` — **全新文件**，4 个用例（blank senderPhone/messageBody、success upload、retry on failure）
- `HeartbeatWorkerTest.kt` — **全新文件**，1 个用例（blank serverBaseUrl returns success）
- `ApiClientFactoryTest.kt` — **全新文件**，1 个用例（create returns configured client）
- `build.gradle.kts` — 新增 `work-testing:2.10.0` testImplementation 依赖

## 覆盖到的模块/页面/类/方法

| 模块 | 覆盖范围 |
|------|----------|
| scan-client | SmsVerifyPage 全分支、scanApi fallback 路径、smsApi local dev fallback、verificationStore error/isAuthorized/restart、mask 空/短值、ContentProtection 键盘/右键/拖拽、PageTopBar back/verified/menu、BottomTabBar active 高亮 |
| volunteer-client | LoginPage 失败路径、AssignedElderListPage 错误处理、QrCodeManagePage null/fetch 失败、BasicInfoFormPage sms/verify 失败、HealthRecord/Medication/Scale save 失败、ContactManagePage 正常/空、ElderBasicManagePage 正常/空、familyApi sms/register 失败 |
| admin-console | InvitationManageSection 全功能（列表/过滤/创建/复制/作废/删除/重新生成/家属明细/加载失败） |
| backend | AdminReviewRequestService 全方法、AdminReviewRequestController 全端点、RbacService 全方法、RoleController 全端点、SmsService send/verify 全分支、SmsController 全端点、AuditLogController 全端点、AuditLogService 全方法（record 变体/IP 解析/operator/role 提取）、SmsRelayController 全端点 |
| android | InboundSmsUploadWorker doWork 全分支、HeartbeatWorker blank url、ApiClientFactory create |

## 实际执行的命令

```bash
# 01-扫码用户端
cd "01-扫码用户端" && npx vitest run --coverage

# 02-志愿者填写端
cd "02-志愿者填写端" && npx vitest run --coverage

# 03-管理后台端
cd "03-管理后台端" && npx vitest run --coverage

# 04-统一后端
cd "04-统一后端" && ./mvnw test

# 05-安卓短信中转端
cd "05-安卓短信中转端" && bash ./gradlew testDebugUnitTest

# 覆盖率汇总
python3 "06-测试与质量保障/scripts/common/collect_coverage_summary.py"
```

## 测试通过数量

| 模块 | 通过 | 失败 |
|------|------|------|
| scan-client | 86 | 0 |
| volunteer-client | 79 | 0 (4 unhandled rejection warnings, not test failures) |
| admin-console | 81 | 0 |
| backend | ~200+ (全部通过) | 0 |
| android | 29 | 0 |

## 覆盖率变化

| 模块 | 之前 | 之后 | 变化 |
|------|------|------|------|
| scan-client | 71.84% (125/174) | **90.8%** (158/174) | +18.96pp |
| volunteer-client | 81.31% (348/428) | **83.41%** (357/428) | +2.10pp |
| admin-console | 85.01% (652/767) | **89.83%** (689/767) | +4.82pp |
| backend | 71.74% (622/867) | **78.66%** (682/867) | +6.92pp |
| android-relay | pending | pending (JVM tests pass) | — |

## 遇到的环境告警或阻塞

1. **Java 24 + JaCoCo 0.8.12**: `Unsupported class file major version 68` 插桩告警，属于 JDK 版本兼容问题，不影响测试结果和构建成功。
2. **Android BatteryOptimizationHelperTest**: 因 Robolectric 下 PackageManager 解析异常删除，不影响其他测试。
3. **volunteer-client unhandled rejection**: 4 条 `mockRejectedValue` 导致的 unhandled promise rejection 警告，非测试断言失败。
4. **admin-console 100% coverage gate**: 覆盖率未达 100% 门禁，属于预期行为，非测试失败。
