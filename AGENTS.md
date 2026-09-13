# SilverLink Care 项目 Agent 约定

## 微信小程序 CI 上传

- 小程序工程目录：`08-微信小程序端`。
- 微信上传根目录由 `08-微信小程序端/project.config.json` 的 `miniprogramRoot: "dist/"` 指定。
- 默认使用 `miniprogram-ci@2.1.31` 上传，不使用微信开发者工具的手动上传按钮。
- 上传私钥只从本机文件读取，例如 `~/Downloads/微信小程序 密钥.key`；不要把私钥内容写入仓库、日志或聊天。
- 本地配置固定放在 `08-微信小程序端/.local/wechat-ci/config.json`，该目录已经由 `.gitignore` 忽略。

### 上传步骤

1. 进入小程序目录：

   ```bash
   cd /Users/sunyiyang/Desktop/Project/SilverLink\ Care/08-微信小程序端
   ```

2. 首次使用时复制 `scripts/wechat-ci.config.example.json` 到 `.local/wechat-ci/config.json`，填入本机私钥路径，并将 `uploadVersion` 设为目标版本。
3. 使用当前机器可加载 Taro 原生模块的 Node.js 运行时执行：

   ```bash
   PATH="$HOME/.trae-cn/binaries/node/versions/24.16.0/bin:$PATH" npm run ci:upload
   ```

- `npm run ci:upload` 会先执行 `preci:upload`，完成构建、单元测试、静态验证、路由/平台/后端契约验证、产物验证和性能验证。
- `miniprogram-ci` 未安装时，脚本会自动安装到 `.local/wechat-ci-sdk`，该目录不进入 Git。
- 当前小程序 AppID 为 `wxd6f1eb971f5d4bc5`，当前已验证上传版本为 `0.1.5`。
- CI 上传成功后，仍需在微信公众平台选择已上传版本并提交审核；上传私钥不等同于公众平台提审凭据。

详细流程见 `08-微信小程序端/docs/接入与发布流程.md`。
