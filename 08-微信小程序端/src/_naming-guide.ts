/*
  命名规范总说明

  1. 页面目录：
     - 使用 kebab-case
     - 例如：home、auth-role-redirect、elder-detail

  2. 页面主文件：
     - 页面目录内统一使用 index.tsx、index.config.ts、index.scss
     - 便于 Taro 和微信小程序页面注册

  3. 组件文件：
     - 使用 PascalCase
     - 例如：PageContainer.tsx、EmptyState.tsx

  4. hooks / services / utils / store：
     - 文件名使用 camelCase
     - 例如：useScanEntry.ts、httpClient.ts、storage.ts

  5. 样式文件：
     - 与页面同名使用 index.scss
     - 组件样式后续可使用 ComponentName.scss

  6. 一个文件只负责一个明确职责：
     - 页面负责页面结构与交互编排
     - services 负责接口调用
     - store 负责状态
     - utils 负责纯函数与平台能力封装

  7. 本目录当前仅创建“空代码文件 + 注释说明”：
     - 不写真实逻辑
     - 不写假实现
     - 后续开发必须根据注释逐步填充

  8. 复用策略：
     - 类型定义、接口语义、字段映射尽量复用现有 H5 代码
     - 平台能力层必须小程序化重写
     - 页面视觉结构必须对齐现有 H5 设计，但不能直接复制浏览器实现

  9. 文件内容规范：
     - 当前阶段文件内只允许存在“开发说明注释”
     - 后续进入真实开发后，每个文件顶部必须保留职责说明
     - 页面文件实现时必须先写出数据来源、状态、交互流程，再写 JSX

  10. 页面实现规范：
      - 一个页面目录至少包含：
        - index.tsx
        - index.config.ts
        - index.scss
      - 若该页面暂时没有样式文件，也应在计划文档中说明

  11. 组件实现规范：
      - 通用组件按职责分目录，例如 layout、feedback、form、display
      - 组件不直接访问具体业务接口
      - 组件通过 props 接收数据和回调，不直接操作全局状态

  12. services 规范：
      - 一个服务文件只对应一个明确领域
      - 不在页面中直接写接口路径
      - 对外暴露明确的函数名，例如：
        - getBoundElders
        - getElderDetail
        - downloadNameplatePdf

  13. store 规范：
      - 按领域拆分 store，不做超大单文件
      - auth、elder、app session 独立维护
      - 页面中优先通过 selector 访问 store，而不是直接散读原始对象

  14. hooks 规范：
      - 命名必须以 use 开头
      - hook 负责组合状态和交互，不直接渲染 UI
      - hook 中允许协调 store、service、route、loading，但不要输出过多无关状态

  15. utils 规范：
      - 只保留纯函数或轻平台适配函数
      - 禁止把页面业务流程写进 utils

  16. 样式规范：
      - 小程序端要对齐现有 H5 品牌感
      - 统一使用相近色板、圆角、卡片阴影、按钮层级
      - 不允许为了“能跑”随意退化成无层次默认 UI
*/
