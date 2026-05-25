import { useEffect, useState } from 'react';
import { DEV_DEFAULT_QR_TOKEN } from '../config/env';
import { readQrToken, isValidQrToken } from '../utils/qrToken';

export function useQrToken() {
  const [href, setHref] = useState(() => window.location.href);

  useEffect(() => {
    const sync = () => setHref(window.location.href);
    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = function pushState(...args) {
      originalPushState(...args);
      sync();
    };
    window.history.replaceState = function replaceState(...args) {
      originalReplaceState(...args);
      sync();
    };

    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  {
    const token = readQrToken() || DEV_DEFAULT_QR_TOKEN || null;
    return {
      href,
      token,
      isValid: token ? isValidQrToken(token) : false,
    };
  }
}
