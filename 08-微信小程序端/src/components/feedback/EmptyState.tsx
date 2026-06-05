import { memo } from 'react';
import { Button, Text, View } from '@tarojs/components';

export interface EmptyStateProps {
  title: string;
  description?: string;
  primaryActionText?: string;
  secondaryActionText?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}

export const EmptyState = memo(function EmptyState({
  title,
  description,
  primaryActionText,
  secondaryActionText,
  onPrimaryAction,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <View className='sl-card' style={{ padding: '30rpx 26rpx', display: 'flex', flexDirection: 'column', gap: '18rpx', textAlign: 'center' }}>
      <View style={{ fontSize: '30rpx', fontWeight: '700', color: 'var(--sl-color-text)' }}>{title}</View>
      {description ? (
        <Text style={{ fontSize: '24rpx', lineHeight: '1.7', color: 'var(--sl-color-text-secondary)' }}>{description}</Text>
      ) : null}
      {primaryActionText || secondaryActionText ? (
        <View style={{ display: 'flex', flexDirection: 'column', gap: '14rpx' }}>
          {primaryActionText ? (
            <Button className='sl-primary-button' onClick={onPrimaryAction}>
              {primaryActionText}
            </Button>
          ) : null}
          {secondaryActionText ? (
            <Button className='sl-secondary-button' onClick={onSecondaryAction}>
              {secondaryActionText}
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

export default EmptyState;
