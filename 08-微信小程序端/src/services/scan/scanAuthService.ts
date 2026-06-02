import { httpClient } from '@/services/api/httpClient';
import type { ScanBasicInfo, ScanResolveRequest } from '@/types/scan';

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

export async function resolveScanToken(input: ScanResolveRequest) {
  const data = await httpClient.post<ScanResolveDto>('/api/scan/resolve', { token: input.token });
  return normalizeScanBasicInfo(data);
}
