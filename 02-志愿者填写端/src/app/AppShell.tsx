import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <main className="sl-app-shell">
      <header className="sl-topbar">
        <div>
          <p className="sl-eyebrow"><ShieldCheck size={14} /> 仅显示本人负责老人</p>
          <h1>社区随访填写</h1>
        </div>
      </header>
      {children}
    </main>
  );
};
