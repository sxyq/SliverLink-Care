import { memo, type ReactNode } from 'react';
import { Text, View } from '@tarojs/components';
import { useI18n } from '@/i18n';

export interface PermissionGuardProps {
  allowed: boolean;
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

export const PermissionGuard = memo(function PermissionGuard({
  allowed,
  children,
  fallbackTitle,
  fallbackDescription,
}: PermissionGuardProps) {
  const { t } = useI18n();
  const resolvedTitle = fallbackTitle ?? t('errors.permissionDenied');
  const resolvedDescription = fallbackDescription ?? t('errors.permissionDeniedHint');

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <View className='sl-card' style={{ padding: '30rpx 26rpx', display: 'flex', flexDirection: 'column', gap: '14rpx' }}>
      <View style={{ fontSize: '30rpx', fontWeight: '700', color: 'var(--sl-color-danger)' }}>{resolvedTitle}</View>
      <Text style={{ fontSize: '24rpx', lineHeight: '1.7', color: 'var(--sl-color-text-secondary)' }}>{resolvedDescription}</Text>
    </View>
  );
});

export default PermissionGuard;
