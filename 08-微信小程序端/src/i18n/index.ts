import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
const localeListeners = new Set<(locale: Locale) => void>();

export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>(() => i18nRuntime.getLocale());

  useEffect(() => {
    localeListeners.add(setLocaleState);
    return () => {
      localeListeners.delete(setLocaleState);
    };
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    i18nRuntime.setLocale(nextLocale);
    const resolvedLocale = i18nRuntime.getLocale();
    localeListeners.forEach((listener) => listener(resolvedLocale));
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
