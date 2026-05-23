import { useState } from 'react';
import { QrCode, Download, FileText, ArrowLeft } from 'lucide-react';
import { ActionButton } from '../components/ActionButton';
import { reportAudit } from '../api/auditApi';
import { ENDPOINTS } from '../config/endpoints';
import { API_BASE_URL } from '../config/env';

interface NameplatePreviewPageProps {
  elderId: string;
  name?: string;
  age?: number;
  phone?: string;
  archiveNo?: string;
}

export function NameplatePreviewPage({
  elderId,
  name = '',
  age = 0,
  phone = '',
  archiveNo = '',
}: NameplatePreviewPageProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownloadPdf() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}${ENDPOINTS.nameplatePdf}/${encodeURIComponent(elderId)}/pdf`, {
        method: 'GET',
      });

      if (!res.ok) throw new Error('PDF 生成失败');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `智联名牌_${archiveNo || elderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      reportAudit({ action: 'nameplate_pdf_download', target: archiveNo || elderId }).catch(() => {});
    } catch {
      alert('PDF 下载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sl-page">
      <header className="sl-hero slim">
        <div>
          <h1>实体名牌预览</h1>
          <p>正面与背面打印效果预览</p>
        </div>
        <QrCode size={32} />
      </header>

      <section className="sl-card">
        <div className="sl-section-title">
          <ArrowLeft size={18} />
          <h2>正面（佩戴面）</h2>
        </div>
        <div className="sl-nameplate-front">
          <div className="sl-nameplate-field">
            <span className="sl-nameplate-label">姓名</span>
            <span className="sl-nameplate-placeholder">{name || '未填写'}</span>
          </div>
          <div className="sl-nameplate-field">
            <span className="sl-nameplate-label">年龄</span>
            <span className="sl-nameplate-placeholder">{age ? `${age} 岁` : '未填写'}</span>
          </div>
          <div className="sl-nameplate-field">
            <span className="sl-nameplate-label">联系电话</span>
            <span className="sl-nameplate-placeholder">{phone || '未填写'}</span>
          </div>
        </div>
      </section>

      <section className="sl-card">
        <div className="sl-section-title">
          <ArrowLeft size={18} />
          <h2>背面（信息面）</h2>
        </div>
        <div className="sl-nameplate-back">
          <div className="sl-nameplate-qr-area">
            <QrCode size={64} />
            <span className="sl-nameplate-qr-hint">微信扫码查看健康档案</span>
          </div>
          <div className="sl-nameplate-divider" />
          <div className="sl-nameplate-field">
            <span className="sl-nameplate-label">档案编号</span>
            <span className="sl-nameplate-placeholder">{archiveNo || '未生成'}</span>
          </div>
        </div>
      </section>

      <div className="sl-nameplate-actions">
        <ActionButton
          icon={FileText}
          variant="secondary"
          onClick={handleDownloadPdf}
          disabled={loading}
        >
          {loading ? '生成中...' : '生成 PDF'}
        </ActionButton>
        <ActionButton
          icon={Download}
          variant="primary"
          onClick={handleDownloadPdf}
          disabled={loading}
        >
          {loading ? '下载中...' : '下载 PDF'}
        </ActionButton>
      </div>

      <p className="sl-nameplate-note">
        二维码由后端加密生成，前端不自行生成明文二维码。
      </p>
    </div>
  );
}
