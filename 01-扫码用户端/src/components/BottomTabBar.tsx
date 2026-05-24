import { ClipboardList, FileText, Pill, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSecurity } from '../app/SecurityProvider';

const navItems = [
  { key: 'basic', label: '基本信息', path: '/', icon: UserRound },
  { key: 'health', label: '健康档案', path: '/health', icon: FileText },
  { key: 'medication', label: '主要用药', path: '/medication', icon: Pill },
  { key: 'scale', label: '量表记录', path: '/scale', icon: ClipboardList },
] as const;

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verified } = useSecurity();
  const canOpenSensitiveTabs = verified;

  return (
    <nav className="sl-bottom-nav" aria-label="页面导航">
      {navItems.map((item) => {
        const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
        const Icon = item.icon;
        const disabled = item.path !== '/' && !canOpenSensitiveTabs;
        return (
          <button
            key={item.key}
            type="button"
            className={`sl-bottom-nav-item ${active ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''}`}
            onClick={() => {
              if (disabled) return;
              navigate(item.path);
            }}
            disabled={disabled}
            aria-disabled={disabled}
          >
            <Icon size={20} strokeWidth={2.2} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
