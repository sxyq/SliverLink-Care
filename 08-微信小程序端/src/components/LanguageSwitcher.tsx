import { useState } from 'react';
import { Button, Text, View } from '@tarojs/components';

import { useI18n } from '@/i18n';
import {
  getDirection,
  getLocaleLabel,
  LOCALE_META,
  SUPPORTED_LOCALES,
  type Locale,
} from '@shared-i18n/messages';

const localeOptions = SUPPORTED_LOCALES.filter((candidate) =>
  Object.prototype.hasOwnProperty.call(LOCALE_META, candidate),
);

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);

  function selectLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    setOpen(false);
  }

  return (
    <View className='sl-language-switcher' {...{ dir: 'ltr' }}>
      {open ? <View className='sl-language-switcher__scrim' onClick={() => setOpen(false)} catchMove /> : null}
      <Button
        className={`sl-language-switcher__trigger is-${getDirection(locale)}`}
        lang={locale as never}
        {...{ dir: getDirection(locale) }}
        aria-label={`${t('common.switchTo')}${getLocaleLabel(locale)}`}
        aria-haspopup='menu'
        aria-expanded={open}
        aria-controls='sl-language-menu'
        onClick={() => setOpen((current) => !current)}
      >
        <Text>{getLocaleLabel(locale)}</Text>
        <Text className='sl-language-switcher__chevron' aria-hidden='true'>⌄</Text>
      </Button>

      {open ? (
        <View id='sl-language-menu' className='sl-language-menu' role='menu' aria-label={t('common.switchTo')} {...{ dir: 'ltr' }}>
          {localeOptions.map((optionLocale) => (
            <Button
              key={optionLocale}
              className={`sl-language-menu__item is-${getDirection(optionLocale)}`}
              lang={optionLocale as never}
              {...{ dir: getDirection(optionLocale), role: 'menuitemradio' }}
              aria-checked={locale === optionLocale}
              onClick={() => selectLocale(optionLocale)}
            >
              <Text>{getLocaleLabel(optionLocale)}</Text>
              {locale === optionLocale ? <Text aria-hidden='true'>✓</Text> : null}
            </Button>
          ))}
        </View>
      ) : null}
    </View>
  );
}
