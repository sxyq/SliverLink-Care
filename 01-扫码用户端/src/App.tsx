import { useEffect, useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import { SecurityProvider, useSecurity } from './app/SecurityProvider';
import { ContentProtection } from './components/ContentProtection';
import { useQrToken } from './hooks/useQrToken';
import { useScanBasicInfo } from './hooks/useScanBasicInfo';
import { useProtectedArchive } from './hooks/useProtectedArchive';
import { getResolvedQrToken } from './api/scanApi';
import { BasicInfoPage } from './pages/BasicInfoPage';
import { SmsVerifyPage } from './pages/SmsVerifyPage';
import { HealthArchivePage } from './pages/HealthArchivePage';
import { MedicationPage } from './pages/MedicationPage';
import { ScaleSummaryPage } from './pages/ScaleSummaryPage';
import { ScaleDetailPage } from './pages/ScaleDetailPage';
import { NameplatePreviewPage } from './pages/NameplatePreviewPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { createAppRouter } from './routes/router';
import { I18nProvider, i18nRuntime } from './i18n';
import { useI18n } from './i18n';

function AppRoutes() {
  const { t } = useI18n();
  const { token, isValid } = useQrToken();
  const qrState = !token ? 'missing-token' : isValid ? 'valid-token' : 'invalid-qr';
  const { data, loading, error } = useScanBasicInfo(qrState === 'valid-token' ? token : null);
  const { verified, verifiedSessionId, verifiedElderId, clearVerification } = useSecurity();
  const { verifiedBasicInfo, healthRecord, medications, scaleSummaries, loading: archiveLoading } = useProtectedArchive(verified, verifiedSessionId, verifiedElderId);

  useEffect(() => {
    const verifiedQrToken = getResolvedQrToken();
    if (verifiedQrToken && token && verifiedQrToken !== token) {
      clearVerification();
    }
  }, [clearVerification, token]);

  useEffect(() => {
    if (verified && data?.id && verifiedElderId && data.id !== verifiedElderId) {
      clearVerification();
    }
  }, [clearVerification, data?.id, verified, verifiedElderId]);

  const protectionWatermark = useMemo(() => {
    const safeVerifiedBasicInfo = verifiedBasicInfo?.id === data?.id ? verifiedBasicInfo : null;
    const base = safeVerifiedBasicInfo || data;
    const archiveNo = base?.archiveNo || '';
    const sessionTail = verifiedSessionId ? verifiedSessionId.slice(-6) : 'public';
    return `${t('common.appName')} ${t('common.viewOnlyWatermark')} ${archiveNo} ${sessionTail}`;
  }, [data, t, verifiedBasicInfo, verifiedSessionId]);

  const router = useMemo(() => {
    if (loading) {
      return createAppRouter(
        <div className="sl-page loading">{t('common.readingNameplate')}</div>,
        <div className="sl-page loading">{t('common.reading')}</div>,
        <div className="sl-page loading">{t('common.reading')}</div>,
        <div className="sl-page loading">{t('common.reading')}</div>,
        <div className="sl-page loading">{t('common.reading')}</div>,
        <div className="sl-page loading">{t('common.reading')}</div>,
        <div className="sl-page loading">{t('common.reading')}</div>
      );
    }

    if (error || !data) {
      const errorPage = qrState === 'missing-token'
        ? <NotFoundPage variant="missing-token" />
        : <NotFoundPage variant="invalid-qr" />;
      return createAppRouter(
        errorPage,
        errorPage,
        errorPage,
        errorPage,
        errorPage,
        errorPage,
        errorPage
      );
    }

    const basicDisplayData = verifiedBasicInfo?.id === data.id ? verifiedBasicInfo : data;

    return createAppRouter(
      <BasicInfoPage
        data={basicDisplayData}
        verified={verified}
      />,
      <SmsVerifyPage />,
      <HealthArchivePage data={healthRecord} basicInfo={basicDisplayData} loading={archiveLoading} verified={verified} />,
      <MedicationPage data={medications} loading={archiveLoading} />,
      <ScaleSummaryPage data={scaleSummaries} loading={archiveLoading} />,
      <ScaleDetailPage data={scaleSummaries} loading={archiveLoading} sessionId={verifiedSessionId} elderId={verifiedElderId} />,
      <NameplatePreviewPage
        elderId={data.id}
        name={data.name}
        age={data.age}
        phone={data.emergencyPhoneMasked}
        archiveNo={data.archiveNo}
      />
    );
  }, [archiveLoading, data, error, healthRecord, loading, medications, qrState, scaleSummaries, t, verified, verifiedBasicInfo, verifiedSessionId, verifiedElderId]);

  return (
    <>
      <ContentProtection enabled={verified} watermarkText={protectionWatermark} />
      <RouterProvider router={router} />
    </>
  );
}

export function App() {
  return (
    <I18nProvider runtime={i18nRuntime}>
      <SecurityProvider>
        <AppRoutes />
      </SecurityProvider>
    </I18nProvider>
  );
}
