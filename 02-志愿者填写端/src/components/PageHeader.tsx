import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  leadingAction?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, onBack, leadingAction, action }: PageHeaderProps) {
  return (
    <header className="sl-page-header-bar">
      {leadingAction ? (
        <div className="sl-page-header-action">{leadingAction}</div>
      ) : onBack ? (
        <button type="button" className="sl-page-header-icon" onClick={onBack} aria-label="返回">
          <ArrowLeft size={20} />
        </button>
      ) : (
        <span className="sl-page-header-placeholder" />
      )}

      <div className="sl-page-header-copy">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>

      {action ? <div className="sl-page-header-action">{action}</div> : <span className="sl-page-header-placeholder" />}
    </header>
  );
}
