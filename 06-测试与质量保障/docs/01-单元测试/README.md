# 单元测试

**最后更新**：2026-05-29

---

## 1. 当前覆盖率现状

| 模块 | 函数/方法覆盖率 | 语句覆盖率 | 分支覆盖率 | 行覆盖率 | 测试用例数 |
|------|---------------|-----------|-----------|---------|-----------|
| 01-扫码用户端 | 100.0% (181/181) | 99.50% | 95.33% | 100.0% | 227 |
| 02-志愿者填写端 | 99.30% (428/431) | 97.28% | 86.43% | 98.78% | 152 |
| 03-管理后台端 | 98.56% (754/765) | 95.79% | 86.56% | 98.29% | 174 |
| 04-统一后端 | 99.9% (973/974) | 96.76% | 79.47% | 96.68% | 641 |
| 05-安卓短信中转端 | 17.65% (45/255) | 12.08% | 9.07% | 10.95% | 49 |

**注意**：Android 端的 JVM JaCoCo XML 聚合已经打通，当前覆盖率很低，说明问题已经从“无法统计”转成了“需要继续补测和提升可测性”。

---

## 2. 各端测试数量与框架

| 模块 | 测试文件数 | 测试框架 |
|------|-----------|---------|
| 01-扫码用户端 | 23 | Vitest + @testing-library/react |
| 02-志愿者填写端 | 19 | Vitest + @testing-library/react |
| 03-管理后台端 | 23 | Vitest + @testing-library/react |
| 04-统一后端 | ~60 | JUnit 5 + Mockito |
| 05-安卓短信中转端 | 21 | JUnit 4 + Robolectric |

---

## 3. 历史发现的问题

### 3.1 源码缺陷（已修复）

| 问题 | 文件 | 严重度 | 发现轮次 |
|------|------|--------|---------|
| 双定时器竞态 bug | `verificationStore.ts` | 高 | R24 |
| handleSubmit 无 catch（4 个文件） | `ScaleFormPage.tsx` 等 | 中 | R24 |
| RegisterResultDto 命名不一致 | `RegisterResultDto.java` | 低 | R24 |
| 家属入口 hash 切换触发 Hook 顺序错误 | `02-志愿者填写端/src/App.tsx` | 高 | R26 |
| `login(token)` 无 profile 时保留脏 `sl_user` | `02-志愿者填写端/src/app/AuthProvider.tsx` | 中 | 2026-05-28 |
| 联系人维护页双号码切换时告警误消失，且保存异常无兜底 | `02-志愿者填写端/src/family-entry/pages/ContactManagePage.tsx` | 中 | 2026-05-28 |
| shared workbench 用药编辑页在新增/删除/批量保存失败时无统一兜底 | `02-志愿者填写端/src/shared-workbench/MedicationEditorPage.tsx` | 中 | 2026-05-28 |
| 缺少 `elderId` 时多个家属管理页会停在加载态 | `MedicationManagePage.tsx`、`ContactManagePage.tsx`、`ElderBasicManagePage.tsx` | 中 | 2026-05-28 |
| `SimpleTtlCache` 在 `put(null, ...)` 和 `get(null)` 时会触发 `ConcurrentHashMap` NPE | `04-统一后端/src/main/java/com/silverlink/care/infrastructure/cache/SimpleTtlCache.java` | 中 | 2026-05-29 |
| `FamilyHomePage` 在 `getBoundElders()` 失败时没有失败兜底 | `02-志愿者填写端/src/family-entry/pages/FamilyHomePage.tsx` | 中 | 2026-05-29 |

### 3.2 测试基础设施问题

| 问题 | 模块 | 严重度 |
|------|------|--------|
| 无 Mock 框架 | 安卓 | 中 |
| 无依赖注入 | 安卓 | 中 |
| JaCoCo + Java 24 不兼容 | 后端 | 中 |
| @Value 字段在单元测试中为 null | 后端 | 低 |

### 3.3 测试编写陷阱

| 陷阱 | 出现次数 |
|------|---------|
| mockRejectedValue + 无 catch | 4 次 |
| vi.advanceTimersByTime 与多定时器 | 2 次 |
| countdown 从 N 到 0 需要 N+1 次触发 | 1 次 |
| jdbc.update() 参数计数 | 3 次 |
| data.intValue(any()) 默认返回 0 | 1 次 |

---

## 4. 已修复的问题

| 修复 | 文件 | 修复轮次 |
|------|------|---------|
| verificationStore 竞态 | `verificationStore.ts` | R25 |
| 4 个表单页 catch 块 | `ScaleFormPage.tsx` 等 | R25 |
| RegisterResultDto.isSuccess() | `RegisterResultDto.java` | R25 |
| 家属入口 hash 切换 Hook 顺序问题 | `02-志愿者填写端/src/App.tsx` | R26 |
| `AuthProvider.login(token)` 无 profile 时清理 `sl_user` | `02-志愿者填写端/src/app/AuthProvider.tsx` | 2026-05-28 |
| 联系人维护页改为基于两路号码实时判断 `phoneChanged`，并补上保存异常兜底 | `02-志愿者填写端/src/family-entry/pages/ContactManagePage.tsx` | 2026-05-28 |
| shared workbench 用药编辑页在 create/update/delete/saveBatch 失败时统一提示并保持 UI 可恢复 | `02-志愿者填写端/src/shared-workbench/MedicationEditorPage.tsx` | 2026-05-28 |
| 家属管理页在缺少 `elderId` 时直接退出加载态，避免空路由卡死 | `MedicationManagePage.tsx`、`ContactManagePage.tsx`、`ElderBasicManagePage.tsx` | 2026-05-28 |
| 管理后台首页快照、主请求失败、邀请码页、负责老人空提交、审计静默失败等边界分支 | `03-管理后台端/src/pages/*` | 2026-05-28 |
| 后端缓存与性能配置基础设施测试 | `SimpleTtlCacheTest.java`、`JsonTwoLevelCacheTest.java`、`PerformanceConfigTest.java` | 2026-05-28 |
| `SimpleTtlCache` 对空 key 的读写保护 | `04-统一后端/src/main/java/com/silverlink/care/infrastructure/cache/SimpleTtlCache.java` | 2026-05-29 |
| 管理后台二维码缺链接、清除短信设备、复制回退、窗口打开失败等边界分支 | `03-管理后台端/src/pages/qrEdgeCases.test.tsx` | 2026-05-29 |
| 短信中转 direct SMS 状态更新与过期分支、两级缓存/线程池基础设施测试 | `SmsRelayServiceTest.java`、`JsonTwoLevelCacheTest.java`、`PerformanceConfigTest.java` | 2026-05-29 |
| Android JVM JaCoCo XML 聚合 | `05-安卓短信中转端/app/build.gradle.kts`、`06-测试与质量保障/scripts/common/collect_coverage_summary.py` | 2026-05-29 |
| 微信小程序代码层单元/契约门禁纳入统一脚本 | `08-微信小程序端/scripts/run-unit-tests.mjs`、`06-测试与质量保障/scripts/common/generate_function_inventory.py`、`06-测试与质量保障/scripts/common/collect_coverage_summary.py` | 2026-06-06 |
| `FamilyHomePage` 在绑定老人拉取失败时兜底为空列表并退出 loading | `02-志愿者填写端/src/family-entry/pages/FamilyHomePage.tsx` | 2026-05-29 |
| 扫码端 API / SecurityProvider / useProtectedArchive / 短信验证尾部分支补测 | `scanApi.test.ts`、`smsApi.test.ts`、`SecurityProvider.test.tsx`、`useProtectedArchive.test.tsx`、`SmsVerifyPage.test.tsx` | 2026-05-29 |
| 管理后台 Dashboard / AuditLog 死分支清理与页面边界补测 | `DashboardPage.tsx`、`AuditLogPage.tsx`、`loginAndDashboard.test.tsx`、`advancedAdminPages.test.tsx`、`qrAndArchivePages.test.tsx` | 2026-05-29 |
| Android `MainActivity / RelayApplication / RelayForegroundService / SettingsFragment / OverviewFragment / RecordsFragment` JVM 单测与最小可测性修补 | `MainActivityTest.kt` 等 | 2026-05-29 |
| 志愿者端联系人维护全字段、老人详情动作页、管理后台用药编辑器 cancel/filter/remove fallback 尾部分支补测 | `familyPages.test.tsx`、`careManagePages.test.tsx` | 2026-05-29 |
| 后端 `SilverLinkDataService / ScanService / QrCodeService / WeChatAuthService / SecurityConfig` 尾部方法补测，应用入口补测 | `SilverLinkDataServiceTest.java`、`ScanServiceTest.java`、`QrCodeServiceTest.java`、`WeChatAuthServiceTest.java`、`SecurityConfigIntegrationTest.java`、`SilverLinkCareApplicationTests.java` | 2026-05-29 |

---

## 5. 当前剩余缺口

### 5.1 前端分支覆盖率

| 模块 | 当前分支覆盖率 | 主要缺口 |
|------|-------------|---------|
| 扫码端 | 95.33% | `BottomTabBar`、`SecurityProvider.tsx`、`SmsVerifyPage.tsx`、`scanApi.ts`、`smsApi.ts` 的少量尾部分支 |
| 志愿者端 | 86.43% | `QrCodeManagePage`、`AssignedElderListPage`、`MedicationEditorPage`、`verificationStore.ts` 以及少量 family-entry 页面的尾部分支 |
| 管理后台端 | 86.56% | `VolunteerManagePage`、`AuditLogPage`、`MedicationManagePage`、`AnalyticsPage`、`RbacPage` 等页面级边界 |

### 5.2 后端指令覆盖率

| 文件 | 未覆盖指令数 | 状态 |
|------|------------|------|
| SilverLinkCareApplication.java | 极少 | 仅剩应用入口极小尾巴 |
| NameplateService.java | 小到中等 | PDF 生成与缓存复用路径仍有剩余分支 |
| SmsRelayService.java | 小到中等 | 主要剩极少量配置/边界分支 |
| 新增缓存/配置类 | 小 | `SimpleTtlCache`、`JsonTwoLevelCache`、`PerformanceConfig` 已补专门测试，剩余已明显收窄 |

### 5.3 安卓端

- 无 MockK 框架，无法 mock 依赖
- 无 DI，无法替换内部实例化
- 当前 JVM 覆盖率为 `17.65%` methods / `12.08%` instructions
- `MainActivity`、`RelayApplication`、`RelayForegroundService`、`SettingsFragment`、`OverviewFragment`、`RecordsFragment` 已补 JVM 单测，但 JaCoCo 对新增 UI/Robolectric 用例的归因仍偏弱

---

## 6. 当前阻塞

1. **P0**：安卓端继续提升 JaCoCo 归因质量，并引入更系统的 Mock/DI
2. **P1**：管理后台 `VolunteerManagePage / AuditLogPage / MedicationManagePage / AnalyticsPage / RbacPage` 页面级边界覆盖
3. **P2**：志愿者端 `QrCodeManagePage / AssignedElderListPage / MedicationEditorPage / verificationStore.ts` 等尾部分支
4. **P3**：扫码端少量语句/分支尾巴与后端 `NameplateService / SmsRelayService / 应用入口` 极少数剩余路径

---

## 7. 详细文档导航

| 文档 | 路径 |
|------|------|
| 函数级单元测试矩阵 | `docs/01-单元测试/01-函数级单元测试矩阵.md` |
| 日志与报告逐行审查提示词 | `docs/01-单元测试/02-单元测试日志逐行审查提示词.md` |
| 问题与修复审查汇总 | `docs/01-单元测试/03-单元测试问题与修复审查汇总.md` |
| 后端测试详情 | `docs/01-单元测试/04-统一后端/后端测试详情.md` |

---

## 8. 下一步建议

1. 继续补充管理后台 `VolunteerManagePage`、`AuditLogPage`、`MedicationManagePage`、`AnalyticsPage`、`RbacPage`
2. 扫码端把 `BottomTabBar`、`SecurityProvider`、`SmsVerifyPage` 等最后少量语句/分支补齐
3. 志愿者端继续收 `QrCodeManagePage`、`AssignedElderListPage`、`MedicationEditorPage`、`verificationStore.ts`
4. 安卓端继续增强 UI/Robolectric 用例的归因质量，并补 `Settings/Overview/Records` 细分支
5. 后端继续消化 `NameplateService`、`SmsRelayService` 与应用入口的剩余分支
