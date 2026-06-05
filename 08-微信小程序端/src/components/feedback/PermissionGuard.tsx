import { memo, type ReactNode } from 'react';
import { Text, View } from '@tarojs/components';

export interface PermissionGuardProps {
  allowed: boolean;
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

export const PermissionGuard = memo(function PermissionGuard({
  allowed,
  children,
  fallbackTitle = '当前无访问权限',
  fallbackDescription = '请切换到有权限的账号，或返回上一页继续操作。',
}: PermissionGuardProps) {
  if (allowed) {
    return <>{children}</>;
  }

  return (
    <View className='sl-card' style={{ padding: '30rpx 26rpx', display: 'flex', flexDirection: 'column', gap: '14rpx' }}>
      <View style={{ fontSize: '30rpx', fontWeight: '700', color: 'var(--sl-color-danger)' }}>{fallbackTitle}</View>
      <Text style={{ fontSize: '24rpx', lineHeight: '1.7', color: 'var(--sl-color-text-secondary)' }}>{fallbackDescription}</Text>
    </View>
  );
});

export default PermissionGuard;
