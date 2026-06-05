import { memo, type ReactNode } from 'react';
import { Text, View } from '@tarojs/components';

export interface SummaryHeroField {
  label: string;
  value: string;
  full?: boolean;
}

interface SummaryHeroProps {
  title: string;
  meta?: string;
  badge?: string;
  kicker?: string;
  childrenTopRight?: ReactNode;
  fields?: SummaryHeroField[];
}

export const SummaryHero = memo(function SummaryHero({ title, meta, badge, kicker, childrenTopRight, fields = [] }: SummaryHeroProps) {
  return (
    <View className='sl-summary-hero'>
      {kicker ? (
        <View className='sl-summary-kicker-row'>
          <Text className='sl-overview-kicker'>{kicker}</Text>
        </View>
      ) : null}

      <View className='sl-summary-top'>
        <View className='sl-summary-top__copy'>
          <View className='sl-summary-top__title'>{title}</View>
          {meta ? <Text className='sl-summary-top__meta'>{meta}</Text> : null}
        </View>
        {childrenTopRight ? childrenTopRight : badge ? <View className='sl-summary-top__badge'>{badge}</View> : null}
      </View>

      {fields.length ? (
        <View className='sl-summary-grid'>
          {fields.map((field) => (
            <View key={`${field.label}-${field.value}`} className={field.full ? 'sl-summary-cell sl-summary-cell--full' : 'sl-summary-cell'}>
              <Text className='sl-summary-label'>{field.label}</Text>
              <Text className='sl-summary-value'>{field.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
});

export default SummaryHero;
