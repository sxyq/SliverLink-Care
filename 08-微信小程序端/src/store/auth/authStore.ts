import { ROLE_TYPES, STORAGE_KEYS, type RoleType } from '@/app/app.constants';
import { clearAppSession } from '@/store/app/appSessionStore';
import { clearCurrentElderSummary } from '@/store/elder/currentElderStore';
import { getStorageValue, removeStorageValue, removeStorageValuesByPrefix, setStorageValue } from '@/utils/storage';

export interface AuthSession {
  token: string;
  role: RoleType;
  accountId: string;
  displayName: string;
  loggedInAt: number;
  cookieBacked: boolean;
}

let authSessionCache: AuthSession | null | undefined;

const AUTH_SCOPED_STORAGE_PREFIXES = [
  'api_cache__',
  'sl_weapp_volunteer_medications__',
];

function normalizeRole(value: unknown): RoleType | null {
  if (value === ROLE_TYPES.volunteer || value === ROLE_TYPES.family) {
    return value;
  }
  return null;
}

function readAuthSessionFromStorage(): AuthSession | null {
  const role = normalizeRole(getStorageValue<string | null>(STORAGE_KEYS.authRole, null));
  const accountId = getStorageValue<string>(STORAGE_KEYS.accountId, '').trim();
  const displayName = getStorageValue<string>(STORAGE_KEYS.displayName, '').trim();
  const token = getStorageValue<string>(STORAGE_KEYS.authToken, '');
  const loggedInAt = Number(getStorageValue<number>(STORAGE_KEYS.authLoggedInAt, 0));
  const cookieBacked = Boolean(getStorageValue<boolean>(STORAGE_KEYS.authCookieBacked, false));

  if (!role || !accountId || !token.trim()) {
    return null;
  }

  return {
    token,
    role,
    accountId,
    displayName: displayName || accountId,
    loggedInAt,
    cookieBacked,
  };
}

export function getAuthSession() {
  if (authSessionCache === undefined) {
    authSessionCache = readAuthSessionFromStorage();
  }
  return authSessionCache;
}

export function saveAuthSession(session: AuthSession) {
  authSessionCache = session;
  setStorageValue(STORAGE_KEYS.authToken, session.token);
  setStorageValue(STORAGE_KEYS.authRole, session.role);
  setStorageValue(STORAGE_KEYS.accountId, session.accountId);
  setStorageValue(STORAGE_KEYS.displayName, session.displayName);
  setStorageValue(STORAGE_KEYS.authLoggedInAt, session.loggedInAt);
  setStorageValue(STORAGE_KEYS.authCookieBacked, session.cookieBacked);
  return session;
}

export function updateAuthSession(patch: Partial<AuthSession>) {
  const current = getAuthSession();
  if (!current) {
    return null;
  }

  return saveAuthSession({
    ...current,
    ...patch,
  });
}

export function clearAuthSession() {
  authSessionCache = null;
  removeStorageValue(STORAGE_KEYS.authToken);
  removeStorageValue(STORAGE_KEYS.authRole);
  removeStorageValue(STORAGE_KEYS.accountId);
  removeStorageValue(STORAGE_KEYS.displayName);
  removeStorageValue(STORAGE_KEYS.authLoggedInAt);
  removeStorageValue(STORAGE_KEYS.authCookieBacked);
  clearCurrentElderSummary();
  clearAppSession();
  removeStorageValue(STORAGE_KEYS.launchContext);
  removeStorageValuesByPrefix(AUTH_SCOPED_STORAGE_PREFIXES);
}
