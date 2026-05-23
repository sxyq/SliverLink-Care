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

export function AppRouter() {
  return (
    <Routes>
      <Route path="/invite/:code" element={<InviteLandingPage />} />
      <Route path="/register" element={<FamilyRegisterPage />} />
      <Route path="/verify" element={<SmsVerifyPage />} />
      <Route path="/login" element={<FamilyLoginPage />} />
      <Route path="/" element={<FamilyHomePage />} />
      <Route path="/elders/:elderId" element={<ElderBasicManagePage />} />
      <Route path="/elders/:elderId/contacts" element={<ContactManagePage />} />
      <Route path="/elders/:elderId/medications" element={<MedicationManagePage />} />
      <Route path="/elders/:elderId/qrcode" element={<QrCodeViewPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
