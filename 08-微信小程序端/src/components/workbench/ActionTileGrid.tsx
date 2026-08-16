import { memo } from 'react';
import { Text, View } from '@tarojs/components';

export interface ActionTileItem {
  key: string;
  title: string;
  description?: string;
  icon?: string;
  warning?: boolean;
  onClick?: () => void;
}

interface ActionTileGridProps {
  items: ActionTileItem[];
  detail?: boolean;
}

export const ActionTileGrid = memo(function ActionTileGrid({ items, detail = false }: ActionTileGridProps) {
  return (
    <View className='sl-action-grid'>
      {items.map((item) => (
        <View
          key={item.key}
          className={
            detail
              ? `sl-action-card sl-detail-action-card${item.warning ? ' sl-action-card--warning' : ''}`
              : item.warning
                ? 'sl-action-card sl-action-card--warning'
                : 'sl-action-card'
          }
          onClick={item.onClick}
        >
          <View className='sl-action-card__copy'>
            <Text className='sl-action-card__title'>{item.title}</Text>
            {item.description ? <Text className='sl-action-card__desc'>{item.description}</Text> : null}
          </View>
          <View className={item.icon ? 'sl-action-card__arrow' : 'sl-action-card__arrow is-directional'}>{item.icon || '→'}</View>
        </View>
      ))}
    </View>
  );
});

export default ActionTileGrid;
