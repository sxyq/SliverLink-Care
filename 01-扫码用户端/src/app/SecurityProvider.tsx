import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

interface SecurityContextValue {
  verified: boolean;
  verifiedSessionId: string;
  verifiedElderId: string;
  verifiedUntil: number | null;
  setVerified: (v: boolean) => void;
  verify: (sessionId: string, elderId?: string) => void;
  clearVerification: () => void;
}

const AUTH_TTL_MS = 20 * 60 * 1000;

const SecurityContext = createContext<SecurityContextValue>({
  verified: false,
  verifiedSessionId: '',
  verifiedElderId: '',
  verifiedUntil: null,
  setVerified: () => {},
  verify: () => {},
  clearVerification: () => {},
});

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [verified, setVerifiedState] = useState(false);
  const [verifiedSessionId, setVerifiedSessionId] = useState('');
  const [verifiedElderId, setVerifiedElderId] = useState('');
  const [verifiedUntil, setVerifiedUntil] = useState<number | null>(null);
  const expiryTimerRef = useRef<number | null>(null);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current) {
      window.clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const clearVerification = useCallback(() => {
    clearExpiryTimer();
    setVerifiedState(false);
    setVerifiedSessionId('');
    setVerifiedElderId('');
    setVerifiedUntil(null);
  }, [clearExpiryTimer]);

  const armExpiryTimer = useCallback(
    (nextVerifiedUntil: number) => {
      clearExpiryTimer();
      const remaining = nextVerifiedUntil - Date.now();
      if (remaining <= 0) {
        clearVerification();
        return;
      }
      expiryTimerRef.current = window.setTimeout(() => {
        clearVerification();
      }, remaining);
    },
    [clearExpiryTimer, clearVerification],
  );

  useEffect(() => {
    if (!verified) {
      setVerifiedSessionId('');
      setVerifiedElderId('');
      setVerifiedUntil(null);
      return;
    }
    if (verified && verifiedUntil) {
      armExpiryTimer(verifiedUntil);
    }
    return () => {
      clearExpiryTimer();
    };
  }, [armExpiryTimer, clearExpiryTimer, verified, verifiedUntil]);

  const setVerified = useCallback((nextVerified: boolean) => {
    setVerifiedState(nextVerified);
    if (!nextVerified) {
      clearVerification();
      return;
    }
    const nextVerifiedUntil = Date.now() + AUTH_TTL_MS;
    setVerifiedUntil(nextVerifiedUntil);
    armExpiryTimer(nextVerifiedUntil);
  }, [armExpiryTimer, clearVerification]);

  const verify = useCallback((sessionId: string, elderId = '') => {
    const nextVerifiedUntil = Date.now() + AUTH_TTL_MS;
    setVerifiedState(true);
    setVerifiedSessionId(sessionId);
    setVerifiedElderId(elderId);
    setVerifiedUntil(nextVerifiedUntil);
    armExpiryTimer(nextVerifiedUntil);
  }, [armExpiryTimer]);

  return (
    <SecurityContext.Provider value={{ verified, verifiedSessionId, verifiedElderId, verifiedUntil, setVerified, verify, clearVerification }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  return useContext(SecurityContext);
}
