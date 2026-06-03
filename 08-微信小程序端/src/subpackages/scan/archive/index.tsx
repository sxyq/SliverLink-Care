import { useEffect, useState } from 'react';
import { Button, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';

import { APP_ROUTES, ERROR_MESSAGES } from '@/app/app.constants';
import { fetchArchive, fetchVerifiedBasicInfo } from '@/services/scan/scanArchiveService';
import type { ScanArchiveRecord, ScanBasicInfo } from '@/types/scan';
import { parseQueryParams } from '@/utils/routeParams';

import './index.scss';

function formatDate(value: string) {
  if (!value) {
    return '暂无记录';
  }
  return value.slice(0, 10);
}

function buildProtectedUrl(path: string, elderId: string, sessionId: string) {
  return `${path}?elderId=${encodeURIComponent(elderId)}&sessionId=${encodeURIComponent(sessionId)}`;
}

function buildVerifyUrl(elderId: string) {
  return `${APP_ROUTES.scanVerify}?elderId=${encodeURIComponent(elderId)}`;
}

function ScanArchiveHeader() {
  return (
    <View className='sl-page-header-bar'>
      <View className='sl-page-header-action'>
        <View className='sl-page-header-icon' onClick={() => Taro.navigateBack({ delta: 1 }).catch(() => Taro.switchTab({ url: APP_ROUTES.home }))}>
          返回
        </View>
      </View>
      <View className='sl-page-header-copy'>
        <View className='sl-page-header-copy__title'>健康档案</View>
      </View>
      <View className='sl-page-header-placeholder' />
    </View>
  );
}

export default function ScanArchivePage() {
  const router = useRouter();
  const params = parseQueryParams(router.params || {});
  const elderId = params.elderId || '';
  const sessionId = String(router.params?.sessionId || '');

  const [basicInfo, setBasicInfo] = useState<ScanBasicInfo | null>(null);
  const [archive, setArchive] = useState<ScanArchiveRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const hasProtectedContext = Boolean(elderId && sessionId);

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

  const infoRows = archive
    ? [
        { label: '慢病情况', value: archive.healthSelfAssessment || '暂无记录' },
        { label: '过敏史', value: basicInfo?.allergySummary || '暂无记录' },
        {
          label: '基础体征',
          value: `身高 ${archive.heightCm || 0}cm，体重 ${archive.weightKg || 0}kg，BMI ${archive.bmi ? archive.bmi.toFixed(1) : '0.0'}`,
        },
        { label: '既往史', value: archive.emotionScreening || archive.cognitiveScreening || '暂无记录' },
        {
          label: '联系人',
          value: `${basicInfo?.emergencyContactName || '未提供'}${basicInfo?.relationship ? `（${basicInfo.relationship}）` : ''}  ${
            basicInfo?.emergencyPhoneDial || '未提供'
          }`,
        },
      ]
    : [];

  return (
    <View className='sl-stage'>
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
                    查看用药
                  </Button>
                  <Button
                    className='sl-secondary-button'
                    onClick={() => Taro.navigateTo({ url: buildProtectedUrl(APP_ROUTES.scanScales, elderId, sessionId) })}
                  >
                    查看量表
                  </Button>
                  <Button className='sl-secondary-button' onClick={() => Taro.redirectTo({ url: buildVerifyUrl(elderId) })}>
                    重新验证
                  </Button>
                </View>
              ) : null}

              {loading ? (
                <View className='sl-card'>
                  <View className='sl-empty-state'>正在加载受保护档案信息...</View>
                </View>
              ) : errorText ? (
                <View className='sl-card sl-form-panel'>
                  <View className='sl-error-card'>{errorText}</View>
                  <Button className='sl-secondary-button' onClick={() => Taro.redirectTo({ url: buildVerifyUrl(elderId) })}>
                    返回验证页
                  </Button>
                </View>
              ) : basicInfo && archive ? (
                <>
                  <View className='sl-permission-banner'>
                    <Text>已通过短信验证</Text>
                  </View>

                  <View className='sl-card scan-archive-number-card'>
                    <View className='scan-archive-info-block-head'>
                      <View className='scan-archive-info-block-icon'>档</View>
                      <View>
                        <View className='scan-archive-number-card__label'>健康档案编号</View>
                        <View className='scan-archive-number-card__value'>{basicInfo.archiveNo || '未提供'}</View>
                      </View>
                    </View>
                  </View>

                  <View className='sl-card scan-archive-info-card'>
                    <View className='scan-archive-info-block-head'>
                      <View className='scan-archive-info-block-icon'>康</View>
                      <View className='scan-archive-info-card__title'>基础健康信息</View>
                    </View>
                    <View className='scan-archive-info-card__meta'>
                      <Text>最近更新： {formatDate(archive.date)}</Text>
                      <Text>记录人： {archive.volunteer || '暂无记录'}</Text>
                    </View>
                    <View className='scan-archive-list'>
                      {infoRows.map((item) => (
                        <View key={item.label} className='scan-archive-list__item'>
                          <Text className='scan-archive-list__label'>{item.label}</Text>
                          <Text className='scan-archive-list__value'>{item.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              ) : (
                <View className='sl-card'>
                  <View className='sl-empty-state'>暂无健康档案记录。</View>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
