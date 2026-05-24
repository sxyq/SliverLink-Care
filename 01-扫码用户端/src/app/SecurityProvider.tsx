import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

interface SecurityContextValue {
  verified: boolean;
  verifiedSessionId: string;
  verifiedUntil: number | null;
  setVerified: (v: boolean) => void;
  verify: (sessionId: string) => void;
  clearVerification: () => void;
}

const VERIFIED_KEY = 'silverlink.scan.verified';
const VERIFIED_SESSION_KEY = 'silverlink.scan.verifiedSessionId';
const VERIFIED_UNTIL_KEY = 'silverlink.scan.verifiedUntil';
const AUTH_TTL_MS = 20 * 60 * 1000;

const SecurityContext = createContext<SecurityContextValue>({
  verified: false,
  verifiedSessionId: '',
  verifiedUntil: null,
  setVerified: () => {},
  verify: () => {},
  clearVerification: () => {},
});

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [verified, setVerifiedState] = useState(() => {
    const verifiedUntil = Number(window.sessionStorage.getItem(VERIFIED_UNTIL_KEY) || 0);
    return window.sessionStorage.getItem(VERIFIED_KEY) === '1' && verifiedUntil > Date.now();
  });
  const [verifiedSessionId, setVerifiedSessionId] = useState(() => window.sessionStorage.getItem(VERIFIED_SESSION_KEY) || '');
  const [verifiedUntil, setVerifiedUntil] = useState<number | null>(() => {
    const raw = Number(window.sessionStorage.getItem(VERIFIED_UNTIL_KEY) || 0);
    return raw > Date.now() ? raw : null;
  });
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
    setVerifiedUntil(null);
    window.sessionStorage.removeItem(VERIFIED_KEY);
    window.sessionStorage.removeItem(VERIFIED_SESSION_KEY);
    window.sessionStorage.removeItem(VERIFIED_UNTIL_KEY);
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
      setVerifiedUntil(null);
      window.sessionStorage.removeItem(VERIFIED_KEY);
      window.sessionStorage.removeItem(VERIFIED_SESSION_KEY);
      window.sessionStorage.removeItem(VERIFIED_UNTIL_KEY);
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
    window.sessionStorage.setItem(VERIFIED_KEY, '1');
    window.sessionStorage.setItem(VERIFIED_UNTIL_KEY, String(nextVerifiedUntil));
    armExpiryTimer(nextVerifiedUntil);
  }, [armExpiryTimer, clearVerification]);

  const verify = useCallback((sessionId: string) => {
    const nextVerifiedUntil = Date.now() + AUTH_TTL_MS;
    setVerifiedState(true);
    setVerifiedSessionId(sessionId);
    setVerifiedUntil(nextVerifiedUntil);
    window.sessionStorage.setItem(VERIFIED_KEY, '1');
    window.sessionStorage.setItem(VERIFIED_SESSION_KEY, sessionId);
    window.sessionStorage.setItem(VERIFIED_UNTIL_KEY, String(nextVerifiedUntil));
    armExpiryTimer(nextVerifiedUntil);
  }, [armExpiryTimer]);

  return (
    <SecurityContext.Provider value={{ verified, verifiedSessionId, verifiedUntil, setVerified, verify, clearVerification }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  return useContext(SecurityContext);
}
