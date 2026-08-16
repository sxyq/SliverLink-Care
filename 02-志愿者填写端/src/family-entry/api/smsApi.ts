import { post } from './httpClient';
import { i18nRuntime } from '../../i18n';

export async function sendSmsCode(phone: string): Promise<{ success: boolean; message: string }> {
  try {
    await post('/api/sms/send', { phone, scene: 'FAMILY_VERIFY' });
    return { success: true, message: i18nRuntime.t('verification.codeSent') };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : i18nRuntime.t('errors.sendSmsFailed') };
  }
}

export async function verifySmsCode(phone: string, code: string): Promise<{ success: boolean; message: string }> {
  try {
    await post('/api/sms/verify', { phone, code, scene: 'FAMILY_VERIFY' });
    return { success: true, message: i18nRuntime.t('verification.smsVerified') };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : i18nRuntime.t('errors.smsCodeInvalid') };
  }
}
