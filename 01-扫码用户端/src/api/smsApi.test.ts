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

describe('smsApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
    vi.doMock('../config/env', () => ({
      ALLOW_LOCAL_VERIFICATION_FALLBACK: true,
      DEV_FIXED_SMS_CODE: '1234',
      DEV_SMS_RELAY_RECEIVER_PHONE: '13800001111',
      DEV_SMS_RELAY_PREFIX: 'SL',
    }));

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

  it('confirms relay verification sent for local sessions', async () => {
    vi.doMock('../config/env', () => ({
      ALLOW_LOCAL_VERIFICATION_FALLBACK: true,
      DEV_FIXED_SMS_CODE: '1234',
      DEV_SMS_RELAY_RECEIVER_PHONE: '13800001111',
      DEV_SMS_RELAY_PREFIX: 'SL',
    }));

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
    vi.doMock('../config/env', () => ({
      ALLOW_LOCAL_VERIFICATION_FALLBACK: true,
      DEV_FIXED_SMS_CODE: '1234',
      DEV_SMS_RELAY_RECEIVER_PHONE: '13800001111',
      DEV_SMS_RELAY_PREFIX: 'SL',
    }));

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
});
