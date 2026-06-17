import { ENTRY_KEYS, STORAGE_KEYS } from '@/app/app.constants';
import { getStorageValue, removeStorageValue, setStorageValue } from '@/utils/storage';

export type HomeEntrySource = (typeof ENTRY_KEYS)[keyof typeof ENTRY_KEYS] | 'unknown';

export interface AppSessionState {
  homeEntrySource: HomeEntrySource;
  privacyAccepted: boolean;
  lastWorkbenchOpenedAt: number;
}

const DEFAULT_APP_SESSION: AppSessionState = {
  homeEntrySource: 'unknown',
  privacyAccepted: false,
  lastWorkbenchOpenedAt: 0,
};

let appSessionCache: AppSessionState | undefined;

export function getAppSession() {
  if (appSessionCache) {
    return appSessionCache;
  }

  appSessionCache = getStorageValue<AppSessionState>(STORAGE_KEYS.appSession, DEFAULT_APP_SESSION);
  return appSessionCache;
}

export function saveAppSession(nextState: AppSessionState) {
  appSessionCache = nextState;
  setStorageValue(STORAGE_KEYS.appSession, nextState);
  return nextState;
}

export function updateAppSession(patch: Partial<AppSessionState>) {
  return saveAppSession({
    ...getAppSession(),
    ...patch,
  });
}

export function clearAppSession() {
  appSessionCache = undefined;
  removeStorageValue(STORAGE_KEYS.appSession);
}
