import { useEffect, useState } from 'react';
import { Button, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';

import { APP_ROUTES, ERROR_MESSAGES } from '@/app/app.constants';
import { fetchMedications } from '@/services/scan/scanArchiveService';
import type { ScanMedicationItem } from '@/types/scan';
import { parseQueryParams } from '@/utils/routeParams';

import './index.scss';

export default function ScanMedicationsPage() {
  const router = useRouter();
  const params = parseQueryParams(router.params || {});
  const elderId = params.elderId || '';
  const sessionId = String(router.params?.sessionId || '');
  const hasProtectedContext = Boolean(elderId && sessionId);

  const [items, setItems] = useState<ScanMedicationItem[]>([]);
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
      setErrorText('缺少访问会话，请返回验证页重新进入。');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErrorText('');
        const data = await fetchMedications(elderId, sessionId);
        if (!cancelled) {
          setItems(data);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText((error as Error)?.message || ERROR_MESSAGES.requestFailed);
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
    <View className='sl-stage'>
      <View className='sl-app-shell'>
        <View className='sl-phone-shell'>
          <View className='sl-phone-content'>
            <View className='sl-page scan-medications-page'>
              <View className='sl-page-header-bar'>
                <View className='sl-page-header-action'>
                  <View className='sl-page-header-icon' onClick={handleBack}>
                    返回
                  </View>
                </View>
                <View className='sl-page-header-copy'>
                  <View className='sl-page-header-copy__title'>主要用药</View>
                </View>
                <View className='sl-page-header-placeholder' />
              </View>

              {hasProtectedContext ? (
                <View className='sl-action-grid scan-medications-actions'>
                  <Button className='sl-secondary-button' onClick={() => Taro.redirectTo({ url: buildArchiveUrl() })}>
                    返回档案
                  </Button>
                  <Button
                    className='sl-secondary-button'
                    onClick={() =>
                      Taro.redirectTo({ url: `${APP_ROUTES.scanScales}?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}` })
                    }
                  >
                    查看量表
                  </Button>
                </View>
              ) : null}

              {loading ? (
                <View className='sl-card'>
                  <View className='sl-empty-state'>正在加载用药记录...</View>
                </View>
              ) : errorText ? (
                <View className='sl-card sl-form-panel'>
                  <View className='sl-error-card'>{errorText}</View>
                  <Button className='sl-secondary-button scan-medications-panel__button' onClick={() => Taro.redirectTo({ url: buildVerifyUrl() })}>
                    返回验证页
                  </Button>
                </View>
              ) : items.length === 0 ? (
                <View className='sl-card'>
                  <View className='sl-empty-state'>暂无用药记录。</View>
                </View>
              ) : (
                <>
                  <View className='scan-medications-list'>
                    {items.map((item, index) => (
                      <View key={`${item.name}-${index}`} className='sl-card scan-medications-item'>
                        <View className='scan-medications-item__icon'>药</View>
                        <View className='scan-medications-item__body'>
                          <View className='scan-medications-item__title'>{item.name || '未命名药品'}</View>
                          <View className='scan-medications-item__meta'>
                            <Text>{item.dosage || '暂无剂量'} | {item.time || '暂无频次'}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>

                  <View className='sl-card scan-medications-warning'>
                    <View className='scan-medications-warning__icon'>!</View>
                    <View className='scan-medications-warning__copy'>
                      <Text>用药信息仅供照护参考，</Text>
                      <Text>请遵医嘱</Text>
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
