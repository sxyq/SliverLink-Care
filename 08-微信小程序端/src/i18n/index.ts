import Taro from '@tarojs/taro';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

import {
  createI18nRuntime,
  type Direction,
  type Locale,
  type MessageParams,
} from '@shared-i18n/messages';

const miniStorage = {
  getItem(key: string) {
    try {
      const value = Taro.getStorageSync<string>(key);
      return value || null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      Taro.setStorageSync(key, value);
    } catch {
      // 本地存储不可用时不影响当前页面使用。
    }
  },
};

export const i18nRuntime = createI18nRuntime(miniStorage);
const localeListeners = new Set<() => void>();

function subscribeLocale(listener: () => void) {
  localeListeners.add(listener);
  return () => localeListeners.delete(listener);
}

function getLocaleSnapshot() {
  return i18nRuntime.getLocale();
}

export function useI18n() {
  const locale = useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getLocaleSnapshot);

  const setLocale = useCallback((nextLocale: Locale) => {
    i18nRuntime.setLocale(nextLocale);
    localeListeners.forEach((listener) => listener());
  }, []);

  const direction: Direction = i18nRuntime.getDirection(locale);
  const t = useCallback((key: string, params?: MessageParams) => i18nRuntime.t(key, params), [locale]);

  return useMemo(() => ({
    t,
    setLocale,
    getLocale: () => i18nRuntime.getLocale(),
    getDirection: (targetLocale?: Locale) => i18nRuntime.getDirection(targetLocale),
    locale,
    direction,
  }), [direction, locale, setLocale, t]);
}

export type { Locale, Direction };
