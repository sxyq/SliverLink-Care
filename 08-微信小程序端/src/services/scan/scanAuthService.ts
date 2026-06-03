import { httpClient } from '@/services/api/httpClient';
import type {
  ScanBasicInfo,
  ScanIdentityVerificationPayload,
  ScanResolveRequest,
  ScanVerificationSession,
  ScanVerificationStatus,
} from '@/types/scan';

interface ScanResolveDto {
  elderId: string;
  archiveNo: string;
  name: string;
  gender: string;
  age: number;
  residence?: string;
  emergencyContactName: string;
  emergencyPhoneMasked: string;
  emergencyPhoneDial?: string;
  relationship: string;
  aboType: string;
  rhType: string;
  allergySummary: string;
}

interface ScanVerificationSessionDto {
  sessionId: string;
  elderId?: string;
  receiverPhone?: string;
  receiverPhoneMasked?: string;
  messageBody?: string;
  messagePrefix?: string;
  status?: 'PENDING' | 'VERIFIED' | 'EXPIRED';
  expiresAt?: string;
}

interface ScanVerificationStatusDto {
  sessionId: string;
  elderId?: string;
  status?: 'PENDING' | 'VERIFIED' | 'EXPIRED';
  verified?: boolean;
  verifiedAt?: string;
  senderPhoneMasked?: string;
}

function normalizeScanBasicInfo(dto: ScanResolveDto): ScanBasicInfo {
  return {
    elderId: String(dto.elderId || ''),
    archiveNo: String(dto.archiveNo || ''),
    name: String(dto.name || ''),
    gender: String(dto.gender || ''),
    age: Number(dto.age || 0),
    residence: String(dto.residence || ''),
    emergencyContactName: String(dto.emergencyContactName || ''),
    emergencyPhoneMasked: String(dto.emergencyPhoneMasked || ''),
    emergencyPhoneDial: String(dto.emergencyPhoneDial || ''),
    relationship: String(dto.relationship || ''),
    aboType: String(dto.aboType || ''),
    rhType: String(dto.rhType || ''),
    allergySummary: String(dto.allergySummary || ''),
  };
}

function normalizeVerificationSession(dto: ScanVerificationSessionDto): ScanVerificationSession {
  return {
    sessionId: String(dto.sessionId || ''),
    elderId: String(dto.elderId || ''),
    receiverPhone: String(dto.receiverPhone || ''),
    receiverPhoneMasked: String(dto.receiverPhoneMasked || ''),
    messageBody: String(dto.messageBody || ''),
    messagePrefix: String(dto.messagePrefix || ''),
    status: dto.status || 'PENDING',
    expiresAt: String(dto.expiresAt || ''),
  };
}

function normalizeVerificationStatus(dto: ScanVerificationStatusDto): ScanVerificationStatus {
  return {
    sessionId: String(dto.sessionId || ''),
    elderId: String(dto.elderId || ''),
    status: dto.status || 'PENDING',
    verified: Boolean(dto.verified),
    verifiedAt: String(dto.verifiedAt || ''),
    senderPhoneMasked: String(dto.senderPhoneMasked || ''),
  };
}

export async function resolveScanToken(input: ScanResolveRequest) {
  const data = await httpClient.post<ScanResolveDto>('/api/scan/resolve', { token: input.token });
  return normalizeScanBasicInfo(data);
}

export async function startScanSmsVerification(elderId: string, target = 'health') {
  const data = await httpClient.post<ScanVerificationSessionDto>('/api/scan/verification/start', { elderId, target });
  return normalizeVerificationSession(data);
}

export async function getScanVerificationStatus(sessionId: string) {
  const data = await httpClient.get<ScanVerificationStatusDto>(
    `/api/scan/verification/status?sessionId=${encodeURIComponent(sessionId)}`,
  );
  return normalizeVerificationStatus(data);
}

export async function verifyScanIdentity(payload: ScanIdentityVerificationPayload) {
  const data = await httpClient.post<ScanVerificationStatusDto>('/api/scan/verification/identity', payload);
  return normalizeVerificationStatus(data);
}
