import { i18nRuntime } from '../i18n';

function resolveBaseUrl() {
  const configured = (import.meta as any).env?.VITE_API_BASE_URL?.trim();
  return (configured || '/silverlink-api').replace(/\/$/, '');
}

const API_BASE_URL = resolveBaseUrl();

type DownloadNameplatePdfOptions = {
  elderId: string;
  archiveNo?: string;
  tokenStorageKey: string;
};

export async function downloadNameplatePdf({ elderId, archiveNo, tokenStorageKey }: DownloadNameplatePdfOptions) {
  void archiveNo;
  const authToken = typeof window !== 'undefined' ? window.localStorage.getItem(tokenStorageKey) || '' : '';
  const url = `${API_BASE_URL}/api/nameplates/${encodeURIComponent(elderId)}/pdf`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/pdf',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(i18nRuntime.t('errors.exportRetry'));
  }
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `nameplate-${elderId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 1000);
}
