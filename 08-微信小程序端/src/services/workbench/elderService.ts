import { ROLE_TYPES, type RoleType } from '@/app/app.constants';
import { httpClient } from '@/services/api/httpClient';
import { getCurrentElderSummary, type CurrentElderSummary } from '@/store/elder/currentElderStore';

interface VolunteerElderRow {
  id?: string | number;
  elderId?: string | number;
  archiveNo?: string;
  name?: string;
  gender?: string;
  age?: number;
  residence?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyPhoneDial?: string;
  relationship?: string;
  emergencyContactRelation?: string;
  aboType?: string;
  rhType?: string;
  allergySummary?: string;
  allergyHistory?: string;
  lastVisitDate?: string;
}

interface FamilyElderRow {
  id?: string;
  name?: string;
  age?: number;
  archiveNo?: string;
  lastUpdate?: string;
}

interface FamilyElderDetailResponse {
  id?: string;
  name?: string;
  age?: number;
  gender?: string;
  bloodType?: string;
  allergyHistory?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  backupContactName?: string;
  backupContactPhone?: string;
  backupContactRelation?: string;
}

export interface WorkbenchElderListItem extends CurrentElderSummary {}

export interface WorkbenchElderDetail extends WorkbenchElderListItem {
  backupContactName: string;
  backupContactPhone: string;
  backupContactRelation: string;
  detailMode: 'FULL' | 'SUMMARY';
}

export interface WorkbenchBasicFormValue {
  name: string;
  gender: string;
  age: string;
  residence: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  backupContactName: string;
  backupContactPhone: string;
  backupContactRelation: string;
  aboType: string;
  rhType: string;
  allergyHistory: string;
}

function buildBloodType(aboType?: string, rhType?: string) {
  return [aboType, rhType].filter(Boolean).join(' ').trim();
}

function mapVolunteerElder(row: VolunteerElderRow): WorkbenchElderListItem {
  return {
    id: String(row.id || row.elderId || ''),
    archiveNo: String(row.archiveNo || ''),
    name: String(row.name || ''),
    age: Number(row.age || 0),
    gender: String(row.gender || ''),
    residence: String(row.residence || ''),
    bloodType: buildBloodType(row.aboType, row.rhType),
    allergyHistory: String(row.allergySummary || row.allergyHistory || ''),
    emergencyContactName: String(row.emergencyContactName || ''),
    emergencyContactPhone: String(row.emergencyContactPhone || row.emergencyPhoneDial || ''),
    emergencyContactRelation: String(row.emergencyContactRelation || row.relationship || ''),
    lastUpdate: String(row.lastVisitDate || ''),
    role: ROLE_TYPES.volunteer,
  };
}

function mapFamilyElder(row: FamilyElderRow): WorkbenchElderListItem {
  return {
    id: String(row.id || ''),
    archiveNo: String(row.archiveNo || ''),
    name: String(row.name || ''),
    age: Number(row.age || 0),
    gender: '',
    residence: '',
    bloodType: '',
    allergyHistory: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    lastUpdate: String(row.lastUpdate || ''),
    role: ROLE_TYPES.family,
  };
}

export async function fetchWorkbenchElders(role: RoleType): Promise<WorkbenchElderListItem[]> {
  if (role === ROLE_TYPES.volunteer) {
    const rows = await httpClient.get<VolunteerElderRow[]>('/api/volunteer/me/elders');
    return rows.map(mapVolunteerElder);
  }

  const rows = await httpClient.get<FamilyElderRow[]>('/api/family/me/elders');
  return rows.map(mapFamilyElder);
}

function mergeWithCurrentSummary(detail: FamilyElderDetailResponse, summary?: CurrentElderSummary | null): WorkbenchElderDetail {
  return {
    id: String(detail.id || summary?.id || ''),
    archiveNo: summary?.archiveNo || '',
    name: String(detail.name || summary?.name || ''),
    age: Number(detail.age || summary?.age || 0),
    gender: String(detail.gender || summary?.gender || ''),
    residence: summary?.residence || '',
    bloodType: String(detail.bloodType || summary?.bloodType || ''),
    allergyHistory: String(detail.allergyHistory || summary?.allergyHistory || ''),
    emergencyContactName: String(detail.emergencyContactName || summary?.emergencyContactName || ''),
    emergencyContactPhone: String(detail.emergencyContactPhone || summary?.emergencyContactPhone || ''),
    emergencyContactRelation: String(detail.emergencyContactRelation || summary?.emergencyContactRelation || ''),
    lastUpdate: summary?.lastUpdate || '',
    role: ROLE_TYPES.family,
    backupContactName: String(detail.backupContactName || ''),
    backupContactPhone: String(detail.backupContactPhone || ''),
    backupContactRelation: String(detail.backupContactRelation || ''),
    detailMode: 'FULL',
  };
}

export async function fetchWorkbenchElderDetail(role: RoleType, elderId: string): Promise<WorkbenchElderDetail> {
  const cachedSummary = getCurrentElderSummary();
  const currentSummary = cachedSummary?.id === elderId ? cachedSummary : null;

  if (role === ROLE_TYPES.family) {
    const detail = await httpClient.get<FamilyElderDetailResponse>(`/api/family/elders/${encodeURIComponent(elderId)}`);
    return mergeWithCurrentSummary(detail, currentSummary);
  }

  if (currentSummary) {
    return {
      ...currentSummary,
      backupContactName: '',
      backupContactPhone: '',
      backupContactRelation: '',
      detailMode: 'SUMMARY',
    };
  }

  const elders = await fetchWorkbenchElders(role);
  const matched = elders.find((item) => item.id === elderId);

  if (!matched) {
    throw new Error('未找到对应老人信息');
  }

  return {
    ...matched,
    backupContactName: '',
    backupContactPhone: '',
    backupContactRelation: '',
    detailMode: 'SUMMARY',
  };
}

export function createBasicFormValue(detail: WorkbenchElderDetail): WorkbenchBasicFormValue {
  const bloodParts = detail.bloodType ? detail.bloodType.split(/\s+/).filter(Boolean) : [];

  return {
    name: detail.name || '',
    gender: detail.gender || '男',
    age: detail.age ? String(detail.age) : '',
    residence: detail.residence || '',
    emergencyContactName: detail.emergencyContactName || '',
    emergencyContactPhone: detail.emergencyContactPhone || '',
    emergencyContactRelation: detail.emergencyContactRelation || '',
    backupContactName: detail.backupContactName || '',
    backupContactPhone: detail.backupContactPhone || '',
    backupContactRelation: detail.backupContactRelation || '',
    aboType: bloodParts[0] || '',
    rhType: bloodParts.slice(1).join(' '),
    allergyHistory: detail.allergyHistory || '',
  };
}

export async function saveVolunteerBasicInfo(elderId: string, formValue: WorkbenchBasicFormValue) {
  return httpClient.put<{ recordId: string }>(`/api/elder/${encodeURIComponent(elderId)}/basic`, {
    name: formValue.name.trim(),
    gender: formValue.gender.trim(),
    age: Number(formValue.age || 0),
    residence: formValue.residence.trim(),
    emergencyContactName: formValue.emergencyContactName.trim(),
    emergencyPhone: formValue.emergencyContactPhone.trim(),
    relationship: formValue.emergencyContactRelation.trim(),
    backupContactName: formValue.backupContactName.trim(),
    backupPhone: formValue.backupContactPhone.trim(),
    aboType: formValue.aboType.trim(),
    rhType: formValue.rhType.trim(),
    allergySummary: formValue.allergyHistory.trim(),
  });
}

export async function updateFamilyContacts(elderId: string, formValue: WorkbenchBasicFormValue) {
  await httpClient.put<void>(`/api/family/elders/${encodeURIComponent(elderId)}/contacts`, {
    emergencyContactName: formValue.emergencyContactName.trim(),
    emergencyContactPhone: formValue.emergencyContactPhone.trim(),
    emergencyContactRelation: formValue.emergencyContactRelation.trim(),
    backupContactName: formValue.backupContactName.trim(),
    backupContactPhone: formValue.backupContactPhone.trim(),
    backupContactRelation: formValue.backupContactRelation.trim(),
  });
}

export async function createVolunteerElder(formValue: WorkbenchBasicFormValue): Promise<{ id: string }> {
  return httpClient.post<{ id: string }>('/api/volunteer/me/elders', {
    name: formValue.name.trim(),
    gender: formValue.gender.trim(),
    age: Number(formValue.age || 0),
    residence: formValue.residence.trim(),
    emergencyContactName: formValue.emergencyContactName.trim(),
    emergencyPhone: formValue.emergencyContactPhone.trim(),
    relationship: formValue.emergencyContactRelation.trim(),
    backupContactName: formValue.backupContactName.trim(),
    backupPhone: formValue.backupContactPhone.trim(),
    aboType: formValue.aboType.trim(),
    rhType: formValue.rhType.trim(),
    allergySummary: formValue.allergyHistory.trim(),
  });
}
