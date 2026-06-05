import { DEV_SMS_RELAY_PREFIX } from '../config/env';
import { ENDPOINTS } from '../config/endpoints';
import { httpClient } from './httpClient';
import { getResolvedElderId } from './scanApi';
import type { IdentityVerificationPayload, SmsVerificationSession, SmsVerificationStatus } from '../types/verification';

interface StartVerificationDto {
  sessionId: string;
  elderId?: string;
  receiverPhone: string;
  receiverPhoneMasked?: string;
  messageBody: string;
  messagePrefix?: string;
  status?: 'PENDING' | 'VERIFIED' | 'EXPIRED';
  expiresAt?: string;
}

interface VerificationStatusDto {
  sessionId: string;
  elderId?: string;
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED';
  verified?: boolean;
  verifiedAt?: string;
  senderPhoneMasked?: string;
}

function maskPhone(phone: string) {
  if (!phone || phone.length < 7) return '****';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export async function startRelayVerification(target: string): Promise<SmsVerificationSession> {
  const res = await httpClient<StartVerificationDto>(ENDPOINTS.scanVerificationStart, {
    method: 'POST',
    body: JSON.stringify({
      elderId: getResolvedElderId(),
      target,
    }),
  });

  return {
    sessionId: res.sessionId,
    elderId: res.elderId,
    receiverPhone: res.receiverPhone,
    receiverPhoneMasked: res.receiverPhoneMasked || maskPhone(res.receiverPhone),
    messageBody: res.messageBody,
    messagePrefix: res.messagePrefix || DEV_SMS_RELAY_PREFIX,
    status: res.status || 'PENDING',
    expiresAt: res.expiresAt,
  };
}

export async function confirmRelayVerificationSent(sessionId: string): Promise<void> {
  void sessionId;
}

export async function getRelayVerificationStatus(sessionId: string): Promise<SmsVerificationStatus> {
  const res = await httpClient<VerificationStatusDto>(
    `${ENDPOINTS.scanVerificationStatus}?sessionId=${encodeURIComponent(sessionId)}`,
    { method: 'GET' },
  );

  return {
    sessionId: res.sessionId,
    elderId: res.elderId,
    status: res.status,
    verified: Boolean(res.verified ?? res.status === 'VERIFIED'),
    verifiedAt: res.verifiedAt,
    senderPhoneMasked: res.senderPhoneMasked,
  };
}

export async function verifyIdentityAccess(
  target: string,
  payload: IdentityVerificationPayload,
): Promise<SmsVerificationStatus> {
  const res = await httpClient<VerificationStatusDto>(ENDPOINTS.scanVerificationIdentity, {
    method: 'POST',
    body: JSON.stringify({
      elderId: getResolvedElderId(),
      target,
      ...payload,
    }),
  });

  return {
    sessionId: res.sessionId,
    elderId: res.elderId,
    status: res.status,
    verified: Boolean(res.verified ?? res.status === 'VERIFIED'),
    verifiedAt: res.verifiedAt,
    senderPhoneMasked: res.senderPhoneMasked,
  };
}
