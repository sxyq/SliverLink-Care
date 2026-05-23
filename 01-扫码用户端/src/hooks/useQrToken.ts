import { useMemo } from 'react';
import { DEV_DEFAULT_QR_TOKEN } from '../config/env';
import { readQrToken, isValidQrToken } from '../utils/qrToken';

export function useQrToken() {
  return useMemo(() => {
    const token = readQrToken() || DEV_DEFAULT_QR_TOKEN || null;
    return {
      token,
      isValid: token ? isValidQrToken(token) : false,
    };
  }, []);
}
