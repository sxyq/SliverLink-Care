# 2026-05-26 11:02 管理后台单元测试继续推进记录（二）

## 本轮目标

继续推进管理后台高体量页面的单元测试覆盖，不改业务代码，只补测试与记录。

## 本轮新增测试文件

- `03-管理后台端/src/pages/qrAndArchivePages.test.tsx`
- `03-管理后台端/src/pages/analyticsPage.test.tsx`

## 本轮覆盖到的页面与能力

### `QrCodeManagePage`

- 二维码预览生成
- 导出二维码列表
- 复制扫码链接
- 打开扫码页面
- 保存短信中转设备绑定
- 停用二维码
- 重新生成二维码

### `ElderArchivePage`

- 档案导出
- 跳转用药管理
- 跳转量表管理
- 新建老人表单必填校验
- 自定义 ABO / Rh 录入
- 新建老人提交
- 启用 / 停用状态切换
- 删除老人

### `AnalyticsPage`

- 统计指标渲染
- 分布模块渲染
- 最近量表记录展示
- 加载失败提示

## 本轮执行命令与结果

### 1. 定向运行二维码与档案页测试

```bash
cd "03-管理后台端" && npm run test -- --run src/pages/qrAndArchivePages.test.tsx
```

结果：

- `1` 个测试文件通过
- `2` 个测试通过

### 2. 定向运行统计页测试

```bash
cd "03-管理后台端" && npm run test -- --run src/pages/analyticsPage.test.tsx
```

结果：

- `1` 个测试文件通过
- `2` 个测试通过

### 3. 运行后台覆盖率

```bash
cd "03-管理后台端" && npm run test:coverage
```

结果：

- `19` 个测试文件通过
- `68` 个测试通过
- 覆盖率产物已生成
- 全局 `100%` 门禁继续按预期失败，此失败用于保留未达标证据，不代表断言失败

本轮后台覆盖率输出：

- `Statements`: `80.73%` (`1718/2128`)
- `Branches`: `71.30%` (`1553/2178`)
- `Functions`: `85.01%` (`652/767`)
- `Lines`: `83.61%` (`1521/1819`)

### 4. 刷新统一覆盖率汇总

```bash
python3 "06-测试与质量保障/scripts/common/collect_coverage_summary.py"
```

结果：

- `coverage-summary.json` 已更新
- `coverage-summary.md` 已更新

## 当前最新统一单元测试覆盖率

来源：`06-测试与质量保障/reports/unit/current/coverage-summary.md`

- 扫码端：`71.84%`
- 志愿者/家属端：`81.31%`
- 管理后台：`85.01%`
- 后端：`66.09%`
- Android：`pending XML aggregation`

## 本轮提升

- 管理后台函数覆盖率：`71.19% -> 85.01%`
- 管理后台语句覆盖率：`67.39% -> 80.73%`

## 说明

- 本轮未修改任何业务实现文件。
- 本轮仅新增测试文件并刷新测试报告。
- 后续继续提升时，管理后台剩余大头会集中在组件层和个别复杂页面的分支覆盖。
