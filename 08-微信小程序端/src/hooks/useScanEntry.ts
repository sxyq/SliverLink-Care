import Taro from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import { parseRouteText } from '@/utils/routeParams';
import { i18nRuntime } from '@/i18n';

const CAMERA_SCOPE = 'scope.camera';

function isCancelError(message: string) {
  return message.includes('cancel');
}

function isPermissionError(message: string) {
  return message.includes('auth deny') || message.includes('auth denied') || message.includes('authorize no response');
}

async function ensureCameraPermission(t: (key: string) => string) {
  const setting = await Taro.getSetting();
  const cameraPermission = setting.authSetting?.[CAMERA_SCOPE];

  if (cameraPermission === true) {
    return true;
  }

  if (cameraPermission === false) {
    const modal = await Taro.showModal({
      title: t('errors.cameraPermissionTitle'),
      content: t('errors.cameraPermissionDescription'),
      confirmText: t('common.goToSettings'),
      cancelText: t('common.cancel'),
    });

    if (!modal.confirm) {
      return false;
    }

    const openSettingResult = await Taro.openSetting();
    return openSettingResult.authSetting?.[CAMERA_SCOPE] === true;
  }

  try {
    await Taro.authorize({ scope: CAMERA_SCOPE });
    return true;
  } catch (error) {
    const errMsg = String((error as { errMsg?: string })?.errMsg || '');

    if (isCancelError(errMsg)) {
      return false;
    }

    if (isPermissionError(errMsg)) {
      const modal = await Taro.showModal({
        title: t('errors.cameraPermissionTitle'),
        content: t('errors.cameraPermissionNotEnabled'),
        confirmText: t('common.goToSettings'),
        cancelText: t('common.cancel'),
      });

      if (!modal.confirm) {
        return false;
      }

      const openSettingResult = await Taro.openSetting();
      return openSettingResult.authSetting?.[CAMERA_SCOPE] === true;
    }

    throw error;
  }
}

function buildScanLandingUrl(rawResult: string) {
  const params = parseRouteText(rawResult);
  const searchParams = new URLSearchParams();

  if (!params.qrToken) {
    return '';
  }

  searchParams.set('qrToken', params.qrToken);
  searchParams.set('source', params.source || 'wx-scan');

  const queryString = searchParams.toString();
  return queryString ? `${APP_ROUTES.scanLanding}?${queryString}` : '';
}

export function useScanEntry() {
  const t = (key: string) => i18nRuntime.t(key);
  const ERROR_MESSAGES = {
    invalidQr: t('errors.invalidQr'),
  };

  return async function openScan() {
    try {
      const cameraGranted = await ensureCameraPermission(t);

      if (!cameraGranted) {
        return;
      }

      const result = await Taro.scanCode({ onlyFromCamera: true, scanType: ['qrCode'] });
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
      if (isCancelError(errMsg)) {
        return;
      }

      if (isPermissionError(errMsg)) {
        await Taro.showToast({ title: t('errors.cameraPermissionDenied'), icon: 'none' });
        return;
      }

      if (errMsg.includes('not supported') || errMsg.includes('fail')) {
        await Taro.showToast({ title: t('errors.scanUnsupported'), icon: 'none' });
        return;
      }

      await Taro.showToast({ title: t('errors.requestFailed'), icon: 'none' });
    }
  };
}
