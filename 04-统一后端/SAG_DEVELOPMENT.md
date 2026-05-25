# 04-统一后端 SAG 开发说明

## 开发顺序

1. 构建配置：`pom.xml`、数据库、Flyway、安全配置
2. 基础设施：JWT、异常、审计、脱敏、二维码加密
3. 数据模型：老人、健康档案、用药、量表、二维码、验证码会话、短信中转设备
4. 业务服务：`scan`、`smsrelay`、`family`、`volunteer`、`admin`、`rbac`、`nameplate`
5. Controller：扫码端、工作台、后台、安卓中转端接口
6. 测试：API 集成测试、权限测试、短信回传测试、PDF/二维码生成测试

## 建议类

- `SilverLinkCareApplication`
- `ScanController`
- `ScanService`
- `SmsRelayController`
- `SmsRelayService`
- `RbacService`
- `NameplateService`
- `AuditLogService`

## 建议函数

- `resolveQrToken`
- `createVerificationSession`
- `verifyInboundSms`
- `authorizeSensitiveView`
- `generateNameplatePdf`
- `recordAuditLog`
- `assertDataScope`

## 图谱约束

统一后端是所有端的依赖中心。扫码敏感查看必须依赖 `smsrelay` 验证会话；后台操作必须记录审计；默认 demo 密钥不能进入生产配置。
