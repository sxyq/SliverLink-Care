import React, { createContext, useContext, useState, useCallback } from 'react';
import { setAuthToken, clearAuthToken } from '../api/httpClient';

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
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem('sl_token'));
  const [user, setUser] = useState<VolunteerProfile | null>(() => {
    try {
      const raw = localStorage.getItem('sl_user');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as VolunteerProfile;
      return parsed?.account ? parsed : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((token: string, nextUser?: VolunteerProfile) => {
    setAuthToken(token);
    if (nextUser) {
      setUser(nextUser);
      localStorage.setItem('sl_user', JSON.stringify(nextUser));
    }
    setLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    localStorage.removeItem('sl_user');
    setLoggedIn(false);
  }, []);

  const updateUser = useCallback((nextUser: VolunteerProfile) => {
    setUser(nextUser);
    localStorage.setItem('sl_user', JSON.stringify(nextUser));
  }, []);

  return (
    <AuthContext.Provider value={{ loggedIn, user, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
