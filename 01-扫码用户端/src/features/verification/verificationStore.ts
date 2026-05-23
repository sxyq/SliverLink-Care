import { useState, useCallback, useRef, useEffect } from 'react';

export type VerificationStatus = 'none' | 'pending' | 'verified' | 'expired';

interface VerificationStore {
  status: VerificationStatus;
  countdown: number;
  errorCount: number;
  authorizedUntil: number | null;
  lastError: string;
}

const AUTH_TTL_MS = 10 * 60 * 1000;
const MAX_ERROR_COUNT = 5;

export function useVerificationStore() {
  const [store, setStore] = useState<VerificationStore>({
    status: 'none',
    countdown: 0,
    errorCount: 0,
    authorizedUntil: null,
    lastError: '',
  });

  const timerRef = useRef<number | null>(null);
  const authTimerRef = useRef<number | null>(null);

  const clearCountdown = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearAuthTimer = useCallback(() => {
    if (authTimerRef.current) {
      window.clearTimeout(authTimerRef.current);
      authTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCountdown();
      clearAuthTimer();
    };
  }, [clearCountdown, clearAuthTimer]);

  const startCountdown = useCallback(
    (seconds: number) => {
      clearCountdown();
      setStore((prev) => ({ ...prev, countdown: seconds }));
      timerRef.current = window.setInterval(() => {
        setStore((prev) => {
          if (prev.countdown <= 1) {
            if (timerRef.current) {
              window.clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return { ...prev, countdown: 0 };
          }
          return { ...prev, countdown: prev.countdown - 1 };
        });
      }, 1000);
    },
    [clearCountdown]
  );

  const startAuthTimer = useCallback(() => {
    clearAuthTimer();
    const authorizedUntil = Date.now() + AUTH_TTL_MS;
    setStore((prev) => ({
      ...prev,
      status: 'verified',
      authorizedUntil,
      errorCount: 0,
      lastError: '',
    }));
    authTimerRef.current = window.setTimeout(() => {
      setStore((prev) => ({
        ...prev,
        status: 'expired',
        authorizedUntil: null,
      }));
    }, AUTH_TTL_MS);
  }, [clearAuthTimer]);

  const setPending = useCallback(() => {
    setStore((prev) => ({ ...prev, status: 'pending', lastError: '' }));
  }, []);

  const recordError = useCallback((message: string) => {
    setStore((prev) => {
      const nextErrorCount = prev.errorCount + 1;
      const nextStatus: VerificationStatus =
        nextErrorCount >= MAX_ERROR_COUNT ? 'expired' : prev.status;
      return {
        ...prev,
        status: nextStatus,
        errorCount: nextErrorCount,
        lastError: message,
      };
    });
  }, []);

  const reset = useCallback(() => {
    clearCountdown();
    clearAuthTimer();
    setStore({
      status: 'none',
      countdown: 0,
      errorCount: 0,
      authorizedUntil: null,
      lastError: '',
    });
  }, [clearCountdown, clearAuthTimer]);

  const isAuthorized = store.status === 'verified' && store.authorizedUntil && Date.now() < store.authorizedUntil;

  return {
    ...store,
    isAuthorized,
    startCountdown,
    startAuthTimer,
    setPending,
    recordError,
    reset,
  };
}
