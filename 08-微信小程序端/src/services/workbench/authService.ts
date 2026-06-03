import { ROLE_TYPES, type RoleType } from '@/app/app.constants';
import { httpClient } from '@/services/api/httpClient';

export interface LoginFormValue {
  role?: RoleType;
  account: string;
  password: string;
}

interface VolunteerLoginResponse {
  token?: string;
  account?: string;
  name?: string;
}

interface FamilyLoginResponse {
  ok?: boolean;
  token?: string;
  message?: string;
}

export interface LoginResult {
  role: RoleType;
  token: string;
  accountId: string;
  displayName: string;
  cookieBacked: boolean;
}

export async function loginWorkbenchAccount(formValue: LoginFormValue): Promise<LoginResult> {
  const password = formValue.password.trim();
  const account = formValue.account.trim();

  if (!account || !password) {
    throw new Error('请输入账号与密码');
  }

  async function loginVolunteer() {
    const result = await httpClient.post<VolunteerLoginResponse>('/api/volunteer/login', {
      account,
      password,
    });

    return {
      role: ROLE_TYPES.volunteer,
      token: String(result.token || ''),
      accountId: String(result.account || account),
      displayName: String(result.name || result.account || account),
      cookieBacked: false,
    };
  }

  async function loginFamily() {
    const result = await httpClient.post<FamilyLoginResponse>('/api/family/login', {
      phone: account,
      password,
    });

    if (!result.ok || !result.token) {
      throw new Error(result.message || '登录失败，请稍后重试');
    }

    return {
      role: ROLE_TYPES.family,
      token: result.token,
      accountId: account,
      displayName: account,
      cookieBacked: false,
    };
  }

  if (formValue.role === ROLE_TYPES.volunteer) {
    return loginVolunteer();
  }

  if (formValue.role === ROLE_TYPES.family) {
    return loginFamily();
  }

  try {
    return await loginVolunteer();
  } catch (volunteerError) {
    try {
      return await loginFamily();
    } catch (familyError) {
      const volunteerMessage = (volunteerError as Error)?.message;
      const familyMessage = (familyError as Error)?.message;
      throw new Error(familyMessage || volunteerMessage || '登录失败，请稍后重试');
    }
  }
}

export async function logoutWorkbenchAccount(role: RoleType | null | undefined) {
  if (!role) {
    return;
  }

  const path = role === ROLE_TYPES.volunteer ? '/api/volunteer/logout' : '/api/family/logout';

  try {
    await httpClient.post<void>(path);
  } catch {
    // Ignore remote logout failures and let local state clear continue.
  }
}
