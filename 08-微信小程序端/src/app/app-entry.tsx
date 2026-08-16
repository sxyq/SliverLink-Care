import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { View } from '@tarojs/components';
import Taro, { useDidHide, useDidShow, useLaunch } from '@tarojs/taro';

import { cleanupExpiredStorage } from '@/utils/storage';
import { I18nProvider, i18nRuntime, useI18n } from '@/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { createLaunchContext, persistLaunchContext } from './app.lifecycle';

const navigationTitleKeys: Record<string, string> = {
  'pages/home/index': 'common.brandTitle',
  'pages/auth/login': 'common.brandTitle',
  'pages/auth-role-redirect/index': 'common.roleRouting',
  'subpackages/workbench/elder-list/index': 'workbench.elderArchives',
  'subpackages/workbench/elder-detail/index': 'workbench.elderDetail',
  'subpackages/workbench/basic/index': 'workbench.basicInfo',
  'subpackages/workbench/medication/index': 'workbench.medication',
  'subpackages/workbench/scale/index': 'workbench.scale',
  'subpackages/workbench/qrcode/index': 'workbench.qrViewManage',
  'subpackages/scan/landing/index': 'auth.scanView',
  'subpackages/scan/verify/index': 'common.accessVerification',
  'subpackages/scan/archive/index': 'scan.healthArchive',
  'subpackages/scan/medications/index': 'scan.medicationRecords',
  'subpackages/scan/scales/index': 'scan.scaleRecords',
  'subpackages/scan/nameplate/index': 'scan.nameplatePreview',
};

function AppContent({ children }: PropsWithChildren) {
  const { direction, locale, t } = useI18n();

  const updateNavigationTitle = () => {
    const pages = Taro.getCurrentPages();
    const route = pages[pages.length - 1]?.route || '';
    const key = navigationTitleKeys[route];
    if (key) {
      void Taro.setNavigationBarTitle({ title: t(key) });
    }
  };

  useEffect(() => {
    updateNavigationTitle();
  }, [locale]);

  useDidShow(updateNavigationTitle);

  return (
    <View className={`sl-app-root sl-dir-${direction}`}>
      <LanguageSwitcher />
      {children}
    </View>
  );
}

export default function App({ children }: PropsWithChildren) {
  useLaunch((options) => {
    persistLaunchContext(createLaunchContext(options?.query));
    cleanupExpiredStorage();
  });

  useDidShow(() => {
    // 预留登录态恢复与会话保鲜逻辑。
  });

  useDidHide(() => {
    // 预留短时敏感态清理逻辑。
  });

  return (
    <I18nProvider runtime={i18nRuntime}>
      <AppContent>{children}</AppContent>
    </I18nProvider>
  );
}
