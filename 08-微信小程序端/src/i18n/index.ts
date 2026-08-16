import Taro from '@tarojs/taro';

import { createI18nRuntime } from '@shared-i18n/messages';

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
export { I18nProvider, useI18n } from '@shared-i18n/react';
export type { Locale, Direction } from '@shared-i18n/messages';
