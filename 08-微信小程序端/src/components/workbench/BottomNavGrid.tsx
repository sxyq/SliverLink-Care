import { memo, useCallback } from 'react';
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';

type WorkbenchNavKey = 'basic' | 'medication' | 'scale' | 'qrcode';

interface BottomNavGridProps {
  elderId: string;
  activeKey: WorkbenchNavKey;
}

const NAV_ITEMS: Array<{ key: WorkbenchNavKey; title: string; desc: string; route: string }> = [
  { key: 'basic', title: '基本信息', desc: '档案资料', route: APP_ROUTES.workbenchBasic },
  { key: 'medication', title: '主要用药', desc: '用药记录', route: APP_ROUTES.workbenchMedication },
  { key: 'scale', title: '量表信息', desc: '评估记录', route: APP_ROUTES.workbenchScale },
  { key: 'qrcode', title: '二维码管理', desc: '扫码名牌', route: APP_ROUTES.workbenchQrCode },
];

export const BottomNavGrid = memo(function BottomNavGrid({ elderId, activeKey }: BottomNavGridProps) {
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
        {NAV_ITEMS.map((item) => (
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
