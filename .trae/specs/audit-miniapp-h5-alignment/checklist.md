# Checklist

## Phase 1: H5 界面 1:1 对齐审核

- [ ] 公共层样式审核完成（Task 1）
  - [ ] H5 `form.css` 样式基线表已建立
  - [ ] 小程序 `app.scss` 当前状态表已建立
  - [ ] token、布局层、网格规则、组件基类对比完成
  - [ ] 差异报告已输出

- [ ] 老人列表页审核完成（Task 2）
  - [ ] H5 `SubjectListPage.tsx` + `form.css` 已读取
  - [ ] 小程序 `elder-list` 全部文件已读取
  - [ ] 搜索框、档案卡片、轮播、新增卡片、footer、账号面板逐项对比完成
  - [ ] 差异报告已输出

- [ ] 老人详情页审核完成（Task 3）
  - [ ] H5 `SubjectDetailPage.tsx` + `form.css` 已读取
  - [ ] 小程序 `elder-detail` 全部文件已读取
  - [ ] header、summary hero、action grid、编辑按钮、箭头按钮逐项对比完成
  - [ ] 差异报告已输出

- [ ] 基本信息页审核完成（Task 4）
  - [ ] H5 `BasicInfoFormPage.tsx` + `FormSection.tsx` + `form.css` 已读取
  - [ ] 小程序 `basic` 全部文件已读取
  - [ ] 表单网格、输入框、性别选择器、保存按钮、底部导航逐项对比完成
  - [ ] 差异报告已输出

- [ ] 二维码页审核完成（Task 5）
  - [ ] H5 `QrCodeManagePage.tsx` + `form.css` 已读取
  - [ ] 小程序 `qrcode` 全部文件已读取
  - [ ] 预览卡、状态标签、操作卡逐项对比完成
  - [ ] 差异报告已输出

- [ ] 登录页审核完成（Task 6）
  - [ ] H5 `LoginPage.tsx` + `form.css` 已读取
  - [ ] 小程序 `login` 全部文件已读取
  - [ ] 输入框布局、标签位置、按钮样式逐项对比完成
  - [ ] 差异报告已输出

- [ ] 用药页 + 量表页审核完成（Task 7）
  - [ ] H5 `MedicationEditorPage.tsx` + `ScaleFormPage.tsx` + `form.css` 已读取
  - [ ] 小程序 `medication` + `scale` 全部文件已读取
  - [ ] 逐项对比完成
  - [ ] 差异报告已输出

## Phase 2: 管理后端 API 接入审核

- [ ] 工作台 API 覆盖审核完成（Task 8）
  - [ ] `04-统一后端` Controller 接口已读取
  - [ ] 小程序 `services/workbench/` 已读取
  - [ ] API 映射表已建立
  - [ ] 缺失 API 报告已输出

- [ ] 扫码端 API 覆盖审核完成（Task 9）
  - [ ] `04-统一后端` scan 模块接口已读取
  - [ ] 小程序 `services/scan/` 已读取
  - [ ] API 映射表已建立
  - [ ] 缺失 API 报告已输出

- [ ] 认证与权限审核完成（Task 10）
  - [ ] `03-管理后台端` RBAC 模型已读取
  - [ ] 小程序 `store/auth/` + `authService.ts` 已读取
  - [ ] 登录、注册、token、角色切换、登出流程检查完成
  - [ ] 权限对齐报告已输出

## Phase 3: 修复实施

- [ ] 公共层样式残差已修复（Task 11.1）
- [ ] 各页面布局差异已修复（Task 11.2）
- [ ] API 接入缺失已修复（Task 11.3）
- [ ] `npm run typecheck` 通过
- [ ] `npm run build:weapp` 通过
