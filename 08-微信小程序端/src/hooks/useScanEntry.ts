import Taro from '@tarojs/taro';

import { APP_ROUTES, ERROR_MESSAGES } from '@/app/app.constants';

function extractQrToken(rawResult: string) {
  try {
    const url = new URL(rawResult);
    return url.searchParams.get('qrToken') || url.searchParams.get('token') || '';
  } catch {
    return '';
  }
}

export function useScanEntry() {
  return async function openScan() {
    try {
      const result = await Taro.scanCode({ onlyFromCamera: false, scanType: ['qrCode'] });
      const qrToken = extractQrToken(result.result || '');

      if (!qrToken) {
        await Taro.showToast({ title: ERROR_MESSAGES.invalidQr, icon: 'none' });
        return;
      }

      await Taro.navigateTo({
        url: `${APP_ROUTES.scanLanding}?qrToken=${encodeURIComponent(qrToken)}&source=wx-scan`,
      });
    } catch (error) {
      const errMsg = String((error as { errMsg?: string })?.errMsg || '');
      if (!errMsg.includes('cancel')) {
        await Taro.showToast({ title: ERROR_MESSAGES.requestFailed, icon: 'none' });
      }
    }
  };
}
