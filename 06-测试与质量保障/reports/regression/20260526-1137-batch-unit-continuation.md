# 2026-05-26 11:37 大批量单元测试继续推进记录

## 本轮目标

一次性补更多单元测试，覆盖后端高价值 service/controller 与 Android JVM 可稳定验证的本地逻辑。

## 本轮新增测试文件

### 后端

- `04-统一后端/src/test/java/com/silverlink/care/module/qrcode/QrCodeServiceTest.java`
- `04-统一后端/src/test/java/com/silverlink/care/module/elder/ElderServiceTest.java`
- `04-统一后端/src/test/java/com/silverlink/care/module/elder/ElderControllerTest.java`

### Android

- `05-安卓短信中转端/app/src/test/java/com/silverlink/smsrelay/data/local/RelayPreferencesTest.kt`
- `05-安卓短信中转端/app/src/test/java/com/silverlink/smsrelay/receiver/BootCompletedReceiverTest.kt`
- `05-安卓短信中转端/app/src/test/java/com/silverlink/smsrelay/repository/SmsRelayRepositoryTest.kt`

## 本轮新增覆盖点

### 后端 `QrCodeService`

- 新二维码生成
- 已有 token 时直接复用
- 通过 token 解析二维码
- 重新生成二维码
- 重新生成不存在时返回 `null`
- 绑定短信中转设备成功
- 绑定空设备时解绑
- 绑定时缺二维码 id
- 绑定不存在的设备
- 公网 URL 两种拼接策略
- 二维码列表组装解密字段
- 启动时二维码补发与老人多码去重

### 后端 `ElderService` / `ElderController`

- 基础信息保存委托
- 健康记录保存委托
- 用药保存委托
- 量表保存委托
- 量表查询委托
- 审计记录触发

### Android `RelayPreferences`

- 配置保存与默认前缀
- 最后同步时间
- 最后心跳时间
- 运行时长
- 服务状态
- 当日统计跨日重置

### Android `BootCompletedReceiver`

- 非开机广播忽略
- 开机后自动启动前台服务并立即触发心跳

### Android `SmsRelayRepository`

- 上传成功时记录持久化
- 上传成功后的状态、最近记录、分类记录、统计与最后同步时间
- 上传失败时记录持久化
- 上传失败后的失败原因与统计

## 执行结果

### 1. 后端定向测试

```bash
cd "04-统一后端" && ./mvnw -Dtest=QrCodeServiceTest,ElderServiceTest,ElderControllerTest test
```

结果：

- `5` 个测试全部通过
- `BUILD SUCCESS`

### 2. Android 定向测试

```bash
cd "05-安卓短信中转端" && bash ./gradlew testDebugUnitTest \
  --tests 'com.silverlink.smsrelay.data.local.RelayPreferencesTest' \
  --tests 'com.silverlink.smsrelay.receiver.BootCompletedReceiverTest' \
  --tests 'com.silverlink.smsrelay.repository.SmsRelayRepositoryTest'
```

结果：

- 定向新增测试通过
- `BUILD SUCCESS`

### 3. 后端全量测试与覆盖率

```bash
cd "04-统一后端" && ./mvnw test jacoco:report
```

结果：

- `239` 个测试全部通过
- JaCoCo 报告生成
- `BUILD SUCCESS`

### 4. Android 全量 JVM 单测

```bash
cd "05-安卓短信中转端" && bash ./gradlew testDebugUnitTest
```

结果：

- `23` 个测试
- `0` 失败
- `0` 忽略
- `duration`: `3.094s`
- `BUILD SUCCESS`

## 当前最新统一单元测试覆盖率

来源：`06-测试与质量保障/reports/unit/current/coverage-summary.md`

- 扫码端：`71.84%`
- 志愿者/家属端：`81.31%`
- 管理后台：`85.01%`
- 后端：`71.74%`
- Android：`pending XML aggregation`

## 本轮提升

- 后端方法覆盖率：`68.74% -> 71.74%`
- 后端指令覆盖率：`31.20% -> 35.96%`

## 重要说明

- 后端与 Android 在 `Java 24 + JaCoCo 0.8.12` 下仍会输出 `Unsupported class file major version 68` 的 JDK 类插桩告警。
- 本轮这些告警没有导致构建失败，后端与 Android 最终都为 `BUILD SUCCESS`。
- Android 统一覆盖率仍显示 `pending XML aggregation`，原因不是测试失败，而是统一汇总脚本尚未接入 Android JaCoCo XML 聚合步骤。
