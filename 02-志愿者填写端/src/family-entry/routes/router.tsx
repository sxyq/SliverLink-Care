import type { ReactElement } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import InviteLandingPage from '../pages/InviteLandingPage';
import FamilyRegisterPage from '../pages/FamilyRegisterPage';
import SmsVerifyPage from '../pages/SmsVerifyPage';
import FamilyLoginPage from '../pages/FamilyLoginPage';
import FamilyHomePage from '../pages/FamilyHomePage';
import ElderBasicManagePage from '../pages/ElderBasicManagePage';
import ContactManagePage from '../pages/ContactManagePage';
import MedicationManagePage from '../pages/MedicationManagePage';
import QrCodeViewPage from '../pages/QrCodeViewPage';
import { isFamilyLoggedIn } from '../api/familyAuthApi';

function RequireFamilyAuth({ children }: { children: ReactElement }) {
  if (!isFamilyLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/invite/:code" element={<InviteLandingPage />} />
      <Route path="/register" element={<FamilyRegisterPage />} />
      <Route path="/verify" element={<SmsVerifyPage />} />
      <Route path="/login" element={<FamilyLoginPage />} />
      <Route path="/" element={<RequireFamilyAuth><FamilyHomePage /></RequireFamilyAuth>} />
      <Route path="/elders/:elderId" element={<RequireFamilyAuth><ElderBasicManagePage /></RequireFamilyAuth>} />
      <Route path="/elders/:elderId/contacts" element={<RequireFamilyAuth><ContactManagePage /></RequireFamilyAuth>} />
      <Route path="/elders/:elderId/medications" element={<RequireFamilyAuth><MedicationManagePage /></RequireFamilyAuth>} />
      <Route path="/elders/:elderId/qrcode" element={<RequireFamilyAuth><QrCodeViewPage /></RequireFamilyAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
