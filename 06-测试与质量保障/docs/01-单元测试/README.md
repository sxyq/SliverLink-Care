# 单元测试规划

## 1. 单元测试粒度

单元测试必须细到函数级。每个函数都需要在矩阵里有一条记录，哪怕最终不是直接调用该函数，也要说明覆盖方式。

函数分三类：

- `纯函数`: 直接输入输出断言，例如格式化、脱敏、解析、签名、状态映射。
- `副作用函数`: mock 外部依赖后断言调用、状态写入、异常分支，例如 API client、localStorage、jdbc、短信发送。
- `组件内部函数`: 不直接导出时通过用户行为覆盖，例如点击、输入、筛选、弹窗、导航。

## 2. 覆盖规则

| 函数类型 | 覆盖方式 |
| --- | --- |
| exported function | 直接 import 测试 |
| async API function | mock `fetch/http/jdbc` 后验证请求参数、返回映射、错误分支 |
| React component function | 通过 Testing Library 的用户行为和 DOM 结果覆盖 |
| Java service public method | Mockito/JdbcTemplate mock 或 Spring slice test |
| Java private method | 通过 public method 的分支覆盖，不反射测试；若复杂度过高则建议提取为 package-private helper |
| Kotlin object function | JVM test 直接调用 |
| Android framework function | Robolectric 或 instrumentation；短期通过封装层单测覆盖 |
| DTO getter/setter | 不逐个写无意义测试，用 JSON 序列化/反序列化契约测试覆盖 |

## 3. 优先级

- `P0`: 安全、隐私、验证、鉴权、签名、防串档、数据写入。
- `P1`: 表单校验、状态映射、列表筛选、导出、二维码操作。
- `P2`: 展示格式、组件布局状态、普通 DTO 契约。

## 4. 推荐工具

| 端 | 推荐工具 |
| --- | --- |
| 前端 | Vitest、Testing Library、MSW、happy-dom 或 jsdom |
| 后端 | JUnit 5、Mockito、Spring Boot Test、MockMvc |
| 安卓 JVM | JUnit 4、MockWebServer、Robolectric |
| 安卓仪器 | AndroidX Test、Espresso |

## 5. 详细矩阵

函数级矩阵见：

- `01-函数级单元测试矩阵.md`

后续新增函数时必须同步更新该矩阵。
