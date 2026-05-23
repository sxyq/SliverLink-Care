import type { Medication } from '../types';
import { del, get, post, put } from './httpClient';

export async function getMedications(elderId: string): Promise<Medication[]> {
  return get<Medication[]>(`/api/family/elders/${encodeURIComponent(elderId)}/medications`);
}

export async function addMedication(elderId: string, med: Omit<Medication, 'id' | 'updatedAt'>): Promise<Medication> {
  return post<Medication>(`/api/family/elders/${encodeURIComponent(elderId)}/medications`, med);
}

export async function updateMedication(
  elderId: string,
  medicationId: string,
  med: Omit<Medication, 'id' | 'updatedAt'>,
): Promise<Medication> {
  return put<Medication>(
    `/api/family/elders/${encodeURIComponent(elderId)}/medications/${encodeURIComponent(medicationId)}`,
    med,
  );
}

export async function deleteMedication(elderId: string, medicationId: string): Promise<{ success: boolean }> {
  await del(`/api/family/elders/${encodeURIComponent(elderId)}/medications/${encodeURIComponent(medicationId)}`);
  return { success: true };
}
