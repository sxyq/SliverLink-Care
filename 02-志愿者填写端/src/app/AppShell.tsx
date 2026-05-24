import React from 'react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <main className="sl-stage">
      <section className="sl-app-shell">
        <div className="sl-phone-shell">
          <div className="sl-phone-content">
            {children}
            <div className="sl-attribution">重庆医科大学护理学院 银龄守护团队</div>
          </div>
        </div>
      </section>
    </main>
  );
};
