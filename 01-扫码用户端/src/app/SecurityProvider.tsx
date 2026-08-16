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

const AUTH_TTL_MS = 20 * 60 * 1000;

const STORAGE_KEYS = {
  verified: 'silverlink.scan.verified',
  sessionId: 'silverlink.scan.verifiedSessionId',
  elderId: 'silverlink.scan.verifiedElderId',
  verifiedUntil: 'silverlink.scan.verifiedUntil',
  qrToken: 'silverlink.scan.verifiedQrToken',
} as const;

interface StoredVerification {
  sessionId: string;
  elderId: string;
  verifiedUntil: number;
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function clearStoredVerification() {
  const storage = getSessionStorage();
  if (!storage) return;
  Object.values(STORAGE_KEYS).forEach((key) => storage.removeItem(key));
}

function readStoredVerification(): StoredVerification | null {
  const storage = getSessionStorage();
  if (!storage || storage.getItem(STORAGE_KEYS.verified) !== '1') return null;

  const verifiedUntil = Number(storage.getItem(STORAGE_KEYS.verifiedUntil) || 0);
  const storedQrToken = storage.getItem(STORAGE_KEYS.qrToken) || '';
  const currentQrToken = readQrToken() || '';
  if (!verifiedUntil || verifiedUntil <= Date.now() || !currentQrToken || storedQrToken !== currentQrToken) {
    clearStoredVerification();
    return null;
  }

  return {
    sessionId: storage.getItem(STORAGE_KEYS.sessionId) || '',
    elderId: storage.getItem(STORAGE_KEYS.elderId) || '',
    verifiedUntil,
  };
}

function persistVerification(sessionId: string, elderId: string, verifiedUntil: number) {
  const storage = getSessionStorage();
  if (!storage) return;

  storage.setItem(STORAGE_KEYS.verified, '1');
  storage.setItem(STORAGE_KEYS.verifiedUntil, String(verifiedUntil));
  if (sessionId) storage.setItem(STORAGE_KEYS.sessionId, sessionId);
  else storage.removeItem(STORAGE_KEYS.sessionId);
  if (elderId) storage.setItem(STORAGE_KEYS.elderId, elderId);
  else storage.removeItem(STORAGE_KEYS.elderId);

  const currentQrToken = readQrToken() || '';
  if (currentQrToken) storage.setItem(STORAGE_KEYS.qrToken, currentQrToken);
  else storage.removeItem(STORAGE_KEYS.qrToken);
}

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
  const [initialVerification] = useState<StoredVerification | null>(() => readStoredVerification());
  const [verified, setVerifiedState] = useState(Boolean(initialVerification));
  const [verifiedSessionId, setVerifiedSessionId] = useState(initialVerification?.sessionId || '');
  const [verifiedElderId, setVerifiedElderId] = useState(initialVerification?.elderId || '');
  const [verifiedUntil, setVerifiedUntil] = useState<number | null>(initialVerification?.verifiedUntil || null);
  const expiryTimerRef = useRef<number | null>(null);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current) {
      window.clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const clearVerification = useCallback(() => {
    clearExpiryTimer();
    clearStoredVerification();
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
    if (!nextVerified) {
      clearVerification();
      return;
    }
    const nextVerifiedUntil = Date.now() + AUTH_TTL_MS;
    persistVerification('', '', nextVerifiedUntil);
    setVerifiedUntil(nextVerifiedUntil);
    setVerifiedSessionId('');
    setVerifiedElderId('');
    setVerifiedState(true);
    armExpiryTimer(nextVerifiedUntil);
  }, [armExpiryTimer, clearVerification]);

  const verify = useCallback((sessionId: string, elderId = '') => {
    const nextVerifiedUntil = Date.now() + AUTH_TTL_MS;
    persistVerification(sessionId, elderId, nextVerifiedUntil);
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
