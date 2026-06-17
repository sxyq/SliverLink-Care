import { useEffect, useState } from 'react';
import { Button, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';

import { APP_ROUTES, ERROR_MESSAGES } from '@/app/app.constants';
import { resolveScanToken } from '@/services/scan/scanAuthService';
import type { ScanBasicInfo } from '@/types/scan';
import { parseQueryParams } from '@/utils/routeParams';

import './index.scss';

function formatEmergencyContact(info: ScanBasicInfo) {
  const relation = info.relationship ? `（${info.relationship}）` : '';
  return `${info.emergencyContactName || '未提供'}${relation}  ${info.emergencyPhoneMasked || '未提供'}`;
}

function maskName(name: string) {
  const value = String(name || '').trim();
  if (!value) {
    return '未提供';
  }
  if (value.length <= 1) {
    return value;
  }
  return `${value[0]}${'*'.repeat(Math.min(value.length - 1, 2))}`;
}

function ScanLandingHeader() {
  return (
    <View className='sl-page-header-bar'>
      <View className='sl-page-header-action'>
        <View className='sl-page-header-icon' onClick={() => Taro.redirectTo({ url: APP_ROUTES.home })}>
          首页
        </View>
      </View>
      <View className='sl-page-header-copy'>
        <View className='sl-page-header-copy__title'>智联名牌</View>
      </View>
      <View className='sl-page-header-placeholder' />
    </View>
  );
}

export default function ScanLandingPage() {
  const router = useRouter();
  const params = parseQueryParams(router.params || {});
  const [basicInfo, setBasicInfo] = useState<ScanBasicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const qrToken = params.qrToken;

    if (!qrToken) {
      setLoading(false);
      setErrorText(ERROR_MESSAGES.invalidQr);
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
  }, [params.elderId, params.qrToken]);

  function handleContinueVerify(nextElderId: string) {
    void Taro.navigateTo({
      url: `${APP_ROUTES.scanVerify}?elderId=${encodeURIComponent(nextElderId)}&source=${encodeURIComponent(params.source || 'scan-landing')}`,
    });
  }

  function handleEmergencyCall(phone: string) {
    if (!phone) {
      void Taro.showToast({ title: '暂未提供联系电话', icon: 'none' });
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
                  <View className='sl-empty-state'>正在解析二维码，请稍候。</View>
                </View>
              ) : errorText ? (
                <View className='sl-card sl-form-panel'>
                  <View className='sl-error-card'>{errorText}</View>
                  <Button className='sl-secondary-button scan-landing-panel__button' onClick={() => Taro.redirectTo({ url: APP_ROUTES.home })}>
                    返回首页
                  </Button>
                </View>
              ) : basicInfo ? (
                <>
                  <View className='sl-section-heading'>
                    <Text className='scan-landing-heading__title'>基本信息</Text>
                    <Text className='scan-landing-heading__badge'>盾</Text>
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
                        <Text>姓名： {maskName(basicInfo.name)}</Text>
                        <Text>性别： {basicInfo.gender || '未提供'}</Text>
                        <Text>年龄： {basicInfo.age ? `${basicInfo.age} 岁` : '未提供'}</Text>
                      </View>
                    </View>
                    <View className='scan-landing-archive-line'>健康档案编号： {basicInfo.archiveNo || '未提供'}</View>
                  </View>

                  <View className='sl-card scan-landing-address-panel'>
                    <View className='scan-landing-mini-heading'>
                      <Text className='scan-landing-mini-heading__title'>住址信息</Text>
                      <Text className='scan-landing-mini-heading__icon'>盾</Text>
                    </View>
                    <View className='scan-landing-address-line'>完成验证后可查看老人详细住址信息</View>
                  </View>

                  <View className='sl-card scan-landing-contact-panel'>
                    <View className='scan-landing-contact-line'>
                      <Text>紧急联系人： {formatEmergencyContact(basicInfo)}</Text>
                    </View>
                    <Button className='sl-secondary-button scan-landing-contact-button' onClick={() => handleEmergencyCall(basicInfo.emergencyPhoneDial)}>
                      一键拨打
                    </Button>
                  </View>

                  <View className='sl-card scan-landing-medical-panel'>
                    <View className='scan-landing-mini-heading'>
                      <Text className='scan-landing-mini-heading__title'>医疗信息</Text>
                      <Text className='scan-landing-mini-heading__icon'>十</Text>
                    </View>
                    <View className='scan-landing-medical-list'>
                      <Text>ABO 血型： {basicInfo.aboType || '未提供'}</Text>
                      <Text>Rh 血型： {basicInfo.rhType || '未提供'}</Text>
                      <Text>过敏史摘要： {basicInfo.allergySummary || '未提供'}</Text>
                    </View>
                  </View>

                  <Button className='sl-primary-button' onClick={() => handleContinueVerify(basicInfo.elderId || '')}>
                    查看健康档案
                  </Button>
                </>
              ) : (
                <View className='sl-card'>
                  <View className='sl-empty-state'>暂未识别到老人信息，请重新扫码。</View>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
