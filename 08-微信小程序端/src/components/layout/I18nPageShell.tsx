import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useI18n } from '@/i18n';

export function I18nPageShell({
  children,
  navigationTitleKey,
  showLanguageSwitcher = true,
}: {
  children: ReactNode;
  navigationTitleKey: string;
  showLanguageSwitcher?: boolean;
}) {
  const { direction, locale, t } = useI18n();
  const isWorkbenchPage = navigationTitleKey.startsWith('workbench.');

  useEffect(() => {
    void Taro.setNavigationBarTitle({ title: t(navigationTitleKey) });
  }, [locale, navigationTitleKey, t]);

  return (
    <View className={`sl-app-root sl-dir-${direction}`} {...{ dir: direction, lang: locale }}>
      {showLanguageSwitcher ? <LanguageSwitcher /> : null}
      {children}
      {!isWorkbenchPage ? <Text className='sl-app-attribution'>{t('common.attribution')}</Text> : null}
    </View>
  );
}
