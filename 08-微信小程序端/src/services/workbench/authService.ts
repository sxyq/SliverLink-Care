import { ROLE_TYPES, type RoleType } from '@/app/app.constants';
import { httpClient } from '@/services/api/httpClient';

export interface WorkbenchProfileResult {
  account: string;
  name: string;
  phone: string;
}

export interface UpdateWorkbenchProfileInput {
  name: string;
  account: string;
  phone: string;
  currentPassword: string;
  password: string;
}

export interface LoginFormValue {
  role?: RoleType;
  account: string;
  password: string;
}

export interface VolunteerInvitationPreview {
  elderName: string;
  elderAge: number;
  elderArchiveNo: string;
  expiresAt: string;
}

export interface VolunteerRegisterFormValue {
  invitationCode: string;
  name: string;
  account: string;
  phone?: string;
  password: string;
}

interface VolunteerLoginResponse {
  token?: string;
  account?: string;
  name?: string;
}

interface VolunteerRegisterResponse {
  token?: string;
  account?: string;
  name?: string;
}

interface FamilyLoginResponse {
  ok?: boolean;
  token?: string;
  message?: string;
}

interface VolunteerProfileResponse {
  account?: string;
  name?: string;
  phone?: string;
}

interface VolunteerProfileUpdateResponse extends VolunteerProfileResponse {
  token?: string;
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

export async function previewVolunteerInvitation(code: string): Promise<VolunteerInvitationPreview> {
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) {
    throw new Error('请输入邀请码');
  }

  return httpClient.get<VolunteerInvitationPreview>(`/api/invitations/${encodeURIComponent(normalizedCode)}/preview`);
}

export async function registerVolunteerAccount(formValue: VolunteerRegisterFormValue): Promise<LoginResult> {
  const invitationCode = formValue.invitationCode.trim().toUpperCase();
  const name = formValue.name.trim();
  const account = formValue.account.trim();
  const password = formValue.password.trim();
  const phone = String(formValue.phone || '').trim();

  if (!invitationCode) {
    throw new Error('请输入邀请码');
  }
  if (!name || !account || !password) {
    throw new Error('请完整填写邀请码、姓名、账号和密码');
  }

  const result = await httpClient.post<VolunteerRegisterResponse>('/api/volunteer/register', {
    invitationCode,
    name,
    account,
    phone,
    password,
  });

  if (!result.token) {
    throw new Error('注册失败，请稍后重试');
  }

  return {
    role: ROLE_TYPES.volunteer,
    token: String(result.token),
    accountId: String(result.account || account),
    displayName: String(result.name || name),
    cookieBacked: false,
  };
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

export async function fetchWorkbenchProfile(role: RoleType): Promise<WorkbenchProfileResult> {
  if (role === ROLE_TYPES.volunteer) {
    const result = await httpClient.get<VolunteerProfileResponse>('/api/volunteer/me/profile');
    return {
      account: String(result.account || ''),
      name: String(result.name || result.account || ''),
      phone: String(result.phone || ''),
    };
  }

  return {
    account: '',
    name: '',
    phone: '',
  };
}

export async function updateWorkbenchProfile(input: UpdateWorkbenchProfileInput) {
  const account = input.account.trim();
  const name = input.name.trim();
  const phone = input.phone.trim();
  const currentPassword = input.currentPassword.trim();
  const password = input.password.trim();

  if (!account || !name) {
    throw new Error('请完整填写姓名和登录账号');
  }

  if (password && !currentPassword) {
    throw new Error('修改密码前请输入当前密码');
  }

  const result = await httpClient.put<VolunteerProfileUpdateResponse>('/api/volunteer/me/profile', {
    account,
    name,
    phone,
    currentPassword,
    password,
  });

  return {
    token: String(result.token || ''),
    account: String(result.account || account),
    name: String(result.name || name),
    phone: String(result.phone || phone),
  };
}
