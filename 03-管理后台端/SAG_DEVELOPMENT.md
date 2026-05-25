# 03-管理后台端 SAG 开发说明

## 开发顺序

1. 配置与菜单：环境变量、接口端点、后台菜单
2. 权限模型：RBAC 角色、权限矩阵、菜单过滤
3. API 客户端：登录、档案、二维码、志愿者、短信中转、审计日志
4. 页面骨架：首页、老人档案、二维码、志愿者、RBAC、审计、安全设置
5. 导出与审计：CSV 导出、日志筛选、敏感操作记录
6. 验收：管理员和审计员菜单不同，敏感字段脱敏

## 建议类/组件

- `AdminLoginPage`
- `DashboardPage`
- `ElderArchivePage`
- `QrCodeManagePage`
- `RbacPage`
- `AuditLogPage`
- `PermissionMatrix`

## 建议函数

- `loginAdmin`
- `loadDashboard`
- `searchElders`
- `generateQrCode`
- `disableQrCode`
- `updateRolePermissions`
- `exportAuditCsv`

## 图谱约束

后台端必须以 RBAC 和审计为核心约束，所有二维码、志愿者、老人档案和短信中转操作都应可追踪。
