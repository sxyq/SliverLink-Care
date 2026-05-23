# 志愿者填写端 README

## 当前定位

`02-志愿者填写端` 现在是统一照护工作台的唯一前端工程。

当前项目不再保留单独的家属前端项目，而是在同一个前端工程中提供两类账号模式：

- 志愿者账号模式
- 家属账号模式

两类账号模式共用同一套老人工作台能力，只在登录方式、入口路由和数据权限上区分。

## 本端负责

- 志愿者账号登录
- 本人负责老人列表
- 老人详情
- 基本信息维护
- 健康档案填写
- 用药维护
- PHQ-9 / GAD-7 / UCLA 量表填写
- 家属邀请码入口、家属登录、联系人维护、二维码查看

## 统一照护工作台

共用目录：
[D:\Project\SilverLink Care\02-志愿者填写端\src\shared-workbench](</D:/Project/SilverLink Care/02-志愿者填写端/src/shared-workbench>)

家属账号模式实现目录：
[D:\Project\SilverLink Care\02-志愿者填写端\src\family-entry](</D:/Project/SilverLink Care/02-志愿者填写端/src/family-entry>)

当前共用的页面实现：

- 老人列表
- 老人详情
- 用药维护

## 技术栈

| 类型 | 选型 |
| --- | --- |
| 构建工具 | Vite |
| UI 框架 | React |
| 类型系统 | TypeScript |
| 图标 | lucide-react |
| 数据源 | 统一后端 API |

## 启动方式

```bash
npm install
npm run dev
```

默认端口：`5174`

## 当前源码结构

```text
src/
  app/
  api/
  components/
  family-entry/
  pages/
  shared-workbench/
  styles/
  types/
```

## 当前状态

- 独立家属端工程已下线
- 家属账号模式已经并入统一照护工作台
- 志愿者和家属共用老人工作台源码
- 构建通过
