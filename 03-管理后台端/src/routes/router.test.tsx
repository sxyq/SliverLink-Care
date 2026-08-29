import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminRouter } from './router';

vi.mock('../components/Sidebar', () => ({
  Sidebar: ({
    collapsed,
    onLogout,
    onToggleCollapse,
  }: {
    collapsed: boolean;
    onLogout: () => void;
    onToggleCollapse: () => void;
  }) => (
    <div>
      <p data-testid="sidebar-state">{collapsed ? 'collapsed' : 'expanded'}</p>
      <button type="button" onClick={onToggleCollapse}>
        toggle-sidebar
      </button>
      <button type="button" onClick={onLogout}>
        sidebar-logout
      </button>
    </div>
  ),
}));

vi.mock('../components/AdminMessageCenter', () => ({
  AdminMessageCenter: () => <div>AdminMessageCenter</div>,
}));

vi.mock('../components/AdminNoticeCenter', () => ({
  AdminNoticeCenter: () => <div>AdminNoticeCenter</div>,
}));

vi.mock('../pages/AdminLoginPage', () => ({
  AdminLoginPage: ({ onLogin }: { onLogin: (role: string) => void }) => (
    <div>
      <p>AdminLoginPage</p>
      <button type="button" onClick={() => onLogin('系统管理员')}>
        login-as-admin
      </button>
    </div>
  ),
}));

vi.mock('../pages/DashboardPage', () => ({
  DashboardPage: () => <div>DashboardPage</div>,
}));

vi.mock('../pages/ElderArchivePage', () => ({
  ElderArchivePage: () => <div>ElderArchivePage</div>,
}));

vi.mock('../pages/MedicationManagePage', () => ({
  MedicationManagePage: () => <div>MedicationManagePage</div>,
}));

vi.mock('../pages/ScaleManagePage', () => ({
  ScaleManagePage: () => <div>ScaleManagePage</div>,
}));

vi.mock('../pages/QrCodeManagePage', () => ({
  QrCodeManagePage: () => <div>QrCodeManagePage</div>,
}));

vi.mock('../pages/VolunteerManagePage', () => ({
  VolunteerManagePage: () => <div>VolunteerManagePage</div>,
}));

vi.mock('../pages/RbacPage', () => ({
  RbacPage: () => <div>RbacPage</div>,
}));

vi.mock('../pages/AuditLogPage', () => ({
  AuditLogPage: ({ category }: { category: string }) => <div>AuditLogPage:{category}</div>,
}));

vi.mock('../pages/InvitationManagePage', () => ({
  InvitationManagePage: () => <div>InvitationManagePage</div>,
}));

vi.mock('../pages/FamilyBindingManagePage', () => ({
  FamilyBindingManagePage: () => <div>FamilyBindingManagePage</div>,
}));

vi.mock('../pages/SmsRelayManagePage', () => ({
  SmsRelayManagePage: () => <div>SmsRelayManagePage</div>,
}));

describe('createAdminRouter', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('redirects logged-out users to login page', async () => {
    const router = createAdminRouter(false, vi.fn(), '', vi.fn());

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('AdminLoginPage')).toBeInTheDocument();
  });

  it('renders dashboard layout for logged-in admin', async () => {
    const router = createAdminRouter(true, vi.fn(), '系统管理员', vi.fn());

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('DashboardPage')).toBeInTheDocument();
    expect(screen.getByText('AdminNoticeCenter')).toBeInTheDocument();
    expect(screen.getByText('重庆医科大学护理学院 空巢养老团')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-state')).toHaveTextContent('expanded');
  });

  it('redirects disallowed routes back to dashboard', async () => {
    window.history.pushState({}, '', '/qrcodes');
    const router = createAdminRouter(true, vi.fn(), '审计员', vi.fn());

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('DashboardPage')).toBeInTheDocument();
    expect(screen.queryByText('QrCodeManagePage')).not.toBeInTheDocument();
  });

  it('redirects audit root to admin audit page', async () => {
    window.history.pushState({}, '', '/audit');
    const router = createAdminRouter(true, vi.fn(), '系统管理员', vi.fn());

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('AuditLogPage:admin')).toBeInTheDocument();
  });

  it('persists sidebar collapsed state and forwards logout', async () => {
    const onLogout = vi.fn();
    const router = createAdminRouter(true, vi.fn(), '系统管理员', onLogout);

    render(<RouterProvider router={router} />);

    fireEvent.click(await screen.findByRole('button', { name: 'toggle-sidebar' }));
    await waitFor(() => {
      expect(localStorage.getItem('sl_admin_sidebar_collapsed_v1')).toBe('1');
      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('collapsed');
    });

    fireEvent.click(screen.getByRole('button', { name: 'sidebar-logout' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
