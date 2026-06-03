import { Button, Image, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

import { APP_ROUTES } from '@/app/app.constants';
import {
  fetchWorkbenchQrCode,
  regenerateWorkbenchQrCode,
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

export default function WorkbenchQrCodePage() {
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
      setErrorText('缺少老人标识，请返回详情页重新进入');
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
          setErrorText((error as Error)?.message || '加载二维码信息失败');
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
  }, [elderId, session?.role]);

  useEffect(() => {
    let cancelled = false;

    async function renderPreview() {
      if (!info) {
        setPreviewImage('');
        return;
      }

      const displayUrl = resolveQrDisplayUrl(info.token, info.url);
      if (!displayUrl) {
        setPreviewImage('');
        return;
      }

      try {
        const image = await QRCode.toDataURL(displayUrl, { width: 220, margin: 1 });
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

  async function handleCopyLink() {
    if (!info?.url || busyAction) {
      return;
    }

    try {
      setBusyAction('copy');
      setErrorText('');
      await Taro.setClipboardData({
        data: info.url,
      });
      setMessageText('二维码访问链接已复制。');
    } catch (error) {
      setErrorText((error as Error)?.message || '复制访问链接失败');
    } finally {
      setBusyAction('');
    }
  }

  async function handleDisable() {
    if (!session || !elderId || busyAction || info?.status === '已停用' || info?.disableReviewStatus === 'PENDING') {
      return;
    }

    try {
      setBusyAction('disable');
      setErrorText('');
      const result = await requestDisableWorkbenchQrCode(session.role, elderId);
      setInfo(result);
      setMessageText(result.reviewMessage || '停用申请已提交');
    } catch (error) {
      setErrorText((error as Error)?.message || '停用申请失败');
    } finally {
      setBusyAction('');
    }
  }

  async function handleRegenerate() {
    if (!elderId || busyAction) {
      return;
    }

    try {
      setBusyAction('regenerate');
      setErrorText('');
      const result = await regenerateWorkbenchQrCode(elderId);
      setInfo(result);
      setMessageText('二维码已重新生成');
    } catch (error) {
      setErrorText((error as Error)?.message || '重新生成失败');
    } finally {
      setBusyAction('');
    }
  }

  function handleBack() {
    void Taro.navigateBack({ delta: 1 }).catch(() => Taro.redirectTo({ url: APP_ROUTES.workbenchElderDetail }));
  }

  function handleOpenPreview() {
    if (!elderId) {
      return;
    }

    void Taro.navigateTo({
      url: `${APP_ROUTES.scanNameplate}?elderId=${encodeURIComponent(elderId)}`,
    });
  }

  if (!session) {
    return null;
  }

  const actionCount = [canRegenerateQrCode(session.role), canRequestQrDisable(session.role)].filter(Boolean).length;

  return (
    <WorkbenchShell pageClassName='workbench-qrcode-page'>
      <WorkbenchHeader title='二维码查看与管理' subtitle={elderName || undefined} leadingAction={{ label: '返回', icon: '←', onClick: handleBack }} />

      {loading ? <View className='sl-card'><View className='sl-empty-state'>二维码信息加载中...</View></View> : null}
      {errorText ? <View className='sl-error-card'>{errorText}</View> : null}
      {messageText ? <View className='workbench-qrcode-message'>{messageText}</View> : null}

      {!loading && info ? (
        <>
          <View className='sl-card sl-card-soft workbench-qrcode-hero'>
            <View className='workbench-qrcode-hero-copy'>
              <Text className='sl-overview-kicker'>扫码名牌</Text>
            </View>

            <View className={getPreviewCardClassName(info.status)}>
              <View className='sl-qr-preview-head'>
                <View>
                  <View className='sl-qr-preview-title'>{info.elderName || elderName || '当前老人'}的二维码</View>
                  <View className='sl-qr-preview-meta'>生成时间 {formatDateTimeLabel(info.createdAt)}</View>
                </View>
                <Text className={getStatusClassName(info.status)}>{info.status || '未知'}</Text>
              </View>

              <View className='sl-qr-preview-frame' onClick={handleOpenPreview}>
                <View className='sl-qr-preview-placeholder'>
                  {previewImage ? (
                    <Image className={getQrImageClassName(info.status)} mode='widthFix' src={previewImage} />
                  ) : (
                    <>
                      <Text className='sl-qr-preview-token'>{info.token || '暂无 Token'}</Text>
                      <Text className='sl-qr-preview-caption'>扫码后进入对应老人档案</Text>
                    </>
                  )}
                </View>
              </View>

              <Button className='sl-secondary-button workbench-qrcode-copy-button' loading={busyAction === 'copy'} onClick={handleCopyLink}>
                复制访问链接
              </Button>

              <View className='workbench-qrcode-preview-link'>访问链接 {info.url || '暂无'}</View>
              <View className='workbench-qrcode-preview-link'>二维码 Token {info.token || '暂无'}</View>
            </View>
          </View>

          <View className={actionCount === 1 ? 'sl-qr-action-grid is-single' : 'sl-qr-action-grid'}>
            {canRegenerateQrCode(session.role) ? (
              <View className='sl-action-card sl-detail-action-card' onClick={() => void handleRegenerate()}>
                <View className='sl-action-card__copy'>
                  <Text className='sl-action-card__title'>{busyAction === 'regenerate' ? '重新生成中' : '重新生成'}</Text>
                  <Text className='sl-action-card__desc'>刷新二维码与访问入口，旧二维码将被替换。</Text>
                </View>
                <View className='sl-action-card__arrow'>↻</View>
              </View>
            ) : null}

            {canRequestQrDisable(session.role) ? (
              <View className='sl-action-card sl-detail-action-card sl-action-card--warning' onClick={() => void handleDisable()}>
                <View className='sl-action-card__copy'>
                  <Text className='sl-action-card__title'>
                    {busyAction === 'disable' ? '提交中' : info.status === '已停用' ? '已停用' : info.disableReviewStatus === 'PENDING' ? '审核中' : '停用二维码'}
                  </Text>
                  <Text className='sl-action-card__desc'>
                    {info.disableReviewStatus === 'PENDING'
                      ? info.reviewMessage || '停用申请已提交，等待管理员审核。'
                      : info.reviewMessage || '停用后当前二维码将不再允许扫码访问。'}
                  </Text>
                </View>
                <View className='sl-action-card__arrow'>⊘</View>
              </View>
            ) : null}
          </View>

          {info.securityNote ? (
            <View className='sl-card'>
              <Text className='workbench-qrcode-note'>{info.securityNote}</Text>
            </View>
          ) : null}

          <BottomNavGrid elderId={elderId} activeKey='qrcode' />
        </>
      ) : null}
    </WorkbenchShell>
  );
}
