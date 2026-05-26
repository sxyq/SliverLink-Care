# 2026-05-26 11:24 后端单元测试继续推进记录

## 本轮目标

继续补齐后端高体量模块单元测试，优先覆盖：

- `ScanService`
- `NameplateService`
- `NameplateController`

本轮不修改业务代码，只新增测试与记录。

## 本轮新增测试文件

- `04-统一后端/src/test/java/com/silverlink/care/module/scan/ScanServiceTest.java`
- `04-统一后端/src/test/java/com/silverlink/care/module/nameplate/NameplateControllerTest.java`
- `04-统一后端/src/test/java/com/silverlink/care/module/nameplate/NameplateServiceTest.java`

## 本轮新增覆盖点

### `ScanService`

- 启用二维码解析成功
- 二维码不存在 / 已停用时拒绝
- 健康档案、基础信息、用药、量表读取委托
- 验证状态查询委托
- 身份校验会话创建委托
- 已验证会话授权委托
- 有中转设备 / 无中转设备两种扫码验证会话创建

### `NameplateController`

- 预览接口委托
- PDF 下载响应头与响应体
- 批量 PDF 数量统计

### `NameplateService`

- 空白模板占位数据
- 现有二维码路径
- 当前二维码不存在时补发二维码
- 获取二维码失败时包装异常
- 姓名 / 年龄 / 联系方式 / 档案号缺失时的兜底值

## 本轮执行过程

### 1. 定向运行新增测试

```bash
cd "04-统一后端" && ./mvnw -Dtest=ScanServiceTest,NameplateControllerTest,NameplateServiceTest test
```

结果：

- 首次运行暴露两处测试侧问题：
  - `NameplateServiceTest` 中一个测试方法遗漏 `throws Exception`
  - 直接走 `generateDemoPdf()` 路径在 `Java 24 + JaCoCo` 下触发 JDK 类插桩崩溃
- 已通过修改测试本身解决，未改业务实现
- 修正后定向测试通过：
  - `ScanServiceTest`：`3` 通过
  - `NameplateServiceTest`：`4` 通过
  - `NameplateControllerTest`：`3` 通过

### 2. 运行后端全量测试与覆盖率

```bash
cd "04-统一后端" && ./mvnw test jacoco:report
```

结果：

- `234` 个测试全部通过
- `BUILD SUCCESS`
- JaCoCo 报告已生成

## 当前最新后端覆盖率

来源：`04-统一后端/target/site/jacoco/jacoco.xml`

- `Method`: `68.74%` (`596/867`)
- `Instruction`: `31.20%` (`5459/17497`)
- `Line`: `39.36%` (`1232/3130`)

## 当前最新统一单元测试覆盖率

来源：`06-测试与质量保障/reports/unit/current/coverage-summary.md`

- 扫码端：`71.84%`
- 志愿者/家属端：`81.31%`
- 管理后台：`85.01%`
- 后端：`68.74%`
- Android：`pending XML aggregation`

## 本轮提升

- 后端方法覆盖率：`66.09% -> 68.74%`
- 后端指令覆盖率：`28.83% -> 31.20%`

## 重要说明

- `Java 24 + JaCoCo 0.8.12` 仍会对部分 JDK 68 版本类打印 `Unsupported class file major version 68` 相关插桩告警。
- 这类告警在本轮全量测试中未导致 Maven 失败，最终结果仍为 `BUILD SUCCESS`。
- 为保证稳定性，本轮已避免在测试中继续走最容易触发该兼容问题的 PDF 字体渲染深路径，但业务实现本身未被改动。
