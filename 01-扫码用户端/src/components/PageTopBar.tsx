import { Ellipsis, House, ChevronLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';

interface PageTopBarProps {
  title: string;
  leading?: 'home' | 'back';
  trailing?: 'menu' | 'verified';
  trailingLabel?: string;
  trailingAriaLabel?: string;
  onTrailingClick?: () => void;
}

export function PageTopBar({
  title,
  leading = 'back',
  trailing = 'menu',
  trailingLabel,
  trailingAriaLabel,
  onTrailingClick,
}: PageTopBarProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const hasTrailingAction = Boolean(trailingLabel);

  function handleLeadingClick() {
    if (leading === 'home') {
      navigate('/');
      return;
    }
    navigate(-1);
  }

  return (
    <header className={`sl-topbar has-language-safe-area${hasTrailingAction ? ' has-trailing-action' : ''}`}>
      <button
        type="button"
        className={`sl-topbar-icon ${leading === 'back' ? 'is-leading-back' : ''}`}
        aria-label={leading === 'home' ? t('common.backHome') : t('common.backPrevious')}
        onClick={handleLeadingClick}
      >
        {leading === 'home' ? <House size={20} strokeWidth={2.2} /> : <ChevronLeft size={22} strokeWidth={2.2} />}
      </button>

      <h1>{title}</h1>

      {hasTrailingAction ? (
        <button
          type="button"
          className="sl-topbar-switch"
          aria-label={trailingAriaLabel || trailingLabel}
          onClick={onTrailingClick}
        >
          {trailingLabel}
        </button>
      ) : (
        <button
          type="button"
          className={`sl-topbar-icon ${trailing === 'verified' ? 'is-verified' : ''}`}
          aria-label={trailing === 'verified' ? t('common.verificationEnabled') : t('common.moreActions')}
        >
          {trailing === 'verified' ? <ShieldCheck size={20} strokeWidth={2.2} /> : <Ellipsis size={20} strokeWidth={2.2} />}
        </button>
      )}
    </header>
  );
}
