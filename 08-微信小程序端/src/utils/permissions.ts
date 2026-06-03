import { ROLE_TYPES, type RoleType } from '@/app/app.constants';

export function canEditBasicInfo(role: RoleType) {
  return role === ROLE_TYPES.volunteer;
}

export function canManageContacts(role: RoleType) {
  return role === ROLE_TYPES.family;
}

export function canEditMedications(role: RoleType) {
  return role === ROLE_TYPES.volunteer || role === ROLE_TYPES.family;
}

export function canEditScales(role: RoleType) {
  return role === ROLE_TYPES.volunteer;
}

export function canViewScales(role: RoleType) {
  return role === ROLE_TYPES.volunteer;
}

export function canManageQrCode(role: RoleType) {
  return role === ROLE_TYPES.volunteer || role === ROLE_TYPES.family;
}

export function canRegenerateQrCode(role: RoleType) {
  return role === ROLE_TYPES.volunteer;
}

export function canRequestQrDisable(role: RoleType) {
  return role === ROLE_TYPES.volunteer || role === ROLE_TYPES.family;
}

export function canExportNameplate(role: RoleType) {
  return role === ROLE_TYPES.volunteer || role === ROLE_TYPES.family;
}
