import type { LaunchRouteParams } from '@/utils/routeParams';
import { hasScanContext, mergeLaunchRouteParams, parseQueryParams, parseSceneString } from '@/utils/routeParams';
import { getStorageValue, setStorageValue } from '@/utils/storage';
import { STORAGE_KEYS } from './app.constants';

export type LaunchMode = 'home' | 'scan';

export interface AppLaunchContext {
  launchMode: LaunchMode;
  params: LaunchRouteParams;
  openedAt: number;
}

export function createLaunchContext(query?: Record<string, unknown>) {
  const queryParams = parseQueryParams(query);
  const sceneParams = parseSceneString(queryParams.rawScene);
  const params = mergeLaunchRouteParams(queryParams, sceneParams);

  return {
    launchMode: hasScanContext(params) ? 'scan' : 'home',
    params,
    openedAt: Date.now(),
  } satisfies AppLaunchContext;
}

export function persistLaunchContext(context: AppLaunchContext) {
  setStorageValue(STORAGE_KEYS.launchContext, context);
}

export function readLaunchContext() {
  return getStorageValue<AppLaunchContext | null>(STORAGE_KEYS.launchContext, null);
}
