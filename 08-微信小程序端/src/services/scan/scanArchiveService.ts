import { httpClient } from '@/services/api/httpClient';

export async function fetchVerifiedBasicInfo(elderId: string, sessionId: string) {
  return httpClient.get<Record<string, unknown>>(
    `/api/scan/basic-info?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`,
  );
}

export async function fetchArchive(elderId: string, sessionId: string) {
  return httpClient.get<Record<string, unknown>>(
    `/api/scan/archive?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`,
  );
}

export async function fetchMedications(elderId: string, sessionId: string) {
  return httpClient.get<Array<Record<string, unknown>>>(
    `/api/scan/medications?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`,
  );
}

export async function fetchScales(elderId: string, sessionId: string) {
  return httpClient.get<Array<Record<string, unknown>>>(
    `/api/scan/scales?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`,
  );
}
