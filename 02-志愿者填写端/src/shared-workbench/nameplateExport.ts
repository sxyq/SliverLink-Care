const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

type DownloadNameplatePdfOptions = {
  elderId: string;
  archiveNo?: string;
  tokenStorageKey: string;
};

export async function downloadNameplatePdf({ elderId, archiveNo, tokenStorageKey }: DownloadNameplatePdfOptions) {
  void archiveNo;
  void tokenStorageKey;

  const url = `${API_BASE_URL}/api/nameplates/${encodeURIComponent(elderId)}/pdf`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
  });
  if (!response.ok) {
    throw new Error('导出名牌失败，请重新登录后重试');
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
