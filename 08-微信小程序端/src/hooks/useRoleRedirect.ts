import { useEffect, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import { getAuthSession } from '@/store/auth/authStore';
import { shouldRedirectToLogin } from '@/store/auth/authSelectors';

export interface RoleRedirectState {
  loading: boolean;
  targetLabel: string;
}

export function useRoleRedirect(): RoleRedirectState {
  const [state, setState] = useState<RoleRedirectState>({
    loading: true,
    targetLabel: '正在识别账号角色',
  });

  const redirect = () => {
    const session = getAuthSession();

    if (shouldRedirectToLogin(session)) {
      setState({
        loading: true,
        targetLabel: '未检测到有效登录态，正在返回登录页',
      });
      void Taro.redirectTo({ url: APP_ROUTES.login });
      return;
    }

    setState({
      loading: true,
      targetLabel: session?.role === 'VOLUNTEER' ? '正在进入志愿者工作台' : '正在进入家属工作台',
    });
    void Taro.redirectTo({ url: APP_ROUTES.workbenchElderList });
  };

  useEffect(() => {
    redirect();
  }, []);

  useDidShow(() => {
    redirect();
  });

  return state;
}
