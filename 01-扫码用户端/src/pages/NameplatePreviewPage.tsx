import { useState } from 'react';
import { QrCode, Download, FileText, ArrowLeft } from 'lucide-react';
import { ActionButton } from '../components/ActionButton';
import { reportAudit } from '../api/auditApi';
import { ENDPOINTS } from '../config/endpoints';
import { API_BASE_URL } from '../config/env';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();

  async function handleDownloadPdf() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}${ENDPOINTS.nameplatePdf}/${encodeURIComponent(elderId)}/pdf`, {
        method: 'GET',
      });

      if (!res.ok) throw new Error(t('errors.exportRetry'));

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${t('common.appName')}_${archiveNo || elderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      reportAudit({ action: 'nameplate_pdf_download', target: archiveNo || elderId }).catch(() => {});
    } catch {
      alert(t('scan.pdfDownloadFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sl-page">
      <header className="sl-hero slim">
        <div>
          <h1>{t('scan.nameplatePreview')}</h1>
          <p>{t('scan.previewPreparing')}</p>
        </div>
        <QrCode size={32} />
      </header>

      <section className="sl-card">
        <div className="sl-section-title">
          <ArrowLeft size={18} />
          <h2>{t('scan.frontNameplate')}</h2>
        </div>
        <div className="sl-nameplate-front">
          <div className="sl-nameplate-field">
            <span className="sl-nameplate-label">{t('common.name')}</span>
            <span className="sl-nameplate-placeholder sl-auto-data" dir="auto">{name || t('scan.unanswered')}</span>
          </div>
          <div className="sl-nameplate-field">
            <span className="sl-nameplate-label">{t('common.age')}</span>
            <span className="sl-nameplate-placeholder">{age ? t('common.yearsOld', { age }) : t('scan.unanswered')}</span>
          </div>
          <div className="sl-nameplate-field">
            <span className="sl-nameplate-label">{t('common.contactPhone')}</span>
            <span className="sl-nameplate-placeholder sl-ltr-data">{phone || t('scan.unanswered')}</span>
          </div>
        </div>
      </section>

      <section className="sl-card">
        <div className="sl-section-title">
          <ArrowLeft size={18} />
          <h2>{t('scan.backNameplate')}</h2>
        </div>
        <div className="sl-nameplate-back">
          <div className="sl-nameplate-qr-area">
            <QrCode size={64} />
            <span className="sl-nameplate-qr-hint">{t('scan.wechatScanHealthArchive')}</span>
          </div>
          <div className="sl-nameplate-divider" />
          <div className="sl-nameplate-field">
            <span className="sl-nameplate-label">{t('common.healthRecordNo')}</span>
            <span className="sl-nameplate-placeholder sl-ltr-data">{archiveNo || t('scan.notGenerated')}</span>
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
          {loading ? t('scan.generatingPdf') : t('scan.generatePdf')}
        </ActionButton>
        <ActionButton
          icon={Download}
          variant="primary"
          onClick={handleDownloadPdf}
          disabled={loading}
        >
          {loading ? t('scan.downloadingPdf') : t('scan.downloadPdf')}
        </ActionButton>
      </div>

      <p className="sl-nameplate-note">
        {t('scan.qrBackendNotice')}
      </p>
    </div>
  );
}
