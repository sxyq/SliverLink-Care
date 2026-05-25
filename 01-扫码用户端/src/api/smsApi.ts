import {
  ALLOW_LOCAL_VERIFICATION_FALLBACK,
  DEV_FIXED_SMS_CODE,
  DEV_SMS_RELAY_PREFIX,
  DEV_SMS_RELAY_RECEIVER_PHONE,
} from '../config/env';
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

const localRelaySessions = new Map<string, SmsVerificationStatus>();

function maskPhone(phone: string) {
  if (!phone || phone.length < 7) return '****';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function randomAlphaNumeric(length: number) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = new Uint32Array(length);

  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < length; i += 1) {
      values[i] = Math.floor(Math.random() * alphabet.length);
    }
  }

  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += alphabet[values[i] % alphabet.length];
  }
  return result;
}

export async function startRelayVerification(target: string): Promise<SmsVerificationSession> {
  if (ALLOW_LOCAL_VERIFICATION_FALLBACK) {
    try {
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
    } catch {
      // Dev fallback still works even if backend session creation is unavailable.
    }

    const sessionId = `local-relay-${Date.now()}`;
    const receiverPhone = DEV_SMS_RELAY_RECEIVER_PHONE;
    const receiverPhoneMasked = maskPhone(DEV_SMS_RELAY_RECEIVER_PHONE);
    const messagePrefix = DEV_SMS_RELAY_PREFIX;
    const messageBody = `${messagePrefix} ${randomAlphaNumeric(10)}`;

    localRelaySessions.set(sessionId, {
      sessionId,
      status: 'PENDING',
      verified: false,
      localDev: true,
    });
    return {
      sessionId,
      elderId: getResolvedElderId(),
      receiverPhone,
      receiverPhoneMasked,
      messageBody,
      messagePrefix,
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
  const localSession = localRelaySessions.get(sessionId);
  if (!localSession) return;

  localRelaySessions.set(sessionId, {
    ...localSession,
    status: 'VERIFIED',
    verified: true,
    verifiedAt: new Date().toISOString(),
  });
}

export async function getRelayVerificationStatus(sessionId: string): Promise<SmsVerificationStatus> {
  const localSession = localRelaySessions.get(sessionId);
  if (localSession) {
    return localSession;
  }

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
  try {
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
  } catch (error) {
    if (!ALLOW_LOCAL_VERIFICATION_FALLBACK) {
      throw error;
    }

    const sessionId = `local-identity-${Date.now()}`;
    const nextStatus = {
      sessionId,
      elderId: getResolvedElderId(),
      status: 'VERIFIED' as const,
      verified: true,
      verifiedAt: new Date().toISOString(),
      localDev: true,
    };
    localRelaySessions.set(sessionId, nextStatus);
    return nextStatus;
  }
}
