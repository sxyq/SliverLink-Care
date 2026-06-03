import { ROLE_TYPES } from '@/app/app.constants';
import type { AuthSession } from './authStore';

export function isLoggedIn(session: AuthSession | null | undefined) {
  return Boolean(session?.role && session?.accountId);
}

export function isVolunteer(session: AuthSession | null | undefined) {
  return session?.role === ROLE_TYPES.volunteer;
}

export function isFamily(session: AuthSession | null | undefined) {
  return session?.role === ROLE_TYPES.family;
}

export function shouldRedirectToLogin(session: AuthSession | null | undefined) {
  return !isLoggedIn(session);
}
