import { Input, Text, View } from '@tarojs/components';

interface SearchPanelProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  buttonLabel?: string;
}

export function SearchPanel({ value, placeholder, onChange, buttonLabel = '搜索' }: SearchPanelProps) {
  return (
    <View className='sl-card sl-card-soft sl-search-panel'>
      <View className='sl-search-box sl-search-box--hero'>
        <Text className='sl-search-icon'>⌕</Text>
        <Input
          className='sl-search-input'
          value={value}
          placeholder={placeholder}
          onInput={(event) => onChange(event.detail.value)}
        />
        <View className='sl-search-divider' />
        <Text className='sl-search-btn'>{buttonLabel}</Text>
      </View>
    </View>
  );
}

export default SearchPanel;
