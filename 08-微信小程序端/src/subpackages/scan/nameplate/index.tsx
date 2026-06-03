import { useEffect, useState } from 'react';
import { Button, Image, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import QRCode from 'qrcode';

import { APP_ROUTES } from '@/app/app.constants';
import { fetchNameplatePreview, openNameplatePdf, resolveQrDisplayUrl, type NameplatePreviewInfo } from '@/services/workbench/qrcodeService';

import './index.scss';

export default function NameplatePreviewPage() {
  const router = useRouter();
  const elderId = String(router.params?.elderId || '');

  const [preview, setPreview] = useState<NameplatePreviewInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPdf, setOpeningPdf] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [qrImage, setQrImage] = useState('');

  useEffect(() => {
    if (!elderId) {
      setLoading(false);
      setErrorText('缺少老人标识，请返回后重试');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErrorText('');
        const result = await fetchNameplatePreview(elderId);
        if (!cancelled) {
          setPreview(result);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText((error as Error)?.message || '加载名牌预览失败');
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
  }, [elderId]);

  useEffect(() => {
    let cancelled = false;

    async function renderQrImage() {
      if (!preview?.backQrToken) {
        setQrImage('');
        return;
      }

      try {
        const image = await QRCode.toDataURL(resolveQrDisplayUrl(preview.backQrToken), { width: 220, margin: 1 });
        if (!cancelled) {
          setQrImage(image);
        }
      } catch {
        if (!cancelled) {
          setQrImage('');
        }
      }
    }

    void renderQrImage();

    return () => {
      cancelled = true;
    };
  }, [preview]);

  async function handleOpenPdf() {
    if (!elderId || openingPdf) {
      return;
    }

    try {
      setOpeningPdf(true);
      setErrorText('');
      await openNameplatePdf(elderId);
    } catch (error) {
      setErrorText((error as Error)?.message || '打开 PDF 失败');
    } finally {
      setOpeningPdf(false);
    }
  }

  function handleBack() {
    void Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: APP_ROUTES.workbenchElderDetail }));
  }

  return (
    <View className='sl-stage'>
      <View className='sl-app-shell'>
        <View className='sl-phone-shell'>
          <View className='sl-phone-content'>
            <View className='sl-page scan-nameplate-page'>
              <View className='sl-page-header-bar'>
                <View className='sl-page-header-action'>
                  <View className='sl-page-header-icon' onClick={handleBack}>
                    返回
                  </View>
                </View>
                <View className='sl-page-header-copy'>
                  <View className='sl-page-header-copy__title'>实体名牌预览</View>
                </View>
                <View className='sl-page-header-placeholder' />
              </View>

              {loading ? (
                <View className='sl-card'>
                  <View className='sl-empty-state'>名牌预览加载中...</View>
                </View>
              ) : null}
              {errorText ? <View className='sl-error-card'>{errorText}</View> : null}

              {!loading && preview ? (
                <>
                  <View className='scan-nameplate-card-list'>
                    <View className='sl-card scan-nameplate-card'>
                      <View className='scan-nameplate-card__kicker'>正面</View>
                      <View className='scan-nameplate-field'>
                        <Text className='scan-nameplate-label'>姓名</Text>
                        <Text className='scan-nameplate-placeholder'>{preview.frontName || '未填写'}</Text>
                      </View>
                      <View className='scan-nameplate-field'>
                        <Text className='scan-nameplate-label'>年龄</Text>
                        <Text className='scan-nameplate-placeholder'>{preview.frontAge ? `${preview.frontAge}` : '未填写'}</Text>
                      </View>
                      <View className='scan-nameplate-field'>
                        <Text className='scan-nameplate-label'>联系电话</Text>
                        <Text className='scan-nameplate-placeholder'>{preview.frontPhone || '未填写'}</Text>
                      </View>
                    </View>

                    <View className='sl-card scan-nameplate-card scan-nameplate-card--back'>
                      <View className='scan-nameplate-card__kicker'>背面</View>
                      <View className='scan-nameplate-qr-area'>
                        <View className='scan-nameplate-qr-box'>
                          {qrImage ? (
                            <Image className='scan-nameplate-qr-image' mode='widthFix' src={qrImage} />
                          ) : (
                            <Text className='scan-nameplate-qr-token'>{preview.backQrToken || '暂无 Token'}</Text>
                          )}
                        </View>
                        <Text className='scan-nameplate-qr-hint'>{preview.backHint || '微信扫码查看健康档案'}</Text>
                      </View>
                      <View className='scan-nameplate-divider' />
                      <View className='scan-nameplate-field'>
                        <Text className='scan-nameplate-label'>档案编号</Text>
                        <Text className='scan-nameplate-placeholder'>{preview.backArchiveNo || preview.archiveNo || '未生成'}</Text>
                      </View>
                    </View>
                  </View>

                  <View className='scan-nameplate-actions'>
                    <Button className='sl-secondary-button scan-nameplate-actions__button' loading={openingPdf} onClick={handleOpenPdf}>
                      生成 PDF
                    </Button>
                    <Button className='sl-primary-button scan-nameplate-actions__button' loading={openingPdf} onClick={handleOpenPdf}>
                      下载 PDF
                    </Button>
                  </View>

                  <Text className='scan-nameplate-note'>实体名牌用于随身携带，建议与后台二维码状态保持一致。</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
