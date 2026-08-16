import { describe, expect, it } from 'vitest';
import {
  ApiMessageError,
  LOCALE_META,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  createI18nRuntime,
  getDirection,
  getErrorMessage,
  getLocaleLabel,
  getMessageKeys,
  isSupportedLocale,
  messages,
  resolveApiMessage,
  type Locale,
} from '@shared-i18n/messages';

const EXPECTED_GROUPS = ['common', 'auth', 'scan', 'verification', 'workbench', 'family', 'status', 'errors'];
const EXPECTED_LEAF_KEY_COUNT = 684;

function readLeaf(tree: unknown, key: string): string {
  const value = key.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[part];
  }, tree);
  return typeof value === 'string' ? value : '';
}

function collectStringValues(value: unknown, result: string[] = []): string[] {
  if (typeof value === 'string') {
    result.push(value);
  } else if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((child) => collectStringValues(child, result));
  }
  return result;
}

function placeholderNames(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

function createMapStorage(initial?: string | null) {
  const values = new Map<string, string>();
  if (initial !== undefined && initial !== null) values.set(LOCALE_STORAGE_KEY, initial);
  return {
    values,
    storage: {
      getItem: (key: string) => values.get(key) || null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  };
}

describe('shared i18n message catalog', () => {
  it('keeps all three eight-group trees complete, unique, non-empty, and placeholder-compatible', () => {
    expect(SUPPORTED_LOCALES).toEqual(['zh-CN', 'ug-Arab-CN', 'kk-Arab-CN']);

    const chineseKeys = getMessageKeys(messages['zh-CN']);
    for (const locale of SUPPORTED_LOCALES) {
      const keys = getMessageKeys(messages[locale]);
      expect(Object.keys(messages[locale]).sort()).toEqual([...EXPECTED_GROUPS].sort());
      expect(keys).toHaveLength(EXPECTED_LEAF_KEY_COUNT);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys).toEqual(chineseKeys);

      const values = collectStringValues(messages[locale]);
      expect(values).toHaveLength(EXPECTED_LEAF_KEY_COUNT);
      expect(values.every((value) => value.trim().length > 0)).toBe(true);

      for (const key of chineseKeys) {
        const source = readLeaf(messages['zh-CN'], key);
        const translated = readLeaf(messages[locale], key);
        expect(translated).not.toBe('');
        expect(placeholderNames(translated)).toEqual(placeholderNames(source));
      }
    }

    const kkValues = collectStringValues(messages['kk-Arab-CN']);
    expect(kkValues.every((value) => !/[\u4e00-\u9fff\u0400-\u04ff]/.test(value))).toBe(true);
  });
});

describe('shared i18n runtime', () => {
  it('exposes the three locale labels and directions', () => {
    expect(isSupportedLocale('zh-CN')).toBe(true);
    expect(isSupportedLocale('ug-Arab-CN')).toBe(true);
    expect(isSupportedLocale('kk-Arab-CN')).toBe(true);
    expect(isSupportedLocale('kk')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(LOCALE_META['zh-CN'].direction).toBe('ltr');
    expect(LOCALE_META['ug-Arab-CN'].direction).toBe('rtl');
    expect(LOCALE_META['kk-Arab-CN'].direction).toBe('rtl');
    expect(getDirection('zh-CN')).toBe('ltr');
    expect(getDirection('ug-Arab-CN')).toBe('rtl');
    expect(getDirection('kk-Arab-CN')).toBe('rtl');
    expect(getLocaleLabel('kk-Arab-CN')).toBe('قازاقشا');
  });

  it('defaults invalid stored values to Chinese and persists every supported locale', () => {
    for (const invalid of ['en-US', 'kk', '', 'null']) {
      const { storage } = createMapStorage(invalid);
      expect(createI18nRuntime(storage).getLocale()).toBe('zh-CN');
    }

    const { storage, values } = createMapStorage();
    for (const locale of SUPPORTED_LOCALES) {
      const runtime = createI18nRuntime(storage);
      runtime.setLocale(locale);
      expect(runtime.getLocale()).toBe(locale);
      expect(runtime.getDirection()).toBe(LOCALE_META[locale].direction);
      expect(values.get(LOCALE_STORAGE_KEY)).toBe(locale);
      expect(createI18nRuntime(storage).getLocale()).toBe(locale);
    }

    const runtime = createI18nRuntime(storage);
    runtime.setLocale('not-supported' as Locale);
    expect(runtime.getLocale()).toBe('zh-CN');
    expect(values.get(LOCALE_STORAGE_KEY)).toBe('zh-CN');
  });

  it('survives storage failures and keeps the in-memory locale usable', () => {
    const runtime = createI18nRuntime({
      getItem: () => { throw new Error('read blocked'); },
      setItem: () => { throw new Error('write blocked'); },
    });

    expect(runtime.getLocale()).toBe('zh-CN');
    expect(() => runtime.setLocale('kk-Arab-CN')).not.toThrow();
    expect(runtime.getLocale()).toBe('kk-Arab-CN');
    expect(runtime.t('common.yearsOld', { age: 78 })).toBe('78 جىل');
  });

  it('uses current locale, Chinese, then the key for translation fallback', () => {
    const { storage } = createMapStorage();
    const runtime = createI18nRuntime(storage);
    runtime.setLocale('kk-Arab-CN');

    const kkCommon = messages['kk-Arab-CN'].common as Record<string, unknown>;
    const originalYearsOld = kkCommon.yearsOld;
    delete kkCommon.yearsOld;
    try {
      expect(runtime.t('common.yearsOld', { age: 78 })).toBe('78 岁');
    } finally {
      kkCommon.yearsOld = originalYearsOld;
    }

    expect(runtime.t('common.yearsOld', { age: 78 })).toBe('78 جىل');
    expect(runtime.t('missing.registered.key')).toBe('missing.registered.key');
  });

  it('lets every locale determine the years-old wording and preserves parameter names', () => {
    const { storage } = createMapStorage();
    const runtime = createI18nRuntime(storage);
    const expected = {
      'zh-CN': '78 岁',
      'ug-Arab-CN': '78 ياش',
      'kk-Arab-CN': '78 جىل',
    } as const;

    for (const locale of SUPPORTED_LOCALES) {
      runtime.setLocale(locale);
      expect(runtime.t('common.yearsOld', { age: 78 })).toBe(expected[locale]);
      expect(runtime.t('common.daysRemaining', { days: 3 })).not.toContain('{days}');
    }
  });
});

describe('shared API message fallback', () => {
  it('prefers a known key, keeps an unknown key response message, and falls back to requestFailed', () => {
    const { storage } = createMapStorage();
    const runtime = createI18nRuntime(storage);
    runtime.setLocale('kk-Arab-CN');

    expect(resolveApiMessage({
      message: '账号或密码错误',
      messageKey: 'errors.loginFailed',
    }, runtime.t).message).toBe('ەسەپتىك جازبا نەمەسە قۇپياسوز دۇرىس ەمەس');

    expect(resolveApiMessage({
      message: '服务端自定义提示',
      messageKey: 'errors.unknownKey',
    }, runtime.t).message).toBe('服务端自定义提示');

    expect(resolveApiMessage({ message: '   ', messageKey: 'errors.unknownKey' }, runtime.t).message)
      .toBe(runtime.t('errors.requestFailed'));
    expect(resolveApiMessage('', runtime.t).message).toBe(runtime.t('errors.requestFailed'));
    expect(getErrorMessage(new ApiMessageError('', 'errors.unknownKey'), runtime.t, 'errors.requestFailed'))
      .toBe(runtime.t('errors.requestFailed'));
  });
});
