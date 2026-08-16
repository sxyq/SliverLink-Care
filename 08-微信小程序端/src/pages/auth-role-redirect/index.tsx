import { Text, View } from '@tarojs/components';

import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { useI18n } from '@/i18n';

import './index.scss';

function RedirectHeader() {
  const { t } = useI18n();
  return (
    <View className='sl-card sl-card-soft auth-role-redirect-inline-header'>
      <View className='auth-role-redirect-title'>{t('common.roleRouting')}</View>
    </View>
  );
}

export default function AuthRoleRedirectPage() {
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
