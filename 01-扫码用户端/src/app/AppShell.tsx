import React from 'react';
import { Outlet } from 'react-router-dom';

export function AppShell() {
  return (
    <div className="sl-shell">
      <Outlet />
    </div>
  );
}
