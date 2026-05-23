import React, { createContext, useContext, useState, useCallback } from 'react';

interface SecurityContextValue {
  verified: boolean;
  setVerified: (v: boolean) => void;
  verify: () => void;
}

const SecurityContext = createContext<SecurityContextValue>({
  verified: false,
  setVerified: () => {},
  verify: () => {},
});

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState(false);

  const verify = useCallback(() => setVerified(true), []);

  return (
    <SecurityContext.Provider value={{ verified, setVerified, verify }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  return useContext(SecurityContext);
}
