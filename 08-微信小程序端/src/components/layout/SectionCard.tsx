import { memo, type ReactNode } from 'react';
import { Text, View } from '@tarojs/components';

export interface SectionCardProps {
  title?: string;
  subtitle?: string;
  extra?: ReactNode;
  children?: ReactNode;
}

export const SectionCard = memo(function SectionCard({ title, subtitle, extra, children }: SectionCardProps) {
  return (
    <View className='sl-card' style={{ padding: '28rpx 24rpx', display: 'flex', flexDirection: 'column', gap: '16rpx' }}>
      {title || subtitle || extra ? (
        <View style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '18rpx' }}>
          <View style={{ display: 'flex', flexDirection: 'column', gap: '10rpx', flex: 1 }}>
            {title ? <View style={{ fontSize: '30rpx', fontWeight: '700', color: 'var(--sl-color-text)' }}>{title}</View> : null}
            {subtitle ? (
              <Text style={{ fontSize: '24rpx', lineHeight: '1.7', color: 'var(--sl-color-text-secondary)' }}>{subtitle}</Text>
            ) : null}
          </View>
          {extra ? <View>{extra}</View> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
});

export default SectionCard;
