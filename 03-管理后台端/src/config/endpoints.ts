/**
 * 后台接口路径常量
 */

export const ENDPOINTS = {
  admin: {
    login: '/api/admin/login',
    dashboard: '/api/admin/dashboard',
    elders: '/api/admin/elders',
    volunteers: '/api/admin/volunteers',
  },
  qrcode: {
    list: '/api/admin/qrcodes',
    disable: (id: string) => `/api/admin/qrcodes/${id}/disable`,
    regenerate: (id: string) => `/api/admin/qrcodes/${id}/regenerate`,
  },
  rbac: {
    roles: '/api/admin/roles',
    permissions: '/api/admin/permissions',
  },
  audit: {
    logs: '/api/admin/audit-logs',
  },
} as const;
