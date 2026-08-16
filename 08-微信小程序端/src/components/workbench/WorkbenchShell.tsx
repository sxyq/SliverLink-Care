import { memo, type ReactNode } from 'react';
import { Text, View } from '@tarojs/components';
import { useI18n } from '@/i18n';

interface WorkbenchShellProps {
  children: ReactNode;
  pageClassName?: string;
  footerText?: string;
}

export const WorkbenchShell = memo(function WorkbenchShell({ children, pageClassName = '', footerText = '' }: WorkbenchShellProps) {
  const { t } = useI18n();
  const resolvedFooter = footerText || t('common.footer');
  return (
    <View className='sl-stage sl-stage--workbench'>
      <View className='sl-app-shell'>
        <View className='sl-phone-shell'>
          <View className='sl-phone-content'>
            <View className={`sl-page ${pageClassName}`.trim()}>{children}</View>
            <Text className='sl-shell-footer'>{resolvedFooter}</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

export default WorkbenchShell;
