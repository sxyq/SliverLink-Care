export const APP_NAME = '渝护银龄名牌';

export const APP_ROUTES = {
  home: '/pages/home/index',
  login: '/pages/auth/login',
  authRoleRedirect: '/pages/auth-role-redirect/index',
  workbenchElderList: '/subpackages/workbench/elder-list/index',
  workbenchElderDetail: '/subpackages/workbench/elder-detail/index',
  workbenchBasic: '/subpackages/workbench/basic/index',
  workbenchMedication: '/subpackages/workbench/medication/index',
  workbenchScale: '/subpackages/workbench/scale/index',
  workbenchQrCode: '/subpackages/workbench/qrcode/index',
  scanLanding: '/subpackages/scan/landing/index',
  scanVerify: '/subpackages/scan/verify/index',
  scanArchive: '/subpackages/scan/archive/index',
  scanMedications: '/subpackages/scan/medications/index',
  scanScales: '/subpackages/scan/scales/index',
  scanNameplate: '/subpackages/scan/nameplate/index',
} as const;

export const STORAGE_KEYS = {
  authToken: 'sl_weapp_auth_token',
  authRole: 'sl_weapp_auth_role',
  accountId: 'sl_weapp_account_id',
  displayName: 'sl_weapp_display_name',
  authLoggedInAt: 'sl_weapp_auth_logged_in_at',
  authCookieBacked: 'sl_weapp_auth_cookie_backed',
  launchContext: 'sl_weapp_launch_context',
  appSession: 'sl_weapp_app_session',
  currentElderSummary: 'sl_weapp_current_elder_summary',
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

// 保留旧的非 React 调用方接口；页面提示由 i18n 运行时提供当前语言。
export const ERROR_MESSAGES = {
  requestFailed: '请求失败，请稍后重试',
  networkFailed: '网络连接异常，请检查网络后重试',
  invalidQr: '当前二维码无法识别，请使用系统发放的二维码',
  permissionDenied: '当前账号暂无访问权限',
} as const;
