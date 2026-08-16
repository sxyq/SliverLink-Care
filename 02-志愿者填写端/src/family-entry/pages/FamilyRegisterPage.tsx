import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { useI18n } from '../../i18n';

const RELATIONSHIPS = ['配偶', '子女', '兄弟姐妹', '其他'];

export default function FamilyRegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const presetCode = (location.state as { code?: string } | null)?.code || '';

  const [inviteCode, setInviteCode] = useState(presetCode);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!inviteCode.trim()) newErrors['inviteCode'] = t('errors.invitationRequired');
    if (!name.trim()) newErrors['name'] = t('errors.nameRequired');
    if (!phone.trim()) {
      newErrors['phone'] = t('errors.phoneRequired');
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
      newErrors['phone'] = t('errors.phoneInvalid');
    }
    if (!relationship) newErrors['relationship'] = t('errors.relationshipRequired');
    if (!password) {
      newErrors['password'] = t('errors.passwordRequired');
    } else if (password.length < 6) {
      newErrors['password'] = t('errors.passwordMin');
    }
    if (password !== confirmPassword) {
      newErrors['confirmPassword'] = t('errors.passwordMismatch');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    navigate('/verify', { state: { code: inviteCode.trim(), name, phone, relationship, password } });
  };

  return (
    <div>
      <TopBar title={t('auth.familyRegister')} />
      <div className="page-container">
        <div className="card">
          <div className="form-group">
            <label className="form-label">{t('common.invitationCode')}</label>
            <input
              className={`form-input sl-ltr-data${errors['inviteCode'] ? ' error' : ''}`}
              dir="ltr"
              placeholder={t('family.inputBackendInvitation')}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            {errors['inviteCode'] && <div className="form-error">{errors['inviteCode']}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">{t('common.name')}</label>
            <input
              className={`form-input sl-auto-data${errors['name'] ? ' error' : ''}`}
              dir="auto"
              placeholder={t('family.inputName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors['name'] && <div className="form-error">{errors['name']}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">{t('common.phone')}</label>
            <input
              className={`form-input sl-ltr-data${errors['phone'] ? ' error' : ''}`}
              placeholder={t('errors.phoneRequired')}
              type="tel"
              inputMode="numeric"
              dir="ltr"
              maxLength={11}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {errors['phone'] && <div className="form-error">{errors['phone']}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">{t('common.relationship')}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {RELATIONSHIPS.map((rel) => (
                <span
                  key={rel}
                  className={`chip${relationship === rel ? ' active' : ''}`}
                  onClick={() => setRelationship(rel)}
                >
                  {rel === '配偶' ? t('family.spouse') : rel === '子女' ? t('family.child') : rel === '兄弟姐妹' ? t('family.siblings') : t('family.other')}
                </span>
              ))}
            </div>
            {errors['relationship'] && <div className="form-error">{errors['relationship']}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">{t('common.password')}</label>
            <input
              className={`form-input sl-ltr-data${errors['password'] ? ' error' : ''}`}
              placeholder={t('family.passwordRegisterHint')}
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors['password'] && <div className="form-error">{errors['password']}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.confirmPassword')}</label>
            <input
              className={`form-input sl-ltr-data${errors['confirmPassword'] ? ' error' : ''}`}
              placeholder={t('family.confirmPasswordPlaceholder')}
              type="password"
              dir="ltr"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {errors['confirmPassword'] && <div className="form-error">{errors['confirmPassword']}</div>}
          </div>
        </div>

        <div className="info-banner mt-16">
          {t('auth.noInvitationHint')}
        </div>

        <button className="btn btn-primary btn-block mt-16" onClick={handleSubmit}>
          {t('common.nextSmsVerify')}
        </button>
      </div>
    </div>
  );
}
