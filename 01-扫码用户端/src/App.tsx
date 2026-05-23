import { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import { SecurityProvider, useSecurity } from './app/SecurityProvider';
import { useQrToken } from './hooks/useQrToken';
import { useScanBasicInfo } from './hooks/useScanBasicInfo';
import { useProtectedArchive } from './hooks/useProtectedArchive';
import { BasicInfoPage } from './pages/BasicInfoPage';
import { SmsVerifyPage } from './pages/SmsVerifyPage';
import { HealthArchivePage } from './pages/HealthArchivePage';
import { MedicationPage } from './pages/MedicationPage';
import { ScaleSummaryPage } from './pages/ScaleSummaryPage';
import { NameplatePreviewPage } from './pages/NameplatePreviewPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { createAppRouter } from './routes/router';

function AppRoutes() {
  const { token, isValid } = useQrToken();
  const { data, loading, error } = useScanBasicInfo(isValid ? token : null);
  const { verified } = useSecurity();
  const { healthRecord, medications, scaleSummaries, loading: archiveLoading } = useProtectedArchive(verified);

  const router = useMemo(() => {
    if (loading) {
      return createAppRouter(
        <div className="sl-page loading">正在读取智联名牌...</div>,
        <div className="sl-page loading">正在读取...</div>,
        <div className="sl-page loading">正在读取...</div>,
        <div className="sl-page loading">正在读取...</div>,
        <div className="sl-page loading">正在读取...</div>,
        <div className="sl-page loading">正在读取...</div>
      );
    }

    if (error || !data) {
      return createAppRouter(
        <NotFoundPage />,
        <NotFoundPage />,
        <NotFoundPage />,
        <NotFoundPage />,
        <NotFoundPage />,
        <NotFoundPage />
      );
    }

    return createAppRouter(
      <BasicInfoPage
        data={data}
        verified={verified}
        healthRecord={healthRecord}
        medications={medications}
        archiveLoading={archiveLoading}
      />,
      <SmsVerifyPage />,
      <HealthArchivePage data={healthRecord} loading={archiveLoading} />,
      <MedicationPage data={medications} loading={archiveLoading} />,
      <ScaleSummaryPage data={scaleSummaries} loading={archiveLoading} />,
      <NameplatePreviewPage
        elderId={data.id}
        name={data.name}
        age={data.age}
        phone={data.emergencyPhoneMasked}
        archiveNo={data.archiveNo}
      />
    );
  }, [loading, error, data, verified, healthRecord, medications, scaleSummaries, archiveLoading]);

  return <RouterProvider router={router} />;
}

export function App() {
  return (
    <SecurityProvider>
      <AppRoutes />
    </SecurityProvider>
  );
}
