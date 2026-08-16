import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { createI18nRuntime, getDirection, type Direction, type Locale, type MessageParams } from './messages';

export interface I18nRuntime {
  t(key: string, params?: MessageParams): string;
  setLocale(locale: Locale): void;
  getLocale(): Locale;
  getDirection(locale?: Locale): Direction;
}

interface I18nContextValue extends I18nRuntime {
  locale: Locale;
  direction: Direction;
}

const defaultRuntime = createI18nRuntime({
  getItem: () => null,
  setItem: () => undefined,
});

const defaultI18nValue: I18nContextValue = {
  t: defaultRuntime.t,
  setLocale: defaultRuntime.setLocale,
  getLocale: defaultRuntime.getLocale,
  getDirection: defaultRuntime.getDirection,
  locale: 'zh-CN',
  direction: getDirection('zh-CN'),
};

const I18nContext = createContext<I18nContextValue>(defaultI18nValue);
const useDocumentLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

export function I18nProvider({ runtime, children }: { runtime: I18nRuntime; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => runtime.getLocale());
  const direction = runtime.getDirection(locale);

  const setLocale = useCallback((nextLocale: Locale) => {
    runtime.setLocale(nextLocale);
    setLocaleState(runtime.getLocale());
  }, [runtime]);

  // Consumers treat t as locale-sensitive when deriving memoized labels and effects.
  const t = useCallback((key: string, params?: MessageParams) => (
    runtime.t(key, params)
  ), [locale, runtime]);

  const value = useMemo<I18nContextValue>(() => ({
    t,
    setLocale,
    getLocale: runtime.getLocale,
    getDirection: runtime.getDirection,
    locale,
    direction,
  }), [direction, locale, runtime, setLocale, t]);

  useDocumentLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dir = direction;
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
  }, [direction, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
