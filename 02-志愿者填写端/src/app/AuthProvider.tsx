import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { clearAuthToken, setAuthToken } from '../api/httpClient';
import { fetchVolunteerProfile } from '../api/volunteerApi';

interface VolunteerProfile {
  account: string;
  name: string;
}

interface AuthContextValue {
  loggedIn: boolean;
  user: VolunteerProfile | null;
  login: (token: string, user?: VolunteerProfile) => void;
  updateUser: (user: VolunteerProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  loggedIn: false,
  user: null,
  login: () => {},
  updateUser: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<VolunteerProfile | null>(null);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchVolunteerProfile()
      .then((profile) => {
        if (cancelled) return;
        setUser({ account: profile.account, name: profile.name });
        setLoggedIn(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoggedIn(false);
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) {
          setHydrating(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((token: string, nextUser?: VolunteerProfile) => {
    setAuthToken(token);
    if (nextUser) {
      setUser(nextUser);
    } else {
      setUser(null);
    }
    setLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    setLoggedIn(false);
  }, []);

  const updateUser = useCallback((nextUser: VolunteerProfile) => {
    setUser(nextUser);
  }, []);

  if (hydrating) {
    return <div className="sl-page loading">正在校验登录状态...</div>;
  }

  return (
    <AuthContext.Provider value={{ loggedIn, user, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
