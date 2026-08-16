import { useEffect, useState } from 'react';
import { Button, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import { useLocalizedError } from '@/hooks/useLocalizedError';
import { fetchMedications } from '@/services/scan/scanArchiveService';
import type { ScanMedicationItem } from '@/types/scan';
import { parseQueryParams } from '@/utils/routeParams';
import { useI18n } from '@/i18n';
import { I18nPageShell } from '@/components/layout/I18nPageShell';

import './index.scss';

function ScanMedicationsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = parseQueryParams(router.params || {});
  const elderId = params.elderId || '';
  const sessionId = String(router.params?.sessionId || '');
  const hasProtectedContext = Boolean(elderId && sessionId);

  const [items, setItems] = useState<ScanMedicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { clearError, errorText, setError, setErrorKey } = useLocalizedError(t);

  function buildArchiveUrl() {
    return `${APP_ROUTES.scanArchive}?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`;
  }

  function buildVerifyUrl() {
    return `${APP_ROUTES.scanVerify}?elderId=${encodeURIComponent(elderId)}`;
  }

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
        const data = await fetchMedications(elderId, sessionId);
        if (!cancelled) {
          setItems(data);
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

  function handleBack() {
    void Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: buildArchiveUrl() }));
  }

  return (
    <View className='sl-stage sl-stage--scan'>
      <View className='sl-app-shell'>
        <View className='sl-phone-shell'>
          <View className='sl-phone-content'>
            <View className='sl-page scan-medications-page'>
              <View className='sl-page-header-bar'>
                <View className='sl-page-header-action'>
                  <View className='sl-page-header-icon' onClick={handleBack}>
                    {t('common.back')}
                  </View>
                </View>
                <View className='sl-page-header-copy'>
                  <View className='sl-page-header-copy__title'>{t('scan.viewMedicationRecords')}</View>
                </View>
                <View className='sl-page-header-placeholder' />
              </View>

              {hasProtectedContext ? (
                <View className='sl-action-grid scan-medications-actions'>
                  <Button className='sl-secondary-button' onClick={() => Taro.redirectTo({ url: buildArchiveUrl() })}>
                    {t('scan.backToArchive')}
                  </Button>
                  <Button
                    className='sl-secondary-button'
                    onClick={() =>
                      Taro.redirectTo({ url: `${APP_ROUTES.scanScales}?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}` })
                    }
                  >
                    {t('scan.viewScale')}
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
                  <Button className='sl-secondary-button scan-medications-panel__button' onClick={() => Taro.redirectTo({ url: buildVerifyUrl() })}>
                    {t('scan.backToVerify')}
                  </Button>
                </View>
              ) : items.length === 0 ? (
                <View className='sl-card'>
                  <View className='sl-empty-state'>{t('scan.noMedicationRecords')}</View>
                </View>
              ) : (
                <>
                  <View className='scan-medications-list'>
                    {items.map((item, index) => (
                      <View key={`${item.name}-${index}`} className='sl-card scan-medications-item'>
                        <View className='scan-medications-item__icon'>{t('workbench.medicationName').slice(0, 1)}</View>
                        <View className='scan-medications-item__body'>
                          <View className='scan-medications-item__title sl-auto-data' {...{ dir: 'auto' }}>{item.name || t('common.unknownMedication')}</View>
                          <View className='scan-medications-item__meta'>
                            <Text className='sl-ltr-data'>{item.dosage || t('common.notProvided')}</Text>
                            {' | '}
                            <Text className='sl-auto-data' {...{ dir: 'auto' }}>{item.time || t('common.notProvided')}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>

                  <View className='sl-card scan-medications-warning'>
                    <View className='scan-medications-warning__icon'>!</View>
                    <View className='scan-medications-warning__copy'>
                      <Text>{t('scan.medicationReference')}</Text>
                      <Text>{t('scan.followDoctor')}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function ScanMedicationsPageEntry() {
  return (
    <I18nPageShell navigationTitleKey='scan.medicationRecords'>
      <ScanMedicationsPage />
    </I18nPageShell>
  );
}
