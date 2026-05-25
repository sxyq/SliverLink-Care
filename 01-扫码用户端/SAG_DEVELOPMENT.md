# 01-扫码用户端 SAG 开发说明

## 开发顺序

1. 配置与类型：`package.json`、`tsconfig.json`、`src/types`
2. API 契约：`src/api`，先定义扫码解析、短信发送、短信验证、敏感档案读取接口
3. 路由：`src/routes/router.tsx`
4. 页面：基础信息页、短信验证页、健康档案页、用药页、量表页、名牌预览页
5. 组件与样式：公共卡片、脱敏字段、联系人按钮、验证状态提示
6. 验收：扫码基础信息展示、短信验证后查看敏感信息、页面脱敏

## 建议类/组件

- `App`
- `BasicInfoPage`
- `SmsVerifyPage`
- `HealthArchivePage`
- `MedicationPage`
- `ScaleSummaryPage`
- `NameplatePreviewPage`

## 建议函数

- `resolveQrToken`
- `sendSmsVerification`
- `verifySmsCode`
- `fetchHealthArchive`
- `fetchMedications`
- `maskPhone`
- `recordSensitiveView`

## 图谱约束

扫码端必须依赖统一后端 `scan / smsrelay / nameplate` 模块，不允许在前端暴露老人敏感明文信息。
