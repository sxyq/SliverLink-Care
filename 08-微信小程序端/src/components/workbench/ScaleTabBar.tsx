import { memo } from 'react';
import { Button, View } from '@tarojs/components';

import type { WorkbenchScaleType } from '@/services/workbench/scaleService';

interface ScaleTabBarProps {
  activeType: WorkbenchScaleType;
  onChange: (type: WorkbenchScaleType) => void;
}

export const ScaleTabBar = memo(function ScaleTabBar({ activeType, onChange }: ScaleTabBarProps) {
  return (
    <View className='sl-scale-tabs'>
      {(['PHQ-9', 'GAD-7', 'UCLA'] as WorkbenchScaleType[]).map((type) => (
        <Button
          key={type}
          className={activeType === type ? 'sl-scale-tab is-active' : 'sl-scale-tab'}
          onClick={() => onChange(type)}
        >
          {type}
        </Button>
      ))}
    </View>
  );
});

export default ScaleTabBar;
