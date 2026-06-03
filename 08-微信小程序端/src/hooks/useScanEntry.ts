import Taro from '@tarojs/taro';

import { APP_ROUTES, ERROR_MESSAGES } from '@/app/app.constants';
import { parseRouteText } from '@/utils/routeParams';

function buildScanLandingUrl(rawResult: string) {
  const params = parseRouteText(rawResult);
  const searchParams = new URLSearchParams();

  if (params.qrToken) {
    searchParams.set('qrToken', params.qrToken);
  }
  if (params.elderId) {
    searchParams.set('elderId', params.elderId);
  }
  if (params.archiveNo) {
    searchParams.set('archiveNo', params.archiveNo);
  }

  searchParams.set('source', params.source || 'wx-scan');

  const queryString = searchParams.toString();
  return queryString ? `${APP_ROUTES.scanLanding}?${queryString}` : '';
}

export function useScanEntry() {
  return async function openScan() {
    try {
      const result = await Taro.scanCode({ onlyFromCamera: false, scanType: ['qrCode'] });
      const landingUrl = buildScanLandingUrl(result.result || '');

      if (!landingUrl) {
        await Taro.showToast({ title: ERROR_MESSAGES.invalidQr, icon: 'none' });
        return;
      }

      await Taro.navigateTo({
        url: landingUrl,
      });
    } catch (error) {
      const errMsg = String((error as { errMsg?: string })?.errMsg || '');
      if (!errMsg.includes('cancel')) {
        await Taro.showToast({ title: ERROR_MESSAGES.requestFailed, icon: 'none' });
      }
    }
  };
}
