import { useEffect, useState, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ElderArchivePage } from '../pages/ElderArchivePage';
import { MedicationManagePage } from '../pages/MedicationManagePage';
import { ScaleManagePage } from '../pages/ScaleManagePage';
import { QrCodeManagePage } from '../pages/QrCodeManagePage';
import { VolunteerManagePage } from '../pages/VolunteerManagePage';
import { RbacPage } from '../pages/RbacPage';
import { AuditLogPage } from '../pages/AuditLogPage';
import { InvitationManagePage } from '../pages/InvitationManagePage';
import { FamilyBindingManagePage } from '../pages/FamilyBindingManagePage';
import { SmsRelayManagePage } from '../pages/SmsRelayManagePage';
import { AdminMessageCenter } from '../components/AdminMessageCenter';
import { hasMenuPermission } from '../features/rbac/permissionGuard';
import { defaultRoles } from '../features/rbac/rolePermissionModel';

const routeMenuMap: Record<string, string> = {
  elders: '老人档案',
  medications: '用药信息',
  scales: '量表管理',
  qrcodes: '二维码管理',
  volunteers: '志愿者管理',
  invitations: '邀请管理',
  'family-bindings': '家属绑定',
  'sms-relay': '短信中转',
  rbac: '角色权限',
  audit: '操作日志',
};

const SIDEBAR_COLLAPSED_KEY = 'sl_admin_sidebar_collapsed_v1';

function AdminLayout({ role, onLogout }: { role: string; onLogout: () => void }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      // ignore persistence failures
    }
  }, [collapsed]);

  return (
    <div className={`admin-shell${collapsed ? ' admin-shell--sidebar-collapsed' : ''}`}>
      <Sidebar role={role} onLogout={onLogout} collapsed={collapsed} onToggleCollapse={() => setCollapsed((prev) => !prev)} />
      <section className="workspace">
        <Outlet />
        <footer className="admin-footer">重庆医科大学护理学院 银龄守护团队</footer>
      </section>
    </div>
  );
}

function RequireMenuPermission({ role, menuKey, children }: { role: string; menuKey: string; children: ReactNode }) {
  const rolePerm = defaultRoles.find((item) => item.role === role);
  if (!rolePerm || !hasMenuPermission(rolePerm, menuKey)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function createAdminRouter(isLoggedIn: boolean, onLogin: (role: string) => void, role: string, onLogout: () => void) {
  const basename = import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '');

  return createBrowserRouter([
    {
      path: '/login',
      element: isLoggedIn ? <Navigate to="/" replace /> : <AdminLoginPage onLogin={onLogin} />,
    },
    {
      path: '/',
      element: isLoggedIn ? <AdminLayout role={role} onLogout={onLogout} /> : <Navigate to="/login" replace />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'elders', element: <RequireMenuPermission role={role} menuKey={routeMenuMap.elders}><ElderArchivePage /></RequireMenuPermission> },
        { path: 'medications', element: <RequireMenuPermission role={role} menuKey={routeMenuMap.medications}><MedicationManagePage /></RequireMenuPermission> },
        { path: 'scales', element: <RequireMenuPermission role={role} menuKey={routeMenuMap.scales}><ScaleManagePage /></RequireMenuPermission> },
        { path: 'qrcodes', element: <RequireMenuPermission role={role} menuKey={routeMenuMap.qrcodes}><QrCodeManagePage /></RequireMenuPermission> },
        { path: 'volunteers', element: <RequireMenuPermission role={role} menuKey={routeMenuMap.volunteers}><VolunteerManagePage /></RequireMenuPermission> },
        { path: 'invitations', element: <RequireMenuPermission role={role} menuKey={routeMenuMap.invitations}><InvitationManagePage /></RequireMenuPermission> },
        { path: 'family-bindings', element: <RequireMenuPermission role={role} menuKey={routeMenuMap['family-bindings']}><FamilyBindingManagePage /></RequireMenuPermission> },
        { path: 'sms-relay', element: <RequireMenuPermission role={role} menuKey={routeMenuMap['sms-relay']}><SmsRelayManagePage /></RequireMenuPermission> },
        { path: 'rbac', element: <RequireMenuPermission role={role} menuKey={routeMenuMap.rbac}><RbacPage /></RequireMenuPermission> },
        { path: 'audit', element: <Navigate to="/audit/admin" replace /> },
        { path: 'audit/admin', element: <RequireMenuPermission role={role} menuKey={routeMenuMap.audit}><AuditLogPage category="admin" /></RequireMenuPermission> },
        { path: 'audit/medical', element: <RequireMenuPermission role={role} menuKey={routeMenuMap.audit}><AuditLogPage category="medical" /></RequireMenuPermission> },
        { path: 'audit/family', element: <RequireMenuPermission role={role} menuKey={routeMenuMap.audit}><AuditLogPage category="family" /></RequireMenuPermission> },
        { path: 'audit/visitor', element: <RequireMenuPermission role={role} menuKey={routeMenuMap.audit}><AuditLogPage category="visitor" /></RequireMenuPermission> },
      ],
    },
  ], { basename });
}
