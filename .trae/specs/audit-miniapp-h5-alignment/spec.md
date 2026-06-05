# 小程序界面与 H5 对齐审核 + 管理后端接入审核 Spec

## Why

`08-微信小程序端` 已进行多轮布局修复，但缺乏系统性的审核机制来确保：
1. 所有页面与 `02-志愿者填写端` H5 界面在结构、比例、间距、字体上严格 1:1 对齐
2. 小程序是否正确接入了 `03-管理后台端` / `04-统一后端` 的 API 能力
3. 已修复的问题不会在新页面中重复出现

## What Changes

- 建立系统化的 H5-vs-小程序界面审核清单
- 建立管理后端 API 接入审核清单
- 逐页输出差异报告，标记已修复/待修复/残差项
- 对未对齐的页面制定修复任务

## Impact

- Affected specs: 小程序工作台全部页面、扫码端页面、登录页
- Affected code: `08-微信小程序端/src/` 全部页面、组件、样式
- Baseline: `02-志愿者填写端/src/` 源码、`03-管理后台端/` API 文档

## ADDED Requirements

### Requirement: H5 界面 1:1 对齐审核

The system SHALL 对小程序每个页面与 H5 对应页面进行逐项对比审核。

#### Scenario: 老人列表页审核
- **WHEN** 审核 `elder-list` 页面
- **THEN** 必须对比 H5 `SubjectListPage.tsx` + `form.css`
- **AND** 检查项包括：搜索框、档案卡片、轮播、新增卡片、footer、账号面板

#### Scenario: 老人详情页审核
- **WHEN** 审核 `elder-detail` 页面
- **THEN** 必须对比 H5 `SubjectDetailPage.tsx` + `form.css`
- **AND** 检查项包括：header、summary hero (2x2)、action grid (2x2)、编辑按钮、箭头按钮

#### Scenario: 基本信息页审核
- **WHEN** 审核 `basic` 页面
- **THEN** 必须对比 H5 `BasicInfoFormPage.tsx` + `FormSection.tsx` + `form.css`
- **AND** 检查项包括：表单网格、输入框尺寸、性别选择器、保存按钮、底部导航

#### Scenario: 二维码页审核
- **WHEN** 审核 `qrcode` 页面
- **THEN** 必须对比 H5 `QrCodeManagePage.tsx` + `form.css`
- **AND** 检查项包括：预览卡、状态标签、操作卡

#### Scenario: 登录页审核
- **WHEN** 审核 `login` 页面
- **THEN** 必须对比 H5 `LoginPage.tsx` + `form.css`
- **AND** 检查项包括：输入框布局、标签位置、按钮样式

### Requirement: 管理后端 API 接入审核

The system SHALL 审核小程序是否正确调用了管理后端提供的全部 API。

#### Scenario: 工作台 API 审核
- **WHEN** 审核 `services/workbench/` 目录
- **THEN** 检查是否覆盖了：老人列表、老人详情、基本信息、用药、量表、二维码、账号管理
- **AND** 对比 `04-统一后端` 的 Controller 接口确认无遗漏

#### Scenario: 扫码端 API 审核
- **WHEN** 审核 `services/scan/` 目录
- **THEN** 检查是否覆盖了：档案查看、用药、量表、名牌、短信验证
- **AND** 确认扫码入口与后端 API 的映射完整

#### Scenario: 认证与权限审核
- **WHEN** 审核 `store/auth/` 和 `services/workbench/authService.ts`
- **THEN** 检查登录、注册、token 刷新、角色切换、登出流程
- **AND** 确认与 `03-管理后台端` 的 RBAC 模型对齐

## MODIFIED Requirements

### Requirement: 公共层样式审核
- `app.scss` 中的全局 token、布局机制、网格规则必须与 H5 `form.css` 逐项对齐
- 特别关注：`sl-stage`、`sl-phone-shell`、`sl-phone-content`、`sl-page` 的纵向分布

## REMOVED Requirements

无
