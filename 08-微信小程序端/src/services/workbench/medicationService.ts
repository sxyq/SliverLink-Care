import { ROLE_TYPES, type RoleType } from '@/app/app.constants';
import { httpClient } from '@/services/api/httpClient';
import { getStorageValue, setStorageValue } from '@/utils/storage';

export interface WorkbenchMedicationItem {
  id: string;
  name: string;
  dosage: string;
  usage: string;
  timing: string;
  updatedAt: string;
}

export interface WorkbenchMedicationDraft {
  id?: string;
  name: string;
  dosage: string;
  usage: string;
  timing: string;
}

interface FamilyMedicationResponse {
  id?: string;
  name?: string;
  dosage?: string;
  usage?: string;
  timing?: string;
  updatedAt?: string;
}

function getVolunteerMedicationCacheKey(elderId: string) {
  return `sl_weapp_volunteer_medications__${elderId}`;
}

function mapMedication(item: Partial<WorkbenchMedicationItem>) {
  return {
    id: String(item.id || ''),
    name: String(item.name || ''),
    dosage: String(item.dosage || ''),
    usage: String(item.usage || ''),
    timing: String(item.timing || ''),
    updatedAt: String(item.updatedAt || ''),
  } satisfies WorkbenchMedicationItem;
}

function normalizeMedicationList(items: Array<Partial<WorkbenchMedicationItem>>) {
  return items.map((item) => mapMedication(item));
}

function isUnsupportedMedicationFetch(error: unknown) {
  const message = (error as Error)?.message || '';
  return (
    message.includes("Request method 'GET' is not supported") ||
    message.includes("method 'GET' is not supported") ||
    message.includes('405') ||
    message.includes('Request method')
  );
}

export function getCachedVolunteerMedications(elderId: string): WorkbenchMedicationItem[] {
  const cached = getStorageValue<WorkbenchMedicationItem[]>(getVolunteerMedicationCacheKey(elderId), []);
  return normalizeMedicationList(Array.isArray(cached) ? cached : []);
}

export function cacheVolunteerMedications(elderId: string, items: Array<Partial<WorkbenchMedicationItem>>) {
  setStorageValue(getVolunteerMedicationCacheKey(elderId), normalizeMedicationList(items));
}

export async function fetchWorkbenchMedications(role: RoleType, elderId: string): Promise<WorkbenchMedicationItem[]> {
  if (role === ROLE_TYPES.volunteer) {
    const cached = getCachedVolunteerMedications(elderId);
    try {
      const rows = await httpClient.get<FamilyMedicationResponse[]>(`/api/volunteer/me/elders/${encodeURIComponent(elderId)}/medications`);
      const normalized = normalizeMedicationList(rows);
      cacheVolunteerMedications(elderId, normalized);
      return normalized;
    } catch (error) {
      if (cached.length || isUnsupportedMedicationFetch(error)) {
        return cached;
      }
      throw error;
    }
  }

  const path =
    role === ROLE_TYPES.family
      ? `/api/family/elders/${encodeURIComponent(elderId)}/medications`
      : `/api/elder/${encodeURIComponent(elderId)}/medications`;
  const rows = await httpClient.get<FamilyMedicationResponse[]>(path);
  return rows.map((item) => mapMedication(item));
}

export async function saveVolunteerMedications(elderId: string, items: WorkbenchMedicationDraft[]) {
  return httpClient.post<{ recordId: string }>(
    `/api/elder/${encodeURIComponent(elderId)}/medications`,
    items.map((item) => ({
      id: item.id || '',
      name: item.name.trim(),
      dosage: item.dosage.trim(),
      usage: item.usage.trim(),
      timing: item.timing.trim(),
      time: item.timing.trim(),
    })),
  );
}

export async function createFamilyMedication(elderId: string, item: WorkbenchMedicationDraft) {
  const result = await httpClient.post<FamilyMedicationResponse>(`/api/family/elders/${encodeURIComponent(elderId)}/medications`, {
    name: item.name.trim(),
    dosage: item.dosage.trim(),
    usage: item.usage.trim(),
    timing: item.timing.trim(),
  });

  return mapMedication(result);
}

export async function updateFamilyMedication(elderId: string, medicationId: string, item: WorkbenchMedicationDraft) {
  const result = await httpClient.put<FamilyMedicationResponse>(
    `/api/family/elders/${encodeURIComponent(elderId)}/medications/${encodeURIComponent(medicationId)}`,
    {
      name: item.name.trim(),
      dosage: item.dosage.trim(),
      usage: item.usage.trim(),
      timing: item.timing.trim(),
    },
  );

  return mapMedication(result);
}

export async function deleteFamilyMedication(elderId: string, medicationId: string) {
  await httpClient.delete<void>(`/api/family/elders/${encodeURIComponent(elderId)}/medications/${encodeURIComponent(medicationId)}`);
}
