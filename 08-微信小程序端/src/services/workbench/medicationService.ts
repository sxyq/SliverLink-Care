import { ROLE_TYPES, type RoleType } from '@/app/app.constants';
import { httpClient } from '@/services/api/httpClient';

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

export async function fetchWorkbenchMedications(role: RoleType, elderId: string): Promise<WorkbenchMedicationItem[]> {
  if (role === ROLE_TYPES.volunteer) {
    return [];
  }

  const rows = await httpClient.get<FamilyMedicationResponse[]>(`/api/family/elders/${encodeURIComponent(elderId)}/medications`);
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
