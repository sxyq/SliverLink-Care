import { memo, useCallback } from 'react';
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import { useI18n } from '@/i18n';

type WorkbenchNavKey = 'basic' | 'medication' | 'scale' | 'qrcode';

interface BottomNavGridProps {
  elderId: string;
  activeKey: WorkbenchNavKey;
}

export const BottomNavGrid = memo(function BottomNavGrid({ elderId, activeKey }: BottomNavGridProps) {
  const { t } = useI18n();
  const navItems: Array<{ key: WorkbenchNavKey; title: string; desc: string; route: string }> = [
    { key: 'basic', title: t('workbench.basicInfo'), desc: t('workbench.archiveData'), route: APP_ROUTES.workbenchBasic },
    { key: 'medication', title: t('workbench.medication'), desc: t('workbench.medicationRecords'), route: APP_ROUTES.workbenchMedication },
    { key: 'scale', title: t('workbench.scale'), desc: t('workbench.assessmentRecords'), route: APP_ROUTES.workbenchScale },
    { key: 'qrcode', title: t('workbench.qrManagement'), desc: t('workbench.scanNameplate'), route: APP_ROUTES.workbenchQrCode },
  ];
  const handleOpen = useCallback((route: string) => {
    if (!elderId) {
      return;
    }

    if (route.includes(activeKey)) {
      return;
    }

    void Taro.redirectTo({
      url: `${route}?elderId=${encodeURIComponent(elderId)}`,
    });
  }, [elderId, activeKey]);

  return (
    <View className='sl-bottom-nav-shell'>
      <View className='sl-bottom-nav-grid'>
        {navItems.map((item) => (
          <View
            key={item.key}
            className={item.key === activeKey ? 'sl-bottom-nav-card is-active' : 'sl-bottom-nav-card'}
            onClick={() => handleOpen(item.route)}
          >
            <Text className='sl-bottom-nav-card__title'>{item.title}</Text>
            <Text className='sl-bottom-nav-card__desc'>{item.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

export default BottomNavGrid;
