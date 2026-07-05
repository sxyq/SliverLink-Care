import { useEffect, useState } from 'react';
import { Button, Image, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import {
  fetchNameplatePreview,
  fetchWorkbenchQrCode,
  openNameplatePdf,
  resolveBase64PreviewImage,
  resolveNameplateQrValue,
  resolveQrPayloadPreviewImage,
  resolveWorkbenchQrPreviewImage,
  type NameplatePreviewInfo,
} from '@/services/workbench/qrcodeService';
import { getAuthSession } from '@/store/auth/authStore';

import './index.scss';

export default function NameplatePreviewPage() {
  const router = useRouter();
  const elderId = String(router.params?.elderId || '');
  const session = getAuthSession();

  const [preview, setPreview] = useState<NameplatePreviewInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPdf, setOpeningPdf] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [pdfPreviewImage, setPdfPreviewImage] = useState('');

  useEffect(() => {
    if (!session) {
      void Taro.redirectTo({ url: APP_ROUTES.login });
      return;
    }

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
  }, [elderId, session]);

  useEffect(() => {
    let cancelled = false;

    async function loadPdfPreviewImage() {
      const base64 = String(preview?.pdfPreviewImageBase64 || '').trim();
      if (!base64) {
        if (!cancelled) {
          setPdfPreviewImage('');
        }
        return;
      }

      const image = await resolveBase64PreviewImage(base64, 'nameplate-pdf-preview');
      if (!cancelled) {
        setPdfPreviewImage(image);
      }
    }

    void loadPdfPreviewImage();

    return () => {
      cancelled = true;
    };
  }, [preview?.pdfPreviewImageBase64]);

  useEffect(() => {
    let cancelled = false;

    async function renderQrImage() {
      if (!preview) {
        setQrImage('');
        return;
      }

      try {
        const directBase64 = String(preview.backQrImageBase64 || '').trim();
        if (directBase64) {
          const image = await resolveBase64PreviewImage(directBase64, 'nameplate-qr-preview');
          if (!cancelled) {
            setQrImage(image);
          }
          return;
        }

        const nameplateQrValue = resolveNameplateQrValue(preview.backQrPayload || preview.backQrUrl || preview.backQrToken);
        const image = nameplateQrValue ? await resolveQrPayloadPreviewImage(nameplateQrValue, 'nameplate-qr-preview') : '';
        if (!cancelled && image) {
          setQrImage(image);
          return;
        }

        if (session && elderId) {
          const info = await fetchWorkbenchQrCode(session.role, elderId);
          const fallbackImage = await resolveWorkbenchQrPreviewImage(info);
          if (!cancelled) {
            setQrImage(fallbackImage);
          }
          return;
        }

        if (!cancelled) {
          setQrImage('');
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
  }, [elderId, preview, session]);

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
    void Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: `${APP_ROUTES.workbenchElderDetail}?elderId=${encodeURIComponent(elderId)}` }));
  }

  if (!session) {
    return null;
  }

  return (
    <View className='sl-stage sl-stage--scan'>
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
                  {pdfPreviewImage ? (
                    <View className='sl-card scan-nameplate-pdf-preview-card'>
                      <View className='scan-nameplate-pdf-preview-card__header'>
                        <View className='scan-nameplate-card__kicker'>PDF 实际预览</View>
                        <View className='scan-nameplate-card__tag'>与导出一致</View>
                      </View>
                      <View className='scan-nameplate-pdf-preview-frame'>
                        <Image className='scan-nameplate-pdf-preview-image' mode='widthFix' src={pdfPreviewImage} />
                      </View>
                    </View>
                  ) : (
                    <View className='scan-nameplate-card-list'>
                      <View className='sl-card scan-nameplate-card scan-nameplate-card--front'>
                        <View className='scan-nameplate-card__header'>
                          <View className='scan-nameplate-card__kicker'>正面</View>
                          <View className='scan-nameplate-card__tag'>随身携带</View>
                        </View>
                        <View className='scan-nameplate-front-hero'>
                          <View className='scan-nameplate-front-hero__title'>渝护银龄名牌</View>
                          <View className='scan-nameplate-front-hero__divider' />
                        </View>
                        <View className='scan-nameplate-front-grid'>
                          <View className='scan-nameplate-field scan-nameplate-field--compact'>
                            <Text className='scan-nameplate-label'>姓名</Text>
                            <Text className='scan-nameplate-value'>{preview.frontName || '未填写'}</Text>
                          </View>
                          <View className='scan-nameplate-field scan-nameplate-field--compact'>
                            <Text className='scan-nameplate-label'>年龄</Text>
                            <Text className='scan-nameplate-value'>{preview.frontAge ? `${preview.frontAge} 岁` : '未填写'}</Text>
                          </View>
                          <View className='scan-nameplate-field scan-nameplate-field--full'>
                            <Text className='scan-nameplate-label'>联系电话</Text>
                            <Text className='scan-nameplate-value'>{preview.frontPhone || '未填写'}</Text>
                          </View>
                        </View>
                      </View>

                      <View className='sl-card scan-nameplate-card scan-nameplate-card--back'>
                        <View className='scan-nameplate-card__header'>
                          <View className='scan-nameplate-card__kicker'>背面</View>
                          <View className='scan-nameplate-card__tag'>扫码查看</View>
                        </View>
                        <View className='scan-nameplate-qr-area'>
                          <View className='scan-nameplate-qr-box'>
                            {qrImage ? (
                              <Image className='scan-nameplate-qr-image' mode='aspectFit' src={qrImage} />
                            ) : (
                              <View className='scan-nameplate-qr-empty'>
                                <Text className='scan-nameplate-qr-empty__icon'>⌁</Text>
                                <Text className='scan-nameplate-qr-empty__title'>二维码暂不可预览</Text>
                                <Text className='scan-nameplate-qr-empty__caption'>请稍后重试，或直接生成 PDF 查看</Text>
                              </View>
                            )}
                          </View>
                          <Text className='scan-nameplate-qr-hint'>{preview.backHint || '微信扫码查看健康档案'}</Text>
                        </View>
                        <View className='scan-nameplate-divider' />
                        <View className='scan-nameplate-field scan-nameplate-field--compact'>
                          <Text className='scan-nameplate-label'>档案编号</Text>
                          <Text className='scan-nameplate-value'>{preview.backArchiveNo || preview.archiveNo || '未生成'}</Text>
                        </View>
                      </View>
                    </View>
                  )}

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
