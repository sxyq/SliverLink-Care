import Taro from '@tarojs/taro';
import QRCode from 'qrcode';

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
  publicUrl: string;
  qrImageBase64: string;
  qrImageUrl: string;
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
  backQrUrl: string;
  backQrPayload: string;
  backQrImageBase64: string;
  backArchiveNo: string;
  backHint: string;
  pdfPreviewImageBase64: string;
  blankTemplate: boolean;
}

function normalizeBase64Image(value?: string) {
  if (!value) {
    return '';
  }

  const normalized = value.startsWith('data:image') ? value.replace(/^data:image\/\w+;base64,/, '') : value;
  return normalized.replace(/\s+/g, '').trim();
}

function getMiniAppFileContext() {
  const wxApi = (globalThis as { wx?: any }).wx;
  const fileSystemManager = wxApi?.getFileSystemManager?.() || Taro.getFileSystemManager?.();
  const userDataPath =
    wxApi?.env?.USER_DATA_PATH || (Taro.env as { USER_DATA_PATH?: string } | undefined)?.USER_DATA_PATH || '';

  return {
    fileSystemManager,
    userDataPath,
  };
}

async function writeBase64ImageToLocal(base64: string, prefix: string) {
  const { fileSystemManager, userDataPath } = getMiniAppFileContext();
  if (!fileSystemManager || !userDataPath) {
    return '';
  }

  const filePath = `${userDataPath}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  const wxApi = (globalThis as { wx?: any }).wx;
  const base64ToArrayBuffer = wxApi?.base64ToArrayBuffer || Taro.base64ToArrayBuffer;

  if (typeof base64ToArrayBuffer === 'function') {
    try {
      const buffer = base64ToArrayBuffer(base64);
      await new Promise<void>((resolve, reject) => {
        fileSystemManager.writeFile({
          filePath,
          data: buffer,
          success: () => resolve(),
          fail: reject,
        });
      });
      return filePath;
    } catch {
      // Fall through to the legacy base64 write path below.
    }
  }

  await new Promise<void>((resolve, reject) => {
    fileSystemManager.writeFile({
      filePath,
      data: base64,
      encoding: 'base64',
      success: () => resolve(),
      fail: reject,
    });
  });
  return filePath;
}

export async function resolveBase64PreviewImage(value: string, prefix = 'preview-image') {
  const normalized = normalizeBase64Image(value);
  if (!normalized) {
    return '';
  }

  try {
    const localPath = await writeBase64ImageToLocal(normalized, prefix);
    if (localPath) {
      return localPath;
    }
  } catch {
    // Fall through to a data URL when local file persistence is unavailable.
  }

  return `data:image/png;base64,${normalized}`;
}

async function createQrDataUrl(value: string) {
  if (!value) {
    return '';
  }

  return QRCode.toDataURL(value, { width: 220, margin: 1, errorCorrectionLevel: 'M' });
}

export async function resolveQrPayloadPreviewImage(value: string, prefix = 'qr-preview'): Promise<string> {
  if (!value) {
    return '';
  }

  try {
    const dataUrl = await createQrDataUrl(value);
    const base64 = normalizeBase64Image(dataUrl);
    if (!base64) {
      return dataUrl;
    }

    try {
      const localPath = await writeBase64ImageToLocal(base64, prefix);
      if (localPath) {
        return localPath;
      }
    } catch {
      // Fall back to raw data URL below.
    }

    return dataUrl;
  } catch {
    return '';
  }
}

export function resolveQrDisplayUrl(token: string, directUrl?: string, publicUrl?: string) {
  if (publicUrl) {
    return publicUrl;
  }

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

export function resolveNameplateQrValue(rawValue: string) {
  const value = String(rawValue || '').trim();
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return resolveQrDisplayUrl(value);
}

export async function resolveWorkbenchQrPreviewImage(info: Pick<WorkbenchQrCodeInfo, 'token' | 'url' | 'publicUrl' | 'qrImageBase64' | 'qrImageUrl'>): Promise<string> {
  const base64 = normalizeBase64Image(info.qrImageBase64);
  if (base64) {
    try {
      const filePath = await writeBase64ImageToLocal(base64, 'qr-preview');
      if (filePath) {
        return filePath;
      }
    } catch {
      // Fall through to the raw base64 path or other preview strategies below.
    }

    return info.qrImageBase64.startsWith('data:') ? info.qrImageBase64 : `data:image/png;base64,${base64}`;
  }

  if (info.qrImageUrl) {
    return info.qrImageUrl;
  }

  const displayUrl = resolveQrDisplayUrl(info.token, info.url, info.publicUrl);
  if (!displayUrl) {
    return '';
  }

  return resolveQrPayloadPreviewImage(displayUrl, 'qr-preview');
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
    publicUrl: String(payload.publicUrl || payload.url || ''),
    qrImageBase64: String(payload.qrImageBase64 || ''),
    qrImageUrl: String(payload.qrImageUrl || ''),
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
    backQrToken: String(result.backQrToken || result.backQrUrl || result.backQrPayload || ''),
    backQrUrl: String(result.backQrUrl || result.backQrToken || ''),
    backQrPayload: String(result.backQrPayload || result.backQrUrl || result.backQrToken || ''),
    backQrImageBase64: String(result.backQrImageBase64 || ''),
    backArchiveNo: String(result.backArchiveNo || ''),
    backHint: String(result.backHint || ''),
    pdfPreviewImageBase64: String(result.pdfPreviewImageBase64 || ''),
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
