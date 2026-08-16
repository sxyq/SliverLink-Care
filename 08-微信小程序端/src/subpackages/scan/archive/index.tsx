import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import { useLocalizedError } from '@/hooks/useLocalizedError';
import { fetchArchive, fetchVerifiedBasicInfo } from '@/services/scan/scanArchiveService';
import type { ScanArchiveRecord, ScanBasicInfo } from '@/types/scan';
import { parseQueryParams } from '@/utils/routeParams';
import { useI18n } from '@/i18n';
import { I18nPageShell } from '@/components/layout/I18nPageShell';

import './index.scss';

function formatDate(value: string, fallback: string) {
  if (!value) {
    return fallback;
  }
  return value.slice(0, 10);
}

function buildProtectedUrl(path: string, elderId: string, sessionId: string) {
  return `${path}?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`;
}

function buildVerifyUrl(elderId: string) {
  return `${APP_ROUTES.scanVerify}?elderId=${encodeURIComponent(elderId)}`;
}

type InfoRowDirection = 'auto' | 'ltr' | 'mixed';

interface InfoRow {
  label: string;
  value: ReactNode;
  direction: InfoRowDirection;
}

function ScanArchiveHeader() {
  const { t } = useI18n();
  return (
    <View className='sl-page-header-bar'>
      <View className='sl-page-header-action'>
        <View className='sl-page-header-icon' onClick={() => Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: APP_ROUTES.home }))}>
          {t('common.back')}
        </View>
      </View>
      <View className='sl-page-header-copy'>
        <View className='sl-page-header-copy__title'>{t('scan.healthArchive')}</View>
      </View>
      <View className='sl-page-header-placeholder' />
    </View>
  );
}

function ScanArchivePage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = parseQueryParams(router.params || {});
  const elderId = params.elderId || '';
  const sessionId = String(router.params?.sessionId || '');

  const [basicInfo, setBasicInfo] = useState<ScanBasicInfo | null>(null);
  const [archive, setArchive] = useState<ScanArchiveRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { clearError, errorText, setError, setErrorKey } = useLocalizedError(t);
  const hasProtectedContext = Boolean(elderId && sessionId);

  useEffect(() => {
    if (!elderId || !sessionId) {
      setLoading(false);
      setErrorKey('errors.sessionRequired');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        clearError();
        const [nextBasicInfo, nextArchive] = await Promise.all([
          fetchVerifiedBasicInfo(elderId, sessionId),
          fetchArchive(elderId, sessionId),
        ]);

        if (!cancelled) {
          setBasicInfo(nextBasicInfo);
          setArchive(nextArchive);
        }
      } catch (error) {
        if (!cancelled) {
          setError(error, 'errors.requestFailed');
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
  }, [elderId, sessionId]);

  const infoRows: InfoRow[] = archive
    ? [
        { label: t('scan.chronicDisease'), value: archive.healthSelfAssessment || t('common.noRecords'), direction: 'auto' },
        { label: t('common.allergyHistory'), value: basicInfo?.allergySummary || t('common.noRecords'), direction: 'auto' },
        {
          label: t('scan.basicVitals'),
          value: `${t('scan.height')} ${archive.heightCm || 0}cm，${t('scan.weight')} ${archive.weightKg || 0}kg，BMI ${archive.bmi ? archive.bmi.toFixed(1) : '0.0'}`,
          direction: 'ltr',
        },
        { label: t('scan.pastHistory'), value: archive.emotionScreening || archive.cognitiveScreening || t('common.noRecords'), direction: 'auto' },
        {
          label: t('common.contact'),
          value: (
            <>
              <Text className='sl-auto-data' {...{ dir: 'auto' }}>{basicInfo?.emergencyContactName || t('common.notProvided')}</Text>
              {basicInfo?.relationship ? <Text className='sl-auto-data' {...{ dir: 'auto' }}>（{basicInfo.relationship}）</Text> : null}
              {'  '}<Text className='sl-ltr-data'>{basicInfo?.emergencyPhoneDial || t('common.notProvided')}</Text>
            </>
          ),
          direction: 'mixed',
        },
      ]
    : [];

  return (
    <View className='sl-stage sl-stage--scan'>
      <View className='sl-app-shell'>
        <View className='sl-phone-shell'>
          <View className='sl-phone-content'>
            <View className='sl-page scan-archive-page'>
              <ScanArchiveHeader />

              {hasProtectedContext ? (
                <View className='sl-action-grid scan-archive-actions'>
                  <Button
                    className='sl-secondary-button'
                    onClick={() => Taro.navigateTo({ url: buildProtectedUrl(APP_ROUTES.scanMedications, elderId, sessionId) })}
                  >
                    {t('scan.viewMedication')}
                  </Button>
                  <Button
                    className='sl-secondary-button'
                    onClick={() => Taro.navigateTo({ url: buildProtectedUrl(APP_ROUTES.scanScales, elderId, sessionId) })}
                  >
                    {t('scan.viewScale')}
                  </Button>
                  <Button className='sl-secondary-button' onClick={() => Taro.redirectTo({ url: buildVerifyUrl(elderId) })}>
                    {t('verification.reverify')}
                  </Button>
                </View>
              ) : null}

              {loading ? (
                <View className='sl-card'>
                  <View className='sl-empty-state'>{t('common.reading')}</View>
                </View>
              ) : errorText ? (
                <View className='sl-card sl-form-panel'>
                  <View className='sl-error-card'>{errorText}</View>
                  <Button className='sl-secondary-button' onClick={() => Taro.redirectTo({ url: buildVerifyUrl(elderId) })}>
                    {t('scan.backToVerify')}
                  </Button>
                </View>
              ) : basicInfo && archive ? (
                <>
                  <View className='sl-permission-banner'>
                    <Text>{t('verification.passedLabel')}</Text>
                  </View>

                  <View className='sl-card scan-archive-number-card'>
                    <View className='scan-archive-info-block-head'>
                      <View className='scan-archive-info-block-icon'>▣</View>
                      <View>
                        <View className='scan-archive-number-card__label'>{t('common.healthRecordNo')}</View>
                        <View className='scan-archive-number-card__value sl-ltr-data'>{basicInfo.archiveNo || t('common.notProvided')}</View>
                      </View>
                    </View>
                  </View>

                  <View className='sl-card scan-archive-info-card'>
                    <View className='scan-archive-info-block-head'>
                      <View className='scan-archive-info-block-icon'>♡</View>
                      <View className='scan-archive-info-card__title'>{t('scan.basicInfo')}</View>
                    </View>
                    <View className='scan-archive-info-card__meta'>
                      <Text>{t('scan.recentUpdate')}： <Text className='sl-ltr-data'>{formatDate(archive.date, t('common.noRecords'))}</Text></Text>
                      <Text>{t('common.recorder')}： <Text className='sl-auto-data' {...{ dir: 'auto' }}>{archive.volunteer || t('common.noRecords')}</Text></Text>
                    </View>
                    <View className='scan-archive-list'>
                      {infoRows.map((item) => (
                        <View key={item.label} className='scan-archive-list__item'>
                          <Text className='scan-archive-list__label'>{item.label}</Text>
                          {item.direction === 'mixed' ? (
                            <Text className='scan-archive-list__value'>{item.value}</Text>
                          ) : (
                            <Text
                              className={item.direction === 'ltr' ? 'scan-archive-list__value sl-ltr-data' : 'scan-archive-list__value sl-auto-data'}
                              {...{ dir: item.direction }}
                            >
                              {item.value}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              ) : (
                <View className='sl-card'>
                  <View className='sl-empty-state'>{t('scan.noHealthArchive')}</View>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function ScanArchivePageEntry() {
  return (
    <I18nPageShell navigationTitleKey='scan.healthArchive'>
      <ScanArchivePage />
    </I18nPageShell>
  );
}
