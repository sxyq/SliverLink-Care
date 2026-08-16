import { clearToken, getToken, post, setToken } from './httpClient';
import { i18nRuntime } from '../../i18n';
import { resolveApiMessage } from '@shared-i18n/messages';

export interface LoginParams {
  phone: string;
  password: string;
}

interface LoginResponse {
  ok?: boolean;
  token?: string;
  name?: string;
  phone?: string;
  relationship?: string;
  message?: string;
  messageKey?: string;
}

function resolveResponseMessage(response: LoginResponse, fallbackKey: string): string {
  return resolveApiMessage(response, i18nRuntime.t, fallbackKey).message;
}

export async function familyLogin(params: LoginParams): Promise<{ success: boolean; token?: string; message: string }> {
  try {
    const data = await post<LoginResponse>('/api/family/login', params);
    if (data.token) {
      setToken(data.token);
      return { success: true, token: data.token, message: i18nRuntime.t('common.loginSuccess') };
    }
    return { success: false, message: resolveResponseMessage(data, 'errors.loginRetry') };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : i18nRuntime.t('errors.loginRetry') };
  }
}

export async function getFamilyProfile() {
  return {
    id: 'current',
    name: i18nRuntime.t('family.coordinatorAccount'),
    phone: '',
    relationship: '',
  };
}

export function familyLogout(): void {
  void post<void>('/api/family/logout').catch(() => undefined);
  clearToken();
}

export function isFamilyLoggedIn(): boolean {
  return !!getToken();
}
