import { useEffect, useState } from 'react';
import { Ban, Copy, Download, LoaderCircle, QrCode, RefreshCcw } from 'lucide-react';
import QRCode from 'qrcode';
import { PageHeader } from '../components/PageHeader';
import { disableVolunteerElderQrCode, fetchVolunteerElderQrCode, regenerateVolunteerElderQrCode } from '../api/volunteerApi';
import type { AssignedElder, VolunteerQrCodeInfo } from '../types';
import { useI18n } from '../i18n';
import { downloadNameplatePdf } from '../shared-workbench/nameplateExport';

interface QrCodeManagePageProps {
  elder: AssignedElder;
  onBack: () => void;
}

function formatTime(value: string, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
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
  const { t } = useI18n();
  const [info, setInfo] = useState<VolunteerQrCodeInfo | null>(null);
  const [previewImage, setPreviewImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'disable' | 'regenerate' | null>(null);
  const [pdfExporting, setPdfExporting] = useState(false);
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
      setError(nextError instanceof Error ? nextError.message : t('errors.loadQrFailed'));
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
      setMessage(t('workbench.copiedAccessLink'));
      return;
    }
    setError(t('workbench.copyNotSupported'));
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
      setMessage(next.reviewMessage || t('errors.requestDisableSubmitted'));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('workbench.disableFailed'));
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
      setMessage(t('workbench.regeneratedNotice'));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('workbench.regenerateFailed'));
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadNameplatePdf() {
    if (pdfExporting) return;
    setPdfExporting(true);
    setError('');
    setMessage('');
    try {
      await downloadNameplatePdf({
        elderId: elder.id,
        archiveNo: elder.archiveNo,
        tokenStorageKey: 'sl_volunteer_token',
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('errors.pdfDownloadFailed'));
    } finally {
      setPdfExporting(false);
    }
  }

  return (
    <div className="sl-page">
      <PageHeader title={t('workbench.qrViewManage')} onBack={onBack} />

      <section className="sl-card sl-card-soft sl-qr-hero">
        <div className="sl-qr-hero-copy">
          <span className="sl-overview-kicker">{t('workbench.scanNameplateKicker')}</span>
        </div>

        {loading ? (
          <div className="sl-loading-text">{t('workbench.qrLoading')}</div>
        ) : error ? (
          <p className="sl-login-error">{error}</p>
        ) : info ? (
          <div className="sl-qr-layout">
            <div className={qrPreviewStateClassName(info.status)}>
              <div className="sl-qr-preview-top-actions">
                <button
                  type="button"
                  className="sl-qr-pdf-export-button"
                  onClick={() => void handleDownloadNameplatePdf()}
                  disabled={pdfExporting}
                  aria-label={t('workbench.exportNameplatePdf')}
                  title={pdfExporting ? t('common.exporting') : t('workbench.exportNameplatePdf')}
                >
                  {pdfExporting ? <LoaderCircle className="sl-icon-spin" size={18} /> : <Download size={18} />}
                </button>
                <span className={statusClassName(info.status)}>
                  {info.status === '已停用' ? t('workbench.disabled') : info.status === '启用' ? t('family.qrEnabled') : info.status}
                </span>
              </div>
              <div className="sl-qr-preview-title">{t('workbench.qrOfElder', { name: elder.name })}</div>
              <div className="sl-qr-preview-meta">
                {t('workbench.generatedAt')} <span className="sl-ltr-data">{formatTime(info.createdAt, t('errors.unrecorded'))}</span>
              </div>
              <div className="sl-qr-preview-frame">
                {previewImage ? (
                  <img
                    className={qrImageStateClassName(info.status)}
                    src={previewImage}
                    alt={t('workbench.qrOfElder', { name: elder.name })}
                  />
                ) : (
                  <div className="sl-qr-preview-fallback">
                    <QrCode size={96} />
                    <span>{t('workbench.qrPreviewUnavailable')}</span>
                  </div>
                )}
              </div>
              <button type="button" className="sl-secondary-btn sl-qr-inline-btn" onClick={() => void handleCopyLink()}>
                <Copy size={15} />
                {t('workbench.copyAccessLink')}
              </button>
              {getPreferredQrUrl(info) ? <div className="sl-qr-preview-link">{t('common.link')} <span className="sl-ltr-data">{getPreferredQrUrl(info)}</span></div> : null}
            </div>
          </div>
        ) : (
          <div className="sl-empty-state">{t('family.noQrInfo')}</div>
        )}
      </section>

      {message ? <div className="sl-disclaimer"><span>{message}</span></div> : null}

      {info ? (
        <section className="sl-action-grid">
          <button type="button" className="sl-action-card" onClick={() => void handleRegenerate()} disabled={busy !== null}>
            <div className="sl-action-card-head">
              <strong>{busy === 'regenerate' ? t('workbench.regenerating') : t('workbench.regenerate')}</strong>
              <div className="sl-qr-action-icon"><RefreshCcw size={18} /></div>
            </div>
          </button>
          <button type="button" className="sl-action-card sl-action-card-warning" onClick={() => void handleDisable()} disabled={busy !== null || info.status === '已停用' || disableReviewPending}>
            <div className="sl-action-card-head">
              <strong>{busy === 'disable' ? t('workbench.submitPending') : info.status === '已停用' ? t('workbench.disabled') : disableReviewPending ? t('workbench.reviewing') : t('workbench.disableQr')}</strong>
              <div className="sl-qr-action-icon"><Ban size={18} /></div>
            </div>
          </button>
        </section>
      ) : null}
    </div>
  );
}
