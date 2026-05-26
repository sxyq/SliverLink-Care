# 2026-05-25 22:58 覆盖率继续推进记录

## 本轮重点

- 继续按 100% 覆盖目标推进，没有降低任何覆盖率门禁。
- 优先补测扫码端验证链路与基础信息页。
- 补测家属端短信验证页，并修复一个备用手机号切换后的真实发送目标问题。

## CodeGraph 使用情况

- 本轮继续使用 CodeGraph。
- 通过 `codegraph_node` 查看了 `BasicInfoPage` 的实现。
- 通过 `codegraph_node` 检索 `SmsVerifyPage` 时发现同名页面存在于扫码端和家属端，随后按真实路径读取了两个页面源码并补测。

## 本轮新增与修改

- 扫码用户端：
  - 扩展 `src/pages/pages.test.tsx`，覆盖 `BasicInfoPage` 未验证弹窗、取消、继续验证、已验证直接进入健康档案。
  - 新增 `src/pages/SmsVerifyPage.test.tsx`，覆盖短信会话创建、复制短信内容、打开短信提示、检查验证状态、身份登记校验、身份登记成功、错老人会话拦截、提交失败提示。
- 志愿者/家属端：
  - 新增 `src/family-entry/pages/SmsVerifyPage.test.tsx`，覆盖缺少路由 state 时跳转登录、普通短信验证、重发、切换备用手机号、邀请码注册、失败提示。
  - 修改 `src/family-entry/pages/SmsVerifyPage.tsx`：切换备用手机号后使用备用手机号发送验证码，避免继续向旧手机号发送。

## 发现并修复的问题

- 问题：家属端 `handleSwitchBackup` 调用 `switchToBackup()` 后立即使用旧闭包中的 `vState.phone` 发送短信。
- 影响：用户点击“切换备用手机号”后，验证码可能仍发送给主手机号。
- 修复：在切换前先取 `vState.backupPhone || vState.phone` 为 `nextPhone`，再调用发送接口。
- 测试：新增断言确保切换备用手机号后 `sendSmsCode` 收到的是备用手机号。

## 执行结果

| 命令 | 结果 |
| --- | --- |
| `bash 06-测试与质量保障/scripts/unit/run_unit_suite.sh` | 通过 |
| `01-扫码用户端 npm run test` | 13 个测试文件，52 个测试通过 |
| `02-志愿者填写端 npm run test` | 12 个测试文件，35 个测试通过 |
| `03-管理后台端 npm run test` | 8 个测试文件，31 个测试通过 |
| 后端单测 | 通过 |
| Android JVM 单测 | 通过 |
| 前端 `npm run test:coverage` | 失败，原因是严格 100% 覆盖率门禁尚未达成 |

## 当前覆盖率

| 模块 | 函数/方法覆盖率 | 语句/指令覆盖率 |
| --- | ---: | ---: |
| scan-client | 71.84% (125/174) | 66.10% (509/770) |
| volunteer-client | 27.80% (119/428) | 25.14% (316/1257) |
| admin-console | 20.60% (158/767) | 19.03% (405/2128) |
| backend | 55.71% (483/867) | 16.93% (2963/17497) |
| android-relay | XML 聚合待接入 | JVM 测试报告可用 |

## 下一步

1. 扫码端继续补 `HealthArchivePage`、`ScaleDetailPage`、`App.tsx`，把 scan-client 推近 100%。
2. 志愿者/家属端补 `FamilyRegisterPage`、`InviteLandingPage`、`FamilyLoginPage`，继续覆盖邀请码注册主链路。
3. 管理后台补 `QrCodeManagePage`、`VolunteerManagePage`、`AuditLogPage`，这些页面仍是最大覆盖缺口。
4. 后端继续补 `SmsRelayService` 未覆盖分支和 controller 层。
5. Android 接入 JaCoCo XML 聚合，开始按 worker/receiver/service 补覆盖证据。
