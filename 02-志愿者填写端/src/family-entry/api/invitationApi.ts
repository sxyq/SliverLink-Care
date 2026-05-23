import type { InvitationPreview } from '../types';
import { post, get, setToken } from './httpClient';

export async function previewInvitation(code: string): Promise<InvitationPreview> {
  return get<InvitationPreview>(`/api/invitations/${encodeURIComponent(code)}/preview`);
}

export async function sendInvitationSms(code: string, phone: string): Promise<{ success: boolean; message?: string }> {
  try {
    await post(`/api/invitations/${encodeURIComponent(code)}/send-sms`, { phone });
    return { success: true, message: '验证码已发送' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : '验证码发送失败' };
  }
}

export interface RegisterParams {
  code: string;
  name: string;
  phone: string;
  relationship: string;
  password: string;
  smsCode: string;
}

interface RegisterResponse {
  token?: string;
  success?: boolean;
  message?: string;
}

export async function registerWithInvitation(params: RegisterParams): Promise<{ success: boolean; message: string }> {
  try {
    const data = await post<RegisterResponse>(`/api/invitations/${encodeURIComponent(params.code)}/register`, params);
    if (data.token) {
      setToken(data.token);
      return { success: true, message: '注册成功' };
    }
    return { success: data.success !== false, message: data.message || '注册成功' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : '注册失败' };
  }
}
