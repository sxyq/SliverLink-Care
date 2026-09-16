import { useEffect, useState } from 'react';
import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import { AGREEMENT_VERSION } from '@/content/agreements';
import { AgreementConsentRow } from '@/components/feedback/AgreementConsentRow';
import { useLocalizedError } from '@/hooks/useLocalizedError';
import { useScanEntry } from '@/hooks/useScanEntry';
import {
  loginWorkbenchAccount,
  previewVolunteerInvitation,
  registerVolunteerAccount,
  type VolunteerInvitationPreview,
} from '@/services/workbench/authService';
import { updateAppSession } from '@/store/app/appSessionStore';
import { getAuthSession, saveAuthSession } from '@/store/auth/authStore';
import { getAppSession } from '@/store/app/appSessionStore';
import { useI18n } from '@/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { I18nPageShell } from '@/components/layout/I18nPageShell';

import './login.scss';

interface AuthLoginShellProps {
  showScanEntry?: boolean;
}

export function AuthLoginShell({ showScanEntry = true }: AuthLoginShellProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [registerForm, setRegisterForm] = useState({
    invitationCode: '',
    name: '',
    account: '',
    phone: '',
    password: '',
  });
  const [invitation, setInvitation] = useState<VolunteerInvitationPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingInvitation, setCheckingInvitation] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementViewed, setAgreementViewed] = useState(() => {
    const session = getAppSession();
    return Boolean(session.agreementViewed || session.privacyAccepted);
  });
  const { clearError, errorText, setError, setErrorKey } = useLocalizedError(t);
  const openScan = useScanEntry();

  useDidShow(() => {
    const session = getAppSession();
    if (session.agreementViewed || session.privacyAccepted) {
      setAgreementViewed(true);
    }
  });

  function handleScanEntry() {
    void openScan();
  }

  function ensureAgreementAccepted() {
    if (!agreementAccepted) {
      setErrorKey('agreement.required');
      return false;
    }

    const session = getAppSession();
    if (!agreementViewed && !session.agreementViewed && !session.privacyAccepted) {
      setErrorKey('agreement.viewRequired');
      return false;
    }

    void updateAppSession({
      privacyAccepted: true,
      privacyAcceptedAt: Date.now(),
      privacyPolicyVersion: AGREEMENT_VERSION,
    });
    return true;
  }

  function handleOpenAgreement() {
    setAgreementViewed(true);
    updateAppSession({
      agreementViewed: true,
      agreementViewedAt: Date.now(),
    });
    void Taro.navigateTo({ url: APP_ROUTES.agreement });
  }

  async function handleLoginSubmit() {
    if (submitting) {
      return;
    }

    if (!account.trim() || !password.trim()) {
      setErrorKey('errors.completeLoginFields');
      return;
    }

    if (!ensureAgreementAccepted()) {
      return;
    }

    try {
      setSubmitting(true);
      clearError();
      const result = await loginWorkbenchAccount({
        role: undefined,
        account,
        password,
      });

      saveAuthSession({
        token: result.token,
        role: result.role,
        accountId: result.accountId,
        displayName: result.displayName,
        cookieBacked: result.cookieBacked,
        loggedInAt: Date.now(),
      });
      updateAppSession({
        homeEntrySource: 'workbench',
        lastWorkbenchOpenedAt: Date.now(),
      });

      await Taro.redirectTo({ url: APP_ROUTES.authRoleRedirect });
    } catch (error) {
      setError(error, 'errors.loginRetry');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckInvitation() {
    const code = registerForm.invitationCode.trim().toUpperCase();

    if (checkingInvitation) {
      return;
    }

    if (!code) {
      setInvitation(null);
      setErrorKey('errors.invitationRequired');
      return;
    }

    try {
      setCheckingInvitation(true);
      clearError();
      const result = await previewVolunteerInvitation(code);
      setInvitation(result);
      setRegisterForm((current) => ({ ...current, invitationCode: code }));
    } catch (error) {
      setInvitation(null);
      setError(error, 'errors.invitationCheckFailed');
    } finally {
      setCheckingInvitation(false);
    }
  }

  async function handleRegisterSubmit() {
    if (submitting) {
      return;
    }

    if (!ensureAgreementAccepted()) {
      return;
    }

    try {
      setSubmitting(true);
      clearError();
      const result = await registerVolunteerAccount(registerForm);

      saveAuthSession({
        token: result.token,
        role: result.role,
        accountId: result.accountId,
        displayName: result.displayName,
        cookieBacked: result.cookieBacked,
        loggedInAt: Date.now(),
      });
      updateAppSession({
        homeEntrySource: 'workbench',
        lastWorkbenchOpenedAt: Date.now(),
      });

      await Taro.redirectTo({ url: APP_ROUTES.authRoleRedirect });
    } catch (error) {
      setError(error, 'errors.registerRetry');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className='sl-page auth-login-page'>
      <View className='auth-login-shell'>
        <View className='auth-login-shell__inner'>
          <View className='auth-login-content'>
            <View className='auth-login-hero'>
              {showScanEntry ? (
                <View className='auth-login-scan-entry' onClick={handleScanEntry}>
                  <View className='auth-login-scan-entry__pulse' />
                  <View className='auth-login-scan-entry__badge'>
                    <View className='auth-login-scan-entry__qr'>
                      <View className='auth-login-scan-entry__qr-corner auth-login-scan-entry__qr-corner--lt' />
                      <View className='auth-login-scan-entry__qr-corner auth-login-scan-entry__qr-corner--rt' />
                      <View className='auth-login-scan-entry__qr-corner auth-login-scan-entry__qr-corner--lb' />
                      <View className='auth-login-scan-entry__qr-corner auth-login-scan-entry__qr-corner--rb' />
                      <View className='auth-login-scan-entry__qr-dot auth-login-scan-entry__qr-dot--a' />
                      <View className='auth-login-scan-entry__qr-dot auth-login-scan-entry__qr-dot--b' />
                      <View className='auth-login-scan-entry__qr-dot auth-login-scan-entry__qr-dot--c' />
                    </View>
                  </View>
                  <View className='auth-login-scan-entry__label'>
                    <Text>{t('auth.scanView')}</Text>
                    <Text>{t('auth.scanElderInfo')}</Text>
                  </View>
                </View>
              ) : null}
              <View className='auth-login-brand'>
                <View className='auth-login-icon'>SL</View>
                <View className='auth-login-brand__title'>{t('common.brandTitle')}</View>
                <Text className='auth-login-brand__subtitle'>{t('common.brandSubtitle')}</Text>
              </View>
            </View>

            <View className='auth-login-panel'>
              <View className='auth-login-mode-tabs'>
                <View
                  className={`auth-login-mode-tabs__item ${mode === 'login' ? 'is-active' : ''}`}
                  onClick={() => {
                    setMode('login');
                    clearError();
                  }}
                >
                  {t('auth.volunteerLogin')}
                </View>
                <View
                  className={`auth-login-mode-tabs__item ${mode === 'register' ? 'is-active' : ''}`}
                  onClick={() => {
                    setMode('register');
                    clearError();
                  }}
                >
                  {t('auth.invitationRegister')}
                </View>
              </View>

              <View className='auth-login-panel__title'>
                {mode === 'login' ? t('auth.volunteerLogin') : t('auth.inputInvitationRegister')}
              </View>

              <View className='auth-login-form'>
                <View className='auth-login-language-switcher'>
                  <LanguageSwitcher />
                </View>
                {mode === 'login' ? (
                  <>
                    <View className='auth-login-field'>
                      <Text className='auth-login-field__label'>{t('common.account')}</Text>
                      <View className='auth-login-field__input-wrap'>
                        <Input
                          className='auth-login-field__input sl-ltr-data'
                          value={account}
                          placeholder={t('auth.inputAccount')}
                          type='text'
                          maxlength={40}
                          onInput={(event) => setAccount(event.detail.value)}
                        />
                      </View>
                    </View>

                    <View className='auth-login-field'>
                      <Text className='auth-login-field__label'>{t('common.password')}</Text>
                      <View className='auth-login-field__input-wrap'>
                        <Input
                          className='auth-login-field__input sl-ltr-data'
                          value={password}
                          password
                          maxlength={64}
                          placeholder={t('auth.inputLoginPassword')}
                          onInput={(event) => setPassword(event.detail.value)}
                        />
                      </View>
                    </View>

                    {errorText ? <View className='auth-login-error'>{errorText}</View> : null}

                    <AgreementConsentRow
                      checked={agreementAccepted}
                      onToggle={setAgreementAccepted}
                      onOpenAgreement={handleOpenAgreement}
                    />

                    <Button className='sl-primary-button auth-login-submit' loading={submitting} onClick={handleLoginSubmit}>
                      {t('auth.login')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Text className='auth-login-hint'>{t('auth.adminInvitationHint')}</Text>

                    <View className='auth-login-field'>
                      <Text className='auth-login-field__label'>{t('common.invitationCode')}</Text>
                      <View className='auth-login-field__input-wrap'>
                        <Input
                          className='auth-login-field__input sl-ltr-data'
                          value={registerForm.invitationCode}
                          placeholder={t('errors.invitationRequired')}
                          type='text'
                          maxlength={40}
                          onInput={(event) =>
                            setRegisterForm((current) => ({ ...current, invitationCode: event.detail.value }))
                          }
                        />
                      </View>
                    </View>

                    <Button className='auth-login-secondary-button' loading={checkingInvitation} onClick={handleCheckInvitation}>
                      {checkingInvitation ? t('auth.checkingInvitation') : t('common.verifyInvitation')}
                    </Button>

                    {invitation ? (
                      <View className='auth-login-preview'>
                        <Text className='auth-login-preview__title'>{t('auth.invitationAvailableForVolunteer')}</Text>
                        <Text className='auth-login-preview__line'>{t('common.relatedElder')}：<Text className='sl-auto-data' {...{ dir: 'auto' }}>{invitation.elderName}</Text>，<Text className='sl-auto-data' {...{ dir: 'auto' }}>{t('common.yearsOld', { age: invitation.elderAge })}</Text></Text>
                        <Text className='auth-login-preview__line'>{t('common.archiveNumber')}：<Text className='sl-ltr-data'>{invitation.elderArchiveNo}</Text></Text>
                        <Text className='auth-login-preview__line'>{t('common.validUntil')}：<Text className='sl-ltr-data'>{invitation.expiresAt}</Text></Text>
                      </View>
                    ) : null}

                    <View className='auth-login-field'>
                      <Text className='auth-login-field__label'>{t('common.name')}</Text>
                      <View className='auth-login-field__input-wrap'>
                        <Input
                          className='auth-login-field__input sl-auto-data'
                          value={registerForm.name}
                          placeholder={t('auth.inputName')}
                          type='text'
                          maxlength={30}
                          {...{ dir: 'auto' }}
                          onInput={(event) => setRegisterForm((current) => ({ ...current, name: event.detail.value }))}
                        />
                      </View>
                    </View>

                    <View className='auth-login-field'>
                      <Text className='auth-login-field__label'>{t('common.account')}</Text>
                      <View className='auth-login-field__input-wrap'>
                        <Input
                          className='auth-login-field__input sl-ltr-data'
                          value={registerForm.account}
                          placeholder={t('auth.setLoginAccount')}
                          type='text'
                          maxlength={40}
                          onInput={(event) => setRegisterForm((current) => ({ ...current, account: event.detail.value }))}
                        />
                      </View>
                    </View>

                    <View className='auth-login-field'>
                      <Text className='auth-login-field__label'>{t('common.phone')}</Text>
                      <View className='auth-login-field__input-wrap'>
                        <Input
                          className='auth-login-field__input sl-ltr-data'
                          value={registerForm.phone}
                          placeholder={t('auth.optionalForContact')}
                          type='number'
                          maxlength={20}
                          onInput={(event) => setRegisterForm((current) => ({ ...current, phone: event.detail.value }))}
                        />
                      </View>
                    </View>

                    <View className='auth-login-field'>
                      <Text className='auth-login-field__label'>{t('common.password')}</Text>
                      <View className='auth-login-field__input-wrap'>
                        <Input
                          className='auth-login-field__input sl-ltr-data'
                          value={registerForm.password}
                          password
                          maxlength={64}
                          placeholder={t('auth.setLoginPassword')}
                          onInput={(event) => setRegisterForm((current) => ({ ...current, password: event.detail.value }))}
                        />
                      </View>
                    </View>

                    {errorText ? <View className='auth-login-error'>{errorText}</View> : null}

                    <AgreementConsentRow
                      checked={agreementAccepted}
                      onToggle={setAgreementAccepted}
                      onOpenAgreement={handleOpenAgreement}
                    />

                    <Button className='sl-primary-button auth-login-submit' loading={submitting} onClick={handleRegisterSubmit}>
                      {t('auth.registerAndEnter')}
                    </Button>
                  </>
                )}
              </View>
            </View>

          </View>
        </View>
      </View>
    </View>
  );
}

function LoginPage() {
  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      void Taro.redirectTo({ url: APP_ROUTES.authRoleRedirect });
    }
  }, []);

  return <AuthLoginShell />;
}

export default function LoginPageEntry() {
  return (
    <I18nPageShell navigationTitleKey='common.brandTitle' showLanguageSwitcher={false}>
      <LoginPage />
    </I18nPageShell>
  );
}
