import { describe, expect, it } from 'vitest';
import { getDataScope, hasApiPermission, hasExportPermission, hasMenuPermission } from './permissionGuard';
import { defaultRoles } from './rolePermissionModel';

describe('permissionGuard', () => {
  it('matches menu, api and export permissions from role model', () => {
    const adminRole = defaultRoles.find((item) => item.role === '系统管理员');
    expect(adminRole).toBeTruthy();

    expect(hasMenuPermission(adminRole!, '二维码管理')).toBe(true);
    expect(hasMenuPermission(adminRole!, '邀请管理')).toBe(false);
    expect(hasApiPermission(adminRole!, 'GET/PUT /api/admin/roles')).toBe(true);
    expect(hasExportPermission(adminRole!, '导出配置')).toBe(true);
    expect(getDataScope(adminRole!)).toBe('系统配置');
  });

  it('denies unsupported permissions for limited roles', () => {
    const volunteerRole = defaultRoles.find((item) => item.role === '志愿者');
    expect(volunteerRole).toBeTruthy();

    expect(hasMenuPermission(volunteerRole!, '角色权限')).toBe(false);
    expect(hasApiPermission(volunteerRole!, 'GET /api/sms-relay/admin/*')).toBe(false);
    expect(hasExportPermission(volunteerRole!, '导出日志')).toBe(false);
    expect(getDataScope(volunteerRole!)).toBe('本人负责老人');
  });
});
