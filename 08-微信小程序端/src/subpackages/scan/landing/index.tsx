import { useEffect, useState } from 'react';
import { Button, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';

import { APP_ROUTES, ERROR_MESSAGES } from '@/app/app.constants';
import { resolveScanToken } from '@/services/scan/scanAuthService';
import type { ScanBasicInfo } from '@/types/scan';
import { parseQueryParams } from '@/utils/routeParams';

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

    const resolvedQrToken = qrToken;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErrorText('');
        const result = await resolveScanToken({ token: resolvedQrToken });
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
  }, [params.qrToken]);

  return (
    <View className='sl-page'>
      <View className='sl-card' style={{ padding: '32rpx', display: 'flex', flexDirection: 'column', gap: '16rpx' }}>
        <View className='sl-section-title'>扫码落地页</View>
        <View className='sl-section-desc'>
          当前页面已接入真实扫码解析接口，后续批次继续补验证页、健康档案、用药与量表查看。
        </View>

        <View>
          <Text>qrToken：</Text>
          <Text>{params.qrToken || '未识别到'}</Text>
        </View>
        <View>
          <Text>source：</Text>
          <Text>{params.source || '未识别到'}</Text>
        </View>

        {loading ? (
          <View className='sl-section-desc'>正在解析二维码并拉取基础信息...</View>
        ) : errorText ? (
          <View style={{ display: 'flex', flexDirection: 'column', gap: '16rpx' }}>
            <View style={{ color: 'var(--sl-color-danger)', fontSize: '26rpx' }}>{errorText}</View>
            <Button className='sl-secondary-button' onClick={() => Taro.navigateTo({ url: APP_ROUTES.home })}>
              返回首页
            </Button>
          </View>
        ) : basicInfo ? (
          <View style={{ display: 'flex', flexDirection: 'column', gap: '14rpx' }}>
            <View>
              <Text>老人姓名：</Text>
              <Text>{basicInfo.name || '未提供'}</Text>
            </View>
            <View>
              <Text>档案编号：</Text>
              <Text>{basicInfo.archiveNo || '未提供'}</Text>
            </View>
            <View>
              <Text>性别 / 年龄：</Text>
              <Text>
                {basicInfo.gender || '未提供'} / {basicInfo.age || 0}
              </Text>
            </View>
            <View>
              <Text>紧急联系人：</Text>
              <Text>{basicInfo.emergencyContactName || '未提供'}</Text>
            </View>
            <View>
              <Text>联系电话：</Text>
              <Text>{basicInfo.emergencyPhoneMasked || '未提供'}</Text>
            </View>
            <View>
              <Text>过敏史：</Text>
              <Text>{basicInfo.allergySummary || '未提供'}</Text>
            </View>
            <Button
              className='sl-primary-button'
              onClick={() =>
                Taro.navigateTo({
                  url: `${APP_ROUTES.scanVerify}?elderId=${encodeURIComponent(basicInfo.elderId || '')}&source=${encodeURIComponent(
                    params.source || 'scan-landing',
                  )}`,
                })
              }
            >
              继续验证查看敏感信息
            </Button>
          </View>
        ) : null}
      </View>
    </View>
  );
}
