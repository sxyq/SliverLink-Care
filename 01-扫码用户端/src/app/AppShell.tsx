import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppAttribution } from '../components/AppAttribution';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export function AppShell() {
  return (
    <div className="sl-shell">
      <div className="sl-device-frame">
        <LanguageSwitcher />
        <Outlet />
        <AppAttribution />
      </div>
    </div>
  );
}
