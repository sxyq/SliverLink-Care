import type { InvitationPreview } from '../types';
import { post, get, setToken } from './httpClient';
import { i18nRuntime } from '../../i18n';
import { resolveApiMessage } from '@shared-i18n/messages';

export async function previewInvitation(code: string): Promise<InvitationPreview> {
  return get<InvitationPreview>(`/api/invitations/${encodeURIComponent(code)}/preview`);
}

export async function sendInvitationSms(code: string, phone: string): Promise<{ success: boolean; message?: string }> {
  try {
    await post(`/api/invitations/${encodeURIComponent(code)}/send-sms`, { phone });
    return { success: true, message: i18nRuntime.t('verification.codeSent') };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : i18nRuntime.t('errors.sendSmsFailed') };
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
  ok?: boolean;
  token?: string;
  success?: boolean;
  message?: string;
  messageKey?: string;
}

function resolveResponseMessage(response: RegisterResponse, fallbackKey: string): string {
  return resolveApiMessage(response, i18nRuntime.t, fallbackKey).message;
}

export async function registerWithInvitation(params: RegisterParams): Promise<{ success: boolean; message: string }> {
  try {
    const data = await post<RegisterResponse>(`/api/invitations/${encodeURIComponent(params.code)}/register`, params);
    if (data.token) {
      setToken(data.token);
      return { success: true, message: i18nRuntime.t('common.registerSuccess') };
    }
    return {
      success: Boolean(data.success ?? data.ok ?? false),
      message: resolveResponseMessage(data, 'errors.registerRetry'),
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : i18nRuntime.t('errors.registerRetry') };
  }
}
