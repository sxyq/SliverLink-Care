import { Text, View } from '@tarojs/components';

import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { useI18n } from '@/i18n';
import { I18nPageShell } from '@/components/layout/I18nPageShell';

import './index.scss';

function RedirectHeader() {
  const { t } = useI18n();
  return (
    <View className='sl-card sl-card-soft auth-role-redirect-inline-header'>
      <View className='auth-role-redirect-title'>{t('common.roleRouting')}</View>
    </View>
  );
}

function AuthRoleRedirectPage() {
  const state = useRoleRedirect();

  return (
    <View className='sl-stage'>
      <View className='sl-app-shell'>
        <View className='sl-phone-shell'>
          <View className='sl-phone-content'>
            <View className='sl-page auth-role-redirect-page'>
              <RedirectHeader />

              <View className='sl-card sl-card-soft auth-role-redirect-card'>
                <View className='auth-role-redirect-spinner' />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function AuthRoleRedirectPageEntry() {
  return (
    <I18nPageShell navigationTitleKey='common.roleRouting'>
      <AuthRoleRedirectPage />
    </I18nPageShell>
  );
}
