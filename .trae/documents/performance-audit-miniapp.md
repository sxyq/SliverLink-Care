# 小程序性能优化审查计划

## 审查结论

经过全面代码审查，小程序存在 **8 大类性能问题**，按严重程度排序如下：

---

## P0 - 严重问题（立即修复）

### 1. 部分组件仍无 memo 保护，导致无效重渲染

**问题描述**：
- 以下组件仍未使用 `React.memo`：
  - `ArchiveCarousel` — 轮播组件，每次父组件状态变化都会重渲染
  - `SearchPanel` — 搜索面板，输入时频繁重渲染
  - `ScaleTabBar` — 量表切换栏
  - `FormSectionCard` — 表单卡片容器
  - `SectionCard` — 通用卡片容器
  - `PageContainer` — 页面容器
  - `LoadingState` / `EmptyState` / `PermissionGuard` — 反馈组件
- 以下页面组件未使用 `React.memo`，内部回调函数未使用 `useCallback`：
  - `elder-list` 页面：10+ 个状态变量，任何变化触发全页重渲染
  - `elder-detail` 页面：`actionItems` 每次渲染都重新创建
  - `basic` / `medication` / `scale` / `qrcode` 页面：表单状态变化触发大量重渲染

**影响**：
- 老人列表页状态变化时，整个页面及所有子组件重新渲染
- 档案轮播滑动时触发不必要的重渲染
- 表单输入时整页重渲染，低端设备卡顿

**优化方向**：
- 为所有纯展示组件添加 `React.memo`
- 为页面内稳定的回调函数添加 `useCallback`
- 为计算属性添加 `useMemo`

**涉及文件**：
- `src/components/workbench/ArchiveCarousel.tsx`
- `src/components/workbench/SearchPanel.tsx`
- `src/components/workbench/ScaleTabBar.tsx`
- `src/components/workbench/FormSectionCard.tsx`
- `src/components/layout/SectionCard.tsx`
- `src/components/layout/PageContainer.tsx`
- `src/components/feedback/LoadingState.tsx`
- `src/components/feedback/EmptyState.tsx`
- `src/components/feedback/PermissionGuard.tsx`
- `src/subpackages/workbench/elder-list/index.tsx`
- `src/subpackages/workbench/elder-detail/index.tsx`
- `src/subpackages/workbench/basic/index.tsx`
- `src/subpackages/workbench/medication/index.tsx`
- `src/subpackages/workbench/scale/index.tsx`
- `src/subpackages/workbench/qrcode/index.tsx`

### 2. 存储系统无过期清理机制

**问题描述**：
- `storage.ts` 只有基础的 get/set/remove，无过期时间、无容量限制、无清理机制
- `authStore.ts` 存储了完整的用户会话信息，但无自动过期（`loggedInAt` 仅记录，未用于过期判断）
- `currentElderStore.ts` 存储了老人信息，切换老人时旧数据不会自动清理
- `appSessionStore.ts` 存储了应用状态，长期累积可能导致存储溢出
- `app.lifecycle.ts` 的 `launchContext` 无过期机制

**影响**：
- 小程序本地存储上限 10MB，长期不清理可能溢出
- 旧数据残留可能导致状态混乱
- 用户退出登录后，部分数据未清理（如 `currentElderSummary`、`appSession`）

**优化方向**：
- 为 `storage.ts` 添加过期时间支持（`setStorageValue(key, value, ttl)`）
- 添加启动时自动清理过期数据的机制
- 用户退出时清理所有相关数据（`clearAuthSession` 已清理 token，但未清理 `currentElderSummary` 和 `appSession`）

**涉及文件**：
- `src/utils/storage.ts`
- `src/store/auth/authStore.ts`
- `src/store/elder/currentElderStore.ts`
- `src/store/app/appSessionStore.ts`
- `src/app/app.lifecycle.ts`

---

## P1 - 中等问题（建议修复）

### 3. 网络请求无缓存策略

**问题描述**：
- `httpClient.ts` 已实现请求队列、重试、去重，但无响应缓存
- 老人列表页每次进入都重新请求 `/api/volunteer/me/elders`
- 老人详情页每次切换都重新请求详情
- 用药列表、量表列表等数据也无缓存
- `qrcode` 页面每次进入都重新生成二维码图片

**影响**：
- 重复请求浪费带宽和服务器资源
- 用户反复进入同一页面时体验差（每次都要加载）
- 弱网环境下频繁失败

**优化方向**：
- 为 GET 请求添加内存缓存（5-10 分钟 TTL）
- 为老人列表、详情等不常变数据添加本地存储缓存
- 提供手动刷新机制（如下拉刷新）
- 二维码图片可缓存 base64，避免重复生成

**涉及文件**：
- `src/services/api/httpClient.ts`
- `src/services/workbench/elderService.ts`
- `src/services/workbench/medicationService.ts`
- `src/services/workbench/scaleService.ts`
- `src/services/workbench/qrcodeService.ts`

### 4. 构建配置缺少优化

**问题描述**：
- `config/index.ts` 中 `manualChunks` 返回 `undefined`，未进行代码分割
- `prod.ts` 仅配置了环境变量，无代码压缩、Tree Shaking 配置
- 依赖 `qrcode` 库（1.5.4）体积较大（~80KB），仅在二维码页面使用，但被打入主包
- `app.scss` 为全局样式，所有页面的样式都在一个文件中，无法按需加载
- 无构建分析工具（如 `rollup-plugin-visualizer`）

**影响**：
- 主包体积过大，影响启动速度
- 未使用的代码被打包进主包
- 二维码库在所有页面都被加载
- 全局样式文件体积大，解析耗时

**优化方向**：
- 配置代码分割（按页面/分包拆分 chunks）
- 启用 Tree Shaking（确保 `sideEffects` 配置正确）
- 将 `qrcode` 库改为动态导入（`import()`）
- 添加构建分析工具，监控包体积
- 考虑将 `app.scss` 按页面拆分为独立样式文件

**涉及文件**：
- `config/index.ts`
- `config/prod.ts`
- `package.json`
- `src/app.scss`

---

## P2 - 低优先级（保持观察）

### 5. 列表渲染缺少虚拟滚动

**问题描述**：
- 老人列表使用 `Swiper` 组件，数据量大时可能卡顿
- 用药列表、量表列表等使用普通渲染，无虚拟滚动
- 档案卡片内部有复杂的 2x2 网格布局

**影响**：
- 数据量超过 20 条时可能出现滚动卡顿
- 低端设备上体验差

**优化方向**：
- 为长列表添加虚拟滚动（如使用 `react-window` 小程序适配版）
- 或使用分页加载替代一次性渲染

**涉及文件**：
- `src/components/workbench/ArchiveCarousel.tsx`
- `src/subpackages/workbench/medication/index.tsx`
- `src/subpackages/workbench/scale/index.tsx`

### 6. 图片资源未优化

**问题描述**：
- 项目中无图片资源检查
- 未使用 WebP 格式
- 无图片懒加载
- 二维码页面使用 `Image` 组件，但未配置 `lazyLoad`

**影响**：
- 图片加载慢，占用带宽
- 首屏加载时间延长

**优化方向**：
- 使用 WebP 格式
- 为 `Image` 组件添加 `lazyLoad` 属性
- 压缩图片资源

**涉及文件**：
- `src/subpackages/workbench/qrcode/index.tsx`

### 7. 启动性能可优化

**问题描述**：
- `app-entry.tsx` 在 `useLaunch` 中同步执行 `persistLaunchContext`，阻塞启动
- `app.scss` 中使用了大量 CSS 渐变和 `backdrop-filter`，渲染耗时
- `WorkbenchHeader` 在每次渲染时调用 `Taro.getSystemInfoSync()` 和 `Taro.getMenuButtonBoundingClientRect()`，虽然已用 `useMemo` 缓存，但首次渲染仍有同步调用开销

**影响**：
- 小程序启动时间延长
- 首屏渲染延迟

**优化方向**：
- 将 `persistLaunchContext` 改为异步执行
- 减少 `app.scss` 中的复杂样式（如 `backdrop-filter`）
- 将 `buildHeaderStyle` 的系统信息获取移至 `useEffect` 中异步执行

**涉及文件**：
- `src/app/app-entry.tsx`
- `src/app.scss`
- `src/components/workbench/WorkbenchHeader.tsx`

### 8. 内存泄漏风险

**问题描述**：
- 多个页面使用 `cancelled` 标志位防止状态更新，但未清理异步操作本身（如未取消正在进行的请求）
- `useEffect` 返回的清理函数仅设置 `cancelled = true`，未取消 `Taro.request`
- `qrcode` 页面的 `renderPreview` useEffect 中，如果组件快速卸载，可能仍在执行 `QRCode.toDataURL`

**影响**：
- 快速切换页面时，旧的请求仍在执行，浪费资源
- 组件卸载后状态更新可能导致警告

**优化方向**：
- 使用 `AbortController` 取消正在进行的请求
- 为 `QRCode.toDataURL` 等异步操作添加取消机制
- 确保所有 `useEffect` 的清理函数能真正取消异步操作

**涉及文件**：
- `src/subpackages/workbench/elder-list/index.tsx`
- `src/subpackages/workbench/elder-detail/index.tsx`
- `src/subpackages/workbench/basic/index.tsx`
- `src/subpackages/workbench/medication/index.tsx`
- `src/subpackages/workbench/scale/index.tsx`
- `src/subpackages/workbench/qrcode/index.tsx`

---

## 已完成的优化（无需处理）

| 优化项 | 状态 | 说明 |
|---|---|---|
| 请求队列控制并发 | ✅ 已完成 | `requestQueue.ts` 限制最多 5 个并发 |
| 请求重试机制 | ✅ 已完成 | 自动重试 2 次，仅对网络错误重试 |
| 请求去重 | ✅ 已完成 | `throttleDebounce.ts` 的 `createDeduplicationRequest` |
| 搜索防抖 | ✅ 已完成 | `elder-list` 页面搜索使用 300ms 防抖 |
| 分包加载 | ✅ 已配置 | `app.config.ts` 已配置 `subpackages` |
| 懒代码加载 | ✅ 已配置 | `lazyCodeLoading: 'requiredComponents'` |
| React.memo（部分组件） | ✅ 已完成 | `SummaryHero`、`ActionTileGrid`、`BottomNavGrid`、`WorkbenchShell`、`WorkbenchHeader` 已添加 memo |
| useCallback（部分回调） | ✅ 已完成 | `BottomNavGrid` 的 `handleOpen` 已使用 `useCallback` |

---

## 修复优先级建议

### 第一轮（立即执行）
1. 为剩余组件添加 `React.memo` + `useCallback` + `useMemo`
2. 为 storage 添加过期清理机制

### 第二轮（本周内）
3. 为 GET 请求添加缓存策略
4. 优化构建配置（代码分割、Tree Shaking、动态导入 qrcode）

### 第三轮（后续迭代）
5. 长列表虚拟滚动
6. 图片资源优化
7. 启动性能优化
8. 内存泄漏修复
