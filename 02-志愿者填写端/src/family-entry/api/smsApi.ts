import { post } from './httpClient';

export async function sendSmsCode(phone: string): Promise<{ success: boolean; message: string }> {
  try {
    await post('/api/sms/send', { phone, scene: 'FAMILY_VERIFY' });
    return { success: true, message: '验证码已发送' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : '验证码发送失败' };
  }
}

export async function verifySmsCode(phone: string, code: string): Promise<{ success: boolean; message: string }> {
  try {
    await post('/api/sms/verify', { phone, code, scene: 'FAMILY_VERIFY' });
    return { success: true, message: '验证成功' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : '验证码错误' };
  }
}
