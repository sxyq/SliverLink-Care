import { http } from './httpClient';
import type { AssignedElder, CreateAssignedElderInput, VolunteerQrCodeInfo } from '../types';

export interface LoginResult {
  ok: boolean;
  token: string;
  name?: string;
}

export interface VolunteerProfileResult {
  account: string;
  name: string;
  phone: string;
}

export interface UpdateVolunteerProfileInput {
  account: string;
  name: string;
  phone: string;
  currentPassword: string;
  password: string;
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
    residence: String(row.residence || ''),
    emergencyContactName: String(row.emergencyContactName || ''),
    emergencyContactPhone: String(row.emergencyContactPhone || row.emergencyPhoneDial || ''),
    emergencyContactRelation: String(row.relationship || row.emergencyContactRelation || ''),
    aboType: String(row.aboType || ''),
    rhType: String(row.rhType || ''),
    allergySummary: String(row.allergySummary || row.allergyHistory || ''),
    lastVisitDate: String(row.lastVisitDate || ''),
    status: '在档' as AssignedElder['status'],
  }));
}

export async function createAssignedElder(input: CreateAssignedElderInput): Promise<{ id: string }> {
  return http<{ id: string }>('/api/volunteer/me/elders', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      gender: input.gender,
      age: Number(input.age || 0),
      residence: input.residence.trim(),
      emergencyContactName: input.emergencyContactName.trim(),
      emergencyContactPhone: input.emergencyContactPhone.trim(),
      emergencyContactRelation: input.emergencyContactRelation.trim(),
      aboType: input.aboType.trim(),
      rhType: input.rhType.trim(),
      allergySummary: input.allergySummary.trim(),
    }),
  });
}

export async function fetchVolunteerProfile(): Promise<VolunteerProfileResult> {
  return http<VolunteerProfileResult>('/api/volunteer/me/profile');
}

export async function updateVolunteerProfile(input: UpdateVolunteerProfileInput): Promise<VolunteerProfileResult & { token: string }> {
  return http<VolunteerProfileResult & { token: string }>('/api/volunteer/me/profile', {
    method: 'PUT',
    body: JSON.stringify({
      account: input.account.trim(),
      name: input.name.trim(),
      phone: input.phone.trim(),
      currentPassword: input.currentPassword,
      password: input.password,
    }),
  });
}

export async function fetchVolunteerElderQrCode(elderId: string): Promise<VolunteerQrCodeInfo> {
  return http<VolunteerQrCodeInfo>(`/api/volunteer/me/elders/${elderId}/qr-manage`);
}

export async function regenerateVolunteerElderQrCode(elderId: string): Promise<VolunteerQrCodeInfo> {
  return http<VolunteerQrCodeInfo>(`/api/volunteer/me/elders/${elderId}/qr-regenerate`, {
    method: 'POST',
  });
}

export async function disableVolunteerElderQrCode(elderId: string): Promise<VolunteerQrCodeInfo> {
  return http<VolunteerQrCodeInfo>(`/api/volunteer/me/elders/${elderId}/qr-disable`, {
    method: 'PUT',
  });
}
