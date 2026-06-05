import { memo } from 'react';
import { Text, View } from '@tarojs/components';

export interface LoadingStateProps {
  title?: string;
  description?: string;
}

export const LoadingState = memo(function LoadingState({ title = '正在加载', description = '请稍候，系统正在准备当前页面内容。' }: LoadingStateProps) {
  return (
    <View className='sl-card' style={{ padding: '30rpx 26rpx', display: 'flex', flexDirection: 'column', gap: '16rpx' }}>
      <View style={{ fontSize: '30rpx', fontWeight: '700', color: 'var(--sl-color-text)' }}>{title}</View>
      <Text style={{ fontSize: '24rpx', lineHeight: '1.7', color: 'var(--sl-color-text-secondary)' }}>{description}</Text>
    </View>
  );
});

export default LoadingState;
