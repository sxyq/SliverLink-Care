import { useEffect, useState } from 'react';
import { Button, Image, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import { useLocalizedError } from '@/hooks/useLocalizedError';
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
import { useI18n } from '@/i18n';
import { I18nPageShell } from '@/components/layout/I18nPageShell';

import './index.scss';

function NameplatePreviewPage() {
  const { t } = useI18n();
  const router = useRouter();
  const elderId = String(router.params?.elderId || '');
  const session = getAuthSession();

  const [preview, setPreview] = useState<NameplatePreviewInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPdf, setOpeningPdf] = useState(false);
  const { clearError, errorText, setError, setErrorKey } = useLocalizedError(t);
  const [qrImage, setQrImage] = useState('');
  const [pdfPreviewImage, setPdfPreviewImage] = useState('');

  useEffect(() => {
    if (!session) {
      void Taro.redirectTo({ url: APP_ROUTES.login });
      return;
    }

    if (!elderId) {
      setLoading(false);
      setErrorKey('errors.noElderIdentifier');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        clearError();
        const result = await fetchNameplatePreview(elderId);
        if (!cancelled) {
          setPreview(result);
        }
      } catch (error) {
        if (!cancelled) {
          setError(error, 'errors.nameplateOpenFailed');
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
  }, [elderId, session, t]);

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
      clearError();
      await openNameplatePdf(elderId);
    } catch (error) {
      setError(error, 'errors.pdfDownloadFailed');
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
                    {t('common.back')}
                  </View>
                </View>
                <View className='sl-page-header-copy'>
                  <View className='sl-page-header-copy__title'>{t('scan.entityNameplate')}</View>
                </View>
                <View className='sl-page-header-placeholder' />
              </View>

              {loading ? (
                <View className='sl-card'>
                  <View className='sl-empty-state'>{t('common.loading')} {t('scan.nameplatePreview')}</View>
                </View>
              ) : null}
              {errorText ? <View className='sl-error-card'>{errorText}</View> : null}

              {!loading && preview ? (
                <>
                  {pdfPreviewImage ? (
                    <View className='sl-card scan-nameplate-pdf-preview-card'>
                      <View className='scan-nameplate-pdf-preview-card__header'>
                        <View className='scan-nameplate-card__kicker'>{t('scan.pdfActualPreview')}</View>
                        <View className='scan-nameplate-card__tag'>{t('scan.matchesExport')}</View>
                      </View>
                      <View className='scan-nameplate-pdf-preview-frame'>
                        <Image className='scan-nameplate-pdf-preview-image' mode='widthFix' src={pdfPreviewImage} />
                      </View>
                    </View>
                  ) : (
                    <View className='scan-nameplate-card-list'>
                      <View className='sl-card scan-nameplate-card scan-nameplate-card--front'>
                        <View className='scan-nameplate-card__header'>
                          <View className='scan-nameplate-card__kicker'>{t('scan.frontNameplate')}</View>
                          <View className='scan-nameplate-card__tag'>{t('scan.carryWithYou')}</View>
                        </View>
                        <View className='scan-nameplate-front-hero'>
                          <View className='scan-nameplate-front-hero__title'>{t('common.brandTitle')}</View>
                          <View className='scan-nameplate-front-hero__divider' />
                        </View>
                        <View className='scan-nameplate-front-grid'>
                          <View className='scan-nameplate-field scan-nameplate-field--compact'>
                            <Text className='scan-nameplate-label'>{t('common.name')}</Text>
                            <Text className='scan-nameplate-value sl-auto-data' {...{ dir: 'auto' }}>{preview.frontName || t('scan.unanswered')}</Text>
                          </View>
                          <View className='scan-nameplate-field scan-nameplate-field--compact'>
                            <Text className='scan-nameplate-label'>{t('common.age')}</Text>
                            <Text className='scan-nameplate-value sl-auto-data' {...{ dir: 'auto' }}>{preview.frontAge ? t('common.yearsOld', { age: preview.frontAge }) : t('scan.unanswered')}</Text>
                          </View>
                          <View className='scan-nameplate-field scan-nameplate-field--full'>
                            <Text className='scan-nameplate-label'>{t('common.contactPhone')}</Text>
                            <Text className='scan-nameplate-value sl-ltr-data'>{preview.frontPhone || t('scan.unanswered')}</Text>
                          </View>
                        </View>
                      </View>

                      <View className='sl-card scan-nameplate-card scan-nameplate-card--back'>
                        <View className='scan-nameplate-card__header'>
                          <View className='scan-nameplate-card__kicker'>{t('scan.backNameplate')}</View>
                          <View className='scan-nameplate-card__tag'>{t('auth.scanView')}</View>
                        </View>
                        <View className='scan-nameplate-qr-area'>
                          <View className='scan-nameplate-qr-box'>
                            {qrImage ? (
                              <Image className='scan-nameplate-qr-image' mode='aspectFit' src={qrImage} />
                            ) : (
                              <View className='scan-nameplate-qr-empty'>
                                <Text className='scan-nameplate-qr-empty__icon'>⌁</Text>
                                <Text className='scan-nameplate-qr-empty__title'>{t('workbench.qrPreviewUnavailable')}</Text>
                                <Text className='scan-nameplate-qr-empty__caption'>{t('scan.qrPreviewRetry')}</Text>
                              </View>
                            )}
                          </View>
                          <Text className='scan-nameplate-qr-hint sl-auto-data' {...{ dir: 'auto' }}>{preview.backHint || t('scan.wechatScanHealthArchive')}</Text>
                        </View>
                        <View className='scan-nameplate-divider' />
                        <View className='scan-nameplate-field scan-nameplate-field--compact'>
                          <Text className='scan-nameplate-label'>{t('common.archiveNumber')}</Text>
                          <Text className='scan-nameplate-value sl-ltr-data'>{preview.backArchiveNo || preview.archiveNo || t('common.generatedPending')}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <View className='scan-nameplate-actions'>
                    <Button className='sl-secondary-button scan-nameplate-actions__button' loading={openingPdf} onClick={handleOpenPdf}>
                      {t('scan.generatePdf')}
                    </Button>
                    <Button className='sl-primary-button scan-nameplate-actions__button' loading={openingPdf} onClick={handleOpenPdf}>
                      {t('scan.downloadPdf')}
                    </Button>
                  </View>

                  <Text className='scan-nameplate-note'>{t('scan.nameplateNote')}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function NameplatePreviewPageEntry() {
  return (
    <I18nPageShell navigationTitleKey='scan.nameplatePreview'>
      <NameplatePreviewPage />
    </I18nPageShell>
  );
}
