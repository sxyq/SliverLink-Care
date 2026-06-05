# 修复小程序 UI 布局与 H5 对齐的计划

## 问题诊断

### 核心问题：布局修改未生效

用户反馈"之前的修改没有生效"，截图显示：
1. 左侧文字完全靠边（没有内边距）
2. 顶部按钮与微信胶囊按钮重叠
3. 整体布局没有下移

### 根因分析

**问题 1：rpx 单位换算基准不一致**
- H5 使用 `px` 单位，设计基准宽度约 430px
- 小程序使用 `rpx` 单位，基准宽度 750rpx（即 375px 物理宽度）
- 之前的修改将 H5 的 px 值直接 ×2 转为 rpx（如 18px → 36rpx），但实际换算应为：`px × (750/430) ≈ px × 1.74`
- 导致所有尺寸偏大 15% 左右，在小程序窄屏上造成拥挤

**问题 2：小程序全屏模式（@media max-width: 640px）与正常模式的样式冲突**
- 小程序在真机上运行时，`sl-app-shell` 的 max-width: 412px 会被触发
- 但 `@media (max-width: 640px)` 同时也会被触发（因为 412px < 640px）
- 导致两套样式叠加，产生冲突

**问题 3：顶部 Header 与微信胶囊按钮重叠**
- `.sl-page-header-bar` 使用 `grid-template-columns: var(--sl-nav-side-width, 92px)`
- 但 `--sl-nav-side-width` 由 JS 动态计算（胶囊按钮宽度 + 10px）
- 当胶囊按钮较宽时（约 100px+），右侧按钮区域与胶囊重叠
- 同时 `.sl-page-header-bar` 的左右 padding 为 24rpx，但 margin 为 -24rpx，导致 header 宽度超出内容区

**问题 4：整体布局未下移**
- `.sl-page` 使用 `align-content: start`，所有内容从顶部开始排列
- `.sl-phone-content` 的 gap 为 32rpx，但 `.sl-page` 的 gap 为 28rpx
- H5 的 `.sl-phone-content` gap 为 16px，`.sl-page` gap 为 16px
- 小程序的 gap 值过大，导致内容分布不均匀，视觉上"重心过高"

### H5 vs 小程序关键差异对比

| 属性 | H5 (px) | 小程序当前 (rpx) | 小程序应修正 (rpx) |
|---|---|---|---|
| `.sl-stage` padding-top | max(18px, env(safe-area-inset-top)) | calc(env(...) + 18rpx) | 保持 |
| `.sl-stage` padding-x | 18px | 14rpx | 18rpx |
| `.sl-stage` padding-bottom | 28px | 28rpx | 保持 |
| `.sl-phone-shell` border-radius | 34px | 68rpx | 保持（2x 换算正确）|
| `.sl-phone-shell` min-height | clamp(700px, 84vh, 800px) | calc(100vh - 64rpx) | 需要调整 |
| `.sl-phone-content` gap | 16px | 32rpx | 28rpx |
| `.sl-phone-content` padding-x | 14px | 24rpx | 14rpx |
| `.sl-phone-content` padding-bottom | 24px | 48rpx | 24rpx |
| `.sl-page` gap | 16px | 28rpx | 16rpx |
| `.sl-page-header-bar` grid | 40px / 1fr / max-content | 92px / 1fr / 92px | 需要调整 |
| `.sl-page-header-bar` padding-x | 18px | 24rpx | 18rpx |
| `.sl-page-header-bar` margin | 0 -14px 4px | 0 -24rpx 8rpx | 0 -14rpx 4rpx |
| `.sl-card` padding | 18px 16px | 36rpx 32rpx | 32rpx 28rpx |
| `.sl-card` border-radius | 24px | 48rpx | 48rpx |

## 修复方案

### Phase 1: 修复公共层布局（app.scss）

1. **`.sl-stage` padding-x**：14rpx → 18rpx（对齐 H5 的 18px）
2. **`.sl-phone-content` gap**：32rpx → 28rpx（更接近 H5 的 16px）
3. **`.sl-phone-content` padding-x**：24rpx → 14rpx（对齐 H5 的 14px）
4. **`.sl-phone-content` padding-bottom**：48rpx → 24rpx（对齐 H5 的 24px）
5. **`.sl-page` gap**：28rpx → 16rpx（对齐 H5 的 16px）
6. **`.sl-page-header-bar` grid**：改为 `64rpx 1fr max-content`（右侧自适应）
7. **`.sl-page-header-bar` padding-x**：24rpx → 18rpx
8. **`.sl-page-header-bar` margin**：0 -24rpx 8rpx → 0 -14rpx 4rpx
9. **`.sl-page-header-icon` 尺寸**：64rpx → 56rpx
10. **`.sl-card` padding**：36rpx 32rpx → 32rpx 28rpx

### Phase 2: 修复 @media (max-width: 640px) 样式

1. **`.sl-phone-content` padding**：0 24rpx 60rpx → 0 14rpx 30rpx
2. **`.sl-page-header-bar` margin**：-24rpx → -14rpx
3. **移除 `.sl-stage` padding: 0**：改为保持 18rpx 14rpx 28rpx（或根据安全区域调整）

### Phase 3: 修复各页面样式

1. **老人列表页 (elder-list/index.scss)**：
   - `.workbench-elder-list-page` gap: 28rpx → 16rpx
   - `.workbench-elder-list` gap: 16rpx → 12rpx

2. **老人详情页 (elder-detail/index.scss)**：
   - 检查并调整 gap 值

3. **基本信息页 (basic/index.scss)**：
   - 检查并调整 gap 值

4. **二维码页 (qrcode/index.scss)**：
   - 检查并调整 gap 值

### Phase 4: 修复顶部 Header 与胶囊按钮重叠

1. **WorkbenchHeader.tsx**：
   - 调整 `--sl-nav-side-width` 的计算逻辑
   - 确保右侧按钮区域不与胶囊按钮重叠

2. **app.scss**：
   - `.sl-page-header-bar` 右侧使用 `max-content` 而非固定宽度
   - 右侧按钮使用 `justify-self: end` 对齐

## 验证步骤

1. 运行 `npm run typecheck` 检查类型错误
2. 运行 `npm run build:weapp` 检查构建是否通过
3. 在小程序开发者工具中预览，检查：
   - 左侧文字是否有合理内边距
   - 顶部按钮是否与胶囊按钮重叠
   - 整体布局是否下移
   - 各页面视觉节奏是否统一
