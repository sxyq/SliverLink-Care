import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { readQrToken } from '../utils/qrToken';

interface SecurityContextValue {
  verified: boolean;
  verifiedSessionId: string;
  verifiedElderId: string;
  verifiedUntil: number | null;
  setVerified: (v: boolean) => void;
  verify: (sessionId: string, elderId?: string) => void;
  clearVerification: () => void;
}

const VERIFIED_KEY = 'silverlink.scan.verified';
const VERIFIED_SESSION_KEY = 'silverlink.scan.verifiedSessionId';
const VERIFIED_ELDER_KEY = 'silverlink.scan.verifiedElderId';
const VERIFIED_UNTIL_KEY = 'silverlink.scan.verifiedUntil';
const VERIFIED_QR_TOKEN_KEY = 'silverlink.scan.verifiedQrToken';
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
  const currentQrToken = readQrToken() || '';
  const [verified, setVerifiedState] = useState(() => {
    const verifiedUntil = Number(window.sessionStorage.getItem(VERIFIED_UNTIL_KEY) || 0);
    const verifiedQrToken = window.sessionStorage.getItem(VERIFIED_QR_TOKEN_KEY) || '';
    return window.sessionStorage.getItem(VERIFIED_KEY) === '1'
      && verifiedUntil > Date.now()
      && !!currentQrToken
      && verifiedQrToken === currentQrToken;
  });
  const [verifiedSessionId, setVerifiedSessionId] = useState(() => {
    const verifiedQrToken = window.sessionStorage.getItem(VERIFIED_QR_TOKEN_KEY) || '';
    return verifiedQrToken === currentQrToken ? window.sessionStorage.getItem(VERIFIED_SESSION_KEY) || '' : '';
  });
  const [verifiedElderId, setVerifiedElderId] = useState(() => {
    const verifiedQrToken = window.sessionStorage.getItem(VERIFIED_QR_TOKEN_KEY) || '';
    return verifiedQrToken === currentQrToken ? window.sessionStorage.getItem(VERIFIED_ELDER_KEY) || '' : '';
  });
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
    setVerifiedElderId('');
    setVerifiedUntil(null);
    window.sessionStorage.removeItem(VERIFIED_KEY);
    window.sessionStorage.removeItem(VERIFIED_SESSION_KEY);
    window.sessionStorage.removeItem(VERIFIED_ELDER_KEY);
    window.sessionStorage.removeItem(VERIFIED_UNTIL_KEY);
    window.sessionStorage.removeItem(VERIFIED_QR_TOKEN_KEY);
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
      window.sessionStorage.removeItem(VERIFIED_KEY);
      window.sessionStorage.removeItem(VERIFIED_SESSION_KEY);
      window.sessionStorage.removeItem(VERIFIED_ELDER_KEY);
      window.sessionStorage.removeItem(VERIFIED_UNTIL_KEY);
      window.sessionStorage.removeItem(VERIFIED_QR_TOKEN_KEY);
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
    const nextQrToken = readQrToken() || '';
    setVerifiedUntil(nextVerifiedUntil);
    window.sessionStorage.setItem(VERIFIED_KEY, '1');
    window.sessionStorage.setItem(VERIFIED_UNTIL_KEY, String(nextVerifiedUntil));
    if (nextQrToken) {
      window.sessionStorage.setItem(VERIFIED_QR_TOKEN_KEY, nextQrToken);
    }
    armExpiryTimer(nextVerifiedUntil);
  }, [armExpiryTimer, clearVerification]);

  const verify = useCallback((sessionId: string, elderId = '') => {
    const nextVerifiedUntil = Date.now() + AUTH_TTL_MS;
    const nextQrToken = readQrToken() || '';
    setVerifiedState(true);
    setVerifiedSessionId(sessionId);
    setVerifiedElderId(elderId);
    setVerifiedUntil(nextVerifiedUntil);
    window.sessionStorage.setItem(VERIFIED_KEY, '1');
    window.sessionStorage.setItem(VERIFIED_SESSION_KEY, sessionId);
    if (elderId) {
      window.sessionStorage.setItem(VERIFIED_ELDER_KEY, elderId);
    } else {
      window.sessionStorage.removeItem(VERIFIED_ELDER_KEY);
    }
    window.sessionStorage.setItem(VERIFIED_UNTIL_KEY, String(nextVerifiedUntil));
    if (nextQrToken) {
      window.sessionStorage.setItem(VERIFIED_QR_TOKEN_KEY, nextQrToken);
    }
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
