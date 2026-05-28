# 单元测试

**最后更新**：2026-05-29

---

## 1. 当前覆盖率现状

| 模块 | 函数/方法覆盖率 | 语句覆盖率 | 分支覆盖率 | 行覆盖率 | 测试用例数 |
|------|---------------|-----------|-----------|---------|-----------|
| 01-扫码用户端 | 97.79% (177/181) | 98.11% | 91.41% | 99.04% | 215 |
| 02-志愿者填写端 | 93.02% (400/430) | 92.98% | 82.73% | 94.68% | 140 |
| 03-管理后台端 | 93.10% (715/768) | 89.07% | 78.80% | 92.12% | 157 |
| 04-统一后端 | 94.15% (917/974) | 90.56% | — | — | 621 |
| 05-安卓短信中转端 | pending | pending | pending | pending | ~23 |

**注意**：Android 端仍然缺统一 XML 聚合，所以总汇总里还是 `pending`，当前只能确认 JVM 单测通过。

---

## 2. 各端测试数量与框架

| 模块 | 测试文件数 | 测试框架 |
|------|-----------|---------|
| 01-扫码用户端 | 22 | Vitest + @testing-library/react |
| 02-志愿者填写端 | 19 | Vitest + @testing-library/react |
| 03-管理后台端 | 23 | Vitest + @testing-library/react |
| 04-统一后端 | ~50 | JUnit 5 + Mockito |
| 05-安卓短信中转端 | ~13 | JUnit 4 + Robolectric |

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

---

## 5. 当前剩余缺口

### 5.1 前端分支覆盖率

| 模块 | 当前分支覆盖率 | 主要缺口 |
|------|-------------|---------|
| 扫码端 | 91.41% | `smsApi.ts` 少量错误分支、`SmsVerifyPage` 个别 fallback/UI 分支、`useProtectedArchive` cancel/finally 细分支 |
| 志愿者端 | 82.73% | `AssignedElderListPage`、`LoginPage`、`MedicationEditorPage`、`SubjectListPage`、`FamilyHomePage` 等页/组件尾部分支 |
| 管理后台端 | 78.80% | `DashboardPage`、`AuditLogPage`、`VolunteerManagePage`、`ElderArchivePage`、`QrCodeManagePage` 等页面级边界 |

### 5.2 后端指令覆盖率

| 文件 | 未覆盖指令数 | 状态 |
|------|------------|------|
| SilverLinkDataService.java | 较大 | 已有大批 service/controller 测试，仍是后端主要覆盖率黑洞 |
| NameplateService.java | 中等 | PDF 生成与缓存复用路径仍有剩余分支 |
| SmsRelayService.java | 中等 | 主要剩边界/配置分支 |
| 新增缓存/配置类 | 小 | `SimpleTtlCache`、`JsonTwoLevelCache`、`PerformanceConfig` 已补专门测试，剩余已明显收窄 |

### 5.3 安卓端

- 无 MockK 框架，无法 mock 依赖
- 无 DI，无法替换内部实例化
- JaCoCo XML 聚合未完成

---

## 6. 当前阻塞

1. **P0**：安卓端 JaCoCo XML 聚合
2. **P1**：安卓端引入 MockK / DI，降低 `Service/Fragment` 测试门槛
3. **P2**：管理后台剩余页面级分支覆盖
4. **P3**：志愿者端与扫码端剩余 UI / hook 边界分支

---

## 7. 详细文档导航

| 文档 | 路径 |
|------|------|
| 函数级单元测试矩阵 | `docs/01-单元测试/01-函数级单元测试矩阵.md` |
| 后端测试详情 | `docs/01-单元测试/04-统一后端/后端测试详情.md` |

---

## 8. 下一步建议

1. 继续补充管理后台 `DashboardPage`、`AuditLogPage`、`VolunteerManagePage`、`ElderArchivePage` 这类页面级分支
2. 扫码端把 `smsApi`、`SmsVerifyPage` 和 `useProtectedArchive` 尾部分支补齐
3. 志愿者端继续收 shared-workbench 和 family-entry 的零散边界
4. 安卓端引入 MockK + DI，并完成 XML 聚合
5. 后端继续消化 `SilverLinkDataService`、`NameplateService` 的剩余分支
