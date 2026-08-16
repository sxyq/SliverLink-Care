import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '../i18n';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  leadingAction?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, onBack, leadingAction, action }: PageHeaderProps) {
  const { t } = useI18n();
  return (
    <header className="sl-page-header-bar">
      {leadingAction ? (
        <div className="sl-page-header-action">{leadingAction}</div>
      ) : onBack ? (
        <button type="button" className="sl-page-header-icon is-leading-back" onClick={onBack} aria-label={t('common.back')}>
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
