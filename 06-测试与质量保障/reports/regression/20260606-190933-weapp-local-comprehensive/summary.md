# 微信小程序端本地综合测试报告

## 1. 结论

本轮按 `06-测试与质量保障/docs/00-总览/01-测试总规划.md` 的测试粒度，把 `08-微信小程序端` 纳入统一测试对象，并完成多 agent 分工下的代码层综合验证。本轮明确不纳入实机、真机、DevTools 模拟器页面截图或人工界面点击测试。

当前已通过：

- 单元/契约测试：`npm run test:unit`，22/22 通过。
- 静态安全/配置审计：`npm run test:static` 通过，扫描 98 个源码/配置/脚本文件，确认 12 条 DevTools condition。
- 路由/导航契约审计：`npm run test:route-contract` 通过，确认 15 个 `APP_ROUTES` 与 15 个注册页面一致，49 处源码路由引用有效，10 条受保护 query 契约、12 条导航契约通过，且 `switchTab` 非 tabBar 残留为 0。
- 微信平台能力契约审计：`npm run test:platform-contract` 通过，确认 27 个 Taro 平台方法、9 条平台能力契约和唯一 `window.location` H5 分支。
- 后端接口契约审计：`npm run test:backend-contract` 通过，确认小程序 38 条关键 API method/path 能在统一后端 94 条 controller route 中匹配，覆盖 scan、volunteer、family、elder、invitation、nameplate 6 组 controller，并锁定 15 条 response shape 合约，覆盖登录/注册/个人资料、老人 DTO、基础信息、联系人、用药、量表、二维码、名牌/PDF 和 family medication void 响应。
- 页面隐私/危险渲染审计：`npm run test:page-privacy-render` 通过，扫描 57 个源码文件、15 个页面、14 个组件和当前 dist 38 个 JS/WXML 文件，确认 8 条页面隐私合约通过，`RichText/web-view/dangerous HTML/eval/console` 命中为 0，3 个 `<Image src>` 绑定均来自安全预览 resolver。
- 构建产物安全审计：`npm run test:dist-security` 通过，扫描 73 个 `dist` 文件，确认无 source map、私钥、私钥路径、云密钥、本机路径、内网地址、CI 临时产物或敏感 DevTools query；当前仅提示 `uploadWithSourceMap=true` 需要生产上传策略复核。
- 构建/分包性能预算：`npm run test:performance-budget` 通过，按文档阈值确认 `dist` 总包 529578/2097152 bytes、扫码分包 55692/512000 bytes、工作台分包 78443/716800 bytes，另记录 gzip 基线 146944 bytes。
- 证据一致性审计：`node 06-测试与质量保障/scripts/regression/check_weapp_evidence.mjs` 通过，确认主报告、六层矩阵、性能 JSON、代码层命令日志、CI 预览二维码和非目标说明互相可追溯。
- 类型检查：`npm run typecheck` 通过。
- 小程序构建：`npm run test:build-performance` 通过，内部执行 `npm run build:weapp`，完整门禁耗时 13703/40000 ms，263 modules transformed。
- 构建产物检查：`npm run test:artifact` 通过。
- 统一小程序本地回归入口：`bash 06-测试与质量保障/scripts/regression/run_weapp_local_checks.sh` 通过。
- 微信 CI 预览：`npm run ci:preview` 23:46 复跑通过，已刷新预览二维码 `screenshots/miniprogram-ci-qrcode.png`，原始日志见 `logs/weapp-ci-preview-current.log`。
- DevTools/真机复测：本轮不执行实机或界面测试；历史 DevTools 环境记录、逐页清单和二维码保留为后续可选运行时验证资料，不作为当前代码层完成条件。
- 上传前门禁：`ci:upload` 已通过 `preci:upload` 绑定 `run_weapp_local_checks.sh`，避免直接上传绕过单测、静态审计、类型检查、构建、dist security 和 artifact 检查。
- 六层证据矩阵：已补 `evidence-matrix.md` 与 `evidence-matrix.json`，按单元、功能、集成、性能、安全、回归汇总已证明内容、证据文件和本轮非目标。

## 2. 多 Agent 分工

| 角色 | 分工 | 输出 |
| --- | --- | --- |
| 主 agent | 统一测试对象接入、总规划/函数矩阵补齐、构建产物检查、门禁执行、报告整理 | 本报告、文档矩阵、artifact 检查增强 |
| Confucius | 只读审计本地测试文档粒度并映射到小程序端 | 确认需覆盖单元、功能、集成、性能、安全、回归六层 |
| Planck | 只读审计小程序端风险面 | 确认扫码入口、验证链路、权限分流、service 契约、构建产物为 P0 风险 |
| Bernoulli | 补 service/HTTP 契约单测 | `httpClient`、扫码 service、受保护读取、工作台药品、二维码/名牌 helper |
| Chandrasekhar | 补 Taro 平台与扫码入口单测 | Taro stub、相机权限、扫码取消、无效 QR、成功跳转 |
| Arendt | 只读审计小程序安全/隐私残留 | 指出登出/401 后本地认证态缓存残留风险 |
| Erdos | 只读审计测试文档到小程序门禁缺口 | 指出平台能力契约、DTO 深契约和页面隐私 artifact 门禁方向 |
| Lorentz | 只读审计页面隐私/危险渲染风险 | 建议新增 `page-privacy-render` 门禁，覆盖敏感字段分级、危险渲染 API、图片源和 auth guard |

## 3. 覆盖范围

### 3.1 单元与契约

- 路由参数：H5 token、`/s/:token`、raw token、scene、query 优先级。
- 启动上下文：扫码启动、普通启动、storage 持久化。
- 权限矩阵：志愿者/家属在基础信息、联系人、用药、量表、二维码、名牌上的差异权限。
- storage：同步/异步读写、TTL、cleanup。
- auth/app/elder store：登录态、角色 selector、当前老人缓存、登出/401 后认证态隐私擦除。
- request queue：并发上限与结果顺序。
- 扫码入口：已授权、首次授权、拒绝后 openSetting、取消扫码、无效二维码、成功导航。
- `httpClient`：Authorization、Cookie、envelope 解包、401 清登录态和认证态缓存、业务错误、HTTP 错误、GET cache、download。
- 扫码 service：resolve、短信验证 start/status、身份登记。
- 受保护读取：basic/archive/medications/scales 的 elderId/sessionId query。
- 路由/导航契约：`APP_ROUTES`、`app.config.ts` 注册页、页面文件、源码路由引用、受保护 query 和 `switchTab` 目标规则。
- 平台能力契约：扫码相机权限、短信剪贴板/H5 分支、电话、二维码链接复制、PDF 下载/openDocument、二维码/名牌图片文件系统 fallback。
- 工作台 service：志愿者药品 GET、405 缓存 fallback、家属路径。
- 家属药品写操作：create 按后端返回对象映射，update/delete 按后端 `ApiResponse<Void>` 成功响应处理，避免 void 响应把本地药品行覆盖为空。
- 二维码/名牌：publicUrl/directUrl/token fallback、backQrUrl/backQrPayload/backQrImageBase64 兼容、PDF 下载打开、微信用户目录写入和 data URL 回退。
- 页面隐私/危险渲染：扫码落地页未验证字段白名单、验证页敏感输入与短信通道边界、受保护扫码页 `elderId + sessionId` 上下文、工作台二维码与名牌 auth-only 守卫、QR/名牌图片安全 resolver、危险 HTML/web-view/eval/console 为 0。

### 3.2 功能/回归

- Taro build 产出包含首页、登录、角色跳转、扫码分包 6 页、工作台分包 6 页。
- artifact 检查锁定 `app.json` 页面、分包、`project.config.json`、验证页短信按钮、防串档提示、工作台二维码复制/停用/名牌入口、名牌背面扫码/PDF 文案。
- artifact 检查同时锁定 `project.config.json` 的 12 条微信开发者工具 condition：每条 condition 都必须指向已注册页面，并且 dist 下存在对应 `js/json/wxml`。
- route contract 检查锁定源码导航层：受保护的扫码档案/用药/量表必须带 `elderId + sessionId`，扫码验证/名牌/工作台详情和子页必须带 `elderId`，且无 tabBar 配置时禁止使用 `switchTab` 跳普通页面。
- platform contract 检查锁定微信平台能力使用边界：Taro 方法面、相机/扫码、短信、电话、剪贴板、PDF、文件系统和 H5-only `window.location` 分支。
- page privacy render 检查锁定页面渲染层：未验证扫码页不展示完整住址，短信 fallback 不回退显示完整手机号，名牌预览先校验登录态再请求敏感预览，QR/名牌 `<Image src>` 不直绑后端任意 URL。
- dist security 检查锁定发布产物边界：不允许 `.map`、`sourceMappingURL`、私钥/密钥、JWT、硬编码手机号/身份证、`.local`、`dist-preview`、本机绝对路径、localhost/内网地址、数据库/SQL 文件、DevTools 私有配置、preview info 或 CI 预览二维码进入 `dist`。
- performance budget 检查锁定可本地证明的包体预算：总包 `< 2MB`、扫码分包 `< 500KB`、工作台分包 `< 700KB`；真机首屏、分包可见时间和 PDF 打开耗时属于后续运行时性能专项。
- DevTools 复测脚本会导出 12 条 condition 到 `devtools-conditions.tsv`，生成逐页截图/验收清单 `manual-checklist.md`，并把 `islogin/open/auto` 的原始输出保存到报告 `logs/`；这些仅作为后续运行时/UI 专项入口。
- 证据一致性脚本会校验主报告文件、矩阵 JSON、性能 JSON、代码层命令日志、CI 预览二维码和本轮非目标说明，防止当前代码层报告引用漂移。
- 微信 CI 完成服务端编译、打包、上传预览，23:46 复跑刷新二维码并记录当前分包体积。

### 3.3 集成与安全

- 小程序 service 层已用 mock Taro request 覆盖后端 URL/method/body/query 契约。
- 后端契约门禁已静态校验小程序 service 的 38 条关键 API path/method 与统一后端 controller 路由一致，并反向扫描 service 中未登记的 `/api/` 字面量；同时锁定 15 条后端响应字段/DTO 与小程序 mapper 的对应关系，降低后端改字段或小程序改 service 后静默漂移的风险。
- 路由契约门禁已静态校验 15 个路由常量、15 个注册页面、49 处源码路由引用、10 条受保护 query 合约和 12 条导航契约，降低页面注册或参数透传改坏后的静默漂移风险。
- 平台契约门禁已静态校验 27 个 Taro 方法、9 条平台能力契约和 1 处 H5-only `window.location` 分支，降低微信能力调用被改坏后的静默漂移风险。
- 防串档相关的 `sessionId + elderId` 路由字段、验证会话跨老人提示已纳入单测与 artifact 检查。
- 未登录/401 清登录态、认证态缓存擦除、角色权限矩阵、家属/志愿者权限分流已纳入本地测试。
- 静态审计已覆盖 `.local/` 与预览二维码 git 忽略、微信 CI 上传忽略规则、私钥示例占位、HTTPS API fallback、HTTP cookie/401 清理、源码敏感材料扫描。
- 页面隐私审计已覆盖 `public-before-verify`、`verified-only`、`auth-only`、`never-render` 四类字段边界，确认危险渲染 API、console 输出、敏感 query/storage sink 和未审查图片源均为 0。
- 发布产物审计已覆盖 `dist` 泄漏面；当前只保留 `uploadWithSourceMap=true` 的策略提示，因物理产物中未发现 `.map` 或 `sourceMappingURL`。

### 3.4 性能

- `dist` 文件数：73。
- `dist` 总大小：529578 bytes。
- Taro build 耗时：13703 / 40000 ms。
- 本地性能预算：
  - `dist` 总包：529578 / 2097152 bytes
  - 扫码分包：55692 / 512000 bytes
  - 工作台分包：78443 / 716800 bytes
  - gzip 基线：146944 bytes
- 微信 CI 包体：
  - `/subpackages/scan/`: 60271 bytes
  - `/subpackages/workbench/`: 86689 bytes
  - `__APP__`: 428917 bytes
  - `__FULL__`: 575877 bytes
- Taro build 日志中仅出现 Sass legacy JS API deprecation warning，未出现构建错误。

## 4. 非目标与残余风险

- 实机、真机、DevTools 模拟器页面截图、人工界面点击和 `miniprogram-automator` UI 回放均不纳入本轮目标。
- `npm run ci:preview` 已成功生成预览二维码，证明当前代码可被微信 CI 服务端编译打包；它不被用作真机业务链路证据。
- 真实相机权限、合法域名、微信 Cookie、真实文件系统、PDF 打开和分包可见时间属于后续运行时/界面专项，不影响本轮代码层单元、性能、安全测试结论。

## 5. 后续可选项

1. 若未来重新要求运行时/UI 验证，可在微信开发者工具账号恢复后运行 `SILVERLINK_RUN_LOCAL_CHECKS=0 SILVERLINK_RUN_CI_PREVIEW=1 bash 06-测试与质量保障/scripts/regression/run_weapp_devtools_checks.sh`。
2. 若未来引入 `miniprogram-automator`，可把 UI 回放截图作为单独运行时报告，不并入本轮代码层完成条件。
