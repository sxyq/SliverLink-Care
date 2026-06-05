import { ENDPOINTS } from '../config/endpoints';
import { httpClient } from './httpClient';
import { readQrToken } from '../utils/qrToken';
import type { ElderBasicInfo, HealthRecord, Medication, ScaleAnswerDetail, ScaleSummary } from '../types';

const resolvedScanContext = {
  qrToken: '',
  elderId: '',
  emergencyPhone: '',
  emergencyPhoneMasked: '',
};

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

interface HealthRecordDto extends Record<string, unknown> {
  date?: string;
  volunteer?: string;
  heightCm?: number;
  weightKg?: number;
  waistCm?: number;
  bmi?: number;
  healthSelfAssessment?: string;
  selfCareAssessment?: string;
  cognitiveScreening?: string;
  emotionScreening?: string;
}

interface ScaleDto {
  scale?: string;
  name?: string;
  score?: number;
  date?: string;
  updatedAt?: string;
  volunteer?: string;
  answers?: ScaleAnswerDetail[];
}

export function getResolvedElderId() {
  const currentToken = readQrToken() || '';
  if (!currentToken || resolvedScanContext.qrToken !== currentToken) {
    return '';
  }
  return resolvedScanContext.elderId;
}

export function getResolvedEmergencyPhone() {
  const currentToken = readQrToken() || '';
  if (!currentToken || resolvedScanContext.qrToken !== currentToken) {
    return '';
  }
  return resolvedScanContext.emergencyPhone;
}

export function getResolvedEmergencyPhoneMasked() {
  const currentToken = readQrToken() || '';
  if (!currentToken || resolvedScanContext.qrToken !== currentToken) {
    return '';
  }
  return resolvedScanContext.emergencyPhoneMasked;
}

export function getResolvedQrToken() {
  return resolvedScanContext.qrToken;
}

export function clearResolvedScanContext() {
  resolvedScanContext.qrToken = '';
  resolvedScanContext.elderId = '';
  resolvedScanContext.emergencyPhone = '';
  resolvedScanContext.emergencyPhoneMasked = '';
}

export async function fetchBasicInfo(qrToken: string): Promise<ElderBasicInfo> {
  const res = await httpClient<ScanResolveDto>(ENDPOINTS.scanResolve, {
    method: 'POST',
    body: JSON.stringify({ token: qrToken }),
  });

  resolvedScanContext.qrToken = qrToken;
  resolvedScanContext.elderId = res.elderId;
  resolvedScanContext.emergencyPhone = res.emergencyPhoneDial || '';
  resolvedScanContext.emergencyPhoneMasked = res.emergencyPhoneMasked || '';

  return {
    id: res.elderId,
    archiveNo: res.archiveNo,
    name: res.name,
    gender: res.gender,
    age: Number(res.age || 0),
    residence: String(res.residence || ''),
    emergencyContact: res.emergencyContactName,
    emergencyPhoneMasked: res.emergencyPhoneMasked,
    emergencyPhoneDial: res.emergencyPhoneDial || '',
    relationship: res.relationship,
    aboType: res.aboType,
    rhType: res.rhType,
    allergySummary: res.allergySummary,
  };
}

export async function fetchVerifiedBasicInfo(sessionId: string, verifiedElderId?: string): Promise<ElderBasicInfo> {
  const elderId = verifiedElderId || getResolvedElderId();
  const res = await httpClient<ScanResolveDto>(
    `${ENDPOINTS.scanVerifiedBasic}?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`,
    { method: 'GET' },
  );

  return {
    id: res.elderId,
    archiveNo: res.archiveNo,
    name: res.name,
    gender: res.gender,
    age: Number(res.age || 0),
    residence: String(res.residence || ''),
    emergencyContact: res.emergencyContactName,
    emergencyPhoneMasked: res.emergencyPhoneMasked,
    emergencyPhoneDial: res.emergencyPhoneDial || '',
    relationship: res.relationship,
    aboType: res.aboType,
    rhType: res.rhType,
    allergySummary: res.allergySummary,
  };
}

export async function fetchHealthRecord(sessionId: string, verifiedElderId?: string): Promise<HealthRecord> {
  const elderId = verifiedElderId || getResolvedElderId();
  const res = await httpClient<HealthRecordDto>(
    `${ENDPOINTS.scanArchive}?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`,
    { method: 'GET' },
  );
  return {
    date: String(res.date || ''),
    volunteer: String(res.volunteer || ''),
    heightCm: Number(res.heightCm || 0),
    weightKg: Number(res.weightKg || 0),
    waistCm: Number(res.waistCm || 0),
    bmi: Number(res.bmi || 0),
    healthSelfAssessment: String(res.healthSelfAssessment || ''),
    selfCareAssessment: String(res.selfCareAssessment || ''),
    cognitiveScreening: String(res.cognitiveScreening || ''),
    emotionScreening: String(res.emotionScreening || ''),
  };
}

export async function fetchMedications(sessionId: string, verifiedElderId?: string): Promise<Medication[]> {
  const elderId = verifiedElderId || getResolvedElderId();
  return httpClient<Medication[]>(
    `${ENDPOINTS.scanMedications}?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`,
    { method: 'GET' },
  );
}

export async function fetchScaleSummaries(sessionId: string, verifiedElderId?: string): Promise<ScaleSummary[]> {
  const elderId = verifiedElderId || getResolvedElderId();
  const res = await httpClient<ScaleDto[]>(
    `${ENDPOINTS.scanScales}?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`,
    { method: 'GET' },
  );
  return res.map((item) => ({
    name: (item.name || item.scale || 'PHQ-9') as ScaleSummary['name'],
    score: Number(item.score || 0),
    updatedAt: String(item.updatedAt || item.date || ''),
    volunteer: String(item.volunteer || ''),
    ...(Array.isArray(item.answers)
      ? {
          answers: item.answers.map((answer) => ({
            question: String(answer.question || ''),
            value: typeof answer.value === 'number' ? answer.value : answer.value == null ? null : Number(answer.value),
          })),
        }
      : {}),
  }));
}

export async function fetchScaleDetail(
  sessionId: string,
  scaleName: ScaleSummary['name'],
  verifiedElderId?: string,
): Promise<ScaleSummary | null> {
  const elderId = verifiedElderId || getResolvedElderId();
  if (!elderId || !sessionId || !scaleName) {
    return null;
  }
  const item = await httpClient<ScaleDto>(
    `${ENDPOINTS.scanScales}/${encodeURIComponent(scaleName)}?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`,
    { method: 'GET' },
  );
  return {
    name: (item.name || item.scale || scaleName) as ScaleSummary['name'],
    score: Number(item.score || 0),
    updatedAt: String(item.updatedAt || item.date || ''),
    volunteer: String(item.volunteer || ''),
    answers: Array.isArray(item.answers)
      ? item.answers.map((answer) => ({
          question: String(answer.question || ''),
          value: typeof answer.value === 'number' ? answer.value : answer.value == null ? null : Number(answer.value),
        }))
      : [],
  };
}
