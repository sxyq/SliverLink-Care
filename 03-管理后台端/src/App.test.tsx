import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const logoutAdmin = vi.fn();
const fetchAdminSession = vi.fn();
const createAdminRouter = vi.fn();

vi.mock('./api/adminApi', () => ({
  fetchAdminSession: (...args: unknown[]) => fetchAdminSession(...args),
  logoutAdmin: (...args: unknown[]) => logoutAdmin(...args),
}));

vi.mock('./routes/router', () => ({
  createAdminRouter: (...args: unknown[]) => createAdminRouter(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    RouterProvider: ({ router }: { router: { loggedIn: boolean; role: string; onLogin: (role: string) => void; onLogout: () => Promise<void> } }) => (
      <div>
        <p data-testid="router-state">{router.loggedIn ? `logged-in:${router.role}` : 'logged-out'}</p>
        <button type="button" onClick={() => router.onLogin('系统管理员')}>
          mock-login
        </button>
        <button type="button" onClick={() => void router.onLogout()}>
          mock-logout
        </button>
      </div>
    ),
  };
});

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchAdminSession.mockReset();
    logoutAdmin.mockReset();
    createAdminRouter.mockReset();
    fetchAdminSession.mockRejectedValue(new Error('not logged in'));
    createAdminRouter.mockImplementation((loggedIn: boolean, onLogin: (role: string) => void, role: string, onLogout: () => Promise<void>) => ({
      loggedIn,
      onLogin,
      onLogout,
      role,
    }));
  });

  it('builds logged-out router by default and updates after login', async () => {
    render(<App />);

    await waitFor(() => {
      expect(createAdminRouter).toHaveBeenCalledWith(false, expect.any(Function), '', expect.any(Function));
      expect(screen.getByTestId('router-state')).toHaveTextContent('logged-out');
    });

    fireEvent.click(screen.getByRole('button', { name: 'mock-login' }));

    await waitFor(() => {
      expect(screen.getByTestId('router-state')).toHaveTextContent('logged-in:系统管理员');
    });
  });

  it('hydrates session from server and reacts to session-cleared events', async () => {
    localStorage.setItem('sl_admin_role', '审计员');
    fetchAdminSession.mockResolvedValue({ loggedIn: true, role: '审计员', account: 'admin' });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('router-state')).toHaveTextContent('logged-in:审计员');
    });

    act(() => {
      localStorage.removeItem('sl_admin_role');
      window.dispatchEvent(new CustomEvent('sl-admin-session-cleared'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('router-state')).toHaveTextContent('logged-out');
    });
  });

  it('clears session after logout', async () => {
    localStorage.setItem('sl_admin_role', '系统管理员');
    fetchAdminSession.mockResolvedValue({ loggedIn: true, role: '系统管理员', account: 'admin' });
    logoutAdmin.mockResolvedValue(undefined);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('router-state')).toHaveTextContent('logged-in:系统管理员');
    });

    fireEvent.click(screen.getByRole('button', { name: 'mock-logout' }));

    await waitFor(() => {
      expect(logoutAdmin).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('router-state')).toHaveTextContent('logged-out');
    });
  });
});
