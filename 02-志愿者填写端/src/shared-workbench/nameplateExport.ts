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
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Some in-app browsers ignore programmatic anchor clicks unless the page
  // visibly navigates, so fall back to direct navigation.
  window.setTimeout(() => {
    if (document.visibilityState === 'visible') {
      window.location.href = url;
    }
  }, 180);
}
