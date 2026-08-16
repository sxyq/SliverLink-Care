import { memo } from 'react';
import { Input, Text, View } from '@tarojs/components';
import { useI18n } from '@/i18n';

interface SearchPanelProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  buttonLabel?: string;
}

export const SearchPanel = memo(function SearchPanel({ value, placeholder, onChange, buttonLabel }: SearchPanelProps) {
  const { t } = useI18n();
  return (
    <View className='sl-card sl-card-soft sl-search-panel'>
      <View className='sl-search-box sl-search-box--hero'>
        <Text className='sl-search-icon'>⌕</Text>
        <Input
          className='sl-search-input sl-auto-data'
          value={value}
          placeholder={placeholder}
          {...{ dir: 'auto' }}
          onInput={(event) => onChange(event.detail.value)}
        />
        <View className='sl-search-divider' />
        <Text className='sl-search-btn'>{buttonLabel || t('common.search')}</Text>
      </View>
    </View>
  );
});

export default SearchPanel;
