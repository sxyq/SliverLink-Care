export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const DEV_DEFAULT_QR_TOKEN = import.meta.env.VITE_DEFAULT_QR_TOKEN || '';
export const DEV_FIXED_SMS_CODE = import.meta.env.VITE_FIXED_SMS_CODE || '';
export const DEV_SMS_RELAY_RECEIVER_PHONE = import.meta.env.VITE_SMS_RELAY_RECEIVER_PHONE || '13800001111';
export const DEV_SMS_RELAY_PREFIX = import.meta.env.VITE_SMS_RELAY_PREFIX || 'SL';
export const ALLOW_LOCAL_VERIFICATION_FALLBACK = import.meta.env.DEV && Boolean(DEV_FIXED_SMS_CODE);
