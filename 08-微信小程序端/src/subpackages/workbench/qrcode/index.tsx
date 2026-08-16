import { Button, Image, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useCallback, useEffect, useState } from 'react';

import { APP_ROUTES } from '@/app/app.constants';
import {
  fetchWorkbenchQrCode,
  regenerateWorkbenchQrCode,
  resolveWorkbenchQrPreviewImage,
  resolveQrDisplayUrl,
  requestDisableWorkbenchQrCode,
  type WorkbenchQrCodeInfo,
} from '@/services/workbench/qrcodeService';
import { getAuthSession } from '@/store/auth/authStore';
import { getCurrentElderSummary } from '@/store/elder/currentElderStore';
import { formatDateTimeLabel } from '@/utils/formatters';
import { canRegenerateQrCode, canRequestQrDisable } from '@/utils/permissions';
import BottomNavGrid from '@/components/workbench/BottomNavGrid';
import WorkbenchHeader from '@/components/workbench/WorkbenchHeader';
import WorkbenchShell from '@/components/workbench/WorkbenchShell';
import { useI18n } from '@/i18n';
import { I18nPageShell } from '@/components/layout/I18nPageShell';

import './index.scss';

function getStatusClassName(status: string) {
  if (status === '已停用') {
    return 'sl-qr-status-chip is-disabled';
  }

  if (status === '已重新生成') {
    return 'sl-qr-status-chip is-regenerated';
  }

  return 'sl-qr-status-chip is-enabled';
}

function getPreviewCardClassName(status: string) {
  if (status === '已停用') {
    return 'sl-qr-preview-card is-disabled';
  }

  if (status === '已重新生成') {
    return 'sl-qr-preview-card is-regenerated';
  }

  return 'sl-qr-preview-card is-enabled';
}

function getQrImageClassName(status: string) {
  if (status === '已停用') {
    return 'sl-qr-image is-disabled';
  }

  if (status === '已重新生成') {
    return 'sl-qr-image is-regenerated';
  }

  return 'sl-qr-image is-enabled';
}

function getStatusLabel(status: string, t: (key: string) => string) {
  if (status === '已停用') {
    return t('workbench.disabled');
  }
  if (status === '已重新生成') {
    return t('workbench.regenerate');
  }
  if (status === '启用') {
    return t('family.qrEnabled');
  }
  return status || t('workbench.unknownQrStatus');
}

function WorkbenchQrCodePage() {
  const { t } = useI18n();
  const router = useRouter();
  const elderId = String(router.params?.elderId || '');
  const session = getAuthSession();
  const cachedSummary = getCurrentElderSummary();
  const elderName = cachedSummary?.id === elderId ? cachedSummary.name : '';

  const [info, setInfo] = useState<WorkbenchQrCodeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<'disable' | 'regenerate' | 'copy' | ''>('');
  const [errorText, setErrorText] = useState('');
  const [messageText, setMessageText] = useState('');
  const [previewImage, setPreviewImage] = useState('');

  useEffect(() => {
    if (!session) {
      void Taro.redirectTo({ url: APP_ROUTES.login });
      return;
    }

    if (!elderId) {
      setLoading(false);
      setErrorText(t('errors.noElderIdentifier'));
      return;
    }

    const activeSession = session;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErrorText('');
        const result = await fetchWorkbenchQrCode(activeSession.role, elderId);
        if (!cancelled) {
          setInfo(result);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText((error as Error)?.message || t('errors.loadQrInfoFailed'));
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
  }, [elderId, session?.role, t]);

  useEffect(() => {
    let cancelled = false;

    async function renderPreview() {
      if (!info) {
        setPreviewImage('');
        return;
      }
      try {
        const image = await resolveWorkbenchQrPreviewImage(info);
        if (!cancelled) {
          setPreviewImage(image);
        }
      } catch {
        if (!cancelled) {
          setPreviewImage('');
        }
      }
    }

    void renderPreview();

    return () => {
      cancelled = true;
    };
  }, [info]);

  const handleCopyLink = useCallback(async () => {
    const accessLink = info ? resolveQrDisplayUrl(info.token, info.url, info.publicUrl) : '';
    if (!accessLink || busyAction) {
      return;
    }

    try {
      setBusyAction('copy');
      setErrorText('');
      await Taro.setClipboardData({
        data: accessLink,
      });
      setMessageText(t('workbench.copiedAccessLink'));
    } catch (error) {
      setErrorText((error as Error)?.message || t('errors.linkCopyFailed'));
    } finally {
      setBusyAction('');
    }
  }, [info, busyAction, t]);

  const handleDisable = useCallback(async () => {
    if (!session || !elderId || busyAction || info?.status === '已停用' || info?.disableReviewStatus === 'PENDING') {
      return;
    }

    try {
      setBusyAction('disable');
      setErrorText('');
      const result = await requestDisableWorkbenchQrCode(session.role, elderId);
      setInfo(result);
      setMessageText(result.reviewMessage || t('family.disablePending'));
    } catch (error) {
      setErrorText((error as Error)?.message || t('errors.disableRequestFailed'));
    } finally {
      setBusyAction('');
    }
  }, [session, elderId, busyAction, info?.status, info?.disableReviewStatus, t]);

  const handleRegenerate = useCallback(async () => {
    if (!elderId || busyAction) {
      return;
    }

    try {
      setBusyAction('regenerate');
      setErrorText('');
      const result = await regenerateWorkbenchQrCode(elderId);
      setInfo(result);
      setMessageText(t('errors.qrRegenerated'));
    } catch (error) {
      setErrorText((error as Error)?.message || t('errors.regenerateFailed'));
    } finally {
      setBusyAction('');
    }
  }, [elderId, busyAction, t]);

  const handleBack = useCallback(() => {
    void Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: `${APP_ROUTES.workbenchElderDetail}?elderId=${encodeURIComponent(elderId)}` }));
  }, [elderId]);

  const handleOpenNameplatePreview = useCallback(async () => {
    if (!elderId || busyAction) {
      return;
    }

    try {
      await Taro.navigateTo({
        url: `${APP_ROUTES.scanNameplate}?elderId=${encodeURIComponent(elderId)}`,
      });
    } catch (error) {
      setErrorText((error as Error)?.message || t('errors.nameplateOpenFailed'));
    }
  }, [busyAction, elderId, t]);

  if (!session) {
    return null;
  }

  const actionCount = [canRegenerateQrCode(session.role), canRequestQrDisable(session.role)].filter(Boolean).length;
  const [qrCreatedAtPrefix = '', qrCreatedAtSuffix = ''] = t('workbench.qrCreatedAt').split('{time}');
  const qrCreatedAt = formatDateTimeLabel(info?.createdAt || '');

  return (
    <WorkbenchShell pageClassName='workbench-qrcode-page'>
      <WorkbenchHeader title={t('workbench.qrViewManage')} subtitle={elderName || undefined} leadingAction={{ label: t('common.back'), icon: '←', onClick: handleBack }} />

      {loading ? <View className='sl-card'><View className='sl-empty-state'>{t('common.loading')} {t('common.qrCode')}</View></View> : null}
      {errorText ? <View className='sl-error-card'>{errorText}</View> : null}
      {messageText ? <View className='workbench-qrcode-message'>{messageText}</View> : null}

      {!loading && info ? (
        <>
          <View className='sl-card sl-card-soft workbench-qrcode-hero'>
            <View className='workbench-qrcode-hero-copy'>
              <Text className='sl-overview-kicker'>{t('workbench.scanNameplateKicker')}</Text>
            </View>

            <View className={getPreviewCardClassName(info.status)}>
              <Text className={getStatusClassName(info.status)}>{getStatusLabel(info.status, t)}</Text>
              <View className='sl-qr-preview-title'>{t('workbench.currentElderQr', { name: info.elderName || elderName || t('workbench.currentElder') })}</View>
              <View className='sl-qr-preview-meta'>
                <Text>{qrCreatedAtPrefix}</Text>
                <Text className='sl-ltr-data' {...{ dir: 'ltr' }}>{qrCreatedAt}</Text>
                <Text>{qrCreatedAtSuffix}</Text>
              </View>

              <View className='sl-qr-preview-frame'>
                <Button className='workbench-qrcode-export-button' onClick={() => void handleOpenNameplatePreview()}>
                  {t('workbench.exportNameplate')}
                </Button>
                <View className='sl-qr-preview-placeholder'>
                  {previewImage ? (
                    <Image className={getQrImageClassName(info.status)} mode='widthFix' src={previewImage} />
                  ) : (
                    <>
                      <Text className='sl-qr-preview-empty-icon'>⌁</Text>
                      <Text className='sl-qr-preview-empty-title'>{t('workbench.qrPreviewUnavailable')}</Text>
                      <Text className='sl-qr-preview-caption'>{t('workbench.qrPreviewCopyHint')}</Text>
                    </>
                  )}
                </View>
              </View>

              <Button className='sl-secondary-button workbench-qrcode-copy-button' loading={busyAction === 'copy'} onClick={handleCopyLink}>
                {t('workbench.copyAccessLink')}
              </Button>
            </View>
          </View>

          <View className={actionCount === 1 ? 'sl-qr-action-grid is-single' : 'sl-qr-action-grid'}>
            {canRegenerateQrCode(session.role) ? (
              <View className='sl-action-card sl-detail-action-card' onClick={() => void handleRegenerate()}>
                <View className='sl-action-card__copy'>
                    <Text className='sl-action-card__title'>{busyAction === 'regenerate' ? t('workbench.regenerating') : t('workbench.regenerate')}</Text>
                    <Text className='sl-action-card__desc'>{t('workbench.regenerateDescription')}</Text>
                </View>
                <View className='sl-action-card__arrow'>↻</View>
              </View>
            ) : null}

            {canRequestQrDisable(session.role) ? (
              <View className='sl-action-card sl-detail-action-card sl-action-card--warning' onClick={() => void handleDisable()}>
                <View className='sl-action-card__copy'>
                  <Text className='sl-action-card__title'>
                    {busyAction === 'disable' ? t('workbench.submitPending') : info.status === '已停用' ? t('workbench.disabled') : info.disableReviewStatus === 'PENDING' ? t('workbench.reviewing') : t('workbench.disableQr')}
                  </Text>
                  <Text className='sl-action-card__desc'>
                    {info.disableReviewStatus === 'PENDING'
                      ? info.reviewMessage || t('family.disablePending')
                      : info.reviewMessage || t('workbench.disableDescription')}
                  </Text>
                </View>
                <View className='sl-action-card__arrow'>⊘</View>
              </View>
            ) : null}
          </View>

          <BottomNavGrid elderId={elderId} activeKey='qrcode' />
        </>
      ) : null}
    </WorkbenchShell>
  );
}

export default function WorkbenchQrCodePageEntry() {
  return (
    <I18nPageShell navigationTitleKey='workbench.qrViewManage'>
      <WorkbenchQrCodePage />
    </I18nPageShell>
  );
}
