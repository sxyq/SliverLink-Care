import { useEffect, useState } from 'react';
import { Button, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import { useScanEntry } from '@/hooks/useScanEntry';
import {
  loginWorkbenchAccount,
  previewVolunteerInvitation,
  registerVolunteerAccount,
  type VolunteerInvitationPreview,
} from '@/services/workbench/authService';
import { updateAppSession } from '@/store/app/appSessionStore';
import { getAuthSession, saveAuthSession } from '@/store/auth/authStore';
import { useI18n } from '@/i18n';
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
  const [errorText, setErrorText] = useState('');
  const openScan = useScanEntry();

  function handleScanEntry() {
    void openScan();
  }

  async function handleLoginSubmit() {
    if (submitting) {
      return;
    }

    if (!account.trim() || !password.trim()) {
      setErrorText(t('errors.completeLoginFields'));
      return;
    }

    try {
      setSubmitting(true);
      setErrorText('');
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
      setErrorText((error as Error)?.message || t('errors.loginRetry'));
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
      setErrorText(t('errors.invitationRequired'));
      return;
    }

    try {
      setCheckingInvitation(true);
      setErrorText('');
      const result = await previewVolunteerInvitation(code);
      setInvitation(result);
      setRegisterForm((current) => ({ ...current, invitationCode: code }));
    } catch (error) {
      setInvitation(null);
      setErrorText((error as Error)?.message || t('errors.invitationCheckFailed'));
    } finally {
      setCheckingInvitation(false);
    }
  }

  async function handleRegisterSubmit() {
    if (submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setErrorText('');
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
      setErrorText((error as Error)?.message || t('errors.registerRetry'));
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
                    setErrorText('');
                  }}
                >
                  {t('auth.volunteerLogin')}
                </View>
                <View
                  className={`auth-login-mode-tabs__item ${mode === 'register' ? 'is-active' : ''}`}
                  onClick={() => {
                    setMode('register');
                    setErrorText('');
                  }}
                >
                  {t('auth.invitationRegister')}
                </View>
              </View>

              <View className='auth-login-panel__title'>
                {mode === 'login' ? t('auth.volunteerLogin') : t('auth.inputInvitationRegister')}
              </View>

              <View className='auth-login-form'>
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

                    <Button className='sl-primary-button auth-login-submit' loading={submitting} onClick={handleRegisterSubmit}>
                      {t('auth.registerAndEnter')}
                    </Button>
                  </>
                )}
              </View>
            </View>

            <View className='auth-login-footer'>
              <Text className='auth-login-footer__line'>{t('common.footer')}</Text>
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
    <I18nPageShell navigationTitleKey='common.brandTitle'>
      <LoginPage />
    </I18nPageShell>
  );
}
