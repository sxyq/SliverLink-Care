import { useState } from 'react';
import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

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

import './login.scss';

interface AuthLoginShellProps {
  showScanEntry?: boolean;
}

export function AuthLoginShell({ showScanEntry = true }: AuthLoginShellProps) {
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
      setErrorText('请输入完整的账号与密码');
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
      setErrorText((error as Error)?.message || '登录失败，请稍后重试');
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
      setErrorText('请输入邀请码');
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
      setErrorText((error as Error)?.message || '邀请码校验失败');
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
      setErrorText((error as Error)?.message || '注册失败，请稍后重试');
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
                    <Text>扫码查看</Text>
                    <Text>老人信息</Text>
                  </View>
                </View>
              ) : null}
              <View className='auth-login-brand'>
                <View className='auth-login-icon'>SL</View>
                <View className='auth-login-brand__title'>智联名牌</View>
                <Text className='auth-login-brand__subtitle'>用心守护 温暖相伴</Text>
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
                  志愿者登录
                </View>
                <View
                  className={`auth-login-mode-tabs__item ${mode === 'register' ? 'is-active' : ''}`}
                  onClick={() => {
                    setMode('register');
                    setErrorText('');
                  }}
                >
                  邀请码注册
                </View>
              </View>

              <View className='auth-login-panel__title'>
                {mode === 'login' ? '志愿者登录' : '输入邀请码注册'}
              </View>

              <View className='auth-login-form'>
                {mode === 'login' ? (
                  <>
                    <View className='auth-login-field'>
                      <Text className='auth-login-field__label'>账号</Text>
                      <View className='auth-login-field__input-wrap'>
                        <Input
                          className='auth-login-field__input'
                          value={account}
                          placeholder='请输入账号'
                          type='text'
                          maxlength={40}
                          onInput={(event) => setAccount(event.detail.value)}
                        />
                      </View>
                    </View>

                    <View className='auth-login-field'>
                      <Text className='auth-login-field__label'>密码</Text>
                      <View className='auth-login-field__input-wrap'>
                        <Input
                          className='auth-login-field__input'
                          value={password}
                          password
                          maxlength={64}
                          placeholder='请输入登录密码'
                          onInput={(event) => setPassword(event.detail.value)}
                        />
                      </View>
                    </View>

                    {errorText ? <View className='auth-login-error'>{errorText}</View> : null}

                    <Button className='sl-primary-button auth-login-submit' loading={submitting} onClick={handleLoginSubmit}>
                      登录
                    </Button>
                  </>
                ) : (
                  <>
                    <Text className='auth-login-hint'>请输入管理员发放的邀请码，注册后会自动关联到对应老人档案。</Text>

                    <View className='auth-login-field'>
                      <Text className='auth-login-field__label'>邀请码</Text>
                      <View className='auth-login-field__input-wrap'>
                        <Input
                          className='auth-login-field__input'
                          value={registerForm.invitationCode}
                          placeholder='请输入邀请码'
                          type='text'
                          maxlength={40}
                          onInput={(event) =>
                            setRegisterForm((current) => ({ ...current, invitationCode: event.detail.value }))
                          }
                        />
                      </View>
                    </View>

                    <Button className='auth-login-secondary-button' loading={checkingInvitation} onClick={handleCheckInvitation}>
                      {checkingInvitation ? '校验中...' : '验证邀请码'}
                    </Button>

                    {invitation ? (
                      <View className='auth-login-preview'>
                        <Text className='auth-login-preview__title'>邀请码可用</Text>
                        <Text className='auth-login-preview__line'>关联老人：{invitation.elderName}，{invitation.elderAge} 岁</Text>
                        <Text className='auth-login-preview__line'>档案编号：{invitation.elderArchiveNo}</Text>
                        <Text className='auth-login-preview__line'>有效期至：{invitation.expiresAt}</Text>
                      </View>
                    ) : null}

                    <View className='auth-login-field'>
                      <Text className='auth-login-field__label'>姓名</Text>
                      <View className='auth-login-field__input-wrap'>
                        <Input
                          className='auth-login-field__input'
                          value={registerForm.name}
                          placeholder='请输入姓名'
                          type='text'
                          maxlength={30}
                          onInput={(event) => setRegisterForm((current) => ({ ...current, name: event.detail.value }))}
                        />
                      </View>
                    </View>

                    <View className='auth-login-field'>
                      <Text className='auth-login-field__label'>账号</Text>
                      <View className='auth-login-field__input-wrap'>
                        <Input
                          className='auth-login-field__input'
                          value={registerForm.account}
                          placeholder='请设置登录账号'
                          type='text'
                          maxlength={40}
                          onInput={(event) => setRegisterForm((current) => ({ ...current, account: event.detail.value }))}
                        />
                      </View>
                    </View>

                    <View className='auth-login-field'>
                      <Text className='auth-login-field__label'>手机号</Text>
                      <View className='auth-login-field__input-wrap'>
                        <Input
                          className='auth-login-field__input'
                          value={registerForm.phone}
                          placeholder='选填，用于后续联系'
                          type='number'
                          maxlength={20}
                          onInput={(event) => setRegisterForm((current) => ({ ...current, phone: event.detail.value }))}
                        />
                      </View>
                    </View>

                    <View className='auth-login-field'>
                      <Text className='auth-login-field__label'>密码</Text>
                      <View className='auth-login-field__input-wrap'>
                        <Input
                          className='auth-login-field__input'
                          value={registerForm.password}
                          password
                          maxlength={64}
                          placeholder='请设置登录密码'
                          onInput={(event) => setRegisterForm((current) => ({ ...current, password: event.detail.value }))}
                        />
                      </View>
                    </View>

                    {errorText ? <View className='auth-login-error'>{errorText}</View> : null}

                    <Button className='sl-primary-button auth-login-submit' loading={submitting} onClick={handleRegisterSubmit}>
                      注册并进入
                    </Button>
                  </>
                )}
              </View>
            </View>

            <View className='auth-login-footer'>
              <Text className='auth-login-footer__line'>重庆医科大学护理学院 银龄守护团队</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function LoginPage() {
  useDidShow(() => {
    const session = getAuthSession();
    if (session) {
      void Taro.redirectTo({ url: APP_ROUTES.authRoleRedirect });
    }
  });

  return <AuthLoginShell />;
}
