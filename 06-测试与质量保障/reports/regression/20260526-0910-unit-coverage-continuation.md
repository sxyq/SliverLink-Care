# 2026-05-26 单元测试继续推进记录

## 本轮范围

- 继续补剩余单元测试，不修改业务实现。
- 本轮重点覆盖：
  - `02-志愿者填写端/src/pages` 下未覆盖的志愿者工作台页面
  - `04-统一后端` 中一批控制器方法

## 新增测试文件

### 志愿者/家属端

- `02-志愿者填写端/src/pages/volunteerAuthAndListPages.test.tsx`
- `02-志愿者填写端/src/pages/volunteerCarePages.test.tsx`

### 统一后端

- `04-统一后端/src/test/java/com/silverlink/care/module/admin/AdminControllerTest.java`
- `04-统一后端/src/test/java/com/silverlink/care/module/family/FamilyControllerTest.java`
- `04-统一后端/src/test/java/com/silverlink/care/module/invitation/InvitationControllerTest.java`
- `04-统一后端/src/test/java/com/silverlink/care/module/qrcode/QrCodeControllerTest.java`
- `04-统一后端/src/test/java/com/silverlink/care/module/scan/ScanControllerTest.java`
- `04-统一后端/src/test/java/com/silverlink/care/module/volunteer/VolunteerControllerTest.java`
- `04-统一后端/src/test/resources/mockito-extensions/org.mockito.plugins.MockMaker`

### 管理后台端

- `03-管理后台端/src/pages/smsRelayAndSimplePages.test.tsx`
- `03-管理后台端/src/pages/careManagePages.test.tsx`
- `03-管理后台端/src/pages/rbacPage.test.tsx`

## 本轮执行

### 志愿者端定向页测试

命令：

```bash
cd "02-志愿者填写端" && npm run test -- --run src/pages/volunteerAuthAndListPages.test.tsx src/pages/volunteerCarePages.test.tsx
```

结果：

- `2` 个测试文件通过
- `10` 个测试通过

### 后端定向控制器测试

命令：

```bash
cd "04-统一后端" && ./mvnw test -Dtest=AdminControllerTest,FamilyControllerTest,InvitationControllerTest,VolunteerControllerTest
```

结果：

- 通过
- `7` 个测试通过

### 后端扫码/二维码控制器定向测试

命令：

```bash
cd "04-统一后端" && ./mvnw test -Dtest=QrCodeControllerTest,ScanControllerTest
```

结果：

- 通过
- `3` 个测试通过

### 管理后台短信中转与轻页面测试

命令：

```bash
cd "03-管理后台端" && npm run test -- --run src/pages/smsRelayAndSimplePages.test.tsx
```

结果：

- `1` 个测试文件通过
- `5` 个测试通过

### 管理后台照护页面测试

命令：

```bash
cd "03-管理后台端" && npm run test -- --run src/pages/careManagePages.test.tsx
```

结果：

- `1` 个测试文件通过
- `4` 个测试通过

### 管理后台 RBAC 页面测试

命令：

```bash
cd "03-管理后台端" && npm run test -- --run src/pages/rbacPage.test.tsx
```

结果：

- `1` 个测试文件通过
- `2` 个测试通过

### 志愿者端覆盖率刷新

命令：

```bash
cd "02-志愿者填写端" && npm run test:coverage
```

结果：

- 单测全部通过：`17` 个测试文件，`60` 个测试通过
- 100% 门禁仍按预期失败，但覆盖率产物已刷新

### 后端完整测试与 JaCoCo 刷新

命令：

```bash
cd "04-统一后端" && ./mvnw test jacoco:report
```

结果：

- `224` 个测试通过
- `BUILD SUCCESS`
- JaCoCo 报告已刷新

### 管理后台覆盖率刷新

命令：

```bash
cd "03-管理后台端" && npm run test:coverage
```

结果：

- 单测全部通过：`16` 个测试文件，`61` 个测试通过
- 100% 门禁仍按预期失败，但覆盖率产物已刷新

### Android JVM 单测补跑

命令：

```bash
cd "05-安卓短信中转端" && bash ./gradlew testDebugUnitTest
```

结果：

- 通过
- `BUILD SUCCESS`

补充说明：

- 统一单测脚本在当前沙箱中第一次执行 Android 步骤时，因为无法写入 `~/.gradle/...zip.lck` 返回了非 0。
- 在允许访问 Gradle 本地缓存目录后，Android JVM 单测已单独补跑成功。

## 覆盖率变化

刷新后：

- `volunteer-client`：
  - 函数覆盖率 `81.31% (348/428)`
  - 语句覆盖率 `80.19% (1008/1257)`

- `backend`：
  - 方法覆盖率 `66.09% (573/867)`
  - 指令覆盖率 `28.83% (5044/17497)`

- `admin-console`：
  - 函数覆盖率 `52.15% (400/767)`
  - 语句覆盖率 `47.65% (1014/2128)`

## 相比上一轮

- 志愿者/家属端函数覆盖率：
  - `27.80% -> 81.31%`

- 志愿者/家属端语句覆盖率：
  - `25.14% -> 80.19%`

- 后端方法覆盖率：
  - `55.71% -> 66.09%`

- 后端指令覆盖率：
  - `16.93% -> 28.83%`

- 管理后台函数覆盖率：
  - `35.98% -> 52.15%`

- 管理后台语句覆盖率：
  - `33.04% -> 47.65%`

## 本轮说明

- 后端新增控制器测试最初受 Mockito inline mock maker 在 Java 24 下无法自附加 agent 影响。
- 通过新增测试资源文件 `mockito-extensions/org.mockito.plugins.MockMaker` 切换为 `mock-maker-subclass` 后，控制器测试可稳定执行。
- 后端 JaCoCo 在 Java 24 下仍会输出 `Unsupported class file major version 68` 相关 instrumentation 警告，但 Maven 最终 `BUILD SUCCESS`，报告正常生成。

## 当前剩余高优先级缺口

- 管理后台大页面：
  - `AuditLogPage.tsx`
  - `QrCodeManagePage.tsx`
  - `VolunteerManagePage.tsx`
  - `InvitationManagePage.tsx`
  - `RbacPage.tsx`

- 志愿者/家属端剩余低覆盖文件：
  - `ContactManagePage.tsx`
  - `ElderBasicManagePage.tsx`
  - `family-entry/App.tsx`
  - `family-entry/routes/router.tsx`

- 后端剩余高体量模块：
  - `ScanController` / `ScanService`
  - `QrCodeController` / `QrCodeService`
  - `NameplateController` / `NameplateService`
  - `RbacService`
  - `FamilyService`
  - `InvitationService`
