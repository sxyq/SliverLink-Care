import React, { createContext, useContext, useState, useCallback } from 'react';
import { setAuthToken, clearAuthToken } from '../api/httpClient';

interface AuthContextValue {
  loggedIn: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  loggedIn: false,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem('sl_token'));

  const login = useCallback((token: string) => {
    setAuthToken(token);
    setLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setLoggedIn(false);
  }, []);

  return (
    <AuthContext.Provider value={{ loggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
