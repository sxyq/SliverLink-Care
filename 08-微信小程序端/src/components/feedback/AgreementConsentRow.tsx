import { Button, Checkbox, Text, View } from '@tarojs/components';

import { useI18n } from '@/i18n';

import './AgreementConsentRow.scss';

export interface AgreementConsentRowProps {
  checked: boolean;
  onToggle: (nextChecked: boolean) => void;
  onOpenAgreement: () => void;
}

export function AgreementConsentRow({ checked, onToggle, onOpenAgreement }: AgreementConsentRowProps) {
  const { t } = useI18n();

  function openAgreement() {
    onOpenAgreement();
  }

  return (
    <View className='sl-agreement-consent'>
      <Checkbox
        className='sl-agreement-consent__box'
        value='agreement'
        checked={checked}
        onClick={() => onToggle(!checked)}
      />
      <Text className='sl-agreement-consent__text'>{t('agreement.consentPrefix')}</Text>
      <Button className='sl-agreement-consent__link' onClick={openAgreement}>
        {t('agreement.serviceTitle')}
      </Button>
      <Text className='sl-agreement-consent__text'>{t('agreement.consentJoin')}</Text>
      <Button className='sl-agreement-consent__link' onClick={openAgreement}>
        {t('agreement.privacyTitle')}
      </Button>
      <Button className='sl-agreement-consent__view' onClick={openAgreement}>
        {t('agreement.viewAction')}
      </Button>
    </View>
  );
}

export default AgreementConsentRow;
