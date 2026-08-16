import { ClipboardList, FileText, Pill, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSecurity } from '../app/SecurityProvider';
import { useI18n } from '../i18n';

const navItems = [
  { key: 'basic', labelKey: 'scan.basicInfo', path: '/', icon: UserRound },
  { key: 'health', labelKey: 'scan.healthArchive', path: '/health', icon: FileText },
  { key: 'medication', labelKey: 'scan.viewMedicationRecords', path: '/medication', icon: Pill },
  { key: 'scale', labelKey: 'scan.scaleRecords', path: '/scale', icon: ClipboardList },
] as const;

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verified } = useSecurity();
  const { t } = useI18n();
  const canOpenSensitiveTabs = verified;

  return (
    <nav className="sl-bottom-nav" aria-label={t('common.home')}>
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
            <span>{t(item.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
