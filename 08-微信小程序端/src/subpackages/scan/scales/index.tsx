import { useEffect, useState } from 'react';
import { Button, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import { fetchScales } from '@/services/scan/scanArchiveService';
import type { ScanScaleSummaryItem } from '@/types/scan';
import { parseQueryParams } from '@/utils/routeParams';
import { useI18n } from '@/i18n';

import './index.scss';

function formatDate(value: string, fallback: string) {
  if (!value) {
    return fallback;
  }
  return value.slice(0, 10);
}

export default function ScanScalesPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = parseQueryParams(router.params || {});
  const elderId = params.elderId || '';
  const sessionId = String(router.params?.sessionId || '');
  const hasProtectedContext = Boolean(elderId && sessionId);

  const [items, setItems] = useState<ScanScaleSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  function buildArchiveUrl() {
    return `${APP_ROUTES.scanArchive}?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`;
  }

  function buildVerifyUrl() {
    return `${APP_ROUTES.scanVerify}?elderId=${encodeURIComponent(elderId)}`;
  }

  useEffect(() => {
    if (!elderId || !sessionId) {
      setLoading(false);
      setErrorText(t('errors.sessionRequired'));
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErrorText('');
        const data = await fetchScales(elderId, sessionId);
        if (!cancelled) {
          setItems(data);
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
  }, [elderId, sessionId, t]);

  function handleBack() {
    void Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: buildArchiveUrl() }));
  }

  return (
    <View className='sl-stage sl-stage--scan'>
      <View className='sl-app-shell'>
        <View className='sl-phone-shell'>
          <View className='sl-phone-content'>
            <View className='sl-page scan-scales-page'>
              <View className='sl-page-header-bar'>
                <View className='sl-page-header-action'>
                  <View className='sl-page-header-icon' onClick={handleBack}>
                    {t('common.back')}
                  </View>
                </View>
                <View className='sl-page-header-copy'>
                  <View className='sl-page-header-copy__title'>{t('scan.scaleRecords')}</View>
                </View>
                <View className='sl-page-header-placeholder' />
              </View>

              {hasProtectedContext ? (
                <View className='sl-action-grid scan-scales-actions'>
                  <Button className='sl-secondary-button' onClick={() => Taro.redirectTo({ url: buildArchiveUrl() })}>
                    {t('scan.backToArchive')}
                  </Button>
                  <Button
                    className='sl-secondary-button'
                    onClick={() =>
                      Taro.redirectTo({ url: `${APP_ROUTES.scanMedications}?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}` })
                    }
                  >
                    {t('scan.viewMedication')}
                  </Button>
                </View>
              ) : null}

              {loading ? (
                <View className='sl-card'>
                  <View className='sl-empty-state'>{t('common.loading')} {t('scan.scaleRecords')}</View>
                </View>
              ) : errorText ? (
                <View className='sl-card sl-form-panel'>
                  <View className='sl-error-card'>{errorText}</View>
                  <Button className='sl-secondary-button scan-scales-panel__button' onClick={() => Taro.redirectTo({ url: buildVerifyUrl() })}>
                    {t('scan.backToVerify')}
                  </Button>
                </View>
              ) : items.length === 0 ? (
                <View className='sl-card'>
                  <View className='sl-empty-state'>{t('scan.noScaleRecords')}</View>
                </View>
              ) : (
                <View className='scan-scales-list'>
                  {items.map((item) => (
                    <View key={`${item.name}-${item.updatedAt}`} className='sl-card scan-scales-item'>
                      <View className='scan-scales-item__icon'>≋</View>
                      <View className='scan-scales-item__body'>
                        <View className='scan-scales-item__name'>{item.name || t('common.unknownScale')}</View>
                        <View className='scan-scales-item__summary'>
                          {t('scan.recentRecord')}：<Text className='sl-ltr-data'>{formatDate(item.updatedAt, t('common.noRecords'))}</Text> | {t('scan.score')} <Text className='scan-scales-item__score sl-ltr-data'>{item.score}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {!loading && !errorText && items.length ? <View className='scan-scales-privacy-pill'>{t('scan.privacyProtection')}</View> : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
