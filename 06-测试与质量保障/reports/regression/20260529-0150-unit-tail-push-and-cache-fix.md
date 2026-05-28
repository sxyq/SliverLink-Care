# 2026-05-29 单元测试尾部推进与缓存边界修复

## 本轮新增/调整测试

- 管理后台：
  - `03-管理后台端/src/pages/qrEdgeCases.test.tsx`
- 后端：
  - `04-统一后端/src/test/java/com/silverlink/care/module/smsrelay/SmsRelayServiceTest.java`
  - `04-统一后端/src/test/java/com/silverlink/care/infrastructure/cache/SimpleTtlCacheTest.java`
  - `04-统一后端/src/test/java/com/silverlink/care/infrastructure/cache/JsonTwoLevelCacheTest.java`
  - `04-统一后端/src/test/java/com/silverlink/care/config/PerformanceConfigTest.java`

## 本轮修复的真实问题

1. `SimpleTtlCache` 在 `put(null, ...)` 和 `get(null)` 时会触发 `ConcurrentHashMap` 的空 key NPE  
   - 修复文件：
     - `04-统一后端/src/main/java/com/silverlink/care/infrastructure/cache/SimpleTtlCache.java`

2. 管理后台二维码边界测试与当前实现不一致  
   - 重新按真实 UI 行为校准：
     - 缺链接提示存在两个节点
     - `regenerate` 返回空链接时页面展示的是 action message
     - 第二次渲染需要重新补 mock 数据

3. `SmsRelayServiceTest` 的 direct SMS 分支与当前实现不一致  
   - 改为使用真实创建出的 `sessionId`
   - 同时补齐 `FakeJdbcTemplate` 对 `VERIFIED/EXPIRED` 更新 SQL 的模拟

## 本机执行

- 管理后台定向：
  - `npm test -- --run src/pages/qrEdgeCases.test.tsx`
- 后端定向：
  - `./mvnw -Dtest=SimpleTtlCacheTest,JsonTwoLevelCacheTest,PerformanceConfigTest,SmsRelayServiceTest test`
- 全量单测：
  - `bash 06-测试与质量保障/scripts/unit/run_unit_suite.sh`
- 覆盖率刷新：
  - `python3 06-测试与质量保障/scripts/common/collect_coverage_summary.py`

## 结果

- 扫码端：`23` 个文件，`215` 个测试通过
- 志愿者端：`19` 个文件，`140` 个测试通过
- 管理后台：`23` 个文件，`157` 个测试通过
- 后端：`621` 个测试通过，`0` 失败，`2` 跳过
- Android：`testDebugUnitTest` 通过

## 最新覆盖率

- scan-client：`97.79%` functions，`98.11%` statements
- volunteer-client：`93.02%` functions，`92.98%` statements
- admin-console：`93.10%` functions，`89.07%` statements
- backend：`94.15%` methods，`90.56%` instructions
- android-relay：`pending XML aggregation`

## 备注

- 后端日志中的 `JaCoCo + Java 24` 插桩告警仍存在，但本轮不影响测试通过。
- 当前所有现有单测套件已重新跑通，但覆盖率仍未达到 `100%`，Android XML 聚合也还未闭环。
