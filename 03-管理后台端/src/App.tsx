import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { logoutAdmin } from './api/adminApi';
import { createAdminRouter } from './routes/router';

export function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem('sl_admin_token'));
  const [role, setRole] = useState(() => localStorage.getItem('sl_admin_role') || '');

  useEffect(() => {
    const token = localStorage.getItem('sl_admin_token');
    const savedRole = localStorage.getItem('sl_admin_role') || '';

    if (!token) {
      setLoggedIn(false);
      setRole('');
      localStorage.removeItem('sl_admin_role');
      return;
    }

    if (!savedRole) {
      setRole('');
    } else if (savedRole !== role) {
      setRole(savedRole);
    }
  }, [role]);

  useEffect(() => {
    function syncSession() {
      const token = localStorage.getItem('sl_admin_token');
      const savedRole = localStorage.getItem('sl_admin_role') || '';
      setLoggedIn(Boolean(token));
      setRole(token ? savedRole : '');
    }

    window.addEventListener('storage', syncSession);
    window.addEventListener('sl-admin-session-cleared', syncSession as EventListener);
    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('sl-admin-session-cleared', syncSession as EventListener);
    };
  }, []);

  function handleLogin(nextRole: string) {
    localStorage.setItem('sl_admin_role', nextRole);
    setRole(nextRole);
    setLoggedIn(true);
  }

  async function handleLogout() {
    await logoutAdmin();
    localStorage.removeItem('sl_admin_token');
    localStorage.removeItem('sl_admin_role');
    setLoggedIn(false);
    setRole('');
  }

  const router = createAdminRouter(loggedIn, handleLogin, role, handleLogout);
  return <RouterProvider router={router} />;
}
