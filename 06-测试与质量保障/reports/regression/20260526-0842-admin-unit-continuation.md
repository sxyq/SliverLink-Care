# 2026-05-26 管理后台单元测试继续推进记录

## 本轮范围

- 在不修改业务实现的前提下，继续补充单元测试。
- 本轮重点覆盖：
  - `03-管理后台端/src/App.tsx`
  - `03-管理后台端/src/routes/router.tsx`
  - `03-管理后台端/src/pages/AdminLoginPage.tsx`
  - `03-管理后台端/src/pages/DashboardPage.tsx`
  - `03-管理后台端/src/components/Sidebar.tsx`
  - `03-管理后台端/src/features/rbac/permissionGuard.ts`

## 新增测试文件

- `03-管理后台端/src/App.test.tsx`
- `03-管理后台端/src/routes/router.test.tsx`
- `03-管理后台端/src/pages/loginAndDashboard.test.tsx`
- `03-管理后台端/src/components/Sidebar.test.tsx`
- `03-管理后台端/src/features/rbac/permissionGuard.test.ts`

## 实际执行

### 志愿者/家属端回归

命令：

```bash
cd "02-志愿者填写端" && npm run test -- --run
```

结果：

- `15` 个测试文件通过
- `50` 个测试通过

### 管理后台单测

命令：

```bash
cd "03-管理后台端" && npm run test -- --run
```

结果：

- `13` 个测试文件通过
- `50` 个测试通过

### 聚合单测

命令：

```bash
bash "06-测试与质量保障/scripts/unit/run_unit_suite.sh"
```

结果：

- 扫码端、志愿者/家属端、管理后台、后端、Android JVM 全部跑通
- 报告目录：
  - `06-测试与质量保障/reports/unit/20260526-084233-unit-suite`

### 管理后台覆盖率刷新

命令：

```bash
cd "03-管理后台端" && npm run test:coverage
python3 "06-测试与质量保障/scripts/common/collect_coverage_summary.py"
```

结果：

- 覆盖率产物已刷新
- `npm run test:coverage` 因全局 `100%` 门禁继续失败，这是预期证据，不是异常

## 覆盖率变化

刷新后 `06-测试与质量保障/reports/unit/current/coverage-summary.md` 中管理后台结果为：

- `admin-console` 函数覆盖率：`35.98% (276/767)`
- `admin-console` 语句覆盖率：`33.04% (703/2128)`

对比上一轮：

- 函数覆盖率从 `20.60%` 提升到 `35.98%`
- 语句覆盖率从 `19.03%` 提升到 `33.04%`

## 本轮确认点

- `App` 的登录态回调依赖本地 token 已先写入；只写角色而没有 token 时，会被会话自检清理。这是当前实现逻辑，不是本轮新增问题。
- `DashboardPage` 存在首批同步加载 + `setTimeout(0)` 延后第二批加载的双阶段行为，测试已按真实行为覆盖成功。
- 本轮未修改业务代码，也未进行服务器部署。

## 下一步建议

- 继续补管理后台高体量页面：
  - `QrCodeManagePage`
  - `VolunteerManagePage`
  - `AuditLogPage`
  - `InvitationManagePage`
  - `RbacPage`
- 继续补后端 `service/controller` 分支与 Android `worker/receiver/service` 单测，才有可能继续逼近总目标的 `100%`。
