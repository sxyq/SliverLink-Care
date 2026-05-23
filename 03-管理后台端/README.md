# 管理后台端 README

## 端定位

管理后台端面向项目管理员、后台操作员、审计员和系统管理员，用于管理老人档案、二维码、志愿者账号、RBAC 权限、安全策略和操作日志。该端是权限控制和安全审计的核心。

当前采用 PC Web demo。

## 技术栈

| 类型 | 选型 |
| --- | --- |
| 构建工具 | Vite |
| UI 框架 | React |
| 类型系统 | TypeScript |
| 图标 | lucide-react |
| 数据 | Mock + 统一后端 API 预留 |

## 启动方式

```bash
npm install
npm run dev
```

默认端口：`5175`。

## 需求覆盖

- 后台账号密码登录。
- 管理首页统计。
- 老人档案管理。
- 二维码生成、绑定、停用、重新生成。
- 志愿者账号和负责老人范围管理。
- RBAC 角色权限配置。
- HTTPS、AES-256、接口签名、IP 白名单等安全策略展示。
- 操作日志筛选和导出规划。

## 源码目录规划

```text
src/
  app/
  api/
  assets/
  components/
  config/
  data/
  features/
    rbac/
    audit/
  hooks/
  pages/
  routes/
  styles/
  types/
  utils/
```

## 后端对接

统一后端目录：`D:\Project\SilverLink Care\04-统一后端`

主要接口：

| 接口 | 用途 |
| --- | --- |
| `POST /api/admin/login` | 后台登录 |
| `GET /api/admin/dashboard` | 首页统计 |
| `GET/POST /api/admin/elders` | 老人档案查询/新增 |
| `GET/POST /api/admin/qrcodes` | 二维码查询/生成 |
| `PUT /api/admin/qrcodes/{id}/disable` | 停用二维码 |
| `POST /api/admin/qrcodes/{id}/regenerate` | 重新生成二维码 |
| `GET/POST /api/admin/volunteers` | 志愿者管理 |
| `GET/POST /api/admin/roles` | 角色管理 |
| `GET/PUT /api/admin/permissions` | 权限配置 |
| `GET /api/admin/audit-logs` | 操作日志 |

## 参考设计图

```text
D:\Project\SilverLink Care\ui_overview_images\new_03_admin_security_overview.png
D:\Project\SilverLink Care\ui_overview_images\new_04_full_flow_overview.png
```

## UI 复刻规范

本端开发不能只参考概念图链接，必须按 [UI复刻规范.md](./UI复刻规范.md) 执行。该规范已经细化后台布局、菜单、统计卡片、数据表格、RBAC 权限矩阵、安全策略和操作日志页面。
