import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRoundCheck } from 'lucide-react';
import { familyLogin } from '../api/familyAuthApi';
import { useI18n } from '../../i18n';

export default function FamilyLoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!phone.trim() || !password) {
      setError(t('errors.completeFamilyFields'));
      return;
    }
    setLoading(true);
    try {
      const result = await familyLogin({ phone, password });
      if (result.success) {
        navigate('/', { replace: true });
      } else {
        setError(result.message || t('errors.loginRetry'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ paddingTop: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--sl-chip-bg)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <UserRoundCheck size={32} color="var(--sl-primary)" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--sl-text)' }}>{t('auth.familyLogin')}</h1>
        <p className="text-secondary mt-8">{t('auth.familyLoginHint')}</p>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">{t('common.phone')}</label>
          <input
            className="form-input sl-ltr-data"
            placeholder={t('errors.phoneRequired')}
            type="tel"
            dir="ltr"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('common.password')}</label>
          <input
            className="form-input sl-ltr-data"
            placeholder={t('auth.inputPassword')}
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--sl-danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        <button
          className="btn btn-primary btn-block"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? t('auth.loggingIn') : t('auth.login')}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate('/register')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--sl-primary)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('auth.registerFamilyAccount')}
          </button>
          <span style={{ color: 'var(--sl-text-secondary)', fontSize: 13 }}>
            {t('auth.forgetPasswordHint')}
          </span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--sl-text-secondary)', fontSize: 13, lineHeight: 1.7 }}>
        {t('auth.familyRegistrationHint')}
        <br />
        {t('auth.familyBindingHint')}
      </div>
    </div>
  );
}
