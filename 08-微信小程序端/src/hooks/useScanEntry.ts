import Taro from '@tarojs/taro';

import { APP_ROUTES, ERROR_MESSAGES } from '@/app/app.constants';
import { parseRouteText } from '@/utils/routeParams';

const CAMERA_SCOPE = 'scope.camera';

function isCancelError(message: string) {
  return message.includes('cancel');
}

function isPermissionError(message: string) {
  return message.includes('auth deny') || message.includes('auth denied') || message.includes('authorize no response');
}

async function ensureCameraPermission() {
  const setting = await Taro.getSetting();
  const cameraPermission = setting.authSetting?.[CAMERA_SCOPE];

  if (cameraPermission === true) {
    return true;
  }

  if (cameraPermission === false) {
    const modal = await Taro.showModal({
      title: '需要相机权限',
      content: '扫码查看需要使用相机，请在设置中允许访问相机后重试。',
      confirmText: '去设置',
      cancelText: '取消',
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
        title: '需要相机权限',
        content: '未开启相机权限，无法直接扫码。是否现在前往设置开启？',
        confirmText: '去设置',
        cancelText: '取消',
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
  return async function openScan() {
    try {
      const cameraGranted = await ensureCameraPermission();

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
        await Taro.showToast({ title: '未获得相机权限', icon: 'none' });
        return;
      }

      if (errMsg.includes('not supported') || errMsg.includes('fail')) {
        await Taro.showToast({ title: '当前环境暂不支持直接调起扫码', icon: 'none' });
        return;
      }

      await Taro.showToast({ title: ERROR_MESSAGES.requestFailed, icon: 'none' });
    }
  };
}
