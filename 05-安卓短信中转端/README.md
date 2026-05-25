# 05-安卓短信中转端

## 当前定位

`05-安卓短信中转端` 已经是本项目短信验证链路中的正式组成部分，不再是占位工程。

当前链路是：

- 扫码端向统一后端申请短信验证会话
- 后端决定本次验证应发送到哪台安卓短信接收设备
- 用户向该设备绑定的手机号发送指定短信内容
- 安卓端后台接收短信、解析格式、回传统一后端
- 后端校验会话并决定是否放行敏感信息访问

## 当前已完成

- Android Gradle 工程、Wrapper、调试包构建链路
- Material 3 三页主界面：总览 / 记录 / 设置
- `SmsReceiver` 接收短信广播
- `SmsParser` 前缀与验证码格式过滤接入
- 短信上传链路：前台服务优先，Worker 兜底
- 设备心跳链路：前台服务定时心跳
- 开机恢复后台服务
- 首次打开应用启动后台服务
- 本地配置、记录、统计、服务状态持久化
- 设备配置同步与占位配置保护
- 运行时短信权限引导
- 电池优化白名单引导
- 息屏保活支持：前台服务 + `PARTIAL_WAKE_LOCK`
- 请求签名能力：安卓端对 `inbound / heartbeat / config` 请求生成签名
- 总览页与设置页展示后台服务状态
- 单元测试与基础仪器测试入口

## 当前界面能力

### 总览页

- 设备在线状态
- 后台服务状态
- 固定接收手机号
- 回传服务器地址
- 设备 ID / 密钥摘要
- 今日接收 / 上传成功 / 上传失败 / 待重试
- 最近同步
- 最近短信记录

### 记录页

- 全部 / 已上传 / 上传失败 / 待重试筛选
- 发件手机号
- 短信内容
- 接收时间
- 上传状态

### 设置页

- 固定接收手机号
- 服务器地址
- 设备 ID
- 设备密钥
- 短信前缀规则
- 申请短信权限
- 允许息屏后台运行
- 同步服务端配置
- 设备状态 / 后台服务状态 / 权限状态 / 息屏保活状态
- 最后心跳 / 最后同步 / 版本信息

## 当前后台运行机制

当前主链路已经不再依赖单纯的 `WorkManager` 轮询，而是改为：

- `RelayForegroundService` 作为前台常驻服务
- 服务内每 15 分钟自动发送一次心跳
- 收到短信后优先由前台服务直接上传
- `InboundSmsUploadWorker` 作为兜底重试路径保留
- `BootCompletedReceiver` 在重启后恢复服务
- `BatteryOptimizationHelper` 提供系统电池优化白名单跳转

这套实现的目标是让安卓设备在亮屏、退到后台、息屏后都能继续承担短信中转任务。

## 当前验证结果

已完成的验证包括：

- `bash ./gradlew testDebugUnitTest` 通过
- `bash ./gradlew installDebug` 通过
- 真机已完成应用启动验证
- 真机已完成前台服务启动验证
- 真机已完成息屏后服务仍在运行的验证
- 真机已完成短信权限授予
- 真机已完成系统省电白名单加入
- 统一后端心跳接口已联通

当前真机配置口径以应用内设置页和统一后端设备配置为准。

## 当前目录结构

```text
05-安卓短信中转端/
  README.md
  开发规划.md
  settings.gradle.kts
  build.gradle.kts
  gradle.properties
  local.properties
  app/
    build.gradle.kts
    开发说明.md
    src/
      main/
        AndroidManifest.xml
        java/com/silverlink/smsrelay/
          RelayApplication.kt
          MainActivity.kt
          service/
          receiver/
          worker/
          repository/
          data/
          ui/
          util/
          开发说明.md
        res/
          layout/
          values/
          xml/
          开发说明.md
      test/
        开发说明.md
      androidTest/
        开发说明.md
```

## 运行方式

### Android Studio

1. 打开 `05-安卓短信中转端`
2. 连接真机或启动模拟器
3. 运行 `app` 模块

### 命令行

```bash
cd "05-安卓短信中转端"
bash ./gradlew installDebug
adb shell am start -n com.silverlink.smsrelay/.MainActivity
```

## 当前仍待推进

- 真实短信“发送到设备手机号 -> 安卓接收 -> 上传后端 -> 后台可见”的完整闭环留档
- 更多自动化测试，尤其是设置页、权限流、服务恢复流
- Worker 自定义退避策略
- 后台服务状态与失败原因的更细粒度展示
- 多设备部署场景下更完整的运维说明
