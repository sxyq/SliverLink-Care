import { useEffect, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';

import { APP_ROUTES } from '@/app/app.constants';
import { getAuthSession } from '@/store/auth/authStore';
import { shouldRedirectToLogin } from '@/store/auth/authSelectors';
import { useI18n } from '@/i18n';

export interface RoleRedirectState {
  loading: boolean;
  targetLabel: string;
}

export function useRoleRedirect(): RoleRedirectState {
  const { t } = useI18n();
  const [state, setState] = useState<RoleRedirectState>({
    loading: true,
    targetLabel: t('common.roleRecognizing'),
  });

  const redirect = () => {
    const session = getAuthSession();

    if (shouldRedirectToLogin(session)) {
      setState({
        loading: true,
        targetLabel: t('common.roleReturningLogin'),
      });
      void Taro.redirectTo({ url: APP_ROUTES.login });
      return;
    }

    setState({
      loading: true,
      targetLabel: session?.role === 'VOLUNTEER' ? t('common.enterVolunteerWorkbench') : t('common.enterFamilyWorkbench'),
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
