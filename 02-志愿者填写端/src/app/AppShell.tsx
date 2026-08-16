import React from 'react';
import { useI18n } from '../i18n';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { t } = useI18n();
  return (
    <main className="sl-stage">
      <section className="sl-app-shell">
        <div className="sl-phone-shell">
          <div className="sl-phone-content">
            {children}
            <div className="sl-attribution">{t('common.attribution')}</div>
          </div>
        </div>
      </section>
    </main>
  );
};
