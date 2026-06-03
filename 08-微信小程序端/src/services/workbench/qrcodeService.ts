import Taro from '@tarojs/taro';

import { ROLE_TYPES, type RoleType } from '@/app/app.constants';
import { httpClient } from '@/services/api/httpClient';
import { getApiBaseUrl } from '@/utils/env';

export interface WorkbenchQrCodeInfo {
  token: string;
  status: string;
  createdAt: string;
  pdfUrl: string;
  disableReviewStatus: string;
  disableReviewId: string;
  reviewMessage: string;
  url: string;
  securityNote: string;
  elderName: string;
  archiveNo: string;
}

export interface NameplatePreviewInfo {
  elderId: string;
  archiveNo: string;
  frontName: string;
  frontAge: string;
  frontPhone: string;
  backQrToken: string;
  backArchiveNo: string;
  backHint: string;
  blankTemplate: boolean;
}

export function resolveQrDisplayUrl(token: string, directUrl?: string) {
  if (directUrl) {
    return directUrl;
  }

  if (!token) {
    return '';
  }

  const apiBase = getApiBaseUrl().replace(/\/+$/, '');
  const publicBase = apiBase.replace(/\/silverlink-api$/, '/silverlink');
  return `${publicBase}/scan/?token=${encodeURIComponent(token)}`;
}

function mapQrCodeInfo(payload: Record<string, unknown>) {
  return {
    token: String(payload.token || ''),
    status: String(payload.status || ''),
    createdAt: String(payload.createdAt || ''),
    pdfUrl: String(payload.pdfUrl || ''),
    disableReviewStatus: String(payload.disableReviewStatus || ''),
    disableReviewId: String(payload.disableReviewId || ''),
    reviewMessage: String(payload.reviewMessage || ''),
    url: String(payload.url || ''),
    securityNote: String(payload.securityNote || ''),
    elderName: String(payload.elderName || ''),
    archiveNo: String(payload.archiveNo || ''),
  } satisfies WorkbenchQrCodeInfo;
}

export async function fetchWorkbenchQrCode(role: RoleType, elderId: string): Promise<WorkbenchQrCodeInfo> {
  if (role === ROLE_TYPES.volunteer) {
    const result = await httpClient.get<Record<string, unknown>>(`/api/volunteer/me/elders/${encodeURIComponent(elderId)}/qr-manage`);
    return mapQrCodeInfo(result);
  }

  const result = await httpClient.get<Record<string, unknown>>(`/api/family/elders/${encodeURIComponent(elderId)}/qrcode`);
  return mapQrCodeInfo(result);
}

export async function regenerateWorkbenchQrCode(elderId: string) {
  const result = await httpClient.post<Record<string, unknown>>(`/api/volunteer/me/elders/${encodeURIComponent(elderId)}/qr-regenerate`);
  return mapQrCodeInfo(result);
}

export async function requestDisableWorkbenchQrCode(role: RoleType, elderId: string) {
  if (role === ROLE_TYPES.volunteer) {
    const result = await httpClient.put<Record<string, unknown>>(`/api/volunteer/me/elders/${encodeURIComponent(elderId)}/qr-disable`);
    return mapQrCodeInfo(result);
  }

  const result = await httpClient.post<Record<string, unknown>>(`/api/family/elders/${encodeURIComponent(elderId)}/qrcode/disable-request`);
  return mapQrCodeInfo(result);
}

export async function fetchNameplatePreview(elderId: string, blank = false): Promise<NameplatePreviewInfo> {
  const result = await httpClient.get<Record<string, unknown>>(
    `/api/nameplates/${encodeURIComponent(elderId)}/preview?blank=${blank ? 'true' : 'false'}`,
  );

  return {
    elderId: String(result.elderId || ''),
    archiveNo: String(result.archiveNo || ''),
    frontName: String(result.frontName || ''),
    frontAge: String(result.frontAge || ''),
    frontPhone: String(result.frontPhone || ''),
    backQrToken: String(result.backQrToken || ''),
    backArchiveNo: String(result.backArchiveNo || ''),
    backHint: String(result.backHint || ''),
    blankTemplate: Boolean(result.blankTemplate),
  };
}

export async function openNameplatePdf(elderId: string) {
  const file = await httpClient.download(`/api/nameplates/${encodeURIComponent(elderId)}/pdf`);
  await Taro.openDocument({
    filePath: file.tempFilePath,
    showMenu: true,
    fileType: 'pdf',
  });
}
