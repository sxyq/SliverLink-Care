import { Ellipsis, House, ChevronLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const hasTrailingAction = Boolean(trailingLabel);

  function handleLeadingClick() {
    if (leading === 'home') {
      navigate('/');
      return;
    }
    navigate(-1);
  }

  return (
    <header className={`sl-topbar${hasTrailingAction ? ' has-trailing-action' : ''}`}>
      <button
        type="button"
        className="sl-topbar-icon"
        aria-label={leading === 'home' ? '返回首页' : '返回上一页'}
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
          aria-label={trailing === 'verified' ? '验证已开启' : '更多操作'}
        >
          {trailing === 'verified' ? <ShieldCheck size={20} strokeWidth={2.2} /> : <Ellipsis size={20} strokeWidth={2.2} />}
        </button>
      )}
    </header>
  );
}
