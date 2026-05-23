/**
 * 角色、权限、数据范围模型
 */

import type { RolePermission } from '../../types';

export const defaultRoles: RolePermission[] = [
  {
    role: '志愿者',
    dataScope: '本人负责老人',
    menuPermissions: ['老人档案', '用药信息', '健康档案', '量表填写'],
    apiPermissions: ['GET /api/elders/assigned', 'POST /api/health-records', 'POST /api/scales'],
    exportPermissions: [],
  },
  {
    role: '项目管理员',
    dataScope: '本项目数据',
    menuPermissions: ['老人档案', '用药信息', '量表管理', '二维码管理', '志愿者管理', '健康档案管理', '量表记录管理'],
    apiPermissions: ['GET/POST /api/admin/elders', 'GET/POST /api/admin/qrcodes', 'GET/POST /api/admin/volunteers'],
    exportPermissions: ['导出档案', '导出量表记录'],
  },
  {
    role: '审计员',
    dataScope: '授权日志',
    menuPermissions: ['操作日志', '安全策略'],
    apiPermissions: ['GET /api/admin/audit-logs', 'GET /api/admin/security-settings'],
    exportPermissions: ['导出日志'],
  },
  {
    role: '系统管理员',
    dataScope: '系统配置',
    menuPermissions: ['首页概览', '老人档案', '用药信息', '量表管理', '二维码管理', '志愿者管理', '角色权限', '安全策略', '操作日志', '系统配置'],
    apiPermissions: ['GET/PUT /api/admin/roles', 'GET/PUT /api/admin/permissions', 'GET/PUT /api/admin/security-settings'],
    exportPermissions: ['导出日志', '导出配置'],
  },
];
