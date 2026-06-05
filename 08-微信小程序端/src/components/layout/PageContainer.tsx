import { memo, type ReactNode } from 'react';
import { Button, Text, View } from '@tarojs/components';

export interface PageContainerProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  showBack?: boolean;
  backText?: string;
  onBack?: () => void;
  footer?: ReactNode;
}

export const PageContainer = memo(function PageContainer({
  title,
  subtitle,
  children,
  showBack = false,
  backText = '返回',
  onBack,
  footer,
}: PageContainerProps) {
  return (
    <View className='sl-page' style={{ display: 'flex', flexDirection: 'column', gap: '24rpx' }}>
      {title || subtitle || showBack ? (
        <View className='sl-card' style={{ padding: '30rpx 26rpx', display: 'flex', flexDirection: 'column', gap: '14rpx' }}>
          {showBack ? (
            <View style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Button className='sl-secondary-button' style={{ minWidth: '180rpx' }} onClick={onBack}>
                {backText}
              </Button>
            </View>
          ) : null}
          {title ? <View style={{ fontSize: '40rpx', fontWeight: '700', color: 'var(--sl-color-text)' }}>{title}</View> : null}
          {subtitle ? (
            <Text style={{ fontSize: '24rpx', lineHeight: '1.7', color: 'var(--sl-color-text-secondary)' }}>{subtitle}</Text>
          ) : null}
        </View>
      ) : null}
      {children}
      {footer ? <View style={{ paddingBottom: '8rpx' }}>{footer}</View> : null}
    </View>
  );
});

export default PageContainer;
