import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import { createLaunchContext, readLaunchContext, type AppLaunchContext } from '@/app/app.lifecycle';
import type { LaunchRouteParams } from '@/utils/routeParams';

function getFallbackLaunchContext() {
  const launchOptions = typeof Taro.getLaunchOptionsSync === 'function' ? Taro.getLaunchOptionsSync() : undefined;
  return createLaunchContext(launchOptions?.query);
}

export function buildScanLandingUrl(params: LaunchRouteParams) {
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
  if (params.source) {
    searchParams.set('source', params.source);
  }

  const queryString = searchParams.toString();
  return queryString ? `${APP_ROUTES.scanLanding}?${queryString}` : APP_ROUTES.scanLanding;
}

export interface UseAppLaunchResult {
  context: AppLaunchContext;
  isScanLaunch: boolean;
  scanLandingUrl: string;
  refresh: () => void;
}

export function useAppLaunch(): UseAppLaunchResult {
  const [context, setContext] = useState<AppLaunchContext>(() => readLaunchContext() || getFallbackLaunchContext());

  const refresh = () => {
    setContext(readLaunchContext() || getFallbackLaunchContext());
  };

  useDidShow(() => {
    refresh();
  });

  return {
    context,
    isScanLaunch: context.launchMode === 'scan',
    scanLandingUrl: buildScanLandingUrl(context.params),
    refresh,
  };
}
