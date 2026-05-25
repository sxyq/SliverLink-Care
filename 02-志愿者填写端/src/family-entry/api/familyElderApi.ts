import type { ElderInfo, QrCodeInfo } from '../types';
import { get, post, put } from './httpClient';

export async function getBoundElders(): Promise<ElderInfo[]> {
  return get<ElderInfo[]>('/api/family/me/elders');
}

export async function getElderDetail(elderId: string): Promise<ElderInfo | null> {
  return get<ElderInfo>(`/api/family/elders/${encodeURIComponent(elderId)}`);
}

export interface UpdateContactsParams {
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  backupContactName: string;
  backupContactPhone: string;
  backupContactRelation: string;
}

export async function updateElderContacts(
  elderId: string,
  params: UpdateContactsParams,
): Promise<{ success: boolean; message: string }> {
  await put<ElderInfo>(`/api/family/elders/${encodeURIComponent(elderId)}/contacts`, params);
  return { success: true, message: '联系人信息已更新' };
}

export async function getElderQrCode(elderId: string): Promise<QrCodeInfo | null> {
  return get<QrCodeInfo>(`/api/family/elders/${encodeURIComponent(elderId)}/qrcode`);
}

export async function requestDisableElderQrCode(elderId: string): Promise<QrCodeInfo> {
  return post<QrCodeInfo>(`/api/family/elders/${encodeURIComponent(elderId)}/qrcode/disable-request`);
}
