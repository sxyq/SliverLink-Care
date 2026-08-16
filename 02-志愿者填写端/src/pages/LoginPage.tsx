import React, { useState } from 'react';
import { KeyRound, LockKeyhole, Phone, User, UserRoundCheck } from 'lucide-react';
import { loginVolunteer, previewVolunteerInvitation, registerVolunteer } from '../api/volunteerApi';
import { useAuth } from '../app/AuthProvider';
import type { InvitationPreview } from '../family-entry/types';
import { useI18n } from '../i18n';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    invitationCode: '',
    name: '',
    account: '',
    phone: '',
    password: '',
  });
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [inviteChecking, setInviteChecking] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      const res = await loginVolunteer(account, password);
      if (res.ok) {
        login(res.token, {
          account: account.trim(),
          name: res.name?.trim() || account.trim(),
        });
      } else {
        setError(t('errors.loginFailed'));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setError(message || t('errors.loginRetry'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckInvitation() {
    const code = registerForm.invitationCode.trim().toUpperCase();
    if (!code) {
      setError(t('errors.invitationRequired'));
      setInvitation(null);
      return;
    }
    setError('');
    setInviteChecking(true);
    try {
      const result = await previewVolunteerInvitation(code);
      setInvitation(result);
      setRegisterForm((prev) => ({ ...prev, invitationCode: code }));
    } catch (inviteError) {
      setInvitation(null);
      setError(inviteError instanceof Error ? inviteError.message : t('errors.invitationCheckFailed'));
    } finally {
      setInviteChecking(false);
    }
  }

  async function handleRegister() {
    const invitationCode = registerForm.invitationCode.trim().toUpperCase();
    const name = registerForm.name.trim();
    const nextAccount = registerForm.account.trim();
    const nextPassword = registerForm.password.trim();

    if (!invitationCode) {
      setError(t('errors.invitationRequired'));
      return;
    }
    if (!name || !nextAccount || !nextPassword) {
      setError(t('errors.completeVolunteerFields'));
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await registerVolunteer({
        invitationCode,
        name,
        account: nextAccount,
        phone: registerForm.phone.trim(),
        password: nextPassword,
      });
      if (res.ok) {
        login(res.token, {
          account: nextAccount,
          name: res.name?.trim() || name,
        });
      } else {
        setError(t('errors.registerRetry'));
      }
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : t('errors.registerRetry'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sl-login-page">
      <section className="sl-login-shell">
        <div className="sl-login-content">
          <div className="sl-login-hero">
            <div className="sl-login-brand">
              <div className="sl-login-icon">
                <UserRoundCheck size={48} />
              </div>
              <h1>{t('common.appName')}</h1>
              <p>{t('common.brandSubtitle')}</p>
            </div>
          </div>

          <section className="sl-login-panel">
            <div className="sl-login-mode-tabs" role="tablist" aria-label={t('auth.loginOrRegister')}>
              <button
                type="button"
                className={mode === 'login' ? 'is-active' : ''}
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
              >
                {t('auth.volunteerLogin')}
              </button>
              <button
                type="button"
                className={mode === 'register' ? 'is-active' : ''}
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
              >
                {t('auth.invitationRegister')}
              </button>
            </div>
            <div className="sl-login-fields">
              {mode === 'login' ? (
                <>
                  <h2 className="sl-login-title">{t('auth.volunteerLogin')}</h2>
                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.account')}</span>
                    <div className="sl-input-wrap">
                      <User size={18} className="sl-login-input-icon" />
                      <input
                        className="sl-input sl-login-input sl-ltr-data"
                        dir="ltr"
                        placeholder={t('auth.inputAccount')}
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                      />
                    </div>
                  </label>

                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.password')}</span>
                    <div className="sl-input-wrap">
                      <LockKeyhole size={18} className="sl-login-input-icon" />
                      <input
                        className="sl-input sl-login-input sl-ltr-data"
                        type="password"
                        dir="ltr"
                        placeholder={t('auth.inputPassword')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </label>
                </>
              ) : (
                <>
                  <h2 className="sl-login-title">{t('auth.inputInvitationRegister')}</h2>
                  <p className="sl-login-hint">{t('auth.adminInvitationHint')}</p>

                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.invitationCode')}</span>
                    <div className="sl-input-wrap">
                      <KeyRound size={18} className="sl-login-input-icon" />
                      <input
                        className="sl-input sl-login-input sl-ltr-data"
                        dir="ltr"
                        placeholder={t('errors.invitationRequired')}
                        value={registerForm.invitationCode}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, invitationCode: e.target.value }))}
                      />
                    </div>
                  </label>

                  <button className="sl-btn sl-btn-secondary" type="button" onClick={handleCheckInvitation} disabled={inviteChecking}>
                    {inviteChecking ? t('auth.checkingInvitation') : t('common.verifyInvitation')}
                  </button>

                  {invitation ? (
                    <div className="sl-login-preview">
                      <strong>{t('auth.invitationAvailableForVolunteer')}</strong>
                      <span>{t('common.relatedElder')}：<span className="sl-auto-data" dir="auto">{invitation.elderName}</span>，{t('common.yearsOld', { age: invitation.elderAge })}</span>
                      <span>{t('common.archiveNumber')}：<span className="sl-ltr-data">{invitation.elderArchiveNo}</span></span>
                      <span>{t('common.validUntil')}：<span className="sl-ltr-data">{invitation.expiresAt}</span></span>
                    </div>
                  ) : null}

                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.name')}</span>
                    <div className="sl-input-wrap">
                      <User size={18} className="sl-login-input-icon" />
                      <input
                        className="sl-input sl-login-input sl-auto-data"
                        dir="auto"
                        placeholder={t('auth.inputName')}
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                  </label>

                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.account')}</span>
                    <div className="sl-input-wrap">
                      <User size={18} className="sl-login-input-icon" />
                      <input
                        className="sl-input sl-login-input sl-ltr-data"
                        dir="ltr"
                        placeholder={t('auth.setLoginAccount')}
                        value={registerForm.account}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, account: e.target.value }))}
                      />
                    </div>
                  </label>

                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.phone')}</span>
                    <div className="sl-input-wrap">
                      <Phone size={18} className="sl-login-input-icon" />
                      <input
                        className="sl-input sl-login-input sl-ltr-data"
                        type="tel"
                        inputMode="numeric"
                        dir="ltr"
                        placeholder={t('auth.optionalForContact')}
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </label>

                  <label className="sl-label">
                    <span className="sl-label-text">{t('common.password')}</span>
                    <div className="sl-input-wrap">
                      <LockKeyhole size={18} className="sl-login-input-icon" />
                      <input
                        className="sl-input sl-login-input sl-ltr-data"
                        type="password"
                        dir="ltr"
                        placeholder={t('auth.setLoginPassword')}
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                  </label>
                </>
              )}

              {error ? <p className="sl-login-error">{error}</p> : null}

              <button className="sl-btn sl-btn-primary" onClick={mode === 'login' ? handleLogin : handleRegister} disabled={loading}>
                {loading ? (mode === 'login' ? t('auth.loggingIn') : t('auth.registerLoading')) : (mode === 'login' ? t('auth.login') : t('auth.registerAndEnter'))}
              </button>
            </div>
          </section>

          <div className="sl-attribution">{t('common.attribution')}</div>
        </div>
      </section>
    </div>
  );
};
