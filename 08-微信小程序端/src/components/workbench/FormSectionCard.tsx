import { memo, type ReactNode } from 'react';
import { Text, View } from '@tarojs/components';

interface FormSectionCardProps {
  title?: string;
  hint?: string;
  children: ReactNode;
}

export const FormSectionCard = memo(function FormSectionCard({ title, hint, children }: FormSectionCardProps) {
  return (
    <View className='sl-card sl-form-panel'>
      {title ? <View className='sl-form-panel__title'>{title}</View> : null}
      {hint ? <Text className='sl-form-panel__hint'>{hint}</Text> : null}
      {children}
    </View>
  );
});

export default FormSectionCard;
