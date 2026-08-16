import { memo } from 'react';
import { Text, View } from '@tarojs/components';
import { useI18n } from '@/i18n';

export interface LoadingStateProps {
  title?: string;
  description?: string;
}

export const LoadingState = memo(function LoadingState({ title, description }: LoadingStateProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t('common.loading');
  const resolvedDescription = description ?? t('common.pleaseWait');

  return (
    <View className='sl-card' style={{ padding: '30rpx 26rpx', display: 'flex', flexDirection: 'column', gap: '16rpx' }}>
      <View style={{ fontSize: '30rpx', fontWeight: '700', color: 'var(--sl-color-text)' }}>{resolvedTitle}</View>
      <Text style={{ fontSize: '24rpx', lineHeight: '1.7', color: 'var(--sl-color-text-secondary)' }}>{resolvedDescription}</Text>
    </View>
  );
});

export default LoadingState;
