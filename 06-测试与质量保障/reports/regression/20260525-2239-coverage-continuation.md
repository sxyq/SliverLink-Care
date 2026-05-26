# 2026-05-25 22:39 覆盖率推进记录

## CodeGraph 使用情况

- 已调用 CodeGraph。
- 本轮使用 `codegraph_files` 检查了扫码端、志愿者/家属端、管理后台源码文件与符号分布，用来选择优先补测区域。
- 早前也用 CodeGraph 检查过索引状态与高价值未覆盖区域，确认当前项目索引可用于定位源码函数。

## 本轮新增覆盖

- 扫码用户端：
  - 新增页面测试：`src/pages/pages.test.tsx`
  - 新增导航、隐私保护、量表、受保护路由测试：`src/components/navigationAndProtection.test.tsx`
  - 覆盖 `NotFoundPage`、`MedicationPage`、`NameplatePreviewPage`、`BottomTabBar`、`PageTopBar`、`ProtectedRoute`、`ContentProtection`、`MedicationList`、`VerificationBadge`、`ScaleSummaryCard`
- 志愿者/家属端：
  - 扩充组件测试：`src/components/components.test.tsx`
  - 新增家属端组件测试：`src/family-entry/components/components.test.tsx`
  - 新增家属验证状态测试：`src/family-entry/features/verification/verificationStore.test.ts`
  - 覆盖 `ElderListItem`、`ScaleQuestion`、`SelectChips`、`SubmitBar`、`TextInput`、`ElderCard`、`MedCard`、`SmsVerifyInput`、`TopBar`、verification store
- 管理后台：
  - 扩充组件测试：`src/components/components.test.tsx`
  - 新增 hook 测试：`src/hooks/useDashboard.test.tsx`
  - 覆盖 `Sidebar`、`PermissionMatrix`、`AdminMessageCenter`、`useDashboard`
- 后端：
  - 修复 `SmsRelayServiceTest`，移除 Java 24 下不稳定的 Mockito concrete-class mock，改为内存 fake/stub。
  - 后端 `./mvnw test jacoco:report` 通过。
- Android 短信中转端：
  - JVM 单测继续通过。
  - Android JaCoCo XML 聚合仍待接入，当前仅确认 JVM test report 可用。

## 执行结果

| 命令 | 结果 |
| --- | --- |
| `bash 06-测试与质量保障/scripts/unit/run_unit_suite.sh` | 通过 |
| `01-扫码用户端 npm run test` | 12 个测试文件，46 个测试通过 |
| `02-志愿者填写端 npm run test` | 11 个测试文件，31 个测试通过 |
| `03-管理后台端 npm run test` | 8 个测试文件，31 个测试通过 |
| `04-统一后端 ./mvnw test jacoco:report` | 214 个测试通过，JaCoCo 报告生成 |
| `05-安卓短信中转端 bash ./gradlew testDebugUnitTest` | 通过 |
| 前端 `npm run test:coverage` | 失败，原因是 100% 覆盖率门禁尚未达成 |

## 当前覆盖率

| 模块 | 函数/方法覆盖率 | 语句/指令覆盖率 |
| --- | ---: | ---: |
| scan-client | 54.60% (95/174) | 48.70% (375/770) |
| volunteer-client | 26.17% (112/428) | 22.05% (277/1256) |
| admin-console | 20.60% (158/767) | 19.03% (405/2128) |
| backend | 55.71% (483/867) | 16.93% (2963/17497) |
| android-relay | XML 聚合待接入 | JVM 测试报告可用 |

## 100% 覆盖率差距

- 100% 门禁没有降低，仍然按严格目标执行。
- 当前主要缺口集中在：
  - 扫码端 `App.tsx`、`SmsVerifyPage.tsx`、`BasicInfoPage.tsx`、`HealthArchivePage.tsx`、`ScaleDetailPage.tsx`
  - 志愿者/家属端大量页面级 handler，包括登录、登记、量表、二维码、家属注册、家属管理页面
  - 管理后台所有大型页面级 handler，包括 `AuditLogPage`、`DashboardPage`、`VolunteerManagePage`、`QrCodeManagePage`、`ElderArchivePage`
  - 后端 service/controller/persistence 私有分支与异常分支
  - Android 覆盖率 XML 聚合和 UI/receiver/worker 更细粒度覆盖

## 下一步优先级

1. 扫码端先补 `SmsVerifyPage` 和 `BasicInfoPage`，因为它们直接关联此前线上验证错人问题。
2. 志愿者/家属端先补 `LoginPage`、`FamilyRegisterPage`、`InviteLandingPage`、`SmsVerifyPage`。
3. 管理后台先补 `AuditLogPage`、`QrCodeManagePage`、`VolunteerManagePage`，这些页面函数多且历史问题多。
4. 后端继续补 `SmsRelayService` 的入站短信、心跳、直连短信验证、设备列表和 session 列表分支。
5. Android 接入 JaCoCo XML 汇总，然后补 worker、receiver、foreground service、permission helper 的边界分支。
