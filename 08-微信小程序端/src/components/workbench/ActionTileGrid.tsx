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
}

export function ActionTileGrid({ items }: ActionTileGridProps) {
  return (
    <View className='sl-action-grid'>
      {items.map((item) => (
        <View
          key={item.key}
          className={item.warning ? 'sl-action-card sl-action-card--warning' : 'sl-action-card'}
          onClick={item.onClick}
        >
          <View className='sl-action-card__copy'>
            <Text className='sl-action-card__title'>{item.title}</Text>
            {item.description ? <Text className='sl-action-card__desc'>{item.description}</Text> : null}
          </View>
          <View className='sl-action-card__arrow'>{item.icon || '→'}</View>
        </View>
      ))}
    </View>
  );
}

export default ActionTileGrid;
