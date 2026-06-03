import type { ReactNode } from 'react';
import { Text, View } from '@tarojs/components';

interface WorkbenchHeaderActionProps {
  label?: string;
  icon?: string;
  onClick?: () => void;
  compact?: boolean;
  disabled?: boolean;
}

interface WorkbenchHeaderProps {
  title: string;
  subtitle?: string;
  leadingAction?: WorkbenchHeaderActionProps;
  trailingAction?: WorkbenchHeaderActionProps;
  leadingNode?: ReactNode;
  trailingNode?: ReactNode;
}

function HeaderAction({ label, icon, onClick, compact = true, disabled = false }: WorkbenchHeaderActionProps) {
  return (
    <View
      className={disabled ? `${compact ? 'sl-page-header-icon' : 'sl-page-header-icon sl-page-header-icon-label'} is-disabled` : compact ? 'sl-page-header-icon' : 'sl-page-header-icon sl-page-header-icon-label'}
      onClick={disabled ? undefined : onClick}
    >
      {icon ? <Text className='sl-header-icon-glyph'>{icon}</Text> : null}
      {compact ? null : <Text className='sl-header-icon-label'>{label}</Text>}
      {!icon ? label : null}
    </View>
  );
}

export function WorkbenchHeader({
  title,
  subtitle,
  leadingAction,
  trailingAction,
  leadingNode,
  trailingNode,
}: WorkbenchHeaderProps) {
  return (
    <View className='sl-page-header-bar'>
      {leadingNode ? (
        <View className='sl-page-header-action'>{leadingNode}</View>
      ) : leadingAction ? (
        <View className='sl-page-header-action'>
          <HeaderAction {...leadingAction} />
        </View>
      ) : (
        <View className='sl-page-header-placeholder' />
      )}

      <View className='sl-page-header-copy'>
        <View className='sl-page-header-copy__title'>{title}</View>
        {subtitle ? <Text className='sl-page-header-copy__subtitle'>{subtitle}</Text> : null}
      </View>

      {trailingNode ? (
        <View className='sl-page-header-action'>{trailingNode}</View>
      ) : trailingAction ? (
        <View className='sl-page-header-action'>
          <HeaderAction {...trailingAction} />
        </View>
      ) : (
        <View className='sl-page-header-placeholder' />
      )}
    </View>
  );
}

export default WorkbenchHeader;
