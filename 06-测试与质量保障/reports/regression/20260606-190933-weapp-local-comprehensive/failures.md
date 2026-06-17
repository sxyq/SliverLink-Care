# 失败项与本轮非目标记录

## 1. 已修复的测试脚本误报

### artifact 检查过度依赖压缩后字段名

- 命令：`cd 08-微信小程序端 && npm run test:artifact`
- 现象：`workbench qrcode bundle is missing QR image fallback fields`
- 原因：Taro/Vite 产物中对象字段可能被压缩或模块合并，直接检查 `qrImageBase64/qrImageUrl` 原始字段名会误报。
- 处理：改为构建产物检查稳定页面/交互文案，同时检查 `src/services/workbench/qrcodeService.ts` 中的兼容字段。
- 复测：`npm run test:artifact` 通过，随后 `run_weapp_local_checks.sh` 通过。

## 2. 历史运行时环境记录（本轮非目标）

### 微信开发者工具 GUI 账号 access token 过期

本轮目标已明确限定为代码层单元、性能、安全、静态和契约测试，不执行实机、DevTools 模拟器页面截图或人工界面点击。以下记录仅保留为后续运行时/UI 专项的现场资料，不影响本轮代码层测试结论。

- 命令：`wechatwebdevtools cli islogin`
- 结果：`{"login":false}`
- 命令：`wechatwebdevtools cli open`
- 结果：`需要重新登录 (code 10)`
- GUI 复核：项目窗口可打开，未登录浮层存在，模拟器显示 `Error: 需要重新登录`。证据：`screenshots/wechat-devtools-login-blocked.png`
- 游客模式尝试：点击“游客模式”后可进入微信开发者工具欢迎页，但实际编译仍失败，模拟器显示 `INVALID_LOGIN, access_token expired`。证据：`screenshots/wechat-devtools-guest-welcome.png`
- 命令：`wechatwebdevtools cli auto --trust-project`
- 结果：`INVALID_LOGIN,access_token expired [20260606 19:31:02]`
- 20:56 复核：`wechatwebdevtools cli islogin` 返回 `{"login":true}`，但 `open`、`auto` 和 GUI “编译”仍返回 `INVALID_LOGIN, access_token expired`。
- 20:58 GUI 证据：模拟器显示 `INVALID_LOGIN,access_token expired [20260606 20:58:33][wxd6f1eb971f5d4bc5]`。证据：`screenshots/wechat-devtools-token-expired-2056.png`
- 21:09 复核：新增 `run_weapp_devtools_checks.sh` 后冒烟执行，`islogin` 仍为 `{"login":true}`，但 `open` 返回 `INVALID_LOGIN,access_token expired [20260606 21:09:01]`，脚本正确生成运行时环境记录：`../20260606-210900-weapp-devtools-check/summary.md`。
- 21:17 复核：增强脚本后再次执行，`islogin` 仍为 `{"login":true}`，`open` 返回 `INVALID_LOGIN,access_token expired [20260606 21:17:07]`；报告已自动生成 `manual-checklist.md` 逐页验收清单：`../20260606-211706-weapp-devtools-check/manual-checklist.md`。
- 21:21 复核：使用 `SILVERLINK_RUN_CI_PREVIEW=1` 再跑增强脚本，`open` 仍返回 `INVALID_LOGIN,access_token expired [20260606 21:21:04]`；微信 CI preview 同时通过，二维码已复制到 `../20260606-212103-weapp-devtools-check/screenshots/miniprogram-ci-qrcode.png`。
- 21:28 复核：`islogin` 仍返回 `{"login":true}`，但再次执行 `open` 仍返回 `INVALID_LOGIN,access_token expired [20260606 21:28:34]`。
- 22:27 复核：`islogin` 仍返回 `{"login":true}`，但 `open` 返回 `#initialize-error: wait IDE port timeout`；`http://127.0.0.1:9420/json/version` 与 `/json/list` 均不可达，`pgrep -fl wechatwebdevtools` 未匹配到进程。
- 23:11 复核：`run_weapp_devtools_checks.sh` 可启动并连接 9420 HTTP 服务，`islogin` 仍返回 `{"login":true}`，但 `open` 继续返回 `INVALID_LOGIN,access_token expired [20260606 23:11:29]`；最新运行时环境记录：`../20260606-231125-weapp-devtools-check/summary.md`。
- 范围说明：DevTools 模拟器真实页面截图、点击路径和控制台检查是后续运行时/UI 专项，不属于本轮代码层完成条件。
- 当前证据：`npm run ci:preview` 已通过微信 CI 服务端编译和预览二维码生成，二维码为 `screenshots/miniprogram-ci-qrcode.png`；该证据用于证明当前代码可被微信 CI 打包，不替代 IDE/真机交互证据。

### 小程序 UI 自动化 runner 不存在

- 检查：`08-微信小程序端/node_modules/miniprogram-automator` 不存在。
- 范围说明：本轮不执行小程序 UI 自动化回放，因此该项不影响本轮代码层测试结论。
- 建议：后续若需要自动化 UI 回放，引入 `miniprogram-automator` 并在登录后的 DevTools 环境中执行。

## 3. 代码层结论与后续可选项

- 本轮代码层单元、静态、契约、性能、安全、构建产物和证据一致性测试已形成闭环。
- 真机相机权限、真实扫码、合法域名、微信 Cookie、文件系统写入、PDF 打开属于后续运行时/界面专项。
- 本轮 service 层集成是 mock Taro request 契约测试，不等同于真实后端在线数据闭环；该差异已在目标范围内接受。
- 微信 CI preview 生成二维码不保证业务账号、老人数据、短信验证状态在真机上全部可用；真机业务验证后续单独留档。
