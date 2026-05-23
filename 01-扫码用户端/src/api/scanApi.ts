import { ENDPOINTS } from '../config/endpoints';
import { httpClient } from './httpClient';
import type { ElderBasicInfo, HealthRecord, Medication, ScaleSummary } from '../types';

const ELDER_ID_KEY = 'silverlink.scan.elderId';
const PHONE_KEY = 'silverlink.scan.emergencyPhone';

interface ScanResolveDto {
  elderId: string;
  archiveNo: string;
  name: string;
  gender: string;
  age: number;
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
}

export function getResolvedElderId() {
  return window.localStorage.getItem(ELDER_ID_KEY) || '';
}

export function getResolvedEmergencyPhone() {
  return window.localStorage.getItem(PHONE_KEY) || '';
}

export async function fetchBasicInfo(qrToken: string): Promise<ElderBasicInfo> {
  const res = await httpClient<ScanResolveDto>(ENDPOINTS.scanResolve, {
    method: 'POST',
    body: JSON.stringify({ token: qrToken }),
  });

  window.localStorage.setItem(ELDER_ID_KEY, res.elderId);
  if (res.emergencyPhoneDial) {
    window.localStorage.setItem(PHONE_KEY, res.emergencyPhoneDial);
  }

  return {
    id: res.elderId,
    archiveNo: res.archiveNo,
    name: res.name,
    gender: res.gender,
    age: Number(res.age || 0),
    emergencyContact: res.emergencyContactName,
    emergencyPhoneMasked: res.emergencyPhoneMasked,
    emergencyPhoneDial: res.emergencyPhoneDial || '',
    relationship: res.relationship,
    aboType: res.aboType,
    rhType: res.rhType,
    allergySummary: res.allergySummary,
  };
}

export async function fetchHealthRecord(): Promise<HealthRecord> {
  const elderId = getResolvedElderId();
  const res = await httpClient<HealthRecordDto>(`${ENDPOINTS.scanArchive}?elderId=${encodeURIComponent(elderId)}`, { method: 'GET' });
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

export async function fetchMedications(): Promise<Medication[]> {
  const elderId = getResolvedElderId();
  return httpClient<Medication[]>(`${ENDPOINTS.scanMedications}?elderId=${encodeURIComponent(elderId)}`, { method: 'GET' });
}

export async function fetchScaleSummaries(): Promise<ScaleSummary[]> {
  const elderId = getResolvedElderId();
  const res = await httpClient<ScaleDto[]>(`${ENDPOINTS.scanScales}?elderId=${encodeURIComponent(elderId)}`, { method: 'GET' });
  return res.map((item) => ({
    name: (item.name || item.scale || 'PHQ-9') as ScaleSummary['name'],
    score: Number(item.score || 0),
    updatedAt: String(item.updatedAt || item.date || ''),
    volunteer: String(item.volunteer || ''),
  }));
}
