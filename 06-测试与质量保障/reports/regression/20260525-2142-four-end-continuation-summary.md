# 2026-05-25 四端测试继续推进摘要

## 本轮新增覆盖范围

- 扫码端：组件、敏感字段、按钮渲染、信息卡、验证 store 倒计时/授权过期/错误次数。
- 志愿者/家属端：邀请码 store、名牌 PDF 打开逻辑、表单 Section 组件。
- 管理后台：审计 CSV 导出、状态标签、指标卡、安全状态颜色工具。
- 安卓短信中转端：短信权限 helper、前台服务启动器、上传短信 intent 参数。
- 统一后端：Hash、AES-GCM 加解密、全局异常映射、管理后台签名拦截器缺 header/时间戳/签名/nonce 重放。

## 已验证通过

- `01-扫码用户端 npm run test`
- `02-志愿者填写端 npm run test`
- `03-管理后台端 npm run test`
- `05-安卓短信中转端 bash ./gradlew testDebugUnitTest`
- `04-统一后端 ./mvnw test jacoco:report`
- `bash 06-测试与质量保障/scripts/unit/run_unit_suite.sh`
- 三个前端 `npm run build`

## 覆盖率变化

详见 `06-测试与质量保障/reports/unit/current/coverage-summary.md`。

| 模块 | 本轮后函数/方法覆盖率 |
| --- | ---: |
| scan-client | 29.89% |
| volunteer-client | 16.59% |
| admin-console | 11.21% |
| backend | 51.96% |
| android-relay | JVM 测试通过，XML 聚合待补 |

## 仍未完成

- 三个前端全局 100% coverage gate 仍失败，这是预期结果，说明页面、路由、复杂组件和部分 hook 仍需继续补测。
- Android 目前执行 JVM 单测；`connectedDebugAndroidTest` 仍需要可用设备/模拟器。
- Android 覆盖率 XML 汇总脚本尚未完成。
- Playwright E2E 尚未开始补。

## 下一批建议

1. 扫码端：`SmsVerifyPage`、`useProtectedArchive`、`useScanBasicInfo`、`HealthArchivePage`。
2. 志愿者/家属端：登录页、邀请码注册页、老人列表、用药页、量表页。
3. 管理后台：`AuditLogPage`、`VolunteerManagePage`、`QrCodeManagePage`、`TableColumnMenu`。
4. Android：`SmsReceiver`、`InboundSmsUploadWorker`、`HeartbeatWorker`、`RelayPreferences`。
5. 后端：`ScanService`、`QrCodeService`、`FamilyService`、`VolunteerService`、`InvitationService`、`SmsRelayService`。
