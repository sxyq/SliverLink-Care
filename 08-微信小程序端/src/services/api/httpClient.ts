/*
  HTTP 客户端封装规划

  统一负责：
  - request 基地址
  - token 注入
  - 错误码拦截
  - 统一超时
  - 小程序 request / downloadFile 封装

  需要适配：
  - 普通 JSON 请求
  - 文件下载
  - 401 登录失效
  - 403 权限不足
  - 业务错误提示

  不要让页面直接到处写 wx.request。
*/
