import { useState } from 'react';
import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import { loginWorkbenchAccount } from '@/services/workbench/authService';
import { updateAppSession } from '@/store/app/appSessionStore';
import { getAuthSession, saveAuthSession } from '@/store/auth/authStore';

import './login.scss';

export default function LoginPage() {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');

  useDidShow(() => {
    const session = getAuthSession();
    if (session) {
      void Taro.redirectTo({ url: APP_ROUTES.authRoleRedirect });
    }
  });

  async function handleSubmit() {
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

  return (
    <View className='sl-page auth-login-page'>
      <View className='auth-login-shell'>
        <View className='auth-login-shell__inner'>
          <View className='auth-login-content'>
            <View className='auth-login-hero'>
              <View className='auth-login-brand'>
                <View className='auth-login-icon'>SL</View>
                <View className='auth-login-brand__title'>智联名牌</View>
                <Text className='auth-login-brand__subtitle'>用心守护 温暖相伴</Text>
              </View>
            </View>

            <View className='auth-login-panel'>
              <View className='auth-login-panel__title'>统一登录</View>

              {errorText ? <View className='auth-login-error'>{errorText}</View> : null}

              <View className='auth-login-form'>
                <View className='auth-login-field'>
                  <Text className='auth-login-field__label'>账号 / 手机号</Text>
                  <View className='auth-login-field__input-wrap'>
                    <Text className='auth-login-field__icon'>账</Text>
                    <Input
                      className='auth-login-field__input'
                      value={account}
                      placeholder='请输入账号或手机号'
                      type='text'
                      maxlength={40}
                      onInput={(event) => setAccount(event.detail.value)}
                    />
                  </View>
                </View>

                <View className='auth-login-field'>
                  <Text className='auth-login-field__label'>密码</Text>
                  <View className='auth-login-field__input-wrap'>
                    <Text className='auth-login-field__icon'>密</Text>
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

                <Button className='sl-primary-button auth-login-submit' loading={submitting} onClick={handleSubmit}>
                  登录
                </Button>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
