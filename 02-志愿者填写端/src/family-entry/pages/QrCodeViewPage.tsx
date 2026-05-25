import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { QrCodeInfo } from '../types';
import { getElderQrCode, requestDisableElderQrCode } from '../api/familyElderApi';
import TopBar from '../components/TopBar';

export default function QrCodeViewPage() {
  const { elderId } = useParams<{ elderId: string }>();
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
      .catch((err) => setError(err instanceof Error ? err.message : '二维码信息加载失败'))
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
      setMessage(next.reviewMessage || '停用申请已提交，等待管理员审核。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '停用申请提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const disableReviewPending = qrInfo?.disableReviewStatus === 'PENDING';

  return (
    <div>
      <TopBar title="二维码状态" />
      <div className="page-container">
        {loading ? (
          <div className="text-center text-secondary">加载中...</div>
        ) : error ? (
          <div className="empty-state">
            <p>{error}</p>
          </div>
        ) : qrInfo ? (
          <>
            <div className="card">
              <div className="field-row">
                <span className="field-label">状态</span>
                <span className={`status-badge ${qrInfo.status === '启用' ? 'active' : 'inactive'}`}>
                  {qrInfo.status}
                </span>
              </div>
              <div className="field-row">
                <span className="field-label">生成时间</span>
                <span className="field-value">{qrInfo.createdAt}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Token</span>
                <span className="field-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>
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
                下载名牌 PDF
              </button>
              <button
                className="btn btn-secondary btn-block mt-12"
                onClick={() => void handleDisableRequest()}
                disabled={submitting || qrInfo.status === '已停用' || qrInfo.status === 'DISABLED' || disableReviewPending}
              >
                {submitting ? '提交中...' : disableReviewPending ? '停用审核中' : '申请停用二维码'}
              </button>
            </div>

            {message ? (
              <div className="info-banner mt-16">
                <span>{message}</span>
              </div>
            ) : null}

            <div className="info-banner mt-16">
              <span>二维码停用需要管理员审核，通过后才会正式停用。</span>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>暂无二维码信息</p>
          </div>
        )}
      </div>
    </div>
  );
}
