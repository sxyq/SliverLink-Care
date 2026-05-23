import {
  DEV_FIXED_SMS_CODE,
  DEV_SMS_RELAY_PREFIX,
  DEV_SMS_RELAY_RECEIVER_PHONE,
} from '../config/env';
import { ENDPOINTS } from '../config/endpoints';
import { httpClient } from './httpClient';
import { getResolvedElderId } from './scanApi';
import type { SmsRelayVerificationSession, SmsRelayVerificationStatus } from '../types/verification';

interface StartVerificationDto {
  sessionId: string;
  receiverPhone: string;
  receiverPhoneMasked?: string;
  messageBody: string;
  messagePrefix?: string;
  status?: 'PENDING' | 'VERIFIED' | 'EXPIRED';
  expiresAt?: string;
}

interface VerificationStatusDto {
  sessionId: string;
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED';
  verified?: boolean;
  verifiedAt?: string;
  senderPhoneMasked?: string;
}

const localRelaySessions = new Map<string, SmsRelayVerificationStatus>();

function maskPhone(phone: string) {
  if (!phone || phone.length < 7) return '****';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export async function startRelayVerification(target: string): Promise<SmsRelayVerificationSession> {
  if (DEV_FIXED_SMS_CODE) {
    const sessionId = `local-relay-${Date.now()}`;
    const messageBody = `${DEV_SMS_RELAY_PREFIX} ${DEV_FIXED_SMS_CODE}`;
    localRelaySessions.set(sessionId, {
      sessionId,
      status: 'PENDING',
      verified: false,
      localDev: true,
    });
    return {
      sessionId,
      receiverPhone: DEV_SMS_RELAY_RECEIVER_PHONE,
      receiverPhoneMasked: maskPhone(DEV_SMS_RELAY_RECEIVER_PHONE),
      messageBody,
      messagePrefix: DEV_SMS_RELAY_PREFIX,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      localDev: true,
    };
  }

  const res = await httpClient<StartVerificationDto>(ENDPOINTS.scanVerificationStart, {
    method: 'POST',
    body: JSON.stringify({
      elderId: getResolvedElderId(),
      target,
    }),
  });

  return {
    sessionId: res.sessionId,
    receiverPhone: res.receiverPhone,
    receiverPhoneMasked: res.receiverPhoneMasked || maskPhone(res.receiverPhone),
    messageBody: res.messageBody,
    messagePrefix: res.messagePrefix || DEV_SMS_RELAY_PREFIX,
    status: res.status || 'PENDING',
    expiresAt: res.expiresAt,
  };
}

export async function confirmRelayVerificationSent(sessionId: string): Promise<void> {
  const localSession = localRelaySessions.get(sessionId);
  if (!localSession) return;
  localRelaySessions.set(sessionId, {
    ...localSession,
    status: 'VERIFIED',
    verified: true,
    verifiedAt: new Date().toISOString(),
  });
}

export async function getRelayVerificationStatus(sessionId: string): Promise<SmsRelayVerificationStatus> {
  const localSession = localRelaySessions.get(sessionId);
  if (localSession) {
    return localSession;
  }

  const res = await httpClient<VerificationStatusDto>(`${ENDPOINTS.scanVerificationStatus}?sessionId=${encodeURIComponent(sessionId)}`, {
    method: 'GET',
  });

  return {
    sessionId: res.sessionId,
    status: res.status,
    verified: Boolean(res.verified ?? res.status === 'VERIFIED'),
    verifiedAt: res.verifiedAt,
    senderPhoneMasked: res.senderPhoneMasked,
  };
}
