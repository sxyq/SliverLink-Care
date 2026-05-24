import { Phone, PlusSquare, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionButton } from '../components/ActionButton';
import { AppAttribution } from '../components/AppAttribution';
import { BottomTabBar } from '../components/BottomTabBar';
import { PageTopBar } from '../components/PageTopBar';
import { formatMaskedContact, maskName } from '../utils/mask';
import type { ElderBasicInfo } from '../types';

interface BasicInfoPageProps {
  data: ElderBasicInfo;
  verified?: boolean;
}

function formatEmergencyContact(data: ElderBasicInfo) {
  return `${formatMaskedContact(data.emergencyContact, data.relationship)}  ${data.emergencyPhoneMasked}`;
}

function formatVerifiedEmergencyContact(data: ElderBasicInfo) {
  const relation = data.relationship ? `（${data.relationship}）` : '';
  return `${data.emergencyContact}${relation}  ${data.emergencyPhoneDial}`;
}

export function BasicInfoPage({ data, verified = false }: BasicInfoPageProps) {
  const navigate = useNavigate();
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
      <PageTopBar title="智联名牌" leading="home" trailing="menu" />

      <section className="sl-section-heading">
        <h2>基本信息</h2>
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
            <p>姓名： {verified ? data.name : maskName(data.name)}</p>
            <p>性别： {data.gender}</p>
            <p>年龄： {data.age} 岁</p>
          </div>
        </div>
        <div className="sl-archive-line">
          健康档案编号： {data.archiveNo}
        </div>
      </section>

      <section className="sl-panel sl-address-panel">
        <div className="sl-mini-heading">
          <h3>住址信息</h3>
          <span className="sl-mini-heading-icon">
            <ShieldCheck size={16} />
          </span>
        </div>
        <div className="sl-address-line">
          {verified ? (data.residence || '待补充') : '完成验证后可查看老人详细住址信息'}
        </div>
      </section>

      <section className="sl-panel sl-contact-panel">
        <div className="sl-contact-line">
          <span>紧急联系人： {verified ? formatVerifiedEmergencyContact(data) : formatEmergencyContact(data)}</span>
        </div>
        <ActionButton icon={Phone} variant="emergency" href={`tel:${data.emergencyPhoneDial}`}>
          一键拨打
        </ActionButton>
      </section>

      <section className="sl-panel sl-medical-panel">
        <div className="sl-mini-heading">
          <h3>医疗信息</h3>
          <span className="sl-mini-heading-icon">
            <PlusSquare size={16} />
          </span>
        </div>
        <div className="sl-medical-list">
          <div>ABO 血型： {data.aboType}型</div>
          <div>Rh 血型： {data.rhType}</div>
          <div>过敏史摘要： {data.allergySummary}</div>
        </div>
      </section>

      <ActionButton variant="primary" onClick={handleViewArchive}>
        查看健康档案
      </ActionButton>

      <AppAttribution />
      <BottomTabBar />

      {showConsentDialog ? (
        <div className="sl-consent-overlay" role="dialog" aria-modal="true" aria-labelledby="sl-consent-title">
          <div className="sl-consent-dialog">
            <h3 id="sl-consent-title">查看详细信息前请先完成登记</h3>
            <p>为保护老人隐私，查看健康档案、主要用药和量表记录前，需要先完成验证或登记身份信息。</p>
            <p>继续操作后，系统将记录您的验证方式、登记姓名、手机号、身份证信息与来源 IP，用于访问审计与安全留痕。</p>
            <p className="sl-consent-emphasis">点击“继续查看”即视为您已知晓并同意上述信息登记与审计记录。</p>
            <div className="sl-consent-actions">
              <button type="button" className="sl-consent-btn secondary" onClick={() => setShowConsentDialog(false)}>
                暂不查看
              </button>
              <button type="button" className="sl-consent-btn primary" onClick={handleContinueVerify}>
                继续查看
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
