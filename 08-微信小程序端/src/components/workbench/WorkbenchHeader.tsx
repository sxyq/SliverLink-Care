import { memo, useMemo, type ReactNode } from 'react';
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

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

function buildHeaderStyle() {
  const fallback = {
    '--sl-nav-status-bar-height': '22px',
    '--sl-nav-top-gap': '26px',
    '--sl-nav-bottom-gap': '14px',
    '--sl-nav-total-height': '108px',
    '--sl-nav-side-width': '56px',
  } as Record<string, string>;

  try {
    const systemInfo = Taro.getSystemInfoSync();
    const statusBarHeight = Math.max(Number(systemInfo.statusBarHeight || 0), 0);
    const capsule = typeof Taro.getMenuButtonBoundingClientRect === 'function'
      ? Taro.getMenuButtonBoundingClientRect()
      : null;

    const topGap = capsule?.top != null && statusBarHeight > 0
      ? Math.max(capsule.top - statusBarHeight, 6)
      : 26;
    const contentHeight = Math.max(Number(capsule?.height || 0), 32);
    const bottomGap = capsule?.bottom != null
      ? Math.max(capsule.bottom - (statusBarHeight + topGap + contentHeight), topGap)
      : topGap + 2;
    const totalHeight = statusBarHeight + topGap + contentHeight + bottomGap;
    // 固定为 56px，与 CSS 中 .sl-page-header-icon 尺寸一致
    const sideWidth = 56;

    return {
      '--sl-nav-status-bar-height': `${statusBarHeight || 22}px`,
      '--sl-nav-top-gap': `${topGap}px`,
      '--sl-nav-bottom-gap': `${bottomGap}px`,
      '--sl-nav-total-height': `${Math.max(totalHeight, 108)}px`,
      '--sl-nav-side-width': `${sideWidth}px`,
    } as Record<string, string>;
  } catch {
    return fallback;
  }
}

function HeaderAction({ label, icon, onClick, compact = true, disabled = false }: WorkbenchHeaderActionProps) {
  return (
    <View
      className={disabled ? `${compact ? 'sl-page-header-icon' : 'sl-page-header-icon sl-page-header-icon-label'} is-disabled` : compact ? 'sl-page-header-icon' : 'sl-page-header-icon sl-page-header-icon-label'}
      onClick={disabled ? undefined : onClick}
    >
      {icon ? <Text className={icon === '←' || icon === '→' ? 'sl-header-icon-glyph is-directional' : 'sl-header-icon-glyph'}>{icon}</Text> : null}
      {compact ? null : <Text className='sl-header-icon-label'>{label}</Text>}
      {!icon ? label : null}
    </View>
  );
}

export const WorkbenchHeader = memo(function WorkbenchHeader({
  title,
  subtitle,
  leadingAction,
  trailingAction,
  leadingNode,
  trailingNode,
}: WorkbenchHeaderProps) {
  const headerStyle = useMemo(() => buildHeaderStyle(), []);

  return (
    <View className='sl-page-header-bar' style={headerStyle}>
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
        {subtitle ? <Text className='sl-page-header-copy__subtitle sl-auto-data' {...{ dir: 'auto' }}>{subtitle}</Text> : null}
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
});

export default WorkbenchHeader;
