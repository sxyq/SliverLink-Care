import { createI18nRuntime } from '@shared-i18n/messages';

const browserStorage = {
  getItem(key: string) {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Keep the current locale in memory when browser storage is unavailable.
    }
  },
};

export const i18nRuntime = createI18nRuntime(browserStorage);
export { I18nProvider, useI18n } from '@shared-i18n/react';
export type { Locale, Direction } from '@shared-i18n/messages';
