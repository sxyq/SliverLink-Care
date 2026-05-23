# 扫码用户端 README

## 端定位

扫码用户端是智联名牌的外部访问入口，面向路人、家属、医护人员等扫码者。用户通过微信扫描实体名牌背面的二维码进入 H5 页面，先查看基础救助信息；当需要查看健康档案、主要用药情况或量表记录时，再进入短信验证码二次验证。

本端当前采用移动端 H5/Web demo，不依赖微信小程序备案即可演示。正式上线时可继续作为微信内置浏览器 H5 使用，也可迁移为微信小程序。

## 技术栈

| 类型 | 选型 | 用途 |
| --- | --- | --- |
| 构建工具 | Vite | 本地开发、打包、预览 |
| UI 框架 | React | 页面与组件开发 |
| 类型系统 | TypeScript | 约束接口、页面状态和数据模型 |
| 图标 | lucide-react | 按钮、状态、信息提示图标 |
| 数据 | Mock + 后端 API 预留 | Demo 阶段先用 Mock，后续接统一后端 |

## 启动方式

```bash
npm install
npm run dev
```

默认端口：`5173`。

本地演示时可在同一 Wi-Fi 下用手机访问电脑局域网 IP，例如：

```text
http://电脑局域网IP:5173
```

## 需求覆盖

本端覆盖需求文档中的以下内容：

- 二维码扫码访问平台。
- 基础信息展示。
- 紧急联系人一键拨打。
- 查看健康档案前短信验证码二次验证。
- 验证后展示健康档案、主要用药情况、量表记录摘要。
- 页面脱敏展示。
- 查看行为写入操作日志。

不包含：

- 健康检测硬件。
- 实时生命体征监测。
- 医疗诊断。
- 预约挂号。
- 家庭聊天或社交功能。

## 源码目录规划

```text
src/
  app/                  # 应用根组件、全局布局、全局状态
  api/                  # 扫码端 API 请求封装
  assets/               # 图片、图标、静态资源
  components/           # 通用 UI 组件
  config/               # 环境变量、接口地址、端配置
  data/                 # Demo Mock 数据
  features/             # 业务功能模块
    verification/       # 短信二次验证与敏感查看授权
  hooks/                # React hooks
  pages/                # 页面组件
  routes/               # 页面路由
  styles/               # 全局样式、主题变量
  types/                # TypeScript 类型定义
  utils/                # 脱敏、格式化、二维码 token 读取等工具
```

当前已有 `src/App.tsx`、`src/api.ts`、`src/mock.ts`、`src/types.ts`、`src/styles.css` 是 demo 初始骨架。后续开发时按上面的目录逐步拆分，不要求一次性重构。

## 后端对接

统一后端目录：`D:\Project\SilverLink Care\04-统一后端`

主要接口：

| 接口 | 用途 |
| --- | --- |
| `POST /api/scan/resolve` | 解析二维码加密 token，返回基础信息 |
| `POST /api/scan/auth/wechat` | 微信 OpenID 换取 JWT 短时 Token |
| `POST /api/sms/send` | 发送短信验证码 |
| `POST /api/sms/verify` | 校验短信验证码并写入短时授权 |
| `GET /api/scan/archive` | 验证后查看健康档案 |
| `GET /api/scan/medications` | 验证后查看主要用药 |
| `GET /api/scan/scales` | 验证后查看量表记录 |

## 参考设计图

```text
D:\Project\SilverLink Care\ui_overview_images\new_01_scan_user_overview.png
```

## UI 复刻规范

本端不能只参考概念图链接，开发时必须按 [UI复刻规范.md](./UI复刻规范.md) 执行。该规范已经把概念图拆解为页面布局、配色、组件样式、首屏信息、交互状态和验收标准。

## 安全要求

- 二维码 URL 只包含 AES-256-GCM 加密后的 token，不包含老人明文身份和健康信息。
- 全站 HTTPS。
- 微信 OpenID + JWT 短时 Token。
- 查看健康档案、主要用药、量表记录前必须短信验证码二次验证。
- 页面默认脱敏展示手机号、联系人等敏感字段。
- 访问、验证、查看敏感信息等行为写入操作日志。
