# 05-安卓短信中转端 SAG 开发说明

## 开发顺序

1. Gradle 与 Manifest：权限、前台服务、开机广播
2. 本地数据：设备配置、短信记录、上传状态、心跳状态
3. 短信接收：`SmsReceiver`、短信格式解析、验证码提取
4. 前台服务：心跳、短信上传、失败重试、息屏保活
5. UI：总览、记录、设置、权限引导、电池优化引导
6. 验收：真机短信权限、前台服务、心跳接口、息屏保活、短信回传

## 建议类

- `MainActivity`
- `RelayForegroundService`
- `SmsReceiver`
- `InboundSmsUploadWorker`
- `RelayRepository`
- `SmsParser`
- `BatteryOptimizationHelper`

## 建议函数

- `startServiceLoop`
- `sendHeartbeat`
- `parseInboundSms`
- `uploadInboundSms`
- `scheduleRetry`
- `syncDeviceConfig`
- `requestSmsPermission`

## 图谱约束

安卓端必须依赖统一后端 `smsrelay` 模块。收到短信后优先由前台服务上传，Worker 只作为兜底重试路径。
