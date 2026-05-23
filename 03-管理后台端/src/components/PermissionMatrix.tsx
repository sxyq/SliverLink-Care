import { Check, X } from 'lucide-react';
import type { RolePermission } from '../types';

const menuItems = ['老人档案', '二维码管理', '志愿者管理', '健康档案管理', '量表记录管理', '角色权限', '安全策略', '操作日志', '系统配置'];
const apiItems = ['GET /api/elders/assigned', 'POST /api/health-records', 'POST /api/scales', 'GET/POST /api/admin/elders', 'GET/POST /api/admin/qrcodes', 'GET/POST /api/admin/volunteers', 'GET /api/admin/audit-logs', 'GET/PUT /api/admin/roles', 'GET/PUT /api/admin/permissions'];
const exportItems = ['导出档案', '导出量表记录', '导出日志', '导出配置'];

function Cell({ active }: { active: boolean }) {
  return active ? (
    <Check size={16} className="check-icon" />
  ) : (
    <X size={16} className="cross-icon" />
  );
}

export function PermissionMatrix({ roles }: { roles: RolePermission[] }) {
  return (
    <div className="panel" style={{ marginTop: 14 }}>
      <h4 style={{ margin: '0 0 12px' }}>菜单权限</h4>
      <table className="data-table permission-matrix" style={{ marginBottom: 18 }}>
        <thead>
          <tr>
            <th>角色</th>
            {menuItems.map((m) => (
              <th key={m}>{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.role}>
              <td><strong>{role.role}</strong><br /><small style={{ color: 'var(--color-text-secondary)' }}>{role.dataScope}</small></td>
              {menuItems.map((m) => (
                <td key={m}><Cell active={role.menuPermissions.includes(m)} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h4 style={{ margin: '0 0 12px' }}>接口权限</h4>
      <table className="data-table permission-matrix" style={{ marginBottom: 18 }}>
        <thead>
          <tr>
            <th>角色</th>
            {apiItems.map((a) => (
              <th key={a}>{a}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.role}>
              <td><strong>{role.role}</strong></td>
              {apiItems.map((a) => (
                <td key={a}><Cell active={role.apiPermissions.includes(a)} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h4 style={{ margin: '0 0 12px' }}>导出权限</h4>
      <table className="data-table permission-matrix">
        <thead>
          <tr>
            <th>角色</th>
            {exportItems.map((e) => (
              <th key={e}>{e}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.role}>
              <td><strong>{role.role}</strong></td>
              {exportItems.map((e) => (
                <td key={e}><Cell active={role.exportPermissions.includes(e)} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
