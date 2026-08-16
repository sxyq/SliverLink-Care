import { useCallback, useState } from 'react';

import { ApiMessageError, getErrorMessage } from '@shared-i18n/messages';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function normalizeLocalizedError(error: unknown, t: Translate, fallbackKey: string): ApiMessageError {
  if (error instanceof ApiMessageError) return error;
  return new ApiMessageError(t(fallbackKey), fallbackKey);
}

export function useLocalizedError(t: Translate, defaultFallbackKey = 'errors.requestFailed') {
  const [error, setStoredError] = useState<unknown>(null);
  const errorText = error == null ? '' : getErrorMessage(error, t, defaultFallbackKey);

  const clearError = useCallback(() => {
    setStoredError(null);
  }, []);

  const setError = useCallback((nextError: unknown, fallbackKey = defaultFallbackKey) => {
    setStoredError(normalizeLocalizedError(nextError, t, fallbackKey));
  }, [defaultFallbackKey, t]);

  const setErrorKey = useCallback((key: string) => {
    setStoredError(new ApiMessageError(t(key), key));
  }, [t]);

  return { clearError, errorText, setError, setErrorKey };
}
