import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  UsersRound,
  QrCode,
  UserCheck,
  Pill,
  ClipboardList,
  ShieldCheck,
  ScrollText,
  LogOut,
  Mail,
  Users,
  Waypoints,
  Stethoscope,
  UserSearch,
  House,
} from 'lucide-react';
import { hasMenuPermission } from '../features/rbac/permissionGuard';
import { defaultRoles } from '../features/rbac/rolePermissionModel';
import type { RolePermission } from '../types';

const allNavItems = [
  { label: '首页概览', path: '/', icon: LayoutDashboard, menuKey: '首页概览' },
  { label: '老人档案', path: '/elders', icon: UsersRound, menuKey: '老人档案' },
  { label: '用药信息', path: '/medications', icon: Pill, menuKey: '用药信息' },
  { label: '量表管理', path: '/scales', icon: ClipboardList, menuKey: '量表管理' },
  { label: '二维码管理', path: '/qrcodes', icon: QrCode, menuKey: '二维码管理' },
  { label: '志愿者管理', path: '/volunteers', icon: UserCheck, menuKey: '志愿者管理' },
  { label: '邀请码管理', path: '/invitations', icon: Mail, menuKey: '邀请管理' },
  { label: '家属绑定', path: '/family-bindings', icon: Users, menuKey: '家属绑定' },
  { label: '短信中转', path: '/sms-relay', icon: Waypoints, menuKey: '短信中转' },
  { label: '角色权限', path: '/rbac', icon: ShieldCheck, menuKey: '角色权限' },
  { label: '管理员操作', path: '/audit/admin', icon: ShieldCheck, menuKey: '操作日志' },
  { label: '医护操作', path: '/audit/medical', icon: Stethoscope, menuKey: '操作日志' },
  { label: '家属操作', path: '/audit/family', icon: House, menuKey: '操作日志' },
  { label: '访问人员记录', path: '/audit/visitor', icon: UserSearch, menuKey: '操作日志' },
];

const navGroups: Array<{ title: string; keys: string[] }> = [
  { title: '系统首页', keys: ['首页概览'] },
  { title: '老人管理', keys: ['老人档案', '用药信息', '量表管理', '二维码管理'] },
  { title: '人员与权限', keys: ['志愿者管理', '邀请码管理', '家属绑定', '短信中转', '角色权限'] },
  { title: '操作日志', keys: ['管理员操作', '医护操作', '家属操作', '访问人员记录'] },
];

interface SidebarProps {
  role: string;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ role, onLogout, collapsed, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate();

  const rolePerm: RolePermission | undefined = defaultRoles.find((item) => item.role === role);
  const navItems = rolePerm
    ? allNavItems.filter((item) => hasMenuPermission(rolePerm, item.menuKey))
    : allNavItems;

  const groupedNavItems = navGroups
    .map((group) => ({
      title: group.title,
      items: navItems.filter((item) => group.keys.includes(item.label)),
    }))
    .filter((group) => group.items.length > 0);

  function handleLogout() {
    onLogout();
    navigate('/login');
  }

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar-header">
        <h1>{collapsed ? '智联' : '智联名牌'}</h1>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          aria-label={collapsed ? '展开导航' : '收起导航'}
          title={collapsed ? '展开导航' : '收起导航'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <nav>
        {groupedNavItems.map((group) => (
          <section key={group.title} className="sidebar-group">
            {!collapsed && <p className="sidebar-group-title">{group.title}</p>}
            <div className="sidebar-group-items">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                >
                  <item.icon size={18} />
                  {!collapsed && item.label}
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button
          onClick={handleLogout}
          className="sidebar-logout"
          title={collapsed ? '退出登录' : undefined}
          aria-label="退出登录"
        >
          <LogOut size={16} />
          {!collapsed && '退出登录'}
        </button>
      </div>
    </aside>
  );
}
