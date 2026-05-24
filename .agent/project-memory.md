# SilverLink Care 项目记忆

更新时间：2026-05-24

## 项目基本信息

- 项目名称：智联名牌 / SilverLink Care
- 项目目标：面向老年人的智能名牌系统，包含扫码用户端、志愿者/家属协管端、管理后台、统一后端和安卓短信中转端。
- 工作区根目录：`/Users/sunyiyang/Desktop/Project/SilverLink Care`
- 当前仓库已完成本地 baseline commit，便于后续用 CodeGraph 建图和按图开发。

## 目录分工

- `01-扫码用户端`：扫码访问者查看老人基础信息，敏感信息需二次验证。
- `02-志愿者填写端`：志愿者端与家属端已合并为一个前端入口，不再拆成两个独立端口。
- `03-管理后台端`：后台管理首页、老人档案、用药、量表、二维码、志愿者/家属、权限、日志等功能。
- `04-统一后端`：Spring Boot 统一后端，提供各前端所需 API。
- `05-安卓短信中转端`：安卓短信中转相关项目目录。

## 本地运行口径

- 扫码用户端：`http://localhost:5173`
- 志愿者/家属合并端：`http://localhost:5174`
- 管理后台端：`http://localhost:5175`
- 家属入口走合并端内的 `#/family` 路由，不再单独起 5176。

## 当前技术栈

- 前端：React 19、TypeScript 5.8、Vite 7、React Router 7
- 图标/组件：`lucide-react`
- 二维码：`qrcode`
- 后端：Spring Boot 3.1.5、Java 17、Spring Security、Spring Data JPA、Flyway、MySQL、JWT
- 安卓端：Kotlin + Gradle
- 部署/反代：Nginx、Docker

## CodeGraph 基线

- 已在本地初始化 `.codegraph/`
- 已创建本地 baseline commit：`245ee50`
- 重新索引后，CodeGraph 已可用
- 后续优先采用“本地 baseline commit 后再建图”的方式继续推进

## 工作约定

- 优先在本地改动和验证，不直接上线服务器。
- 任何 UI 改动后继续更新 `UI改动记录.md`。
- 管理后台保持现有设计语言，不要重做一套风格。
- 列表和报表页默认保留筛选、导出、字段折叠/展开和中文化显示。
- 遇到管理后台登录、接口异常、联调不通、提示文案异常这类问题时，不只排查 `03-管理后台端` 前端代码，也要同时检查 `04-统一后端`、远程后端入口、Nginx/代理路径和实际在线服务是否一致。
