# 06-安卓短信中转端

## 当前定位

`06-安卓短信中转端` 已经从目录骨架推进为可编译 Android 应用，用于承接本项目当前正式版本的短信验证链路：

- 用户向固定接收手机号发送随机验证码短信
- 安卓设备接收短信并解析发送方手机号、短信正文、接收时间
- 安卓端回传统一后端
- 后端校验验证码会话、记录查询手机号和访问审计日志

这不是演示占位页，而是当前正式实现的一部分。

## 当前完成状态

已完成：

- Android Gradle 工程和 Wrapper
- `app` 模块构建配置
- Material 3 风格三页主界面
- 短信接收广播 `SmsReceiver`
- 上传 Worker `InboundSmsUploadWorker`
- 心跳 Worker `HeartbeatWorker`
- 本地配置与状态持久化
- 中转回传接口封装
- 调试包产物输出

当前 APK 产物：

- [app-debug.apk](</D:/Project/SilverLink Care/06-安卓短信中转端/app/build/outputs/apk/debug/app-debug.apk>)

## 设计基准

本端 UI 以这张图为正式设计基准：

![安卓短信中转端 Google 风格设计图](D:/Project/SilverLink Care/ui_overview_images/android_sms_relay_google_style.png)

要求：

- Google 最新 Material 3 风格
- 卡片化信息分区
- 底部导航三页结构
- 状态色清晰
- 手机竖屏优先

## 当前界面结构

### 总览

- 设备在线状态
- 固定接收手机号
- 回传服务器地址
- 设备 ID
- 设备密钥
- 今日接收 / 上传成功 / 上传失败 / 待重试
- 最近同步 / 运行时长
- 最近短信记录

### 记录

- 全部 / 已上传 / 上传失败 / 待重试 筛选
- 短信记录列表
- 发件手机号
- 短信摘要
- 接收时间
- 上传状态

### 设置

- 固定接收手机号
- 服务器地址
- 设备 ID
- 设备密钥
- 短信前缀规则
- 最后心跳时间
- 最后同步时间
- 版本信息

## 目录结构

```text
06-安卓短信中转端/
  README.md
  开发规划.md
  settings.gradle.kts
  build.gradle.kts
  gradle.properties
  local.properties
  gradle/
    wrapper/
  app/
    build.gradle.kts
    开发说明.md
    src/
      main/
        AndroidManifest.xml
        java/com/silverlink/smsrelay/
          RelayApplication.kt
          MainActivity.kt
          receiver/
          worker/
          repository/
          data/
          ui/
          util/
          开发说明.md
        res/
          drawable/
          layout/
          menu/
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

1. 打开 [06-安卓短信中转端](</D:/Project/SilverLink Care/06-安卓短信中转端>)
2. 连接真机或启动模拟器
3. 运行 `app` 模块

### 命令行

```powershell
Set-Location "D:\Project\SilverLink Care\06-安卓短信中转端"
.\gradlew.bat installDebug
adb shell am start -n com.silverlink.smsrelay/.MainActivity
```

## 当前验证结果

- `gradlew assembleDebug` 已构建通过
- 三页主界面已实现
- 假数据与本地配置可渲染
- 接收 -> 入列 -> 上传 -> 状态更新 代码链条已接通

## 仍待补齐

- 真机 SIM 卡短信接收实测
- 与已部署统一后端的真实 HTTP 联调
- 自定义重试退避策略
- 首次启动时心跳任务自动调度
- Android 6.0+ 运行时权限引导
