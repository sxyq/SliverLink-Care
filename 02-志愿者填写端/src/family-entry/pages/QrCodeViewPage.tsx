import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { QrCodeInfo } from '../types';
import { getElderQrCode } from '../api/familyElderApi';
import TopBar from '../components/TopBar';

export default function QrCodeViewPage() {
  const { elderId } = useParams<{ elderId: string }>();
  const [qrInfo, setQrInfo] = useState<QrCodeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
            </div>

            <div className="info-banner mt-16">
              <span>二维码由后台生成，家属端仅可查看状态和下载名牌 PDF。</span>
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
