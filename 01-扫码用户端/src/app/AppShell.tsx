import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppAttribution } from '../components/AppAttribution';

export function AppShell() {
  return (
    <div className="sl-shell">
      <div className="sl-device-frame">
        <Outlet />
        <AppAttribution />
      </div>
    </div>
  );
}
