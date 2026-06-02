/*
  小程序全局配置文件规划

  后续这里负责：
  - 注册首页 pages/home/index
  - 注册登录页 pages/auth/login
  - 注册按角色分流页 pages/auth-role-redirect/index
  - 注册扫码子包 subpackages/scan
  - 注册工作台子包 subpackages/workbench
  - 配置 window、tabBar、网络超时、分包信息

  推荐实现要点：
  - 首页作为默认启动页
  - 扫码页和工作台页放入 subpackages，降低首包体积
  - 统一配置导航栏标题、背景色、下拉刷新策略
  - 根据审核版本控制是否开放部分页面

  注意：
  - 正式实现时不要把未审核完成的隐藏页面暴露到 pages 列表中
  - 分包路径命名必须与目录保持一致
*/
