/*
  应用启动解析 hook 规划

  用途：
  - 解析普通启动、扫码启动、小程序码启动
  - 抽取启动参数中的 elder 标识、qr token、scene 值
  - 决定是进入首页还是直接跳转扫码落地页

  后续输出建议：
  - launchMode
  - qrToken
  - elderId
  - sourceScene
*/
