import { useEffect, useState } from 'react';
import { Button, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import { resolveScanToken } from '@/services/scan/scanAuthService';
import type { ScanBasicInfo } from '@/types/scan';
import { parseQueryParams } from '@/utils/routeParams';
import { useI18n } from '@/i18n';
import { I18nPageShell } from '@/components/layout/I18nPageShell';

import './index.scss';

function maskName(name: string) {
  const value = String(name || '').trim();
  if (!value) {
    return '';
  }
  if (value.length <= 1) {
    return value;
  }
  return `${value[0]}${'*'.repeat(Math.min(value.length - 1, 2))}`;
}

function ScanLandingHeader() {
  const { t } = useI18n();
  return (
    <View className='sl-page-header-bar'>
      <View className='sl-page-header-action'>
        <View className='sl-page-header-icon' onClick={() => Taro.redirectTo({ url: APP_ROUTES.home })}>
          {t('common.home')}
        </View>
      </View>
      <View className='sl-page-header-copy'>
        <View className='sl-page-header-copy__title'>{t('common.brandTitle')}</View>
      </View>
      <View className='sl-page-header-placeholder' />
    </View>
  );
}

function ScanLandingPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = parseQueryParams(router.params || {});
  const [basicInfo, setBasicInfo] = useState<ScanBasicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const qrToken = params.qrToken;

    if (!qrToken) {
      setLoading(false);
      setErrorText(t('scan.notFoundInvalidQr'));
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErrorText('');
        const result = await resolveScanToken({ token: qrToken || '' });
        if (!cancelled) {
          setBasicInfo(result);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText((error as Error)?.message || t('errors.requestFailed'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [params.elderId, params.qrToken]);

  function handleContinueVerify(nextElderId: string) {
    void Taro.navigateTo({
      url: `${APP_ROUTES.scanVerify}?elderId=${encodeURIComponent(nextElderId)}&source=${encodeURIComponent(params.source || 'scan-landing')}`,
    });
  }

  function handleEmergencyCall(phone: string) {
    if (!phone) {
      void Taro.showToast({ title: t('scan.noPhone'), icon: 'none' });
      return;
    }
    void Taro.makePhoneCall({ phoneNumber: phone });
  }

  return (
    <View className='sl-stage sl-stage--scan'>
      <View className='sl-app-shell'>
        <View className='sl-phone-shell'>
          <View className='sl-phone-content'>
            <View className='sl-page scan-landing-page'>
              <ScanLandingHeader />

              {loading ? (
                <View className='sl-card'>
                  <View className='sl-empty-state'>{t('scan.parseQrLoading')}</View>
                </View>
              ) : errorText ? (
                <View className='sl-card sl-form-panel'>
                  <View className='sl-error-card'>{errorText}</View>
                  <Button className='sl-secondary-button scan-landing-panel__button' onClick={() => Taro.redirectTo({ url: APP_ROUTES.home })}>
                    {t('common.backHome')}
                  </Button>
                </View>
              ) : basicInfo ? (
                <>
                  <View className='sl-section-heading'>
                    <Text className='scan-landing-heading__title'>{t('scan.basicInfo')}</Text>
                    <Text className='scan-landing-heading__badge'>✓</Text>
                  </View>

                  <View className='sl-card scan-landing-profile-panel'>
                    <View className='scan-landing-profile-hero'>
                      <View className='scan-landing-profile-avatar'>
                        <View className='sl-avatar-user'>
                          <View className='sl-avatar-user__head' />
                          <View className='sl-avatar-user__body' />
                        </View>
                      </View>
                      <View className='scan-landing-profile-lines'>
                        <Text> {t('common.name')}： <Text className='sl-auto-data' {...{ dir: 'auto' }}>{maskName(basicInfo.name) || t('common.notProvided')}</Text></Text>
                        <Text>{t('common.gender')}： {basicInfo.gender === '男' ? t('common.male') : basicInfo.gender === '女' ? t('common.female') : basicInfo.gender || t('common.notProvided')}</Text>
                        <Text>{t('common.age')}： <Text className='sl-auto-data' {...{ dir: 'auto' }}>{basicInfo.age ? t('common.yearsOld', { age: basicInfo.age }) : t('common.notProvided')}</Text></Text>
                      </View>
                    </View>
                    <View className='scan-landing-archive-line'>{t('common.healthRecordNo')}： <Text className='sl-ltr-data'>{basicInfo.archiveNo || t('common.notProvided')}</Text></View>
                  </View>

                  <View className='sl-card scan-landing-address-panel'>
                    <View className='scan-landing-mini-heading'>
                      <Text className='scan-landing-mini-heading__title'>{t('scan.addressInfo')}</Text>
                      <Text className='scan-landing-mini-heading__icon'>✓</Text>
                    </View>
                    <View className='scan-landing-address-line'>{t('scan.completeVerifyToViewAddress')}</View>
                  </View>

                  <View className='sl-card scan-landing-contact-panel'>
                    <View className='scan-landing-contact-line'>
                      <Text>
                        {t('scan.emergencyContact')}： <Text className='sl-auto-data' {...{ dir: 'auto' }}>{basicInfo.emergencyContactName || t('common.notProvided')}</Text>
                        {basicInfo.relationship ? <Text className='sl-auto-data' {...{ dir: 'auto' }}>（{basicInfo.relationship}）</Text> : null}
                        {'  '}<Text className='sl-ltr-data'>{basicInfo.emergencyPhoneMasked || t('common.notProvided')}</Text>
                      </Text>
                    </View>
                    <Button className='sl-secondary-button scan-landing-contact-button' onClick={() => handleEmergencyCall(basicInfo.emergencyPhoneDial)}>
                      {t('scan.callNow')}
                    </Button>
                  </View>

                  <View className='sl-card scan-landing-medical-panel'>
                    <View className='scan-landing-mini-heading'>
                      <Text className='scan-landing-mini-heading__title'>{t('scan.medicalInfo')}</Text>
                      <Text className='scan-landing-mini-heading__icon'>+</Text>
                    </View>
                    <View className='scan-landing-medical-list'>
                      <Text>{t('scan.aboType')}： <Text className='sl-ltr-data'>{basicInfo.aboType || t('common.notProvided')}</Text></Text>
                      <Text>{t('scan.rhType')}： <Text className='sl-ltr-data'>{basicInfo.rhType || t('common.notProvided')}</Text></Text>
                      <Text>{t('scan.allergySummary')}： <Text className='sl-auto-data' {...{ dir: 'auto' }}>{basicInfo.allergySummary || t('common.notProvided')}</Text></Text>
                    </View>
                  </View>

                  <Button className='sl-primary-button' onClick={() => handleContinueVerify(basicInfo.elderId || '')}>
                    {t('scan.viewHealthArchive')}
                  </Button>
                </>
              ) : (
                <View className='sl-card'>
                  <View className='sl-empty-state'>{t('scan.scanAgain')}</View>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function ScanLandingPageEntry() {
  return (
    <I18nPageShell navigationTitleKey='auth.scanView'>
      <ScanLandingPage />
    </I18nPageShell>
  );
}
