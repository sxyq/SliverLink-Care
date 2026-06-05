# 小程序性能优化审查计划（Plan）

> 审查范围：全面审查（渲染 + 网络 + 构建 + 启动）
> 产出要求：问题清单与优化方向 + 可执行步骤
> 约束：当前阶段不修改代码，仅输出计划

---

## 一、当前状态分析

### 1.1 已完成的优化（✅）

| 优化项 | 状态 | 关键文件 |
|---|---|---|
| 请求队列与并发控制 | ✅ | `src/utils/requestQueue.ts`（maxConcurrent=5） |
| 请求重试机制 | ✅ | `src/utils/requestQueue.ts`（maxRetries=2） |
| 请求去重 | ✅ | `src/utils/throttleDebounce.ts`（`globalDeduplication`） |
| 搜索防抖 | ✅ | `src/subpackages/workbench/elder-list/index.tsx`（300ms） |
| 分包加载 | ✅ | `src/app/app.config.ts`（subpackages: scan + workbench） |
| 懒代码加载 | ✅ | `src/app/app.config.ts`（`lazyCodeLoading: 'requiredComponents'`） |
| React.memo（14 个组件） | ✅ | `ArchiveCarousel`, `SearchPanel`, `ScaleTabBar`, `FormSectionCard`, `SectionCard`, `PageContainer`, `LoadingState`, `EmptyState`, `PermissionGuard`, `SummaryHero`, `ActionTileGrid`, `BottomNavGrid`, `WorkbenchShell`, `WorkbenchHeader` |
| useCallback / useMemo（5 个页面） | ✅ | `elder-list`, `elder-detail`, `basic`, `medication`, `scale` |
| 存储过期清理机制 | ✅ | `src/utils/storage.ts`（TTL + `cleanupExpiredStorage`） |
| 启动时自动清理 | ✅ | `src/app/app-entry.tsx`（`useLaunch` 中调用） |
| 退出登录全清理 | ✅ | `src/store/auth/authStore.ts`（`clearAuthSession` 清理 9 项） |
| GET 请求缓存接口 | ✅ | `src/services/api/requestTypes.ts`（新增 `cacheTtl?: number`） |

### 1.2 待完成的优化（⏳）

| 优化项 | 状态 | 优先级 |
|---|---|---|
| GET 请求缓存实现 | ⏳ | P1 |
| 构建配置优化（代码分割、Tree Shaking） | ⏳ | P1 |
| `qrcode` 库动态导入 | ⏳ | P1 |
| 列表虚拟滚动 | ⏳ | P2 |
| 图片资源优化 | ⏳ | P2 |
| 启动性能优化 | ⏳ | P2 |
| 内存泄漏修复 | ⏳ | P2 |

---

## 二、问题清单与优化方向

### P1 - 中等问题（建议本周内修复）

#### 问题 3：GET 请求无缓存策略

**现状**：
- `httpClient.ts` 已实现队列、重试、去重，但 `doRequest` 内无缓存逻辑
- `requestTypes.ts` 已新增 `cacheTtl?: number`，但 `httpClient.ts` 未消费该字段
- 老人列表、详情、用药、量表等页面每次进入都重新请求

**影响**：
- 重复请求浪费带宽和服务器资源
- 弱网环境下体验差

**优化方向**：
- 在 `httpClient.ts` 的 `request` 函数中，对 `method === 'GET' && options.cacheTtl > 0` 的请求，先检查本地存储缓存
- 缓存 key 设计：`api_cache_${path}_${stableHash(options.data)}`
- 使用 `storage.ts` 的 `setStorageValue(key, value, ttlMs)` 存储响应数据
- 缓存命中时直接返回，跳过网络请求
- 提供 `useQueue: false` 时绕过缓存的逃生通道

**涉及文件**：
- `src/services/api/httpClient.ts`
- `src/services/api/requestTypes.ts`（已完成接口扩展）

---

#### 问题 4：构建配置缺少优化

**现状**：
- `config/index.ts` 中 `manualChunks = () => undefined`，无代码分割
- `prod.ts` 仅配置环境变量，无压缩/Tree Shaking 调优
- `qrcode` 库（~80KB）被打入主包，仅在二维码页面使用
- `app.scss` 为全局样式，所有页面样式集中

**影响**：
- 主包体积过大，影响启动速度
- 未使用代码无法被剔除

**优化方向**：
- 配置 `manualChunks` 按分包拆分（`subpackages/scan`、`subpackages/workbench`）
- 确保 `package.json` 有 `"sideEffects": false` 以启用 Tree Shaking
- 将 `qrcode` 库改为动态导入：`const QRCode = await import('qrcode')`
- 添加构建分析工具（如 `rollup-plugin-visualizer`）监控包体积

**涉及文件**：
- `config/index.ts`
- `config/prod.ts`
- `package.json`
- `src/subpackages/workbench/qrcode/index.tsx`

---

### P2 - 低优先级（后续迭代）

#### 问题 5：列表渲染缺少虚拟滚动

**现状**：
- 老人列表使用 `Swiper`，数据量大时可能卡顿
- 用药列表、量表列表使用普通渲染

**优化方向**：
- 数据量超过 20 条时引入虚拟滚动或分页加载

**涉及文件**：
- `src/components/workbench/ArchiveCarousel.tsx`
- `src/subpackages/workbench/medication/index.tsx`
- `src/subpackages/workbench/scale/index.tsx`

---

#### 问题 6：图片资源未优化

**现状**：
- 二维码页面 `Image` 组件未配置 `lazyLoad`
- 无 WebP 格式、无图片压缩检查

**优化方向**：
- 为 `Image` 添加 `lazyLoad` 属性
- 使用 WebP 格式图片

**涉及文件**：
- `src/subpackages/workbench/qrcode/index.tsx`

---

#### 问题 7：启动性能可优化

**现状**：
- `app-entry.tsx` 的 `useLaunch` 同步执行 `persistLaunchContext`
- `WorkbenchHeader` 首次渲染调用同步 API（`Taro.getSystemInfoSync`、`Taro.getMenuButtonBoundingClientRect`）

**优化方向**：
- 将 `persistLaunchContext` 改为异步执行
- 将系统信息获取移至 `useEffect` 异步执行

**涉及文件**：
- `src/app/app-entry.tsx`
- `src/components/workbench/WorkbenchHeader.tsx`

---

#### 问题 8：内存泄漏风险

**现状**：
- 多个页面使用 `cancelled` 标志位，但未取消正在进行的 `Taro.request`
- `qrcode` 页面的 `QRCode.toDataURL` 无取消机制

**优化方向**：
- 使用 `AbortController` 取消请求
- 为异步操作添加取消机制

**涉及文件**：
- `src/subpackages/workbench/elder-list/index.tsx`
- `src/subpackages/workbench/elder-detail/index.tsx`
- `src/subpackages/workbench/basic/index.tsx`
- `src/subpackages/workbench/medication/index.tsx`
- `src/subpackages/workbench/scale/index.tsx`
- `src/subpackages/workbench/qrcode/index.tsx`

---

## 三、可执行的优化步骤

### Round 2（本周内）

#### Step 1：实现 GET 请求缓存

**目标文件**：`src/services/api/httpClient.ts`

**改动点**：
1. 导入 `getStorageValue`、`setStorageValue` 和 `removeStorageValue`
2. 新增 `buildCacheKey(path, data)` 辅助函数
3. 在 `request<T>` 函数中，判断 `options.method === 'GET' && options.cacheTtl && options.cacheTtl > 0`
4. 若缓存命中且未过期，直接返回缓存值
5. 若缓存未命中，执行 `doRequest`，成功后写入缓存（TTL = `options.cacheTtl`）
6. 401 响应或请求错误时，清除对应缓存

**验证方式**：
- 在老人列表页添加 `cacheTtl: 5 * 60 * 1000`，重复进入页面观察是否发起网络请求

---

#### Step 2：优化构建配置

**目标文件 1**：`config/index.ts`

**改动点**：
1. 修改 `modifyViteConfig` 中的 `manualChunks`，按分包拆分：
   - `scan` 分包代码 → `scan-chunk`
   - `workbench` 分包代码 → `workbench-chunk`
   - `qrcode` 库 → `qrcode-chunk`（或动态导入后无需此配置）
   - 其余 → `vendor`

**目标文件 2**：`package.json`

**改动点**：
1. 添加 `"sideEffects": false`（确认无 CSS/ polyfill 副作用后）
2. 可选添加 `rollup-plugin-visualizer` 到 devDependencies

**验证方式**：
- 执行 `npm run build:weapp`，检查 `dist` 目录 chunk 分布
- 对比构建前后主包体积变化

---

#### Step 3：`qrcode` 库动态导入

**目标文件**：`src/subpackages/workbench/qrcode/index.tsx`

**改动点**：
1. 移除顶部 `import QRCode from 'qrcode'`
2. 在 `renderPreview` 的 `useEffect` 中使用动态导入：
   ```ts
   const QRCode = await import('qrcode');
   const image = await QRCode.toDataURL(...);
   ```
3. 确保组件卸载时取消异步操作

**验证方式**：
- 构建后检查主包是否仍包含 `qrcode` 代码
- 二维码页面功能正常

---

### Round 3（后续迭代）

#### Step 4：列表虚拟滚动 / 分页

**目标文件**：`src/components/workbench/ArchiveCarousel.tsx` 等

**改动点**：
- 评估数据量，若平均 >20 条，引入分页加载
- 或引入小程序虚拟滚动组件

---

#### Step 5：图片懒加载

**目标文件**：`src/subpackages/workbench/qrcode/index.tsx`

**改动点**：
- 为 `<Image>` 组件添加 `lazyLoad` 属性

---

#### Step 6：启动性能优化

**目标文件**：`src/app/app-entry.tsx`、`src/components/workbench/WorkbenchHeader.tsx`

**改动点**：
- `persistLaunchContext` 改为 `setTimeout(..., 0)` 异步执行
- `WorkbenchHeader` 的系统信息获取移至 `useEffect`

---

#### Step 7：内存泄漏修复

**目标文件**：各页面 `useEffect`

**改动点**：
- 使用 `AbortController` 包装 `Taro.request`
- 在 `useEffect` 清理函数中调用 `controller.abort()`

---

## 四、验证步骤

1. **TypeCheck**：执行 `npm run typecheck`，确保无类型错误
2. **构建**：执行 `npm run build:weapp`，确保构建成功
3. **包体积分析**：检查 `dist` 目录各 chunk 体积，确认主包减小
4. **功能回归**：重点验证老人列表、详情、二维码页面功能正常
5. **缓存验证**：重复进入页面，确认缓存命中时无网络请求

---

## 五、决策与假设

1. **假设 `qrcode` 库无全局副作用**，可安全动态导入
2. **假设 `package.json` 可添加 `"sideEffects": false`**，需确认无 CSS 文件被 Tree Shaking 误删
3. **GET 缓存仅用于读多写少的数据**（如老人列表、量表列表），不用于实时性要求高的接口
4. **缓存 TTL 默认值建议 5 分钟**，可在各 service 层按需覆盖
