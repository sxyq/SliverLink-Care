import { http } from './httpClient';
import type { AssignedElder } from '../types';

export interface LoginResult {
  ok: boolean;
  token: string;
  name?: string;
}

export async function loginVolunteer(account: string, password: string): Promise<LoginResult> {
  const res = await http<{ token: string; name?: string }>('/api/volunteer/login', {
    method: 'POST',
    body: JSON.stringify({ account, password }),
  });
  return { ok: Boolean(res.token), token: res.token, name: res.name };
}

export async function fetchAssignedElders(): Promise<AssignedElder[]> {
  const rows = await http<Array<Record<string, unknown>>>('/api/volunteer/me/elders');
  return rows.map((row) => ({
    id: String(row.id || row.elderId || ''),
    archiveNo: String(row.archiveNo || ''),
    name: String(row.name || ''),
    gender: String(row.gender || ''),
    age: Number(row.age || 0),
    emergencyContactName: String(row.emergencyContactName || ''),
    emergencyContactPhone: String(row.emergencyContactPhone || row.emergencyPhoneDial || ''),
    emergencyContactRelation: String(row.relationship || row.emergencyContactRelation || ''),
    aboType: String(row.aboType || ''),
    rhType: String(row.rhType || ''),
    allergySummary: String(row.allergySummary || row.allergyHistory || ''),
    lastVisitDate: String(row.lastVisitDate || ''),
    status: '待随访' as AssignedElder['status'],
  }));
}
