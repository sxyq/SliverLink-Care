function normalizeEnvValue(value: string | undefined, fallback = '') {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.replace(/\/$/, '');
}

export const API_BASE_URL = normalizeEnvValue(import.meta.env.VITE_API_BASE_URL, '/silverlink-api');
export const DEV_DEFAULT_QR_TOKEN = import.meta.env.VITE_DEFAULT_QR_TOKEN || '';
export const DEV_SMS_RELAY_RECEIVER_PHONE = import.meta.env.VITE_SMS_RELAY_RECEIVER_PHONE || '13800001111';
export const DEV_SMS_RELAY_PREFIX = import.meta.env.VITE_SMS_RELAY_PREFIX || 'SL';
export const DEV_FIXED_SMS_CODE = import.meta.env.VITE_FIXED_SMS_CODE || '';
export const ALLOW_LOCAL_VERIFICATION_FALLBACK = Boolean(import.meta.env.DEV && DEV_FIXED_SMS_CODE);
