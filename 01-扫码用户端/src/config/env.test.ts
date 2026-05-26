import { afterEach, describe, expect, it, vi } from 'vitest';

describe('env config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('exports API_BASE_URL from VITE_API_BASE_URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    const { API_BASE_URL } = await import('./env');
    expect(API_BASE_URL).toBe('https://api.example.com');
  });

  it('falls back to empty string when VITE_API_BASE_URL is not set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const { API_BASE_URL } = await import('./env');
    expect(API_BASE_URL).toBe('');
  });

  it('exports DEV_DEFAULT_QR_TOKEN from VITE_DEFAULT_QR_TOKEN', async () => {
    vi.stubEnv('VITE_DEFAULT_QR_TOKEN', 'test-qr-token');
    const { DEV_DEFAULT_QR_TOKEN } = await import('./env');
    expect(DEV_DEFAULT_QR_TOKEN).toBe('test-qr-token');
  });

  it('exports DEV_FIXED_SMS_CODE from VITE_FIXED_SMS_CODE', async () => {
    vi.stubEnv('VITE_FIXED_SMS_CODE', '123456');
    const { DEV_FIXED_SMS_CODE } = await import('./env');
    expect(DEV_FIXED_SMS_CODE).toBe('123456');
  });

  it('falls back to empty string when VITE_FIXED_SMS_CODE is not set', async () => {
    vi.stubEnv('VITE_FIXED_SMS_CODE', '');
    const { DEV_FIXED_SMS_CODE } = await import('./env');
    expect(DEV_FIXED_SMS_CODE).toBe('');
  });

  it('exports DEV_SMS_RELAY_RECEIVER_PHONE with default value', async () => {
    vi.stubEnv('VITE_SMS_RELAY_RECEIVER_PHONE', '');
    const { DEV_SMS_RELAY_RECEIVER_PHONE } = await import('./env');
    expect(DEV_SMS_RELAY_RECEIVER_PHONE).toBe('13800001111');
  });

  it('exports DEV_SMS_RELAY_PREFIX with default value', async () => {
    vi.stubEnv('VITE_SMS_RELAY_PREFIX', '');
    const { DEV_SMS_RELAY_PREFIX } = await import('./env');
    expect(DEV_SMS_RELAY_PREFIX).toBe('SL');
  });

  it('ALLOW_LOCAL_VERIFICATION_FALLBACK is true when DEV is true and DEV_FIXED_SMS_CODE is set', async () => {
    vi.stubEnv('VITE_FIXED_SMS_CODE', '123456');
    const mod = await import('./env');
    expect(mod.ALLOW_LOCAL_VERIFICATION_FALLBACK).toBe(true);
  });

  it('ALLOW_LOCAL_VERIFICATION_FALLBACK is false when DEV_FIXED_SMS_CODE is empty', async () => {
    vi.stubEnv('VITE_FIXED_SMS_CODE', '');
    const mod = await import('./env');
    expect(mod.ALLOW_LOCAL_VERIFICATION_FALLBACK).toBe(false);
  });
});
