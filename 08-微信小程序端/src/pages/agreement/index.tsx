import { useState } from 'react';
import { Button, ScrollView, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { resolveAgreementDocument, type AgreementDocKey } from '@/content/agreements';
import { APP_ROUTES } from '@/app/app.constants';
import { I18nPageShell } from '@/components/layout/I18nPageShell';
import { useI18n } from '@/i18n';

import './index.scss';

const DOC_TABS: AgreementDocKey[] = ['service', 'privacy'];

function AgreementTabs(props: { active: AgreementDocKey; onSelect: (next: AgreementDocKey) => void }) {
  const { t } = useI18n();

  return (
    <View className='sl-agreement-tabs' role='tablist'>
      {DOC_TABS.map((key) => (
        <View
          key={key}
          className={`sl-agreement-tabs__item ${props.active === key ? 'is-active' : ''}`}
          role='tab'
          aria-selected={props.active === key}
          onClick={() => props.onSelect(key)}
        >
          <Text>{key === 'service' ? t('agreement.serviceTitle') : t('agreement.privacyTitle')}</Text>
        </View>
      ))}
    </View>
  );
}

function AgreementPage() {
  const { locale, t } = useI18n();
  const [activeTab, setActiveTab] = useState<AgreementDocKey>('service');
  const document = resolveAgreementDocument(locale, activeTab);

  function handleBack() {
    void Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: APP_ROUTES.home }));
  }

  return (
    <View className='sl-stage'>
      <View className='sl-app-shell'>
        <View className='sl-phone-shell'>
          <View className='sl-phone-content'>
            <View className='sl-page sl-agreement-page'>
              <View className='sl-page-header-bar'>
                <View className='sl-page-header-action'>
                  <View className='sl-page-header-icon' onClick={handleBack}>
                    {t('common.back')}
                  </View>
                </View>
                <View className='sl-page-header-copy'>
                  <View className='sl-page-header-copy__title'>{t('agreement.title')}</View>
                </View>
                <View className='sl-page-header-placeholder' />
              </View>

              <AgreementTabs active={activeTab} onSelect={setActiveTab} />

              <View className='sl-card sl-agreement-card'>
                <ScrollView className='sl-agreement-scroll' scrollY>
                  <View className='sl-agreement-scroll__inner'>
                  <View className='sl-agreement-doc'>
                    <Text className='sl-agreement-doc__title'>
                      {activeTab === 'service' ? t('agreement.serviceTitle') : t('agreement.privacyTitle')}
                    </Text>
                    <Text className='sl-agreement-doc__meta'>
                      {t('agreement.updatedAt', { date: document.updatedAt })}
                    </Text>
                    {document.sections.map((section) => (
                      <View key={section.id} className='sl-agreement-section'>
                        <Text className='sl-agreement-section__heading' userSelect>
                          {section.heading}
                        </Text>
                        {section.paragraphs.map((paragraph, index) => (
                          <Text key={`${section.id}-${index}`} className='sl-agreement-section__paragraph' userSelect>
                            {paragraph}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                  </View>
                </ScrollView>
              </View>

              <Button className='sl-primary-button sl-agreement-back' onClick={handleBack}>
                {t('agreement.backToLogin')}
              </Button>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function AgreementPageEntry() {
  return (
    <I18nPageShell navigationTitleKey='agreement.title'>
      <AgreementPage />
    </I18nPageShell>
  );
}
