import { useEffect, useState } from 'react';
import { Ban, Copy, QrCode, RefreshCcw } from 'lucide-react';
import QRCode from 'qrcode';
import { PageHeader } from '../components/PageHeader';
import { disableVolunteerElderQrCode, fetchVolunteerElderQrCode, regenerateVolunteerElderQrCode } from '../api/volunteerApi';
import type { AssignedElder, VolunteerQrCodeInfo } from '../types';

interface QrCodeManagePageProps {
  elder: AssignedElder;
  onBack: () => void;
}

function formatTime(value: string) {
  if (!value) return '未记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function statusClassName(status: string) {
  if (status === '已停用') return 'sl-qr-status-chip is-disabled';
  if (status === '已重新生成') return 'sl-qr-status-chip is-regenerated';
  return 'sl-qr-status-chip is-enabled';
}

function qrPreviewStateClassName(status: string) {
  if (status === '已停用') return 'sl-qr-preview-card is-disabled';
  if (status === '已重新生成') return 'sl-qr-preview-card is-regenerated';
  return 'sl-qr-preview-card is-enabled';
}

function qrImageStateClassName(status: string) {
  if (status === '已停用') return 'sl-qr-image is-disabled';
  if (status === '已重新生成') return 'sl-qr-image is-regenerated';
  return 'sl-qr-image is-enabled';
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy copy path below.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}

function getPreferredQrUrl(info: VolunteerQrCodeInfo) {
  return info.publicUrl || info.url || '';
}

function normalizeBase64Image(value?: string) {
  if (!value) return '';
  return value.startsWith('data:image') ? value : `data:image/png;base64,${value}`;
}

export function QrCodeManagePage({ elder, onBack }: QrCodeManagePageProps) {
  const [info, setInfo] = useState<VolunteerQrCodeInfo | null>(null);
  const [previewImage, setPreviewImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'disable' | 'regenerate' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const disableReviewPending = info?.disableReviewStatus === 'PENDING';

  async function renderPreview(info: VolunteerQrCodeInfo) {
    const inlineImage = normalizeBase64Image(info.qrImageBase64);
    if (inlineImage) {
      setPreviewImage(inlineImage);
      return;
    }

    if (info.qrImageUrl) {
      setPreviewImage(info.qrImageUrl);
      return;
    }

    const url = getPreferredQrUrl(info);
    if (!url) {
      setPreviewImage('');
      return;
    }

    try {
      const image = await QRCode.toDataURL(url, {
        width: 220,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
      setPreviewImage(image);
    } catch {
      setPreviewImage('');
    }
  }

  async function loadQrCode() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const next = await fetchVolunteerElderQrCode(elder.id);
      setInfo(next);
      if (next) {
        await renderPreview(next);
      } else {
        setPreviewImage('');
      }
    } catch (nextError) {
      setInfo(null);
      setPreviewImage('');
      setError(nextError instanceof Error ? nextError.message : '二维码信息加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQrCode();
  }, [elder.id]);

  async function handleCopyLink() {
    const link = info ? getPreferredQrUrl(info) : '';
    if (!link) return;
    setError('');
    setMessage('');
    const copied = await copyText(link);
    if (copied) {
      setMessage('二维码访问链接已复制。');
      return;
    }
    setError('当前环境暂不支持自动复制，请手动长按二维码或链接复制。');
  }

  async function handleDisable() {
    if (!info) return;
    setBusy('disable');
    setError('');
    setMessage('');
    try {
      const next = await disableVolunteerElderQrCode(elder.id);
      setInfo(next);
      await renderPreview(next);
      setMessage(next.reviewMessage || '停用申请已提交，等待管理员审核。');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '停用失败');
    } finally {
      setBusy(null);
    }
  }

  async function handleRegenerate() {
    setBusy('regenerate');
    setError('');
    setMessage('');
    try {
      const next = await regenerateVolunteerElderQrCode(elder.id);
      setInfo(next);
      await renderPreview(next);
      setMessage('二维码已重新生成，旧二维码将被替换。');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '重新生成失败');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="sl-page">
      <PageHeader title="二维码查看与管理" onBack={onBack} />

      <section className="sl-card sl-card-soft sl-qr-hero">
        <div className="sl-qr-hero-copy">
          <span className="sl-overview-kicker">扫码名牌</span>
        </div>

        {loading ? (
          <div className="sl-loading-text">二维码加载中...</div>
        ) : error ? (
          <p className="sl-login-error">{error}</p>
        ) : info ? (
          <div className="sl-qr-layout">
            <div className={qrPreviewStateClassName(info.status)}>
              <span className={statusClassName(info.status)}>{info.status}</span>
              <div className="sl-qr-preview-title">{elder.name} 的二维码</div>
              <div className="sl-qr-preview-meta">生成时间 {formatTime(info.createdAt)}</div>
              <div className="sl-qr-preview-frame">
                {previewImage ? (
                  <img
                    className={qrImageStateClassName(info.status)}
                    src={previewImage}
                    alt={`${elder.name} 的二维码`}
                  />
                ) : (
                  <div className="sl-qr-preview-fallback">
                    <QrCode size={96} />
                    <span>二维码暂未生成成功</span>
                  </div>
                )}
              </div>
              <button type="button" className="sl-secondary-btn sl-qr-inline-btn" onClick={() => void handleCopyLink()}>
                <Copy size={15} />
                复制访问链接
              </button>
              {getPreferredQrUrl(info) ? <div className="sl-qr-preview-link">访问链接 {getPreferredQrUrl(info)}</div> : null}
            </div>
          </div>
        ) : (
          <div className="sl-empty-state">暂无二维码信息</div>
        )}
      </section>

      {message ? <div className="sl-disclaimer"><span>{message}</span></div> : null}

      {info ? (
        <section className="sl-action-grid">
          <button type="button" className="sl-action-card" onClick={() => void handleRegenerate()} disabled={busy !== null}>
            <div className="sl-action-card-head">
              <strong>{busy === 'regenerate' ? '重新生成中' : '重新生成'}</strong>
              <div className="sl-qr-action-icon"><RefreshCcw size={18} /></div>
            </div>
          </button>
          <button type="button" className="sl-action-card sl-action-card-warning" onClick={() => void handleDisable()} disabled={busy !== null || info.status === '已停用' || disableReviewPending}>
            <div className="sl-action-card-head">
              <strong>{busy === 'disable' ? '提交中' : info.status === '已停用' ? '已停用' : disableReviewPending ? '审核中' : '停用二维码'}</strong>
              <div className="sl-qr-action-icon"><Ban size={18} /></div>
            </div>
          </button>
        </section>
      ) : null}
    </div>
  );
}
