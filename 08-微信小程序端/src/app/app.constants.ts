export const APP_NAME = '智联名牌';

export const APP_ROUTES = {
  home: '/pages/home/index',
  login: '/pages/auth/login',
  authRoleRedirect: '/pages/auth-role-redirect/index',
  scanLanding: '/subpackages/scan/landing/index',
  scanVerify: '/subpackages/scan/verify/index',
} as const;

export const STORAGE_KEYS = {
  authToken: 'sl_weapp_auth_token',
  authRole: 'sl_weapp_auth_role',
  accountId: 'sl_weapp_account_id',
  displayName: 'sl_weapp_display_name',
  launchContext: 'sl_weapp_launch_context',
  privacyAccepted: 'sl_weapp_privacy_accepted',
} as const;

export const ROLE_TYPES = {
  volunteer: 'VOLUNTEER',
  family: 'FAMILY',
} as const;

export type RoleType = (typeof ROLE_TYPES)[keyof typeof ROLE_TYPES];

export const ENTRY_KEYS = {
  scan: 'scan',
  workbench: 'workbench',
} as const;

export const ERROR_MESSAGES = {
  requestFailed: '请求失败，请稍后重试',
  networkFailed: '网络连接异常，请检查网络后重试',
  invalidQr: '当前二维码无法识别，请使用系统发放的二维码',
  permissionDenied: '当前账号暂无访问权限',
} as const;
