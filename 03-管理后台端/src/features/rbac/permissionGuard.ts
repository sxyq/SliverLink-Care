/**
 * 前端 RBAC 权限判断
 * 仅控制展示，不替代后端权限校验
 */

import type { RolePermission } from '../../types';

export function hasMenuPermission(
  role: RolePermission,
  menu: string
): boolean {
  return role.menuPermissions.includes(menu);
}

export function hasApiPermission(
  role: RolePermission,
  api: string
): boolean {
  return role.apiPermissions.includes(api);
}

export function hasExportPermission(
  role: RolePermission,
  exportType: string
): boolean {
  return role.exportPermissions.includes(exportType);
}

export function getDataScope(role: RolePermission): string {
  return role.dataScope;
}
