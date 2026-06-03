import { httpClient } from '@/services/api/httpClient';
import type { ScanArchiveRecord, ScanBasicInfo, ScanMedicationItem, ScanScaleSummaryItem } from '@/types/scan';

interface ScanProtectedQuery {
  elderId: string;
  sessionId: string;
}

function buildProtectedQuery({ elderId, sessionId }: ScanProtectedQuery) {
  return `elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`;
}

function normalizeScanBasicInfo(data: Record<string, unknown>): ScanBasicInfo {
  return {
    elderId: String(data.id || data.elderId || ''),
    archiveNo: String(data.archiveNo || ''),
    name: String(data.name || ''),
    gender: String(data.gender || ''),
    age: Number(data.age || 0),
    residence: String(data.residence || ''),
    emergencyContactName: String(data.emergencyContact || data.emergencyContactName || ''),
    emergencyPhoneMasked: String(data.emergencyPhoneMasked || ''),
    emergencyPhoneDial: String(data.emergencyPhoneDial || ''),
    relationship: String(data.relationship || ''),
    aboType: String(data.aboType || ''),
    rhType: String(data.rhType || ''),
    allergySummary: String(data.allergySummary || ''),
  };
}

function normalizeArchiveRecord(data: Record<string, unknown>): ScanArchiveRecord {
  return {
    date: String(data.date || ''),
    volunteer: String(data.volunteer || ''),
    heightCm: Number(data.heightCm || 0),
    weightKg: Number(data.weightKg || 0),
    waistCm: Number(data.waistCm || 0),
    bmi: Number(data.bmi || 0),
    healthSelfAssessment: String(data.healthSelfAssessment || ''),
    selfCareAssessment: String(data.selfCareAssessment || ''),
    cognitiveScreening: String(data.cognitiveScreening || ''),
    emotionScreening: String(data.emotionScreening || ''),
  };
}

function normalizeMedicationItem(data: Record<string, unknown>): ScanMedicationItem {
  return {
    name: String(data.name || ''),
    dosage: String(data.dosage || ''),
    usage: String(data.usage || ''),
    time: String(data.time || ''),
  };
}

function normalizeScaleItem(data: Record<string, unknown>): ScanScaleSummaryItem {
  const answers = Array.isArray(data.answers)
    ? data.answers.map((item) => {
        const answer = item as Record<string, unknown>;
        return {
          question: String(answer.question || ''),
          value: answer.value == null ? null : Number(answer.value),
        };
      })
    : undefined;

  return {
    name: String(data.name || ''),
    score: Number(data.score || 0),
    updatedAt: String(data.updatedAt || ''),
    volunteer: String(data.volunteer || ''),
    answers,
    level: String(data.level || ''),
    note: String(data.note || ''),
  };
}

export async function fetchVerifiedBasicInfo(elderId: string, sessionId: string) {
  const data = await httpClient.get<Record<string, unknown>>(`/api/scan/basic-info?${buildProtectedQuery({ elderId, sessionId })}`);
  return normalizeScanBasicInfo(data);
}

export async function fetchArchive(elderId: string, sessionId: string) {
  const data = await httpClient.get<Record<string, unknown>>(`/api/scan/archive?${buildProtectedQuery({ elderId, sessionId })}`);
  return normalizeArchiveRecord(data);
}

export async function fetchMedications(elderId: string, sessionId: string) {
  const data = await httpClient.get<Array<Record<string, unknown>>>(`/api/scan/medications?${buildProtectedQuery({ elderId, sessionId })}`);
  return data.map(normalizeMedicationItem);
}

export async function fetchScales(elderId: string, sessionId: string) {
  const data = await httpClient.get<Array<Record<string, unknown>>>(`/api/scan/scales?${buildProtectedQuery({ elderId, sessionId })}`);
  return data.map(normalizeScaleItem);
}
