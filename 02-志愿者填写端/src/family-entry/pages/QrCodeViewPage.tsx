import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { QrCodeInfo } from '../types';
import { getElderQrCode, requestDisableElderQrCode } from '../api/familyElderApi';
import TopBar from '../components/TopBar';
import { useI18n } from '../../i18n';

export default function QrCodeViewPage() {
  const { elderId } = useParams<{ elderId: string }>();
  const { t } = useI18n();
  const [qrInfo, setQrInfo] = useState<QrCodeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!elderId) return;
    setLoading(true);
    getElderQrCode(elderId)
      .then(setQrInfo)
      .catch((err) => setError(err instanceof Error ? err.message : t('errors.loadQrFailed')))
      .finally(() => setLoading(false));
  }, [elderId]);

  const handleDownloadPdf = () => {
    if (qrInfo?.pdfUrl) {
      window.open(qrInfo.pdfUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDisableRequest = async () => {
    if (!elderId) return;
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const next = await requestDisableElderQrCode(elderId);
      setQrInfo(next);
      setMessage(next.reviewMessage || t('errors.requestDisableSubmitted'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.disableRequestFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const disableReviewPending = qrInfo?.disableReviewStatus === 'PENDING';

  return (
    <div>
      <TopBar title={t('family.qrStatus')} />
      <div className="page-container">
        {loading ? (
          <div className="text-center text-secondary">{t('common.loading')}</div>
        ) : error ? (
          <div className="empty-state">
            <p>{error}</p>
          </div>
        ) : qrInfo ? (
          <>
            <div className="card">
              <div className="field-row">
                <span className="field-label">{t('common.status')}</span>
                <span className={`status-badge ${qrInfo.status === '启用' ? 'active' : 'inactive'}`}>
                  {qrInfo.status}
                </span>
              </div>
              <div className="field-row">
                <span className="field-label">{t('workbench.generatedAt')}</span>
                <span className="field-value sl-ltr-data">{qrInfo.createdAt}</span>
              </div>
              <div className="field-row">
                <span className="field-label">{t('common.token')}</span>
                <span className="field-value sl-ltr-data" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {qrInfo.token}
                </span>
              </div>
            </div>

            <div className="card">
              <button
                className="btn btn-primary btn-block"
                onClick={handleDownloadPdf}
                disabled={!qrInfo.pdfUrl}
              >
                {t('workbench.downloadPdf')}
              </button>
              <button
                className="btn btn-secondary btn-block mt-12"
                onClick={() => void handleDisableRequest()}
                disabled={submitting || qrInfo.status === '已停用' || qrInfo.status === 'DISABLED' || disableReviewPending}
              >
                {submitting ? t('common.submitting') : disableReviewPending ? t('family.qrDisablePending') : t('workbench.requestDisableQr')}
              </button>
            </div>

            {message ? (
              <div className="info-banner mt-16">
                <span>{message}</span>
              </div>
            ) : null}

            <div className="info-banner mt-16">
              <span>{t('workbench.disableNotice')}</span>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>{t('family.noQrInfo')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
