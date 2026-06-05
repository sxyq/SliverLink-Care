import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  confirmRelayVerificationSent,
  getRelayVerificationStatus,
  startRelayVerification,
  verifyIdentityAccess,
} from './smsApi';

function mockFetchData(data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 200, data })));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const envMockBase = {
  API_BASE_URL: '',
  DEV_DEFAULT_QR_TOKEN: '',
  ALLOW_LOCAL_VERIFICATION_FALLBACK: true,
  DEV_FIXED_SMS_CODE: '1234',
  DEV_SMS_RELAY_RECEIVER_PHONE: '13800001111',
  DEV_SMS_RELAY_PREFIX: 'SL',
};

describe('smsApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    window.sessionStorage.clear();
    window.history.pushState({}, '', '/silverlink/scan/?token=qr-token-123456');
  });

  it('starts relay verification and applies default status/prefix fallbacks', async () => {
    const fetchMock = mockFetchData({
      sessionId: 'session-1',
      elderId: 'elder-001',
      receiverPhone: '13800000000',
      messageBody: 'SL ABCD',
    });

    await expect(startRelayVerification('health')).resolves.toMatchObject({
      sessionId: 'session-1',
      receiverPhoneMasked: '138****0000',
      messagePrefix: 'SL',
      status: 'PENDING',
    });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/scan/verification/start');
  });

  it('ignores confirm sent for remote sessions', async () => {
    await expect(confirmRelayVerificationSent('remote-session')).resolves.toBeUndefined();
  });

  it('fetches relay verification status and derives verified flag from status', async () => {
    const fetchMock = mockFetchData({
      sessionId: 'session-1',
      elderId: 'elder-001',
      status: 'VERIFIED',
      senderPhoneMasked: '158****6543',
    });

    await expect(getRelayVerificationStatus('session-1')).resolves.toMatchObject({
      verified: true,
      senderPhoneMasked: '158****6543',
    });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/scan/verification/status?sessionId=session-1');
  });

  it('verifies identity access and normalizes backend response', async () => {
    mockFetchData({
      sessionId: 'identity-session',
      elderId: 'elder-001',
      status: 'PENDING',
      verified: false,
    });

    await expect(verifyIdentityAccess('health', {
      visitorName: '孙测试',
      visitorPhone: '15826216543',
      visitorIdCard: '500102200212180836',
    })).resolves.toMatchObject({
      sessionId: 'identity-session',
      verified: false,
    });
  });

  it('starts relay verification with local fallback when backend fails', async () => {
    vi.doMock('../config/env', () => envMockBase);

    const { startRelayVerification: fallbackStart } = await import('./smsApi');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    const result = await fallbackStart('health');
    expect(result.sessionId).toMatch(/^local-relay-/);
    expect(result.receiverPhone).toBe('13800001111');
    expect(result.messageBody).toMatch(/^SL /);
    expect(result.status).toBe('PENDING');
    expect(result.localDev).toBe(true);

    vi.doUnmock('../config/env');
  });

  it('uses random fallback path when crypto.getRandomValues is unavailable', async () => {
    vi.doMock('../config/env', () => envMockBase);
    const originalCrypto = window.crypto;
    Object.defineProperty(window, 'crypto', {
      configurable: true,
      value: undefined,
    });

    const { startRelayVerification: fallbackStart } = await import('./smsApi');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    const result = await fallbackStart('health');
    expect(result.messageBody).toMatch(/^SL [A-HJ-NP-Z2-9]{10}$/);

    Object.defineProperty(window, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
    vi.doUnmock('../config/env');
  });

  it('confirms relay verification sent for local sessions', async () => {
    vi.doMock('../config/env', () => envMockBase);

    const { startRelayVerification: fallbackStart, confirmRelayVerificationSent: fallbackConfirm, getRelayVerificationStatus: fallbackStatus } = await import('./smsApi');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    const session = await fallbackStart('health');
    await fallbackConfirm(session.sessionId);
    const status = await fallbackStatus(session.sessionId);
    expect(status.verified).toBe(true);
    expect(status.status).toBe('VERIFIED');

    vi.doUnmock('../config/env');
  });

  it('verifies identity access with local fallback when backend fails', async () => {
    vi.doMock('../config/env', () => envMockBase);

    const { verifyIdentityAccess: fallbackVerify } = await import('./smsApi');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    const result = await fallbackVerify('health', {
      name: '测试',
      phone: '13800001111',
      idCard: '500102200212180836',
    });
    expect(result.verified).toBe(true);
    expect(result.localDev).toBe(true);

    vi.doUnmock('../config/env');
  });

  it('getRelayVerificationStatus derives verified from status when verified field is missing', async () => {
    mockFetchData({
      sessionId: 'session-derived',
      elderId: 'elder-001',
      status: 'VERIFIED',
    });

    const result = await getRelayVerificationStatus('session-derived');
    expect(result.verified).toBe(true);
  });

  it('maskPhone returns **** for short phone via backend', async () => {
    mockFetchData({
      sessionId: 'session-short',
      elderId: 'elder-001',
      receiverPhone: '138',
      messageBody: 'SL TEST',
    });

    const result = await startRelayVerification('health');
    expect(result.receiverPhoneMasked).toBe('****');
  });

  it('maskPhone masks full-length phone via backend', async () => {
    mockFetchData({
      sessionId: 'session-full',
      elderId: 'elder-001',
      receiverPhone: '13812345678',
      messageBody: 'SL TEST',
    });

    const result = await startRelayVerification('health');
    expect(result.receiverPhoneMasked).toBe('138****5678');
  });

  it('maskPhone returns **** for empty phone via backend', async () => {
    mockFetchData({
      sessionId: 'session-empty',
      elderId: 'elder-001',
      receiverPhone: '',
      messageBody: 'SL TEST',
    });

    const result = await startRelayVerification('health');
    expect(result.receiverPhoneMasked).toBe('****');
  });

  it('randomAlphaNumeric generates code of correct length in local fallback', async () => {
    vi.doMock('../config/env', () => envMockBase);

    const { startRelayVerification: fallbackStart } = await import('./smsApi');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    const result = await fallbackStart('health');
    const code = result.messageBody.replace('SL ', '');
    expect(code).toHaveLength(10);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]+$/);

    vi.doUnmock('../config/env');
  });

  it('startRelayVerification uses backend receiverPhoneMasked when provided', async () => {
    mockFetchData({
      sessionId: 'session-masked',
      elderId: 'elder-001',
      receiverPhone: '13800000000',
      receiverPhoneMasked: '138****custom',
      messageBody: 'SL TEST',
      messagePrefix: 'CUSTOM',
      status: 'VERIFIED',
      expiresAt: '2026-12-31T00:00:00Z',
    });

    const result = await startRelayVerification('health');
    expect(result.receiverPhoneMasked).toBe('138****custom');
    expect(result.messagePrefix).toBe('CUSTOM');
    expect(result.status).toBe('VERIFIED');
    expect(result.expiresAt).toBe('2026-12-31T00:00:00Z');
  });

  it('getRelayVerificationStatus returns verified false when status is PENDING and verified is undefined', async () => {
    mockFetchData({
      sessionId: 'session-pending',
      elderId: 'elder-001',
      status: 'PENDING',
    });

    const result = await getRelayVerificationStatus('session-pending');
    expect(result.verified).toBe(false);
  });

  it('getRelayVerificationStatus uses verified field when present', async () => {
    mockFetchData({
      sessionId: 'session-explicit',
      elderId: 'elder-001',
      status: 'PENDING',
      verified: true,
    });

    const result = await getRelayVerificationStatus('session-explicit');
    expect(result.verified).toBe(true);
  });

  it('verifyIdentityAccess throws error when local fallback is disabled', async () => {
    vi.doMock('../config/env', () => ({
      ...envMockBase,
      ALLOW_LOCAL_VERIFICATION_FALLBACK: false,
      DEV_FIXED_SMS_CODE: '',
    }));

    const { verifyIdentityAccess: strictVerify } = await import('./smsApi');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    await expect(strictVerify('health', {
      name: '测试',
      phone: '13800001111',
      idCard: '500102200212180836',
    })).rejects.toThrow('network');

    vi.doUnmock('../config/env');
  });

  it('starts relay verification without local fallback when strict mode is enabled', async () => {
    vi.doMock('../config/env', () => ({
      ...envMockBase,
      ALLOW_LOCAL_VERIFICATION_FALLBACK: false,
    }));

    const { startRelayVerification: strictStart } = await import('./smsApi');
    const fetchMock = mockFetchData({
      sessionId: 'strict-session',
      elderId: 'elder-001',
      receiverPhone: '13800001111',
      receiverPhoneMasked: '138****1111',
      messageBody: 'SL STRICT',
      messagePrefix: 'SL-STRICT',
      status: 'VERIFIED',
      expiresAt: '2026-05-30T00:00:00Z',
    });

    const result = await strictStart('archive');
    expect(result).toMatchObject({
      sessionId: 'strict-session',
      receiverPhoneMasked: '138****1111',
      messagePrefix: 'SL-STRICT',
      status: 'VERIFIED',
      expiresAt: '2026-05-30T00:00:00Z',
    });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/scan/verification/start');

    vi.doUnmock('../config/env');
  });

  it('derives verified=true from backend status when strict identity verification omits the field', async () => {
    vi.doMock('../config/env', () => ({
      ...envMockBase,
      ALLOW_LOCAL_VERIFICATION_FALLBACK: false,
    }));

    const { verifyIdentityAccess: strictVerify } = await import('./smsApi');
    mockFetchData({
      sessionId: 'strict-identity',
      elderId: 'elder-001',
      status: 'VERIFIED',
    });

    const result = await strictVerify('health', {
      name: '测试',
      phone: '13800001111',
      idCard: '500102200212180836',
    });
    expect(result.verified).toBe(true);

    vi.doUnmock('../config/env');
  });

  it('verifyIdentityAccess returns verified status from backend', async () => {
    mockFetchData({
      sessionId: 'identity-ok',
      elderId: 'elder-001',
      status: 'VERIFIED',
      verified: true,
      verifiedAt: '2026-05-26T10:00:00Z',
      senderPhoneMasked: '158****6543',
    });

    const result = await verifyIdentityAccess('health', {
      name: '测试',
      phone: '13800001111',
      idCard: '500102200212180836',
    });
    expect(result.verified).toBe(true);
    expect(result.verifiedAt).toBe('2026-05-26T10:00:00Z');
    expect(result.senderPhoneMasked).toBe('158****6543');
  });

  it('confirmRelayVerificationSent does nothing for unknown session', async () => {
    await expect(confirmRelayVerificationSent('nonexistent')).resolves.toBeUndefined();
  });

  it('startRelayVerification local fallback includes localDev flag and expiresAt', async () => {
    vi.doMock('../config/env', () => envMockBase);

    const { startRelayVerification: fallbackStart } = await import('./smsApi');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    const result = await fallbackStart('health');
    expect(result.localDev).toBe(true);
    expect(result.expiresAt).toBeTruthy();

    vi.doUnmock('../config/env');
  });
});
