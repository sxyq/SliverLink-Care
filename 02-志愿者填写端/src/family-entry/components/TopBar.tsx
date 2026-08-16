import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useI18n } from '../../i18n';

interface TopBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function TopBar({ title, showBack = true, onBack }: TopBarProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: 48,
      padding: '0 16px',
      background: 'var(--sl-card-bg)',
      borderBottom: '1px solid var(--sl-border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {showBack && (
        <button
          type="button"
          className="sl-family-topbar-back"
          aria-label={t('common.back')}
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: 4,
            color: 'var(--sl-primary)',
          }}
        >
          <ChevronLeft size={22} />
        </button>
      )}
      <span style={{
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--sl-text)',
          marginInlineEnd: showBack ? 30 : 0,
      }}>
        {title}
      </span>
    </div>
  );
}
