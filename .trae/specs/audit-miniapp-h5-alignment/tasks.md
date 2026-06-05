# Tasks

## Phase 1: H5 界面 1:1 对齐审核

- [ ] Task 1: 公共层样式审核
  - [ ] SubTask 1.1: 读取 H5 `form.css` 全部样式，建立样式基线表
  - [ ] SubTask 1.2: 读取小程序 `app.scss` 全部样式，建立当前状态表
  - [ ] SubTask 1.3: 对比 token、布局层（sl-stage/sl-phone-shell/sl-phone-content/sl-page）、网格规则、组件基类
  - [ ] SubTask 1.4: 输出差异报告，标记已修复/待修复/残差

- [ ] Task 2: 老人列表页审核
  - [ ] SubTask 2.1: 读取 H5 `SubjectListPage.tsx` + `form.css` 相关样式
  - [ ] SubTask 2.2: 读取小程序 `elder-list/index.tsx` + `index.scss` + `ArchiveCarousel.tsx` + `SearchPanel.tsx`
  - [ ] SubTask 2.3: 逐项对比：搜索框、档案卡片、轮播、新增卡片、footer、账号面板
  - [ ] SubTask 2.4: 输出差异报告

- [ ] Task 3: 老人详情页审核
  - [ ] SubTask 3.1: 读取 H5 `SubjectDetailPage.tsx` + `form.css` 相关样式
  - [ ] SubTask 3.2: 读取小程序 `elder-detail/index.tsx` + `index.scss` + `SummaryHero.tsx` + `ActionTileGrid.tsx`
  - [ ] SubTask 3.3: 逐项对比：header、summary hero (2x2)、action grid (2x2)、编辑按钮、箭头按钮
  - [ ] SubTask 3.4: 输出差异报告

- [ ] Task 4: 基本信息页审核
  - [ ] SubTask 4.1: 读取 H5 `BasicInfoFormPage.tsx` + `FormSection.tsx` + `form.css`
  - [ ] SubTask 4.2: 读取小程序 `basic/index.tsx` + `index.scss` + `FormSectionCard.tsx`
  - [ ] SubTask 4.3: 逐项对比：表单网格、输入框尺寸、性别选择器、保存按钮、底部导航
  - [ ] SubTask 4.4: 输出差异报告

- [ ] Task 5: 二维码页审核
  - [ ] SubTask 5.1: 读取 H5 `QrCodeManagePage.tsx` + `form.css`
  - [ ] SubTask 5.2: 读取小程序 `qrcode/index.tsx` + `index.scss`
  - [ ] SubTask 5.3: 逐项对比：预览卡、状态标签、操作卡
  - [ ] SubTask 5.4: 输出差异报告

- [ ] Task 6: 登录页审核
  - [ ] SubTask 6.1: 读取 H5 `LoginPage.tsx` + `form.css`
  - [ ] SubTask 6.2: 读取小程序 `login.tsx` + `login.scss`
  - [ ] SubTask 6.3: 逐项对比：输入框布局、标签位置、按钮样式
  - [ ] SubTask 6.4: 输出差异报告

- [ ] Task 7: 用药页 + 量表页审核
  - [ ] SubTask 7.1: 读取 H5 `MedicationEditorPage.tsx` + `ScaleFormPage.tsx` + `form.css`
  - [ ] SubTask 7.2: 读取小程序 `medication/index.tsx` + `scale/index.tsx`
  - [ ] SubTask 7.3: 逐项对比
  - [ ] SubTask 7.4: 输出差异报告

## Phase 2: 管理后端 API 接入审核

- [ ] Task 8: 工作台 API 覆盖审核
  - [ ] SubTask 8.1: 读取 `04-统一后端` 全部 Controller 接口（elder、medication、scale、qrcode、auth）
  - [ ] SubTask 8.2: 读取小程序 `services/workbench/` 全部 service
  - [ ] SubTask 8.3: 建立 API 映射表，标记已接入/未接入/部分接入
  - [ ] SubTask 8.4: 输出缺失 API 报告

- [ ] Task 9: 扫码端 API 覆盖审核
  - [ ] SubTask 9.1: 读取 `04-统一后端` scan 模块接口
  - [ ] SubTask 9.2: 读取小程序 `services/scan/` 全部 service
  - [ ] SubTask 9.3: 建立 API 映射表
  - [ ] SubTask 9.4: 输出缺失 API 报告

- [ ] Task 10: 认证与权限审核
  - [ ] SubTask 10.1: 读取 `03-管理后台端` RBAC 模型和权限矩阵
  - [ ] SubTask 10.2: 读取小程序 `store/auth/` + `services/workbench/authService.ts`
  - [ ] SubTask 10.3: 检查登录、注册、token 刷新、角色切换、登出流程
  - [ ] SubTask 10.4: 输出权限对齐报告

## Phase 3: 修复实施

- [ ] Task 11: 根据审核报告修复未对齐的页面
  - [ ] SubTask 11.1: 修复公共层样式残差
  - [ ] SubTask 11.2: 修复各页面布局差异
  - [ ] SubTask 11.3: 修复 API 接入缺失

# Task Dependencies

- Task 2~7 依赖 Task 1（公共层样式基线建立）
- Task 11 依赖 Task 1~10（全部审核完成后才能开始修复）
- Task 8 和 Task 9 可并行
- Task 2~7 之间可并行
