import { memo, type ReactNode } from 'react';
import { Text, View } from '@tarojs/components';

interface WorkbenchShellProps {
  children: ReactNode;
  pageClassName?: string;
  footerText?: string;
}

const DEFAULT_FOOTER = '重庆医科大学护理学院 银龄守护团队';

export const WorkbenchShell = memo(function WorkbenchShell({ children, pageClassName = '', footerText = DEFAULT_FOOTER }: WorkbenchShellProps) {
  return (
    <View className='sl-stage sl-stage--workbench'>
      <View className='sl-app-shell'>
        <View className='sl-phone-shell'>
          <View className='sl-phone-content'>
            <View className={`sl-page ${pageClassName}`.trim()}>{children}</View>
            <Text className='sl-shell-footer'>{footerText}</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

export default WorkbenchShell;
