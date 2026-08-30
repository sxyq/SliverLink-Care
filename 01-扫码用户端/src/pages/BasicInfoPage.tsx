import { FileDown, Phone, PlusSquare, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionButton } from '../components/ActionButton';
import { AppAttribution } from '../components/AppAttribution';
import { BottomTabBar } from '../components/BottomTabBar';
import { PageTopBar } from '../components/PageTopBar';
import { formatMaskedContact, maskName } from '../utils/mask';
import type { ElderBasicInfo } from '../types';
import { useI18n } from '../i18n';

interface BasicInfoPageProps {
  data: ElderBasicInfo;
  verified?: boolean;
}

function formatMaskedEmergencyContactName(data: ElderBasicInfo) {
  return formatMaskedContact(data.emergencyContact, data.relationship);
}

function formatVerifiedEmergencyContactName(data: ElderBasicInfo) {
  const relation = data.relationship ? `（${data.relationship}）` : '';
  return `${data.emergencyContact}${relation}`;
}

export function BasicInfoPage({ data, verified = false }: BasicInfoPageProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  function handleViewArchive() {
    if (verified) {
      navigate('/health');
      return;
    }
    setShowConsentDialog(true);
  }

  function handleContinueVerify() {
    setShowConsentDialog(false);
    navigate('/verify?target=health');
  }

  return (
    <div className="sl-page sl-home-page sl-has-bottom-nav">
      <PageTopBar title={t('common.appName')} leading="home" trailing="menu" />

      <section className="sl-section-heading">
        <h2>{t('scan.basicInfo')}</h2>
        <span className="sl-section-heading-badge">
          <ShieldCheck size={18} />
        </span>
      </section>

      <section className="sl-panel sl-profile-panel">
        <div className="sl-profile-hero">
          <div className="sl-profile-avatar">
            <UserRound size={42} />
          </div>
          <div className="sl-profile-lines">
            <p>{t('common.name')}： <span className="sl-auto-data" dir="auto">{verified ? data.name : maskName(data.name)}</span></p>
            <p>{t('common.gender')}： <span className="sl-auto-data" dir="auto">{data.gender}</span></p>
            <p>{t('common.age')}： {t('common.yearsOld', { age: data.age })}</p>
          </div>
        </div>
        <div className="sl-archive-line">
          <span>{t('common.healthRecordNo')}： </span><span className="sl-ltr-data">{data.archiveNo}</span>
        </div>
      </section>

      <section className="sl-panel sl-address-panel">
        <div className="sl-mini-heading">
          <h3>{t('scan.addressInfo')}</h3>
          <span className="sl-mini-heading-icon">
            <ShieldCheck size={16} />
          </span>
        </div>
        <div className="sl-address-line">
          <span className="sl-auto-data" dir="auto">
            {verified ? (data.residence || t('common.pendingSupplement')) : t('scan.completeVerifyToViewAddress')}
          </span>
        </div>
      </section>

      <section className="sl-panel sl-contact-panel">
        <div className="sl-contact-line">
          <span>{t('scan.emergencyContact')}： </span>
          <span className="sl-auto-data" dir="auto">
            {verified ? formatVerifiedEmergencyContactName(data) : formatMaskedEmergencyContactName(data)}
          </span>{' '}
          <span className="sl-ltr-data" dir="ltr">
            {verified ? data.emergencyPhoneDial : data.emergencyPhoneMasked}
          </span>
        </div>
        <ActionButton icon={Phone} variant="emergency" href={`tel:${data.emergencyPhoneDial}`}>
          {t('scan.callNow')}
        </ActionButton>
      </section>

      <section className="sl-panel sl-medical-panel">
        <div className="sl-mini-heading">
          <h3>{t('scan.medicalInfo')}</h3>
          <span className="sl-mini-heading-icon">
            <PlusSquare size={16} />
          </span>
        </div>
        <div className="sl-medical-list">
          <div>{t('scan.aboType')}： <span className="sl-ltr-data" dir="ltr">{data.aboType}{t('common.bloodTypeSuffix')}</span></div>
          <div>{t('scan.rhType')}： <span className="sl-ltr-data" dir="ltr">{data.rhType}</span></div>
          <div>{t('scan.allergySummary')}： <span className="sl-auto-data" dir="auto">{data.allergySummary}</span></div>
        </div>
      </section>

      <ActionButton variant="primary" onClick={handleViewArchive}>
        {t('scan.viewHealthArchive')}
      </ActionButton>

      <ActionButton icon={FileDown} variant="outline" onClick={() => navigate('/nameplate')}>
        {t('scan.downloadPdf')}
      </ActionButton>

      <AppAttribution />
      <BottomTabBar />

      {showConsentDialog ? (
        <div className="sl-consent-overlay" role="dialog" aria-modal="true" aria-labelledby="sl-consent-title">
          <div className="sl-consent-dialog">
            <h3 id="sl-consent-title">{t('scan.consentTitle')}</h3>
            <p>{t('scan.consentDescription')}</p>
            <p>{t('scan.consentAudit')}</p>
            <p className="sl-consent-emphasis">{t('scan.consentAgreement')}</p>
            <div className="sl-consent-actions">
              <button type="button" className="sl-consent-btn secondary" onClick={() => setShowConsentDialog(false)}>
                {t('scan.dontView')}
              </button>
              <button type="button" className="sl-consent-btn primary" onClick={handleContinueVerify}>
                {t('common.continueView')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
