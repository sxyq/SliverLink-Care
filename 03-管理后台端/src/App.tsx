import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { fetchAdminSession, logoutAdmin } from './api/adminApi';
import { createAdminRouter } from './routes/router';

export function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState('');
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function syncSessionFromServer() {
      try {
        const session = await fetchAdminSession();
        if (cancelled) return;
        setLoggedIn(session.loggedIn);
        setRole(session.role);
      } catch {
        if (cancelled) return;
        setLoggedIn(false);
        setRole('');
      } finally {
        if (!cancelled) {
          setHydrating(false);
        }
      }
    }

    function handleSessionCleared() {
      setLoggedIn(false);
      setRole('');
      setHydrating(false);
    }

    void syncSessionFromServer();
    window.addEventListener('sl-admin-session-cleared', handleSessionCleared as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener('sl-admin-session-cleared', handleSessionCleared as EventListener);
    };
  }, []);

  function handleLogin(nextRole: string) {
    setRole(nextRole);
    setLoggedIn(true);
  }

  async function handleLogout() {
    await logoutAdmin();
    setLoggedIn(false);
    setRole('');
  }

  if (hydrating) {
    return <div className="admin-shell-loading">正在校验管理员会话...</div>;
  }

  const router = createAdminRouter(loggedIn, handleLogin, role, handleLogout);
  return <RouterProvider router={router} />;
}
