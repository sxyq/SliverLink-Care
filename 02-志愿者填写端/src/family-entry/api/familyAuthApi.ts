import { clearToken, getToken, post, setToken } from './httpClient';

export interface LoginParams {
  phone: string;
  password: string;
}

interface LoginResponse {
  token?: string;
  name?: string;
  phone?: string;
  relationship?: string;
}

export async function familyLogin(params: LoginParams): Promise<{ success: boolean; token?: string; message: string }> {
  try {
    const data = await post<LoginResponse>('/api/family/login', params);
    if (data.token) {
      setToken(data.token);
      return { success: true, token: data.token, message: '登录成功' };
    }
    return { success: false, message: '登录失败：未返回访问令牌' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : '登录失败' };
  }
}

export async function getFamilyProfile() {
  return {
    id: 'current',
    name: '家属协管账号',
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
